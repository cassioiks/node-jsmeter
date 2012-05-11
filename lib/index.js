'use strict';

var fs = require("fs");
var async = require('async');
var complexity = require("./complexity");
var parse = require("./parse");
var path = require('path');
var mkdirp = require('mkdirp');
var tokens = require("./tokens");
tokens.setup();
var results = [];

var run = exports.run = function (file, options, callback) {
  mkdirp(options.output, function (err) {
    if (err) {
      return callback(err);
    }

    if (file instanceof Array) {
      async.forEachSeries(file, function (f, forEachCallback) {
        run(f, options, forEachCallback);
      }, callback);
      return;
    }

    process.stdout.write('Processing ' + file + '... ');
    runFile(file, options, function (err) {
      if (err) {
        console.error('ERROR', err);
        return callback();
      }
      console.log("DONE");
      callback();
    });
  });
};

function runFile(file, options, callback) {
  var destFilename = path.join(options.output, path.relative('.', file).replace(/.js$/, '.json'));
  mkdirp(path.dirname(destFilename), function (err) {
    if (err) {
      return callback(err);
    }
    fs.readFile(file, 'utf8', function (err, source) {
      if (err) {
        return callback(err);
      }
      var name = path.basename(file);
      generateComplexityReport(name, source, options, function (err, result) {
        if (err) {
          return callback(err);
        }
        result = JSON.stringify(result, null, '  ');
        fs.writeFile(destFilename, result, callback);
      });
    });
  });
}

function generateComplexityReport(name, source, options, callback) {
  try {
    var parser = parse.make_parse();
    var tree = parser(source);
    var complexityAnalyzer = complexity.make_complexity();
    complexityAnalyzer.complexity(tree, name);
    var reportData = '';
    var outputOptions = {
      write: function (data) {
        reportData += data;
      }
    };
    complexityAnalyzer.renderStats(outputOptions, "JSON");
    var data = JSON.parse(reportData);
    callback(null, data);
  } catch (err) {
    callback(err);
  }
}