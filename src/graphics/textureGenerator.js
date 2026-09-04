import * as THREE from 'three';

/**
 * Procedural High-Resolution Photorealistic PBR Texture Generator.
 * Generates ultra-detailed diffuse, normal, roughness, metallic, and emissive maps
 * entirely in memory via HTML5 Canvas and Sobel gradient algorithms (zero external image download dependencies).
 */
export class TextureGenerator {
  static cache = new Proxy({}, {
    set(target, prop, value) {
      if (value && typeof value === 'object') {
        if (value.diffuseTex && !value.diffuseMap) value.diffuseMap = value.diffuseTex;
        if (value.diffuseMap && !value.diffuseTex) value.diffuseTex = value.diffuseMap;
        if (value.normalTex && !value.normalMap) value.normalMap = value.normalTex;
        if (value.normalMap && !value.normalTex) value.normalTex = value.normalMap;
      }
      target[prop] = value;
      return true;
    }
  });

  /**
   * Analytical Sobel Normal Map Generator.
   * High-speed typed-array implementation (eliminates 8+ million function call overhead per texture).
   */
  static generateNormalMapFromHeight(heightCanvas, strength = 2.5) {
    const w = heightCanvas.width;
    const h = heightCanvas.height;
    const srcCtx = heightCanvas.getContext('2d');
    const srcImgData = srcCtx.getImageData(0, 0, w, h);
    const src = srcImgData.data;

    const normCanvas = document.createElement('canvas');
    normCanvas.width = w;
    normCanvas.height = h;
    const normCtx = normCanvas.getContext('2d');
    const normImgData = normCtx.createImageData(w, h);
    const dst = normImgData.data;

    // Fast typed-array grayscale precomputation
    const totalPixels = w * h;
    const gray = new Float32Array(totalPixels);
    for (let i = 0, j = 0; i < src.length; i += 4, j++) {
      gray[j] = (src[i] * 0.299 + src[i + 1] * 0.587 + src[i + 2] * 0.114) * 0.0039215686;
    }

    const invStrength = 1.0 / Math.max(0.01, strength);

    for (let y = 0; y < h; y++) {
      const ym1 = ((y - 1 + h) % h) * w;
      const y0  = y * w;
      const yp1 = ((y + 1) % h) * w;

      for (let x = 0; x < w; x++) {
        const xm1 = (x - 1 + w) % w;
        const xp1 = (x + 1) % w;

        const tl = gray[ym1 + xm1];
        const tr = gray[ym1 + xp1];
        const l  = gray[y0  + xm1];
        const r  = gray[y0  + xp1];
        const bl = gray[yp1 + xm1];
        const br = gray[yp1 + xp1];
        const t  = gray[ym1 + x];
        const b  = gray[yp1 + x];

        const dx = (tr + 2.0 * r + br) - (tl + 2.0 * l + bl);
        const dy = (bl + 2.0 * b + br) - (tl + 2.0 * t + tr);

        const len = Math.sqrt(dx * dx + dy * dy + invStrength * invStrength);
        const invLen = 1.0 / len;
        const nx = (-dx * invLen);
        const ny = (-dy * invLen);
        const nz = (invStrength * invLen);

        const dstIdx = (y0 + x) * 4;
        dst[dstIdx]     = Math.floor(((nx * 0.5) + 0.5) * 255);
        dst[dstIdx + 1] = Math.floor(((ny * 0.5) + 0.5) * 255);
        dst[dstIdx + 2] = Math.floor(((nz * 0.5) + 0.5) * 255);
        dst[dstIdx + 3] = 255;
      }
    }

    normCtx.putImageData(normImgData, 0, 0);
    const tex = new THREE.CanvasTexture(normCanvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  static createGothicWoodPBR(width = 512, height = 512) {
    return this.createTwistedElderwoodPBR(width, height);
  }

  static createMarbleTilesPBR(width = 1024, height = 1024) {
    return this.createMarbleTilePBR(width, height);
  }

  static createSmeltedBrassPBR(width = 512, height = 512) {
    return this.createGildedBrassPBR(width, height);
  }

  static createAstralMarblePBR(width = 1024, height = 1024) {
    return this.createAstralCosmosPBR(width, height);
  }

  static createCelestialGoldPBR(width = 512, height = 512) {
    return this.createGoldCoinPBR(width, height);
  }

  /**
   * Pre-generates all 25 procedural PBR textures for all 3 floors and spells upfront during the loading screen.
   */
  static preloadAllTextures(renderer = null) {
    const generators = [
      () => this.createStoneBrickPBR(),
      () => this.createGothicPillarPBR(),
      () => this.createPrisonFloorPBR(),
      () => this.createRunicWallTexturePBR(),
      () => this.createGothicWoodPBR(),
      () => this.createWoodGrainPBR(),
      () => this.createMarbleTilesPBR(),
      () => this.createLavaBasaltPBR(),
      () => this.createObsidianRockPBR(),
      () => this.createRustedIronPBR(),
      () => this.createSmeltedBrassPBR(),
      () => this.createGildedBrassPBR(),
      () => this.createLavaTexturePBR(),
      () => this.createAstralMarblePBR(),
      () => this.createCelestialGoldPBR(),
      () => this.createStainedGlassPBR(),
      () => this.createParchmentPBR(),
      () => this.createFlamePlasmaPBR(),
      () => this.createFrostCrystallinePBR(),
      () => this.createSolarHaloPBR(),
      () => this.createChronoClockworkPBR(),
      () => this.createSpellRuneRing('fire'),
      () => this.createSpellRuneRing('frost'),
      () => this.createSpellRuneRing('light'),
      () => this.createSpellRuneRing('chrono')
    ];

    const list = [];
    for (const gen of generators) {
      try {
        const pbr = gen();
        if (pbr) list.push(pbr);
      } catch (e) {
        console.warn('[TextureGenerator] Texture generation warning:', e);
      }
    }

    if (renderer && typeof renderer.initTexture === 'function') {
      list.forEach(pbr => {
        if (!pbr) return;
        try {
          if (pbr.material) {
            if (pbr.material.map) renderer.initTexture(pbr.material.map);
            if (pbr.material.normalMap) renderer.initTexture(pbr.material.normalMap);
            if (pbr.material.roughnessMap) renderer.initTexture(pbr.material.roughnessMap);
            if (pbr.material.metalnessMap) renderer.initTexture(pbr.material.metalnessMap);
            if (pbr.material.emissiveMap) renderer.initTexture(pbr.material.emissiveMap);
          }
          const d = pbr.diffuseMap || pbr.diffuseTex;
          if (d) renderer.initTexture(d);
          const n = pbr.normalMap || pbr.normalTex;
          if (n) renderer.initTexture(n);
        } catch (e) {}
      });
    }
    console.log('[TextureGenerator] All 25 procedural PBR textures pre-warmed & uploaded to GPU VRAM!');
  }

  /**
   * Gothic Weathered Stone Bricks with Mortar, Chiseled Relief & Sobel Normal Map
   */
  static createStoneBrickPBR(width = 1024, height = 1024) {
    if (this.cache.stoneBrick) return this.cache.stoneBrick;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Base dark weathered mortar
    ctx.fillStyle = '#14161c';
    ctx.fillRect(0, 0, width, height);

    const rows = 8;
    const cols = 4;
    const rowH = height / rows;
    const colW = width / cols;
    const mortar = 10;

    // Heightmap canvas for Sobel Normals
    const heightCanvas = document.createElement('canvas');
    heightCanvas.width = width;
    heightCanvas.height = height;
    const hCtx = heightCanvas.getContext('2d');
    hCtx.fillStyle = '#101010'; // Deep recessed mortar
    hCtx.fillRect(0, 0, width, height);

    for (let r = 0; r < rows; r++) {
      const offsetX = (r % 2) * (colW / 2);
      for (let c = -1; c <= cols; c++) {
        const x = c * colW + offsetX + mortar / 2;
        const y = r * rowH + mortar / 2;
        const w = colW - mortar;
        const h = rowH - mortar;

        // Brick color variation (aged slate, granite, and ash limestone)
        const tone = 50 + Math.floor(Math.random() * 30);
        const redShift = Math.floor(Math.random() * 12);
        const blueShift = Math.floor(Math.random() * 16);
        ctx.fillStyle = `rgb(${tone + redShift}, ${tone + 2}, ${tone + blueShift})`;
        ctx.fillRect(x, y, w, h);

        // Heightmap brick face
        hCtx.fillStyle = '#d0d0d0';
        hCtx.fillRect(x + 2, y + 2, w - 4, h - 4);

        // 3D Bevel Lighting (Top-Left Highlight)
        const hl = ctx.createLinearGradient(x, y, x + w, y);
        hl.addColorStop(0, 'rgba(255,255,255,0.22)');
        hl.addColorStop(0.12, 'rgba(255,255,255,0.06)');
        hl.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = hl;
        ctx.fillRect(x, y, w, 8);

        const hlLeft = ctx.createLinearGradient(x, y, x, y + h);
        hlLeft.addColorStop(0, 'rgba(255,255,255,0.18)');
        hlLeft.addColorStop(0.15, 'rgba(255,255,255,0.05)');
        hlLeft.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = hlLeft;
        ctx.fillRect(x, y, 8, h);

        // 3D Bevel Shadow (Bottom-Right)
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(x, y + h - 8, w, 8);
        ctx.fillRect(x + w - 8, y, 8, h);

        // Chiseled surface fractures & horizontal bedding planes
        for (let f = 0; f < 8; f++) {
          const fy = y + (f / 8) * h + (Math.random() - 0.5) * 6;
          ctx.strokeStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.05)';
          ctx.lineWidth = 1 + Math.random() * 2;
          ctx.beginPath();
          ctx.moveTo(x + 6, fy);
          for (let step = 0; step < 5; step++) {
            ctx.lineTo(x + (step / 4) * w, fy + (Math.random() - 0.5) * 4);
          }
          ctx.stroke();

          // Heightmap fissures
          hCtx.strokeStyle = '#606060';
          hCtx.lineWidth = 1.5;
          hCtx.beginPath();
          hCtx.moveTo(x + 6, fy);
          for (let step = 0; step < 5; step++) {
            hCtx.lineTo(x + (step / 4) * w, fy + (Math.random() - 0.5) * 4);
          }
          hCtx.stroke();
        }

        // Weathering speckles & lichens
        for (let s = 0; s < 60; s++) {
          const sx = x + Math.random() * w;
          const sy = y + Math.random() * h;
          const sr = 1 + Math.random() * 3.5;
          ctx.fillStyle = Math.random() > 0.6 ? 'rgba(10,15,20,0.25)' : 'rgba(220,230,240,0.08)';
          ctx.beginPath();
          ctx.arc(sx, sy, sr, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    const diffuseTex = new THREE.CanvasTexture(canvas);
    diffuseTex.wrapS = THREE.RepeatWrapping;
    diffuseTex.wrapT = THREE.RepeatWrapping;

    // Normal Map via Sobel
    const normalTex = this.generateNormalMapFromHeight(heightCanvas, 3.5);

    // Roughness Map (Matte mortar vs slightly glossy stone face)
    const roughCanvas = document.createElement('canvas');
    roughCanvas.width = width;
    roughCanvas.height = height;
    const rCtx = roughCanvas.getContext('2d');
    rCtx.fillStyle = '#b0b0b0'; // stone face
    rCtx.fillRect(0, 0, width, height);
    rCtx.fillStyle = '#ffffff'; // rough mortar
    for (let r = 0; r <= rows; r++) {
      rCtx.fillRect(0, r * rowH - 6, width, 12);
    }
    const roughTex = new THREE.CanvasTexture(roughCanvas);
    roughTex.wrapS = THREE.RepeatWrapping;
    roughTex.wrapT = THREE.RepeatWrapping;

    const material = new THREE.MeshStandardMaterial({
      map: diffuseTex,
      normalMap: normalTex,
      normalScale: new THREE.Vector2(0.85, 0.85),
      roughnessMap: roughTex,
      roughness: 0.72,
      metalness: 0.15
    });

    this.cache.stoneBrick = { diffuseTex, normalTex, roughTex, material };
    return this.cache.stoneBrick;
  }

  /**
   * Wet Gothic Dungeon Cobblestone / Flagstone with Puddle Specular Sheen
   */
  static createCobblestonePBR(width = 1024, height = 1024) {
    if (this.cache.cobblestone) return this.cache.cobblestone;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Deep dark loam / gravel foundation
    ctx.fillStyle = '#101217';
    ctx.fillRect(0, 0, width, height);

    const heightCanvas = document.createElement('canvas');
    heightCanvas.width = width;
    heightCanvas.height = height;
    const hCtx = heightCanvas.getContext('2d');
    hCtx.fillStyle = '#202020';
    hCtx.fillRect(0, 0, width, height);

    // Irregular cobblestone stones
    const stoneCols = 8;
    const stoneRows = 8;
    const cellW = width / stoneCols;
    const cellH = height / stoneRows;

    for (let r = 0; r < stoneRows; r++) {
      const offsetX = (r % 2) * (cellW * 0.5);
      for (let c = -1; c <= stoneCols; c++) {
        const cx = c * cellW + offsetX + cellW * 0.5 + (Math.random() - 0.5) * 12;
        const cy = r * cellH + cellH * 0.5 + (Math.random() - 0.5) * 12;
        const rx = (cellW * 0.42) + (Math.random() - 0.5) * 8;
        const ry = (cellH * 0.38) + (Math.random() - 0.5) * 8;

        const shade = 45 + Math.floor(Math.random() * 35);
        const mossShift = Math.random() > 0.7 ? 12 : 0;
        ctx.fillStyle = `rgb(${shade - 5}, ${shade + mossShift}, ${shade + 10})`;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, Math.random() * 0.4 - 0.2, 0, Math.PI * 2);
        ctx.fill();

        // 3D Highlight & Shadow gradient
        const hl = ctx.createRadialGradient(cx - rx * 0.3, cy - ry * 0.3, 2, cx, cy, rx);
        hl.addColorStop(0, 'rgba(255,255,255,0.25)');
        hl.addColorStop(0.7, 'rgba(0,0,0,0.1)');
        hl.addColorStop(1, 'rgba(0,0,0,0.5)');
        ctx.fillStyle = hl;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();

        // Heightmap stone dome
        const hGrad = hCtx.createRadialGradient(cx, cy, 2, cx, cy, rx);
        hGrad.addColorStop(0, '#ffffff');
        hGrad.addColorStop(0.8, '#909090');
        hGrad.addColorStop(1, '#202020');
        hCtx.fillStyle = hGrad;
        hCtx.beginPath();
        hCtx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        hCtx.fill();
      }
    }

    const diffuseTex = new THREE.CanvasTexture(canvas);
    diffuseTex.wrapS = THREE.RepeatWrapping;
    diffuseTex.wrapT = THREE.RepeatWrapping;

    const normalTex = this.generateNormalMapFromHeight(heightCanvas, 4.0);

    const material = new THREE.MeshStandardMaterial({
      map: diffuseTex,
      normalMap: normalTex,
      normalScale: new THREE.Vector2(1.2, 1.2),
      roughness: 0.65,
      metalness: 0.22
    });

    this.cache.cobblestone = { diffuseTex, normalTex, material };
    return this.cache.cobblestone;
  }

  /**
   * Polished Dark Celestial Marble Tiles with Gold Leaf Inlay & Normal Map
   */
  static createMarbleTilePBR(width = 1024, height = 1024) {
    if (this.cache.marbleTile) return this.cache.marbleTile;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Base deep cosmic obsidian / starry indigo
    ctx.fillStyle = '#090b12';
    ctx.fillRect(0, 0, width, height);

    // Heightmap
    const heightCanvas = document.createElement('canvas');
    heightCanvas.width = width;
    heightCanvas.height = height;
    const hCtx = heightCanvas.getContext('2d');
    hCtx.fillStyle = '#d0d0d0';
    hCtx.fillRect(0, 0, width, height);

    // Fractal crystalline marble clouds
    for (let c = 0; c < 8; c++) {
      const grad = ctx.createRadialGradient(
        Math.random() * width, Math.random() * height, 20,
        Math.random() * width, Math.random() * height, 380
      );
      grad.addColorStop(0, 'rgba(40, 55, 95, 0.22)');
      grad.addColorStop(0.6, 'rgba(20, 25, 45, 0.08)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }

    // Branching Golden & Ethereal Quartz Veins
    for (let v = 0; v < 22; v++) {
      const isGold = v % 3 === 0;
      ctx.strokeStyle = isGold ? 'rgba(255, 215, 0, 0.55)' : 'rgba(160, 190, 240, 0.32)';
      ctx.lineWidth = isGold ? 2.8 : 1.5;
      ctx.beginPath();
      let vx = Math.random() * width;
      let vy = Math.random() * height;
      ctx.moveTo(vx, vy);
      for (let s = 0; s < 10; s++) {
        vx += (Math.random() - 0.5) * 160;
        vy += (Math.random() - 0.5) * 160;
        ctx.lineTo(vx, vy);
      }
      ctx.stroke();

      if (isGold) {
        hCtx.strokeStyle = '#ffffff';
        hCtx.lineWidth = 2.0;
        hCtx.stroke();
      }
    }

    // 4x4 Polished Tile Borders with Gold Gilt Seams
    const tiles = 4;
    const tSize = width / tiles;

    ctx.strokeStyle = 'rgba(255, 215, 0, 0.75)'; // Gilded Seam
    ctx.lineWidth = 4;
    hCtx.strokeStyle = '#202020'; // Recessed grout in heightmap
    hCtx.lineWidth = 6;

    for (let i = 0; i <= tiles; i++) {
      ctx.beginPath();
      ctx.moveTo(i * tSize, 0);
      ctx.lineTo(i * tSize, height);
      ctx.stroke();

      hCtx.beginPath();
      hCtx.moveTo(i * tSize, 0);
      hCtx.lineTo(i * tSize, height);
      hCtx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i * tSize);
      ctx.lineTo(width, i * tSize);
      ctx.stroke();

      hCtx.beginPath();
      hCtx.moveTo(0, i * tSize);
      hCtx.lineTo(width, i * tSize);
      hCtx.stroke();

      if (i < tiles) {
        for (let j = 0; j < tiles; j++) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
          ctx.lineWidth = 2;
          ctx.strokeRect(i * tSize + 6, j * tSize + 6, tSize - 12, tSize - 12);
        }
      }
    }

    const diffuseTex = new THREE.CanvasTexture(canvas);
    diffuseTex.wrapS = THREE.RepeatWrapping;
    diffuseTex.wrapT = THREE.RepeatWrapping;

    const normalTex = this.generateNormalMapFromHeight(heightCanvas, 2.0);

    const material = new THREE.MeshStandardMaterial({
      map: diffuseTex,
      normalMap: normalTex,
      normalScale: new THREE.Vector2(0.5, 0.5),
      roughness: 0.16, // Sleek, highly reflective polished marble mirror shine
      metalness: 0.45
    });

    this.cache.marbleTile = { diffuseTex, normalTex, material };
    return this.cache.marbleTile;
  }

  /**
   * Molten Magma with Obsidian Crust Islands & Incandescent Veins
   */
  static createLavaTexturePBR(width = 512, height = 512) {
    if (this.cache.lava) return this.cache.lava;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Intense glowing magma foundation
    ctx.fillStyle = '#ff3d00';
    ctx.fillRect(0, 0, width, height);

    // Yellow-hot inner convection cells
    for (let i = 0; i < 18; i++) {
      const grad = ctx.createRadialGradient(
        Math.random() * width, Math.random() * height, 10,
        Math.random() * width, Math.random() * height, 120
      );
      grad.addColorStop(0, '#ffff00');
      grad.addColorStop(0.4, '#ff6d00');
      grad.addColorStop(1, 'rgba(255, 61, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }

    // Cooling basalt crust islands floating on top
    ctx.fillStyle = 'rgba(20, 10, 8, 0.94)';
    for (let c = 0; c < 35; c++) {
      const cx = Math.random() * width;
      const cy = Math.random() * height;
      const cr = 20 + Math.random() * 55;
      ctx.beginPath();
      ctx.arc(cx, cy, cr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Glowing fracture cracks cutting through crust
    ctx.strokeStyle = '#fff176';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#ff3d00';
    ctx.shadowBlur = 14;
    for (let v = 0; v < 16; v++) {
      ctx.beginPath();
      let vx = Math.random() * width;
      let vy = Math.random() * height;
      ctx.moveTo(vx, vy);
      for (let s = 0; s < 8; s++) {
        vx += (Math.random() - 0.5) * 80;
        vy += (Math.random() - 0.5) * 80;
        ctx.lineTo(vx, vy);
      }
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    const diffuseTex = new THREE.CanvasTexture(canvas);
    diffuseTex.wrapS = THREE.RepeatWrapping;
    diffuseTex.wrapT = THREE.RepeatWrapping;

    const material = new THREE.MeshStandardMaterial({
      map: diffuseTex,
      emissiveMap: diffuseTex,
      emissive: new THREE.Color(0xff4400),
      emissiveIntensity: 2.2,
      roughness: 0.75,
      metalness: 0.15
    });

    this.cache.lava = { diffuseTex, material };
    return this.cache.lava;
  }

  /**
   * Deep Space Astral Cosmos / Celestial Nebula Texture for Skybox & Dome
   */
  static createAstralCosmosPBR(width = 1024, height = 1024) {
    if (this.cache.astralCosmos) return this.cache.astralCosmos;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Deep cosmic void foundation
    ctx.fillStyle = '#050711';
    ctx.fillRect(0, 0, width, height);

    // Cosmic violet / cyan gas clouds (Nebulae)
    const nebulaColors = [
      'rgba(106, 27, 154, 0.28)', // Deep Purple
      'rgba(26, 35, 126, 0.35)',  // Deep Indigo
      'rgba(0, 188, 212, 0.22)',  // Cyan Starlight
      'rgba(233, 30, 99, 0.18)'   // Magenta Rift
    ];

    for (let n = 0; n < 12; n++) {
      const nx = Math.random() * width;
      const ny = Math.random() * height;
      const nr = 120 + Math.random() * 300;
      const nGrad = ctx.createRadialGradient(nx, ny, 10, nx, ny, nr);
      nGrad.addColorStop(0, nebulaColors[n % nebulaColors.length]);
      nGrad.addColorStop(0.6, 'rgba(10, 15, 35, 0.08)');
      nGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = nGrad;
      ctx.fillRect(0, 0, width, height);
    }

    // Thousands of twinkling stars of varying magnitudes
    for (let s = 0; s < 1200; s++) {
      const sx = Math.random() * width;
      const sy = Math.random() * height;
      const brightness = Math.random();
      const radius = brightness > 0.95 ? 2.5 : brightness > 0.8 ? 1.5 : 0.8;

      ctx.fillStyle = brightness > 0.9 ? '#ffffff' : brightness > 0.6 ? '#b3e5fc' : '#e1bee7';
      ctx.beginPath();
      ctx.arc(sx, sy, radius, 0, Math.PI * 2);
      ctx.fill();

      // Diamond star spikes for prominent bright stars
      if (brightness > 0.97) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sx - 8, sy);
        ctx.lineTo(sx + 8, sy);
        ctx.moveTo(sx, sy - 8);
        ctx.lineTo(sx, sy + 8);
        ctx.stroke();
      }
    }

    // Constellation connecting lines
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.2)';
    ctx.lineWidth = 1;
    for (let c = 0; c < 6; c++) {
      let cx = Math.random() * width;
      let cy = Math.random() * height;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      for (let p = 0; p < 5; p++) {
        cx += (Math.random() - 0.5) * 140;
        cy += (Math.random() - 0.5) * 140;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }

    const diffuseTex = new THREE.CanvasTexture(canvas);
    diffuseTex.wrapS = THREE.RepeatWrapping;
    diffuseTex.wrapT = THREE.RepeatWrapping;

    const material = new THREE.MeshStandardMaterial({
      map: diffuseTex,
      emissiveMap: diffuseTex,
      emissive: new THREE.Color(0x3a4070),
      emissiveIntensity: 0.8,
      roughness: 0.9,
      metalness: 0.1,
      side: THREE.BackSide
    });

    this.cache.astralCosmos = { diffuseTex, material };
    return this.cache.astralCosmos;
  }

  /**
   * Polished Ornate Gilded Brass / Engraved Ancient Gold PBR
   */
  static createGildedBrassPBR(width = 512, height = 512) {
    if (this.cache.gildedBrass) return this.cache.gildedBrass;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Deep rich brass & gold gradient
    ctx.fillStyle = '#b8860b';
    ctx.fillRect(0, 0, width, height);

    const heightCanvas = document.createElement('canvas');
    heightCanvas.width = width;
    heightCanvas.height = height;
    const hCtx = heightCanvas.getContext('2d');
    hCtx.fillStyle = '#b0b0b0';
    hCtx.fillRect(0, 0, width, height);

    // Concentric celestial engraving rings
    const cx = width / 2;
    const cy = height / 2;
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 3;
    hCtx.strokeStyle = '#ffffff';
    hCtx.lineWidth = 4;

    for (let r = 40; r < width / 2; r += 45) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();

      hCtx.beginPath();
      hCtx.arc(cx, cy, r, 0, Math.PI * 2);
      hCtx.stroke();
    }

    // Ancient runic spokes
    for (let a = 0; a < 16; a++) {
      const angle = (a / 16) * Math.PI * 2;
      const x1 = cx + Math.cos(angle) * 30;
      const y1 = cy + Math.sin(angle) * 30;
      const x2 = cx + Math.cos(angle) * (width * 0.48);
      const y2 = cy + Math.sin(angle) * (height * 0.48);

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      hCtx.beginPath();
      hCtx.moveTo(x1, y1);
      hCtx.lineTo(x2, y2);
      hCtx.stroke();
    }

    // Micro metallic brush scratches
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 400; i++) {
      const rx = Math.random() * width;
      const ry = Math.random() * height;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx + (Math.random() - 0.5) * 30, ry + (Math.random() - 0.5) * 30);
      ctx.stroke();
    }

    const diffuseTex = new THREE.CanvasTexture(canvas);
    diffuseTex.wrapS = THREE.RepeatWrapping;
    diffuseTex.wrapT = THREE.RepeatWrapping;

    const normalTex = this.generateNormalMapFromHeight(heightCanvas, 3.0);

    const material = new THREE.MeshStandardMaterial({
      map: diffuseTex,
      normalMap: normalTex,
      normalScale: new THREE.Vector2(0.8, 0.8),
      roughness: 0.28,
      metalness: 0.88
    });

    this.cache.gildedBrass = { diffuseTex, normalTex, material };
    return this.cache.gildedBrass;
  }

  /**
   * Translucent Glacial Ice with Internal Refraction Fissures
   */
  static createGlacialIcePBR(width = 512, height = 512) {
    if (this.cache.glacialIce) return this.cache.glacialIce;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Deep glacial cyan foundation
    ctx.fillStyle = '#00bcd4';
    ctx.fillRect(0, 0, width, height);

    // Frost crystalline striations
    for (let i = 0; i < 35; i++) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.lineWidth = 1.5 + Math.random() * 2;
      ctx.beginPath();
      let ix = Math.random() * width;
      let iy = Math.random() * height;
      ctx.moveTo(ix, iy);
      for (let s = 0; s < 6; s++) {
        ix += (Math.random() - 0.5) * 90;
        iy += (Math.random() - 0.5) * 90;
        ctx.lineTo(ix, iy);
      }
      ctx.stroke();
    }

    const diffuseTex = new THREE.CanvasTexture(canvas);
    diffuseTex.wrapS = THREE.RepeatWrapping;
    diffuseTex.wrapT = THREE.RepeatWrapping;

    const material = new THREE.MeshStandardMaterial({
      map: diffuseTex,
      transparent: true,
      opacity: 0.82,
      roughness: 0.08,
      metalness: 0.15,
      side: THREE.DoubleSide
    });

    this.cache.glacialIce = { diffuseTex, material };
    return this.cache.glacialIce;
  }

  /**
   * Glowing Arcane Runic Floor Decal (Summoning Circle & Glyphs)
   */
  static createRunicDecalPBR(color = '#00e5ff', width = 512, height = 512) {
    const key = `runic_decal_${color}`;
    if (this.cache[key]) return this.cache[key];

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height / 2;

    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 16;
    ctx.lineWidth = 4;

    // Concentric Astrolabe Rings
    ctx.beginPath();
    ctx.arc(cx, cy, 210, 0, Math.PI * 2);
    ctx.arc(cx, cy, 185, 0, Math.PI * 2);
    ctx.arc(cx, cy, 140, 0, Math.PI * 2);
    ctx.arc(cx, cy, 80, 0, Math.PI * 2);
    ctx.stroke();

    // Runic Cross & Star of Arcana
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * 80, cy + Math.sin(angle) * 80);
      ctx.lineTo(cx + Math.cos(angle) * 210, cy + Math.sin(angle) * 210);
      ctx.stroke();
    }

    // Outer Runic Glyphs / Ticks
    for (let i = 0; i < 32; i++) {
      const angle = (i / 32) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * 195, cy + Math.sin(angle) * 195);
      ctx.lineTo(cx + Math.cos(angle) * 205, cy + Math.sin(angle) * 205);
      ctx.stroke();
    }

    ctx.shadowBlur = 0;

    const diffuseTex = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshBasicMaterial({
      map: diffuseTex,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.cache[key] = { diffuseTex, material };
    return this.cache[key];
  }

  /**
   * Gothic Cathedral Stained Glass with Lead Caming & Jeweled Rosettes
   */
  static createStainedGlassPBR(hue = 210, width = 512, height = 512) {
    const key = `stained_glass_${hue}`;
    if (this.cache[key]) return this.cache[key];

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Rich saturated gemstone glass base
    ctx.fillStyle = `hsl(${hue}, 90%, 28%)`;
    ctx.fillRect(0, 0, width, height);

    // Faceted jewel panes
    for (let i = 0; i < 60; i++) {
      const altHue = hue + (Math.random() - 0.5) * 50;
      ctx.fillStyle = `hsla(${altHue}, 85%, ${32 + Math.random() * 25}%, 0.85)`;
      ctx.beginPath();
      ctx.moveTo(Math.random() * width, Math.random() * height);
      for (let j = 0; j < 4; j++) {
        ctx.lineTo(Math.random() * width, Math.random() * height);
      }
      ctx.fill();
    }

    // Heavy Gothic Cast-Lead Framing (Caming)
    ctx.strokeStyle = '#0a0a0d';
    ctx.lineWidth = 7;

    // Diamond grid
    const step = 64;
    for (let d = -width; d < width * 2; d += step) {
      ctx.beginPath();
      ctx.moveTo(d, 0);
      ctx.lineTo(d + height, height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(d, height);
      ctx.lineTo(d + height, 0);
      ctx.stroke();
    }

    // Outer lead border
    ctx.strokeRect(4, 4, width - 8, height - 8);

    const diffuseTex = new THREE.CanvasTexture(canvas);
    diffuseTex.wrapS = THREE.RepeatWrapping;
    diffuseTex.wrapT = THREE.RepeatWrapping;

    const material = new THREE.MeshStandardMaterial({
      map: diffuseTex,
      emissiveMap: diffuseTex,
      emissive: new THREE.Color(`hsl(${hue}, 90%, 20%)`),
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.88,
      roughness: 0.12,
      metalness: 0.25,
      side: THREE.DoubleSide
    });

    this.cache[key] = { diffuseTex, material };
    return this.cache[key];
  }

  /**
   * Forged Rusted Iron Metal with Pitting & Oxidation
   */
  static createRustedIronPBR(width = 512, height = 512) {
    if (this.cache.rustedIron) return this.cache.rustedIron;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Hammered forged iron dark grey
    ctx.fillStyle = '#22252a';
    ctx.fillRect(0, 0, width, height);

    // Ferric oxide rust patches
    for (let i = 0; i < 80; i++) {
      const rx = Math.random() * width;
      const ry = Math.random() * height;
      const rad = 10 + Math.random() * 40;
      const rustGrad = ctx.createRadialGradient(rx, ry, 2, rx, ry, rad);
      rustGrad.addColorStop(0, 'rgba(180, 75, 20, 0.7)');
      rustGrad.addColorStop(0.7, 'rgba(130, 50, 15, 0.4)');
      rustGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = rustGrad;
      ctx.fillRect(rx - rad, ry - rad, rad * 2, rad * 2);
    }

    // Metal scuffs & tool marks
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 150; i++) {
      ctx.beginPath();
      let x = Math.random() * width;
      let y = Math.random() * height;
      ctx.moveTo(x, y);
      ctx.lineTo(x + (Math.random() - 0.5) * 45, y + (Math.random() - 0.5) * 45);
      ctx.stroke();
    }

    const diffuseTex = new THREE.CanvasTexture(canvas);
    diffuseTex.wrapS = THREE.RepeatWrapping;
    diffuseTex.wrapT = THREE.RepeatWrapping;

    const material = new THREE.MeshStandardMaterial({
      map: diffuseTex,
      roughness: 0.68,
      metalness: 0.85
    });

    this.cache.rustedIron = { diffuseTex, material };
    return this.cache.rustedIron;
  }

  /**
   * Aged Yellowed Archival Parchment with Ink Stains
   */
  static createParchmentPBR(width = 512, height = 512) {
    if (this.cache.parchment) return this.cache.parchment;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Base vellum tone
    ctx.fillStyle = '#f3ebd6';
    ctx.fillRect(0, 0, width, height);

    // Aging vignette
    const vignette = ctx.createRadialGradient(width / 2, height / 2, width * 0.25, width / 2, height / 2, width * 0.65);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(130, 80, 30, 0.35)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);

    // Subtle cellulose fibers
    ctx.strokeStyle = 'rgba(100, 70, 30, 0.04)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 1200; i++) {
      ctx.beginPath();
      let x = Math.random() * width;
      let y = Math.random() * height;
      ctx.moveTo(x, y);
      ctx.lineTo(x + (Math.random() - 0.5) * 25, y + (Math.random() - 0.5) * 25);
      ctx.stroke();
    }

    const diffuseTex = new THREE.CanvasTexture(canvas);
    diffuseTex.wrapS = THREE.RepeatWrapping;
    diffuseTex.wrapT = THREE.RepeatWrapping;

    const material = new THREE.MeshStandardMaterial({
      map: diffuseTex,
      roughness: 0.95,
      metalness: 0.0
    });

    this.cache.parchment = { diffuseTex, material };
    return this.cache.parchment;
  }

