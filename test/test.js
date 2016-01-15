var helper = require('cogs-test-helper');

helper.run({
  'test/config.json': {
    'test/input.js': {
      path: 'test/input.js',
      buffer: helper.getFileBuffer('test/output.js'),
      hash: helper.getFileHash('test/output.js'),
      requires: [{
        path: 'module-resolver',
        hash: helper.getFileHash('module-resolver')
      }, {
        path: 'test/bar.js',
        hash: helper.getFileHash('test/bar.js')
      }, {
        path: 'test/foo.bologna',
        hash: helper.getFileHash('test/foo.bologna')
      }, {
        path: 'test/baz.bologna',
        hash: helper.getFileHash('test/baz.bologna')
      }, {
        path: 'test/no-extension',
        hash: helper.getFileHash('test/no-extension')
      }, {
        path: 'test/input.js',
        hash: helper.getFileHash('test/input.js')
      }],
      links: [],
      globs: []
    },
    'test/error.js': Error
  }
});

var assert = require('assert');

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

assert.equal(dirname('foo'), '.');
assert.equal(dirname('foo/bar'), 'foo');
assert.equal(dirname('foo/bar/baz'), 'foo/bar');
assert.equal(dirname('.'), '.');
assert.equal(dirname('./foo'), '.');
assert.equal(dirname('.foo'), '.');
assert.equal(dirname('.///foo'), '.');
assert.equal(dirname('./././foo'), '.');
assert.equal(dirname('foo/bar/../baz/../../../buz'), '..');
assert.equal(join('foo', 'bar'), 'foo/bar');
assert.equal(join('foo', '../bar'), 'bar');
assert.equal(join('foo', '../../bar'), '../bar');
assert.equal(join('.', 'bar'), 'bar');
assert.equal(join('.', '.'), '.');
assert.equal(join('', '.'), '.');
assert.equal(join('.', ''), '.');
assert.equal(join(), '.');
