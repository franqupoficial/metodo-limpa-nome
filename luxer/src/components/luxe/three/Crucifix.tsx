"use client";
import { forwardRef, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { METALS, type Metal } from "./metals";

/**
 * Crucifixo procedural em ouro 18k para a abertura da home (arte da marca — não representa uma peça do catálogo).
 * Mesmo enquadramento do antigo solitário: o cruzamento e o Cristo ficam onde estava a cravação (y ≈ 1),
 * para a câmera da coreografia de scroll (close-up) cair no detalhe sem mudar a animação.
 * A cruz tem bordas chanfradas (reflexos longos do estúdio); o Cristo, acabamento acetinado, em relevo
 * nas duas faces — a peça gira 180° na rolagem e o detalhe nunca fica de costas.
 */

/** Contorno da cruz com pontas levemente alargadas (pattée suave). */
function crossShape() {
  const w = 0.13, f = 0.17, top = 1.58, bot = -1.55, arm = 0.86, cy = 0.95, h = 0.13;
  const s = new THREE.Shape();
  s.moveTo(-w, bot);
  s.lineTo(-f, bot - 0.02); s.lineTo(f, bot - 0.02); s.lineTo(w, bot);           // pé alargado
  s.lineTo(w, cy - h);
  s.lineTo(arm, cy - f); s.lineTo(arm + 0.02, cy - f); s.lineTo(arm + 0.02, cy + f); s.lineTo(arm, cy + f); // braço direito
  s.lineTo(w, cy + h);
  s.lineTo(w, top); s.lineTo(f, top + 0.02); s.lineTo(-f, top + 0.02); s.lineTo(-w, top); // topo
  s.lineTo(-w, cy + h);
  s.lineTo(-arm, cy + f); s.lineTo(-arm - 0.02, cy + f); s.lineTo(-arm - 0.02, cy - f); s.lineTo(-arm, cy - f); // braço esquerdo
  s.lineTo(-w, cy - h);
  s.closePath();
  return s;
}

/** Silhueta estilizada do Cristo (braços abertos sobre a trave, perizônio, pés unidos), em curvas suaves. */
function corpusShape() {
  // metade direita, do pescoço aos pés; a esquerda é o espelho
  const half: [number, number][] = [
    [0.0, 1.07], [0.07, 1.055], [0.2, 1.03], [0.42, 1.0], [0.6, 0.985], [0.69, 0.975], [0.705, 0.955],
    [0.66, 0.945], [0.44, 0.94], [0.22, 0.93], [0.12, 0.88], [0.115, 0.7], [0.095, 0.56],
    [0.135, 0.5], [0.14, 0.4], [0.08, 0.35], [0.072, 0.12], [0.052, -0.14], [0.036, -0.33], [0.0, -0.38],
  ];
  const v = (pts: [number, number][]) => pts.map(([x, y]) => new THREE.Vector2(x, y));
  const s = new THREE.Shape();
  s.moveTo(0, 1.07);
  s.splineThru(v(half.slice(1)));
  s.splineThru(v([...half].reverse().slice(1).map(([x, y]) => [-x, y] as [number, number])));
  s.closePath();
  return s;
}

export const Crucifix = forwardRef<THREE.Group, { metal: Metal; quality?: "high" | "low" }>(function Crucifix({ metal, quality = "high" }, ref) {
  const target = useRef(new THREE.Color(METALS[metal].color));
  target.current.set(METALS[metal].color);
  // faces planas refletem o fundo como espelho; um polimento levemente acetinado mantém o ouro luminoso nos dois temas
  const polished = useMemo(() => new THREE.MeshPhysicalMaterial({ color: METALS[metal].color, metalness: 1, roughness: 0.26, clearcoat: 0.6, clearcoatRoughness: 0.08, envMapIntensity: 1.6 }), []); // eslint-disable-line react-hooks/exhaustive-deps
  const satin = useMemo(() => new THREE.MeshPhysicalMaterial({ color: METALS[metal].color, metalness: 1, roughness: 0.32, envMapIntensity: 1.15 }), []); // eslint-disable-line react-hooks/exhaustive-deps

  const seg = quality === "high" ? 6 : 3;
  const cross = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(crossShape(), { depth: 0.08, bevelEnabled: true, bevelThickness: 0.055, bevelSize: 0.045, bevelSegments: seg + 2, curveSegments: 4 });
    g.translate(0, 0, -0.04);
    g.computeVertexNormals();
    return g;
  }, [seg]);
  const corpus = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(corpusShape(), { depth: 0.02, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.018, bevelSegments: seg + 2, curveSegments: 10 });
    g.computeVertexNormals();
    return g;
  }, [seg]);
  const head = useMemo(() => new THREE.SphereGeometry(0.072, 32, 24), []);

  useFrame((_, dt) => {
    const k = Math.min(1, dt * 4);
    polished.color.lerp(target.current, k);
    satin.color.lerp(target.current, k);
  });

  const face = (z: number, flip: boolean) => (
    <group position={[0, 0, z]} rotation={[0, flip ? Math.PI : 0, 0]}>
      <mesh geometry={corpus} material={satin} />
      <mesh geometry={head} material={satin} position={[0.045, 1.115, 0.03]} rotation={[0, 0, -0.35]} scale={[0.78, 0.95, 0.62]} />
      {/* titulus: plaquinha lisa acima da cabeça */}
      <mesh material={polished} position={[0, 1.36, 0.01]}><boxGeometry args={[0.2, 0.08, 0.03]} /></mesh>
    </group>
  );

  return (
    <group ref={ref}>
      {/* mesma área ocupada pela antiga aliança: a coreografia enquadra igual */}
      <group scale={0.8} position={[0, 0.25, 0]}>
      <mesh geometry={cross} material={polished} castShadow />
      {face(0.095, false)}
      {face(-0.095, true)}
      {/* argola do pingente, perpendicular ao plano da cruz */}
      <mesh material={polished} position={[0, 1.76, 0]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.13, 0.034, quality === "high" ? 20 : 12, quality === "high" ? 48 : 24]} />
      </mesh>
      </group>
    </group>
  );
});
