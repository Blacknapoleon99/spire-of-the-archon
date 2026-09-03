/**
 * Custom Vector SVG Fantasy Iconography System for The Spire of the Archon.
 * Replaces generic unicode emojis with high-definition, glowing gothic vector artwork.
 */

export const CUSTOM_ICONS = {
  // === SPELLS: PYROMANCER ===
  ember_bolt: `
    <svg viewBox="0 0 64 64" class="custom-icon" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="grad_ember" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#fff7b2"/>
          <stop offset="45%" stop-color="#ff9100"/>
          <stop offset="85%" stop-color="#ff3d00"/>
          <stop offset="100%" stop-color="#7a0000"/>
        </radialGradient>
        <filter id="glow_ember"><feGaussianBlur stdDeviation="3" result="glow"/><feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <circle cx="32" cy="32" r="28" fill="#140603" stroke="#ff5722" stroke-width="2"/>
      <path d="M32 8 C38 22 52 26 42 46 C36 56 28 56 22 46 C12 26 26 22 32 8 Z" fill="url(#grad_ember)" filter="url(#glow_ember)"/>
      <circle cx="32" cy="36" r="6" fill="#ffffff" opacity="0.9"/>
    </svg>`,

  fireball: `
    <svg viewBox="0 0 64 64" class="custom-icon" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="grad_fb" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#ffffff"/>
          <stop offset="30%" stop-color="#ffea00"/>
          <stop offset="70%" stop-color="#ff3d00"/>
          <stop offset="100%" stop-color="#8a0000"/>
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="28" fill="#180703" stroke="#ff3d00" stroke-width="2"/>
      <path d="M12 12 Q32 20 28 36 Q38 24 52 14 Q46 34 46 48 Q32 60 18 48 Q10 38 12 12 Z" fill="#ff6d00" opacity="0.4"/>
      <circle cx="32" cy="34" r="16" fill="url(#grad_fb)"/>
      <path d="M28 20 C34 16 38 18 42 14 C40 22 46 26 44 32 C48 30 52 32 50 38 C42 42 38 48 32 50" stroke="#fff3b0" stroke-width="2" stroke-linecap="round"/>
    </svg>`,

  flame_wave: `
    <svg viewBox="0 0 64 64" class="custom-icon" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="28" fill="#140603" stroke="#ff6d00" stroke-width="2"/>
      <path d="M8 44 Q20 24 32 44 Q44 24 56 44" stroke="#ff9100" stroke-width="4" stroke-linecap="round"/>
      <path d="M14 34 Q26 14 38 34 Q50 14 58 34" stroke="#ff3d00" stroke-width="3" stroke-linecap="round"/>
      <path d="M20 24 Q32 8 44 24" stroke="#ffd600" stroke-width="2.5" stroke-linecap="round"/>
    </svg>`,

  fire_tornado: `
    <svg viewBox="0 0 64 64" class="custom-icon" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad_tornado" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ffea00"/>
          <stop offset="50%" stop-color="#ff3d00"/>
          <stop offset="100%" stop-color="#b71c1c"/>
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="28" fill="#1a0602" stroke="#ff3d00" stroke-width="2.5"/>
      <path d="M14 14 Q32 10 50 14 Q32 20 18 24 Q32 20 46 24 Q32 32 22 36 Q32 32 42 36 Q32 44 26 48 Q32 44 38 48 Q32 56 32 58" stroke="url(#grad_tornado)" stroke-width="3.5" stroke-linecap="round" fill="none"/>
      <circle cx="32" cy="14" r="5" fill="#fff7b2"/>
      <circle cx="32" cy="34" r="4" fill="#ff9100"/>
      <circle cx="32" cy="48" r="3" fill="#ff3d00"/>
    </svg>`,

  // === SPELLS: CRYOMANCER ===
  frost_shard: `
    <svg viewBox="0 0 64 64" class="custom-icon" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="28" fill="#04121a" stroke="#00e5ff" stroke-width="2"/>
      <polygon points="32,8 38,28 48,32 38,36 32,56 26,36 16,32 26,28" fill="#80d8ff" stroke="#ffffff" stroke-width="1.5"/>
      <polygon points="32,16 35,30 42,32 35,34 32,48 29,34 22,32 29,30" fill="#ffffff" opacity="0.7"/>
    </svg>`,

  ice_lance: `
    <svg viewBox="0 0 64 64" class="custom-icon" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="28" fill="#041420" stroke="#00b0ff" stroke-width="2"/>
      <path d="M48 12 L52 16 L22 52 L16 50 L12 46 L14 40 Z" fill="#40c4ff" stroke="#ffffff" stroke-width="1.5"/>
      <path d="M48 12 L16 46" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>
      <polygon points="26,30 36,24 32,36" fill="#e0f7fa" opacity="0.8"/>
    </svg>`,

  glacial_bulwark: `
    <svg viewBox="0 0 64 64" class="custom-icon" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="28" fill="#031622" stroke="#00e5ff" stroke-width="2"/>
      <path d="M32 10 L48 18 C48 36 38 48 32 54 C26 48 16 36 16 18 Z" fill="#0288d1" stroke="#80d8ff" stroke-width="2.5"/>
      <polygon points="32,20 40,28 32,44 24,28" fill="#e0f7fa" opacity="0.85"/>
    </svg>`,

  frost_nova: `
    <svg viewBox="0 0 64 64" class="custom-icon" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="28" fill="#03121c" stroke="#40c4ff" stroke-width="2"/>
      <line x1="32" y1="10" x2="32" y2="54" stroke="#00e5ff" stroke-width="3" stroke-linecap="round"/>
      <line x1="10" y1="32" x2="54" y2="32" stroke="#00e5ff" stroke-width="3" stroke-linecap="round"/>
      <line x1="16" y1="16" x2="48" y2="48" stroke="#80d8ff" stroke-width="2" stroke-linecap="round"/>
      <line x1="48" y1="16" x2="16" y2="48" stroke="#80d8ff" stroke-width="2" stroke-linecap="round"/>
      <circle cx="32" cy="32" r="6" fill="#ffffff"/>
    </svg>`,

  // === SPELLS: LUMINARY ===
  sacred_spark: `
    <svg viewBox="0 0 64 64" class="custom-icon" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="28" fill="#181504" stroke="#ffd700" stroke-width="2"/>
      <path d="M32 10 Q32 32 54 32 Q32 32 32 54 Q32 32 10 32 Q32 32 32 10 Z" fill="#fff59d" stroke="#ffd700" stroke-width="2"/>
      <circle cx="32" cy="32" r="5" fill="#ffffff"/>
    </svg>`,

  radiant_heal: `
    <svg viewBox="0 0 64 64" class="custom-icon" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="28" fill="#1a1403" stroke="#ffd600" stroke-width="2"/>
      <path d="M32 14 C36 8 48 8 50 20 C52 32 32 48 32 50 C32 48 12 32 14 20 C16 8 28 8 32 14 Z" fill="#ff4081" stroke="#ffd700" stroke-width="2"/>
      <line x1="32" y1="22" x2="32" y2="38" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
      <line x1="24" y1="30" x2="40" y2="30" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
    </svg>`,

  cleansing_wave: `
    <svg viewBox="0 0 64 64" class="custom-icon" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="28" fill="#181404" stroke="#ffeb3b" stroke-width="2"/>
      <circle cx="32" cy="32" r="20" stroke="#ffd700" stroke-width="2" stroke-dasharray="6 4"/>
      <circle cx="32" cy="32" r="12" stroke="#fff59d" stroke-width="2.5"/>
      <circle cx="32" cy="32" r="5" fill="#ffffff"/>
    </svg>`,

  divine_sanctuary: `
    <svg viewBox="0 0 64 64" class="custom-icon" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="28" fill="#1c1602" stroke="#ffd700" stroke-width="2.5"/>
      <path d="M18 48 L18 28 Q32 12 46 28 L46 48 Z" fill="#ffc107" stroke="#ffffff" stroke-width="2"/>
      <path d="M26 48 L26 36 Q32 28 38 36 L38 48 Z" fill="#1c1602" stroke="#ffd700" stroke-width="1.5"/>
      <circle cx="32" cy="20" r="4" fill="#ffffff"/>
    </svg>`,

  // === SPELLS: CHRONOMANCER ===
  chrono_dart: `
    <svg viewBox="0 0 64 64" class="custom-icon" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="28" fill="#12041a" stroke="#bf5af2" stroke-width="2"/>
      <circle cx="32" cy="32" r="18" stroke="#aa00ff" stroke-width="2" stroke-dasharray="4 4"/>
      <line x1="32" y1="32" x2="32" y2="18" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="32" y1="32" x2="42" y2="36" stroke="#ea80fc" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="32" cy="32" r="3.5" fill="#ffffff"/>
    </svg>`,

  temporal_rewind: `
    <svg viewBox="0 0 64 64" class="custom-icon" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="28" fill="#160320" stroke="#bf5af2" stroke-width="2"/>
      <path d="M44 32 A14 14 0 1 0 32 46" stroke="#e040fb" stroke-width="3.5" stroke-linecap="round" fill="none"/>
      <polygon points="44,24 50,34 40,34" fill="#ffffff"/>
      <circle cx="32" cy="32" r="4" fill="#ffffff"/>
    </svg>`,

  time_dilation: `
    <svg viewBox="0 0 64 64" class="custom-icon" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="28" fill="#14021c" stroke="#d500f9" stroke-width="2"/>
      <path d="M18 16 Q32 28 46 16 L42 22 Q32 32 42 42 L46 48 Q32 36 18 48 L22 42 Q32 32 22 22 Z" fill="#aa00ff" stroke="#ea80fc" stroke-width="2"/>
      <circle cx="32" cy="32" r="3" fill="#ffffff"/>
    </svg>`,

  temporal_stasis: `
    <svg viewBox="0 0 64 64" class="custom-icon" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="28" fill="#180424" stroke="#bf5af2" stroke-width="2.5"/>
      <circle cx="32" cy="32" r="22" stroke="#ea80fc" stroke-width="1.5" stroke-dasharray="2 6"/>
      <path d="M22 16 L42 16 L34 30 L42 48 L22 48 L30 30 Z" fill="#7b1fa2" stroke="#ffffff" stroke-width="2"/>
      <circle cx="32" cy="32" r="5" fill="#00e5ff"/>
    </svg>`,

  // === DASH / BASIC ===
  blink_dash: `
    <svg viewBox="0 0 64 64" class="custom-icon" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="28" fill="#081024" stroke="#00e5ff" stroke-width="2"/>
      <polygon points="36,8 16,34 30,34 26,56 48,26 34,26" fill="#00e5ff" stroke="#ffffff" stroke-width="1.5"/>
    </svg>`,

  basic_wand: `
    <svg viewBox="0 0 64 64" class="custom-icon" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="28" fill="#100b1a" stroke="#d4af37" stroke-width="2"/>
      <line x1="16" y1="48" x2="40" y2="24" stroke="#8d6e63" stroke-width="4" stroke-linecap="round"/>
      <circle cx="44" cy="20" r="6" fill="#00e5ff" stroke="#ffffff" stroke-width="2"/>
      <line x1="44" y1="10" x2="44" y2="6" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
      <line x1="54" y1="20" x2="58" y2="20" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
    </svg>`,

  // === HUD MODAL BUTTONS ===
  inventory: `
    <svg viewBox="0 0 64 64" class="custom-icon" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="16" y="22" width="32" height="30" rx="4" fill="#4e342e" stroke="#d4af37" stroke-width="2"/>
      <path d="M24 22 C24 14 40 14 40 22" stroke="#d4af37" stroke-width="3" stroke-linecap="round"/>
      <rect x="28" y="32" width="8" height="6" fill="#ffd700"/>
    </svg>`,

  grimoire: `
    <svg viewBox="0 0 64 64" class="custom-icon" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="16" y="14" width="32" height="38" rx="3" fill="#311b92" stroke="#d4af37" stroke-width="2"/>
      <line x1="22" y1="14" x2="22" y2="52" stroke="#d4af37" stroke-width="2"/>
      <circle cx="35" cy="33" r="6" stroke="#00e5ff" stroke-width="2" fill="#1a237e"/>
    </svg>`,

  journal: `
    <svg viewBox="0 0 64 64" class="custom-icon" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 16 C22 14 42 14 46 16 C46 44 46 44 46 48 C42 46 22 46 18 48 Z" fill="#fff8e1" stroke="#8d6e63" stroke-width="2"/>
      <line x1="24" y1="24" x2="40" y2="24" stroke="#8d6e63" stroke-width="2" stroke-linecap="round"/>
      <line x1="24" y1="32" x2="40" y2="32" stroke="#8d6e63" stroke-width="2" stroke-linecap="round"/>
      <line x1="24" y1="40" x2="34" y2="40" stroke="#8d6e63" stroke-width="2" stroke-linecap="round"/>
      <circle cx="42" cy="46" r="4" fill="#c62828"/>
    </svg>`,

  talents: `
    <svg viewBox="0 0 64 64" class="custom-icon" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="32,10 38,24 52,26 42,36 44,50 32,42 20,50 22,36 12,26 26,24" fill="#ffd700" stroke="#ffffff" stroke-width="2"/>
      <circle cx="32" cy="32" r="5" fill="#ffffff"/>
    </svg>`,

  audio_on: `
    <svg viewBox="0 0 64 64" class="custom-icon" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="16,24 26,24 36,14 36,50 26,40 16,40" fill="#ffd700"/>
      <path d="M42 22 C46 26 46 38 42 42" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
      <path d="M48 16 C54 22 54 42 48 48" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
    </svg>`,

  audio_off: `
    <svg viewBox="0 0 64 64" class="custom-icon" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="16,24 26,24 36,14 36,50 26,40 16,40" fill="#757575"/>
      <line x1="42" y1="24" x2="52" y2="40" stroke="#e53935" stroke-width="3" stroke-linecap="round"/>
      <line x1="52" y1="24" x2="42" y2="40" stroke="#e53935" stroke-width="3" stroke-linecap="round"/>
    </svg>`,

  // === EQUIPMENT SLOTS ===
  mainHand: `
    <svg viewBox="0 0 64 64" class="custom-icon" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="28" fill="#140f1a" stroke="#d4af37" stroke-width="2"/>
      <path d="M18 46 L38 26 L42 22 L46 26 L42 30 L22 50 Z" fill="#8d6e63" stroke="#ffd700" stroke-width="1.5"/>
      <circle cx="44" cy="20" r="7" fill="#00e5ff" stroke="#ffffff" stroke-width="2"/>
    </svg>`,

  offHand: `
    <svg viewBox="0 0 64 64" class="custom-icon" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="28" fill="#0d1424" stroke="#00e5ff" stroke-width="2"/>
      <rect x="20" y="16" width="24" height="32" rx="3" fill="#1a237e" stroke="#80d8ff" stroke-width="2"/>
      <circle cx="32" cy="32" r="6" fill="#00e5ff" opacity="0.8"/>
      <line x1="24" y1="16" x2="24" y2="48" stroke="#d4af37" stroke-width="2"/>
    </svg>`,

  head: `
    <svg viewBox="0 0 64 64" class="custom-icon" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="28" fill="#161208" stroke="#ffd700" stroke-width="2"/>
      <path d="M16 42 L20 22 L28 32 L32 18 L36 32 L44 22 L48 42 Z" fill="#ffb300" stroke="#ffd700" stroke-width="2"/>
      <circle cx="32" cy="36" r="3" fill="#ffffff"/>
    </svg>`,

  chest: `
    <svg viewBox="0 0 64 64" class="custom-icon" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="28" fill="#120c1a" stroke="#ba68c8" stroke-width="2"/>
      <path d="M22 16 L32 24 L42 16 L48 24 L42 48 L22 48 L16 24 Z" fill="#4a148c" stroke="#ce93d8" stroke-width="2"/>
      <line x1="32" y1="24" x2="32" y2="48" stroke="#ffd700" stroke-width="2"/>
    </svg>`,

  hands: `
    <svg viewBox="0 0 64 64" class="custom-icon" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="28" fill="#121814" stroke="#81c784" stroke-width="2"/>
      <path d="M22 46 L22 30 L26 22 L32 20 L38 22 L42 30 L42 46 Z" fill="#2e7d32" stroke="#a5d6a7" stroke-width="2"/>
      <rect x="26" y="38" width="12" height="4" rx="2" fill="#ffd700"/>
    </svg>`,

  ring: `
    <svg viewBox="0 0 64 64" class="custom-icon" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="28" fill="#181408" stroke="#ffd700" stroke-width="2"/>
      <circle cx="32" cy="36" r="14" stroke="#ffd700" stroke-width="3" fill="none"/>
      <polygon points="32,14 38,22 32,26 26,22" fill="#00e5ff" stroke="#ffffff" stroke-width="1.5"/>
    </svg>`,

  boots: `
    <svg viewBox="0 0 64 64" class="custom-icon" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="28" fill="#120e18" stroke="#ffd700" stroke-width="2"/>
      <path d="M22 14 L34 14 L34 32 L46 36 L46 48 L18 48 L18 20 Z" fill="#5d4037" stroke="#d7ccc8" stroke-width="2"/>
      <line x1="22" y1="24" x2="34" y2="24" stroke="#ffd700" stroke-width="2"/>
      <line x1="22" y1="32" x2="34" y2="32" stroke="#ffd700" stroke-width="2"/>
    </svg>`,

  amulet: `
    <svg viewBox="0 0 64 64" class="custom-icon" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="28" fill="#181020" stroke="#ffd700" stroke-width="2"/>
      <path d="M20 16 Q32 28 44 16" stroke="#ffd700" stroke-width="2.5" fill="none"/>
      <path d="M24 22 Q32 32 40 22" stroke="#ffd700" stroke-width="2" fill="none"/>
      <polygon points="32,28 40,38 32,48 24,38" fill="#00e5ff" stroke="#ffffff" stroke-width="1.5"/>
      <circle cx="32" cy="38" r="3" fill="#ffffff"/>
    </svg>`,

  healing_potion: `
    <svg viewBox="0 0 64 64" class="custom-icon" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="28" fill="#1c070a" stroke="#e53935" stroke-width="2"/>
      <rect x="28" y="12" width="8" height="6" rx="1" fill="#d7ccc8" stroke="#8d6e63" stroke-width="1.5"/>
      <path d="M26 18 L38 18 L44 32 C46 42 40 50 32 50 C24 50 18 42 20 32 Z" fill="#d32f2f" stroke="#ffcdd2" stroke-width="2"/>
      <circle cx="28" cy="34" r="3" fill="#ffffff" opacity="0.6"/>
    </svg>`,

  mana_potion: `
    <svg viewBox="0 0 64 64" class="custom-icon" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="28" fill="#060f1c" stroke="#1e88e5" stroke-width="2"/>
      <rect x="28" y="12" width="8" height="6" rx="1" fill="#cfd8dc" stroke="#78909c" stroke-width="1.5"/>
      <path d="M26 18 L38 18 L44 32 C46 42 40 50 32 50 C24 50 18 42 20 32 Z" fill="#1976d2" stroke="#bbdefb" stroke-width="2"/>
      <circle cx="28" cy="34" r="3" fill="#ffffff" opacity="0.6"/>
    </svg>`,

  // === 24 CLASS TALENT ICONS ===
  pyro_ignite: `<svg viewBox="0 0 64 64" class="custom-icon" fill="none"><circle cx="32" cy="32" r="28" fill="#140602" stroke="#ff5722" stroke-width="2"/><path d="M32 12 C36 22 46 26 40 42 C36 50 28 50 24 42 C18 26 28 22 32 12 Z" fill="#ff7043"/><circle cx="32" cy="36" r="4" fill="#ffffff"/></svg>`,
  pyro_combustion: `<svg viewBox="0 0 64 64" class="custom-icon" fill="none"><circle cx="32" cy="32" r="28" fill="#1a0602" stroke="#ff3d00" stroke-width="2"/><polygon points="32,10 38,26 54,32 38,38 32,54 26,38 10,32 26,26" fill="#ff9100"/><circle cx="32" cy="32" r="6" fill="#ffffff"/></svg>`,
  pyro_inferno: `<svg viewBox="0 0 64 64" class="custom-icon" fill="none"><circle cx="32" cy="32" r="28" fill="#200602" stroke="#ffd600" stroke-width="2.5"/><path d="M20 46 Q32 14 44 46 Q32 38 20 46 Z" fill="#ff3d00"/><circle cx="32" cy="28" r="8" fill="#fff59d"/></svg>`,
  pyro_aether: `<svg viewBox="0 0 64 64" class="custom-icon" fill="none"><circle cx="32" cy="32" r="28" fill="#180703" stroke="#ff9100" stroke-width="2"/><circle cx="32" cy="32" r="16" stroke="#ffea00" stroke-width="2" stroke-dasharray="4 4"/><circle cx="32" cy="32" r="6" fill="#ff3d00"/></svg>`,
  pyro_molten: `<svg viewBox="0 0 64 64" class="custom-icon" fill="none"><circle cx="32" cy="32" r="28" fill="#180703" stroke="#ff5722" stroke-width="2"/><circle cx="24" cy="32" r="6" fill="#ff9100"/><circle cx="40" cy="32" r="6" fill="#ff9100"/><circle cx="32" cy="20" r="7" fill="#ffd600"/></svg>`,
  pyro_supernova: `<svg viewBox="0 0 64 64" class="custom-icon" fill="none"><circle cx="32" cy="32" r="28" fill="#200402" stroke="#ffd700" stroke-width="2.5"/><circle cx="32" cy="32" r="18" fill="#ff3d00"/><circle cx="32" cy="32" r="10" fill="#ffea00"/><circle cx="32" cy="32" r="5" fill="#ffffff"/></svg>`,

  cryo_plating: `<svg viewBox="0 0 64 64" class="custom-icon" fill="none"><circle cx="32" cy="32" r="28" fill="#04121a" stroke="#00e5ff" stroke-width="2"/><path d="M32 12 L46 20 L46 38 L32 50 L18 38 L18 20 Z" fill="#0288d1" stroke="#80d8ff" stroke-width="2"/></svg>`,
  cryo_barrier: `<svg viewBox="0 0 64 64" class="custom-icon" fill="none"><circle cx="32" cy="32" r="28" fill="#031622" stroke="#00b0ff" stroke-width="2"/><circle cx="32" cy="32" r="16" fill="#00e5ff" opacity="0.4" stroke="#ffffff" stroke-width="2"/></svg>`,
  cryo_juggernaut: `<svg viewBox="0 0 64 64" class="custom-icon" fill="none"><circle cx="32" cy="32" r="28" fill="#031826" stroke="#80d8ff" stroke-width="2.5"/><rect x="20" y="20" width="24" height="24" rx="4" fill="#0277bd" stroke="#ffffff" stroke-width="2"/></svg>`,
  cryo_pierce: `<svg viewBox="0 0 64 64" class="custom-icon" fill="none"><circle cx="32" cy="32" r="28" fill="#041420" stroke="#00e5ff" stroke-width="2"/><line x1="14" y1="50" x2="50" y2="14" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/><polygon points="50,14 40,16 48,24" fill="#00e5ff"/></svg>`,
  cryo_siphon: `<svg viewBox="0 0 64 64" class="custom-icon" fill="none"><circle cx="32" cy="32" r="28" fill="#031420" stroke="#40c4ff" stroke-width="2"/><path d="M22 32 A10 10 0 1 1 42 32" stroke="#00e5ff" stroke-width="3" fill="none"/><circle cx="32" cy="32" r="5" fill="#4caf50"/></svg>`,
  cryo_zero: `<svg viewBox="0 0 64 64" class="custom-icon" fill="none"><circle cx="32" cy="32" r="28" fill="#021c2a" stroke="#ffffff" stroke-width="2.5"/><polygon points="32,8 36,26 54,32 36,38 32,56 28,38 10,32 28,26" fill="#00e5ff" stroke="#ffffff" stroke-width="1.5"/></svg>`,

  lumi_focus: `<svg viewBox="0 0 64 64" class="custom-icon" fill="none"><circle cx="32" cy="32" r="28" fill="#181504" stroke="#ffd700" stroke-width="2"/><circle cx="32" cy="32" r="14" stroke="#fff59d" stroke-width="2.5"/><circle cx="32" cy="32" r="5" fill="#ffffff"/></svg>`,
  lumi_salvation: `<svg viewBox="0 0 64 64" class="custom-icon" fill="none"><circle cx="32" cy="32" r="28" fill="#1a1403" stroke="#ffd600" stroke-width="2"/><path d="M32 16 Q40 26 40 36 A8 8 0 0 1 24 36 Q24 26 32 16 Z" fill="#4caf50" stroke="#ffd700" stroke-width="1.5"/></svg>`,
  lumi_intervention: `<svg viewBox="0 0 64 64" class="custom-icon" fill="none"><circle cx="32" cy="32" r="28" fill="#1c1602" stroke="#ffd700" stroke-width="2.5"/><polygon points="32,10 37,24 52,24 40,34 44,48 32,40 20,48 24,34 12,24 27,24" fill="#ffffff" stroke="#ffd700" stroke-width="2"/></svg>`,
  lumi_wrath: `<svg viewBox="0 0 64 64" class="custom-icon" fill="none"><circle cx="32" cy="32" r="28" fill="#1a1202" stroke="#ff9800" stroke-width="2"/><line x1="32" y1="12" x2="32" y2="52" stroke="#ffd700" stroke-width="3"/><line x1="20" y1="24" x2="44" y2="24" stroke="#ffd700" stroke-width="3"/></svg>`,
  lumi_dawn: `<svg viewBox="0 0 64 64" class="custom-icon" fill="none"><circle cx="32" cy="32" r="28" fill="#1a1403" stroke="#ffd600" stroke-width="2"/><circle cx="32" cy="36" r="12" fill="#ffb300"/><line x1="32" y1="14" x2="32" y2="20" stroke="#ffffff" stroke-width="2.5"/></svg>`,
  lumi_sanctuary: `<svg viewBox="0 0 64 64" class="custom-icon" fill="none"><circle cx="32" cy="32" r="28" fill="#1e1602" stroke="#ffd700" stroke-width="2.5"/><rect x="18" y="24" width="28" height="24" rx="4" fill="#ffc107" stroke="#ffffff" stroke-width="2"/><circle cx="32" cy="18" r="5" fill="#ffffff"/></svg>`,

  chrono_anchor: `<svg viewBox="0 0 64 64" class="custom-icon" fill="none"><circle cx="32" cy="32" r="28" fill="#12041a" stroke="#bf5af2" stroke-width="2"/><circle cx="32" cy="20" r="5" stroke="#ea80fc" stroke-width="2"/><line x1="32" y1="25" x2="32" y2="48" stroke="#ffffff" stroke-width="2.5"/><path d="M22 40 Q32 50 42 40" stroke="#ea80fc" stroke-width="2.5" fill="none"/></svg>`,
  chrono_paradox: `<svg viewBox="0 0 64 64" class="custom-icon" fill="none"><circle cx="32" cy="32" r="28" fill="#160320" stroke="#d500f9" stroke-width="2"/><circle cx="26" cy="32" r="10" stroke="#ba68c8" stroke-width="2" fill="none"/><circle cx="38" cy="32" r="10" stroke="#00e5ff" stroke-width="2" fill="none"/></svg>`,
  chrono_rift: `<svg viewBox="0 0 64 64" class="custom-icon" fill="none"><circle cx="32" cy="32" r="28" fill="#180424" stroke="#e040fb" stroke-width="2.5"/><path d="M20 16 Q32 32 20 48 Q36 32 44 16 Q32 32 44 48" stroke="#00e5ff" stroke-width="2" fill="none"/></svg>`,
  chrono_entropy: `<svg viewBox="0 0 64 64" class="custom-icon" fill="none"><circle cx="32" cy="32" r="28" fill="#14021c" stroke="#aa00ff" stroke-width="2"/><circle cx="32" cy="32" r="14" stroke="#ea80fc" stroke-width="2" stroke-dasharray="3 3"/><circle cx="32" cy="32" r="6" fill="#00e5ff"/></svg>`,
  chrono_dilation: `<svg viewBox="0 0 64 64" class="custom-icon" fill="none"><circle cx="32" cy="32" r="28" fill="#160220" stroke="#ba68c8" stroke-width="2"/><circle cx="32" cy="32" r="20" stroke="#7b1fa2" stroke-width="2"/><circle cx="32" cy="32" r="10" fill="#e040fb" opacity="0.6"/></svg>`,
  chrono_singularity: `<svg viewBox="0 0 64 64" class="custom-icon" fill="none"><circle cx="32" cy="32" r="28" fill="#180226" stroke="#00e5ff" stroke-width="2.5"/><circle cx="32" cy="32" r="14" fill="#000000" stroke="#e040fb" stroke-width="3"/><circle cx="32" cy="32" r="4" fill="#ffffff"/></svg>`,

  // === 8 GRIMOIRE MASTERY UNLOCKABLES ===
  inferno_beam: `
    <svg viewBox="0 0 64 64" class="custom-icon" fill="none">
      <circle cx="32" cy="32" r="28" fill="#1a0402" stroke="#ff3d00" stroke-width="2.5"/>
      <line x1="8" y1="32" x2="56" y2="32" stroke="#ffea00" stroke-width="6" stroke-linecap="round"/>
      <line x1="8" y1="32" x2="56" y2="32" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="20" cy="32" r="8" fill="#ff5722" opacity="0.6"/>
      <circle cx="44" cy="32" r="8" fill="#ff5722" opacity="0.6"/>
    </svg>`,

  phoenix_ward: `
    <svg viewBox="0 0 64 64" class="custom-icon" fill="none">
      <circle cx="32" cy="32" r="28" fill="#200502" stroke="#ffd600" stroke-width="2"/>
      <path d="M32 14 C38 22 52 24 50 38 C42 34 38 40 32 50 C26 40 22 34 14 38 C12 24 26 22 32 14 Z" fill="#ff3d00" stroke="#ffea00" stroke-width="2"/>
      <circle cx="32" cy="28" r="4" fill="#ffffff"/>
    </svg>`,

  ice_barrier: `
    <svg viewBox="0 0 64 64" class="custom-icon" fill="none">
      <circle cx="32" cy="32" r="28" fill="#021422" stroke="#00e5ff" stroke-width="2.5"/>
      <polygon points="32,10 50,20 50,44 32,54 14,44 14,20" fill="#0277bd" stroke="#80d8ff" stroke-width="2.5"/>
      <polygon points="32,18 42,24 42,40 32,46 22,40 22,24" fill="#e0f7fa" opacity="0.8"/>
    </svg>`,

  permafrost_thorns: `
    <svg viewBox="0 0 64 64" class="custom-icon" fill="none">
      <circle cx="32" cy="32" r="28" fill="#031626" stroke="#40c4ff" stroke-width="2"/>
      <polygon points="32,8 36,24 46,14 38,28 54,32 38,36 46,50 36,40 32,56 28,40 18,50 26,36 10,32 26,28 18,14 28,24" fill="#00e5ff" stroke="#ffffff" stroke-width="1.5"/>
      <circle cx="32" cy="32" r="5" fill="#ffffff"/>
    </svg>`,

  solar_flare: `
    <svg viewBox="0 0 64 64" class="custom-icon" fill="none">
      <circle cx="32" cy="32" r="28" fill="#1c1602" stroke="#ffd700" stroke-width="2.5"/>
      <circle cx="32" cy="32" r="12" fill="#fff59d"/>
      <line x1="32" y1="8" x2="32" y2="18" stroke="#ffc107" stroke-width="4" stroke-linecap="round"/>
      <line x1="32" y1="46" x2="32" y2="56" stroke="#ffc107" stroke-width="4" stroke-linecap="round"/>
      <line x1="8" y1="32" x2="18" y2="32" stroke="#ffc107" stroke-width="4" stroke-linecap="round"/>
      <line x1="46" y1="32" x2="56" y2="32" stroke="#ffc107" stroke-width="4" stroke-linecap="round"/>
      <line x1="15" y1="15" x2="22" y2="22" stroke="#ffc107" stroke-width="3" stroke-linecap="round"/>
      <line x1="42" y1="42" x2="49" y2="49" stroke="#ffc107" stroke-width="3" stroke-linecap="round"/>
      <line x1="15" y1="49" x2="22" y2="42" stroke="#ffc107" stroke-width="3" stroke-linecap="round"/>
      <line x1="42" y1="22" x2="49" y2="15" stroke="#ffc107" stroke-width="3" stroke-linecap="round"/>
    </svg>`,

  resurrection_ward: `
    <svg viewBox="0 0 64 64" class="custom-icon" fill="none">
      <circle cx="32" cy="32" r="28" fill="#1e1804" stroke="#ffd700" stroke-width="2.5"/>
      <ellipse cx="32" cy="18" rx="14" ry="4" stroke="#ffea00" stroke-width="2" fill="none"/>
      <path d="M16 28 C16 46 28 50 32 50 C36 50 48 46 48 28 C40 32 36 28 32 34 C28 28 24 32 16 28 Z" fill="#ffb300" stroke="#ffffff" stroke-width="2"/>
      <circle cx="32" cy="24" r="4" fill="#ffffff"/>
    </svg>`,

  haste_rift: `
    <svg viewBox="0 0 64 64" class="custom-icon" fill="none">
      <circle cx="32" cy="32" r="28" fill="#14021e" stroke="#e040fb" stroke-width="2"/>
      <polygon points="12,32 30,16 30,26 48,12 36,36 44,36 20,52 26,38" fill="#00e5ff" stroke="#ffffff" stroke-width="1.5"/>
    </svg>`,

  paradox_blast: `
    <svg viewBox="0 0 64 64" class="custom-icon" fill="none">
      <circle cx="32" cy="32" r="28" fill="#100018" stroke="#aa00ff" stroke-width="2.5"/>
      <circle cx="32" cy="32" r="16" fill="#000000" stroke="#d500f9" stroke-width="2"/>
      <circle cx="32" cy="32" r="7" fill="#00e5ff"/>
      <path d="M18 18 Q32 32 46 18 Q32 32 46 46 Q32 32 18 46 Q32 32 18 18" stroke="#ba68c8" stroke-width="2" fill="none"/>
    </svg>`,

  // === CURRENCIES & COLLECTIBLES ===
  gold_coin: `
    <svg viewBox="0 0 64 64" class="custom-icon" fill="none">
      <defs>
        <radialGradient id="grad_coin_inner" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#fff8cc"/>
          <stop offset="50%" stop-color="#ffd700"/>
          <stop offset="90%" stop-color="#b8860b"/>
          <stop offset="100%" stop-color="#78540c"/>
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="28" fill="url(#grad_coin_inner)" stroke="#ffe57f" stroke-width="2.5"/>
      <circle cx="32" cy="32" r="22" stroke="#996515" stroke-width="1.5" stroke-dasharray="3 3" fill="none"/>
      <path d="M32 16 L38 24 L46 22 L40 30 L44 38 L34 36 L32 46 L30 36 L20 38 L24 30 L18 22 L26 24 Z" fill="#fff9d4" stroke="#b8860b" stroke-width="1"/>
      <circle cx="32" cy="31" r="3.5" fill="#ffffff"/>
    </svg>`,

  arcane_shard: `
    <svg viewBox="0 0 64 64" class="custom-icon" fill="none">
      <circle cx="32" cy="32" r="28" fill="#021422" stroke="#00e5ff" stroke-width="2"/>
      <polygon points="32,8 44,24 38,54 32,56 26,54 20,24" fill="#00b0ff" stroke="#ffffff" stroke-width="2"/>
      <polygon points="32,14 38,26 34,48 30,48 26,26" fill="#e0f7fa" opacity="0.85"/>
    </svg>`,

  crucible_core: `
    <svg viewBox="0 0 64 64" class="custom-icon" fill="none">
      <circle cx="32" cy="32" r="28" fill="#1c0602" stroke="#ff3d00" stroke-width="2.5"/>
      <circle cx="32" cy="32" r="16" fill="#ff9100"/>
      <circle cx="32" cy="32" r="9" fill="#ffff00"/>
      <circle cx="32" cy="32" r="4" fill="#ffffff"/>
      <path d="M20 20 Q32 10 44 20 Q54 32 44 44 Q32 54 20 44 Q10 32 20 20" stroke="#ff3d00" stroke-width="2.5" fill="none"/>
    </svg>`,

  astral_key: `
    <svg viewBox="0 0 64 64" class="custom-icon" fill="none">
      <circle cx="32" cy="32" r="28" fill="#120c24" stroke="#ffd700" stroke-width="2"/>
      <circle cx="24" cy="24" r="10" stroke="#ffd700" stroke-width="3" fill="none"/>
      <line x1="31" y1="31" x2="48" y2="48" stroke="#ffd700" stroke-width="4" stroke-linecap="round"/>
      <line x1="42" y1="42" x2="47" y2="37" stroke="#ffd700" stroke-width="3" stroke-linecap="round"/>
      <line x1="46" y1="46" x2="51" y2="41" stroke="#ffd700" stroke-width="3" stroke-linecap="round"/>
      <circle cx="24" cy="24" r="3" fill="#00e5ff"/>
    </svg>`,

  // === WEAPONS & EQUIPMENT SPECIFICS ===
  starter_wand: `
    <svg viewBox="0 0 64 64" class="custom-icon" fill="none">
      <circle cx="32" cy="32" r="28" fill="#120d08" stroke="#8d6e63" stroke-width="2"/>
      <line x1="16" y1="48" x2="42" y2="22" stroke="#bcaaa4" stroke-width="4" stroke-linecap="round"/>
      <circle cx="45" cy="19" r="6" fill="#00e5ff" stroke="#ffffff" stroke-width="1.5"/>
    </svg>`,

  pyre_staff: `
    <svg viewBox="0 0 64 64" class="custom-icon" fill="none">
      <circle cx="32" cy="32" r="28" fill="#1c0502" stroke="#ff3d00" stroke-width="2"/>
      <line x1="14" y1="50" x2="40" y2="24" stroke="#3e2723" stroke-width="4.5" stroke-linecap="round"/>
      <polygon points="44,14 52,22 46,28 38,20" fill="#ff9100" stroke="#ffd700" stroke-width="2"/>
      <circle cx="45" cy="21" r="5" fill="#ffffff"/>
    </svg>`,

  frost_scepter: `
    <svg viewBox="0 0 64 64" class="custom-icon" fill="none">
      <circle cx="32" cy="32" r="28" fill="#031422" stroke="#00e5ff" stroke-width="2"/>
      <line x1="16" y1="48" x2="42" y2="22" stroke="#0277bd" stroke-width="4" stroke-linecap="round"/>
      <polygon points="46,12 54,20 48,26 40,18" fill="#80d8ff" stroke="#ffffff" stroke-width="2"/>
      <circle cx="47" cy="19" r="3" fill="#ffffff"/>
    </svg>`,

  luminary_crozier: `
    <svg viewBox="0 0 64 64" class="custom-icon" fill="none">
      <circle cx="32" cy="32" r="28" fill="#1a1503" stroke="#ffd700" stroke-width="2"/>
      <line x1="16" y1="48" x2="40" y2="24" stroke="#ffd700" stroke-width="4" stroke-linecap="round"/>
      <circle cx="44" cy="20" r="8" stroke="#ffea00" stroke-width="3" fill="none"/>
      <circle cx="44" cy="20" r="3" fill="#ffffff"/>
    </svg>`,

  chrono_staff: `
    <svg viewBox="0 0 64 64" class="custom-icon" fill="none">
      <circle cx="32" cy="32" r="28" fill="#14031c" stroke="#bf5af2" stroke-width="2"/>
      <line x1="16" y1="48" x2="40" y2="24" stroke="#7b1fa2" stroke-width="4" stroke-linecap="round"/>
      <circle cx="44" cy="20" r="8" stroke="#e040fb" stroke-width="2" stroke-dasharray="3 3" fill="none"/>
      <circle cx="44" cy="20" r="4" fill="#00e5ff"/>
    </svg>`,

  apprentice_tome: `
    <svg viewBox="0 0 64 64" class="custom-icon" fill="none">
      <circle cx="32" cy="32" r="28" fill="#160e1c" stroke="#ba68c8" stroke-width="2"/>
      <rect x="20" y="18" width="24" height="28" rx="2" fill="#311b92" stroke="#ba68c8" stroke-width="2"/>
      <line x1="26" y1="18" x2="26" y2="46" stroke="#ffd700" stroke-width="2"/>
    </svg>`,

  glacial_aegis: `
    <svg viewBox="0 0 64 64" class="custom-icon" fill="none">
      <circle cx="32" cy="32" r="28" fill="#031624" stroke="#00e5ff" stroke-width="2"/>
      <polygon points="32,14 46,22 40,46 32,50 24,46 18,22" fill="#0288d1" stroke="#80d8ff" stroke-width="2"/>
    </svg>`,

  sun_relic: `
    <svg viewBox="0 0 64 64" class="custom-icon" fill="none">
      <circle cx="32" cy="32" r="28" fill="#1c1602" stroke="#ffd700" stroke-width="2"/>
      <circle cx="32" cy="32" r="12" fill="#ffc107" stroke="#ffffff" stroke-width="2"/>
      <circle cx="32" cy="32" r="5" fill="#ffffff"/>
    </svg>`,

  astral_hourglass: `
    <svg viewBox="0 0 64 64" class="custom-icon" fill="none">
      <circle cx="32" cy="32" r="28" fill="#14021c" stroke="#e040fb" stroke-width="2"/>
      <polygon points="22,18 42,18 32,32 42,46 22,46 32,32" fill="#6a1b9a" stroke="#ffd700" stroke-width="2"/>
      <circle cx="32" cy="32" r="3" fill="#00e5ff"/>
    </svg>`,

  archon_stolen_cipher: `
    <svg viewBox="0 0 64 64" class="custom-icon" fill="none">
      <circle cx="32" cy="32" r="28" fill="#180424" stroke="#ffd700" stroke-width="2"/>
      <rect x="20" y="16" width="24" height="32" rx="2" fill="#fff8e1" stroke="#8d6e63" stroke-width="2"/>
      <circle cx="32" cy="32" r="6" fill="#d32f2f" stroke="#ffd700" stroke-width="1.5"/>
    </svg>`,

  shadowstep_boots: `
    <svg viewBox="0 0 64 64" class="custom-icon" fill="none">
      <circle cx="32" cy="32" r="28" fill="#0d0d16" stroke="#42a5f5" stroke-width="2"/>
      <path d="M22 18 L34 18 L34 32 L46 36 L46 46 L18 46 L18 24 Z" fill="#212121" stroke="#90caf9" stroke-width="2"/>
    </svg>`,

  fire_cinder: `
    <svg viewBox="0 0 64 64" class="custom-icon" fill="none">
      <circle cx="32" cy="32" r="28" fill="#1e0602" stroke="#ff5722" stroke-width="2"/>
      <polygon points="32,16 40,28 36,44 28,44 24,28" fill="#ff7043" stroke="#ffea00" stroke-width="1.5"/>
    </svg>`,

  // === STAT & ATTRIBUTE ICONS ===
  stat_vigor: `<svg viewBox="0 0 64 64" class="custom-icon" fill="none"><circle cx="32" cy="32" r="28" fill="#1c070a" stroke="#e53935" stroke-width="2"/><path d="M32 18 C36 12 46 12 48 22 C50 34 32 46 32 48 C32 46 14 34 16 22 C18 12 28 12 32 18 Z" fill="#e53935"/></svg>`,
  stat_arcana: `<svg viewBox="0 0 64 64" class="custom-icon" fill="none"><circle cx="32" cy="32" r="28" fill="#18041c" stroke="#ba68c8" stroke-width="2"/><polygon points="32,12 37,25 50,27 40,36 43,49 32,42 21,49 24,36 14,27 27,25" fill="#ab47bc"/></svg>`,
  stat_intellect: `<svg viewBox="0 0 64 64" class="custom-icon" fill="none"><circle cx="32" cy="32" r="28" fill="#04121e" stroke="#2196f3" stroke-width="2"/><circle cx="32" cy="32" r="14" stroke="#64b5f6" stroke-width="2"/><circle cx="32" cy="32" r="6" fill="#2196f3"/></svg>`,
  stat_wisdom: `<svg viewBox="0 0 64 64" class="custom-icon" fill="none"><circle cx="32" cy="32" r="28" fill="#1a1503" stroke="#ffd700" stroke-width="2"/><circle cx="32" cy="32" r="16" stroke="#ffea00" stroke-width="2" stroke-dasharray="4 4"/><circle cx="32" cy="32" r="7" fill="#fff59d"/></svg>`,
  stat_haste: `<svg viewBox="0 0 64 64" class="custom-icon" fill="none"><circle cx="32" cy="32" r="28" fill="#02141c" stroke="#00e5ff" stroke-width="2"/><polygon points="34,14 18,34 30,34 26,50 46,26 34,26" fill="#00e5ff"/></svg>`,
  stat_resilience: `<svg viewBox="0 0 64 64" class="custom-icon" fill="none"><circle cx="32" cy="32" r="28" fill="#121812" stroke="#4caf50" stroke-width="2"/><path d="M32 14 L46 20 C46 36 38 46 32 50 C26 46 18 36 18 20 Z" fill="#388e3c"/></svg>`,
  stat_mastery: `<svg viewBox="0 0 64 64" class="custom-icon" fill="none"><circle cx="32" cy="32" r="28" fill="#1c1404" stroke="#ffd700" stroke-width="2"/><polygon points="32,10 38,24 52,26 42,36 44,50 32,42 20,50 22,36 12,26 26,24" fill="#ffd700"/></svg>`
};

export function getCustomIcon(iconKey) {
  return CUSTOM_ICONS[iconKey] || `<span style="font-size:1.4rem;">✨</span>`;
}
