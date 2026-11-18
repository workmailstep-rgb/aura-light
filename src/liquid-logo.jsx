import React, { Suspense, useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { createVisualController } from './visual-state.js';
import { createLiquidFragment, liquidVertex } from './liquid-shader.js';
import { VisualBoundary, Invalidation, configureRenderer } from './visual-boundary.jsx';

export function LiquidMark({ controller, onReady }) {
  const texture = useLoader(THREE.TextureLoader, '/assets/liquid-logo-depth.png');
  const elapsed = useRef(0);
  const material = useMemo(() => {
    texture.flipY = false;
    texture.colorSpace = THREE.NoColorSpace;
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    return new THREE.RawShaderMaterial({
      vertexShader:liquidVertex,fragmentShader:createLiquidFragment(),glslVersion:THREE.GLSL3,
      transparent:true,premultipliedAlpha:true,depthTest:false,depthWrite:false,toneMapped:false,
      uniforms:{
        u_image_texture:{value:texture},u_time:{value:0},u_ratio:{value:1},u_img_ratio:{value:544/192},
        u_patternScale:{value:2},u_refraction:{value:.008},u_edge:{value:.35},
        u_patternBlur:{value:.015},u_liquid:{value:.045},
        u_lightColor:{value:new THREE.Vector3(.67,.69,.60)},u_darkColor:{value:new THREE.Vector3(.27,.20,.29)},
      },
    });
  }, [texture]);
  useEffect(() => () => {
    material.dispose();texture.dispose();
    useLoader.clear(THREE.TextureLoader,'/assets/liquid-logo-depth.png');
  }, [material,texture]);
  useFrame((state,delta) => {
    if (controller.isAnimating()) elapsed.current += Math.min(delta,.05)*1000*.15;
    material.uniforms.u_time.value = elapsed.current;
    material.uniforms.u_ratio.value = state.size.width/state.size.height;
  });
  return <mesh name="aura-liquid-logo" material={material} onAfterRender={onReady}>
    <planeGeometry args={[2,2]}/>
  </mesh>;
}

export function mountLogo(container, element = container.parentElement) {
  const controller = createVisualController(element, {watchLight:false});
  const root = createRoot(container);
  let failed = false;
  const fail = () => {
    if (failed) return;
    failed = true;
    element.removeAttribute('data-liquid-ready');
    controller.dispose();
    queueMicrotask(() => root.unmount());
  };
  const ready = () => { if (!failed && element.dataset.liquidReady !== 'true') element.dataset.liquidReady = 'true'; };
  root.render(<VisualBoundary onFailure={fail}>
    <Canvas frameloop="demand" dpr={Math.min(controller.getQuality().dpr,1.5)} gl={{alpha:true,antialias:false,powerPreference:'low-power'}} fallback={null} onCreated={state=>configureRenderer(state,fail)}>
      <Invalidation controller={controller} maxDpr={1.5}/>
      <Suspense fallback={null}><LiquidMark controller={controller} onReady={ready}/></Suspense>
    </Canvas>
  </VisualBoundary>);
  return fail;
}
