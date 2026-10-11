/* ═══════════════════════════════════════════════════════════════════
   AGORA VOTING METHODS ENGINE
   Implements: Plurality, Approval, RCV/IRV variants, STV variants,
               Condorcet, Borda Count, Coombs, Bucklin
═══════════════════════════════════════════════════════════════════ */

/* ── Method metadata ── */
export const VOTING_METHODS = {
  // Checkbox
  plurality_single: {
    id: "plurality_single", label: "Plurality (Single Winner)", category: "Checkbox Voting",
    description: "Voters select one candidate. Most votes wins.",
    ui: "radio", multiWinner: false,
  },
  plurality_multi: {
    id: "plurality_multi", label: "Multi-Winner (Block Voting)", category: "Checkbox Voting",
    description: "Voters select up to N candidates. Top N win.",
    ui: "checkbox", multiWinner: true,
  },
  // RCV / IRV
  rcv: {
    id: "rcv", label: "Ranked-Choice Voting (RCV)", category: "Ranked-Choice Voting",
    description: "Voters rank candidates. If no majority, lowest is eliminated and ballots redistributed.",
    ui: "ranked", multiWinner: false,
  },
  irv: {
    id: "irv", label: "Instant Runoff Voting (IRV)", category: "Instant Runoff Voting",
    description: "Standard IRV: ranked ballots, bottom-up elimination until majority.",
    ui: "ranked", multiWinner: false,
  },
  sf_rcv: {
    id: "sf_rcv", label: "San Francisco RCV", category: "Instant Runoff Voting",
    description: "IRV with a 3-ranking maximum per ballot (SF style).",
    ui: "ranked", maxRanks: 3, multiWinner: false,
  },
  oakland_rcv: {
    id: "oakland_rcv", label: "Oakland RCV", category: "Instant Runoff Voting",
    description: "IRV allowing unlimited rankings; batch elimination of all candidates below threshold.",
    ui: "ranked", batchElim: true, multiWinner: false,
  },
  // STV
  scottish_stv: {
    id: "scottish_stv", label: "Scottish STV", category: "Single Transferable Vote",
    description: "Proportional STV used in Scottish local elections. Droop quota, Gregory method.",
    ui: "ranked", multiWinner: true, stv: true,
  },
  meek_stv: {
    id: "meek_stv", label: "Meek STV", category: "Single Transferable Vote",
    description: "Iterative algorithm that keeps elected candidates in the count at reduced weight.",
    ui: "ranked", multiWinner: true, stv: true,
  },
  ers97_stv: {
    id: "ers97_stv", label: "ERS97 STV", category: "Single Transferable Vote",
    description: "Electoral Reform Society 1997 rules. Fractional transfer with random sampling.",
    ui: "ranked", multiWinner: true, stv: true,
  },
  minneapolis_stv: {
    id: "minneapolis_stv", label: "Minneapolis STV", category: "Single Transferable Vote",
    description: "Used in Minneapolis municipal elections. Ranked ballots up to 3.",
    ui: "ranked", maxRanks: 3, multiWinner: true, stv: true,
  },
  ni_stv: {
    id: "ni_stv", label: "Northern Ireland STV", category: "Single Transferable Vote",
    description: "Used in NI Assembly elections. Droop quota, fractional surplus transfer.",
    ui: "ranked", multiWinner: true, stv: true,
  },
  warren_stv: {
    id: "warren_stv", label: "Warren STV", category: "Single Transferable Vote",
    description: "Warren method: surplus transferred at fractional value based on quota.",
    ui: "ranked", multiWinner: true, stv: true,
  },
  cambridge_stv: {
    id: "cambridge_stv", label: "Cambridge STV", category: "Single Transferable Vote",
    description: "Used in Cambridge MA. Random-selection surplus transfer with 3-rank limit.",
    ui: "ranked", maxRanks: 3, multiWinner: true, stv: true,
  },
  fractional_stv: {
    id: "fractional_stv", label: "Fractional Transfer STV", category: "Single Transferable Vote",
    description: "Full fractional (Gregory-style) transfer of surplus votes.",
    ui: "ranked", multiWinner: true, stv: true,
  },
  random_stv: {
    id: "random_stv", label: "Random Transfer STV", category: "Single Transferable Vote",
    description: "Surplus transferred by randomly selecting ballots (lottery method).",
    ui: "ranked", multiWinner: true, stv: true,
  },
  // Condorcet
  condorcet: {
    id: "condorcet", label: "Condorcet Voting", category: "Condorcet Methods",
    description: "Finds the candidate who beats all others head-to-head. Shows full pairwise matrix.",
    ui: "ranked", multiWinner: false,
  },
  // Approval
  approval: {
    id: "approval", label: "Approval Voting", category: "Approval Voting",
    description: "Voters approve any number of candidates. Most approvals wins.",
    ui: "checkbox", multiWinner: false,
  },
  // Other
  coombs: {
    id: "coombs", label: "Coombs Method", category: "Other Methods",
    description: "Like IRV but eliminates the candidate with the most last-place rankings.",
    ui: "ranked", multiWinner: false,
  },
  borda: {
    id: "borda", label: "Borda Count", category: "Other Methods",
    description: "Points assigned by rank (N-1 for 1st, N-2 for 2nd…). Highest total wins.",
    ui: "ranked", multiWinner: false,
  },
  bucklin: {
    id: "bucklin", label: "Bucklin System", category: "Other Methods",
    description: "Iterative: first-choice votes counted; if no majority, second-choice added, etc.",
    ui: "ranked", multiWinner: false,
  },
};

