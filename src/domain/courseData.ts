import type { ConstrainedProblem, LpProblem, MethodId, Point } from "./types";

export const methodOrder: MethodId[] = [
  "linear",
  "nonlinear",
  "numerical",
  "golden",
  "fibonacci",
  "steepest",
  "lagrange",
  "equality",
  "inequality",
  "penalty",
  "aco"
];

export const methodNames: Record<MethodId, string> = {
  linear: "Linear Programming",
  nonlinear: "Extrema / Nonlinear Optimization",
  numerical: "Numerical Optimization / Newton's Method",
  golden: "Golden Section Search Method",
  fibonacci: "Fibonacci Search Method",
  steepest: "Steepest Ascent / Steepest Descent",
  lagrange: "Lagrange Multipliers Method",
  equality: "Equality Constraints",
  inequality: "Inequality Constrained Optimization / KKT",
  penalty: "Penalty Method",
  aco: "ACO Bonus / Advanced"
};

export type MethodSummary = {
  idea: string;
  assumptions: string;
  limitations: string;
  courseFlow: string;
  solves: string;
  steps: string[];
  correctness: string;
  viva: string[];
};

export const methodSummaries: Record<MethodId, MethodSummary> = {
  linear: {
    idea: "A Linear Programming Problem maximizes or minimizes a linear objective function subject to linear constraints.",
    assumptions: "The objective function and all functional constraints are linear. In the graphical method the problem uses two variables.",
    limitations: "The graphical classroom method is limited to two variables and needs separate discussion for unbounded or inconsistent constraints.",
    courseFlow: "Draw the half-planes, form the feasible region, list the corner points, evaluate z at each corner, and select the optimal solution.",
    solves: "Two-variable LP problems with variables x1 and x2, objective z, functional constraints, and non-negative constraints.",
    steps: ["State max/min z", "Write the functional constraints", "Add non-negative constraints", "Draw the feasible region", "Evaluate z at each corner point"],
    correctness: "The optimal solution of a bounded LP problem is a corner point of the feasible region.",
    viva: ["Use x1, x2, and z.", "A feasible point satisfies all constraints.", "The feasible region is the intersection of all half-planes."]
  },
  nonlinear: {
    idea: "Nonlinear optimization first finds critical points and classifies them by the Hessian matrix.",
    assumptions: "The function is differentiable enough to compute the gradient and Hessian near each critical point.",
    limitations: "If the Hessian test is inconclusive, the course checks the sign of f(x,y)-f(X*) around the critical point.",
    courseFlow: "Solve gradient P=0 for critical points, compute H(X*)=gradient squared P(X*), then classify by definiteness.",
    solves: "Unconstrained nonlinear extrema and Hessian classification examples from the extrema lectures.",
    steps: ["Find all critical points", "Compute the Hessian matrix", "Check positive definite, negative definite, or indefinite", "Classify local min, local max, or saddle point"],
    correctness: "Positive definite Hessian gives a local minimum, negative definite gives a local maximum, and indefinite gives a saddle point.",
    viva: ["Critical points satisfy gradient P=0.", "Hessian definiteness decides the type when the test is conclusive.", "Use eigenvalues or leading determinants as the notes do."]
  },
  numerical: {
    idea: "Numerical optimization uses Newton's method when solving the stationary equations directly is difficult.",
    assumptions: "The derivative information is available and the starting point is chosen close enough for Newton iteration to behave well.",
    limitations: "Newton's method can fail or diverge when the starting point is poor or the second derivative/Hessian is singular.",
    courseFlow: "Write f'(x)=0, choose X0, apply the Newton update, and stop when the iterates stabilize near a critical point.",
    solves: "One-dimensional Newton examples and the multidimensional Newton-Raphson update shown in the numerical optimization lecture.",
    steps: ["Choose the starting point X0", "Compute f' and f'' or gradient and Hessian", "Apply Newton's update", "Repeat until the critical point is reached"],
    correctness: "The method is accepted when the iterate is near a point satisfying the stationary condition.",
    viva: ["For 1D use x_{n+1}=x_n-f'(x_n)/f''(x_n).", "For several variables use X_{n+1}=X_n-H^{-1}(X_n) gradient F(X_n).", "The result is numerical, not automatically global."]
  },
  golden: {
    idea: "Golden Section Search finds the maximum or minimum of a unimodal function by reducing the uncertainty interval.",
    assumptions: "The selected interval contains one maximum or one minimum of the function.",
    limitations: "It is a one-dimensional direct search method and depends on unimodality on the interval.",
    courseFlow: "Use xl and xu as boundary points, compute x1 and x2 from d, compare f(x1) and f(x2), then reduce the interval until epsilon is reached.",
    solves: "One-dimensional max/min problems such as the gutter-angle example and assignment Golden Section questions.",
    steps: ["Choose xl and xu", "Compute d=(sqrt(5)-1)/2 (xu-xl)", "Set x1=xl+d and x2=xu-d", "Compare f(x1) and f(x2)", "Stop when epsilon is small enough"],
    correctness: "For a unimodal function, each comparison removes the side that cannot contain the optimum while reusing one old function value.",
    viva: ["The professor's notation is xl, xu, x1, x2.", "The assignment tolerance is epsilon = 0.00001.", "The final estimate is the average of the final boundary points."]
  },
  fibonacci: {
    idea: "Fibonacci Search reduces a unimodal uncertainty interval using Fibonacci ratios and a planned number of steps n.",
    assumptions: "The function is unimodal and n is chosen before the search, often from Fn > L1/epsilon.",
    limitations: "If n is chosen arbitrarily, the accuracy cannot be controlled except by changing n.",
    courseFlow: "Input [a1,b1] and n, compute L1, c1, d1 from Fibonacci numbers, then update [ak,bk] until cn-1=dn-1.",
    solves: "One-dimensional Fibonacci direct-search examples, especially f(x)=x^2-7x+12 on [2,4].",
    steps: ["Input [a1,b1] and n", "Compute L1=b1-a1", "Compute c1 and d1", "Update the uncertainty interval", "Stop when the two interior points coincide"],
    correctness: "The final error is at most L_{n-1}/2 and n may be selected from Fn > L1/epsilon.",
    viva: ["F0=F1=1.", "The lecture n=4 example gives xmin approximately 3.6.", "For epsilon=0.05 on [2,4], Fn>40 so n=9."]
  },
  steepest: {
    idea: "The Steepest Ascent method moves in the gradient direction for a maximum; for a minimum the direction is negative gradient.",
    assumptions: "The function is differentiable and the learning rate α is stable or chosen optimally.",
    limitations: "A fixed α can be slow, unstable, or divergent; the notes also discuss finding an optimal α.",
    courseFlow: "Pick X0, calculate gradient F(X0), set X1=X0+α gradient F(X0) for ascent, and repeat until the sequence reaches X*.",
    solves: "Smooth unconstrained two-variable examples from the Steepest Method notes and assignment.",
    steps: ["Pick a starting point X0", "Calculate the gradient at this point", "Move in the gradient direction for maximum", "Use negative gradient for minimum", "Repeat the process"],
    correctness: "The gradient vector points in the maximum direction of increase, so ascent follows it and descent uses its opposite.",
    viva: ["For maximum use X1=X0+α gradient F(X0).", "For minimum use X1=X0-α gradient F(X0).", "The optimal α condition is gradient F(Xk) dot gradient F(Xk+1)=0."]
  },
  lagrange: {
    idea: "Lagrange Multipliers Method handles equality constraints by combining f with h in a new function L.",
    assumptions: "The equality constraints are smooth and the regularity condition is adequate at the candidate point.",
    limitations: "This method by itself does not directly handle inactive inequality constraints; KKT is used for inequalities.",
    courseFlow: "Rewrite constraints as h=0, form L=f+λh, set all partial derivatives equal to zero, and solve.",
    solves: "Equality constrained nonlinear optimization problems from the Lagrange notes.",
    steps: ["Write h(x)=0", "Form L=f+λh", "Set the stationarity equations", "Solve for variables and multipliers", "Evaluate f at the candidate"],
    correctness: "At the constrained optimum the objective contour is tangent to the equality constraint, so the gradients balance.",
    viva: ["λ is the Lagrange multiplier.", "Use L=f+λh in the course notation.", "For several constraints use one multiplier for each h."]
  },
  equality: {
    idea: "Equality constraints restrict all feasible points to the boundary h(x)=0.",
    assumptions: "The equality equation exactly describes the feasible set.",
    limitations: "The visualization uses a tolerance band to display a curve on a finite grid.",
    courseFlow: "Handle equality constraints through the Lagrange Multipliers Method, then compare feasible candidates if needed.",
    solves: "Course equality-boundary examples and numerical checks of Lagrange candidates.",
    steps: ["Write the equality boundary", "Keep points satisfying h=0", "Apply Lagrange if symbolic", "Compare values of f at candidates"],
    correctness: "Every feasible point satisfies the equality, so the equality constraint is always active.",
    viva: ["Equality constraints are always active.", "Lagrange is the course method for equality constraints.", "The app's grid view is approximate."]
  },
  inequality: {
    idea: "Inequality constrained optimization uses KKT Conditions to handle active and inactive constraints.",
    assumptions: "Inequalities are written in standard form gj(x)<=0 with multipliers mu_j>=0.",
    limitations: "The KKT panel is a course-style checklist and visual numerical aid, not a symbolic proof for every nonconvex problem.",
    courseFlow: "Construct L=f+Σλ_i h_i+Σμ_j g_j, then check stationarity, primal feasibility, dual feasibility, and complementary slackness.",
    solves: "Inequality constrained examples including the temperature-on-ellipse example and the KKT worked examples.",
    steps: ["Construct L", "Set partial derivatives equal to zero", "Check primal feasibility", "Check dual feasibility", "Apply complementary slackness"],
    correctness: "Active constraints may hold as equalities; inactive constraints have zero multipliers by complementary slackness.",
    viva: ["Primal feasibility means gj(x)<=0.", "Dual feasibility means mu_j>=0.", "Complementary slackness means mu_j gj(x)=0."]
  },
  penalty: {
    idea: "Penalty Method replaces a constrained problem by an unconstrained penalized problem that punishes constraint violation.",
    assumptions: "The penalty parameter is chosen so that violating the constraint becomes expensive during the numerical search.",
    limitations: "The app shows the course concept and examples visually; it is not a general symbolic penalty solver.",
    courseFlow: "Start with the constrained problem, choose exterior or interior penalty form, increase the penalty parameter, and follow the unconstrained penalized objective.",
    solves: "The Chapter 5 penalty examples: exterior 1D/2D equality/inequality and interior inequality penalty examples.",
    steps: ["Write the original constrained problem", "Choose exterior or interior penalty", "Build the penalized objective", "Increase the penalty parameter", "Move toward the feasible optimum"],
    correctness: "As the penalty effect increases, infeasible points become unattractive and the numerical path is pushed toward feasible low-value points.",
    viva: ["Exterior penalty is used from outside the feasible region.", "Interior penalty keeps iterates inside inequality constraints.", "Penalty results are numerical approximations."]
  },
  aco: {
    idea: "Ant Colony Optimization is not in the professor's course files; OptiLab keeps it as a clearly marked bonus advanced extension.",
    assumptions: "The problem is discrete, distances are known, and route quality can be improved by stochastic sampling.",
    limitations: "ACO is near-optimal and stochastic; it is not an exact calculus, LP, KKT, or penalty method.",
    courseFlow: "Show only after all course methods as Bonus / Advanced, not as a replacement for the required material.",
    solves: "Discrete TSP-style routing demonstrations outside the core course scope.",
    steps: ["Initialize pheromone", "Build ant routes", "Evaluate route lengths", "Evaporate pheromone", "Deposit pheromone on shorter tours"],
    correctness: "ACO balances pheromone memory with distance visibility but does not guarantee an exact global optimum.",
    viva: ["This is bonus/future work.", "It is discrete and combinatorial.", "It should not be presented as a professor-required core method."]
  }
};

