import type { Point } from "./types";

export const range = (start: number, end: number, count: number) => {
  const step = (end - start) / Math.max(1, count - 1);
  return Array.from({ length: count }, (_, i) => start + i * step);
};

export const round = (value: number, digits = 4) => {
  if (!Number.isFinite(value)) return value;
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
};

export const fmt = (value: number, digits = 4) =>
  Number.isFinite(value) ? round(value, digits).toString() : "n/a";

export const norm = (p: Point) => Math.hypot(p.x, p.y);

export const add = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y });

export const sub = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y });

export const scale = (a: Point, t: number): Point => ({ x: a.x * t, y: a.y * t });

export const finiteDifferenceGradient = (fn: (p: Point) => number, p: Point): Point => {
  const h = 1e-5;
  return {
    x: (fn({ x: p.x + h, y: p.y }) - fn({ x: p.x - h, y: p.y })) / (2 * h),
    y: (fn({ x: p.x, y: p.y + h }) - fn({ x: p.x, y: p.y - h })) / (2 * h)
  };
};

type Token =
  | { type: "number"; value: number }
  | { type: "identifier"; value: string }
  | { type: "operator"; value: string }
  | { type: "paren"; value: "(" | ")" }
  | { type: "comma"; value: "," };

type Node =
  | { type: "number"; value: number }
  | { type: "variable"; name: "x" | "y" }
  | { type: "unary"; op: "-"; value: Node }
  | { type: "binary"; op: "+" | "-" | "*" | "/" | "^"; left: Node; right: Node }
  | { type: "call"; name: string; args: Node[] };

const functions: Record<string, (...args: number[]) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  exp: Math.exp,
  log: Math.log,
  sqrt: Math.sqrt,
  abs: Math.abs,
  pow: Math.pow
};

export const compile1D = (source: string): ((x: number) => number) => {
  const ast = parseExpression(source);
  return (x: number) => evaluate(ast, { x, y: 0 });
};

export const compile2D = (source: string): ((p: Point) => number) => {
  const ast = parseExpression(source);
  return (point: Point) => evaluate(ast, point);
};

export function parseExpression(source: string): Node {
  const parser = new ExpressionParser(tokenize(source));
  return parser.parse();
}

function evaluate(node: Node, vars: Point): number {
  switch (node.type) {
    case "number":
      return node.value;
    case "variable":
      return vars[node.name];
    case "unary":
      return -evaluate(node.value, vars);
    case "binary": {
      const left = evaluate(node.left, vars);
      const right = evaluate(node.right, vars);
      if (node.op === "+") return left + right;
      if (node.op === "-") return left - right;
      if (node.op === "*") return left * right;
      if (node.op === "/") return left / right;
      return left ** right;
    }
    case "call": {
      const fn = functions[node.name];
      if (!fn) throw new Error(`Unsupported function "${node.name}"`);
      return fn(...node.args.map((arg) => evaluate(arg, vars)));
    }
  }
}

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < source.length) {
    const char = source[i];
    if (/\s/.test(char)) {
      i += 1;
      continue;
    }
    if (/[0-9.]/.test(char)) {
      const start = i;
      i += 1;
      while (i < source.length && /[0-9.eE+-]/.test(source[i])) {
        const prev = source[i - 1];
        if ((source[i] === "+" || source[i] === "-") && prev.toLowerCase() !== "e") break;
        i += 1;
      }
      const value = Number(source.slice(start, i));
      if (!Number.isFinite(value)) throw new Error("Invalid number");
      tokens.push({ type: "number", value });
      continue;
    }
    if (/[a-zA-Z_]/.test(char)) {
      const start = i;
      i += 1;
      while (i < source.length && /[a-zA-Z0-9_]/.test(source[i])) i += 1;
      const value = source.slice(start, i).toLowerCase();
      if (value === "pi") tokens.push({ type: "number", value: Math.PI });
      else if (value === "e") tokens.push({ type: "number", value: Math.E });
      else tokens.push({ type: "identifier", value });
      continue;
    }
    if (char === "*" && source[i + 1] === "*") {
      tokens.push({ type: "operator", value: "^" });
      i += 2;
      continue;
    }
    if ("+-*/^".includes(char)) {
      tokens.push({ type: "operator", value: char });
      i += 1;
      continue;
    }
    if (char === "(" || char === ")") {
      tokens.push({ type: "paren", value: char });
      i += 1;
      continue;
    }
    if (char === ",") {
      tokens.push({ type: "comma", value: "," });
      i += 1;
      continue;
    }
    throw new Error(`Unsupported character "${char}"`);
  }
  return insertImplicitMultiplication(tokens);
}

