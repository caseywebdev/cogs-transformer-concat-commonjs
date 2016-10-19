var helper = require('cogs-test-helper');

helper.run({
  'test/config.json': {
    'test/input.js': helper.getFileBuffer('test/output.js'),
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
