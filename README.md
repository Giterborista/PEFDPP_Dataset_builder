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
- a visible error centre for incomplete activities, unresolved product sources, and disconnected activity groups
- one determining output flow per activity
- JSON-LD and Turtle exports using the same ontology relations

This version has no Brightway, no backend, and no calculation engine. It is intended to be deployable as a Render Static Site.

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

The browser does not maintain separate hardcoded geography or unit lists. The elementary-flow index drives the searchable dropdown and preserves the selected ontology individual's exact URI. BONSAI is shown only as a future product-source option until an exact BONSAI catalogue is connected; it is not silently inferred or exported as a resolved provider.
