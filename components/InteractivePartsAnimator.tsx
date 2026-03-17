import React, { useState, useRef, useEffect } from 'react';

interface InteractivePartsAnimatorProps {
  imageUrl: string;
}

const InteractivePartsAnimator: React.FC<InteractivePartsAnimatorProps> = ({ imageUrl }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [blinkState, setBlinkState] = useState(false);
  const [headRotation, setHeadRotation] = useState(0);
  const [isBreathing, setIsBreathing] = useState(false);
  
  // Drag logic for head
  const isDraggingHead = useRef(false);
  const startDragX = useRef(0);

  // Hotspots Configuration (in %)
  // These are approximations since we don't have real segmentation.
  // Using percentages allows it to work on any image size.
  const hotspots = {
    head: { x: 35, y: 15, w: 30, h: 30 }, // Roughly center-top
    eyeLeft: { x: 42, y: 25, w: 6, h: 4 },
    eyeRight: { x: 52, y: 25, w: 6, h: 4 },
    belly: { x: 40, y: 50, w: 20, h: 20 }
  };

  const handleBlink = () => {
    if (blinkState) return;
    setBlinkState(true);
    setTimeout(() => setBlinkState(false), 200);
  };

  const handleBellyTap = () => {
    if (isBreathing) return;
    setIsBreathing(true);
    setTimeout(() => setIsBreathing(false), 2000); // 2 seconds of breathing
  };

  // Head Drag Handlers
  const handleHeadDown = (e: React.PointerEvent) => {
    e.stopPropagation(); // Stop parent from dragging
    isDraggingHead.current = true;
    startDragX.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleHeadMove = (e: React.PointerEvent) => {
    if (!isDraggingHead.current) return;
    e.stopPropagation();
    const deltaX = e.clientX - startDragX.current;
    // Limit rotation between -15 and 15 degrees
    const rot = Math.min(Math.max(deltaX * 0.2, -15), 15);
    setHeadRotation(rot);
  };

  const handleHeadUp = (e: React.PointerEvent) => {
    isDraggingHead.current = false;
    setHeadRotation(0); // Spring back
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center select-none touch-none overflow-hidden"
    >
      <style>{`
        @keyframes breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        .animate-breathe {
          animation: breathe 1s ease-in-out infinite;
        }
        .part-overlay {
          position: absolute;
          background-image: url('${imageUrl}');
          background-size: 100% 100%; 
          /* Note: bg-size cover/contain might shift depending on container aspect ratio. 
             Ideally we want the overlay to match the base image exactly. 
             Since the base img is object-contain, this is tricky without known aspect ratio.
             MVP approach: assume square or fit to container for overlay effect. 
          */
          background-repeat: no-repeat;
          cursor: pointer;
          /* Debug border: border: 1px solid rgba(255,0,0,0.3); */
        }
      `}</style>

      {/* Base Image */}
      {/* We need a wrapper to establish the coordinate system for overlays */}
      <div className="relative w-full h-full max-w-[400px] max-h-[400px]">
          <img 
            src={imageUrl} 
            alt="Base Character" 
            className="w-full h-full object-contain pointer-events-none"
            draggable={false}
          />

          {/* 
             NOTE: The overlays below use background-image to "cut out" parts.
             For this to align perfectly with `object-contain`, the container div needs to match the image's aspect ratio.
             In this MVP, we are assuming square or approximating. 
             A more robust way is to use the same <img> inside divs with overflow hidden.
          */}

          {/* HEAD OVERLAY (Rotate) */}
          <div 
            className="absolute z-20 transition-transform duration-100 ease-out"
            style={{
              left: `${hotspots.head.x}%`,
              top: `${hotspots.head.y}%`,
              width: `${hotspots.head.w}%`,
              height: `${hotspots.head.h}%`,
              transform: `rotate(${headRotation}deg)`,
              transformOrigin: 'bottom center',
              // Using a simple clip-path to approximate head shape for interaction
              // We don't render the image here to avoid misalignment artifacts in MVP.
              // Instead, we just capture events and rotate a "ghost" or maybe we DO render a clone?
              // Rendering a clone requires precise alignment.
              // Let's try "Interactive Zones" that affect the WHOLE image or just trigger effects?
              // The prompt asks for "overlay layer que mostra a MESMA imagem".
              // Let's try to clip the image.
            }}
            onPointerDown={handleHeadDown}
            onPointerMove={handleHeadMove}
            onPointerUp={handleHeadUp}
            onPointerLeave={handleHeadUp}
          >
             {/* The visual part that rotates. 
                 Tricky part: background-position needs to be offset to match. 
                 bg-position: ${-left}% ${-top}% might work if sizes match.
             */}
             <div 
               className="w-full h-full"
               style={{
                 backgroundImage: `url(${imageUrl})`,
                 backgroundSize: `${100 / (hotspots.head.w / 100)}% ${100 / (hotspots.head.h / 100)}%`,
                 backgroundPosition: `${(hotspots.head.x / (100 - hotspots.head.w)) * 100}% ${(hotspots.head.y / (100 - hotspots.head.h)) * 100}%`,
                 clipPath: 'ellipse(45% 50% at 50% 50%)' 
               }}
             />
          </div>

          {/* EYES OVERLAY (Blink) */}
          {[hotspots.eyeLeft, hotspots.eyeRight].map((eye, i) => (
            <div
              key={i}
              className="absolute z-30"
              style={{
                left: `${eye.x}%`,
                top: `${eye.y}%`,
                width: `${eye.w}%`,
                height: `${eye.h}%`,
                transform: blinkState ? 'scaleY(0.1)' : 'scaleY(1)',
                transition: 'transform 0.1s ease-in-out',
                transformOrigin: 'center',
                backgroundColor: '#ffe4c4', // Skin tone fallback or transparent? 
                // Better: Just scale the image part vertically? 
                // Or easier: Render a skin-colored lid on top.
                // Let's use the image clone approach.
              }}
              onClick={handleBlink}
            >
               <div 
                 className="w-full h-full"
                 style={{
                   backgroundImage: `url(${imageUrl})`,
                   backgroundSize: `${100 / (eye.w / 100)}% ${100 / (eye.h / 100)}%`,
                   backgroundPosition: `${(eye.x / (100 - eye.w)) * 100}% ${(eye.y / (100 - eye.h)) * 100}%`,
                   clipPath: 'ellipse(50% 50% at 50% 50%)'
                 }}
               />
            </div>
          ))}

          {/* BELLY OVERLAY (Breathe) */}
          <div
            className={`absolute z-10 ${isBreathing ? 'animate-breathe' : ''}`}
            style={{
              left: `${hotspots.belly.x}%`,
              top: `${hotspots.belly.y}%`,
              width: `${hotspots.belly.w}%`,
              height: `${hotspots.belly.h}%`,
            }}
            onClick={handleBellyTap}
          >
             <div 
               className="w-full h-full"
               style={{
                 backgroundImage: `url(${imageUrl})`,
                 backgroundSize: `${100 / (hotspots.belly.w / 100)}% ${100 / (hotspots.belly.h / 100)}%`,
                 backgroundPosition: `${(hotspots.belly.x / (100 - hotspots.belly.w)) * 100}% ${(hotspots.belly.y / (100 - hotspots.belly.h)) * 100}%`,
                 clipPath: 'ellipse(45% 45% at 50% 50%)'
               }}
             />
          </div>
      </div>
      
      {/* Instruction Overlay */}
      <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none opacity-60">
         <p className="text-xs font-bold text-white uppercase tracking-widest bg-black/20 inline-block px-3 py-1 rounded-full backdrop-blur-sm">
           Toque no rosto ou barriga ✨
         </p>
      </div>
    </div>
  );
};

export default InteractivePartsAnimator;
