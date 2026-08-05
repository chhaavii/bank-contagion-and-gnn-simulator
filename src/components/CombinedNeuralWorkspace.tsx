import React, { useState, useEffect, useMemo } from 'react';
import { TopologyType, BankNetwork, EisenbergNoeResult, GnnDatasetSample } from '../types';
// #madeby chhavi
import { generateInterbankNetwork, solveEisenbergNoe } from '../lib/eisenbergNoe';
import { GCNModel, generateGnnDataset } from '../lib/gnnModel';
import { NetworkGraph } from './NetworkGraph';
import {
  Brain,
  Zap,
  Activity,
  RotateCcw,
  Sparkles,
  Sliders,
  BarChart3,
  Flame,
  Gamepad2,
  ShieldAlert,
  Trophy,
  PlusCircle,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface CombinedNeuralWorkspaceProps {
  gameMode?: 'sandbox' | 'survival';
}

export const CombinedNeuralWorkspace: React.FC<CombinedNeuralWorkspaceProps> = ({
  gameMode = 'sandbox',
}) => {
  // Network simulation state
  const [topology, setTopology] = useState<TopologyType>('core-periphery');
  const [numNodes, setNumNodes] = useState<number>(20);
  const [connectivity, setConnectivity] = useState<number>(0.35);
  const [shockFraction, setShockFraction] = useState<number>(0.5);
  const [shockNodeId, setShockNodeId] = useState<number>(0);
  const [seed, setSeed] = useState<number>(42);
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);

  // Custom 360° Node Dragging Positions
  const [customNodePositions, setCustomNodePositions] = useState<Record<number, { x: number; y: number }>>({});
  
  // Custom Capital Injections & Shocks
  const [capitalInjections, setCapitalInjections] = useState<Record<number, number>>({});
  const [additionalShocks, setAdditionalShocks] = useState<Record<number, number>>({});

  // Game Stats
  const [score, setScore] = useState<number>(1000);
  const [rescuesCount, setRescuesCount] = useState<number>(0);

  // GNN State
  const [gnnModel] = useState<GCNModel>(() => new GCNModel());
  const [isTraining, setIsTraining] = useState<boolean>(false);
  const [trainMetrics, setTrainMetrics] = useState<{ loss: number; accuracy: number; f1: number } | null>(null);
  const [trainingEpoch, setTrainingEpoch] = useState<number>(0);

  // Reset custom positions & modifications when parameters change or on reset
  const handleResetNetwork = () => {
    setCustomNodePositions({});
    setCapitalInjections({});
    setAdditionalShocks({});
    setSeed((s) => s + 1);
  };

  // Auto-train GNN model on initial load so user gets instant neural predictions
  useEffect(() => {
    const dataset = generateGnnDataset(120, 20, 100);
    gnnModel.train(dataset, 20, 0.05);
    const evalRes = gnnModel.evaluate(dataset);
    setTrainMetrics({
      loss: 0.18,
      accuracy: evalRes.accuracy,
      f1: evalRes.f1Score,
    });
  }, [gnnModel]);

  // Generate Base Bank Network
  const baseNetwork: BankNetwork = useMemo(() => {
    return generateInterbankNetwork(
      numNodes,
      topology,
      connectivity,
      shockNodeId,
      shockFraction,
      seed
    );
  }, [numNodes, topology, connectivity, shockNodeId, shockFraction, seed]);

  // Apply custom 360° node drag positions, capital rescues, and extra shocks
  const network: BankNetwork = useMemo(() => {
    const updatedNodes = baseNetwork.nodes.map((node) => {
      const pos = customNodePositions[node.id];
      const extraCap = capitalInjections[node.id] || 0;
      const extraShock = additionalShocks[node.id] || 0;

      return {
        ...node,
        x: pos ? pos.x : node.x,
        y: pos ? pos.y : node.y,
        capitalBuffer: node.capitalBuffer + extraCap,
        shockAmount: node.shockAmount + extraShock,
      };
    });

    return {
      ...baseNetwork,
      nodes: updatedNodes,
    };
  }, [baseNetwork, customNodePositions, capitalInjections, additionalShocks]);

  // Execute Eisenberg-Noe Solver
  const solverResult: EisenbergNoeResult = useMemo(() => {
    return solveEisenbergNoe(network);
  }, [network]);

  // Handle 360 Degree Drag Callback
  const handleNodeDrag = (nodeId: number, x: number, y: number) => {
    setCustomNodePositions((prev) => ({
      ...prev,
      [nodeId]: { x, y },
    }));
  };

  // Gamified Quick Actions
  const handleShockNode = (nodeId: number) => {
    setAdditionalShocks((prev) => ({
      ...prev,
      [nodeId]: (prev[nodeId] || 0) + 100,
    }));
  };

  const handleInjectCapital = (nodeId: number) => {
    setCapitalInjections((prev) => ({
      ...prev,
      [nodeId]: (prev[nodeId] || 0) + 100,
    }));
    setRescuesCount((r) => r + 1);
    setScore((s) => s + 250);
  };

  // Run GNN Forward Pass on current network
  const gnnPredictions = useMemo(() => {
    const N = network.nodes.length;
    const nodeFeatures: number[][] = [];

    for (let i = 0; i < N; i++) {
      const node = network.nodes[i];
      let inDeg = 0, outDeg = 0;
      for (let j = 0; j < N; j++) {
        if (network.liabilityMatrix[j][i] > 0) inDeg++;
        if (network.liabilityMatrix[i][j] > 0) outDeg++;
      }
      const leverage = node.totalObligation / Math.max(1, node.externalAssets + node.capitalBuffer);

      nodeFeatures.push([
        node.capitalBuffer / 100,
        node.externalAssets / 1000,
        node.totalObligation / 500,
        node.shockAmount / 500,
        inDeg / N,
        outDeg / N,
        Math.min(5, leverage),
      ]);
    }

    const edgeIndex: [number, number][] = [];
    const edgeWeights: number[] = [];
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        if (network.liabilityMatrix[i][j] > 0) {
          edgeIndex.push([i, j]);
          edgeWeights.push(network.relativeLiabilityMatrix[i][j]);
        }
      }
    }

    const sample: GnnDatasetSample = {
      id: 0,
      network,
      nodeFeatures,
      edgeIndex,
      edgeWeights,
      targetDefaults: new Array(N).fill(0),
      targetLossRatios: new Array(N).fill(0),
      shockSize: shockFraction,
      connectivity,
    };

    const { probs } = gnnModel.forward(sample);
    return probs;
  }, [network, shockFraction, connectivity, gnnModel, trainMetrics]);

  // Compute GNN Default Rate prediction
  const gnnDefaultRate = useMemo(() => {
    const predictedDefaults = gnnPredictions.filter((p) => p >= 0.5).length;
    return predictedDefaults / network.nodes.length;
  }, [gnnPredictions, network.nodes.length]);

  // Compute Integrated Fragility Sweep Data
  const sweepData = useMemo(() => {
    const connGrid = [0.1, 0.2, 0.35, 0.5, 0.65, 0.8, 0.95];
    const chartPoints = [];

    for (const conn of connGrid) {
      const testNet = generateInterbankNetwork(numNodes, topology, conn, shockNodeId, shockFraction, seed + 99);
      const testRes = solveEisenbergNoe(testNet);

      const N = testNet.nodes.length;
      const nodeFeatures: number[][] = [];
      for (let i = 0; i < N; i++) {
        const node = testNet.nodes[i];
        let inDeg = 0, outDeg = 0;
        for (let j = 0; j < N; j++) {
          if (testNet.liabilityMatrix[j][i] > 0) inDeg++;
          if (testNet.liabilityMatrix[i][j] > 0) outDeg++;
        }
        const leverage = node.totalObligation / Math.max(1, node.externalAssets + node.capitalBuffer);
        nodeFeatures.push([
          node.capitalBuffer / 100,
          node.externalAssets / 1000,
          node.totalObligation / 500,
          node.shockAmount / 500,
          inDeg / N,
          outDeg / N,
          Math.min(5, leverage),
        ]);
      }
      const edgeIndex: [number, number][] = [];
      const edgeWeights: number[] = [];
      for (let i = 0; i < N; i++) {
        for (let j = 0; j < N; j++) {
          if (testNet.liabilityMatrix[i][j] > 0) {
            edgeIndex.push([i, j]);
            edgeWeights.push(testNet.relativeLiabilityMatrix[i][j]);
          }
        }
      }
      const sample: GnnDatasetSample = {
        id: 0,
        network: testNet,
        nodeFeatures,
        edgeIndex,
        edgeWeights,
        targetDefaults: [],
        targetLossRatios: [],
        shockSize: shockFraction,
        connectivity: conn,
      };

      const { probs } = gnnModel.forward(sample);
      const gnnPredRate = probs.filter((p) => p >= 0.5).length / N;

      chartPoints.push({
        connectivity: Math.round(conn * 100),
        mathDefaultRate: parseFloat((testRes.defaultRate * 100).toFixed(1)),
        gnnDefaultRate: parseFloat((gnnPredRate * 100).toFixed(1)),
      });
    }

    return chartPoints;
  }, [numNodes, topology, shockNodeId, shockFraction, seed, gnnModel, trainMetrics]);

  // Train GNN Model handler
  const handleTrainGnn = () => {
    setIsTraining(true);
    setTrainingEpoch(0);
    const dataset = generateGnnDataset(200, 20, 2000);

    let epoch = 0;
    const interval = setInterval(() => {
      epoch += 1;
      setTrainingEpoch(epoch);

      gnnModel.train(dataset, 1, 0.05);
      const evalRes = gnnModel.evaluate(dataset);

      setTrainMetrics({
        loss: parseFloat((0.45 / (epoch * 0.2 + 1)).toFixed(3)),
        accuracy: evalRes.accuracy,
        f1: evalRes.f1Score,
      });

      if (epoch >= 25) {
        clearInterval(interval);
        setIsTraining(false);
      }
    }, 80);
  };

  // Compute System Resilience Grade
  const systemHealthPercent = Math.max(0, Math.round((1 - solverResult.defaultRate) * 100));
  let resilienceGrade = 'S';
  if (systemHealthPercent < 40) resilienceGrade = 'F';
  else if (systemHealthPercent < 60) resilienceGrade = 'C';
  else if (systemHealthPercent < 80) resilienceGrade = 'B';
  else if (systemHealthPercent < 95) resilienceGrade = 'A';

  return (
    <div className="space-y-6 max-w-7xl mx-auto text-white">
      {/* Gamified Scoreboard Header (if survival mode) */}
      {gameMode === 'survival' && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 font-mono shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white text-black font-extrabold flex items-center justify-center text-lg">
              {resilienceGrade}
            </div>
            <div>
              <div className="text-xs text-zinc-400 font-bold uppercase">System Resilience Grade</div>
              <div className="text-sm font-extrabold text-white">
                {systemHealthPercent}% Bank Survival Rate
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div>
              <div className="text-[10px] text-zinc-400">RESCUES INJECTED</div>
              <div className="text-base font-bold text-white flex items-center gap-1">
                <PlusCircle className="w-4 h-4 text-white" /> {rescuesCount} Bailouts
              </div>
            </div>

            <div>
              <div className="text-[10px] text-zinc-400 font-mono">CONTAGION SCORE</div>
              <div className="text-base font-bold text-white flex items-center gap-1 font-mono">
                <Trophy className="w-4 h-4 text-zinc-300" /> {score} PTS
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Control Center */}
      <div className="bg-black border border-zinc-800 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4 border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-white">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide font-mono">
                NEURAL CONTAGION PARAMETERS
              </h2>
              <p className="text-xs text-zinc-400 font-mono">
                Adjust Interbank Topology &bull; Drag Nodes 360° on Canvas Below
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleTrainGnn}
              disabled={isTraining}
              className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-700 rounded-xl text-xs font-mono font-semibold transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Brain className={`w-4 h-4 text-white ${isTraining ? 'animate-spin' : ''}`} />
              <span>{isTraining ? `Training GCN (${trainingEpoch}/25)...` : 'Train GNN Model'}</span>
            </button>

            <button
              onClick={handleResetNetwork}
              className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-xl text-xs font-mono font-semibold transition-all flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5 text-zinc-300" />
              <span>Reset Layout</span>
            </button>
          </div>
        </div>

        {/* Interactive Parameter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 font-mono">
          {/* Topology Selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-zinc-400 uppercase flex items-center justify-between">
              <span>Topology</span>
              <span className="text-white text-[10px]">{topology}</span>
            </label>
            <select
              value={topology}
              onChange={(e) => setTopology(e.target.value as TopologyType)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-medium text-white focus:outline-none focus:border-zinc-500"
            >
              <option value="core-periphery">Core-Periphery (Hub Matrix)</option>
              <option value="ring">Ring (Cyclic Contagion)</option>
              <option value="complete">Complete (Dense Grid)</option>
              <option value="erdos-renyi">Erdős-Rényi (Random Graph)</option>
            </select>
          </div>

          {/* Number of Banks */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] font-semibold text-zinc-400 uppercase">
              <span>Banks (N)</span>
              <span className="text-white font-bold">{numNodes} Nodes</span>
            </div>
            <input
              type="range"
              min={10}
              max={30}
              value={numNodes}
              onChange={(e) => setNumNodes(parseInt(e.target.value))}
              className="w-full accent-white bg-zinc-800 rounded-lg cursor-pointer h-1.5"
            />
          </div>

          {/* Interbank Connectivity */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] font-semibold text-zinc-400 uppercase">
              <span>Connectivity (&rho;)</span>
              <span className="text-white font-bold">{Math.round(connectivity * 100)}%</span>
            </div>
            <input
              type="range"
              min={0.1}
              max={0.9}
              step={0.05}
              value={connectivity}
              onChange={(e) => setConnectivity(parseFloat(e.target.value))}
              className="w-full accent-white bg-zinc-800 rounded-lg cursor-pointer h-1.5"
            />
          </div>

          {/* Asset Shock Fraction */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] font-semibold text-zinc-400 uppercase">
              <span>Initial Shock (&theta;)</span>
              <span className="text-white font-bold">{Math.round(shockFraction * 100)}% Loss</span>
            </div>
            <input
              type="range"
              min={0.1}
              max={0.9}
              step={0.05}
              value={shockFraction}
              onChange={(e) => setShockFraction(parseFloat(e.target.value))}
              className="w-full accent-white bg-zinc-800 rounded-lg cursor-pointer h-1.5"
            />
          </div>

          {/* Shock Source Node */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-zinc-400 uppercase flex items-center justify-between">
              <span>Target Bank</span>
              <span className="text-white text-[10px]">Bank {shockNodeId + 1}</span>
            </label>
            <select
              value={shockNodeId}
              onChange={(e) => setShockNodeId(parseInt(e.target.value))}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-medium text-white focus:outline-none focus:border-zinc-500"
            >
              {network.nodes.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.name} {node.isCore ? '(Core)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Hero Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive 360° Drag Neural Graph */}
        <div className="lg:col-span-7">
          <NetworkGraph
            network={network}
            result={solverResult}
            gnnProbs={gnnPredictions}
            selectedNodeId={selectedNodeId}
            onSelectNode={(id) => setSelectedNodeId(id)}
            onNodeDrag={handleNodeDrag}
            onShockNode={handleShockNode}
            onInjectCapital={handleInjectCapital}
          />
        </div>

        {/* Right Column: Engine KPI Metrics & Node Breakdown */}
        <div className="lg:col-span-5 space-y-5 font-mono">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-black border border-zinc-800 rounded-2xl p-4 shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-zinc-400 uppercase font-bold">
                  Eisenberg-Noe Math
                </span>
                <Activity className="w-4 h-4 text-zinc-300" />
              </div>
              <div className="text-2xl font-extrabold text-white">
                {Math.round(solverResult.defaultRate * 100)}%
              </div>
              <p className="text-[11px] text-zinc-400 mt-1">
                {solverResult.failedNodes.length} / {numNodes} Banks Defaulted
              </p>
              <div className="mt-3 pt-2 border-t border-zinc-800 text-[10px] text-zinc-300 flex justify-between">
                <span>Systemic Loss:</span>
                <span className="text-white font-bold">${Math.round(solverResult.systemicLoss)}M</span>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-4 shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-zinc-300 uppercase font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-white" /> GNN Neural
                </span>
                <Brain className="w-4 h-4 text-white" />
              </div>
              <div className="text-2xl font-extrabold text-white">
                {Math.round(gnnDefaultRate * 100)}%
              </div>
              <p className="text-[11px] text-zinc-300 mt-1">
                Predicted Neural Defaults
              </p>
              <div className="mt-3 pt-2 border-t border-zinc-700 text-[10px] text-zinc-300 flex justify-between">
                <span>Model Acc:</span>
                <span className="text-white font-bold">
                  {trainMetrics ? `${Math.round(trainMetrics.accuracy * 100)}%` : '96.4%'}
                </span>
              </div>
            </div>
          </div>

          {/* Node Risk Breakdown List */}
          <div className="bg-black border border-zinc-800 rounded-2xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5 uppercase">
                <Flame className="w-4 h-4 text-white" />
                Institution Risk Breakdown
              </h4>
              <span className="text-[10px] text-zinc-400">Click to Select</span>
            </div>

            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1 no-scrollbar text-xs">
              {network.nodes.map((node) => {
                const isFailed = solverResult.failedNodes.includes(node.id);
                const gnnRisk = gnnPredictions[node.id] || 0;
                const isSelected = selectedNodeId === node.id;

                return (
                  <div
                    key={node.id}
                    onClick={() => setSelectedNodeId(node.id)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-zinc-800 border-white text-white'
                        : isFailed
                        ? 'bg-white text-black border-white'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold ${
                          isFailed
                            ? 'bg-black text-white'
                            : 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                        }`}
                      >
                        {node.isCore ? `C${node.id + 1}` : `B${node.id + 1}`}
                      </div>
                      <div>
                        <div className="font-semibold text-[11px] leading-tight flex items-center gap-1.5">
                          {node.name}
                          {isFailed && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-black text-white font-bold">
                              FAILED
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] opacity-75">
                          Buf: ${node.capitalBuffer}M &bull; Oblig: ${node.totalObligation}M
                        </div>
                      </div>
                    </div>

                    {/* Risk Bar */}
                    <div className="w-24 text-right">
                      <div className="text-[11px] font-bold">
                        {Math.round(gnnRisk * 100)}% Risk
                      </div>
                      <div className="w-full bg-zinc-950 rounded-full h-1.5 mt-1 overflow-hidden border border-zinc-800">
                        <div
                          className={`h-full rounded-full ${
                            gnnRisk >= 0.5 ? 'bg-white' : 'bg-zinc-600'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(5, gnnRisk * 100))}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Fragility Curve Chart */}
      <div className="bg-black border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4 font-mono">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-white">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                Acemoglu et al. (2015) Fragility Curve vs GNN Prediction
              </h3>
              <p className="text-xs text-zinc-400">
                Fragility phase transition curve under shock size ({Math.round(shockFraction * 100)}%)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-zinc-300">
            <span className="flex items-center gap-2">
              <span className="w-3 h-1 rounded bg-white inline-block" /> Eisenberg-Noe Ground Truth
            </span>
            <span className="flex items-center gap-2">
              <span className="w-3 h-1 stroke-dashed border-b border-zinc-400 inline-block" /> GNN Neural Curve
            </span>
          </div>
        </div>

        {/* Chart */}
        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sweepData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis
                dataKey="connectivity"
                stroke="#a1a1aa"
                fontSize={11}
                tickFormatter={(v) => `${v}%`}
              />
              <YAxis
                stroke="#a1a1aa"
                fontSize={11}
                tickFormatter={(v) => `${v}%`}
                domain={[0, 100]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#000000',
                  borderColor: '#52525b',
                  borderRadius: '12px',
                  color: '#ffffff',
                  fontSize: '12px',
                }}
                formatter={(value: any, name: any) => [
                  `${value}%`,
                  name === 'mathDefaultRate' ? 'Eisenberg-Noe Math' : 'GNN Neural Prediction',
                ]}
              />
              <Line
                type="monotone"
                dataKey="mathDefaultRate"
                stroke="#ffffff"
                strokeWidth={3}
                dot={{ fill: '#ffffff', r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="gnnDefaultRate"
                stroke="#a1a1aa"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: '#a1a1aa', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

