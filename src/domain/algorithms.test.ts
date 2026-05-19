import { describe, expect, it } from "vitest";
import {
  fibonacciSearch,
  goldenSectionSearch,
  gridSearch,
  newtonOneDimensional,
  solveConstrainedByGrid,
  solveLinearProgram,
  steepestDescent
} from "./algorithms";
import {
  createDistanceMatrix,
  generateCities,
  routeLength,
  runAco,
  transitionProbabilities,
  updatePheromones
} from "./aco";
import { makeCustomLpProblem, parseLinearConstraint } from "./customProblems";
import { buildComparisonRows } from "./comparison";
import { constrainedExamples, courseOneDExample, fibonacciCourseExample, lagrangeExample, lpExamples, numericalExample, steepestExample } from "./courseData";
import { compile1D, compile2D, finiteDifferenceGradient } from "./math";
import { clampPlaybackStep, getPlaybackMeta } from "./playback";

describe("interval search methods", () => {
  it("golden section converges to the professor assignment maximum", () => {
    const fn = (x: number) => 5 * Math.sin(x) * (1 + Math.cos(x));
    const result = goldenSectionSearch(fn, courseOneDExample.interval[0], courseOneDExample.interval[1], 1e-5, 80, "max");
    expect(result.status).toBe("converged");
    expect(result.x).toBeCloseTo(Math.PI / 3, 3);
    expect(result.fx).toBeCloseTo(15 * Math.sqrt(3) / 4, 3);
  });

  it("fibonacci search matches the professor n=4 worked example", () => {
    const fn = (x: number) => x * x - 7 * x + 12;
    const result = fibonacciSearch(fn, fibonacciCourseExample.interval[0], fibonacciCourseExample.interval[1], fibonacciCourseExample.fibonacciN);
    expect(result.x).toBeCloseTo(3.6, 8);
    expect(result.fx).toBeCloseTo(-0.24, 8);
    expect(result.history.length).toBe(2);
  });

  it("fibonacci n=9 follows the epsilon note for the same interval", () => {
    const fn = (x: number) => x * x - 7 * x + 12;
    const result = fibonacciSearch(fn, 2, 4, 9);
    expect(result.x).toBeCloseTo(3.5, 1);
    expect(result.fx).toBeLessThan(-0.2);
  });
});

describe("custom problem parsing", () => {
  it("evaluates valid 1D expressions safely", () => {
    const fn = compile1D("sin(x) + x^2 + sqrt(abs(x))");
    expect(fn(2)).toBeCloseTo(Math.sin(2) + 4 + Math.sqrt(2), 8);
  });

  it("evaluates valid 2D expressions safely", () => {
    const fn = compile2D("2*x + 3*y + x*y");
    expect(fn({ x: 2, y: 4 })).toBe(24);
  });

  it("rejects invalid expressions", () => {
    expect(() => compile1D("alert(x)")).toThrow();
    expect(() => compile2D("x + unknown")).toThrow();
  });

  it("parses LP constraints", () => {
    const constraint = parseLinearConstraint("2*x + y <= 10");
    expect(constraint.a).toBe(2);
    expect(constraint.b).toBe(1);
    expect(constraint.c).toBe(10);
    expect(constraint.relation).toBe("<=");
  });

  it("rejects malformed LP constraints instead of partially parsing them", () => {
    expect(() => parseLinearConstraint("x ++ y <= 4")).toThrow();
  });

  it("solves custom Golden Section and Fibonacci inputs", () => {
    const fn = compile1D("(x-1)^2");
    expect(goldenSectionSearch(fn, -2, 4, 1e-5).x).toBeCloseTo(1, 3);
    expect(fibonacciSearch(fn, -2, 4, 12).x).toBeCloseTo(1, 1);
  });

  it("supports custom Steepest Descent numerical gradients", () => {
    const fn = compile2D("(x-2)^2 + (y+1)^2");
    const result = steepestDescent(fn, (p) => finiteDifferenceGradient(fn, p), { x: 0, y: 0 }, 0.15, 1e-4, 120);
    expect(result.point.x).toBeCloseTo(2, 2);
    expect(result.point.y).toBeCloseTo(-1, 2);
  });

  it("handles empty feasible LP regions", () => {
    const problem = makeCustomLpProblem("x + y", "max", "x <= 0\nx >= 1\ny >= 0");
    const result = solveLinearProgram(problem);
    expect(result.status).toBe("infeasible");
  });

  it("marks invalid interval search input instead of solving a fallback interval", () => {
    const result = fibonacciSearch((x) => x * x, 4, 2, 9);
    expect(result.status).toBe("invalid");
    expect(Number.isFinite(result.x)).toBe(false);
  });
});

