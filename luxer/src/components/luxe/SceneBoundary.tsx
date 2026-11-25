"use client";
import { Component, type ReactNode } from "react";
import { reportClientError } from "@/lib/client-errors";

/**
 * Isola as cenas 3D: se o WebGL falhar (shader, memória, driver) ou o contexto for perdido, a cena dá lugar ao
 * quadro estático equivalente — a página, a rolagem e a compra continuam funcionando — e o erro vai ao monitor.
 */
export class SceneBoundary extends Component<{ name: string; fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) { reportClientError("webgl", error, { scene: this.props.name }); }
  fail = (why: string) => { if (!this.state.failed) { reportClientError("webgl", new Error(why), { scene: this.props.name }); this.setState({ failed: true }); } };
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

/** Para o `onCreated` do Canvas: perda de contexto WebGL (comum em celulares com pouca memória) aciona o fallback. */
export function watchContextLoss(canvas: HTMLCanvasElement, onLost: () => void) {
  canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); onLost(); }, { once: true });
}
