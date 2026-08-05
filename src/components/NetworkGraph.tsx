import React, { useState, useRef } from 'react';
import { BankNetwork, EisenbergNoeResult } from '../types';
// #madeby chhavi
import { AlertTriangle, Shield, Zap, Brain, Move, PlusCircle, Flame, RotateCcw } from 'lucide-react';

interface NetworkGraphProps {
  network: BankNetwork;
  result?: EisenbergNoeResult | null;
  gnnProbs?: number[];
  selectedNodeId: number | null;
  onSelectNode: (nodeId: number) => void;
  onNodeDrag?: (nodeId: number, x: number, y: number) => void;
  onShockNode?: (nodeId: number) => void;
  onInjectCapital?: (nodeId: number) => void;
}

export const NetworkGraph: React.FC<NetworkGraphProps> = ({
  network,
  result,
  gnnProbs,
  selectedNodeId,
  onSelectNode,
  onNodeDrag,
  onShockNode,
  onInjectCapital,
}) => {
  const [hoveredNodeId, setHoveredNodeId] = useState<number | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const activeNodeId = selectedNodeId !== null ? selectedNodeId : hoveredNodeId;
  const activeNode = activeNodeId !== null ? network.nodes[activeNodeId] : null;

  // Max liability for scaling line thickness
  let maxLiability = 1;
  network.edges.forEach((e) => {
    if (e.liability > maxLiability) maxLiability = e.liability;
  });

  // 360 Degree Drag Handlers
  const handleMouseDown = (e: React.MouseEvent, nodeId: number) => {
    e.stopPropagation();
    setDraggingNodeId(nodeId);
    onSelectNode(nodeId);
  };

  const handleTouchStart = (e: React.TouchEvent, nodeId: number) => {
    e.stopPropagation();
    setDraggingNodeId(nodeId);
    onSelectNode(nodeId);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingNodeId === null || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = Math.max(25, Math.min(575, ((e.clientX - rect.left) / rect.width) * 600));
    const y = Math.max(25, Math.min(575, ((e.clientY - rect.top) / rect.height) * 600));

    if (onNodeDrag) {
      onNodeDrag(draggingNodeId, x, y);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (draggingNodeId === null || !svgRef.current || e.touches.length === 0) return;
    const touch = e.touches[0];
    const rect = svgRef.current.getBoundingClientRect();
    const x = Math.max(25, Math.min(575, ((touch.clientX - rect.left) / rect.width) * 600));
    const y = Math.max(25, Math.min(575, ((touch.clientY - rect.top) / rect.height) * 600));

    if (onNodeDrag) {
      onNodeDrag(draggingNodeId, x, y);
    }
  };

  const handleMouseUp = () => {
    setDraggingNodeId(null);
  };

  return (
    <div className="relative bg-black border border-zinc-800 rounded-2xl p-5 shadow-2xl flex flex-col items-center overflow-hidden">
      {/* Header Bar */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 mb-4 px-1 z-10">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-700 text-white">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide font-mono flex items-center gap-2">
              NEURAL GRAPH CANVAS
              <span className="px-2 py-0.5 text-[10px] rounded-full bg-zinc-900 border border-zinc-700 font-mono text-zinc-300">
                {network.topology.toUpperCase()}
              </span>
            </h3>
            <p className="text-[11px] text-zinc-400 font-mono flex items-center gap-1.5">
              <Move className="w-3 h-3 text-zinc-400" /> Click &amp; Drag Nodes 360° to Rearrange Channels
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-zinc-300">
          <span className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-800">
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-800 border border-zinc-400" /> Solvent
          </span>
          <span className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-800">
            <span className="w-2.5 h-2.5 rounded-full bg-white text-black font-bold" /> Defaulted
          </span>
          <span className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-800">
            <span className="w-2.5 h-2.5 rounded-full border-2 border-white bg-zinc-900" /> Core Hub
          </span>
        </div>
      </div>

      {/* Interactive Drag SVG Canvas */}
      <svg
        ref={svgRef}
        viewBox="0 0 600 600"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleMouseUp}
        className="w-full max-w-[580px] h-[460px] rounded-xl bg-zinc-950 border border-zinc-800 shadow-inner z-10 cursor-crosshair select-none"
      >
        <defs>
          <marker
            id="arrowhead-white"
            markerWidth="6"
            markerHeight="6"
            refX="18"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 6 3, 0 6" fill="#ffffff" />
          </marker>

          <marker
            id="arrowhead-gray"
            markerWidth="6"
            markerHeight="6"
            refX="18"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 6 3, 0 6" fill="#52525b" />
          </marker>
        </defs>

        {/* Neural Grid Pattern */}
        <pattern id="gridMonochrome" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#27272a" strokeWidth="0.75" />
        </pattern>
        <rect width="600" height="600" fill="url(#gridMonochrome)" />

        {/* Interbank Liability Edges */}
        {network.edges.map((edge, idx) => {
          const srcNode = network.nodes[edge.source];
          const tgtNode = network.nodes[edge.target];
          if (!srcNode || !tgtNode || srcNode.x === undefined || tgtNode.x === undefined)
            return null;

          const isHighlighted =
            activeNodeId !== null &&
            (edge.source === activeNodeId || edge.target === activeNodeId);

          const isSourceFailed = result?.failedNodes.includes(edge.source);
          const opacity = isHighlighted ? 1.0 : activeNodeId !== null ? 0.15 : 0.45;

          const strokeWidth = Math.max(1, Math.min(5, (edge.liability / maxLiability) * 5));
          const strokeColor = isHighlighted
            ? '#ffffff'
            : isSourceFailed
            ? '#e4e4e7'
            : '#52525b';

          return (
            <line
              key={`edge-${idx}`}
              x1={srcNode.x}
              y1={srcNode.y}
              x2={tgtNode.x}
              y2={tgtNode.y}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeOpacity={opacity}
              markerEnd={isHighlighted ? 'url(#arrowhead-white)' : 'url(#arrowhead-gray)'}
            />
          );
        })}

        {/* Bank Nodes */}
        {network.nodes.map((node) => {
          const isFailed = result?.failedNodes.includes(node.id);
          const isShocked = node.shockAmount > 0;
          const isSelected = selectedNodeId === node.id;
          const isHovered = hoveredNodeId === node.id;
          const isDragging = draggingNodeId === node.id;
          const gnnRisk = gnnProbs ? gnnProbs[node.id] : undefined;

          let fillColor = '#18181b'; // Dark zinc
          let strokeColor = '#71717a'; // Mid zinc

          if (isFailed) {
            fillColor = '#ffffff'; // Crisp white for default
            strokeColor = '#ffffff';
          } else if (isShocked) {
            fillColor = '#27272a';
            strokeColor = '#ffffff';
          } else if (node.isCore) {
            fillColor = '#09090b';
            strokeColor = '#ffffff';
          }

          const nodeRadius = node.isCore ? 19 : 14;

          return (
            <g
              key={`node-${node.id}`}
              transform={`translate(${node.x}, ${node.y})`}
              className="cursor-grab active:cursor-grabbing transition-transform duration-75"
              onMouseDown={(e) => handleMouseDown(e, node.id)}
              onTouchStart={(e) => handleTouchStart(e, node.id)}
              onMouseEnter={() => setHoveredNodeId(node.id)}
              onMouseLeave={() => setHoveredNodeId(null)}
            >
              {/* Dragging Outer Halo Ring */}
              {(isDragging || isSelected || isHovered) && (
                <circle
                  r={nodeRadius + 7}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="2"
                  strokeDasharray="4 2"
                  className={isDragging ? 'animate-spin' : ''}
                />
              )}

              {/* Main Node Circle */}
              <circle
                r={nodeRadius}
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth={node.isCore ? 3 : 2}
              />

              {/* Node ID Label */}
              <text
                textAnchor="middle"
                dy="4"
                fill={isFailed ? '#000000' : '#ffffff'}
                fontSize={node.isCore ? '11' : '10'}
                fontWeight="800"
                className="pointer-events-none select-none font-mono"
              >
                {node.isCore ? `C${node.id + 1}` : `B${node.id + 1}`}
              </text>

              {/* GNN Risk Score Badge floating above node */}
              {gnnRisk !== undefined && (
                <g transform="translate(0, -22)">
                  <rect
                    x="-18"
                    y="-10"
                    width="36"
                    height="14"
                    rx="4"
                    fill="#000000"
                    stroke={gnnRisk >= 0.5 ? '#ffffff' : '#52525b'}
                    strokeWidth="1"
                  />
                  <text
                    textAnchor="middle"
                    dy="0"
                    fill={gnnRisk >= 0.5 ? '#ffffff' : '#a1a1aa'}
                    fontSize="9"
                    fontWeight="800"
                    className="pointer-events-none select-none font-mono"
                  >
                    {Math.round(gnnRisk * 100)}%
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {/* Gamified Node Details & Quick Interactive Action Console */}
      {activeNode && (
        <div className="w-full mt-4 p-4 bg-zinc-900 border border-zinc-700 rounded-xl text-xs z-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-xl border font-mono font-bold ${
                  result?.failedNodes.includes(activeNode.id)
                    ? 'bg-white text-black border-white'
                    : 'bg-black text-white border-zinc-700'
                }`}
              >
                {result?.failedNodes.includes(activeNode.id) ? (
                  <AlertTriangle className="w-4 h-4" />
                ) : (
                  <Shield className="w-4 h-4" />
                )}
              </div>
              <div>
                <div className="font-bold text-white text-sm flex items-center gap-2 font-mono">
                  <span>{activeNode.name}</span>
                  {activeNode.isCore && (
                    <span className="px-2 py-0.5 rounded text-[10px] bg-black border border-zinc-700 text-zinc-300 font-mono">
                      CORE HUB
                    </span>
                  )}
                  {result?.failedNodes.includes(activeNode.id) ? (
                    <span className="px-2 py-0.5 rounded text-[10px] bg-white text-black font-bold font-mono">
                      DEFAULTED
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-300 border border-zinc-700 font-mono">
                      SOLVENT
                    </span>
                  )}
                </div>
                <div className="text-zinc-400 mt-1 flex flex-wrap gap-4 font-mono text-[11px]">
                  <span>Assets: ${activeNode.externalAssets}M</span>
                  <span>Capital: ${activeNode.capitalBuffer}M</span>
                  <span>Obligations: ${activeNode.totalObligation}M</span>
                  {activeNode.shockAmount > 0 && (
                    <span className="text-white font-bold underline">
                      Shock Loss: -${activeNode.shockAmount}M
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Interactive Game Buttons for Selected Node */}
            <div className="flex items-center gap-2">
              {onShockNode && (
                <button
                  onClick={() => onShockNode(activeNode.id)}
                  className="px-3 py-1.5 bg-black hover:bg-zinc-800 text-white border border-zinc-700 rounded-lg font-mono text-[11px] font-bold flex items-center gap-1.5 transition-all"
                >
                  <Zap className="w-3.5 h-3.5 text-white" />
                  <span>Shock Node</span>
                </button>
              )}

              {onInjectCapital && (
                <button
                  onClick={() => onInjectCapital(activeNode.id)}
                  className="px-3 py-1.5 bg-white hover:bg-zinc-200 text-black rounded-lg font-mono text-[11px] font-bold flex items-center gap-1.5 transition-all shadow"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-black" />
                  <span>Inject +$100M Capital</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

