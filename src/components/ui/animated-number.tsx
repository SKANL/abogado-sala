"use client";

import { useEffect, useRef, useState } from "react";

interface AnimatedNumberProps {
  value: number;
  duration?: number; // ms
  className?: string;
}

/**
 * Animates a number from 0 to `value` using requestAnimationFrame.
 * Falls back to static render if prefers-reduced-motion is set.
 */
export function AnimatedNumber({ value, duration = 800, className }: AnimatedNumberProps) {
  const [displayed, setDisplayed] = useState(0);
  const frameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    // Respect prefers-reduced-motion
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplayed(value);
      return;
    }

    const animate = (now: number) => {
      if (!startTimeRef.current) startTimeRef.current = now;
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic: decelerates toward end
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(eased * value));

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      startTimeRef.current = null;
    };
  }, [value, duration]);

  return <span className={className}>{displayed.toLocaleString("es-MX")}</span>;
}
