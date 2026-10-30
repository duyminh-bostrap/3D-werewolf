import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isWolfPackRole, type GamePhase, type PlayerState, type RoleId } from '../game/rules';

interface WebRTCVoiceManagerProps {
  wsRef: React.MutableRefObject<WebSocket | null>;
  localPlayerId: string;
  players: PlayerState[];
  phase: GamePhase;
  localRole: RoleId;
  localIsAlive: boolean;
  isMuted: boolean;
  isSpeaking: boolean;
  onVoiceStateChange: (isMuted: boolean, isSpeaking: boolean) => void;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

export const WebRTCVoiceManager: React.FC<WebRTCVoiceManagerProps> = ({
  wsRef,
  localPlayerId,
  players,
  phase,
  localRole,
  localIsAlive,
  isMuted,
  isSpeaking,
  onVoiceStateChange,
}) => {
  const [micPermissionState, setMicPermissionState] = useState<'idle' | 'active' | 'simulated'>('idle');
  const [spatialAudioEnabled, setSpatialAudioEnabled] = useState(true);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const remoteAudioElsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const analyserIntervalRef = useRef<number | null>(null);
  const latestPlayersRef = useRef<PlayerState[]>(players);

  // Voice privacy: at night only the wolf pack hears each other; dead players are cut off entirely.
  const allowedPeerIds = useMemo(() => {
    const ids = new Set<string>();
    if (!localIsAlive) return ids;

    const wolvesOnly = phase === 'night';
    const localIsWolf = isWolfPackRole(localRole);

    for (const p of players) {
      if (p.id === localPlayerId || !p.isAlive) continue;
      if (wolvesOnly && !(localIsWolf && isWolfPackRole(p.role))) continue;
      ids.add(p.id);
    }
    return ids;
  }, [players, localPlayerId, phase, localRole, localIsAlive]);

  const allowedPeerKey = useMemo(
    () => Array.from(allowedPeerIds).sort().join('|'),
    [allowedPeerIds]
  );

  const isWolfNight = phase === 'night' && localIsAlive && isWolfPackRole(localRole);

  useEffect(() => {
    latestPlayersRef.current = players;
    // Update spatial 3D distance attenuation on remote audio elements.
    // Wolf night channel is non-spatial (you hear your pack clearly wherever you sit).
    for (const [peerId, audioEl] of remoteAudioElsRef.current.entries()) {
      if (!spatialAudioEnabled) {
        audioEl.volume = 1;
        continue;
      }
      if (isWolfNight) {
        audioEl.volume = 1;
        continue;
      }
      const me = players.find((p) => p.id === localPlayerId);
      const peer = players.find((p) => p.id === peerId);
      if (me && peer) {
        const dist = Math.hypot(peer.x - me.x, peer.z - me.z);
        audioEl.volume = Math.max(0.15, Math.min(1, 1 - dist / 32));
      }
    }
  }, [players, localPlayerId, spatialAudioEnabled, isWolfNight]);

  const closePeer = useCallback((peerId: string) => {
    const pc = peersRef.current.get(peerId);
    if (pc) {
      try {
        pc.close();
      } catch {
        // Ignore already-closed peer connections
      }
      peersRef.current.delete(peerId);
    }
    const audio = remoteAudioElsRef.current.get(peerId);
    if (audio) {
      audio.pause();
      audio.srcObject = null;
      remoteAudioElsRef.current.delete(peerId);
    }
  }, []);

  const createPeerConnection = useCallback(
    (peerId: string, initiator: boolean) => {
      if (peersRef.current.has(peerId)) {
        return peersRef.current.get(peerId)!;
      }

      const pc = new RTCPeerConnection(RTC_CONFIG);
      peersRef.current.set(peerId, pc);

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      pc.onicecandidate = (event) => {
        if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: 'webrtc:signal',
              targetId: peerId,
              signal: { type: 'ice', candidate: event.candidate },
            })
          );
        }
      };

      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;
        if (!remoteStream) return;
        let audio = remoteAudioElsRef.current.get(peerId);
        if (!audio) {
          audio = new Audio();
          audio.autoplay = true;
          remoteAudioElsRef.current.set(peerId, audio);
        }
        audio.srcObject = remoteStream;
        void audio.play().catch(() => {});
      };

      if (initiator) {
        pc.createOffer()
          .then((offer) => pc.setLocalDescription(offer))
          .then(() => {
            if (wsRef.current?.readyState === WebSocket.OPEN && pc.localDescription) {
              wsRef.current.send(
                JSON.stringify({
                  type: 'webrtc:signal',
                  targetId: peerId,
                  signal: { type: 'sdp', sdp: pc.localDescription },
                })
              );
            }
          })
          .catch(() => {});
      }

      return pc;
    },
    [wsRef]
  );

  // Keep the peer mesh in sync with the current voice channel (who is allowed to hear whom)
  useEffect(() => {
    const allowed = new Set(allowedPeerIds);

    for (const peerId of Array.from(peersRef.current.keys())) {
      if (!allowed.has(peerId)) closePeer(peerId);
    }

    for (const peerId of allowed) {
      if (peersRef.current.has(peerId)) continue;
      // Deterministic initiator avoids duplicate SDP offers (glare) from both sides
      createPeerConnection(peerId, localPlayerId < peerId);
    }
  }, [allowedPeerKey, allowedPeerIds, closePeer, createPeerConnection, localPlayerId]);

  // Dead players keep their microphone hard-muted
  useEffect(() => {
    if (localIsAlive) return;
    localStreamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = false;
    });
    if (!isMuted) onVoiceStateChange(true, false);
  }, [localIsAlive, isMuted, onVoiceStateChange]);

  // Expose WebRTC signaling handler on window so App WebSocket listener can route signals cleanly
  useEffect(() => {
    const handleSignalEvent = async (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;

      if (detail.type === 'webrtc:peer-joined') {
        // Connection is created by the allowed-peer effect once room state arrives
        if (allowedPeerIds.has(detail.peerId)) {
          createPeerConnection(detail.peerId, localPlayerId < detail.peerId);
        }
      } else if (detail.type === 'webrtc:peer-left') {
        closePeer(detail.peerId);
      } else if (detail.type === 'webrtc:signal') {
        const { fromId, signal } = detail;
        if (!allowedPeerIds.has(fromId)) return;
        const pc = createPeerConnection(fromId, false);
        try {
          if (signal.type === 'sdp') {
            await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
            if (signal.sdp.type === 'offer') {
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              wsRef.current?.send(
                JSON.stringify({
                  type: 'webrtc:signal',
                  targetId: fromId,
                  signal: { type: 'sdp', sdp: pc.localDescription },
                })
              );
            }
          } else if (signal.type === 'ice' && signal.candidate) {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          }
        } catch {
          // Ignore transient WebRTC negotiation races
        }
      }
    };

    window.addEventListener('gothic-webrtc-event', handleSignalEvent);
    return () => {
      window.removeEventListener('gothic-webrtc-event', handleSignalEvent);
    };
  }, [allowedPeerIds, createPeerConnection, closePeer, localPlayerId, wsRef]);

  useEffect(() => {
    return () => {
      if (analyserIntervalRef.current) clearInterval(analyserIntervalRef.current);
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      peersRef.current.forEach((pc) => pc.close());
      peersRef.current.clear();
    };
  }, []);

  const toggleMicrophone = useCallback(async () => {
    if (!localIsAlive) return;

    if (micPermissionState === 'idle') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
          },
        });
        localStreamRef.current = stream;
        setMicPermissionState('active');
        onVoiceStateChange(false, false);

        // Attach stream to existing peer connections
        for (const [peerId, pc] of peersRef.current.entries()) {
          stream.getTracks().forEach((track) => pc.addTrack(track, stream));
          pc.createOffer()
            .then((offer) => pc.setLocalDescription(offer))
            .then(() => {
              wsRef.current?.send(
                JSON.stringify({
                  type: 'webrtc:signal',
                  targetId: peerId,
                  signal: { type: 'sdp', sdp: pc.localDescription },
                })
              );
            })
            .catch(() => {});
        }

        // Set up voice activity detection (VAD)
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          const audioCtx = new AudioCtx();
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);
          const dataArray = new Uint8Array(analyser.frequencyBinCount);

          analyserIntervalRef.current = window.setInterval(() => {
            if (!localStreamRef.current) return;
            const enabled = localStreamRef.current.getAudioTracks()[0]?.enabled ?? false;
            if (!enabled) return;
            analyser.getByteFrequencyData(dataArray);
            const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
            const speakingNow = avg > 18;
            onVoiceStateChange(!enabled, speakingNow);
          }, 220);
        }
      } catch {
        // Fallback for headless browser or device without physical mic: enable simulated Push-to-Talk Voice mode
        setMicPermissionState('simulated');
        onVoiceStateChange(false, true);
      }
      return;
    }

    if (micPermissionState === 'active' && localStreamRef.current) {
      const nextMuted = !isMuted;
      localStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = !nextMuted;
      });
      onVoiceStateChange(nextMuted, false);
    } else {
      // Simulated voice mode toggle
      const nextMuted = !isMuted;
      onVoiceStateChange(nextMuted, !nextMuted);
    }
  }, [micPermissionState, isMuted, localIsAlive, onVoiceStateChange, wsRef]);

  useEffect(() => {
    const onExternalToggle = () => {
      void toggleMicrophone();
    };
    window.addEventListener('gothic-toggle-mic', onExternalToggle);
    return () => {
      window.removeEventListener('gothic-toggle-mic', onExternalToggle);
    };
  }, [toggleMicrophone]);

  return null;
};
