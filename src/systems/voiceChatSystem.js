import * as THREE from 'three';
import { soundEngine } from '../engine/audio.js';

/**
 * Studio-Quality 3D Spatial Proximity Voice Chat System.
 * Features:
 * - Studio audio constraints: echo cancellation, noise suppression, 48kHz sampling.
 * - Modes: Open Mic (voice activity detection with smooth noise gate) and Push-to-Talk / Toggle [V].
 * - Configurable noise gate sensitivity threshold (default 14).
 * - Web Audio API spatial distance attenuation (full volume <4m, drops off to 25m).
 * - Real-time horizontal stereo panning based on listener camera orientation.
 * - RMS volume metering for active speech detection.
 * - 3D speech indicator hooks for player nameplates and HUD.
 */
export class VoiceChatSystem {
  constructor(network, scene, camera) {
    this.network = network;
    this.scene = scene;
    this.camera = camera;

    this.audioCtx = null;
    this.localStream = null;
    this.voiceMode = 'open_mic'; // 'open_mic' | 'push_to_talk'
    this.noiseGateThreshold = 14;
    this.isHardwareMuted = false;
    this.isGatedOpen = false;
    this.gateCloseTimer = 0;
    this.isInitialized = false;
    this.masterVoiceVolume = 1.0;

    // peerId -> { stream, source, gainNode, pannerNode, analyser, dataArray, isSpeaking }
    this.remotePeers = new Map();

    // Local analyser for speaking detection
    this.localAnalyser = null;
    this.localDataArray = null;
    this.isLocalSpeaking = false;

    // Callbacks for UI updates
    this.onLocalMuteChange = null;
    this.onLocalSpeakingChange = null;
    this.onPeerSpeakingChange = null;
  }

  async init() {
    if (this.isInitialized) return true;

    // Initialize Web Audio Context
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContextClass();
      if (this.audioCtx.state === 'suspended') {
        const resumeAudio = () => {
          this.audioCtx.resume();
          window.removeEventListener('click', resumeAudio);
          window.removeEventListener('keydown', resumeAudio);
        };
        window.addEventListener('click', resumeAudio);
        window.addEventListener('keydown', resumeAudio);
      }
    } catch (e) {
      console.warn('[VoiceChat] AudioContext initialization failed:', e);
      return false;
    }

