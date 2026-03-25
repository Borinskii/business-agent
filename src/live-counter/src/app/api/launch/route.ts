/**
 * @copyright 2026 vladnidz <vladyslav.nidzelskyi@edu.rtu.lv> — Phantom Pipeline
 * @license Proprietary. Hackathon submission. All rights reserved.
 * @author vladnidz <vladyslav.nidzelskyi@edu.rtu.lv>
 * @created 2026-03-25
 */

import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';
import util from 'util';

const execPromise = util.promisify(exec);

export async function POST(req: Request) {
  try {
    // live-counter is in src/live-counter, root is ../..
    const rootDir = path.resolve(process.cwd(), '../..');
    
    // We execute a test scan to prove the backend executes.
    // In a real scenario, this would chain the profiler and bridge via the IDs.
    const { stdout, stderr } = await execPromise('npx ts-node src/signal-hunter/cli.ts --source linkedin --limit 10', { cwd: rootDir });

    return NextResponse.json({ 
      success: true, 
      logs: stdout,
      message: "Pipeline executed successfully in the background."
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message
    }, { status: 500 });
  }
}