import { chromium } from 'playwright';

async function captureScreenshots() {
  const browser = await chromium.launch({ headless: true });
  
  // 1440px Desktop
  const contextDesktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pageDesktop = await contextDesktop.newPage();
  await pageDesktop.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await pageDesktop.waitForTimeout(1000);
  await pageDesktop.screenshot({ path: 'C:/Users/JTDH/.gemini/antigravity/brain/4e49ff8b-97fa-4499-b0a2-2141bc661219/stitch_homepage_1440.png', fullPage: true });
  console.log('✓ Desktop screenshot captured');

  // 390px Mobile
  const contextMobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const pageMobile = await contextMobile.newPage();
  await pageMobile.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await pageMobile.waitForTimeout(1000);
  await pageMobile.screenshot({ path: 'C:/Users/JTDH/.gemini/antigravity/brain/4e49ff8b-97fa-4499-b0a2-2141bc661219/stitch_homepage_390.png', fullPage: true });
  console.log('✓ Mobile screenshot captured');

  await browser.close();
}

captureScreenshots().catch(console.error);
