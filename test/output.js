var Cogs = this && this.Cogs || (function () {
  'use strict';

  var modules = {};
  var loads = {};

  var define = function (path, factory) {
    modules[path] = {exports: {}, factory: factory, path: path};
  };

  var require = function (path) {
    var module = modules[path];
    if (!module) throw new Error(`Cannot find module '${path}'`);

    if (!module.isResolved) {
      module.isResolved = true;
      module.factory(require, module, module.exports);
    }

    return module.exports;
  };

  require.async = function (path) {
    return loads[path] || (
      loads[path] = new Promise(function (resolve, reject) {
        if (modules[path]) return resolve(require(path));

        const script = document.createElement('script');
        script.async = true;
        script.src = COGS_MANIFEST[path];
        script.onload = function () {
          try { resolve(require(path)); } catch (er) { reject(er); }
        };
        script.onerror = function () {
          reject(new Error(`Cannot load '${path}'`));
        };
        document.head.appendChild(script);
      })
    );
  };

  return {define: define, modules: modules, require: require};
})();
Cogs.define("test/bar.js", function (COGS_REQUIRE, module, exports) {
// This is bar!
});
Cogs.define("test/foo.bologna", function (COGS_REQUIRE, module, exports) {
// This is foo!
COGS_REQUIRE("test/bar.js");
});
Cogs.define("test/baz.bologna", function (COGS_REQUIRE, module, exports) {
// This is baz!
});
Cogs.define("test/no-extension", function (COGS_REQUIRE, module, exports) {
// I have no extension =(
});
Cogs.define("test/one/1.js", function (COGS_REQUIRE, module, exports) {
COGS_REQUIRE("test/foo.bologna");
});
Cogs.define("test/one/two/2.js", function (COGS_REQUIRE, module, exports) {
COGS_REQUIRE("test/foo.bologna");
});
Cogs.define("test/input.js", function (COGS_REQUIRE, module, exports) {
COGS_REQUIRE("test/foo.bologna");
COGS_REQUIRE("test/bar.js");
COGS_REQUIRE(SHOULD_BE_LEFT_AS_IDENTIFIER);
COGS_REQUIRE("test/bar.js");
COGS_REQUIRE("test/baz.bologna");
undefined;
COGS_REQUIRE("test/no-extension");
COGS_REQUIRE("test/one/1.js");
COGS_REQUIRE("test/one/two/2.js");
COGS_REQUIRE.async("test/one/two/three/3.js");
COGS_REQUIRE.async("test/foo.bologna");
});
Cogs.require("test/input.js");
