const test = require('node:test');
const assert = require('node:assert/strict');
const {engine} = require('./engine.cjs');

function preview(count = 2) {
 const e = engine();
 e.context.count = count;
 e.run(`while (state.dataset.activities.length < count) {
   const item = JSON.parse(JSON.stringify(state.dataset.activities[0]));
   item.id += '-' + state.dataset.activities.length;
   item.uri += '-' + state.dataset.activities.length;
   item.flows = []; state.dataset.activities.push(item);
 }`);
 const nodes = new Map([['graphPreview', {innerHTML:''}], ['systemGraph', {open:true}]]);
 e.context.document = {getElementById(id) {return nodes.get(id) || null;}};
 e.run('renderGraph()');
 return {e,nodes};
}

test('both network disclosures default open for up to four activities',()=>{
 for (const count of [2,4]) {
  const {e,nodes} = preview(count);
  assert.equal(nodes.get('systemGraph').open,true);
  assert.match(nodes.get('graphPreview').innerHTML,/<details id="activityNetwork"[^>]* open>/);
 }
});

test('both network disclosures default closed above four activities',()=>{
 const {nodes} = preview(5);
 assert.equal(nodes.get('systemGraph').open,false);
 assert.doesNotMatch(nodes.get('graphPreview').innerHTML,/<details id="activityNetwork"[^>]*\bopen\b/);
 assert.match(nodes.get('graphPreview').innerHTML,/<summary><h3>Activity network<\/h3>/);
});

test('manual choices survive re-rendering and do not change either semantic export',()=>{
 const {e,nodes} = preview(5),ttl=e.export(),json=e.run('toJson()');
 e.run(`rememberGraphDisclosure({id:'systemGraph',open:true,isConnected:true});rememberGraphDisclosure({id:'activityNetwork',open:true,isConnected:true});renderGraph()`);
 assert.equal(nodes.get('systemGraph').open,true);
 assert.match(nodes.get('graphPreview').innerHTML,/<details id="activityNetwork"[^>]* open>/);
 e.run(`rememberGraphDisclosure({id:'activityNetwork',open:false,isConnected:true});renderGraph()`);
 assert.doesNotMatch(nodes.get('graphPreview').innerHTML,/<details id="activityNetwork"[^>]*\bopen\b/);
 assert.equal(e.export(),ttl);assert.equal(e.run('toJson()'),json);
});

test('crossing the threshold or importing a new dataset restores appropriate defaults',()=>{
 const {e,nodes} = preview(4);
 e.run(`state.dataset.activities.push({...state.dataset.activities[0],id:'fifth',flows:[]});renderGraph()`);
 assert.equal(nodes.get('systemGraph').open,false);
 e.run(`rememberGraphDisclosure({id:'systemGraph',open:true,isConnected:true});state.dataset=JSON.parse(JSON.stringify(state.dataset));renderGraph()`);
 assert.equal(nodes.get('systemGraph').open,false);
 e.run('state.dataset.activities.pop();renderGraph()');
 assert.equal(nodes.get('systemGraph').open,true);
});

test('late toggle events from a replaced network element cannot overwrite current choices',()=>{
 const {e,nodes} = preview(5);
 e.run(`rememberGraphDisclosure({id:'systemGraph',open:true,isConnected:false});rememberGraphDisclosure({id:'activityNetwork',open:true,isConnected:false});renderGraph()`);
 assert.equal(nodes.get('systemGraph').open,false);
 assert.doesNotMatch(nodes.get('graphPreview').innerHTML,/<details id="activityNetwork"[^>]*\bopen\b/);
});