export const courseAlignmentNotes = [
  "LP uses x1, x2, z, feasible region, corner points, and the corner-point theorem.",
  "Extrema of several variables uses gradient P=0 and Hessian classification.",
  "Newton's method is the main numerical optimization lecture method.",
  "Golden Section uses xl, xu, x1, x2 and epsilon = 0.00001 in the assignment.",
  "Fibonacci uses F0=F1=1 and the professor's [a1,b1], L1, c1, d1 notation.",
  "Steepest Ascent is taught before the minimization remark.",
  "Lagrange, KKT, and Penalty Method are the course constrained-optimization sequence.",
  "ACO is not in the course files and is marked as Bonus / Advanced."
];

export const courseOneDExample = {
  name: "Professor Golden max example - assignment Q2",
  expression: "5*sin(x)*(1+cos(x))",
  interval: [0, Math.PI / 2] as [number, number],
  tolerance: 1e-5,
  fibonacciN: 10,
  expectedX: Math.PI / 3,
  expectedValue: 15 * Math.sqrt(3) / 4,
  mode: "max" as const,
  source: "Assignment Q2 / Golden Section notes"
};

export const fibonacciCourseExample = {
  name: "Professor Fibonacci n=4 worked example",
  expression: "x^2 - 7*x + 12",
  interval: [2, 4] as [number, number],
  tolerance: 0.05,
  fibonacciN: 4,
  expectedX: 3.6,
  expectedValue: -0.24,
  mode: "min" as const,
  source: "Fibonacci tutorial slides"
};