describe("gradient and constrained methods", () => {
  it("steepest ascent reaches the professor course optimum", () => {
    const result = steepestDescent(
      steepestExample.objective,
      steepestExample.gradient,
      steepestExample.start,
      steepestExample.stepSize,
      1e-4,
      120,
      "max"
    );
    expect(result.point.x).toBeCloseTo(2, 2);
    expect(result.point.y).toBeCloseTo(1, 2);
  });

  it("linear programming evaluates feasible corner points", () => {
    const result = solveLinearProgram(lpExamples[0]);
    expect(result.status).toBe("bounded");
    expect(result.optimum.x).toBeCloseTo(8 / 3, 4);
    expect(result.optimum.y).toBeCloseTo(2 / 3, 4);
  });

  it("linear programming supports vertical and horizontal constraints", () => {
    const problem = makeCustomLpProblem("3*x + 2*y", "max", "x <= 2\ny <= 4\nx >= 0\ny >= 0");
    const result = solveLinearProgram(problem);
    expect(result.status).toBe("bounded");
    expect(result.optimum.x).toBeCloseTo(2, 8);
    expect(result.optimum.y).toBeCloseTo(4, 8);
  });

  it("linear programming includes professor examples 3 through 6", () => {
    expect(solveLinearProgram(lpExamples[2]).optimum.value).toBeCloseTo(36, 8);
    expect(solveLinearProgram(lpExamples[3]).optimum.value).toBeCloseTo(4.5, 8);
    expect(solveLinearProgram(lpExamples[4]).status).toBe("unbounded");
    expect(solveLinearProgram(lpExamples[5]).status).toBe("infeasible");
  });

  it("steepest descent reports divergence for an unstable alpha", () => {
    const result = steepestDescent((p) => (p.x - 2) ** 2 + (p.y - 1) ** 2, (p) => finiteDifferenceGradient((q) => (q.x - 2) ** 2 + (q.y - 1) ** 2, p), { x: 3, y: -1 }, 5, 1e-4, 25);
    expect(result.status).toBe("diverged");
  });

  it("constrained simulation marks the active inequality boundary", () => {
    const result = solveConstrainedByGrid(constrainedExamples[1], 70);
    expect(result.point.x + result.point.y).toBeCloseTo(1, 1);
    expect(result.active.join(" ")).toContain("x1 + x2 >= 1");
    expect(result.inactive.length).toBeGreaterThan(0);
  });

  it("lagrange course example satisfies the equality constraint", () => {
    expect(lagrangeExample.constraint(lagrangeExample.optimum)).toBeCloseTo(0, 8);
    expect(lagrangeExample.objective(lagrangeExample.optimum)).toBeCloseTo(49 / 5, 8);
  });

  it("compare all rows expose presentation-ready structure", () => {
    const golden = goldenSectionSearch((x) => x * x - 7 * x + 12, 2, 4, 1e-5);
    const fibonacci = fibonacciSearch((x) => x * x - 7 * x + 12, 2, 4, 9);
    const grid = gridSearch((x) => x * x - 7 * x + 12, 2, 4, 201);
    const numerical = newtonOneDimensional(
      numericalExample.derivative,
      numericalExample.secondDerivative,
      numericalExample.objective,
      numericalExample.x0
    );
    const descent = steepestDescent(
      steepestExample.objective,
      steepestExample.gradient,
      steepestExample.start,
      steepestExample.stepSize,
      1e-4,
      120,
      "max"
    );
    const lpResult = solveLinearProgram(lpExamples[0]);
    const constrained = solveConstrainedByGrid(constrainedExamples[0], 45);
    const rows = buildComparisonRows({ golden, fibonacci, grid, numerical, descent, lpResult, constrained });

    expect(rows).toHaveLength(10);
    expect(rows.every((row) => row.dimension && row.suitableUseCase && row.constraints)).toBe(true);
    expect(rows.map((row) => row.name)).toContain("Lagrange Multipliers Method");
    expect(rows.map((row) => row.name)).toContain("Equality-Constrained Numerical Simulation");
    expect(rows.map((row) => row.name)).toContain("KKT / Active-Set Simulation");
    expect(rows.map((row) => row.name)).toContain("Penalty Method");
    expect(rows.map((row) => row.name)).toContain("Extra Baseline - Grid Search");
    expect(rows.every((row) => row.resultKind && row.applicabilityReason)).toBe(true);
  });

  it("grid search provides a real numerical baseline", () => {
    const result = gridSearch((x) => (x - 1.25) ** 2, -2, 4, 601);
    expect(result.status).toBe("converged");
    expect(result.x).toBeCloseTo(1.25, 2);
    expect(result.evaluations).toBeGreaterThan(100);
  });
});

