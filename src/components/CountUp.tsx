
import React, { useEffect, useRef } from 'react';
import { useInView, useMotionValue, animate } from 'framer-motion';

interface CountUpProps {
  value: number;
  duration?: number; // Seconds
}

export const CountUp: React.FC<CountUpProps> = ({ value, duration = 0.8 }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "0px" }); 
  const motionValue = useMotionValue(0);

  useEffect(() => {
    if (isInView) {
      // Animate from current motionValue (usually 0) to target value
      const controls = animate(motionValue, value, {
        duration: duration,
        ease: "easeOut"
      });
      return controls.stop;
    }
  }, [isInView, value, duration, motionValue]);

  // Handle updates for accessibility and rendering
  useEffect(() => {
    const unsubscribe = motionValue.on("change", (latest) => {
      if (ref.current) {
        // Format with thousand separator if needed, here just integer
        ref.current.textContent = String(Math.round(latest));
      }
    });
    return () => unsubscribe();
  }, [motionValue]);

  return <span ref={ref}>{Math.round(motionValue.get())}</span>;
};
