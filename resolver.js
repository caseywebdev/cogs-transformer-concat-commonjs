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
