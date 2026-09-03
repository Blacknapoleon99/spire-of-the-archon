import * as THREE from 'three';

/**
 * First-Person 3D Physics, Pointer Lock Mouse Look, WASD Movement, and Collision Engine
 */
export class PhysicsController {
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;

    // First-Person Rotation (Euler: Yaw Y, Pitch X, Roll Z)
    this.yaw = 0;
    this.pitch = 0;
    this.roll = 0;
    this.targetRoll = 0;
    this.mouseSensitivity = 0.0022;
    this.isLocked = false;

    // Movement keys
    this.keys = {};
    this.isLMBDown = false;
    this.isRMBDown = false;

    // Raycaster for First-Person crosshair center
    this.raycaster = new THREE.Raycaster();
    this.centerScreen = new THREE.Vector2(0, 0); // Always center screen in FPS!
    this.crosshairWorldPos = new THREE.Vector3();

    this.setupListeners();
  }

  setupListeners() {
    // Keyboard
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    // Pointer Lock setup on canvas click
    this.domElement.addEventListener('click', () => {
      if (!this.isLocked) {
        this.domElement.requestPointerLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isLocked = (document.pointerLockElement === this.domElement);
      const hint = document.getElementById('click-to-play-hint');
      if (hint) {
        hint.style.display = this.isLocked ? 'none' : 'flex';
      }
    });

    // Mouse movement in Pointer Lock
    document.addEventListener('mousemove', (e) => {
      if (!this.isLocked) return;

      const movementX = e.movementX || e.mozMovementX || 0;
      const movementY = e.movementY || e.mozMovementY || 0;

      this.mouseDeltaX = (this.mouseDeltaX || 0) + movementX;
      this.mouseDeltaY = (this.mouseDeltaY || 0) + movementY;

      this.yaw -= movementX * this.mouseSensitivity;
      this.pitch -= movementY * this.mouseSensitivity;

      // Clamp vertical pitch (-85 to +85 degrees)
      const maxPitch = Math.PI / 2 - 0.08;
      this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));

      // Apply to camera
      this.updateCameraRotation();
    });

    // Mouse Clicks for Spells & Combat
    window.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.closest('.modal-card') || e.target.closest('.quest-journal-modal') || e.target.closest('.book-modal')) {
        return;
      }
      if (e.button === 0) {
        this.isLMBDown = true;
        if (!this.isLocked && (e.target === this.domElement || e.target.id === 'three-canvas' || e.target.id === 'reticle' || e.target.id === 'hud-overlay')) {
          this.domElement.requestPointerLock();
        }
      }
      if (e.button === 2) this.isRMBDown = true;
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.isLMBDown = false;
      if (e.button === 2) this.isRMBDown = false;
    });

    window.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  consumeMouseDelta() {
    const dx = this.mouseDeltaX || 0;
    const dy = this.mouseDeltaY || 0;
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    return { dx, dy };
  }

  updateCameraRotation() {
    const euler = new THREE.Euler(0, 0, 0, 'YXZ');
    euler.x = this.pitch;
    euler.y = this.yaw;
    euler.z = this.roll;
    this.camera.quaternion.setFromEuler(euler);
  }

  /**
   * Updates kinematics, strafe roll smoothing, and orientation
   */
  update(deltaTime = 0.016) {
    // Strafe roll calculation (subtle camera lean into turns)
    let strafeInput = 0;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) strafeInput += 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) strafeInput -= 1;

    this.targetRoll = strafeInput * 0.024; // ~1.4 degree dynamic roll
    this.roll += (this.targetRoll - this.roll) * Math.min(1.0, deltaTime * 9);

    this.updateCameraRotation();
  }

  /**
   * Calculates First-Person movement vector in camera direction (WASD)
   */
  getMovementVector() {
    const move = new THREE.Vector3(0, 0, 0);

    // Forward / Backward in yaw direction
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

    if (this.keys['KeyW'] || this.keys['ArrowUp']) move.add(forward);
    if (this.keys['KeyS'] || this.keys['ArrowDown']) move.sub(forward);
    if (this.keys['KeyD'] || this.keys['ArrowRight']) move.add(right);
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) move.sub(right);

    if (move.lengthSq() > 0) {
      move.normalize();
    }
    return move;
  }

  /**
   * Updates world ray along center crosshair
   */
  updateCrosshairAim() {
    this.raycaster.setFromCamera(this.centerScreen, this.camera);
    // Find point 30 meters ahead along ray
    this.crosshairWorldPos.copy(this.camera.position).addScaledVector(this.raycaster.ray.direction, 30);
    return this.raycaster.ray.direction;
  }

  /**
   * Collision resolution with environment boundaries and obstacles
   */
  resolveCollision(pos, radius, colliders, maxTowerRadius = 21.0, currentFloor = 1) {
    if (currentFloor === 1 && pos.z > 17.5) {
      // Awakening Vault (Starting Room) rectangular bounds: x: [-7.2, 7.2], z: [17.5, 34.8]
      pos.x = Math.max(-7.2 + radius, Math.min(7.2 - radius, pos.x));
      pos.z = Math.max(17.5, Math.min(34.8 - radius, pos.z));

      // If passing through archway threshold, constrain x to arch opening [-2.6, 2.6]
      if (pos.z < 19.0 && pos.z >= 17.5) {
        if (Math.abs(pos.x) > 2.6 - radius) {
          pos.z = 19.0;
        }
      }
    } else {
      // Circular room boundary
      const distFromCenter = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
      if (distFromCenter + radius > maxTowerRadius) {
        if (currentFloor === 1 && pos.z > 16.5 && Math.abs(pos.x) < 2.5) {
          // Allow entering the Awakening Vault South doorway
        } else {
          const angle = Math.atan2(pos.z, pos.x);
          pos.x = Math.cos(angle) * (maxTowerRadius - radius);
          pos.z = Math.sin(angle) * (maxTowerRadius - radius);
        }
      }
    }

    // Cylinder / pillar colliders
    for (const col of colliders) {
      if (col.type === 'cylinder') {
        const dx = pos.x - col.x;
        const dz = pos.z - col.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const minDist = radius + col.radius;

        if (dist < minDist && dist > 0.001) {
          const overlap = minDist - dist;
          pos.x += (dx / dist) * overlap;
          pos.z += (dz / dist) * overlap;
        }
      }
    }
  }

  /**
   * Finds the closest interactable in player reach
   */
  getNearbyInteractable(playerPos, interactables) {
    for (const item of interactables) {
      const dx = playerPos.x - item.x;
      const dz = playerPos.z - item.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist <= item.radius) {
        return item;
      }
    }
    return null;
  }
}
