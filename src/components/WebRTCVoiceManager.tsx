import { canUseVoice, canShareVoice } from '../game/voiceChannel';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isWolfPackRole, type GamePhase, type PlayerState, type RoleId } from '../game/rules';
import { attachMicrophone, MICROPHONE_CONSTRAINTS } from '../audio/voiceCapture';
import { soundEngine } from '../audio/soundEngine';

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
  const [micPermissionState, setMicPermissionState] = useState<'idle' | 'active'>('idle');
  const [micError, setMicError] = useState('');
  const micStartingRef = useRef(false);
  const mountedRef = useRef(true);
  const canSpeak = canUseVoice(phase, { role: localRole, isAlive: localIsAlive });
  const aliveRef = useRef(canSpeak);
  aliveRef.current = canSpeak;
  const vadNodesRef = useRef<{ source: MediaStreamAudioSourceNode; analyser: AnalyserNode } | null>(null);
  const voiceCallbackRef = useRef(onVoiceStateChange);
  voiceCallbackRef.current = onVoiceStateChange;
  const lastVoiceRef = useRef({ muted: isMuted, speaking: isSpeaking });
  const reportVoiceState = useCallback((muted: boolean, speaking: boolean) => {
    if (lastVoiceRef.current.muted === muted && lastVoiceRef.current.speaking === speaking) return;
    lastVoiceRef.current = { muted, speaking };
    voiceCallbackRef.current(muted, speaking);
  }, []);
  const [spatialAudioEnabled, setSpatialAudioEnabled] = useState(true);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const remoteAudioElsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const analyserIntervalRef = useRef<number | null>(null);
  const latestPlayersRef = useRef<PlayerState[]>(players);
  const stopCapture = useCallback(() => {
    if (analyserIntervalRef.current) clearInterval(analyserIntervalRef.current);
    analyserIntervalRef.current = null;
    vadNodesRef.current?.source.disconnect();
    vadNodesRef.current?.analyser.disconnect();
    vadNodesRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
  }, []);

  // Voice privacy: at night only the wolf pack hears each other; dead players are cut off entirely.
  const allowedPeerIds = useMemo(() => {
    const ids = new Set<string>();
    if (!localIsAlive) return ids;


    for (const p of players) {
      if (p.id === localPlayerId || !p.isAlive) continue;
      if (!canShareVoice(phase, { role: localRole, isAlive: localIsAlive }, p)) continue;
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
        void attachMicrophone(pc, localStreamRef.current).catch(() => {});
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
    if (canSpeak) return;
    stopCapture();
    setMicPermissionState('idle');
    reportVoiceState(true, false);
  }, [canSpeak, reportVoiceState, stopCapture]);

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
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopCapture();
      peersRef.current.forEach((pc) => pc.close());
      peersRef.current.clear();
      remoteAudioElsRef.current.forEach((audio) => { audio.pause(); audio.srcObject = null; });
      remoteAudioElsRef.current.clear();
    };
  }, [stopCapture]);

  const toggleMicrophone = useCallback(async () => {
    if (!canSpeak || micStartingRef.current) return;

    if (micPermissionState === 'idle') {
      micStartingRef.current = true;
      setMicError('');
      try {
        const stream = await navigator.mediaDevices.getUserMedia(MICROPHONE_CONSTRAINTS);
        if (!mountedRef.current || !aliveRef.current) { stream.getTracks().forEach((track) => track.stop()); return; }
        localStreamRef.current = stream;
        setMicPermissionState('active');
        reportVoiceState(false, false);

        // Attach stream to existing peer connections
        for (const [peerId, pc] of peersRef.current.entries()) {
          await attachMicrophone(pc, stream);
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
        // Share the game's context; the mic only feeds an analyser, never the speakers.
        const audioCtx = soundEngine.getVoiceAnalysisContext();
        if (audioCtx) {
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          vadNodesRef.current = { source, analyser };
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
            reportVoiceState(!enabled, speakingNow);
          }, 220);
        }
      } catch {
        stopCapture();
        setMicPermissionState('idle');
        reportVoiceState(true, false);
        if (mountedRef.current) setMicError('Không mở được mic. Hãy kiểm tra quyền micro và thiết bị âm thanh.');
      } finally {
        micStartingRef.current = false;
      }
      return;
    }

    if (micPermissionState === 'active' && localStreamRef.current) {
      // Release the hardware input when off; keep the game's shared output context alive.
      stopCapture();
      setMicPermissionState('idle');
      reportVoiceState(true, false);
    }
  }, [micPermissionState, isMuted, canSpeak, reportVoiceState, stopCapture, wsRef]);

  useEffect(() => {
    const onExternalToggle = () => {
      void toggleMicrophone();
    };
    window.addEventListener('gothic-toggle-mic', onExternalToggle);
    return () => {
      window.removeEventListener('gothic-toggle-mic', onExternalToggle);
    };
  }, [toggleMicrophone]);

  return micError ? <div role="alert" className="pointer-events-auto fixed left-3 right-3 top-28 z-50 rounded-xl border border-red-400/40 bg-[#2c111c] px-3 py-2 text-xs text-red-100" onClick={() => setMicError('')}>{micError}</div> : null;
};
