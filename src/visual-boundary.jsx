import React from 'react';
import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';

export class VisualBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure(); }
  render() { return this.state.failed ? null : this.props.children; }
}

export function Invalidation({ controller, maxDpr = Infinity }) {
  const invalidate = useThree(state => state.invalidate);
  const setDpr = useThree(state => state.setDpr);
  const window = useThree(state => state.gl.domElement.ownerDocument?.defaultView);
  useEffect(() => controller.attachRenderer(invalidate), [controller, invalidate]);
  useEffect(() => {
    const resize = () => setDpr(Math.min(controller.getQuality().dpr,maxDpr));
    resize();
    window?.addEventListener('resize',resize);
    return () => window?.removeEventListener('resize',resize);
  }, [controller,maxDpr,setDpr,window]);
  return null;
}

export function configureRenderer(state, onFailure, target = null) {
  const { gl, camera } = state;
  gl.setClearColor(0x000000, 0);
  gl.debug.onShaderError = onFailure;
  gl.domElement.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    onFailure();
  }, { once: true });
  if (target) camera.lookAt(...target);
}
