const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {engine, fixture, root} = require('./engine.cjs');
const ef = 'https://w3id.org/mintjesba/pefdpp/skos/ef31-elementaryflows#';
const u = 'https://w3id.org/mintjesba/pefdpp/ef31-units#';
const ids = {co2:'08a91e70-3ddc-11dd-923d-0050c2490048',ch4:'08a91e70-3ddc-11dd-9610-0050c2490048',n2o:'08a91e70-3ddc-11dd-94c3-0050c2490048',zero:'08a91e70-3ddc-11dd-9c15-0050c2490048',water:'fe0acd60-3ddc-11dd-ac04-0050c2490048',uptake:'b3d7c693-6465-4aec-86cb-68b4e457fc98'};
function direct(e, id=ids.co2, amount='1', unitUri=u+'Kilogram', direction='output') {
  e.context.testFlow = {flowTypeUri:ef+id,amount,unitUri,direction};
  return e.value('EFClimate.characterise(testFlow,state.dataset.activities[0],state.efClimate.index)');
}
function addEmission(e, amount='1') {
  e.context.emissionUri=ef+ids.co2; e.context.emissionAmount=amount;
  e.run(`state.flowTypes.push({id:'co2',uri:emissionUri,label:'CO2 fossil',className:'ElementaryFlow',ontologyManaged:true,preferredUnitUri:KG_URI});state.dataset.activities[0].flows.push({id:'co2',uri:state.dataset.namespace+'co2',label:'CO2 fossil',direction:'output',flowTypeUri:emissionUri,amount:emissionAmount,unitUri:KG_URI});`);
}
test('acceptance: exact CO2, fossil methane and N2O factors',()=>{
  const e=engine();
  for (const [id,expected] of [[ids.co2,1],[ids.ch4,29.8],[ids.n2o,273]]) {
    const r=direct(e,id);assert.equal(r.ok,true);assert.equal(r.factor,expected);assert.equal(r.contributionKg,expected);assert.equal(r.region,'GLO');
  }
});
test('explicit zero is verified; absent CF is unresolved; uptake uses published negative CF',()=>{
  const e=engine(); assert.equal(direct(e,ids.zero).status,'verified_no_contribution');
  assert.equal(direct(e,ids.water).status,'unresolved');assert.equal(direct(e,ids.water).contributionKg,null);
  assert.equal(direct(e,ids.uptake,'10',u+'Kilogram','input').contributionKg,-10);
});
test('wrong identity, direction, unit, empty and invalid quantities cannot calculate',()=>{
  const e=engine();
  assert.equal(direct(e,'unknown').ok,false);assert.equal(direct(e,ids.co2,'1',u+'Kilogram','input').ok,false);
  assert.equal(direct(e,ids.co2,'1',u+'Megajoule').ok,false);
  for (const value of ['', 'NaN','Infinity','-1',null,true]) assert.equal(direct(e,ids.co2,value).ok,false);
  e.run('state.efClimate.index=null'); assert.equal(direct(e).ok,false);
});
test('recognised OM mass conversions preserve inventory quantity and reject invented unit names',()=>{
  const e=engine();const om='http://www.ontology-of-units-of-measure.org/resource/om-2/';
  for (const [unit,quantity] of [['gram','1000'],['milligram','1000000'],['tonne','0.001']]) assert.equal(direct(e,ids.co2,quantity,om+unit).contributionKg,1);
  assert.equal(direct(e,ids.co2,'1000',u+'Gram').ok,false);
});
test('loading the EF catalogue cannot silently relabel imported quantities or wrong units',()=>{
  const e=engine();addEmission(e,'1000');
  e.run(`state.dataset.activities[0].flows.at(-1).unitUri=NS.unit+'Megajoule';state.elementary.entries=[{uri:emissionUri,label:'CO2 fossil',preferredUnitUri:KG_URI}];reconcileElementaryUnits()`);
  assert.equal(e.value('state.dataset.activities[0].flows.at(-1).unitUri'),u+'Megajoule');
  assert.equal(e.value('state.dataset.activities[0].flows.at(-1).amount'),'1000');
  assert.equal(e.value('climateReport().uncharacterisedElementary.length'),1);
  for(const text of [e.export(),e.run('dppReadText(toJson())')]) {const r=engine();r.load(text);assert.equal(r.value('climateReport().uncharacterisedElementary.length'),1);}
});
test('exact region precedes GLO, unavailable geography factors remain unresolved',()=>{
  const e=engine();
  e.run(`state.efClimate.index.factors.set('${ids.co2}',[['CN','output',2],['GLO','output',1]]);state.dataset.activities[0].geographyUri=CN_URI`);
  assert.equal(direct(e).factor,2);
  e.run(`state.dataset.activities[0].geographyUri=NS.geography+'DE'`); assert.equal(direct(e).factor,1);
  e.run(`state.efClimate.index.factors.set('${ids.co2}',[['CN','output',2]])`);assert.equal(direct(e).ok,false);
  e.run(`state.dataset.activities[0].geographyUri='https://example.org/#CN'`);assert.equal(direct(e).ok,false);
  e.run(`state.dataset.activities[0].geographyUri=NS.geography+'made-up'`);assert.equal(direct(e).ok,false);
});
test('wrong methods, duplicate factors and incomplete index fail closed',()=>{
  const e=engine();
  assert.throws(()=>e.run(`EFClimate.prepare({...climateFactors, metadata:{...climateFactors.metadata,method:{uuid:'wrong'}}})`));
  assert.throws(()=>e.run(`EFClimate.prepare({...climateFactors, metadata:{...climateFactors.metadata,factorCount:0}})`));
  assert.throws(()=>e.run(`EFClimate.prepare({...climateFactors, factors:{...climateFactors.factors,'${ids.co2}':[...climateFactors.factors['${ids.co2}'],...climateFactors.factors['${ids.co2}']]}})`));
});
test('FU scaling is applied once to direct and background; mixed result is never summed',()=>{
  const e=engine();addEmission(e,'5'); e.run(`state.dataset.activities[0].flows.find(f=>f.determining).amount='2'`);
  const first=e.value('climateReport()');assert.equal(first.elementaryTotal,2.5);assert.equal(first.calculated,false);assert.equal(first.elementaryCalculated,true);
  e.run(`state.study.functionalUnit.conversionFactor='2'`);const doubled=e.value('climateReport()');
  assert.equal(doubled.elementaryTotal,5);assert.equal(doubled.directTotal,2*first.directTotal);
  assert.equal(doubled.compatibility.overlapVerified,false);
});
test('nested DPP elementary demand is scaled once and survives both formats',()=>{
  const child=engine();child.load(fixture('child'));addEmission(child,'4');
  const parent=engine();parent.load(fixture('parent',{raw:false,inputQuantity:3}));parent.prepare(child.export());parent.attach('3');
  assert.equal(parent.value('climateReport().elementaryTotal'),12);
  for(const text of [parent.export(),parent.run('dppReadText(toJson())')]) {const e=engine();e.load(text);assert.equal(e.value('climateReport().elementaryTotal'),12);}
});
test('result graph uses existing ContributionResult relations and never asserts full LCIA result',()=>{
  const e=engine();addEmission(e);const graph=e.value('elementaryResultGraph()');
  const ns='https://w3id.org/mintjesba/pefdpp/lcia#';const row=graph.find(n=>n['@type']===ns+'ContributionResult');
  assert.ok(row);assert.equal(row[ns+'forElementaryFlow']['@id'],ef+ids.co2);assert.equal(row[ns+'hasMeasure']['http://www.ontology-of-units-of-measure.org/resource/om-2/hasNumericalValue']['@value'],'1');
  assert.equal(row[ns+'forImpactCategory']['@id'],'https://w3id.org/mintjesba/pefdpp/skos/ef31-impactcategories#ClimateChange');
  assert.ok(!JSON.stringify(graph).includes('hasLCIAResult"'));assert.ok(JSON.stringify(graph).includes('forActivityLink'));
  e.run(`state.study.functionalUnit.conversionFactor='0'`);assert.deepEqual(e.value('elementaryResultGraph()'),[]);
});
const pv='/Users/bafr/Desktop/PV_panel_manufacturing_DEMO_full_inventory_assumptions.ttl';
test('Desktop PV demonstration retains 42 activities, 466 exchanges and 202 elementary exchanges',{skip:!fs.existsSync(pv)},()=>{
  const e=engine();e.load(fs.readFileSync(pv,'utf8'));const r=e.value('climateReport()');
  assert.equal(e.value('state.dataset.activities.length'),42);assert.equal(e.value('state.dataset.activities.flatMap(a=>a.flows).length'),466);
  assert.deepEqual(e.value('validationIssues()'),[]);assert.equal(r.elementaryRows.length,202);assert.equal(r.calculated,false);
  assert.ok(r.elementaryRows.some(row=>row.ok)); assert.ok(r.uncharacterisedElementary.length>0);
});
