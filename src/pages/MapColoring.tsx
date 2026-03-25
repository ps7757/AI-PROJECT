import { useState, useCallback, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Play, Pause, RotateCcw, Shuffle, SkipBack, SkipForward } from "lucide-react";
import { motion } from "framer-motion";
import { ExplanationStep } from "@/types/explanation";
import { StepExplanationPanel } from "@/components/StepExplanationPanel";
import { StepHistoryPanel } from "@/components/StepHistoryPanel";
import { useMemo } from "react";

interface MapSnapshot {
  regions: Region[];
  backtracks: number;
  explanation: ExplanationStep | null;
}

interface Region {
  id: number;
  name: string;
  cx: number;
  cy: number;
  path: string;
  neighbors: number[];
  color: number;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--node-goal))",
  "hsl(var(--node-visited))",
  "hsl(var(--node-start))",
];
const COLOR_NAMES = ["Cyan", "Red", "Amber", "Green"];

function generateRandomGraph(numNodes: number): Region[] {
  const nodes: Region[] = [];
  for (let i = 0; i < numNodes; i++) {
    nodes.push({
      id: i,
      name: String.fromCharCode(65 + i),
      cx: 50 + Math.random() * 460,
      cy: 50 + Math.random() * 380,
      path: "",
      neighbors: [],
      color: -1,
    });
  }
  for (let i = 0; i < numNodes; i++) {
    const distances = nodes.map(n => ({ id: n.id, d: Math.hypot(n.cx - nodes[i].cx, n.cy - nodes[i].cy) }));
    distances.sort((a,b) => a.d - b.d);
    const closest = distances.slice(1, 4);
    for (const c of closest) {
      if (!nodes[i].neighbors.includes(c.id)) nodes[i].neighbors.push(c.id);
      if (!nodes[c.id].neighbors.includes(i)) nodes[c.id].neighbors.push(i);
    }
  }
  return nodes;
}

// Simple map with 7 regions
const createRegions = (): Region[] => [
  { id: 0, name: "A", cx: 150, cy: 100, path: "M80,40 L220,40 L220,160 L80,160 Z", neighbors: [1, 2, 3], color: -1 },
  { id: 1, name: "B", cx: 350, cy: 100, path: "M220,40 L480,40 L480,120 L300,160 L220,160 Z", neighbors: [0, 2, 4], color: -1 },
  { id: 2, name: "C", cx: 250, cy: 230, path: "M80,160 L300,160 L300,300 L80,300 Z", neighbors: [0, 1, 3, 5], color: -1 },
  { id: 3, name: "D", cx: 100, cy: 350, path: "M20,300 L180,300 L180,420 L20,420 Z", neighbors: [0, 2, 5], color: -1 },
  { id: 4, name: "E", cx: 430, cy: 220, path: "M300,120 L520,120 L520,300 L300,300 Z", neighbors: [1, 5, 6], color: -1 },
  { id: 5, name: "F", cx: 300, cy: 370, path: "M180,300 L420,300 L420,440 L180,440 Z", neighbors: [2, 3, 4, 6], color: -1 },
  { id: 6, name: "G", cx: 470, cy: 390, path: "M420,300 L540,300 L540,440 L420,440 Z", neighbors: [4, 5], color: -1 },
];

