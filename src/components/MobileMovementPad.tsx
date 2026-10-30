import React, { useRef, useState } from 'react';
import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { computeJoystickVector } from '../game/rules';

export interface MobileMovementInput {
  moveX: number; // -1..1
  moveZ: number; // -1..1
  jumpRequested: boolean;
  lookDeltaYaw: number; // accumulated yaw drag since last frame (radians); consumed & reset by the 3D scene
  lookDeltaPitch: number; // accumulated pitch drag since last frame; consumed & reset by the 3D scene
  isHoldingEye: boolean; // true only while finger/pointer is holding the eye button
}

interface MobileMovementPadProps {
  visible: boolean;
  canMove?: boolean;
  isHudCollapsed: boolean;
  inputRef: React.MutableRefObject<MobileMovementInput>;
}

export const MobileMovementPad: React.FC<MobileMovementPadProps> = ({
  visible,
  canMove = true,
  isHudCollapsed,
  inputRef,
}) => {
  const baseRef = useRef<HTMLDivElement | null>(null);
  const activePointerIdRef = useRef<number | null>(null);

  const eyeBaseRef = useRef<HTMLDivElement | null>(null);
  const eyePointerIdRef = useRef<number | null>(null);
  const eyeLastPointRef = useRef<{ x: number; y: number } | null>(null);

  const [knobPos, setKnobPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingStick, setIsDraggingStick] = useState(false);
  const [activeDpad, setActiveDpad] = useState<'up' | 'down' | 'left' | 'right' | null>(null);

  const [isJumpingUI, setIsJumpingUI] = useState(false);
  const [eyeKnobPos, setEyeKnobPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingEye, setIsDraggingEye] = useState(false);

  if (!visible) return null;

  const updateStickFromPointer = (clientX: number, clientY: number) => {
    const base = baseRef.current;
    if (!base) return;
    const rect = base.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = clientX - centerX;
    const dy = clientY - centerY;

    const vec = computeJoystickVector(dx, dy, 26, 0.08);
    setKnobPos({ x: vec.knobX, y: vec.knobY });
    inputRef.current.moveX = vec.normX;
    inputRef.current.moveZ = vec.normY;
  };

  const handleStickPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-dpad-btn="true"]')) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    activePointerIdRef.current = e.pointerId;
    setIsDraggingStick(true);
    updateStickFromPointer(e.clientX, e.clientY);
  };

  const handleStickPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== e.pointerId) return;
    updateStickFromPointer(e.clientX, e.clientY);
  };

  const resetStick = () => {
    activePointerIdRef.current = null;
    setIsDraggingStick(false);
    setKnobPos({ x: 0, y: 0 });
    inputRef.current.moveX = 0;
    inputRef.current.moveZ = 0;
  };

  const startDpadDirection = (dir: 'up' | 'down' | 'left' | 'right') => {
    setActiveDpad(dir);
    if (dir === 'up') {
      inputRef.current.moveX = 0;
      inputRef.current.moveZ = -1;
      setKnobPos({ x: 0, y: -22 });
    } else if (dir === 'down') {
      inputRef.current.moveX = 0;
      inputRef.current.moveZ = 1;
      setKnobPos({ x: 0, y: 22 });
    } else if (dir === 'left') {
      inputRef.current.moveX = -1;
      inputRef.current.moveZ = 0;
      setKnobPos({ x: -22, y: 0 });
    } else if (dir === 'right') {
      inputRef.current.moveX = 1;
      inputRef.current.moveZ = 0;
      setKnobPos({ x: 22, y: 0 });
    }
  };

  const stopDpadDirection = () => {
    setActiveDpad(null);
    setKnobPos({ x: 0, y: 0 });
    inputRef.current.moveX = 0;
    inputRef.current.moveZ = 0;
  };

  const handleTriggerJump = () => {
    inputRef.current.jumpRequested = true;
    setIsJumpingUI(true);
    window.setTimeout(() => {
      setIsJumpingUI(false);
    }, 400);
  };

  // Free-Look Camera Eye Control:
  // Dragging rotates the camera like a touchpad — the angle is kept after release
  // (no snapping back), so swiping left/right really turns the view with the character.
  const updateEyeFromPointer = (clientX: number, clientY: number) => {
    const base = eyeBaseRef.current;
    if (!base) return;
    const rect = base.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Knob follows the finger, clamped inside the pad, purely for visual feedback
    const vec = computeJoystickVector(clientX - centerX, clientY - centerY, 18, 0.04);
    setEyeKnobPos({ x: vec.knobX, y: vec.knobY });

    // Accumulate real drag deltas so repeated swipes keep rotating the camera
    const last = eyeLastPointRef.current;
    if (last) {
      const dX = clientX - last.x;
      const dY = clientY - last.y;
      inputRef.current.lookDeltaYaw += dX * 0.009;
      inputRef.current.lookDeltaPitch += dY * 0.012;
    }
    eyeLastPointRef.current = { x: clientX, y: clientY };
    inputRef.current.isHoldingEye = true;
  };

  const handleEyePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    eyePointerIdRef.current = e.pointerId;
    eyeLastPointRef.current = { x: e.clientX, y: e.clientY };
    setIsDraggingEye(true);
    updateEyeFromPointer(e.clientX, e.clientY);
  };

  const handleEyePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (eyePointerIdRef.current !== e.pointerId) return;
    updateEyeFromPointer(e.clientX, e.clientY);
  };

  const releaseEye = () => {
    eyePointerIdRef.current = null;
    eyeLastPointRef.current = null;
    setIsDraggingEye(false);
    setEyeKnobPos({ x: 0, y: 0 });
    inputRef.current.isHoldingEye = false;
  };

  const bottomOffsetClass = isHudCollapsed
    ? 'bottom-14 sm:bottom-16'
    : canMove
    ? 'bottom-20 sm:bottom-22'
    : 'bottom-28 sm:bottom-24';

  return (
    <>
      {/* Left-Thumb Compact Translucent Virtual Joystick (80px, low opacity) */}
      {canMove && (
        <div
          className={`fixed left-2.5 sm:left-4 ${bottomOffsetClass} z-30 pointer-events-auto select-none touch-none transition-all`}
        >
          <div
            ref={baseRef}
            data-testid="mobile-joystick-pad"
            onPointerDown={handleStickPointerDown}
            onPointerMove={handleStickPointerMove}
            onPointerUp={resetStick}
            onPointerCancel={resetStick}
            onLostPointerCapture={resetStick}
            className={`relative w-20 h-20 rounded-full border flex items-center justify-center cursor-grab active:cursor-grabbing transition-opacity ${
              isDraggingStick || activeDpad
                ? 'bg-[#110d19]/60 border-[#d4af37]/55 opacity-95'
                : 'bg-[#110d19]/32 border-[#d4af37]/25 opacity-75 hover:opacity-90'
            }`}
            aria-label="Cần điều khiển di chuyển nhân vật 3D"
          >
            {/* Inner subtle ring */}
            <div className="absolute inset-0 m-auto w-12 h-12 rounded-full border border-white/10 pointer-events-none" />

            {/* Cardinal Quick-Tap Buttons */}
            <button
              type="button"
              data-dpad-btn="true"
              data-testid="dpad-up-btn"
              aria-label="Di chuyển tiến lên"
              onPointerDown={(e) => {
                e.stopPropagation();
                startDpadDirection('up');
              }}
              onPointerUp={stopDpadDirection}
              onPointerLeave={stopDpadDirection}
              className={`absolute top-0 left-1/2 -translate-x-1/2 w-8 h-6 flex items-center justify-center rounded-t-full transition-colors cursor-pointer ${
                activeDpad === 'up' ? 'text-[#d4af37]' : 'text-slate-300/60 hover:text-white'
              }`}
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              data-dpad-btn="true"
              data-testid="dpad-down-btn"
              aria-label="Di chuyển lùi lại"
              onPointerDown={(e) => {
                e.stopPropagation();
                startDpadDirection('down');
              }}
              onPointerUp={stopDpadDirection}
              onPointerLeave={stopDpadDirection}
              className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-6 flex items-center justify-center rounded-b-full transition-colors cursor-pointer ${
                activeDpad === 'down' ? 'text-[#d4af37]' : 'text-slate-300/60 hover:text-white'
              }`}
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              data-dpad-btn="true"
              data-testid="dpad-left-btn"
              aria-label="Di chuyển sang trái"
              onPointerDown={(e) => {
                e.stopPropagation();
                startDpadDirection('left');
              }}
              onPointerUp={stopDpadDirection}
              onPointerLeave={stopDpadDirection}
              className={`absolute left-0 top-1/2 -translate-y-1/2 w-6 h-8 flex items-center justify-center rounded-l-full transition-colors cursor-pointer ${
                activeDpad === 'left' ? 'text-[#d4af37]' : 'text-slate-300/60 hover:text-white'
              }`}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              data-dpad-btn="true"
              data-testid="dpad-right-btn"
              aria-label="Di chuyển sang phải"
              onPointerDown={(e) => {
                e.stopPropagation();
                startDpadDirection('right');
              }}
              onPointerUp={stopDpadDirection}
              onPointerLeave={stopDpadDirection}
              className={`absolute right-0 top-1/2 -translate-y-1/2 w-6 h-8 flex items-center justify-center rounded-r-full transition-colors cursor-pointer ${
                activeDpad === 'right' ? 'text-[#d4af37]' : 'text-slate-300/60 hover:text-white'
              }`}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            {/* Compact Draggable Thumbstick Puck */}
            <div
              className={`relative z-10 w-8 h-8 rounded-full border flex items-center justify-center pointer-events-none transition-transform duration-75 ${
                isDraggingStick || activeDpad
                  ? 'bg-[#9e1b24]/80 border-[#d4af37] scale-105'
                  : 'bg-[#1d1629]/55 border-[#d4af37]/50'
              }`}
              style={{
                transform: `translate3d(${knobPos.x}px, ${knobPos.y}px, 0)`,
              }}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-[#d4af37]/85" />
            </div>
          </div>
        </div>
      )}

      {/* Right-Thumb Compact Translucent Camera Eye & Jump Controls (44px, low opacity) */}
      <div
        className={`fixed right-2.5 sm:right-4 ${bottomOffsetClass} z-30 pointer-events-auto select-none touch-none flex flex-col items-center gap-2 transition-all`}
      >
        {/* Directional Camera Eye Free-Look Button (Hold to look in direction, Release to return to default) */}
        <div
          ref={eyeBaseRef}
          role="button"
          tabIndex={0}
          data-testid="camera-eye-360-btn"
          aria-label="Mắt Camera kéo để xoay góc nhìn, góc nhìn được giữ sau khi thả tay"
          title="Kéo biểu tượng Mắt để xoay góc nhìn (vuốt trái/phải để quay camera), thả tay vẫn giữ góc mới"
          onPointerDown={handleEyePointerDown}
          onPointerMove={handleEyePointerMove}
          onPointerUp={releaseEye}
          onPointerCancel={releaseEye}
          onLostPointerCapture={releaseEye}
          className={`relative w-11 h-11 rounded-full border flex items-center justify-center cursor-grab active:cursor-grabbing transition-all ${
            isDraggingEye
              ? 'bg-[#9e1b24]/65 border-[#d4af37]/80 opacity-95'
              : 'bg-[#110d19]/32 border-[#d4af37]/30 opacity-75 hover:opacity-90'
          }`}
        >
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform duration-75 pointer-events-none ${
              isDraggingEye
                ? 'bg-[#1a1118]/80 text-[#f3e5ab] scale-105'
                : 'text-[#d4af37]/85'
            }`}
            style={{
              transform: `translate3d(${eyeKnobPos.x}px, ${eyeKnobPos.y}px, 0)`,
            }}
          >
            <Eye className="w-4 h-4" />
          </div>
        </div>

        {/* Compact Translucent Jump Icon Button (Only in Lobby when movement is allowed) */}
        {canMove && (
          <button
            type="button"
            data-testid="mobile-jump-btn"
            aria-label="Nhảy lên (Space)"
            title="Nhảy lên (Phím Space)"
            onPointerDown={(e) => {
              e.preventDefault();
              handleTriggerJump();
            }}
            className={`relative w-11 h-11 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
              isJumpingUI
                ? 'bg-[#9e1b24]/70 border-[#f3e5ab] text-[#f3e5ab] scale-105 opacity-95'
                : 'bg-[#110d19]/32 border-[#d4af37]/30 text-[#d4af37]/85 opacity-75 hover:opacity-90'
            }`}
          >
            <svg
              viewBox="0 0 28 28"
              fill="none"
              className={`w-5 h-5 transition-transform duration-150 ${
                isJumpingUI ? '-translate-y-0.5 scale-110' : ''
              }`}
              aria-hidden="true"
            >
              <circle cx="14.5" cy="5.5" r="2.4" fill="currentColor" />
              <path
                d="M9.5 11.5C11.8 9.2 15.8 9.2 18.8 11.2M14.2 8.5L13.2 14.6L9.8 18.8M13.2 14.6L17.8 16.5L19.5 13.5"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M6.5 22.5C9.5 20.2 18.5 20.2 21.5 22.5"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeDasharray="2 2"
              />
              <path
                d="M11.5 25L14 22.5L16.5 25"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>
    </>
  );
};