  /**
   * Polished Dark Walnut Wood Grain with Growth Rings & Varnish Sheen
   */
  static createWoodGrainPBR(width = 512, height = 512) {
    if (this.cache.woodGrain) return this.cache.woodGrain;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Rich dark walnut foundation
    ctx.fillStyle = '#3a2216';
    ctx.fillRect(0, 0, width, height);

    // Wood growth rings & striations
    for (let y = 0; y < height; y += 4) {
      const shade = 40 + Math.sin(y * 0.08) * 18 + (Math.random() - 0.5) * 8;
      ctx.fillStyle = `rgb(${shade + 20}, ${shade}, ${Math.max(10, shade - 15)})`;
      ctx.fillRect(0, y, width, 4);
    }

    // Subtle knots
    for (let k = 0; k < 4; k++) {
      const kx = Math.random() * width;
      const ky = Math.random() * height;
      for (let r = 24; r > 2; r -= 3) {
        ctx.strokeStyle = `rgba(20, 10, 5, ${0.15 + r * 0.01})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(kx, ky, r * 1.5, r, 0.2, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    const diffuseTex = new THREE.CanvasTexture(canvas);
    diffuseTex.wrapS = THREE.RepeatWrapping;
    diffuseTex.wrapT = THREE.RepeatWrapping;

    const material = new THREE.MeshStandardMaterial({
      map: diffuseTex,
      roughness: 0.45, // Hand-rubbed beeswax polish sheen
      metalness: 0.12
    });

    this.cache.woodGrain = { diffuseTex, material };
    return this.cache.woodGrain;
  }

  /**
   * Procedural Linen / Silk Cloth Weave PBR
   */
  static createClothWeavePBR(color = '#c62828', width = 512, height = 512) {
    const key = 'cloth_' + color;
    if (this.cache[key]) return this.cache[key];

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Base cloth tone
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);

    // Cross-weave pattern
    const step = 4;
    for (let x = 0; x < width; x += step) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.fillRect(x, 0, 1, height);
    }
    for (let y = 0; y < height; y += step) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.fillRect(0, y, width, 1);
    }

    // Micro noise fiber texture
    for (let i = 0; i < 6000; i++) {
      const rx = Math.random() * width;
      const ry = Math.random() * height;
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.07)';
      ctx.fillRect(rx, ry, 2, 2);
    }

    const diffuseMap = new THREE.CanvasTexture(canvas);
    diffuseMap.wrapS = THREE.RepeatWrapping;
    diffuseMap.wrapT = THREE.RepeatWrapping;

    const material = new THREE.MeshStandardMaterial({
      map: diffuseMap,
      roughness: 0.78,
      metalness: 0.04
    });

    this.cache[key] = { material, diffuseMap };
    return this.cache[key];
  }

  /**
   * Procedural Human Skin PBR Material
   */
  static createSkinPBR(width = 256, height = 256) {
    if (this.cache.skin) return this.cache.skin;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Warm peach skin foundation
    ctx.fillStyle = '#f5cda7';
    ctx.fillRect(0, 0, width, height);

    // Subtle subsurface warmth & pore variations
    for (let i = 0; i < 3000; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const r = 1 + Math.random() * 2;
      ctx.fillStyle = Math.random() > 0.6 ? 'rgba(230, 160, 140, 0.15)' : 'rgba(255, 235, 215, 0.15)';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const diffuseMap = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshStandardMaterial({
      map: diffuseMap,
      roughness: 0.58,
      metalness: 0.02
    });

    this.cache.skin = { material, diffuseMap };
    return this.cache.skin;
  }

  /**
   * Procedural Volcanic Obsidian Rock PBR Material with Sobel Normals
   */
  static createObsidianRockPBR(width = 512, height = 512) {
    if (this.cache.obsidian) return this.cache.obsidian;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#111217';
    ctx.fillRect(0, 0, width, height);

    const heightCanvas = document.createElement('canvas');
    heightCanvas.width = width;
    heightCanvas.height = height;
    const hCtx = heightCanvas.getContext('2d');
    hCtx.fillStyle = '#404040';
    hCtx.fillRect(0, 0, width, height);

    for (let i = 0; i < 40; i++) {
      const cx = Math.random() * width;
      const cy = Math.random() * height;
      const rad = 20 + Math.random() * 60;
      const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, rad);
      grad.addColorStop(0, 'rgba(45, 48, 58, 0.45)');
      grad.addColorStop(0.7, 'rgba(25, 27, 34, 0.2)');
      grad.addColorStop(1, 'rgba(10, 11, 15, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.fill();

      hCtx.fillStyle = Math.random() > 0.5 ? '#909090' : '#202020';
      hCtx.beginPath();
      hCtx.arc(cx, cy, rad * 0.8, 0, Math.PI * 2);
      hCtx.fill();
    }

    const diffuseMap = new THREE.CanvasTexture(canvas);
    diffuseMap.wrapS = THREE.RepeatWrapping;
    diffuseMap.wrapT = THREE.RepeatWrapping;

    const normalMap = this.generateNormalMapFromHeight(heightCanvas, 3.5);
    const material = new THREE.MeshStandardMaterial({
      map: diffuseMap,
      normalMap,
      normalScale: new THREE.Vector2(1.2, 1.2),
      roughness: 0.18,
      metalness: 0.82
    });

    this.cache.obsidian = { material, diffuseMap, normalMap };
    return this.cache.obsidian;
  }

  /**
   * Procedural Volcanic Basalt Rock with Glowing Magma Veins
   */
  static createLavaBasaltPBR(width = 512, height = 512) {
    if (this.cache.basalt) return this.cache.basalt;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#1b1b1e';
    ctx.fillRect(0, 0, width, height);

    const heightCanvas = document.createElement('canvas');
    heightCanvas.width = width;
    heightCanvas.height = height;
    const hCtx = heightCanvas.getContext('2d');
    hCtx.fillStyle = '#606060';
    hCtx.fillRect(0, 0, width, height);

    ctx.lineWidth = 4;
    for (let i = 0; i < 25; i++) {
      let x = Math.random() * width;
      let y = Math.random() * height;
      ctx.strokeStyle = Math.random() > 0.4 ? '#ff5722' : '#ff9800';
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let s = 0; s < 4; s++) {
        x += (Math.random() - 0.5) * 60;
        y += (Math.random() - 0.5) * 60;
        ctx.lineTo(x, y);
      }
      ctx.stroke();

      hCtx.strokeStyle = '#101010';
      hCtx.lineWidth = 6;
      hCtx.stroke();
    }

    const diffuseMap = new THREE.CanvasTexture(canvas);
    diffuseMap.wrapS = THREE.RepeatWrapping;
    diffuseMap.wrapT = THREE.RepeatWrapping;

    const normalMap = this.generateNormalMapFromHeight(heightCanvas, 3.0);
    const material = new THREE.MeshStandardMaterial({
      map: diffuseMap,
      normalMap,
      normalScale: new THREE.Vector2(1.4, 1.4),
      emissive: new THREE.Color(0xff3d00),
      emissiveIntensity: 0.45,
      roughness: 0.75,
      metalness: 0.25
    });

    this.cache.basalt = { material, diffuseMap, normalMap };
    return this.cache.basalt;
  }

  /**
   * PBR Textured Prison Wall with Inscribed Runic Keybindings & Emissive Glyph Glow.
   * High-Resolution (2048x1024) with analytical Sobel normal maps and roughness.
   */
  static createRunicWallTexturePBR() {
    if (this.cache.runicWall) return this.cache.runicWall;

    const width = 2048;
    const height = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Heightmap canvas for Sobel Normals
    const heightCanvas = document.createElement('canvas');
    heightCanvas.width = width;
    heightCanvas.height = height;
    const hCtx = heightCanvas.getContext('2d');

    // Weathered dark granite prison stone block base
    ctx.fillStyle = '#181614';
    ctx.fillRect(0, 0, width, height);
    hCtx.fillStyle = '#101010';
    hCtx.fillRect(0, 0, width, height);

    // Stone block masonry grid
    const bRows = 6;
    const bCols = 8;
    const rowH = height / bRows;
    const colW = width / bCols;
    const mortar = 8;

    for (let r = 0; r < bRows; r++) {
      const offsetX = (r % 2) * (colW / 2);
      for (let c = -1; c <= bCols; c++) {
        const bx = c * colW + offsetX + mortar / 2;
        const by = r * rowH + mortar / 2;
        const bw = colW - mortar;
        const bh = rowH - mortar;

        const shade = 28 + Math.floor(Math.random() * 18);
        ctx.fillStyle = `rgb(${shade + 4}, ${shade}, ${shade - 3})`;
        ctx.fillRect(bx, by, bw, bh);

        hCtx.fillStyle = '#b0b0b0';
        hCtx.fillRect(bx + 2, by + 2, bw - 4, bh - 4);

        // Stone bevel highlight & shadow
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(bx, by, bw, 4);
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(bx, by + bh - 4, bw, 4);
      }
    }

    // Weathered fissures and cracks
    for (let i = 0; i < 48; i++) {
      const sx = Math.random() * width;
      const sy = Math.random() * height;
      ctx.strokeStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1.5 + Math.random() * 2;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      let cx = sx, cy = sy;
      for (let s = 0; s < 4; s++) {
        cx += (Math.random() - 0.5) * 45;
        cy += (Math.random() - 0.5) * 45;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }

    // Outer Runic Framing Border
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 8;
    ctx.strokeRect(28, 28, width - 56, height - 56);
    ctx.strokeStyle = 'rgba(212,175,55,0.35)';
    ctx.lineWidth = 3;
    ctx.strokeRect(38, 38, width - 76, height - 76);

    // Emissive Canvas Setup
    const emissiveCanvas = document.createElement('canvas');
    emissiveCanvas.width = width;
    emissiveCanvas.height = height;
    const eCtx = emissiveCanvas.getContext('2d');
    eCtx.fillStyle = '#000000';
    eCtx.fillRect(0, 0, width, height);

    // =========================================================================
    // INSCRIBED RUNIC TEXT & KEYBINDING MATRIX
    // =========================================================================
    ctx.textAlign = 'center';
    eCtx.textAlign = 'center';

    // 1. GRAND HEADER
    ctx.font = 'bold 44px "Cinzel", "Outfit", serif';
    ctx.fillStyle = '#ffecb3';
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 18;
    ctx.fillText('⚡ PRISON OF AETHELGARD — SACRED RITUALS OF ESCAPE ⚡', width / 2, 100);

    eCtx.font = 'bold 44px "Cinzel", "Outfit", serif';
    eCtx.fillStyle = '#ffd700';
    eCtx.fillText('⚡ PRISON OF AETHELGARD — SACRED RITUALS OF ESCAPE ⚡', width / 2, 100);

    // Subtitle
    ctx.font = 'italic 24px "Outfit", serif';
    ctx.fillStyle = '#c5a059';
    ctx.shadowBlur = 6;
    ctx.fillText('Chiseled by the Fallen Archmages • Inscribed in Eternal Stardust Runes', width / 2, 142);

    // Header divider
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(180, 165);
    ctx.lineTo(width - 180, 165);
    ctx.stroke();

    eCtx.strokeStyle = '#d4af37';
    eCtx.lineWidth = 3;
    eCtx.beginPath();
    eCtx.moveTo(180, 165);
    eCtx.lineTo(width - 180, 165);
    eCtx.stroke();

    // 4 DISTINCT PILLAR TABLETS (Columns)
    const cols = [
      {
        title: 'I. MOVEMENT & AIMING',
        color: '#00e5ff',
        x: 280,
        items: [
          { key: '[ W A S D ]', desc: 'Traverse Stone Vaults' },
          { key: '[ MOUSE ]', desc: 'First-Person Look & Aim' },
          { key: '[ SPACE ]', desc: 'Arcane Jump & Vault' },
          { key: '[ SHIFT ]', desc: 'Dimensional Blink Dash' }
        ]
      },
      {
        title: 'II. COMBAT INCANTATIONS',
        color: '#ff7043',
        x: 770,
        items: [
          { key: '[ LMB ]', desc: 'Primary Wand Spellbolt' },
          { key: '[ Q ]', desc: 'Signature Strike (Fireball)' },
          { key: '[ E ]', desc: 'Tactical Wave / Interact' },
          { key: '[ R ]', desc: 'Cataclysm Ultimate Spell' }
        ]
      },
      {
        title: 'III. SYSTEMS & PROGRESSION',
        color: '#81c784',
        x: 1270,
        items: [
          { key: '[ I / C ]', desc: 'Gear & Inventory Bag' },
          { key: '[ K ]', desc: 'Grimoire Spell Tome' },
          { key: '[ T ]', desc: 'Class Talent Mastery' },
          { key: '[ J ]', desc: 'Scribe Quest Journal' }
        ]
      },
      {
        title: 'IV. CHRONOMANCY & BOOKS',
        color: '#ba68c8',
        x: 1760,
        items: [
          { key: '[ E ]', desc: 'Open Ancient Magic Books' },
          { key: '[ SPACE ]', desc: 'Cast Reverse Time Spell' },
          { key: '[ H ]', desc: 'Toggle Controls HUD' },
          { key: '[ ESC ]', desc: 'Settings & Pause Menu' }
        ]
      }
    ];

    cols.forEach(col => {
      // Column Box Frame
      ctx.fillStyle = 'rgba(15, 12, 10, 0.65)';
      ctx.fillRect(col.x - 220, 200, 440, 680);
      ctx.strokeStyle = col.color;
      ctx.lineWidth = 2.5;
      ctx.strokeRect(col.x - 220, 200, 440, 680);

      // Heightmap groove
      hCtx.fillStyle = '#606060';
      hCtx.fillRect(col.x - 216, 204, 432, 672);

      // Title
      ctx.font = 'bold 28px "Cinzel", serif';
      ctx.fillStyle = col.color;
      ctx.shadowColor = col.color;
      ctx.shadowBlur = 12;
      ctx.fillText(col.title, col.x, 252);

      eCtx.font = 'bold 28px "Cinzel", serif';
      eCtx.fillStyle = col.color;
      eCtx.fillText(col.title, col.x, 252);

      // Column underline
      ctx.strokeStyle = col.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(col.x - 160, 270);
      ctx.lineTo(col.x + 160, 270);
      ctx.stroke();

      // Keybinding Rows
      col.items.forEach((item, idx) => {
        const itemY = 350 + idx * 115;

        // Key Badge Pill
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(col.x - 170, itemY - 38, 340, 52, 10);
        ctx.fill();
        ctx.stroke();

        // Key text
        ctx.font = 'bold 26px monospace';
        ctx.fillStyle = '#ffd700';
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 8;
        ctx.fillText(item.key, col.x, itemY - 3);

        eCtx.font = 'bold 26px monospace';
        eCtx.fillStyle = '#ffd700';
        eCtx.fillText(item.key, col.x, itemY - 3);

        // Description
        ctx.font = '500 20px "Outfit", sans-serif';
        ctx.fillStyle = '#f5f5f5';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 6;
        ctx.fillText(item.desc, col.x, itemY + 44);

        eCtx.font = '500 20px "Outfit", sans-serif';
        eCtx.fillStyle = '#ffffff';
        eCtx.fillText(item.desc, col.x, itemY + 44);
      });
    });

    // Bottom Footer Lore Callout
    ctx.font = 'italic 22px serif';
    ctx.fillStyle = '#ffb74d';
    ctx.shadowColor = '#ffb74d';
    ctx.shadowBlur = 8;
    ctx.fillText('📖 Study the 4 Magic Books on pedestals. Cast [Reverse Time] to restore the eroded chronomantic ink.', width / 2, 940);

    eCtx.font = 'italic 22px serif';
    eCtx.fillStyle = '#ffb74d';
    eCtx.fillText('📖 Study the 4 Magic Books on pedestals. Cast [Reverse Time] to restore the eroded chronomantic ink.', width / 2, 940);

    // Textures & Material
    const diffuseMap = new THREE.CanvasTexture(canvas);
    const emissiveMap = new THREE.CanvasTexture(emissiveCanvas);
    const normalMap = this.generateNormalMapFromHeight(heightCanvas, 2.2);

    const material = new THREE.MeshStandardMaterial({
      map: diffuseMap,
      normalMap,
      normalScale: new THREE.Vector2(0.9, 0.9),
      emissiveMap,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 0.9,
      roughness: 0.72,
      metalness: 0.15
    });

    this.cache.runicWall = { material, diffuseMap, emissiveMap, normalMap };
    return this.cache.runicWall;
  }

  /**
   * Weathered Prison Floor PBR (Aged Flagstones, drainage grates & runic floor circles)
   */
  static createPrisonFloorPBR(width = 1024, height = 1024) {
    if (this.cache.prisonFloor) return this.cache.prisonFloor;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    const heightCanvas = document.createElement('canvas');
    heightCanvas.width = width;
    heightCanvas.height = height;
    const hCtx = heightCanvas.getContext('2d');

    // Base dark weathered mortar
    ctx.fillStyle = '#121110';
    ctx.fillRect(0, 0, width, height);
    hCtx.fillStyle = '#080808';
    hCtx.fillRect(0, 0, width, height);

    // Flagstones
    const tiles = 8;
    const sz = width / tiles;
    const gap = 8;

    for (let r = 0; r < tiles; r++) {
      for (let c = 0; c < tiles; c++) {
        const x = c * sz + gap / 2;
        const y = r * sz + gap / 2;
        const w = sz - gap;
        const h = sz - gap;

        const val = 36 + Math.floor(Math.random() * 20);
        ctx.fillStyle = `rgb(${val + 2}, ${val}, ${val - 4})`;
        ctx.fillRect(x, y, w, h);

        hCtx.fillStyle = '#c0c0c0';
        hCtx.fillRect(x + 2, y + 2, w - 4, h - 4);

        // Surface texture variation
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.fillRect(x, y, w, 4);
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(x, y + h - 4, w, 4);
      }
    }

    // Central ancient awakening circle
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.45)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, 280, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(0, 229, 255, 0.35)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, 220, 0, Math.PI * 2);
    ctx.stroke();

    const diffuseMap = new THREE.CanvasTexture(canvas);
    diffuseMap.wrapS = THREE.RepeatWrapping;
    diffuseMap.wrapT = THREE.RepeatWrapping;

    const normalMap = this.generateNormalMapFromHeight(heightCanvas, 2.4);

    const material = new THREE.MeshStandardMaterial({
      map: diffuseMap,
      normalMap,
      normalScale: new THREE.Vector2(0.8, 0.8),
      roughness: 0.85,
      metalness: 0.1
    });

    this.cache.prisonFloor = { material, diffuseMap, normalMap };
    return this.cache.prisonFloor;
  }

  /**
   * High-Definition Metallic Gold Coin PBR Texture
   * Embossed Archon Dragon crest, Gothic starburst, milled coin edge, and Sobel normal mapping
   */
  static createGoldCoinPBR(width = 512, height = 512) {
    if (this.cache.goldCoin) return this.cache.goldCoin;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    const heightCanvas = document.createElement('canvas');
    heightCanvas.width = width;
    heightCanvas.height = height;
    const hCtx = heightCanvas.getContext('2d');

    // Base background
    ctx.fillStyle = '#b8860b';
    ctx.fillRect(0, 0, width, height);
    hCtx.fillStyle = '#808080';
    hCtx.fillRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height / 2;
    const r = width * 0.45;

    // Outer golden rim
    const grad = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r);
    grad.addColorStop(0, '#fff4b8');
    grad.addColorStop(0.5, '#ffd700');
    grad.addColorStop(0.85, '#cca01d');
    grad.addColorStop(1.0, '#78540c');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    hCtx.fillStyle = '#d0d0d0';
    hCtx.beginPath();
    hCtx.arc(cx, cy, r, 0, Math.PI * 2);
    hCtx.fill();

    // Milled gear grooves on coin edge
    const teeth = 48;
    for (let i = 0; i < teeth; i++) {
      const ang = (i / teeth) * Math.PI * 2;
      const x1 = cx + Math.cos(ang) * (r - 12);
      const y1 = cy + Math.sin(ang) * (r - 12);
      const x2 = cx + Math.cos(ang) * (r - 2);
      const y2 = cy + Math.sin(ang) * (r - 2);

      ctx.strokeStyle = i % 2 === 0 ? '#fff8cc' : '#5c3d00';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      hCtx.strokeStyle = i % 2 === 0 ? '#ffffff' : '#404040';
      hCtx.lineWidth = 3;
      hCtx.beginPath();
      hCtx.moveTo(x1, y1);
      hCtx.lineTo(x2, y2);
      hCtx.stroke();
    }

    // Inner embossed bezel ring
    ctx.strokeStyle = '#fff5a0';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.76, 0, Math.PI * 2);
    ctx.stroke();

    hCtx.strokeStyle = '#f0f0f0';
    hCtx.lineWidth = 5;
    hCtx.beginPath();
    hCtx.arc(cx, cy, r * 0.76, 0, Math.PI * 2);
    hCtx.fill();

    // Embossed Dragon / Archon Crest
    ctx.fillStyle = '#fff9d4';
    ctx.strokeStyle = '#9c6f05';
    ctx.lineWidth = 2;

    hCtx.fillStyle = '#ffffff';
    hCtx.strokeStyle = '#202020';
    hCtx.lineWidth = 2;

    [ctx, hCtx].forEach(c => {
      c.beginPath();
      // Dragon wings & head silhouette
      c.moveTo(cx, cy - r * 0.52);
      c.lineTo(cx + r * 0.32, cy - r * 0.2);
      c.lineTo(cx + r * 0.16, cy + r * 0.05);
      c.lineTo(cx + r * 0.35, cy + r * 0.35);
      c.lineTo(cx, cy + r * 0.18);
      c.lineTo(cx - r * 0.35, cy + r * 0.35);
      c.lineTo(cx - r * 0.16, cy + r * 0.05);
      c.lineTo(cx - r * 0.32, cy - r * 0.2);
      c.closePath();
      c.fill();
      c.stroke();
    });

    const diffuseMap = new THREE.CanvasTexture(canvas);
    const normalMap = this.generateNormalMapFromHeight(heightCanvas, 3.2);

    const material = new THREE.MeshStandardMaterial({
      map: diffuseMap,
      normalMap,
      normalScale: new THREE.Vector2(1.2, 1.2),
      roughness: 0.18,
      metalness: 0.94
    });

    this.cache.goldCoin = { material, diffuseMap, normalMap };
    return this.cache.goldCoin;
  }

  /**
   * Ornate Treasure Chest PBR Material (Aged Oak, Wrought Iron Straps, Brass Lock)
   */
  static createOrnateChestPBR(width = 1024, height = 1024) {
    if (this.cache.ornateChest) return this.cache.ornateChest;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    const heightCanvas = document.createElement('canvas');
    heightCanvas.width = width;
    heightCanvas.height = height;
    const hCtx = heightCanvas.getContext('2d');

    // Base aged dark oak wood
    ctx.fillStyle = '#2b1810';
    ctx.fillRect(0, 0, width, height);
    hCtx.fillStyle = '#505050';
    hCtx.fillRect(0, 0, width, height);

    // Wood grain strips
    const planks = 12;
    const ph = height / planks;
    for (let p = 0; p < planks; p++) {
      const y = p * ph;
      ctx.fillStyle = p % 2 === 0 ? '#382015' : '#23120b';
      ctx.fillRect(0, y, width, ph - 4);

      hCtx.fillStyle = p % 2 === 0 ? '#656565' : '#454545';
      hCtx.fillRect(0, y, width, ph - 4);
    }

    // Heavy wrought-iron corner braces
    ctx.fillStyle = '#1c1c1c';
    hCtx.fillStyle = '#909090';

    // Vertical iron corner bands
    [0, width - 90].forEach(bx => {
      ctx.fillRect(bx, 0, 90, height);
      hCtx.fillRect(bx, 0, 90, height);
    });

    // Horizontal reinforcement straps
    [height * 0.25, height * 0.7].forEach(by => {
      ctx.fillRect(0, by, width, 80);
      hCtx.fillRect(0, by, width, 80);
    });

    // Metallic rivets on iron straps
    for (let rx = 35; rx < width; rx += 75) {
      [height * 0.29, height * 0.74].forEach(ry => {
        ctx.fillStyle = '#757575';
        ctx.beginPath();
        ctx.arc(rx, ry, 10, 0, Math.PI * 2);
        ctx.fill();

        hCtx.fillStyle = '#f0f0f0';
        hCtx.beginPath();
        hCtx.arc(rx, ry, 10, 0, Math.PI * 2);
        hCtx.fill();
      });
    }

    // Central ornate brass lock plate
    const lx = width / 2 - 70;
    const ly = height * 0.45;
    ctx.fillStyle = '#c5a059';
    ctx.fillRect(lx, ly, 140, 100);
    hCtx.fillStyle = '#d8d8d8';
    hCtx.fillRect(lx, ly, 140, 100);

    // Keyhole
    ctx.fillStyle = '#0a0a0a';
    ctx.beginPath();
    ctx.arc(width / 2, ly + 40, 14, 0, Math.PI * 2);
    ctx.rect(width / 2 - 6, ly + 40, 12, 35);
    ctx.fill();

    hCtx.fillStyle = '#101010';
    hCtx.beginPath();
    hCtx.arc(width / 2, ly + 40, 14, 0, Math.PI * 2);
    hCtx.rect(width / 2 - 6, ly + 40, 12, 35);
    hCtx.fill();

    const diffuseMap = new THREE.CanvasTexture(canvas);
    const normalMap = this.generateNormalMapFromHeight(heightCanvas, 2.8);

    const material = new THREE.MeshStandardMaterial({
      map: diffuseMap,
      normalMap,
      normalScale: new THREE.Vector2(0.9, 0.9),
      roughness: 0.55,
      metalness: 0.45
    });

    this.cache.ornateChest = { material, diffuseMap, normalMap };
    return this.cache.ornateChest;
  }

  /**
   * Fluted Gothic Stone Pillar PBR Material with Gargoyle/Runic Relief
   */
  static createGothicPillarPBR(width = 1024, height = 1024) {
    if (this.cache.gothicPillar) return this.cache.gothicPillar;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    const heightCanvas = document.createElement('canvas');
    heightCanvas.width = width;
    heightCanvas.height = height;
    const hCtx = heightCanvas.getContext('2d');

    // Weathered granite base
    ctx.fillStyle = '#3a3835';
    ctx.fillRect(0, 0, width, height);
    hCtx.fillStyle = '#707070';
    hCtx.fillRect(0, 0, width, height);

    // Fluted vertical pillar grooves
    const flutes = 16;
    const fw = width / flutes;
    for (let f = 0; f < flutes; f++) {
      const fx = f * fw;
      const grad = ctx.createLinearGradient(fx, 0, fx + fw, 0);
      grad.addColorStop(0, '#262422');
      grad.addColorStop(0.5, '#524f4b');
      grad.addColorStop(1, '#262422');
      ctx.fillStyle = grad;
      ctx.fillRect(fx + 2, 0, fw - 4, height);

      const hGrad = hCtx.createLinearGradient(fx, 0, fx + fw, 0);
      hGrad.addColorStop(0, '#404040');
      hGrad.addColorStop(0.5, '#c0c0c0');
      hGrad.addColorStop(1, '#404040');
      hCtx.fillStyle = hGrad;
      hCtx.fillRect(fx + 2, 0, fw - 4, height);
    }

    // Carved horizontal runic bands at top and bottom
    [60, height - 120].forEach(by => {
      ctx.fillStyle = '#201e1c';
      ctx.fillRect(0, by, width, 60);
      hCtx.fillStyle = '#303030';
      hCtx.fillRect(0, by, width, 60);

      // Gold inlaid runes
      ctx.fillStyle = '#c5a059';
      ctx.font = 'bold 36px monospace';
      hCtx.fillStyle = '#ffffff';
      hCtx.font = 'bold 36px monospace';
      for (let rx = 20; rx < width; rx += 90) {
        ctx.fillText('ᚱᛟᚲ', rx, by + 44);
        hCtx.fillText('ᚱᛟᚲ', rx, by + 44);
      }
    });

    const diffuseMap = new THREE.CanvasTexture(canvas);
    diffuseMap.wrapS = THREE.RepeatWrapping;
    diffuseMap.wrapT = THREE.RepeatWrapping;
    const normalMap = this.generateNormalMapFromHeight(heightCanvas, 3.0);

    const material = new THREE.MeshStandardMaterial({
      map: diffuseMap,
      normalMap,
      normalScale: new THREE.Vector2(1.1, 1.1),
      roughness: 0.82,
      metalness: 0.12
    });

    this.cache.gothicPillar = { material, diffuseMap, normalMap };
    return this.cache.gothicPillar;
  }

  /**
   * Decayed Ancient Scroll PBR Material (Singed Vellum, Arcane Ink, Wax Seal)
   */
  static createAncientScrollPBR(width = 512, height = 512) {
    if (this.cache.ancientScroll) return this.cache.ancientScroll;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Singed aged parchment
    ctx.fillStyle = '#e8d8b8';
    ctx.fillRect(0, 0, width, height);

    // Burnt edges
    const burned = ctx.createLinearGradient(0, 0, width, 0);
    burned.addColorStop(0, '#2e1c0c');
    burned.addColorStop(0.08, '#8c5e32');
    burned.addColorStop(0.18, 'transparent');
    burned.addColorStop(0.82, 'transparent');
    burned.addColorStop(0.92, '#8c5e32');
    burned.addColorStop(1, '#2e1c0c');
    ctx.fillStyle = burned;
    ctx.fillRect(0, 0, width, height);

    // Cursive arcane script
    ctx.fillStyle = 'rgba(50, 30, 15, 0.75)';
    ctx.font = '14px serif';
    for (let y = 50; y < height - 70; y += 22) {
      ctx.fillText('Consummatum est spira antiqua... tempora in aeternum revocare...', 45, y);
    }

    // Crimson wax seal at bottom
    ctx.fillStyle = '#b71c1c';
    ctx.beginPath();
    ctx.arc(width / 2, height - 42, 28, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#d32f2f';
    ctx.beginPath();
    ctx.arc(width / 2, height - 42, 20, 0, Math.PI * 2);
    ctx.fill();

    const diffuseMap = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshStandardMaterial({
      map: diffuseMap,
      roughness: 0.88,
      metalness: 0.05
    });

    this.cache.ancientScroll = { material, diffuseMap };
    return this.cache.ancientScroll;
  }

  /**
   * Faceted Arcane Gemstone / Crystal PBR Material
   */
  static createArcaneCrystalPBR(color = '#00e5ff', width = 512, height = 512) {
    const key = `crystal_${color}`;
    if (this.cache[key]) return this.cache[key];

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(width / 2, height / 2, 20, width / 2, height / 2, width / 2);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.4, color);
    grad.addColorStop(1.0, '#021020');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Crystal facet polygon lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 3;
    const pts = [
      [width * 0.5, 20],
      [width - 30, height * 0.35],
      [width * 0.75, height - 30],
      [width * 0.25, height - 30],
      [30, height * 0.35]
    ];
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    ctx.stroke();

    // Cross facets
    pts.forEach(p => {
      ctx.beginPath();
      ctx.moveTo(width / 2, height / 2);
      ctx.lineTo(p[0], p[1]);
      ctx.stroke();
    });

    const diffuseMap = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshStandardMaterial({
      map: diffuseMap,
      color: new THREE.Color(color),
      emissive: new THREE.Color(color),
      emissiveIntensity: 1.2,
      roughness: 0.1,
      metalness: 0.25,
      transparent: true,
      opacity: 0.92
    });

    this.cache[key] = { material, diffuseMap };
    return this.cache[key];
  }

  /**
   * Incandescent High-Energy Flame Plasma with Solar Corona & Sobel Normals
   */
  static createFlamePlasmaPBR(width = 512, height = 512) {
    if (this.cache.flamePlasma) return this.cache.flamePlasma;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Deep burning ember background
    const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 10, width / 2, height / 2, width / 2);
    bgGrad.addColorStop(0, '#ffffff');
    bgGrad.addColorStop(0.25, '#ffe082');
    bgGrad.addColorStop(0.55, '#ff6d00');
    bgGrad.addColorStop(0.85, '#d50000');
    bgGrad.addColorStop(1.0, '#3e0000');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Heightmap canvas for dynamic normal relief
    const heightCanvas = document.createElement('canvas');
    heightCanvas.width = width;
    heightCanvas.height = height;
    const hCtx = heightCanvas.getContext('2d');
    hCtx.fillStyle = '#202020';
    hCtx.fillRect(0, 0, width, height);

    // Turbulent solar plasma filaments
    ctx.lineWidth = 3;
    for (let i = 0; i < 70; i++) {
      const angle = (i / 70) * Math.PI * 2;
      const r1 = 30 + Math.random() * (width / 3);
      const r2 = r1 + 25 + Math.random() * 45;
      const x1 = width / 2 + Math.cos(angle) * r1;
      const y1 = height / 2 + Math.sin(angle) * r1;
      const x2 = width / 2 + Math.cos(angle + 0.3) * r2;
      const y2 = height / 2 + Math.sin(angle + 0.3) * r2;

      ctx.strokeStyle = i % 2 === 0 ? 'rgba(255, 235, 59, 0.75)' : 'rgba(255, 87, 34, 0.65)';
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.quadraticCurveTo(width / 2 + Math.cos(angle + 0.15) * (r1 + 20), height / 2 + Math.sin(angle + 0.15) * (r1 + 20), x2, y2);
      ctx.stroke();

      hCtx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      hCtx.lineWidth = 4;
      hCtx.beginPath();
      hCtx.moveTo(x1, y1);
      hCtx.lineTo(x2, y2);
      hCtx.stroke();
    }

    const diffuseMap = new THREE.CanvasTexture(canvas);
    diffuseMap.wrapS = THREE.RepeatWrapping;
    diffuseMap.wrapT = THREE.RepeatWrapping;

    const normalMap = this.generateNormalMapFromHeight(heightCanvas, 2.2);

    const material = new THREE.MeshStandardMaterial({
      map: diffuseMap,
      normalMap,
      normalScale: new THREE.Vector2(1.2, 1.2),
      color: 0xffffff,
      emissive: new THREE.Color(0xff4500),
      emissiveMap: diffuseMap,
      emissiveIntensity: 2.4,
      roughness: 0.15,
      metalness: 0.1
    });

    this.cache.flamePlasma = { material, diffuseMap, normalMap };
    return this.cache.flamePlasma;
  }

  /**
   * Faceted Sub-Zero Glacial Ice Crystals with Veins & Specular Sheen
   */
  static createFrostCrystallinePBR(width = 512, height = 512) {
    if (this.cache.frostCrystalline) return this.cache.frostCrystalline;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Deep glacial blue gradient
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#00b0ff');
    grad.addColorStop(0.5, '#e0f7fa');
    grad.addColorStop(1, '#00e5ff');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    const heightCanvas = document.createElement('canvas');
    heightCanvas.width = width;
    heightCanvas.height = height;
    const hCtx = heightCanvas.getContext('2d');
    hCtx.fillStyle = '#808080';
    hCtx.fillRect(0, 0, width, height);

    // Crystalline faceted fissures
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 2.5;
    hCtx.strokeStyle = '#ffffff';
    hCtx.lineWidth = 3;

    for (let f = 0; f < 35; f++) {
      let x = Math.random() * width;
      let y = Math.random() * height;
      ctx.beginPath();
      hCtx.beginPath();
      ctx.moveTo(x, y);
      hCtx.moveTo(x, y);
      for (let s = 0; s < 4; s++) {
        x += (Math.random() - 0.5) * 80;
        y += (Math.random() - 0.5) * 80;
        ctx.lineTo(x, y);
        hCtx.lineTo(x, y);
      }
      ctx.stroke();
      hCtx.stroke();
    }

    const diffuseMap = new THREE.CanvasTexture(canvas);
    diffuseMap.wrapS = THREE.RepeatWrapping;
    diffuseMap.wrapT = THREE.RepeatWrapping;

    const normalMap = this.generateNormalMapFromHeight(heightCanvas, 3.0);

    const material = new THREE.MeshStandardMaterial({
      map: diffuseMap,
      normalMap,
      normalScale: new THREE.Vector2(1.5, 1.5),
      color: 0x80d8ff,
      emissive: new THREE.Color(0x00e5ff),
      emissiveIntensity: 1.8,
      roughness: 0.08,
      metalness: 0.35,
      transparent: true,
      opacity: 0.92
    });

    this.cache.frostCrystalline = { material, diffuseMap, normalMap };
    return this.cache.frostCrystalline;
  }

  /**
   * Divine Solar Halo & Sacred Sunburst Glyph Map
   */
  static createSolarHaloPBR(width = 512, height = 512) {
    if (this.cache.solarHalo) return this.cache.solarHalo;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, width, height);
    const cx = width / 2;
    const cy = height / 2;

    // Concentric golden rings
    ctx.strokeStyle = '#ffd700';
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 18;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, width * 0.42, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#fff9c4';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, width * 0.35, 0, Math.PI * 2);
    ctx.stroke();

    // 8-Point Sacred Sunburst Rays
    ctx.fillStyle = 'rgba(255, 238, 88, 0.85)';
    for (let r = 0; r < 8; r++) {
      const angle = (r / 8) * Math.PI * 2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(-6, width * 0.28);
      ctx.lineTo(0, width * 0.48);
      ctx.lineTo(6, width * 0.28);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Archon Solar Runes
    const runes = ['ᛟ', 'ᛋ', 'ᛏ', 'ᚱ', 'ᛗ', 'ᛚ', 'ᛞ', 'ᚨ'];
    ctx.font = 'bold 26px serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    runes.forEach((rune, idx) => {
      const angle = (idx / runes.length) * Math.PI * 2;
      const rx = cx + Math.cos(angle) * (width * 0.38);
      const ry = cy + Math.sin(angle) * (width * 0.38);
      ctx.fillText(rune, rx, ry);
    });

    const diffuseMap = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshBasicMaterial({
      map: diffuseMap,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    this.cache.solarHalo = { material, diffuseMap };
    return this.cache.solarHalo;
  }

  /**
   * Chronomantic Clockwork Astrolabe Dial Map
   */
  static createChronoClockworkPBR(width = 512, height = 512) {
    if (this.cache.chronoClockwork) return this.cache.chronoClockwork;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, width, height);
    const cx = width / 2;
    const cy = height / 2;

    // Outer Gear Cogs
    ctx.strokeStyle = '#bf5af2';
    ctx.shadowColor = '#bf5af2';
    ctx.shadowBlur = 16;
    ctx.fillStyle = 'rgba(191, 90, 242, 0.4)';
    const cogs = 24;
    for (let c = 0; c < cogs; c++) {
      const angle = (c / cogs) * Math.PI * 2;
      const x = cx + Math.cos(angle) * (width * 0.44);
      const y = cy + Math.sin(angle) * (width * 0.44);
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Dial ring
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#e040fb';
    ctx.beginPath();
    ctx.arc(cx, cy, width * 0.38, 0, Math.PI * 2);
    ctx.stroke();

    // 12 Roman Numerals
    const numerals = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
    ctx.font = 'bold 20px serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    numerals.forEach((num, idx) => {
      const angle = (idx / 12) * Math.PI * 2 - Math.PI / 2;
      const rx = cx + Math.cos(angle) * (width * 0.32);
      const ry = cy + Math.sin(angle) * (width * 0.32);
      ctx.fillText(num, rx, ry);
    });

    const diffuseMap = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshBasicMaterial({
      map: diffuseMap,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    this.cache.chronoClockwork = { material, diffuseMap };
    return this.cache.chronoClockwork;
  }

  /**
   * Concentric Arcane Summoning Ring with Elemental Runes
   */
  static createSpellRuneRing(element = 'fire', width = 512, height = 512) {
    const key = `spellRuneRing_${element}`;
    if (this.cache[key]) return this.cache[key];

    const colors = {
      fire: '#ff5722',
      frost: '#00e5ff',
      light: '#ffd700',
      chrono: '#bf5af2',
      storm: '#ffd60a'
    };
    const col = colors[element] || '#ff5722';

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height / 2;

    // Dual Concentric Circles
    ctx.strokeStyle = col;
    ctx.shadowColor = col;
    ctx.shadowBlur = 14;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, width * 0.44, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, width * 0.36, 0, Math.PI * 2);
    ctx.stroke();

    // Radial tick marks
    for (let t = 0; t < 36; t++) {
      const angle = (t / 36) * Math.PI * 2;
      const r1 = width * 0.36;
      const r2 = width * (t % 3 === 0 ? 0.44 : 0.40);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1);
      ctx.lineTo(cx + Math.cos(angle) * r2, cy + Math.sin(angle) * r2);
      ctx.stroke();
    }

    const diffuseMap = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshBasicMaterial({
      map: diffuseMap,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    this.cache[key] = { material, diffuseMap };
    return this.cache[key];
  }

  /**
   * High-Fidelity Archmage Dragon-Leather Gauntlet with Glowing Runic Veins & Sobel Normals
   */
  static createArchmageGauntletPBR(colorHex = '#ff5722', width = 512, height = 512) {
    const key = `gauntlet_${colorHex}`;
    if (this.cache[key]) return this.cache[key];

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Deep weathered obsidian dragon-leather tone
    ctx.fillStyle = '#17131b';
    ctx.fillRect(0, 0, width, height);

    // Heightmap canvas for tactile normal relief
    const heightCanvas = document.createElement('canvas');
    heightCanvas.width = width;
    heightCanvas.height = height;
    const hCtx = heightCanvas.getContext('2d');
    hCtx.fillStyle = '#303030';
    hCtx.fillRect(0, 0, width, height);

    // Leather pore & grain micro-texture
    for (let i = 0; i < 4000; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const r = 1 + Math.random() * 2;
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(38, 28, 44, 0.4)' : 'rgba(8, 6, 12, 0.5)';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();

      hCtx.fillStyle = Math.random() > 0.5 ? '#555555' : '#151515';
      hCtx.beginPath();
      hCtx.arc(x, y, r, 0, Math.PI * 2);
      hCtx.fill();
    }

    // Stitched leather seams & gold filigree trim
    ctx.strokeStyle = '#c4a962';
    ctx.lineWidth = 3;
    hCtx.strokeStyle = '#ffffff';
    hCtx.lineWidth = 4;
    for (let s = 1; s <= 3; s++) {
      const y = s * (height / 4);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();

      hCtx.beginPath();
      hCtx.moveTo(0, y);
      hCtx.lineTo(width, y);
      hCtx.stroke();
    }

    // Glowing Arcane Runic Veins along dorsal tendons
    const emissiveCanvas = document.createElement('canvas');
    emissiveCanvas.width = width;
    emissiveCanvas.height = height;
    const eCtx = emissiveCanvas.getContext('2d');
    eCtx.clearRect(0, 0, width, height);

    eCtx.strokeStyle = colorHex;
    eCtx.shadowColor = colorHex;
    eCtx.shadowBlur = 12;
    eCtx.lineWidth = 3.5;

    // 4 Metacarpal Leyline Veins
    for (let v = 0; v < 4; v++) {
      const startX = width * 0.2 + v * (width * 0.2);
      eCtx.beginPath();
      eCtx.moveTo(startX, height);
      eCtx.bezierCurveTo(startX + 15, height * 0.6, startX - 10, height * 0.3, startX, 0);
      eCtx.stroke();
    }

    const diffuseMap = new THREE.CanvasTexture(canvas);
    const normalMap = this.generateNormalMapFromHeight(heightCanvas, 2.4);
    const emissiveMap = new THREE.CanvasTexture(emissiveCanvas);

    const material = new THREE.MeshStandardMaterial({
      map: diffuseMap,
      normalMap,
      normalScale: new THREE.Vector2(1.4, 1.4),
      emissive: new THREE.Color(colorHex),
      emissiveMap,
      emissiveIntensity: 1.6,
      roughness: 0.35,
      metalness: 0.25
    });

    this.cache[key] = { material, diffuseMap, normalMap, emissiveMap };
    return this.cache[key];
  }

  /**
   * Twisted Ancient Elderwood Staff Texture with Deep Knots & Sobel Normals
   */
  static createTwistedElderwoodPBR(width = 512, height = 512) {
    if (this.cache.elderwood) return this.cache.elderwood;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Deep antique dark mahogany / elderwood base
    ctx.fillStyle = '#26140d';
    ctx.fillRect(0, 0, width, height);

    const heightCanvas = document.createElement('canvas');
    heightCanvas.width = width;
    heightCanvas.height = height;
    const hCtx = heightCanvas.getContext('2d');
    hCtx.fillStyle = '#404040';
    hCtx.fillRect(0, 0, width, height);

    // Flowing wood grain rings and knots
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 60; i++) {
      const y = (i / 60) * height;
      ctx.strokeStyle = i % 2 === 0 ? 'rgba(70, 42, 28, 0.7)' : 'rgba(20, 10, 6, 0.85)';
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= width; x += 30) {
        ctx.lineTo(x, y + Math.sin(x * 0.03 + i) * 8 + Math.cos(x * 0.08) * 4);
      }
      ctx.stroke();

      hCtx.strokeStyle = i % 2 === 0 ? 'rgba(200, 200, 200, 0.4)' : 'rgba(20, 20, 20, 0.5)';
      hCtx.lineWidth = 3;
      hCtx.beginPath();
      hCtx.moveTo(0, y);
      for (let x = 0; x <= width; x += 30) {
        hCtx.lineTo(x, y + Math.sin(x * 0.03 + i) * 8 + Math.cos(x * 0.08) * 4);
      }
      hCtx.stroke();
    }

    const diffuseMap = new THREE.CanvasTexture(canvas);
    diffuseMap.wrapS = THREE.RepeatWrapping;
    diffuseMap.wrapT = THREE.RepeatWrapping;

    const normalMap = this.generateNormalMapFromHeight(heightCanvas, 2.6);

    const material = new THREE.MeshStandardMaterial({
      map: diffuseMap,
      normalMap,
      normalScale: new THREE.Vector2(1.2, 1.2),
      roughness: 0.38,
      metalness: 0.15
    });

    this.cache.elderwood = { material, diffuseMap, normalMap };
    return this.cache.elderwood;
  }

  /**
   * Cross-Stitched Handle Leather Wrap for Staff Grip
   */
  static createLeatherWrapPBR(width = 256, height = 256) {
    if (this.cache.leatherWrap) return this.cache.leatherWrap;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#4a2818';
    ctx.fillRect(0, 0, width, height);

    // Diagonal wrap bands
    ctx.strokeStyle = '#2b160c';
    ctx.lineWidth = 8;
    for (let i = -width; i < width * 2; i += 32) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + height, height);
      ctx.stroke();
    }

    // Gold stitching
    ctx.strokeStyle = '#c4a962';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 6]);
    for (let i = -width; i < width * 2; i += 32) {
      ctx.beginPath();
      ctx.moveTo(i + 4, 0);
      ctx.lineTo(i + height + 4, height);
      ctx.stroke();
    }

    const diffuseMap = new THREE.CanvasTexture(canvas);
    diffuseMap.wrapS = THREE.RepeatWrapping;
    diffuseMap.wrapT = THREE.RepeatWrapping;

    const material = new THREE.MeshStandardMaterial({
      map: diffuseMap,
      roughness: 0.5,
      metalness: 0.1
    });

    this.cache.leatherWrap = { material, diffuseMap };
    return this.cache.leatherWrap;
  }
}

