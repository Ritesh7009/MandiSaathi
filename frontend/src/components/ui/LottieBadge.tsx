import React, { useEffect, useRef } from 'react';
import type { AnimationItem } from 'lottie-web/build/player/lottie_light';
import {
  VOICE_PULSE_LOTTIE,
  VERIFIED_CHECK_LOTTIE,
  EMPTY_RADAR_LOTTIE,
} from '../../assets/lottie/animations';

interface LottieBadgeProps {
  variant: 'voice' | 'check' | 'empty';
  loop?: boolean;
  className?: string;
}

const DATA_MAP = {
  voice: VOICE_PULSE_LOTTIE,
  check: VERIFIED_CHECK_LOTTIE,
  empty: EMPTY_RADAR_LOTTIE,
};

/**
 * Vector Lottie animation wrapper honoring prefers-reduced-motion.
 */
export const LottieBadge: React.FC<LottieBadgeProps> = ({
  variant,
  loop = false,
  className = 'w-14 h-14',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motionPreference.matches) return;

    let animation: AnimationItem | undefined;
    let disposed = false;
    import('lottie-web/build/player/lottie_light').then(({ default: lottie }) => {
      if (disposed || motionPreference.matches) return;
      animation = lottie.loadAnimation({
        container: el,
        renderer: 'svg',
        loop,
        autoplay: true,
        animationData: DATA_MAP[variant],
      });
    }).catch(() => {
      // The surrounding icon and status still communicate the state.
    });

    const handleMotionChange = () => {
      if (motionPreference.matches) animation?.pause();
      else animation?.play();
    };
    motionPreference.addEventListener('change', handleMotionChange);
    return () => {
      disposed = true;
      motionPreference.removeEventListener('change', handleMotionChange);
      animation?.destroy();
    };
  }, [variant, loop]);

  return <div ref={containerRef} aria-hidden="true" className={className} />;
};