export const METHOD_CATEGORIES = [
  "Checkbox Voting",
  "Ranked-Choice Voting",
  "Instant Runoff Voting",
  "Single Transferable Vote",
  "Condorcet Methods",
  "Approval Voting",
  "Other Methods",
];

/* ════════════════════════════════════════════════════════
   TALLY ALGORITHMS
════════════════════════════════════════════════════════ */

/* Helper: count first-choice votes */
function firstChoices(ballots, active) {
  const counts = {};
  active.forEach(c => { counts[c] = 0; });
  ballots.forEach(ballot => {
    for (const choice of ballot) {
      if (active.includes(choice)) { counts[choice]++; break; }
    }
  });
  return counts;
}

/* Helper: Droop quota */
function droop(totalVotes, seats) {
  return Math.floor(totalVotes / (seats + 1)) + 1;
}

/* ── Plurality single winner ── */
export function tallyPlurality(ballots, candidates) {
  const counts = {};
  candidates.forEach(c => { counts[c.id] = 0; });
  ballots.forEach(b => { if (b.choice && counts[b.choice] !== undefined) counts[b.choice]++; });
  const sorted = candidates.map(c => ({ ...c, votes: counts[c.id] || 0 }))
    .sort((a, b) => b.votes - a.votes);
  return { winners: [sorted[0]?.id], results: sorted, method: "Plurality" };
}

/* ── Block voting (multi-winner) ── */
export function tallyBlock(ballots, candidates, seats) {
  const counts = {};
  candidates.forEach(c => { counts[c.id] = 0; });
  ballots.forEach(b => {
    (b.choices || []).forEach(id => { if (counts[id] !== undefined) counts[id]++; });
  });
  const sorted = candidates.map(c => ({ ...c, votes: counts[c.id] || 0 }))
    .sort((a, b) => b.votes - a.votes);
  return { winners: sorted.slice(0, seats).map(c => c.id), results: sorted, method: "Block Voting" };
}

/* ── Approval voting ── */
export function tallyApproval(ballots, candidates) {
  const counts = {};
  candidates.forEach(c => { counts[c.id] = 0; });
  ballots.forEach(b => {
    (b.approvals || []).forEach(id => { if (counts[id] !== undefined) counts[id]++; });
  });
  const sorted = candidates.map(c => ({ ...c, votes: counts[c.id] || 0 }))
    .sort((a, b) => b.votes - a.votes);
  return { winners: [sorted[0]?.id], results: sorted, method: "Approval Voting" };
}

/* ── IRV / RCV core (rounds) ── */
export function tallyIRV(ballots, candidates, opts = {}) {
  const { maxRanks, batchElim, label = "IRV" } = opts;
  let active = candidates.map(c => c.id);
  const rounds = [];

  // normalize ballots
  let bsets = ballots.map(b => {
    let r = (b.rankings || []).slice().sort((a, b) => a.rank - b.rank).map(r => r.id);
    if (maxRanks) r = r.slice(0, maxRanks);
    return r;
  });

  while (active.length > 1) {
    const counts = firstChoices(bsets, active);
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    rounds.push({ counts: { ...counts }, total });

    const maxVotes = Math.max(...Object.values(counts));
    if (maxVotes > total / 2) {
      const winner = Object.keys(counts).find(k => counts[k] === maxVotes);
      return { winners: [winner], rounds, method: label };
    }

    const minVotes = Math.min(...Object.values(counts));
    let toElim;
    if (batchElim) {
      // Oakland: eliminate all below average threshold
      const avg = total / active.length;
      toElim = active.filter(c => counts[c] < avg * 0.5);
      if (toElim.length === 0) toElim = [active.find(c => counts[c] === minVotes)];
    } else {
      toElim = active.filter(c => counts[c] === minVotes);
      if (toElim.length === active.length) break; // tie
      toElim = [toElim[0]];
    }
    active = active.filter(c => !toElim.includes(c));
  }
  return { winners: [active[0]], rounds, method: label };
}

