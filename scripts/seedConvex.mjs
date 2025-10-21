// Seed a real Convex group conversation and print ids
// Usage: node scripts/seedConvex.mjs "Demo Chat"
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ConvexClient } from 'convex/browser';
import { api } from '../convex/_generated/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load EXPO_PUBLIC_CONVEX_URL from .env.local if not set
const envPath = path.join(__dirname, '..', '.env.local');
if (!process.env.EXPO_PUBLIC_CONVEX_URL && fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const m = line.match(/^\s*EXPO_PUBLIC_CONVEX_URL\s*=\s*(.+)\s*$/);
    if (m) {
      process.env.EXPO_PUBLIC_CONVEX_URL = m[1].trim();
      break;
    }
  }
}

const title = process.argv[2] || 'Demo Chat';
const url = process.env.EXPO_PUBLIC_CONVEX_URL;
if (!url) {
  console.error('Missing EXPO_PUBLIC_CONVEX_URL. Ensure .env.local contains it.');
  process.exit(1);
}

async function main() {
  const client = new ConvexClient(url);
  const res = await client.mutation(api.dev.seedCreateGroup, { title });
  console.log(JSON.stringify(res, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


