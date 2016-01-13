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

const getRefs = (file, resolve, cb) =>
  async.map(detective(file.buffer.toString()), (name, cb) =>
    async.waterfall([
      _.partial(resolve, name),
      (filePath, cb) => cb(null, [name, filePath])
    ], cb),
    (er, pairs) => cb(er, !er && _.object(pairs))
  );

const wrap = (file, options, result) =>
  'Cogs.define(' +
    JSON.stringify(file.path) + ', ' +
    JSON.stringify(result.names) + ', ' +
    JSON.stringify(result.refs) + ', ' +
    `function (require, exports, module) {\n${file.buffer}\n}` +
  ');\n' + (
    options.entry === file.path ?
    `Cogs.require(${JSON.stringify(`./${file.path}`)});\n` :
    ''
  );

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
      refs: _.partial(getRefs, file, resolve)
    }, (er, result) => {
      if (er) return cb(er);
      const i = file.requires.indexOf(file);
      cb(null, {
        buffer: new Buffer(wrap(file, options, result)),
        requires: [].concat(
          file.requires.slice(0, i),
          RESOLVER_PATH,
          _.compact(_.values(result.refs)),
          file.requires.slice(i)
        )
      });
    });
  } catch (er) { cb(er); }
};
