import { BankNetwork, BankNode, InterbankEdge, EisenbergNoeResult, SolverStep, TopologyType } from '../types';
// #madeby chhavi

/**
 * Generate synthetic interbank networks
 * liability matrices and capital buffers, under specified topology.
 */
export function generateInterbankNetwork(
  numNodes: number = 20,
  topology: TopologyType = 'core-periphery',
  connectivity: number = 0.3,
  shockNodeId: number = 0,
  shockFraction: number = 0.5,
  seed: number = 42
): BankNetwork {
  const pseudoRandom = (s: number) => {
    let x = Math.sin(s++) * 10000;
    return x - Math.floor(x);
  };
  let curSeed = seed;
  const rand = () => {
    curSeed += 1;
    return pseudoRandom(curSeed);
  };

  const nodes: BankNode[] = [];
  const edges: InterbankEdge[] = [];
  const liabilityMatrix: number[][] = Array.from({ length: numNodes }, () =>
    Array(numNodes).fill(0)
  );

  const numCore = Math.max(3, Math.floor(numNodes * 0.25));

  for (let i = 0; i < numNodes; i++) {
    const isCore = topology === 'core-periphery' ? i < numCore : false;
    const baseAssets = isCore ? 800 + rand() * 400 : 200 + rand() * 200;
    const capitalBuffer = isCore ? 80 + rand() * 40 : 20 + rand() * 20;

    nodes.push({
      id: i,
      name: isCore ? `Core Bank C${i + 1}` : `Bank B${i + 1}`,
      externalAssets: Math.round(baseAssets),
      capitalBuffer: Math.round(capitalBuffer),
      totalObligation: 0,
      shockAmount: i === shockNodeId ? Math.round(baseAssets * shockFraction) : 0,
      isCore,
    });
  }

  // Construct liabilities based on topology
  if (topology === 'ring') {
    // Ring topology: Bank i owes Bank (i+1)%N
    const step = Math.max(1, Math.round(1 / Math.max(0.05, connectivity)));
    for (let i = 0; i < numNodes; i++) {
      const target = (i + 1) % numNodes;
      const amount = 50 + rand() * 50;
      liabilityMatrix[i][target] = Math.round(amount);

      if (step > 1 && connectivity > 0.4) {
        const target2 = (i + 2) % numNodes;
        liabilityMatrix[i][target2] = Math.round(amount * 0.5);
      }
    }
  } else if (topology === 'complete') {
    // Complete topology: every bank owes every other bank
    const scale = Math.max(0.1, connectivity);
    for (let i = 0; i < numNodes; i++) {
      for (let j = 0; j < numNodes; j++) {
        if (i !== j) {
          const amount = (20 + rand() * 30) * scale;
          liabilityMatrix[i][j] = Math.round(amount);
        }
      }
    }
  } else if (topology === 'core-periphery') {
    // Core-Periphery topology
    // Core banks are densely connected with each other
    for (let i = 0; i < numCore; i++) {
      for (let j = 0; j < numCore; j++) {
        if (i !== j && rand() < Math.min(0.9, connectivity * 2.5)) {
          liabilityMatrix[i][j] = Math.round(100 + rand() * 100);
        }
      }
    }
    // Periphery nodes connect primarily to core nodes
    for (let i = numCore; i < numNodes; i++) {
      // Connect to 1-3 core nodes
      const numConn = Math.max(1, Math.floor(numCore * Math.max(0.2, connectivity)));
      for (let c = 0; c < numConn; c++) {
        const targetCore = (i + c) % numCore;
        if (rand() < 0.8) {
          // Periphery owes Core
          liabilityMatrix[i][targetCore] = Math.round(30 + rand() * 40);
        }
        if (rand() < 0.8) {
          // Core owes Periphery
          liabilityMatrix[targetCore][i] = Math.round(30 + rand() * 40);
        }
      }
    }
  } else if (topology === 'erdos-renyi') {
    // Erdős-Rényi random directed graph
    const prob = Math.min(0.9, Math.max(0.05, connectivity));
    for (let i = 0; i < numNodes; i++) {
      for (let j = 0; j < numNodes; j++) {
        if (i !== j && rand() < prob) {
          liabilityMatrix[i][j] = Math.round(30 + rand() * 70);
        }
      }
    }
  }

  // Compute total obligations and edges list
  for (let i = 0; i < numNodes; i++) {
    let totalObligation = 0;
    for (let j = 0; j < numNodes; j++) {
      totalObligation += liabilityMatrix[i][j];
      if (liabilityMatrix[i][j] > 0) {
        edges.push({
          source: i,
          target: j,
          liability: liabilityMatrix[i][j],
        });
      }
    }
    nodes[i].totalObligation = totalObligation;
  }

  // Compute relative liability matrix Pi_ij = L_ij / p_i
  const relativeLiabilityMatrix: number[][] = Array.from({ length: numNodes }, () =>
    Array(numNodes).fill(0)
  );

  for (let i = 0; i < numNodes; i++) {
    const p_i = nodes[i].totalObligation;
    if (p_i > 0) {
      for (let j = 0; j < numNodes; j++) {
        relativeLiabilityMatrix[i][j] = liabilityMatrix[i][j] / p_i;
      }
    }
  }

  // Assign 2D visual positioning layout for UI rendering
  const radius = 220;
  const centerX = 300;
  const centerY = 300;

  if (topology === 'core-periphery') {
    const coreRadius = 90;
    for (let i = 0; i < numNodes; i++) {
      if (nodes[i].isCore) {
        const angle = (i / numCore) * 2 * Math.PI - Math.PI / 2;
        nodes[i].x = centerX + coreRadius * Math.cos(angle);
        nodes[i].y = centerY + coreRadius * Math.sin(angle);
      } else {
        const pIndex = i - numCore;
        const numP = numNodes - numCore;
        const angle = (pIndex / numP) * 2 * Math.PI - Math.PI / 2;
        nodes[i].x = centerX + radius * Math.cos(angle);
        nodes[i].y = centerY + radius * Math.sin(angle);
      }
    }
  } else {
    for (let i = 0; i < numNodes; i++) {
      const angle = (i / numNodes) * 2 * Math.PI - Math.PI / 2;
      nodes[i].x = centerX + radius * Math.cos(angle);
      nodes[i].y = centerY + radius * Math.sin(angle);
    }
  }

  return {
    nodes,
    edges,
    liabilityMatrix,
    relativeLiabilityMatrix,
    topology,
  };
}

