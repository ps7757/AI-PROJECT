import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Play, Pause, RotateCcw, TreePine } from "lucide-react";
import { ExplanationStep } from "@/types/explanation";
import { StepExplanationPanel } from "@/components/StepExplanationPanel";
import { StepHistoryPanel } from "@/components/StepHistoryPanel";
import { SkipBack, SkipForward } from "lucide-react";

interface MinimaxSnapshot {
  tree: TreeNode;
  explanation: ExplanationStep | null;
}

/* ─── Types ─── */
interface TreeNode {
  id: number;
  value: number | null;
  children: TreeNode[];
  depth: number;
  isMax: boolean;
  x: number;
  y: number;
  state: "idle" | "active" | "evaluated" | "optimal" | "pruned";
  alpha?: number;
  beta?: number;
}

/* ─── Tree generation ─── */
let nodeIdCounter = 0;

function buildTree(depth: number, branch: number, currentDepth: number, isMax: boolean): TreeNode {
  const id = nodeIdCounter++;
  if (currentDepth === depth) {
    return {
      id, value: Math.floor(Math.random() * 21) - 10,
      children: [], depth: currentDepth, isMax, x: 0, y: 0, state: "idle",
    };
  }
  const children: TreeNode[] = [];
  for (let i = 0; i < branch; i++) {
    children.push(buildTree(depth, branch, currentDepth + 1, !isMax));
  }
  return { id, value: null, children, depth: currentDepth, isMax, x: 0, y: 0, state: "idle" };
}

/* ─── Layout ─── */
function layoutTree(node: TreeNode, totalDepth: number, svgW: number, svgH: number) {
  const yPad = 60;
  const usableH = svgH - yPad * 2;
  const levelH = totalDepth > 0 ? usableH / totalDepth : 0;

  // Assign y based on depth
  function setY(n: TreeNode) {
    n.y = yPad + n.depth * levelH;
    n.children.forEach(setY);
  }
  setY(node);

  // Count leaves to space x evenly
  let leafIdx = 0;
  function countLeaves(n: TreeNode): number {
    if (n.children.length === 0) return 1;
    return n.children.reduce((s, c) => s + countLeaves(c), 0);
  }
  const totalLeaves = countLeaves(node);
  const xPad = 40;
  const usableW = svgW - xPad * 2;
  const leafGap = totalLeaves > 1 ? usableW / (totalLeaves - 1) : 0;

  function assignX(n: TreeNode): void {
    if (n.children.length === 0) {
      n.x = totalLeaves === 1 ? svgW / 2 : xPad + leafIdx * leafGap;
      leafIdx++;
      return;
    }
    n.children.forEach(assignX);
    const xs = n.children.map(c => c.x);
    n.x = (Math.min(...xs) + Math.max(...xs)) / 2;
  }
  assignX(node);
}

/* ─── Flatten for rendering ─── */
function flatCloneTree(node: TreeNode): TreeNode {
  return { ...node, children: node.children.map(flatCloneTree) };
}

function flattenTree(node: TreeNode): TreeNode[] {
  const result: TreeNode[] = [node];
  node.children.forEach(c => result.push(...flattenTree(c)));
  return result;
}

function getEdges(node: TreeNode): { from: TreeNode; to: TreeNode }[] {
  const edges: { from: TreeNode; to: TreeNode }[] = [];
  node.children.forEach(c => {
    edges.push({ from: node, to: c });
    edges.push(...getEdges(c));
  });
  return edges;
}

/* ─── Component ─── */
const SVG_W = 900;
const SVG_H = 500;
const NODE_R = 20;