function insertImplicitMultiplication(tokens: Token[]) {
  const output: Token[] = [];
  tokens.forEach((token, index) => {
    const prev = tokens[index - 1];
    if (prev && needsImplicitMultiplication(prev, token)) output.push({ type: "operator", value: "*" });
    output.push(token);
  });
  return output;
}

function needsImplicitMultiplication(left: Token, right: Token) {
  const leftValue = left.type === "number" || left.type === "identifier" || (left.type === "paren" && left.value === ")");
  const rightValue = right.type === "number" || right.type === "identifier" || (right.type === "paren" && right.value === "(");
  if (!leftValue || !rightValue) return false;
  if (left.type === "identifier" && right.type === "paren" && right.value === "(") return false;
  return true;
}

class ExpressionParser {
  private index = 0;

  constructor(private readonly tokens: Token[]) {}

  parse() {
    if (this.tokens.length === 0) throw new Error("Expression is empty");
    const node = this.parseExpression();
    if (this.peek()) throw new Error("Unexpected token");
    return node;
  }

  private parseExpression() {
    return this.parseAddSub();
  }

  private parseAddSub(): Node {
    let node = this.parseMulDiv();
    while (this.matchOperator("+") || this.matchOperator("-")) {
      const op = this.previous().value as "+" | "-";
      const right = this.parseMulDiv();
      node = { type: "binary", op, left: node, right };
    }
    return node;
  }

  private parseMulDiv(): Node {
    let node = this.parsePower();
    while (this.matchOperator("*") || this.matchOperator("/")) {
      const op = this.previous().value as "*" | "/";
      const right = this.parsePower();
      node = { type: "binary", op, left: node, right };
    }
    return node;
  }

  private parsePower(): Node {
    let node = this.parseUnary();
    if (this.matchOperator("^")) {
      const right = this.parsePower();
      node = { type: "binary", op: "^", left: node, right };
    }
    return node;
  }

  private parseUnary(): Node {
    if (this.matchOperator("+")) return this.parseUnary();
    if (this.matchOperator("-")) return { type: "unary", op: "-", value: this.parseUnary() };
    return this.parsePrimary();
  }

  private parsePrimary(): Node {
    const token = this.advance();
    if (!token) throw new Error("Unexpected end of expression");
    if (token.type === "number") return { type: "number", value: token.value };
    if (token.type === "identifier") {
      if (token.value === "x" || token.value === "y") return { type: "variable", name: token.value };
      if (!this.matchParen("(")) throw new Error(`Unsupported variable "${token.value}"`);
      const args: Node[] = [];
      if (!this.checkParen(")")) {
        do {
          args.push(this.parseExpression());
        } while (this.matchComma());
      }
      this.consumeParen(")");
      if (!functions[token.value]) throw new Error(`Unsupported function "${token.value}"`);
      return { type: "call", name: token.value, args };
    }
    if (token.type === "paren" && token.value === "(") {
      const node = this.parseExpression();
      this.consumeParen(")");
      return node;
    }
    throw new Error("Unexpected token");
  }

  private matchOperator(value: string) {
    if (this.peek()?.type === "operator" && this.peek()?.value === value) {
      this.index += 1;
      return true;
    }
    return false;
  }

  private matchParen(value: "(" | ")") {
    if (this.checkParen(value)) {
      this.index += 1;
      return true;
    }
    return false;
  }

  private matchComma() {
    if (this.peek()?.type === "comma") {
      this.index += 1;
      return true;
    }
    return false;
  }

  private consumeParen(value: "(" | ")") {
    if (!this.matchParen(value)) throw new Error(`Expected "${value}"`);
  }

  private checkParen(value: "(" | ")") {
    return this.peek()?.type === "paren" && this.peek()?.value === value;
  }

  private advance() {
    return this.tokens[this.index++];
  }

  private previous() {
    return this.tokens[this.index - 1] as Token;
  }

  private peek() {
    return this.tokens[this.index];
  }
}
