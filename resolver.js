(() => {
  const resolver = (globalThis.resolverGlobal ??= {});
  if (resolver.define) return;

  const manifest = (resolver.manifest ??= {});
  const modules = (resolver.modules = {});

  resolver.define = (path, factory) => {
    resolver.modules[path] ??= { exports: {}, factory, path };
  };

  const require = (resolver.require = path => {
    const module = modules[path];
    if (!module) throw new Error(`Cannot find module '${path}'`);

    const factory = module.factory;
    if (factory) {
      delete module.factory;
      try {
        factory(module, module.exports, require, _import);
      } catch (error) {
        module.factory = factory;
        throw error;
      }
    }

    return module.exports;
  });

  const imports = {};
  const _import = (resolver.import = path => {
    if (imports[path]) return imports[path];

    return (imports[path] = Promise.all(manifest[path].map(src => import(src)))
      .then(() => require(path))
      .catch(error => {
        delete imports[path];
        throw error;
      }));
  });
})();
