export default {
  transformers: {
    name: 'index.js',
    only: ['**/*.+(js|bologna)', 'test/no-extension'],
    options: {
      entry: 'test/input.js',
      extensions: ['.js', '.bologna'],
      ignore: ['ignore-me']
    }
  }
};
