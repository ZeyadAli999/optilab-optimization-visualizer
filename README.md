# OptiLab - Course-Aligned Optimization Visualizer

[![Frontend checks](https://github.com/ZeyadAli999/optilab-optimization-visualizer/actions/workflows/ci.yml/badge.svg)](https://github.com/ZeyadAli999/optilab-optimization-visualizer/actions/workflows/ci.yml)

> **Frontend engineering + numerical algorithms | React, TypeScript, Plotly, Vitest**
>
> An interactive educational tool for exploring optimization methods, inspecting intermediate steps and comparing algorithms. The application implements course-aligned numerical methods; it does **not** claim to be a general-purpose symbolic optimization solver.

## Engineering snapshot

| Area | Design and implementation |
| --- | --- |
| **Algorithm layer** | Linear programming, Newton's method, interval search, gradient methods, Lagrange multipliers, KKT and penalty-method demonstrations |
| **Visualization** | React UI with Plotly charts and KaTeX math rendering |
| **Model/UI separation** | Numerical methods live in `src/domain/algorithms.ts`; examples and presentation contracts are separated from the UI |
| **Comparative analysis** | Compare Two / Compare All screens, examples tied to lecture notation, plus a separately labelled ACO bonus |
| **Validation** | Vitest tests and a TypeScript-checked production build available through npm scripts |

### Code map

- [Numerical methods](src/domain/algorithms.ts) and [algorithm regression tests](src/domain/algorithms.test.ts)
- [Course presets and examples](src/domain/courseData.ts)
- [Comparison logic](src/domain/comparison.ts)
- [ACO bonus algorithm](src/domain/aco.ts)
- [React application](src/App.tsx) and [styles](src/styles.css)

### Reproduce locally

```bash
npm ci
npm test
npm run build
npm run dev
```

**Design constraints:** 2D LP visualizations are bounded by the educational method; several constrained optimization views sample a grid and are approximate. Plotly adds significant bundle weight. No claim of production numerical-library accuracy or current test results is made without a fresh run.

---

OptiLab is an interactive React + TypeScript dashboard for the uploaded optimization course files. The app is organized to follow the professor's lecture flow and uses course-style notation, examples, formulas, and viva wording wherever the source material provides them.

## How To Run

```bash
npm install
npm run dev
```

Open the Vite URL, usually:

```text
http://127.0.0.1:5173/
```

Verification commands:

```bash
npm test
npm run build
```

## Course Alignment

The implemented course order is:

1. Linear Programming
2. Extrema / Nonlinear Optimization
3. Numerical Optimization / Newton's Method
4. Golden Section Search Method
5. Fibonacci Search Method
6. Steepest Ascent / Steepest Descent
7. Lagrange Multipliers Method
8. Equality Constraints
9. Inequality Constrained Optimization / KKT
10. Penalty Method
11. ACO Bonus / Advanced

ACO is not part of the provided course files. It remains available only as a clearly marked bonus/advanced module for discrete route optimization.

## Course Methods Covered

- **Linear Programming**: graphical method, feasible region, corner-point theorem, `x1`, `x2`, and objective `z`.
- **Extrema / Nonlinear Optimization**: critical points from `∇P=0`, Hessian matrix `H(X*)=∇²P(X*)`, and local min/max/saddle classification.
- **Numerical Optimization / Newton's Method**: `x_{n+1}=x_n-f'(x_n)/f''(x_n)` and multidimensional Newton notation.
- **Golden Section Search Method**: professor interval notation `xl`, `xu`, `x1`, `x2`, `d=(√5-1)/2(xu-xl)`, and tolerance `ε`.
- **Fibonacci Search Method**: `F0=F1=1`, interval `a1,b1,L1`, internal points `c1,d1`, and the course `n=4` worked example.
- **Steepest Ascent / Steepest Descent**: maximum update `X1=X0+α∇F(X0)` and minimum update `X1=X0-α∇F(X0)`.
- **Lagrange Multipliers Method**: `L=f+λh`, stationarity equations, equality boundary, and tangency explanation.
- **Equality Constraints**: feasible points restricted to `h(x,y)=0`, connected to the Lagrange lecture.
- **Inequality Constrained Optimization / KKT**: stationarity, primal feasibility, dual feasibility, and complementary slackness.
- **Penalty Method**: exterior/interior penalty examples shown as course numerical transformations from constrained to unconstrained form.

## Professor Presets

Course examples are listed before extra examples in the app.

- LP course examples 1-6 from the lecture/problem material, including bounded, alternate optimum, unbounded, and infeasible cases.
- Golden Section assignment example: maximize `5 sin(x)(1+cos(x))` on `[0,π/2]` with `ε=0.00001`, expected near `x=π/3`.
- Fibonacci worked example: minimize `x^2-7x+12` on `[2,4]` with `n=4`, expected displayed point near `x=3.6`.
- Fibonacci tolerance note: same function with `ε=.05` and `n=9`.
- Newton lecture example: maximize `4 sin(x)(1+cos(x))` from the lecture-style numerical setup.
- Steepest Ascent course example: maximize `F=2xy+2x-x^2-2y^2` from `X0=(-2,0)` with `α=0.1`.
- Hessian examples for extrema/classification, including local minimum and saddle classifications.
- Lagrange equality example: `f=10-x^2-(y-2)^2`, `h=x+2y-5=0`.
- KKT and penalty presets from the inequality and penalty materials.

Extra/demo examples are kept only where they help show app behavior. They are labeled as Extra Example, Demo Example, or Bonus / Advanced.

## Notation Choices

Visible formulas use course notation rather than code-style names:

- LP variables: `x1`, `x2`, `z`
- Golden Section: `xl`, `xu`, `x1`, `x2`, `d`, `ε`
- Fibonacci: `a1`, `b1`, `L1`, `c1`, `d1`, `F0=F1=1`
- Steepest method: `X0`, `X1`, `Xk`, `α`, `∇F`
- Lagrange/KKT: `L`, `λ`, `μ`, `h(x)=0`, `g(x)≤0`
- Penalty Method: penalty parameter `r` or `R` where the example requires it

Formula panels are rendered with KaTeX/textbook notation. Programming-style identifiers are avoided in course formula cards.

## Demo Flow

1. Open **Linear Programming** and show the graphical feasible region, corner table, and objective `z`.
2. Open **Extrema / Nonlinear Optimization** and explain `∇P=0` followed by Hessian classification.
3. Open **Numerical Optimization / Newton's Method** and show Newton as the primary numerical lecture method.
4. Open **Golden Section Search Method** and step through `xl`, `xu`, `x1`, `x2`.
5. Open **Fibonacci Search Method** and show the `n=4` worked example before the `ε=.05` note.
6. Open **Steepest Ascent / Steepest Descent** and begin with the professor's ascent example.
7. Open **Lagrange Multipliers Method** and show `L=f+λh` with the equality boundary.
8. Open **Equality Constraints**, then **Inequality Constrained Optimization / KKT** for feasibility and active constraints.
9. Open **Penalty Method** after KKT as the course transformation idea.
10. Open **Compare Two** and **Compare All** to summarize applicability.
11. Show **ACO Bonus / Advanced** last only if asked about extra/future work.

## Compare Views

Compare Two and Compare All separate course methods from extras:

- Golden Section and Fibonacci are 1D derivative-free interval methods.
- Newton is the primary numerical lecture method for stationary points.
- Grid Search appears only as an extra numerical baseline.
- Lagrange Multipliers Method is exact for the displayed course equality example.
- KKT and Penalty Method are educational numerical/visual views for constrained examples.
- ACO is marked Bonus / Advanced and is not presented as a course method.

## App Structure

- `src/domain/courseData.ts` - course method order, titles, examples, notation, and preset metadata.
- `src/domain/algorithms.ts` - numerical algorithms and educational solvers.
- `src/domain/comparison.ts` - Compare Two / Compare All rows and interpretation text.
- `src/App.tsx` - UI, formula cards, tables, Plotly visualizations, Professor View, and setup controls.
- `src/domain/algorithms.test.ts` - course preset and algorithm regression tests.
- `src/domain/aco.ts` - bonus ACO route optimizer.
- `src/styles.css` - application styling.

## Limitations

- The app is a course visualizer, not a general symbolic optimization package.
- Custom 2D constrained problems are sampled numerically, so those results are approximate.
- Equality constraints are visualized with a tolerance band on the grid.
- Graphical LP is intentionally limited to two variables, matching the course method.
- Penalty Method is shown as an educational transformation and visual path, not as a full symbolic penalty-method solver.
- ACO is stochastic, discrete, and outside the course scope.
- The production build may warn about Plotly bundle size; this is expected for the visualization library.
