import { ExplanationStep } from "@/types/explanation";
import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface StepHistoryPanelProps {
  history: ExplanationStep[];
}

export function StepHistoryPanel({ history }: StepHistoryPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [history]);

  if (!history || history.length === 0) return null;

  return (
    <div className="bg-card/80 backdrop-blur-md border border-border rounded-xl shadow-lg w-full flex flex-col relative overflow-hidden transition-all mt-4 h-64">
      <div className="absolute top-0 left-0 w-1 h-full bg-primary/50" />
      <div className="p-4 border-b border-border/50 bg-secondary/20">
        <h3 className="font-semibold text-md text-foreground flex items-center gap-2">
          Algorithm History Log
        </h3>
      </div>
      
      <div ref={containerRef} className="p-4 overflow-y-auto flex-1 flex flex-col gap-3 custom-scrollbar">
        {history.map((step, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            className={`p-3 rounded-lg border text-sm ${idx === history.length - 1 ? "border-primary bg-primary/10" : "border-border/50 bg-secondary/10 opacity-70"}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-primary/20 text-primary text-[10px] font-bold px-2 py-0.5 rounded">Step {step.step}</span>
              <span className="font-semibold text-foreground">{step.action}</span>
            </div>
            <p className="text-muted-foreground mt-1 leading-relaxed text-xs pl-1 border-l-2 border-primary/30 ml-1">
              {step.reason}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
