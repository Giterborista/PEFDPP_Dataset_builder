const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('./engine.cjs');

function addElementary(e) {
  e.run(`const elementaryIds=['08a91e70-3ddc-11dd-923d-0050c2490048','08a91e70-3ddc-11dd-9610-0050c2490048'];
    elementaryIds.forEach((uuid,i)=>{
      const uri='https://w3id.org/mintjesba/pefdpp/skos/ef31-elementaryflows#'+uuid;
      state.flowTypes.push({id:'emission-type-'+i,uri,label:i?'Methane (fossil)':'Carbon dioxide (fossil)',className:'ElementaryFlow',ontologyManaged:true,preferredUnitUri:KG_URI});
      state.dataset.activities[0].flows.push({id:'emission-'+i,uri:state.dataset.namespace+'emission-'+i,label:i?'Methane (fossil)':'Carbon dioxide (fossil)',flowTypeUri:uri,amount:String(i+1),unitUri:KG_URI,direction:'output',determining:false});
    });`);
}

test('known fossil CO2 and methane are preserved but never characterised or silently included', () => {
  const e = engine();
  const background = e.value('climateReport().directTotal');
  assert.equal(e.value('climateReport().calculated'), true);
  addElementary(e);
  const report = e.value('climateReport()');
  assert.equal(report.calculated, false);
  assert.equal(report.directTotal, background);
  assert.equal(report.uncharacterisedElementary.length, 2);
  assert.ok(report.reasons.every(reason => /characterisation is disabled/.test(reason)));
  assert.equal(e.run('conciseClimateReason(climateReport())'), '2 unresolved elementary flows');
});

test('elementary identifiers, quantities and units survive Turtle and JSON-LD round trips', () => {
  const e = engine(); addElementary(e);
  const inventory = e.value(`state.dataset.activities.flatMap(a=>a.flows).filter(f=>getFlowType(f.flowTypeUri)?.className==='ElementaryFlow').map(f=>({uri:f.uri,type:f.flowTypeUri,amount:f.amount,unit:f.unitUri,direction:f.direction}))`);
  for (const text of [e.export(), e.run('dppReadText(toJson())')]) {
    const imported = engine(); imported.load(text);
    assert.deepEqual(imported.value(`state.dataset.activities.flatMap(a=>a.flows).filter(f=>getFlowType(f.flowTypeUri)?.className==='ElementaryFlow').map(f=>({uri:f.uri,type:f.flowTypeUri,amount:f.amount,unit:f.unitUri,direction:f.direction}))`), inventory);
    assert.equal(imported.value('climateReport().calculated'), false);
    assert.equal(imported.value('climateReport().uncharacterisedElementary.length'), 2);
  }
});

test('an elementary-only inventory does not present a climate result', () => {
  const e = engine(); addElementary(e);
  e.run(`const last=state.dataset.activities.at(-1);const emissions=state.dataset.activities[0].flows.filter(f=>getFlowType(f.flowTypeUri)?.className==='ElementaryFlow');last.flows=[...last.flows.filter(f=>f.determining),...emissions];state.dataset.activities=[last];`);
  const report = e.value('climateReport()');
  assert.equal(report.calculated, false);
  assert.equal(report.direct.length, 0);
  assert.equal(report.uncharacterisedElementary.length, 2);
});
