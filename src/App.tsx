import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import Plot from "react-plotly.js";
import {
  Activity,
  BarChart3,
  BookOpen,
  ChevronsRight,
  CircleDot,
  Equal,
  Gauge,
  GitCompare,
  LineChart,
  Network,
  Pause,
  Play,
  Presentation,
  RotateCcw,
  Sigma,
  StepForward,
  Target,
  TrendingDown,
  Zap
} from "lucide-react";
import { generateCities, runAco } from "./domain/aco";
import {
  fibonacciSearch,
  goldenSectionSearch,
  gridSearch,
  newtonOneDimensional,
  solveConstrainedByGrid,
  solveLinearProgram,
  steepestDescent
} from "./domain/algorithms";
import { buildComparisonRows, interpretBestMethod } from "./domain/comparison";
import { makeCustomConstrainedProblem, makeCustomLpProblem, parseNonlinearConstraints } from "./domain/customProblems";
import {
  constrainedExamples,
  courseOneDExample,
  lagrangeExample,
  lpExamples,
  methodNames,
  methodOrder,
  methodSummaries,
  nonlinearExamples,
  numericalExample,
  oneDExamples,
  steepestExample
} from "./domain/courseData";
import { compile1D, compile2D, finiteDifferenceGradient, fmt, range } from "./domain/math";
import { clampPlaybackStep, getPlaybackMeta } from "./domain/playback";
import type { AcoParams, AcoResult, ComparisonRow, ConstrainedProblem, MethodId, Point, SearchResult } from "./domain/types";

const iconMap: Record<MethodId, typeof Activity> = {
  numerical: Gauge,
  steepest: TrendingDown,
  linear: BarChart3,
  nonlinear: LineChart,
  golden: CircleDot,
  fibonacci: Sigma,
  lagrange: Equal,
  equality: Target,
  inequality: Zap,
  penalty: Target,
  aco: Network
};

const plotLayout = {
  paper_bgcolor: "rgba(0,0,0,0)",
  plot_bgcolor: "rgba(4,15,28,0.72)",
  font: { color: "#d9f7ff", family: "Inter, system-ui, sans-serif" },
  margin: { l: 48, r: 20, t: 28, b: 42 },
  xaxis: { gridcolor: "rgba(119, 231, 255, 0.12)", zerolinecolor: "rgba(255,255,255,.2)" },
  yaxis: { gridcolor: "rgba(119, 231, 255, 0.12)", zerolinecolor: "rgba(255,255,255,.2)" },
  legend: { orientation: "h", y: -0.18 }
};

