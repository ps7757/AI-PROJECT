import { useState, useCallback, useRef, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Play, Pause, RotateCcw, SkipForward, SkipBack } from "lucide-react";
import { CellType, AlgoStep, ALGORITHM_INFO, ALGORITHM_FN } from "@/lib/searchAlgorithms";
import { ExplanationStep } from "@/types/explanation";
import { StepExplanationPanel } from "@/components/StepExplanationPanel";
import { StepHistoryPanel } from "@/components/StepHistoryPanel";
import { useMemo } from "react";

const ROWS = 20;
const COLS = 20;
const DEFAULT_START: [number, number] = [2, 2];
const DEFAULT_GOAL: [number, number] = [17, 17];

function createEmptyGrid(): CellType[][] {
  const grid: CellType[][] = Array.from({ length: ROWS }, () => Array(COLS).fill("empty"));
  grid[DEFAULT_START[0]][DEFAULT_START[1]] = "start";
  grid[DEFAULT_GOAL[0]][DEFAULT_GOAL[1]] = "goal";
  return grid;
}

const cellColor: Record<CellType, string> = {
  empty: "bg-secondary/50",
  wall: "bg-node-wall",
  start: "bg-node-start",
  goal: "bg-node-goal",
  visited: "bg-node-visited",
  path: "bg-node-path",
  frontier: "bg-node-frontier",
};

