export type MethodId =
  | "numerical"
  | "steepest"
  | "linear"
  | "nonlinear"
  | "golden"
  | "fibonacci"
  | "lagrange"
  | "equality"
  | "inequality"
  | "penalty"
  | "aco";

export type Point = { x: number; y: number };

export type OneDIteration = {
  k: number;
  a: number;
  b: number;
  c: number;
  d: number;
  fc: number;
  fd: number;
  length: number;
  ratio?: number;
  nextA?: number;
  nextB?: number;
};

export type SearchResult = {
  x: number;
  fx: number;
  iterations: number;
  evaluations: number;
  intervalLength: number;
  history: OneDIteration[];
  runtimeMs: number;
  status: "converged" | "max-iterations" | "invalid" | "failed";
  message?: string;
  methodType?: "exact" | "numerical" | "approximate" | "not-applicable";
};

export type GradientIteration = {
  k: number;
  point: Point;
  gradient: Point;
  stepSize: number;
  next: Point;
  value: number;
  gradientNorm: number;
};

export type GradientResult = {
  point: Point;
  value: number;
  iterations: number;
  evaluations: number;
  history: GradientIteration[];
  runtimeMs: number;
  status: "converged" | "max-iterations" | "invalid" | "diverged" | "failed";
  message?: string;
};

export type Constraint = {
  label: string;
  a: number;
  b: number;
  c: number;
  relation: "<=" | ">=" | "=";
};

export type LpProblem = {
  name: string;
  objectiveLabel: string;
  mode: "max" | "min";
  objective: { x: number; y: number };
  constraints: Constraint[];
};

export type LpResult = {
  corners: Array<Point & { value: number; active: string[] }>;
  optimum: Point & { value: number; active: string[] };
  status: "bounded" | "infeasible" | "unbounded";
};

export type NonlinearConstraint = {
  label: string;
  kind: "eq" | "ineq";
  fn: (p: Point) => number;
  display: string;
};

export type ConstrainedProblem = {
  name: string;
  objectiveLabel: string;
  objective: (p: Point) => number;
  constraints: NonlinearConstraint[];
  bounds: { x: [number, number]; y: [number, number] };
  start: Point;
};

export type ConstrainedResult = {
  point: Point;
  value: number;
  active: string[];
  inactive: string[];
  feasibleCandidates: Array<Point & { value: number; active: string[] }>;
  path: Point[];
};

export type ComparisonRow = {
  name: string;
  problemType: string;
  dimension: string;
  solution: string;
  objectiveValue: string;
  iterations: string;
  evaluations: string;
  runtimeMs: string;
  status: string;
  constraints: string;
  linear: string;
  nonlinear: string;
  suitableUseCase: string;
  assumptions: string;
  strengths: string;
  weaknesses: string;
  applicable?: boolean;
  applicabilityReason?: string;
  resultKind?: "Exact" | "Numerical" | "Approximate" | "Not applicable" | "Invalid input" | "Failed" | "Infeasible" | "Unbounded" | "Max iterations reached";
  limitations?: string;
  curve: Array<{ k: number; value: number }>;
};

export type AcoParams = {
  cityCount: number;
  antCount: number;
  iterations: number;
  alpha: number;
  beta: number;
  rho: number;
  q: number;
};

export type AcoIteration = {
  iteration: number;
  bestRoute: number[];
  bestDistance: number;
  iterationBestRoute: number[];
  iterationBestDistance: number;
  pheromone: number[][];
  antRoutes: Array<{ route: number[]; distance: number }>;
};

export type AcoResult = {
  cities: Point[];
  bestRoute: number[];
  bestDistance: number;
  initialBestDistance: number;
  iterations: number;
  evaluations: number;
  runtimeMs: number;
  history: AcoIteration[];
  random: { route: number[]; distance: number };
  nearestNeighbor: { route: number[]; distance: number };
  bruteForce?: { route: number[]; distance: number };
  status: "completed" | "limited" | "invalid";
  message?: string;
};
