import * as THREE from 'three';

export class AmbientParticles {
  constructor(scene) {
    this.scene = scene;
    this.particleSystem = null;
    this.floorNumber = 0;
  }

  setFloor(floorNumber) {
    this.destroy();
    this.floorNumber = floorNumber;

    if (floorNumber === 1) this.initFloor1();
    else if (floorNumber === 2) this.initFloor2();
    else if (floorNumber === 3) this.initFloor3();
    else if (floorNumber === 4) this.initFloorGenericDust(0x8844ff, 0x4422aa, 80); // Mirror Gallery - violet motes
    else if (floorNumber === 5) this.initFloorEmbers(0xff4400, 0xff2200, 200);     // Boss Ignis - heavy ember storm
    else if (floorNumber === 6) this.initFloorEmbers(0xff6600, 0xff3300, 140);     // Foundry - forge embers
    else if (floorNumber === 7) this.initFloorGenericDust(0x00ccff, 0x0088aa, 90); // Golem Lab - cyan sparks
    else if (floorNumber === 8) this.initFloorGenericDust(0x4488ff, 0x2244cc, 100); // Crystal Caverns - ice motes
    else if (floorNumber === 9) this.initFloorGenericDust(0x7722ee, 0x330088, 60);  // Void Catwalks - void wisps
    else if (floorNumber === 10) this.initFloorEmbers(0x9900ff, 0x6600cc, 180);    // Boss Astraea - void corruption
    else if (floorNumber === 11) this.initFloorGenericDust(0xeeddff, 0xaabbff, 120); // Star Gallery - star motes
    else if (floorNumber === 12) this.initFloorGenericDust(0xffcc44, 0xdd8800, 60);  // Chronometer - golden sparks
    else if (floorNumber === 13) this.initFloorGenericDust(0x8899ff, 0x4466dd, 70);  // Sky Promenade - sky motes
    else if (floorNumber === 14) this.initFloorGenericDust(0xffd700, 0xddaa00, 80);  // Sanctum - sacred light motes
    else if (floorNumber === 15) this.initFloorEmbers(0xffd700, 0xff8800, 240);     // Boss Valerius - astral storm
  }

  initFloorGenericDust(colorStr1, colorStr2, count = 80) {
    const c1 = new THREE.Color(colorStr1);
    const c2 = new THREE.Color(colorStr2);
    const particleCount = count;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = [];
    const phases = [];
    const radius = 20;

    for (let i = 0; i < particleCount; i++) {
      const r = Math.sqrt(Math.random()) * radius;
      const theta = Math.random() * 2 * Math.PI;
      positions[i * 3] = r * Math.cos(theta);
      positions[i * 3 + 1] = Math.random() * 10;
      positions[i * 3 + 2] = r * Math.sin(theta);
      velocities.push({ x: (Math.random() - 0.5) * 0.06, y: (Math.random() - 0.5) * 0.06, z: (Math.random() - 0.5) * 0.06 });
      phases.push(Math.random() * Math.PI * 2);
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const texture = this.createCircleTexture(
      `rgba(${Math.round(c1.r * 255)}, ${Math.round(c1.g * 255)}, ${Math.round(c1.b * 255)}, 1)`,
      `rgba(${Math.round(c2.r * 255)}, ${Math.round(c2.g * 255)}, ${Math.round(c2.b * 255)}, 0)`
    );
    const material = new THREE.PointsMaterial({ size: 0.14, map: texture, transparent: true, opacity: 0.45, color: 0xffffff, blending: THREE.AdditiveBlending, depthWrite: false });
    this.particleSystem = new THREE.Points(geometry, material);
    this.particleSystem.userData = { velocities, phases, radius };
    this.scene.add(this.particleSystem);
  }

  initFloorEmbers(colorStr1, colorStr2, count = 150) {
    const c1 = new THREE.Color(colorStr1);
    const c2 = new THREE.Color(colorStr2);
    const particleCount = count;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const phases = [];
    const radius = 24;

    for (let i = 0; i < particleCount; i++) {
      const r = Math.sqrt(Math.random()) * radius;
      const theta = Math.random() * 2 * Math.PI;
      positions[i * 3] = r * Math.cos(theta);
      positions[i * 3 + 1] = Math.random() * 16;
      positions[i * 3 + 2] = r * Math.sin(theta);
      phases.push(Math.random() * Math.PI * 2);
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const texture = this.createCircleTexture(
      `rgba(${Math.round(c1.r * 255)}, ${Math.round(c1.g * 255)}, ${Math.round(c1.b * 255)}, 1)`,
      `rgba(${Math.round(c2.r * 255)}, ${Math.round(c2.g * 255)}, ${Math.round(c2.b * 255)}, 0)`
    );
    const material = new THREE.PointsMaterial({ size: 0.25, map: texture, transparent: true, opacity: 0.7, color: 0xffffff, blending: THREE.AdditiveBlending, depthWrite: false });
    this.particleSystem = new THREE.Points(geometry, material);
    this.particleSystem.userData = { phases, radius, isEmbers: true };
    this.scene.add(this.particleSystem);
  }

  createCircleTexture(color1, color2) {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, color1);
    gradient.addColorStop(1, color2);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 32, 32);
    return new THREE.CanvasTexture(canvas);
  }

