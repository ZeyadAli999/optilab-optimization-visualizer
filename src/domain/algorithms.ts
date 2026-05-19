import type {
  ConstrainedProblem,
  ConstrainedResult,
  GradientResult,
  LpProblem,
  LpResult,
  OneDIteration,
  Point,
  SearchResult
} from "./types";
import { finiteDifferenceGradient, norm } from "./math";

export function goldenSectionSearch(
  fn: (x: number) => number,
  a0: number,
  b0: number,
  tolerance = 1e-5,
  maxIterations = 80,
  mode: "min" | "max" = "min"
): SearchResult {
  const started = performance.now();
  if (!Number.isFinite(a0) || !Number.isFinite(b0) || b0 <= a0 || !Number.isFinite(tolerance) || tolerance <= 0) {
    return emptySearchResult(started, "Invalid interval or tolerance for Golden Section Search.");
  }
  const objective = (x: number) => (mode === "max" ? -fn(x) : fn(x));
  const phi = (1 + Math.sqrt(5)) / 2;
  const invPhi = 1 / phi;
  let a = a0;
  let b = b0;
  let c = b - invPhi * (b - a);
  let d = a + invPhi * (b - a);
  let fc = objective(c);
  let fd = objective(d);
  let evaluations = 2;
  const history: OneDIteration[] = [];

  for (let k = 1; k <= maxIterations && Math.abs(b - a) > tolerance; k += 1) {
    if (!Number.isFinite(fc) || !Number.isFinite(fd)) return emptySearchResult(started, "The function produced a non-finite value during Golden Section Search.");
    if (fc > fd) {
      history.push({ k, a, b, c, d, fc: fn(c), fd: fn(d), length: b - a, ratio: invPhi, nextA: c, nextB: b });
      a = c;
      c = d;
      fc = fd;
      d = a + invPhi * (b - a);
      fd = objective(d);
    } else {
      history.push({ k, a, b, c, d, fc: fn(c), fd: fn(d), length: b - a, ratio: invPhi, nextA: a, nextB: d });
      b = d;
      d = c;
      fd = fc;
      c = b - invPhi * (b - a);
      fc = objective(c);
    }
    evaluations += 1;
  }

  const x = (a + b) / 2;
  return {
    x,
    fx: fn(x),
    iterations: history.length,
    evaluations: evaluations + 1,
    intervalLength: Math.abs(b - a),
    history,
    runtimeMs: performance.now() - started,
    status: Math.abs(b - a) <= tolerance ? "converged" : "max-iterations",
    methodType: "approximate",
    message: Math.abs(b - a) <= tolerance ? "Stopped because the uncertainty interval is within tolerance." : "Stopped because the maximum iteration count was reached."
  };
}

export function fibonacciSearch(
  fn: (x: number) => number,
  a0: number,
  b0: number,
  n = 9,
  mode: "min" | "max" = "min"
): SearchResult {
  const started = performance.now();
  if (!Number.isFinite(a0) || !Number.isFinite(b0) || b0 <= a0 || !Number.isFinite(n) || n < 4) {
    return emptySearchResult(started, "Invalid interval or Fibonacci step count.");
  }
  const objective = (x: number) => (mode === "max" ? -fn(x) : fn(x));
  const fib = [1, 1];
  for (let i = 2; i <= n; i += 1) fib[i] = fib[i - 1] + fib[i - 2];

  let a = a0;
  let b = b0;
  let c = a + (fib[n - 2] / fib[n]) * (b - a);
  let d = a + (fib[n - 1] / fib[n]) * (b - a);
  let fc = objective(c);
  let fd = objective(d);
  let evaluations = 2;
  const history: OneDIteration[] = [];
  if (!Number.isFinite(fc) || !Number.isFinite(fd)) return emptySearchResult(started, "The function produced a non-finite value at the initial Fibonacci points.");

  for (let k = 1; k <= n - 2; k += 1) {
    if (!Number.isFinite(fc) || !Number.isFinite(fd)) return emptySearchResult(started, "The function produced a non-finite value during Fibonacci Search.");
    const denominator = fib[n - k + 1] ?? fib[n - k];
    if (fc > fd) {
      history.push({
        k,
        a,
        b,
        c,
        d,
        fc: fn(c),
        fd: fn(d),
        length: b - a,
        ratio: fib[n - k] / denominator,
        nextA: c,
        nextB: b
      });
      a = c;
      c = d;
      fc = fd;
      d = a + (fib[n - k - 1] / fib[n - k]) * (b - a);
      fd = objective(d);
    } else {
      history.push({
        k,
        a,
        b,
        c,
        d,
        fc: fn(c),
        fd: fn(d),
        length: b - a,
        ratio: fib[n - k] / denominator,
        nextA: a,
        nextB: d
      });
      b = d;
      d = c;
      fd = fc;
      c = a + (fib[n - k - 2] / fib[n - k]) * (b - a);
      fc = objective(c);
    }
    evaluations += 1;
  }

  const x = (c + d) / 2;
  const fx = fn(x);
  if (!Number.isFinite(fx)) return emptySearchResult(started, "The final Fibonacci candidate produced a non-finite function value.");
  return {
    x,
    fx,
    iterations: history.length,
    evaluations: evaluations + 1,
    intervalLength: Math.abs(b - a),
    history,
    runtimeMs: performance.now() - started,
    status: "converged",
    methodType: "approximate",
    message: "Stopped after the planned Fibonacci interval reductions."
  };
}

