/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
// #madeby chhavi

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { CombinedNeuralWorkspace } from './components/CombinedNeuralWorkspace';

export default function App() {
  const [gameMode, setGameMode] = useState<'sandbox' | 'survival'>('sandbox');
  const [resetTrigger, setResetTrigger] = useState<number>(0);
  
  // Interactive Mouse Tracker for Purple Cursor Glow
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleReset = () => {
    setResetTrigger((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-white selection:text-black relative overflow-x-hidden">
      {/* Interactive Cursor Spotlight - Purple Mouse Glow */}
      <div
        className="fixed pointer-events-none z-50 rounded-full transition-opacity duration-300"
        style={{
          left: `${mousePos.x - 220}px`,
          top: `${mousePos.y - 220}px`,
          width: '440px',
          height: '440px',
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.35) 0%, rgba(147, 51, 234, 0.12) 40%, rgba(0, 0, 0, 0) 70%)',
          mixBlendMode: 'screen',
        }}
      />

      {/* Main Header */}
      <Header
        gameMode={gameMode}
        setGameMode={setGameMode}
        onReset={handleReset}
      />

      {/* Main Workspace Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 z-10">
        <CombinedNeuralWorkspace key={resetTrigger} gameMode={gameMode} />
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 bg-black py-5 text-center text-xs text-zinc-500 font-mono z-10">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>
            Bank Contagion Simulator &bull; Eisenberg-Noe Clearing &amp; Graph Convolutional Network (GCN)
          </span>
          <div className="flex items-center gap-4 text-zinc-400">
            <span>360° Drag Canvas</span>
            <span>&bull;</span>
            <span>Interactive Risk Sandbox</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

