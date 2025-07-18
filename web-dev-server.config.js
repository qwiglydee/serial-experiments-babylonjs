const mode = process.env.MODE || 'dev';
if (!['dev', 'prod'].includes(mode)) {
  throw new Error(`MODE must be "dev" or "prod", was "${mode}"`);
}

export default {
  nodeResolve: { exportConditions: mode === 'dev' ? ['development'] : [] },
  preserveSymlinks: true,
  appIndex: "index.html",
  plugins: [],
};
