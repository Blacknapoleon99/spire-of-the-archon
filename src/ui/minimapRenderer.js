export class MinimapRenderer {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 180;
    this.canvas.height = 180;
    this.ctx = this.canvas.getContext('2d');
    
    this.canvas.style.cssText = 'position:absolute;top:24px;right:24px;border-radius:50%;border:2px solid rgba(212,175,55,0.6);box-shadow:0 0 15px rgba(212,175,55,0.3);z-index:60;pointer-events:none;';
    document.getElementById('hud').appendChild(this.canvas);
  }
  
  update(playerPos, playerRotY, enemies, partyMembers, questWaypointPos, floorRadius) {
    const ctx = this.ctx;
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;
    const scale = 4; // 1 unit = 4 pixels

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.save();

    // Clip to circle
    ctx.beginPath();
    ctx.arc(cx, cy, cx - 2, 0, Math.PI * 2);
    ctx.clip();

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Rotate map around player
    ctx.translate(cx, cy);
    ctx.rotate(playerRotY); // Adjust map rotation to match player view if desired, or keep fixed north
    
    // Actually, usually minimaps rotate so up is where player is looking, 
    // or map is fixed and player arrow rotates.
    // The prompt says: "The minimap should be player-centered (player always at center, world rotates around them)."
    // So the map rotates by playerRotY. (Actually world rotation relative to player is -playerRotY, assuming looking down -z)
    ctx.rotate(-playerRotY - Math.PI); // Adjust so forward is UP

    // Draw floor outline
    ctx.beginPath();
    ctx.arc(0, 0, floorRadius * scale, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Helper function to draw dots relative to player
    const drawDot = (pos, color, size, isPulsing = false) => {
      const dx = (pos.x - playerPos.x) * scale;
      const dz = (pos.z - playerPos.z) * scale;
      
      let finalSize = size;
      if (isPulsing) {
        finalSize = size + Math.sin(Date.now() / 150) * 1.5;
      }

      ctx.beginPath();
      ctx.arc(dx, dz, finalSize, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    };

    // Draw party members
    if (partyMembers) {
      partyMembers.forEach(pm => {
        if (pm && pm.position) {
          drawDot(pm.position, '#00e5ff', 3);
        }
      });
    }

    // Draw enemies
    if (enemies) {
      enemies.forEach(e => {
        if (e && e.position) {
          drawDot(e.position, '#ff3b30', 3, true);
        }
      });
    }

    // Draw quest objective
    if (questWaypointPos) {
      const dx = (questWaypointPos.x - playerPos.x) * scale;
      const dz = (questWaypointPos.z - playerPos.z) * scale;
      
      ctx.save();
      ctx.translate(dx, dz);
      ctx.rotate(Date.now() / 500);
      ctx.fillStyle = '#d4af37';
      ctx.beginPath();
      ctx.moveTo(0, -4);
      ctx.lineTo(4, 0);
      ctx.lineTo(0, 4);
      ctx.lineTo(-4, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    
    // Draw North indicator relative to world rotation
    ctx.save();
    // Revert rotation to draw N at the "north" position of the floor
    // Actually, N should just be at the top of the map if fixed map, 
    // but if world rotates, N is at (0, -floorRadius*scale) in world space
    const nDx = (0 - playerPos.x) * scale;
    const nDz = (-floorRadius - playerPos.z) * scale;
    
    ctx.translate(nDx, nDz);
    // Un-rotate text so it's always upright
    ctx.rotate(playerRotY + Math.PI); 
    ctx.fillStyle = '#d4af37';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', 0, 0);
    ctx.restore();

    ctx.restore(); // Restore to standard context

    // Draw player arrow in the center
    ctx.save();
    ctx.translate(cx, cy);
    // Map is already rotated so player is always pointing UP
    ctx.fillStyle = '#32cd32';
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4, 4);
    ctx.lineTo(0, 2);
    ctx.lineTo(-4, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}