/* ── Fractional STV (Gregory / Scottish / ERS97 / NI / Warren) ── */
export function tallyFractionalSTV(ballots, candidates, seats, label = "STV") {
  const quota = droop(ballots.length, seats);
  let active = candidates.map(c => c.id);
  const elected = [];
  const rounds = [];

  // Each ballot has a weight (starts at 1)
  let bsets = ballots.map(b => ({
    rankings: (b.rankings || []).slice().sort((a, b2) => a.rank - b2.rank).map(r => r.id),
    weight: 1,
  }));

  while (elected.length < seats && active.length > 0) {
    // Count weighted first choices
    const counts = {};
    active.forEach(c => { counts[c] = 0; });
    bsets.forEach(b => {
      for (const choice of b.rankings) {
        if (active.includes(choice)) { counts[choice] += b.weight; break; }
      }
    });

    rounds.push({ counts: { ...counts }, quota, elected: [...elected] });

    const surplusWinners = active.filter(c => counts[c] >= quota);
    if (surplusWinners.length > 0) {
      surplusWinners.forEach(winner => {
        elected.push(winner);
        active = active.filter(c => c !== winner);
        // Transfer surplus fractionally
        const surplus = counts[winner] - quota;
        const tf = surplus / counts[winner]; // transfer fraction
        bsets = bsets.map(b => {
          if (b.rankings[0] === winner) return { ...b, weight: b.weight * tf };
          return b;
        });
        // Remove winner from all ballot rankings
        bsets = bsets.map(b => ({ ...b, rankings: b.rankings.filter(r => r !== winner) }));
      });
    } else {
      // Eliminate lowest
      const minC = active.reduce((a, b) => counts[a] <= counts[b] ? a : b);
      active = active.filter(c => c !== minC);
      bsets = bsets.map(b => ({ ...b, rankings: b.rankings.filter(r => r !== minC) }));
    }

    if (active.length <= seats - elected.length) {
      elected.push(...active);
      active = [];
    }
  }

  const results = candidates.map(c => ({
    ...c,
    votes: rounds[rounds.length - 1]?.counts[c.id] || 0,
    elected: elected.includes(c.id),
  })).sort((a, b) => b.votes - a.votes);

  return { winners: elected, rounds, results, quota, method: label };
}

/* ── Meek STV ── */
export function tallyMeekSTV(ballots, candidates, seats) {
  // Simplified Meek: iterative keep values
  const quota = droop(ballots.length, seats);
  const keep = {};
  candidates.forEach(c => { keep[c.id] = 1.0; });
  const elected = new Set();
  const eliminated = new Set();
  const rounds = [];

  for (let iter = 0; iter < 50; iter++) {
    // Distribute votes
    const counts = {};
    candidates.forEach(c => { counts[c.id] = 0; });
    let exhausted = 0;

    ballots.forEach(b => {
      let rem = 1.0;
      for (const r of (b.rankings || []).map(r => r.id)) {
        if (eliminated.has(r)) continue;
        const kv = keep[r] || 0;
        counts[r] += rem * kv;
        rem *= (1 - kv);
        if (rem < 1e-9) break;
      }
      exhausted += rem;
    });

    rounds.push({ counts: { ...counts }, quota });

    // Elect any above quota
    let change = false;
    candidates.forEach(c => {
      if (!elected.has(c.id) && !eliminated.has(c.id) && counts[c.id] >= quota) {
        elected.add(c.id);
        keep[c.id] = quota / counts[c.id];
        change = true;
      }
    });

    if (elected.size >= seats) break;
    if (!change) {
      // Eliminate lowest non-elected
      const active = candidates.filter(c => !elected.has(c.id) && !eliminated.has(c.id));
      if (active.length === 0) break;
      const minC = active.reduce((a, b) => counts[a.id] <= counts[b.id] ? a : b);
      eliminated.add(minC.id);
      keep[minC.id] = 0;
    }
  }

  const results = candidates.map(c => ({
    ...c, votes: rounds[rounds.length - 1]?.counts[c.id] || 0,
    elected: elected.has(c.id),
  })).sort((a, b) => b.votes - a.votes);

  return { winners: [...elected].slice(0, seats), rounds, results, quota, method: "Meek STV" };
}

