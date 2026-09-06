import * as THREE from 'three';
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';

let noiseTexture;
function getNoiseTexture() {
  if (noiseTexture) return noiseTexture;
  const size = 64;
  const data = new Uint8Array(size ** 3);
  const noise = new ImprovedNoise();
  let i = 0;
  for (let z = 0; z < size; z++) for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    data[i++] = Math.round(255 * THREE.MathUtils.clamp(0.5 + 0.55 * noise.noise(x / 9, y / 9, z / 9), 0, 1));
  }
  noiseTexture = new THREE.Data3DTexture(data, size, size, size);
  noiseTexture.format = THREE.RedFormat;
  noiseTexture.minFilter = noiseTexture.magFilter = THREE.LinearFilter;
  noiseTexture.wrapS = noiseTexture.wrapT = noiseTexture.wrapR = THREE.RepeatWrapping;
  noiseTexture.unpackAlignment = 1;
  noiseTexture.needsUpdate = true;
  return noiseTexture;
}

// Integrate emitting fire and absorbing smoke through a density volume. The
// box is only a ray boundary; its triangles never define the visible shape.
export function createFireVolume(kind = 'tornado') {
  const ball = kind === 'fireball';
  // Keep one raymarched box for the tornado, but give the density field room
  // for a broad lower bowl and an asymmetric crown.  The old 2.2-wide bound
  // clipped the outer fire into two thin, hollow strands at normal gameplay
  // distances.  This is still a single volume; the extra fullness comes from
  // the layered density function below rather than another raymarch pass.
  const halfSize = ball ? new THREE.Vector3(1, 1, 1) : new THREE.Vector3(2.75, 3.55, 2.75);
  const material = new THREE.ShaderMaterial({
    name: 'FireDensityVolume',
    glslVersion: THREE.GLSL3,
    uniforms: {
      uNoise: { value: getNoiseTexture() },
      uCamera: { value: new THREE.Vector3() },
      uHalfSize: { value: halfSize },
      uTime: { value: 0 },
      uOpacity: { value: 1 },
      uSteps: { value: ball ? 24 : 40 },
      uBall: { value: ball ? 1 : 0 }
    },
    vertexShader: `
      out vec3 vPosition;
      void main() {
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      precision highp sampler3D;
      uniform sampler3D uNoise;
      uniform vec3 uCamera, uHalfSize;
      uniform float uTime, uOpacity, uBall;
      uniform int uSteps;
      uniform mat4 projectionMatrix, modelViewMatrix;
      in vec3 vPosition;
      out vec4 outColor;
      float turbulence(vec3 p) {
        return texture(uNoise, p * 0.23).r * 0.62
          + texture(uNoise, p * 0.61 + 0.17).r * 0.28
          + texture(uNoise, p * 1.37).r * 0.10;
      }
      void main() {
        bool inside = all(lessThan(abs(uCamera), uHalfSize));
        if ((inside && gl_FrontFacing) || (!inside && !gl_FrontFacing)) discard;
        vec3 rd = normalize(vPosition - uCamera);
        vec3 inv = 1.0 / (sign(rd + 0.000001) * max(abs(rd), vec3(0.00001)));
        vec3 t0 = (-uHalfSize - uCamera) * inv;
        vec3 t1 = (uHalfSize - uCamera) * inv;
        vec3 lo = min(t0, t1), hi = max(t0, t1);
        float start = max(max(lo.x, lo.y), max(lo.z, 0.0));
        float end = min(min(hi.x, hi.y), hi.z);
        if (end <= start) discard;
        float stepSize = (end - start) / float(uSteps);
        float jitter = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898,78.233))) * 43758.5453);
        float t = start + stepSize * jitter;
        vec4 accum = vec4(0.0);
        float firstHit = end;
        for (int i = 0; i < 56; i++) {
          if (i >= uSteps || accum.a > 0.97) break;
          vec3 p = uCamera + rd * t;
          float h = (p.y + uHalfSize.y) / (2.0 * uHalfSize.y);
          // Two slow counter-flowing rotations keep the column upright while
          // the smaller bands provide readable layered flame rather than a
          // hollow DNA silhouette.
          float angle = h * 5.4 - uTime * 1.55;
          mat2 spin = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
          vec3 q = p;
          q.xz = spin * (p.xz - vec2(sin(h*7.0-uTime*1.1)*0.20, cos(h*5.0+uTime*0.9)*0.16) * h);
          q.y -= uTime * 2.15;
          float n = turbulence(q * vec3(1.4, 0.65, 1.4));
          // A generous bowl at the foot, a wide shoulder through the middle,
          // and a tapering crown read as one solid funnel from every angle.
          float radius = 0.38 + 1.94 * pow(h, 0.78) + 0.48 * exp(-h * 13.0);
          float radial = length(q.xz);
          float radial01 = radial / max(radius, 0.001);
          float envelope = 1.0 - radial01;
          float azimuth = atan(q.z, q.x);
          // A broad inner body prevents the shell from reading as two hollow
          // ropes, while the shell and bands preserve depth and movement.
          float body = 1.0 - smoothstep(0.16, 1.04, radial01);
          float shell = exp(-pow((radial01 - 0.76 - n * 0.045) * 3.0, 2.0));
          float spiralA = sin(azimuth * 2.0 - h * 13.0 + n * 1.7);
          float spiralB = sin(azimuth * 3.0 + h * 17.0 - uTime * 0.35 + n * 2.1);
          float strands = smoothstep(-0.30, 0.78, spiralA);
          float windBands = smoothstep(0.10, 0.92, spiralB) * (0.45 + 0.55 * smoothstep(0.12, 0.78, h));
          float innerFlame = body * (0.22 + 0.58 * strands + 0.24 * windBands);
          // Broad grounded ignition, a twisting waist, and tapering flame tips.
          float tip = 1.0 - smoothstep(0.79 + n * 0.10, 1.0, h);
          float density = max(0.0, shell * (0.66 + 0.42 * strands) + innerFlame * 0.72 + (n - 0.49) * 0.92) * tip;
          density *= (0.16 + 0.84 * smoothstep(-0.2, 0.15, envelope));
          // Small side tongues break up the silhouette without extending past
          // the ray boundary. Their phase follows the main wind field.
          float lick = smoothstep(0.34, 0.94, sin(azimuth * 4.0 - h * 21.0 + n * 2.6));
          density += lick * (0.10 + 0.18 * h) * body * tip;
          density *= smoothstep(0.0, 0.035, h);
          if (uBall > 0.5) {
            envelope = 1.0 - length(p) / 0.76;
            density = max(0.0, envelope + (n - 0.5) * 1.9);
          }
          float hot = clamp(density * 0.9 + n * 0.55 - h * 0.25, 0.0, 1.0);
          vec3 fire = mix(vec3(0.24,0.008,0.002), vec3(2.4,0.40,0.018), smoothstep(0.18,0.8,hot));
          fire = mix(fire, vec3(3.2,1.3,0.24), smoothstep(0.86,1.0,hot));
          float smoke = uBall > 0.5 ? 0.0 : smoothstep(0.57,0.92,h) * 0.23;
          fire = mix(fire, vec3(0.095,0.065,0.045), smoke);
          float a = (1.0 - exp(-density * stepSize * 1.8)) * uOpacity;
          if (a > 0.008 && firstHit == end) firstHit = t;
          accum.rgb += (1.0 - accum.a) * fire * a;
          accum.a += (1.0 - accum.a) * a;
          t += stepSize;
        }
        if (accum.a < 0.005) discard;
        // Depth-test the first visible fire, not the back of its bounding box.
        vec4 hitClip = projectionMatrix * modelViewMatrix * vec4(uCamera + rd * firstHit, 1.0);
        gl_FragDepth = hitClip.z / hitClip.w * 0.5 + 0.5;
        // Fade locally when the viewer walks into a friendly spell volume.
        float nearFade = smoothstep(0.35, 1.6, length(uCamera.xz));
        outColor = vec4(accum.rgb / max(accum.a, 0.001), accum.a * nearFade);
      }
    `,
    side: THREE.DoubleSide,
    forceSinglePass: true,
    transparent: true,
    depthWrite: false,
    toneMapped: true
  });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(halfSize.x * 2, halfSize.y * 2, halfSize.z * 2), material);
  mesh.name = ball ? 'FireballDensityVolume' : 'TornadoDensityVolume';
  mesh.onBeforeRender = (_renderer, _scene, camera) => {
    mesh.worldToLocal(camera.getWorldPosition(material.uniforms.uCamera.value));
  };
  if (!ball) mesh.position.y = halfSize.y;
  return mesh;
}
