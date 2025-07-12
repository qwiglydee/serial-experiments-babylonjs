import { rollupPluginHTML as html } from '@web/rollup-plugin-html';
import minifyLiterals from 'rollup-plugin-html-literals';
import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import summary from 'rollup-plugin-summary';


export default {
  input: "index.html",
  plugins: [
    html(),
    resolve(),
    minifyLiterals(),
    terser({
      ecma: 2021,
      module: true,
      warnings: true,
    }),

    summary(),
  ],
  output: {
    dir: 'dist',
    manualChunks: (id) => {
      if (id.includes('node_modules')) {
        if (id.includes('node_modules/@babylonjs')) {
          return 'babylon';
        } else if (id.includes('node_modules/@lit') || id.includes('node_modules/lit')) {
          return 'lit';
        } else {
          return 'vendor';
        }
      }
    },
    preserveEntrySignatures: 'banner',
  }
}
