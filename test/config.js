export default {
  transformers: {
    name: 'index.js',
    only: ['**/*.+(js|bologna)', 'test/no-extension'],
    options: {
      extensions: ['.js', '.bologna'],
      ignore: ['ignore-me']
    }
  }
};
