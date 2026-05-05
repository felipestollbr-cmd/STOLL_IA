import { chromium } from 'playwright';

let browser: any = null;
let context: any = null;

async function getBrowser() {
  if (context) return context;
  browser = await chromium.launch({ headless: false });
  context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  });
  return context;
}

export async function browseWeb(url: string, action?: string, selector?: string, value?: string) {
  const ctx = await getBrowser();
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });

  if (action && selector) {
    switch (action) {
      case 'click': await page.click(selector); break;
      case 'fill': await page.fill(selector, value || ''); break;
      case 'get_text':
        const text = await page.textContent(selector);
        return { result: '✅ Texto extraído', output: text?.substring(0, 1000) || '(vazio)' };
    }
  }

  const screenshotPath = `/tmp/screenshot_${Date.now()}.png`;
  await page.screenshot({ path: screenshotPath, fullPage: true });
  return {
    result: `✅ Site acessado: ${await page.title()}`,
    output: `📸 Screenshot: ${screenshotPath}\n🌐 URL: ${page.url()}`,
  };
}

export async function loginManually(url: string) {
  const ctx = await getBrowser();
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  console.log('⏳ Faça login e pressione ENTER no terminal...');
  await new Promise(resolve => process.stdin.once('data', resolve));
  return { result: '✅ Autenticado!', output: 'Sessão salva.' };
}