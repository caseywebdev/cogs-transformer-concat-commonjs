var Cogs = (function () {
  'use strict';

  var asyncs = {};
  var fetches = {};
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

  window.addEventListener('error', function (event) {
    var deferred = fetches[event.filename];
    if (deferred && deferred.status === 'pending') deferred.reject(event.error);
  });

  var createDeferred = function () {
    var deferred = { status: 'pending' };
    deferred.promise = new Promise(function (_resolve, _reject) {
      deferred.resolve = function (value) {
        if (deferred.status === 'pending') {
          deferred.status = 'fulfilled';
          _resolve(value);
        }
      };
      deferred.reject = function (value) {
        if (deferred.status === 'pending') {
          deferred.status = 'rejected';
          _reject(value);
        }
      };
    });
    return deferred;
  };

  var fetch = function (src) {
    var script = document.createElement('script');
    script.src = src;
    var deferred = fetches[script.src];
    if (deferred && deferred.status !== 'rejected') return deferred.promise;

    deferred = fetches[script.src] = createDeferred();
    script.addEventListener('load', deferred.resolve);
    script.addEventListener('error', function () {
      deferred.reject(new Error("Failed to load '" + src + "'"));
    });
    document.head.appendChild(script);
    deferred.promise.finally(() => script.remove());
    return deferred.promise;
  };

  require.async = function (path, manifest) {
    var deferred = asyncs[path];
    if (deferred && deferred.status !== 'rejected') return deferred.promise;

    var srcs = manifest == null ? path : manifest[path];
    if (!Array.isArray(srcs)) srcs = [srcs];
    Promise.all(srcs.map(fetch))
      .then(function () {
        return deferred.resolve(require(path));
      })
      .catch(deferred.reject);
    return deferred.promise;
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
