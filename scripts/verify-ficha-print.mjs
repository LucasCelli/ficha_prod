import { chromium } from '@playwright/test';
import ts from 'typescript';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const source = fs.readFileSync('src/features/fichas/print-pdf.ts', 'utf8').replace('await import("html2canvas")', '({ default: window.html2canvas })');
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText.replace('export async function', 'async function');
const browser = await chromium.launch({ channel: 'chrome' });
try {
 const context = await browser.newContext(); const page = await context.newPage();
 await context.route('https://print-test.invalid/image.png', async route => { await new Promise(resolve => setTimeout(resolve, 150)); await route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aK1sAAAAASUVORK5CYII=', 'base64') }); });
 const styles = ['src/styles/tokens/colors.css', 'src/styles/domains/base.css', 'src/styles/domains/fichas.css', 'src/styles/domains/print.css'].map(p => fs.readFileSync(p,'utf8')).join('\n');
 for (const [height, raster, fail] of [[200,false,false],[284.9,false,false],[285.1,true,false],[500,true,false],[500,false,true]]) {
  await page.setViewportSize({width: height > 285 ? 390 : 1440, height: 900});
  await page.setContent(`<style>${styles}</style><div id="print-version" class="print-document"><div class="print-container print-page"><div style="height:${height}mm;flex:none">Texto da ficha<img src="https://print-test.invalid/image.png" style="width:1px;height:1px" /></div></div><div class="print-container print-page print-raw-name-list-page">Lista de nomes</div></div>`);
  await page.evaluate(dark => document.documentElement.classList.toggle('dark', dark), height > 285);
  await page.addScriptTag({ path: 'node_modules/html2canvas/dist/html2canvas.min.js' });
  await page.evaluate(fail => {
   window.captures = 0;
   const capture = window.html2canvas;
   window.html2canvas = (...args) => { window.captures++; if (fail) throw Error('capture failure'); return capture(...args); };
   window.printed = 0;
   window.finished = 0;
   const original = document.body.appendChild.bind(document.body);
   document.body.appendChild = node => { const result = original(node); if(node.tagName === 'IFRAME') node.contentWindow.print = () => { window.printed++; }; return result; };
  }, fail);
  await page.addScriptTag({content: js});
  await page.evaluate(() => printFichaAutomatically(document.getElementById('print-version'), () => window.finished++));
  const result = await page.evaluate(() => { const doc = document.querySelector('iframe').contentDocument; return { raster: !!doc.querySelector('.print-raster-page'), annex: doc.querySelector('.print-raw-name-list-page').textContent, printed: window.printed, captures: window.captures, loaded: [...doc.images].every(image => image.complete && image.naturalWidth > 0), width: doc.querySelector('.print-document').getBoundingClientRect().width }; });
  assert.equal(result.loaded,true); assert.equal(result.raster,raster); assert.equal(result.annex,'Lista de nomes'); assert.equal(result.printed,1); assert.equal(result.captures, height > 285 ? 1 : 0); assert.ok(Math.abs(result.width-198*96/25.4)<1);
  const printPage = await context.newPage(); await printPage.setContent(await page.evaluate(() => document.querySelector('iframe').contentDocument.documentElement.outerHTML)); await printPage.emulateMedia({media:'print'});
  const pdf = await printPage.pdf({ preferCSSPageSize:true }); assert.equal((pdf.toString('latin1').match(/\/Type \/Page\b/g) ?? []).length, fail ? 3 : 2); await printPage.close();
  await page.emulateMedia({media:'screen'});
  await page.evaluate(() => document.querySelector('iframe').contentWindow.dispatchEvent(new Event('afterprint')));
  assert.equal(await page.locator('iframe').count(),0); assert.equal(await page.evaluate(() => window.finished),1);
  console.log(`PASS height=${height} raster=${raster} fallback=${fail}`);
 }
} finally { await browser.close(); }