export const oneDExamples = [
  courseOneDExample,
  fibonacciCourseExample,
  {
    name: "Professor Fibonacci epsilon=0.05 note - n=9",
    expression: "x^2 - 7*x + 12",
    interval: [2, 4] as [number, number],
    tolerance: 0.05,
    fibonacciN: 9,
    expectedX: 3.5,
    expectedValue: -0.25,
    mode: "min" as const,
    source: "Fibonacci tutorial remark Fn > L1/epsilon"
  },
  {
    name: "Assignment Golden minimization example - Q1",
    expression: "x^4 - 14*x^3 + 60*x^2 - 70*x",
    interval: [0, 2] as [number, number],
    tolerance: 1e-5,
    fibonacciN: 9,
    mode: "min" as const,
    source: "Assignment Q1"
  },
  {
    name: "Assignment Golden maximization example - Q4",
    expression: "2*sin(x) - 0.1*x^2",
    interval: [0, 4] as [number, number],
    tolerance: 1e-5,
    fibonacciN: 10,
    mode: "max" as const,
    source: "Assignment Q4"
  },
  {
    name: "Extra Example - previous Newton lecture max",
    expression: "4*sin(x)*(1+cos(x))",
    interval: [0, 1.8] as [number, number],
    tolerance: 1e-5,
    fibonacciN: 10,
    mode: "max" as const,
    source: "Extra numerical demonstration"
  }
];