export function gridSearch(
  fn: (x: number) => number,
  a0: number,
  b0: number,
  samples = 201,
  mode: "min" | "max" = "min"
): SearchResult {
  const started = performance.now();
  const count = Math.max(3, Math.min(2001, Math.round(samples)));
  if (!Number.isFinite(a0) || !Number.isFinite(b0) || b0 <= a0) {
    return emptySearchResult(started, "Invalid interval for grid search.");
  }
  const history: OneDIteration[] = [];
  let bestX = NaN;
  let bestFx = mode === "max" ? -Infinity : Infinity;
  for (let i = 0; i < count; i += 1) {
    const x = a0 + ((b0 - a0) * i) / (count - 1);
    const fx = fn(x);
    if (!Number.isFinite(fx)) continue;
    const better = mode === "max" ? fx > bestFx : fx < bestFx;
    if (better) {
      bestX = x;
      bestFx = fx;
    }
    history.push({ k: i + 1, a: a0, b: b0, c: x, d: bestX, fc: fx, fd: bestFx, length: Math.abs(b0 - a0) / (count - 1) });
  }
  if (!Number.isFinite(bestX)) return emptySearchResult(started, "The function could not be evaluated on the grid.");
  return {
    x: bestX,
    fx: bestFx,
    iterations: history.length,
    evaluations: history.length,
    intervalLength: Math.abs(b0 - a0) / (count - 1),
    history,
    runtimeMs: performance.now() - started,
    status: "converged",
    methodType: "approximate",
    message: "Selected the best sampled point on a uniform numerical grid."
  };
}

export function steepestDescent(
  fn: (p: Point) => number,
  grad: (p: Point) => Point,
  start: Point,
  stepSize = 0.1,
  tolerance = 1e-4,
  maxIterations = 120,
  mode: "min" | "max" = "min"
): GradientResult {
  const started = performance.now();
  if (!Number.isFinite(stepSize) || stepSize <= 0 || maxIterations <= 0) {
    return {
      point: start,
      value: fn(start),
      iterations: 0,
      evaluations: 1,
      history: [],
      runtimeMs: performance.now() - started,
      status: "invalid",
      message: "Step size must be positive and max iterations must be greater than zero."
    };
  }
  let point = start;
  const history = [];
  let evaluations = 0;

  for (let k = 0; k < maxIterations; k += 1) {
    const gradient = grad(point);
    const gradientNorm = norm(gradient);
    const value = fn(point);
    if (!Number.isFinite(gradient.x) || !Number.isFinite(gradient.y) || !Number.isFinite(value)) {
      return {
        point,
        value,
        iterations: history.length,
        evaluations,
        history,
        runtimeMs: performance.now() - started,
        status: "failed",
        message: "The objective or gradient produced a non-finite value."
      };
    }
    evaluations += 2;
    const direction = mode === "max" ? 1 : -1;
    const next = {
      x: point.x + direction * stepSize * gradient.x,
      y: point.y + direction * stepSize * gradient.y
    };
    history.push({ k, point, gradient, stepSize, next, value, gradientNorm });
    point = next;
    const nextValue = fn(point);
    if (!Number.isFinite(nextValue) || Math.abs(point.x) > 1e8 || Math.abs(point.y) > 1e8) {
      return {
        point,
        value: nextValue,
        iterations: history.length,
        evaluations: evaluations + 1,
        history,
        runtimeMs: performance.now() - started,
        status: "diverged",
        message: "The iteration appears to diverge; reduce the step size α."
      };
    }
    if (gradientNorm < tolerance) {
      return {
        point,
        value: fn(point),
        iterations: history.length,
        evaluations: evaluations + 1,
        history,
        runtimeMs: performance.now() - started,
        status: "converged",
        message: "Stopped because the gradient norm is within tolerance."
      };
    }
  }

  return {
    point,
    value: fn(point),
    iterations: history.length,
    evaluations: evaluations + 1,
    history,
    runtimeMs: performance.now() - started,
    status: "max-iterations",
    message: "Stopped because the maximum iteration count was reached."
  };
}