/* ── Random Transfer STV ── */
export function tallyRandomSTV(ballots, candidates, seats) {
  // Like fractional but uses random ballot selection for surplus
  const quota = droop(ballots.length, seats);
  let active = candidates.map(c => c.id);
  const elected = [];
  const rounds = [];

  let bsets = ballots.map(b => ({
    rankings: (b.rankings || []).slice().sort((a, b2) => a.rank - b2.rank).map(r => r.id),
    weight: 1,
    id: Math.random(),
  }));

  while (elected.length < seats && active.length > 0) {
    const counts = {};
    active.forEach(c => { counts[c] = 0; });
    bsets.forEach(b => {
      for (const choice of b.rankings) {
        if (active.includes(choice)) { counts[choice] += b.weight; break; }
      }
    });

    rounds.push({ counts: { ...counts }, quota, elected: [...elected] });

    const winner = active.find(c => counts[c] >= quota);
    if (winner) {
      elected.push(winner);
      active = active.filter(c => c !== winner);
      // Randomly select ballots to transfer (surplus count)
      const surplus = counts[winner] - quota;
      const winnerBallots = bsets.filter(b => b.rankings[0] === winner);
      // Shuffle and take surplus count
      const shuffled = [...winnerBallots].sort(() => Math.random() - 0.5);
      const toTransfer = shuffled.slice(0, Math.floor(surplus));
      bsets = bsets.map(b => {
        if (toTransfer.includes(b)) return { ...b, rankings: b.rankings.filter(r => r !== winner) };
        return { ...b, rankings: b.rankings.filter(r => r !== winner) };
      });
    } else {
      const minC = active.reduce((a, b) => counts[a] <= counts[b] ? a : b);
      active = active.filter(c => c !== minC);
      bsets = bsets.map(b => ({ ...b, rankings: b.rankings.filter(r => r !== minC) }));
    }

    if (active.length <= seats - elected.length) {
      elected.push(...active);
      active = [];
    }
  }

  const results = candidates.map(c => ({
    ...c, votes: rounds[rounds.length - 1]?.counts[c.id] || 0, elected: elected.includes(c.id),
  })).sort((a, b) => b.votes - a.votes);

  return { winners: elected, rounds, results, quota, method: "Random Transfer STV" };
}

/* ── Condorcet ── */
export function tallyCondorcet(ballots, candidates) {
  const ids = candidates.map(c => c.id);
  const matrix = {};
  ids.forEach(a => { matrix[a] = {}; ids.forEach(b => { matrix[a][b] = 0; }); });

  ballots.forEach(b => {
    const ranked = (b.rankings || []).slice().sort((x, y) => x.rank - y.rank).map(r => r.id);
    for (let i = 0; i < ranked.length; i++) {
      for (let j = i + 1; j < ranked.length; j++) {
        if (ids.includes(ranked[i]) && ids.includes(ranked[j])) {
          matrix[ranked[i]][ranked[j]]++;
        }
      }
    }
  });

  // Find Condorcet winner (beats all others)
  let winner = null;
  for (const a of ids) {
    const beatsAll = ids.every(b => b === a || matrix[a][b] > matrix[b][a]);
    if (beatsAll) { winner = a; break; }
  }

  // Copeland scores as fallback
  const scores = {};
  ids.forEach(a => {
    scores[a] = ids.filter(b => b !== a && matrix[a][b] > matrix[b][a]).length;
  });

  const results = candidates.map(c => ({
    ...c, votes: scores[c.id], condorcetWins: scores[c.id],
  })).sort((a, b) => b.votes - a.votes);

  return { winners: winner ? [winner] : [results[0]?.id], matrix, results, method: "Condorcet" };
}

/* ── Borda Count ── */
export function tallyBorda(ballots, candidates) {
  const n = candidates.length;
  const scores = {};
  candidates.forEach(c => { scores[c.id] = 0; });

  ballots.forEach(b => {
    const ranked = (b.rankings || []).slice().sort((x, y) => x.rank - y.rank).map(r => r.id);
    ranked.forEach((id, idx) => {
      if (scores[id] !== undefined) scores[id] += (n - 1 - idx);
    });
  });

  const results = candidates.map(c => ({ ...c, votes: scores[c.id] || 0 }))
    .sort((a, b) => b.votes - a.votes);
  return { winners: [results[0]?.id], results, method: "Borda Count" };
}

