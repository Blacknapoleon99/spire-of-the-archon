import * as THREE from 'three';

/**
 * High-Fidelity Animated Lava GLSL Shader Material
 * Features: Dual-layer scrolling magma turbulence, incandescent emissive fissures,
 * and cooling obsidian basalt crust.
 */
export function createAnimatedLavaMaterial() {
  const uniforms = {
    uTime: { value: 0.0 },
    uCrustColor: { value: new THREE.Color(0x1a0703) },
    uHotLavaColor: { value: new THREE.Color(0xff3700) },
    uCoreGlowColor: { value: new THREE.Color(0xffe600) },
    uSpeed: { value: 0.25 },
    uScale: { value: 3.5 }
  };

  const vertexShader = `
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;
    uniform float uTime;
    uniform float uSpeed;

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
      vUv = uv;
      vNormal = normal;
      vec3 pos = position;

      // Subtle magma vertex wave pulsation
      float wave = snoise(uv * 4.0 + vec2(uTime * uSpeed * 0.5, uTime * uSpeed * 0.3)) * 0.08;
      pos.y += wave;

      vPosition = pos;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `;

  const fragmentShader = `
    uniform float uTime;
    uniform vec3 uCrustColor;
    uniform vec3 uHotLavaColor;
    uniform vec3 uCoreGlowColor;
    uniform float uSpeed;
    uniform float uScale;
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
      float t = uTime * uSpeed;

      // Layer 1: Slow sweeping magma drift
      vec2 uv1 = vUv * uScale + vec2(t * 0.15, t * 0.08);
      float n1 = snoise(uv1);

      // Layer 2: Fast counter-flow turbulence
      vec2 uv2 = vUv * (uScale * 1.8) + vec2(-t * 0.22, t * 0.18) + vec2(n1 * 0.4);
      float n2 = snoise(uv2);

      // Combine noise layers to form deep fissures
      float combined = (n1 * 0.6 + n2 * 0.4);
      float heat = smoothstep(-0.25, 0.65, combined);

      // Dynamic color ramping: Obsidian Crust -> Hot Lava Orange -> Incandescent Core White-Gold
      vec3 col = mix(uCrustColor, uHotLavaColor, heat);

      float coreHeat = smoothstep(0.45, 0.85, combined);
      col = mix(col, uCoreGlowColor, coreHeat * 1.4);

      // Add intense emissive bloom boost for hot areas
      col += uCoreGlowColor * (coreHeat * 0.8);

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
