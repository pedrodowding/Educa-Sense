
import { useCallback, useRef, useEffect } from 'react';

type OscillatorType = 'sine' | 'square' | 'sawtooth' | 'triangle';

export const useGameSound = () => {
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    // Initialize AudioContext on first user interaction if possible, 
    // but React effects run after mount. 
    // Browsers require user interaction to resume AudioContext.
    // We'll create it lazily or on mount and handle resume in play methods.
    const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
    if (AudioContextClass) {
      audioContextRef.current = new AudioContextClass();
    }
    
    return () => {
      audioContextRef.current?.close();
    };
  }, []);

  const playTone = useCallback((frequency: number, type: OscillatorType = 'sine', duration: number = 0.1, volume: number = 0.1) => {
    if (!audioContextRef.current) return;
    
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  }, []);

  const playClick = useCallback(() => {
    playTone(800, 'sine', 0.05, 0.05);
  }, [playTone]);

  const playSuccess = useCallback(() => {
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;
    const now = ctx.currentTime;
    
    // Arpeggio C Major
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.1);
      gain.gain.setValueAtTime(0.1, now + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.3);
    });
  }, []);

  const playError = useCallback(() => {
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.3);
    
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  }, []);

  const playWin = useCallback(() => {
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;
    const now = ctx.currentTime;
    
    // Victory fanfare
    const notes = [
      { f: 523.25, t: 0, d: 0.2 }, // C
      { f: 523.25, t: 0.2, d: 0.2 }, // C
      { f: 523.25, t: 0.4, d: 0.2 }, // C
      { f: 659.25, t: 0.6, d: 0.6 }, // E
      { f: 783.99, t: 1.2, d: 0.6 }, // G
      { f: 1046.50, t: 1.8, d: 1.0 }, // C (High)
    ];

    notes.forEach(n => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(n.f, now + n.t);
      gain.gain.setValueAtTime(0.05, now + n.t);
      gain.gain.exponentialRampToValueAtTime(0.001, now + n.t + n.d);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + n.t);
      osc.stop(now + n.t + n.d);
    });
  }, []);

  const playGameOver = useCallback(() => {
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;
    const now = ctx.currentTime;
    
    // Sad descending tones
    const notes = [
      { f: 783.99, t: 0, d: 0.3 },
      { f: 739.99, t: 0.3, d: 0.3 },
      { f: 698.46, t: 0.6, d: 0.3 },
      { f: 659.25, t: 0.9, d: 1.0 },
    ];

    notes.forEach(n => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(n.f, now + n.t);
      gain.gain.setValueAtTime(0.1, now + n.t);
      gain.gain.linearRampToValueAtTime(0.001, now + n.t + n.d);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + n.t);
      osc.stop(now + n.t + n.d);
    });
  }, []);

  return {
    playTone,
    playClick,
    playSuccess,
    playError,
    playWin,
    playGameOver
  };
};
