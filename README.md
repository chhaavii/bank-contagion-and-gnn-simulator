# Terminology Guide: Bank Contagion & GNN Simulator

Based on `bank_contagion_gnn.py` in [chhaavii/bank-contagion-and-gnn-simulator](https://github.com/chhaavii/bank-contagion-and-gnn-simulator). Terms are grouped by where they show up in the code, in the order you'd hit them.
Live site : https://bank-contagion-and-gnn-simulator.vercel.app/
---

## 1. The core idea: financial contagion

**Systemic risk** — the risk that one bank's failure triggers a chain reaction across the whole banking system, rather than staying contained to that one bank.

**Contagion** — the actual spreading process: bank A defaults → banks that lent to A take losses → some of those banks default too → their lenders take losses → and so on.

**Interbank network** — banks model the financial system as a graph. Each bank is a **node**; each loan one bank owes another is a directed, weighted **edge**.

---

## 2. Building the network (`generate_interbank_network`)

**Liability matrix (`L`)** — an `N x N` matrix where `L[i, j]` is the amount bank `i` owes bank `j`. This is the raw debt structure of the system.

**Relative liabilities matrix (`Pi`)** — `L` normalized so each row sums to 1. `Pi[i, j]` is the *fraction* of bank `i`'s total obligations owed to bank `j`. This is what actually determines how a loss at one bank splits across its creditors.

**Total obligations (`p`)** — the row sums of `L`; how much each bank owes in total, before any shock.

**External assets** — money/assets a bank holds *outside* the interbank system (e.g., loans to households, cash, securities). This is what actually backs a bank's ability to pay.

**Capital buffer** — a bank's equity cushion — how much it can absorb in losses before its liabilities exceed its assets and it defaults.

**Network topology** — the *shape* of the connections between banks. The script implements three:
- **Ring** — each bank owes only the "next" bank in a circle. Sparse, minimal connectivity.
- **Complete** — every bank owes every other bank. Maximum connectivity.
- **Core-periphery** — a small, densely-connected **core** of large banks, surrounded by a **periphery** of smaller banks that mostly connect only to the core, not to each other. This mirrors real-world banking systems (a few big money-center banks, many smaller regional ones).

**Connectivity** — a parameter (0–1) controlling how densely banks are linked to each other; higher connectivity means more/larger interbank exposures.

**Shock** — the triggering event: one chosen bank (`shock_node`) instantly loses a fraction (`shock_fraction`) of its external assets, simulating something like a bad loan, fraud, or market crash hitting that bank specifically.

---

## 3. Resolving the contagion (`solve_eisenberg_noe`)

**Eisenberg-Noe model** — a classic (2001) mathematical framework for figuring out who *actually* gets paid what, once a shock hits an interconnected network of obligations, accounting for the fact that everyone's ability to pay depends on everyone else paying them first. This is the theoretical backbone of the whole simulator.

**Clearing vector (`p*`)** — the "final answer" of the model: the vector of *actual* payments each bank makes once the contagion has fully played out, as opposed to `p` (what they *owed* originally). Found by iterating until payments stop changing (a fixed-point calculation).

**Fixed-point iteration** — the technique used to solve for `p*`: repeatedly recompute each bank's payment capacity based on what it's currently receiving from others, until the numbers stabilize (converge) within a tolerance (`tol`).

**Default / failure** — a bank defaults when its clearing payment `p*` comes in below what it originally owed `p` — i.e., it couldn't pay everyone back in full.

**Default rate** — the fraction of all banks in the network that ended up defaulting after the shock. The simulator's main output metric for "how bad was the contagion."

**Systemic shortfall / loss** — the total gap between what was originally owed (`p`) and what was actually paid (`p*`), summed across the whole system. A dollar measure of total damage, as opposed to the default rate's headcount measure.

---

## 4. Where the "GNN" comes in

The repo name and docstring (`Graph Neural Network Risk Predictor`) point to a second stage beyond the Eisenberg-Noe solver: using a **Graph Neural Network (GNN)** to *predict* systemic risk (e.g., which banks are likely to fail, or how severe a shock will be) directly from network structure, instead of only recomputing it via the iterative clearing process each time. A few terms worth knowing if you extend the project this direction:

- **Graph Neural Network (GNN)** — a neural network architecture designed to operate on graph-structured data, learning representations of nodes based on their own features and their neighbors'.
- **Node features** — per-bank inputs to a GNN, e.g., external assets, capital buffer, degree (number of connections).
- **Message passing** — how GNNs learn: each node repeatedly aggregates information from its neighbors to update its own representation, which is a natural fit for simulating how losses/risk propagate along the same edges used in the contagion model.
- **GCN / GAT** — two common GNN variants you'll see referenced in this space: Graph Convolutional Networks (average over neighbors) and Graph Attention Networks (learn *how much* to weight each neighbor).

---

## 5. Quick reference table

| Symbol / variable | Meaning |
|---|---|
| `L` | Liability matrix — who owes whom, in absolute terms |
| `Pi` | Relative liabilities matrix — who owes whom, as a fraction of total obligations |
| `p` | Total obligations per bank (pre-shock) |
| `p*` (`p_star`) | Clearing vector — actual payments per bank (post-contagion) |
| `e'` (`e_prime`) | Post-shock net worth available to pay obligations |
| `def_rate` | Fraction of banks that defaulted |
| `loss` | Total systemic shortfall in dollars |

---

*Generated from the current state of the repo (script `bank_contagion_gnn.py`, 69 lines). If the `src/` folder or the deployed app add more features (e.g., an actual trained GNN model), it's worth revisiting this doc.*
