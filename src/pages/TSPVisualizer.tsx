import { useState, useCallback, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Play, RotateCcw, Shuffle } from "lucide-react";

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
  const cancelRef = useRef(false);
  const speedRef = useRef(speed);
  useEffect(() => { speedRef.current = speed; }, [speed]);

  const reset = useCallback(() => {
    cancelRef.current = true;
    const newCities = randomCities(cityCount);
    setCities(newCities);
    setCurrentRoute([]);
    setBestRoute([]);
    setBestDist(Infinity);
    setIsRunning(false);
    setIteration(0);
  }, [cityCount]);

  // Nearest neighbor + 2-opt improvement
  const run = useCallback(async () => {
    cancelRef.current = false;
    setIsRunning(true);
    setIteration(0);

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
      setCurrentRoute([...route]);
      await new Promise(r => setTimeout(r, Math.max(10, 200 - speedRef.current * 2)));
      if (cancelRef.current) return;
    }

    let best = [...route];
    let bestD = totalDist(cities, best);
    setBestRoute([...best]);
    setBestDist(Math.round(bestD));
    setCurrentRoute([...best]);

    // 2-opt improvement
    let improved = true;
    let iter = 0;
    while (improved && !cancelRef.current) {
      improved = false;
      for (let i = 1; i < best.length - 1 && !cancelRef.current; i++) {
        for (let j = i + 1; j < best.length && !cancelRef.current; j++) {
          const newRoute = [...best.slice(0, i), ...best.slice(i, j + 1).reverse(), ...best.slice(j + 1)];
          const newD = totalDist(cities, newRoute);
          if (newD < bestD) {
            best = newRoute;
            bestD = newD;
            improved = true;
            setBestRoute([...best]);
            setBestDist(Math.round(bestD));
            setCurrentRoute([...best]);
            iter++;
            setIteration(iter);
            await new Promise(r => setTimeout(r, Math.max(5, 100 - speedRef.current)));
          }
        }
      }
    }

    setIsRunning(false);
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

          <div className="flex flex-col gap-2">
            <button onClick={run} disabled={isRunning} className="control-btn-primary flex items-center justify-center gap-2 disabled:opacity-50">
              <Play className="w-4 h-4" /> Run
            </button>
            <button onClick={reset} className="control-btn-secondary flex items-center justify-center gap-2">
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

        <section className="relative flex items-center justify-center p-8">
          <svg width="600" height="500" className="border border-border rounded-md bg-card/30">
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
        </section>
      </div>
    </div>
  );
};

export default TSPVisualizer;
