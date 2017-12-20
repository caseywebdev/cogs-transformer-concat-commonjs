var Cogs = this && this.Cogs || (function () {
  'use strict';

  var modules = {};
  var loads = {};

  var define = function (path, factory) {
    modules[path] = {exports: {}, factory: factory, path: path};
  };

  var require = function (path) {
    var module = modules[path];
    if (!module) throw new Error("Cannot find module '" + path + "'");

    if (!module.isResolved) {
      module.isResolved = true;
      module.factory(require, require.async, module, module.exports);
    }

    return module.exports;
  };

  require.async = function (path, manifest) {
    return loads[path] || (
      loads[path] = new Promise(function (resolve, reject) {
        if (modules[path]) return resolve(require(path));

        var script = document.createElement('script');
        script.async = true;
        script.src = manifest == null ? path : manifest[path];
        script.onload = function () {
          try { resolve(require(path)); } catch (er) { reject(er); }
        };
        script.onerror = function () {
          reject(new Error("Cannot load '" + path + "'"));
        };
        document.head.appendChild(script);
      })
    );
  };

  return {define: define, modules: modules, require: require};
})();