export function newtonOneDimensional(
  derivative: (x: number) => number,
  secondDerivative: (x: number) => number,
  objective: (x: number) => number,
  x0: number,
  maxIterations = 12,
  tolerance = 1e-6
): SearchResult {
  const started = performance.now();
  let x = x0;
  let evaluations = 0;
  const history: OneDIteration[] = [];
  for (let k = 1; k <= maxIterations; k += 1) {
    const g = derivative(x);
    const h = secondDerivative(x);
    evaluations += 2;
    if (Math.abs(h) < 1e-12 || !Number.isFinite(g) || !Number.isFinite(h)) break;
    const next = x - g / h;
    history.push({ k, a: x, b: next, c: x, d: next, fc: g, fd: h, length: Math.abs(next - x) });
    x = next;
    if (Math.abs(g) < tolerance) break;
  }
  return {
    x,
    fx: objective(x),
    iterations: history.length,
    evaluations: evaluations + 1,
    intervalLength: history.at(-1)?.length ?? 0,
    history,
    runtimeMs: performance.now() - started,
    status: Math.abs(derivative(x)) < tolerance ? "converged" : "max-iterations",
    methodType: "numerical",
    message: Math.abs(derivative(x)) < tolerance ? "Stopped because f'(x) is approximately zero." : "Stopped because Newton iteration did not meet tolerance."
  };
}

const satisfies = (constraint: LpProblem["constraints"][number], p: Point, eps = 1e-8) => {
  const lhs = constraint.a * p.x + constraint.b * p.y;
  if (constraint.relation === "<=") return lhs <= constraint.c + eps;
  if (constraint.relation === ">=") return lhs >= constraint.c - eps;
  return Math.abs(lhs - constraint.c) <= eps;
};

export function solveLinearProgram(problem: LpProblem): LpResult {
  const boundaries = problem.constraints;
  const points: Point[] = [];

  for (let i = 0; i < boundaries.length; i += 1) {
    for (let j = i + 1; j < boundaries.length; j += 1) {
      const p = intersect(boundaries[i], boundaries[j]);
      if (p && boundaries.every((c) => satisfies(c, p))) points.push(p);
    }
  }

  const unique = uniquePoints(points).map((p) => ({
    ...p,
    value: problem.objective.x * p.x + problem.objective.y * p.y,
    active: boundaries.filter((c) => Math.abs(c.a * p.x + c.b * p.y - c.c) < 1e-5).map((c) => c.label)
  }));

  if (unique.length === 0) {
    return { corners: [], optimum: { x: NaN, y: NaN, value: NaN, active: [] }, status: "infeasible" };
  }

  const optimum = unique.reduce((best, candidate) => {
    return problem.mode === "max"
      ? candidate.value > best.value
        ? candidate
        : best
      : candidate.value < best.value
        ? candidate
        : best;
  }, unique[0]);

  return { corners: unique, optimum, status: appearsUnbounded(problem) ? "unbounded" : "bounded" };
}

function intersect(a: LpProblem["constraints"][number], b: LpProblem["constraints"][number]): Point | null {
  const determinant = a.a * b.b - b.a * a.b;
  if (Math.abs(determinant) < 1e-10) return null;
  return {
    x: (a.c * b.b - b.c * a.b) / determinant,
    y: (a.a * b.c - b.a * a.c) / determinant
  };
}

