import * as THREE from 'three';

/**
 * Streamlined Story Questline and Waypoint Navigation System
 */
export const QUEST_ACTS = [
  {
    act: 1,
    title: 'Act I: The Archives of the Scribes',
    steps: [
      {
        id: 'q1_1',
        title: 'The Scribe\'s Awakening',
        desc: 'Approach and inspect the Grand Lectern at the center of the archives.',
        target: { x: 0, z: 0 },
        radius: 3.5,
        type: 'inspect'
      },
      {
        id: 'q1_2',
        title: 'The Riddle of the Runes',
        desc: 'Solve the Scribe\'s Riddle Monolith with your covenant.',
        target: { x: 0, z: 0 },
        radius: 3.5,
        type: 'quiz'
      },
      {
        id: 'q1_3',
        title: 'Prisms of Illumination',
        desc: 'Rotate the 3 Light Prisms [F] until their beams align with the door seal.',
        target: { x: 0, z: -10 },
        radius: 6.0,
        type: 'puzzle'
      },
      {
        id: 'q1_4',
        title: 'Ascension to the Forge',
        desc: 'Vanquish the sentinels and step onto the Northern Elevator Gate.',
        target: { x: 0, z: -19.5 },
        radius: 3.0,
        type: 'portal'
      }
    ]
  },
  {
    act: 2,
    title: 'Act II: The Alchemical Forge',
    steps: [
      {
        id: 'q2_1',
        title: 'The Alchemist\'s Formula',
        desc: 'Inspect the formula pedestal to reveal the elemental harmony sequence.',
        target: { x: 0, z: 4 },
        radius: 3.5,
        type: 'quiz'
      },
      {
        id: 'q2_2',
        title: 'Tri-Elemental Infusion',
        desc: 'Cast Fire, Frost, and Lightning spells into the 3 cauldrons in order.',
        target: { x: 0, z: -6 },
        radius: 8.0,
        type: 'puzzle'
      },
      {
        id: 'q2_3',
        title: 'Brimstone Reckoning',
        desc: 'Defeat the Spire Golems and proceed through the elevator portal.',
        target: { x: 0, z: -21 },
        radius: 3.0,
        type: 'portal'
      }
    ]
  },
  {
    act: 3,
    title: 'Act III: The Astral Pinnacle',
    steps: [
      {
        id: 'q3_1',
        title: 'Disrupt the Temporal Grid',
        desc: 'Channel all 4 Astral Keystones [F] to shatter Valerius\'s temporal shield.',
        target: { x: 0, z: 0 },
        radius: 18.0,
        type: 'keystones'
      },
      {
        id: 'q3_2',
        title: 'The Final Showdown',
        desc: 'Strike down Archon Valerius, The Fractured Chronomancer!',
        target: { x: 0, z: -15 },
        radius: 12.0,
        type: 'boss'
      },
      {
        id: 'q3_3',
        title: 'Escape into the Astral Dawn',
        desc: 'Step into the Freedom Portal and escape the Spire forever!',
        target: { x: 0, z: -18 },
        radius: 3.5,
        type: 'victory'
      }
    ]
  }
];

export class QuestManager {
  constructor(scene) {
    this.scene = scene;
    this.currentActIndex = 0;
    this.currentStepIndex = 0;

    // 3D In-world Waypoint Beacon
    this.waypointMesh = this.createWaypointBeacon();
    this.scene.add(this.waypointMesh);
  }

  createWaypointBeacon() {
    const group = new THREE.Group();
    group.name = 'QuestWaypointBeacon';

    // Vertical Light Column
    const beamGeo = new THREE.CylinderGeometry(0.15, 0.4, 20, 12, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xffea00,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = 10;
    group.add(beam);

    // Floating Diamond Marker
    const diamondGeo = new THREE.OctahedronGeometry(0.45, 0);
    const diamondMat = new THREE.MeshBasicMaterial({ color: 0xffea00 });
    const diamond = new THREE.Mesh(diamondGeo, diamondMat);
    diamond.position.y = 2.5;
    group.add(diamond);

    // Ground Ring
    const ringGeo = new THREE.RingGeometry(1.2, 1.4, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffea00,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.05;
    group.add(ring);

    group.userData = { beam, diamond, ring };
    return group;
  }

  getCurrentQuest() {
    const act = QUEST_ACTS[this.currentActIndex];
    if (!act) return null;
    const step = act.steps[this.currentStepIndex];
    return {
      actTitle: act.title,
      actNumber: act.act,
      stepTitle: step.title,
      stepDesc: step.desc,
      target: step.target,
      type: step.type,
      stepNumber: this.currentStepIndex + 1,
      totalSteps: act.steps.length
    };
  }

  advanceStep() {
    const act = QUEST_ACTS[this.currentActIndex];
    if (!act) return;

    if (this.currentStepIndex < act.steps.length - 1) {
      this.currentStepIndex++;
    } else if (this.currentActIndex < QUEST_ACTS.length - 1) {
      this.currentActIndex++;
      this.currentStepIndex = 0;
    }
  }

  setAct(actNumber) {
    this.currentActIndex = Math.max(0, Math.min(QUEST_ACTS.length - 1, actNumber - 1));
    this.currentStepIndex = 0;
  }

  update(playerPos, deltaTime) {
    const quest = this.getCurrentQuest();
    if (!quest) {
      this.waypointMesh.visible = false;
      return { distance: 0, quest: null };
    }

    this.waypointMesh.visible = true;
    this.waypointMesh.position.set(quest.target.x, 0, quest.target.z);

    // Animate beacon
    const { diamond, ring } = this.waypointMesh.userData;
    if (diamond) {
      diamond.rotation.y += deltaTime * 2.5;
      diamond.position.y = 2.5 + Math.sin(performance.now() * 0.004) * 0.2;
    }
    if (ring) {
      ring.rotation.z += deltaTime * 1.5;
    }

    // Distance calculation
    const dx = playerPos.x - quest.target.x;
    const dz = playerPos.z - quest.target.z;
    const dist = Math.round(Math.sqrt(dx * dx + dz * dz));

    return {
      distance: dist,
      quest
    };
  }
}
