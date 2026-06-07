'use client';

import { useRef, useState, type ReactNode, type MouseEvent } from 'react';

interface TiltContainerProps {
  children: ReactNode;
  className?: string;
}

export function TiltContainer({ children, className }: TiltContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState('perspective(1000px) rotateX(0deg) rotateY(0deg)');

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = containerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const xc = rect.width / 2;
    const yc = rect.height / 2;
    const dx = x - xc;
    const dy = y - yc;

    const maxRotate = 6; // Max rotation angle in degrees
    const rx = -(dy / yc) * maxRotate;
    const ry = (dx / xc) * maxRotate;

    setTransform(`perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg) scale3d(1.015, 1.015, 1.015)`);
  };

  const handleMouseLeave = () => {
    setTransform('perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)');
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform,
        transformStyle: 'preserve-3d',
        transition: 'transform 0.15s cubic-bezier(0.25, 1, 0.5, 1)',
      }}
      className={className}
    >
      {children}
    </div>
  );
}
