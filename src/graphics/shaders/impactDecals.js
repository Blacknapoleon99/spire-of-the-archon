import * as THREE from 'three';

/**
 * Dynamic Spell Impact Decal System
 * Spawns scorch marks, glacial frost patches, radiant seals, and temporal glyphs
 * on floors and walls with smooth fadeout and memory management.
 */
export class DecalManager {
  constructor(scene) {
    this.scene = scene;
    this.decals = [];
    this.maxDecals = 40;

    this.textures = {
      scorch: this.createScorchTexture(),
      frost: this.createFrostTexture(),
      light: this.createRadiantTexture(),
      chrono: this.createChronoTexture()
    };
  }

  createScorchTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(64, 64, 10, 64, 64, 60);
    grad.addColorStop(0, 'rgba(20, 10, 5, 0.95)');
    grad.addColorStop(0.5, 'rgba(40, 20, 10, 0.7)');
    grad.addColorStop(0.8, 'rgba(255, 87, 34, 0.3)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(64, 64, 60, 0, Math.PI * 2);
    ctx.fill();

    return new THREE.CanvasTexture(canvas);
  }

  createFrostTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 60);
    grad.addColorStop(0, 'rgba(200, 245, 255, 0.9)');
    grad.addColorStop(0.5, 'rgba(0, 229, 255, 0.6)');
    grad.addColorStop(0.8, 'rgba(10, 132, 255, 0.3)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(64, 64, 60, 0, Math.PI * 2);
    ctx.fill();

    return new THREE.CanvasTexture(canvas);
  }

  createRadiantTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 60);
    grad.addColorStop(0, 'rgba(255, 255, 220, 0.95)');
    grad.addColorStop(0.4, 'rgba(255, 215, 0, 0.65)');
    grad.addColorStop(0.8, 'rgba(255, 180, 0, 0.25)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(64, 64, 60, 0, Math.PI * 2);
    ctx.fill();

    return new THREE.CanvasTexture(canvas);
  }

  createChronoTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 60);
    grad.addColorStop(0, 'rgba(240, 200, 255, 0.95)');
    grad.addColorStop(0.5, 'rgba(191, 90, 242, 0.65)');
    grad.addColorStop(0.8, 'rgba(147, 51, 234, 0.25)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(64, 64, 60, 0, Math.PI * 2);
    ctx.fill();

    return new THREE.CanvasTexture(canvas);
  }

  spawnImpactDecal(position, element = 'fire', size = 1.6, duration = 8.0) {
    const tex =
      element === 'fire' ? this.textures.scorch :
      element === 'frost' ? this.textures.frost :
      element === 'light' ? this.textures.light :
      this.textures.chrono;

    const geo = new THREE.PlaneGeometry(size, size);
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: element === 'fire' ? THREE.NormalBlending : THREE.AdditiveBlending
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(position.x, 0.025, position.z); // Slightly above floor to prevent z-fighting
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = Math.random() * Math.PI * 2;

    this.scene.add(mesh);

    const decal = {
      mesh,
      life: duration,
      maxLife: duration
    };

    this.decals.push(decal);

    // Limit maximum active decals for performance
    if (this.decals.length > this.maxDecals) {
      const old = this.decals.shift();
      this.destroyDecal(old);
    }
  }

  update(deltaTime) {
    for (let i = this.decals.length - 1; i >= 0; i--) {
      const d = this.decals[i];
      d.life -= deltaTime;

      // Smooth alpha fadeout in the last 40% of life
      const fadeProgress = d.life / (d.maxLife * 0.4);
      if (fadeProgress < 1.0) {
        d.mesh.material.opacity = Math.max(0, fadeProgress * 0.9);
      }

      if (d.life <= 0) {
        this.destroyDecal(d);
        this.decals.splice(i, 1);
      }
    }
  }

  destroyDecal(decal) {
    if (!decal || !decal.mesh) return;
    this.scene.remove(decal.mesh);
    if (decal.mesh.geometry) decal.mesh.geometry.dispose();
    if (decal.mesh.material) decal.mesh.material.dispose();
  }

  destroy() {
    this.decals.forEach(d => this.destroyDecal(d));
    this.decals = [];
  }
}
