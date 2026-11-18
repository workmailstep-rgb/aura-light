import * as THREE from 'three';

export function createLampGeometry(segments = 64) {
  const cap = [];
  for (let i = 0; i <= 32; i++) {
    const angle = i / 32 * Math.PI / 2;
    cap.push(new THREE.Vector2(1.58 * Math.sin(angle), 1.92 + 1.62 * Math.cos(angle)));
  }
  cap.push(new THREE.Vector2(1.575, 1.87), new THREE.Vector2(1.50, 1.84), new THREE.Vector2(.32, 1.84), new THREE.Vector2(0, 1.84));
  const stemProfile = [[0,.025],[.42,.025],[.56,.08],[.59,.16],[.56,.28],[.49,.56],[.40,.98],[.34,1.45],[.32,1.92],[0,1.94]];
  const stemCurve = new THREE.SplineCurve(stemProfile.map(point => new THREE.Vector2(...point)));
  const cordCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(.25,.04,-.2), new THREE.Vector3(.6,.025,-.42),
    new THREE.Vector3(1.05,.025,-.35), new THREE.Vector3(1.65,.025,-.12), new THREE.Vector3(2.1,.025,-.25),
  ]);
  return {
    cap: new THREE.LatheGeometry(cap.reverse(), segments),
    stem: new THREE.LatheGeometry(stemCurve.getPoints(36).map(p => new THREE.Vector2(Math.max(0,p.x),p.y)), segments),
    rim: new THREE.TorusGeometry(1.525,.025,8,segments),
    emitter: new THREE.RingGeometry(.32,1.48,segments),
    cord: new THREE.TubeGeometry(cordCurve,48,.012,6,false),
    touch: new THREE.TorusGeometry(.031,.004,6,24),
    ground: new THREE.PlaneGeometry(1,1),
  };
}

export const groundVertex = `varying vec2 vUv;
void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;

export const groundFragment = `varying vec2 vUv;
uniform vec3 uColor;uniform float uStrength;
void main(){float d=length((vUv-.5)*2.);float a=pow(1.-smoothstep(.05,1.,d),2.)*uStrength;
gl_FragColor=vec4(uColor,a);
#include <colorspace_fragment>
}`;
