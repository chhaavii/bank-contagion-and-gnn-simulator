"""
Eisenberg-Noe Interbank Network Simulator & Graph Neural Network Risk Predictor
Standalone Python Script
"""
# #madeby chhavi

import numpy as np
import matplotlib.pyplot as plt

def generate_interbank_network(num_nodes=20, topology="core-periphery", connectivity=0.3, shock_node=0, shock_fraction=0.5, seed=42):
    np.random.seed(seed)
    num_core = max(3, int(num_nodes * 0.25))
    external_assets = np.random.uniform(200, 400, size=num_nodes)
    capital_buffers = np.random.uniform(20, 40, size=num_nodes)
    if topology == "core-periphery":
        external_assets[:num_core] *= 3.0
        capital_buffers[:num_core] *= 3.0
        
    shocks = np.zeros(num_nodes)
    shocks[shock_node] = external_assets[shock_node] * shock_fraction
    L = np.zeros((num_nodes, num_nodes))
    
    if topology == "ring":
        for i in range(num_nodes):
            L[i, (i + 1) % num_nodes] = np.random.uniform(50, 100)
    elif topology == "complete":
        scale = max(0.1, connectivity)
        for i in range(num_nodes):
            for j in range(num_nodes):
                if i != j: L[i, j] = np.random.uniform(20, 50) * scale
    elif topology == "core-periphery":
        for i in range(num_core):
            for j in range(num_core):
                if i != j and np.random.rand() < min(0.9, connectivity * 2.5):
                    L[i, j] = np.random.uniform(100, 200)
        for i in range(num_core, num_nodes):
            tc = i % num_core
            L[i, tc] = np.random.uniform(30, 70)
            L[tc, i] = np.random.uniform(30, 70)
            
    p = L.sum(axis=1)
    Pi = np.zeros_like(L)
    for i in range(num_nodes):
        if p[i] > 0: Pi[i, :] = L[i, :] / p[i]
            
    return L, Pi, p, external_assets, capital_buffers, shocks

def solve_eisenberg_noe(L, Pi, p, external_assets, capital_buffers, shocks, max_iter=100, tol=1e-5):
    e_prime = np.maximum(0, external_assets + capital_buffers - shocks)
    p_curr = p.copy()
    
    for it in range(max_iter):
        inflow = Pi.T @ p_curr
        p_next = np.minimum(p, np.maximum(0, e_prime + inflow))
        if np.max(np.abs(p_next - p_curr)) < tol:
            break
        p_curr = p_next.copy()
        
    p_star = p_curr
    failed = np.where(p_star < p - 1e-4)[0]
    return p_star, len(failed) / len(p), np.sum(p - p_star)

if __name__ == "__main__":
    print("Running Eisenberg-Noe Interbank Contagion Simulator...")
    L, Pi, p, e, c, s = generate_interbank_network(num_nodes=20, topology="core-periphery", shock_fraction=0.6)
    p_star, def_rate, loss = solve_eisenberg_noe(L, Pi, p, e, c, s)
    print(f"Simulation Complete!")
    print(f"Default Rate: {def_rate*100:.1f}%")
    print(f"Systemic Shortfall/Loss: ${loss:,.2f}")
