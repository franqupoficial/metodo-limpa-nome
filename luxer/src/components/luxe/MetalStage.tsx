"use client";
import { Suspense, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import type { MotionValue } from "framer-motion";
import { SolitaireRing } from "./three/SolitaireRing";
import { Studio } from "./three/Studio";
import type { Metal } from "./three/metals";
import { useStoreTheme } from "@/components/site/StoreTheme";
import { studioFor } from "@/lib/store-theme";

function Spinning({ metal, spin }: { metal: Metal; spin: MotionValue<number> }) {
  const g = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!g.current) return;
    g.current.rotation.y = spin.get() + state.clock.elapsedTime * 0.08; // mola do framer-motion + respiração lenta
    g.current.rotation.x = 0.28 + Math.sin(state.clock.elapsedTime * 0.6) * 0.02;
  });
  return <group position={[0, -0.35, 0]} scale={0.9}><SolitaireRing ref={g} metal={metal} /></group>;
}

export function MetalStage({ metal, spin, active }: { metal: Metal; spin: MotionValue<number>; active: boolean }) {
  const [dpr, setDpr] = useState<[number, number]>([1, 2]);
  const { theme } = useStoreTheme();
  return (
    <Canvas dpr={dpr} frameloop={active ? "always" : "never"} camera={{ fov: 30, position: [0, 0.4, 6.4] }} gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping }} aria-hidden>
      <PerformanceMonitor onDecline={() => setDpr([1, 1.25])} />
      <Suspense fallback={null}>
        <Studio key={theme} {...studioFor(theme)} />
        <Spinning metal={metal} spin={spin} />
      </Suspense>
    </Canvas>
  );
}
