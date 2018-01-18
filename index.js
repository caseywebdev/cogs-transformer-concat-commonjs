const _ = require('underscore');
const {sep} = require('path');
const acorn = require('acorn-dynamic-import/lib/inject').default(require('acorn'));
const createResolver = require('enhanced-resolve').create;
const path = require('npath');
const walk = require('acorn/dist/walk');

// Add dynamic import support to walk.
walk.base.Import = _.noop;

const RESOLVER_PATH = path.relative('.', path.join(__dirname, 'resolver.js'));

const DEFAULTS = {
  aliasFields: ['browser'],
  extensions: ['.js'],
  mainFields: ['browser', 'main'],
  manifestGlobal: 'COGS_MANIFEST',
  modules: ['node_modules']
};

const isImportNode = ({callee: {name, object, property, type}}) =>
  type === 'Import' ||
  (type === 'Identifier' && name === 'require') ||
  (
    type === 'MemberExpression' &&
    object.type === 'Identifier' &&
    object.name === 'require' &&
    property.type === 'Identifier' &&
    property.name === 'async'
  );

const getImportNodes = source => {
  const nodes = [];
  walk.simple(
    acorn.parse(source, {ecmaVersion: 9, plugins: {dynamicImport: true}}),
    {CallExpression: node => isImportNode(node) && nodes.push(node)}
  );
  return nodes;
};

const getResolutions = async ({resolve, source}) =>
  Promise.all(_.map(getImportNodes(source), async node => {
    const arg = node.arguments[0];
    return {
      node,
      result: arg && _.isString(arg.value) ? await resolve(arg.value) : null
    };
  }));

const applyResolutions = ({options: {manifestGlobal}, resolutions, source}) => {
  const builds = [];
  const requires = [];
  let cursor = 0;
  const chunks = [];
  _.each(resolutions, ({node, result}) => {
    chunks.push(source.slice(cursor, node.start));
    cursor = result === null ? node.callee.end : node.end;
    if (node.callee.type === 'Identifier') {
      if (result === null) {
        chunks.push('COGS_REQUIRE');
      } else if (result === false) {
        chunks.push('false');
      } else {
        requires.push(result);
        chunks.push(`COGS_REQUIRE(${JSON.stringify(result)})`);
      }
    } else if (result === null) {
      chunks.push('COGS_REQUIRE_ASYNC');
    } else if (result === false) {
      chunks.push('Promise.resolve(false)');
    } else {
      builds.push(result);
      chunks.push(
        `COGS_REQUIRE_ASYNC(${JSON.stringify(result)}, ${manifestGlobal})`
      );
    }
  });
  chunks.push(source.slice(cursor, source.length));
  return {builds, requires, source: chunks.join('')};
};

const applyResolve = async ({file, options, resolve}) => {
  const source = file.buffer.toString();
  const resolutions = await getResolutions({resolve, source});
  return applyResolutions({options, resolutions, source});
};

const wrap = ({entry, path, source}) =>
  'Cogs.define(' +
    `${JSON.stringify(path)}, ` +
    'function (COGS_REQUIRE, COGS_REQUIRE_ASYNC, module, exports) {\n' +
      `${source.trim()}\n` +
    '}' +
  ');\n' +
  (entry === path ? `Cogs.require(${JSON.stringify(path)});\n` : '');

module.exports = async ({file, options}) => {

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

  const {builds, requires, source} =
    await applyResolve({file, options, resolve});
  const requiresIndex = file.requires.indexOf(file.path);
  return {
    buffer: new Buffer(wrap({entry: options.entry, path: file.path, source})),
    builds: [].concat(file.builds, builds),
    requires: [].concat(
      file.requires.slice(0, requiresIndex),
      RESOLVER_PATH,
      requires,
      file.requires.slice(requiresIndex)
    )
  };
};
