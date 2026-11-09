// `npm run share` — starts Penny and gives you a private https link you can send to someone.
// Works while this window stays open and your Mac is awake. Press Ctrl+C to stop sharing.
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';

const PORT = process.env.PORT || '3000';
const KEY = process.env.PENNY_ACCESS_KEY || crypto.randomBytes(6).toString('base64url');
// By default a shared link is look-only: Penny won't chat, so it uses none of your AI credit.
//   npm run share            → look-only
//   npm run share -- 10      → visitors can ask Penny up to 10 questions in total
const allowChats = Math.max(0, parseInt(process.argv[2], 10) || 0);
const procs = [];
const stop = () => { procs.forEach((p) => p.kill()); process.exit(0); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);

console.log('\n  Starting Penny…');
const server = spawn(process.execPath, ['server.js'], { env: { ...process.env, PORT, PENNY_ACCESS_KEY: KEY, PENNY_VIEW_ONLY: '1', PENNY_VISITOR_CHATS: String(allowChats) }, stdio: ['ignore', 'pipe', 'inherit'] });
procs.push(server);
server.stdout.on('data', () => {}); // keep quiet; errors still show
server.on('exit', (code) => { if (code) { console.log('\n  Penny stopped unexpectedly. Is another copy already running? Close it and try again.\n'); stop(); } });

console.log('  Opening a secure link (the first time can take a minute)…');
const tunnel = spawn('npx', ['-y', 'cloudflared@0.7.3', 'tunnel', '--url', `http://localhost:${PORT}`, '--no-autoupdate'], { stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32' });
procs.push(tunnel);
let shown = false;
const watch = (buf) => {
  const m = String(buf).match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
  if (m && !shown) {
    shown = true;
    const link = `${m[0]}/?key=${KEY}`;
    console.log('\n  ✅ Penny is shared! Send this link (it only works with the key on the end):\n');
    console.log(`     ${link}\n`);
    console.log('  Keep this window open while they use it. Press Ctrl+C to stop sharing.');
    console.log('  Anyone without the full link sees "This link is private".');
    console.log(allowChats ? `  Visitors can ask Penny up to ${allowChats} questions in total (uses your AI credit).\n` : '  Look-only: visitors can explore the app, but Penny won\'t chat — no AI credit used.\n  (To let them try Penny a little: npm run share -- 10)\n');
  }
};
tunnel.stdout.on('data', watch);
tunnel.stderr.on('data', watch);
tunnel.on('exit', () => { if (!shown) console.log('\n  Couldn\'t open the link. Check your internet connection and try `npm run share` again.\n'); stop(); });
setTimeout(() => { if (!shown) console.log('  Still working on the link…'); }, 30000);
