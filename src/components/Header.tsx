import React from 'react';
import { Network, Gamepad2, Move, Zap, Shield, Sparkles } from 'lucide-react';
// #madeby chhavi

interface HeaderProps {
  gameMode: 'sandbox' | 'survival';
  setGameMode: (mode: 'sandbox' | 'survival') => void;
  onReset: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  gameMode,
  setGameMode,
  onReset,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-black/90 border-b border-zinc-800 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-700 p-0.5 flex items-center justify-center">
              <Network className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white flex items-center gap-2 tracking-wide font-mono">
                BANK CONTAGION <span className="text-zinc-400 font-extrabold">&amp; GNN</span> LAB
                <span className="px-2 py-0.5 text-[10px] rounded-full bg-zinc-900 text-zinc-300 border border-zinc-700 font-mono">
                  360° DRAGGABLE
                </span>
              </h1>
              <p className="text-[11px] text-zinc-400 hidden sm:block font-mono">
                Eisenberg-Noe Math Solver &amp; Graph Convolutional Neural Network
              </p>
            </div>
          </div>

          {/* Gamified Mode Selectors */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setGameMode('sandbox')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border font-mono ${
                gameMode === 'sandbox'
                  ? 'bg-white text-black border-white shadow-sm'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border-zinc-800'
              }`}
            >
              <Move className="w-3.5 h-3.5" />
              <span>360° Drag Sandbox</span>
            </button>

            <button
              onClick={() => setGameMode('survival')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border font-mono ${
                gameMode === 'survival'
                  ? 'bg-white text-black border-white shadow-sm'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border-zinc-800'
              }`}
            >
              <Gamepad2 className="w-3.5 h-3.5" />
              <span>Contagion Game</span>
            </button>

            <button
              onClick={onReset}
              className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 rounded-xl text-xs font-mono font-semibold transition-all"
            >
              Reset Network
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

