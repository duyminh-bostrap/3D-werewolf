import { canSeeWolfOutline } from '../game/wolfOutline';
import { introTourAngle, INTRO_TOUR_SECONDS } from '../game/introTour';
import { newlyDeadPlayers } from '../game/deathNotifications';
import { advanceTrialVisual, type TrialVisual } from '../game/trialVisual';
import { followCameraPose } from '../game/followCamera';
import { CameraDrag } from '../game/cameraDrag';
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  canPlayerMoveInPhase,
  getSeatTransform,
  isWolfPackRole,
  resolveCameraCollision,
  resolvePlayerMovement,
  stepFireballPhysics,
  type FireballState,
  type GamePhase,
  type PlayerState,
} from '../game/rules';
import {
  buildGothicVillageEnvironment,
  createCharacterAvatar,
  createKickableFireball,
  createPlayerLabelSprite,
} from './proceduralAssets';
import { soundEngine } from '../audio/soundEngine';
import type { MobileMovementInput } from '../components/MobileMovementPad';

export type LightingStageMode = 'auto' | 'dusk' | 'night' | 'day';

export type CameraPreset = 'follow' | 'first' | 'overview' | 'bonfire';

export interface GothicVillageSceneProps {
  isTitleScreen: boolean;
  isIntroPlaying: boolean;
  onIntroComplete: () => void;
  phase: GamePhase;
  players: PlayerState[];
  localPlayerId: string;
  selectedTargetId: string | null;
  dayVotes: Record<string, string>;
  accusedPlayerId: string | null;
  cameraPreset: CameraPreset;
  lightingOverride?: LightingStageMode;
  isWerewolfNightVision: boolean;
  mobileInputRef?: React.MutableRefObject<MobileMovementInput>;
  onSelectPlayer: (playerId: string) => void;
  onLocalMove: (x: number, z: number, rotY: number) => void;
  onKickFireball?: (state: FireballState) => void;
}

// Pre-allocated scratch math helpers at module scope (Zero GC in render loop)
const _camTargetPos = new THREE.Vector3();
const _camLookAt = new THREE.Vector3();
const _currentLookAt = new THREE.Vector3(0, 2.2, 0);
const _dummyObj = new THREE.Object3D();
const _skyColorTarget = new THREE.Color();
const _skyColorCurrent = new THREE.Color(0x281c3d);
const _hemiSkyTarget = new THREE.Color();
const _hemiGroundTarget = new THREE.Color();
const _keyColorTarget = new THREE.Color();

function disposePlayerLabel(label: THREE.Sprite) {
  label.traverse((object) => {
    if (object instanceof THREE.Sprite) {
      object.material.map?.dispose();
      object.material.dispose();
    }
  });
}

