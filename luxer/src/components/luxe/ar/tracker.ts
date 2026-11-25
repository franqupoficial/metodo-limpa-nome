"use client";
import type { ARRegion, P } from "./pose";

/** Versão do pacote instalado: o WASM do CDN precisa ser exatamente a mesma (conferido em tests/unit/ar.test.ts). */
export const MEDIAPIPE_VERSION = "1.2.3";
const WASM = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const MODELS = {
  hand: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
  face: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
  segment: "https://storage.googleapis.com/mediapipe-models/interactive_segmenter/magic_touch/float32/1/magic_touch.tflite",
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

type Seg = { segment: (src: HTMLCanvasElement, roi: { keypoint: { x: number; y: number } }, cb: (r: { confidenceMasks?: { width: number; height: number; getAsFloat32Array: () => Float32Array }[] }) => void) => void };
let segP: Promise<Seg> | null = null;

/**
 * Segmentador por ponto (MediaPipe Interactive Segmenter, no aparelho): separa joias claras (pérolas) do fundo
 * branco da foto do catálogo, onde a extração por cor não basta. Carregado só quando a peça precisa.
 */
export async function segmentAt(src: HTMLCanvasElement, point: { x: number; y: number }): Promise<Float32Array | null> {
  segP ??= (async () => {
    const vision = await import("@mediapipe/tasks-vision");
    const fileset = await vision.FilesetResolver.forVisionTasks(WASM);
    return (await vision.InteractiveSegmenterLegacy.createFromOptions(fileset, { baseOptions: { modelAssetPath: MODELS.segment }, outputConfidenceMasks: true, outputCategoryMask: false })) as unknown as Seg;
  })();
  const seg = await segP.catch((e) => { segP = null; throw e; });
  return new Promise((ok) => seg.segment(src, { keypoint: point }, (r) => {
    const m = r.confidenceMasks?.[0];
    ok(m && m.width === src.width && m.height === src.height ? new Float32Array(m.getAsFloat32Array()) : null);
  }));
}
