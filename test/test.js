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
        path: 'test/input.js',
        hash: helper.getFileHash('test/input.js')
      }],
      links: [],
      globs: []
    },
    'test/error.js': Error
  }
});
