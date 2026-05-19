import type { AcoResult, ComparisonRow, ConstrainedResult, GradientResult, LpResult, SearchResult } from "./types";
import { lagrangeExample } from "./courseData";
import { fmt } from "./math";

export function buildComparisonRows(data: {
  golden: SearchResult;
  fibonacci: SearchResult;
  grid?: SearchResult;
  numerical: SearchResult;
  descent: GradientResult;
  lpResult: LpResult;
  constrained: ConstrainedResult;
  aco?: AcoResult;
}): ComparisonRow[] {
  const rows: ComparisonRow[] = [
    comparisonFromSearch(
      "Newton 1D",
      "smooth stationary point",
      "1D",
      data.numerical,
      "unconstrained",
      "locally nonlinear",
      "yes",
      "Fast refinement when derivatives f' and f'' are available",
      "Needs derivatives",
      "Very fast near a good start",
      "Sensitive to f'' and starting point"
    ),
    comparisonFromSearch(
      "Extra Baseline - Grid Search",
      "brute numerical scan",
      "1D",
      data.grid ?? data.golden,
      "unconstrained",
      "works for linear/nonlinear f",
      "yes",
      "Simple baseline that samples many points on [a,b]",
      "Finite function values on the interval",
      "Easy to explain and useful as a numerical baseline",
      "Accuracy depends on sample spacing"
    ),
    comparisonFromSearch(
      "Golden Section",
      "unimodal direct search",
      "1D",
      data.golden,
      "unconstrained",
      "works for linear/nonlinear f",
      "yes",
      "Derivative-free minimization on a known interval [a,b]",
      "Unimodal interval",
      "Stable interval shrink, one reused point",
      "Only 1D"
    ),
    comparisonFromSearch(
      "Fibonacci",
      "unimodal fixed-budget search",
      "1D",
      data.fibonacci,
      "unconstrained",
      "works for linear/nonlinear f",
      "yes",
      "Derivative-free minimization with a planned number of evaluations",
      "Unimodal interval and chosen n",
      "Evaluation budget is clear from F_n",
      "Requires planning n"
    ),
    {
      name: "Steepest Ascent / Descent",
      problemType: "unconstrained smooth optimization",
      dimension: "2D",
      solution: `(${fmt(data.descent.point.x)}, ${fmt(data.descent.point.y)})`,
      objectiveValue: fmt(data.descent.value),
      iterations: String(data.descent.iterations),
      evaluations: String(data.descent.evaluations),
      runtimeMs: fmt(data.descent.runtimeMs, 3),
      status: data.descent.status,
      constraints: "unconstrained",
      linear: "no",
      nonlinear: "yes",
      suitableUseCase: "Visualizing gradient movement on smooth objectives",
      assumptions: "differentiable objective",
      strengths: "Shows gradient path clearly",
      weaknesses: "Step size matters",
      applicable: data.descent.status !== "invalid" && data.descent.status !== "failed" && data.descent.status !== "diverged",
      applicabilityReason: data.descent.message ?? "Applies to smooth unconstrained 2D objectives.",
      resultKind: resultKind(data.descent.status),
      limitations: "Only local behavior is shown; α controls stability.",
      curve: data.descent.history.map((row) => ({ k: row.k, value: row.value }))
    },
    {
      name: "Linear Programming",
      problemType: "graphical LP",
      dimension: "2D",
      solution: `(${fmt(data.lpResult.optimum.x)}, ${fmt(data.lpResult.optimum.y)})`,
      objectiveValue: fmt(data.lpResult.optimum.value),
      iterations: "corners",
      evaluations: String(data.lpResult.corners.length),
      runtimeMs: "<1",
      status: data.lpResult.status,
      constraints: "constrained",
      linear: "yes",
      nonlinear: "no",
      suitableUseCase: "Linear objective and linear constraints in two variables",
      assumptions: "linear bounded feasible region",
      strengths: "Corner theorem is easy to defend",
      weaknesses: "Graphical only in 2D",
      applicable: data.lpResult.status === "bounded",
      applicabilityReason: data.lpResult.status === "bounded" ? "Applies to 2-variable linear objectives and constraints." : data.lpResult.status === "unbounded" ? "The feasible region appears unbounded in the objective direction." : "No feasible LP corner was found.",
      resultKind: data.lpResult.status === "unbounded" ? "Unbounded" : data.lpResult.status === "infeasible" ? "Infeasible" : "Exact",
      limitations: "The graphical method is limited to two variables.",
      curve: data.lpResult.corners.map((row, k) => ({ k, value: row.value }))
    },
    {
      name: "Lagrange Multipliers Method",
      problemType: "equality-constrained continuous optimization",
      dimension: "2D",
      solution: `(${fmt(lagrangeExample.optimum.x)}, ${fmt(lagrangeExample.optimum.y)})`,
      objectiveValue: fmt(lagrangeExample.value),
      iterations: "stationarity equations",
      evaluations: "symbolic example",
      runtimeMs: "<1",
      status: "course equality example",
      constraints: "constrained",
      linear: "no",
      nonlinear: "yes",
      suitableUseCase: "Equality constraints h(x,y)=0 where tangency explains the optimum",
      assumptions: "smooth f and h, regular constraint gradient",
      strengths: "Clear stationarity and tangency explanation",
      weaknesses: "Only equality constraints; symbolic solving is limited to course presets here",
      applicable: true,
      applicabilityReason: "Applies to the course equality-constrained example.",
      resultKind: "Exact",
      limitations: "Custom Lagrange problems are shown numerically unless they match the preset-style example.",
      curve: []
    },
    lagrangeNumericalSimulationRow(),
    {
      name: "KKT / Active-Set Simulation",
      problemType: "constrained nonlinear",
      dimension: "2D",
      solution: `(${fmt(data.constrained.point.x)}, ${fmt(data.constrained.point.y)})`,
      objectiveValue: fmt(data.constrained.value),
      iterations: String(data.constrained.path.length),
      evaluations: String(data.constrained.feasibleCandidates.length),
      runtimeMs: "grid",
      status: data.constrained.feasibleCandidates.length > 0 ? "educational feasible search" : "infeasible sample grid",
      constraints: "constrained",
      linear: "mixed",
      nonlinear: "yes",
      suitableUseCase: "Equality/inequality constraints with active-set explanation",
      assumptions: "standard inequality form, active constraints highlighted",
      strengths: "Shows feasible region, active set, and KKT logic",
      weaknesses: "Grid simulation is approximate",
      applicable: data.constrained.feasibleCandidates.length > 0,
      applicabilityReason: data.constrained.feasibleCandidates.length > 0 ? "Applies to the sampled constrained 2D problem." : "No feasible sample was found for the current constraints.",
      resultKind: data.constrained.feasibleCandidates.length > 0 ? "Approximate" : "Infeasible",
      limitations: "Sampling and penalty path are educational approximations, not symbolic nonlinear solving.",
      curve: data.constrained.path.map((point, k) => ({ k, value: point.x * point.x + point.y * point.y }))
    },
    {
      name: "Penalty Method",
      problemType: "constrained problem transformed to unconstrained penalty form",
      dimension: "2D",
      solution: `(${fmt(data.constrained.point.x)}, ${fmt(data.constrained.point.y)})`,
      objectiveValue: fmt(data.constrained.value),
      iterations: String(data.constrained.path.length),
      evaluations: String(data.constrained.feasibleCandidates.length),
      runtimeMs: "grid",
      status: data.constrained.feasibleCandidates.length > 0 ? "educational penalty path" : "infeasible sample grid",
      constraints: "constrained",
      linear: "mixed",
      nonlinear: "yes",
      suitableUseCase: "Exterior/interior penalty method course examples",
      assumptions: "penalty parameter makes infeasible points expensive",
      strengths: "Shows how constrained problems are converted to an unconstrained penalty objective",
      weaknesses: "Educational approximation, not a symbolic penalty solver",
      applicable: data.constrained.feasibleCandidates.length > 0,
      applicabilityReason: data.constrained.feasibleCandidates.length > 0 ? "Applies to the selected course penalty-style constrained problem." : "No feasible sample was found for the current penalty example.",
      resultKind: data.constrained.feasibleCandidates.length > 0 ? "Approximate" : "Infeasible",
      limitations: "Penalty path is numerical and depends on the displayed sampling and step parameters.",
      curve: data.constrained.path.map((point, k) => ({ k, value: point.x * point.x + point.y * point.y }))
    }
  ];
  if (data.aco) {
    rows.push(acoComparisonRow(data.aco));
    rows.push(routeBaselineRow("Random Search", data.aco.random, data.aco, "Stochastic route baseline without pheromone learning"));
    rows.push(routeBaselineRow("Nearest Neighbor", data.aco.nearestNeighbor, data.aco, "Greedy route baseline that repeatedly visits the closest unvisited city"));
    if (data.aco.bruteForce) rows.push(routeBaselineRow("Brute Force TSP", data.aco.bruteForce, data.aco, "Exact exhaustive baseline for city counts <= 9", true));
  }
  return rows;
}

