"""Independent RDF/ontology audit of just the new result subgraph, not a claim
that every pre-existing app predicate conforms to all publication restrictions.
"""
from pathlib import Path
from rdflib import Graph, Namespace, RDF, URIRef
from rdflib.compare import isomorphic

root = Path('/Users/bafr/_CE-RISE/02_ONTOLOGY-AND-DATA-MODEL/Current-publication-ontology/ontology')
ontology = Graph()
for relative in ['pefstudy/lcia.ttl', 'pefstudy/pefstudy.ttl', 'ef/ef31-lciamethods.ttl', 'ef/ef31-impactindicators.ttl', 'skos/ef31-impactcategories.ttl', 'ef/ef31-units.ttl']:
    ontology.parse(root / relative, format='turtle')
lcia=Namespace('https://w3id.org/mintjesba/pefdpp/lcia#')
ps=Namespace('https://w3id.org/mintjesba/pefdpp/pefstudy#')
om=Namespace('http://www.ontology-of-units-of-measure.org/resource/om-2/')
cat=URIRef('https://w3id.org/mintjesba/pefdpp/skos/ef31-impactcategories#ClimateChange')
ttl=Graph().parse('/private/tmp/ef31-pv-result.ttl',format='turtle')
json=Graph().parse('/private/tmp/ef31-pv-result.jsonld',format='json-ld')
assert isomorphic(ttl,json), 'Turtle and JSON-LD graphs differ'
rows=list(ttl.subjects(RDF.type,lcia.ContributionResult))
assert len(rows)==11
for predicate in [ps.hasContributionResult,lcia.forImpactCategory,lcia.hasMeasure,lcia.forElementaryFlow,lcia.forActivityLink,lcia.forLifeCycleStage,lcia.hasLCIAResultType,lcia.calculatedByMethod,lcia.hasIndicatorUnit]:
    assert (predicate,None,None) in ontology, f'Undeclared result predicate: {predicate}'
for row in rows:
    assert (row,lcia.forImpactCategory,cat) in ttl
    assert (row,lcia.hasLCIAResultType,lcia.Characterised) in ttl
    for predicate in [lcia.forElementaryFlow,lcia.forActivityLink,lcia.forLifeCycleStage,lcia.hasMeasure]:
        assert len(list(ttl.objects(row,predicate)))==1
    measure=ttl.value(row,lcia.hasMeasure)
    assert ttl.value(measure,om.hasUnit)==URIRef('https://w3id.org/mintjesba/pefdpp/ef31-units#kgCO2Eq')
    assert ttl.value(measure,om.hasNumericalValue) is not None
assert not list(ttl.triples((None,ps.hasLCIAResult,None))), 'Partial contributions must not become a full LCIA result'
print('RDF audit passed: equivalent Turtle/JSON-LD; 11 ContributionResults; only declared result relations; existing ClimateChange category and kgCO2Eq unit.')
