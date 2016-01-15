var Cogs = this && this.Cogs || (function () {
  'use strict';

  var modules = {};

  var define = function (path, searchPaths, aliases, resolutions, factory) {
    var module = modules[path] = {
      path: path,
      searchPaths: searchPaths,
      resolutions: resolutions,
      factory: factory,
      exports: {}
    };
    for (var i = 0, l = aliases.length; i < l; ++i) {
      modules[aliases[i]] = module;
    }
  };

  var normalize = function (path) {
    var parts = path.split('/');
    var stack = [];
    for (var i = 0, l = parts.length; i < l; ++i) {
      var part = parts[i];
      if (!part || part === '.') continue;
      if (part === '..' && stack.length && stack[stack.length] !== '..') {
        stack.pop();
      } else stack.push(part);
    }
    return stack.join('/') || '.';
  };

  var dirRe = /^([\s\S]*?)\/*[^\/]+?\/*$/;

  var dirname = function (path) {
    return normalize(dirRe.exec(path)[1] || '.');
  };

  var join = function () {
    return normalize([].slice.call(arguments).join('/'));
  };

  var getRequire = function (path) {
    var basedir = dirname(path);
    var requirer = modules[path] || {};
    var resolutions = requirer.resolutions || {};
    var searchPaths = requirer.searchPaths || [];
    return function (name) {
      var module;
      var resolution = resolutions[name];
      if (resolution === false) return {};
      else if (resolution) module = modules[resolution];
      else if (name[0] === '.') module = modules[join(basedir, name)];
      else {
        var dir = basedir;
        do {
          for (var i = 0, l = searchPaths.length; !module && i < l; ++i) {
            module = modules[join(dir, searchPaths[i], name)];
          }
        } while (!module && dir !== '.' && (dir = dirname(dir)));
      }
      if (!module) {
        throw new Error("Can't resolve '" + name + "' in '" + path + "'");
      }
      if (module.isResolved) return module.exports;
      module.isResolved = true;
      module.factory(getRequire(module.path), module.exports, module);
      return module.exports;
    };
  };

  return {
    modules: modules,
    define: define,
    getRequire: getRequire,
    require: getRequire('.')
  };
})();
