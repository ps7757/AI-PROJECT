import { useState, useCallback, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Play, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";

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
  const cancelRef = useRef(false);
  const speedRef = useRef(speed);
  useEffect(() => { speedRef.current = speed; }, [speed]);

  const reset = useCallback(() => {
    cancelRef.current = true;
    setRegions(createRegions());
    setIsRunning(false);
    setStepCount(0);
    setBacktracks(0);
    setIsComplete(false);
  }, []);

  const run = useCallback(async () => {
    cancelRef.current = false;
    setIsRunning(true);
    setStepCount(0);
    setBacktracks(0);
    setIsComplete(false);

    const regs = createRegions();
    setRegions([...regs]);
    let steps = 0;
    let bts = 0;

    async function solve(idx: number): Promise<boolean> {
      if (cancelRef.current) return false;
      if (idx === regs.length) return true;

      for (let c = 0; c < 4; c++) {
        if (cancelRef.current) return false;
        // Check if color is safe
        const safe = regs[idx].neighbors.every(n => regs[n].color !== c);
        if (!safe) continue;

        regs[idx].color = c;
        steps++;
        setStepCount(steps);
        setRegions([...regs]);
        await new Promise(r => setTimeout(r, Math.max(50, 500 - speedRef.current * 5)));

        if (await solve(idx + 1)) return true;

        // Backtrack
        regs[idx].color = -1;
        bts++;
        setBacktracks(bts);
        setRegions([...regs]);
        await new Promise(r => setTimeout(r, Math.max(50, 300 - speedRef.current * 3)));
      }
      return false;
    }

    const solved = await solve(0);
    setIsRunning(false);
    setIsComplete(solved);
  }, []);

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

          <div className="flex flex-col gap-2">
            <button onClick={run} disabled={isRunning} className="control-btn-primary flex items-center justify-center gap-2 disabled:opacity-50">
              <Play className="w-4 h-4" /> Run Backtracking
            </button>
            <button onClick={reset} className="control-btn-secondary flex items-center justify-center gap-2">
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
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

        <section className="relative flex items-center justify-center p-8">
          <svg width="560" height="480" className="border border-border rounded-md bg-card/30">
            {regions.map(region => (
              <g key={region.id}>
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
        </section>
      </div>
    </div>
  );
};

export default MapColoring;
