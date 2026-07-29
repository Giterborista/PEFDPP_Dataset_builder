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
- a visible error centre for incomplete activities, unresolved product sources, and disconnected activity groups
- one determining output flow per activity
- JSON-LD and Turtle exports using the same ontology relations

This version has no Brightway and no backend. It uses a static BONSAI v2.1.6 GWP100 catalogue for the limited climate-change calculation shown in the browser. It is intended to be deployable as a Render Static Site.

The included example models two connected foreground activities. A 2 kg steel input is supplied by the global BONSAI steel market (`M_STEL`), converted to its tonnes reference unit, and contributes 6.58 kg CO2e per functional unit. The first activity's reference output is linked to the second activity through a distinct `FlowLink` output/input pair.

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

The browser does not maintain separate hardcoded geography or unit lists. The elementary-flow index drives the searchable dropdown and preserves the selected ontology individual's exact URI. `data/bonsai-catalogue-index.json` contains the static BONSAI provider catalogue. When a provider has monetary and physical records for the same region, the UI prefers a compatible physical reference unit and records the exact selected provider offering in the semantic export.
