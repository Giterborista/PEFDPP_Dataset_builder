// Unit tests of the actual upload/dialog event handlers. This small DOM double
// does not replace browser layout, accessibility or end-to-end verification.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {engine, fixture, root} = require('./engine.cjs');

function ui() {
  const e = engine(); e.load(fixture('printer', {raw:false}));
  const nodes = new Map(), events = {};
  const node = (id) => {
    if (nodes.has(id)) return nodes.get(id);
    const handlers = {};
    const value = {id, value:'', textContent:'', disabled:false, open:false, files:[],
      addEventListener(name, handler) { handlers[name] = handler; },
      showModal() { this.open = true; }, close() { this.open = false; },
      focus() {}, click() { this.clicked = true; },
      async emit(name) { await handlers[name]({target:this}); }};
    let html = '';
    Object.defineProperty(value, 'innerHTML', {get:()=>html, set:(next)=>{
      html = next;
      if (id === 'dppOutput') value.value = /<option value="([^"]+)"/.exec(next)?.[1] || '';
    }});
    nodes.set(id, value); return value;
  };
  e.context.document = {getElementById:node, addEventListener(name, handler) {events[name] = handler;}};
  e.run('render=()=>{}; initDppConnections();');
  const inputId = () => e.value('state.dataset.activities[0].flows[0].id');
  const click = (id, action) => events.click({target:{id, closest(selector) {
    if (action === 'connect' && selector === '[data-connect-dpp]') return {dataset:{connectDpp:inputId()}};
    if (action === 'disconnect' && selector === '[data-disconnect-dpp]') return {dataset:{disconnectDpp:inputId()}};
    return null;
  }}});
  const upload = async (text) => {
    click('', 'connect');
    node('dppUpload').files = [{size:text.length, name:'supplier.ttl', text:async()=>text}];
    await node('dppUpload').emit('change');
  };
  return {e, node, click, upload};
}

test('dialog requires explicit demand for a different output unit and rejects zero without mutation', async()=>{
  const u=ui();u.e.run('state.dataset.activities[0].flows[0].unitUri=KG_URI');
  const before=u.e.export();await u.upload(fixture('cartridge'));
  assert.equal(u.node('dppDialog').open,true);assert.equal(u.node('dppAmount').value,'');
  assert.match(u.node('dppPreview').textContent,/1 of 1 activities/);
  assert.match(u.node('dppPreview').textContent,/1 background exchanges resolved; 0 unresolved/);
  u.node('dppAmount').value='0';u.click('dppConfirm');
  assert.match(u.node('dppError').textContent,/greater than zero/);assert.equal(u.e.export(),before);
  u.node('dppAmount').value='1';u.click('dppConfirm');
  assert.equal(u.node('dppDialog').open,false);assert.equal(u.e.value('state.connectedDpps.length'),1);
  assert.deepEqual(u.e.value('validationIssues()'),[]);
  u.click('', 'disconnect');assert.equal(u.e.value('state.connectedDpps.length'),0);
  assert.equal(u.e.value('state.dataset.activities.length'),1);
});

test('changing selected output clears demand and previews only that output closure', async()=>{
  const supplier=engine();supplier.load(fixture('cartridge',{raw:false}));supplier.prepare(fixture('plastic'));supplier.attach(1);
  const u=ui();const before=u.e.export();await u.upload(supplier.export());
  assert.match(u.node('dppPreview').textContent,/2 of 2 activities/);
  u.node('dppOutput').value='https://example.org/plastic#out';await u.node('dppOutput').emit('change');
  assert.equal(u.node('dppAmount').value,'');assert.match(u.node('dppPreview').textContent,/1 of 2 activities/);
  assert.equal(u.e.export(),before);
  u.node('dppAmount').value='3';u.click('dppConfirm');
  const imported=engine();imported.load(u.e.export());assert.equal(imported.value('state.connectedDpps.length'),2);
  assert.deepEqual(imported.value('validationIssues()'),[]);
});

test('malformed upload gives a disabled confirmation and leaves the inventory intact', async()=>{
  const u=ui(), before=u.e.export();await u.upload('This is not an inventory Turtle file.');
  assert.equal(u.node('dppConfirm').disabled,true);
  assert.equal(u.node('dppPreview').textContent,'No inventory has been changed.');
  assert.ok(u.node('dppError').textContent.length>0);
  u.click('dppConfirm');assert.equal(u.e.export(),before);
  u.click('dppCancel');assert.equal(u.node('dppDialog').open,false);
});

test('cancel button and dialog cancellation never commit a pending supplier', async()=>{
  const u=ui(), before=u.e.export();await u.upload(fixture('cartridge'));
  u.click('dppCancel');u.click('dppConfirm');assert.equal(u.e.export(),before);
  await u.upload(fixture('cartridge'));await u.node('dppDialog').emit('cancel');
  u.click('dppConfirm');assert.equal(u.e.export(),before);
});

test('project printer-to-cartridge upload follows the actual dialog handlers without unmatched inputs', async(t)=>{
  const folder=path.resolve(root,'../../04_CASE-STUDIES-AND-WORKING-DATA/Lexmark-printer/2026-10-12_nested_DPP_demo');
  if(!fs.existsSync(folder))return t.skip('Local Lexmark project fixture is not included in the public repository.');
  const u=ui();u.e.load(fs.readFileSync(path.join(folder,'01_Printer_DPP_import_first.ttl'),'utf8'));
  // This is the printer input a person expands before pressing Connect DPP.
  u.e.run(`state.dataset.activities.sort((a,b)=>Number(b.name.startsWith('Printer assembly'))-Number(a.name.startsWith('Printer assembly')));state.dataset.activities[0].flows.sort((a,b)=>Number(b.uri.endsWith('cartridge-input'))-Number(a.uri.endsWith('cartridge-input')))`);
  assert.equal(u.e.value('state.dataset.activities[0].flows[0].sourceMode'),'bonsai');
  await u.upload(fs.readFileSync(path.join(folder,'02_Cartridge_DPP_nested.ttl'),'utf8'));
  assert.equal(u.node('dppAmount').value,'');assert.match(u.node('dppPreview').textContent,/2 of 2 activities/);
  assert.match(u.node('dppPreview').textContent,/0 unresolved/);
  u.node('dppAmount').value='1';u.click('dppConfirm');
  assert.equal(u.e.value('state.dataset.activities.length'),8);assert.equal(u.e.value('flowLinks().length'),9);
  assert.equal(u.e.value('state.connectedDpps.length'),2);assert.deepEqual(u.e.value('validationIssues()'),[]);
  const expected=JSON.parse(fs.readFileSync(path.join(folder,'verification.json'))).climateKg;
  assert.ok(Math.abs(u.e.value('climateReport().directTotal')-expected)<1e-8);
  u.node('dppHierarchy');u.e.run('dppRenderHierarchy()');
  assert.match(u.node('dppHierarchy').innerHTML,/Lexmark project cartridge/);
  assert.match(u.node('dppHierarchy').innerHTML,/Plastic feedstock supply/);
});
