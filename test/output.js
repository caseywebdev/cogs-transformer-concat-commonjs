(() => {
  const resolver = (globalThis.Cogs ??= {});
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

  const asyncs = {};
  const _import = (resolver.import = path => {
    if (asyncs[path]) return asyncs[path];

    return (asyncs[path] = Promise.all(manifest[path].map(src => import(src)))
      .then(() => require(path))
      .catch(error => {
        delete asyncs[path];
        throw error;
      }));
  });
})();
Cogs.define("test/bar.js", (module, exports, require, __import) => {
// This is bar!
});
Cogs.define("test/foo.bologna", (module, exports, require, __import) => {
// This is foo!
require("test/bar.js");
});
Cogs.define("test/baz.bologna", (module, exports, require, __import) => {
// This is baz!
});
Cogs.define("test/no-extension", (module, exports, require, __import) => {
// I have no extension =(
});
Cogs.define("test/one/1.js", (module, exports, require, __import) => {
require("test/foo.bologna");
});
Cogs.define("test/one/two/2.js", (module, exports, require, __import) => {
require("test/foo.bologna");
});
Cogs.define("test/input.js", (module, exports, require, __import) => {
require("test/foo.bologna");
require("test/bar.js");
require(SHOULD_BE_LEFT_AS_IDENTIFIER);
require("test/bar.js");
require("test/baz.bologna");
false;
require("test/no-extension");
require("test/one/1.js");
require("test/one/two/2.js");
require('ignore-me');
__import("test/foo.bologna");
import(SHOULD_BE_LEFT_AS_IDENTIFIER);
});
Cogs.require("test/input.js");
