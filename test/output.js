var Cogs = (function () {
  'use strict';

  var fetches = {};
  var modulePromises = {};
  var modules = {};

  var define = function (path, factory) {
    if (modules[path]) {
      throw new Error("Module '" + path + "' is already defined");
    }

    modules[path] = { exports: {}, factory: factory, path: path };
  };

  var require = function (path) {
    var module = modules[path];
    if (!module) throw new Error("Cannot find module '" + path + "'");

    var factory = module.factory;
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

  var fetch = function (src) {
    return (
      fetches[src] ||
      (fetches[src] = new Promise(function (resolve, reject) {
        var script = document.createElement('script');
        script.async = true;
        script.src = src;
        script.addEventListener('load', function () {
          try {
            resolve();
          } catch (error) {
            reject(error);
          }
        });
        script.addEventListener('error', function () {
          reject(new Error("Failed to load '" + src + "'"));
        });
        document.head.appendChild(script);
      }).catch(function (error) {
        delete fetches[src];
        throw error;
      }))
    );
  };

  require.async = function (path, manifest) {
    return (
      modulePromises[path] ||
      (modulePromises[path] = new Promise(function (resolve, reject) {
        if (modules[path]) return resolve(require(path));

        var srcs = manifest == null ? path : manifest[path];
        if (!Array.isArray(srcs)) srcs = [srcs];
        Promise.all(srcs.map(fetch))
          .then(function () {
            return resolve(require(path));
          })
          .catch(reject);
      }).catch(function (error) {
        delete modulePromises[path];
        throw error;
      }))
    );
  };

  return { define: define, modules: modules, require: require };
})();
Cogs.define("test/bar.js", function (COGS_REQUIRE, COGS_REQUIRE_ASYNC, module, exports) {
// This is bar!
});
Cogs.define("test/foo.bologna", function (COGS_REQUIRE, COGS_REQUIRE_ASYNC, module, exports) {
// This is foo!
COGS_REQUIRE("test/bar.js");
});
Cogs.define("test/baz.bologna", function (COGS_REQUIRE, COGS_REQUIRE_ASYNC, module, exports) {
// This is baz!
});
Cogs.define("test/no-extension", function (COGS_REQUIRE, COGS_REQUIRE_ASYNC, module, exports) {
// I have no extension =(
});
Cogs.define("test/one/1.js", function (COGS_REQUIRE, COGS_REQUIRE_ASYNC, module, exports) {
COGS_REQUIRE("test/foo.bologna");
});
Cogs.define("test/one/two/2.js", function (COGS_REQUIRE, COGS_REQUIRE_ASYNC, module, exports) {
COGS_REQUIRE("test/foo.bologna");
});
Cogs.define("test/input.js", function (COGS_REQUIRE, COGS_REQUIRE_ASYNC, module, exports) {
COGS_REQUIRE("test/foo.bologna");
COGS_REQUIRE("test/bar.js");
COGS_REQUIRE(SHOULD_BE_LEFT_AS_IDENTIFIER);
COGS_REQUIRE("test/bar.js");
COGS_REQUIRE("test/baz.bologna");
false;
COGS_REQUIRE("test/no-extension");
COGS_REQUIRE("test/one/1.js");
COGS_REQUIRE("test/one/two/2.js");
COGS_REQUIRE('ignore-me');
COGS_REQUIRE_ASYNC("test/one/two/three/3.js", COGS_MANIFEST);
COGS_REQUIRE_ASYNC("test/foo.bologna", COGS_MANIFEST);
});
Cogs.require("test/input.js");
