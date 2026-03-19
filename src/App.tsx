import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import SearchVisualizer from "./pages/SearchVisualizer.tsx";
import TicTacToe from "./pages/TicTacToe.tsx";
import TSPVisualizer from "./pages/TSPVisualizer.tsx";
import MapColoring from "./pages/MapColoring.tsx";
import MinimaxTree from "./pages/MinimaxTree.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/search/:algo" element={<SearchVisualizer />} />
          <Route path="/game/minimax" element={<TicTacToe />} />
          <Route path="/game/minimax-tree" element={<MinimaxTree />} />
          <Route path="/tsp/tsp" element={<TSPVisualizer />} />
          <Route path="/csp/map-coloring" element={<MapColoring />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
