import type { Constraint, ConstrainedProblem, LpProblem, NonlinearConstraint, Point } from "./types";
import { compile2D } from "./math";

export function parseLinearObjective(source: string) {
  const coeffs = linearCoefficients(source.replace(/^z\s*=\s*/i, ""));
  return { x: coeffs.x, y: coeffs.y };
}

export function parseLinearConstraint(source: string): Constraint {
  const parsed = splitRelation(source);
  const left = linearCoefficients(parsed.left);
  const right = linearCoefficients(parsed.right);
  if (Math.abs(right.x) > 1e-10 || Math.abs(right.y) > 1e-10) {
    throw new Error("Right side of an LP constraint must be a constant");
  }
  return {
    label: source.trim(),
    a: left.x,
    b: left.y,
    c: right.constant - left.constant,
    relation: parsed.relation
  };
}

export function parseLinearConstraints(source: string) {
  return source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseLinearConstraint);
}

export function parseNonlinearConstraint(source: string): NonlinearConstraint {
  const parsed = splitRelation(source);
  const fn = compile2D(`(${parsed.left}) - (${parsed.right})`);
  const kind = parsed.relation === "=" ? "eq" : "ineq";
  const sign = parsed.relation === ">=" ? -1 : 1;
  return {
    label: source.trim(),
    kind,
    display: kind === "eq" ? `${parsed.left}-${parsed.right}=0` : `${sign === 1 ? parsed.left : parsed.right} - ${sign === 1 ? parsed.right : parsed.left} <= 0`,
    fn: kind === "eq" ? fn : (p: Point) => sign * fn(p)
  };
}

export function parseNonlinearConstraints(source: string) {
  return source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseNonlinearConstraint);
}

export function makeCustomConstrainedProblem(
  objectiveSource: string,
  constraintsSource: string,
  start: Point,
  bounds: { x: [number, number]; y: [number, number] }
): ConstrainedProblem {
  const objective = compile2D(objectiveSource);
  const constraints = parseNonlinearConstraints(constraintsSource);
  if (constraints.length < 1) throw new Error("At least one constraint is required");
  return {
    name: "Custom constrained problem",
    objectiveLabel: `min f(x,y)=${objectiveSource}`,
    objective,
    constraints,
    bounds,
    start
  };
}

export function makeCustomLpProblem(
  objectiveSource: string,
  mode: "max" | "min",
  constraintsSource: string
): LpProblem {
  const objective = parseLinearObjective(objectiveSource);
  const constraints = parseLinearConstraints(constraintsSource);
  if (constraints.length < 2) throw new Error("Enter at least two LP constraints");
  return {
    name: "Custom LP Problem",
    objectiveLabel: `${mode} z = ${objectiveSource.replace(/^z\s*=\s*/i, "")}`,
    mode,
    objective,
    constraints
  };
}

function splitRelation(source: string): { left: string; right: string; relation: "<=" | ">=" | "=" } {
  const match = source.match(/(.+?)(<=|>=|=)(.+)/);
  if (!match) throw new Error(`Constraint "${source}" must include <=, >=, or =`);
  return {
    left: match[1].trim(),
    relation: match[2] as "<=" | ">=" | "=",
    right: match[3].trim()
  };
}

function linearCoefficients(source: string) {
  const compact = source.replace(/\s+/g, "");
  if (!compact || /\+\+|--|\*\*|\/\/|^[*/]|[+\-*/]$/.test(compact)) {
    throw new Error(`Invalid linear expression "${source}"`);
  }
  const normalized = compact.replace(/-/g, "+-");
  const terms = normalized.split("+").filter(Boolean);
  const coeffs = { x: 0, y: 0, constant: 0 };
  for (const term of terms) {
    if (term.includes("*")) {
      const [left, right] = term.split("*");
      if (right === "x" || right === "y") coeffs[right] += numericCoeff(left);
      else if (left === "x" || left === "y") coeffs[left] += numericCoeff(right);
      else coeffs.constant += Number(term);
    } else if (term.endsWith("x")) {
      coeffs.x += numericCoeff(term.slice(0, -1));
    } else if (term.endsWith("y")) {
      coeffs.y += numericCoeff(term.slice(0, -1));
    } else {
      const value = Number(term);
      if (!Number.isFinite(value)) throw new Error(`Invalid linear term "${term}"`);
      coeffs.constant += value;
    }
  }
  return coeffs;
}

function numericCoeff(source: string) {
  if (source === "" || source === "+") return 1;
  if (source === "-") return -1;
  const value = Number(source);
  if (!Number.isFinite(value)) throw new Error(`Invalid coefficient "${source}"`);
  return value;
}
