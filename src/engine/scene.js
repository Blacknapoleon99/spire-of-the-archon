import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

/**
 * Custom Cinematic ShaderPass: Dynamic Vignette, Radial Chromatic Aberration,
 * Subtle Dark-Fantasy Film Grain, and Directional Hit-Damage Red Pulsing.
 */
export const CinematicPostShader = {
  name: 'CinematicPostShader',
  uniforms: {
    tDiffuse: { value: null },
    vignetteIntensity: { value: 0.42 },
    vignetteRoundness: { value: 0.82 },
    chromaticAberration: { value: 0.0014 },
    filmGrain: { value: 0.022 },
    time: { value: 0.0 },
    hitVignette: { value: 0.0 },
    lowHealthPulse: { value: 0.0 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float vignetteIntensity;
    uniform float vignetteRoundness;
    uniform float chromaticAberration;
    uniform float filmGrain;
    uniform float time;
    uniform float hitVignette;
    uniform float lowHealthPulse;
    varying vec2 vUv;

    float rand(vec2 co) {
      return fract(sin(dot(co.xy, vec2(12.9898, 78.233)) + time) * 43758.5453);
    }

    void main() {
      vec2 uv = vUv;
      vec2 distFromCenter = uv - 0.5;
      float dist = length(distFromCenter);

      // Radial Chromatic Aberration with edge intensification
      float caAmount = chromaticAberration * (1.0 + dist * 1.8);
      vec2 caOffset = distFromCenter * caAmount;
      float r = texture2D(tDiffuse, uv - caOffset).r;
      float g = texture2D(tDiffuse, uv).g;
      float b = texture2D(tDiffuse, uv + caOffset).b;
      vec3 color = vec3(r, g, b);

      // Smooth Radial Vignette
      float vig = smoothstep(0.82, 0.82 - vignetteRoundness, dist * (1.0 + vignetteIntensity * 0.65));
      color *= (0.38 + 0.62 * vig);

      // Red Damage Flash Vignette
      float totalHit = max(hitVignette, lowHealthPulse * (0.5 + 0.5 * sin(time * 6.0)));
      if (totalHit > 0.001) {
        float edgeDmg = smoothstep(0.25, 0.72, dist) * totalHit;
        color = mix(color, vec3(0.95, 0.06, 0.06) * (color.r * 1.8 + 0.35), edgeDmg * 0.85);
      }

      // Subtle Dark Fantasy Film Grain
      float grain = (rand(uv) - 0.5) * filmGrain;
      color += grain;

      gl_FragColor = vec4(color, 1.0);
    }
  `
};

/**
 * High-Fidelity First-Person Three.js Scene, Camera, Lighting, Screen Shake,
 * HDR Bloom Post-Processing, and Renderer Manager.
 */
export class EngineScene {
  constructor(containerId) {
    this.container = document.getElementById(containerId);

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x07080f);
    this.scene.fog = new THREE.FogExp2(0x07080f, 0.024);

    // Camera (First-Person eye level, 75 FOV)
    const aspect = window.innerWidth / window.innerHeight;
    this.baseFov = 75;
    this.currentFov = 75;
    this.targetFov = 75;
    this.camera = new THREE.PerspectiveCamera(this.baseFov, aspect, 0.05, 1000);
    this.camera.position.set(0, 1.7, 31);
    this.scene.add(this.camera);

    // Screen Shake & Camera Trauma
    this.shakeIntensity = 0;
    this.shakeDuration = 0;
    this.shakeTimer = 0;
    this.shakeOffset = new THREE.Vector3();
    this.shakeRot = new THREE.Euler();

    // Hit Vignette & Chromatic Surge States
    this.hitVignetteIntensity = 0;
    this.caSurge = 0;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      stencil: false
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.container.appendChild(this.renderer.domElement);

    this.setupLighting();
    this.setupPostProcessing();

    window.addEventListener('resize', () => this.onWindowResize());
  }

  setupLighting() {
    // Ambient light with atmospheric deep blue-violet tone
    this.ambientLight = new THREE.AmbientLight(0x23253b, 1.4);
    this.scene.add(this.ambientLight);

    // Main moonlight / astral ceiling light
    this.dirLight = new THREE.DirectionalLight(0xb0c4de, 1.5);
    this.dirLight.position.set(10, 25, 15);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 0.5;
    this.dirLight.shadow.camera.far = 70;
    this.dirLight.shadow.camera.left = -25;
    this.dirLight.shadow.camera.right = 25;
    this.dirLight.shadow.camera.top = 25;
    this.dirLight.shadow.camera.bottom = -25;
    this.scene.add(this.dirLight);

    // Atmospheric warm torch fill lights
    this.torch1 = new THREE.PointLight(0xff9e00, 1.6, 25);
    this.torch1.position.set(-12, 4, -12);
    this.scene.add(this.torch1);

    this.torch2 = new THREE.PointLight(0xff9e00, 1.6, 25);
    this.torch2.position.set(12, 4, 12);
    this.scene.add(this.torch2);

    this.arcaneFill = new THREE.PointLight(0x7928ca, 1.4, 30);
    this.arcaneFill.position.set(0, 7, 0);
    this.scene.add(this.arcaneFill);
  }

  setupPostProcessing() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.composer = new EffectComposer(this.renderer);

    // 1. Base Scene Render Pass
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);

    // 2. High-Performance HDR UnrealBloomPass for Emissive Magic, Crystals & Runes
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      1.15, // strength
      0.55, // radius
      0.82  // threshold (only bright emissive elements bloom!)
    );
    this.composer.addPass(this.bloomPass);

    // 3. Cinematic Vignette + Chromatic Aberration + Film Grain Pass
    this.cinematicPass = new ShaderPass(CinematicPostShader);
    this.composer.addPass(this.cinematicPass);

    // 4. Output Pass for Tone Mapping & Color Space Accuracy
    this.outputPass = new OutputPass();
    this.composer.addPass(this.outputPass);
  }

  /**
   * Sets floor-distinct cinematic atmosphere, ambient coloring, and fog density
   */
  setFloorLighting(floorNumber) {
    if (floorNumber === 1) {
      // Floor 1: The Scribe's Archives (Deep Midnight Cobalt)
      this.scene.background.setHex(0x060810);
      this.scene.fog.color.setHex(0x060810);
      this.scene.fog.density = 0.022;
      this.ambientLight.color.setHex(0x1a1c30);
      this.ambientLight.intensity = 1.3;
      this.dirLight.color.setHex(0x8fa8d6);
      this.dirLight.intensity = 1.4;
      this.arcaneFill.color.setHex(0x7928ca);
      this.arcaneFill.intensity = 1.3;
      if (this.bloomPass) {
        this.bloomPass.strength = 1.1;
        this.bloomPass.threshold = 0.82;
      }
    } else if (floorNumber === 2) {
      // Floor 2: The Alchemical Forge (Smoldering Volcanic Amber)
      this.scene.background.setHex(0x140603);
      this.scene.fog.color.setHex(0x140603);
      this.scene.fog.density = 0.026;
      this.ambientLight.color.setHex(0x381206);
      this.ambientLight.intensity = 1.5;
      this.dirLight.color.setHex(0xff7043);
      this.dirLight.intensity = 1.8;
      this.arcaneFill.color.setHex(0xff5722);
      this.arcaneFill.intensity = 1.9;
      if (this.bloomPass) {
        this.bloomPass.strength = 1.35; // Hotter molten glow
        this.bloomPass.threshold = 0.78;
      }
    } else if (floorNumber === 3) {
      // Floor 3: The Astral Observatory (Deep Cosmic Violet / Starlight)
      this.scene.background.setHex(0x050414);
      this.scene.fog.color.setHex(0x050414);
      this.scene.fog.density = 0.019;
      this.ambientLight.color.setHex(0x281c4e);
      this.ambientLight.intensity = 1.6;
      this.dirLight.color.setHex(0xc084fc);
      this.dirLight.intensity = 2.0;
      this.arcaneFill.color.setHex(0x9333ea);
      this.arcaneFill.intensity = 2.1;
      if (this.bloomPass) {
        this.bloomPass.strength = 1.45; // Radiant cosmic starlight
        this.bloomPass.threshold = 0.76;
      }
    }
  }

  /**
   * Adds cinematic camera screen shake with trauma decay
   */
  addScreenShake(intensity = 0.25, duration = 0.3) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeDuration = duration;
    this.shakeTimer = duration;
  }

  /**
   * Triggers a momentary red vignette pulse on damage taken
   */
  triggerDamageFlash(intensity = 0.8) {
    this.hitVignetteIntensity = Math.max(this.hitVignetteIntensity, intensity);
  }

  /**
   * Triggers chromatic aberration surge (e.g. dash speed warp or crit hit)
   */
  triggerChromaticSurge(amount = 0.006) {
    this.caSurge = Math.max(this.caSurge, amount);
  }

  /**
   * Triggers a golden-cyan chromatic flash during temporal rewinds and resurrection
   */
  triggerChronoFlash() {
    this.triggerChromaticSurge(0.012);
    this.addScreenShake(0.35, 0.45);
  }

  /**
   * Sets target FOV for speed warping (e.g. dash or sprint)
   */
  setTargetFOV(fov) {
    this.targetFov = fov;
  }

  updateCameraPosition(playerPos, deltaTime = 0.016) {
    if (!playerPos) return;

    // FOV Smoothing
    if (Math.abs(this.currentFov - this.targetFov) > 0.1) {
      this.currentFov += (this.targetFov - this.currentFov) * Math.min(1.0, deltaTime * 10);
      this.camera.fov = this.currentFov;
      this.camera.updateProjectionMatrix();
    }

    // Screen Shake update
    this.shakeOffset.set(0, 0, 0);
    if (this.shakeTimer > 0) {
      this.shakeTimer -= deltaTime;
      const progress = Math.max(0, this.shakeTimer / this.shakeDuration);
      const trauma = progress * progress * this.shakeIntensity;

      this.shakeOffset.set(
        (Math.random() - 0.5) * trauma * 0.4,
        (Math.random() - 0.5) * trauma * 0.3,
        (Math.random() - 0.5) * trauma * 0.4
      );
    }

    this.camera.position.x = playerPos.x + this.shakeOffset.x;
    this.camera.position.y = 1.7 + this.shakeOffset.y;
    this.camera.position.z = playerPos.z + this.shakeOffset.z;

    // Torch light flicker modulation
    const time = Date.now() * 0.001;
    if (this.torch1) {
      this.torch1.intensity = 1.5 + 0.4 * Math.sin(time * 12 + Math.cos(time * 7));
    }
    if (this.torch2) {
      this.torch2.intensity = 1.5 + 0.4 * Math.sin(time * 14 + Math.sin(time * 9));
    }

    // Decay Post-Processing Shaders
    if (this.cinematicPass) {
      this.cinematicPass.uniforms.time.value = time;

      // Decay Hit Vignette
      if (this.hitVignetteIntensity > 0) {
        this.hitVignetteIntensity = Math.max(0, this.hitVignetteIntensity - deltaTime * 2.5);
      }
      this.cinematicPass.uniforms.hitVignette.value = this.hitVignetteIntensity;

      // Decay Chromatic Aberration Surge
      if (this.caSurge > 0) {
        this.caSurge = Math.max(0, this.caSurge - deltaTime * 0.02);
      }
      this.cinematicPass.uniforms.chromaticAberration.value = 0.0014 + this.caSurge;
      if (this.cinematicPass.uniforms.lowHealthPulse) {
        this.cinematicPass.uniforms.lowHealthPulse.value = this.lowHealthRatio || 0.0;
      }
    }
  }

  setLowHealthPulse(ratio) {
    this.lowHealthRatio = Math.max(0, Math.min(1, ratio));
  }

  onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    if (this.composer) {
      this.composer.setSize(width, height);
    }
  }

  render() {
    if (this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }
}


