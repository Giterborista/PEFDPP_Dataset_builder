// Generate both semantic formats for an independent RDF parser/vocabulary audit.
const fs=require('node:fs');
const {engine}=require('./engine.cjs');
const e=engine();
e.load(fs.readFileSync('/Users/bafr/Desktop/PV_panel_manufacturing_DEMO_full_inventory_assumptions.ttl','utf8'));
fs.writeFileSync('/private/tmp/ef31-pv-result.ttl',e.export());
fs.writeFileSync('/private/tmp/ef31-pv-result.jsonld',e.run('toJson()'));
