import { liquidFragSource } from './vendor/liquid-frag.js';

// Paper Design's original fragment is preserved separately; this adapter adds AURA's palette.
export function createLiquidFragment() {
  return liquidFragSource
    .replace('#version 300 es\n','')
    .replace('uniform float u_liquid;', 'uniform float u_liquid;\nuniform vec3 u_lightColor;\nuniform vec3 u_darkColor;')
    .replace('vec3 color1 = vec3(.98, 0.98, 1.);','vec3 color1 = u_lightColor;')
    .replace('vec3 color2 = vec3(.1, .1, .1 + .1 * smoothstep(.7, 1.3, uv.x + uv.y));','vec3 color2 = u_darkColor;');
}

export const liquidVertex = `precision mediump float;
in vec3 position;out vec2 vUv;
void main(){vUv=.5*(position.xy+1.);gl_Position=vec4(position,1.);}`;
