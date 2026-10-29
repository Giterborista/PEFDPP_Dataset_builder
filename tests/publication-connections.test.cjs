const pvFixtures = require('./pv-fixtures.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { engine, root } = require('./engine.cjs');
const near = (actual, expected) => assert.ok(Math.abs(actual-expected)<1e-9, `${actual} != ${expected}`);

function noPins(e) {
  let ttl=e.export();
  for (const link of e.value('activityConnections()')) ttl=ttl.replaceAll(`  dcterms:source <${link.outputFlowUri}> ;\n`, '');
  return ttl;
}

test('publication source-dataset and exact FlowType path resolves a unique producer without FlowLink or pins',()=>{
  const e=engine(), total=e.value('climateReport().directTotal');
  const ttl=noPins(e);assert.doesNotMatch(ttl,/prs:(?:hasFlowLink|FlowLink|flowFrom|toFlow)\b/);
  const imported=engine();imported.load(ttl);
  assert.equal(imported.value('activityConnections().length'),1);near(imported.value('climateReport().directTotal'),total);
  assert.equal(imported.value('climateReport().backgroundCalculated'),true);
});

test('exact supplying output provenance preserves two distinct exchanges in both formats',()=>{
  const e=engine();const pair=e.value('activityConnections()[0]');
  assert.notEqual(pair.outputFlowUri,pair.inputFlowUri);
  for (const text of [e.export(),e.run('dppReadText(toJson())')]) {
    const imported=engine();imported.load(text);
    assert.deepEqual(imported.value('activityConnections().map(x=>[x.outputFlowUri,x.inputFlowUri])'),[[pair.outputFlowUri,pair.inputFlowUri]]);
    near(imported.value('climateReport().directTotal'),e.value('climateReport().directTotal'));
  }
});

test('same labels with different FlowType identifiers never become supplier matches',()=>{
  const e=engine();e.run(`const a=state.dataset.activities.at(-1),f=a.flows.find(f=>f.sourceMode==='activity');
    state.flowTypes.push({id:'other',uri:state.dataset.namespace+'different-product',className:'ProductFlow',label:getFlowType(f.flowTypeUri).label,sourcedFromUri:state.dataset.uri});
    f.flowTypeUri=state.dataset.namespace+'different-product';f.sourceMode='';f.linkedOutputFlowUri='';`);
  const imported=engine();imported.load(noPins(e));assert.equal(imported.value('activityConnections().length'),0);
  assert.equal(imported.value('climateReport().backgroundCalculated'),false);
});

test('a different declaring dataset cannot select a locally matching producer',()=>{
  const e=engine();e.run(`const f=state.dataset.activities.at(-1).flows.find(f=>f.sourceMode==='activity');getFlowType(f.flowTypeUri).sourcedFromUri='https://example.org/another-dataset';`);
  const imported=engine();imported.load(noPins(e));assert.equal(imported.value('activityConnections().length'),0);
});

test('multiple exact producers remain unresolved until an output is explicitly selected',()=>{
  const e=engine();e.run(`const clone=JSON.parse(JSON.stringify(state.dataset.activities[0]));clone.id+='-alternative';clone.uri+='-alternative';clone.activityLinkUri+='-alternative';clone.flows.forEach(f=>{f.id+='-alternative';f.uri+='-alternative'});state.dataset.activities.push(clone);`);
  const imported=engine();imported.load(noPins(e));
  assert.equal(imported.value('activityConnections().length'),0);
  assert.ok(imported.value('validationIssues()').some(x=>/more than one producer/.test(x)));
  assert.equal(imported.value('climateReport().backgroundCalculated'),false);
  imported.load(e.export());assert.equal(imported.value('activityConnections().length'),1);
});

test('explicit output references cannot silently repair incompatible units or FlowTypes',()=>{
  for (const field of ['unitUri','flowTypeUri']) {
    const e=engine();e.run(`const f=state.dataset.activities.at(-1).flows.find(f=>f.sourceMode==='activity');f.${field}=${field==='unitUri' ? "NS.unit+'Megajoule'" : "NS.bonsai+'FT_M_CHEM'"};`);
    const imported=engine();imported.load(e.export());
    assert.equal(imported.value('climateReport().backgroundCalculated'),false);
    assert.ok(imported.value('climateReport().scalingIssues').some(x=>/units must match|FlowType identifiers must match/.test(x)));
  }
});

test('unknown explicit external sources cannot be silently replaced by a matching foreground output',()=>{
  const e=engine();e.run(`const f=state.dataset.activities.at(-1).flows.find(f=>f.sourceMode==='activity');f.sourceMode='external';f.linkedOutputFlowUri='';f.providerActivityUri='https://example.org/unavailable-passport';`);
  const imported=engine();imported.load(e.export());
  assert.equal(imported.value('activityConnections().length'),0);assert.equal(imported.value('climateReport().nonBonsaiInventory.length'),1);
});

test('contextual labels, assumed quantities and decimal precision agree in both semantic formats',()=>{
  const e=engine();e.run(`const f=state.dataset.activities[0].flows[0];f.derivationTypeUri=NS.flow+'Assumed';f.amount='3.14076082699749e-10';`);
  const graph=e.value('exportGraph()');const flow=graph.find(n=>n['https://w3id.org/mintjesba/pefdpp/flow#hasDerivationType']);
  assert.equal(flow['https://w3id.org/mintjesba/pefdpp/flow#contextualLabel']['@type'],'http://www.w3.org/2001/XMLSchema#string');
  assert.equal(flow['https://w3id.org/mintjesba/pefdpp/flow#hasMeasure']['http://www.ontology-of-units-of-measure.org/resource/om-2/hasNumericalValue']['@value'],'0.000000000314076082699749');
  for (const text of [e.export(),e.run('dppReadText(toJson())')]) {
    const imported=engine();imported.load(text);
    assert.equal(imported.value('state.dataset.activities[0].flows[0].derivationTypeUri'),'https://w3id.org/mintjesba/pefdpp/flow#Assumed');
    assert.equal(imported.value('state.dataset.activities[0].flows[0].amount'),'0.000000000314076082699749');
  }
});

test('Publication PV recovers 89 suppliers, preserves assumed inventory and scales demand once',t=>{
  const file=pvFixtures.full;if(!fs.existsSync(file))return t.skip('Local Desktop inventory unavailable.');
  const e=engine();e.load(fs.readFileSync(file,'utf8'));
  assert.equal(e.value('state.dataset.activities.length'),42);assert.equal(e.value('activityConnections().length'),89);
  assert.deepEqual(e.value('validationIssues()'),[]);assert.equal(e.value('climateReport().backgroundCalculated'),true);
  near(e.value('climateReport().directTotal'),169.42396132668023);near(e.value('climateReport().elementaryTotal'),2.5430542679135715);
  assert.equal(e.value('climateReport().uncharacterisedElementary.length'),191);
  assert.equal(e.value('state.dataset.activities.flatMap(a=>a.flows).filter(f=>f.derivationTypeUri===NS.flow+"Assumed").length'),62);
  const nativeOnly=engine();nativeOnly.load(noPins(e));assert.equal(nativeOnly.value('activityConnections().length'),89);
  near(nativeOnly.value('climateReport().directTotal'),169.42396132668023);
  const before=e.value('climateReport().directTotal');e.run(`state.study.functionalUnit.conversionFactor='2'`);near(e.value('climateReport().directTotal'),2*before);
  for (const text of [e.export(),e.run('dppReadText(toJson())')]) {
    const imported=engine();imported.load(text);assert.equal(imported.value('activityConnections().length'),89);near(imported.value('climateReport().directTotal'),2*before);
    assert.equal(imported.value('state.dataset.activities.flatMap(a=>a.flows).filter(f=>f.derivationTypeUri===NS.flow+"Assumed").length'),62);
  }
});

test('older Desktop PV keeps its 13 activities and original 12 connections without invented background factors',t=>{
  const file='/Users/bafr/Desktop/02_PV_FULL_inventory_publication.ttl';if(!fs.existsSync(file))return t.skip('Local Desktop inventory unavailable.');
  const e=engine();e.load(fs.readFileSync(file,'utf8'));
  assert.equal(e.value('state.dataset.activities.length'),13);assert.equal(e.value('activityConnections().length'),12);
  assert.equal(e.value('state.dataset.activities.flatMap(a=>a.flows).length'),404);
  assert.equal(e.value('climateReport().nonBonsaiInventory.length'),177);
  const imported=engine();imported.load(e.export());assert.equal(imported.value('activityConnections().length'),12);
  assert.equal(imported.value('climateReport().nonBonsaiInventory.length'),177);
});
