import {build} from 'esbuild';
import {readFile,writeFile,mkdir,rm,readdir} from 'node:fs/promises';
import {dirname,resolve,relative,join,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const output=join(root,'dist/assets/experience');
await rm(output,{recursive:true,force:true});
await mkdir(output,{recursive:true});
const result=await build({
  absWorkingDir:root,entryPoints:['src/enhancements.js'],outdir:output,
  bundle:true,format:'esm',splitting:true,platform:'browser',target:['es2022'],
  minify:true,treeShaking:true,jsx:'automatic',metafile:true,sourcemap:false,
  entryNames:'enhancements',chunkNames:'[name]-[hash]',legalComments:'eof',
  define:{'process.env.NODE_ENV':'"production"'},
  banner:{js:'/*! AURA. Runtime licenses: /assets/experience/THIRD_PARTY.txt. Liquid Logo portions: https://polyformproject.org/licenses/shield/1.0.0 */'},
});

const packageDirs=new Set();
for(const input of Object.keys(result.metafile.inputs)){
  if(!input.includes('node_modules/'))continue;
  let folder=dirname(resolve(root,input));
  while(folder.startsWith(join(root,'node_modules'))){
    try {const p=JSON.parse(await readFile(join(folder,'package.json'),'utf8'));if(p.name){packageDirs.add(folder);break;}} catch {}
    folder=dirname(folder);
  }
}
const notices=[];
for(const folder of [...packageDirs].sort()){
  const pkg=JSON.parse(await readFile(join(folder,'package.json'),'utf8'));
  const names=(await readdir(folder)).filter(name=>/^(licen[cs]e|copying)(\.|-|$)/i.test(name));
  for(const name of names){
    try{notices.push(`\n${pkg.name} ${pkg.version}\n${'='.repeat(60)}\n${await readFile(join(folder,name),'utf8')}`);}catch{}
  }
}
notices.push('\nPaper Design / Liquid Logo\n'+ '='.repeat(60)+'\n'+await readFile(join(root,'third_party/liquid-logo-LICENSE.md'),'utf8'));
notices.push('\n'+await readFile(join(root,'third_party/NOTICE.md'),'utf8'));
await writeFile(join(output,'THIRD_PARTY.txt'),notices.join('\n'));

const modules=[];
for(const [file,meta] of Object.entries(result.metafile.outputs)){
  if(!file.endsWith('.js'))continue;
  const bytes=await readFile(resolve(root,file));
  modules.push({file:basename(file),bytes:bytes.length,gzip:gzipSync(bytes).length,
    sha256:createHash('sha256').update(bytes).digest('hex'),
    entry:meta.entryPoint||null,imports:meta.imports.map(item=>({file:basename(item.path),kind:item.kind,external:Boolean(item.external)}))});
}
modules.sort((a,b)=>a.file.localeCompare(b.file));
const loader=modules.find(item=>item.file==='enhancements.js');
const byFile=new Map(modules.map(item=>[item.file,item]));
const eager=new Set();
function visit(file){
  if(eager.has(file))return;
  const item=byFile.get(file);
  if(!item)throw Error('Missing built module: '+file);
  eager.add(file);
  for(const dependency of item.imports)if(dependency.kind!=='dynamic-import')visit(dependency.file);
}
visit(loader.file);
const initialGzip=[...eager].reduce((sum,file)=>sum+byFile.get(file).gzip,0);
// esbuild may share a tiny module-runtime helper. React/Three must stay lazy.
if(initialGzip>8192)throw Error('The initial bootstrap must stay below 8 KiB gzip.');
const manifest={entry:'enhancements.js',mask:'../liquid-logo-depth.png',initial:{files:[...eager],gzip:initialGzip},modules,notices:'THIRD_PARTY.txt'};
await writeFile(join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(`Built ${modules.length} local modules. Initial loader and helpers: ${initialGzip} B gzip; all 3D modules: ${modules.reduce((sum,item)=>sum+item.gzip,0)} B gzip.`);
