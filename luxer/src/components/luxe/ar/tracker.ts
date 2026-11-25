"use client";
import type { ARRegion, P } from "./pose";

/** Versão do pacote instalado: o WASM do CDN precisa ser exatamente a mesma (conferido em tests/unit/ar.test.ts). */
export const MEDIAPIPE_VERSION = "1.2.3";
const WASM = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const MODELS = {
  hand: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
  face: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
};

export type Tracker = { detect: (src: HTMLVideoElement | HTMLImageElement, t: number) => P[] | null; close: () => void };

/** Carrega o modelo da categoria (mão para anel/pulseira; rosto para brinco/colar). Roda inteiramente no aparelho. */
export async function createTracker(region: ARRegion): Promise<Tracker> {
  const vision = await import("@mediapipe/tasks-vision");
  const fileset = await vision.FilesetResolver.forVisionTasks(WASM);
  const make = async (delegate: "GPU" | "CPU") => region === "hand" || region === "wrist"
    ? vision.HandLandmarker.createFromOptions(fileset, { baseOptions: { modelAssetPath: MODELS.hand, delegate }, runningMode: "VIDEO", numHands: 1, minHandDetectionConfidence: 0.5, minTrackingConfidence: 0.5 })
    : vision.FaceLandmarker.createFromOptions(fileset, { baseOptions: { modelAssetPath: MODELS.face, delegate }, runningMode: "VIDEO", numFaces: 1 });
  // GPU quando disponível; senão CPU (ex.: navegadores sem WebGL2)
  const lm = await make("GPU").catch(() => make("CPU"));
  return {
    detect(src, t) {
      const r = lm.detectForVideo(src, t) as { landmarks?: P[][]; faceLandmarks?: P[][] };
      return (r.landmarks ?? r.faceLandmarks)?.[0] ?? null;
    },
    close: () => lm.close(),
  };
}
