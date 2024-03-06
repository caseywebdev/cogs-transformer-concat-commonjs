import path from 'path';
import url from 'url';

import * as acorn from 'acorn';
import * as walk from 'acorn-walk';
import enhancedResolve from 'enhanced-resolve';

const { Buffer, Promise } = globalThis;

const resolverPath = path.relative(
  '.',
  path.join(path.dirname(url.fileURLToPath(import.meta.url)), 'resolver.js')
);

const defaults = {
  aliasFields: ['browser'],
  conditionNames: ['require'],
  extensions: ['.js'],
  ignore: [],
  mainFields: ['browser', 'main'],
  modules: ['node_modules'],
  resolverGlobal: 'Cogs'
};

const getImportNodes = source => {
  const nodes = [];
  walk.simple(
    acorn.parse(source, { ecmaVersion: 2022, sourceType: 'module' }),
    {
      CallExpression: node =>
        node.callee.type === 'Identifier' &&
        node.callee.name === 'require' &&
        nodes.push(node),
      ImportExpression: node =>
        typeof node.source.value === 'string' && nodes.push(node)
    },
    walk.base
  );
  return nodes;
};

const getResolutions = ({ resolve, source }) =>
  Promise.all(
    getImportNodes(source).map(async node => {
      const arg = node.arguments ? node.arguments[0] : node.source;
      return {
        node,
        result: typeof arg?.value === 'string' ? await resolve(arg.value) : null
      };
    })
  );

const applyResolutions = ({ resolutions, source }) => {
  const builds = [];
  const requires = [];
  let cursor = 0;
  const chunks = [];
  for (const { node, result } of resolutions) {
    chunks.push(source.slice(cursor, node.start));
    cursor = result === null ? node.callee.end : node.end;
    if (node.callee) {
      if (result === null) chunks.push('require');
      else if (result === false) chunks.push('false');
      else {
        requires.push(result);
        chunks.push(`require(${JSON.stringify(result)})`);
      }
    } else if (result === null) chunks.push('import');
    else if (result === false) chunks.push('Promise.resolve(false)');
    else {
      builds.push(result);
      chunks.push(`__import(${JSON.stringify(result)})`);
    }
  }
  chunks.push(source.slice(cursor, source.length));
  return { builds, requires, source: chunks.join('') };
};

const resolve = async ({ file, options }) => {
  const { ignore } = options;
  const resolver = enhancedResolve.create(options);

  const basedir = path.dirname(path.resolve(file.path));
  const resolve = name =>
    new Promise((resolve, reject) =>
      resolver(basedir, name, (er, filePath) => {
        if (!er) return resolve(filePath && path.relative('.', filePath));

        if (ignore.includes(name)) return resolve(null);

        reject(er);
      })
    );

  const source = file.buffer.toString();
  const resolutions = await getResolutions({ resolve, source });

  return await applyResolutions({ resolutions, source });
};

const wrap = ({ file, options: { entry, resolverGlobal }, source }) => {
  const isEntry = Array.isArray(entry)
    ? entry.some(path => path === file.path)
    : entry === file.path;
  const path = JSON.stringify(file.path);
  return (
    `${resolverGlobal}.define(${path}, (module, exports, require, __import) => {\n` +
    `${source.trim()}\n` +
    '});\n' +
    (isEntry ? `${resolverGlobal}.require(${path});\n` : '')
  );
};

export default async ({ file, options }) => {
  options = { ...defaults, ...options };
  if (file.path === resolverPath) {
    return {
      buffer: Buffer.from(
        file.buffer
          .toString()
          .replaceAll('resolverGlobal', options.resolverGlobal)
      )
    };
  }

  const resolved = await resolve({ file, options });
  const requiresIndex = file.requires.indexOf(file.path);
  return {
    buffer: Buffer.from(wrap({ file, options, source: resolved.source })),
    builds: [].concat(file.builds, resolved.builds),
    requires: [].concat(
      file.requires.slice(0, requiresIndex),
      resolverPath,
      resolved.requires,
      file.requires.slice(requiresIndex)
    )
  };
};