/**
 * Eisenberg-Noe Fixed-Point Clearing Algorithm (1998/2001)
 *
 * Solves: p* = min( p, max( 0, e' + Pi^T * p* ) )
 * where e'_i = max(0, e_i + c_i - shock_i)
 */
export function solveEisenbergNoe(
  network: BankNetwork,
  maxIterations: number = 100,
  tolerance: number = 1e-5
): EisenbergNoeResult {
  const N = network.nodes.length;
  const p = network.nodes.map((n) => n.totalObligation);
  const Pi = network.relativeLiabilityMatrix;

  // Effective initial assets e'_i = max(0, externalAssets + capitalBuffer - shock)
  const ePrime = network.nodes.map((n) =>
    Math.max(0, n.externalAssets + n.capitalBuffer - n.shockAmount)
  );

  // Initial candidate vector p^(0) = p (full payment assumption)
  let pCurrent = [...p];
  const steps: SolverStep[] = [];

  let converged = false;
  let it = 0;

  for (it = 0; it < maxIterations; it++) {
    const pNext = new Array(N).fill(0);

    for (let i = 0; i < N; i++) {
      // Received cash inflow from counterparties: sum_k p_k * Pi_ki
      let incomingCash = 0;
      for (let k = 0; k < N; k++) {
        incomingCash += pCurrent[k] * Pi[k][i];
      }

      // Total available cash for bank i
      const totalAvailable = ePrime[i] + incomingCash;

      // Clearing condition: p*_i = min( p_i, max(0, totalAvailable) )
      pNext[i] = Math.min(p[i], Math.max(0, totalAvailable));
    }

    // Compute max difference for convergence check
    let maxDiff = 0;
    for (let i = 0; i < N; i++) {
      maxDiff = Math.max(maxDiff, Math.abs(pNext[i] - pCurrent[i]));
    }

    // Calculate current equity vector E_i = e'_i + sum_k p_k * Pi_ki - p_i
    const currentEquity = new Array(N).fill(0);
    const currentFailed: number[] = [];

    for (let i = 0; i < N; i++) {
      let incomingCash = 0;
      for (let k = 0; k < N; k++) {
        incomingCash += pNext[k] * Pi[k][i];
      }
      currentEquity[i] = ePrime[i] + incomingCash - p[i];
      if (pNext[i] < p[i] - 1e-4) {
        currentFailed.push(i);
      }
    }

    steps.push({
      step: it,
      pVector: [...pNext],
      equityVector: [...currentEquity],
      failedNodes: currentFailed,
      maxDiff,
    });

    pCurrent = [...pNext];

    if (maxDiff < tolerance) {
      converged = true;
      break;
    }
  }

  const finalClearingVector = pCurrent;
  const finalEquity = new Array(N).fill(0);
  const failedNodes: number[] = [];
  let systemicLoss = 0;
  let totalCapital = 0;

  for (let i = 0; i < N; i++) {
    let incomingCash = 0;
    for (let k = 0; k < N; k++) {
      incomingCash += finalClearingVector[k] * Pi[k][i];
    }
    finalEquity[i] = ePrime[i] + incomingCash - p[i];

    totalCapital += network.nodes[i].capitalBuffer;

    if (finalClearingVector[i] < p[i] - 1e-4) {
      failedNodes.push(i);
      systemicLoss += p[i] - finalClearingVector[i];
    }
  }

  const defaultRate = failedNodes.length / N;

  return {
    clearingVector: finalClearingVector,
    equityVector: finalEquity,
    failedNodes,
    defaultRate,
    systemicLoss,
    totalCapital,
    iterations: it + 1,
    steps,
    converged,
  };
}

