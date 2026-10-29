const pvFixtures = require('./pv-fixtures.cjs');
// Desktop QA: real import, selector, review, demand edits and both downloads.
// Run against a local static server: node tests/browser-climate.cjs URL
const {chromium} = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const {engine,root} = require('./engine.cjs');
const fs = require('node:fs');
const assert = require('node:assert/strict');
(async()=>{
 const browser = await chromium.launch({headless:true,channel:'chrome'});
 const page = await browser.newPage({viewport:{width:1440,height:1000}});
 const errors=[];page.on('pageerror', e=>errors.push(e.message));
 await page.goto(process.argv[2] || 'http://127.0.0.1:8879');
 await page.waitForFunction(()=>state.bonsai.entries && state.efClimate.index && state.ontologyOptions.ready);
 const e=engine();
 e.run(`const a=state.dataset.activities[1];a.flows=a.flows.filter(f=>f.determining);state.dataset.activities=[a];`);
 await page.locator('#ttlUpload').setInputFiles({name:'direct-emission.ttl',mimeType:'text/turtle',buffer:Buffer.from(e.export())});
 await page.waitForFunction(()=>state.dataset.activities.length===1);
 await page.locator('[data-step="activities"]').click();
 await page.locator('#addOutputFlow').click();
 const type=page.locator('[data-flow-class]').last();await type.selectOption('ElementaryFlow');
 const search=page.locator('[data-ef-search-flow]').last();await search.fill('08a91e70-3ddc-11dd-923d-0050c2490048');
 await page.locator('[data-select-ef-flow]').first().click();
 const amount=page.locator('[data-flow-field$=":amount"]').last();await amount.fill('1');await amount.blur();
 await page.locator('[data-step="review"]').click();
 await page.waitForFunction(()=>climateReport().elementaryTotal===1);
 assert.match(await page.locator('#climateImpactContent').innerText(), /Direct elementary-flow contribution/i);
 await page.locator('.provenance-details > summary').click();
 assert.match(await page.locator('#reviewElementaryImpact').innerText(), /6209b35f-9447-40b5-b68c-a1099e3674a0/);
 await page.screenshot({path:'/private/tmp/ef31-direct-review.png',fullPage:true});
 // UI demand change, then return to review.
 await page.locator('[data-step="study"]').click();
 await page.locator('#fuConversion').fill('2');await page.locator('#fuConversion').blur();
 await page.locator('[data-step="review"]').click();await page.waitForFunction(()=>climateReport().elementaryTotal===2);
 for(const id of ['downloadTtl','downloadJson']){
  const pending=page.waitForEvent('download');await page.locator('#'+id).click();const download=await pending;
  const text=fs.readFileSync(await download.path(),'utf8');assert.match(text,/ContributionResult/);assert.match(text,/kgCO2Eq/);
  const imported=engine();imported.load(id==='downloadJson'?imported.run(`dppReadText(${JSON.stringify(text)})`):text);
  assert.equal(imported.value('climateReport().elementaryTotal'),2);
 }
 if (fs.existsSync(pvFixtures.full)) {
 // Actual PV file upload and dense review. Missing CFs must remain visible.
 await page.locator('#ttlUpload').setInputFiles(pvFixtures.full);
 await page.waitForFunction(()=>state.dataset.activities.length===42);
 await page.locator('[data-step="review"]').click();
 const pv=await page.evaluate(()=>{const r=climateReport();return {elementary:r.elementaryRows.length,unresolved:r.uncharacterisedElementary.length,calculated:r.calculated};});
 assert.deepEqual(pv,{elementary:202,unresolved:191,calculated:false});
 if (!await page.locator('.provenance-details').evaluate(n=>n.open)) await page.locator('.provenance-details > summary').click();
 assert.match(await page.locator('#reviewElementaryImpact').innerText(),/Unresolved:/);
 await page.locator('#climateImpact').evaluate(n=>n.scrollIntoView({block:'start'}));
 await page.screenshot({path:'/private/tmp/ef31-pv-review.png'});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 } else console.log('Optional local PV upload skipped; set PEFDPP_PV_FULL_FILE to include it.');
 assert.deepEqual(errors,[]);
 console.log('Desktop browser workflow passed: selector, direct EF result, FU scaling, Turtle/JSON-LD downloads and optional local PV unresolved factors.');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
