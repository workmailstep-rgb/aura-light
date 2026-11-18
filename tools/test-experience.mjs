import {build} from 'esbuild';
import {mkdir,rm} from 'node:fs/promises';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const cache=join(root,'node_modules/.cache/aura-experience-tests');
await mkdir(cache,{recursive:true});
const scene=join(cache,'scene.mjs');
await build({absWorkingDir:root,stdin:{contents:"export {LampModel} from './src/hero-3d.jsx';",resolveDir:root,loader:'jsx'},outfile:scene,
  bundle:true,packages:'external',platform:'node',format:'esm',target:'node22',jsx:'automatic'});
// node:test runs its harness when imported. A direct process also keeps diagnostics
// visible in managed environments that do not support the test runner's isolation.
const result=spawnSync(process.execPath,['tests/experience.test.mjs'],{cwd:root,stdio:'inherit',env:{...process.env,NODE_ENV:'test',AURA_TEST_SCENE_MODULE:pathToFileURL(scene).href}});
await rm(cache,{recursive:true,force:true});
process.exitCode=result.status??1;