export default function App() {
  const [method, setMethod] = useState<MethodId>("golden");
  const [expression, setExpression] = useState(courseOneDExample.expression);
  const [interval, setIntervalValue] = useState(courseOneDExample.interval);
  const [tolerance, setTolerance] = useState(courseOneDExample.tolerance);
  const [fibN, setFibN] = useState(courseOneDExample.fibonacciN);
  const [oneDMode, setOneDMode] = useState<"min" | "max">(courseOneDExample.mode);
  const [oneDExampleIndex, setOneDExampleIndex] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showCompare, setShowCompare] = useState(true);
  const [compareAll, setCompareAll] = useState(false);
  const [compareTwo, setCompareTwo] = useState(false);
  const [compareMethodA, setCompareMethodA] = useState("Golden Section");
  const [compareMethodB, setCompareMethodB] = useState("Fibonacci");
  const [presentationMode, setPresentationMode] = useState(false);
  const [problemMode, setProblemMode] = useState<"preset" | "custom">("preset");
  const [lpIndex, setLpIndex] = useState(0);
  const [constraintIndex, setConstraintIndex] = useState(0);
  const [goldenMaxIterations, setGoldenMaxIterations] = useState(80);
  const [steepestExpression, setSteepestExpression] = useState("2*x*y + 2*x - x^2 - 2*y^2");
  const [steepestStart, setSteepestStart] = useState<Point>(steepestExample.start);
  const [steepestStep, setSteepestStep] = useState(steepestExample.stepSize);
  const [steepestTolerance, setSteepestTolerance] = useState(1e-4);
  const [steepestMaxIterations, setSteepestMaxIterations] = useState(120);
  const [lpMode, setLpMode] = useState<"max" | "min">("max");
  const [lpObjectiveText, setLpObjectiveText] = useState("3*x + 2*y");
  const [lpConstraintsText, setLpConstraintsText] = useState("x + y <= 6\n2*x + y <= 8\nx >= 0\ny >= 0");
  const [custom2D, setCustom2D] = useState("(x-1)^2 + (y-2)^2");
  const [customConstraintsText, setCustomConstraintsText] = useState("x + y = 3\nx >= 0\ny >= 0");
  const [customStart, setCustomStart] = useState<Point>({ x: 2.8, y: 0.4 });
  const [customBounds, setCustomBounds] = useState({ x: [-0.4, 3.4] as [number, number], y: [-0.4, 3.4] as [number, number] });
  const [acoCityText, setAcoCityText] = useState("");
  const [acoParams, setAcoParams] = useState<AcoParams>({
    cityCount: 9,
    antCount: 18,
    iterations: 55,
    alpha: 1,
    beta: 3,
    rho: 0.35,
    q: 80
  });

  const inputState = useMemo(
    () => validateInputs(expression, interval, tolerance, fibN, problemMode === "custom", custom2D, customConstraintsText),
    [custom2D, customConstraintsText, expression, fibN, interval, problemMode, tolerance]
  );
  const oneDFn = inputState.oneDFn;
  const golden = useMemo(
    () => goldenSectionSearch(oneDFn, inputState.interval[0], inputState.interval[1], inputState.tolerance, goldenMaxIterations, oneDMode),
    [goldenMaxIterations, oneDFn, inputState.interval, inputState.tolerance, oneDMode]
  );
  const fibonacci = useMemo(() => fibonacciSearch(oneDFn, inputState.interval[0], inputState.interval[1], inputState.fibN, oneDMode), [oneDFn, inputState.interval, inputState.fibN, oneDMode]);
  const grid = useMemo(() => gridSearch(oneDFn, inputState.interval[0], inputState.interval[1], Math.max(101, Math.ceil(1 / inputState.tolerance)), oneDMode), [oneDFn, inputState.interval, inputState.tolerance, oneDMode]);
  const numerical = useMemo(
    () =>
      newtonOneDimensional(
        numericalExample.derivative,
        numericalExample.secondDerivative,
        numericalExample.objective,
        numericalExample.x0
      ),
    []
  );
  const descentProblem = useMemo(() => {
    if (problemMode !== "custom") return {
      objective: steepestExample.objective,
      gradient: steepestExample.gradient,
      start: steepestExample.start,
      step: steepestExample.stepSize,
      tolerance: 1e-4,
      maxIterations: 120,
      label: steepestExample.objectiveLabel,
      mode: steepestExample.mode
    };
    try {
      const objective = compile2D(steepestExpression);
      objective(steepestStart);
      return {
        objective,
        gradient: (p: Point) => finiteDifferenceGradient(objective, p),
        start: steepestStart,
        step: steepestStep,
        tolerance: steepestTolerance,
        maxIterations: steepestMaxIterations,
        label: `min f(x,y)=${steepestExpression}`
      };
    } catch {
      return {
        objective: () => NaN,
        gradient: () => ({ x: NaN, y: NaN }),
        start: steepestStart,
        step: steepestStep,
        tolerance: steepestTolerance,
        maxIterations: steepestMaxIterations,
        label: `invalid f(x,y)=${steepestExpression}`
      };
    }
  }, [problemMode, steepestExpression, steepestMaxIterations, steepestStart, steepestStep, steepestTolerance]);
  const descent = useMemo(
    () =>
      steepestDescent(
        descentProblem.objective,
        descentProblem.gradient,
        descentProblem.start,
        descentProblem.step,
        descentProblem.tolerance,
        descentProblem.maxIterations,
        "mode" in descentProblem ? descentProblem.mode : "min"
      ),
    [descentProblem]
  );
  const lpProblem = useMemo(() => {
    if (problemMode !== "custom") return lpExamples[lpIndex];
    try {
      return makeCustomLpProblem(lpObjectiveText, lpMode, lpConstraintsText);
    } catch {
      return invalidLpProblem(lpMode);
    }
  }, [lpConstraintsText, lpIndex, lpMode, lpObjectiveText, problemMode]);
  const lpResult = useMemo(() => solveLinearProgram(lpProblem), [lpProblem]);
  const constrainedProblem = useMemo(
    () =>
      problemMode === "custom"
        ? buildCustomConstrained(custom2D, customConstraintsText, customStart, customBounds)
        : presetConstrainedProblem(method, constraintIndex),
    [constraintIndex, custom2D, customBounds, customConstraintsText, customStart, method, problemMode]
  );
  const constrained = useMemo(() => solveConstrainedByGrid(constrainedProblem), [constrainedProblem]);
  const acoCities = useMemo(() => {
    if (problemMode !== "custom" || !acoCityText.trim()) return generateCities(acoParams.cityCount);
    try {
      return parseCities(acoCityText);
    } catch {
      return [];
    }
  }, [acoCityText, acoParams.cityCount, problemMode]);
  const aco = useMemo(() => runAco(acoCities, acoParams), [acoCities, acoParams]);
  const comparisons = useMemo(
    () => buildComparisonRows({ golden, fibonacci, grid, numerical, descent, lpResult, constrained, aco }),
    [golden, fibonacci, grid, numerical, descent, lpResult, constrained, aco]
  );

  const compareFirst = comparisons.find((row) => row.name === compareMethodA) ?? comparisons[0];
  const compareSecond = comparisons.find((row) => row.name === compareMethodB) ?? comparisons[1] ?? comparisons[0];
  const compareTwoCurveLength = compareFirst && compareSecond && areDirectlyComparable(compareFirst, compareSecond)
    ? Math.max(compareFirst.curve.length, compareSecond.curve.length)
    : 0;
  const compareAllCurveLength = comparisons.reduce((max, row) => Math.max(max, row.curve.length), 0);
  const playbackMeta = getPlaybackMeta({
    method,
    compareTwo,
    compareAll,
    goldenLength: golden.history.length,
    fibonacciLength: fibonacci.history.length,
    numericalLength: numerical.history.length,
    steepestLength: descent.history.length,
    lpCornerCount: lpResult.corners.length,
    constrainedPathLength: constrained.path.length,
    acoLength: aco.history.length,
    compareTwoCurveLength,
    compareAllCurveLength
  });
  const currentStep = clampPlaybackStep(stepIndex, playbackMeta);
  const totalPlaybackSteps = playbackMeta.hasPlayback ? playbackMeta.maxStep + 1 : 1;
  const playbackDisabledReason = playbackMeta.reasonIfDisabled ?? "No step-by-step simulation available for this method.";

  useEffect(() => {
    setStepIndex(0);
    setIsPlaying(false);
  }, [method, compareAll, compareTwo, compareMethodA, compareMethodB, expression, interval, tolerance, fibN, lpIndex, constraintIndex, problemMode, acoParams, steepestExpression, lpObjectiveText, lpConstraintsText, custom2D, customConstraintsText, acoCityText]);

  useEffect(() => {
    setStepIndex((current) => clampPlaybackStep(current, playbackMeta));
    if (!playbackMeta.hasPlayback) setIsPlaying(false);
  }, [playbackMeta.hasPlayback, playbackMeta.maxStep]);

  useEffect(() => {
    if (!isPlaying || !playbackMeta.hasPlayback) return;
    const timer = window.setInterval(() => {
      setStepIndex((current) => {
        if (current >= playbackMeta.maxStep) {
          setIsPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, 620);
    return () => window.clearInterval(timer);
  }, [playbackMeta.hasPlayback, playbackMeta.maxStep, isPlaying]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">OL</div>
          <div>
            <strong>OptiLab</strong>
            <span>Optimization Visualizer</span>
          </div>
        </div>
        <nav className="method-list" aria-label="Optimization methods">
          {methodOrder.map((id) => {
            const Icon = iconMap[id];
            return (
              <div key={id} className="method-group">
                {id === "aco" ? <span className="advanced-label">Advanced Methods</span> : null}
                <button className={id === method ? "method active" : "method"} onClick={() => setMethod(id)}>
                  <Icon size={18} />
                  <span>{methodNames[id]}</span>
                </button>
              </div>
            );
          })}
        </nav>
        <div className="sidebar-note">
          <BookOpen size={18} />
          <span>Professor flow: LP, extrema/Hessian, Newton, Golden Section, Fibonacci, Steepest, Lagrange, KKT, then Penalty Method. ACO is bonus only.</span>
        </div>
      </aside>

      <main className="workspace">
        <header className="hero-panel">
          <div>
            <p className="eyebrow">Presentation-ready simulation lab</p>
            <h1>{methodNames[method]}</h1>
            <p>{methodSummaries[method].idea}</p>
          </div>
          <div className="hero-actions">
            <button
              className="icon-button"
              disabled={!playbackMeta.hasPlayback}
              onClick={() => playbackMeta.hasPlayback && setIsPlaying((value) => !value)}
              title={playbackMeta.hasPlayback ? isPlaying ? "Pause" : "Run" : playbackDisabledReason}
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </button>
            <button
              className="icon-button"
              disabled={!playbackMeta.hasPlayback || currentStep >= playbackMeta.maxStep}
              onClick={() => setStepIndex((value) => clampPlaybackStep(value + 1, playbackMeta))}
              title={playbackMeta.hasPlayback ? "Step" : playbackDisabledReason}
            >
              <StepForward size={18} />
            </button>
            <button className="icon-button" onClick={() => { setIsPlaying(false); setStepIndex(0); }} title="Reset">
              <RotateCcw size={18} />
            </button>
            <span className={playbackMeta.hasPlayback ? "playback-note" : "playback-note disabled"}>
              {playbackMeta.hasPlayback ? `${playbackMeta.stepLabel} ${currentStep + 1} / ${totalPlaybackSteps}` : playbackDisabledReason}
            </span>
            <button className={showCompare ? "control-button active" : "control-button"} onClick={() => setShowCompare((value) => !value)}>
              <GitCompare size={16} />
              Compare
            </button>
            <button className={compareTwo ? "control-button active" : "control-button"} onClick={() => setCompareTwo((value) => !value)}>
              <GitCompare size={16} />
              Compare Two
            </button>
            <button className={compareAll ? "control-button gold active" : "control-button gold"} onClick={() => setCompareAll((value) => !value)}>
              <ChevronsRight size={16} />
              Compare All
            </button>
            <button className={presentationMode ? "control-button active" : "control-button"} onClick={() => setPresentationMode((value) => !value)}>
              <Presentation size={16} />
              Professor View
            </button>
          </div>
        </header>

        <section className="grid-layout">
          <section className="setup-panel panel">
            <PanelTitle title="Problem Setup" subtitle="Presets plus simple custom inputs" />
            <SetupControls
              method={method}
              problemMode={problemMode}
              expression={expression}
              setExpression={setExpression}
              interval={interval}
              setIntervalValue={setIntervalValue}
              tolerance={tolerance}
              setTolerance={setTolerance}
              fibN={fibN}
              setFibN={setFibN}
              oneDMode={oneDMode}
              setOneDMode={setOneDMode}
              oneDExampleIndex={oneDExampleIndex}
              setOneDExampleIndex={(index) => {
                const example = oneDExamples[index];
                setOneDExampleIndex(index);
                setExpression(example.expression);
                setIntervalValue(example.interval);
                setTolerance(example.tolerance);
                setFibN(example.fibonacciN);
                setOneDMode("mode" in example ? example.mode ?? "min" : "min");
              }}
              goldenMaxIterations={goldenMaxIterations}
              setGoldenMaxIterations={setGoldenMaxIterations}
              setProblemMode={setProblemMode}
              lpIndex={lpIndex}
              setLpIndex={setLpIndex}
              lpMode={lpMode}
              setLpMode={setLpMode}
              lpObjectiveText={lpObjectiveText}
              setLpObjectiveText={setLpObjectiveText}
              lpConstraintsText={lpConstraintsText}
              setLpConstraintsText={setLpConstraintsText}
              constraintIndex={constraintIndex}
              setConstraintIndex={setConstraintIndex}
              steepestExpression={steepestExpression}
              setSteepestExpression={setSteepestExpression}
              steepestStart={steepestStart}
              setSteepestStart={setSteepestStart}
              steepestStep={steepestStep}
              setSteepestStep={setSteepestStep}
              steepestTolerance={steepestTolerance}
              setSteepestTolerance={setSteepestTolerance}
              steepestMaxIterations={steepestMaxIterations}
              setSteepestMaxIterations={setSteepestMaxIterations}
              custom2D={custom2D}
              setCustom2D={setCustom2D}
              customConstraintsText={customConstraintsText}
              setCustomConstraintsText={setCustomConstraintsText}
              customStart={customStart}
              setCustomStart={setCustomStart}
              customBounds={customBounds}
              setCustomBounds={setCustomBounds}
              issues={inputState.issues}
              acoParams={acoParams}
              setAcoParams={setAcoParams}
              acoCityText={acoCityText}
              setAcoCityText={setAcoCityText}
              onApplyProblem={() => {
                setStepIndex(0);
                setIsPlaying(false);
              }}
              onResetProblem={() => {
                resetCurrentProblem(method, {
                  setProblemMode,
                  oneDExampleIndex,
                  setExpression,
                  setIntervalValue,
                  setTolerance,
                  setFibN,
                  setOneDMode,
                  setSteepestExpression,
                  setSteepestStart,
                  setSteepestStep,
                  setSteepestTolerance,
                  setSteepestMaxIterations,
                  setLpMode,
                  setLpObjectiveText,
                  setLpConstraintsText,
                  setCustom2D,
                  setCustomConstraintsText,
                  setCustomStart,
                  setCustomBounds,
                  setConstraintIndex,
                  setAcoParams,
                  setAcoCityText
                });
                setStepIndex(0);
                setIsPlaying(false);
              }}
            />
          </section>

          <section className="visual-panel panel">
            <PanelTitle title="Visualization Canvas" subtitle={visualSubtitle(method)} />
            <Visualization
              method={method}
              problemMode={problemMode}
              oneDFn={oneDFn}
              interval={inputState.interval}
              golden={golden}
              fibonacci={fibonacci}
              numerical={numerical}
              grid={grid}
              descent={descent}
              descentObjective={descentProblem.objective}
              descentLabel={descentProblem.label}
              lpProblem={lpProblem}
              lpResult={lpResult}
              constrainedProblem={constrainedProblem}
              constrained={constrained}
              aco={aco}
              currentStep={currentStep}
            />
          </section>

          <section className="results-panel panel">
            <PanelTitle title="Equations & Results" subtitle="Explainable math notes" />
            <EquationsAndResults
              method={method}
              golden={golden}
              fibonacci={fibonacci}
              numerical={numerical}
              grid={grid}
              descent={descent}
              lpProblem={lpProblem}
              lpResult={lpResult}
              constrainedProblem={constrainedProblem}
              constrained={constrained}
              aco={aco}
              presentationMode={presentationMode}
            />
          </section>
        </section>

        <section className="bottom-panel panel">
          <div className="bottom-header">
            <PanelTitle title={compareAll ? "Compare All - Course Methods" : "Iteration Table & Simulation Steps"} subtitle="Live trace for viva-style explanation" />
            <span className={playbackMeta.hasPlayback ? "step-pill" : "step-pill disabled"}>{playbackMeta.hasPlayback ? `${playbackMeta.stepLabel} ${currentStep + 1} / ${totalPlaybackSteps}` : "no playback"}</span>
          </div>
          {compareAll ? <CompareAll rows={comparisons} currentStep={currentStep} /> : <IterationTable method={method} currentStep={currentStep} golden={golden} fibonacci={fibonacci} grid={grid} numerical={numerical} descent={descent} lpResult={lpResult} constrained={constrained} aco={aco} />}
        </section>

        {compareTwo ? (
          <section className="compare-strip panel">
            <PanelTitle title="Compare Two Methods" subtitle="Detailed side-by-side comparison for compatible methods" />
            <CompareTwoMethods rows={comparisons} methodA={compareMethodA} methodB={compareMethodB} setMethodA={setCompareMethodA} setMethodB={setCompareMethodB} currentStep={currentStep} />
          </section>
        ) : null}

        {showCompare && !compareAll ? (
          <section className="compare-strip panel">
            <PanelTitle title="Focused Compare Mode" subtitle="Selected method against relevant alternatives" />
            <FocusedCompare method={method} rows={comparisons} />
          </section>
        ) : null}
      </main>
    </div>
  );
}

function PanelTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="panel-title">
      <h2>{title}</h2>
      <p>{subtitle}</p>
    </div>
  );
}

function SetupControls(props: {
  method: MethodId;
  problemMode: "preset" | "custom";
  expression: string;
  setExpression: (value: string) => void;
  interval: [number, number];
  setIntervalValue: (value: [number, number]) => void;
  tolerance: number;
  setTolerance: (value: number) => void;
  fibN: number;
  setFibN: (value: number) => void;
  oneDMode: "min" | "max";
  setOneDMode: (value: "min" | "max") => void;
  oneDExampleIndex: number;
  setOneDExampleIndex: (value: number) => void;
  goldenMaxIterations: number;
  setGoldenMaxIterations: (value: number) => void;
  setProblemMode: (value: "preset" | "custom") => void;
  lpIndex: number;
  setLpIndex: (value: number) => void;
  lpMode: "max" | "min";
  setLpMode: (value: "max" | "min") => void;
  lpObjectiveText: string;
  setLpObjectiveText: (value: string) => void;
  lpConstraintsText: string;
  setLpConstraintsText: (value: string) => void;
  constraintIndex: number;
  setConstraintIndex: (value: number) => void;
  steepestExpression: string;
  setSteepestExpression: (value: string) => void;
  steepestStart: Point;
  setSteepestStart: (value: Point) => void;
  steepestStep: number;
  setSteepestStep: (value: number) => void;
  steepestTolerance: number;
  setSteepestTolerance: (value: number) => void;
  steepestMaxIterations: number;
  setSteepestMaxIterations: (value: number) => void;
  custom2D: string;
  setCustom2D: (value: string) => void;
  customConstraintsText: string;
  setCustomConstraintsText: (value: string) => void;
  customStart: Point;
  setCustomStart: (value: Point) => void;
  customBounds: { x: [number, number]; y: [number, number] };
  setCustomBounds: (value: { x: [number, number]; y: [number, number] }) => void;
  issues: string[];
  acoParams: AcoParams;
  setAcoParams: (value: AcoParams) => void;
  acoCityText: string;
  setAcoCityText: (value: string) => void;
  onApplyProblem: () => void;
  onResetProblem: () => void;
}) {
  const oneD = props.method === "golden" || props.method === "fibonacci" || props.method === "numerical";
  const constrained = props.method === "nonlinear" || props.method === "equality" || props.method === "inequality" || props.method === "lagrange" || props.method === "penalty";
  const aco = props.method === "aco";
  const custom = props.problemMode === "custom";
  const visibleIssues = [
    ...(oneD ? props.issues.filter((issue) => /1D|interval|Tolerance|Fibonacci/.test(issue)) : []),
    ...(props.method === "steepest" && custom ? steepestInputIssues(props.steepestExpression, props.steepestStep, props.steepestTolerance, props.steepestMaxIterations) : []),
    ...(props.method === "linear" && custom ? lpInputIssues(props.lpObjectiveText, props.lpMode, props.lpConstraintsText) : []),
    ...(constrained && custom ? props.issues.filter((issue) => /2D|constraints/.test(issue)) : []),
    ...(aco ? acoInputIssues(props.acoParams, props.acoCityText, custom) : [])
  ];
  return (
    <div className="setup-stack">
      <div className="segmented-control">
        <button className={props.problemMode === "preset" ? "active" : ""} onClick={() => props.setProblemMode("preset")}>Preset Example</button>
        <button className={custom ? "active" : ""} onClick={() => props.setProblemMode("custom")}>Custom Problem</button>
      </div>
      {visibleIssues.length > 0 ? <AlertList issues={visibleIssues} /> : null}
      {oneD ? (
        <>
          {!custom ? (
            <label>
              Course preset
              <select value={props.oneDExampleIndex} onChange={(event) => props.setOneDExampleIndex(Number(event.target.value))}>
                {oneDExamples.map((example, index) => (
                  <option key={example.name} value={index}>{example.name}</option>
                ))}
              </select>
            </label>
          ) : null}
          <label>
            Goal
            <select value={props.oneDMode} onChange={(event) => props.setOneDMode(event.target.value as "min" | "max")}>
              <option value="min">minimize</option>
              <option value="max">maximize</option>
            </select>
          </label>
          <label>
            f(x)
            <input value={props.expression} disabled={!custom} placeholder="x^2 - 7*x + 12" onChange={(event) => props.setExpression(event.target.value)} />
          </label>
          <div className="dual-input">
            <label>
              lower boundary
              <input type="number" value={props.interval[0]} onChange={(event) => props.setIntervalValue([Number(event.target.value), props.interval[1]])} />
            </label>
            <label>
              upper boundary
              <input type="number" value={props.interval[1]} onChange={(event) => props.setIntervalValue([props.interval[0], Number(event.target.value)])} />
            </label>
          </div>
          <label>
            Tolerance
            <input type="number" min="0.000001" step="0.00001" value={props.tolerance} onChange={(event) => props.setTolerance(Number(event.target.value))} />
          </label>
          <label>
            Max iterations
            <input type="number" min="1" max="300" value={props.goldenMaxIterations} onChange={(event) => props.setGoldenMaxIterations(Number(event.target.value))} />
          </label>
          <label>
            Fibonacci n
            <input type="number" min="4" max="20" value={props.fibN} onChange={(event) => props.setFibN(Number(event.target.value))} />
          </label>
          <ProblemPreview lines={[`Objective: ${props.oneDMode} f(x)=${props.expression}`, `Interval: [${props.interval[0]}, ${props.interval[1]}]`, `Parameters: ε=${props.tolerance}, Fibonacci n=${props.fibN}`]} />
        </>
      ) : null}
      {props.method === "steepest" ? (
        custom ? (
          <>
            <label>F(x,y)<input value={props.steepestExpression} placeholder="2*x*y + 2*x - x^2 - 2*y^2" onChange={(event) => props.setSteepestExpression(event.target.value)} /></label>
            <div className="dual-input">
              <label>X0 x<input type="number" value={props.steepestStart.x} onChange={(event) => props.setSteepestStart({ ...props.steepestStart, x: Number(event.target.value) })} /></label>
              <label>X0 y<input type="number" value={props.steepestStart.y} onChange={(event) => props.setSteepestStart({ ...props.steepestStart, y: Number(event.target.value) })} /></label>
            </div>
            <label>Step size α<input type="number" step="0.01" value={props.steepestStep} onChange={(event) => props.setSteepestStep(Number(event.target.value))} /></label>
            <label>Tolerance<input type="number" step="0.0001" value={props.steepestTolerance} onChange={(event) => props.setSteepestTolerance(Number(event.target.value))} /></label>
            <label>Max iterations<input type="number" value={props.steepestMaxIterations} onChange={(event) => props.setSteepestMaxIterations(Number(event.target.value))} /></label>
            <ProblemPreview lines={[`Objective: ${props.steepestExpression}`, `Starting point: (${props.steepestStart.x}, ${props.steepestStart.y})`, `Parameters: α=${props.steepestStep}, ε=${props.steepestTolerance}`]} />
          </>
        ) : (
          <div className="preset-card">
            <strong>{steepestExample.name}</strong>
            <MathFormula compact latex={labelToLatex(steepestExample.objectiveLabel)} />
            <MathFormula compact latex={String.raw`X_0=\begin{bmatrix}${fmt(steepestExample.start.x)}\\${fmt(steepestExample.start.y)}\end{bmatrix},\qquad \alpha=${fmt(steepestExample.stepSize)}`} />
          </div>
        )
      ) : null}
      {props.method === "linear" ? (
        custom ? (
          <>
            <label>Mode<select value={props.lpMode} onChange={(event) => props.setLpMode(event.target.value as "max" | "min")}><option value="max">maximize</option><option value="min">minimize</option></select></label>
            <label>Objective z =<input value={props.lpObjectiveText} placeholder="3*x + 2*y" onChange={(event) => props.setLpObjectiveText(event.target.value)} /></label>
            <label>Constraints<textarea value={props.lpConstraintsText} placeholder={"2*x + y <= 10\nx + 3*y >= 6\nx >= 0\ny >= 0"} onChange={(event) => props.setLpConstraintsText(event.target.value)} /></label>
            <ProblemPreview lines={[`Objective: ${props.lpMode} z=${props.lpObjectiveText}`, `Constraints: ${props.lpConstraintsText.split(/\r?\n/).filter(Boolean).join("; ")}`]} />
          </>
        ) : (
          <label>
            LP preset
            <select value={props.lpIndex} onChange={(event) => props.setLpIndex(Number(event.target.value))}>
              {lpExamples.map((example, index) => (
                <option key={example.name} value={index}>{example.name}</option>
              ))}
            </select>
          </label>
        )
      ) : null}
      {constrained ? (
        custom ? (
          <>
            <label>Objective f(x,y)<input value={props.custom2D} placeholder="(x-1)^2 + (y-2)^2" onChange={(event) => props.setCustom2D(event.target.value)} /></label>
            <label>Constraints<textarea value={props.customConstraintsText} placeholder={"x + y = 3\nx >= 0\ny >= 0"} onChange={(event) => props.setCustomConstraintsText(event.target.value)} /></label>
            <div className="dual-input">
              <label>x0<input type="number" value={props.customStart.x} onChange={(event) => props.setCustomStart({ ...props.customStart, x: Number(event.target.value) })} /></label>
              <label>y0<input type="number" value={props.customStart.y} onChange={(event) => props.setCustomStart({ ...props.customStart, y: Number(event.target.value) })} /></label>
            </div>
            <div className="dual-input">
              <label>x min<input type="number" value={props.customBounds.x[0]} onChange={(event) => props.setCustomBounds({ ...props.customBounds, x: [Number(event.target.value), props.customBounds.x[1]] })} /></label>
              <label>x max<input type="number" value={props.customBounds.x[1]} onChange={(event) => props.setCustomBounds({ ...props.customBounds, x: [props.customBounds.x[0], Number(event.target.value)] })} /></label>
            </div>
            <div className="dual-input">
              <label>y min<input type="number" value={props.customBounds.y[0]} onChange={(event) => props.setCustomBounds({ ...props.customBounds, y: [Number(event.target.value), props.customBounds.y[1]] })} /></label>
              <label>y max<input type="number" value={props.customBounds.y[1]} onChange={(event) => props.setCustomBounds({ ...props.customBounds, y: [props.customBounds.y[0], Number(event.target.value)] })} /></label>
            </div>
            <ProblemPreview lines={[`Objective: ${props.custom2D}`, `Constraints: ${props.customConstraintsText.split(/\r?\n/).filter(Boolean).join("; ")}`, `Starting point: (${props.customStart.x}, ${props.customStart.y})`]} />
          </>
        ) : (
          <>
          <label>
            Constrained preset
            <select value={props.constraintIndex} onChange={(event) => props.setConstraintIndex(Number(event.target.value))}>
              {constrainedExamples.map((example, index) => (
                <option key={example.name} value={index}>{example.name}</option>
              ))}
            </select>
          </label>
          </>
        )
      ) : null}
      {aco ? (
        <>
          <div className="preset-card">
            <strong>Bonus extension: TSP route optimization</strong>
            <span>ACO is separate from the core course methods and is shown as advanced/future work.</span>
          </div>
          <AcoControl label="Number of cities" value={props.acoParams.cityCount} min={4} max={16} step={1} onChange={(cityCount) => props.setAcoParams({ ...props.acoParams, cityCount })} />
          <AcoControl label="Number of ants" value={props.acoParams.antCount} min={1} max={80} step={1} onChange={(antCount) => props.setAcoParams({ ...props.acoParams, antCount })} />
          <AcoControl label="Iterations" value={props.acoParams.iterations} min={1} max={200} step={1} onChange={(iterations) => props.setAcoParams({ ...props.acoParams, iterations })} />
          <AcoControl label="α pheromone weight" value={props.acoParams.alpha} min={0} max={6} step={0.1} onChange={(alpha) => props.setAcoParams({ ...props.acoParams, alpha })} />
          <AcoControl label="β visibility weight" value={props.acoParams.beta} min={0} max={8} step={0.1} onChange={(beta) => props.setAcoParams({ ...props.acoParams, beta })} />
          <AcoControl label="ρ evaporation rate" value={props.acoParams.rho} min={0.01} max={0.95} step={0.01} onChange={(rho) => props.setAcoParams({ ...props.acoParams, rho })} />
          <AcoControl label="Q deposit constant" value={props.acoParams.q} min={1} max={500} step={1} onChange={(q) => props.setAcoParams({ ...props.acoParams, q })} />
          {custom ? (
            <>
              <label>Custom city coordinates<textarea value={props.acoCityText} placeholder={"0.1,0.2\n0.8,0.25\n0.7,0.9\n0.2,0.75"} onChange={(event) => props.setAcoCityText(event.target.value)} /></label>
              <button className="control-button" onClick={() => props.setAcoCityText(generateCities(props.acoParams.cityCount).map((city) => `${fmt(city.x, 3)},${fmt(city.y, 3)}`).join("\n"))}>Generate city list</button>
            </>
          ) : null}
        </>
      ) : null}
      <div className="form-actions">
        <button className="control-button" onClick={props.onApplyProblem}>Apply Problem</button>
        <button className="control-button" onClick={props.onResetProblem}>Reset to Preset</button>
      </div>
    </div>
  );
}

function ProblemPreview({ lines }: { lines: string[] }) {
  return (
    <div className="problem-preview">
      <strong>Parsed problem</strong>
      {lines.map((line) => <ProblemPreviewLine line={line} key={line} />)}
    </div>
  );
}

function ProblemPreviewLine({ line }: { line: string }) {
  const [label, ...rest] = line.split(":");
  const value = rest.join(":").trim();
  if (!value) return <span>{line}</span>;
  if (/objective/i.test(label)) {
    return <div className="preview-line"><span>{label}</span><MathFormula compact latex={labelToLatex(value)} /></div>;
  }
  if (/constraints/i.test(label)) {
    const constraints = value.split(";").map((item) => item.trim()).filter(Boolean);
    return (
      <div className="preview-line">
        <span>{label}</span>
        <MathFormula compact latex={String.raw`\begin{aligned}${constraints.map(labelToLatex).join(String.raw`\\`)}\end{aligned}`} />
      </div>
    );
  }
  if (/interval/i.test(label)) {
    return <div className="preview-line"><span>{label}</span><MathFormula compact latex={labelToLatex(value)} /></div>;
  }
  if (/starting point/i.test(label)) {
    return <div className="preview-line"><span>{label}</span><MathFormula compact latex={labelToLatex(value)} /></div>;
  }
  if (/parameters/i.test(label)) {
    return <div className="preview-line"><span>{label}</span><MathFormula compact latex={labelToLatex(value)} /></div>;
  }
  return <span>{line}</span>;
}

function AcoControl({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void }) {
  return (
    <label>
      {label}
      <input type="number" value={value} min={min} max={max} step={step} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function Visualization(props: {
  method: MethodId;
  problemMode: "preset" | "custom";
  oneDFn: (x: number) => number;
  interval: [number, number];
  golden: SearchResult;
  fibonacci: SearchResult;
  grid: SearchResult;
  numerical: SearchResult;
  descent: ReturnType<typeof steepestDescent>;
  descentObjective: (p: Point) => number;
  descentLabel: string;
  lpProblem: typeof lpExamples[number];
  lpResult: ReturnType<typeof solveLinearProgram>;
  constrainedProblem: ConstrainedProblem;
  constrained: ReturnType<typeof solveConstrainedByGrid>;
  aco: AcoResult;
  currentStep: number;
}) {
  let plot: ReactNode;
  if (props.method === "golden" || props.method === "fibonacci") {
    const result = props.method === "golden" ? props.golden : props.fibonacci;
    plot = <Plot {...oneDPlot(props.oneDFn, props.interval, result, props.currentStep, props.method === "golden" ? "Golden Section" : "Fibonacci")} />;
  } else if (props.method === "numerical") {
    plot = <Plot {...newtonPlot(props.numerical, props.currentStep)} />;
  } else if (props.method === "steepest") {
    plot = <Plot {...descentPlot(props.descent, props.currentStep, props.descentObjective, props.descentLabel)} />;
  } else if (props.method === "linear") {
    plot = <Plot {...lpPlot(props.lpProblem, props.lpResult, props.currentStep)} />;
  } else if (props.method === "nonlinear") {
    plot = <Plot {...nonlinearExtremaPlot()} />;
  } else if (props.method === "lagrange") {
    plot = props.problemMode === "custom" ? <Plot {...constrainedPlot(props.constrainedProblem, props.constrained, props.currentStep)} /> : <Plot {...lagrangePlot()} />;
  } else if (props.method === "penalty") {
    plot = <Plot {...constrainedPlot(props.constrainedProblem, props.constrained, props.currentStep)} />;
  } else if (props.method === "aco") {
    plot = <Plot {...acoPlot(props.aco, props.currentStep)} />;
  } else {
    plot = <Plot {...constrainedPlot(props.constrainedProblem, props.constrained, props.currentStep)} />;
  }

  return (
    <div className="visualization-stack">
      {plot}
      <GraphExplanation {...graphExplanationFor(props.method, props.problemMode)} />
    </div>
  );
}

function GraphExplanation({ title = "What this graph shows", text, bullets, note }: { title?: string; text: string; bullets?: string[]; note?: string }) {
  return (
    <div className="graph-explanation">
      <strong className="graph-explanation-title">{title}</strong>
      <p className="graph-explanation-text">{text}</p>
      {bullets?.length ? <ul>{bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul> : null}
      {note ? <span className="graph-explanation-note">{note}</span> : null}
    </div>
  );
}

function graphExplanationFor(method: MethodId, problemMode: "preset" | "custom") {
  if (method === "linear") return {
    text: "This graph shows the feasible region created by the linear constraints. Each boundary line represents one constraint. The shaded polygon contains all feasible solutions, the corner points are tested using z, and the highlighted point is the optimal corner.",
    bullets: ["Blue shading: feasible region.", "Yellow line: objective line at the optimum.", "Green star: selected optimal corner."]
  };
  if (method === "nonlinear") return {
    text: "This contour plot shows level curves of the objective function. The highlighted critical point is where the gradient becomes zero. The Hessian test classifies this point using the course criteria.",
    note: "This screen uses the exact course Hessian/classification preset."
  };
  if (method === "numerical") return {
    text: "This plot shows Newton's Method on the one-dimensional lecture function. Each point is an approximation x_n, and playback reveals how the derivative-based update moves toward the stationary point.",
    note: "These plotted candidates are numerical approximations."
  };
  if (method === "golden") return {
    text: "This graph shows how Golden Section Search shrinks the interval [xl, xu]. The points x1 and x2 are evaluated, then one side is discarded by comparing f(x1) and f(x2).",
    bullets: ["Yellow shaded band: current uncertainty interval.", "Star: estimated optimum."]
  };
  if (method === "fibonacci") return {
    text: "This graph shows Fibonacci Search reducing the interval using Fibonacci ratios. The method evaluates c and d inside the current interval, compares their function values, and keeps the side that may still contain the optimum.",
    note: "The first preset follows the professor's n=4 worked example."
  };
  if (method === "steepest") return {
    text: "This contour plot shows the path of the steepest method. Each point is an iteration Xk. For ascent the method moves in +∇F(Xk); for descent it moves in -∇F(Xk).",
    bullets: ["Yellow path: iteration movement.", "Green star: current candidate optimum."]
  };
  if (method === "lagrange") return {
    text: problemMode === "custom"
      ? "This graph samples the constrained custom problem numerically. It shows feasible samples, boundary curves, and an approximate candidate point."
      : "This graph shows the geometric meaning of Lagrange Multipliers. The objective contours are drawn with the equality constraint, and the optimum occurs where a contour is tangent to the constraint curve.",
    note: problemMode === "custom" ? "Custom constrained plots are approximate visual checks." : "Tangency means the gradients are parallel at the course preset solution."
  };
  if (method === "equality") return {
    text: "This graph shows an equality-constrained problem. Feasible points must lie on the equality boundary. Because the visualization uses numerical sampling, points close to the boundary illustrate the feasible set.",
    note: "The plotted result is approximate unless it is the exact Lagrange preset."
  };
  if (method === "inequality") return {
    text: "This graph shows the feasible region created by inequality constraints. Active constraints are highlighted because they touch the solution, while inactive constraints do not directly determine the optimum.",
    note: "This supports the KKT interpretation: feasibility, active set, and complementary slackness."
  };
  if (method === "penalty") return {
    text: "This visualization explains the Penalty Method concept. Constraint violations are added as a penalty term, so infeasible points become expensive. The path shows how the penalized objective guides the solution toward feasibility.",
    note: "This is an educational numerical path, not a symbolic penalty solver."
  };
  return {
    text: "This graph shows the ACO route optimization process. Cities are nodes, edges are possible travel paths, and stronger pheromone trails indicate routes reinforced by previous ants.",
    bullets: ["Yellow route: best route found so far.", "ACO is stochastic and near-optimal, not guaranteed exact."],
    note: "ACO remains Bonus / Advanced and is not part of the course files."
  };
}

function oneDPlot(fn: (x: number) => number, interval: [number, number], result: SearchResult, step: number, name: string) {
  const xs = range(interval[0], interval[1], 180);
  const ys = xs.map(fn);
  const record = result.history[Math.min(step, result.history.length - 1)] ?? result.history.at(-1);
  const finiteYs = ys.filter(Number.isFinite);
  if (finiteYs.length === 0 || result.status === "invalid") return invalidPlot(result.message ?? "The function could not be plotted safely.");
  const ymin = Math.min(...finiteYs);
  const ymax = Math.max(...finiteYs);
  return {
    data: [
      { x: xs, y: ys, type: "scatter", mode: "lines", name: "f(x)", line: { color: "#68e4ff", width: 3 } },
      record
        ? {
            x: [record.a, record.c, record.d, record.b],
            y: [fn(record.a), record.fc, record.fd, fn(record.b)],
            type: "scatter",
            mode: "markers+lines",
            name: "uncertainty interval",
            marker: { color: ["#ffd166", "#7bf1a8", "#fca5a5", "#ffd166"], size: [11, 12, 12, 11] },
            line: { color: "#ffd166", dash: "dot" }
          }
        : {},
      { x: [result.x], y: [result.fx], type: "scatter", mode: "markers", name: "estimated optimum", marker: { color: "#f9c74f", size: 15, symbol: "star" } }
    ],
    layout: {
      ...plotLayout,
      title: `${name}: uncertainty interval reduction`,
      shapes: record
        ? [{ type: "rect", x0: record.a, x1: record.b, y0: ymin, y1: ymax, fillcolor: "rgba(255,209,102,.08)", line: { width: 0 }, layer: "below" }]
        : [],
      annotations: record
        ? [
            { x: record.c, y: record.fc, text: "c", showarrow: true, arrowcolor: "#7bf1a8", font: { color: "#7bf1a8" } },
            { x: record.d, y: record.fd, text: "d", showarrow: true, arrowcolor: "#fca5a5", font: { color: "#fca5a5" } }
          ]
        : []
    },
    config: { displayModeBar: false, responsive: true },
    useResizeHandler: true,
    className: "plot"
  };
}

function invalidPlot(message: string) {
  return {
    data: [],
    layout: { ...plotLayout, title: message, annotations: [{ text: message, x: 0.5, y: 0.5, xref: "paper", yref: "paper", showarrow: false, font: { color: "#ffd166", size: 16 } }] },
    config: { displayModeBar: false, responsive: true },
    useResizeHandler: true,
    className: "plot"
  };
}

function newtonPlot(result: SearchResult, step: number) {
  const xs = range(0.2, 1.8, 180);
  const ys = xs.map(numericalExample.objective);
  const steps = result.history.slice(0, Math.max(1, step + 1)).map((row) => row.a);
  const current = steps.at(-1);
  return {
    data: [
      { x: xs, y: ys, type: "scatter", mode: "lines", name: "f(x)", line: { color: "#68e4ff", width: 3 } },
      { x: steps, y: steps.map(numericalExample.objective), type: "scatter", mode: "markers+lines", name: "Newton iterates", marker: { color: "#ffd166", size: 10 } },
      Number.isFinite(current) ? { x: [current], y: [numericalExample.objective(current ?? 0)], type: "scatter", mode: "markers", name: "current x_n", marker: { color: "#ffffff", size: 12, symbol: "diamond" } } : {},
      { x: [result.x], y: [result.fx], type: "scatter", mode: "markers", name: "stationary point", marker: { color: "#7bf1a8", size: 14, symbol: "diamond" } }
    ],
    layout: { ...plotLayout, title: numericalExample.name },
    config: { displayModeBar: false, responsive: true },
    useResizeHandler: true,
    className: "plot"
  };
}

function numericalOverviewPlot(fn: (x: number) => number, interval: [number, number], golden: SearchResult, fibonacci: SearchResult, grid: SearchResult) {
  if (golden.status === "invalid" || fibonacci.status === "invalid" || grid.status === "invalid") {
    return invalidPlot(golden.message ?? fibonacci.message ?? grid.message ?? "The numerical optimization input is invalid.");
  }
  const xs = range(interval[0], interval[1], 220);
  const ys = xs.map(fn);
  const finiteYs = ys.filter(Number.isFinite);
  if (finiteYs.length === 0) return invalidPlot("The numerical optimization function could not be plotted safely.");
  return {
    data: [
      { x: xs, y: ys, type: "scatter", mode: "lines", name: "f(x)", line: { color: "#68e4ff", width: 3 } },
      { x: golden.history.map((row) => row.c), y: golden.history.map((row) => row.fc), type: "scatter", mode: "markers", name: "Golden evaluations", marker: { color: "#ffd166", size: 7 } },
      { x: fibonacci.history.map((row) => row.c), y: fibonacci.history.map((row) => row.fc), type: "scatter", mode: "markers", name: "Fibonacci evaluations", marker: { color: "#7bf1a8", size: 7, symbol: "diamond" } },
      { x: [grid.x], y: [grid.fx], type: "scatter", mode: "markers", name: "Grid best", marker: { color: "#f9c74f", size: 15, symbol: "star" } },
      { x: [golden.x], y: [golden.fx], type: "scatter", mode: "markers", name: "Golden result", marker: { color: "#ffffff", size: 12, symbol: "circle-open" } },
      { x: [fibonacci.x], y: [fibonacci.fx], type: "scatter", mode: "markers", name: "Fibonacci result", marker: { color: "#c084fc", size: 12, symbol: "square-open" } }
    ],
    layout: { ...plotLayout, title: "Numerical Optimization: Newton with interval-search checks" },
    config: { displayModeBar: false, responsive: true },
    useResizeHandler: true,
    className: "plot"
  };
}

function descentPlot(result: ReturnType<typeof steepestDescent>, step: number, objective: (p: Point) => number, label: string) {
  const pathAll = result.history.map((row) => row.point);
  const centerX = pathAll.length ? pathAll.reduce((sum, p) => sum + p.x, 0) / pathAll.length : 1;
  const centerY = pathAll.length ? pathAll.reduce((sum, p) => sum + p.y, 0) / pathAll.length : 1;
  const xs = range(centerX - 2.2, centerX + 2.2, 72);
  const ys = range(centerY - 2.2, centerY + 2.2, 72);
  const z = ys.map((y) => xs.map((x) => objective({ x, y })));
  const path = result.history.slice(0, Math.max(1, step + 1)).map((row) => row.point);
  return {
    data: [
      { x: xs, y: ys, z, type: "contour", colorscale: "Tealgrn", contours: { coloring: "heatmap" }, opacity: 0.78, name: "objective contours" },
      { x: path.map((p) => p.x), y: path.map((p) => p.y), type: "scatter", mode: "lines+markers", name: "optimization path", marker: { color: "#ffd166", size: 7 }, line: { color: "#ffd166", width: 3 } },
      { x: [result.point.x], y: [result.point.y], type: "scatter", mode: "markers", name: "candidate optimum", marker: { color: "#7bf1a8", size: 14, symbol: "star" } }
    ],
    layout: {
      ...plotLayout,
      title: label,
      annotations: path.length > 1
        ? path.slice(1, 8).map((point, index) => ({
            x: point.x,
            y: point.y,
            ax: path[index].x,
            ay: path[index].y,
            xref: "x",
            yref: "y",
            axref: "x",
            ayref: "y",
            showarrow: true,
            arrowhead: 3,
            arrowsize: 1,
            arrowwidth: 1.4,
            arrowcolor: "#ffd166"
          }))
        : []
    },
    config: { displayModeBar: false, responsive: true },
    useResizeHandler: true,
    className: "plot"
  };
}

function nonlinearExtremaPlot() {
  const example = nonlinearExamples[0];
  const fn = (p: Point) => p.x * p.x - 2 * p.x * p.y - 2 * p.x + 2 * p.y * p.y;
  const xs = range(-1, 4, 80);
  const ys = range(-1, 3, 80);
  const z = ys.map((y) => xs.map((x) => fn({ x, y })));
  return {
    data: [
      { x: xs, y: ys, z, type: "contour", colorscale: "Cividis", name: "level curves", opacity: 0.82 },
      { x: [example.criticalPoint.x], y: [example.criticalPoint.y], type: "scatter", mode: "markers+text", text: ["critical point"], textposition: "top center", name: "critical point", marker: { color: "#ffd166", size: 15, symbol: "star" } }
    ],
    layout: { ...plotLayout, title: "Extrema example: critical point and Hessian classification" },
    config: { displayModeBar: false, responsive: true },
    useResizeHandler: true,
    className: "plot"
  };
}

function lpPlot(problem: typeof lpExamples[number], result: ReturnType<typeof solveLinearProgram>, step: number) {
  if (result.corners.length === 0) {
    return {
      data: [],
      layout: { ...plotLayout, title: `${problem.name}: No feasible region found` },
      config: { displayModeBar: false, responsive: true },
      useResizeHandler: true,
      className: "plot"
    };
  }
  const maxCoord = Math.max(6.5, ...result.corners.flatMap((p) => [Math.abs(p.x), Math.abs(p.y)])) + 0.8;
  const minCoord = Math.min(-0.25, ...result.corners.flatMap((p) => [p.x, p.y])) - 0.5;
  const center = result.corners.reduce((acc, point) => ({ x: acc.x + point.x / result.corners.length, y: acc.y + point.y / result.corners.length }), { x: 0, y: 0 });
  const sorted = [...result.corners].sort((a, b) => Math.atan2(a.y - center.y, a.x - center.x) - Math.atan2(b.y - center.y, b.x - center.x));
  const polygonX = sorted.map((p) => p.x).concat(sorted[0]?.x ?? 0);
  const polygonY = sorted.map((p) => p.y).concat(sorted[0]?.y ?? 0);
  const xs = range(minCoord, maxCoord, 80);
  const data: any[] = [
    { x: polygonX, y: polygonY, fill: "toself", type: "scatter", mode: "lines", name: "feasible region", fillcolor: "rgba(104,228,255,.20)", line: { color: "#68e4ff", width: 2 } },
    { x: result.corners.map((p) => p.x), y: result.corners.map((p) => p.y), text: result.corners.map((p) => `z=${fmt(p.value)}`), type: "scatter", mode: "markers+text", name: "corner points", marker: { color: "#ffd166", size: 11 }, textposition: "top center" },
    { x: [result.optimum.x], y: [result.optimum.y], type: "scatter", mode: "markers", name: "optimal corner", marker: { color: "#7bf1a8", size: 16, symbol: "star" } }
  ];
  const currentCorner = result.corners[Math.min(step, result.corners.length - 1)];
  if (currentCorner) {
    data.push({ x: [currentCorner.x], y: [currentCorner.y], type: "scatter", mode: "markers", name: "current corner", marker: { color: "#ffffff", size: 16, symbol: "diamond-open", line: { color: "#ffffff", width: 2 } } });
  }
  problem.constraints.forEach((constraint) => {
    if (Math.abs(constraint.b) > 1e-8) {
      const lineY = xs.map((x) => (constraint.c - constraint.a * x) / constraint.b);
      const label = prettyMathText(constraint.label);
      data.push({ x: xs, y: lineY, type: "scatter", mode: "lines+text", text: xs.map((_, index) => index === xs.length - 8 ? label : ""), textposition: "top right", name: label, line: { width: 1.5, dash: "dash" } });
    } else if (Math.abs(constraint.a) > 1e-8) {
      const x = constraint.c / constraint.a;
      const label = prettyMathText(constraint.label);
      data.push({ x: [x, x], y: [minCoord, maxCoord], type: "scatter", mode: "lines+text", text: ["", label], textposition: "top right", name: label, line: { width: 1.5, dash: "dash" } });
    }
  });
  if (Number.isFinite(result.optimum.value) && Math.abs(problem.objective.y) > 1e-8) {
    data.push({
      x: xs,
      y: xs.map((x) => (result.optimum.value - problem.objective.x * x) / problem.objective.y),
      type: "scatter",
      mode: "lines",
      name: "objective line at optimum",
      line: { color: "#ffd166", width: 3 }
    });
  } else if (Number.isFinite(result.optimum.value) && Math.abs(problem.objective.x) > 1e-8) {
    const x = result.optimum.value / problem.objective.x;
    data.push({ x: [x, x], y: [minCoord, maxCoord], type: "scatter", mode: "lines", name: "objective line at optimum", line: { color: "#ffd166", width: 3 } });
  }
  return {
    data,
    layout: { ...plotLayout, title: `${problem.name}${result.status === "unbounded" ? " (appears unbounded)" : ""}`, xaxis: { ...plotLayout.xaxis, range: [minCoord, maxCoord] }, yaxis: { ...plotLayout.yaxis, range: [minCoord, maxCoord] } },
    config: { displayModeBar: false, responsive: true },
    useResizeHandler: true,
    className: "plot"
  };
}

function lagrangePlot() {
  const xs = range(-1, 3, 80);
  const ys = range(0, 4, 80);
  const z = ys.map((y) => xs.map((x) => lagrangeExample.objective({ x, y })));
  const p = lagrangeExample.optimum;
  const gradF = { x: -2 * p.x, y: -2 * (p.y - 2) };
  const gradG = { x: 1, y: 2 };
  const arrowScale = 0.45;
  return {
    data: [
      { x: xs, y: ys, z, type: "contour", colorscale: "Cividis", name: "objective contours", opacity: 0.82 },
      { x: xs, y: xs.map((x) => (5 - x) / 2), type: "scatter", mode: "lines", name: "x+2y=5", line: { color: "#ffd166", width: 3 } },
      { x: [p.x], y: [p.y], type: "scatter", mode: "markers", name: "constrained optimum", marker: { color: "#7bf1a8", size: 16, symbol: "star" } },
      { x: [p.x, p.x + gradF.x * arrowScale], y: [p.y, p.y + gradF.y * arrowScale], type: "scatter", mode: "lines+markers", name: "∇f", line: { color: "#68e4ff", width: 4 }, marker: { size: 7 } },
      { x: [p.x, p.x - gradG.x * arrowScale], y: [p.y, p.y - gradG.y * arrowScale], type: "scatter", mode: "lines+markers", name: "-λ∇h", line: { color: "#f87171", width: 4 }, marker: { size: 7 } }
    ],
    layout: { ...plotLayout, title: "Lagrange equality example with tangency" },
    config: { displayModeBar: false, responsive: true },
    useResizeHandler: true,
    className: "plot"
  };
}

function constrainedPlot(problem: ConstrainedProblem, result: ReturnType<typeof solveConstrainedByGrid>, step: number) {
  const xs = range(problem.bounds.x[0], problem.bounds.x[1], 80);
  const ys = range(problem.bounds.y[0], problem.bounds.y[1], 80);
  const z = ys.map((y) => xs.map((x) => problem.objective({ x, y })));
  const path = result.path.slice(0, Math.max(2, step + 1));
  const data: any[] = [
    { x: xs, y: ys, z, type: "contour", colorscale: "Viridis", opacity: 0.72, name: "objective" },
    { x: result.feasibleCandidates.map((p) => p.x), y: result.feasibleCandidates.map((p) => p.y), type: "scatter", mode: "markers", name: "feasible samples", marker: { color: "rgba(104,228,255,.28)", size: 4 } },
    { x: result.feasibleCandidates.slice(0, 24).map((p) => p.x), y: result.feasibleCandidates.slice(0, 24).map((p) => p.y), type: "scatter", mode: "markers", name: "candidate points", marker: { color: "rgba(255,209,102,.42)", size: 7, symbol: "circle-open" } },
    { x: path.map((p) => p.x), y: path.map((p) => p.y), type: "scatter", mode: "lines+markers", name: "penalty path", marker: { color: "#ffd166", size: 6 }, line: { color: "#ffd166", width: 3 } },
    { x: [path.at(-1)?.x], y: [path.at(-1)?.y], type: "scatter", mode: "markers", name: "current point", marker: { color: "#ffffff", size: 11, symbol: "diamond" } },
    { x: [result.point.x], y: [result.point.y], type: "scatter", mode: "markers", name: "optimum", marker: { color: "#7bf1a8", size: 16, symbol: "star" } }
  ];
  problem.constraints.forEach((constraint) => {
    const cz = ys.map((y) => xs.map((x) => constraint.fn({ x, y })));
    const active = result.active.includes(constraint.label);
    data.push({ x: xs, y: ys, z: cz, type: "contour", showscale: false, contours: { start: 0, end: 0, size: 1, coloring: "lines" }, line: { color: active ? "#ffd166" : constraint.kind === "eq" ? "#68e4ff" : "rgba(248,113,113,.55)", width: active ? 4 : 2, dash: active ? "solid" : "dot" }, name: `${active ? "active: " : "inactive/boundary: "}${prettyMathText(constraint.label)}` });
  });
  return {
    data,
    layout: { ...plotLayout, title: problem.name },
    config: { displayModeBar: false, responsive: true },
    useResizeHandler: true,
    className: "plot"
  };
}

function acoPlot(result: AcoResult, step: number) {
  const record = result.history[Math.min(step, result.history.length - 1)] ?? result.history.at(-1);
  const pheromone = record?.pheromone ?? [];
  const maxPheromone = Math.max(1, ...pheromone.flat());
  const edgeData: any[] = [];
  result.cities.forEach((from, i) => {
    result.cities.forEach((to, j) => {
      if (j <= i) return;
      const strength = (pheromone[i]?.[j] ?? 0) / maxPheromone;
      if (strength < 0.05) return;
      edgeData.push({
        x: [from.x, to.x],
        y: [from.y, to.y],
        type: "scatter",
        mode: "lines",
        hoverinfo: "skip",
        showlegend: false,
        line: { color: `rgba(104, 228, 255, ${0.08 + strength * 0.5})`, width: 1 + strength * 8 }
      });
    });
  });
  const bestRoute = closeRoute(record?.bestRoute ?? result.bestRoute);
  const bestCities = bestRoute.map((city) => result.cities[city]);
  const sampleRoute = closeRoute(record?.antRoutes[0]?.route ?? []);
  const sampleCities = sampleRoute.map((city) => result.cities[city]);
  return {
    data: [
      ...edgeData,
      {
        x: sampleCities.map((city) => city.x),
        y: sampleCities.map((city) => city.y),
        type: "scatter",
        mode: "lines",
        name: "current ant route",
        line: { color: "rgba(255,209,102,.35)", width: 2, dash: "dot" }
      },
      {
        x: bestCities.map((city) => city.x),
        y: bestCities.map((city) => city.y),
        type: "scatter",
        mode: "lines+markers",
        name: "best route",
        marker: { color: "#ffd166", size: 8 },
        line: { color: "#ffd166", width: 4 }
      },
      {
        x: result.cities.map((city) => city.x),
        y: result.cities.map((city) => city.y),
        text: result.cities.map((_, index) => `${index + 1}`),
        type: "scatter",
        mode: "markers+text",
        name: "cities",
        textposition: "top center",
        marker: { color: "#7bf1a8", size: 13, line: { color: "#071521", width: 2 } }
      }
    ],
    layout: {
      ...plotLayout,
      title: `ACO pheromone network - iteration ${record?.iteration ?? 0}`,
      xaxis: { ...plotLayout.xaxis, visible: false, range: [-0.05, 1.08] },
      yaxis: { ...plotLayout.yaxis, visible: false, range: [-0.05, 1.08], scaleanchor: "x" }
    },
    config: { displayModeBar: false, responsive: true },
    useResizeHandler: true,
    className: "plot"
  };
}

function closeRoute(route: number[]) {
  return route.length > 0 ? [...route, route[0]] : [];
}

type MathEquation = {
  title: string;
  latex: string | string[];
  explanation: string[];
};

function MathFormula({ latex, compact = false }: { latex: string; compact?: boolean }) {
  const html = useMemo(
    () =>
      katex.renderToString(latex, {
        displayMode: true,
        throwOnError: false,
        strict: false
      }),
    [latex]
  );
  return <div className={compact ? "math-render compact" : "math-render"} dangerouslySetInnerHTML={{ __html: html }} />;
}

function EquationCard({ equation, compact = false }: { equation: MathEquation; compact?: boolean }) {
  const formulas = Array.isArray(equation.latex) ? equation.latex : [equation.latex];
  return (
    <div className={compact ? "equation-card compact" : "equation-card"}>
      <strong>{equation.title}</strong>
      {formulas.map((formula) => <MathFormula key={formula} latex={formula} compact={compact} />)}
      <div className="meaning-block">
        <span>Meaning</span>
        {equation.explanation.map((line) => <p key={line}>{line}</p>)}
      </div>
    </div>
  );
}

function MethodEquationPanel({ method, lpProblem, constrainedProblem }: { method: MethodId; lpProblem: typeof lpExamples[number]; constrainedProblem: ConstrainedProblem }) {
  return (
    <div className="equation-stack">
      {methodEquations(method, lpProblem, constrainedProblem).map((equation) => <EquationCard equation={equation} key={equation.title} />)}
    </div>
  );
}

function methodEquations(method: MethodId, lpProblem?: typeof lpExamples[number], constrainedProblem?: ConstrainedProblem): MathEquation[] {
  const equations: Record<MethodId, MathEquation[]> = {
    numerical: [
      {
        title: "Newton's Method",
        latex: [
          String.raw`f'(x^{*})=0`,
          String.raw`x_{n+1}=x_n-\frac{f'(x_n)}{f''(x_n)}`,
          String.raw`X_{n+1}=X_n-H^{-1}(X_n)\nabla F(X_n)`
        ],
        explanation: [
          "The course first writes the stationary condition, then uses Newton iteration to approach the critical point.",
          "For several variables, the Hessian replaces the second derivative."
        ]
      }
    ],
    golden: [
      {
        title: "Golden Section Search Method",
        latex: [
          String.raw`d=\frac{\sqrt{5}-1}{2}(x_u-x_l)`,
          String.raw`x_1=x_l+d,\qquad x_2=x_u-d`,
          String.raw`\begin{cases}x_l=x_2,& f(x_1)>f(x_2)\ \text{for max}\\ x_u=x_1,& f(x_1)<f(x_2)\ \text{for max}\end{cases}`,
          String.raw`\varepsilon=0.00001`
        ],
        explanation: [
          "The professor's Golden Section notation uses lower and upper boundary points xl, xu and interior points x1, x2.",
          "For a maximum, the side with the smaller function value is removed."
        ]
      }
    ],
    fibonacci: [
      {
        title: "Fibonacci Search Algorithm",
        latex: [
          String.raw`F_0=1,\qquad F_1=1,\qquad F_n=F_{n-1}+F_{n-2}`,
          String.raw`L_1=b_1-a_1`,
          String.raw`c_k=a_k+\frac{F_{n-k-1}}{F_{n-k+1}}L_k,\qquad d_k=a_k+\frac{F_{n-k}}{F_{n-k+1}}L_k`,
          String.raw`\begin{cases}[a_{k+1},b_{k+1}]=[c_k,b_k],& f(c_k)>f(d_k)\\[a_{k+1},b_{k+1}]=[a_k,d_k],& f(c_k)\le f(d_k)\end{cases}`
        ],
        explanation: [
          "The Fibonacci numbers define the planned sequence of interval ratios.",
          "The positions of the test points are controlled by Fibonacci numbers and the current interval length.",
          "The selected number of steps determines the final uncertainty interval."
        ]
      }
    ],
    steepest: [
      {
        title: "Steepest Ascent / Descent Update",
        latex: [
          String.raw`\nabla F(X_0)=\begin{bmatrix}\frac{\partial F}{\partial x}\\[2pt]\frac{\partial F}{\partial y}\end{bmatrix}_{X_0}`,
          String.raw`X_1=X_0+\alpha\nabla F(X_0)\qquad \text{for maximum}`,
          String.raw`X_1=X_0-\alpha\nabla F(X_0)\qquad \text{for minimum}`,
          String.raw`\nabla F(X_k)\cdot\nabla F(X_{k+1})=0\qquad \text{for optimal }\alpha`
        ],
        explanation: [
          "The gradient points toward steepest increase, so minimization moves in the opposite direction.",
          "The step size controls how far the point moves along the descent direction.",
          "The run stops when the gradient norm is small or the iteration limit is reached."
        ]
      }
    ],
    linear: [
      lpEquation(lpProblem)
    ],
    nonlinear: [
      {
        title: "Extrema And Hessian Test",
        latex: [
          String.raw`\nabla P(X)=0\quad \Rightarrow\quad X^{*}\text{ is a critical point}`,
          String.raw`H(X^{*})=\nabla^{2}P(X^{*})`,
          String.raw`H>0\Rightarrow\text{local min},\qquad H<0\Rightarrow\text{local max},\qquad H\text{ indefinite}\Rightarrow\text{saddle point}`
        ],
        explanation: [
          "This follows the Extrema of functions of several variables notes before constrained optimization.",
          "When the Hessian test is inconclusive, the notes compare nearby function values."
        ]
      }
    ],
    lagrange: [
      {
        title: "Lagrange Multiplier System",
        latex: [
          String.raw`L(x,y,\lambda)=f(x,y)+\lambda h(x,y)`,
          String.raw`\frac{\partial L}{\partial x}=0,\qquad \frac{\partial L}{\partial y}=0,\qquad \frac{\partial L}{\partial \lambda}=0`,
          String.raw`\begin{cases}-2x+\lambda=0\\-2(y-2)+2\lambda=0\\x+2y-5=0\end{cases}`,
          String.raw`x^{*}=\frac{1}{5},\qquad y^{*}=\frac{12}{5},\qquad \lambda^{*}=\frac{2}{5}`
        ],
        explanation: [
          "The multiplier adds the equality constraint into the objective as a stationarity condition.",
          "The middle system is the course example after differentiating the Lagrangian.",
          "At the optimum, the objective contour is tangent to the equality constraint."
        ]
      }
    ],
    equality: [
      {
        title: "Equality-Constrained Model",
        latex: [
          String.raw`\min f(x,y)\quad \text{subject to}\quad h(x,y)=0`,
          String.raw`\nabla f(x^{*},y^{*})+\lambda \nabla h(x^{*},y^{*})=0`
        ],
        explanation: [
          "Every feasible candidate must lie exactly on the equality boundary.",
          "The Lagrange condition explains why the best boundary point has parallel gradients."
        ]
      }
    ],
    inequality: [
      kktEquation()
    ],
    penalty: [
      penaltyEquation(constrainedProblem ?? constrainedExamples[1])
    ],
    aco: [
      {
        title: "ACO Transition Probability",
        latex: String.raw`p_{ij}^{k}=\frac{(\tau_{ij})^{\alpha}(\eta_{ij})^{\beta}}{\sum_{l\in N_i^k}(\tau_{il})^{\alpha}(\eta_{il})^{\beta}}`,
        explanation: [
          "τ means the pheromone level on the edge from city i to city j.",
          "η means visibility, usually inverse distance. α and β control the influence of pheromone and distance."
        ]
      },
      {
        title: "ACO Visibility And Pheromone Update",
        latex: [
          String.raw`\eta_{ij}=\frac{1}{d_{ij}}`,
          String.raw`\tau_{ij}(t+1)=(1-\rho)\tau_{ij}(t)+\sum_{k=1}^{m}\Delta\tau_{ij}^{k}`,
          String.raw`\Delta\tau_{ij}^{k}=\frac{Q}{L_k}`
        ],
        explanation: [
          "Rho controls evaporation, so older route information gradually fades.",
          "Shorter tours have smaller route length, so the pheromone deposit is larger."
        ]
      }
    ]
  };
  return equations[method];
}

function lpEquation(problem?: typeof lpExamples[number]): MathEquation {
  if (!problem) {
    return {
      title: "Linear Programming Model",
      latex: String.raw`\begin{aligned}\max/\min\quad & z=c_1x_1+c_2x_2\\ \text{subject to}\quad & a_i x_1+b_i x_2\le d_i\end{aligned}`,
      explanation: ["The graphical method evaluates a linear objective over a polygon formed by linear constraints."]
    };
  }
  return {
    title: "Linear Programming Model",
    latex: String.raw`\begin{aligned}${problem.mode === "max" ? "\\max" : "\\min"}\quad & z=${linearObjectiveLatex(problem.objective.x, problem.objective.y)}\\ \text{subject to}\quad & ${problem.constraints.map(lpConstraintLatex).join(String.raw`\\ & `)}\end{aligned}`,
    explanation: [
      "The feasible region is the set of points satisfying every linear constraint.",
      "For a bounded feasible polygon, the best value occurs at a corner point."
    ]
  };
}

function constrainedOptimizationEquation(problem: ConstrainedProblem | undefined, title: string): MathEquation {
  return {
    title,
    latex: problem
      ? String.raw`\begin{aligned}\min\quad & ${objectiveLabelToLatex(problem.objectiveLabel)}\\ \text{subject to}\quad & ${problem.constraints.map((constraint) => labelToLatex(constraint.display)).join(String.raw`\\ & `)}\end{aligned}`
      : String.raw`\min f(x,y)\quad \text{subject to}\quad h_i(x,y)=0,\; g_j(x,y)\le 0`,
    explanation: [
      "The graph samples feasible candidates and shows which constraints are active at the reported point.",
      "The displayed result is numerical and approximate for nonlinear constrained problems."
    ]
  };
}

function objectiveLabelToLatex(source: string) {
  return labelToLatex(source.replace(/^(min|max)\s*/i, "").trim());
}

function kktEquation(): MathEquation {
  return {
    title: "KKT Conditions",
    latex: [
      String.raw`L=f+\sum_{i=1}^{m}\lambda_i h_i+\sum_{j=1}^{p}\mu_j g_j`,
      String.raw`g_i(x)\le 0,\qquad \mu_i\ge 0`,
      String.raw`\nabla f(x^{*})+\sum_{i=1}^{p}\lambda_i \nabla h_i(x^{*})+\sum_{j=1}^{m}\mu_j \nabla g_j(x^{*})=0`,
      String.raw`h_i(x^{*})=0,\qquad g_j(x^{*})\le 0`,
      String.raw`\mu_j g_j(x^{*})=0`
    ],
    explanation: [
      "Stationarity balances the objective gradient with active constraint gradients.",
      "Complementary slackness means inactive inequalities have zero multiplier."
    ]
  };
}

function penaltyEquation(problem: ConstrainedProblem): MathEquation {
  const eqTerms = problem.constraints.filter((constraint) => constraint.kind === "eq").map((constraint) => `${constraintExpressionLatex(constraint.display)}^{2}`);
  const ineqTerms = problem.constraints.filter((constraint) => constraint.kind === "ineq").map((constraint) => String.raw`\max\{0,${constraintExpressionLatex(constraint.display)}\}^{2}`);
  const terms = [...eqTerms, ...ineqTerms].join("+") || String.raw`\text{violation}^{2}`;
  return {
    title: "Penalty Transformation",
    latex: [
      String.raw`\min f(x)\quad \text{subject to}\quad h_i(x)=0,\; g_j(x)\le 0`,
      String.raw`\Phi(x,r)=f(x)+r\sum_{i=1}^{p}h_i(x)^2+r\sum_{j=1}^{m}\max\{0,g_j(x)\}^{2}`,
      String.raw`\Phi(x,y;r)=f(x,y)+r\left[${terms}\right]`
    ],
    explanation: [
      "The penalty parameter makes infeasible points expensive.",
      "The yellow path follows this penalized objective toward feasible low-value samples."
    ]
  };
}

function constraintExpressionLatex(display: string) {
  const withoutRelation = display.replace(/\s*(<=|>=|=)\s*0\s*$/g, "");
  const expression = withoutRelation.includes("=") ? withoutRelation.split("=").slice(1).join("=") : withoutRelation;
  return labelToLatex(expression.trim());
}

function linearObjectiveLatex(xCoeff: number, yCoeff: number) {
  const terms = [
    { value: xCoeff, variable: "x_1" },
    { value: yCoeff, variable: "x_2" }
  ].filter((term) => Math.abs(term.value) >= 1e-12);
  if (terms.length === 0) return "0";
  return terms.map((term, index) => coefficientTerm(term.value, term.variable, index === 0)).join("");
}

function coefficientTerm(value: number, variable: string, first: boolean) {
  if (Math.abs(value) < 1e-12) return "";
  const sign = value < 0 ? "-" : first ? "" : "+";
  const magnitude = Math.abs(value);
  const coefficient = Math.abs(magnitude - 1) < 1e-12 ? "" : fmt(magnitude);
  return `${sign}${coefficient}${variable}`;
}

function lpConstraintLatex(constraint: typeof lpExamples[number]["constraints"][number]) {
  const relation = constraint.relation === "<=" ? String.raw`\le` : constraint.relation === ">=" ? String.raw`\ge` : "=";
  return `${linearObjectiveLatex(constraint.a, constraint.b)} ${relation} ${fmt(constraint.c)}`;
}

function labelToLatex(source: string) {
  return source
    .replace(/^min\s*/i, String.raw`\min\;`)
    .replace(/^max\s*/i, String.raw`\max\;`)
    .replace(/lambda/gi, String.raw`\lambda`)
    .replace(/alpha/gi, String.raw`\alpha`)
    .replace(/beta/gi, String.raw`\beta`)
    .replace(/rho/gi, String.raw`\rho`)
    .replace(/tau/gi, String.raw`\tau`)
    .replace(/eta/gi, String.raw`\eta`)
    .replace(/grad/gi, String.raw`\nabla`)
    .replace(/\bpi\b/gi, String.raw`\pi`)
    .replace(/\btolerance\b/gi, String.raw`\varepsilon`)
    .replace(/<=/g, String.raw`\le`)
    .replace(/>=/g, String.raw`\ge`)
    .replace(/\*/g, "")
    .replace(/\b([xygX])(\d+)\b/g, "$1_{$2}")
    .replace(/\^(\d+)/g, "^{$1}")
    .replace(/\bsin\b/g, String.raw`\sin`)
    .replace(/\bcos\b/g, String.raw`\cos`);
}

function prettyMathText(source: string) {
  return source
    .replace(/>=/g, "\u2265")
    .replace(/<=/g, "\u2264")
    .replace(/\bx1\b/g, "x\u2081")
    .replace(/\bx2\b/g, "x\u2082")
    .replace(/\bg1\b/g, "g\u2081")
    .replace(/\bg2\b/g, "g\u2082")
    .replace(/\bg3\b/g, "g\u2083");
}

function MathCell({ latex }: { latex: string }) {
  return <MathFormula compact latex={latex} />;
}

function pointVectorLatex(point: Point) {
  return String.raw`\begin{bmatrix}${fmt(point.x)}\\${fmt(point.y)}\end{bmatrix}`;
}

function intervalLatex(left: number, right: number) {
  return String.raw`\left[${fmt(left)},\,${fmt(right)}\right]`;
}

function activeConstraintList(items: string[]) {
  if (items.length === 0) return "none";
  return (
    <div className="math-list">
      {items.map((item) => <MathFormula compact latex={labelToLatex(item)} key={item} />)}
    </div>
  );
}

function EquationsAndResults(props: {
  method: MethodId;
  golden: SearchResult;
  fibonacci: SearchResult;
  grid: SearchResult;
  numerical: SearchResult;
  descent: ReturnType<typeof steepestDescent>;
  lpProblem: typeof lpExamples[number];
  lpResult: ReturnType<typeof solveLinearProgram>;
  constrainedProblem: ConstrainedProblem;
  constrained: ReturnType<typeof solveConstrainedByGrid>;
  aco: AcoResult;
  presentationMode: boolean;
}) {
  const summary = methodSummaries[props.method];
  return (
    <div className="results-stack">
      <div className="math-card">
        <strong>Mathematical idea</strong>
        <span>{summary.courseFlow}</span>
      </div>
      <MethodEquationPanel method={props.method} lpProblem={props.lpProblem} constrainedProblem={props.constrainedProblem} />
      <MetricGrid {...props} />
      {props.presentationMode ? <ProfessorView method={props.method} lpProblem={props.lpProblem} constrainedProblem={props.constrainedProblem} /> : null}
      {props.method === "nonlinear" ? <NonlinearExtremaPanel /> : null}
      {isConstrainedMethod(props.method) ? <ConstrainedExplanation problem={props.constrainedProblem} result={props.constrained} /> : null}
      {props.method === "aco" ? <AcoExplanation result={props.aco} /> : null}
      <div className="math-card">
        <strong>Assumptions</strong>
        <span>{summary.assumptions}</span>
      </div>
      <div className="math-card">
        <strong>Limitations</strong>
        <span>{summary.limitations}</span>
      </div>
    </div>
  );
}

function MetricGrid(props: {
  method: MethodId;
  golden: SearchResult;
  fibonacci: SearchResult;
  grid: SearchResult;
  numerical: SearchResult;
  descent: ReturnType<typeof steepestDescent>;
  lpResult: ReturnType<typeof solveLinearProgram>;
  constrained: ReturnType<typeof solveConstrainedByGrid>;
  aco: AcoResult;
  constrainedProblem: ConstrainedProblem;
}) {
  const metrics = metricsFor(props);
  return (
    <div className="metric-grid">
      {metrics.map((metric) => (
        <div className="metric" key={metric.label}>
          <span>{metric.label}</span>
          <strong>{metric.value}</strong>
        </div>
      ))}
    </div>
  );
}

function IterationTable(props: {
  method: MethodId;
  currentStep: number;
  golden: SearchResult;
  fibonacci: SearchResult;
  grid: SearchResult;
  numerical: SearchResult;
  descent: ReturnType<typeof steepestDescent>;
  lpResult: ReturnType<typeof solveLinearProgram>;
  constrained: ReturnType<typeof solveConstrainedByGrid>;
  aco: AcoResult;
}) {
  if (props.method === "steepest") {
    return <Table headers={[<MathCell latex="k" />, <MathCell latex="X_k" />, <MathCell latex={String.raw`\nabla f(X_k)`} />, <MathCell latex="d_k" />, <MathCell latex={String.raw`\alpha_k`} />, <MathCell latex="X_{k+1}" />, <MathCell latex="f(X_{k+1})" />, <MathCell latex={String.raw`\lVert\nabla f\rVert`} />, "reason"]} rows={props.descent.history.map((row, index, rows) => {
      const nextValue = props.descent.history.find((candidate) => candidate.k === row.k + 1)?.value ?? (index === rows.length - 1 ? props.descent.value : row.value);
      const direction = { x: (row.next.x - row.point.x) / row.stepSize, y: (row.next.y - row.point.y) / row.stepSize };
      return {
        active: row.k === props.currentStep,
        cells: [
        <MathCell latex={`k=${row.k}`} />,
        <MathCell latex={String.raw`X_${row.k}=${pointVectorLatex(row.point)}`} />,
        <MathCell latex={String.raw`\nabla f(X_${row.k})=${pointVectorLatex(row.gradient)}`} />,
        <MathCell latex={String.raw`d_${row.k}=${pointVectorLatex(direction)}`} />,
        <MathCell latex={String.raw`\alpha_${row.k}=${fmt(row.stepSize)}`} />,
        <MathCell latex={String.raw`X_${row.k + 1}=${pointVectorLatex(row.next)}`} />,
        <MathCell latex={String.raw`f(X_${row.k + 1})=${fmt(nextValue)}`} />,
        <MathCell latex={String.raw`\lVert\nabla f(X_${row.k})\rVert=${fmt(row.gradientNorm)}`} />,
        index === rows.length - 1 ? props.descent.message ?? props.descent.status : "continue"
        ]
      };
    })} />;
  }
  if (props.method === "golden" || props.method === "fibonacci") {
    const result = props.method === "golden" ? props.golden : props.fibonacci;
    const headers = props.method === "golden"
      ? [<MathCell latex="k" />, <MathCell latex="x_l" />, <MathCell latex="x_u" />, <MathCell latex="x_2" />, <MathCell latex="x_1" />, <MathCell latex="f(x_2)" />, <MathCell latex="f(x_1)" />, <MathCell latex="d/(x_u-x_l)" />, "new interval / stopping"]
      : [<MathCell latex="k" />, <MathCell latex="a_k" />, <MathCell latex="b_k" />, <MathCell latex="c_k" />, <MathCell latex="d_k" />, <MathCell latex="f(c_k)" />, <MathCell latex="f(d_k)" />, "ratio", "new interval / stopping"];
    return <Table headers={headers} rows={result.history.map((row, index, rows) => {
      const kept = intervalLatex(row.nextA ?? (row.fc > row.fd ? row.c : row.a), row.nextB ?? (row.fc > row.fd ? row.b : row.d));
      const comparison = props.method === "golden"
        ? row.fc > row.fd ? String.raw`f(x_2)>f(x_1)` : String.raw`f(x_2)\le f(x_1)`
        : row.fc > row.fd ? String.raw`f(c_k)>f(d_k)` : String.raw`f(c_k)\le f(d_k)`;
      const stop = index === rows.length - 1 ? result.message ?? result.status : "";
      return {
        active: index === props.currentStep,
        cells: [
        <MathCell latex={`k=${row.k}`} />,
        <MathCell latex={props.method === "golden" ? String.raw`x_l=${fmt(row.a)}` : String.raw`a_${row.k}=${fmt(row.a)}`} />,
        <MathCell latex={props.method === "golden" ? String.raw`x_u=${fmt(row.b)}` : String.raw`b_${row.k}=${fmt(row.b)}`} />,
        <MathCell latex={props.method === "golden" ? String.raw`x_2=${fmt(row.c)}` : String.raw`c_${row.k}=${fmt(row.c)}`} />,
        <MathCell latex={props.method === "golden" ? String.raw`x_1=${fmt(row.d)}` : String.raw`d_${row.k}=${fmt(row.d)}`} />,
        <MathCell latex={props.method === "golden" ? String.raw`f(x_2)=${fmt(row.fc)}` : String.raw`f(c_${row.k})=${fmt(row.fc)}`} />,
        <MathCell latex={props.method === "golden" ? String.raw`f(x_1)=${fmt(row.fd)}` : String.raw`f(d_${row.k})=${fmt(row.fd)}`} />,
        <MathCell latex={String.raw`${fmt(row.ratio ?? 0)}`} />,
        <div className="math-list"><MathFormula compact latex={props.method === "golden" ? String.raw`[x_l,x_u]=${kept}\quad\because\quad ${comparison}` : String.raw`[a_{${row.k + 1}},b_{${row.k + 1}}]=${kept}\quad\because\quad ${comparison}`} /><MathFormula compact latex={props.method === "golden" ? String.raw`x_u-x_l=${fmt(row.length)}` : String.raw`L_${row.k}=b_${row.k}-a_${row.k}=${fmt(row.length)}`} />{stop ? <span>{stop}</span> : null}</div>
        ]
      };
    })} />;
  }
  if (props.method === "nonlinear") {
    return <Table headers={["course example", <MathCell latex={String.raw`\nabla P=0`} />, <MathCell latex="H(X^{*})" />, "classification"]} rows={nonlinearExamples.map((example) => [
      example.name,
      <MathFormula compact latex={`${labelToLatex(example.objectiveLabel)},\\quad X^{*}=(${fmt(example.criticalPoint.x)},${fmt(example.criticalPoint.y)})`} />,
      <MathFormula compact latex={String.raw`\begin{bmatrix}${example.hessian[0][0]}&${example.hessian[0][1]}\\${example.hessian[1][0]}&${example.hessian[1][1]}\end{bmatrix}`} />,
      example.classification
    ])} />;
  }
  if (props.method === "lagrange") {
    return <Table headers={["step", "course trace"]} rows={[
      ["1", <MathFormula compact latex={String.raw`\max\; f(x,y)=10-x^2-(y-2)^2\quad \text{subject to}\quad x+2y-5=0`} />],
      ["2", <MathFormula compact latex={String.raw`L(x,y,\lambda)=f(x,y)+\lambda h(x,y)`} />],
      ["3", <MathFormula compact latex={String.raw`\frac{\partial L}{\partial x}=-2x+\lambda=0`} />],
      ["4", <MathFormula compact latex={String.raw`\frac{\partial L}{\partial y}=-2(y-2)+2\lambda=0`} />],
      ["5", <MathFormula compact latex={String.raw`h(x,y)=x+2y-5=0`} />],
      ["6", <MathFormula compact latex={String.raw`x^{*}=${fmt(lagrangeExample.optimum.x)},\quad y^{*}=${fmt(lagrangeExample.optimum.y)},\quad \lambda=${fmt(lagrangeExample.lambda)},\quad f^{*}=${fmt(lagrangeExample.value)}`} />],
      ["7", "Tangency: the objective gradient is parallel to the equality-constraint gradient."]
    ]} />;
  }
  if (props.method === "numerical") {
    return <Table headers={[<MathCell latex="k" />, <MathCell latex="x_n" />, <MathCell latex="f'(x_n)" />, <MathCell latex="f''(x_n)" />, <MathCell latex="x_{n+1}" />, "stopping condition"]} rows={props.numerical.history.map((row, index) => ({
      active: index === props.currentStep,
      cells: [
        <MathCell latex={`k=${row.k}`} />,
        <MathCell latex={String.raw`x_${row.k}=${fmt(row.a)}`} />,
        <MathCell latex={String.raw`f'(x_${row.k})=${fmt(row.fc)}`} />,
        <MathCell latex={String.raw`f''(x_${row.k})=${fmt(row.fd)}`} />,
        <MathCell latex={String.raw`x_${row.k + 1}=${fmt(row.b)}`} />,
        index === props.numerical.history.length - 1 ? props.numerical.message ?? props.numerical.status : "continue"
      ]
    }))} />;
  }
  if (props.method === "linear") {
    return <Table headers={["corner", <MathCell latex="x_1" />, <MathCell latex="x_2" />, <MathCell latex="z" />, "active constraints"]} rows={props.lpResult.corners.map((row, index) => [
      String.fromCharCode(65 + index),
      <MathCell latex={String.raw`x_1=${fmt(row.x)}`} />,
      <MathCell latex={String.raw`x_2=${fmt(row.y)}`} />,
      <MathCell latex={String.raw`z=${fmt(row.value)}`} />,
      activeConstraintList(row.active)
    ]).map((cells, index) => ({ cells, active: index === props.currentStep }))} />;
  }
  if (props.method === "aco") {
    return <AcoIterationPanel result={props.aco} currentStep={props.currentStep} />;
  }
  if (props.constrained.feasibleCandidates.length === 0) {
    return <div className="empty-state">No feasible samples were found for this grid. Check whether the constraints conflict or relax the equality tolerance.</div>;
  }
  return <Table headers={["sample", <MathCell latex="x" />, <MathCell latex="y" />, <MathCell latex="f(x,y)" />, "active constraints"]} rows={props.constrained.feasibleCandidates.slice(0, 18).map((row, index) => ({
    active: index === props.currentStep,
    cells: [
    index + 1,
    <MathCell latex={`x=${fmt(row.x)}`} />,
    <MathCell latex={`y=${fmt(row.y)}`} />,
    <MathCell latex={String.raw`f(x,y)=${fmt(row.value)}`} />,
    row.active.length > 0 ? activeConstraintList(row.active) : "inactive"
    ]
  }))} />;
}

function AcoIterationPanel({ result, currentStep }: { result: AcoResult; currentStep: number }) {
  if (result.status === "invalid") return <div className="empty-state">{result.message ?? "Invalid ACO input. Fix the parameters before running the bonus method."}</div>;
  const visibleHistory = result.history.slice(0, Math.max(1, currentStep + 1));
  return (
    <div className="aco-bottom">
      <div className="comparison-chart">
        <Plot
          data={[
            { x: visibleHistory.map((row) => row.iteration), y: visibleHistory.map((row) => row.bestDistance), type: "scatter", mode: "lines+markers", name: "ACO best", line: { color: "#ffd166", width: 3 } },
            { x: visibleHistory.map((row) => row.iteration), y: visibleHistory.map(() => result.random.distance), type: "scatter", mode: "lines", name: "Random search", line: { color: "#f87171", dash: "dot" } },
            { x: visibleHistory.map((row) => row.iteration), y: visibleHistory.map(() => result.nearestNeighbor.distance), type: "scatter", mode: "lines", name: "Nearest neighbor", line: { color: "#7bf1a8", dash: "dash" } }
          ]}
          layout={{ ...plotLayout, height: 260, title: "ACO convergence vs simple routing baselines" }}
          config={{ displayModeBar: false, responsive: true }}
          useResizeHandler
          className="plot small"
        />
        <GraphExplanation
          text="This convergence chart shows how the best ACO route distance changes over iterations. Lower distance is better."
          bullets={["Yellow line: best ACO route distance.", "Dotted and dashed lines: Random Search and Nearest Neighbor baselines."]}
          note="ACO is stochastic and near-optimal, not guaranteed exact."
        />
      </div>
      <Table headers={["iteration", "best distance", "iteration best", "best route"]} rows={result.history.map((row, index) => ({ active: index === currentStep, cells: [row.iteration, fmt(row.bestDistance), fmt(row.iterationBestDistance), row.bestRoute.map((city) => city + 1).join(" -> ")] }))} />
    </div>
  );
}

function AlertList({ issues }: { issues: string[] }) {
  return (
    <div className="alert-list" role="status">
      <strong>Input check</strong>
      {issues.map((issue) => <span key={issue}>{issue}</span>)}
    </div>
  );
}

function ProfessorView({ method, lpProblem, constrainedProblem }: { method: MethodId; lpProblem: typeof lpExamples[number]; constrainedProblem: ConstrainedProblem }) {
  const summary = methodSummaries[method];
  const script = professorScript(method);
  return (
    <div className="professor-view">
      <div><strong>One-sentence definition</strong><span>{script.definition}</span></div>
      <div><strong>Inputs</strong><span>{script.inputs}</span></div>
      <div className="professor-equations">
        <strong>Main formula</strong>
        {methodEquations(method, lpProblem, constrainedProblem).map((equation) => <EquationCard equation={equation} compact key={equation.title} />)}
      </div>
      <div><strong>Main mathematical idea</strong><span>{summary.courseFlow}</span></div>
      <div><strong>What the graph shows</strong><span>{script.graph}</span></div>
      <div><strong>Why the result is valid</strong><span>{summary.correctness}</span></div>
      <div><strong>Limitation</strong><span>{summary.limitations}</span></div>
      <div><strong>Viva question</strong><span>{script.question}</span></div>
      <div><strong>Viva answer</strong><span>{script.answer}</span></div>
      <div><strong>Quick points</strong><ul>{summary.viva.map((point) => <li key={point}>{point}</li>)}</ul></div>
    </div>
  );
}

function requiredInputs(method: MethodId) {
  if (method === "linear") return "Linear objective coefficients, constraint inequalities/equalities, and max/min goal.";
  if (method === "golden" || method === "fibonacci" || method === "numerical") return "Function f(x), interval [a1,b1], optimization goal, and tolerance or number of steps.";
  if (method === "steepest") return "Objective, starting point X0, step size α, tolerance, and max iterations.";
  if (method === "lagrange") return "Objective f(x,y) and equality constraint h(x,y)=0.";
  if (method === "penalty") return "Original constrained problem, exterior/interior penalty choice, starting point, and penalty parameter idea.";
  if (method === "aco") return "City coordinates and ACO parameters α, β, ρ, Q, ants, and iterations.";
  return "Objective, equality or inequality constraints in standard mathematical form, bounds for visualization, and starting point.";
}

function professorScript(method: MethodId) {
  const scripts: Record<MethodId, { definition: string; inputs: string; graph: string; question: string; answer: string }> = {
    numerical: {
      definition: "Numerical optimization finds an approximate optimum through iterations instead of an exact symbolic solution.",
      inputs: requiredInputs(method),
      graph: "The plot compares numerical candidates from Newton-style refinement, Golden Section, Fibonacci, and a grid baseline on the same 1D function.",
      question: "Why do we call this result approximate?",
      answer: "Because the algorithm stops when the tolerance or iteration rule is satisfied; it does not prove an exact symbolic critical point unless we check it analytically."
    },
    golden: {
      definition: "Golden Section Search Method finds the maximum or minimum of a unimodal function by shrinking the uncertainty interval.",
      inputs: requiredInputs(method),
      graph: "The graph shows f(x), the current interval [xl,xu], the two test points x1 and x2, and the interval that remains after comparison.",
      question: "Why can part of the interval be discarded?",
      answer: "For a unimodal function, comparing f(c) and f(d) tells which side cannot contain the minimum, so the remaining interval still contains the optimum."
    },
    fibonacci: {
      definition: "Fibonacci Search is a derivative-free 1D interval method that uses a planned number of Fibonacci reductions.",
      inputs: requiredInputs(method),
      graph: "The graph shows the same uncertainty-interval idea, but the positions of c and d follow Fibonacci ratios for the selected n.",
      question: "How is Fibonacci different from Golden Section?",
      answer: "Golden Section uses a constant shrink ratio; Fibonacci uses ratios tied to the planned number of steps and a final uncertainty length."
    },
    steepest: {
      definition: "Steepest Ascent moves in the gradient direction for a maximum; Steepest Descent uses the negative gradient for a minimum.",
      inputs: requiredInputs(method),
      graph: "The contour plot shows the gradient-based path from X0 and how the point moves toward the course optimum.",
      question: "Why does ascent use the gradient direction?",
      answer: "The gradient points toward the maximum direction of increase; for minimization the notes use the opposite direction."
    },
    linear: {
      definition: "Linear Programming optimizes a linear objective over a feasible polygon formed by linear constraints.",
      inputs: requiredInputs(method),
      graph: "The graph shows constraint lines, the shaded feasible region, corner points, active constraints, and the selected optimum.",
      question: "Why is checking corners enough in graphical LP?",
      answer: "By the corner-point theorem, a bounded optimum of a linear objective over a polygon occurs at an extreme point."
    },
    nonlinear: {
      definition: "Extrema of nonlinear functions are found from critical points and classified by the Hessian matrix.",
      inputs: requiredInputs(method),
      graph: "The plot gives a contour view, while the table follows the professor's critical-point and Hessian classification steps.",
      question: "How does the course classify a critical point?",
      answer: "After solving gradient P=0, the Hessian matrix is checked: positive definite gives local min, negative definite gives local max, and indefinite gives saddle point."
    },
    lagrange: {
      definition: "Lagrange Multipliers Method solves smooth equality-constrained problems by making the objective and constraint gradients parallel.",
      inputs: requiredInputs(method),
      graph: "The plot shows objective contours, the equality line, the constrained optimum, and gradient arrows at tangency.",
      question: "What does λ represent?",
      answer: "λ is the multiplier that balances the constraint gradient with the objective gradient at a feasible stationary point."
    },
    equality: {
      definition: "Equality-constrained optimization restricts all candidates to points that satisfy h(x,y)=0.",
      inputs: requiredInputs(method),
      graph: "The graph highlights the equality boundary, feasible sampled points near that boundary, and the best approximate feasible candidate.",
      question: "Are equality constraints active?",
      answer: "Yes. An equality constraint must hold at every feasible point, so it is always active."
    },
    inequality: {
      definition: "Inequality-constrained optimization searches a feasible region where active constraints can behave like equalities at the optimum.",
      inputs: requiredInputs(method),
      graph: "The graph shows the feasible region, active and inactive constraints, sampled candidates, and the KKT-style optimum marker.",
      question: "What is complementary slackness?",
      answer: "If an inequality is inactive, its multiplier is zero; if its multiplier is positive, the constraint is active at equality."
    },
    penalty: {
      definition: "Penalty Method replaces a constrained problem by an unconstrained penalized problem.",
      inputs: requiredInputs(method),
      graph: "The graph shows the original constraints, feasible samples, and the penalty path moving toward feasible low-value points.",
      question: "Why do we increase the penalty parameter?",
      answer: "Increasing the penalty parameter makes constraint violations more expensive, so the unconstrained search is pushed toward feasibility."
    },
    aco: {
      definition: "Ant Colony Optimization is a bonus metaheuristic for discrete route problems such as TSP.",
      inputs: requiredInputs(method),
      graph: "The graph shows city nodes, pheromone-weighted edges, the current/best tour, and convergence against simple route baselines.",
      question: "Why is ACO shown as bonus or future work?",
      answer: "It solves a different discrete combinatorial problem family and gives near-optimal stochastic routes, not exact calculus-style optima."
    }
  };
  return scripts[method];
}

function shortProfessorAnswer(method: MethodId) {
  if (method === "linear") return "For a bounded two-variable LP, the optimum occurs at a feasible corner, so I draw the feasible region and evaluate the objective at every corner.";
  if (method === "numerical") return "When solving f'(x)=0 exactly is hard, I approximate the optimum using function evaluations, intervals, and a stopping tolerance.";
  if (method === "golden") return "Golden Section keeps shrinking the uncertainty interval using the golden ratio and reuses one function value each iteration.";
  if (method === "fibonacci") return "Fibonacci Search uses planned Fibonacci ratios so the final uncertainty length is controlled by the chosen number of steps.";
  if (method === "steepest") return "The gradient gives the steepest increase direction; for maximum I move with it, and for minimum I move against it.";
  if (method === "lagrange") return "I form the Lagrangian and solve stationarity plus the constraint, which means the objective contour is tangent to the constraint.";
  if (method === "inequality") return "KKT extends Lagrange by adding feasibility, nonnegative multipliers, and complementary slackness for active constraints.";
  if (method === "penalty") return "Penalty Method changes a constrained problem into an unconstrained penalized problem, then increases the penalty effect to discourage constraint violation.";
  if (method === "aco") return "ACO is a bonus route optimizer: ants probabilistically build tours using pheromone memory and distance visibility.";
  return "I restrict the search to feasible points, identify active constraints, and report the best numerical candidate as approximate.";
}

function NonlinearExtremaPanel() {
  return (
    <div className="constraint-explainer">
      <strong>Extrema lecture examples</strong>
      <span>Course order: find critical points, compute the Hessian matrix, then classify each point.</span>
      <Table
        headers={["example", <MathCell latex="X^{*}" />, <MathCell latex="H(X^{*})" />, "course classification"]}
        rows={nonlinearExamples.map((example) => [
          <MathFormula compact latex={labelToLatex(example.objectiveLabel)} />,
          <MathFormula compact latex={String.raw`\left(${fmt(example.criticalPoint.x)},\,${fmt(example.criticalPoint.y)}\right)`} />,
          <MathFormula compact latex={String.raw`\begin{bmatrix}${example.hessian[0][0]}&${example.hessian[0][1]}\\${example.hessian[1][0]}&${example.hessian[1][1]}\end{bmatrix}`} />,
          example.classification
        ])}
      />
    </div>
  );
}

function ConstrainedExplanation({ problem, result }: { problem: ConstrainedProblem; result: ReturnType<typeof solveConstrainedByGrid> }) {
  const current = result.path[Math.min(8, result.path.length - 1)] ?? problem.start;
  return (
    <div className="constraint-explainer">
      <strong>Constrained simulation</strong>
      <EquationCard equation={constrainedOptimizationEquation(problem, "Current Constrained Problem")} compact />
      <div className="constraint-list"><strong>Current point</strong><MathFormula compact latex={String.raw`X=\begin{bmatrix}${fmt(current.x)}\\${fmt(current.y)}\end{bmatrix}`} /></div>
      <span>Candidate points: {result.feasibleCandidates.length}</span>
      <div className="constraint-list"><strong>Active constraints</strong>{activeConstraintList(result.active)}</div>
      <div className="constraint-list"><strong>Inactive constraints</strong>{activeConstraintList(result.inactive)}</div>
      <span>Why optimal: among the feasible candidate samples, this point has the smallest objective value and satisfies the active-boundary logic shown by KKT.</span>
      <EquationCard equation={kktEquation()} compact />
      <PenaltyMethodConcept problem={problem} />
    </div>
  );
}

function PenaltyMethodConcept({ problem }: { problem: ConstrainedProblem }) {
  return (
    <div className="penalty-card">
      <strong>Penalty Method - Course Concept</strong>
      <span>What it does: replaces a constrained problem with an unconstrained problem that heavily punishes constraint violations.</span>
      <EquationCard equation={constrainedOptimizationEquation(problem, "Original Constrained Problem")} compact />
      <EquationCard equation={penaltyEquation(problem)} compact />
      <span>Penalty parameter idea: increase r so infeasible points become expensive and the path moves toward the feasible boundary.</span>
      <span>Simple visual path: the yellow penalty path starts at X0 and follows the penalized objective toward feasible low-value samples.</span>
      <span>Limitation: this is a numerical/approximate teaching visualization, not a symbolic general penalty solver.</span>
    </div>
  );
}

function AcoExplanation({ result }: { result: AcoResult }) {
  if (result.status === "invalid") {
    return (
      <div className="constraint-explainer">
        <strong>ACO explanation panel</strong>
        <span>{result.message ?? "Invalid ACO input."}</span>
        <span>ACO is a discrete TSP-style bonus method; it needs at least four valid city nodes and valid pheromone parameters.</span>
      </div>
    );
  }
  return (
    <div className="constraint-explainer">
      <strong>ACO explanation panel</strong>
      {methodEquations("aco").map((equation) => <EquationCard equation={equation} compact key={equation.title} />)}
      <span>Pheromone is learned memory on an edge. Stronger pheromone means earlier ants found useful routes through that edge.</span>
      <span>α controls pheromone influence; β controls distance visibility. ρ controls evaporation so old routes do not dominate forever.</span>
      <span>ACO is useful for NP-hard routing because it samples many tours without enumerating every permutation.</span>
      <span>Comparison distances: random={fmt(result.random.distance)}, nearest neighbor={fmt(result.nearestNeighbor.distance)}{result.bruteForce ? `, brute force=${fmt(result.bruteForce.distance)}` : ", brute force hidden because city count > 9"}.</span>
    </div>
  );
}

type TableRow = ReactNode[] | { cells: ReactNode[]; active?: boolean };

function Table({ headers, rows }: { headers: ReactNode[]; rows: TableRow[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>{headers.map((header, index) => <th key={index}>{header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const cells = Array.isArray(row) ? row : row.cells;
            const active = !Array.isArray(row) && row.active;
            return <tr className={active ? "current-step-row" : undefined} key={index}>{cells.map((cell, cellIndex) => <td key={`${index}-${cellIndex}`}>{cell}</td>)}</tr>;
          })}
        </tbody>
      </table>
    </div>
  );
}

function traceRows<T>(rows: T[], visible = 16) {
  if (rows.length <= visible) return rows;
  const head = rows.slice(0, Math.max(1, visible - 1));
  return [...head, rows[rows.length - 1]];
}

function FocusedCompare({ method, rows }: { method: MethodId; rows: ComparisonRow[] }) {
  const relevant = rows.filter((row) => focusedNames(method).includes(row.name));
  return (
    <div className="focused-grid">
      {relevant.map((row) => (
        <div className="compare-card" key={row.name}>
          <strong>{row.name}</strong>
          <span>{row.problemType}</span>
          <b>{row.solution}</b>
          <small>{row.strengths}</small>
        </div>
      ))}
    </div>
  );
}

function CompareTwoMethods(props: {
  rows: ComparisonRow[];
  methodA: string;
  methodB: string;
  setMethodA: (value: string) => void;
  setMethodB: (value: string) => void;
  currentStep: number;
}) {
  const options = props.rows.map((row) => row.name);
  const first = props.rows.find((row) => row.name === props.methodA) ?? props.rows[0];
  const second = props.rows.find((row) => row.name === props.methodB) ?? props.rows[1] ?? props.rows[0];
  const comparable = areDirectlyComparable(first, second);
  const winner = comparable ? chooseComparisonWinner(first, second) : null;
  const chartRows = [first, second].filter((row) => row.curve.length > 1);
  const visibleCurve = (row: ComparisonRow) => row.curve.slice(0, Math.max(1, Math.min(row.curve.length, props.currentStep + 1)));
  return (
    <div className="compare-two">
      <div className="dual-input">
        <label>Method A<select value={first.name} onChange={(event) => props.setMethodA(event.target.value)}>{options.map((name) => <option key={name}>{name}</option>)}</select></label>
        <label>Method B<select value={second.name} onChange={(event) => props.setMethodB(event.target.value)}>{options.map((name) => <option key={name}>{name}</option>)}</select></label>
      </div>
      <div className="problem-preview compare-problem">
        <strong>Shared comparison setup</strong>
        <span>{comparable ? "Both selected methods are being judged on a compatible problem family. Results are numerical unless the badge says Exact." : "The selected methods solve different problem classes, so OptiLab reports applicability instead of forcing a fake winner."}</span>
      </div>
      <ComparisonEquationRefs rows={[first, second]} />
      <div className="focused-grid two">
        <CompareMethodCard row={first} winner={winner === first.name} />
        <CompareMethodCard row={second} winner={winner === second.name} />
      </div>
      <div className={comparable ? "interpretation-panel" : "alert-list"}>
        <strong>{comparable ? "Professor-friendly conclusion" : "These methods are not directly comparable for this problem."}</strong>
        <span>{comparable ? comparisonConclusion(first, second, winner) : `${first.name} is for ${first.problemType} (${first.dimension}), while ${second.name} is for ${second.problemType} (${second.dimension}). Use Compare All to discuss suitability instead of forcing a fake winner.`}</span>
      </div>
      {comparable ? (
        <div className="comparison-chart">
          {chartRows.length > 0 ? (
            <Plot
              data={chartRows.map((row) => {
                const curve = visibleCurve(row);
                return { x: curve.map((point) => point.k), y: curve.map((point) => point.value), type: "scatter", mode: "lines+markers", name: row.name };
              })}
              layout={{ ...plotLayout, height: 250, title: "Focused convergence comparison" }}
              config={{ displayModeBar: false, responsive: true }}
              useResizeHandler
              className="plot small"
            />
          ) : <div className="empty-state">No iterative convergence curve is available for this exact symbolic comparison.</div>}
          <GraphExplanation
            text="This chart compares two selected methods only when the comparison is mathematically valid. It shows convergence or performance side by side, and the conclusion explains which method is more suitable for the current problem."
            note="If the methods are not compatible, OptiLab reports why instead of forcing a ranking."
          />
        </div>
      ) : null}
    </div>
  );
}

function ComparisonEquationRefs({ rows }: { rows: ComparisonRow[] }) {
  const ids = uniqueMethodIds(rows.flatMap(methodIdsForComparisonRow));
  if (ids.length === 0) return null;
  return (
    <div className="comparison-equations">
      {ids.map((id) => methodEquations(id).slice(0, 1).map((equation) => <EquationCard equation={{ ...equation, title: `${methodNames[id]} formula` }} compact key={`${id}-${equation.title}`} />))}
    </div>
  );
}

function methodIdsForComparisonRow(row: ComparisonRow): MethodId[] {
  if (row.name.includes("Golden")) return ["golden"];
  if (row.name.includes("Fibonacci")) return ["fibonacci"];
  if (row.name.includes("Newton") || row.name.includes("Grid")) return ["numerical"];
  if (row.name.includes("Steepest")) return ["steepest"];
  if (row.name.includes("Linear Programming")) return ["linear"];
  if (row.name.includes("Lagrange")) return ["lagrange"];
  if (row.name.includes("Equality")) return ["equality"];
  if (row.name.includes("KKT") || row.name.includes("Active-Set")) return ["inequality"];
  if (row.name.includes("Penalty")) return ["penalty"];
  if (row.name.includes("Ant Colony") || row.name.includes("Random Search") || row.name.includes("Nearest Neighbor") || row.name.includes("TSP")) return ["aco"];
  return [];
}

function uniqueMethodIds(ids: MethodId[]) {
  return ids.filter((id, index) => ids.indexOf(id) === index);
}

function CompareMethodCard({ row, winner }: { row: ComparisonRow; winner: boolean }) {
  return (
    <div className={winner ? "compare-card winner" : "compare-card"}>
      <strong>{row.name}</strong>
      <StatusBadge label={row.resultKind ?? "Numerical"} />
      <span>{row.problemType}</span>
      <div className="compare-solution">{comparisonSolutionNode(row)}</div>
      <small>Objective: {comparisonObjectiveNode(row)}</small>
      <small>Iterations: {row.iterations}; evaluations: {row.evaluations}; runtime: {row.runtimeMs}</small>
      <small>Status: {row.status}</small>
      <small>Assumptions: {row.assumptions}</small>
      <small>Strength: {row.strengths}</small>
      <small>Limitation: {row.limitations ?? row.weaknesses}</small>
      <small>{winner ? "Recommended in this focused comparison." : "Use the conclusion panel to explain whether this method wins, ties, or is not comparable."}</small>
      <small>{row.applicabilityReason}</small>
    </div>
  );
}

function comparisonSolutionNode(row: ComparisonRow) {
  if (row.applicable === false) return "Not applicable";
  if (/^x=/.test(row.solution)) return <MathCell latex={row.solution.replace(/^x=/, "x=")} />;
  const point = row.solution.match(/^\(([-0-9.]+),\s*([-0-9.]+)\)$/);
  if (point) return <MathCell latex={String.raw`(x,y)=\left(${point[1]},\,${point[2]}\right)`} />;
  return row.solution;
}

function comparisonObjectiveNode(row: ComparisonRow) {
  if (row.applicable === false) return "n/a";
  if (/^-?\d+(\.\d+)?$/.test(row.objectiveValue)) return <MathCell latex={String.raw`f^{*}=${row.objectiveValue}`} />;
  return row.objectiveValue;
}

function StatusBadge({ label }: { label: string }) {
  return <span className={`status-badge ${label.toLowerCase().replace(/\s+/g, "-")}`}>{label}</span>;
}

function areDirectlyComparable(a: ComparisonRow, b: ComparisonRow) {
  if (a.applicable === false || b.applicable === false) return false;
  const oneD = a.dimension === "1D" && b.dimension === "1D";
  const constrained = a.constraints === "constrained" && b.constraints === "constrained" && a.dimension === b.dimension;
  const route = a.problemType.includes("route") || b.problemType.includes("route") || a.constraints === "discrete combinatorial" || b.constraints === "discrete combinatorial";
  return oneD || constrained || (route && a.constraints === b.constraints);
}

function chooseComparisonWinner(a: ComparisonRow, b: ComparisonRow) {
  if ([a.name, b.name].includes("Lagrange Multipliers Method") && [a.name, b.name].includes("Equality-Constrained Numerical Simulation")) {
    return "Lagrange Multipliers Method";
  }
  if (a.resultKind === "Exact" && b.resultKind !== "Exact") return a.name;
  if (b.resultKind === "Exact" && a.resultKind !== "Exact") return b.name;
  const av = Number(a.objectiveValue);
  const bv = Number(b.objectiveValue);
  if (Number.isFinite(av) && Number.isFinite(bv) && av !== bv) return av < bv ? a.name : b.name;
  const ae = Number(a.evaluations);
  const be = Number(b.evaluations);
  if (Number.isFinite(ae) && Number.isFinite(be) && ae !== be) return ae < be ? a.name : b.name;
  return null;
}

function comparisonConclusion(a: ComparisonRow, b: ComparisonRow, winner: string | null) {
  if (!winner) return `${a.name} and ${b.name} give very similar results here. Explain the tradeoff using assumptions: ${a.name} (${a.assumptions}) versus ${b.name} (${b.assumptions}).`;
  const loser = winner === a.name ? b : a;
  return `${winner} is preferable for this run based on the reported objective/evaluation tradeoff. ${loser.name} remains useful when its assumptions or explanation style better match the problem.`;
}

function CompareAll({ rows, currentStep }: { rows: ComparisonRow[]; currentStep: number }) {
  const interpretation = interpretBestMethod(rows);
  const visibleCurve = (row: ComparisonRow) => row.curve.slice(0, Math.max(1, Math.min(row.curve.length, currentStep + 1)));
  return (
    <div className="mega-compare">
      <div className="summary-cards">
        <div><strong>Best for 1D direct search</strong><span>Golden Section / Fibonacci</span></div>
        <div><strong>Best classroom graphing</strong><span>Linear Programming corners</span></div>
        <div><strong>Best constrained logic</strong><span>Lagrange + KKT active set</span></div>
        <div><strong>Course numerical constraint transform</strong><span>Penalty Method</span></div>
        <div><strong>Bonus advanced routing</strong><span>ACO, not in course files</span></div>
      </div>
      <div className="interpretation-panel">
        <strong>{interpretation.title}</strong>
        {interpretation.bullets.map((bullet) => <span key={bullet}>{bullet}</span>)}
      </div>
      <ComparisonEquationRefs rows={rows} />
      <div className="comparison-chart">
        <Plot
          data={rows.filter((row) => row.curve.length > 1).map((row) => {
            const curve = visibleCurve(row);
            return {
              x: curve.map((point) => point.k),
              y: curve.map((point) => point.value),
              type: "scatter",
              mode: "lines+markers",
              name: row.name
            };
          })}
          layout={{ ...plotLayout, height: 260, title: "Convergence behavior where iteration history exists" }}
          config={{ displayModeBar: false, responsive: true }}
          useResizeHandler
          className="plot small"
        />
        <GraphExplanation
          text="This comparison is applicability-aware. It does not claim that every method solves every problem."
          bullets={["Use the chart for convergence behavior where iteration history exists.", "Use the table to see which methods are suitable, not applicable, exact, or approximate."]}
        />
      </div>
      <Table
        headers={["algorithm", "applicable", "kind", "reason", "problem type", "linear/nonlinear", "constrained", "dimension", "solution", "objective", "iter", "eval", "runtime", "status", "suitable use case", "strengths", "limitations"]}
        rows={rows.map((row) => [row.name, row.applicable === false ? "No" : "Yes", row.resultKind ?? "Numerical", row.applicabilityReason ?? "", row.problemType, `${row.linear} / ${row.nonlinear}`, row.constraints, row.dimension, comparisonSolutionNode(row), comparisonObjectiveNode(row), row.iterations, row.evaluations, row.runtimeMs, row.status, row.suitableUseCase, row.strengths, row.limitations ?? row.weaknesses])}
      />
    </div>
  );
}

function metricsFor(props: {
  method: MethodId;
  golden: SearchResult;
  fibonacci: SearchResult;
  grid: SearchResult;
  numerical: SearchResult;
  descent: ReturnType<typeof steepestDescent>;
  lpResult: ReturnType<typeof solveLinearProgram>;
  constrained: ReturnType<typeof solveConstrainedByGrid>;
  aco: AcoResult;
}) {
  if (props.method === "golden") return searchMetrics(props.golden);
  if (props.method === "fibonacci") return searchMetrics(props.fibonacci);
  if (props.method === "numerical") return numericalMetrics(props.golden, props.fibonacci, props.grid);
  if (props.method === "steepest") return gradientMetrics(props.descent);
  if (props.method === "linear") return [{ label: "optimum", value: props.lpResult.status === "infeasible" ? "No feasible region found" : `(${fmt(props.lpResult.optimum.x)}, ${fmt(props.lpResult.optimum.y)})` }, { label: "z*", value: fmt(props.lpResult.optimum.value) }, { label: "status", value: props.lpResult.status === "unbounded" ? "The problem appears unbounded" : props.lpResult.status }, { label: "corners", value: String(props.lpResult.corners.length) }];
  if (props.method === "lagrange") return lagrangeMetrics();
  if (props.method === "penalty") return [{ label: "penalty path", value: `${props.constrained.path.length} points` }, { label: "best feasible sample", value: `(${fmt(props.constrained.point.x)}, ${fmt(props.constrained.point.y)})` }, { label: "f(X)", value: fmt(props.constrained.value) }, { label: "course concept", value: "exterior/interior penalty" }];
  if (props.method === "aco") return acoMetrics(props.aco);
  return [{ label: "solution", value: `(${fmt(props.constrained.point.x)}, ${fmt(props.constrained.point.y)})` }, { label: "objective", value: fmt(props.constrained.value) }, { label: "active constraints", value: props.constrained.active.length ? `${props.constrained.active.length} active` : "none" }, { label: "samples", value: String(props.constrained.feasibleCandidates.length) }];
}

const searchMetrics = (result: SearchResult) => [
  { label: "solution", value: fmt(result.x) },
  { label: "objective", value: fmt(result.fx) },
  { label: "iterations", value: String(result.iterations) },
  { label: "evaluations", value: String(result.evaluations) },
  { label: "interval", value: fmt(result.intervalLength, 6) },
  { label: "status", value: result.status }
];

const numericalMetrics = (golden: SearchResult, fibonacci: SearchResult, grid: SearchResult) => [
  { label: "umbrella type", value: "Numerical / iterative approximation" },
  { label: "Golden solution", value: fmt(golden.x) },
  { label: "Fibonacci solution", value: fmt(fibonacci.x) },
  { label: "Extra grid solution", value: fmt(grid.x) },
  { label: "best sampled objective", value: fmt(grid.fx) },
  { label: "stopping", value: golden.message ?? golden.status }
];

const gradientMetrics = (result: ReturnType<typeof steepestDescent>) => [
  { label: "solution", value: `(${fmt(result.point.x)}, ${fmt(result.point.y)})` },
  { label: "objective", value: fmt(result.value) },
  { label: "iterations", value: String(result.iterations) },
  { label: "evaluations", value: String(result.evaluations) },
  { label: "status", value: result.status }
];

const lagrangeMetrics = () => [
  { label: "solution", value: `(${fmt(lagrangeExample.optimum.x)}, ${fmt(lagrangeExample.optimum.y)})` },
  { label: "objective", value: fmt(lagrangeExample.value) },
  { label: "λ", value: fmt(lagrangeExample.lambda) },
  { label: "status", value: "exact course example" }
];

const acoMetrics = (result: AcoResult) => {
  if (result.status === "invalid") {
    return [
      { label: "best route", value: "n/a" },
      { label: "best distance", value: "n/a" },
      { label: "iterations", value: "0" },
      { label: "evaluations", value: "0" },
      { label: "status", value: "invalid" },
      { label: "message", value: result.message ?? "Invalid ACO input" }
    ];
  }
  const improvement = result.initialBestDistance > 0
    ? ((result.initialBestDistance - result.bestDistance) / result.initialBestDistance) * 100
    : 0;
  return [
    { label: "best route", value: result.bestRoute.map((city) => city + 1).join(" -> ") },
    { label: "best distance", value: fmt(result.bestDistance) },
    { label: "iterations", value: String(result.iterations) },
    { label: "evaluations", value: String(result.evaluations) },
    { label: "runtime", value: `${fmt(result.runtimeMs, 2)} ms` },
    { label: "improvement", value: `${fmt(improvement, 2)}%` },
    { label: "guarantee", value: "near-optimal, not exact" }
  ];
};

function visualSubtitle(method: MethodId) {
  if (method === "linear") return "Feasible region, constraint boundaries, corners, and optimal point";
  if (method === "steepest") return "Contour plot with animated steepest ascent/descent path";
  if (method === "golden" || method === "fibonacci") return "1D plot with uncertainty interval shrinkage";
  if (method === "lagrange") return "Objective contours plus equality constraint";
  if (method === "penalty") return "Original constraints plus numerical penalty path";
  if (method === "aco") return "Pheromone graph, current ant route, best route, and convergence";
  return "Contours, feasible samples, active constraints, and path";
}

function focusedNames(method: MethodId) {
  if (method === "golden" || method === "fibonacci") return ["Golden Section", "Fibonacci"];
  if (method === "steepest" || method === "nonlinear") return ["Steepest Ascent / Descent", "Newton 1D", "KKT / Active-Set Simulation"];
  if (method === "linear") return ["Linear Programming", "KKT / Active-Set Simulation"];
  if (method === "lagrange" || method === "equality") return ["Lagrange Multipliers Method", "Equality-Constrained Numerical Simulation", "KKT / Active-Set Simulation"];
  if (method === "inequality") return ["KKT / Active-Set Simulation", "Linear Programming", "Steepest Ascent / Descent"];
  if (method === "penalty") return ["Penalty Method", "KKT / Active-Set Simulation", "Lagrange Multipliers Method"];
  if (method === "aco") return ["Ant Colony Optimization", "Linear Programming", "Golden Section"];
  return ["Newton 1D", "Golden Section", "Fibonacci"];
}

function isConstrainedMethod(method: MethodId) {
  return method === "equality" || method === "inequality" || method === "penalty";
}

function presetConstrainedProblem(method: MethodId, index: number) {
  if (method === "equality" || method === "lagrange") {
    return constrainedExamples.find((example) => example.constraints.some((constraint) => constraint.kind === "eq")) ?? constrainedExamples[0];
  }
  if (method === "inequality") {
    return constrainedExamples.find((example) => example.constraints.every((constraint) => constraint.kind === "ineq")) ?? constrainedExamples[0];
  }
  if (method === "penalty") {
    return constrainedExamples[index] ?? constrainedExamples[1];
  }
  return constrainedExamples[index] ?? constrainedExamples[0];
}

function acoInputIssues(params: AcoParams, cityText: string, custom: boolean) {
  const issues: string[] = [];
  if (!Number.isFinite(params.cityCount) || params.cityCount < 4 || params.cityCount > 16) issues.push("ACO city count must be between 4 and 16.");
  if (!Number.isFinite(params.antCount) || params.antCount < 1 || params.antCount > 80) issues.push("ACO ant count must be between 1 and 80.");
  if (!Number.isFinite(params.iterations) || params.iterations < 1 || params.iterations > 200) issues.push("ACO iterations must be between 1 and 200.");
  if (!Number.isFinite(params.alpha) || params.alpha < 0 || params.alpha > 6) issues.push("ACO α must be between 0 and 6.");
  if (!Number.isFinite(params.beta) || params.beta < 0 || params.beta > 8) issues.push("ACO β must be between 0 and 8.");
  if (!Number.isFinite(params.rho) || params.rho < 0.01 || params.rho > 0.95) issues.push("ACO evaporation ρ must be between 0.01 and 0.95.");
  if (!Number.isFinite(params.q) || params.q < 1 || params.q > 500) issues.push("ACO Q must be between 1 and 500.");
  if (custom && cityText.trim()) {
    try {
      if (parseCities(cityText).length < 4) issues.push("Enter at least four valid custom city coordinates.");
    } catch {
      issues.push("Custom city coordinates must use one x,y pair per line, for example 0.2,0.8.");
    }
  }
  return issues;
}

function steepestInputIssues(expression: string, step: number, tolerance: number, maxIterations: number) {
  const issues: string[] = [];
  try {
    const fn = compile2D(expression);
    if (!Number.isFinite(fn({ x: 1, y: 1 }))) throw new Error("not finite");
  } catch {
    issues.push("The Steepest Ascent / Descent objective is invalid. Fix f(x,y) before running this custom problem.");
  }
  if (!Number.isFinite(step) || step <= 0) issues.push("Step size α must be positive.");
  if (!Number.isFinite(tolerance) || tolerance <= 0) issues.push("Steepest Ascent / Descent tolerance must be positive.");
  if (!Number.isFinite(maxIterations) || maxIterations <= 0) issues.push("Steepest Ascent / Descent max iterations must be greater than zero.");
  return issues;
}

function lpInputIssues(objective: string, mode: "max" | "min", constraints: string) {
  try {
    makeCustomLpProblem(objective, mode, constraints);
    return [];
  } catch {
    return ["The custom LP objective or constraints are invalid. Use linear lines like 2*x + y <= 10, x >= 0, y >= 0."];
  }
}

function resetCurrentProblem(method: MethodId, setters: {
  setProblemMode: (value: "preset" | "custom") => void;
  oneDExampleIndex: number;
  setExpression: (value: string) => void;
  setIntervalValue: (value: [number, number]) => void;
  setTolerance: (value: number) => void;
  setFibN: (value: number) => void;
  setOneDMode: (value: "min" | "max") => void;
  setSteepestExpression: (value: string) => void;
  setSteepestStart: (value: Point) => void;
  setSteepestStep: (value: number) => void;
  setSteepestTolerance: (value: number) => void;
  setSteepestMaxIterations: (value: number) => void;
  setLpMode: (value: "max" | "min") => void;
  setLpObjectiveText: (value: string) => void;
  setLpConstraintsText: (value: string) => void;
  setCustom2D: (value: string) => void;
  setCustomConstraintsText: (value: string) => void;
  setCustomStart: (value: Point) => void;
  setCustomBounds: (value: { x: [number, number]; y: [number, number] }) => void;
  setConstraintIndex: (value: number) => void;
  setAcoParams: (value: AcoParams) => void;
  setAcoCityText: (value: string) => void;
}) {
  setters.setProblemMode("preset");
  if (method === "golden" || method === "fibonacci" || method === "numerical") {
    const example = oneDExamples[setters.oneDExampleIndex] ?? courseOneDExample;
    setters.setExpression(example.expression);
    setters.setIntervalValue(example.interval);
    setters.setTolerance(example.tolerance);
    setters.setFibN(example.fibonacciN);
    setters.setOneDMode("mode" in example ? example.mode ?? "min" : "min");
  }
  if (method === "steepest") {
    setters.setSteepestExpression("2*x*y + 2*x - x^2 - 2*y^2");
    setters.setSteepestStart({ x: steepestExample.start.x, y: steepestExample.start.y });
    setters.setSteepestStep(steepestExample.stepSize);
    setters.setSteepestTolerance(1e-4);
    setters.setSteepestMaxIterations(120);
  }
  if (method === "linear") {
    setters.setLpMode("max");
    setters.setLpObjectiveText("3*x + 2*y");
    setters.setLpConstraintsText("x + y <= 6\n2*x + y <= 8\nx >= 0\ny >= 0");
  }
  if (method === "nonlinear" || method === "lagrange" || method === "equality" || method === "inequality" || method === "penalty") {
    setters.setCustom2D("(x-1)^2 + (y-2)^2");
    setters.setCustomConstraintsText("x + y = 3\nx >= 0\ny >= 0");
    setters.setCustomStart({ x: 2.8, y: 0.4 });
    setters.setCustomBounds({ x: [-0.4, 3.4], y: [-0.4, 3.4] });
    setters.setConstraintIndex(method === "equality" || method === "lagrange" ? 5 : method === "penalty" ? 1 : 0);
  }
  if (method === "aco") {
    setters.setAcoParams({ cityCount: 9, antCount: 18, iterations: 55, alpha: 1, beta: 3, rho: 0.35, q: 80 });
    setters.setAcoCityText("");
  }
}

function validateInputs(
  expression: string,
  interval: [number, number],
  tolerance: number,
  fibN: number,
  customMode: boolean,
  custom2D: string,
  customConstraintsText: string
) {
  const issues: string[] = [];
  let oneDFn = (_x: number) => NaN;
  try {
    const candidate = compile1D(expression);
    const testValue = candidate((interval[0] + interval[1]) / 2 || 0);
    if (!Number.isFinite(testValue)) throw new Error("not finite");
    oneDFn = candidate;
  } catch {
    issues.push("The 1D function could not be evaluated. Fix the expression before running this problem.");
  }

  const intervalIsValid = Number.isFinite(interval[0]) && Number.isFinite(interval[1]) && interval[1] > interval[0];
  const safeInterval: [number, number] = [interval[0], interval[1]];
  if (!intervalIsValid) issues.push("The interval must satisfy a < b. The method will be marked invalid until this is fixed.");

  const safeTolerance = Number.isFinite(tolerance) && tolerance > 0 ? Math.max(tolerance, 1e-8) : NaN;
  if (!Number.isFinite(safeTolerance)) issues.push("Tolerance must be a positive number.");

  const safeFibN = Number.isFinite(fibN) ? Math.min(20, Math.max(4, Math.round(fibN))) : NaN;
  if (!Number.isFinite(safeFibN) || safeFibN !== fibN) issues.push("Fibonacci n must be an integer from 4 to 20.");

  if (customMode) {
    try {
      const fn = compile2D(custom2D);
      if (!Number.isFinite(fn({ x: 1, y: 1 }))) throw new Error("not finite");
    } catch {
      issues.push("The custom 2D objective is invalid. The affected method is marked invalid until the expression is fixed.");
    }
    try {
      parseNonlinearConstraints(customConstraintsText);
    } catch {
      issues.push("One or more custom constraints are invalid. Use lines like x+y=3, x>=0, or x^2+y^2<=4.");
    }
  }

  return { oneDFn, interval: safeInterval, tolerance: safeTolerance, fibN: safeFibN, issues };
}

function buildCustomConstrained(objective: string, constraints: string, start: Point, bounds: { x: [number, number]; y: [number, number] }): ConstrainedProblem {
  try {
    return makeCustomConstrainedProblem(objective, constraints, start, bounds);
  } catch {
    return {
      name: "Invalid custom constrained problem",
      objectiveLabel: `invalid f(x,y)=${objective}`,
      objective: (p) => p.x * p.x + p.y * p.y,
      constraints: [{ label: "invalid constraints", kind: "ineq", display: "invalid input - no feasible region", fn: () => 1 }],
      bounds,
      start
    };
  }
}

function invalidLpProblem(mode: "max" | "min") {
  return {
    name: "Invalid custom LP problem",
    objectiveLabel: `${mode} z = invalid input`,
    mode,
    objective: { x: 0, y: 0 },
    constraints: [
      { label: "invalid input <= 0", a: 1, b: 0, c: 0, relation: "<=" as const },
      { label: "invalid input >= 1", a: 1, b: 0, c: 1, relation: ">=" as const }
    ]
  };
}

function parseCities(source: string): Point[] {
  return source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [xRaw, yRaw] = line.split(/[\s,]+/);
      const x = Number(xRaw);
      const y = Number(yRaw);
      if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error("Invalid city coordinate");
      return { x, y };
    });
}