const MapColoring = () => {
  const [regions, setRegions] = useState<Region[]>(createRegions);
  const [isRunning, setIsRunning] = useState(false);
  const [stepCount, setStepCount] = useState(0);
  const [backtracks, setBacktracks] = useState(0);
  const [speed, setSpeed] = useState(50);
  const [isComplete, setIsComplete] = useState(false);
  const [learningMode, setLearningMode] = useState(true);
  const [speechEnabled, setSpeechEnabled] = useState(false);
  const [currentExplanation, setCurrentExplanation] = useState<ExplanationStep | null>(null);
  
  const [isPaused, setIsPaused] = useState(false);
  const [algoSnapshots, setAlgoSnapshots] = useState<MapSnapshot[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);

  const history = useMemo(() => {
    if (currentStepIndex < 0 || !algoSnapshots.length) return [];
    return algoSnapshots
      .slice(0, currentStepIndex + 1)
      .map((s, i) => s.explanation ? { ...s.explanation, step: i + 1 } : null)
      .filter(Boolean) as ExplanationStep[];
  }, [currentStepIndex, algoSnapshots]);

  const cancelRef = useRef(false);

  const reset = useCallback(() => {
    cancelRef.current = true;
    setRegions(createRegions());
    setIsRunning(false);
    setIsPaused(false);
    setStepCount(0);
    setBacktracks(0);
    setIsComplete(false);
    setCurrentExplanation(null);
    setAlgoSnapshots([]);
    setCurrentStepIndex(-1);
  }, []);

  const generateRandom = useCallback(() => {
    cancelRef.current = true;
    setRegions(generateRandomGraph(7));
    setIsRunning(false);
    setIsPaused(false);
    setStepCount(0);
    setBacktracks(0);
    setIsComplete(false);
    setCurrentExplanation(null);
    setAlgoSnapshots([]);
    setCurrentStepIndex(-1);
  }, []);

  const handleRegionClick = useCallback((index: number) => {
    if (isRunning || algoSnapshots.length > 0) return;
    setRegions(prev => {
      const next = [...prev];
      const targetIndex = next.findIndex(r => r.id === index);
      if (targetIndex === -1) return prev;
      let col = next[targetIndex].color + 1;
      if (col >= 4) col = -1;
      next[targetIndex] = { ...next[targetIndex], color: col };
      return next;
    });
  }, [isRunning, algoSnapshots.length]);

  useEffect(() => {
    if (!isRunning || isPaused || currentStepIndex < 0 || currentStepIndex >= algoSnapshots.length) {
      if (isRunning && currentStepIndex >= algoSnapshots.length) {
        setIsRunning(false);
      }
      return;
    }
    const timer = setTimeout(() => {
      setCurrentStepIndex(p => p + 1);
    }, Math.max(50, 500 - speed * 5));
    return () => clearTimeout(timer);
  }, [isRunning, isPaused, currentStepIndex, algoSnapshots, speed]);

  useEffect(() => {
    if (currentStepIndex >= 0 && algoSnapshots[currentStepIndex]) {
      const snap = algoSnapshots[currentStepIndex];
      setRegions(snap.regions);
      setBacktracks(snap.backtracks);
      setStepCount(currentStepIndex + 1);
      setCurrentExplanation(snap.explanation);
      if (currentStepIndex >= algoSnapshots.length - 1 && snap.explanation?.action === "Algorithm Complete") {
        setIsComplete(true);
      }
    }
  }, [currentStepIndex, algoSnapshots]);

  const run = useCallback(() => {
    setIsRunning(true);
    setIsPaused(false);
    setStepCount(0);
    setBacktracks(0);
    setIsComplete(false);
    setCurrentExplanation(null);

    const regs = [...regions].map(r => ({ ...r, color: -1 }));
    let bts = 0;
    let expStep = 1;
    const snapshots: MapSnapshot[] = [];

    function solve(idx: number): boolean {
      if (idx === regs.length) return true;

      for (let c = 0; c < 4; c++) {
        // Check if color is safe
        const safe = regs[idx].neighbors.every(n => {
          const neighborCol = regs.find(r => r.id === n)?.color;
          return neighborCol !== c;
        });
        if (!safe) continue;

        regs[idx].color = c;
        snapshots.push({
          regions: [...regs].map(r => ({...r})),
          backtracks: bts,
          explanation: {
            step: expStep++,
            action: `Assigned ${COLOR_NAMES[c]} to Region ${regs[idx].name}`,
            reason: `Color ${COLOR_NAMES[c]} is valid. None of its adjacent neighbors have this color. Proceeding to the next region.`,
            state: { region: regs[idx].name, assignedColor: COLOR_NAMES[c] }
          }
        });

        if (solve(idx + 1)) return true;

        // Backtrack
        regs[idx].color = -1;
        bts++;
        snapshots.push({
          regions: [...regs].map(r => ({...r})),
          backtracks: bts,
          explanation: {
            step: expStep++,
            action: `Backtracking from Region ${regs[idx].name}`,
            reason: `Dead end reached. The assignment of ${COLOR_NAMES[c]} led to an unsolvable state further down. Removing color and trying next available.`,
            state: { region: regs[idx].name, revertedColor: COLOR_NAMES[c], totalBacktracks: bts }
          }
        });
      }
      return false;
    }

    const solved = solve(0);
    
    if (solved) {
      snapshots.push({
        regions: [...regs].map(r => ({...r})),
        backtracks: bts,
        explanation: {
          step: expStep++,
          action: "Algorithm Complete",
          reason: "Successfully found a valid 4-coloring for the entire map.",
          state: null
        }
      });
    }

    setAlgoSnapshots(snapshots);
    setCurrentStepIndex(0);
  }, [regions]);

  return (
    <div className="page-container">
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] h-screen overflow-hidden">
        <aside className="border-r border-border p-6 flex flex-col gap-6 bg-card/50 overflow-y-auto">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <header>
            <p className="section-label text-primary">Constraint Satisfaction</p>
            <h1 className="text-2xl font-semibold mt-1">Map Coloring</h1>
            <p className="text-muted-foreground text-sm mt-2">
              Color a map using 4 colors such that no two adjacent regions share the same color. Uses backtracking search.
            </p>
          </header>

          <div className="grid grid-cols-2 gap-3">
            <div className="stat-box">
              <span className="section-label">Steps</span>
              <p className="font-mono text-lg mt-1">{stepCount}</p>
            </div>
            <div className="stat-box">
              <span className="section-label">Backtracks</span>
              <p className="font-mono text-lg mt-1">{backtracks}</p>
            </div>
            <div className="stat-box col-span-2">
              <span className="section-label">Status</span>
              <p className="font-mono text-xs mt-1">
                {isComplete ? "SOLVED" : isRunning ? "SOLVING" : "READY"}
              </p>
            </div>
          </div>

          <div className="stat-box">
            <span className="section-label">Complexity</span>
            <div className="flex justify-between mt-2 font-mono text-sm">
              <span>Time: O(m^n)</span>
              <span>Space: O(n)</span>
            </div>
          </div>

          <div>
            <span className="section-label">Speed</span>
            <input type="range" min={1} max={100} value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-full mt-2 accent-primary" />
          </div>

          {/* Learning Mode */}
          <div className="flex items-center justify-between border border-border p-3 rounded-md bg-secondary/30 mt-1">
            <div>
              <p className="section-label mb-1">Learning Mode</p>
              <p className="text-[10px] text-muted-foreground mr-2">Show step-by-step reasoning</p>
            </div>
            <label className="flex items-center cursor-pointer select-none">
              <div
                onClick={() => !isRunning && setLearningMode(!learningMode)}
                className={`w-10 h-6 rounded-full relative transition-colors ${learningMode ? "bg-primary" : "bg-primary/20"} ${isRunning ? "opacity-50" : ""}`}
              >
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-foreground shadow transition-transform ${learningMode ? "translate-x-4" : ""}`} />
              </div>
            </label>
          </div>

          <div className="flex flex-col gap-2 mt-2">
            {!isRunning && algoSnapshots.length === 0 ? (
              <button onClick={run} className="control-btn-primary flex items-center justify-center gap-2">
                <Play className="w-4 h-4" /> Run Backtracking
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setIsPaused(p => !p)}
                  className="control-btn-primary flex items-center justify-center gap-2"
                >
                  {isPaused || (!isRunning && currentStepIndex < algoSnapshots.length - 1) ? <><Play className="w-4 h-4" /> Resume</> : <><Pause className="w-4 h-4" /> Pause</>}
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setIsPaused(true); setIsRunning(false); setCurrentStepIndex(p => Math.max(0, p - 1)); }}
                    disabled={currentStepIndex <= 0}
                    className="control-btn-secondary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <SkipBack className="w-4 h-4" /> Step Back
                  </button>
                  <button
                    onClick={() => { setIsPaused(true); setIsRunning(false); setCurrentStepIndex(p => Math.min(algoSnapshots.length - 1, p + 1)); }}
                    disabled={currentStepIndex >= algoSnapshots.length - 1}
                    className="control-btn-secondary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <SkipForward className="w-4 h-4" /> Step Forward
                  </button>
                </div>
              </div>
            )}
            <div className="flex gap-2 mt-1">
              <button onClick={reset} disabled={isRunning} className="control-btn-secondary flex-1 flex items-center justify-center gap-2 disabled:opacity-50">
                <RotateCcw className="w-4 h-4" /> Default Map
              </button>
              <button onClick={generateRandom} disabled={isRunning} className="control-btn-secondary flex-1 flex items-center justify-center gap-2 disabled:opacity-50">
                <Shuffle className="w-4 h-4" /> Random Map
              </button>
            </div>
          </div>

          <div>
            <span className="section-label">Pseudocode</span>
            <pre className="code-block mt-2 text-muted-foreground whitespace-pre-wrap">{`backtrack(assignment):
  if assignment complete: return true
  var ← select unassigned variable
  for each color in domain:
    if consistent(var, color):
      assign(var, color)
      if backtrack(assignment):
        return true
      unassign(var)  // backtrack
  return false`}</pre>
          </div>

          <div>
            <span className="section-label">Colors</span>
            <div className="flex gap-3 mt-2">
              {COLORS.map((c, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: c }} />
                  {COLOR_NAMES[i]}
                </div>
              ))}
            </div>
          </div>
        </aside>

        <section className="relative flex flex-col items-center pt-8 p-8 overflow-auto">
          <svg width="560" height="480" className="flex-shrink-0 border border-border rounded-md bg-card/30">
            {regions.map(region => (
              <g key={region.id} style={{ cursor: isRunning || algoSnapshots.length > 0 ? "default" : "pointer" }} onClick={() => handleRegionClick(region.id)}>
                {region.path ? (
                <motion.path
                  d={region.path}
                  fill={region.color >= 0 ? COLORS[region.color] : "hsl(var(--secondary))"}
                  stroke="hsl(var(--border))"
                  strokeWidth="2"
                  initial={{ opacity: 0.5 }}
                  animate={{
                    opacity: region.color >= 0 ? 0.7 : 0.3,
                    fill: region.color >= 0 ? COLORS[region.color] : "hsl(var(--secondary))",
                  }}
                  transition={{ duration: 0.3 }}
                />
                ) : (
                <motion.circle
                  cx={region.cx}
                  cy={region.cy}
                  r={25}
                  fill={region.color >= 0 ? COLORS[region.color] : "hsl(var(--secondary))"}
                  stroke="hsl(var(--border))"
                  strokeWidth="2"
                  initial={{ opacity: 0.5 }}
                  animate={{ opacity: region.color >= 0 ? 0.9 : 0.5, fill: region.color >= 0 ? COLORS[region.color] : "hsl(var(--secondary))" }}
                  transition={{ duration: 0.3 }}
                />
                )}
                <text
                  x={region.cx}
                  y={region.cy}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="hsl(var(--foreground))"
                  fontSize="18"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {region.name}
                </text>
              </g>
            ))}
            {/* Draw adjacency edges */}
            {regions.map(r =>
              r.neighbors
                .filter(n => n > r.id)
                .map(n => (
                  <line
                    key={`${r.id}-${n}`}
                    x1={r.cx}
                    y1={r.cy}
                    x2={regions[n].cx}
                    y2={regions[n].cy}
                    stroke="hsl(var(--border))"
                    strokeWidth="1"
                    strokeDasharray="4"
                    opacity={0.5}
                  />
                ))
            )}
          </svg>
          
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

export default MapColoring;