function lagrangeNumericalSimulationRow(): ComparisonRow {
  const candidates = Array.from({ length: 401 }, (_, index) => {
    const x = -1 + (4 * index) / 400;
    const y = (5 - x) / 2;
    return { x, y, value: lagrangeExample.objective({ x, y }) };
  });
  const best = candidates.reduce((winner, candidate) => candidate.value > winner.value ? candidate : winner, candidates[0]);
  return {
    name: "Equality-Constrained Numerical Simulation",
    problemType: "equality-constrained numerical scan",
    dimension: "2D",
    solution: `(${fmt(best.x)}, ${fmt(best.y)})`,
    objectiveValue: fmt(best.value),
    iterations: String(candidates.length),
    evaluations: String(candidates.length),
    runtimeMs: "<1",
    status: "sampled equality curve",
    constraints: "constrained",
    linear: "no",
    nonlinear: "yes",
    suitableUseCase: "Numerically checking an equality-constrained result by sampling the feasible curve",
    assumptions: "The equality curve can be parameterized or sampled safely",
    strengths: "Useful visual/numerical check against Lagrange tangency",
    weaknesses: "Approximate; accuracy depends on sampling density",
    applicable: true,
    applicabilityReason: "Uses the same course Lagrange equality example and samples the feasible line x+2y=5.",
    resultKind: "Approximate",
    limitations: "It is a numerical scan, not symbolic proof.",
    curve: candidates.map((candidate, k) => ({ k, value: candidate.value }))
  };
}

