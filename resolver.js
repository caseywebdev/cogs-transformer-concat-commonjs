const Cogs = (() => {
  const modules = {};
  const define = (path, factory) => {
    if (modules[path]) throw new Error(`Module '${path}' is already defined`);

    modules[path] = { exports: {}, factory, path };
  };

  const require = path => {
    const module = modules[path];
    if (!module) throw new Error(`Cannot find module '${path}'`);

    const factory = module.factory;
    if (factory) {
      delete module.factory;
      try {
        factory(require, require.async, module, module.exports);
      } catch (error) {
        module.factory = factory;
        throw error;
      }
    }

    return module.exports;
  };

  const asyncs = {};
  require.async = (path, manifest) => {
    if (asyncs[path]) return asyncs[path];

    let srcs = manifest == null ? path : manifest[path];
    if (!Array.isArray(srcs)) srcs = [srcs];
    return (asyncs[path] = Promise.all(srcs.map(src => import(src)))
      .then(() => require(path))
      .catch(error => {
        delete asyncs[path];
        throw error;
      }));
  };

  return { define, modules, require };
})();
