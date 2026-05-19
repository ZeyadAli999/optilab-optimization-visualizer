import type { MethodId } from "./types";

export type PlaybackMeta = {
  hasPlayback: boolean;
  maxStep: number;
  stepLabel: string;
  reasonIfDisabled?: string;
};

export function getPlaybackMeta(input: {
  method: MethodId;
  compareTwo: boolean;
  compareAll: boolean;
  goldenLength: number;
  fibonacciLength: number;
  numericalLength: number;
  steepestLength: number;
  lpCornerCount: number;
  constrainedPathLength: number;
  acoLength: number;
  compareTwoCurveLength: number;
  compareAllCurveLength: number;
}): PlaybackMeta {
  if (input.compareAll) return fromLength(input.compareAllCurveLength, "chart step", "No step-by-step comparison curve is available.");
  if (input.compareTwo) return fromLength(input.compareTwoCurveLength, "chart step", "No step-by-step comparison curve is available for the selected pair.");

  if (input.method === "golden") return fromLength(input.goldenLength, "iteration", "No Golden Section iteration history is available.");
  if (input.method === "fibonacci") return fromLength(input.fibonacciLength, "iteration", "No Fibonacci iteration history is available.");
  if (input.method === "numerical") return fromLength(input.numericalLength, "Newton iteration", "No Newton iteration history is available.");
  if (input.method === "steepest") return fromLength(input.steepestLength, "iteration", "No steepest-method iteration history is available.");
  if (input.method === "linear") return fromLength(input.lpCornerCount, "corner", "No feasible corner-by-corner playback is available.");
  if (input.method === "equality" || input.method === "inequality" || input.method === "penalty") {
    return fromLength(input.constrainedPathLength, "path step", "No sampled path is available for this constrained problem.");
  }
  if (input.method === "aco") return fromLength(input.acoLength, "ACO iteration", "No ACO iteration history is available.");

  if (input.method === "lagrange") {
    return disabled("Symbolic trace, no playback. Use the derivation table below.");
  }
  if (input.method === "nonlinear") {
    return disabled("No step-by-step simulation available for this Hessian classification screen.");
  }
  return disabled("No step-by-step simulation available for this method.");
}

export function clampPlaybackStep(step: number, meta: PlaybackMeta) {
  if (!meta.hasPlayback) return 0;
  return Math.max(0, Math.min(step, meta.maxStep));
}

function fromLength(length: number, stepLabel: string, reasonIfDisabled: string): PlaybackMeta {
  const count = Number.isFinite(length) ? Math.max(0, Math.floor(length)) : 0;
  if (count <= 1) return disabled(reasonIfDisabled, stepLabel);
  return { hasPlayback: true, maxStep: count - 1, stepLabel };
}

function disabled(reasonIfDisabled: string, stepLabel = "step"): PlaybackMeta {
  return { hasPlayback: false, maxStep: 0, stepLabel, reasonIfDisabled };
}
