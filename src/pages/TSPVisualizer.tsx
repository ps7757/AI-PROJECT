import { useState, useCallback, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Play, Pause, RotateCcw, Shuffle, SkipBack, SkipForward } from "lucide-react";
import { ExplanationStep } from "@/types/explanation";
import { StepExplanationPanel } from "@/components/StepExplanationPanel";
import { StepHistoryPanel } from "@/components/StepHistoryPanel";
import { useMemo } from "react";

interface TSPSnapshot {
  currentRoute: number[];
  bestRoute: number[];
  bestDist: number;
  iteration: number;
  explanation: ExplanationStep | null;
}

interface City { x: number; y: number; id: number; }

function distance(a: City, b: City) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function totalDist(cities: City[], route: number[]) {
  let d = 0;
  for (let i = 0; i < route.length - 1; i++) d += distance(cities[route[i]], cities[route[i + 1]]);
  if (route.length > 1) d += distance(cities[route[route.length - 1]], cities[route[0]]);
  return d;
}

function randomCities(n: number): City[] {
  return Array.from({ length: n }, (_, i) => ({
    id: i,
    x: 60 + Math.random() * 480,
    y: 60 + Math.random() * 380,
  }));
}

const TSPVisualizer = () => {
  const [cities, setCities] = useState<City[]>(() => randomCities(10));
  const [currentRoute, setCurrentRoute] = useState<number[]>([]);
  const [bestRoute, setBestRoute] = useState<number[]>([]);
  const [bestDist, setBestDist] = useState(Infinity);
  const [isRunning, setIsRunning] = useState(false);
  const [iteration, setIteration] = useState(0);
  const [speed, setSpeed] = useState(50);
  const [cityCount, setCityCount] = useState(10);
  const [learningMode, setLearningMode] = useState(true);
  const [speechEnabled, setSpeechEnabled] = useState(false);
  const [currentExplanation, setCurrentExplanation] = useState<ExplanationStep | null>(null);
  
  const [isPaused, setIsPaused] = useState(false);
  const [algoSnapshots, setAlgoSnapshots] = useState<TSPSnapshot[]>([]);
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
    const newCities = randomCities(cityCount);
    setCities(newCities);
    setCurrentRoute([]);
    setBestRoute([]);
    setBestDist(Infinity);
    setIsRunning(false);
    setIsPaused(false);
    setIteration(0);
    setCurrentExplanation(null);
    setAlgoSnapshots([]);
    setCurrentStepIndex(-1);
  }, [cityCount]);

  useEffect(() => {
    if (!isRunning || isPaused || currentStepIndex < 0 || currentStepIndex >= algoSnapshots.length) {
      if (isRunning && currentStepIndex >= algoSnapshots.length) {
        setIsRunning(false);
      }
      return;
    }
    const timer = setTimeout(() => {
      setCurrentStepIndex(p => p + 1);
    }, Math.max(10, 400 - speed * 3));
    return () => clearTimeout(timer);
  }, [isRunning, isPaused, currentStepIndex, algoSnapshots, speed]);

  useEffect(() => {
    if (currentStepIndex >= 0 && algoSnapshots[currentStepIndex]) {
      const snap = algoSnapshots[currentStepIndex];
      setCurrentRoute(snap.currentRoute);
      setBestRoute(snap.bestRoute);
      setBestDist(snap.bestDist);
      setIteration(snap.iteration);
      setCurrentExplanation(snap.explanation);
    }
  }, [currentStepIndex, algoSnapshots]);

  // Nearest neighbor + 2-opt improvement
  const run = useCallback(() => {
    setIsRunning(true);
    setIsPaused(false);
    setIteration(0);
    setCurrentExplanation(null);
    let expStep = 1;
    const snapshots: TSPSnapshot[] = [];

    // Start with nearest neighbor
    const visited = new Set<number>();
    const route: number[] = [0];
    visited.add(0);
    while (visited.size < cities.length) {
      const last = cities[route[route.length - 1]];
      let nearest = -1, nearestDist = Infinity;
      for (let i = 0; i < cities.length; i++) {
        if (!visited.has(i)) {
          const d = distance(last, cities[i]);
          if (d < nearestDist) { nearestDist = d; nearest = i; }
        }
      }
      route.push(nearest);
      visited.add(nearest);
      snapshots.push({
        currentRoute: [...route],
        bestRoute: [],
        bestDist: Infinity,
        iteration: 0,
        explanation: {
          step: expStep++,
          action: `Nearest Neighbor: Visited City ${nearest}`,
          reason: `City ${nearest} is the closest unvisited city to City ${last.id} with a distance of ${Math.round(nearestDist)} units.`,
          state: { currentCity: last.id, nearestCity: nearest, distance: Math.round(nearestDist) }
        }
      });
    }

    let best = [...route];
    let bestD = totalDist(cities, best);
    
    snapshots.push({
      currentRoute: [...best],
      bestRoute: [...best],
      bestDist: Math.round(bestD),
      iteration: 0,
      explanation: {
        step: expStep++,
        action: "Initial Route Complete",
        reason: "Nearest Neighbor algorithm finished an initial complete tour. Next, the 2-opt algorithm will try swapping edges to uncross lines and optimize.",
        state: { initialDistance: Math.round(bestD) }
      }
    });

    // 2-opt improvement
    let improved = true;
    let iter = 0;
    while (improved) {
      improved = false;
      for (let i = 1; i < best.length - 1; i++) {
        for (let j = i + 1; j < best.length; j++) {
          const newRoute = [...best.slice(0, i), ...best.slice(i, j + 1).reverse(), ...best.slice(j + 1)];
          const newD = totalDist(cities, newRoute);
          if (newD < bestD) {
            best = newRoute;
            bestD = newD;
            improved = true;
            iter++;
            const prevD = bestD;
            
            snapshots.push({
              currentRoute: [...best],
              bestRoute: [...best],
              bestDist: Math.round(bestD),
              iteration: iter,
              explanation: {
                step: expStep++,
                action: `2-opt Swap Improved Route`,
                reason: `Reversing the segment between City ${best[i]} and City ${best[j]} removed intersecting lines and reduced the total distance to ${Math.round(newD)}.`,
                state: { iteration: iter, newDistance: Math.round(newD), improvement: Math.round(prevD - newD) }
              }
            });
          }
        }
      }
    }

    snapshots.push({
      currentRoute: [...best],
      bestRoute: [...best],
      bestDist: Math.round(bestD),
      iteration: iter,
      explanation: {
        step: expStep++,
        action: "Algorithm Complete",
        reason: "No further 2-opt improvements could be found.",
        state: null
      }
    });

    setAlgoSnapshots(snapshots);
    setCurrentStepIndex(0);
  }, [cities]);

  const drawRoute = (route: number[], color: string, opacity: number = 1) => {
    if (route.length < 2) return null;
    const points = [...route, route[0]].map(i => `${cities[i].x},${cities[i].y}`).join(" ");
    return <polyline points={points} fill="none" stroke={color} strokeWidth="2" opacity={opacity} />;
  };

  return (
    <div className="page-container">
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] h-screen overflow-hidden">
        <aside className="border-r border-border p-6 flex flex-col gap-6 bg-card/50 overflow-y-auto">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <header>
            <p className="section-label text-primary">Optimization</p>
            <h1 className="text-2xl font-semibold mt-1">Travelling Salesman</h1>
            <p className="text-muted-foreground text-sm mt-2">
              Find the shortest route visiting all cities exactly once and returning to the start. Uses nearest neighbor heuristic + 2-opt optimization.
            </p>
          </header>

          <div className="grid grid-cols-2 gap-3">
            <div className="stat-box">
              <span className="section-label">Cities</span>
              <p className="font-mono text-lg mt-1">{cities.length}</p>
            </div>
            <div className="stat-box">
              <span className="section-label">Iterations</span>
              <p className="font-mono text-lg mt-1">{iteration}</p>
            </div>
            <div className="stat-box col-span-2">
              <span className="section-label">Best Distance</span>
              <p className="font-mono text-lg mt-1">{bestDist === Infinity ? "—" : bestDist}</p>
            </div>
          </div>

          <div className="stat-box">
            <span className="section-label">Complexity</span>
            <div className="flex justify-between mt-2 font-mono text-sm">
              <span>Exact: O(n!)</span>
              <span>2-opt: O(n²)</span>
            </div>
          </div>

          <div>
            <span className="section-label">Cities Count</span>
            <input type="range" min={5} max={20} value={cityCount} onChange={e => setCityCount(Number(e.target.value))} className="w-full mt-2 accent-primary" disabled={isRunning} />
            <span className="text-xs text-muted-foreground font-mono">{cityCount}</span>
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
                <Play className="w-4 h-4" /> Run Algorithm
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
            <button onClick={reset} className="control-btn-secondary flex items-center justify-center gap-2 mt-1">
              <Shuffle className="w-4 h-4" /> New Cities
            </button>
          </div>

          <div>
            <span className="section-label">Pseudocode</span>
            <pre className="code-block mt-2 text-muted-foreground whitespace-pre-wrap">{`NearestNeighbor(cities):
  route ← [city_0]
  while unvisited cities:
    next ← closest unvisited
    route.append(next)

2-opt(route):
  improved ← true
  while improved:
    improved ← false
    for i, j in pairs:
      if swap(i,j) shorter:
        reverse route[i..j]
        improved ← true`}</pre>
          </div>
        </aside>

        <section className="relative flex flex-col items-center p-8 overflow-auto pt-8">
          <svg width="600" height="500" className="flex-shrink-0 border border-border rounded-md bg-card/30">
            {drawRoute(bestRoute, "hsl(var(--node-path))", 0.3)}
            {drawRoute(currentRoute, "hsl(var(--primary))")}
            {cities.map(city => (
              <g key={city.id}>
                <circle cx={city.x} cy={city.y} r="6" fill="hsl(var(--primary))" />
                <circle cx={city.x} cy={city.y} r="3" fill="hsl(var(--primary-foreground))" />
                <text x={city.x + 10} y={city.y - 10} fill="hsl(var(--muted-foreground))" fontSize="10" fontFamily="monospace">
                  {city.id}
                </text>
              </g>
            ))}
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

export default TSPVisualizer;
