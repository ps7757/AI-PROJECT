export type CellType = "empty" | "wall" | "start" | "goal" | "visited" | "path" | "frontier";

export interface Cell {
  row: number;
  col: number;
  type: CellType;
}

export interface AlgoStep {
  row: number;
  col: number;
  type: "visited" | "frontier" | "path";
  explanation?: {
    action: string;
    reason: string;
    state?: any;
  };
}

export interface AlgoResult {
  steps: AlgoStep[];
  pathLength: number;
  nodesExplored: number;
}

type Grid = CellType[][];

const DIRS = [
  [0, 1], [1, 0], [0, -1], [-1, 0],
];

function isValid(grid: Grid, r: number, c: number) {
  return r >= 0 && r < grid.length && c >= 0 && c < grid[0].length && grid[r][c] !== "wall";
}

function reconstructPath(parent: Map<string, string>, end: string): AlgoStep[] {
  const path: AlgoStep[] = [];
  let cur = end;
  while (parent.has(cur)) {
    const [r, c] = cur.split(",").map(Number);
    path.push({ 
      row: r, col: c, type: "path",
      explanation: {
        action: `Tracing optimal path at (${r}, ${c})`,
        reason: "Following parent pointers backwards from the goal to build the final path."
      }
    });
    cur = parent.get(cur)!;
  }
  return path.reverse();
}

function key(r: number, c: number) { return `${r},${c}`; }

export function bfs(grid: Grid, start: [number, number], goal: [number, number]): AlgoResult {
  const steps: AlgoStep[] = [];
  const visited = new Set<string>();
  const parent = new Map<string, string>();
  const queue: [number, number][] = [start];
  visited.add(key(...start));

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    if (r === goal[0] && c === goal[1]) {
      const path = reconstructPath(parent, key(...goal));
      return { steps: [...steps, ...path], pathLength: path.length, nodesExplored: visited.size };
    }
    steps.push({ 
      row: r, col: c, type: "visited",
      explanation: {
        action: `Exploring node (${r}, ${c})`,
        reason: "Queue ensures level-order traversal. This node was the oldest undiscovered neighbor in the queue (FIFO choice).",
        state: { queueSize: queue.length, visitedCount: visited.size }
      }
    });
    for (const [dr, dc] of DIRS) {
      const nr = r + dr, nc = c + dc;
      if (isValid(grid, nr, nc) && !visited.has(key(nr, nc))) {
        visited.add(key(nr, nc));
        parent.set(key(nr, nc), key(r, c));
        queue.push([nr, nc]);
        steps.push({ 
          row: nr, col: nc, type: "frontier",
          explanation: {
            action: `Discovered neighbor (${nr}, ${nc})`,
            reason: "Node is a valid unvisited neighbor. Added to the back of the queue.",
            state: { queueSize: queue.length, visitedCount: visited.size }
          }
        });
      }
    }
  }
  return { steps, pathLength: 0, nodesExplored: visited.size };
}

export function dfs(grid: Grid, start: [number, number], goal: [number, number]): AlgoResult {
  const steps: AlgoStep[] = [];
  const visited = new Set<string>();
  const parent = new Map<string, string>();
  const stack: [number, number][] = [start];

  while (stack.length > 0) {
    const [r, c] = stack.pop()!;
    if (visited.has(key(r, c))) continue;
    visited.add(key(r, c));
    steps.push({ 
      row: r, col: c, type: "visited",
      explanation: {
        action: `Exploring node (${r}, ${c})`,
        reason: "DFS explores deeper before backtracking. This node was just popped from the top of the stack (LIFO choice).",
        state: { stackSize: stack.length, visitedCount: visited.size }
      }
    });
    if (r === goal[0] && c === goal[1]) {
      const path = reconstructPath(parent, key(...goal));
      return { steps: [...steps, ...path], pathLength: path.length, nodesExplored: visited.size };
    }
    for (const [dr, dc] of DIRS) {
      const nr = r + dr, nc = c + dc;
      if (isValid(grid, nr, nc) && !visited.has(key(nr, nc))) {
        parent.set(key(nr, nc), key(r, c));
        stack.push([nr, nc]);
        steps.push({
          row: nr, col: nc, type: "frontier",
          explanation: {
            action: `Pushed neighbor (${nr}, ${nc}) to stack`,
            reason: "Valid neighbor added. It will be explored immediately on the next step.",
            state: { stackSize: stack.length, visitedCount: visited.size }
          }
        });
      }
    }
  }
  return { steps, pathLength: 0, nodesExplored: visited.size };
}