export const numericalExample = {
  name: "Professor Newton 1D example",
  objectiveLabel: "max f(x)=4 sin(x)(1+cos(x)), x0=pi/4",
  objective: (x: number) => 4 * Math.sin(x) * (1 + Math.cos(x)),
  derivative: (x: number) => 4 * Math.cos(x) + 4 * Math.cos(2 * x),
  secondDerivative: (x: number) => -4 * Math.sin(x) - 8 * Math.sin(2 * x),
  x0: Math.PI / 4,
  expectedX: 1.0472
};

export const steepestExample = {
  name: "Professor Steepest Ascent example",
  objectiveLabel: "max F(x,y)=2xy+2x-x^2-2y^2",
  objective: (p: Point) => 2 * p.x * p.y + 2 * p.x - p.x * p.x - 2 * p.y * p.y,
  gradient: (p: Point): Point => ({ x: 2 * p.y + 2 - 2 * p.x, y: 2 * p.x - 4 * p.y }),
  start: { x: -2, y: 0 },
  stepSize: 0.1,
  optimum: { x: 2, y: 1 },
  mode: "max" as const
};

export const nonlinearExamples = [
  {
    name: "Professor Hessian example 1",
    objectiveLabel: "P(x,y)=x^2-2xy-2x+2y^2",
    criticalPoint: { x: 2, y: 1 },
    hessian: [[2, -2], [-2, 4]],
    classification: "local minimum",
    value: -2
  },
  {
    name: "Professor Hessian example 2",
    objectiveLabel: "P(x,y)=3x^2+6xy+2y^2+4x+2y+15",
    criticalPoint: { x: 1 / 3, y: -1 },
    hessian: [[6, 6], [6, 4]],
    classification: "saddle point",
    value: 14.3333
  },
  {
    name: "Professor Hessian example 3",
    objectiveLabel: "P(x,y)=x^2+y^2-2x-6y+16",
    criticalPoint: { x: 1, y: 3 },
    hessian: [[2, 0], [0, 2]],
    classification: "local minimum",
    value: 6
  }
];

