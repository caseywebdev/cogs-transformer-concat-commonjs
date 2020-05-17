const _ = require('underscore');

const { sep } = require('path');

const createResolver = require('enhanced-resolve').create;
const acorn = require('acorn');
const walk = require('acorn-walk');
const path = require('npath');

const DEFAULTS = {
  aliasFields: ['browser'],
  extensions: ['.js'],
  ignore: [],
  mainFields: ['browser', 'main'],
  manifestGlobal: 'COGS_MANIFEST',
  modules: ['node_modules']
};

const isImportNode = ({ callee: { name, object, property, type } }) =>
  (type === 'Identifier' && name === 'require') ||
  (type === 'MemberExpression' &&
    object.type === 'Identifier' &&
    object.name === 'require' &&
    property.type === 'Identifier' &&
    property.name === 'async');

const getImportNodes = source => {
  const nodes = [];
  walk.simple(
    acorn.parse(source, { ecmaVersion: 11 }),
    {
      CallExpression: node => isImportNode(node) && nodes.push(node),
      ImportExpression: node => nodes.push(node)
    },
    walk.base
  );
  return nodes;
};

const getResolutions = ({ resolve, source }) =>
  Promise.all(
    _.map(getImportNodes(source), async node => {
      const arg = node.arguments ? node.arguments[0] : node.source;
      return {
        node,
        result: arg && _.isString(arg.value) ? await resolve(arg.value) : null
      };
    })
  );

const applyResolutions = ({
  options: { manifestGlobal },
  resolutions,
  source
}) => {
  const builds = [];
  const requires = [];
  let cursor = 0;
  const chunks = [];
  _.each(resolutions, ({ node, result }) => {
    chunks.push(source.slice(cursor, node.start));
    cursor = result === null ? node.callee.end : node.end;
    if (node.callee && node.callee.type === 'Identifier') {
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
  return { builds, requires, source: chunks.join('') };
};

const applyResolve = async ({ file, options, resolve }) => {
  const source = file.buffer.toString();
  const resolutions = await getResolutions({ resolve, source });
  return applyResolutions({ options, resolutions, source });
};

const wrap = ({ path, source }) =>
  'Cogs.define(' +
  `${JSON.stringify(path)}, ` +
  'function (COGS_REQUIRE, COGS_REQUIRE_ASYNC, module, exports) {\n' +
  `${source.trim()}\n` +
  '}' +
  ');\n';

module.exports = async ({ file, options }) => {
  options = _.extend({}, DEFAULTS, options);
  const resolver = createResolver(options);

  // enhanced-resolve requires the input basedir to be split on path.sep...
  const basedir = path
    .dirname(path.resolve(file.path))
    .split('/')
    .join(sep);
  const resolve = name =>
    new Promise((resolve, reject) =>
      resolver(basedir, name, (er, filePath) => {
        if (!er) return resolve(filePath && path.relative('.', filePath));

        if (options.ignore.includes(name)) return resolve(null);

        reject(er);
      })
    );

  const { builds, requires, source } = await applyResolve({
    file,
    options,
    resolve
  });
  const requiresIndex = file.requires.indexOf(file.path);
  return {
    buffer: Buffer.from(wrap({ path: file.path, source })),
    builds: [].concat(file.builds, builds),
    requires: [].concat(
      file.requires.slice(0, requiresIndex),
      requires,
      file.requires.slice(requiresIndex)
    )
  };
};
