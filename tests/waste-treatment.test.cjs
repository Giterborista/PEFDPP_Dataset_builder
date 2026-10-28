const test=require('node:test');
const assert=require('node:assert/strict');
const {engine}=require('./engine.cjs');

function wasteCase(className='WasteFlow') {
 const e=engine();e.context.initialClass=className;
 e.run(`state.study.scope.impactCategoryUris=state.studyOptions.impactCategories.map(c=>c.uri);const wasteType={id:'waste-paper-type',uri:state.dataset.namespace+'waste-paper-type',label:'Waste paper',className:initialClass,ontologyManaged:false,preferredUnitUri:'',search:''};state.flowTypes.push(wasteType);
 const waste={id:'waste-paper',uri:state.dataset.namespace+'waste-paper',label:'Waste paper for end-of-life treatment',direction:'output',flowTypeUri:wasteType.uri,amount:'2',unitUri:KG_URI,determining:false,sourceMode:'',bonsaiSearch:'recycling of paper'};state.dataset.activities[0].flows.push(waste);`);
 return e;
}
function choose(e,code,region='DE') {
 e.context.chosenCode=code;e.context.chosenRegion=region;
 e.run(`const treatment=state.bonsai.entries.find(x=>x.code===chosenCode);const offer=treatment.offerings.find(o=>o.region===chosenRegion&&o.referenceUnit==='tonnes (service)');if(!offer)throw Error('Missing physical treatment provider');waste.sourceMode='bonsai';waste.providerActivityUri=offer.activityUri;waste.backgroundProvider={code:treatment.code,region:offer.region,referenceUnit:offer.referenceUnit};bonsaiFlowType(waste,treatment);`);
}

test('outgoing waste search includes ProductFlow-class recycling services but excludes virgin-material markets',()=>{
 const e=wasteCase();
 assert.ok(e.value('bonsaiChoices(waste).map(x=>x.code)').includes('M_PAPR'));
 e.run(`waste.bonsaiSearch='M_STEL'`);
 assert.deepEqual(e.value('bonsaiChoices(waste).map(x=>x.code)'),[]);
 e.run(`waste.bonsaiSearch='landfill'`);
 assert.ok(e.value('bonsaiChoices(waste).length')>0);
});
test('the BONSAI treatment search is visible for a new or imported unresolved waste output',()=>{
 const e=wasteCase();const nodes=new Map();
 e.context.document={getElementById(id){if(!nodes.has(id))nodes.set(id,{innerHTML:'',disabled:false});return nodes.get(id);}};
 e.run(`state.activeActivityId=state.dataset.activities[0].id;state.editingFlowId=waste.id;renderFlows()`);
 const html=nodes.get('flowsList').innerHTML;
 assert.match(html,/Select BONSAI waste treatment/);
 assert.match(html,/Search BONSAI waste treatment or recycling/);
 assert.match(html,/data-bonsai-search-flow="waste-paper"/);
 assert.match(html,/adds the impact of treating this waste/);
});
test('selecting recycling preserves waste identity and counts its treatment exactly once with batch scaling',()=>{
 const e=wasteCase();e.run(`state.dataset.activities[0].flows.find(f=>f.determining).amount='2'`);
 const baseline=e.value('climateReport().backgroundTotal');choose(e,'M_PAPR');
 assert.equal(e.value('getFlowType(waste.flowTypeUri).className'),'WasteFlow');
 assert.equal(e.value('waste.flowTypeUri'),e.value('wasteType.uri'));
 const r=e.value('climateReport()');
 assert.equal(r.calculated,true,JSON.stringify(r.reasons));
 const expected=e.value('Number(selectedBonsaiOffering(waste).gwp100)'); // 2 kg / batch of 2 = 1 kg
 assert.ok(Math.abs(r.directTotal-(baseline+expected))<1e-10);
 assert.equal(r.direct.filter(x=>x.flow.id==='waste-paper').length,1);
});
test('recycling selection, WasteFlow class and impact survive Turtle and JSON-LD round trips',()=>{
 const e=wasteCase();choose(e,'M_PAPR');
 const expected=e.value('climateReport().directTotal');
 for(const text of [e.export(),e.run('dppReadText(toJson())')]){
  const imported=engine();imported.load(text);
  assert.deepEqual(imported.value('validationIssues()'),[]);
  assert.equal(imported.value(`getFlowType(state.dataset.activities.flatMap(a=>a.flows).find(f=>f.uri.endsWith('#waste-paper')).flowTypeUri).className`),'WasteFlow');
  const report=imported.value('climateReport()');assert.equal(report.calculated,true,JSON.stringify(report.reasons));
  assert.ok(Math.abs(report.directTotal-expected)<1e-10);
 }
});
test('missing or incompatible waste treatment blocks calculation and can never silently become zero',()=>{
 const e=wasteCase();assert.equal(e.value('climateReport().calculated'),false);
 assert.ok(e.value('activityValidationItems(state.dataset.activities[0]).length')>0);
 choose(e,'M_UN_LAND');e.run(`waste.unitUri=NS.unit+'TonneKilometre'`);
 const r=e.value('climateReport()');assert.equal(r.calculated,false);assert.equal(r.unresolvedBonsai.length,1);
 assert.match(r.unresolvedBonsai[0].reason,/cannot be converted/);
});
test('changing a previously mapped output to WasteFlow clears stale providers and opens treatment lookup',()=>{
 const e=wasteCase('ProductFlow');
 e.context.HTMLTextAreaElement=class {};
 e.run(`waste.sourceMode='bonsai';waste.providerActivityUri=NS.bonsai+'ACT_M_STEL__Global';waste.backgroundProvider={code:'M_STEL',region:'Global',referenceUnit:'tonnes'};state.activeActivityId=state.dataset.activities[0].id;renderFlows=()=>{};refreshDerivedViews=()=>{};`);
 e.context.event={type:'change',target:{dataset:{flowClass:'waste-paper'},value:'WasteFlow'}};
 e.run('handleEditorEvent(event)');
 assert.equal(e.value('getFlowType(waste.flowTypeUri).className'),'WasteFlow');
 assert.equal(e.value('waste.sourceMode'),'bonsai');
 assert.equal(e.value('waste.providerActivityUri'),'');
 assert.equal(e.value('waste.backgroundProvider'),null);
});