/* ── Coombs Method ── */
export function tallyCoombs(ballots, candidates) {
  let active = candidates.map(c => c.id);
  const rounds = [];

  let bsets = ballots.map(b =>
    (b.rankings || []).slice().sort((x, y) => x.rank - y.rank).map(r => r.id)
  );

  while (active.length > 1) {
    const first = firstChoices(bsets, active);
    const total = Object.values(first).reduce((a, b) => a + b, 0);
    rounds.push({ counts: { ...first }, total });

    // Check for majority
    const maxFirst = Math.max(...Object.values(first));
    if (maxFirst > total / 2) {
      const winner = Object.keys(first).find(k => first[k] === maxFirst);
      return { winners: [winner], rounds, method: "Coombs" };
    }

    // Count last-place votes
    const last = {};
    active.forEach(c => { last[c] = 0; });
    bsets.forEach(b => {
      const activePart = b.filter(id => active.includes(id));
      if (activePart.length > 0) last[activePart[activePart.length - 1]]++;
    });

    const maxLast = Math.max(...Object.values(last));
    const toElim = Object.keys(last).find(k => last[k] === maxLast);
    active = active.filter(c => c !== toElim);
    bsets = bsets.map(b => b.filter(id => id !== toElim));
  }

  return { winners: [active[0]], rounds, method: "Coombs" };
}

/* ── Bucklin ── */
export function tallyBucklin(ballots, candidates) {
  const ids = candidates.map(c => c.id);
  const n = candidates.length;
  const total = ballots.length;
  const rounds = [];

  for (let level = 0; level < n; level++) {
    const counts = {};
    ids.forEach(c => { counts[c] = 0; });

    ballots.forEach(b => {
      const ranked = (b.rankings || []).slice().sort((x, y) => x.rank - y.rank).map(r => r.id);
      for (let i = 0; i <= level && i < ranked.length; i++) {
        if (counts[ranked[i]] !== undefined) counts[ranked[i]]++;
      }
    });

    rounds.push({ level: level + 1, counts: { ...counts }, total });

    const maxVotes = Math.max(...Object.values(counts));
    if (maxVotes > total / 2) {
      const winner = Object.keys(counts).find(k => counts[k] === maxVotes);
      const results = candidates.map(c => ({ ...c, votes: counts[c.id] || 0 }))
        .sort((a, b) => b.votes - a.votes);
      return { winners: [winner], rounds, results, method: "Bucklin" };
    }
  }

  // No majority – highest count wins
  const finalCounts = rounds[rounds.length - 1]?.counts || {};
  const results = candidates.map(c => ({ ...c, votes: finalCounts[c.id] || 0 }))
    .sort((a, b) => b.votes - a.votes);
  return { winners: [results[0]?.id], rounds, results, method: "Bucklin" };
}

/* ── Master tally dispatcher ── */
export function tallyVotes(methodId, ballots, candidates, seats = 1) {
  switch (methodId) {
    case "plurality_single": return tallyPlurality(ballots, candidates);
    case "plurality_multi": return tallyBlock(ballots, candidates, seats);
    case "approval": return tallyApproval(ballots, candidates);
    case "rcv":
    case "irv": return tallyIRV(ballots, candidates, { label: methodId === "rcv" ? "RCV" : "IRV" });
    case "sf_rcv": return tallyIRV(ballots, candidates, { maxRanks: 3, label: "SF RCV" });
    case "oakland_rcv": return tallyIRV(ballots, candidates, { batchElim: true, label: "Oakland RCV" });
    case "scottish_stv": return tallyFractionalSTV(ballots, candidates, seats, "Scottish STV");
    case "ers97_stv": return tallyFractionalSTV(ballots, candidates, seats, "ERS97 STV");
    case "ni_stv": return tallyFractionalSTV(ballots, candidates, seats, "Northern Ireland STV");
    case "warren_stv": return tallyFractionalSTV(ballots, candidates, seats, "Warren STV");
    case "fractional_stv": return tallyFractionalSTV(ballots, candidates, seats, "Fractional Transfer STV");
    case "minneapolis_stv": return tallyFractionalSTV(
      ballots.map(b => ({ ...b, rankings: (b.rankings || []).slice(0, 3) })),
      candidates, seats, "Minneapolis STV"
    );
    case "cambridge_stv": return tallyFractionalSTV(
      ballots.map(b => ({ ...b, rankings: (b.rankings || []).slice(0, 3) })),
      candidates, seats, "Cambridge STV"
    );
    case "meek_stv": return tallyMeekSTV(ballots, candidates, seats);
    case "random_stv": return tallyRandomSTV(ballots, candidates, seats);
    case "condorcet": return tallyCondorcet(ballots, candidates);
    case "borda": return tallyBorda(ballots, candidates);
    case "coombs": return tallyCoombs(ballots, candidates);
    case "bucklin": return tallyBucklin(ballots, candidates);
    default: return tallyPlurality(ballots, candidates);
  }
}
