#!/usr/bin/env python3
"""Build browser indexes from the PEFDPP ontology without changing ontology values."""

from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

from rdflib import DCTERMS, OWL, RDF, RDFS, SKOS, Graph, Namespace, URIRef


PEFDPP = "https://w3id.org/mintjesba/pefdpp/"
FLOW = Namespace(f"{PEFDPP}flow#")
EFU = Namespace(f"{PEFDPP}ef31-units#")
EFLOW = Namespace(f"{PEFDPP}skos/ef31-elementaryflows#")
GEO = Namespace(f"{PEFDPP}skos/pef-geographies#")
PEFDPP_CORE = Namespace(f"{PEFDPP}pefdpp#")
OM = Namespace("http://www.ontology-of-units-of-measure.org/resource/om-2/")


def source_metadata(path: Path) -> dict[str, str]:
    content = path.read_bytes()
    return {
        "path": path.name,
        "sha256": hashlib.sha256(content).hexdigest(),
    }


def label_for(graph: Graph, subject) -> str:
    for predicate in (SKOS.prefLabel, RDFS.label):
        value = next(graph.objects(subject, predicate), None)
        if value is not None:
            return str(value)
    return str(subject).rsplit("#", 1)[-1]


def build_options(ontology_root: Path) -> dict:
    geography_path = ontology_root / "skos" / "pef-geographies.ttl"
    units_path = ontology_root / "ef" / "ef31-units.ttl"

    geography_graph = Graph().parse(geography_path, format="turtle")
    geography_scheme = PEFDPP_CORE.PEFGeographies
    geographies = []
    for subject in geography_graph.subjects(RDF.type, SKOS.Concept):
        if (subject, SKOS.inScheme, geography_scheme) not in geography_graph:
            continue
        geographies.append({
            "uri": str(subject),
            "label": str(next(geography_graph.objects(subject, SKOS.prefLabel), subject)),
            "identifier": str(next(geography_graph.objects(subject, SKOS.notation), "")),
        })

    units_graph = Graph().parse(units_path, format="turtle")
    units = []
    inventory_unit_classes = (OM.Unit, OM.UnitMultiplication)
    for unit_class in inventory_unit_classes:
        for subject in units_graph.subjects(RDF.type, unit_class):
            label = next(units_graph.objects(subject, SKOS.prefLabel), None)
            if label is None:
                # TonneKilometre uses the misspelled ontology property skos:preflabel.
                label = next(units_graph.objects(subject, URIRef(f"{SKOS}preflabel")), None)
            units.append({
                "uri": str(subject),
                "label": str(label or subject).rsplit("#", 1)[-1],
                "identifier": str(next(units_graph.objects(subject, DCTERMS.identifier), "")),
                "ontologyClass": str(unit_class),
            })

    return {
        "metadata": {
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "sources": [source_metadata(geography_path), source_metadata(units_path)],
            "rule": "Values are direct ontology individuals; labels and URIs are not rewritten.",
        },
        "geographies": sorted(geographies, key=lambda item: (item["label"].casefold(), item["uri"])),
        "units": sorted({item["uri"]: item for item in units}.values(), key=lambda item: (item["label"].casefold(), item["uri"])),
    }


def build_elementary_flows(ontology_root: Path) -> dict:
    source_path = ontology_root / "skos" / "ef31-elementaryflows.ttl"
    graph = Graph().parse(source_path, format="turtle")
    scheme = EFLOW.EF31_ElementaryFlows
    entries = []
    for subject in graph.subjects(RDF.type, FLOW.ElementaryFlow):
        if (subject, SKOS.inScheme, scheme) not in graph:
            continue
        classification = next(graph.objects(subject, EFLOW.hasEFClassification), None)
        preferred_unit = next(graph.objects(subject, EFLOW.hasPreferredUnit), None)
        subject_uri = str(subject)
        classification_uri = str(classification or "")
        unit_uri = str(preferred_unit or "")
        entries.append([
            subject_uri.removeprefix(str(EFLOW)),
            str(next(graph.objects(subject, SKOS.prefLabel), subject)),
            str(next(graph.objects(subject, DCTERMS.identifier), "")),
            classification_uri.removeprefix(str(EFLOW)),
            str(next(graph.objects(classification, SKOS.prefLabel), "")) if classification else "",
            unit_uri.removeprefix(str(EFU)),
            str(next(graph.objects(subject, EFLOW.casNumber), "")),
            str(next(graph.objects(subject, EFLOW.ecNumber), "")),
            str(next(graph.objects(subject, OWL.versionInfo), "")),
        ])

    return {
        "metadata": {
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "source": source_metadata(source_path),
            "schemeUri": str(scheme),
            "flowClassUri": str(FLOW.ElementaryFlow),
            "entryCount": len(entries),
            "uriBases": {"flow": str(EFLOW), "unit": str(EFU)},
            "columns": ["uriLocal", "label", "identifier", "classificationLocal", "classificationLabel", "preferredUnitLocal", "casNumber", "ecNumber", "versionInfo"],
            "rule": "Entries are exactly the concepts typed flow:ElementaryFlow in the EF31_ElementaryFlows scheme. Local URI values are expanded with uriBases without rewriting identifiers.",
        },
        "entries": sorted(entries, key=lambda item: (item[1].casefold(), item[3], item[0])),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--ontology-root", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)

    outputs = {
        "ontology-options.json": build_options(args.ontology_root),
        "elementary-flows-index.json": build_elementary_flows(args.ontology_root),
    }
    for filename, payload in outputs.items():
        target = args.output_dir / filename
        target.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        print(f"Wrote {target} ({target.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
