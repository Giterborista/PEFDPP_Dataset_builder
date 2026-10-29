const pvFixtures = require('./pv-fixtures.cjs');
// Generate both semantic formats for an independent RDF parser/vocabulary audit.
const fs=require('node:fs');
const {engine,root}=require('./engine.cjs');
if (!fs.existsSync(pvFixtures.full)) throw new Error('Local PV inventory unavailable. Set PEFDPP_PV_FULL_FILE to its Turtle path.');
const e=engine();
e.load(fs.readFileSync(pvFixtures.full,'utf8'));
fs.writeFileSync('/private/tmp/ef31-pv-result.ttl',e.export());
fs.writeFileSync('/private/tmp/ef31-pv-result.jsonld',e.run('toJson()'));
