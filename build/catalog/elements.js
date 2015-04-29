var path = require('path');
var fs = require('fs-extra');

var _ = require('lodash');
var async = require('async');

var stream = require('./utils/stream').obj;
var packageDetails = require('./utils/package-details');
var packageElements = require('./utils/package-elements');
var analyze = require('./utils/analyze');



module.exports = function (imports) {

  var root = imports.root;
  var bowerFile = require(root + '/bower.json');
  var deps = bowerFile.dependencies;

  var data = [];
  var out = {};

  return stream.compose(
    stream.parse('packages.*'),
    stream.filter(function (package) {

      return deps[package.name];
    }),
    stream.asyncMap(function (package, done) {

      var packageBower = packageDetails({
        root: root,
        name: package.name
      });

      var elements = packageElements({
        name: package.name,
        deps: packageBower.dependencies
      });

      var output = async.map(elements, function (elementName, cb) {

        var details = packageDetails({
          root: root,
          name: elementName
        });

        fs.mkdirsSync(path.join(root, '.tmp', 'data', 'elements'));
        analyze(root, elementName, function(err, data) {
          // Set up object schema
          console.log("-",elementName,"(" + details._release + ")");

          cb(err, {
            name: elementName,
            version: details._release,
            package: package.name,
            description: details.description,
            tags: details.keywords || []
          });
        });
      }, function(err, output) {
        done(err, output);
      });
    }),

    // Convert to objects from arrays (and flatten),
    // and sort
    stream.create(
      function (chunk, enc, done) {

        data.push(chunk);
        done();
      },
      function (done) {

        var sortedData = _(data)
          .flatten()
          .sortBy('name')
          .value();

        this.push(sortedData);
        done();
      }
    )
  );
}