describe("ant colony optimization extension", () => {
  it("creates a symmetric distance matrix", () => {
    const cities = generateCities(6);
    const matrix = createDistanceMatrix(cities);
    expect(matrix).toHaveLength(6);
    expect(matrix[0][0]).toBe(0);
    expect(matrix[0][2]).toBeCloseTo(matrix[2][0], 10);
  });

  it("computes route length including return to the start", () => {
    const matrix = createDistanceMatrix([{ x: 0, y: 0 }, { x: 3, y: 0 }, { x: 3, y: 4 }]);
    expect(routeLength([0, 1, 2], matrix)).toBeCloseTo(12, 8);
  });

  it("normalizes transition probabilities", () => {
    const cities = generateCities(5);
    const matrix = createDistanceMatrix(cities);
    const pheromone = cities.map((_, i) => cities.map((__, j) => (i === j ? 0 : 1)));
    const probabilities = transitionProbabilities(0, [1, 2, 3], pheromone, matrix, 1, 2);
    expect(probabilities.reduce((sum, item) => sum + item.probability, 0)).toBeCloseTo(1, 8);
  });

  it("updates pheromones with evaporation and deposit", () => {
    const pheromone = [
      [0, 1, 1],
      [1, 0, 1],
      [1, 1, 0]
    ];
    const updated = updatePheromones(pheromone, [{ route: [0, 1, 2], distance: 10 }], 0.2, 100);
    expect(updated[0][1]).toBeGreaterThan(pheromone[0][1]);
    expect(updated[0][1]).toBeCloseTo(updated[1][0], 8);
  });

  it("returns ACO result and integrates into Compare All", () => {
    const cities = generateCities(7);
    const aco = runAco(cities, { cityCount: 7, antCount: 8, iterations: 12, alpha: 1, beta: 2, rho: 0.3, q: 60 });
    expect(aco.bestRoute).toHaveLength(7);
    expect(aco.history).toHaveLength(12);
    expect(aco.nearestNeighbor.distance).toBeGreaterThan(0);

    const rows = buildComparisonRows({
      golden: goldenSectionSearch((x) => x * x - 7 * x + 12, 2, 4, 1e-5),
      fibonacci: fibonacciSearch((x) => x * x - 7 * x + 12, 2, 4, 9),
      grid: gridSearch((x) => x * x - 7 * x + 12, 2, 4, 201),
      numerical: newtonOneDimensional(numericalExample.derivative, numericalExample.secondDerivative, numericalExample.objective, numericalExample.x0),
      descent: steepestDescent(steepestExample.objective, steepestExample.gradient, steepestExample.start, steepestExample.stepSize, 1e-4, 120, "max"),
      lpResult: solveLinearProgram(lpExamples[0]),
      constrained: solveConstrainedByGrid(constrainedExamples[0], 35),
      aco
    });
    expect(rows.map((row) => row.name)).toContain("Ant Colony Optimization");
    expect(rows.find((row) => row.name === "Ant Colony Optimization")?.problemType).toContain("Metaheuristic");
  });

  it("marks invalid ACO parameters instead of silently clamping them", () => {
    const aco = runAco(generateCities(4), { cityCount: 1, antCount: 8, iterations: 12, alpha: 1, beta: 2, rho: 0.3, q: 60 });
    expect(aco.status).toBe("invalid");
    expect(aco.history).toHaveLength(0);
  });
});

describe("global playback metadata", () => {
  const base = {
    method: "golden" as const,
    compareTwo: false,
    compareAll: false,
    goldenLength: 5,
    fibonacciLength: 4,
    numericalLength: 3,
    steepestLength: 6,
    lpCornerCount: 4,
    constrainedPathLength: 7,
    acoLength: 8,
    compareTwoCurveLength: 9,
    compareAllCurveLength: 10
  };

  it("reports max steps for iterative course methods", () => {
    expect(getPlaybackMeta({ ...base, method: "golden" }).maxStep).toBe(4);
    expect(getPlaybackMeta({ ...base, method: "fibonacci" }).maxStep).toBe(3);
    expect(getPlaybackMeta({ ...base, method: "steepest" }).maxStep).toBe(5);
    expect(getPlaybackMeta({ ...base, method: "aco" }).maxStep).toBe(7);
    expect(getPlaybackMeta({ ...base, method: "linear" }).stepLabel).toBe("corner");
  });

  it("disables symbolic screens without pretending playback exists", () => {
    expect(getPlaybackMeta({ ...base, method: "lagrange" }).hasPlayback).toBe(false);
    expect(getPlaybackMeta({ ...base, method: "nonlinear" }).hasPlayback).toBe(false);
  });

  it("uses comparison curve lengths when compare modes are active", () => {
    expect(getPlaybackMeta({ ...base, compareTwo: true }).maxStep).toBe(8);
    expect(getPlaybackMeta({ ...base, compareAll: true }).maxStep).toBe(9);
  });

  it("clamps reset and out-of-range steps safely", () => {
    const meta = getPlaybackMeta({ ...base, method: "fibonacci" });
    expect(clampPlaybackStep(-2, meta)).toBe(0);
    expect(clampPlaybackStep(99, meta)).toBe(3);
    expect(clampPlaybackStep(2, getPlaybackMeta({ ...base, method: "nonlinear" }))).toBe(0);
  });
});
