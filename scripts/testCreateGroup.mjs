// Quick test: create a group on Convex and verify it appears in listMine
// Usage: node scripts/testCreateGroup.mjs "Test Group"
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../convex/_generated/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// load EXPO_PUBLIC_CONVEX_URL from .env.local if not set
const envPath = path.join(__dirname, '..', '.env.local');
if (!process.env.EXPO_PUBLIC_CONVEX_URL && fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const m = line.match(/^\s*EXPO_PUBLIC_CONVEX_URL\s*=\s*(.+)\s*$/);
    if (m) { process.env.EXPO_PUBLIC_CONVEX_URL = m[1].trim(); break; }
  }
}

const url = process.env.EXPO_PUBLIC_CONVEX_URL;
if (!url) {
  console.error('Missing EXPO_PUBLIC_CONVEX_URL in environment or .env.local');
  process.exit(1);
}

const titleArg = process.argv[2] || 'Test Group';
const uniqueTitle = `${titleArg} ${new Date().toISOString()}`;

async function main() {
  const client = new ConvexHttpClient(url);
  const conversationId = await client.mutation(api.conversations.createGroup, { title: uniqueTitle, memberIds: [] });
  const mine = await client.query(api.conversations.listMine, {});
  const found = Array.isArray(mine) && mine.some((c) => c && c._id === conversationId);
  if (!found) {
    console.error('Group was not found in listMine');
    process.exit(2);
  }
  console.log('OK created group:', { conversationId, title: uniqueTitle });
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });


