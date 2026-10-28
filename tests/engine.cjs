const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
function engine() {
  const context = vm.createContext({ console, URL, setTimeout, clearTimeout });
  const run = (code) => vm.runInContext(code, context);
  run(fs.readFileSync(path.join(root, 'src/dpp-connections.js'), 'utf8'));
  run(fs.readFileSync(path.join(root, 'src/climate-characterisation.js'), 'utf8'));
  run(fs.readFileSync(path.join(root, 'src/app.js'), 'utf8').split('document.addEventListener("input", handleEditorEvent);')[0]);
  context.options = JSON.parse(fs.readFileSync(path.join(root, 'data/ontology-options.json')));
  context.studyOptions = JSON.parse(fs.readFileSync(path.join(root, 'data/study-options.json')));
  context.catalogue = JSON.parse(fs.readFileSync(path.join(root, 'data/bonsai-catalogue-index.json')));
  context.climateIndex = JSON.parse(fs.readFileSync(path.join(root, 'data/climate-characterisation-index.json')));
  run(`state.ontologyOptions = {...options, ready:true}; state.studyOptions = {...studyOptions, ready:true};
    state.characterisation.index=EFClimate.prepare(climateIndex);
    state.bonsai.entries=catalogue.entries.map(([code,label,className,offerings])=>({code,label,className,
      offerings:offerings.map(([region,referenceUnit,gwp100,emissionUnit,activityUri])=>({region,referenceUnit,gwp100,emissionUnit,activityUri})).filter(o=>o.activityUri)})).filter(e=>e.offerings.length);`);
  return { context, run, load(ttl) { context.ttl = ttl; run(`{ const loaded=parseTtlSubset(ttl); state.dataset=loaded.dataset;state.productSystem=loaded.productSystem;state.flowTypes=loaded.flowTypes;state.study=loaded.study;state.connectedDpps=loaded.connectedDpps;state.compatReport=loaded.report;reconcileImportedBonsaiSources(); }`); },
    value(code) { return JSON.parse(JSON.stringify(run(code))); },
    prepare(ttl) { context.nextTtl = ttl; run(`globalThis.prepared=dppPrepare(nextTtl,"test.ttl")`); },
    attach(amount = '1') { context.amount = amount; return run(`dppAttach(state.dataset.activities[0].flows.find(f=>f.direction==='input').id,prepared,prepared.study.functionalUnit.referenceFlowUri,amount)`); },
    export() { return run('toTtl()'); } };
}
function fixture(name, {inputQuantity=2, outputQuantity=1, raw=true}={}) {
  const e=engine(); e.context.name=name;e.context.config={inputQuantity,outputQuantity,raw};
  e.run(`const ns='https://example.org/'+name+'#';state.connectedDpps=[];
    state.dataset={uri:ns+'dataset',namespace:ns,title:name,type:'DPP',complianceLevel:'NotEFCompliant',activities:[]};
    state.productSystem={uri:ns+'system',name};
    state.flowTypes=[{id:'product',uri:ns+'product',label:name,className:'ProductFlow',ontologyManaged:false},
      {id:'input',uri:config.raw?NS.bonsai+'FT_M_STEL':ns+'input',label:'input',className:'ProductFlow',ontologyManaged:config.raw}];
    state.dataset.activities=[{id:'assembly',uri:ns+'assembly',activityLinkUri:ns+'link',name:name+' assembly',activityTypeUri:ns+'assembly-type',activityTypeLabel:'Manufacturing',geographyUri:CN_URI,lifeCycleStageUri:NS.productSystem+'Manufacturing',companySpecific:false,
      flows:[{id:'input',uri:ns+'in',label:'input',direction:'input',flowTypeUri:state.flowTypes[1].uri,amount:String(config.inputQuantity),unitUri:config.raw?KG_URI:NS.unit+'Item',sourceMode:config.raw?'bonsai':'external',providerActivityUri:config.raw?NS.bonsai+'ACT_M_STEL__CN':''},
      {id:'output',uri:ns+'out',label:name,direction:'output',flowTypeUri:ns+'product',amount:String(config.outputQuantity),unitUri:NS.unit+'Item',determining:true}]}];
    state.study=defaultStudy(ns,ns+'out',name+' demonstration'); state.study.functionalUnit.howMuchUnitUri=NS.unit+'Item'; state.study.scope.limitation='Research demonstration; no verified footprint.';reconcileImportedBonsaiSources();`);
  return e.export();
}
module.exports={engine,fixture,root};
