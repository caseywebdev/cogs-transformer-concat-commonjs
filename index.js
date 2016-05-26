'use strict';

const _ = require('underscore');
const async = require('async');
const createResolver = require('enhanced-resolve').create;
const detective = require('detective');
const path = require('npath');
const sep = require('path').sep;

const RESOLVER_PATH =
  path.relative('.', path.join(__dirname, 'module-resolver'));

const DEFAULTS = {
  aliasFields: ['browser'],
  mainFields: ['browser', 'main'],
  extensions: ['.js'],
  modules: ['node_modules']
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

const getResolutions = (file, resolve, cb) =>
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
    JSON.stringify(options.modules) + ', ' +
    JSON.stringify(result.names) + ', ' +
    JSON.stringify(result.resolutions) + ', ' +
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

    // enhanced-resolve requires the input basedir to be split on path.sep...
    const basedir = path.dirname(path.resolve(file.path)).split('/').join(sep);
    const resolve = (name, cb) =>
      resolver(basedir, name, (er, filePath) =>
        cb(er, filePath && path.relative('.', filePath))
      );

    async.parallel({
      names: _.partial(getNames, file, resolve),
      resolutions: _.partial(getResolutions, file, resolve)
    }, (er, result) => {
      if (er) return cb(er);
      const i = file.requires.indexOf(file.path);
      cb(null, {
        buffer: new Buffer(wrap(file, options, result)),
        requires: [].concat(
          file.requires.slice(0, i),
          RESOLVER_PATH,
          _.compact(_.values(result.resolutions)),
          file.requires.slice(i)
        )
      });
    });
  } catch (er) { cb(er); }
};