export const lpExamples: LpProblem[] = [
  {
    name: "Course LP Example 1 - graphical max",
    objectiveLabel: "max z = x1 + x2",
    mode: "max",
    objective: { x: 1, y: 1 },
    constraints: [
      { label: "x1 + 2x2 <= 4", a: 1, b: 2, c: 4, relation: "<=" },
      { label: "4x1 + 2x2 <= 12", a: 4, b: 2, c: 12, relation: "<=" },
      { label: "-x1 + x2 <= 1", a: -1, b: 1, c: 1, relation: "<=" },
      { label: "x1 >= 0", a: 1, b: 0, c: 0, relation: ">=" },
      { label: "x2 >= 0", a: 0, b: 1, c: 0, relation: ">=" }
    ]
  },
  {
    name: "Course LP Example 2 - graphical min",
    objectiveLabel: "min z = -x1 - 3x2",
    mode: "min",
    objective: { x: -1, y: -3 },
    constraints: [
      { label: "x1 + x2 <= 6", a: 1, b: 1, c: 6, relation: "<=" },
      { label: "-x1 + 2x2 <= 8", a: -1, b: 2, c: 8, relation: "<=" },
      { label: "x1 >= 0", a: 1, b: 0, c: 0, relation: ">=" },
      { label: "x2 >= 0", a: 0, b: 1, c: 0, relation: ">=" }
    ]
  },
  {
    name: "Course LP Example 3 - bounded box",
    objectiveLabel: "max z = 4x1 + x2",
    mode: "max",
    objective: { x: 4, y: 1 },
    constraints: [
      { label: "x1 <= 7", a: 1, b: 0, c: 7, relation: "<=" },
      { label: "x2 <= 8", a: 0, b: 1, c: 8, relation: "<=" },
      { label: "x1 + x2 >= 2", a: 1, b: 1, c: 2, relation: ">=" },
      { label: "x1 >= 0", a: 1, b: 0, c: 0, relation: ">=" },
      { label: "x2 >= 0", a: 0, b: 1, c: 0, relation: ">=" }
    ]
  },
  {
    name: "Course LP Example 4 - alternative optimum",
    objectiveLabel: "max z = 2x1 + 3x2",
    mode: "max",
    objective: { x: 2, y: 3 },
    constraints: [
      { label: "x1 + x2 <= 2", a: 1, b: 1, c: 2, relation: "<=" },
      { label: "4x1 + 6x2 <= 9", a: 4, b: 6, c: 9, relation: "<=" },
      { label: "x1 >= 0", a: 1, b: 0, c: 0, relation: ">=" },
      { label: "x2 >= 0", a: 0, b: 1, c: 0, relation: ">=" }
    ]
  },
  {
    name: "Course LP Example 5 - unbounded",
    objectiveLabel: "max z = 3x1 + x2",
    mode: "max",
    objective: { x: 3, y: 1 },
    constraints: [
      { label: "-x1 + 2x2 <= 6", a: -1, b: 2, c: 6, relation: "<=" },
      { label: "x2 <= 4", a: 0, b: 1, c: 4, relation: "<=" },
      { label: "x1 >= 0", a: 1, b: 0, c: 0, relation: ">=" },
      { label: "x2 >= 0", a: 0, b: 1, c: 0, relation: ">=" }
    ]
  },
  {
    name: "Course LP Example 6 - inconsistent constraints",
    objectiveLabel: "min z = -2x1 + 3x2",
    mode: "min",
    objective: { x: -2, y: 3 },
    constraints: [
      { label: "-x1 + 2x2 <= 2", a: -1, b: 2, c: 2, relation: "<=" },
      { label: "2x1 - x2 <= 3", a: 2, b: -1, c: 3, relation: "<=" },
      { label: "x2 >= 4", a: 0, b: 1, c: 4, relation: ">=" },
      { label: "x1 >= 0", a: 1, b: 0, c: 0, relation: ">=" },
      { label: "x2 >= 0", a: 0, b: 1, c: 0, relation: ">=" }
    ]
  },
  {
    name: "Extra Demo LP Problem",
    objectiveLabel: "max z = 3x1 + 2x2",
    mode: "max",
    objective: { x: 3, y: 2 },
    constraints: [
      { label: "x1 + x2 <= 6", a: 1, b: 1, c: 6, relation: "<=" },
      { label: "2x1 + x2 <= 8", a: 2, b: 1, c: 8, relation: "<=" },
      { label: "x1 >= 0", a: 1, b: 0, c: 0, relation: ">=" },
      { label: "x2 >= 0", a: 0, b: 1, c: 0, relation: ">=" }
    ]
  }
];

export const lagrangeExample = {
  name: "Course Lagrange equality example",
  objectiveLabel: "max f(x,y)=10-x^2-(y-2)^2",
  constraintLabel: "h(x,y)=x+2y-5=0",
  objective: (p: Point) => 10 - p.x * p.x - (p.y - 2) ** 2,
  constraint: (p: Point) => p.x + 2 * p.y - 5,
  optimum: { x: 1 / 5, y: 12 / 5 },
  lambda: 2 / 5,
  value: 49 / 5
};

