import React, { useEffect, useRef } from 'react';

/**
 * AgriContourBackdrop
 * Inspired by ThreeJS / ThreeUI terrain visualization & topographic contour cartography.
 * Renders an organic, authentic alluvial field contour map in the hero section.
 * Zero AI slop: no purple glows or generic floating spheres.
 * Auto-pauses off-screen via IntersectionObserver and respects prefers-reduced-motion.
 */
export const AgriContourBackdrop: React.FC<{ className?: string }> = ({ className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    // Check user's motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let animationFrameId: number;
    let isVisible = true;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 800);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 260);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
      drawStatic();
    };

    window.addEventListener('resize', handleResize);

    // IntersectionObserver to sleep when scrolled out of view
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isVisible = entry.isIntersecting;
          if (isVisible && !prefersReducedMotion) {
            cancelAnimationFrame(animationFrameId);
            animate();
          }
        });
      },
      { threshold: 0.1 }
    );
    observer.observe(canvas);

    // Dynamic Topographic Wave Coordinates
    const numCurves = 7;
    let t = 0;

    const drawStatic = () => {
      ctx.clearRect(0, 0, width, height);
      for (let i = 0; i < numCurves; i++) {
        const yBase = (height * 0.35) + (i * 22);
        ctx.beginPath();
        ctx.moveTo(0, yBase);
        for (let x = 0; x <= width; x += 30) {
          const wave = Math.sin(x * 0.004 + i * 0.8) * 16 + Math.cos(x * 0.008 + i * 0.4) * 10;
          ctx.lineTo(x, yBase + wave);
        }
        ctx.strokeStyle = `rgba(23, 75, 53, ${0.04 + i * 0.015})`;
        ctx.lineWidth = 1.25;
        ctx.stroke();
      }
    };

    const animate = () => {
      if (!isVisible || prefersReducedMotion) {
        drawStatic();
        return;
      }

      ctx.clearRect(0, 0, width, height);
      t += 0.008;

      for (let i = 0; i < numCurves; i++) {
        const yBase = (height * 0.3) + (i * 20);
        ctx.beginPath();
        ctx.moveTo(0, yBase);

        for (let x = 0; x <= width; x += 25) {
          const wave1 = Math.sin(x * 0.004 + t + i * 0.7) * 18;
          const wave2 = Math.cos(x * 0.007 - t * 0.5 + i * 0.5) * 12;
          const elevation = wave1 + wave2;
          ctx.lineTo(x, yBase + elevation);
        }

        // Deep agricultural alluvial forest line with gradient opacity
        const opacity = 0.035 + (i / numCurves) * 0.055;
        ctx.strokeStyle = `rgba(23, 75, 53, ${opacity})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Subtle topographic height tick marks at every 180px
        for (let markX = 60 + (i * 30); markX < width; markX += 180) {
          const markY = yBase + Math.sin(markX * 0.004 + t + i * 0.7) * 18;
          ctx.fillStyle = `rgba(158, 101, 0, ${opacity * 1.5})`;
          ctx.beginPath();
          ctx.arc(markX, markY, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    if (prefersReducedMotion) {
      drawStatic();
    } else {
      animate();
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className={`absolute inset-0 pointer-events-none overflow-hidden select-none opacity-80 ${className}`}
    >
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
};
