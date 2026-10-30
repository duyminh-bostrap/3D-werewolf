import React, { useEffect, useRef, useState } from 'react';
import type { PlayerState } from '../game/rules';

interface WebRTCVoiceManagerProps {
  wsRef: React.MutableRefObject<WebSocket | null>;
  localPlayerId: string;
  players: PlayerState[];
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

  useEffect(() => {
    latestPlayersRef.current = players;
    // Update spatial 3D distance attenuation on remote audio elements
    if (!spatialAudioEnabled) return;
    const me = players.find((p) => p.id === localPlayerId);
    if (!me) return;

    for (const [peerId, audioEl] of remoteAudioElsRef.current.entries()) {
      const peer = players.find((p) => p.id === peerId);
      if (peer) {
        const dist = Math.hypot(peer.x - me.x, peer.z - me.z);
        const vol = Math.max(0.15, Math.min(1, 1 - dist / 32));
        audioEl.volume = vol;
      }
    }
  }, [players, localPlayerId, spatialAudioEnabled]);

  const createPeerConnection = (peerId: string, initiator: boolean) => {
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
  };

  // Expose WebRTC signaling handler on window so App WebSocket listener can route signals cleanly
  useEffect(() => {
    const handleSignalEvent = async (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;

      if (detail.type === 'webrtc:peer-joined') {
        createPeerConnection(detail.peerId, true);
      } else if (detail.type === 'webrtc:peer-left') {
        const pc = peersRef.current.get(detail.peerId);
        if (pc) {
          pc.close();
          peersRef.current.delete(detail.peerId);
        }
        const audio = remoteAudioElsRef.current.get(detail.peerId);
        if (audio) {
          audio.srcObject = null;
          remoteAudioElsRef.current.delete(detail.peerId);
        }
      } else if (detail.type === 'webrtc:signal') {
        const { fromId, signal } = detail;
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
  }, []);

  useEffect(() => {
    return () => {
      if (analyserIntervalRef.current) clearInterval(analyserIntervalRef.current);
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      peersRef.current.forEach((pc) => pc.close());
    };
  }, []);

  const toggleMicrophone = async () => {
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
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
  };

  useEffect(() => {
    const onExternalToggle = () => {
      void toggleMicrophone();
    };
    window.addEventListener('gothic-toggle-mic', onExternalToggle);
    return () => {
      window.removeEventListener('gothic-toggle-mic', onExternalToggle);
    };
  }, [micPermissionState, isMuted]);

  return null;
};

