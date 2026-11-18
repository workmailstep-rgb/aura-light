import React, { useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createVisualController } from './visual-state.js';
import { createLampGeometry, groundVertex, groundFragment } from './lamp-geometry.js';
import { VisualBoundary, Invalidation, configureRenderer } from './visual-boundary.jsx';

export function LampModel({ controller, onReady = () => {} }) {
  const group = useRef();
  const lampLight = useRef();
  const phase = useRef(0);
  const power = useRef(controller.getSnapshot().on ? 1 : 0);
  const color = useMemo(() => new THREE.Color(), []);
  const assets = useMemo(() => {
    const geometry = createLampGeometry(controller.getQuality().segments);
    const body = new THREE.MeshStandardMaterial({ color:'#eeece7', roughness:.43, metalness:.035 });
    const trim = new THREE.MeshStandardMaterial({ color:'#dddcd7', roughness:.5, metalness:.08 });
    const emitter = new THREE.MeshStandardMaterial({ color:'#fffaf5', emissive:'#f3c5aa', roughness:.9, side:THREE.DoubleSide });
    const cord = new THREE.MeshStandardMaterial({ color:'#93928f', roughness:.85 });
    const touch = new THREE.MeshStandardMaterial({ color:'#8d9091', roughness:.4, metalness:.15 });
    const shadow = new THREE.ShaderMaterial({ vertexShader:groundVertex, fragmentShader:groundFragment, transparent:true, depthWrite:false, uniforms:{uColor:{value:new THREE.Color('#453348')},uStrength:{value:.24}} });
    const pool = new THREE.ShaderMaterial({ vertexShader:groundVertex, fragmentShader:groundFragment, transparent:true, depthWrite:false, uniforms:{uColor:{value:new THREE.Color('#f3c5aa')},uStrength:{value:.2}} });
    return { geometry, body, trim, emitter, cord, touch, shadow, pool };
  }, [controller]);
  useEffect(() => () => {
    Object.values(assets.geometry).forEach(item => item.dispose());
    for (const key of ['body','trim','emitter','cord','touch','shadow','pool']) assets[key].dispose();
  }, [assets]);

  useFrame((_, delta) => {
    const state = controller.getSnapshot();
    const active = controller.isAnimating();
    const snap = state.paused || controller.consumeResume();
    const dt = Math.min(delta,.05);
    const target = state.on ? 1 : 0;
    power.current = snap ? target : THREE.MathUtils.damp(power.current,target,6,dt);
    if (active) phase.current += dt;
    if (group.current) {
      const x = state.paused ? 0 : state.pointerY*.055;
      const y = state.paused ? 0 : state.pointerX*.18 + Math.sin(phase.current*.3)*.065;
      const z = state.paused ? 0 : Math.sin(phase.current*.45)*.009;
      group.current.rotation.set(
        snap ? x : THREE.MathUtils.damp(group.current.rotation.x,x,7,dt),
        snap ? y : THREE.MathUtils.damp(group.current.rotation.y,y,7,dt),
        snap ? z : THREE.MathUtils.damp(group.current.rotation.z,z,7,dt),
      );
      group.current.position.y = state.paused ? 0 : Math.sin(phase.current*.75)*.012;
    }
    assets.body.color.set(state.body);
    assets.trim.color.copy(assets.body.color).multiplyScalar(.88);
    color.setRGB(state.light[0]/255,state.light[1]/255,state.light[2]/255,THREE.SRGBColorSpace);
    assets.emitter.emissive.copy(color);
    assets.emitter.emissiveIntensity = state.brightness * power.current * .95;
    assets.pool.uniforms.uColor.value.copy(color);
    assets.pool.uniforms.uStrength.value = state.brightness * power.current * .34;
    assets.touch.emissive.copy(color);
    assets.touch.emissiveIntensity = power.current * .2;
    if (lampLight.current) {
      lampLight.current.color.copy(color);
      lampLight.current.intensity = state.brightness * power.current * 2.2;
    }
  });

  const g = assets.geometry;
  return <>
    <ambientLight intensity={.85}/>
    <hemisphereLight args={['#fffaf3','#cbc7c5',1.5]}/>
    <directionalLight position={[-3.5,6,4]} intensity={3.2} color="#fff8ed"/>
    <directionalLight position={[4,2,-3]} intensity={1.7} color="#dcd9ed"/>
    <mesh name="contact-shadow" geometry={g.ground} material={assets.shadow} position={[.15,.007,0]} rotation={[-Math.PI/2,0,0]} scale={[3.1,1.9,1]} dispose={null}/>
    <mesh name="light-pool" geometry={g.ground} material={assets.pool} position={[0,.009,0]} rotation={[-Math.PI/2,0,0]} scale={[4.1,3.1,1]} dispose={null}/>
    <group ref={group} name="aura-lamp" dispose={null}>
      <mesh name="lamp-shade" geometry={g.cap} material={assets.body} onAfterRender={onReady}/>
      <mesh name="lamp-stem" geometry={g.stem} material={assets.body}/>
      <mesh name="lamp-rim" geometry={g.rim} material={assets.trim} rotation={[Math.PI/2,0,0]} position={[0,1.88,0]}/>
      <mesh name="lamp-emitter" geometry={g.emitter} material={assets.emitter} rotation={[Math.PI/2,0,0]} position={[0,1.832,0]}/>
      <mesh name="lamp-cord" geometry={g.cord} material={assets.cord}/>
      <mesh name="lamp-touch" geometry={g.touch} material={assets.touch} position={[0,.21,.60]} rotation={[-.18,0,0]}/>
      <pointLight ref={lampLight} name="lamp-light" position={[0,1.70,0]} intensity={1.4} distance={3.8} decay={2}/>
    </group>
  </>;
}

export function mountHero(container, hero = container.closest('#hero-stage')) {
  const controller = createVisualController(hero);
  const root = createRoot(container);
  let failed = false;
  const fail = () => {
    if (failed) return;
    failed = true;
    hero.removeAttribute('data-three-ready');
    controller.dispose();
    queueMicrotask(() => root.unmount());
  };
  const ready = () => { if (!failed && hero.dataset.threeReady !== 'true') hero.dataset.threeReady = 'true'; };
  root.render(<VisualBoundary onFailure={fail}>
    <Canvas frameloop="demand" dpr={controller.getQuality().dpr} camera={{position:[4.5,3.1,8],fov:32,near:.1,far:50}}
      gl={{alpha:true,antialias:true,powerPreference:'low-power'}} fallback={null}
      onCreated={state => configureRenderer(state,fail,[0,1.7,0])}>
      <Invalidation controller={controller}/><LampModel controller={controller} onReady={ready}/>
    </Canvas>
  </VisualBoundary>);
  return fail;
}
