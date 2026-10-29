const pvFixtures = require('./pv-fixtures.cjs');
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {engine,fixture,root}=require('./engine.cjs');
function setup() { const e=engine();e.load(fixture('printer',{raw:false,inputQuantity:2}));return e; }
function total(e) { const r=e.value('climateReport()');assert.equal(r.calculated,true,JSON.stringify(r.reasons));return r.directTotal; }
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('batch output and receiving quantity scale supplier inventory correctly',()=>{
  const e=setup();e.prepare(fixture('cartridge',{inputQuantity:3,outputQuantity:2}));e.attach(4);
  near(total(e),6*3.041537783);assert.equal(e.value('state.connectedDpps.length'),1);
  assert.deepEqual(e.value('validationIssues()'),[]);
});
test('three DPP levels compose without multiplying source functional-unit duration',()=>{
  const child=engine();child.load(fixture('cartridge',{raw:false,inputQuantity:4,outputQuantity:2}));
  child.prepare(fixture('material',{inputQuantity:3,outputQuantity:2}));child.attach(4);
  child.run(`state.study.functionalUnit.howLongValue='25'; state.study.functionalUnit.conversionFactor='7';`);
  const e=setup();e.prepare(child.export());e.attach(2);near(total(e),6*3.041537783);
  assert.equal(e.value('state.connectedDpps.length'),2);
  assert.equal(e.value('state.dataset.activities.length'),3);
});
test('Turtle and JSON-LD exports retain source metadata, quantities, types and impact',()=>{
  const e=setup();e.prepare(fixture('cartridge',{inputQuantity:3}));e.attach(2);const before=total(e);
  e.run(`state.connectedDpps[0].study.scope.assumption='Semi; colon, quote " and backslash \\u005c and newline\\nnext line';`);
  const f=engine();f.load(e.export());near(total(f),before);
  assert.equal(f.value('state.connectedDpps.length'),1);
  assert.deepEqual(f.value('state.compatReport.warnings'),[]);
  assert.deepEqual(f.value('state.connectedDpps[0].study'),e.value('state.connectedDpps[0].study'));
  const g=e.value('exportGraph()');assert.ok(g.some(n=>n['@type']==='https://w3id.org/cerise-see/dpp-connections#ConnectedDPP'));
  assert.ok(g.some(n=>n['https://w3id.org/cerise-see/dpp-connections#connectedDPP']));
  const json=engine();json.context.json=e.run('toJson()');json.load(json.run('dppReadText(json)'));near(total(json),before);
  assert.deepEqual(json.value('state.connectedDpps'),f.value('state.connectedDpps'));
});
test('same supplier can be reused for two inputs, stored once, demand summed',()=>{
  const e=setup();e.prepare(fixture('cartridge',{inputQuantity:3}));e.attach(2);
  e.run(`const first=state.dataset.activities[0].flows[0];const second={...dppClone(first),id:'second',uri:state.dataset.namespace+'second',connectedDppUri:'',dppPrevious:null,sourceMode:'external',linkedOutputFlowUri:''}; state.dataset.activities[0].flows.push(second);dppAttach('second',prepared,prepared.study.functionalUnit.referenceFlowUri,3);`);
  assert.equal(e.value('state.dataset.activities.length'),2);near(total(e),15*3.041537783);
  e.run(`dppDisconnect(state.dataset.activities[0].flows[0].id)`);assert.equal(e.value('state.connectedDpps.length'),1);
  e.run(`dppDisconnect('second')`);assert.equal(e.value('state.connectedDpps.length'),0);assert.equal(e.value('state.dataset.activities.length'),1);
});
test('repeated attachment is idempotent, replacement prunes old supplier',()=>{
  const e=setup();e.prepare(fixture('cartridge'));e.attach(2);const before=total(e);e.attach(2);near(total(e),before);
  e.prepare(fixture('new-cartridge',{inputQuantity:4}));e.attach(1);assert.equal(e.value('state.dataset.activities.length'),2);
  assert.equal(e.value('state.connectedDpps[0].title'),'new-cartridge');near(total(e),4*3.041537783);
});
test('disconnect restores original input after Turtle round trip',()=>{
  const e=setup();const original=e.value('state.dataset.activities[0].flows[0]');e.prepare(fixture('cartridge'));e.attach(2);
  const f=engine();f.load(e.export());f.run(`dppDisconnect(state.dataset.activities[0].flows[0].id)`);
  assert.equal(f.value('state.dataset.activities.length'),1);assert.equal(f.value('state.dataset.activities[0].flows[0].flowTypeUri'),original.flowTypeUri);
  assert.equal(f.value('state.dataset.activities[0].flows[0].sourceMode'),original.sourceMode);assert.equal(f.value('state.connectedDpps.length'),0);
});
for(const amount of ['',0,-1,'NaN','Infinity','abc']) test(`invalid demand ${JSON.stringify(amount)} leaves state unchanged`,()=>{
  const e=setup();e.prepare(fixture('cartridge'));const before=e.export();assert.throws(()=>e.attach(amount),/greater than zero/);assert.equal(e.export(),before);
});
test('self attachment and nested source containing the root are rejected atomically',()=>{
  const e=setup();const before=e.export();e.prepare(before);assert.throws(()=>e.attach(1),/itself/);assert.equal(e.export(),before);
});
test('different versions at same activity URI cannot silently overwrite inventory',()=>{
  const e=setup();e.prepare(fixture('cartridge'));e.attach(1);const before=e.export();e.prepare(fixture('cartridge',{inputQuantity:50}));
  assert.throws(()=>e.attach(1),/different inventory/);assert.equal(e.export(),before);
});
test('file errors are explicit and leave existing dataset unchanged',()=>{
  const e=setup(),before=e.export();for(const content of ['nonsense',fixture('broken').slice(0,-30),'{"legacy":"json"}']) assert.throws(()=>e.prepare(content));assert.equal(e.export(),before);
});
test('namespace-local ID collisions do not merge different source activities',()=>{
  const e=setup();e.prepare(fixture('cartridge'));e.attach(1);
  const ids=e.value('state.dataset.activities.flatMap(a=>[a.id,...a.flows.map(f=>f.id)])');assert.equal(new Set(ids).size,ids.length);
});
test('source cycles, missing outputs, incompatible flow units are rejected',()=>{
  const e=setup();e.prepare(fixture('cartridge'));e.run(`prepared.dataset.activities[0].flows[0].sourceMode='activity';prepared.dataset.activities[0].flows[0].linkedOutputFlowUri=prepared.dataset.activities[0].flows[1].uri;prepared.dataset.activities[0].flows[0].flowTypeUri=prepared.dataset.activities[0].flows[1].flowTypeUri;prepared.dataset.activities[0].flows[0].unitUri=prepared.dataset.activities[0].flows[1].unitUri;`);assert.throws(()=>e.attach(1),/cycle/);
  e.prepare(fixture('cartridge'));e.run(`prepared.dataset.activities[0].flows[1].determining=false`);assert.throws(()=>e.attach(1),/determining/);
});
test('separate Turtle subject statements and source notes survive export',()=>{
  const e=engine();e.load(fixture('material')+'\n<https://example.org/material#assembly> <http://purl.org/dc/terms/description> "Original; supplier note" .\n');
  assert.equal(e.value('state.dataset.activities[0].note'),'Original; supplier note');const f=engine();f.load(e.export());assert.equal(f.value('state.dataset.activities[0].note'),'Original; supplier note');near(total(e),total(f));
});
test('default two-activity steel example remains calculated',()=>{
  const e=engine();near(total(e),6.57507178);
});
test('project PV selected input example has stable impact and no round-trip type warnings',(t)=>{
  const file=pvFixtures.simplified;
  if(!fs.existsSync(file)) return t.skip('Local CE-RISE project fixture is not included in the public repository.');
  const e=engine();e.load(fs.readFileSync(file,'utf8'));near(total(e),48.42400013063052);
  const f=engine();f.load(e.export());near(total(f),total(e));assert.deepEqual(f.value('state.compatReport.warnings'),[]);
});
test('project full PV preserves all external providers and internal connections',(t)=>{
  const file='/Users/bafr/Desktop/02_PV_FULL_inventory_publication.ttl';
  if(!fs.existsSync(file)) return t.skip('Local CE-RISE project fixture is not included in the public repository.');
  const e=engine();e.load(fs.readFileSync(file,'utf8'));const before=e.value('state.dataset.activities.flatMap(a=>a.flows).filter(f=>f.providerActivityUri).map(f=>f.providerActivityUri).sort()');
  const f=engine();f.load(e.export());assert.deepEqual(f.value('state.dataset.activities.flatMap(a=>a.flows).filter(f=>f.providerActivityUri).map(f=>f.providerActivityUri).sort()'),before);
  assert.equal(f.value('activityConnections().length'),12);assert.deepEqual(f.value('state.compatReport.warnings'),[]);
});
test('attaching a nested DPP never changes the parent study definition',()=>{
  const e=setup();const study=e.value('state.study');e.prepare(fixture('cartridge'));e.attach(1);assert.deepEqual(e.value('state.study'),study);
});
test('different source study context at the same version URI is rejected atomically',()=>{
  const e=setup();e.prepare(fixture('cartridge'));e.attach(1);const before=e.export();e.run(`prepared.study.scope.assumption='Changed scope'`);assert.throws(()=>e.attach(1),/study context/);assert.equal(e.export(),before);
});
test('unrelated source activities are excluded from the connected output closure',()=>{
  const e=setup();e.prepare(fixture('cartridge'));e.run(`const unrelated=dppClone(prepared.dataset.activities[0]);unrelated.id='unused';unrelated.uri+='-unused';unrelated.flows.forEach(f=>{f.id+='-unused';f.uri+='-unused'});prepared.dataset.activities.push(unrelated)`);
  e.attach(1);assert.equal(e.value('state.dataset.activities.length'),2);near(total(e),2*3.041537783);
});
test('selecting a nested supplier output retains the containing passport provenance',()=>{
  const child=engine();child.load(fixture('cartridge',{raw:false}));child.prepare(fixture('plastic'));child.attach(1);
  const e=setup();e.prepare(child.export());e.run(`dppAttach(state.dataset.activities[0].flows[0].id,prepared,'https://example.org/plastic#out',3)`);
  assert.equal(e.value('state.dataset.activities.length'),2);
  assert.equal(e.value('state.connectedDpps.length'),2);
  assert.ok(e.run(`dppSourceCard(state.dataset.activities[0].flows[0])`).includes('Replace DPP'));
  near(total(e),6*3.041537783);
  for(const format of ['toTtl()','dppReadText(toJson())']) {
    const roundtrip=engine();roundtrip.load(e.run(format));near(total(roundtrip),total(e));
    assert.deepEqual(roundtrip.value('state.compatReport.warnings'),[]);
    assert.equal(roundtrip.value('state.connectedDpps.length'),2);
    roundtrip.run(`dppDisconnect(state.dataset.activities[0].flows[0].id)`);
    assert.equal(roundtrip.value('state.connectedDpps.length'),0);
  }
});
test('unit and flow type mismatches within a source connection are rejected',()=>{
  const child=engine();child.load(fixture('cartridge',{raw:false}));child.prepare(fixture('plastic'));child.attach(1);
  const e=setup();e.prepare(child.export());e.run(`prepared.dataset.activities[0].flows[0].unitUri=KG_URI`);assert.throws(()=>e.attach(1),/must match/);
});
test('output and receiving input removal cannot silently attach to another record',()=>{
  const e=setup();e.prepare(fixture('cartridge'));e.run(`prepared.study.functionalUnit.referenceFlowUri='https://missing.test/output'`);assert.throws(()=>e.attach(1),/determining/);
  e.prepare(fixture('cartridge'));e.run(`state.dataset.activities[0].flows=state.dataset.activities[0].flows.filter(f=>f.direction==='output')`);assert.throws(()=>e.attach(1));
});
test('source namespace aliases and compact single-line Turtle parse correctly',()=>{
  const e=setup();const ttl=fixture('cartridge').replaceAll('@prefix flow:', '@prefix exchange:').replaceAll('flow:', 'exchange:').replaceAll('\n',' ');
  e.prepare(ttl);e.attach(1);near(total(e),2*3.041537783);
});
test('HTML and script-looking source labels remain escaped in the UI',()=>{
  const e=setup();e.prepare(fixture('cartridge'));e.run(`prepared.dataset.title='<img src=x onerror=alert(1)>'`);e.attach(1);
  const card=e.run(`dppSourceCard(state.dataset.activities[0].flows[0])`);assert.ok(!card.includes('<img'));assert.ok(card.includes('&lt;img'));
});
test('JSON-LD connection input works and legacy JSON is rejected',()=>{
  const supplier=engine();supplier.load(fixture('cartridge'));const e=setup();e.prepare(supplier.run('toJson()'));e.attach(1);near(total(e),2*3.041537783);
  assert.throws(()=>e.prepare('{"data":"legacy"}'),/legacy/);
});
test('nested root containing this printer is detected before any mutation',()=>{
  const child=engine();child.load(fixture('cartridge',{raw:false}));child.prepare(fixture('printer'));child.attach(1);
  const e=setup();const before=e.export();e.prepare(child.export());assert.throws(()=>e.attach(1),/itself/);assert.equal(e.export(),before);
});
test('project Lexmark rejects removed vocabulary before calculating native inventories',(t)=>{
  const folder=path.resolve(root,'../../04_CASE-STUDIES-AND-WORKING-DATA/Lexmark-printer/2026-10-12_nested_DPP_demo');
  const connected=path.join(folder,'04_Printer_with_Cartridge_CONNECTED_backup.ttl');if(!fs.existsSync(connected))return t.skip('Local Lexmark project fixture is not included in the public repository.');
  const text=fs.readFileSync(connected,'utf8'),e=engine();if(/prs:FlowLink/.test(text)){assert.throws(()=>e.load(text),/FlowLink terms outside/);return;}
  const data=JSON.parse(fs.readFileSync(path.join(folder,'verification.json')));e.load(text);
  const catalogue=JSON.parse(fs.readFileSync(path.join(root,'data/bonsai-catalogue-index.json')));
  const lookup=(code,region,unit)=>catalogue.entries.find(x=>x[0]===code)[3].find(x=>x[0]===region&&x[1]===unit)[2];
  const hardware=74.7*lookup('M_STEL','CN','tonnes')+39.49*lookup('M_PLAS','CN','tonnes')+1.69*lookup('M_GLAS_01_RES','CN','tonnes')+4.65*lookup('M_ELMA','CN','tonnes')+0.0577*lookup('M_CHEM','CN','tonnes')+18/1e6*lookup('M_electricity','CN','TJ')*1000;
  const cart=data.cartridgeOriginalRows.rows.reduce((sum,row)=>{ const [originalCode,region]=row.source.replace('BONSAI ','').split('|'); const code=originalCode==='M_RUBP'?'M_RUBP_01_RES':originalCode==='A_POWG'?'M_electricity':originalCode; const amount=row.unit==='kWh'?row.quantity*3.6/1e6*1000:row.quantity; return sum+amount*lookup(code,region,row.unit==='kg'?'tonnes':'TJ'); },0);
  near(total(e),hardware+cart);near(total(e),data.climateKg);assert.equal(e.value('activityConnections().length'),9);assert.deepEqual(e.value('validationIssues()'),[]);
  const roundtrip=engine();roundtrip.load(e.export());near(total(roundtrip),total(e));assert.equal(roundtrip.value('state.connectedDpps.length'),2);
});
test('different receiving and supplier units use explicit new demand, with no silent mass/item conversion',()=>{
  const e=setup();e.run(`state.dataset.activities[0].flows[0].unitUri=KG_URI;state.dataset.activities[0].flows[0].amount='100'`);
  e.prepare(fixture('cartridge'));e.attach(1);assert.equal(e.value('state.dataset.activities[0].flows[0].unitUri'),'https://w3id.org/mintjesba/pefdpp/ef31-units#Item');near(total(e),2*3.041537783);
});
test('project Lexmark files follow the strict vocabulary policy before calculation',(t)=>{
  const folder=path.resolve(root,'../../04_CASE-STUDIES-AND-WORKING-DATA/Lexmark-printer/2026-10-12_nested_DPP_demo');
  if(!fs.existsSync(folder))return t.skip('Local Lexmark project fixture is not included in the public repository.');
  for(const file of ['01_Printer_DPP_import_first.ttl','02_Cartridge_DPP_nested.ttl','02a_Cartridge_before_nested_supply.ttl','03_Plastic_supply_DPP.ttl','04_Printer_with_Cartridge_CONNECTED_backup.ttl']){
    const e=engine(),text=fs.readFileSync(path.join(folder,file),'utf8');if(/prs:FlowLink/.test(text)){assert.throws(()=>e.load(text),/FlowLink terms outside/);continue;}e.load(text);total(e);assert.deepEqual(e.value('validationIssues()'),[],file);assert.deepEqual(e.value('state.compatReport.warnings'),[],file);
  }
});
test('real PV source can be attached and scaled through a parent input',(t)=>{
  const file=pvFixtures.simplified;if(!fs.existsSync(file))return t.skip('Local CE-RISE project fixture is not included in the public repository.');
  const e=setup();e.prepare(fs.readFileSync(file,'utf8'));e.attach(2);near(total(e),2*48.42400013063052);assert.deepEqual(e.value('validationIssues()'),[]);
});
test('project Viessmann checks publication vocabulary before propagating demand',(t)=>{
  const file=path.resolve(root,'../../05_PRESENTATIONS-AND-PUBLICATIONS/Presentations/2026-10-06_Viessmann_SEE_workshop/demo/viessmann/01_Viessmann_indoor_selected_inputs_canonical.ttl');if(!fs.existsSync(file))return t.skip('Local CE-RISE project fixture is not included in the public repository.');
  const source=fs.readFileSync(file,'utf8');const baseline=engine();if(/prs:FlowLink/.test(source)){assert.throws(()=>baseline.load(source),/FlowLink terms outside/);return;}baseline.load(source);const e=setup();e.prepare(source);e.attach(3);near(total(e),3*total(baseline));assert.deepEqual(e.value('validationIssues()'),[]);
});
