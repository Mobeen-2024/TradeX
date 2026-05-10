/**
 * scripts/replayState.ts
 * 
 * Usage: npx tsx src/scripts/replayState.ts <strategyId> [isoTimestamp]
 */

import { stateReplayer } from '../lib/events/stateReplayer.ts';

const strategyId = process.argv[2];
const timestamp = process.argv[3] ? new Date(process.argv[3]) : new Date();

if (!strategyId) {
  console.error('Usage: npx tsx src/scripts/replayState.ts <strategyId> [isoTimestamp]');
  process.exit(1);
}

async function main() {
  try {
    const state = await stateReplayer.reconstruct(strategyId, timestamp);
    
    console.log('\n--- 🕒 TRADEX TIME TRAVEL REPORT ---');
    console.log(`Strategy ID: ${state.strategyId}`);
    console.log(`Target Time: ${timestamp.toISOString()}`);
    console.log(`Status:      ${state.status}`);
    console.log(`------------------------------------`);
    console.log(`Signals:     ${state.signalsReceived}`);
    console.log(`Orders:      ${state.ordersFilled} / ${state.ordersRouted} (Filled/Routed)`);
    console.log(`Rejected:    ${state.ordersRejected}`);
    console.log(`Volume:      $${state.totalNotionalFilled.toLocaleString()}`);
    console.log(`------------------------------------`);
    
    if (state.recentDecisions.length > 0) {
      console.log('Recent AI Decisions:');
      state.recentDecisions.forEach(d => {
        console.log(`  [${d.timestamp.toISOString()}] ${d.action}: ${d.reason}`);
      });
    }

    if (state.warnings.length > 0) {
      console.log('\n⚠️ Warnings during period:');
      state.warnings.slice(-5).forEach(w => console.log(`  - ${w}`));
    }
    
    console.log('\n--- Deterministic Reconstruction Complete ---');
    process.exit(0);
  } catch (e) {
    console.error('Replay failed:', e);
    process.exit(1);
  }
}

main();