const SearchVisualizer = () => {
  const { algo } = useParams<{ algo: string }>();
  const info = ALGORITHM_INFO[algo || "bfs"];
  const runFn = ALGORITHM_FN[algo || "bfs"];

  const [grid, setGrid] = useState<CellType[][]>(createEmptyGrid);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speed, setSpeed] = useState(50);
  const [stepCount, setStepCount] = useState(0);
  const [nodesExplored, setNodesExplored] = useState(0);
  const [pathLength, setPathLength] = useState(0);
  const [drawMode, setDrawMode] = useState<"wall" | "start" | "goal">("wall");
  const [isDrawing, setIsDrawing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const [learningMode, setLearningMode] = useState(true);
  const [speechEnabled, setSpeechEnabled] = useState(false);
  const [currentExplanation, setCurrentExplanation] = useState<ExplanationStep | null>(null);

  const [algoSteps, setAlgoSteps] = useState<AlgoStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const baseGridRef = useRef<CellType[][]>([]);

  const history = useMemo(() => {
    if (currentStepIndex < 0 || !algoSteps.length) return [];
    const arr: ExplanationStep[] = [];
    for (let i = 0; i <= currentStepIndex; i++) {
      if (algoSteps[i]?.explanation) {
        arr.push({ step: i + 1, ...algoSteps[i].explanation! });
      }
    }
    return arr;
  }, [currentStepIndex, algoSteps]);

  const isPausedRef = useRef(isPaused);
  const speedRef = useRef(speed);
  const cancelRef = useRef(false);

  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { speedRef.current = speed; }, [speed]);

  const resetGrid = useCallback(() => {
    cancelRef.current = true;
    setGrid(createEmptyGrid());
    setIsRunning(false);
    setIsPaused(false);
    setStepCount(0);
    setNodesExplored(0);
    setPathLength(0);
    setIsComplete(false);
    setCurrentExplanation(null);
    setAlgoSteps([]);
    setCurrentStepIndex(-1);
  }, []);

  const clearVisualization = useCallback(() => {
    setGrid(prev => prev.map(row => row.map(c => (c === "visited" || c === "path" || c === "frontier") ? "empty" : c)));
    setStepCount(0);
    setNodesExplored(0);
    setPathLength(0);
    setIsComplete(false);
    setCurrentExplanation(null);
    setAlgoSteps([]);
    setCurrentStepIndex(-1);
  }, []);

  const handleCellInteraction = useCallback((r: number, c: number) => {
    if (isRunning) return;
    setGrid(prev => {
      const ng = prev.map(row => [...row]);
      if (drawMode === "wall") {
        if (ng[r][c] === "empty") ng[r][c] = "wall";
        else if (ng[r][c] === "wall") ng[r][c] = "empty";
      } else if (drawMode === "start") {
        // Remove old start
        for (let i = 0; i < ROWS; i++) for (let j = 0; j < COLS; j++) if (ng[i][j] === "start") ng[i][j] = "empty";
        ng[r][c] = "start";
      } else if (drawMode === "goal") {
        for (let i = 0; i < ROWS; i++) for (let j = 0; j < COLS; j++) if (ng[i][j] === "goal") ng[i][j] = "empty";
        ng[r][c] = "goal";
      }
      return ng;
    });
  }, [isRunning, drawMode]);

  const runAlgorithm = useCallback(() => {
    clearVisualization();
    setIsRunning(true);
    setIsPaused(false);

    // Find start and goal
    let start: [number, number] = DEFAULT_START;
    let goal: [number, number] = DEFAULT_GOAL;
    const baseGrid = grid.map(row => row.map(c => (c === "visited" || c === "path" || c === "frontier") ? "empty" as CellType : c));
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (baseGrid[r][c] === "start") start = [r, c];
        if (baseGrid[r][c] === "goal") goal = [r, c];
      }
    }

    const result = runFn(baseGrid, start, goal);
    baseGridRef.current = baseGrid;
    setAlgoSteps(result.steps);
    setCurrentStepIndex(0);
    setCurrentExplanation(null);
  }, [grid, runFn, clearVisualization]);

  // Playback timer
  useEffect(() => {
    if (!isRunning || isPaused || currentStepIndex < 0 || currentStepIndex >= algoSteps.length) {
      if (isRunning && currentStepIndex >= algoSteps.length) {
        setIsRunning(false);
        setIsComplete(true);
      }
      return;
    }
    const timer = setTimeout(() => {
      setCurrentStepIndex(p => p + 1);
    }, Math.max(5, 200 - speed * 2));
    return () => clearTimeout(timer);
  }, [isRunning, isPaused, currentStepIndex, algoSteps, speed]);

  // Derived Grid updates
  useEffect(() => {
    if (currentStepIndex < 0 || !baseGridRef.current.length || !algoSteps.length) return;

    const newGrid = baseGridRef.current.map(row => [...row]);
    let newNodes = 0;
    let newPath = 0;

    for (let i = 0; i <= currentStepIndex; i++) {
      const step = algoSteps[i];
      if (!step) continue;
      if (newGrid[step.row][step.col] !== "start" && newGrid[step.row][step.col] !== "goal") {
        newGrid[step.row][step.col] = step.type;
      }
      if (step.type === "visited") newNodes++;
      if (step.type === "path") newPath++;
    }

    setGrid(newGrid);
    setStepCount(currentStepIndex + 1);
    setNodesExplored(newNodes);
    setPathLength(newPath);

    const stepInfo = algoSteps[currentStepIndex];
    if (stepInfo?.explanation) {
      setCurrentExplanation({
        step: currentStepIndex + 1,
        action: stepInfo.explanation.action,
        reason: stepInfo.explanation.reason,
        state: stepInfo.explanation.state
      });
    }
  }, [currentStepIndex, algoSteps]);

  return (
    <div className="page-container">
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] h-screen overflow-hidden">
        {/* Sidebar */}
        <aside className="border-r border-border p-6 flex flex-col gap-6 bg-card/50 overflow-y-auto">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>

          <header>
            <p className="section-label text-primary">Search Algorithm</p>
            <h1 className="text-2xl font-semibold mt-1">{info.name}</h1>
            <p className="text-muted-foreground text-sm mt-2">{info.description}</p>
          </header>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="stat-box">
              <span className="section-label">Steps</span>
              <p className="font-mono text-lg mt-1">{stepCount}</p>
            </div>
            <div className="stat-box">
              <span className="section-label">Explored</span>
              <p className="font-mono text-lg mt-1">{nodesExplored}</p>
            </div>
            <div className="stat-box">
              <span className="section-label">Path Length</span>
              <p className="font-mono text-lg mt-1">{pathLength || "—"}</p>
            </div>
            <div className="stat-box">
              <span className="section-label">Status</span>
              <p className="font-mono text-xs mt-1">
                {isComplete ? (pathLength > 0 ? "PATH_FOUND" : "UNREACHABLE") : isRunning ? (isPaused ? "PAUSED" : "RUNNING") : "READY"}
              </p>
            </div>
          </div>

          {/* Complexity */}
          <div className="stat-box">
            <span className="section-label">Complexity</span>
            <div className="flex justify-between mt-2 font-mono text-sm">
              <span>Time: {info.timeComplexity}</span>
              <span>Space: {info.spaceComplexity}</span>
            </div>
          </div>

          {/* Speed */}
          <div>
            <span className="section-label">Speed</span>
            <input
              type="range"
              min={1}
              max={100}
              value={speed}
              onChange={e => setSpeed(Number(e.target.value))}
              className="w-full mt-2 accent-primary"
            />
          </div>

          {/* Draw mode */}
          <div>
            <span className="section-label">Draw Mode</span>
            <div className="flex gap-2 mt-2">
              {(["wall", "start", "goal"] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setDrawMode(m)}
                  className={`flex-1 py-2 text-xs font-mono uppercase rounded-md border transition-all ${
                    drawMode === m
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-secondary/50 text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Learning Mode */}
          <div className="flex items-center justify-between border border-border p-3 rounded-md bg-secondary/30 mt-1">
            <div>
              <p className="section-label mb-1">Learning Mode</p>
              <p className="text-[10px] text-muted-foreground mr-2">Show step-by-step reasoning</p>
            </div>
            <label className="flex items-center cursor-pointer select-none">
              <div
                onClick={() => setLearningMode(!learningMode)}
                className={`w-10 h-6 rounded-full relative transition-colors ${learningMode ? "bg-primary" : "bg-primary/20"}`}
              >
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-foreground shadow transition-transform ${learningMode ? "translate-x-4" : ""}`} />
              </div>
            </label>
          </div>

          {/* Controls */}
          <div className="flex flex-col gap-2 mt-2">
            {!isRunning && algoSteps.length === 0 ? (
              <button onClick={runAlgorithm} className="control-btn-primary flex items-center justify-center gap-2">
                <Play className="w-4 h-4" /> Run Algorithm
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsPaused(p => !p)}
                    className="control-btn-primary flex-1 flex items-center justify-center gap-2"
                  >
                    {isPaused || (!isRunning && currentStepIndex < algoSteps.length - 1) ? <><Play className="w-4 h-4" /> Resume</> : <><Pause className="w-4 h-4" /> Pause</>}
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setIsPaused(true); setIsRunning(false); setCurrentStepIndex(p => Math.max(0, p - 1)); }}
                    disabled={currentStepIndex <= 0}
                    className="control-btn-secondary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <SkipBack className="w-4 h-4" /> Step Back
                  </button>
                  <button
                    onClick={() => { setIsPaused(true); setIsRunning(false); setCurrentStepIndex(p => Math.min(algoSteps.length - 1, p + 1)); }}
                    disabled={currentStepIndex >= algoSteps.length - 1}
                    className="control-btn-secondary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <SkipForward className="w-4 h-4" /> Step Forward
                  </button>
                </div>
              </div>
            )}
            <button onClick={resetGrid} className="control-btn-secondary flex items-center justify-center gap-2 mt-1">
              <RotateCcw className="w-4 h-4" /> Reset Grid
            </button>
          </div>

          {/* Pseudocode */}
          <div>
            <span className="section-label">Pseudocode</span>
            <pre className="code-block mt-2 text-muted-foreground whitespace-pre-wrap">{info.pseudocode}</pre>
          </div>

          {/* Legend */}
          <div>
            <span className="section-label">Legend</span>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {([
                ["Start", "bg-node-start"],
                ["Goal", "bg-node-goal"],
                ["Wall", "bg-node-wall"],
                ["Visited", "bg-node-visited"],
                ["Path", "bg-node-path"],
                ["Frontier", "bg-node-frontier"],
              ] as const).map(([label, cls]) => (
                <div key={label} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className={`w-3 h-3 rounded-sm ${cls}`} />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Canvas */}
        <section className="relative flex flex-col items-center pt-8 p-4 lg:p-8 overflow-auto">
          <div
            className="inline-grid border border-border rounded-md overflow-hidden flex-shrink-0"
            style={{
              gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
              gap: "1px",
              backgroundColor: "hsl(var(--border))",
            }}
            onMouseLeave={() => setIsDrawing(false)}
          >
            {grid.flatMap((row, r) =>
              row.map((cell, c) => (
                <div
                  key={`${r}-${c}`}
                  className={`grid-node w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 ${cellColor[cell]} ${
                    cell === "visited" ? "animate-node-visit" : cell === "path" ? "animate-path-trace" : ""
                  }`}
                  onMouseDown={() => { setIsDrawing(true); handleCellInteraction(r, c); }}
                  onMouseEnter={() => { if (isDrawing && drawMode === "wall") handleCellInteraction(r, c); }}
                  onMouseUp={() => setIsDrawing(false)}
                />
              ))
            )}
          </div>
          
          <div className="w-full max-w-[600px] mt-8 flex-shrink-0 flex flex-col gap-4">
            <StepExplanationPanel 
              explanation={currentExplanation}
              learningMode={learningMode}
              speechEnabled={speechEnabled}
              onToggleSpeech={() => setSpeechEnabled(!speechEnabled)}
            />
            {learningMode && <StepHistoryPanel history={history} />}
          </div>
        </section>
      </div>
    </div>
  );
};

export default SearchVisualizer;
