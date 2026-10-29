// Generate both semantic formats for an independent RDF parser/vocabulary audit.
const fs=require('node:fs');
const {engine,root}=require('./engine.cjs');
const e=engine();
e.load(fs.readFileSync(root+'/examples/pv_full_publication.ttl','utf8'));
fs.writeFileSync('/private/tmp/ef31-pv-result.ttl',e.export());
fs.writeFileSync('/private/tmp/ef31-pv-result.jsonld',e.run('toJson()'));