export function interpretBestMethod(rows: ComparisonRow[]) {
  const constrained = rows.find((row) => row.name === "KKT / Active-Set Simulation");
  const lp = rows.find((row) => row.name === "Linear Programming");
  const golden = rows.find((row) => row.name === "Golden Section");
  return {
    title: "Which method is best for this problem and why?",
    bullets: [
      `${golden?.name ?? "Golden Section"} or Fibonacci is best for the course 1D unimodal interval example because no derivatives are needed and the uncertainty interval visibly shrinks.`,
      `${lp?.name ?? "Linear Programming"} is best when every equation is linear; the professor-friendly proof is the corner-point theorem.`,
      `${constrained?.name ?? "Lagrange / KKT"} is best when constraints matter because it explains feasibility, active constraints, and complementary slackness; Penalty Method is the course numerical transformation view.`,
      "ACO is best treated as bonus future work for discrete routing; it is powerful for TSP-style problems but not a replacement for smooth continuous course methods."
    ]
  };
}

function acoComparisonRow(result: AcoResult): ComparisonRow {
  const valid = result.status !== "invalid";
  return {
    name: "Ant Colony Optimization",
    problemType: "Metaheuristic / Nature-inspired",
    dimension: "2D map, discrete route",
    solution: result.bestRoute.map((city) => city + 1).join(" -> "),
    objectiveValue: fmt(result.bestDistance),
    iterations: String(result.iterations),
    evaluations: String(result.evaluations),
    runtimeMs: fmt(result.runtimeMs, 3),
    status: valid ? `${result.status}; near-optimal, not guaranteed exact` : result.message ?? "invalid ACO input",
    constraints: "discrete combinatorial",
    linear: "no",
    nonlinear: "not derivative-based",
    suitableUseCase: "TSP, VRP, routing, scheduling",
    assumptions: "positive distances, pheromone memory, stochastic sampling",
    strengths: "Scales better than brute force and shows search memory visually",
    weaknesses: "No exact guarantee; not suitable for smooth derivative-based continuous problems",
    applicable: valid,
    applicabilityReason: valid ? "Applies to the TSP-style route problem, not continuous calculus problems." : result.message ?? "ACO input is invalid.",
    resultKind: valid ? "Approximate" : "Invalid input",
    limitations: "Metaheuristic result is near-optimal and stochastic unless brute force is available for small city counts.",
    curve: result.history.map((row) => ({ k: row.iteration, value: row.bestDistance }))
  };
}

