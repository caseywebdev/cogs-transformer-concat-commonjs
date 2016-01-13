var _ = require('underscore');
var async = require('async');
var detective = require('detective');
var path = require('path');
var resolve = require('browser-resolve');

var RESOLVER_PATH = path.relative('.', path.join(__dirname, 'module-resolver'));

var DEFAULTS = {
  extensions: ['.js'],
  ignore: []
};

var getNames = function (file, options, cb) {
  var parsed = path.parse(file.path);
  var dir = path.join(parsed.dir, parsed.name);
  var names = [dir];
  while (dir !== '.') names.push(dir = path.dirname(dir));
  options = _.omit(options, 'filename');
  var abs = path.resolve(file.path);
  async.filter(names, function (name, cb) {
    resolve(path.resolve(name), options, function (er, filePath) {
      cb(!er && filePath === abs);
    });
  }, _.partial(cb, null));
};

var getRequires = function (file, options, cb) {
  async.map(detective(file.buffer.toString()), function (name, cb) {
    if (_.includes(options.ignore, name)) return cb();
    resolve(name, options, function (er, filePath) {
      if (er) return cb(er);
      return cb(null, path.relative('.', filePath));
    });
  }, function (er, filePaths) {
    if (er) return cb(er);
    cb(null, _.compact(filePaths));
  });
};

var wrapWithNames = function (file, options, names) {
  return (
    'Cogs.define(' +
      "'" + file.path + "', " +
      '[' +
          _.map(names, function (name) {
            return "'" + name + "'";
          }).join(', ') +
      '], ' +
      'function (require, exports, module) {\n' +
        file.buffer + '\n' +
      '}' +
    ');\n' +
    (
      options.entrypoint === file.path ?
      "Cogs.require('./" + file.path + "');\n" :
      ''
    )
  );
};

module.exports = function (file, options, cb) {
  try {
    options = _.extend({}, DEFAULTS, options, {filename: file.path});

    async.parallel({
      names: _.partial(getNames, file, options),
      requires: _.partial(getRequires, file, options)
    }, function (er, results) {
      if (er) return cb(er);
      cb(null, {
        buffer: new Buffer(wrapWithNames(file, options, results.names)),
        requires: [].concat(RESOLVER_PATH, results.requires, file.requires)
      });
    });
  } catch (er) { cb(er); }
};
