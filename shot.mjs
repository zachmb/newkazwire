import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
for (const [name, url] of [['home','http://localhost:3111/'],['game','http://localhost:3111/g/retro-bowl']]) {
  await p.goto(url, { waitUntil: 'networkidle', timeout: 30000 }).catch(()=>{});
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `/tmp/kz-${name}.png`, fullPage: name==='home' });
  console.log('shot', name);
}
await b.close();
