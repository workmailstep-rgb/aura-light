import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import React from 'react';
import ReactThreeTestRenderer from '@react-three/test-renderer';
import * as THREE from 'three';
import {readVisualState,qualityFor,createVisualController} from '../src/visual-state.js';
import {createLampGeometry} from '../src/lamp-geometry.js';
import {createLiquidFragment} from '../src/liquid-shader.js';
import {bootstrap} from '../src/enhancements.js';

globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const {LampModel}=await import(process.env.AURA_TEST_SCENE_MODULE);
const microtasks=async()=>{await Promise.resolve();await Promise.resolve();await Promise.resolve();};

function environment({paused=false,hidden=false,saveData=false,width=390}={}){
  const frameMap=new Map(),events=new Map(),windowEvents=new Map(),connectionEvents=new Map();
  const mutations=[],intersections=[];
  let nextFrame=1;
  const flags=new Set([paused?'motion-paused':'motion-enabled']);
  const style=values=>({getPropertyValue:name=>values[name]||'',values});
  const rootStyle=style({'--body-mid':'#eeece7','--light-rgb':'243, 197, 170'});
  const heroStyle=style({'--scene-brightness':'.65','--lamp-x':'0px','--lamp-y':'0px'});
  const hero={dataset:{on:'true'},style:heroStyle,getBoundingClientRect:()=>({top:20,bottom:620}),removeAttribute(name){if(name==='data-effects-paused')delete this.dataset.effectsPaused;}};
  const logo={dataset:{},getBoundingClientRect:()=>({top:4000,bottom:4060}),removeAttribute(name){if(name==='data-effects-paused')delete this.dataset.effectsPaused;}};
  const containers={hero:{},logo:{}};
  const map=new Map([['#hero-stage',hero],['#hero-3d',containers.hero],['#liquid-logo',logo],['#liquid-logo-canvas',containers.logo]]);
  const document={hidden,body:{classList:{contains:name=>flags.has(name)}},documentElement:{style:rootStyle},querySelector:selector=>map.get(selector),addEventListener:(name,fn)=>events.set(name,fn),removeEventListener:name=>events.delete(name)};
  class MutationObserver{constructor(callback){this.callback=callback;mutations.push(this)}observe(){}disconnect(){this.disconnected=true}}
  class IntersectionObserver{constructor(callback){this.callback=callback;intersections.push(this)}observe(){}disconnect(){this.disconnected=true}}
  const connection={saveData,addEventListener:(name,fn)=>connectionEvents.set(name,fn),removeEventListener:name=>connectionEvents.delete(name)};
  const window={innerWidth:width,innerHeight:800,devicePixelRatio:3,navigator:{connection},MutationObserver,IntersectionObserver,
    matchMedia:()=>({matches:paused}),requestAnimationFrame:fn=>{const id=nextFrame++;frameMap.set(id,fn);return id},cancelAnimationFrame:id=>frameMap.delete(id),
    addEventListener:(name,fn)=>windowEvents.set(name,fn),removeEventListener:name=>windowEvents.delete(name)};
  document.defaultView=window;hero.ownerDocument=logo.ownerDocument=document;
  return{document,window,hero,logo,containers,flags,rootStyle,heroStyle,events,frameMap,mutations,intersections,connectionEvents,
    mutate(){mutations.filter(item=>!item.disconnected).forEach(item=>item.callback([]));},
    visible(element,value){intersections.filter(item=>!item.disconnected).forEach(item=>item.callback([{target:element,isIntersecting:value}]));},
    step(time){const pending=[...frameMap.values()];frameMap.clear();pending.forEach(fn=>fn(time));},
    pause(value){flags.clear();flags.add(value?'motion-paused':'motion-enabled');this.mutate();}};
}

test('the neutral lamp has finite, outward-facing geometry and original proportions',()=>{
  for(const segments of [64,96]){
    const geometry=createLampGeometry(segments);
    for(const value of Object.values(geometry)){
      assert.ok([...value.attributes.position.array].every(Number.isFinite));
      assert.ok([...value.attributes.normal.array].every(Number.isFinite));
      value.computeBoundingBox();
    }
    assert.ok(Math.abs(geometry.cap.boundingBox.max.y-3.54)<.001);
    assert.ok(Math.abs(geometry.cap.boundingBox.max.x-1.58)<.001);
    const positions=geometry.cap.attributes.position,normals=geometry.cap.attributes.normal;
    let tested=0;
    for(let i=0;i<positions.count;i++){
      const radius=Math.hypot(positions.getX(i),positions.getZ(i));
      if(positions.getY(i)>2.05&&radius>.5){
        assert.ok(positions.getX(i)*normals.getX(i)+positions.getZ(i)*normals.getZ(i)>0,'The visible dome must face outwards');tested++;
      }
    }
    assert.ok(tested>100);
    Object.values(geometry).forEach(value=>value.dispose());
  }
});