export const constrainedExamples: ConstrainedProblem[] = [
  {
    name: "KKT example - inequality active set",
    objectiveLabel: "min f(x,y)=(x-2)^2+(y-1)^2",
    objective: (p) => (p.x - 2) ** 2 + (p.y - 1) ** 2,
    constraints: [
      { label: "x^2 <= y", kind: "ineq", display: "g1=x^2-y <= 0", fn: (p) => p.x * p.x - p.y },
      { label: "x + y <= 2", kind: "ineq", display: "g2=x+y-2 <= 0", fn: (p) => p.x + p.y - 2 }
    ],
    bounds: { x: [-0.4, 2.4], y: [-0.1, 2.6] },
    start: { x: 0.25, y: 1.8 }
  },
  {
    name: "Interior penalty example - min x1^2+x2^2",
    objectiveLabel: "min f(x1,x2)=x1^2+x2^2",
    objective: (p) => p.x * p.x + p.y * p.y,
    constraints: [
      { label: "x1 + x2 >= 1", kind: "ineq", display: "g1=1-x1-x2 <= 0", fn: (p) => 1 - p.x - p.y },
      { label: "x1 >= 0", kind: "ineq", display: "g2=-x1 <= 0", fn: (p) => -p.x },
      { label: "x2 >= 0", kind: "ineq", display: "g3=-x2 <= 0", fn: (p) => -p.y }
    ],
    bounds: { x: [-0.25, 1.6], y: [-0.25, 1.6] },
    start: { x: 1.35, y: 0.15 }
  },
  {
    name: "Penalty exterior 2D equality example",
    objectiveLabel: "min f(x,y)=2x^2+2xy+y^2-2y",
    objective: (p) => 2 * p.x * p.x + 2 * p.x * p.y + p.y * p.y - 2 * p.y,
    constraints: [
      { label: "x = 0", kind: "eq", display: "h=x=0", fn: (p) => p.x }
    ],
    bounds: { x: [-1.2, 1.2], y: [-0.5, 2.5] },
    start: { x: 0.9, y: -0.1 }
  },
  {
    name: "Penalty exterior 2D inequality example",
    objectiveLabel: "min f(x1,x2)=-x1x2",
    objective: (p) => -p.x * p.y,
    constraints: [
      { label: "x1 + 2x2 <= 4", kind: "ineq", display: "g1=x1+2x2-4 <= 0", fn: (p) => p.x + 2 * p.y - 4 },
      { label: "x1 >= 0", kind: "ineq", display: "g2=-x1 <= 0", fn: (p) => -p.x },
      { label: "x2 >= 0", kind: "ineq", display: "g3=-x2 <= 0", fn: (p) => -p.y }
    ],
    bounds: { x: [-0.2, 4.3], y: [-0.2, 2.5] },
    start: { x: 3.6, y: 1.2 }
  },
  {
    name: "Penalty interior two-constraint example",
    objectiveLabel: "min f(x1,x2)=x1-2x2",
    objective: (p) => p.x - 2 * p.y,
    constraints: [
      { label: "1 + x1 - x2^2 >= 0", kind: "ineq", display: "g1=x2^2-x1-1 <= 0", fn: (p) => p.y * p.y - p.x - 1 },
      { label: "x2 >= 0", kind: "ineq", display: "g2=-x2 <= 0", fn: (p) => -p.y }
    ],
    bounds: { x: [-1.2, 4.2], y: [-0.2, 2.5] },
    start: { x: 2.2, y: 0.4 }
  },
  {
    name: "Equality boundary demo",
    objectiveLabel: "min f(x,y)=(x-1)^2+(y-2)^2",
    objective: (p) => (p.x - 1) ** 2 + (p.y - 2) ** 2,
    constraints: [
      { label: "x + y = 3", kind: "eq", display: "h=x+y-3=0", fn: (p) => p.x + p.y - 3 },
      { label: "x >= 0", kind: "ineq", display: "g1=-x <= 0", fn: (p) => -p.x },
      { label: "y >= 0", kind: "ineq", display: "g2=-y <= 0", fn: (p) => -p.y },
      { label: "x <= 2.5", kind: "ineq", display: "g3=x-2.5 <= 0", fn: (p) => p.x - 2.5 }
    ],
    bounds: { x: [-0.2, 3.2], y: [-0.2, 3.2] },
    start: { x: 2.8, y: 0.4 }
  }
];
