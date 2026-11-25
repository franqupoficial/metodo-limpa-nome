"use client";
import { Environment, Lightformer } from "@react-three/drei";

/**
 * Estúdio fotográfico procedural (sem baixar HDR externo): softboxes e faixas de luz
 * desenhadas no mapa de ambiente — são elas que criam os reflexos longos no ouro e o brilho do diamante.
 */
export function Studio({ intensity = 1 }: { intensity?: number }) {
  return (
    <>
      <ambientLight intensity={0.15} />
      <directionalLight position={[3, 5, 4]} intensity={1.1 * intensity} />
      <Environment resolution={256} frames={1}>
        <color attach="background" args={["#050505"]} />
        <Lightformer form="rect" intensity={3 * intensity} position={[0, 4, -2]} scale={[10, 1.2, 1]} rotation-x={Math.PI / 2} />
        <Lightformer form="rect" intensity={2 * intensity} position={[-5, 1, 1]} scale={[1, 6, 1]} rotation-y={Math.PI / 2} />
        <Lightformer form="rect" intensity={2 * intensity} position={[5, 1, 1]} scale={[1, 6, 1]} rotation-y={-Math.PI / 2} />
        <Lightformer form="ring" color="#fff2d6" intensity={4 * intensity} position={[0, 1, 5]} scale={2.5} />
        <Lightformer form="rect" intensity={0.6 * intensity} position={[0, -3, 0]} scale={[8, 8, 1]} rotation-x={-Math.PI / 2} />
      </Environment>
    </>
  );
}