export const GothicVillageScene: React.FC<GothicVillageSceneProps> = ({
  isTitleScreen,
  isIntroPlaying,
  onIntroComplete,
  phase,
  players,
  localPlayerId,
  selectedTargetId,
  dayVotes,
  accusedPlayerId,
  cameraPreset,
  lightingOverride = 'auto',
  isWerewolfNightVision,
  mobileInputRef,
  onSelectPlayer,
  onLocalMove,
  onKickFireball,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Store latest props in ref so React HUD updates never tear down WebGL canvas
  const latestPropsRef = useRef({
    isTitleScreen,
    isIntroPlaying,
    onIntroComplete,
    phase,
    players,
    localPlayerId,
    selectedTargetId,
    dayVotes,
    accusedPlayerId,
    cameraPreset,
    lightingOverride,
    isWerewolfNightVision,
    mobileInputRef,
    onSelectPlayer,
    onLocalMove,
    onKickFireball,
  });

  useEffect(() => {
    latestPropsRef.current = {
      isTitleScreen,
      isIntroPlaying,
      onIntroComplete,
      phase,
      players,
      localPlayerId,
      selectedTargetId,
      dayVotes,
      accusedPlayerId,
      cameraPreset,
      lightingOverride,
      isWerewolfNightVision,
      mobileInputRef,
      onSelectPlayer,
      onLocalMove,
      onKickFireball,
    };
  }, [
    isTitleScreen,
    isIntroPlaying,
    onIntroComplete,
    phase,
    players,
    localPlayerId,
    selectedTargetId,
    dayVotes,
    accusedPlayerId,
    cameraPreset,
    lightingOverride,
    isWerewolfNightVision,
    mobileInputRef,
    onSelectPlayer,
    onLocalMove,
    onKickFireball,
  ]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Software WebGL detection per Three.js skill directive
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.dataset.testid = 'gothic-village-canvas';

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c0914);
    scene.fog = new THREE.FogExp2(0x0c0914, 0.022);

    const computePanoramicFov = (aspect: number) => {
      if (aspect < 1) {
        // Portrait mobile / tablet: widen vertical FOV so horizontal FOV covers the entire village square
        return THREE.MathUtils.clamp(60 / Math.pow(aspect, 0.44), 62, 84);
      }
      return 62;
    };

    const camera = new THREE.PerspectiveCamera(
      computePanoramicFov(width / height),
      width / height,
      0.2,
      140
    );
    camera.position.set(0, 7.2, 21.5);
    camera.lookAt(0, 2.0, -3.5);
    scene.add(camera);
    const pointingHand = new THREE.Group();
    const gloveMaterial = new THREE.MeshBasicMaterial({ color: 0x8d6650, depthTest: false, depthWrite: false });
    const palm = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), gloveMaterial);
    palm.scale.set(0.8, 0.6, 1.15);
    pointingHand.add(palm);
    const indexFinger = new THREE.Mesh(new THREE.CapsuleGeometry(0.023, 0.19, 4, 8), gloveMaterial);
    indexFinger.rotation.x = Math.PI / 2;
    indexFinger.position.set(-0.045, 0.025, -0.16);
    pointingHand.add(indexFinger);
    for (let i = 0; i < 3; i++) {
      const finger = new THREE.Mesh(new THREE.SphereGeometry(0.029, 8, 6), gloveMaterial);
      finger.position.set(-0.005 + i * 0.032, -0.015, -0.075);
      pointingHand.add(finger);
    }
    const sleeveMaterial = new THREE.MeshBasicMaterial({ color: 0x281822, depthTest: false, depthWrite: false });
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.10, 0.5, 10), sleeveMaterial);
    sleeve.rotation.x = Math.PI / 2;
    sleeve.position.z = 0.28;
    pointingHand.add(sleeve);
    pointingHand.traverse((object) => { object.renderOrder = 100; });
    pointingHand.visible = false;
    camera.add(pointingHand);
    let pointBlend = 0;


    // 2. Mandatory Studio Environment Reflection (RoomEnvironment + PMREMGenerator)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 3. Balanced Studio & Gothic Atmosphere Rig (Warm Key + Cool Hemisphere Fill + Blood Moon)
    const hemiLight = new THREE.HemisphereLight(0x4f5d95, 0x1f1619, 0.85);
    hemiLight.position.set(0, 40, 0);
    scene.add(hemiLight);

    const keyDirLight = new THREE.DirectionalLight(0xffd6a5, 1.35);
    keyDirLight.position.set(18, 28, 16);
    keyDirLight.castShadow = !isSoftwareGl;
    keyDirLight.shadow.mapSize.set(1024, 1024);
    const d = 24;
    keyDirLight.shadow.camera.left = -d;
    keyDirLight.shadow.camera.right = d;
    keyDirLight.shadow.camera.top = d;
    keyDirLight.shadow.camera.bottom = -d;
    keyDirLight.shadow.camera.near = 1;
    keyDirLight.shadow.camera.far = 75;
    keyDirLight.shadow.bias = -0.0005;
    keyDirLight.shadow.normalBias = 0.02;
    scene.add(keyDirLight);

    // Warm flickering central bonfire PointLight
    const bonfireLight = new THREE.PointLight(0xff6b1a, 4.5, 26, 1.6);
    bonfireLight.position.set(0, 2.4, 0);
    const plazaFillLight = new THREE.PointLight(0xb9d5ff, 0, 28, 1.4);
    plazaFillLight.position.set(0, 7, 0);
    scene.add(plazaFillLight);
    scene.add(bonfireLight);

    // Eerie Blood Moon Orb in the sky beside the Gothic Bell Tower spire (immune to fog)
    const moonMat = new THREE.MeshBasicMaterial({
      color: 0xdc2626,
      fog: false,
    });
    const moonMesh = new THREE.Mesh(new THREE.SphereGeometry(4.6, 24, 24), moonMat);
    moonMesh.position.set(-10.5, 18.5, -46);
    scene.add(moonMesh);

    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      fog: false,
    });
    const moonHalo = new THREE.Mesh(new THREE.RingGeometry(4.7, 6.8, 32), haloMat);
    moonHalo.position.set(-10.5, 18.5, -46.2);
    scene.add(moonHalo);

    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    const {
      obstacles,
      buildingMap,
      outerFlame,
      innerFlame,
      bellMesh,
      emberInstanced,
      lampGlowMat,
    } = buildGothicVillageEnvironment(scene, maxAnisotropy);

    const gallows = scene.getObjectByName('gallows');
    let trialVisual: TrialVisual | null = null;
    let previousLife: Map<string, boolean> | null = null;
    const deathQueue: string[] = [];
    let deathFocus: { playerId: string; startedAt: number } | null = null;

    // Interactive 3D Kickable Fireball ("Quả Cầu Lửa") in the Village Square
    const fireballRig = createKickableFireball(scene);
    let fireballState: FireballState = {
      x: -2.2,
      y: 0.52,
      z: 8.6,
      vx: 0,
      vy: 0,
      vz: 0,
      kickCount: 0,
      lastKickerName: '',
    };
    let lastKickSoundTime = 0;

    const onRemoteFireballKick = (ev: Event) => {
      const detail = (ev as CustomEvent<FireballState>).detail;
      if (detail && typeof detail.x === 'number') {
        fireballState = { ...detail };
      }
    };
    window.addEventListener('gothic-fireball-event', onRemoteFireballKick);

    // Player Avatar 3D Registry
    interface AvatarEntry {
      group: THREE.Group;
      signature: string;
      labelSignature: string;
      labelSprite: THREE.Sprite;
      hitbox: THREE.Mesh;
      targetX: number;
      targetZ: number;
      targetRotY: number;
    }

    const avatarMap = new Map<string, AvatarEntry>();
    const wolfOutlineMaterial = new THREE.MeshBasicMaterial({ color: 0xff3d55, side: THREE.BackSide, transparent: true, opacity: 0.75, depthWrite: false });
    const interactableHitboxes: THREE.Object3D[] = [fireballRig.hitbox];
    const playersRoot = new THREE.Group();
    scene.add(playersRoot);

    // 3D Social Interaction Projectiles (Heart, Stone Throw, Friend Aura)
    interface SocialEffect3D {
      mesh: THREE.Mesh;
      action: 'friend' | 'heart' | 'stone';
      startX: number;
      startZ: number;
      targetId: string;
      age: number;
      duration: number;
      hitApplied?: boolean;
    }
    const socialEffects: SocialEffect3D[] = [];
    const hitShakeMap = new Map<string, number>();

    const stoneGeo = new THREE.DodecahedronGeometry(0.24, 0);
    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x78716c,
      roughness: 0.85,
      metalness: 0.15,
    });
    const heartGeo = new THREE.OctahedronGeometry(0.26, 0);
    const heartMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });
    const friendRingGeo = new THREE.TorusGeometry(0.75, 0.05, 10, 28);
    const friendRingMat = new THREE.MeshBasicMaterial({ color: 0x34d399 });

    const onPlayerInteract3D = (ev: Event) => {
      const detail = (
        ev as CustomEvent<{
          senderId: string;
          targetId: string;
          action: 'friend' | 'heart' | 'stone';
        }>
      ).detail;
      if (!detail || !detail.targetId) return;

      const senderEntry = avatarMap.get(detail.senderId);
      const targetEntry = avatarMap.get(detail.targetId);
      const sx = senderEntry ? senderEntry.group.position.x : localX;
      const sz = senderEntry ? senderEntry.group.position.z : localZ;
      const tx = targetEntry ? targetEntry.group.position.x : 0;
      const tz = targetEntry ? targetEntry.group.position.z : 0;

      let mesh: THREE.Mesh;
      if (detail.action === 'stone') {
        mesh = new THREE.Mesh(stoneGeo, stoneMat);
      } else if (detail.action === 'heart') {
        mesh = new THREE.Mesh(heartGeo, heartMat);
      } else {
        mesh = new THREE.Mesh(friendRingGeo, friendRingMat);
        mesh.rotation.x = Math.PI / 2;
      }

      mesh.position.set(sx, 1.6, sz);
      scene.add(mesh);
      socialEffects.push({
        mesh,
        action: detail.action,
        startX: detail.action === 'friend' ? tx : sx,
        startZ: detail.action === 'friend' ? tz : sz,
        targetId: detail.targetId,
        age: 0,
        duration: detail.action === 'stone' ? 0.42 : 0.85,
      });
    };
    window.addEventListener('gothic-player-interact', onPlayerInteract3D);

    // Local Player Smooth Movement & Jump State
    const keysPressed = new Set<string>();
    let localPosInitialized = false;
    let localX = 0;
    let localZ = 8.6;
    let localY = 0;
    let localVelY = 0;
    let localRotY = Math.PI;
    let walkDistanceAccumulator = 0;
    let lastMoveEmitTime = 0;
    let orbitYawOffset = 0;
    let orbitPitchOffset = 0;
    const cameraDrag = new CameraDrag();

    const onKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') {
        return;
      }
      keysPressed.add(e.code);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysPressed.delete(e.code);
    };

    const clearHeldInputs = () => {
      keysPressed.clear();
      cameraDrag.clear();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearHeldInputs);

    // Raycasting for clicking on a 3D player avatar to inspect/target/vote
    const raycaster = new THREE.Raycaster();
    const pointerNDC = new THREE.Vector2();

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      cameraDrag.start(e.pointerId, e.clientX, e.clientY);
    };

    const onPointerMove = (e: PointerEvent) => {
      const delta = cameraDrag.move(e.pointerId, e.clientX, e.clientY);
      if (!delta) return;
      orbitYawOffset -= delta.dx * 0.0065;
      orbitPitchOffset = THREE.MathUtils.clamp(orbitPitchOffset + delta.dy * 0.012, -2.0, 3.6);
    };

    const onPointerUp = (e: PointerEvent) => {
      const tap = cameraDrag.end(e.pointerId, e.clientX, e.clientY);
      if (tap === null) return;
      if (!tap || latestPropsRef.current.isTitleScreen) return;

      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      pointerNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointerNDC, camera);
      const hits = raycaster.intersectObjects(interactableHitboxes, false);
      if (hits.length > 0) {
        const hitObj = hits[0].object;
        if (hitObj.userData.isFireball) {
          // Direct click/tap kick on the 3D Fireball!
          const dx = fireballState.x - localX;
          const dz = fireballState.z - localZ;
          const dist = Math.hypot(dx, dz) || 1;
          const dirX = dist < 9 ? dx / dist : -Math.sin(orbitYawOffset);
          const dirZ = dist < 9 ? dz / dist : -Math.cos(orbitYawOffset);
          const localPlayerObj = latestPropsRef.current.players.find(
            (p) => p.id === latestPropsRef.current.localPlayerId
          );
          fireballState = {
            ...fireballState,
            vx: dirX * 15.5 + (Math.random() - 0.5) * 2.2,
            vz: dirZ * 15.5 + (Math.random() - 0.5) * 2.2,
            vy: 6.4,
            kickCount: fireballState.kickCount + 1,
            lastKickerName: localPlayerObj?.name || 'Lữ Khách',
          };
          soundEngine.playFireballKick();
          latestPropsRef.current.onKickFireball?.(fireballState);
          return;
        }
        const pid = hitObj.userData.playerId;
        if (pid) {
          latestPropsRef.current.onSelectPlayer(pid);
        }
      }
    };

    const canvasEl = renderer.domElement;
    canvasEl.style.touchAction = 'none';
    canvasEl.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    const onPointerCancel = (e: PointerEvent) => {
      cameraDrag.end(e.pointerId, e.clientX, e.clientY);
    };
    window.addEventListener('pointercancel', onPointerCancel);

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      const aspect = w / h;
      camera.aspect = aspect;
      camera.fov = computePanoramicFov(aspect);
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Software WebGL frame pacing helper
    let frameId = 0;
    let isDisposed = false;
    function afterDraw(cb: () => void) {
      if (isDisposed) return;
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      gl.flush();
      if (!sync) {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const poll = () => {
        if (isDisposed) return;
        const state = gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const clock = new THREE.Clock();
    let introStart: number | null = null;
    let introFinished = false;

    function syncPlayerAvatars(
      currentPlayers: PlayerState[],
      localId: string,
      currentPhase: GamePhase,
      selectedId: string | null,
      votes: Record<string, string>,
      wolfVision: boolean,
      elapsed: number
    ) {
      const activeIds = new Set(currentPlayers.map((p) => p.id));

      // Remove departed players
      for (const [id, entry] of avatarMap.entries()) {
        if (!activeIds.has(id)) {
          disposePlayerLabel(entry.labelSprite);
          playersRoot.remove(entry.group);
          const hbIdx = interactableHitboxes.indexOf(entry.hitbox);
          if (hbIdx !== -1) interactableHitboxes.splice(hbIdx, 1);
          avatarMap.delete(id);
        }
      }

      // Compute vote tallies
      const voteCounts: Record<string, number> = {};
      for (const targetId of Object.values(votes)) {
        if (targetId && targetId !== 'skip') {
          voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
        }
      }

      const compactLabels = true;

      currentPlayers.forEach((p, idx) => {
        const isWolfBeast =
          p.isAlive &&
          isWolfPackRole(p.role) &&
          currentPhase === 'night' &&
          (p.id === localId || wolfVision);

        const sig = `${JSON.stringify(p.appearance)}_${isWolfBeast}_${p.isAlive}`;
        const vCount = voteCounts[p.id] || 0;
        const isSelected = selectedId === p.id;
        const labelSig = `${p.name}_${p.appearance.epithet}_${p.seatIndex}_${p.isAlive}_${p.isSpeaking}_${vCount}_${p.id === localId}_${isSelected}_${compactLabels ? 'c' : 'f'}_${p.isHost}`;

        let entry = avatarMap.get(p.id);
        if (!entry || entry.signature !== sig) {
          if (entry) {
            disposePlayerLabel(entry.labelSprite);
            playersRoot.remove(entry.group);
            const hbIdx = interactableHitboxes.indexOf(entry.hitbox);
            if (hbIdx !== -1) interactableHitboxes.splice(hbIdx, 1);
          }

          const newGroup = createCharacterAvatar(p.appearance, isWolfBeast, p.isAlive);
          const bodyMeshes: THREE.Mesh[] = [];
          newGroup.traverse((object) => {
            if (object instanceof THREE.Mesh && object.material instanceof THREE.MeshStandardMaterial && !object.parent?.name.includes('target')) bodyMeshes.push(object);
          });
          for (const mesh of bodyMeshes) {
            (mesh.material as THREE.MeshStandardMaterial).fog = false;
            const outline = new THREE.Mesh(mesh.geometry, wolfOutlineMaterial);
            outline.name = 'wolf_team_outline';
            outline.scale.setScalar(1.065);
            outline.visible = false;
            mesh.add(outline);
          }
          const labelSprite = createPlayerLabelSprite(
            p.name,
            p.appearance.epithet,
            p.seatIndex,
            p.isAlive,
            p.isSpeaking,
            vCount,
            p.id === localId,
            isSelected,
            compactLabels,
            p.isHost
          );
          newGroup.add(labelSprite);

          // Generous invisible proxy collision hitbox for effortless 3D character tap/click selection
          const hitbox = new THREE.Mesh(
            new THREE.CylinderGeometry(0.95, 0.95, 3.1, 10),
            new THREE.MeshBasicMaterial({ visible: false })
          );
          hitbox.position.y = 1.55;
          hitbox.userData.playerId = p.id;
          newGroup.add(hitbox);
          interactableHitboxes.push(hitbox);

          const startSeat = getSeatTransform(idx, currentPlayers.length, 8.2);
          const initX = p.x || startSeat.x;
          const initZ = p.z || startSeat.z;
          newGroup.position.set(initX, 0, initZ);
          newGroup.rotation.y = p.rotY || startSeat.rotY;

          playersRoot.add(newGroup);
          entry = {
            group: newGroup,
            signature: sig,
            labelSignature: labelSig,
            labelSprite,
            hitbox,
            targetX: initX,
            targetZ: initZ,
            targetRotY: p.rotY || startSeat.rotY,
          };
          avatarMap.set(p.id, entry);
        } else if (entry.labelSignature !== labelSig) {
          entry.group.remove(entry.labelSprite);
          disposePlayerLabel(entry.labelSprite);
          const updatedSprite = createPlayerLabelSprite(
            p.name,
            p.appearance.epithet,
            p.seatIndex,
            p.isAlive,
            p.isSpeaking,
            vCount,
            p.id === localId,
            isSelected,
            compactLabels,
            p.isHost
          );
          entry.group.add(updatedSprite);
          entry.labelSprite = updatedSprite;
          entry.labelSignature = labelSig;
        }

        // Update target coordinates: local player moves freely in lobby, and stands in ritual circle when playing
        if (p.id === localId) {
          if (!localPosInitialized) {
            localX = p.x ?? 0;
            localZ = p.z ?? 11.2;
            localRotY = p.rotY || Math.PI;
            localPosInitialized = true;
          }
          if (!canPlayerMoveInPhase(currentPhase)) {
            const seat = getSeatTransform(idx, currentPlayers.length, 8.2);
            localX = seat.x;
            localZ = seat.z;
            localRotY = seat.rotY;
          }
          entry.targetX = localX;
          entry.targetZ = localZ;
          entry.targetRotY = localRotY;
        } else if (p.isBot && currentPhase === 'lobby') {
          const baseSeat = getSeatTransform(idx, currentPlayers.length, 8.6);
          const strollOffset = Math.sin(elapsed * 0.55 + idx * 1.7) * 1.35;
          entry.targetX = baseSeat.x + Math.cos(idx) * strollOffset;
          entry.targetZ = baseSeat.z + Math.sin(idx) * strollOffset;
          entry.targetRotY = Math.atan2(-entry.targetX, -entry.targetZ);
        } else {
          // During active night/day ritual, other players stand clearly in the bonfire plaza circle
          const seat = getSeatTransform(idx, currentPlayers.length, 8.2);
          entry.targetX = currentPhase === 'lobby' ? p.x : seat.x;
          entry.targetZ = currentPhase === 'lobby' ? p.z : seat.z;
          entry.targetRotY = currentPhase === 'lobby' ? p.rotY : seat.rotY;
        }

        const showWolfOutline = canSeeWolfOutline(currentPhase, currentPlayers.find((player) => player.id === localId), p);
        entry.group.traverse((object) => {
          if (object.name === 'wolf_team_outline') object.visible = showWolfOutline;
        });
        const aura = entry.group.getObjectByName('avatar_aura_ring') as THREE.Mesh | undefined;
        if (aura) aura.visible = p.id === localId;

        const targetMarker = entry.group.getObjectByName('avatar_target_marker');
        if (targetMarker) {
          targetMarker.visible = isSelected;
          if (isSelected) {
            targetMarker.rotation.y = elapsed * 2.8;
            targetMarker.position.y = 3.32 + Math.sin(elapsed * 5.5) * 0.12;
          }
        }
      });
    }

    function tick() {
      if (isDisposed) return;
      const dt = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.getElapsedTime();
      const props = latestPropsRef.current;

      // 1. Update local player WASD / Arrow / Mobile Virtual Joystick movement, Jump & Camera Look
      const mobInput = props.mobileInputRef?.current;
      if (mobInput) {
        // Swipe deltas are accumulated by the Eye pad and consumed here, so the camera
        // keeps the new angle after release instead of snapping back to a locked view.
        if (mobInput.lookDeltaYaw !== 0) {
          orbitYawOffset -= mobInput.lookDeltaYaw;
          mobInput.lookDeltaYaw = 0;
        }
        if (mobInput.lookDeltaPitch !== 0) {
          orbitPitchOffset = THREE.MathUtils.clamp(
            orbitPitchOffset + mobInput.lookDeltaPitch,
            -2.0,
            3.6
          );
          mobInput.lookDeltaPitch = 0;
        }
      }

      let isMovingNow = false;

      if (!props.isTitleScreen && canPlayerMoveInPhase(props.phase)) {
        // Handle Jump Request (Spacebar or Mobile Jump Button)
        const wantJump = keysPressed.has('Space') || Boolean(mobInput?.jumpRequested);
        if (wantJump) {
          if (mobInput) mobInput.jumpRequested = false;
          if (localY <= 0.02) {
            localVelY = 8.4;
            soundEngine.playJump();
          }
        }

        // Update vertical parabolic jump physics
        if (localY > 0 || localVelY !== 0) {
          localY += localVelY * dt;
          localVelY -= 21.0 * dt;
          if (localY <= 0) {
            localY = 0;
            localVelY = 0;
            soundEngine.playFootstep();
          }
        }

        let moveX = mobInput ? mobInput.moveX : 0;
        let moveZ = mobInput ? mobInput.moveZ : 0;
        if (keysPressed.has('KeyW') || keysPressed.has('ArrowUp')) moveZ -= 1;
        if (keysPressed.has('KeyS') || keysPressed.has('ArrowDown')) moveZ += 1;
        if (keysPressed.has('KeyA') || keysPressed.has('ArrowLeft')) moveX -= 1;
        if (keysPressed.has('KeyD') || keysPressed.has('ArrowRight')) moveX += 1;

        const isSprinting = keysPressed.has('ShiftLeft') || keysPressed.has('ShiftRight');

        const rawMag = Math.hypot(moveX, moveZ);
        if (rawMag > 0.02) {
          const clampedMag = Math.min(1, rawMag);
          const normX = (moveX / rawMag) * clampedMag;
          const normZ = (moveZ / rawMag) * clampedMag;
          const moveSpeed = isSprinting ? 10.4 : 7.2;

          // Rotate movement vector by camera orbit yaw
          const cosY = Math.cos(orbitYawOffset);
          const sinY = Math.sin(orbitYawOffset);
          const worldDx = (normX * cosY + normZ * sinY) * moveSpeed * dt;
          const worldDz = (-normX * sinY + normZ * cosY) * moveSpeed * dt;

          const resolved = resolvePlayerMovement(
            localX,
            localZ,
            worldDx,
            worldDz,
            obstacles,
            0.65,
            21.5
          );
          const distMoved = Math.hypot(resolved.x - localX, resolved.z - localZ);
          localX = resolved.x;
          localZ = resolved.z;
          localRotY = Math.atan2(worldDx, worldDz);

          if (localY <= 0.05) {
            walkDistanceAccumulator += distMoved;
            if (walkDistanceAccumulator >= (isSprinting ? 1.65 : 2.1)) {
              walkDistanceAccumulator = 0;
              soundEngine.playFootstep();
            }
          }

          const now = performance.now();
          if (now - lastMoveEmitTime > 75) {
            lastMoveEmitTime = now;
            props.onLocalMove(localX, localZ, localRotY);
          }
        }
      } else {
        if (mobInput) {
          mobInput.jumpRequested = false;
          mobInput.moveX = 0;
          mobInput.moveZ = 0;
        }
        localY = 0;
        localVelY = 0;
      }

      if (!props.isTitleScreen && previousLife) {
        const deaths = newlyDeadPlayers(previousLife, props.players);
        deaths.sort((a, b) => Number(b.id === trialVisual?.playerId) - Number(a.id === trialVisual?.playerId));
        deathQueue.push(...deaths.map((p) => p.id));
      }
      previousLife = props.isTitleScreen ? null : new Map(props.players.map((p) => [p.id, p.isAlive]));
      if (deathFocus && elapsed - deathFocus.startedAt >= 3.5) deathFocus = null;
      if (!deathFocus && deathQueue.length) deathFocus = { playerId: deathQueue.shift()!, startedAt: elapsed };

      const previousAccused = trialVisual && props.players.find((p) => p.id === trialVisual!.playerId);
      trialVisual = advanceTrialVisual(trialVisual, props.phase, props.accusedPlayerId, previousAccused?.isAlive ?? true, elapsed);
      if (gallows) gallows.visible = !props.isTitleScreen && trialVisual !== null;

      // 2. Sync & interpolate 3D player avatars
      syncPlayerAvatars(
        props.players,
        props.localPlayerId,
        props.phase,
        props.selectedTargetId,
        props.dayVotes,
        props.isWerewolfNightVision,
        elapsed
      );

      if (trialVisual) {
        const accused = avatarMap.get(trialVisual.playerId);
        if (accused) {
          accused.targetX = 5.59;
          accused.targetZ = -4.81;
          if (trialVisual.playerId === props.localPlayerId) {
            localX = accused.targetX;
            localZ = accused.targetZ;
          }
        }
      }

      const dampFactor = 1 - Math.exp(-10 * dt);
      for (const [id, entry] of avatarMap.entries()) {
        const speakingMic = entry.labelSprite.getObjectByName('speaking_mic') as THREE.Sprite | undefined;
        if (speakingMic) speakingMic.material.opacity = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(elapsed * 9));
        const prevX = entry.group.position.x;
        const prevZ = entry.group.position.z;
        entry.group.position.x = THREE.MathUtils.lerp(prevX, entry.targetX, dampFactor);
        entry.group.position.z = THREE.MathUtils.lerp(prevZ, entry.targetZ, dampFactor);

        const isLocalAvatar = id === props.localPlayerId;
        const avatarJumpY = isLocalAvatar ? localY : 0;
        const executionAge = trialVisual?.playerId === id && trialVisual.executedAt !== null
          ? elapsed - trialVisual.executedAt : null;
        entry.group.position.y = executionAge === null ? avatarJumpY : 0.55 + Math.sin(executionAge * 6) * 0.08;
        entry.group.rotation.z = executionAge === null ? 0 : Math.sin(executionAge * 4) * 0.16;

        // Keep ground aura ring anchored to the cobblestones even when jumping
        const aura = entry.group.getObjectByName('avatar_aura_ring') as THREE.Mesh | undefined;
        if (aura) {
          aura.position.y = 0.03 - avatarJumpY;
        }

        // Smooth shortest-angle rotation
        let diffRot = entry.targetRotY - entry.group.rotation.y;
        while (diffRot > Math.PI) diffRot -= Math.PI * 2;
        while (diffRot < -Math.PI) diffRot += Math.PI * 2;
        entry.group.rotation.y += diffRot * dampFactor;

        // Gait-synced walk bob + articulated limb swing + mid-air jump pose
        const speed = Math.hypot(entry.targetX - prevX, entry.targetZ - prevZ) / Math.max(dt, 0.001);
        const strideBlend = Math.min(1, speed / 4.2);
        const walkPhase = elapsed * 10.5 + id.length * 1.3;
        const jumpBlend = Math.min(1, avatarJumpY / 0.45);

        const headObj = entry.group.getObjectByName('avatar_head');
        if (headObj) {
          headObj.position.y =
            1.95 +
            Math.sin(elapsed * 2.4 + id.length) * 0.022 +
            strideBlend * 0.055 * Math.abs(Math.sin(walkPhase)) * (1 - jumpBlend);
          headObj.rotation.z = Math.sin(walkPhase) * 0.035 * strideBlend * (1 - jumpBlend);
        }

        const leftLeg = entry.group.getObjectByName('avatar_left_leg');
        const rightLeg = entry.group.getObjectByName('avatar_right_leg');
        if (leftLeg && rightLeg) {
          if (jumpBlend > 0.05) {
            leftLeg.rotation.x = THREE.MathUtils.lerp(
              Math.sin(walkPhase) * 0.55 * strideBlend,
              -0.48,
              jumpBlend
            );
            rightLeg.rotation.x = THREE.MathUtils.lerp(
              -Math.sin(walkPhase) * 0.55 * strideBlend,
              0.42,
              jumpBlend
            );
          } else {
            leftLeg.rotation.x = Math.sin(walkPhase) * 0.55 * strideBlend;
            rightLeg.rotation.x = -Math.sin(walkPhase) * 0.55 * strideBlend;
          }
        }

        const leftArm = entry.group.getObjectByName('avatar_left_arm');
        const rightArm = entry.group.getObjectByName('avatar_right_arm');
        if (leftArm && rightArm) {
          if (jumpBlend > 0.05) {
            leftArm.rotation.x = THREE.MathUtils.lerp(
              -Math.sin(walkPhase) * 0.42 * strideBlend,
              -0.75,
              jumpBlend
            );
            rightArm.rotation.x = THREE.MathUtils.lerp(
              -0.22 + Math.sin(walkPhase) * 0.24 * strideBlend,
              -0.8,
              jumpBlend
            );
          } else {
            leftArm.rotation.x = -Math.sin(walkPhase) * 0.42 * strideBlend;
            rightArm.rotation.x = -0.22 + Math.sin(walkPhase) * 0.24 * strideBlend;
          }
        }

        const lanternObj = entry.group.getObjectByName('avatar_lantern');
        if (lanternObj) {
          lanternObj.rotation.z =
            Math.sin(elapsed * 3.2 + id.length) * 0.06 + Math.cos(walkPhase) * 0.14 * strideBlend;
        }
      }

      // 2B. Update Interactive 3D Kickable Fireball ("Quả Cầu Lửa") Physics & Spark Trail
      const playerColliders = Array.from(avatarMap.entries()).map(([id, entry]) => {
        const pInfo = props.players.find((pl) => pl.id === id);
        return {
          id,
          name: pInfo?.name || 'Dân Làng',
          x: entry.group.position.x,
          z: entry.group.position.z,
          y: entry.group.position.y,
        };
      });

      const fbStep = stepFireballPhysics(fireballState, playerColliders, obstacles, dt, 21.5);
      fireballState = fbStep.state;

      if (fbStep.kickedBy) {
        const nowMs = performance.now();
        if (nowMs - lastKickSoundTime > 160) {
          lastKickSoundTime = nowMs;
          soundEngine.playFireballKick();
        }
        if (fbStep.kickedBy.id === props.localPlayerId) {
          props.onKickFireball?.(fireballState);
        }
      }

      fireballRig.group.position.set(fireballState.x, fireballState.y, fireballState.z);
      const ballSpeed = Math.hypot(fireballState.vx, fireballState.vz);
      fireballRig.coreMesh.rotation.x += (1.8 + ballSpeed * 0.65) * dt;
      fireballRig.coreMesh.rotation.z += (1.4 + ballSpeed * 0.55) * dt;
      fireballRig.runeCage.rotation.y += (2.4 + ballSpeed * 0.85) * dt;
      fireballRig.runeCage.rotation.x -= (1.5 + ballSpeed * 0.5) * dt;
      fireballRig.outerAura.scale.setScalar(
        1.0 + Math.sin(elapsed * 14) * 0.08 + Math.min(0.28, ballSpeed * 0.02)
      );
      fireballRig.light.intensity =
        3.4 + Math.sin(elapsed * 16) * 0.45 + Math.min(2.4, ballSpeed * 0.16);
      // Keep ground ember scorch ring anchored to the cobblestones below the bouncing ball
      fireballRig.groundScorch.position.y = 0.028 - fireballState.y;
      const scorchScale = Math.max(0.45, 1.15 - (fireballState.y - 0.52) * 0.22);
      fireballRig.groundScorch.scale.setScalar(scorchScale);

      // Update 18 trailing fire sparks behind the fireball
      for (let i = 0; i < 18; i++) {
        const trailT = (elapsed * (2.2 + ballSpeed * 0.18) + i * 0.19) % 1;
        const sx =
          fireballState.x -
          fireballState.vx * trailT * 0.14 +
          Math.sin(elapsed * 6 + i * 1.7) * 0.26;
        const sy =
          Math.max(0.12, fireballState.y - trailT * 0.25) +
          trailT * (1.15 + Math.min(1.5, ballSpeed * 0.08));
        const sz =
          fireballState.z -
          fireballState.vz * trailT * 0.14 +
          Math.cos(elapsed * 6 + i * 1.7) * 0.26;
        const sparkScale = (1 - trailT) * (0.95 + Math.min(0.9, ballSpeed * 0.07));
        _dummyObj.position.set(sx, sy, sz);
        _dummyObj.rotation.set(elapsed * 4, i, elapsed * 2);
        _dummyObj.scale.setScalar(Math.max(0.02, sparkScale));
        _dummyObj.updateMatrix();
        fireballRig.sparkInstanced.setMatrixAt(i, _dummyObj.matrix);
      }
      fireballRig.sparkInstanced.instanceMatrix.needsUpdate = true;

      // 2C. Update 3D Social Projectiles (Heart, Stone Throw, Friend Ring) & Target Hit Recoil
      for (let i = socialEffects.length - 1; i >= 0; i--) {
        const fx = socialEffects[i];
        fx.age += dt;
        const p = Math.min(1, fx.age / fx.duration);
        const targetEntry = avatarMap.get(fx.targetId);
        const tx = targetEntry ? targetEntry.group.position.x : fx.startX;
        const tz = targetEntry ? targetEntry.group.position.z : fx.startZ;

        if (fx.action === 'stone') {
          const cx = THREE.MathUtils.lerp(fx.startX, tx, p);
          const cz = THREE.MathUtils.lerp(fx.startZ, tz, p);
          const cy = 1.45 + Math.sin(p * Math.PI) * 2.4;
          fx.mesh.position.set(cx, cy, cz);
          fx.mesh.rotation.x += 12 * dt;
          fx.mesh.rotation.z += 9 * dt;
          if (p >= 0.92 && !fx.hitApplied) {
            fx.hitApplied = true;
            hitShakeMap.set(fx.targetId, elapsed + 0.38);
          }
        } else if (fx.action === 'heart') {
          const flyP = Math.min(1, p * 1.4);
          const cx = THREE.MathUtils.lerp(fx.startX, tx, flyP);
          const cz = THREE.MathUtils.lerp(fx.startZ, tz, flyP);
          const cy = 1.6 + Math.sin(flyP * Math.PI) * 1.2 + Math.max(0, p - 0.5) * 2.2;
          fx.mesh.position.set(cx, cy, cz);
          fx.mesh.rotation.y += 5 * dt;
          fx.mesh.scale.setScalar(1 + Math.sin(p * Math.PI) * 0.45);
        } else {
          // Friend ring rising & expanding around target
          fx.mesh.position.set(tx, 0.3 + p * 2.4, tz);
          fx.mesh.scale.setScalar(0.8 + p * 0.9);
        }

        if (fx.age >= fx.duration) {
          scene.remove(fx.mesh);
          socialEffects.splice(i, 1);
        }
      }

      // Apply stone hit recoil shake to struck avatars
      for (const [pid, shakeUntil] of hitShakeMap.entries()) {
        const entry = avatarMap.get(pid);
        if (entry && elapsed < shakeUntil) {
          entry.group.position.x += Math.sin(elapsed * 55) * 0.14;
          entry.group.rotation.z = Math.sin(elapsed * 45) * 0.16;
        } else {
          if (entry) entry.group.rotation.z = 0;
          hitShakeMap.delete(pid);
        }
      }

      // 3. Determine Active Lighting Stage from Game Phase (or manual override)
      const effectiveStage: 'dusk' | 'night' | 'day' =
        props.lightingOverride && props.lightingOverride !== 'auto'
          ? props.lightingOverride
          : props.phase === 'night' || props.phase === 'role_reveal'
          ? 'night'
          : props.phase === 'day_announcement' ||
            props.phase === 'day_discussion' ||
            props.phase === 'day_voting' ||
            props.phase === 'day_trial' ||
            props.phase === 'hunter_revenge'
          ? 'day'
          : 'day';

      plazaFillLight.intensity = THREE.MathUtils.lerp(plazaFillLight.intensity, effectiveStage === 'night' ? 28 : 0, dampFactor);

      // Animate Central Bonfire, Cathedral Bell & Rising Ember Particles
      const flicker = 1 + Math.sin(elapsed * 9.5) * 0.12 + Math.cos(elapsed * 15.2) * 0.08;
      const flameScaleMult = effectiveStage === 'day' ? 0.55 : effectiveStage === 'night' ? 1.15 : 1.0;
      outerFlame.scale.set(
        (1 + Math.sin(elapsed * 7) * 0.08) * flameScaleMult,
        flicker * flameScaleMult,
        (1 + Math.cos(elapsed * 8) * 0.08) * flameScaleMult
      );
      innerFlame.scale.set(
        flameScaleMult,
        (0.95 + Math.cos(elapsed * 12) * 0.14) * flameScaleMult,
        flameScaleMult
      );

      if (bellMesh) {
        bellMesh.rotation.z = Math.sin(elapsed * 1.8) * 0.18;
      }

      for (let i = 0; i < 48; i++) {
        const t = (elapsed * 0.55 + i * 0.21) % 1;
        const angle = i * 1.37 + elapsed * 0.8;
        const r = (i < 28 ? 0.35 : 8.5) + t * (i < 28 ? 1.4 : 4.0);
        const ex = Math.cos(angle) * r;
        const ey = 0.4 + t * (i < 28 ? 7.5 : 5.0);
        const ez = Math.sin(angle) * r;
        const s =
          (1 - t) *
          (i < 28 ? 1.2 : 0.85) *
          (effectiveStage === 'day' ? 0.35 : 1.0);
        _dummyObj.position.set(ex, ey, ez);
        _dummyObj.rotation.set(elapsed * 2, i, 0);
        _dummyObj.scale.setScalar(Math.max(0.02, s));
        _dummyObj.updateMatrix();
        emberInstanced.setMatrixAt(i, _dummyObj.matrix);
      }
      emberInstanced.instanceMatrix.needsUpdate = true;

      // 4. Dynamic Stage-Accurate Lighting
      let targetFogDensity = 0.016;
      let targetExposure = 1.22;

      if (effectiveStage === 'night') {
        _skyColorTarget.setHex(props.isWerewolfNightVision ? 0x16050c : 0x040710);
        _keyColorTarget.setHex(props.isWerewolfNightVision ? 0xff5c69 : 0x9cbcff);
        _hemiSkyTarget.setHex(0x263557);
        _hemiGroundTarget.setHex(0x070b13);
        keyDirLight.intensity = THREE.MathUtils.lerp(keyDirLight.intensity, 0.65, dampFactor);
        hemiLight.intensity = THREE.MathUtils.lerp(hemiLight.intensity, 0.3, dampFactor);
        bonfireLight.color.setHex(0xff3b14);
        bonfireLight.intensity = 5.6 * flicker;
        lampGlowMat.emissiveIntensity = 3.2;
        moonMat.color.setHex(0xdc2626);
        haloMat.color.setHex(0xff1e27);
        haloMat.opacity = 0.45;
        moonMesh.position.y = THREE.MathUtils.lerp(moonMesh.position.y, 19.5, dampFactor);
        moonHalo.position.y = moonMesh.position.y;
        moonMesh.scale.setScalar(1.38);
        moonHalo.scale.setScalar(1.38);
        targetFogDensity = 0.038;
        targetExposure = 0.85;
      } else if (effectiveStage === 'day') {
        _skyColorTarget.setHex(0x408cbb);
        _keyColorTarget.setHex(0xfff0d2);
        _hemiSkyTarget.setHex(0xbedfff);
        _hemiGroundTarget.setHex(0x293d38);
        keyDirLight.intensity = THREE.MathUtils.lerp(keyDirLight.intensity, 3.2, dampFactor);
        hemiLight.intensity = THREE.MathUtils.lerp(hemiLight.intensity, 1.15, dampFactor);
        bonfireLight.color.setHex(0xff9933);
        bonfireLight.intensity = 1.15 * flicker;
        lampGlowMat.emissiveIntensity = 0.06;
        moonMat.color.setHex(0xfffbeb);
        haloMat.color.setHex(0xfef08a);
        haloMat.opacity = 0.62;
        moonMesh.position.y = THREE.MathUtils.lerp(moonMesh.position.y, 23.5, dampFactor);
        moonHalo.position.y = moonMesh.position.y;
        moonMesh.scale.setScalar(0.95);
        moonHalo.scale.setScalar(0.95);
        targetFogDensity = 0.006;
        targetExposure = 1.15;
      } else {
        // Manual dusk preset keeps warm highlights against cool shadows.
        _skyColorTarget.setHex(0x44385c);
        _keyColorTarget.setHex(0xffd29a);
        _hemiSkyTarget.setHex(0x707cb2);
        _hemiGroundTarget.setHex(0x3a2a35);
        keyDirLight.intensity = THREE.MathUtils.lerp(keyDirLight.intensity, 2.1, dampFactor);
        hemiLight.intensity = THREE.MathUtils.lerp(hemiLight.intensity, 0.95, dampFactor);
        bonfireLight.color.setHex(0xff6b1a);
        bonfireLight.intensity = 4.4 * flicker;
        lampGlowMat.emissiveIntensity = 2.1;
        moonMat.color.setHex(0xf59e0b);
        haloMat.color.setHex(0xfbbf24);
        haloMat.opacity = 0.36;
        moonMesh.position.y = THREE.MathUtils.lerp(moonMesh.position.y, 18.2, dampFactor);
        moonHalo.position.y = moonMesh.position.y;
        moonMesh.scale.setScalar(1.08);
        moonHalo.scale.setScalar(1.08);
        targetFogDensity = 0.015;
        targetExposure = 1.12;
      }

      const colorLerp = Math.min(1, dampFactor * 0.65);
      _skyColorCurrent.lerp(_skyColorTarget, colorLerp);
      keyDirLight.color.lerp(_keyColorTarget, colorLerp);
      hemiLight.color.lerp(_hemiSkyTarget, colorLerp);
      hemiLight.groundColor.lerp(_hemiGroundTarget, colorLerp);
      renderer.toneMappingExposure = THREE.MathUtils.lerp(
        renderer.toneMappingExposure,
        targetExposure,
        colorLerp
      );

      scene.background = _skyColorCurrent;
      if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.color.copy(_skyColorCurrent);
        scene.fog.density = THREE.MathUtils.lerp(scene.fog.density, targetFogDensity, colorLerp);
      }

      // 5. Panoramic Full-Circle Tactical Camera Choreography (frames all 5-15 players clearly for easy selection)
      let activeOccludedIndices: number[] = [];
      let camLambda = 1 - Math.exp(-8.5 * dt);

      // In first-person the local avatar must not block the head camera
      const localAvatarEntry = avatarMap.get(props.localPlayerId);
      if (localAvatarEntry) {
        localAvatarEntry.group.visible = props.cameraPreset !== 'first' || deathFocus?.playerId === props.localPlayerId;
      }

      if (props.isTitleScreen) {
        if (props.isIntroPlaying && introStart === null) introStart = elapsed;
        const introElapsed = introStart === null ? 0 : elapsed - introStart;
        const tourAngle = props.isIntroPlaying
          ? introTourAngle(introElapsed)
          : introFinished && introStart !== null
          ? 2 * Math.PI + Math.max(0, introElapsed - INTRO_TOUR_SECONDS) * 0.14
          : elapsed * 0.14;
        if (props.isIntroPlaying) {
          camLambda = 1;
          if (!introFinished && introElapsed >= INTRO_TOUR_SECONDS) {
            introFinished = true;
            props.onIntroComplete();
          }
        }
        _camTargetPos.set(
          Math.sin(tourAngle) * 19.5,
          7.4 + Math.sin(elapsed * 0.35) * 1.4,
          Math.cos(tourAngle) * 19.5 + 3.0
        );
        _camLookAt.set(0, 3.2, -7.0);
      } else if (props.cameraPreset === 'overview') {
        const radius = Math.max(24, 13 / Math.max(0.35, Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect));
        _camTargetPos.set(Math.sin(orbitYawOffset) * radius * 0.65, radius * 0.85, Math.cos(orbitYawOffset) * radius * 0.65);
        _camLookAt.set(0, 1, 0);
      } else if (props.cameraPreset === 'first') {
        // First-person head camera: sits at the local player's eyes and looks along the
        // orbit yaw/pitch that the mouse drag or the mobile "Eye" pad controls.
        const eyeHeight = 1.66 + localY;
        const pitch = THREE.MathUtils.clamp(orbitPitchOffset * 0.34, -0.95, 1.05);
        const cosPitch = Math.cos(pitch);
        const forwardX = -Math.sin(orbitYawOffset) * cosPitch;
        const forwardZ = -Math.cos(orbitYawOffset) * cosPitch;
        const forwardY = -Math.sin(pitch);

        _camTargetPos.set(localX, eyeHeight, localZ);
        _camLookAt.set(
          localX + forwardX * 8,
          eyeHeight + forwardY * 8,
          localZ + forwardZ * 8
        );
        // Snappier follow so the head camera never feels detached from the body
        camLambda = 1 - Math.exp(-26 * dt);
      } else {
        const localEntry = avatarMap.get(props.localPlayerId);
        const px = localEntry ? localEntry.group.position.x : localX;
        const pz = localEntry ? localEntry.group.position.z : localZ;
        const pose = followCameraPose(px, pz, orbitYawOffset, orbitPitchOffset);
        const camCol = resolveCameraCollision(px, pz, pose.x, pose.z, obstacles, 0.8, 1.4);
        activeOccludedIndices = camCol.occludedObstacleIndices;
        _camTargetPos.set(camCol.x, pose.y + localY, camCol.z);
        _camLookAt.set(pose.lookX, pose.lookY + localY, pose.lookZ);
      }

      if (deathFocus) {
        const target = avatarMap.get(deathFocus.playerId)?.group;
        if (target) {
          _camTargetPos.set(target.position.x + 4, target.position.y + 3.4, target.position.z + 5);
          _camLookAt.set(target.position.x, target.position.y + 1.4, target.position.z);
          camLambda = 1 - Math.exp(-5 * dt);
        }
      }

      camera.position.lerp(_camTargetPos, camLambda);
      _currentLookAt.lerp(_camLookAt, camLambda);
      camera.lookAt(_currentLookAt);

      // Hide any building whose volume intersects the live camera or blocks the player sightline
      for (const [obsIdx, bGroup] of buildingMap.entries()) {
        const obs = obstacles[obsIdx];
        const nearLiveCam =
          obs &&
          Math.hypot(camera.position.x - obs.x, camera.position.z - obs.z) < obs.radius + 2.4;
        bGroup.visible = !(activeOccludedIndices.includes(obsIdx) || nearLiveCam);
      }

      const isPointing = props.cameraPreset === 'first' && !props.isTitleScreen && !deathFocus;
      pointBlend = THREE.MathUtils.lerp(pointBlend, isPointing ? 1 : 0, 1 - Math.exp(-12 * dt));
      pointingHand.visible = isPointing && pointBlend > 0.01;
      if (pointingHand.visible) {
        pointingHand.position.set(0.24, -0.55 + Math.max(0, pointBlend) * 0.28, -0.65);
        pointingHand.rotation.x = -0.12;
        const local = props.players.find((p) => p.id === props.localPlayerId);
        sleeveMaterial.color.set(local?.appearance.cloakColor ?? '#281822');
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    frameId = requestAnimationFrame(tick);

    return () => {
      isDisposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      pointingHand.traverse((object) => { if (object instanceof THREE.Mesh) object.geometry.dispose(); });
      wolfOutlineMaterial.dispose();
      for (const entry of avatarMap.values()) disposePlayerLabel(entry.labelSprite);
      gloveMaterial.dispose();
      sleeveMaterial.dispose();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearHeldInputs);
      window.removeEventListener('gothic-fireball-event', onRemoteFireballKick);
      window.removeEventListener('gothic-player-interact', onPlayerInteract3D);
      canvasEl.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="fixed inset-0 w-screen h-screen overflow-hidden bg-[#09080d]"
      aria-label="Không gian 3D Làng Cổ Gothic Huyết Nguyệt Thôn"
    />
  );
};