function routeBaselineRow(
  name: string,
  baseline: { route: number[]; distance: number },
  result: AcoResult,
  description: string,
  exact = false
): ComparisonRow {
  const valid = result.status !== "invalid" && Number.isFinite(baseline.distance);
  return {
    name,
    problemType: "discrete route optimization",
    dimension: "2D map, discrete route",
    solution: baseline.route.map((city) => city + 1).join(" -> "),
    objectiveValue: fmt(baseline.distance),
    iterations: exact ? "all tours" : name === "Random Search" ? "180 trials" : "1 greedy pass",
    evaluations: exact ? "factorial" : name === "Random Search" ? "180" : String(result.cities.length),
    runtimeMs: "<1",
    status: exact ? "exact for this small TSP" : "baseline",
    constraints: "discrete combinatorial",
    linear: "no",
    nonlinear: "not derivative-based",
    suitableUseCase: description,
    assumptions: "positive distances on a fixed city map",
    strengths: exact ? "Provides the exact route for small city counts" : "Simple comparison baseline",
    weaknesses: exact ? "Factorial growth makes it unsuitable for large city counts" : "No pheromone learning or global search memory",
    applicable: valid,
    applicabilityReason: valid ? "Applies to the same TSP-style route problem as ACO." : result.message ?? "ACO input is invalid.",
    resultKind: valid ? (exact ? "Exact" : "Approximate") : "Invalid input",
    limitations: exact ? "Only shown for city count <= 9." : "Baseline quality is problem-dependent.",
    curve: result.history.map((row) => ({ k: row.iteration, value: baseline.distance }))
  };
}

function comparisonFromSearch(
  name: string,
  problemType: string,
  dimension: string,
  result: SearchResult,
  constraints: string,
  linear: string,
  nonlinear: string,
  suitableUseCase: string,
  assumptions: string,
  strengths: string,
  weaknesses: string
): ComparisonRow {
  return {
    name,
    problemType,
    dimension,
    solution: `x=${fmt(result.x)}`,
    objectiveValue: fmt(result.fx),
    iterations: String(result.iterations),
    evaluations: String(result.evaluations),
    runtimeMs: fmt(result.runtimeMs, 3),
    status: result.status,
    constraints,
    linear,
    nonlinear,
    suitableUseCase,
    assumptions,
    strengths,
    weaknesses,
    applicable: Number.isFinite(result.x) && result.status !== "invalid" && result.status !== "failed",
    applicabilityReason: Number.isFinite(result.x) ? "Applies to a 1D continuous interval problem." : result.message ?? "The method could not run on this input.",
    resultKind: resultKind(result.status),
    limitations: weaknesses,
    curve: result.history.map((row) => ({ k: row.k, value: Math.min(row.fc, row.fd) }))
  };
}

function resultKind(status: string): ComparisonRow["resultKind"] {
  if (status === "converged") return "Approximate";
  if (status === "max-iterations") return "Max iterations reached";
  if (status === "invalid") return "Invalid input";
  if (status === "failed" || status === "diverged") return "Failed";
  if (status === "unbounded") return "Unbounded";
  if (status === "infeasible") return "Infeasible";
  return "Numerical";
}
