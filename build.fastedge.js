import { componentize } from '@bytecodealliance/componentize-js';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import * as esbuild from 'esbuild';
import ignorePlugin from 'esbuild-plugin-ignore';

const ignore = ignorePlugin([
  {
    resourceRegExp:
    // eslint-disable-next-line max-len
        /(^dgram$)|(^http2$)|(^os$)|(\/deno\/.*\.ts$)|(.*-deno\.ts$)|(.*\.deno\.ts$)|(\/node\/.*\.js$)|(.*-node\.js$)|(.*\.node\.js$)/,
  }
]);

let result = await esbuild.build({
  entryPoints: ['src/server-fastedge.js'],
  bundle: true,
  format: 'esm',
  platform: "browser",
  minify: false,
  treeShaking: true,
  outfile: 'dist/fastedge.js',
  plugins: [ignore]
})

const jsSource = await readFile('dist/fastedge.js', 'utf8');

const { component } = await componentize(jsSource , {
  witPath: resolve('wit'),
  worldName: 'reactor',
  enableStdout: false,
  debug: false
});


await writeFile('dist/fastedge.wasm', component);
