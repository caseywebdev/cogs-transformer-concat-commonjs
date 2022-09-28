(() => {
  let resolver = globalThis.resolverGlobal;
  if (resolver && resolver.define) return;

  if (!resolver) globalThis.resolverGlobal = resolver = {};

  if (!resolver.manifest) resolver.manifest = {};

  resolver.modules = {};

  resolver.define = (path, factory) => {
    if (!resolver.modules[path]) {
      resolver.modules[path] = { exports: {}, factory, path };
    }
  };

  resolver.require = path => {
    const module = resolver.modules[path];
    if (!module) throw new Error(`Cannot find module '${path}'`);

    const factory = module.factory;
    if (factory) {
      delete module.factory;
      try {
        factory(module, module.exports);
      } catch (error) {
        module.factory = factory;
        throw error;
      }
    }

    return module.exports;
  };

  const asyncs = {};
  resolver.import = path => {
    if (asyncs[path]) return asyncs[path];

    return (asyncs[path] = Promise.all(
      resolver.manifest[path].map(src => import(src))
    )
      .then(() => resolver.require(path))
      .catch(error => {
        delete asyncs[path];
        throw error;
      }));
  };
})();
