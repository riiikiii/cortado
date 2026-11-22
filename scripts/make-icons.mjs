// Renders the app icons from public/icons/cup.svg (the coffee cup mascot) with Playwright's
// Chromium. Run after changing the SVG: node scripts/make-icons.mjs
// Needs Playwright with Chromium installed (npx playwright install chromium) if it isn't already.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const dir = new URL('../public/icons/', import.meta.url);
const cup = readFileSync(new URL('cup.svg', dir), 'utf8');
const BG = 'linear-gradient(150deg, #f8e1c1 0%, #eebd8a 55%, #e2a066 100%)';

// [file, size, corner radius as a share of the size (0 = square, for iOS and maskable), cup scale]
const ICONS = [
  ['icon-512.png', 512, 0.23, 0.8],
  ['icon-192.png', 192, 0.23, 0.8],
  ['icon-maskable-512.png', 512, 0, 0.62],
  ['apple-touch-icon.png', 180, 0, 0.78],
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [file, size, radius, scale] of ICONS) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<body style="margin:0;background:transparent">
      <div style="width:${size}px;height:${size}px;border-radius:${radius * size}px;background:${BG};display:grid;place-items:center;overflow:hidden">
        <div style="width:${size * scale}px;height:${size * scale}px;margin-top:-${size * 0.02}px">${cup.replace('<svg ', '<svg width="100%" height="100%" ')}</div>
      </div>
    </body>`,
  );
  await page.screenshot({ path: new URL(file, dir).pathname, omitBackground: true });
  console.log('wrote', file);
}
await browser.close();
