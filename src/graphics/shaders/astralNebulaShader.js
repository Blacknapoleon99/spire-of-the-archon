import * as THREE from 'three';

/**
 * High-Fidelity Animated Astral Nebula & Cosmos GLSL Shader Material
 * Features: Coordinate-distorting celestial nebula swirls, twinkling star clusters,
 * and radiant aurora borealis ribbons.
 */
export function createAstralNebulaMaterial() {
  const uniforms = {
    uTime: { value: 0.0 },
    uColorDeep: { value: new THREE.Color(0x060212) },
    uColorNebula1: { value: new THREE.Color(0x7928ca) },
    uColorNebula2: { value: new THREE.Color(0x00d2ff) },
    uColorStar: { value: new THREE.Color(0xffffff) },
    uSpeed: { value: 0.2 }
  };

  const vertexShader = `
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;

    void main() {
      vUv = uv;
      vNormal = normal;
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    uniform float uTime;
    uniform vec3 uColorDeep;
    uniform vec3 uColorNebula1;
    uniform vec3 uColorNebula2;
    uniform vec3 uColorStar;
    uniform float uSpeed;
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;

    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

    float snoise(vec2 v) {
      const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
      vec2 i  = floor(v + dot(v, C.yy));
      vec2 x0 = v -   i + dot(i, C.xx);
      vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod289(i);
      vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
      vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
      m = m * m;
      m = m * m;
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
      vec3 g;
      g.x  = a0.x  * x0.x  + h.x  * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }

    void main() {
      vec2 uv = vUv * 3.0;
      float t = uTime * uSpeed;

      // Swirling coordinate warping
      float warp1 = snoise(uv + vec2(t * 0.2, -t * 0.15));
      float warp2 = snoise(uv * 1.5 + vec2(-t * 0.1, t * 0.25) + vec2(warp1 * 0.5));
      vec2 warpedUv = uv + vec2(warp1, warp2) * 0.35;

      // Nebula cloud intensities
      float n1 = smoothstep(-0.2, 0.7, snoise(warpedUv * 1.2 + vec2(t * 0.05)));
      float n2 = smoothstep(-0.1, 0.8, snoise(warpedUv * 2.0 - vec2(t * 0.08)));

      vec3 col = uColorDeep;
      col = mix(col, uColorNebula1, n1 * 0.8);
      col = mix(col, uColorNebula2, n2 * 0.75);

      // Micro star twinkling clusters
      float starNoise = snoise(vUv * 45.0);
      float stars = pow(max(0.0, starNoise), 14.0) * 8.0;
      float twinkle = sin(uTime * 3.0 + starNoise * 15.0) * 0.5 + 0.5;
      col += uColorStar * (stars * twinkle * 1.8);

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    side: THREE.DoubleSide
  });

  return { material, uniforms };
}
