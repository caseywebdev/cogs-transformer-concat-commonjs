'use strict';

const _ = require('underscore');
const createResolver = require('enhanced-resolve').create;
const detective = require('detective');
const path = require('npath');
const sep = require('path').sep;

const RESOLVER_PATH = path.relative('.', path.join(__dirname, 'resolver.js'));

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

const getNames = ({file, resolve}) =>
  Promise.all(_.map(getPossibleDirs(file), dir =>
    resolve(path.resolve(dir)).then(
      filePath => filePath === file.path && dir,
      () => false
    )
  )).then(_.compact);

const getResolutions = ({file: {buffer}, resolve}) =>
  Promise.all(_.map(detective(buffer.toString()), name =>
    resolve(name).then(filePath => [name, filePath])
  )).then(_.object);

const wrap = ({file, options, names, resolutions}) =>
  'Cogs.define(' +
    `${JSON.stringify(file.path)}, ` +
    `${JSON.stringify(options.modules)}, ` +
    `${JSON.stringify(names)}, ` +
    `${JSON.stringify(resolutions)}, ` +
    `function (require, exports, module) {\n${file.buffer}\n}` +
  ');\n' + (
    options.entry === file.path ?
    `Cogs.require(${JSON.stringify(`./${file.path}`)});\n` :
    ''
  );

module.exports = ({file, options}) => {

  // Avoid an infinite loop by not resolving the resolver.
  if (file.path === RESOLVER_PATH) return;

  options = _.extend({}, DEFAULTS, options);
  const resolver = createResolver(options);

  // enhanced-resolve requires the input basedir to be split on path.sep...
  const basedir = path.dirname(path.resolve(file.path)).split('/').join(sep);
  const resolve = name =>
    new Promise((resolve, reject) =>
      resolver(basedir, name, (er, filePath) =>
        er ? reject(er) : resolve(filePath && path.relative('.', filePath))
      )
    );

  return Promise.all([
    getNames({file, resolve}),
    getResolutions({file, resolve})
  ]).then(([names, resolutions]) => {
    const i = file.requires.indexOf(file.path);
    return {
      buffer: new Buffer(wrap({file, options, names, resolutions})),
      requires: [].concat(
        file.requires.slice(0, i),
        RESOLVER_PATH,
        _.compact(_.values(resolutions)),
        file.requires.slice(i)
      )
    };
  });
};
