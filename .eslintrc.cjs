module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true },
  extends: [],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  ignorePatterns: ['dist', 'dist-electron', 'release', 'node_modules'],
};
