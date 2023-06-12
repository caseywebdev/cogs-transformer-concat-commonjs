import helper from 'cogs-test-helper';

export default helper.createTests({
  'test/config.js': {
    'test/input.js': 'test/output.js',
    'test/error.js': Error
  }
});
