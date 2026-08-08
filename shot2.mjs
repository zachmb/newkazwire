import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('http://localhost:3111/', { waitUntil: 'networkidle', timeout: 30000 }).catch(()=>{});
await p.waitForTimeout(1200);
await p.screenshot({ path: '/tmp/kz-home-top.png' });
await b.close();
