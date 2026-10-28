const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {engine}=require('./engine.cjs');
const root=path.resolve(__dirname,'..');
const context=vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(root,'src/climate-characterisation.js'),'utf8'),context);
context.raw=JSON.parse(fs.readFileSync(path.join(root,'data/climate-characterisation-index.json')));
const prepared=vm.runInContext('EFClimate.prepare(raw)',context);
const characterise=vm.runInContext('EFClimate.characterise',context);
const ef='https://w3id.org/mintjesba/pefdpp/skos/ef31-elementaryflows#';
const unit='https://w3id.org/mintjesba/pefdpp/ef31-units#';
const activity={geographyUri:'https://w3id.org/mintjesba/pefdpp/skos/pef-geographies#CN'};
const ids={co2:'08a91e70-3ddc-11dd-923d-0050c2490048',methane:'08a91e70-3ddc-11dd-9610-0050c2490048',n2o:'08a91e70-3ddc-11dd-94c3-0050c2490048',biogenic:'08a91e70-3ddc-11dd-9c15-0050c2490048',water:'fe0acd60-3ddc-11dd-ac04-0050c2490048',uptake:'b3d7c693-6465-4aec-86cb-68b4e457fc98'};
const flow=(id,amount='1',direction='output')=>({flowTypeUri:ef+id,amount,unitUri:unit+'Kilogram',direction});

test('total EF 3.1 uses exact fossil CO2, methane and N2O factors without climate-subcategory double counting',()=>{
 for(const [id,amount,expected] of [[ids.co2,'7',7],[ids.methane,'2',59.6],[ids.n2o,'0.5',136.5]]){
  const r=characterise(flow(id,amount),activity,prepared);assert.equal(r.ok,true);assert.equal(r.contributionKg,expected);assert.equal(r.region,'GLO');
 }
 assert.equal(characterise(flow(ids.biogenic,'100'),activity,prepared).contributionKg,0);
});
test('an exact known flow with no climate CF is explicitly distinguished from a missing mapping',()=>{
 const r=characterise(flow(ids.water,'500'),activity,prepared);assert.equal(r.ok,true);assert.equal(r.factor,null);assert.equal(r.contributionKg,0);
 for(const uri of [ef+'unknown','https://example.org/carbon-dioxide']){
  const missing=characterise({...flow(ids.co2),flowTypeUri:uri},activity,prepared);assert.equal(missing.ok,false);
 }
});
test('resource uptake retains published negative CF and rejects emission direction',()=>{
 const r=characterise(flow(ids.uptake,'10','input'),activity,prepared);assert.equal(r.ok,true);assert.equal(r.factor,-1);assert.equal(r.contributionKg,-10);
 assert.equal(characterise(flow(ids.uptake,'10','output'),activity,prepared).ok,false);
 assert.equal(characterise(flow(ids.co2,'10','input'),activity,prepared).ok,false);
});
test('unloaded method, wrong units and invalid quantities never silently contribute zero',()=>{
 assert.equal(characterise(flow(ids.co2),activity,null).ok,false);
 assert.equal(characterise({...flow(ids.co2),unitUri:unit+'Megajoule'},activity,prepared).ok,false);
 for(const amount of ['','NaN','Infinity','-1'])assert.equal(characterise(flow(ids.co2,amount),activity,prepared).ok,false);
});
test('factor index rejects wrong methods, incomplete coverage and ambiguous factors',()=>{
 const prepare=vm.runInContext('EFClimate.prepare',context);
 assert.throws(()=>prepare({...context.raw,metadata:{...context.raw.metadata,method:{uuid:'fossil-subcategory'}}}));
 assert.throws(()=>prepare({...context.raw,metadata:{...context.raw.metadata,knownFlowCount:0}}));
 const rows=context.raw.factors[ids.co2];
 assert.throws(()=>prepare({...context.raw,factors:{...context.raw.factors,[ids.co2]:[...rows,...rows]}}));
});

function addCO2(e,amount='5'){
 e.context.co2id=ef+ids.co2;e.context.emissionAmount=amount;
 e.run(`state.flowTypes.push({id:'test-co2',uri:co2id,label:'fossil CO2',className:'ElementaryFlow',preferredUnitUri:KG_URI,ontologyManaged:true});
 const a=state.dataset.activities[0];a.flows.push({id:'test-emission',uri:state.dataset.namespace+'test-emission',label:'fossil CO2',flowTypeUri:co2id,amount:emissionAmount,unitUri:KG_URI,direction:'output',determining:false});`);
}
test('foreground batch scaling applies to direct emissions and background supply once',()=>{
 const e=engine();
 e.run(`state.dataset.activities[0].flows.find(f=>f.determining).amount='2';`);
 addCO2(e);
 const r=e.value('climateReport()');assert.equal(r.calculated,true,JSON.stringify(r.reasons));
 // Published BONSAI v2.1.6 global steel factor: 3.28753589 t CO2e/t.
 assert.ok(Math.abs(r.directTotal-(6.57507178/2+5/2))<1e-10);
 assert.equal(r.elementaryTotal,2.5);
 e.run(`state.study.functionalUnit.conversionFactor='3'`);
 assert.ok(Math.abs(e.value('climateReport().directTotal')-3*(6.57507178/2+5/2))<1e-10);
});
test('an emission-only foreground inventory can calculate without a BONSAI dummy input',()=>{
 const e=engine();
 e.run(`const last=state.dataset.activities.at(-1);last.flows=last.flows.filter(f=>f.determining);state.dataset.activities=[last];`);
 addCO2(e,'12');
 const r=e.value('climateReport()');assert.equal(r.calculated,true,JSON.stringify(r.reasons));assert.equal(r.directTotal,12);assert.equal(r.direct.length,0);
});
test('unknown elementary flow remains a blocker after round trip',()=>{
 const e=engine();addCO2(e);
 e.run(`state.dataset.activities[0].flows.at(-1).flowTypeUri='https://example.org/unverified-emission';state.flowTypes.push({id:'unknown',uri:'https://example.org/unverified-emission',label:'unknown',className:'ElementaryFlow'});`);
 e.load(e.export());
 const r=e.value('climateReport()');assert.equal(r.calculated,false);assert.equal(r.uncharacterisedElementary.length,1);
});
const fullPV=path.resolve(root,'../../04_CASE-STUDIES-AND-WORKING-DATA/PV-panel/2026-10-28_full_PV_manufacturing/PV_panel_manufacturing_FULL_Berend_BONSAI.ttl');
test('full PV retains all 404 rows, processes all 202 elementary exchanges, and still blocks on unresolved backgrounds',{skip:!fs.existsSync(fullPV)},()=>{
 const e=engine();e.load(fs.readFileSync(fullPV,'utf8'));
 const r=e.value('climateReport()');
 assert.equal(e.value('state.dataset.activities.length'),13);
 assert.equal(e.value('state.dataset.activities.flatMap(a=>a.flows).length'),404);
 assert.equal(e.value('flowLinks().length'),12);
 assert.deepEqual(e.value('validationIssues()'),[]);
 assert.equal(r.elementaryRows.length,202);
 assert.equal(r.uncharacterisedElementary.length,0,JSON.stringify(r.uncharacterisedElementary.map(r=>[r.flow.label,r.reason])));
 assert.equal(r.nonBonsaiInventory.length,77);assert.equal(r.calculated,false);
 assert.ok(r.elementaryTotal>0);
});