/**
 * Perform Acemoglu-Ozdaglar-Tahbaz-Salehi (2015) Connectivity x Shock Size Sweep
 * Demonstrates the "Robust-Yet-Fragile" threshold transition.
 */
export function runAcemogluSweep(
  topology: TopologyType = 'core-periphery',
  numNodes: number = 20,
  shockGrid: number[] = [0.1, 0.25, 0.4, 0.55, 0.7, 0.85],
  connGrid: number[] = [0.1, 0.2, 0.35, 0.5, 0.7, 0.9],
  numMonteCarlo: number = 5
): {
  matrix: number[][]; // [shockIdx][connIdx]
  curves: { shockSize: number; points: { connectivity: number; defaultRate: number }[] }[];
} {
  const matrix: number[][] = Array.from({ length: shockGrid.length }, () =>
    Array(connGrid.length).fill(0)
  );

  const curves: { shockSize: number; points: { connectivity: number; defaultRate: number }[] }[] = [];

  for (let sIdx = 0; sIdx < shockGrid.length; sIdx++) {
    const shockSize = shockGrid[sIdx];
    const curvePoints: { connectivity: number; defaultRate: number }[] = [];

    for (let cIdx = 0; cIdx < connGrid.length; cIdx++) {
      const conn = connGrid[cIdx];
      let totalDefaultRate = 0;

      for (let mc = 0; mc < numMonteCarlo; mc++) {
        const net = generateInterbankNetwork(
          numNodes,
          topology,
          conn,
          0, // Shock Bank 0
          shockSize,
          100 + sIdx * 50 + cIdx * 10 + mc
        );
        const res = solveEisenbergNoe(net);
        totalDefaultRate += res.defaultRate;
      }

      const avgDefaultRate = totalDefaultRate / numMonteCarlo;
      matrix[sIdx][cIdx] = avgDefaultRate;
      curvePoints.push({
        connectivity: conn,
        defaultRate: parseFloat(avgDefaultRate.toFixed(4)),
      });
    }

    curves.push({
      shockSize,
      points: curvePoints,
    });
  }

  return { matrix, curves };
}
