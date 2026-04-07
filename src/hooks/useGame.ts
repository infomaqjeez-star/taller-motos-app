import { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../stores/gameStore';

export function useGameLoop() {
  const tick = useGameStore((state) => state.tick);
  const lastTimeRef = useRef(Date.now());
  const frameRef = useRef<number | undefined>(undefined);

  const gameLoop = useCallback(() => {
    const now = Date.now();
    const deltaTime = (now - lastTimeRef.current) / 1000;
    lastTimeRef.current = now;
    const clampedDeltaTime = Math.min(deltaTime, 1);
    tick(clampedDeltaTime);
    frameRef.current = requestAnimationFrame(gameLoop);
  }, [tick]);

  useEffect(() => {
    frameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [gameLoop]);
}

export function useFormatNumber() {
  return (num: number, decimals = 2): string => {
    if (num >= 1e12) return (num / 1e12).toFixed(decimals) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(decimals) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(decimals) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(decimals) + 'K';
    return num.toFixed(decimals);
  };
}

export function useFormatHashRate() {
  return (hashRate: number): string => {
    if (hashRate >= 1e12) return (hashRate / 1e12).toFixed(2) + ' TH/s';
    if (hashRate >= 1e9) return (hashRate / 1e9).toFixed(2) + ' GH/s';
    if (hashRate >= 1e6) return (hashRate / 1e6).toFixed(2) + ' MH/s';
    if (hashRate >= 1e3) return (hashRate / 1e3).toFixed(2) + ' KH/s';
    return hashRate.toFixed(2) + ' H/s';
  };
}
