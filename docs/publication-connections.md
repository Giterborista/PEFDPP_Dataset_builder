# Product systems using the supplied publication ontology

The authoritative local schema is the supplied `Current-publication-ontology`
snapshot. Its `lci/activity.ttl`, `lci/flow.ttl`, `lci/dataset.ttl`,
`pefstudy/product-system.ttl` and `pefstudy/lcia.ttl` define the terms used here.
No `FlowLink`, `hasFlowLink`, `flowFrom` or `toFlow` is written by either export.
Files using any of those terms are rejected before inventory state changes;
there is no legacy import or automatic migration path. Original source files
are retained outside the app as backups. Internal JavaScript edges are implementation objects, not
additional ontology classes or exported RDF predicates.

## The publication relationships

- A ProductSystem has ActivityLinks; each identifies an Activity and its stage.
- Contextual Flow exchanges refer to their activity through inputOf/outputOf.
- Each Flow has exactly one FlowType and an OM measure.
- FlowType.sourcedFrom identifies the LCIDataset declaring that FlowType.
- That dataset contains activities, whose determining output flows have exact
  FlowType identifiers and reference quantities.

ActivityLink describes system membership/stage; it is not a producer-consumer
edge. The supplying output and receiving input can remain separate Flow
instances with different amounts per their respective activity reference basis.
They must not be merged merely because they have the same FlowType.

## Explicit calculation profile — not an asserted OWL inference

For an unresolved ProductFlow input, the importer examines the activity outputs
in its FlowType's declared source dataset and in the selected product system.
It uses a supplier only when there is exactly one determining output with the
identical FlowType URI. No label, spelling, geography proximity, unit similarity
or arbitrary first match selects a producer. A different unit does not select a
different supplier: it remains an incompatible connection until corrected.
Multiple producers remain unresolved and are shown to the user.

An exact output URI recorded using the existing external-standard
`dcterms:source` may pin a user-selected output. This is source provenance and a
documented application convention; DCTERMS does not itself define a dedicated
LCI supply relation. The importer validates the referenced output's ownership,
system membership, exact FlowType and unit. An unknown explicit external source
is never silently replaced with a matching foreground producer.

The ontology describes data; it does not implement an LCA solver. This profile
is the disclosed deterministic rule used to turn those data into a demand
graph. For the Desktop publication PV inventory, all 89 connections can be
resolved through the native FlowType/source-dataset path even with all output
provenance pins removed. The older 13-activity PV file has 12 such connections.

Quantity scaling is unchanged:

    supplier runs = receiver runs × input amount / supplier reference output amount

Each activity inventory is expressed per its own reference output. Distinct
receiving quantities are retained, shared supplier demand is summed, cycles and
invalid quantities are rejected, and functional-unit scaling is applied once.
No source-DPP lifetime or source functional-unit multiplier is added.

## Inventory and results

Contextual labels follow the publication's xsd:string range. DerivationType
annotations, including Assumed, survive both formats. Existing elementary and
geography identities are retained, and scientific-notation quantities are
serialized as exact plain xsd:decimal values without numerical rounding.

Partial direct EF results continue to use the existing ContributionResult,
hasMeasure, forImpactCategory, forActivityLink, forLifeCycleStage,
forElementaryFlow and study hasContributionResult relations. No new result
category or complete LCIAResult is invented. BONSAI v2.1.6 GWP100 backgrounds and
direct EF 3.1 climate contributions remain separate because methodological
equivalence and overlap are not established. Unknown factors are not zero.

The separate nested-DPP provenance extension is retained for reversible
passport attachments; it is not part of the publication ontology. The PV
publication case has no such extension. Publication-only conformance of the PV
inventory is distinct from full PEF completeness or the scientific validation
of the assumed proxy activities.
