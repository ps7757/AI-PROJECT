import { ExplanationStep } from "@/types/explanation";
import { Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface StepExplanationPanelProps {
  explanation: ExplanationStep | null;
  learningMode: boolean;
  speechEnabled: boolean;
  onToggleSpeech: () => void;
}

export function StepExplanationPanel({
  explanation,
  learningMode,
  speechEnabled,
  onToggleSpeech,
}: StepExplanationPanelProps) {
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    synthRef.current = window.speechSynthesis;
    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (learningMode && speechEnabled && explanation?.reason && synthRef.current) {
      synthRef.current.cancel();
      const utterance = new SpeechSynthesisUtterance(explanation.action + ". " + explanation.reason);
      utterance.rate = 1.1;
      synthRef.current.speak(utterance);
    }
  }, [explanation, learningMode, speechEnabled]);

  if (!learningMode) return null;

  return (
    <div className="bg-card/80 backdrop-blur-md border border-border rounded-xl p-5 shadow-lg w-full mt-4 flex flex-col gap-3 relative overflow-hidden transition-all">
      <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
      <div className="flex justify-between items-start">
        <h3 className="font-semibold text-lg text-primary flex items-center gap-2">
          Step {explanation?.step ?? "-"}
        </h3>
        <button
          onClick={onToggleSpeech}
          className="text-muted-foreground hover:text-foreground transition-colors p-1"
          title={speechEnabled ? "Disable Voice" : "Enable Voice"}
        >
          {speechEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={explanation?.step ?? "empty"}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col gap-2"
        >
          {explanation ? (
            <>
              <p className="text-foreground font-medium text-md leading-relaxed">
                <span className="text-muted-foreground mr-2">Action:</span>
                {explanation.action}
              </p>
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 mt-1">
                <p className="text-primary-foreground font-semibold text-sm leading-relaxed">
                  <span className="opacity-70 mr-2 uppercase text-xs tracking-wider">Reason:</span>
                  {explanation.reason}
                </p>
              </div>
              {explanation.state && Object.keys(explanation.state).length > 0 && (
                <div className="mt-2 bg-[#0d1117] rounded-lg p-3 text-xs font-mono text-muted-foreground overflow-x-auto border border-border/50 shadow-inner">
                  <pre>{JSON.stringify(explanation.state, null, 2)}</pre>
                </div>
              )}
            </>
          ) : (
            <p className="text-muted-foreground italic text-sm">Waiting for algorithm to start...</p>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
