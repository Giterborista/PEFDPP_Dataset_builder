const pvFixtures = require('./pv-fixtures.cjs');
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {engine,root}=require('./engine.cjs');
const prs='https://w3id.org/mintjesba/pefdpp/product-system#';

for(const term of ['FlowLink','hasFlowLink','flowFrom','toFlow']) {
  test(`removed ${term} is rejected as an aliased or full RDF identity without changing inventory`,()=>{
    const e=engine(),before=e.export();
    for(const iri of ['old:'+term,'<'+prs+term+'>']) {
      const triple=term==='FlowLink'?`<https://example.org/removed> a ${iri} .`:`<https://example.org/removed> ${iri} <https://example.org/output> .`;
      const text=before+'\n@prefix old: <'+prs+'> .\n'+triple;
      assert.throws(()=>e.load(text),/FlowLink terms outside the publication ontology/);
      assert.equal(e.export(),before);
      assert.throws(()=>e.prepare(text),/FlowLink terms outside/);
      assert.equal(e.export(),before);
    }
  });
}

test('removed classes and properties are rejected in JSON-LD and schema declarations',()=>{
  const e=engine(),before=e.export();
  for(const node of [
    {'@id':'https://example.org/removed','@type':'old:FlowLink'},
    {'@id':'https://example.org/removed','old:hasFlowLink':{'@id':'https://example.org/edge'}},
    {'@id':prs+'FlowLink','@type':'http://www.w3.org/2002/07/owl#Class'}
  ]) {
    const json=JSON.stringify({'@context':{old:prs},'@graph':[...e.value('exportGraph()'),node]});
    e.context.file=json;
    assert.throws(()=>e.load(e.run('dppReadText(file)')),/FlowLink terms outside/);
    assert.throws(()=>e.prepare(json),/FlowLink terms outside/);
    assert.equal(e.export(),before);
  }
});

test('descriptions and comments may explain removed vocabulary without asserting it',()=>{
  const e=engine(),text=e.export()+`\n# prs:FlowLink is not used.\n<https://example.org/note> <http://purl.org/dc/terms/description> "Do not use prs:FlowLink or ${prs}hasFlowLink." .`;
  assert.doesNotThrow(()=>e.load(text));assert.equal(e.value('activityConnections().length'),1);
});

for(const [name,file,activities,flows,connections,kg] of [
  ['full',pvFixtures.full,42,466,89,169.42396132668023],
  ['simplified',pvFixtures.simplified,3,14,2,48.42400013063052]
]) {
  test(`local ${name} PV retains connections, source quantities and separate climate status`,{skip:!fs.existsSync(file)},()=>{
    const e=engine();e.load(fs.readFileSync(file,'utf8'));
    assert.equal(e.value('state.dataset.activities.length'),activities);
    assert.equal(e.value('state.dataset.activities.flatMap(a=>a.flows).length'),flows);
    assert.equal(e.value('activityConnections().length'),connections);
    assert.deepEqual(e.value('validationIssues()'),[]);
    assert.ok(Math.abs(e.value('climateReport().directTotal')-kg)<1e-9);
    assert.equal(e.value('climateReport().backgroundCalculated'),true);
    for(const format of ['toTtl()','dppReadText(toJson())']) {
      const imported=engine();imported.load(e.run(format));
      assert.equal(imported.value('activityConnections().length'),connections);
      assert.equal(imported.value('state.dataset.activities.flatMap(a=>a.flows).length'),flows);
      assert.ok(Math.abs(imported.value('climateReport().directTotal')-kg)<1e-9);
    }
  });
}