test('R3F scene preserves body color while illumination, brightness and power change',async()=>{
  let state={body:'#eeece7',light:[243,197,170],brightness:.65,on:true,paused:false,pointerX:0,pointerY:0};
  let resumed=true;
  const controller={getSnapshot:()=>state,getQuality:()=>({segments:64}),isAnimating:()=>!state.paused,consumeResume:()=>{const value=resumed;resumed=false;return value;}};
  const renderer=await ReactThreeTestRenderer.create(React.createElement(LampModel,{controller}));
  await renderer.advanceFrames(2,1/30);
  const shade=renderer.scene.findByProps({name:'lamp-shade'}).instance;
  const stem=renderer.scene.findByProps({name:'lamp-stem'}).instance;
  const emitter=renderer.scene.findByProps({name:'lamp-emitter'}).instance;
  const light=renderer.scene.findByProps({name:'lamp-light'}).instance;
  const group=renderer.scene.findByProps({name:'aura-lamp'}).instance;
  assert.equal(shade.material,stem.material);
  assert.equal(shade.material.color.getHexString(),'eeece7');
  state={...state,body:'#cdd0d3',light:[199,221,208],brightness:.1};
  await renderer.advanceFrames(2,1/30);
  assert.equal(shade.material.color.getHexString(),'cdd0d3');
  const expected=new THREE.Color().setRGB(199/255,221/255,208/255,THREE.SRGBColorSpace);
  assert.ok(emitter.material.emissive.equals(expected));
  assert.ok(Math.abs(light.intensity-.22)<.00001);
  state={...state,on:false};await renderer.advanceFrames(120,1/30);
  assert.ok(light.intensity<.00001);assert.ok(emitter.material.emissiveIntensity<.00001);
  assert.equal(shade.material.color.getHexString(),'cdd0d3');
  state={...state,on:true,brightness:1};await renderer.advanceFrames(60,1/30);assert.ok(light.intensity>2.19);
  state={...state,paused:true,on:false};await renderer.advanceFrames(1,1/30);
  assert.equal(light.intensity,0);assert.equal(group.position.y,0);assert.deepEqual(group.rotation.toArray().slice(0,3),[0,0,0]);
  let materialDisposals=0,geometryDisposals=0;
  shade.material.addEventListener('dispose',()=>materialDisposals++);shade.geometry.addEventListener('dispose',()=>geometryDisposals++);
  await renderer.unmount();assert.equal(materialDisposals,1);assert.equal(geometryDisposals,1);
});

test('visual state reads the same interpolated CSS values and keeps neutral bodies independent',()=>{
  const env=environment();
  env.rootStyle.values['--body-mid']='#cdd0d3';env.rootStyle.values['--light-rgb']='199.50,221.25,208';
  env.heroStyle.values['--scene-brightness']='.22';env.hero.dataset.on='false';
  const state=readVisualState(env.document,env.window);
  assert.equal(state.body,'#cdd0d3');assert.deepEqual(state.light,[199.5,221.25,208]);assert.equal(state.brightness,.22);assert.equal(state.on,false);
  assert.deepEqual(qualityFor(env.window),{dpr:1.25,fps:30,segments:64});
  assert.deepEqual(qualityFor({...env.window,innerWidth:1440}),{dpr:1.65,fps:60,segments:96});
});

