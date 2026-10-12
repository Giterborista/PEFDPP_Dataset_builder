# CE-RISE PEFDPP Dataset Builder

Static MVP for creating PEFDPP LCI datasets through a browser form.

The prototype lets a user define:

- an `LCIDataset`
- one or more `Activity` records
- activity input and output `Flow` records
- exactly one `FlowType` classification per flow: `ProductFlow`, `WasteFlow`, or `ElementaryFlow`
- ontology-derived geography and unit choices
- preservation of exact imported FlowType URIs, including EF 3.1 elementary-flow individuals
- a single searchable dropdown for selecting an exact EF 3.1 elementary-flow individual
- ProductFlow input sourcing from another activity's ProductFlow output through a shared exact FlowType URI
- searchable BONSAI mappings for ProductFlow inputs and outputs, and WasteFlow outputs
- activity-geography matching and physical-unit preference for BONSAI records, with only explicit supported conversions
- climate-change contributions from supplying ProductFlow inputs and WasteFlow treatment; ProductFlow output mappings are descriptive and are not counted twice
- foreground quantity propagation from the functional-unit reference output through linked activity inputs and outputs
- a visible error centre for incomplete activities, unresolved product sources, and disconnected activity groups
- one determining output flow per activity
- JSON-LD and Turtle exports using the same ontology relations

This version has no Brightway and no backend. It uses a static BONSAI v2.1.6 GWP100 catalogue for the limited climate-change calculation shown in the browser. It is intended to be deployable as a Render Static Site.

The included example models two connected foreground activities. A 2 kg steel input is supplied by the global BONSAI steel market (`M_STEL`), converted to its tonnes reference unit, and contributes 6.58 kg CO2e per functional unit. The first activity's reference output is linked to the second activity through a distinct `FlowLink` output/input pair. If the upstream activity produces two units per activity run while the downstream activity needs one, its background demand and climate contribution are scaled by one half.

## Run locally

The generated ontology indexes are loaded with `fetch`, so serve the folder instead of opening `index.html` directly:

```bash
cd CE-RISE-ontology-dataset-builder
python3 -m http.server 8765
```

Then open `http://127.0.0.1:8765/`.

## Ontology indexes

`data/ontology-options.json` and `data/elementary-flows-index.json` are deployment artifacts generated directly from the ontology. They preserve source URIs and include source-file hashes. Regenerate them after ontology changes with:

```bash
python scripts/build_ontology_indexes.py \
  --ontology-root ../ontology/ontology \
  --output-dir data
```

The browser does not maintain separate hardcoded geography or unit lists. The elementary-flow index drives the searchable dropdown and preserves the selected ontology individual's exact URI. `data/bonsai-catalogue-index.json` contains 94,462 source records for 1,539 BONSAI provider codes. The deployed selector deliberately exposes only the 61,265 records for 838 providers that carry an exact published BONSAI Activity URI; records without that URI cannot be exported and re-imported without losing provider identity. When a provider has monetary and physical records for the same region, the UI prefers a compatible physical reference unit and records the exact selected provider offering in the semantic export.

## Current ontology-alignment limits

The builder preserves the implemented PEFDPP classes, predicates, units, geographies, FlowType URIs and BONSAI Activity URIs. It is not yet a complete conformance implementation of the full publication ontology:

- the foreground connection terms `FlowLink`, `hasFlowLink`, `flowFrom` and `toFlow` are used by the MVP but are not declared in the current publication ontology;
- the publication ontology marks `Activity.hasActivityType`, `ProductSystem.hasSystemDiagram`, `PEFStudy.hasAggregatedLCI` and `PEFStudy.hasLCIAResult` as PEF-required, but the current form does not collect or export these values;
- the browser result is a static BONSAI GWP100 calculation only; EF elementary-flow characterisation and the full EF LCIA result set are not calculated.

These gaps require an ontology-owner and product-scope decision. The app does not invent values for them.
# Connecting and nesting DPPs

In **Activities**, expand a product input and choose **Connect DPP**. Select a
Turtle or calculator JSON-LD file, select its determining product output, and
enter the quantity required in that output's unit. The preview shows the
contributing activities, source assumptions and background-data readiness.
Only the inventory that supplies the selected output is attached. A connected
source can itself contain connected DPPs, and a shared supplier is stored once.

Calculations follow the ordinary supplying-output → receiving-input FlowLinks:
supplier scale = receiving activity scale × required input / supplier output.
The parent study stays authoritative; source functional-unit quantities and
durations are retained as provenance and are not multiplied into its inventory.
Unresolved backgrounds and elementary emissions remain visible and prevent a
complete climate result. Connecting a passport does not establish physical
compatibility, background quality, allocation validity or PEF compliance.

**Replace DPP** previews another supplier file. **Disconnect DPP** restores the
previous input and removes imported activities no longer needed elsewhere.
Quantity changes propagate through nested connections. Exports preserve source
identities, goal/scope snapshots, notes, activity types and provider references.
The local schema extension is [ontology/dpp-connections.ttl](ontology/dpp-connections.ttl);
it declares FlowLinks and the DPP provenance terms used by this application.

Files must use the app's explicit Flow/Activity inventory shape and inline OM
measures. Legacy workshop JSON and remote JSON-LD contexts are not supported.
Files with incomplete structure, cycles, duplicate identifiers or conflicting
inventory versions are rejected with an explanation; the current inventory is
left intact. Supplier output units never silently convert into the receiving
input's old unit. A different output unit requires a new quantity in the preview.

Run the dependency-free inventory regression suite with Node 24:

```sh
node --test tests/*.test.cjs
```

The suite covers batch output scaling, nested composition, shared providers,
reversible replacement/disconnection, invalid inputs, URI conflicts, source
contexts, Turtle/JSON-LD cycles and project case regressions when those local
files are available. GitHub Actions runs it on pushes and pull requests.
