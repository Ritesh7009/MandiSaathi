import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useTheme } from '../../context/ThemeContext';

interface ThreeTerrainBackdropProps {
  className?: string;
  audioLevel?: number;
  isActive?: boolean;
}

/**
 * Interactive Three.js WebGL Topographic Shader Field (ThreeUI inspired).
 * Voice-reactive: live microphone RMS level and active Gnani pipeline states smoothly modulate
 * GLSL vertex elevation ripples and saffron peak luminosity at 60fps without recreating the renderer.
 */
export const ThreeTerrainBackdrop: React.FC<ThreeTerrainBackdropProps> = ({
  className = '',
  audioLevel = 0,
  isActive = false,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const { theme } = useTheme();
  const [fallbackActive, setFallbackActive] = useState(false);

  const liveStateRef = useRef({ audioLevel: 0, isActive: false, isDark: false });
  useEffect(() => {
    liveStateRef.current.audioLevel = Math.min(1, Math.max(0, audioLevel));
    liveStateRef.current.isActive = isActive;
    liveStateRef.current.isDark = theme === 'dark';
  }, [audioLevel, isActive, theme]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      setFallbackActive(true);
      return;
    }

    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    } catch {
      setFallbackActive(true);
      return;
    }

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 360;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(width, height);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 2.3, 4.4);
    camera.lookAt(0, 0, 0);

    const geometry = new THREE.PlaneGeometry(14, 7.5, 68, 34);
    const uniforms = {
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uDark: { value: liveStateRef.current.isDark ? 1.0 : 0.0 },
      uAudio: { value: 0.0 },
      uActive: { value: 0.0 },
    };

    const material = new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      depthWrite: false,
      vertexShader: `
        uniform float uTime;
        uniform vec2 uMouse;
        uniform float uAudio;
        uniform float uActive;
        varying float vElevation;
        varying vec2 vUv;

        void main() {
          vUv = uv;
          vec3 pos = position;
          float d = length(pos.xy * 0.35 - uMouse * 1.1);
          float speed = 1.0 + uActive * 0.9;
          float w1 = sin(pos.x * 0.85 + uTime * 0.45 * speed) * cos(pos.y * 1.15 - uTime * 0.32) * (0.28 + uAudio * 0.24);
          float w2 = sin((pos.x + pos.y) * 1.5 - uTime * 0.55) * (0.12 + uAudio * 0.14);
          float centerPulse = exp(-length(pos.xy * 0.4)) * sin(length(pos.xy) * 2.8 - uTime * 3.2) * (uAudio * 0.36 + uActive * 0.08);
          float ripple = exp(-d * 1.8) * (0.22 + uAudio * 0.15) * sin(d * 6.0 - uTime * 1.6);
          pos.z += w1 + w2 + ripple + centerPulse;
          vElevation = pos.z;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uDark;
        uniform float uAudio;
        uniform float uActive;
        varying float vElevation;
        varying vec2 vUv;

        void main() {
          float scaled = (vElevation + 0.5) * 14.0;
          float grid = abs(fract(scaled - 0.5) - 0.5) / fwidth(scaled);
          float contour = 1.0 - smoothstep(0.0, 1.35, grid);

          vec3 emeraldLight = vec3(0.043, 0.310, 0.216);
          vec3 emeraldDark  = vec3(0.063, 0.725, 0.506);
          vec3 saffron      = vec3(0.851, 0.467, 0.024);

          vec3 baseColor = mix(emeraldLight, emeraldDark, uDark);
          float peakFactor = smoothstep(0.14, 0.44, vElevation + uAudio * 0.12);
          vec3 color = mix(baseColor, saffron, peakFactor * (0.52 + uActive * 0.22));

          float edgeFade = smoothstep(0.0, 0.18, vUv.x) * smoothstep(1.0, 0.82, vUv.x)
                         * smoothstep(0.0, 0.22, vUv.y) * smoothstep(1.0, 0.78, vUv.y);

          float intensityBoost = 1.0 + uActive * 0.25 + uAudio * 0.35;
          float alpha = contour * edgeFade * mix(0.22, 0.32, uDark) * intensityBoost;
          gl_FragColor = vec4(color, min(alpha, 0.65));
        }
      `,
    });

    const terrainMesh = new THREE.Mesh(geometry, material);
    terrainMesh.rotation.x = -Math.PI * 0.42;
    scene.add(terrainMesh);

    const finePointer = window.matchMedia('(pointer: fine)').matches;
    const targetMouse = new THREE.Vector2(0, 0);

    const handlePointerMove = (e: MouseEvent) => {
      if (!finePointer) return;
      const rect = container.getBoundingClientRect();
      targetMouse.x = ((e.clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1;
      targetMouse.y = -(((e.clientY - rect.top) / Math.max(rect.height, 1)) * 2 - 1);
    };

    window.addEventListener('mousemove', handlePointerMove, { passive: true });

    const handleResize = () => {
      if (!container || !renderer) return;
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 360;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    let rafId = 0;
    let isVisible = true;
    const clock = new THREE.Clock();

    const visObserver = new IntersectionObserver(
      (entries) => {
        isVisible = entries.some((e) => e.isIntersecting);
      },
      { threshold: 0.05 }
    );
    visObserver.observe(container);

    const renderLoop = () => {
      rafId = requestAnimationFrame(renderLoop);
      if (!isVisible || !renderer) return;

      const { audioLevel: amp, isActive: activeFlag, isDark } = liveStateRef.current;
      uniforms.uTime.value = clock.getElapsedTime();
      uniforms.uMouse.value.lerp(targetMouse, 0.06);
      uniforms.uAudio.value += (amp - uniforms.uAudio.value) * 0.14;
      uniforms.uActive.value += ((activeFlag ? 1.0 : 0.0) - uniforms.uActive.value) * 0.1;
      uniforms.uDark.value += ((isDark ? 1.0 : 0.0) - uniforms.uDark.value) * 0.12;
      renderer.render(scene, camera);
    };
    renderLoop();

    return () => {
      cancelAnimationFrame(rafId);
      visObserver.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener('mousemove', handlePointerMove);
      geometry.dispose();
      material.dispose();
      renderer?.dispose();
    };
  }, []);

  if (fallbackActive) {
    return (
      <div
        aria-hidden="true"
        className={`absolute inset-0 pointer-events-none opacity-45 bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.12),transparent_60%),radial-gradient(ellipse_at_bottom_left,rgba(217,119,6,0.08),transparent_55%)] ${className}`}
      />
    );
  }

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      className={`absolute inset-0 pointer-events-none overflow-hidden select-none ${className}`}
    />
  );
};