  initFloor1() {
    // Floor 1 (Archives): Dust motes
    const particleCount = 80;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = [];
    const phases = [];
    const radius = 18;

    for (let i = 0; i < particleCount; i++) {
      const r = Math.sqrt(Math.random()) * radius;
      const theta = Math.random() * 2 * Math.PI;
      positions[i * 3] = r * Math.cos(theta);
      positions[i * 3 + 1] = Math.random() * 10;
      positions[i * 3 + 2] = r * Math.sin(theta);
      
      velocities.push({
        x: (Math.random() - 0.5) * 0.1,
        y: (Math.random() - 0.5) * 0.1,
        z: (Math.random() - 0.5) * 0.1
      });
      phases.push(Math.random() * Math.PI * 2);
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const texture = this.createCircleTexture('rgba(255, 215, 0, 1)', 'rgba(255, 215, 0, 0)');
    const material = new THREE.PointsMaterial({
      size: 0.15,
      map: texture,
      transparent: true,
      opacity: 0.4,
      color: 0xffffff,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.particleSystem = new THREE.Points(geometry, material);
    this.particleSystem.userData = { velocities, phases, radius };
    this.scene.add(this.particleSystem);
  }

  initFloor2() {
    // Floor 2 (Forge): Colossal Cavern Ember sparks (scaled for 65m radius)
    const particleCount = 280;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const phases = [];
    const radius = 62;

    for (let i = 0; i < particleCount; i++) {
      const r = Math.sqrt(Math.random()) * radius;
      const theta = Math.random() * 2 * Math.PI;
      positions[i * 3] = r * Math.cos(theta);
      positions[i * 3 + 1] = Math.random() * 20;
      positions[i * 3 + 2] = r * Math.sin(theta);
      
      phases.push(Math.random() * Math.PI * 2);
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const texture = this.createCircleTexture('rgba(255, 100, 0, 1)', 'rgba(255, 50, 0, 0)');
    const material = new THREE.PointsMaterial({
      size: 0.35,
      map: texture,
      transparent: true,
      opacity: 0.85,
      color: 0xffffff,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.particleSystem = new THREE.Points(geometry, material);
    this.particleSystem.userData = { phases, radius };
    this.scene.add(this.particleSystem);
  }

  initFloor3() {
    // Floor 3 (Observatory): Cosmic Star Fragments + Outer Celestial Astrolabe Starfield
    const starCount = 350;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 70 + Math.random() * 40;

      const sinPhi = Math.sin(phi);
      starPositions[i * 3] = r * sinPhi * Math.cos(theta);
      starPositions[i * 3 + 1] = Math.abs(r * Math.cos(phi)) + 6;
      starPositions[i * 3 + 2] = r * sinPhi * Math.sin(theta);

      const colorChoice = Math.random();
      if (colorChoice < 0.45) {
        starColors[i * 3] = 0.8; starColors[i * 3 + 1] = 0.95; starColors[i * 3 + 2] = 1.0;
      } else if (colorChoice < 0.75) {
        starColors[i * 3] = 0.85; starColors[i * 3 + 1] = 0.6; starColors[i * 3 + 2] = 1.0;
      } else {
        starColors[i * 3] = 1.0; starColors[i * 3 + 1] = 0.85; starColors[i * 3 + 2] = 0.5;
      }
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starTex = this.createCircleTexture('rgba(255, 255, 255, 1)', 'rgba(255, 255, 255, 0)');
    const starMat = new THREE.PointsMaterial({
      size: 0.85,
      map: starTex,
      transparent: true,
      opacity: 0.9,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.starfield = new THREE.Points(starGeo, starMat);
    this.scene.add(this.starfield);

    // Inner falling star fragments
    const particleCount = 100;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const speeds = [];
    const phases = [];
    const radius = 22;

    for (let i = 0; i < particleCount; i++) {
      const r = Math.sqrt(Math.random()) * radius;
      const theta = Math.random() * 2 * Math.PI;
      positions[i * 3] = r * Math.cos(theta);
      positions[i * 3 + 1] = Math.random() * 12;
      positions[i * 3 + 2] = r * Math.sin(theta);
      
      colors[i * 3] = 1.0;
      colors[i * 3 + 1] = 1.0;
      colors[i * 3 + 2] = 1.0;

      speeds.push(0.3 + Math.random() * 0.5); // 0.3 - 0.8 m/s
      phases.push(Math.random() * Math.PI * 2);
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.PointsMaterial({
      size: 0.18,
      map: starTex,
      transparent: true,
      opacity: 0.85,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.particleSystem = new THREE.Points(geometry, material);
    this.particleSystem.userData = { speeds, phases, radius };
    this.scene.add(this.particleSystem);
  }

  update(deltaTime) {
    if (this.starfield) {
      this.starfield.rotation.y += deltaTime * 0.012;
    }

    if (!this.particleSystem) return;

    const positions = this.particleSystem.geometry.attributes.position.array;
    const data = this.particleSystem.userData;

    if (this.floorNumber === 1) {
      for (let i = 0; i < positions.length / 3; i++) {
        data.phases[i] += deltaTime;
        
        positions[i * 3] += data.velocities[i].x * deltaTime + Math.sin(data.phases[i]) * 0.005;
        positions[i * 3 + 1] += data.velocities[i].y * deltaTime + Math.cos(data.phases[i]) * 0.005;
        positions[i * 3 + 2] += data.velocities[i].z * deltaTime + Math.sin(data.phases[i] * 0.8) * 0.005;

        const x = positions[i * 3];
        const z = positions[i * 3 + 2];
        if (x * x + z * z > data.radius * data.radius || positions[i*3+1] < 0 || positions[i*3+1] > 10) {
           const r = Math.sqrt(Math.random()) * data.radius;
           const theta = Math.random() * 2 * Math.PI;
           positions[i * 3] = r * Math.cos(theta);
           positions[i * 3 + 1] = Math.random() * 10;
           positions[i * 3 + 2] = r * Math.sin(theta);
        }
      }
    } else if (this.floorNumber === 2) {
      for (let i = 0; i < positions.length / 3; i++) {
        data.phases[i] += deltaTime * 2;
        
        positions[i * 3] += Math.sin(data.phases[i]) * 0.01;
        positions[i * 3 + 1] += 2.0 * deltaTime;

        if (positions[i * 3 + 1] > 22) {
           const r = Math.sqrt(Math.random()) * data.radius;
           const theta = Math.random() * 2 * Math.PI;
           positions[i * 3] = r * Math.cos(theta);
           positions[i * 3 + 1] = 0;
           positions[i * 3 + 2] = r * Math.sin(theta);
        }
      }
    } else if (this.floorNumber === 3) {
      const colors = this.particleSystem.geometry.attributes.color.array;
      for (let i = 0; i < positions.length / 3; i++) {
        positions[i * 3 + 1] -= data.speeds[i] * deltaTime;
        data.phases[i] += deltaTime * 2;
        
        if (positions[i * 3 + 1] < 0) {
           const r = Math.sqrt(Math.random()) * data.radius;
           const theta = Math.random() * 2 * Math.PI;
           positions[i * 3] = r * Math.cos(theta);
           positions[i * 3 + 1] = 12;
           positions[i * 3 + 2] = r * Math.sin(theta);
        }
        
        // Twinkling effect
        const intensity = 0.3 + 0.7 * Math.abs(Math.sin(data.phases[i]));
        colors[i * 3] = intensity;
        colors[i * 3 + 1] = intensity;
        colors[i * 3 + 2] = intensity;
      }
       this.particleSystem.geometry.attributes.color.needsUpdate = true;
    } else if (data.isEmbers) {
      // Generic rising embers (floors 5, 6, 10, 15)
      for (let i = 0; i < positions.length / 3; i++) {
        data.phases[i] += deltaTime * 2;
        positions[i * 3] += Math.sin(data.phases[i]) * 0.012;
        positions[i * 3 + 1] += 1.8 * deltaTime;
        if (positions[i * 3 + 1] > 18) {
          const r = Math.sqrt(Math.random()) * data.radius;
          const theta = Math.random() * 2 * Math.PI;
          positions[i * 3] = r * Math.cos(theta);
          positions[i * 3 + 1] = 0;
          positions[i * 3 + 2] = r * Math.sin(theta);
        }
      }
    } else if (data.velocities) {
      // Generic dust motes (floors 4, 7, 8, 9, 11, 12, 13, 14)
      for (let i = 0; i < positions.length / 3; i++) {
        data.phases[i] += deltaTime;
        positions[i * 3] += data.velocities[i].x * deltaTime + Math.sin(data.phases[i]) * 0.004;
        positions[i * 3 + 1] += data.velocities[i].y * deltaTime + Math.cos(data.phases[i]) * 0.004;
        positions[i * 3 + 2] += data.velocities[i].z * deltaTime + Math.sin(data.phases[i] * 0.8) * 0.004;
        const x = positions[i * 3]; const z = positions[i * 3 + 2];
        if (x * x + z * z > data.radius * data.radius || positions[i * 3 + 1] < 0 || positions[i * 3 + 1] > 12) {
          const r = Math.sqrt(Math.random()) * data.radius;
          const theta = Math.random() * 2 * Math.PI;
          positions[i * 3] = r * Math.cos(theta);
          positions[i * 3 + 1] = Math.random() * 10;
          positions[i * 3 + 2] = r * Math.sin(theta);
        }
      }
    }

    this.particleSystem.geometry.attributes.position.needsUpdate = true;
  }

  destroy() {
    if (this.particleSystem) {
      this.scene.remove(this.particleSystem);
      if (this.particleSystem.geometry) this.particleSystem.geometry.dispose();
      if (this.particleSystem.material) this.particleSystem.material.dispose();
      this.particleSystem = null;
    }
    if (this.starfield) {
      this.scene.remove(this.starfield);
      if (this.starfield.geometry) this.starfield.geometry.dispose();
      if (this.starfield.material) this.starfield.material.dispose();
      this.starfield = null;
    }
  }
}