test('rendering is capped, paused offscreen/in a hidden tab, and disposed completely',()=>{
  const env=environment();const controller=createVisualController(env.hero);let renders=0;
  controller.attachRenderer(()=>renders++);
  for(let i=0;i<60;i++)env.step(i*1000/60);
  assert.ok(renders>=29&&renders<=32,'Phone rendering is capped at roughly 30 fps');
  env.visible(env.hero,false);assert.equal(env.frameMap.size,0);const offscreen=renders;env.step(5000);assert.equal(renders,offscreen);
  env.visible(env.hero,true);assert.ok(env.frameMap.size>0);assert.equal(controller.consumeResume(),true);assert.equal(controller.consumeResume(),false);
  env.pause(true);assert.equal(env.frameMap.size,0);assert.equal(env.hero.dataset.effectsPaused,'true');
  env.pause(false);assert.ok(env.frameMap.size>0);
  env.document.hidden=true;env.events.get('visibilitychange')();assert.equal(env.frameMap.size,0);
  env.document.hidden=false;env.events.get('visibilitychange')();assert.ok(env.frameMap.size>0);
  env.window.navigator.connection.saveData=true;env.connectionEvents.get('change')();assert.equal(env.frameMap.size,0);assert.equal(env.hero.dataset.effectsPaused,'true');
  controller.dispose();assert.equal(env.frameMap.size,0);assert.equal(env.events.size,0);assert.ok(env.mutations.every(item=>item.disconnected));assert.ok(env.intersections.every(item=>item.disconnected));
});

test('the lazy loader respects motion/data-saving settings and never mounts an island twice',async()=>{
  const env=environment({paused:true});let heroLoads=0,logoLoads=0,mounts=0,unmounts=0;
  const imports={hero:async()=>{heroLoads++;return{mountHero:()=>{mounts++;return()=>unmounts++;}}},logo:async()=>{logoLoads++;return{mountLogo:()=>{mounts++;return()=>unmounts++;}}}};
  const stop=bootstrap(env.document,env.window,imports);
  env.visible(env.hero,true);await microtasks();assert.equal(heroLoads,0);
  env.pause(false);await microtasks();assert.equal(heroLoads,1);assert.equal(mounts,1);
  env.visible(env.hero,true);await microtasks();assert.equal(heroLoads,1);
  env.visible(env.logo,true);await microtasks();assert.equal(logoLoads,1);assert.equal(mounts,2);
  stop();assert.equal(unmounts,2);
  const saved=environment({saveData:true});bootstrap(saved.document,saved.window,imports);saved.visible(saved.hero,true);await microtasks();assert.equal(heroLoads,1);
});

test('a failed enhancement leaves the existing artwork intact and is not retried in a loop',async()=>{
  const env=environment();let attempts=0;
  const stop=bootstrap(env.document,env.window,{hero:async()=>{attempts++;throw Error('Unavailable WebGL chunk')},logo:async()=>{throw Error('unused')}});
  env.visible(env.hero,true);await microtasks();env.visible(env.hero,true);await microtasks();
  assert.equal(attempts,1);assert.equal(env.hero.dataset.threeReady,undefined);stop();
});

test('the original Liquid Logo shader is pinned and its adapter has the expected WebGL2 interface',()=>{
  const original=fs.readFileSync(new URL('../src/vendor/liquid-frag.js',import.meta.url));
  const hash=createHash('sha1').update('blob '+original.length+'\0').update(original).digest('hex');
  assert.equal(hash,'89567153f92d205abced9453a3593afffe4c9316');
  const shader=createLiquidFragment();
  assert.ok(!shader.includes('#version'));
  assert.ok(shader.includes('in vec2 vUv')&&shader.includes('out vec4 fragColor'));
  assert.ok(shader.includes('vec3 color1 = u_lightColor;')&&shader.includes('vec3 color2 = u_darkColor;'));
  for(const uniform of ['u_image_texture','u_time','u_ratio','u_img_ratio','u_patternScale','u_refraction','u_edge','u_patternBlur','u_liquid'])assert.ok(shader.includes(uniform));
  assert.ok(fs.readFileSync(new URL('../third_party/liquid-logo-LICENSE.md',import.meta.url),'utf8').includes('PolyForm Shield License 1.0.0'));
});

test('the production bootstrap stays small and all bundled imports are local and present',()=>{
  const folder=new URL('../dist/assets/experience/',import.meta.url);
  const manifest=JSON.parse(fs.readFileSync(new URL('manifest.json',folder)));
  assert.ok(manifest.initial.gzip<8192);
  assert.ok(manifest.modules.some(item=>item.entry?.endsWith('hero-3d.jsx')));
  assert.ok(manifest.modules.some(item=>item.entry?.endsWith('liquid-logo.jsx')));
  for(const module of manifest.modules){
    const contents=fs.readFileSync(new URL(module.file,folder));
    assert.equal(createHash('sha256').update(contents).digest('hex'),module.sha256);
    for(const item of module.imports)assert.ok(fs.existsSync(new URL(item.file,folder)));
  }
  assert.ok(fs.readFileSync(new URL('THIRD_PARTY.txt',folder),'utf8').includes('PolyForm Shield'));
});