function uniquePoints(points: Point[]) {
  return points.filter(
    (p, index) => points.findIndex((q) => Math.hypot(p.x - q.x, p.y - q.y) < 1e-6) === index
  );
}

function appearsUnbounded(problem: LpProblem) {
  const objective = problem.objective;
  for (let i = 0; i < 360; i += 1) {
    const angle = (2 * Math.PI * i) / 360;
    const direction = { x: Math.cos(angle), y: Math.sin(angle) };
    const feasibleRay = problem.constraints.every((constraint) => {
      const lhs = constraint.a * direction.x + constraint.b * direction.y;
      if (constraint.relation === "<=") return lhs <= 1e-8;
      if (constraint.relation === ">=") return lhs >= -1e-8;
      return Math.abs(lhs) <= 1e-8;
    });
    if (!feasibleRay) continue;
    const objectiveDirection = objective.x * direction.x + objective.y * direction.y;
    if (problem.mode === "max" && objectiveDirection > 1e-8) return true;
    if (problem.mode === "min" && objectiveDirection < -1e-8) return true;
  }
  return false;
}

function emptySearchResult(started: number, message = "Invalid search input."): SearchResult {
  return {
    x: NaN,
    fx: NaN,
    iterations: 0,
    evaluations: 0,
    intervalLength: NaN,
    history: [],
    runtimeMs: performance.now() - started,
    status: "invalid",
    methodType: "not-applicable",
    message
  };
}

export function solveConstrainedByGrid(problem: ConstrainedProblem, resolution = 90): ConstrainedResult {
  const [xmin, xmax] = problem.bounds.x;
  const [ymin, ymax] = problem.bounds.y;
  const feasibleCandidates: Array<Point & { value: number; active: string[] }> = [];

  for (let i = 0; i <= resolution; i += 1) {
    for (let j = 0; j <= resolution; j += 1) {
      const point = {
        x: xmin + ((xmax - xmin) * i) / resolution,
        y: ymin + ((ymax - ymin) * j) / resolution
      };
      if (isFeasible(problem, point)) {
        feasibleCandidates.push({
          ...point,
          value: problem.objective(point),
          active: activeConstraints(problem, point)
        });
      }
    }
  }

  const point = feasibleCandidates.reduce(
    (best, candidate) => (candidate.value < best.value ? candidate : best),
    feasibleCandidates[0] ?? { x: NaN, y: NaN, value: NaN, active: [] }
  );

  return {
    point,
    value: point.value,
    active: point.active,
    inactive: inactiveConstraints(problem, point),
    feasibleCandidates,
    path: penaltyPath(problem, problem.start)
  };
}

function isFeasible(problem: ConstrainedProblem, point: Point) {
  return problem.constraints.every((constraint) => {
    const value = constraint.fn(point);
    return constraint.kind === "eq" ? Math.abs(value) < 0.04 : value <= 0.001;
  });
}

function activeConstraints(problem: ConstrainedProblem, point: Point) {
  return problem.constraints
    .filter((constraint) => Math.abs(constraint.fn(point)) < 0.06)
    .map((constraint) => constraint.label);
}

function inactiveConstraints(problem: ConstrainedProblem, point: Point) {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return problem.constraints.map((constraint) => constraint.label);
  const active = new Set(activeConstraints(problem, point));
  return problem.constraints.filter((constraint) => !active.has(constraint.label)).map((constraint) => constraint.label);
}

function penaltyPath(problem: ConstrainedProblem, start: Point) {
  const penalized = (p: Point) => {
    const penalty = problem.constraints.reduce((sum, constraint) => {
      const value = constraint.fn(p);
      if (constraint.kind === "eq") return sum + value * value * 30;
      return sum + Math.max(0, value) ** 2 * 45;
    }, 0);
    return problem.objective(p) + penalty;
  };

  const path = [start];
  let p = start;
  for (let k = 0; k < 80; k += 1) {
    const gradient = finiteDifferenceGradient(penalized, p);
    if (!Number.isFinite(gradient.x) || !Number.isFinite(gradient.y)) break;
    const alpha = 0.035 / (1 + k * 0.01);
    p = { x: p.x - alpha * gradient.x, y: p.y - alpha * gradient.y };
    path.push(p);
  }
  return path;
}
