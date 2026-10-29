# Climate characterisation and ontology mapping

The review reports BONSAI background and direct EF 3.1 Climate change (IPCC 2021, GWP100) contributions separately, per functional unit. There is no combined footprint or claim of PEF compliance. An available subtotal does not establish complete inventory coverage.

## Source and calculation

Source: `EF-LCIAMethod_CF(EF-v3.1).xlsx`, SHA-256 `2193d95b94a7740ef7dfa7595c54fcb17a37c1e40be3173c26045af330facd96`. The generator selects only UUID `6209b35f-9447-40b5-b68c-a1099e3674a0` from `lciamethods` and `lciamethods_CF`. Workbook method version: `01.00.000`, issued 2022. The [JRC guidance](https://eplca.jrc.ec.europa.eu/permalink/EF_Data_Guide_EF3.1_addendum.pdf) documents EF 3.1's climate update.

The browser index contains 1,099 factors: 1,096 output and 3 input records, all GLO in this source. Exact regional precedence before GLO fallback is implemented and tested. Only the total climate method is selected; subcategories are not added again.

The existing EF inventory index supplies the 93,993 exact compartment-specific identifiers and reference units. Its source hash and the geography-index hash are retained. No second searchable inventory catalogue is introduced. Names are not matching keys. Activity geography must be an existing ontology individual.

Native units match exactly. For native Kilogram flows, explicitly supported OM-2 units kilogram, gram, milligram and tonne convert to kg with multipliers 1, 0.001, 0.000001 and 1,000. Other names/dimensions are not guessed. Imported quantities and units remain unchanged when the catalogue loads. Explicit selection of a flow with a different reference unit clears the old quantity.

Contribution per functional unit is exchange amount × unit conversion × CF × existing activity demand. Demand is applied once; source-DPP functional-unit duration is not multiplied again.

An explicit published zero factor verifies no contribution for this method. A known flow absent from the factor table remains unresolved: absence alone does not document an applicable zero. Unknown identifiers, wrong directions, unsupported units, invalid quantities and unavailable regional factors also remain unresolved. No custom zero whitelist is used.

Regenerate with Python/openpyxl:

```sh
python scripts/build_climate_characterisation_index.py /path/to/EF-workbook.xlsx \
  --elementary-index data/elementary-flows-index.json \
  --output data/climate-characterisation-index.json
```

## BONSAI compatibility investigation — 29 October 2026

The source `bonsai.xlsx` contains only `footprints-v2.1.6` and `flow_codes`. Its records identify GWP100 but do not link to the gas-specific CF table, IPCC release or full biogenic-carbon/uptake conventions.

The [official API record](https://lca.aau.dk/api/footprint/?flow_code=M_STEL&region_code=Global&version=v2.1.6&metric=GWP100) returned `M_STEL`, Global, tonnes, `3.2875358898` tonnes CO2eq/tonne, consistent with the catalogue's rounded `3.28753589`. Its fields confirm version, metric and units, but do not establish EF 3.1 equivalence.

The [official BONSAI theory](https://gitlab.com/bonsamurais/bonsai/documentation/-/blob/main/docs/theory/theory.md) describes upstream requirements, elementary emissions and characterisation. It does not establish the factor set and carbon conventions of this particular v2.1.6 release. Documentation for other BONSAI datasets or implementations is insufficient to establish that equivalence.

BONSAI footprints include upstream emissions. Selecting an aggregate footprint for an activity whose emissions are also explicitly modelled could overlap. Current data lack the background decomposition and boundary evidence needed to verify absence of overlap. Therefore no BONSAI/direct EF aggregation is enabled, and aggregated CO2e is never recharacterised.

## Existing ontology result representation

Checked against the supplied publication `pefstudy/lcia.ttl` version `0.1.0`, study module, EF methods, impact indicators, categories and units. This is distinct from the older DPPLCA output module. No new ontology category, class or result predicate is created.

| Information | Existing ontology relation |
|---|---|
| Study to contribution | `pefstudy:hasContributionResult` → `lcia:ContributionResult` |
| Category | `lcia:forImpactCategory` → existing `ClimateChange` |
| Result type | `lcia:hasLCIAResultType` → `lcia:Characterised` |
| Activity membership | `lcia:forActivityLink` → existing `ActivityLink` |
| Elementary identity | `lcia:forElementaryFlow` → EF FlowType URI |
| Stage | `lcia:forLifeCycleStage` → activity's stage |
| Value/unit | `lcia:hasMeasure` → `om:Measure` with numerical value and existing `kgCO2Eq` |
| Category to method | `lcia:calculatedByMethod` → existing method UUID URI |
| Method version/source | `dcterms:identifier`, `dcterms:hasVersion`, `dcterms:source` |
| Exact exchanged Flow | `dcterms:source` → inventory Flow instance |

Result descriptions identify the study functional unit, direct-only coverage, CF, location and scale. Only individually resolved contributions with valid demand are exported. Unresolved exchanges remain inventory and are listed in review. No full `hasLCIAResult` assertion is generated from partial results.

Imports recompute results from inventory rather than trusting stale values. Turtle and JSON-LD serialize the same new result graph. This validates the new result mapping, not every pre-existing app conformance gap. Foreground connections now use the publication-source resolution profile in `docs/publication-connections.md`; no FlowLink terms are exported. The separate nested-DPP provenance extension remains declared in `ontology/dpp-connections.ttl` and is not part of the publication ontology.

## Verification and PV demonstration

Tests cover exact CO2 = 1, fossil methane = 29.8 and N2O = 273 kg CO2e/kg; explicit zero and negative factors; unavailable mappings; units/directions; geography; demand doubling; batch and nested-DPP scaling; inventory round trips and result attribution. Existing waste-treatment tests are retained.

The Desktop PV demonstration retains 42 activities, 466 exchanges and 202 elementary exchanges with no inventory-validation issues. Seven elementary exchanges have non-zero CFs, four have explicit zero CFs, and 191 lack a verified applicable factor. Available direct contribution: approximately 2.543054 kg CO2e/FU. Separate BONSAI background: approximately 169.423961 kg CO2e/FU. The direct subtotal remains incomplete; these values are not added.

`node --test tests/*.test.cjs` runs unit and integration regressions. Optional local checks: `tests/browser-climate.cjs` tests real desktop selection/import/scaling/download; `tests/ontology-results.cjs` and `tests/ontology-results.py` independently check RDF graph equivalence and declared result vocabulary. Local publication/PV fixtures and Playwright/rdflib are needed for those checks only, not deployment.
