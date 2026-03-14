import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Player = "X" | "O" | null;
type Board = Player[];

const WINNING_LINES = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6],
];

function checkWinner(board: Board): Player {
  for (const [a,b,c] of WINNING_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  return null;
}

function isFull(board: Board) { return board.every(c => c !== null); }

function minimax(board: Board, isMax: boolean, alpha: number, beta: number): number {
  const winner = checkWinner(board);
  if (winner === "O") return 10;
  if (winner === "X") return -10;
  if (isFull(board)) return 0;

  if (isMax) {
    let best = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (!board[i]) {
        board[i] = "O";
        best = Math.max(best, minimax(board, false, alpha, beta));
        board[i] = null;
        alpha = Math.max(alpha, best);
        if (beta <= alpha) break;
      }
    }
    return best;
  } else {
    let best = Infinity;
    for (let i = 0; i < 9; i++) {
      if (!board[i]) {
        board[i] = "X";
        best = Math.min(best, minimax(board, true, alpha, beta));
        board[i] = null;
        beta = Math.min(beta, best);
        if (beta <= alpha) break;
      }
    }
    return best;
  }
}

function getBestMove(board: Board): number {
  let bestVal = -Infinity;
  let bestMove = -1;
  for (let i = 0; i < 9; i++) {
    if (!board[i]) {
      board[i] = "O";
      const val = minimax(board, false, -Infinity, Infinity);
      board[i] = null;
      if (val > bestVal) { bestVal = val; bestMove = i; }
    }
  }
  return bestMove;
}

const TicTacToe = () => {
  const [board, setBoard] = useState<Board>(Array(9).fill(null));
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<Player>(null);
  const [thinking, setThinking] = useState(false);
  const [moveCount, setMoveCount] = useState(0);

  const reset = useCallback(() => {
    setBoard(Array(9).fill(null));
    setGameOver(false);
    setWinner(null);
    setThinking(false);
    setMoveCount(0);
  }, []);

  const handleClick = useCallback((idx: number) => {
    if (board[idx] || gameOver || thinking) return;
    const newBoard = [...board];
    newBoard[idx] = "X";
    setBoard(newBoard);
    setMoveCount(prev => prev + 1);

    const w = checkWinner(newBoard);
    if (w || isFull(newBoard)) {
      setWinner(w);
      setGameOver(true);
      return;
    }

    setThinking(true);
    setTimeout(() => {
      const aiMove = getBestMove([...newBoard]);
      if (aiMove >= 0) {
        newBoard[aiMove] = "O";
        setBoard([...newBoard]);
        setMoveCount(prev => prev + 1);
        const w2 = checkWinner(newBoard);
        if (w2 || isFull(newBoard)) {
          setWinner(w2);
          setGameOver(true);
        }
      }
      setThinking(false);
    }, 400);
  }, [board, gameOver, thinking]);

  return (
    <div className="page-container">
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] h-screen overflow-hidden">
        <aside className="border-r border-border p-6 flex flex-col gap-6 bg-card/50 overflow-y-auto">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <header>
            <p className="section-label text-primary">Game Algorithm</p>
            <h1 className="text-2xl font-semibold mt-1">Minimax</h1>
            <p className="text-muted-foreground text-sm mt-2">
              The AI evaluates all possible future game states using the minimax algorithm with alpha-beta pruning to choose the optimal move.
            </p>
          </header>

          <div className="grid grid-cols-2 gap-3">
            <div className="stat-box">
              <span className="section-label">Moves</span>
              <p className="font-mono text-lg mt-1">{moveCount}</p>
            </div>
            <div className="stat-box">
              <span className="section-label">Status</span>
              <p className="font-mono text-xs mt-1">
                {gameOver ? (winner ? `${winner}_WINS` : "DRAW") : thinking ? "AI_THINKING" : "YOUR_TURN"}
              </p>
            </div>
          </div>

          <div className="stat-box">
            <span className="section-label">Complexity</span>
            <div className="flex justify-between mt-2 font-mono text-sm">
              <span>Time: O(b^m)</span>
              <span>Space: O(bm)</span>
            </div>
          </div>

          <button onClick={reset} className="control-btn-secondary flex items-center justify-center gap-2">
            <RotateCcw className="w-4 h-4" /> Reset Game
          </button>

          <div>
            <span className="section-label">Pseudocode</span>
            <pre className="code-block mt-2 text-muted-foreground whitespace-pre-wrap">{`minimax(board, isMax, α, β):
  if terminal(board): return score
  if isMax:
    best ← -∞
    for each move:
      best ← max(best, minimax(...))
      α ← max(α, best)
      if β ≤ α: break
    return best
  else:
    best ← +∞
    for each move:
      best ← min(best, minimax(...))
      β ← min(β, best)
      if β ≤ α: break
    return best`}</pre>
          </div>

          <div>
            <span className="section-label">Info</span>
            <div className="mt-2 text-xs text-muted-foreground space-y-1">
              <p>• You play as X, AI plays as O</p>
              <p>• AI uses Minimax with α-β pruning</p>
              <p>• The AI is unbeatable — best you can do is draw</p>
            </div>
          </div>
        </aside>

        <section className="relative flex items-center justify-center p-8">
          <div className="flex flex-col items-center gap-8">
            {/* Board */}
            <div className="grid grid-cols-3 gap-2">
              {board.map((cell, i) => (
                <motion.button
                  key={i}
                  whileTap={!cell && !gameOver ? { scale: 0.95 } : {}}
                  onClick={() => handleClick(i)}
                  className={`w-24 h-24 rounded-md border border-border flex items-center justify-center text-3xl font-bold font-mono transition-colors ${
                    cell ? "bg-card" : "bg-secondary/30 hover:bg-secondary/60 cursor-pointer"
                  }`}
                >
                  {cell && (
                    <motion.span
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className={cell === "X" ? "text-primary" : "text-node-goal"}
                    >
                      {cell}
                    </motion.span>
                  )}
                </motion.button>
              ))}
            </div>

            {/* Game Over Dialog */}
            <AnimatePresence>
              {gameOver && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm"
                >
                  <div className="bg-card border border-border rounded-lg p-8 text-center space-y-4 shadow-2xl">
                    <h2 className="text-2xl font-bold">
                      {winner ? `${winner === "X" ? "You" : "AI"} Win${winner === "O" ? "s" : ""}!` : "Draw!"}
                    </h2>
                    <p className="text-muted-foreground text-sm font-mono">
                      STATUS: {winner ? `${winner}_VICTORY` : "STALEMATE"}
                    </p>
                    <div className="flex gap-3">
                      <button onClick={reset} className="control-btn-primary px-6">Play Again</button>
                      <Link to="/" className="control-btn-secondary px-6 text-center">Exit</Link>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>
      </div>
    </div>
  );
};

export default TicTacToe;
