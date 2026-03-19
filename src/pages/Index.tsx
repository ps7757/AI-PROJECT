import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, Gamepad2, Route, Palette } from "lucide-react";

const sections = [
  {
    title: "Search Algorithms",
    icon: Search,
    description: "Grid-based pathfinding with step-by-step visualization",
    algorithms: [
      { name: "Breadth First Search", slug: "bfs", complexity: "O(V+E)" },
      { name: "Depth First Search", slug: "dfs", complexity: "O(V+E)" },
      { name: "Uniform Cost Search", slug: "ucs", complexity: "O(E log V)" },
      { name: "Depth Limited Search", slug: "dls", complexity: "O(b^l)" },
      { name: "A* Search", slug: "astar", complexity: "O(E log V)" },
    ],
    path: "/search",
  },
  {
    title: "Game Algorithms",
    icon: Gamepad2,
    description: "AI game playing with decision tree visualization",
    algorithms: [
      { name: "Minimax", slug: "minimax", complexity: "O(b^m)" },
      { name: "Minimax Tree", slug: "minimax-tree", complexity: "O(b^d)" },
    ],
    path: "/game",
  },
  {
    title: "Optimization Problems",
    icon: Route,
    description: "Finding optimal solutions in complex search spaces",
    algorithms: [
      { name: "Travelling Salesman", slug: "tsp", complexity: "O(n!)" },
    ],
    path: "/tsp",
  },
  {
    title: "Constraint Satisfaction",
    icon: Palette,
    description: "Solving problems with constraints using backtracking",
    algorithms: [
      { name: "Map Coloring", slug: "map-coloring", complexity: "O(m^n)" },
    ],
    path: "/csp",
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
};

const Index = () => {
  return (
    <div className="page-container">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container py-12">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <p className="section-label text-primary mb-2">Interactive Learning Platform</p>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              AI Algorithm Visualizer
            </h1>
            <p className="text-muted-foreground mt-3 max-w-xl text-lg">
              Explore and understand artificial intelligence algorithms through interactive, step-by-step visualizations.
            </p>
          </motion.div>
        </div>
      </header>

      {/* Sections */}
      <main className="container py-12">
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-12">
          {sections.map((section) => (
            <motion.section key={section.title} variants={item}>
              <div className="flex items-center gap-3 mb-4">
                <section.icon className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">{section.title}</h2>
              </div>
              <p className="text-muted-foreground text-sm mb-6">{section.description}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {section.algorithms.map((algo) => (
                  <Link
                    key={algo.slug}
                    to={`${section.path}/${algo.slug}`}
                    className="algo-card group cursor-pointer"
                  >
                    <div className="flex flex-col gap-2">
                      <span className="text-sm font-semibold group-hover:text-primary transition-colors">
                        {algo.name}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {algo.complexity}
                      </span>
                    </div>
                    <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-bl-full group-hover:bg-primary/10 transition-colors" />
                  </Link>
                ))}
              </div>
            </motion.section>
          ))}
        </motion.div>
      </main>
    </div>
  );
};

export default Index;
