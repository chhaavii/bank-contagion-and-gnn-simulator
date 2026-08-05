// #madeby chhavi
export type TopologyType = 'ring' | 'complete' | 'core-periphery' | 'erdos-renyi';

export interface BankNode {
  id: number;
  name: string;
  externalAssets: number; // e_i
  capitalBuffer: number;  // c_i
  totalObligation: number; // p_i
  shockAmount: number;     // theta_i
  isCore?: boolean;
  x?: number;
  y?: number;
}

export interface InterbankEdge {
  source: number; // borrower i
  target: number; // lender j
  liability: number; // L_ij
}

export interface BankNetwork {
  nodes: BankNode[];
  edges: InterbankEdge[];
  liabilityMatrix: number[][]; // N x N
  relativeLiabilityMatrix: number[][]; // Pi_ij = L_ij / p_i
  topology: TopologyType;
}

export interface SolverStep {
  step: number;
  pVector: number[];
  equityVector: number[];
  failedNodes: number[];
  maxDiff: number;
}

export interface EisenbergNoeResult {
  clearingVector: number[]; // p*
  equityVector: number[];   // E*
  failedNodes: number[];    // indices of banks where p*_i < p_i
  defaultRate: number;      // fraction of banks failed
  systemicLoss: number;     // aggregate shortfall sum(p_i - p*_i)
  totalCapital: number;
  iterations: number;
  steps: SolverStep[];
  converged: boolean;
}

export interface SweepPoint {
  shockSize: number;       // e.g., 0.0 to 1.0
  connectivity: number;    // e.g., edge density or average degree
  defaultRate: number;     // Ground truth default rate
  gnnDefaultRate?: number; // GNN predicted default rate
  systemicLoss: number;
}

export interface TopologySweepResult {
  topology: TopologyType;
  shockSizes: number[];
  connectivities: number[];
  matrix: number[][]; // [shockIdx][connIdx] -> defaultRate
  gnnMatrix?: number[][];
  curves: {
    shockSize: number;
    points: { connectivity: number; defaultRate: number; gnnDefaultRate?: number }[];
  }[];
}

export interface GnnDatasetSample {
  id: number;
  network: BankNetwork;
  nodeFeatures: number[][]; // [N x D]
  edgeIndex: [number, number][]; // Edge pairs
  edgeWeights: number[];
  targetDefaults: number[]; // 0 or 1 for each node
  targetLossRatios: number[]; // continuous [0, 1]
  shockSize: number;
  connectivity: number;
}

export interface GnnTrainMetrics {
  epoch: number;
  loss: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
}

export interface GnnEvaluationResult {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  aucRoc: number;
  confusionMatrix: {
    tp: number;
    fp: number;
    fn: number;
    tn: number;
  };
  samplePredictions: {
    nodeId: number;
    trueStatus: number;
    predProb: number;
    predStatus: number;
    bankName: string;
    capitalBuffer: number;
  }[];
}

export interface JupyterCell {
  cell_type: 'markdown' | 'code';
  metadata: Record<string, any>;
  source: string[];
  execution_count?: number | null;
  outputs?: any[];
}

export interface JupyterNotebook {
  cells: JupyterCell[];
  metadata: {
    kernelspec: {
      display_name: string;
      language: string;
      name: string;
    };
    language_info: {
      name: string;
      version: string;
    };
  };
  nbformat: number;
  nbformat_minor: number;
}
