'use strict';

const _ = require('underscore');
const async = require('async');
const detective = require('detective');
const path = require('path');
const createResolver = require('enhanced-resolve').create;

const RESOLVER_PATH =
  path.relative('.', path.join(__dirname, 'module-resolver'));

const DEFAULTS = {
  aliasFields: ['browser'],
  extensions: ['.js']
};

const getPossibleDirs = file => {
  const parsed = path.parse(file.path);
  let dir = path.join(parsed.dir, parsed.name);
  const dirs = [dir];
  while (dir !== '.') dirs.push(dir = path.dirname(dir));
  return dirs;
};

const getNames = (file, resolve, cb) =>
  async.filter(getPossibleDirs(file), (dir, cb) =>
    resolve(path.resolve(dir), (er, filePath) =>
      cb(!er && filePath === file.path)
    )
  , _.partial(cb, null));

const getRequires = (file, resolve, cb) =>
  async.map(detective(file.buffer.toString()), resolve, (er, filePaths) =>
    cb(er, _.compact(filePaths))
  );

const wrapWithNames = function (file, options, names) {
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
    options = _.extend({}, DEFAULTS, options);
    const resolver = createResolver(options);
    const basedir = path.dirname(path.resolve(file.path));
    const resolve = (name, cb) =>
      resolver(basedir, name, (er, filePath) =>
        cb(er, filePath && path.relative('.', filePath))
      );

    async.parallel({
      names: _.partial(getNames, file, resolve),
      requires: _.partial(getRequires, file, resolve)
    }, (er, results) => {
      if (er) return cb(er);
      const i = file.requires.indexOf(file);
      cb(null, {
        buffer: new Buffer(wrapWithNames(file, options, results.names)),
        requires: [].concat(
          file.requires.slice(0, i),
          RESOLVER_PATH,
          results.requires,
          file.requires.slice(i)
        )
      });
    });
  } catch (er) { cb(er); }
};