const MinimaxTree = () => {
  const [depth, setDepth] = useState(3);
  const [branch, setBranch] = useState(2);
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speed, setSpeed] = useState(50);
  const [stepCount, setStepCount] = useState(0);
  const [alphaBeta, setAlphaBeta] = useState(false);
  const [learningMode, setLearningMode] = useState(true);
  const [speechEnabled, setSpeechEnabled] = useState(false);
  const [currentExplanation, setCurrentExplanation] = useState<ExplanationStep | null>(null);

  const [algoSnapshots, setAlgoSnapshots] = useState<MinimaxSnapshot[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);

  const history = useMemo(() => {
    if (currentStepIndex < 0 || !algoSnapshots.length) return [];
    return algoSnapshots
      .slice(0, currentStepIndex + 1)
      .map((s, i) => s.explanation ? { ...s.explanation, step: i + 1 } : null)
      .filter(Boolean) as ExplanationStep[];
  }, [currentStepIndex, algoSnapshots]);

  const cancelRef = useRef(false);
  const pauseRef = useRef(false);
  const speedRef = useRef(speed);

  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { pauseRef.current = isPaused; }, [isPaused]);

  const generateTree = useCallback(() => {
    cancelRef.current = true;
    setIsRunning(false);
    setIsPaused(false);
    setStepCount(0);
    setAlgoSnapshots([]);
    setCurrentStepIndex(-1);
    nodeIdCounter = 0;
    const root = buildTree(depth, branch, 0, true);
    layoutTree(root, depth, SVG_W, SVG_H);
    setTree({ ...root });
  }, [depth, branch]);

  // Generate on mount
  useEffect(() => { generateTree(); }, []);

  useEffect(() => {
    if (!isRunning || isPaused || currentStepIndex < 0 || currentStepIndex >= algoSnapshots.length) {
      if (isRunning && currentStepIndex >= algoSnapshots.length) {
        setIsRunning(false);
      }
      return;
    }
    const timer = setTimeout(() => {
      setCurrentStepIndex(p => p + 1);
    }, Math.max(50, 800 - speed * 7));
    return () => clearTimeout(timer);
  }, [isRunning, isPaused, currentStepIndex, algoSnapshots, speed]);

  useEffect(() => {
    if (currentStepIndex >= 0 && algoSnapshots[currentStepIndex]) {
      const snap = algoSnapshots[currentStepIndex];
      setTree(snap.tree);
      setCurrentExplanation(snap.explanation);
      setStepCount(currentStepIndex + 1);
    }
  }, [currentStepIndex, algoSnapshots]);

  const runMinimax = useCallback(() => {
    if (!tree) return;
    cancelRef.current = false;
    setIsRunning(true);
    setIsPaused(false);
    setStepCount(0);

    // Reset states
    function resetStates(n: TreeNode) {
      n.state = "idle";
      if (n.children.length > 0) n.value = null;
      n.children.forEach(resetStates);
    }
    resetStates(tree);

    const snapshots: MinimaxSnapshot[] = [];
    const root = tree;
    let expCounter = 1;

    function addSnapshot(exp: ExplanationStep | null) {
      snapshots.push({ tree: flatCloneTree(root), explanation: exp });
    }

    function minimax(node: TreeNode, alpha: number, beta: number): number {
      if (cancelRef.current) throw new Error("cancel");

      node.state = "active";
      node.alpha = alpha;
      node.beta = beta;
      
      addSnapshot({
        step: expCounter++,
        action: `Evaluating ${node.isMax ? "MAX" : "MIN"} node`,
        reason: node.isMax 
          ? "Maximizer aims for the highest possible score."
          : "Minimizer aims for the lowest possible score.",
        state: { alpha: alpha === -Infinity ? "-∞" : alpha, beta: beta === Infinity ? "+∞" : beta, currentDepth: node.depth }
      });

      if (node.children.length === 0) {
        node.state = "evaluated";
        addSnapshot({
          step: expCounter++,
          action: "Reached leaf node",
          reason: `Static evaluation score is ${node.value}.`,
          state: { nodeValue: node.value! }
        });
        return node.value!;
      }

      let val: number;
      if (node.isMax) {
        val = -Infinity;
        for (const child of node.children) {
          if (child.state === "pruned") continue;
          const childVal = minimax(child, alpha, beta);
          val = Math.max(val, childVal);
          alpha = Math.max(alpha, val);
          if (alphaBeta && beta <= alpha) {
            const idx = node.children.indexOf(child);
            addSnapshot({
              step: expCounter++,
              action: "Alpha-Beta Pruning (MAX)",
              reason: `Beta (${beta}) ≤ Alpha (${alpha}). The MIN player above will never choose this branch, pruning remaining children.`,
              state: { alpha, beta, prunedCount: node.children.length - 1 - idx }
            });
            // Prune remaining children
            for (let i = idx + 1; i < node.children.length; i++) {
              markPruned(node.children[i]);
            }
            break;
          }
        }
      } else {
        val = Infinity;
        for (const child of node.children) {
          if (child.state === "pruned") continue;
          const childVal = minimax(child, alpha, beta);
          val = Math.min(val, childVal);
          beta = Math.min(beta, val);
          if (alphaBeta && beta <= alpha) {
            const idx = node.children.indexOf(child);
            addSnapshot({
              step: expCounter++,
              action: "Alpha-Beta Pruning (MIN)",
              reason: `Beta (${beta}) ≤ Alpha (${alpha}). The MAX player above will never choose this branch, pruning remaining children.`,
              state: { alpha, beta, prunedCount: node.children.length - 1 - idx }
            });
            for (let i = idx + 1; i < node.children.length; i++) {
              markPruned(node.children[i]);
            }
            break;
          }
        }
      }

      node.value = val;
      node.state = "evaluated";
      addSnapshot({
        step: expCounter++,
        action: `Evaluated ${node.isMax ? "MAX" : "MIN"} node`,
        reason: node.isMax ? `Maximizer chose best score: ${val}` : `Minimizer chose worst score: ${val}`,
        state: { finalValue: val }
      });
      return val;
    }

    function markPruned(n: TreeNode) {
      n.state = "pruned";
      n.children.forEach(markPruned);
    }

    try {
      minimax(root, -Infinity, Infinity);

      // Trace optimal path
      function traceOptimal(n: TreeNode) {
        n.state = "optimal";
        if (n.children.length === 0) return;
        const validChildren = n.children.filter(c => c.state !== "pruned");
        const best = validChildren.find(c => c.value === n.value);
        if (best) traceOptimal(best);
      }
      traceOptimal(root);
      addSnapshot({
        step: expCounter++,
        action: "Algorithm Complete",
        reason: "The optimal path has been found and highlighted in green.",
        state: null
      });

      setAlgoSnapshots(snapshots);
      setCurrentStepIndex(0);
    } catch {
      // cancelled
    }
  }, [tree, alphaBeta]);

  const reset = useCallback(() => {
    cancelRef.current = true;
    setIsRunning(false);
    setIsPaused(false);
    setStepCount(0);
    setCurrentExplanation(null);
    setAlgoSnapshots([]);
    setCurrentStepIndex(-1);
    if (tree) {
      function resetStates(n: TreeNode) {
        n.state = "idle";
        if (n.children.length > 0) n.value = null;
        n.children.forEach(resetStates);
      }
      resetStates(tree);
      setTree({ ...tree });
    }
  }, [tree]);

  const nodes = useMemo(() => tree ? flattenTree(tree) : [], [tree]);
  const edges = useMemo(() => tree ? getEdges(tree) : [], [tree]);

  const nodeColor = (n: TreeNode) => {
    switch (n.state) {
      case "active": return "hsl(45 93% 58%)"; // yellow
      case "optimal": return "hsl(142 71% 45%)"; // green
      case "pruned": return "hsl(var(--muted-foreground) / 0.3)";
      case "evaluated": return n.isMax ? "hsl(199 89% 60%)" : "hsl(280 68% 60%)";
      default: return n.isMax ? "hsl(199 89% 60% / 0.4)" : "hsl(280 68% 60% / 0.4)";
    }
  };

  const edgeColor = (from: TreeNode, to: TreeNode) => {
    if (from.state === "optimal" && to.state === "optimal") return "hsl(142 71% 45%)";
    if (to.state === "pruned") return "hsl(var(--muted-foreground) / 0.15)";
    return "hsl(var(--border))";
  };

  const edgeWidth = (from: TreeNode, to: TreeNode) => {
    if (from.state === "optimal" && to.state === "optimal") return 3;
    return 1.5;
  };

  return (
    <div className="page-container">
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] h-screen overflow-hidden">
        {/* Sidebar */}
        <aside className="border-r border-border p-6 flex flex-col gap-5 bg-card/50 overflow-y-auto">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>

          <header>
            <p className="section-label text-primary">Game Algorithm</p>
            <h1 className="text-2xl font-semibold mt-1">Minimax Tree</h1>
            <p className="text-muted-foreground text-sm mt-2">
              Visualize how the Minimax algorithm evaluates a game tree to find optimal moves for two players (MAX and MIN).
            </p>
          </header>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="stat-box">
              <span className="section-label">Depth</span>
              <p className="font-mono text-lg mt-1">{depth}</p>
            </div>
            <div className="stat-box">
              <span className="section-label">Steps</span>
              <p className="font-mono text-lg mt-1">{stepCount}</p>
            </div>
            <div className="stat-box col-span-2">
              <span className="section-label">Nodes</span>
              <p className="font-mono text-lg mt-1">{nodes.length}</p>
            </div>
          </div>

          <div className="stat-box">
            <span className="section-label">Complexity</span>
            <div className="flex justify-between mt-2 font-mono text-sm">
              <span>Time: O(b<sup>d</sup>)</span>
              <span>Space: O(bd)</span>
            </div>
          </div>

          {/* Tree controls */}
          <div>
            <span className="section-label">Tree Depth ({depth})</span>
            <input type="range" min={2} max={5} value={depth} onChange={e => setDepth(Number(e.target.value))}
              className="w-full mt-2 accent-primary" disabled={isRunning} />
          </div>
          <div>
            <span className="section-label">Branching Factor ({branch})</span>
            <input type="range" min={2} max={4} value={branch} onChange={e => setBranch(Number(e.target.value))}
              className="w-full mt-2 accent-primary" disabled={isRunning} />
          </div>
          <div>
            <span className="section-label">Speed</span>
            <input type="range" min={1} max={100} value={speed} onChange={e => setSpeed(Number(e.target.value))}
              className="w-full mt-2 accent-primary" />
          </div>

          {/* Alpha-Beta toggle */}
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div
              onClick={() => !isRunning && setAlphaBeta(!alphaBeta)}
              className={`w-10 h-6 rounded-full relative transition-colors ${alphaBeta ? "bg-primary" : "bg-secondary"} ${isRunning ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-foreground shadow transition-transform ${alphaBeta ? "translate-x-4" : ""}`} />
            </div>
            <span className="text-sm">Alpha-Beta Pruning</span>
          </label>

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
            <button onClick={generateTree} disabled={isRunning}
              className="control-btn-secondary flex items-center justify-center gap-2 disabled:opacity-50">
              <TreePine className="w-4 h-4" /> Generate Tree
            </button>
            {!isRunning && algoSnapshots.length === 0 ? (
              <button onClick={runMinimax} disabled={!tree}
                className="control-btn-primary flex items-center justify-center gap-2 disabled:opacity-50">
                <Play className="w-4 h-4" /> Start
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
            <button onClick={reset}
              className="control-btn-secondary flex items-center justify-center gap-2 mt-1">
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 text-xs">
            {[
              ["MAX", "hsl(199 89% 60%)"],
              ["MIN", "hsl(280 68% 60%)"],
              ["Active", "hsl(45 93% 58%)"],
              ["Optimal", "hsl(142 71% 45%)"],
              ["Pruned", "hsl(var(--muted-foreground) / 0.3)"],
            ].map(([label, color]) => (
              <span key={label} className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full inline-block" style={{ background: color }} />
                {label}
              </span>
            ))}
          </div>

          {/* Pseudocode */}
          <div>
            <span className="section-label">Pseudocode</span>
            <pre className="code-block mt-2 text-muted-foreground whitespace-pre-wrap">{`minimax(node, depth, isMax):
  if terminal(node):
    return value(node)
  if isMax:
    best = -∞
    for child in children:
      val = minimax(child, d-1, false)
      best = max(best, val)
    return best
  else:
    best = +∞
    for child in children:
      val = minimax(child, d-1, true)
      best = min(best, val)
    return best`}</pre>
          </div>
        </aside>

        {/* Visualization */}
        <section className="relative flex flex-col items-center pt-8 p-4 overflow-auto">
          <svg width={SVG_W} height={SVG_H} className="border border-border rounded-md bg-card/30 flex-shrink-0">
            {/* Edges */}
            {edges.map(({ from, to }) => (
              <line
                key={`${from.id}-${to.id}`}
                x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                stroke={edgeColor(from, to)}
                strokeWidth={edgeWidth(from, to)}
              />
            ))}
            {/* Nodes */}
            {nodes.map(n => (
              <g key={n.id}>
                {/* Glow for active */}
                {n.state === "active" && (
                  <circle cx={n.x} cy={n.y} r={NODE_R + 6} fill="none"
                    stroke="hsl(45 93% 58%)" strokeWidth="2" opacity="0.5" />
                )}
                <circle cx={n.x} cy={n.y} r={NODE_R}
                  fill={nodeColor(n)}
                  stroke={n.state === "optimal" ? "hsl(142 71% 45%)" : "none"}
                  strokeWidth="2"
                  opacity={n.state === "pruned" ? 0.3 : 1}
                />
                {/* Value */}
                <text x={n.x} y={n.y + 5}
                  textAnchor="middle" fontSize="12" fontFamily="monospace" fontWeight="600"
                  fill={n.state === "pruned" ? "hsl(var(--muted-foreground) / 0.4)" : "hsl(var(--foreground))"}
                >
                  {n.value !== null ? n.value : "?"}
                </text>
                {/* Label */}
                <text x={n.x} y={n.y - NODE_R - 6}
                  textAnchor="middle" fontSize="9" fontFamily="monospace"
                  fill="hsl(var(--muted-foreground))"
                >
                  {n.isMax ? "MAX" : "MIN"}
                </text>
              </g>
            ))}
          </svg>
          
          <div className="w-full max-w-[900px] mt-8 flex-shrink-0 flex flex-col gap-4">
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

export default MinimaxTree;
