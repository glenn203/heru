export default {
  globs: ['src/**/*.ts'],
  exclude: [
    'src/**/*.stories.ts',
    'src/**/*.test.ts',
    'src/**/define.ts',
    'src/index.ts',
    'src/define.ts',
  ],
  outdir: '.',
  litelement: true,
  packagejson: false,
};
