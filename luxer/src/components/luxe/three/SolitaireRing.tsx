"use client";
import { forwardRef, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { METALS, type Metal } from "./metals";

/**
 * Anel solitário procedural: aro com perfil "comfort fit", cabeça de 6 garras e diamante em
 * lapidação brilhante (coroa, mesa e pavilhão facetados). Arte da marca — não representa uma peça do catálogo.
 * A cor do metal é interpolada a cada quadro (troca de acabamento suave).
 */
export const SolitaireRing = forwardRef<THREE.Group, { metal: Metal; quality?: "high" | "low" }>(function SolitaireRing({ metal, quality = "high" }, ref) {
  const target = useRef(new THREE.Color(METALS[metal].color));
  target.current.set(METALS[metal].color);

  const metalMat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: METALS[metal].color, metalness: 1, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.25 }), []); // eslint-disable-line react-hooks/exhaustive-deps
  const diamondMat = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: "#ffffff", metalness: 0, roughness: 0, transmission: 0.95, ior: 2.417, thickness: 0.6,
    dispersion: quality === "high" ? 4 : 0, specularIntensity: 1, envMapIntensity: 3, flatShading: true, transparent: true,
  }), [quality]);

  // aro: anel (torus) achatado no sentido do dedo, para um perfil de joalheria
  const band = useMemo(() => new THREE.TorusGeometry(1, 0.085, quality === "high" ? 48 : 24, quality === "high" ? 180 : 96), [quality]);
  // diamante: perfil de lapidação brilhante girado em 16 facetas
  const diamond = useMemo(() => {
    const pts = [[0.001, -0.43], [0.5, -0.005], [0.5, 0.025], [0.29, 0.165], [0.001, 0.165]].map(([x, y]) => new THREE.Vector2(x, y));
    const g = new THREE.LatheGeometry(pts, 16);
    g.computeVertexNormals();
    return g;
  }, []);
  // garra: haste fina da base da cabeça até a cinta do diamante, levemente curvada para dentro na ponta
  const prongs = useMemo(() => Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const c = (r: number, y: number) => new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
    const curve = new THREE.CatmullRomCurve3([c(0.12, 1.14), c(0.25, 1.36), c(0.325, 1.5), c(0.29, 1.585)]);
    return { tube: new THREE.TubeGeometry(curve, 24, 0.019, 10, false), tip: c(0.29, 1.585) };
  }), []);
  useFrame((_, dt) => {
    metalMat.color.lerp(target.current, Math.min(1, dt * 4));
  });

  return (
    <group ref={ref}>
      <mesh geometry={band} material={metalMat} scale={[1, 1, 1.9]} castShadow />
      {/* cabeça: base (galeria) + garras */}
      <mesh material={metalMat} position={[0, 1.12, 0]}>
        <cylinderGeometry args={[0.14, 0.1, 0.12, 24, 1, true]} />
      </mesh>
      {prongs.map((g, i) => (
        <group key={i}>
          <mesh geometry={g.tube} material={metalMat} />
          <mesh material={metalMat} position={g.tip}><sphereGeometry args={[0.024, 12, 12]} /></mesh>
        </group>
      ))}
      <mesh geometry={diamond} material={diamondMat} position={[0, 1.52, 0]} scale={0.64} />
    </group>
  );
});