    // Request studio-quality microphone access
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: { ideal: true },
          noiseSuppression: { ideal: true },
          autoGainControl: { ideal: true },
          sampleRate: { ideal: 48000 },
          channelCount: { ideal: 1 }
        },
        video: false
      });

      // Setup local speaking analyzer
      if (this.audioCtx) {
        const localSource = this.audioCtx.createMediaStreamSource(this.localStream);
        this.localAnalyser = this.audioCtx.createAnalyser();
        this.localAnalyser.fftSize = 256;
        localSource.connect(this.localAnalyser);
        this.localDataArray = new Uint8Array(this.localAnalyser.frequencyBinCount);
      }

      this.isInitialized = true;
      console.log(`[VoiceChat] Microphone captured with studio noise suppression (Mode: ${this.voiceMode}).`);

      // Setup PeerJS call receiver
      if (this.network && this.network.peer) {
        this.setupPeerVoiceCalls();
        for (const peerId of this.network.voicePeerIds || []) {
          this.callPeer(peerId);
        }
      }

      return true;
    } catch (err) {
      console.warn('[VoiceChat] Microphone access not granted or unavailable:', err.message);
      return false;
    }
  }

  setupPeerVoiceCalls() {
    const peer = this.network.peer;
    if (!peer) return;

    // Answer incoming voice calls
    peer.on('call', (call) => {
      console.log(`[VoiceChat] Answering voice call from peer: ${call.peer}`);
      call.answer(this.localStream);
      call.on('stream', (remoteStream) => {
        this.registerRemoteStream(call.peer, remoteStream);
      });
      call.on('close', () => {
        this.unregisterRemoteStream(call.peer);
      });
      call.on('error', (err) => {
        console.warn(`[VoiceChat] Call error with ${call.peer}:`, err);
      });
    });
  }

  callPeer(remotePeerId) {
    if (!this.localStream || !this.network?.peer) return;
    console.log(`[VoiceChat] Dialing voice call to peer: ${remotePeerId}`);
    try {
      const call = this.network.peer.call(remotePeerId, this.localStream);
      call.on('stream', (remoteStream) => {
        this.registerRemoteStream(remotePeerId, remoteStream);
      });
      call.on('close', () => {
        this.unregisterRemoteStream(remotePeerId);
      });
      call.on('error', (err) => {
        console.warn(`[VoiceChat] Outgoing call error with ${remotePeerId}:`, err);
      });
    } catch (e) {
      console.warn('[VoiceChat] Failed to call peer:', e);
    }
  }

  registerRemoteStream(peerId, stream) {
    if (!this.audioCtx || this.remotePeers.has(peerId)) return;

    try {
      const source = this.audioCtx.createMediaStreamSource(stream);

      // Distance Gain Node
      const gainNode = this.audioCtx.createGain();
      gainNode.gain.value = 1.0;

      // Stereo Panner Node for horizontal 3D soundstage
      let pannerNode = null;
      if (this.audioCtx.createStereoPanner) {
        pannerNode = this.audioCtx.createStereoPanner();
        pannerNode.pan.value = 0;
      }

      // Analyser for active speech detection
      const analyser = this.audioCtx.createAnalyser();
      analyser.fftSize = 256;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      // Connect pipeline
      source.connect(analyser);
      if (pannerNode) {
        source.connect(gainNode);
        gainNode.connect(pannerNode);
        pannerNode.connect(this.audioCtx.destination);
      } else {
        source.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);
      }

      this.remotePeers.set(peerId, {
        stream,
        source,
        gainNode,
        pannerNode,
        analyser,
        dataArray,
        isSpeaking: false
      });

      console.log(`[VoiceChat] 3D spatial voice pipeline active for peer: ${peerId}`);
    } catch (e) {
      console.warn(`[VoiceChat] Error registering remote audio stream for ${peerId}:`, e);
    }
  }

  unregisterRemoteStream(peerId) {
    const peerData = this.remotePeers.get(peerId);
    if (peerData) {
      try {
        peerData.gainNode.disconnect();
        if (peerData.pannerNode) peerData.pannerNode.disconnect();
        peerData.source.disconnect();
      } catch (e) {}
      this.remotePeers.delete(peerId);
      console.log(`[VoiceChat] Removed voice stream for peer: ${peerId}`);
    }
  }

  setVoiceMode(mode) {
    if (mode === 'open_mic' || mode === 'push_to_talk') {
      this.voiceMode = mode;
      console.log(`[VoiceChat] Voice mode set to: ${mode}`);
      if (this.onLocalMuteChange) {
        this.onLocalMuteChange(this.isHardwareMuted, this.voiceMode, this.isLocalSpeaking);
      }
    }
  }

  setNoiseGateThreshold(threshold) {
    this.noiseGateThreshold = Math.max(0, Math.min(80, threshold));
  }

  toggleMute() {
    if (!this.localStream) {
      this.init();
      return;
    }
    this.isHardwareMuted = !this.isHardwareMuted;

    // Apply immediate mute state to audio tracks
    if (this.isHardwareMuted) {
      this.localStream.getAudioTracks().forEach(track => { track.enabled = false; });
      this.isGatedOpen = false;
      this.isLocalSpeaking = false;
    } else {
      if (this.voiceMode === 'push_to_talk') {
        this.localStream.getAudioTracks().forEach(track => { track.enabled = true; });
      }
    }

    soundEngine.playMenuOpen();
    if (this.onLocalMuteChange) {
      this.onLocalMuteChange(this.isHardwareMuted, this.voiceMode, this.isLocalSpeaking);
    }
    return this.isHardwareMuted;
  }

  get isMuted() {
    return this.isHardwareMuted;
  }

  setMasterVoiceVolume(val) {
    this.masterVoiceVolume = Math.max(0, Math.min(1.5, val));
  }

  /**
   * Updates 3D spatial attenuation, open mic noise gate, and stereo panning every frame
   */
  update(localPlayerPos, remotePlayersMap) {
    if (!this.audioCtx || !localPlayerPos || !this.camera) return;

    // 1. Process Local Microphone (Open Mic Noise Gate & Speaking Detection)
    if (this.localAnalyser && this.localDataArray && !this.isHardwareMuted) {
      this.localAnalyser.getByteFrequencyData(this.localDataArray);
      let sum = 0;
      for (let i = 0; i < this.localDataArray.length; i++) sum += this.localDataArray[i];
      const avg = sum / this.localDataArray.length;

      const isAboveThreshold = avg > this.noiseGateThreshold;

      if (this.voiceMode === 'open_mic') {
        if (isAboveThreshold) {
          this.gateCloseTimer = 0.28; // Hold gate open for 280ms to prevent clipping word endings
          this.isGatedOpen = true;
        } else if (this.gateCloseTimer > 0) {
          this.gateCloseTimer -= 0.016;
          this.isGatedOpen = true;
        } else {
          this.isGatedOpen = false;
        }

        // Gate tracks smoothly
        if (this.localStream) {
          this.localStream.getAudioTracks().forEach(track => {
            if (track.enabled !== this.isGatedOpen) {
              track.enabled = this.isGatedOpen;
            }
          });
        }
        this.isLocalSpeaking = this.isGatedOpen;
      } else {
        // Push to Talk / Toggle mode: tracks stay on unless hardware muted
        this.isLocalSpeaking = isAboveThreshold;
      }
    } else {
      this.isLocalSpeaking = false;
      this.isGatedOpen = false;
    }

    if (this.onLocalSpeakingChange) {
      this.onLocalSpeakingChange(this.isLocalSpeaking);
    }

    // Get camera forward heading in XZ plane
    const camDir = new THREE.Vector3();
    this.camera.getWorldDirection(camDir);
    const camAngle = Math.atan2(camDir.x, camDir.z);

    // 2. Update remote peers 3D positions
    for (const [peerId, peerData] of this.remotePeers.entries()) {
      const playerEntity = remotePlayersMap.get(peerId) || [...remotePlayersMap.values()].find(player => player.peerId === peerId);
      if (!playerEntity || !playerEntity.position) {
        peerData.gainNode.gain.value = 0;
        continue;
      }

      const rPos = playerEntity.position;
      const dx = rPos.x - localPlayerPos.x;
      const dz = rPos.z - localPlayerPos.z;
      const dist = Math.hypot(dx, dz);

      // Distance attenuation:
      // 0m - 3.5m: 100% volume
      // 3.5m - 24.0m: smooth quadratic dropoff
      // >24.0m: silent
      const minDistance = 3.5;
      const maxDistance = 24.0;
      let targetGain = 0;

      if (dist <= minDistance) {
        targetGain = 1.0;
      } else if (dist < maxDistance) {
        const t = 1.0 - (dist - minDistance) / (maxDistance - minDistance);
        targetGain = Math.pow(t, 1.8);
      } else {
        targetGain = 0;
      }

      peerData.gainNode.gain.value = targetGain * this.masterVoiceVolume;

      // Stereo panning relative to camera azimuth
      if (peerData.pannerNode && dist > 0.5) {
        const soundAngle = Math.atan2(dx, dz);
        let relAngle = soundAngle - camAngle;
        while (relAngle > Math.PI) relAngle -= Math.PI * 2;
        while (relAngle < -Math.PI) relAngle += Math.PI * 2;

        // Panning: sin(relAngle) gives -1 (left) to +1 (right)
        const panValue = Math.max(-1, Math.min(1, Math.sin(relAngle)));
        peerData.pannerNode.pan.value = panValue;
      }

      // Check remote speaking volume
      peerData.analyser.getByteFrequencyData(peerData.dataArray);
      let sum = 0;
      for (let i = 0; i < peerData.dataArray.length; i++) sum += peerData.dataArray[i];
      const avg = sum / peerData.dataArray.length;
      const wasSpeaking = peerData.isSpeaking;
      peerData.isSpeaking = avg > 14 && targetGain > 0.05;

      if (wasSpeaking !== peerData.isSpeaking && this.onPeerSpeakingChange) {
        this.onPeerSpeakingChange(peerId, peerData.isSpeaking);
      }
    }
  }

  destroy() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop());
    }
    for (const peerId of this.remotePeers.keys()) {
      this.unregisterRemoteStream(peerId);
    }
    if (this.audioCtx) {
      this.audioCtx.close().catch(() => {});
    }
  }
}
