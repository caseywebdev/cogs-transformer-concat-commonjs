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
Cogs.define("test/bar.js", ["node_modules"], ["test/bar","test"], {}, function (require, exports, module) {
// This is bar!

});
Cogs.define("test/foo.bologna", ["node_modules"], ["test/foo"], {".":"test/bar.js"}, function (require, exports, module) {
// This is foo!
require('.');

});
Cogs.define("test/baz.bologna", ["node_modules"], ["test/baz"], {}, function (require, exports, module) {
// This is baz!

});
Cogs.define("test/no-extension", ["node_modules"], ["test/no-extension"], {}, function (require, exports, module) {
// I have no extension =(

});
Cogs.define("test/one/1.js", ["node_modules"], ["test/one/1"], {"../foo":"test/foo.bologna"}, function (require, exports, module) {
require('../foo');

});
Cogs.define("test/one/two/2.js", ["node_modules"], ["test/one/two/2"], {"../../foo":"test/foo.bologna"}, function (require, exports, module) {
require('../../foo');

});
Cogs.define("test/one/two/three/3.js", ["node_modules"], ["test/one/two/three/3"], {"../../../foo":"test/foo.bologna"}, function (require, exports, module) {
require('../../../foo');

});
Cogs.define("test/input.js", ["node_modules"], ["test/input"], {"./foo":"test/foo.bologna","./bar.js":"test/bar.js",".":"test/bar.js","baz":"test/baz.bologna","fs":false,"./no-extension":"test/no-extension","./one/1":"test/one/1.js","./one/two/2":"test/one/two/2.js","./one/two/three/3":"test/one/two/three/3.js"}, function (require, exports, module) {
require('./foo');
require('./bar.js');
require(SHOULD_BE_DISREGARDED);
require('.');
require('baz');
require('fs');
require('./no-extension');
require('./one/1');
require('./one/two/2');
require('./one/two/three/3');

});
Cogs.require("./test/input.js");