export function ucs(grid: Grid, start: [number, number], goal: [number, number]): AlgoResult {
  const steps: AlgoStep[] = [];
  const dist = new Map<string, number>();
  const parent = new Map<string, string>();
  const pq: { r: number; c: number; cost: number }[] = [{ r: start[0], c: start[1], cost: 0 }];
  dist.set(key(...start), 0);

  while (pq.length > 0) {
    pq.sort((a, b) => a.cost - b.cost);
    const { r, c, cost } = pq.shift()!;
    if (cost > (dist.get(key(r, c)) ?? Infinity)) continue;
    
    steps.push({ 
      row: r, col: c, type: "visited",
      explanation: {
        action: `Exploring node (${r}, ${c})`,
        reason: `Node with smallest cumulative distance (${cost}) is chosen from the priority queue (greedy choice).`,
        state: { currentCost: cost, pqSize: pq.length }
      }
    });

    if (r === goal[0] && c === goal[1]) {
      const path = reconstructPath(parent, key(...goal));
      return { steps: [...steps, ...path], pathLength: path.length, nodesExplored: dist.size };
    }
    for (const [dr, dc] of DIRS) {
      const nr = r + dr, nc = c + dc;
      const newCost = cost + 1;
      if (isValid(grid, nr, nc) && newCost < (dist.get(key(nr, nc)) ?? Infinity)) {
        dist.set(key(nr, nc), newCost);
        parent.set(key(nr, nc), key(r, c));
        pq.push({ r: nr, c: nc, cost: newCost });
        steps.push({ 
          row: nr, col: nc, type: "frontier",
          explanation: {
            action: `Relaxing edge to (${nr}, ${nc})`,
            reason: `Found a shorter path to this neighbor (cost: ${newCost}). Updated priority queue.`,
            state: { neighborCost: newCost, pqSize: pq.length }
          }
        });
      }
    }
  }
  return { steps, pathLength: 0, nodesExplored: dist.size };
}

export function dls(grid: Grid, start: [number, number], goal: [number, number], limit = 20): AlgoResult {
  const steps: AlgoStep[] = [];
  const visited = new Set<string>();
  const parent = new Map<string, string>();

  function dfsLimited(r: number, c: number, depth: number): boolean {
    visited.add(key(r, c));
    steps.push({ 
      row: r, col: c, type: "visited",
      explanation: {
        action: `Exploring node (${r}, ${c}) at depth ${depth}`,
        reason: `DLS explores deeper recursively up to the depth limit (${limit}).`,
        state: { currentDepth: depth, maxLimit: limit }
      }
    });
    
    if (r === goal[0] && c === goal[1]) return true;
    if (depth >= limit) {
      steps.push({
        row: r, col: c, type: "visited",
        explanation: {
          action: `Hit depth limit (${limit}) at (${r}, ${c})`,
          reason: "Search forced to backtrack to avoid infinite loops or exceeding bounded depth computations.",
          state: { currentDepth: depth, maxLimit: limit }
        }
      });
      return false;
    }
    
    for (const [dr, dc] of DIRS) {
      const nr = r + dr, nc = c + dc;
      if (isValid(grid, nr, nc) && !visited.has(key(nr, nc))) {
        parent.set(key(nr, nc), key(r, c));
        if (dfsLimited(nr, nc, depth + 1)) return true;
      }
    }
    return false;
  }

  const found = dfsLimited(start[0], start[1], 0);
  if (found) {
    const path = reconstructPath(parent, key(...goal));
    return { steps: [...steps, ...path], pathLength: path.length, nodesExplored: visited.size };
  }
  return { steps, pathLength: 0, nodesExplored: visited.size };
}

function heuristic(r1: number, c1: number, r2: number, c2: number) {
  return Math.abs(r1 - r2) + Math.abs(c1 - c2);
}

