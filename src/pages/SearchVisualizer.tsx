import { useState, useCallback, useRef, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Play, Pause, RotateCcw, SkipForward } from "lucide-react";
import { CellType, AlgoStep, ALGORITHM_INFO, ALGORITHM_FN } from "@/lib/searchAlgorithms";

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
  }, []);

  const clearVisualization = useCallback(() => {
    setGrid(prev => prev.map(row => row.map(c => (c === "visited" || c === "path" || c === "frontier") ? "empty" : c)));
    setStepCount(0);
    setNodesExplored(0);
    setPathLength(0);
    setIsComplete(false);
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

  const runAlgorithm = useCallback(async () => {
    clearVisualization();
    cancelRef.current = false;
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
    const steps = result.steps;

    for (let i = 0; i < steps.length; i++) {
      if (cancelRef.current) return;
      while (isPausedRef.current) {
        await new Promise(res => setTimeout(res, 50));
        if (cancelRef.current) return;
      }

      const step = steps[i];
      setGrid(prev => {
        const ng = prev.map(row => [...row]);
        if (ng[step.row][step.col] !== "start" && ng[step.row][step.col] !== "goal") {
          ng[step.row][step.col] = step.type;
        }
        return ng;
      });
      setStepCount(i + 1);
      if (step.type === "visited") setNodesExplored(prev => prev + 1);
      if (step.type === "path") setPathLength(prev => prev + 1);

      await new Promise(res => setTimeout(res, Math.max(5, 200 - speedRef.current * 2)));
    }

    setIsRunning(false);
    setIsComplete(true);
    setPathLength(result.pathLength);
    setNodesExplored(result.nodesExplored);
  }, [grid, runFn, clearVisualization]);

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

          {/* Controls */}
          <div className="flex flex-col gap-2">
            {!isRunning ? (
              <button onClick={runAlgorithm} className="control-btn-primary flex items-center justify-center gap-2">
                <Play className="w-4 h-4" /> Run Algorithm
              </button>
            ) : (
              <button
                onClick={() => setIsPaused(p => !p)}
                className="control-btn-primary flex items-center justify-center gap-2"
              >
                {isPaused ? <><Play className="w-4 h-4" /> Resume</> : <><Pause className="w-4 h-4" /> Pause</>}
              </button>
            )}
            <button onClick={resetGrid} className="control-btn-secondary flex items-center justify-center gap-2">
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
        <section className="relative flex items-center justify-center p-4 lg:p-8 overflow-auto">
          <div
            className="inline-grid border border-border rounded-md overflow-hidden"
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
        </section>
      </div>
    </div>
  );
};

export default SearchVisualizer;
