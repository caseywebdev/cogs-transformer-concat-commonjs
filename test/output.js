var Cogs = (function () {
  'use strict';

  // BEGIN: Copyright Node.js contributors. All rights reserved.

  // Permission is hereby granted, free of charge, to any person obtaining a
  // copy of this software and associated documentation files (the "Software"),
  // to deal in the Software without restriction, including without limitation
  // the rights to use, copy, modify, merge, publish, distribute, sublicense,
  // and/or sell copies of the Software, and to permit persons to whom the
  // Software is furnished to do so, subject to the following conditions:

  // The above copyright notice and this permission notice shall be included in
  // all copies or substantial portions of the Software.

  // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  // IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  // FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  // AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  // LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
  // FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
  // DEALINGS IN THE SOFTWARE.

  function assertPath(path) {
    if (typeof path !== 'string') {
      throw new TypeError('Path must be a string. Received ' + path);
    }
  }

  // resolves . and .. elements in a path array with directory names there
  // must be no slashes or device names (c:\) in the array
  // (so also no leading and trailing slashes - it does not distinguish
  // relative and absolute paths)
  function normalizeArray(parts, allowAboveRoot) {
    var res = [];
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];

      // ignore empty parts
      if (!p || p === '.')
        continue;

      if (p === '..') {
        if (res.length && res[res.length - 1] !== '..') {
          res.pop();
        } else if (allowAboveRoot) {
          res.push('..');
        }
      } else {
        res.push(p);
      }
    }

    return res;
  }

  // Returns an array with empty elements removed from either end of the input
  // array or the original array if no elements need to be removed
  function trimArray(arr) {
    var lastIndex = arr.length - 1;
    var start = 0;
    for (; start <= lastIndex; start++) {
      if (arr[start])
        break;
    }

    var end = lastIndex;
    for (; end >= 0; end--) {
      if (arr[end])
        break;
    }

    if (start === 0 && end === lastIndex)
      return arr;
    if (start > end)
      return [];
    return arr.slice(start, end + 1);
  }

  // Split a filename into [root, dir, basename, ext], unix version
  // 'root' is just a slash, or nothing.
  var splitPathRe =
      /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
  var posix = {};


  function posixSplitPath(filename) {
    var out = splitPathRe.exec(filename);
    out.shift();
    return out;
  }


  // path.resolve([from ...], to)
  // posix version
  posix.resolve = function() {
    var resolvedPath = '',
        resolvedAbsolute = false;

    for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
      var path = (i >= 0) ? arguments[i] : '.';

      assertPath(path);

      // Skip empty entries
      if (path === '') {
        continue;
      }

      resolvedPath = path + '/' + resolvedPath;
      resolvedAbsolute = path[0] === '/';
    }

    // At this point the path should be resolved to a full absolute path, but
    // handle relative paths to be safe (might happen when process.cwd() fails)

    // Normalize the path
    resolvedPath = normalizeArray(resolvedPath.split('/'),
                                  !resolvedAbsolute).join('/');

    return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
  };

  // path.normalize(path)
  // posix version
  posix.normalize = function(path) {
    assertPath(path);

    var isAbsolute = posix.isAbsolute(path),
        trailingSlash = path && path[path.length - 1] === '/';

    // Normalize the path
    path = normalizeArray(path.split('/'), !isAbsolute).join('/');

    if (!path && !isAbsolute) {
      path = '.';
    }
    if (path && trailingSlash) {
      path += '/';
    }

    return (isAbsolute ? '/' : '') + path;
  };

  // posix version
  posix.isAbsolute = function(path) {
    assertPath(path);
    return !!path && path[0] === '/';
  };

  // posix version
  posix.join = function() {
    var path = '';
    for (var i = 0; i < arguments.length; i++) {
      var segment = arguments[i];
      assertPath(segment);
      if (segment) {
        if (!path) {
          path += segment;
        } else {
          path += '/' + segment;
        }
      }
    }
    return posix.normalize(path);
  };


  posix.dirname = function(path) {
    var result = posixSplitPath(path),
        root = result[0],
        dir = result[1];

    if (!root && !dir) {
      // No dirname whatsoever
      return '.';
    }

    if (dir) {
      // It has a dirname, strip trailing slash
      dir = dir.substr(0, dir.length - 1);
    }

    return root + dir;
  };

  // END: Copyright Node.js contributors. All rights reserved.

  var modules = {};

  var define = function (path, names, refs, factory) {
    var module = {path: path, refs: refs, factory: factory, exports: {}};
    modules[path] = module;
    for (var i = 0, l = names.length; i < l; ++i) modules[names[i]] = module;
  };

  var getRequire = function (path) {
    var basedir = posix.dirname(path);
    var refs = modules[path] && modules[path].refs || {};
    return function (name) {
      var module;
      var ref = refs[name];
      if (ref === false) return {};
      else if (ref) module = modules[ref];
      else if (name[0] === '.') module = modules[posix.resolve(basedir, name)];
      else {
        var dir = basedir;
        while (!module) {
          module = modules[posix.join(dir, 'node_modules', name)];
          if (dir === '.') break;
          dir = posix.dirname(dir);
        }
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
Cogs.define("test/bar.js", ["test/bar","test"], {}, function (require, exports, module) {
// This is bar!

});
Cogs.define("test/foo.bologna", ["test/foo"], {".":"test/bar.js"}, function (require, exports, module) {
// This is foo!
require('.');

});
Cogs.define("test/baz.bologna", ["test/baz"], {}, function (require, exports, module) {
// This is baz!

});
Cogs.define("test/no-extension", ["test/no-extension"], {}, function (require, exports, module) {
// I have no extension =(

});
Cogs.define("test/input.js", ["test/input"], {"./foo":"test/foo.bologna","./bar.js":"test/bar.js",".":"test/bar.js","baz":"test/baz.bologna","fs":false,"./no-extension":"test/no-extension"}, function (require, exports, module) {
require('./foo');
require('./bar.js');
require(SHOULD_BE_DISREGARDED);
require('.');
require('baz');
require('fs');
require('./no-extension');

});
Cogs.require("./test/input.js");