export function astar(grid: Grid, start: [number, number], goal: [number, number]): AlgoResult {
  const steps: AlgoStep[] = [];
  const gScore = new Map<string, number>();
  const parent = new Map<string, string>();
  const openSet: { r: number; c: number; f: number }[] = [];
  const closedSet = new Set<string>();

  gScore.set(key(...start), 0);
  openSet.push({ r: start[0], c: start[1], f: heuristic(start[0], start[1], goal[0], goal[1]) });

  while (openSet.length > 0) {
    openSet.sort((a, b) => a.f - b.f);
    const { r, c } = openSet.shift()!;
    if (closedSet.has(key(r, c))) continue;
    closedSet.add(key(r, c));
    
    const g = gScore.get(key(r, c))!;
    const h = heuristic(r, c, goal[0], goal[1]);
    
    steps.push({ 
      row: r, col: c, type: "visited",
      explanation: {
        action: `Exploring node (${r}, ${c})`,
        reason: `Node with lowest f-score = g(${g}) + h(${h}) = ${g+h} selected. The heuristic guides search towards the goal.`,
        state: { fScore: g+h, gScore: g, hScore: h, openSetSize: openSet.length }
      }
    });

    if (r === goal[0] && c === goal[1]) {
      const path = reconstructPath(parent, key(...goal));
      return { steps: [...steps, ...path], pathLength: path.length, nodesExplored: closedSet.size };
    }

    for (const [dr, dc] of DIRS) {
      const nr = r + dr, nc = c + dc;
      if (!isValid(grid, nr, nc) || closedSet.has(key(nr, nc))) continue;
      const ng = g + 1;
      if (ng < (gScore.get(key(nr, nc)) ?? Infinity)) {
        gScore.set(key(nr, nc), ng);
        parent.set(key(nr, nc), key(r, c));
        const nh = heuristic(nr, nc, goal[0], goal[1]);
        const nf = ng + nh;
        openSet.push({ r: nr, c: nc, f: nf });
        steps.push({ 
          row: nr, col: nc, type: "frontier",
          explanation: {
            action: `Evaluated neighbor (${nr}, ${nc})`,
            reason: `Calculated f-score: g(${ng}) + h(${nh}) = ${nf}. Added to open set priority queue.`,
            state: { fScore: nf, gScore: ng, hScore: nh, openSetSize: openSet.length }
          }
        });
      }
    }
  }
  return { steps, pathLength: 0, nodesExplored: closedSet.size };
}

export const ALGORITHM_INFO: Record<string, { name: string; description: string; pseudocode: string; timeComplexity: string; spaceComplexity: string }> = {
  bfs: {
    name: "Breadth First Search",
    description: "Explores all neighbors at the current depth before moving to nodes at the next depth level. Guarantees shortest path in unweighted graphs.",
    pseudocode: `BFS(graph, start, goal):
  queue ← [start]
  visited ← {start}
  while queue is not empty:
    node ← queue.dequeue()
    if node == goal: return path
    for neighbor in graph.neighbors(node):
      if neighbor not in visited:
        visited.add(neighbor)
        queue.enqueue(neighbor)
  return failure`,
    timeComplexity: "O(V + E)",
    spaceComplexity: "O(V)",
  },
  dfs: {
    name: "Depth First Search",
    description: "Explores as far as possible along each branch before backtracking. Uses less memory than BFS but does not guarantee shortest path.",
    pseudocode: `DFS(graph, start, goal):
  stack ← [start]
  visited ← {}
  while stack is not empty:
    node ← stack.pop()
    if node in visited: continue
    visited.add(node)
    if node == goal: return path
    for neighbor in graph.neighbors(node):
      if neighbor not in visited:
        stack.push(neighbor)
  return failure`,
    timeComplexity: "O(V + E)",
    spaceComplexity: "O(V)",
  },
  ucs: {
    name: "Uniform Cost Search",
    description: "Expands the least-cost node first. Guarantees optimal path in weighted graphs. Equivalent to Dijkstra's algorithm.",
    pseudocode: `UCS(graph, start, goal):
  pq ← [(start, 0)]
  visited ← {}
  while pq is not empty:
    node, cost ← pq.pop_min()
    if node in visited: continue
    visited.add(node)
    if node == goal: return path
    for neighbor, w in graph.neighbors(node):
      if neighbor not in visited:
        pq.push((neighbor, cost + w))
  return failure`,
    timeComplexity: "O(E log V)",
    spaceComplexity: "O(V)",
  },
  dls: {
    name: "Depth Limited Search",
    description: "A variant of DFS that limits the search depth. Prevents infinite loops in infinite search spaces but may miss solutions beyond the limit.",
    pseudocode: `DLS(graph, node, goal, limit):
  if node == goal: return path
  if limit == 0: return cutoff
  for neighbor in graph.neighbors(node):
    result ← DLS(graph, neighbor, goal, limit-1)
    if result != failure: return result
  return failure`,
    timeComplexity: "O(b^l)",
    spaceComplexity: "O(b·l)",
  },
  astar: {
    name: "A* Search",
    description: "Uses a heuristic function f(n) = g(n) + h(n) to guide search. Guarantees optimal path when heuristic is admissible and consistent.",
    pseudocode: `A*(graph, start, goal, h):
  open ← [(start, h(start))]
  g[start] ← 0
  while open is not empty:
    node ← open.pop_min_f()
    if node == goal: return path
    for neighbor in graph.neighbors(node):
      ng ← g[node] + cost(node, neighbor)
      if ng < g[neighbor]:
        g[neighbor] ← ng
        f ← ng + h(neighbor)
        open.push((neighbor, f))
  return failure`,
    timeComplexity: "O(E log V)",
    spaceComplexity: "O(V)",
  },
};

export const ALGORITHM_FN: Record<string, (grid: Grid, start: [number, number], goal: [number, number]) => AlgoResult> = {
  bfs, dfs, ucs, dls, astar,
};
