(() => {
  let resolver = globalThis.Cogs;
  if (resolver && resolver.define) return;

  if (!resolver) globalThis.Cogs = resolver = {};

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
Cogs.define("test/bar.js", (module, exports) => {
// This is bar!
});
Cogs.define("test/foo.bologna", (module, exports) => {
// This is foo!
Cogs.require("test/bar.js");
});
Cogs.define("test/baz.bologna", (module, exports) => {
// This is baz!
});
Cogs.define("test/no-extension", (module, exports) => {
// I have no extension =(
});
Cogs.define("test/one/1.js", (module, exports) => {
Cogs.require("test/foo.bologna");
});
Cogs.define("test/one/two/2.js", (module, exports) => {
Cogs.require("test/foo.bologna");
});
Cogs.define("test/input.js", (module, exports) => {
Cogs.require("test/foo.bologna");
Cogs.require("test/bar.js");
Cogs.require(SHOULD_BE_LEFT_AS_IDENTIFIER);
Cogs.require("test/bar.js");
Cogs.require("test/baz.bologna");
false;
Cogs.require("test/no-extension");
Cogs.require("test/one/1.js");
Cogs.require("test/one/two/2.js");
Cogs.require('ignore-me');
Cogs.import("test/foo.bologna");
import(SHOULD_BE_LEFT_AS_IDENTIFIER);
});
Cogs.require("test/input.js");
