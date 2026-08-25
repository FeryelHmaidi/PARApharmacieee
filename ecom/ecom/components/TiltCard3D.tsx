"use client";

import React, { useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

interface TiltCard3DProps {
  children: React.ReactNode;
  className?: string;
  intensity?: number;
  glare?: boolean;
}

export default function TiltCard3D({
  children,
  className = "",
  intensity = 14,
  glare = true,
}: TiltCard3DProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);

  const springConfig = { stiffness: 280, damping: 24 };
  const rotateX = useSpring(useTransform(rawY, [-1, 1], [intensity, -intensity]), springConfig);
  const rotateY = useSpring(useTransform(rawX, [-1, 1], [-intensity, intensity]), springConfig);

  const glareX = useTransform(rawX, [-1, 1], [0, 100]);
  const glareY = useTransform(rawY, [-1, 1], [0, 100]);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    rawX.set((e.clientX - cx) / (rect.width / 2));
    rawY.set((e.clientY - cy) / (rect.height / 2));
  }

  function handleMouseLeave() {
    rawX.set(0);
    rawY.set(0);
    setIsHovered(false);
  }

  return (
    <div style={{ perspective: "900px" }}>
      <motion.div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        className={`relative ${className}`}
      >
        <div style={{ transform: "translateZ(12px)" }}>{children}</div>
        {glare && isHovered && (
          <motion.div
            className="pointer-events-none absolute inset-0 rounded-xl"
            style={{
              background: useTransform(
                [glareX, glareY] as any,
                ([x, y]: number[]) =>
                  `radial-gradient(circle at ${x}% ${y}%, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0) 65%)`
              ),
              mixBlendMode: "overlay",
            }}
          />
        )}
      </motion.div>
    </div>
  );
}
