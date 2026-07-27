const NS = {
  dataset: "https://w3id.org/mintjesba/pefdpp/dataset#",
  activity: "https://w3id.org/mintjesba/pefdpp/activity#",
  flow: "https://w3id.org/mintjesba/pefdpp/flow#",
  productSystem: "https://w3id.org/mintjesba/pefdpp/product-system#",
  pefStudy: "https://w3id.org/mintjesba/pefdpp/pefstudy#",
  impactCategory: "https://w3id.org/mintjesba/pefdpp/skos/ef31-impactcategories#",
  geography: "https://w3id.org/mintjesba/pefdpp/skos/pef-geographies#",
  elementary: "https://w3id.org/mintjesba/pefdpp/skos/ef31-elementaryflows#",
  bonsai: "https://w3id.org/mintjesba/pefdpp/bonsai#",
  unit: "https://w3id.org/mintjesba/pefdpp/ef31-units#",
  om: "http://www.ontology-of-units-of-measure.org/resource/om-2/",
  dcterms: "http://purl.org/dc/terms/",
  rdfs: "http://www.w3.org/2000/01/rdf-schema#",
  xsd: "http://www.w3.org/2001/XMLSchema#",
  foaf: "http://xmlns.com/foaf/0.1/"
};

const FLOW_CLASSES = ["ProductFlow", "WasteFlow", "ElementaryFlow"];
const DEFAULT_NAMESPACE = "https://w3id.org/cerise-see/datasets/example#";
const KG_URI = `${NS.unit}Kilogram`;
const CN_URI = `${NS.geography}CN`;
const LIFE_CYCLE_STAGES = [
  ["RawMaterialAcquisition", "Raw material acquisition"],
  ["Manufacturing", "Manufacturing"],
  ["Distribution", "Distribution"],
  ["Use", "Use"],
  ["EndOfLife", "End of life"]
].map(([local, label]) => ({ uri: `${NS.productSystem}${local}`, label }));

const state = {
  exportMode: "json",
  activeStep: "dataset",
  activeActivityId: "act-1",
  editingFlowId: "",
  compatReport: null,
  ontologyOptions: { geographies: [], units: [], metadata: null, ready: false, error: "" },
  studyOptions: { boundaryTypes: [], lifeCycleStages: LIFE_CYCLE_STAGES, quantityUnits: [], durationUnits: [], impactCategories: [], ready: false, error: "" },
  elementary: { entries: null, metadata: null, loading: false, error: "", openFlowId: "" },
  bonsai: { entries: null, metadata: null, loading: false, error: "", openFlowId: "" },
  flowTypes: [
    {
      id: "ft-assembled-product",
      uri: `${DEFAULT_NAMESPACE}assembled-product`,
      label: "assembled product",
      className: "ProductFlow",
      ontologyManaged: false,
      preferredUnitUri: "",
      search: ""
    },
    {
      id: "ft-aluminium-component",
      uri: `${DEFAULT_NAMESPACE}aluminium-component`,
      label: "aluminium component",
      className: "ProductFlow",
      ontologyManaged: false,
      preferredUnitUri: "",
      search: ""
    }
  ],
  productSystem: {
    uri: `${DEFAULT_NAMESPACE}product-system`,
    name: "Example product system"
  },
  study: {
    uri: `${DEFAULT_NAMESPACE}pef-study`,
    title: "Example PEF study",
    goal: {
      uri: `${DEFAULT_NAMESPACE}goal`,
      intendedApplication: "Assess the environmental footprint of the modelled product system.",
      decisionContext: "Internal product assessment",
      commissionerUri: `${DEFAULT_NAMESPACE}commissioner`,
      commissionerName: "Study commissioner",
      verifierUri: `${DEFAULT_NAMESPACE}verifier`,
      verifierName: "Study verifier"
    },
    scope: {
      uri: `${DEFAULT_NAMESPACE}scope`,
      assumption: "",
      limitation: "",
      biodiversityRelevance: "",
      impactCategoryUris: []
    },
    functionalUnit: {
      uri: `${DEFAULT_NAMESPACE}functional-unit`,
      whatProvided: "One assembled product",
      howWellProvided: "At the specified product performance",
      howMuchValue: "1",
      howMuchUnitUri: KG_URI,
      howLongValue: "1",
      howLongUnitUri: `${NS.om}year`,
      referenceFlowUri: `${DEFAULT_NAMESPACE}flow-1`,
      conversionFactor: "1",
      notCoveredAspect: ""
    },
    systemBoundary: {
      uri: `${DEFAULT_NAMESPACE}system-boundary`,
      boundaryTypeUri: `${NS.pefStudy}CradleToGrave`,
      cutOffCriteria: "No cut-off applied in this proof of concept.",
      justification: "Boundary follows the activities included in the product system.",
      excludesActivity: "",
      exclusionJustification: ""
    }
  },
  dataset: {
    uri: `${DEFAULT_NAMESPACE}example-product-lci-dataset`,
    namespace: DEFAULT_NAMESPACE,
    title: "Example product LCI dataset",
    type: "DPP",
    complianceLevel: "EFCompliant",
    activities: [
      {
        id: "act-1",
        uri: `${DEFAULT_NAMESPACE}act-1`,
        name: "Product assembly",
        activityLinkUri: `${DEFAULT_NAMESPACE}activity-link-act-1`,
        lifeCycleStageUri: `${NS.productSystem}Manufacturing`,
        geographyUri: CN_URI,
        companySpecific: true,
        flows: [
          {
            id: "flow-1",
            uri: `${DEFAULT_NAMESPACE}flow-1`,
            label: "assembled product",
            direction: "output",
            flowTypeUri: `${DEFAULT_NAMESPACE}assembled-product`,
            amount: "1",
            unitUri: KG_URI,
            determining: true
          },
          {
            id: "flow-2",
            uri: `${DEFAULT_NAMESPACE}flow-2`,
            label: "aluminium component",
            direction: "input",
            flowTypeUri: `${DEFAULT_NAMESPACE}aluminium-component`,
            amount: "2.125",
            unitUri: KG_URI,
            determining: false
          }
        ]
      }
    ]
  }
};

const el = (id) => document.getElementById(id);

function uid(prefix) {
  return `${prefix}-${Math.random().toString(16).slice(2, 8)}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeTtl(value) {
  return String(value ?? "")
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"')
    .replaceAll("\n", "\\n")
    .replaceAll("\r", "");
}

function slug(value) {
  return String(value || "item").trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "item";
}

function validUri(value) {
  try {
    const url = new URL(String(value || ""));
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

function iri(value) {
  return `<${String(value || "").replaceAll(">", "%3E")}>`;
}

function localName(value) {
  const clean = String(value || "").trim().replace(/[;,]$/g, "").replace(/^<|>$/g, "");
  if (!clean) return "";
  return decodeURIComponent(clean.split(/[\/#]/).pop() || clean);
}

function namespaceOf(uri) {
  const value = String(uri || "");
  const hash = value.lastIndexOf("#");
  if (hash >= 0) return value.slice(0, hash + 1);
  const slash = value.lastIndexOf("/");
  return slash >= 0 ? value.slice(0, slash + 1) : DEFAULT_NAMESPACE;
}

function ensureNamespace(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  return /[#/]$/.test(trimmed) ? trimmed : `${trimmed}#`;
}

function optionObjects(values, selected, labeler) {
  const missing = selected && !values.some((item) => item.uri === selected)
    ? [{ uri: selected, label: `${localName(selected)} (imported URI)`, identifier: localName(selected) }]
    : [];
  return [...missing, ...values].map((item) => {
    const label = labeler ? labeler(item) : item.label;
    return `<option value="${escapeHtml(item.uri)}" ${item.uri === selected ? "selected" : ""}>${escapeHtml(label)}</option>`;
  }).join("");
}

function getFlowType(uri) {
  return state.flowTypes.find((item) => item.uri === uri);
}

function flowTypeLabel(uri) {
  const item = getFlowType(uri);
  return item ? item.className : "Select flow type";
}

function createFlowTypeForFlow(flow, className = "ProductFlow") {
  const { namespace } = graphUris();
  const id = uid("ft");
  const item = {
    id,
    uri: `${namespace}${flow.id}-type`,
    label: flow.label || "new flow",
    className,
    ontologyManaged: false,
    preferredUnitUri: "",
    search: ""
  };
  state.flowTypes.push(item);
  flow.flowTypeUri = item.uri;
  return item;
}

function removeUnusedFlowTypes() {
  const used = new Set(state.dataset.activities.flatMap((activity) => activity.flows.map((flow) => flow.flowTypeUri)));
  state.flowTypes = state.flowTypes.filter((item) => used.has(item.uri));
}

function findFlow(flowId) {
  for (const activity of state.dataset.activities) {
    const flow = activity.flows.find((item) => item.id === flowId);
    if (flow) return flow;
  }
  return null;
}

function editableFlowType(flow, className) {
  const current = getFlowType(flow.flowTypeUri);
  const uses = state.dataset.activities.reduce((count, activity) => count + activity.flows.filter((item) => item.flowTypeUri === flow.flowTypeUri).length, 0);
  if (!current || uses > 1 || (current.ontologyManaged && className && className !== "ElementaryFlow")) {
    return createFlowTypeForFlow(flow, className || current?.className || "ProductFlow");
  }
  return current;
}

function productOutputs(exceptActivityId = "") {
  return state.dataset.activities.flatMap((activity) => activity.id === exceptActivityId ? [] : activity.flows
    .filter((flow) => flow.direction === "output" && getFlowType(flow.flowTypeUri)?.className === "ProductFlow")
    .map((flow) => ({ activity, flow })));
}

function linkedOutputForInput(flow, ownerActivityId = "") {
  const candidates = productOutputs(ownerActivityId);
  if (flow.linkedOutputFlowUri) return candidates.find((item) => (item.flow.uri || item.flow.id) === flow.linkedOutputFlowUri) || null;
  return null;
}

function acceptsBonsaiProvider(flow) {
  const className = getFlowType(flow.flowTypeUri)?.className;
  return (flow.direction === "input" && className === "ProductFlow") || (flow.direction === "output" && className === "WasteFlow");
}

function bonsaiChoices(flow) {
  if (!state.bonsai.entries || !acceptsBonsaiProvider(flow)) return [];
  const className = getFlowType(flow.flowTypeUri)?.className;
  const query = String(flow.bonsaiSearch || "").trim().toLowerCase();
  if (query.length < 2) return [];
  return state.bonsai.entries
    .filter((entry) => entry.className === className && `${entry.code} ${entry.label}`.toLowerCase().includes(query))
    .slice(0, 12);
}

function selectedBonsaiEntry(flow) {
  return state.bonsai.entries?.find((entry) => entry.code === flow.backgroundProvider?.code) || null;
}

function selectedBonsaiOffering(flow) {
  const entry = selectedBonsaiEntry(flow);
  return entry?.offerings.find((item) => item.region === flow.backgroundProvider?.region && item.referenceUnit === flow.backgroundProvider?.referenceUnit) || null;
}

function unitLabel(uri) {
  return state.ontologyOptions.units.find((item) => item.uri === uri)?.label || localName(uri);
}

function readableFlowType(className) {
  return String(className || "Flow").replace(/([a-z])([A-Z])/g, "$1 $2");
}

function flowUri(flow) {
  const { namespace } = graphUris();
  return flow.uri || `${namespace}${slug(flow.id)}`;
}

function flowLinks() {
  const { namespace } = graphUris();
  return state.dataset.activities.flatMap((activity) => activity.flows
    .filter((flow) => flow.direction === "input" && flow.sourceMode === "activity" && flow.linkedOutputFlowUri)
    .map((flow) => ({
      uri: `${namespace}flow-link-${slug(flow.id)}`,
      flowFrom: flow.linkedOutputFlowUri,
      toFlow: flowUri(flow)
    })));
}

function compatibleUnitsForBonsai(flow) {
  const offering = selectedBonsaiOffering(flow);
  if (!offering) return state.ontologyOptions.units || [];
  const target = String(offering.referenceUnit || "").toLowerCase();
  const allowedLabels = target === "tonnes" ? ["kg"]
    : target === "tj" ? ["mj"]
      : target === "meuro" ? ["eur"]
        : target === "items" ? ["item(s)"]
          : [target];
  return (state.ontologyOptions.units || []).filter((unit) => allowedLabels.includes(String(unit.label).toLowerCase()));
}

function bonsaiUnitOptionLabel(unit, offering) {
  if (!offering) return unit.label;
  const unitName = String(unit.label || "").toLowerCase();
  const providerUnit = String(offering.referenceUnit || "").toLowerCase();
  return unitName === providerUnit ? unit.label : `${unit.label} (converted to ${offering.referenceUnit})`;
}

function reconcileBonsaiFlowUnit(flow) {
  const offering = selectedBonsaiOffering(flow);
  if (!offering) return;
  const allowed = compatibleUnitsForBonsai(flow);
  if (!allowed.length) return;
  if (!allowed.some((unit) => unit.uri === flow.unitUri)) {
    flow.unitUri = allowed[0].uri;
    flow.amount = "";
  }
}

function applyBonsaiOfferingDefaults(flow) {
  const entry = selectedBonsaiEntry(flow);
  if (!entry || !flow.backgroundProvider) return;
  if (!flow.backgroundProvider.region) flow.backgroundProvider.region = entry.offerings[0]?.region || "";
  const offerings = entry.offerings.filter((item) => item.region === flow.backgroundProvider.region);
  if (!offerings.length) return;
  flow.backgroundProvider.referenceUnit = offerings[0].referenceUnit;
  reconcileBonsaiFlowUnit(flow);
}

function sourceReadyForQuantity(flow, ownerActivityId = "") {
  if (!acceptsBonsaiProvider(flow)) return true;
  if (flow.sourceMode === "bonsai") return Boolean(selectedBonsaiOffering(flow));
  if (flow.sourceMode === "activity") return Boolean(linkedOutputForInput(flow, ownerActivityId));
  return flow.sourceMode === "external";
}

function convertToProviderDemand(amount, sourceUnitUri, providerUnit) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return { ok: false, reason: "Enter a numeric amount." };
  const source = unitLabel(sourceUnitUri).toLowerCase();
  const target = String(providerUnit || "").toLowerCase();
  if (source === target || (source === "item(s)" && target === "items")) return { ok: true, demand: value, source, target };
  if (source === "kg" && target === "tonnes") return { ok: true, demand: value / 1000, source, target };
  if (source === "eur" && target === "meuro") return { ok: true, demand: value / 1000000, source, target };
  if (source === "mj" && target === "tj") return { ok: true, demand: value / 1000000, source, target };
  return { ok: false, reason: `${unitLabel(sourceUnitUri)} cannot be converted to BONSAI reference unit ${providerUnit}.` };
}

function formatImpact(value, digits = 3) {
  if (!Number.isFinite(value)) return "Not calculated";
  return `${Number(value).toLocaleString(undefined, { maximumSignificantDigits: digits })} kg CO2e`;
}

function bonsaiContribution(activity, flow) {
  const entry = selectedBonsaiEntry(flow);
  const offering = selectedBonsaiOffering(flow);
  if (!offering) return { activity, flow, entry, offering, ok: false, reason: "Select a BONSAI provider, region and reference unit." };
  const conversion = convertToProviderDemand(flow.amount, flow.unitUri, offering.referenceUnit);
  if (!conversion.ok) return { activity, flow, entry, offering, conversion, ok: false, reason: conversion.reason };
  const intensity = Number(offering.gwp100);
  if (!Number.isFinite(intensity)) return { activity, flow, entry, offering, conversion, ok: false, reason: "BONSAI GWP100 intensity is unavailable." };
  return { activity, flow, entry, offering, conversion, intensity, contributionKg: conversion.demand * intensity * 1000, ok: true };
}

function climateReport() {
  const allFlows = state.dataset.activities.flatMap((activity) => activity.flows.map((flow) => ({ activity, flow })));
  const bonsai = allFlows.filter(({ flow }) => flow.sourceMode === "bonsai").map(({ activity, flow }) => bonsaiContribution(activity, flow));
  const unresolvedBonsai = bonsai.filter((row) => !row.ok);
  const direct = bonsai.filter((row) => row.ok);
  const nonBonsaiInventory = allFlows.filter(({ flow }) => {
    const className = getFlowType(flow.flowTypeUri)?.className;
    return (flow.direction === "input" && className === "ProductFlow") || (flow.direction === "output" && className === "WasteFlow");
  }).filter(({ flow }) => flow.sourceMode !== "bonsai");
  const uncharacterisedElementary = allFlows.filter(({ flow }) => getFlowType(flow.flowTypeUri)?.className === "ElementaryFlow");
  const missingReferenceOutputs = state.dataset.activities.filter((activity) => !activity.flows.some((flow) => flow.direction === "output" && flow.determining));
  const fuFactor = Number(state.study.functionalUnit.conversionFactor);
  const scale = Number.isFinite(fuFactor) && fuFactor > 0 ? fuFactor : 1;
  const directTotal = direct.reduce((sum, row) => sum + row.contributionKg, 0) * scale;
  const calculated = direct.length > 0 && !unresolvedBonsai.length && !nonBonsaiInventory.length && !uncharacterisedElementary.length && !missingReferenceOutputs.length;
  const reasons = [
    ...unresolvedBonsai.map((row) => `${row.flow.label}: ${row.reason}`),
    ...nonBonsaiInventory.map(({ flow }) => `${flow.label}: not directly BONSAI-resolved`),
    ...uncharacterisedElementary.map(({ flow }) => `${flow.label}: elementary-flow characterisation is not implemented in this MVP`),
    ...missingReferenceOutputs.map((activity) => `${activity.name || "Untitled activity"}: reference output missing`)
  ];
  return { direct, unresolvedBonsai, nonBonsaiInventory, uncharacterisedElementary, missingReferenceOutputs, scale, directTotal, calculated, reasons };
}

function bonsaiFlowType(flow, entry) {
  // bonsai_fts.ttl deliberately splits composite codes into multiple FlowTypes.
  // A composite provider therefore keeps the user's one local FlowType.
  if (entry.code.includes("|")) return;
  const uri = `${NS.bonsai}FT_${entry.code}`;
  let item = getFlowType(uri);
  if (!item) {
    item = { id: uid("ft"), uri, label: entry.label, className: entry.className, ontologyManaged: true, preferredUnitUri: "", search: "" };
    state.flowTypes.push(item);
  }
  flow.flowTypeUri = item.uri;
}

function ontologyUnitKnown(uri) {
  return state.ontologyOptions.units.some((item) => item.uri === uri);
}

function lifeCycleStageOptions() {
  return state.studyOptions.lifeCycleStages.length ? state.studyOptions.lifeCycleStages : LIFE_CYCLE_STAGES;
}

function determiningProductOutputs() {
  return state.dataset.activities.flatMap((activity) => activity.flows
    .filter((flow) => flow.direction === "output" && flow.determining && getFlowType(flow.flowTypeUri)?.className === "ProductFlow")
    .map((flow) => ({ activity, flow, uri: flow.uri || `${graphUris().namespace}${slug(flow.id)}` })));
}

function syncStudyReferenceFlow() {
  const choices = determiningProductOutputs();
  if (!choices.some((item) => item.uri === state.study.functionalUnit.referenceFlowUri)) {
    state.study.functionalUnit.referenceFlowUri = choices[0]?.uri || "";
  }
}

function defaultStudy(namespace, referenceFlowUri = "", title = "Untitled PEF study") {
  return {
    uri: `${namespace}pef-study`, title,
    goal: {
      uri: `${namespace}goal`, intendedApplication: "Assess the environmental footprint of the modelled product system.",
      decisionContext: "", commissionerUri: `${namespace}commissioner`, commissionerName: "Study commissioner",
      verifierUri: `${namespace}verifier`, verifierName: "Study verifier"
    },
    scope: { uri: `${namespace}scope`, assumption: "", limitation: "", biodiversityRelevance: "", impactCategoryUris: [...state.studyOptions.impactCategories.map((item) => item.uri)] },
    functionalUnit: {
      uri: `${namespace}functional-unit`, whatProvided: "One product", howWellProvided: "At the specified product performance",
      howMuchValue: "1", howMuchUnitUri: KG_URI, howLongValue: "1", howLongUnitUri: `${NS.om}year`,
      referenceFlowUri, conversionFactor: "1", notCoveredAspect: ""
    },
    systemBoundary: {
      uri: `${namespace}system-boundary`, boundaryTypeUri: `${NS.pefStudy}CradleToGrave`,
      cutOffCriteria: "No cut-off applied in this proof of concept.",
      justification: "Boundary follows the activities included in the product system.", excludesActivity: "", exclusionJustification: ""
    }
  };
}

function reconcileElementaryUnits() {
  if (!state.elementary.entries) return;
  const byUri = new Map(state.elementary.entries.map((entry) => [entry.uri, entry]));
  state.flowTypes.forEach((item) => {
    if (item.className !== "ElementaryFlow") return;
    const ontologyEntry = byUri.get(item.uri);
    if (!ontologyEntry) return;
    item.ontologyManaged = true;
    item.label = ontologyEntry.label;
    item.preferredUnitUri = ontologyEntry.preferredUnitUri;
    if (item.preferredUnitUri) {
      state.dataset.activities.forEach((activity) => activity.flows.forEach((flow) => {
        if (flow.flowTypeUri === item.uri) flow.unitUri = item.preferredUnitUri;
      }));
    }
  });
}

function activityValidationItems(activity) {
  const issues = [];
  const add = (message, flowId = "", field = "") => issues.push({ activityId: activity.id, flowId, field, message });
  if (!activity.name.trim()) add("Enter an activity name.", "", "name");
  if (!activity.geographyUri) add("Select a geography.", "", "geographyUri");
  if (!lifeCycleStageOptions().some((stage) => stage.uri === activity.lifeCycleStageUri)) add("Select a lifecycle stage.", "", "lifeCycleStageUri");
  const references = activity.flows.filter((flow) => flow.direction === "output" && flow.determining);
  if (references.length !== 1) add("Select a reference output.", "", "determining");
  activity.flows.forEach((flow) => {
    if (!flow.label.trim()) add("Enter a flow name.", flow.id, "label");
    if (!String(flow.amount).trim()) add("Enter an amount.", flow.id, "amount");
    if (!flow.unitUri) add("Select a unit.", flow.id, "unitUri");
    const flowType = getFlowType(flow.flowTypeUri);
    if (flowType?.className === "ElementaryFlow") {
      if (!ontologyUnitKnown(flow.unitUri)) add("Select a recognised ontology unit.", flow.id, "unitUri");
      if (flowType.preferredUnitUri && flow.unitUri !== flowType.preferredUnitUri) add("Use the elementary flow’s required unit.", flow.id, "unitUri");
    }
    if (flow.direction === "input" && flowType?.className === "ProductFlow") {
      if (flow.sourceMode === "bonsai") {
        if (!selectedBonsaiOffering(flow)) add("Select a BONSAI provider, region and reference unit.", flow.id, "backgroundProvider");
      } else if (flow.sourceMode === "activity" && !linkedOutputForInput(flow, activity.id)) {
        add("Select the source activity and output.", flow.id, "sourceMode");
      } else if (!flow.sourceMode) {
        add("Resolve the source of this input.", flow.id, "sourceMode");
      }
    }
  });
  return issues;
}

function structureValidationIssues() {
  const issues = [];
  if (!state.productSystem.name.trim() || !validUri(state.productSystem.uri)) {
    issues.push("Complete the ProductSystem name and URI.");
  }
  state.dataset.activities.forEach((activity) => {
    if (!validUri(activity.activityLinkUri)) issues.push(`${activity.name || "Untitled activity"}: ActivityLink identifier is invalid.`);
    activityValidationItems(activity).forEach((item) => issues.push(`${activity.name || "Untitled activity"}: ${item.message}`));
  });
  if (state.dataset.activities.length > 1) {
    const connected = new Map(state.dataset.activities.map((activity) => [activity.id, new Set()]));
    state.dataset.activities.forEach((activity) => activity.flows.filter((flow) => flow.direction === "input").forEach((flow) => {
      const provider = linkedOutputForInput(flow, activity.id);
      if (provider) { connected.get(activity.id).add(provider.activity.id); connected.get(provider.activity.id).add(activity.id); }
    }));
    const seen = new Set();
    const queue = [state.dataset.activities[0].id];
    while (queue.length) { const id = queue.shift(); if (seen.has(id)) continue; seen.add(id); connected.get(id)?.forEach((next) => queue.push(next)); }
    if (seen.size !== state.dataset.activities.length) issues.push("Activities are disconnected. Link a ProductFlow input to an output from another activity.");
  }
  return [...new Set(issues)];
}

function studyValidationIssues() {
  const issues = [];
  const { study } = state;
  const { goal, scope, functionalUnit, systemBoundary } = study;
  if (!study.title.trim() || !validUri(study.uri)) issues.push("Complete the PEFStudy title and URI.");
  if (!validUri(goal.uri) || !goal.intendedApplication.trim()) issues.push("Complete the Goal URI and intended application.");
  if (!goal.commissionerName.trim() || !validUri(goal.commissionerUri)) issues.push("Complete the commissioner name and URI.");
  if (!goal.verifierName.trim() || !validUri(goal.verifierUri)) issues.push("Complete the verifier name and URI.");
  if (!validUri(scope.uri)) issues.push("Complete the Scope URI.");
  if (!validUri(functionalUnit.uri) || !functionalUnit.whatProvided.trim() || !functionalUnit.howWellProvided.trim()) issues.push("Complete what and how well the FunctionalUnit provides.");
  const quantityUnits = new Set(state.studyOptions.quantityUnits.map((item) => item.uri));
  const durationUnits = new Set(state.studyOptions.durationUnits.map((item) => item.uri));
  if (!Number.isFinite(Number(functionalUnit.howMuchValue)) || !quantityUnits.has(functionalUnit.howMuchUnitUri)) issues.push("Complete the FunctionalUnit quantity with a recognised ontology unit.");
  if (!Number.isFinite(Number(functionalUnit.howLongValue)) || !durationUnits.has(functionalUnit.howLongUnitUri)) issues.push("Complete the FunctionalUnit duration with a recognised OM unit.");
  if (!determiningProductOutputs().some((item) => item.uri === functionalUnit.referenceFlowUri)) issues.push("Select one determining ProductFlow output as the FunctionalUnit reference flow.");
  if (!String(functionalUnit.conversionFactor).trim() || !Number.isFinite(Number(functionalUnit.conversionFactor))) issues.push("Complete the reference-flow to FunctionalUnit conversion factor.");
  if (!validUri(systemBoundary.uri) || !state.studyOptions.boundaryTypes.some((item) => item.uri === systemBoundary.boundaryTypeUri)) issues.push("Complete the SystemBoundary URI and ontology boundary type.");
  if (!systemBoundary.cutOffCriteria.trim() || !systemBoundary.justification.trim()) issues.push("Complete the system-boundary cut-off criteria and justification.");
  const categoryUris = new Set(state.studyOptions.impactCategories.map((item) => item.uri));
  const efCompliant = state.dataset.complianceLevel === "EFCompliant";
  if (!scope.impactCategoryUris.length || scope.impactCategoryUris.some((uri) => !categoryUris.has(uri))) issues.push("Select the required EF impact categories from the ontology.");
  if (efCompliant && scope.impactCategoryUris.length !== state.studyOptions.impactCategories.length) issues.push("The EF compliance profile requires the complete impact-category set.");
  const boundaryLabel = state.studyOptions.boundaryTypes.find((item) => item.uri === systemBoundary.boundaryTypeUri)?.label || localName(systemBoundary.boundaryTypeUri);
  const representedStages = new Set(state.dataset.activities.map((activity) => lifeCycleStageOptions().find((stage) => stage.uri === activity.lifeCycleStageUri)?.label).filter(Boolean));
  if (/Cradle(?:To|-to-)Grave/i.test(boundaryLabel) && lifeCycleStageOptions().some((stage) => !representedStages.has(stage.label))) issues.push("The selected cradle-to-grave boundary is not yet represented by all lifecycle stages.");
  return [...new Set(issues)];
}

function validationIssues() {
  return [...structureValidationIssues(), ...studyValidationIssues()];
}

function graphUris() {
  const namespace = ensureNamespace(state.dataset.namespace) || DEFAULT_NAMESPACE;
  const datasetUri = state.dataset.uri || `${namespace}${slug(state.dataset.title)}`;
  return { namespace, datasetUri };
}

async function loadOntologyOptions() {
  try {
    const response = await fetch("data/ontology-options.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    state.ontologyOptions = { ...data, ready: true, error: "" };
    render();
  } catch (error) {
    state.ontologyOptions.error = `Ontology choices could not be loaded: ${error.message}`;
    render();
  }
}

async function loadStudyOptions() {
  try {
    const response = await fetch("data/study-options.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    state.studyOptions = { ...data, ready: true, error: "" };
    if (!state.study.scope.impactCategoryUris.length) state.study.scope.impactCategoryUris = data.impactCategories.map((item) => item.uri);
    syncStudyReferenceFlow();
    render();
  } catch (error) {
    state.studyOptions.error = `Study ontology choices could not be loaded: ${error.message}`;
    render();
  }
}

async function loadElementaryIndex() {
  if (state.elementary.entries) {
    reconcileElementaryUnits();
    renderFlows();
    return;
  }
  if (state.elementary.loading) return;
  state.elementary.loading = true;
  renderFlowTypeRegistry();
  try {
    const response = await fetch("data/elementary-flows-index.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const flowBase = data.metadata.uriBases.flow;
    const unitBase = data.metadata.uriBases.unit;
    state.elementary.entries = data.entries.map((row) => ({
      uri: `${flowBase}${row[0]}`,
      label: row[1],
      identifier: row[2],
      classificationUri: row[3] ? `${flowBase}${row[3]}` : "",
      classificationLabel: row[4],
      preferredUnitUri: row[5] ? `${unitBase}${row[5]}` : "",
      casNumber: row[6],
      ecNumber: row[7],
      versionInfo: row[8],
      searchText: normalizeSearchText([row[0], row[1], row[2], row[4], row[6], row[7]].join(" "))
    }));
    state.elementary.metadata = data.metadata;
    state.elementary.error = "";
    reconcileElementaryUnits();
  } catch (error) {
    state.elementary.error = `Elementary-flow index could not be loaded: ${error.message}`;
  } finally {
    state.elementary.loading = false;
    renderFlowTypeRegistry();
    renderFlows();
  }
}

async function loadBonsaiIndex() {
  if (state.bonsai.entries || state.bonsai.loading) return;
  state.bonsai.loading = true;
  renderFlows();
  try {
    const response = await fetch("data/bonsai-catalogue-index.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    state.bonsai.metadata = data.metadata;
    state.bonsai.entries = data.entries.map(([code, label, className, offerings]) => ({
      code, label, className,
      offerings: offerings.map(([region, referenceUnit, gwp100, emissionUnit, activityUri]) => ({ region, referenceUnit, gwp100, emissionUnit, activityUri }))
    }));
    state.bonsai.error = "";
  } catch (error) {
    state.bonsai.error = `BONSAI catalogue could not be loaded: ${error.message}`;
  } finally {
    state.bonsai.loading = false;
    renderFlows();
  }
}

function normalizeSearchText(value) {
  return String(value || "").toLowerCase().normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function elementaryMatches(query) {
  const normalized = normalizeSearchText(query);
  if (!state.elementary.entries) return [];
  if (!normalized) return state.elementary.entries.slice(0, 200);
  const tokens = normalized.split(/\s+/).filter(Boolean);
  return state.elementary.entries.filter((item) => tokens.every((token) => item.searchText.includes(token))).slice(0, 200);
}

function elementaryChoices(item) {
  const matches = elementaryMatches(item.search);
  if (!item.ontologyManaged || !state.elementary.entries) return matches;
  const selected = state.elementary.entries.find((entry) => entry.uri === item.uri);
  return selected && !matches.some((entry) => entry.uri === selected.uri) ? [selected, ...matches] : matches;
}

function selectElementaryFlow(item, uri) {
  const selected = state.elementary.entries?.find((entry) => entry.uri === uri);
  if (!item || !selected) return;
  updateFlowTypeUri(item, selected.uri);
  item.label = selected.label;
  item.className = "ElementaryFlow";
  item.ontologyManaged = true;
  item.preferredUnitUri = selected.preferredUnitUri;
  item.search = "";
  state.dataset.activities.forEach((activity) => activity.flows.forEach((flow) => {
    if (flow.flowTypeUri === selected.uri && selected.preferredUnitUri) flow.unitUri = selected.preferredUnitUri;
  }));
}

function stripTtlComment(line) {
  let inString = false;
  let inUri = false;
  let escaped = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (escaped) { escaped = false; continue; }
    if (char === "\\" && inString) { escaped = true; continue; }
    if (char === '"' && !inUri) inString = !inString;
    if (char === "<" && !inString) inUri = true;
    if (char === ">" && !inString) inUri = false;
    if (char === "#" && !inString && !inUri) return line.slice(0, index);
  }
  return line;
}

function parsePrefixes(text) {
  const prefixes = {};
  for (const match of text.matchAll(/@prefix\s+([\w-]*):\s*<([^>]+)>\s*\./g)) prefixes[match[1]] = match[2];
  return prefixes;
}

function expandToken(token, prefixes) {
  const clean = String(token || "").trim().replace(/[;,]$/g, "");
  if (!clean) return "";
  if (clean.startsWith("<")) return clean.replace(/^<|>$/g, "");
  const match = clean.match(/^([\w-]*):(.*)$/);
  return match && Object.hasOwn(prefixes, match[1]) ? `${prefixes[match[1]]}${match[2]}` : clean;
}

function predicateToken(prefixes, namespace, local) {
  const prefix = Object.keys(prefixes).find((key) => prefixes[key] === namespace);
  return prefix === undefined ? `<${namespace}${local}>` : `${prefix}:${local}`;
}

function ttlStatements(text) {
  const statements = [];
  let buffer = "";
  text.split(/\r?\n/).forEach((rawLine) => {
    const line = stripTtlComment(rawLine).trim();
    if (!line || line.startsWith("@prefix")) return;
    buffer = `${buffer} ${line}`.trim();
    if (line.endsWith(".")) {
      statements.push(buffer.replace(/\s+/g, " "));
      buffer = "";
    }
  });
  return statements;
}

function predicateValue(body, predicate) {
  const escaped = predicate.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = body.match(new RegExp(`(?:^|;\\s*)${escaped}\\s+([\\s\\S]*?)(?:\\s+;|\\s*$)`));
  return match ? match[1].trim() : "";
}

function literalValue(value) {
  const match = String(value || "").match(/"((?:\\"|[^"])*)"/);
  return match ? match[1].replaceAll('\\"', '"').replaceAll("\\n", "\n") : "";
}

function tokenList(value) {
  return String(value || "").split(",").map((item) => item.trim().replace(/[.;]$/g, "")).filter(Boolean);
}

function parseMeasure(body, prefixes) {
  const hasMeasure = predicateToken(prefixes, NS.flow, "hasMeasure");
  const hasUnit = predicateToken(prefixes, NS.om, "hasUnit");
  const hasValue = predicateToken(prefixes, NS.om, "hasNumericalValue");
  const escaped = [hasMeasure, hasUnit, hasValue].map((item) => item.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const match = body.match(new RegExp(`${escaped[0]}\\s+\\[[\\s\\S]*?${escaped[1]}\\s+([^;]+)\\s*;[\\s\\S]*?${escaped[2]}\\s+"?([^"\\]\\s]+)`));
  return match ? { unitUri: expandToken(match[1], prefixes), amount: match[2] } : { unitUri: "", amount: "" };
}

function parseInlineMeasure(body, predicate, prefixes) {
  const hasUnit = predicateToken(prefixes, NS.om, "hasUnit");
  const hasValue = predicateToken(prefixes, NS.om, "hasNumericalValue");
  const escaped = [predicate, hasUnit, hasValue].map((item) => item.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const match = body.match(new RegExp(`${escaped[0]}\\s+\\[[\\s\\S]*?${escaped[1]}\\s+([^;]+)\\s*;[\\s\\S]*?${escaped[2]}\\s+"?([^"\\]\\s]+)`));
  return match ? { unitUri: expandToken(match[1], prefixes), amount: match[2] } : { unitUri: "", amount: "" };
}

function parseTtlSubset(text) {
  const prefixes = parsePrefixes(text);
  const statements = ttlStatements(text);
  const nodes = new Map();
  const p = (ns, local) => predicateToken(prefixes, ns, local);
  const classUri = (node, uri) => tokenList(node.type).some((item) => expandToken(item, prefixes) === uri);
  const report = {
    source: "TTL import", imported: [], warnings: [], unsupported: [],
    stats: { statements: statements.length, studies: 0, goals: 0, scopes: 0, datasets: 0, productSystems: 0, activityLinks: 0, flowLinks: 0, activities: 0, flows: 0, flowTypes: 0 }
  };

  statements.forEach((statement) => {
    const match = statement.match(/^(\S+)\s+([\s\S]*?)\s*\.$/);
    if (!match) return;
    const rawSubject = match[1];
    const body = match[2];
    const subject = expandToken(rawSubject, prefixes);
    nodes.set(subject, {
      subject, rawSubject, body,
      type: predicateValue(body, "a"),
      title: literalValue(predicateValue(body, p(NS.dcterms, "title"))),
      label: literalValue(predicateValue(body, p(NS.rdfs, "label")))
    });
  });

  const datasets = [...nodes.values()].filter((node) => classUri(node, `${NS.dataset}LCIDataset`));
  const datasetNode = datasets[0];
  if (!datasetNode) throw new Error("No dataset:LCIDataset node found in the TTL file.");
  if (datasets.length > 1) report.warnings.push({ title: "More than one LCIDataset found", detail: "The first dataset was imported." });

  const activityTypes = new Map();
  const registry = new Map();
  nodes.forEach((node) => {
    if (classUri(node, `${NS.activity}ActivityType`)) activityTypes.set(node.subject, node.label || localName(node.subject));
    const foundClass = FLOW_CLASSES.find((name) => classUri(node, `${NS.flow}${name}`));
    if (foundClass) registry.set(node.subject, {
      id: uid("ft"), uri: node.subject, label: node.label || localName(node.subject), className: foundClass,
      ontologyManaged: foundClass === "ElementaryFlow" && node.subject.startsWith(NS.elementary), preferredUnitUri: "", search: ""
    });
  });

  const datasetType = localName(expandToken(predicateValue(datasetNode.body, p(NS.dataset, "hasDatasetType")), prefixes)) || "DPP";
  const compliance = localName(expandToken(predicateValue(datasetNode.body, p(NS.dataset, "hasComplianceLevel")), prefixes)) || "EFCompliant";
  const productSystemNodes = [...nodes.values()].filter((node) => classUri(node, `${NS.productSystem}ProductSystem`));
  const productSystemNode = productSystemNodes[0];
  const activityLinkNodes = [...nodes.values()].filter((node) => classUri(node, `${NS.productSystem}ActivityLink`));
  const flowLinkNodes = [...nodes.values()].filter((node) => classUri(node, `${NS.productSystem}FlowLink`));
  const flowLinksByInput = new Map();
  flowLinkNodes.forEach((node) => {
    const flowFrom = expandToken(predicateValue(node.body, p(NS.productSystem, "flowFrom")), prefixes);
    const toFlow = expandToken(predicateValue(node.body, p(NS.productSystem, "toFlow")), prefixes);
    if (flowFrom && toFlow) flowLinksByInput.set(toFlow, flowFrom);
  });
  const activityLinksByActivity = new Map();
  activityLinkNodes.forEach((node) => {
    const activityUri = expandToken(predicateValue(node.body, p(NS.productSystem, "forActivity")), prefixes);
    if (activityUri) activityLinksByActivity.set(activityUri, {
      uri: node.subject,
      stageUri: expandToken(predicateValue(node.body, p(NS.productSystem, "hasLifeCycleStage")), prefixes)
    });
  });
  if (!productSystemNode) report.warnings.push({
    title: "No ProductSystem found",
    detail: "A local ProductSystem and ActivityLink identifiers were prepared so life-cycle stages can be completed in the editor."
  });
  const activityNodes = [...nodes.values()].filter((node) => classUri(node, `${NS.activity}Activity`));
  const activitySubjects = new Set(activityNodes.map((node) => node.subject));
  const flowsByActivity = new Map();
  const flowNodes = [...nodes.values()].filter((node) => classUri(node, `${NS.flow}Flow`));

  flowNodes.forEach((node) => {
    const inputOf = expandToken(predicateValue(node.body, p(NS.activity, "inputOf")), prefixes);
    const outputOf = expandToken(predicateValue(node.body, p(NS.activity, "outputOf")), prefixes);
    const owner = inputOf || outputOf;
    if (!owner) {
      report.warnings.push({ title: `Flow without input/output relation: ${node.subject}`, detail: "It cannot be attached to an activity." });
      return;
    }
    if (!flowsByActivity.has(owner)) flowsByActivity.set(owner, []);
    flowsByActivity.get(owner).push(node);
  });

  const activities = activityNodes.map((node) => {
    const activityLink = activityLinksByActivity.get(node.subject);
    const typeUri = expandToken(predicateValue(node.body, p(NS.activity, "hasActivityType")), prefixes);
    const determiningUri = expandToken(predicateValue(node.body, p(NS.activity, "hasDeterminingFlow")), prefixes);
    const flows = (flowsByActivity.get(node.subject) || []).map((flowNode) => {
      const flowTypeUri = expandToken(predicateValue(flowNode.body, p(NS.flow, "hasFlowType")), prefixes);
      const measure = parseMeasure(flowNode.body, prefixes);
      if (flowTypeUri && !registry.has(flowTypeUri)) {
        const elementary = flowTypeUri.startsWith(NS.elementary);
        registry.set(flowTypeUri, {
          id: uid("ft"), uri: flowTypeUri, label: localName(flowTypeUri),
          className: elementary ? "ElementaryFlow" : "ProductFlow",
          ontologyManaged: elementary, preferredUnitUri: elementary ? measure.unitUri : "", search: ""
        });
        if (!elementary) report.warnings.push({
          title: `Undeclared FlowType preserved: ${flowTypeUri}`,
          detail: "Its exact URI is preserved. ProductFlow is shown as the editable class because no class statement was present in this file."
        });
      }
      return {
        id: localName(flowNode.subject), uri: flowNode.subject,
        label: literalValue(predicateValue(flowNode.body, p(NS.flow, "contextualLabel"))) || registry.get(flowTypeUri)?.label || localName(flowNode.subject),
        direction: predicateValue(flowNode.body, p(NS.activity, "outputOf")) ? "output" : "input",
        flowTypeUri, amount: measure.amount || "1", unitUri: measure.unitUri,
        determining: Boolean(determiningUri && flowNode.subject === determiningUri),
        sourceMode: flowLinksByInput.has(flowNode.subject) ? "activity" : "",
        linkedOutputFlowUri: flowLinksByInput.get(flowNode.subject) || ""
      };
    });
    return {
      id: localName(node.subject), uri: node.subject,
      name: node.label || activityTypes.get(typeUri) || localName(node.subject),
      activityLinkUri: activityLink?.uri || `${namespaceOf(datasetNode.subject)}activity-link-${slug(localName(node.subject))}`,
      lifeCycleStageUri: activityLink?.stageUri || "",
      geographyUri: expandToken(predicateValue(node.body, p(NS.activity, "hasGeography")), prefixes),
      companySpecific: predicateValue(node.body, p(NS.activity, "isCompanySpecific")).includes("true"),
      flows
    };
  });

  flowsByActivity.forEach((flows, owner) => {
    if (!activitySubjects.has(owner)) report.warnings.push({ title: `Flows attached to undefined activity: ${owner}`, detail: `${flows.length} flow(s) were not imported.` });
  });

  report.stats.datasets = datasets.length;
  report.stats.productSystems = productSystemNodes.length;
  report.stats.activityLinks = activityLinkNodes.length;
  report.stats.flowLinks = flowLinkNodes.length;
  report.stats.activities = activities.length;
  report.stats.flows = activities.reduce((sum, activity) => sum + activity.flows.length, 0);
  report.stats.flowTypes = registry.size;

  const studyNodes = [...nodes.values()].filter((node) => classUri(node, `${NS.pefStudy}PEFStudy`));
  const goalNodes = [...nodes.values()].filter((node) => classUri(node, `${NS.pefStudy}Goal`));
  const scopeNodes = [...nodes.values()].filter((node) => classUri(node, `${NS.pefStudy}Scope`));
  const functionalUnitNodes = [...nodes.values()].filter((node) => classUri(node, `${NS.pefStudy}FunctionalUnit`));
  const boundaryNodes = [...nodes.values()].filter((node) => classUri(node, `${NS.pefStudy}SystemBoundary`));
  const studyNode = studyNodes[0];
  const linkedNode = (owner, predicate, fallback) => {
    const uri = owner ? expandToken(predicateValue(owner.body, predicate), prefixes) : "";
    return nodes.get(uri) || fallback;
  };
  const goalNode = linkedNode(studyNode, p(NS.pefStudy, "hasGoal"), goalNodes[0]);
  const scopeNode = linkedNode(studyNode, p(NS.pefStudy, "hasScope"), scopeNodes[0]);
  const fuNode = linkedNode(scopeNode, p(NS.pefStudy, "hasFunctionalUnit"), functionalUnitNodes[0]);
  const boundaryNode = linkedNode(scopeNode, p(NS.pefStudy, "hasSystemBoundary"), boundaryNodes[0]);
  const namespace = namespaceOf(datasetNode.subject);
  const firstReference = activities.flatMap((activity) => activity.flows).find((flow) => flow.direction === "output" && flow.determining)?.uri || "";
  let study = defaultStudy(namespace, firstReference, `${datasetNode.title || localName(datasetNode.subject)} study`);
  if (studyNode && goalNode && scopeNode && fuNode && boundaryNode) {
    const commissionerUri = expandToken(predicateValue(goalNode.body, p(NS.pefStudy, "commissioner")), prefixes);
    const verifierUri = expandToken(predicateValue(goalNode.body, p(NS.pefStudy, "verifier")), prefixes);
    const agentName = (uri) => {
      const node = nodes.get(uri);
      return node ? literalValue(predicateValue(node.body, p(NS.foaf, "name"))) || node.label || localName(uri) : localName(uri);
    };
    const howMuch = parseInlineMeasure(fuNode.body, p(NS.pefStudy, "howMuchProvided"), prefixes);
    const howLong = parseInlineMeasure(fuNode.body, p(NS.pefStudy, "howLongProvided"), prefixes);
    study = {
      uri: studyNode.subject, title: studyNode.title || studyNode.label || localName(studyNode.subject),
      goal: {
        uri: goalNode.subject,
        intendedApplication: literalValue(predicateValue(goalNode.body, p(NS.pefStudy, "intendedApplication"))),
        decisionContext: literalValue(predicateValue(goalNode.body, p(NS.pefStudy, "decisionContext"))),
        commissionerUri, commissionerName: agentName(commissionerUri), verifierUri, verifierName: agentName(verifierUri)
      },
      scope: {
        uri: scopeNode.subject,
        assumption: literalValue(predicateValue(scopeNode.body, p(NS.pefStudy, "hasAssumption"))),
        limitation: literalValue(predicateValue(scopeNode.body, p(NS.pefStudy, "hasLimitation"))),
        biodiversityRelevance: literalValue(predicateValue(scopeNode.body, p(NS.pefStudy, "biodiversityRelevance"))),
        impactCategoryUris: tokenList(predicateValue(scopeNode.body, p(NS.pefStudy, "includesImpactCategory"))).map((token) => expandToken(token, prefixes))
      },
      functionalUnit: {
        uri: fuNode.subject,
        whatProvided: literalValue(predicateValue(fuNode.body, p(NS.pefStudy, "whatProvided"))),
        howWellProvided: literalValue(predicateValue(fuNode.body, p(NS.pefStudy, "howWellProvided"))),
        howMuchValue: howMuch.amount, howMuchUnitUri: howMuch.unitUri,
        howLongValue: howLong.amount, howLongUnitUri: howLong.unitUri,
        referenceFlowUri: expandToken(predicateValue(fuNode.body, p(NS.pefStudy, "hasReferenceFlow")), prefixes),
        conversionFactor: literalValue(predicateValue(fuNode.body, p(NS.pefStudy, "RFtoFUConversion"))) || "1",
        notCoveredAspect: literalValue(predicateValue(fuNode.body, p(NS.pefStudy, "notCoveredAspect")))
      },
      systemBoundary: {
        uri: boundaryNode.subject,
        boundaryTypeUri: expandToken(predicateValue(boundaryNode.body, p(NS.pefStudy, "hasBoundaryType")), prefixes),
        cutOffCriteria: literalValue(predicateValue(boundaryNode.body, p(NS.pefStudy, "cutOffCriteria"))),
        justification: literalValue(predicateValue(boundaryNode.body, p(NS.pefStudy, "hasJustification"))),
        excludesActivity: literalValue(predicateValue(boundaryNode.body, p(NS.pefStudy, "excludesActivity"))),
        exclusionJustification: literalValue(predicateValue(boundaryNode.body, p(NS.pefStudy, "exclusionJustification")))
      }
    };
    report.imported.push({ title: "Goal and scope imported", detail: "PEFStudy, Goal, Scope, FunctionalUnit and SystemBoundary were mapped into the editor." });
  } else {
    report.warnings.push({ title: "No complete Goal and Scope structure found", detail: "An editable ontology-aligned study shell was prepared and linked to the determining ProductFlow output." });
  }
  report.stats.studies = studyNodes.length;
  report.stats.goals = goalNodes.length;
  report.stats.scopes = scopeNodes.length;
  report.imported.push(
    { title: "LCIDataset imported", detail: datasetNode.subject },
    { title: "Product system structure imported", detail: `${productSystemNodes.length} ProductSystem and ${activityLinkNodes.length} ActivityLink node(s).` },
    { title: "Exact FlowType URIs preserved", detail: `${registry.size} shared exchanged entity definition(s).` },
    { title: "Activities and flows imported", detail: `${activities.length} activities and ${report.stats.flows} flows.` }
  );

  return {
    productSystem: {
      uri: productSystemNode?.subject || `${namespaceOf(datasetNode.subject)}product-system`,
      name: productSystemNode?.label || "Product system"
    },
    dataset: {
      uri: datasetNode.subject,
      namespace: namespaceOf(datasetNode.subject),
      title: datasetNode.title || localName(datasetNode.subject),
      type: datasetType, complianceLevel: compliance, activities
    },
    flowTypes: [...registry.values()], study, report
  };
}

function render() {
  el("datasetTitle").value = state.dataset.title;
  el("datasetNamespace").value = state.dataset.namespace;
  el("datasetType").value = state.dataset.type;
  el("complianceLevel").value = state.dataset.complianceLevel;
  el("productSystemName").value = state.productSystem.name;
  el("productSystemUri").value = state.productSystem.uri;
  renderStudy();
  renderSteps();
  renderDatasetNav();
  renderActivityNav();
  renderActivities();
  renderActivitySelector();
  renderFlowTypeRegistry();
  renderFlows();
  renderSummary();
  renderGraph();
  renderCompatibility();
  renderExport();
}

function renderStudy() {
  syncStudyReferenceFlow();
  const { study } = state;
  const { goal, scope, functionalUnit, systemBoundary } = study;
  const efCompliant = state.dataset.complianceLevel === "EFCompliant";
  if (efCompliant && state.studyOptions.impactCategories.length) {
    scope.impactCategoryUris = state.studyOptions.impactCategories.map((item) => item.uri);
  }
  const values = {
    studyTitle: study.title, studyUri: study.uri,
    intendedApplication: goal.intendedApplication, decisionContext: goal.decisionContext,
    commissionerName: goal.commissionerName, commissionerUri: goal.commissionerUri,
    verifierName: goal.verifierName, verifierUri: goal.verifierUri,
    fuWhat: functionalUnit.whatProvided, fuHowWell: functionalUnit.howWellProvided,
    fuHowMuchValue: functionalUnit.howMuchValue, fuHowLongValue: functionalUnit.howLongValue,
    fuConversion: functionalUnit.conversionFactor, fuNotCovered: functionalUnit.notCoveredAspect,
    cutOffCriteria: systemBoundary.cutOffCriteria, boundaryJustification: systemBoundary.justification,
    excludedActivity: systemBoundary.excludesActivity, exclusionJustification: systemBoundary.exclusionJustification,
    scopeAssumption: scope.assumption, scopeLimitation: scope.limitation, biodiversityRelevance: scope.biodiversityRelevance
  };
  Object.entries(values).forEach(([id, value]) => { const node = el(id); if (node) node.value = value || ""; });
  const loadingLabel = state.studyOptions.ready ? "Select ontology value" : "Loading ontology values…";
  el("fuHowMuchUnit").innerHTML = `<option value="">${loadingLabel}</option>${optionObjects(state.studyOptions.quantityUnits, functionalUnit.howMuchUnitUri)}`;
  el("fuHowLongUnit").innerHTML = `<option value="">${loadingLabel}</option>${optionObjects(state.studyOptions.durationUnits, functionalUnit.howLongUnitUri)}`;
  el("boundaryType").innerHTML = `<option value="">${loadingLabel}</option>${optionObjects(state.studyOptions.boundaryTypes, systemBoundary.boundaryTypeUri)}`;
  const references = determiningProductOutputs();
  el("fuReferenceFlow").innerHTML = `<option value="">Select determining output</option>${references.map(({ activity, flow, uri }) => `<option value="${escapeHtml(uri)}" ${uri === functionalUnit.referenceFlowUri ? "selected" : ""}>${escapeHtml(activity.name)} → ${escapeHtml(flow.label)} (${escapeHtml(flow.amount)} ${escapeHtml(localName(flow.unitUri))})</option>`).join("")}`;
  const impactCategoryChoices = el("impactCategoryChoices");
  if (impactCategoryChoices) impactCategoryChoices.innerHTML = state.studyOptions.impactCategories.map((item) => `<div class="category-choice locked"><span aria-hidden="true">✓</span>${escapeHtml(item.label)}</div>`).join("");
  const reference = determiningProductOutputs().find((item) => item.uri === functionalUnit.referenceFlowUri);
  const preview = el("fuPreview");
  if (preview) preview.innerHTML = `<strong>Functional-unit preview</strong><span>Provision of ${escapeHtml(functionalUnit.howMuchValue || "1")} ${escapeHtml(unitLabel(functionalUnit.howMuchUnitUri))} of ${escapeHtml(functionalUnit.whatProvided || "product")} at ${escapeHtml(functionalUnit.howWellProvided || "the specified performance")} for ${escapeHtml(functionalUnit.howLongValue || "1")} ${escapeHtml(unitLabel(functionalUnit.howLongUnitUri))}.</span>`;
  const stages = new Set(state.dataset.activities.map((activity) => lifeCycleStageOptions().find((item) => item.uri === activity.lifeCycleStageUri)?.label).filter(Boolean));
  const observation = el("boundaryObservation");
  const coverage = el("lifeCycleCoverage");
  const allStages = lifeCycleStageOptions();
  if (coverage) coverage.innerHTML = `<strong>Lifecycle stages represented</strong><div>${allStages.map((stage) => `<span class="${stages.has(stage.label) ? "represented" : "missing"}">${escapeHtml(stage.label)} ${stages.has(stage.label) ? "✓" : "—"}</span>`).join("")}</div>`;
  const boundaryLabel = state.studyOptions.boundaryTypes.find((item) => item.uri === systemBoundary.boundaryTypeUri)?.label || localName(systemBoundary.boundaryTypeUri);
  const missingStages = allStages.filter((stage) => !stages.has(stage.label)).map((stage) => stage.label);
  const boundaryCoverageComplete = !/Cradle(?:To|-to-)Grave/i.test(boundaryLabel) || missingStages.length === 0;
  if (observation) observation.textContent = /Cradle(?:To|-to-)Grave/i.test(boundaryLabel) && missingStages.length
    ? stages.size ? `The selected boundary is cradle-to-grave, but only ${[...stages].join(" and ")} ${stages.size === 1 ? "is" : "are"} currently represented.` : "The selected boundary is cradle-to-grave, but no lifecycle stage is currently represented."
    : stages.size ? `The model currently represents: ${[...stages].join(" and ")}.` : "No activity lifecycle stages have been selected yet.";
  const statuses = {
    studyPurpose: Boolean(study.title.trim() && goal.intendedApplication.trim() && goal.commissionerName.trim() && goal.verifierName.trim()),
    functionalUnit: Boolean(functionalUnit.whatProvided.trim() && functionalUnit.howWellProvided.trim() && functionalUnit.howMuchValue && functionalUnit.howLongValue && reference),
    systemBoundary: Boolean(systemBoundary.boundaryTypeUri && systemBoundary.cutOffCriteria.trim() && systemBoundary.justification.trim() && boundaryCoverageComplete)
  };
  Object.entries(statuses).forEach(([id, complete]) => { const node = el(`${id}Status`); if (node) { node.textContent = complete ? "Complete" : "Needs input"; node.className = complete ? "complete" : "pending"; } });
  document.querySelectorAll("#panelStudy textarea").forEach(autoSizeTextarea);
}

function autoSizeTextarea(node) {
  node.style.height = "auto";
  node.style.height = `${Math.max(node.scrollHeight, 50)}px`;
}

function renderSteps() {
  document.querySelectorAll("[data-step-panel]").forEach((panel) => {
    const active = panel.dataset.stepPanel === state.activeStep;
    panel.hidden = !active;
    panel.classList.toggle("active", active);
  });
  document.querySelectorAll("[data-step]").forEach((button) => {
    const step = button.dataset.step;
    button.classList.toggle("active", step === state.activeStep);
    const complete = step === "dataset"
      ? Boolean(state.dataset.title.trim() && validUri(state.dataset.namespace) && state.productSystem.name.trim() && validUri(state.productSystem.uri))
      : step === "activities" ? structureValidationIssues().length === 0
      : step === "study" ? studyValidationIssues().length === 0
      : datasetIsReady();
    button.classList.toggle("complete", complete);
    const warning = step === "activities" ? structureValidationIssues().length : step === "study" ? studyValidationIssues().length : step === "review" ? validationIssues().length : 0;
    button.classList.toggle("warning", Boolean(warning) && !complete);
  });
}

function goToStep(step) {
  if (!document.querySelector(`[data-step-panel="${step}"]`)) return;
  state.activeStep = step;
  renderSteps();
  window.scrollTo({ top: 0 });
}

function datasetIsReady() {
  const validRegistry = state.flowTypes.filter((item) => item.label.trim() && validUri(item.uri));
  const registryUris = new Set(validRegistry.map((item) => item.uri));
  return validationIssues().length === 0 && Boolean(state.dataset.title.trim()) && validUri(state.dataset.namespace)
    && validRegistry.length === state.flowTypes.length && registryUris.size === state.flowTypes.length
    && state.ontologyOptions.ready && state.studyOptions.ready && state.dataset.activities.length > 0
    && state.dataset.activities.every((activity) => {
      const references = activity.flows.filter((flow) => flow.determining && flow.direction === "output");
      return activity.name.trim() && validUri(activity.geographyUri)
        && references.length === 1
        && activity.flows.every((flow) => flow.label.trim() && String(flow.amount).trim() && validUri(flow.unitUri) && registryUris.has(flow.flowTypeUri));
    });
}

function renderDatasetNav() {
  el("navDatasetTitle").textContent = state.dataset.title || "Untitled LCI dataset";
  el("navDatasetMeta").textContent = `${state.dataset.type} · ${state.dataset.complianceLevel}`;
  const datasetUriPreview = el("datasetUriPreview");
  if (datasetUriPreview) datasetUriPreview.textContent = graphUris().datasetUri;
}

function renderActivityNav() {
  el("activityNav").innerHTML = state.dataset.activities.length ? state.dataset.activities.map((activity) => {
    const inputs = activity.flows.filter((flow) => flow.direction === "input").length;
    const outputs = activity.flows.filter((flow) => flow.direction === "output").length;
    const issues = activityValidationItems(activity);
    const stage = lifeCycleStageOptions().find((item) => item.uri === activity.lifeCycleStageUri)?.label || "Stage not selected";
    return `<button class="activity-link ${activity.id === state.activeActivityId ? "active" : ""}" type="button" data-select-activity="${activity.id}">
      <span>${escapeHtml(activity.name || "Untitled activity")}</span>
      <small>${escapeHtml(stage)}</small>
      <small>${inputs} input${inputs === 1 ? "" : "s"} · ${outputs} output${outputs === 1 ? "" : "s"}</small>
      <em class="activity-status ${issues.length ? "issue" : "complete"}">${issues.length ? `${issues.length} issue${issues.length === 1 ? "" : "s"}` : "Complete"}</em>
    </button>`;
  }).join("") : `<div class="empty-editor"><strong>No activities yet</strong><span>Add an activity to start building the dataset.</span></div>`;
}

function getActiveActivity() {
  return state.dataset.activities.find((activity) => activity.id === state.activeActivityId);
}

function renderActivities() {
  const activity = getActiveActivity();
  if (!activity) {
    el("activitiesList").innerHTML = `<div class="empty-editor"><strong>No activity selected</strong><span>Add or select an activity.</span></div>`;
    return;
  }
  const geographies = state.ontologyOptions.geographies || [];
  el("activitiesList").innerHTML = `<article class="activity-editor-card">
    <div class="item-title"><h3>${escapeHtml(activity.name || "Untitled activity")}</h3><button class="remove" type="button" data-remove-activity="${activity.id}" aria-label="Remove activity">×</button></div>
    <div class="activity-fields">
      <label>Activity name<input type="text" value="${escapeHtml(activity.name)}" data-activity-field="${activity.id}:name" /></label>
      <label>Geography<select data-activity-field="${activity.id}:geographyUri" ${state.ontologyOptions.ready ? "" : "disabled"}>
        <option value="">${state.ontologyOptions.ready ? "Select ontology geography" : "Loading ontology geographies…"}</option>
        ${optionObjects(geographies, activity.geographyUri, (item) => `${item.identifier || localName(item.uri)} — ${item.label}`)}
      </select></label>
      <label>Life-cycle stage<select data-activity-field="${activity.id}:lifeCycleStageUri">
        <option value="">Select ontology stage</option>
        ${optionObjects(lifeCycleStageOptions(), activity.lifeCycleStageUri)}
      </select></label>
      <label class="check-row"><input type="checkbox" ${activity.companySpecific ? "checked" : ""} data-activity-field="${activity.id}:companySpecific" />Company specific</label>
    </div>
    <details class="ontology-details"><summary>Ontology details</summary><dl><div><dt>Activity URI</dt><dd>${escapeHtml(activity.uri)}</dd></div><div><dt>ActivityLink URI</dt><dd>${escapeHtml(activity.activityLinkUri)}</dd></div></dl></details>
    ${state.ontologyOptions.error ? `<p class="inline-error">${escapeHtml(state.ontologyOptions.error)}</p>` : ""}
  </article>`;
}

function renderActivitySelector() {
  if (!state.dataset.activities.some((activity) => activity.id === state.activeActivityId)) state.activeActivityId = state.dataset.activities[0]?.id || "";
  el("activeActivity").innerHTML = state.dataset.activities.map((activity) => `<option value="${activity.id}" ${activity.id === state.activeActivityId ? "selected" : ""}>${escapeHtml(activity.name)}</option>`).join("");
}

function renderFlowTypeRegistry() {
  const container = el("flowTypeRegistry");
  if (!container) return;
  if (!state.flowTypes.length) {
    container.innerHTML = `<div class="empty-editor"><strong>No exchanged entities yet</strong><span>Create one, then reuse it in input or output flows.</span></div>`;
    return;
  }
  container.innerHTML = `<div class="registry-list">${state.flowTypes.map((item) => {
    const usage = state.dataset.activities.reduce((count, activity) => count + activity.flows.filter((flow) => flow.flowTypeUri === item.uri).length, 0);
    const matches = item.className === "ElementaryFlow" ? elementaryChoices(item) : [];
    return `<article class="registry-row ${item.className === "ElementaryFlow" ? "elementary" : ""}">
      <div class="registry-main">
        <label>Entity label<input type="text" value="${escapeHtml(item.label)}" data-flowtype-field="${item.id}:label" ${item.ontologyManaged ? "readonly" : ""} /></label>
        <label>FlowType class<select data-flowtype-field="${item.id}:className">
          ${FLOW_CLASSES.map((name) => `<option ${name === item.className ? "selected" : ""}>${name}</option>`).join("")}
        </select></label>
        <label class="uri-field">Exact FlowType URI<input type="url" value="${escapeHtml(item.uri)}" data-flowtype-field="${item.id}:uri" spellcheck="false" ${item.ontologyManaged ? "readonly" : ""} /></label>
      </div>
      ${item.className === "ElementaryFlow" ? `<div class="elementary-picker">
        <label>Find an EF 3.1 elementary flow<input type="search" value="${escapeHtml(item.search)}" placeholder="Search name, UUID, CAS or EC number" data-ef-search="${item.id}" autocomplete="off" /></label>
        <div class="picker-note">${state.elementary.loading ? "Loading the ontology-derived index…" : state.elementary.error ? escapeHtml(state.elementary.error) : item.ontologyManaged ? `Selected ontology individual${item.preferredUnitUri ? ` · preferred unit ${escapeHtml(localName(item.preferredUnitUri))}` : ""}` : "Type at least 2 characters, then select one exact ontology individual."}</div>
        ${matches.length ? `<div class="ef-results">${matches.map((flow) => `<button type="button" data-select-ef="${item.id}" data-ef-uri="${escapeHtml(flow.uri)}"><strong>${escapeHtml(flow.label)}</strong><span>${escapeHtml(flow.classificationLabel || "Unclassified")} · ${escapeHtml(flow.casNumber || flow.identifier)}</span></button>`).join("")}</div>` : ""}
      </div>` : ""}
      <div class="registry-foot"><span>${usage} use${usage === 1 ? "" : "s"} across activities</span><button class="remove text-remove" type="button" data-remove-flowtype="${item.id}" ${usage ? "disabled title=\"Remove its flow uses first\"" : ""}>Remove</button></div>
    </article>`;
  }).join("")}</div>`;
}

function renderFlows() {
  const activity = getActiveActivity();
  el("addInputFlow").disabled = !activity;
  el("addOutputFlow").disabled = !activity;
  if (!activity) {
    el("flowsList").innerHTML = `<div class="empty-editor"><strong>No activity selected</strong><span>Add an activity first.</span></div>`;
    return;
  }
  const units = state.ontologyOptions.units || [];
  const sourceEditor = (flow, flowType) => {
    const linkedOutput = linkedOutputForInput(flow, activity.id);
    const sourceValue = flow.sourceMode === "bonsai" ? "bonsai" : flow.sourceMode === "external" ? "external" : flow.sourceMode === "activity" ? "activity" : "";
    const availableOutputs = productOutputs(activity.id);
    const providerActivities = [...new Map(availableOutputs.map((item) => [item.activity.id, item.activity])).values()];
    const sourceActivityId = flow.sourceActivityId || linkedOutput?.activity.id || "";
    const sourceOutputs = availableOutputs.filter((item) => item.activity.id === sourceActivityId);
    const providerEntry = selectedBonsaiEntry(flow);
    const providerOffering = selectedBonsaiOffering(flow);
    const providerRegions = providerEntry ? [...new Set(providerEntry.offerings.map((item) => item.region))] : [];
    const contribution = bonsaiContribution(activity, flow);
    return `<section class="flow-source-picker"><h4>Source of this flow</h4>
      <select data-product-source="${flow.id}"><option value="" ${sourceValue ? "" : "selected"}>Not resolved yet</option><option value="bonsai" ${sourceValue === "bonsai" ? "selected" : ""}>BONSAI background dataset</option>${flow.direction === "input" && flowType.className === "ProductFlow" ? `<option value="activity" ${sourceValue === "activity" ? "selected" : ""}>Produced by another activity in this product system</option>` : ""}<option value="external" ${sourceValue === "external" ? "selected" : ""}>External product or DPP</option></select>
      ${flow.sourceMode === "activity" ? `<p class="method-note">This input is supplied by an output from another activity.</p><div class="source-link-selectors"><label>Source activity<select data-source-activity="${flow.id}"><option value="">Select activity</option>${providerActivities.map((providerActivity) => `<option value="${escapeHtml(providerActivity.id)}" ${providerActivity.id === sourceActivityId ? "selected" : ""}>${escapeHtml(providerActivity.name || "Untitled activity")}</option>`).join("")}</select></label><label>Source output<select data-source-output="${flow.id}" ${sourceActivityId ? "" : "disabled"}><option value="">Select output</option>${sourceOutputs.map(({ flow: providerFlow }) => `<option value="${escapeHtml(providerFlow.uri || providerFlow.id)}" ${(providerFlow.uri || providerFlow.id) === flow.linkedOutputFlowUri ? "selected" : ""}>${escapeHtml(providerFlow.label || "Unnamed output")}</option>`).join("")}</select></label></div>${linkedOutput ? `<div class="source-link-card"><strong>Linked activity output</strong><span>${escapeHtml(linkedOutput.activity.name)} → ${escapeHtml(linkedOutput.flow.label)}</span></div>` : ""}<details class="ontology-details compact-ontology"><summary>Ontology details</summary><p>ProductSystem → hasFlowLink → FlowLink. The output and input remain separate flows.</p></details>` : ""}
      ${flow.sourceMode === "external" ? `<div class="source-link-card"><strong>External product or DPP</strong><span>Reference-only connection. Preserve the selected external FlowType URI when importing a dataset.</span></div>` : ""}
      ${flow.sourceMode === "bonsai" ? `<div class="bonsai-controls single-combobox"><label>Select BONSAI background dataset<input role="combobox" aria-expanded="${state.bonsai.openFlowId === flow.id}" type="search" value="${escapeHtml(flow.bonsaiSearch || providerEntry?.label || "")}" placeholder="Search BONSAI process or code" data-bonsai-search-flow="${flow.id}" autocomplete="off" /></label>
      ${state.bonsai.openFlowId === flow.id ? `<div class="ef-results ef-dropdown" role="listbox">${state.bonsai.loading ? `<span class="picker-note">Loading BONSAI catalogue…</span>` : state.bonsai.error ? `<span class="inline-error">${escapeHtml(state.bonsai.error)}</span>` : bonsaiChoices(flow).map((entry) => `<button type="button" role="option" data-select-bonsai-flow="${flow.id}" data-bonsai-code="${escapeHtml(entry.code)}"><strong>${escapeHtml(entry.label)}</strong><span>${escapeHtml(entry.code)} · ${entry.offerings.length} record${entry.offerings.length === 1 ? "" : "s"}</span></button>`).join("") || `<span class="picker-note">Type at least 2 characters to search.</span>`}</div>` : ""}
      ${providerEntry ? `<div class="bonsai-selection"><span><strong>${escapeHtml(providerEntry.label)}</strong><small>${escapeHtml(providerEntry.code)} · ${escapeHtml(providerEntry.className)}</small></span><label>Region<select data-bonsai-region="${flow.id}"><option value="">Select region</option>${providerRegions.map((region) => `<option value="${escapeHtml(region)}" ${region === flow.backgroundProvider?.region ? "selected" : ""}>${escapeHtml(region)}</option>`).join("")}</select></label><span class="locked-reference-unit"><small>BONSAI reference unit</small><strong>${escapeHtml(providerOffering?.referenceUnit || "Select region")}</strong></span></div>` : ""}
      ${providerOffering ? `<div class="provider-card"><div><span class="provider-label">BONSAI background dataset</span><strong>${escapeHtml(providerEntry.label)}</strong><small>${escapeHtml(providerEntry.code)} · ${escapeHtml(providerOffering.region)} · reference unit: ${escapeHtml(providerOffering.referenceUnit)}</small></div><details><summary>Environmental data available</summary><dl><div><dt>Source GWP100 intensity</dt><dd>${Number(providerOffering.gwp100).toLocaleString(undefined, { maximumSignificantDigits: 6 })} ${escapeHtml(providerOffering.emissionUnit)} / ${escapeHtml(providerOffering.referenceUnit)}</dd></div>${contribution.ok ? `<div><dt>Converted quantity</dt><dd>${Number(contribution.conversion.demand).toLocaleString(undefined, { maximumSignificantDigits: 6 })} ${escapeHtml(providerOffering.referenceUnit)}</dd></div><div><dt>Calculated contribution</dt><dd>${formatImpact(contribution.contributionKg)}</dd></div>` : `<div class="provider-error"><dt>Calculation</dt><dd>${escapeHtml(contribution.reason)}</dd></div>`}</dl></details></div>` : ""}</div>` : ""}
    </section>`;
  };
  const rows = (flows, heading) => `<section class="flow-group"><div class="flow-group-heading"><h3>${heading}</h3><span>${flows.length} ${flows.length === 1 ? "flow" : "flows"}</span></div>${flows.length ? flows.map((flow) => {
    const flowType = getFlowType(flow.flowTypeUri) || createFlowTypeForFlow(flow);
    const expanded = state.editingFlowId === flow.id;
    const elementaryOptions = flowType.className === "ElementaryFlow" ? elementaryChoices(flowType) : [];
    const sourceState = flow.sourceMode === "bonsai" ? "BONSAI dataset selected" : flow.sourceMode === "activity" ? "Linked activity output" : flow.sourceMode === "external" ? "External DPP reference" : flowType.className === "ElementaryFlow" ? "Direct elementary flow" : "Source not resolved";
    const providerEntry = selectedBonsaiEntry(flow);
    const providerOffering = selectedBonsaiOffering(flow);
    const quantityReady = sourceReadyForQuantity(flow, activity.id);
    const compatibleUnits = providerOffering ? compatibleUnitsForBonsai(flow) : units;
    const unitHint = !quantityReady && acceptsBonsaiProvider(flow) ? "Choose and complete the source first." : providerOffering ? `Set from BONSAI reference unit: ${providerOffering.referenceUnit}.` : "";
    const unitLocked = flow.sourceMode === "bonsai" || flow.sourceMode === "activity" || (flowType.className === "ElementaryFlow" && flowType.preferredUnitUri);
    const unitDisabled = !state.ontologyOptions.ready || !quantityReady || unitLocked;
    const unitOptions = compatibleUnits.map((item) => `<option value="${escapeHtml(item.uri)}" ${item.uri === flow.unitUri ? "selected" : ""}>${escapeHtml(bonsaiUnitOptionLabel(item, providerOffering))}</option>`).join("");
    const identityFields = `<div class="flow-definition flow-identity"><label>Flow name<input type="text" value="${escapeHtml(flow.label)}" data-flow-field="${flow.id}:label" /></label><label>Flow type<select data-flow-class="${flow.id}">${FLOW_CLASSES.map((name) => `<option value="${name}" ${name === flowType.className ? "selected" : ""}>${readableFlowType(name)}</option>`).join("")}</select></label></div>`;
    const quantityFields = `<div class="flow-quantity"><label>Amount<input type="number" step="any" value="${escapeHtml(flow.amount)}" data-flow-field="${flow.id}:amount" ${quantityReady ? "" : "disabled"} /></label><label>Unit<select data-flow-field="${flow.id}:unitUri" ${unitDisabled ? "disabled" : ""}><option value="">Select unit</option>${unitOptions}</select>${unitHint ? `<small class="field-help">${escapeHtml(unitHint)}</small>` : ""}</label></div>`;
    const elementaryPicker = flowType.className === "ElementaryFlow" ? `<section class="elementary-picker flow-elementary-picker single-combobox"><label>EF 3.1 elementary flow<input role="combobox" aria-expanded="${state.elementary.openFlowId === flow.id}" type="search" value="${escapeHtml(flowType.search || (flowType.ontologyManaged ? flowType.label : ""))}" placeholder="Search and select an elementary flow" data-ef-search-flow="${flow.id}" autocomplete="off" /></label>${state.elementary.openFlowId === flow.id ? `<div class="ef-results ef-dropdown" role="listbox">${state.elementary.loading ? `<span class="picker-note">Loading elementary flows…</span>` : elementaryOptions.map((entry) => `<button type="button" role="option" data-select-ef-flow="${flow.id}" data-ef-uri="${escapeHtml(entry.uri)}"><strong>${escapeHtml(entry.label)}</strong><span>${escapeHtml(entry.classificationLabel || "Unclassified")} · ${escapeHtml(entry.casNumber || entry.identifier)}</span></button>`).join("") || `<span class="picker-note">No matching elementary flows.</span>`}</div>` : ""}<span class="picker-note">${flowType.ontologyManaged ? "Selected from the EF 3.1 ontology." : "Start typing to open the ontology list."}</span></section>` : "";
    return `<article class="flow-card ${expanded ? "expanded" : ""}"><button class="flow-summary" type="button" data-edit-flow="${flow.id}" aria-expanded="${expanded}"><span class="direction-label ${flow.direction}">${flow.direction}</span><span class="flow-summary-main"><strong>${escapeHtml(flow.label || "Unnamed flow")}</strong><small>${escapeHtml(flow.amount)} ${escapeHtml(unitLabel(flow.unitUri))} · ${escapeHtml(readableFlowType(flowType.className))}</small></span><span class="flow-source-status">${escapeHtml(sourceState)}</span><span aria-hidden="true">${expanded ? "−" : "+"}</span></button>${expanded ? `<div class="flow-editor"><button class="remove flow-remove-top" type="button" data-remove-flow="${flow.id}">Remove</button>${identityFields}${acceptsBonsaiProvider(flow) ? sourceEditor(flow, flowType) : ""}${quantityFields}${flow.direction === "output" ? `<label class="reference-radio"><input type="radio" name="reference-${activity.id}" ${flow.determining ? "checked" : ""} data-flow-field="${flow.id}:determining" /><span>Reference output</span></label>` : ""}${elementaryPicker}</div>` : ""}</article>`;
  }).join("") : `<div class="empty-editor"><strong>No ${heading.toLowerCase()}</strong><span>Add a ${heading === "Inputs" ? "material, product, energy or elementary flow" : "product or waste output"}.</span></div>`}</section>`;
  el("flowsList").innerHTML = `<div class="flow-groups">${rows(activity.flows.filter((flow) => flow.direction === "input"), "Inputs")}${rows(activity.flows.filter((flow) => flow.direction === "output"), "Outputs")}</div>`;
  renderProcessPreview(activity);
}

function renderProcessPreview(activity) {
  const node = el("processPreview");
  if (!node) return;
  const flowTag = (flow) => `<span>${escapeHtml(flow.label || "Unnamed flow")} <small>${escapeHtml(flow.amount)} ${escapeHtml(unitLabel(flow.unitUri))}</small></span>`;
  const inputs = activity.flows.filter((flow) => flow.direction === "input");
  const outputs = activity.flows.filter((flow) => flow.direction === "output");
  node.innerHTML = `<div class="preview-column"><b>Inputs</b>${inputs.length ? inputs.map(flowTag).join("") : "<em>No inputs</em>"}</div><div class="preview-activity"><small>Activity</small><strong>${escapeHtml(activity.name || "Untitled activity")}</strong></div><div class="preview-column"><b>Outputs</b>${outputs.length ? outputs.map(flowTag).join("") : "<em>No outputs</em>"}</div>`;
}

function renderActivityValidationCenter() {
  const node = el("validationCenter");
  if (!node) return;
  const groups = state.dataset.activities.map((activity) => ({ activity, issues: activityValidationItems(activity) })).filter((group) => group.issues.length);
  if (!groups.length) {
    node.innerHTML = `<div class="validation-ok"><strong>Activities ready</strong><span>Each activity has the required modelling information.</span></div>`;
    node.classList.remove("has-errors");
    return;
  }
  node.classList.add("has-errors");
  node.innerHTML = `<div class="activity-validation-summary"><strong>${groups.reduce((count, group) => count + group.issues.length, 0)} issue${groups.reduce((count, group) => count + group.issues.length, 0) === 1 ? "" : "s"} to resolve</strong>${groups.map(({ activity, issues }) => `<section><h3>${escapeHtml(activity.name || "Untitled activity")}</h3>${issues.map((issue) => `<button type="button" data-focus-activity="${activity.id}" data-focus-flow="${issue.flowId || ""}" data-focus-field="${issue.field || ""}">${escapeHtml(issue.message)}</button>`).join("")}</section>`).join("")}</div>`;
}

function renderSummary() {
  const activities = state.dataset.activities.length;
  el("activityCount").textContent = activities;
  const contextActivities = el("datasetContextActivities");
  if (contextActivities) contextActivities.textContent = activities;
  el("stepActivityMeta").textContent = `${activities} ${activities === 1 ? "activity" : "activities"}`;
  el("stepStudyMeta").textContent = studyValidationIssues().length ? "Draft" : "Complete";
  const ready = datasetIsReady();
  const climate = climateReport();
  el("statusPill").textContent = ready ? "Ready to export" : "Needs attention";
  el("statusPill").classList.toggle("warning", !ready);
  el("stepReviewMeta").textContent = ready ? "Ready" : "Draft";
  const setOutcomeStatus = (id, text, warning) => {
    const status = el(id);
    status.textContent = text;
    status.classList.toggle("warning", Boolean(warning));
  };
  const linkCount = flowLinks().length;
  el("outcomeSystemValue").textContent = `${activities} ${activities === 1 ? "activity" : "activities"} · ${linkCount} connection${linkCount === 1 ? "" : "s"}`;
  setOutcomeStatus("outcomeSystemStatus", structureValidationIssues().length ? "Needs review" : "Connected", structureValidationIssues().length);
  el("outcomeClimateValue").textContent = climate.calculated ? formatImpact(climate.directTotal) : "Not calculated";
  setOutcomeStatus("outcomeClimateStatus", climate.calculated ? "per functional unit" : conciseClimateReason(climate), !climate.calculated);
  const exportLabel = ready ? (state.dataset.complianceLevel === "EFCompliant" ? "EF-compliant" : "Validated semantic export") : "Draft";
  setOutcomeStatus("outcomeExportStatus", exportLabel, !ready);
  el("jsonExportState").textContent = exportLabel;
  el("ttlExportState").textContent = exportLabel;
  const validationMarkup = (issues, title, detail) => {
    const visibleIssues = issues.slice(0, 6);
    const remainingIssues = issues.slice(6);
    return issues.length ? `<div><strong>${issues.length} issue${issues.length === 1 ? "" : "s"} to resolve</strong><ul>${visibleIssues.map((issue) => `<li>${escapeHtml(issue)}</li>`).join("")}</ul>${remainingIssues.length ? `<details class="validation-more"><summary>Show ${remainingIssues.length} more issue${remainingIssues.length === 1 ? "" : "s"}</summary><ul>${remainingIssues.map((issue) => `<li>${escapeHtml(issue)}</li>`).join("")}</ul></details>` : ""}</div>` : `<div class="validation-ok"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(detail)}</span></div>`;
  };
  const studyIssues = studyValidationIssues();
  const validationSets = [
    ["studyValidationCenter", studyIssues, "Goal and scope complete", "The study definition follows the implemented ontology profile."],
    ["reviewValidationCenter", validationIssues(), "Study ready to export", "Goal, scope, product system, activities and flows are connected."]
  ];
  validationSets.forEach(([id, issues, title, detail]) => {
    const node = el(id);
    if (node) { node.innerHTML = validationMarkup(issues, title, detail); node.classList.toggle("has-errors", issues.length > 0); }
  });
  renderActivityValidationCenter();
  renderBonsaiReview();
  renderClimateImpact(climate);
  renderSemanticTree();
  renderSteps();
}

function conciseClimateReason(report) {
  const unresolvedProviders = report.unresolvedBonsai.filter((row) => !/cannot be converted/i.test(row.reason)).length;
  const incompatibleUnits = report.unresolvedBonsai.filter((row) => /cannot be converted/i.test(row.reason)).length;
  const reasons = [];
  if (unresolvedProviders) reasons.push(`Resolve ${unresolvedProviders} BONSAI provider${unresolvedProviders === 1 ? "" : "s"}`);
  if (incompatibleUnits) reasons.push(`${incompatibleUnits} incompatible unit${incompatibleUnits === 1 ? "" : "s"}`);
  if (!reasons.length && (report.nonBonsaiInventory.length || report.uncharacterisedElementary.length || report.missingReferenceOutputs.length)) reasons.push("Inventory unresolved");
  return reasons.join(" · ") || "Inventory unresolved";
}

function renderBonsaiReview() {
  const node = el("reviewBonsaiLookup");
  if (!node) return;
  const rows = state.dataset.activities.flatMap((activity) => activity.flows.map((flow) => ({ activity, flow })))
    .filter(({ flow }) => flow.sourceMode === "bonsai")
    .map(({ activity, flow }) => ({ activity, flow, entry: selectedBonsaiEntry(flow), offering: selectedBonsaiOffering(flow) }));
  const source = state.bonsai.metadata;
  if (!rows.length) {
    node.innerHTML = `<div class="bonsai-review-empty"><strong>No BONSAI providers selected</strong><span>For a ProductFlow input or WasteFlow output, choose “BONSAI background provider” and select a code, region and reference unit.</span></div>`;
    return;
  }
  node.innerHTML = `<div class="bonsai-review-note">${source ? `${source.providerCodes.toLocaleString()} BONSAI provider codes · ${source.gwp100Records.toLocaleString()} GWP100 catalogue records · ${escapeHtml(source.version)}` : "BONSAI catalogue loading"}. Source intensities are provenance, not product-system results.</div>
    <div class="bonsai-review-table"><div class="bonsai-review-head"><span>Foreground flow</span><span>Selected BONSAI provider</span><span>Source intensity</span><span>Direct contribution</span></div>
      ${rows.map(({ activity, flow, entry, offering }) => { const contribution = bonsaiContribution(activity, flow); return `<div class="bonsai-review-row"><span><strong>${escapeHtml(flow.label)}</strong><small>${escapeHtml(activity.name)}</small></span><span>${entry ? `<strong>${escapeHtml(entry.label)}</strong><small>${escapeHtml(entry.code)} · ${escapeHtml(flow.backgroundProvider?.region || "region not selected")} · ${escapeHtml(flow.backgroundProvider?.referenceUnit || "reference unit not selected")}</small>` : "<small>Provider selection incomplete</small>"}</span><span>${offering ? `<strong>${Number(offering.gwp100).toLocaleString(undefined, { maximumSignificantDigits: 6 })} ${escapeHtml(offering.emissionUnit)} / ${escapeHtml(offering.referenceUnit)}</strong>` : "<small>Complete selection</small>"}</span><span>${contribution.ok ? `<strong>${formatImpact(contribution.contributionKg)}</strong><small>${Number(contribution.conversion.demand).toLocaleString(undefined, { maximumSignificantDigits: 6 })} ${escapeHtml(offering.referenceUnit)}</small>` : `<small>${escapeHtml(contribution.reason)}</small>`}</span></div>`; }).join("")}
    </div>`;
}

function renderClimateImpact(report) {
  const node = el("climateImpactContent");
  if (!node) return;
  const activityTotals = new Map();
  report.direct.forEach((row) => activityTotals.set(row.activity.id, (activityTotals.get(row.activity.id) || 0) + row.contributionKg * report.scale));
  const values = [...activityTotals.values()];
  const max = Math.max(...values, 1);
  const denominator = report.directTotal || values.reduce((sum, value) => sum + value, 0) || 1;
  const bars = [...activityTotals.entries()].map(([id, value]) => {
    const activity = state.dataset.activities.find((item) => item.id === id);
    return `<div class="contribution-row"><span>${escapeHtml(activity?.name || "Activity")}</span><div><i style="width:${Math.max(3, value / max * 100)}%"></i></div><strong>${formatImpact(value)} <small>${(value / denominator * 100).toFixed(1)}%</small></strong></div>`;
  }).join("");
  const result = report.calculated
    ? `<div class="impact-hero calculated"><span>Climate-change result</span><strong>${formatImpact(report.directTotal)} <small>per functional unit</small></strong></div>`
    : `<div class="impact-hero partial"><span>Climate impact not calculated</span><strong>Not calculated</strong><p>${escapeHtml(conciseClimateReason(report))}</p></div>`;
  const contribution = bars
    ? `<div class="contribution-card"><h3>${report.calculated ? "Contribution by activity" : "Available background contribution by activity"}</h3>${bars}</div>`
    : "";
  node.innerHTML = `${result}${contribution}`;
}

function renderSemanticTree() {
  const node = el("semanticTree");
  if (!node) return;
  node.innerHTML = `<ul><li><strong>PEFStudy</strong><span>${escapeHtml(state.study.title)}</span><ul><li><strong>Goal</strong></li><li><strong>Scope</strong><ul><li><strong>FunctionalUnit</strong><span>${escapeHtml(state.study.functionalUnit.whatProvided)}</span></li><li><strong>SystemBoundary</strong></li></ul></li><li><strong>ProductSystem</strong><span>${escapeHtml(state.productSystem.name)}</span><ul>${state.dataset.activities.map((activity) => `<li><strong>ActivityLink → Activity</strong><span>${escapeHtml(activity.name)}</span><ul>${activity.flows.map((flow) => `<li>Flow · ${escapeHtml(flow.label)} · ${escapeHtml(flowTypeLabel(flow.flowTypeUri))}</li>`).join("")}</ul></li>`).join("")}</ul></li></ul>`;
}

function renderGraph() {
  const node = el("graphPreview");
  if (!node) return;
  const report = climateReport();
  const directByFlow = new Map(report.direct.map((row) => [row.flow.id, row]));
  const connections = state.dataset.activities.flatMap((receivingActivity) => receivingActivity.flows
    .filter((flow) => flow.sourceMode === "activity")
    .map((input) => {
      const source = linkedOutputForInput(input, receivingActivity.id);
      return source ? { sourceActivity: source.activity, sourceOutput: source.flow, receivingActivity, input } : null;
    }).filter(Boolean));
  const connectedIds = new Set(connections.flatMap((link) => [link.sourceActivity.id, link.receivingActivity.id]));
  const connectedActivities = state.dataset.activities.filter((activity) => connectedIds.has(activity.id));
  const disconnectedActivities = state.dataset.activities.filter((activity) => !connectedIds.has(activity.id));
  const levels = new Map(connectedActivities.map((activity) => [activity.id, 0]));
  for (let iteration = 0; iteration < connectedActivities.length; iteration += 1) {
    connections.forEach((link) => levels.set(link.receivingActivity.id, Math.max(levels.get(link.receivingActivity.id) || 0, (levels.get(link.sourceActivity.id) || 0) + 1)));
  }
  const activityNode = (activity, disconnected = false) => {
    const stage = lifeCycleStageOptions().find((item) => item.uri === activity.lifeCycleStageUri)?.label || "Lifecycle stage pending";
    const contribution = activity.flows.reduce((sum, flow) => sum + ((directByFlow.get(flow.id)?.contributionKg || 0) * report.scale), 0);
    const reference = activity.flows.find((flow) => flow.determining);
    const inputs = activity.flows.filter((flow) => flow.direction === "input");
    const outputs = activity.flows.filter((flow) => flow.direction === "output");
    const inputRows = inputs.map((flow) => {
      const entry = selectedBonsaiEntry(flow); const offering = selectedBonsaiOffering(flow);
      const provider = flow.sourceMode === "bonsai" ? `<div class="graph-provider-node"><span>BONSAI provider</span><strong>${escapeHtml(entry?.label || "Provider pending")}</strong><small>${escapeHtml(entry?.code || "code pending")} · ${escapeHtml(offering?.region || "region pending")}</small></div>` : flow.sourceMode === "activity" ? `<small class="linked-input">Supplied through FlowLink</small>` : "";
      return `<li><span>${escapeHtml(flow.label || "Unnamed input")} · ${escapeHtml(flow.amount)} ${escapeHtml(unitLabel(flow.unitUri))}</span>${provider}</li>`;
    }).join("") || "<li><span>No inputs</span></li>";
    const outputRows = outputs.map((flow) => `<li class="${flow.determining ? "determining-output" : ""}"><span>${escapeHtml(flow.label || "Unnamed output")} · ${escapeHtml(flow.amount)} ${escapeHtml(unitLabel(flow.unitUri))}</span>${flow.determining ? "<small>Determining output</small>" : ""}</li>`).join("") || "<li><span>No outputs</span></li>";
    return `<button type="button" class="graph-activity-node ${disconnected ? "disconnected" : ""}" data-select-activity="${activity.id}"><span class="graph-stage">${escapeHtml(stage)}</span><strong>${escapeHtml(activity.name || "Untitled activity")}</strong><small>${escapeHtml(localName(activity.geographyUri))}</small>${contribution ? `<em>Climate contribution: ${formatImpact(contribution)}</em>` : ""}<div class="graph-flow-group"><b>Inputs</b><ul>${inputRows}</ul></div><div class="graph-flow-group outputs"><b>Outputs</b><ul>${outputRows}</ul></div>${reference ? `<span class="reference-output-chip">Reference: ${escapeHtml(reference.label)}</span>` : ""}</button>`;
  };
  const grouped = new Map();
  connectedActivities.forEach((activity) => { const level = levels.get(activity.id) || 0; grouped.set(level, [...(grouped.get(level) || []), activity]); });
  const columns = [...grouped.entries()].sort(([a], [b]) => a - b).map(([level, activitiesAtLevel]) => `<section class="network-column"><span>Process ${level + 1}</span>${activitiesAtLevel.map((activity) => activityNode(activity)).join("")}</section>`).join("");
  const wires = connections.map(({ sourceActivity, sourceOutput, receivingActivity, input }) => `<div class="flowlink-wire"><strong>${escapeHtml(sourceActivity.name || "Source activity")}</strong><span>${escapeHtml(sourceOutput.label)} · ${escapeHtml(sourceOutput.amount)} ${escapeHtml(unitLabel(sourceOutput.unitUri))}</span><b>→</b><i>FlowLink</i><b>→</b><span>${escapeHtml(input.label)} · ${escapeHtml(input.amount)} ${escapeHtml(unitLabel(input.unitUri))}</span><strong>${escapeHtml(receivingActivity.name || "Receiving activity")}</strong></div>`).join("");
  const disconnected = disconnectedActivities.length ? `<section class="disconnected-area"><h3>Disconnected activities</h3><div>${disconnectedActivities.map((activity) => activityNode(activity, true)).join("")}</div></section>` : "";
  const empty = state.dataset.activities.length ? "" : `<div class="graph-empty">Add an activity to view the product-system network.</div>`;
  node.innerHTML = `${columns ? `<div class="network-main">${columns}</div>` : ""}${wires ? `<section class="flowlink-network"><h3>Foreground FlowLinks</h3>${wires}</section>` : ""}${disconnected}${empty}`;
}

function renderCompatibility() {
  const report = state.compatReport;
  el("compatSection").hidden = !report;
  if (!report) return;
  const warningCount = report.warnings.length + report.unsupported.length;
  el("compatStatus").textContent = warningCount ? `${warningCount} issue${warningCount === 1 ? "" : "s"}` : "Compatible subset";
  el("compatStatus").classList.toggle("warning", warningCount > 0);
  el("compatSummary").textContent = warningCount ? `View ${warningCount} import detail${warningCount === 1 ? "" : "s"}` : "View imported ontology details";
  const items = [...report.imported.map((item) => ({ ...item, kind: "good" })), ...report.warnings.map((item) => ({ ...item, kind: "warn" })), ...report.unsupported.map((item) => ({ ...item, kind: "bad" }))];
  el("compatReport").innerHTML = `<div class="compat-grid"><div class="compat-card"><strong>${report.stats.studies || 0}</strong><span>PEFStudies</span></div><div class="compat-card"><strong>${report.stats.goals || 0}</strong><span>Goals</span></div><div class="compat-card"><strong>${report.stats.scopes || 0}</strong><span>Scopes</span></div><div class="compat-card"><strong>${report.stats.datasets}</strong><span>datasets</span></div><div class="compat-card"><strong>${report.stats.productSystems || 0}</strong><span>ProductSystems</span></div><div class="compat-card"><strong>${report.stats.activityLinks || 0}</strong><span>ActivityLinks</span></div><div class="compat-card"><strong>${report.stats.activities}</strong><span>activities</span></div><div class="compat-card"><strong>${report.stats.flows}</strong><span>flows</span></div><div class="compat-card"><strong>${report.stats.flowTypes}</strong><span>FlowTypes</span></div></div><ul class="compat-list">${items.map((item) => `<li class="compat-item ${item.kind}"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.detail)}</span></li>`).join("")}</ul>`;
}

function exportGraph() {
  const { namespace, datasetUri } = graphUris();
  const { study } = state;
  const { goal, scope, functionalUnit, systemBoundary } = study;
  const activityLinkUris = state.dataset.activities.map((activity) => activity.activityLinkUri || `${namespace}activity-link-${slug(activity.id)}`);
  const links = flowLinks();
  const graph = [
  {
    "@id": study.uri, "@type": `${NS.pefStudy}PEFStudy`, [`${NS.dcterms}title`]: study.title,
    [`${NS.pefStudy}hasGoal`]: { "@id": goal.uri }, [`${NS.pefStudy}hasScope`]: { "@id": scope.uri },
    [`${NS.pefStudy}hasProductSystem`]: { "@id": state.productSystem.uri }
  },
  {
    "@id": goal.uri, "@type": `${NS.pefStudy}Goal`, [`${NS.pefStudy}intendedApplication`]: goal.intendedApplication,
    ...(goal.decisionContext ? { [`${NS.pefStudy}decisionContext`]: goal.decisionContext } : {}),
    [`${NS.pefStudy}commissioner`]: { "@id": goal.commissionerUri }, [`${NS.pefStudy}verifier`]: { "@id": goal.verifierUri }
  },
  { "@id": goal.commissionerUri, "@type": `${NS.foaf}Agent`, [`${NS.foaf}name`]: goal.commissionerName },
  { "@id": goal.verifierUri, "@type": `${NS.foaf}Agent`, [`${NS.foaf}name`]: goal.verifierName },
  {
    "@id": scope.uri, "@type": `${NS.pefStudy}Scope`,
    [`${NS.pefStudy}hasFunctionalUnit`]: { "@id": functionalUnit.uri },
    [`${NS.pefStudy}hasSystemBoundary`]: { "@id": systemBoundary.uri },
    [`${NS.pefStudy}includesImpactCategory`]: scope.impactCategoryUris.map((uri) => ({ "@id": uri })),
    ...(scope.assumption ? { [`${NS.pefStudy}hasAssumption`]: scope.assumption } : {}),
    ...(scope.limitation ? { [`${NS.pefStudy}hasLimitation`]: scope.limitation } : {}),
    ...(scope.biodiversityRelevance ? { [`${NS.pefStudy}biodiversityRelevance`]: scope.biodiversityRelevance } : {})
  },
  {
    "@id": functionalUnit.uri, "@type": `${NS.pefStudy}FunctionalUnit`,
    [`${NS.pefStudy}whatProvided`]: functionalUnit.whatProvided, [`${NS.pefStudy}howWellProvided`]: functionalUnit.howWellProvided,
    [`${NS.pefStudy}howMuchProvided`]: { "@type": `${NS.om}Measure`, [`${NS.om}hasUnit`]: { "@id": functionalUnit.howMuchUnitUri }, [`${NS.om}hasNumericalValue`]: { "@value": functionalUnit.howMuchValue, "@type": `${NS.xsd}decimal` } },
    [`${NS.pefStudy}howLongProvided`]: { "@type": `${NS.om}Measure`, [`${NS.om}hasUnit`]: { "@id": functionalUnit.howLongUnitUri }, [`${NS.om}hasNumericalValue`]: { "@value": functionalUnit.howLongValue, "@type": `${NS.xsd}decimal` } },
    [`${NS.pefStudy}hasReferenceFlow`]: { "@id": functionalUnit.referenceFlowUri },
    [`${NS.pefStudy}RFtoFUConversion`]: { "@value": functionalUnit.conversionFactor, "@type": `${NS.xsd}double` },
    ...(functionalUnit.notCoveredAspect ? { [`${NS.pefStudy}notCoveredAspect`]: functionalUnit.notCoveredAspect } : {})
  },
  {
    "@id": systemBoundary.uri, "@type": `${NS.pefStudy}SystemBoundary`,
    [`${NS.pefStudy}hasBoundaryType`]: { "@id": systemBoundary.boundaryTypeUri },
    [`${NS.pefStudy}cutOffCriteria`]: systemBoundary.cutOffCriteria, [`${NS.pefStudy}hasJustification`]: systemBoundary.justification,
    ...(systemBoundary.excludesActivity ? { [`${NS.pefStudy}excludesActivity`]: systemBoundary.excludesActivity } : {}),
    ...(systemBoundary.exclusionJustification ? { [`${NS.pefStudy}exclusionJustification`]: systemBoundary.exclusionJustification } : {})
  },
  {
    "@id": datasetUri, "@type": `${NS.dataset}LCIDataset`, [`${NS.dcterms}title`]: state.dataset.title,
    [`${NS.dataset}hasDatasetType`]: { "@id": `${NS.dataset}${state.dataset.type}` },
    [`${NS.dataset}hasComplianceLevel`]: { "@id": `${NS.dataset}${state.dataset.complianceLevel}` },
    [`${NS.dataset}containsActivity`]: state.dataset.activities.map((activity) => ({ "@id": activity.uri || `${namespace}${slug(activity.id)}` }))
  }];
  graph.push({
    "@id": state.productSystem.uri, "@type": `${NS.productSystem}ProductSystem`,
    [`${NS.rdfs}label`]: state.productSystem.name,
    [`${NS.productSystem}hasActivityLink`]: activityLinkUris.map((uri) => ({ "@id": uri })),
    ...(links.length ? { [`${NS.productSystem}hasFlowLink`]: links.map((link) => ({ "@id": link.uri })) } : {})
  });
  links.forEach((link) => graph.push({
    "@id": link.uri, "@type": `${NS.productSystem}FlowLink`,
    [`${NS.productSystem}flowFrom`]: { "@id": link.flowFrom },
    [`${NS.productSystem}toFlow`]: { "@id": link.toFlow }
  }));
  state.flowTypes.filter((item) => !item.ontologyManaged).forEach((item) => graph.push({
    "@id": item.uri, "@type": `${NS.flow}${item.className}`, [`${NS.flow}sourcedFrom`]: { "@id": datasetUri }, [`${NS.rdfs}label`]: item.label
  }));
  state.dataset.activities.forEach((activity) => {
    const activityUri = activity.uri || `${namespace}${slug(activity.id)}`;
    const activityLinkUri = activity.activityLinkUri || `${namespace}activity-link-${slug(activity.id)}`;
    const determining = activity.flows.find((flow) => flow.determining);
    graph.push({
      "@id": activityLinkUri, "@type": `${NS.productSystem}ActivityLink`,
      [`${NS.productSystem}forActivity`]: { "@id": activityUri },
      ...(activity.lifeCycleStageUri ? { [`${NS.productSystem}hasLifeCycleStage`]: { "@id": activity.lifeCycleStageUri } } : {})
    });
    graph.push({
      "@id": activityUri, "@type": `${NS.activity}Activity`,
      [`${NS.rdfs}label`]: activity.name,
      [`${NS.activity}isCompanySpecific`]: activity.companySpecific, [`${NS.activity}hasGeography`]: { "@id": activity.geographyUri },
      ...(determining ? { [`${NS.activity}hasDeterminingFlow`]: { "@id": determining.uri || `${namespace}${slug(determining.id)}` } } : {})
    });
    activity.flows.forEach((flow) => {
      const providerActivityUri = selectedBonsaiOffering(flow)?.activityUri;
      graph.push({
      "@id": flow.uri || `${namespace}${slug(flow.id)}`, "@type": `${NS.flow}Flow`, [`${NS.flow}hasFlowType`]: { "@id": flow.flowTypeUri },
      [`${NS.flow}contextualLabel`]: flow.label,
      [flow.direction === "output" ? `${NS.activity}outputOf` : `${NS.activity}inputOf`]: { "@id": activityUri },
      ...(providerActivityUri ? { [`${NS.dcterms}source`]: { "@id": providerActivityUri } } : {}),
      [`${NS.flow}hasMeasure`]: {
        "@type": `${NS.om}Measure`,
        [`${NS.om}hasUnit`]: { "@id": flow.unitUri },
        [`${NS.om}hasNumericalValue`]: { "@value": flow.amount, "@type": `${NS.xsd}decimal` }
      }
    });
    });
  });
  return graph;
}

function toJson() {
  return JSON.stringify({ "@context": { "@vocab": NS.flow, dcterms: NS.dcterms }, "@graph": exportGraph() }, null, 2);
}

function toTtl() {
  const { namespace, datasetUri } = graphUris();
  const { study } = state;
  const { goal, scope, functionalUnit, systemBoundary } = study;
  const lines = [
    `@prefix : <${namespace}> .`, `@prefix dataset: <${NS.dataset}> .`, `@prefix act: <${NS.activity}> .`,
    `@prefix flow: <${NS.flow}> .`, `@prefix prs: <${NS.productSystem}> .`, `@prefix ps: <${NS.pefStudy}> .`,
    `@prefix om: <${NS.om}> .`, `@prefix dcterms: <${NS.dcterms}> .`, `@prefix foaf: <${NS.foaf}> .`,
    `@prefix rdfs: <${NS.rdfs}> .`, `@prefix xsd: <${NS.xsd}> .`, ""
  ];
  lines.push(`${iri(study.uri)} a ps:PEFStudy ;`, `  dcterms:title "${escapeTtl(study.title)}"@en ;`, `  ps:hasGoal ${iri(goal.uri)} ;`, `  ps:hasScope ${iri(scope.uri)} ;`, `  ps:hasProductSystem ${iri(state.productSystem.uri)} .`, "");
  lines.push(`${iri(goal.uri)} a ps:Goal ;`, `  ps:intendedApplication "${escapeTtl(goal.intendedApplication)}"^^xsd:string${goal.decisionContext ? " ;" : " ;"}`);
  if (goal.decisionContext) lines.push(`  ps:decisionContext "${escapeTtl(goal.decisionContext)}"^^xsd:string ;`);
  lines.push(`  ps:commissioner ${iri(goal.commissionerUri)} ;`, `  ps:verifier ${iri(goal.verifierUri)} .`, "");
  lines.push(`${iri(goal.commissionerUri)} a foaf:Agent ; foaf:name "${escapeTtl(goal.commissionerName)}" .`, `${iri(goal.verifierUri)} a foaf:Agent ; foaf:name "${escapeTtl(goal.verifierName)}" .`, "");
  const scopeOptional = [["hasAssumption", scope.assumption], ["hasLimitation", scope.limitation], ["biodiversityRelevance", scope.biodiversityRelevance]].filter(([, value]) => value);
  const scopeProperties = [
    ["ps:hasFunctionalUnit", iri(functionalUnit.uri)],
    ["ps:hasSystemBoundary", iri(systemBoundary.uri)],
    ...(scope.impactCategoryUris.length ? [["ps:includesImpactCategory", scope.impactCategoryUris.map(iri).join(", ")]] : []),
    ...scopeOptional.map(([property, value]) => [`ps:${property}`, `"${escapeTtl(value)}"^^xsd:string`]),
  ];
  lines.push(`${iri(scope.uri)} a ps:Scope ;`);
  scopeProperties.forEach(([property, value], index) => lines.push(`  ${property} ${value}${index === scopeProperties.length - 1 ? " ." : " ;"}`));
  lines.push("");
  lines.push(`${iri(functionalUnit.uri)} a ps:FunctionalUnit ;`, `  ps:whatProvided "${escapeTtl(functionalUnit.whatProvided)}"^^xsd:string ;`, `  ps:howWellProvided "${escapeTtl(functionalUnit.howWellProvided)}"^^xsd:string ;`, `  ps:howMuchProvided [ a om:Measure ; om:hasUnit ${iri(functionalUnit.howMuchUnitUri)} ; om:hasNumericalValue "${escapeTtl(functionalUnit.howMuchValue)}"^^xsd:decimal ] ;`, `  ps:howLongProvided [ a om:Measure ; om:hasUnit ${iri(functionalUnit.howLongUnitUri)} ; om:hasNumericalValue "${escapeTtl(functionalUnit.howLongValue)}"^^xsd:decimal ] ;`, `  ps:hasReferenceFlow ${iri(functionalUnit.referenceFlowUri)} ;`, `  ps:RFtoFUConversion "${escapeTtl(functionalUnit.conversionFactor)}"^^xsd:double${functionalUnit.notCoveredAspect ? " ;" : " ."}`);
  if (functionalUnit.notCoveredAspect) lines.push(`  ps:notCoveredAspect "${escapeTtl(functionalUnit.notCoveredAspect)}"^^xsd:string .`);
  lines.push("");
  lines.push(`${iri(systemBoundary.uri)} a ps:SystemBoundary ;`, `  ps:hasBoundaryType ${iri(systemBoundary.boundaryTypeUri)} ;`, `  ps:cutOffCriteria "${escapeTtl(systemBoundary.cutOffCriteria)}"^^xsd:string ;`, `  ps:hasJustification "${escapeTtl(systemBoundary.justification)}"^^xsd:string${systemBoundary.excludesActivity || systemBoundary.exclusionJustification ? " ;" : " ."}`);
  const boundaryOptional = [["excludesActivity", systemBoundary.excludesActivity], ["exclusionJustification", systemBoundary.exclusionJustification]].filter(([, value]) => value);
  boundaryOptional.forEach(([property, value], index) => lines.push(`  ps:${property} "${escapeTtl(value)}"^^xsd:string${index === boundaryOptional.length - 1 ? " ." : " ;"}`));
  lines.push("");
  const activityUris = state.dataset.activities.map((activity) => activity.uri || `${namespace}${slug(activity.id)}`);
  lines.push(`${iri(datasetUri)} a dataset:LCIDataset ;`, `  dcterms:title "${escapeTtl(state.dataset.title)}"@en ;`, `  dataset:hasDatasetType dataset:${state.dataset.type} ;`, `  dataset:hasComplianceLevel dataset:${state.dataset.complianceLevel}${activityUris.length ? " ;" : " ."}`);
  if (activityUris.length) lines.push(`  dataset:containsActivity ${activityUris.map(iri).join(", ")} .`);
  lines.push("");

  const activityLinkUris = state.dataset.activities.map((activity) => activity.activityLinkUri || `${namespace}activity-link-${slug(activity.id)}`);
  const links = flowLinks();
  lines.push(`${iri(state.productSystem.uri)} a prs:ProductSystem ;`, `  rdfs:label "${escapeTtl(state.productSystem.name)}"@en${activityLinkUris.length || links.length ? " ;" : " ."}`);
  if (activityLinkUris.length) lines.push(`  prs:hasActivityLink ${activityLinkUris.map(iri).join(", ")}${links.length ? " ;" : " ."}`);
  if (links.length) lines.push(`  prs:hasFlowLink ${links.map((link) => iri(link.uri)).join(", ")} .`);
  lines.push("");

  links.forEach((link) => lines.push(`${iri(link.uri)} a prs:FlowLink ;`, `  prs:flowFrom ${iri(link.flowFrom)} ;`, `  prs:toFlow ${iri(link.toFlow)} .`, ""));

  state.flowTypes.filter((item) => !item.ontologyManaged).forEach((item) => lines.push(
    `${iri(item.uri)} a flow:${item.className} ;`, `  flow:sourcedFrom ${iri(datasetUri)} ;`, `  rdfs:label "${escapeTtl(item.label)}"@en .`, ""
  ));
  state.dataset.activities.forEach((activity) => {
    const activityUri = activity.uri || `${namespace}${slug(activity.id)}`;
    const activityLinkUri = activity.activityLinkUri || `${namespace}activity-link-${slug(activity.id)}`;
    const determining = activity.flows.find((flow) => flow.determining);
    lines.push(`${iri(activityLinkUri)} a prs:ActivityLink ;`, `  prs:forActivity ${iri(activityUri)}${activity.lifeCycleStageUri ? " ;" : " ."}`);
    if (activity.lifeCycleStageUri) lines.push(`  prs:hasLifeCycleStage ${iri(activity.lifeCycleStageUri)} .`);
    lines.push("");
    lines.push(`${iri(activityUri)} a act:Activity ;`, `  rdfs:label "${escapeTtl(activity.name)}"@en ;`, `  act:isCompanySpecific "${activity.companySpecific}"^^xsd:boolean ;`, `  act:hasGeography ${iri(activity.geographyUri)}${determining ? " ;" : " ."}`);
    if (determining) lines.push(`  act:hasDeterminingFlow ${iri(determining.uri || `${namespace}${slug(determining.id)}`)} .`);
    lines.push("");
    activity.flows.forEach((flow) => {
      const providerActivityUri = selectedBonsaiOffering(flow)?.activityUri;
      lines.push(
        `${iri(flow.uri || `${namespace}${slug(flow.id)}`)} a flow:Flow ;`, `  flow:hasFlowType ${iri(flow.flowTypeUri)} ;`,
        `  flow:contextualLabel "${escapeTtl(flow.label)}"@en ;`, `  ${flow.direction === "output" ? "act:outputOf" : "act:inputOf"} ${iri(activityUri)} ;`,
        ...(providerActivityUri ? [`  dcterms:source ${iri(providerActivityUri)} ;`] : []),
        `  flow:hasMeasure [ a om:Measure ; om:hasUnit ${iri(flow.unitUri)} ; om:hasNumericalValue "${escapeTtl(flow.amount)}"^^xsd:decimal ] .`, ""
      );
    });
  });
  return lines.join("\n");
}

function renderExport() {
  el("showJson").classList.toggle("active", state.exportMode === "json");
  el("showTtl").classList.toggle("active", state.exportMode === "ttl");
  el("exportOutput").value = state.exportMode === "json" ? toJson() : toTtl();
}

function refreshDerivedViews() {
  renderDatasetNav(); renderActivityNav(); renderSummary(); renderGraph(); renderCompatibility(); renderExport();
}

function closeDisclosures() {
  document.querySelector(".source-details")?.removeAttribute("open");
  document.querySelector(".compat-details")?.removeAttribute("open");
  document.querySelector(".header-menu")?.removeAttribute("open");
}

function applyImportedTtl(text, source) {
  const imported = parseTtlSubset(text);
  imported.report.source = source;
  state.dataset = imported.dataset;
  state.productSystem = imported.productSystem;
  state.flowTypes = imported.flowTypes;
  state.study = imported.study;
  state.compatReport = imported.report;
  state.activeActivityId = state.dataset.activities[0]?.id || "";
  state.activeStep = "review";
  state.exportMode = "ttl";
  if (state.flowTypes.some((item) => item.className === "ElementaryFlow")) loadElementaryIndex();
  render(); closeDisclosures();
}

async function loadBundledPvTtl() {
  try {
    const response = await fetch("examples/pv_excel_import/pv_panel_lci_ontology.ttl");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    applyImportedTtl(await response.text(), "PV Excel ontology example");
  } catch (error) {
    state.compatReport = { source: "PV Excel ontology example", imported: [], warnings: [], unsupported: [{ title: "Import failed", detail: error.message }], stats: { statements: 0, datasets: 0, productSystems: 0, activityLinks: 0, activities: 0, flows: 0, flowTypes: 0 } };
    renderCompatibility();
  }
}

function loadUploadedTtl(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try { applyImportedTtl(String(reader.result || ""), file.name); }
    catch (error) {
      state.compatReport = { source: file.name, imported: [], warnings: [], unsupported: [{ title: "Import failed", detail: error.message }], stats: { statements: 0, datasets: 0, activities: 0, flows: 0, flowTypes: 0 } };
      renderCompatibility();
    }
  });
  reader.readAsText(file);
}

function addActivity() {
  const id = uid("act");
  const { namespace } = graphUris();
  const geographyUri = state.ontologyOptions.geographies.find((item) => item.identifier === "GLO")?.uri || state.ontologyOptions.geographies[0]?.uri || "";
  state.dataset.activities.push({
    id, uri: `${namespace}${id}`, name: "New activity",
    activityLinkUri: `${namespace}activity-link-${id}`,
    lifeCycleStageUri: "",
    geographyUri, companySpecific: true, flows: []
  });
  state.activeActivityId = id;
  state.activeStep = "activities";
  render();
}

function addFlowType() {
  const id = uid("ft");
  const { namespace } = graphUris();
  state.flowTypes.push({ id, uri: `${namespace}${id}`, label: "New exchanged entity", className: "ProductFlow", ontologyManaged: false, preferredUnitUri: "", search: "" });
  renderFlowTypeRegistry(); renderFlows(); refreshDerivedViews();
}

function addFlowTypeForFlow(flowId) {
  const activity = getActiveActivity();
  const flow = activity?.flows.find((item) => item.id === flowId);
  if (!flow) return;
  const id = uid("ft");
  const { namespace } = graphUris();
  const item = { id, uri: `${namespace}${id}`, label: "New FlowType", className: "ProductFlow", ontologyManaged: false, preferredUnitUri: "", search: "" };
  state.flowTypes.push(item);
  flow.flowTypeUri = item.uri;
  state.editingFlowId = flow.id;
  render();
}

function addFlow(direction) {
  const activity = getActiveActivity();
  if (!activity) return;
  const id = uid("flow");
  const { namespace } = graphUris();
  const flow = {
    id, uri: `${namespace}${id}`, label: direction === "output" ? "new output" : "new input", direction,
    flowTypeUri: "", amount: direction === "output" ? "1" : "", unitUri: "",
    determining: direction === "output" && !activity.flows.some((flow) => flow.determining)
  };
  activity.flows.push(flow);
  createFlowTypeForFlow(flow);
  render();
}

function loadExample() {
  const ns = "https://w3id.org/cerise-see/examples/pv#";
  state.productSystem = { uri: `${ns}product-system`, name: "PV panel product system" };
  state.flowTypes = [
    { id: "ft-panel", uri: `${ns}photovoltaic-panel`, label: "photovoltaic panel, single-Si, at plant", className: "ProductFlow", ontologyManaged: false, preferredUnitUri: "", search: "" },
    { id: "ft-cell", uri: `${ns}photovoltaic-cell`, label: "photovoltaic cell, single-Si, at plant", className: "ProductFlow", ontologyManaged: false, preferredUnitUri: "", search: "" },
    { id: "ft-aluminium", uri: `${ns}aluminium-alloy`, label: "aluminium alloy, AlMg3, at plant", className: "ProductFlow", ontologyManaged: false, preferredUnitUri: "", search: "" }
  ];
  state.dataset = {
    uri: `${ns}pv-panel-dataset`, namespace: ns, title: "PV panel ontology example", type: "DPP", complianceLevel: "EFCompliant",
    activities: [{
      id: "panel-production", uri: `${ns}panel-production`, name: "Panel production",
      activityLinkUri: `${ns}activity-link-panel-production`, lifeCycleStageUri: `${NS.productSystem}Manufacturing`,
      geographyUri: CN_URI, companySpecific: true,
      flows: [
        { id: "panel-output", uri: `${ns}panel-output`, label: "photovoltaic panel", direction: "output", flowTypeUri: `${ns}photovoltaic-panel`, amount: "1", unitUri: KG_URI, determining: true },
        { id: "cell-input", uri: `${ns}cell-input`, label: "photovoltaic cell", direction: "input", flowTypeUri: `${ns}photovoltaic-cell`, amount: "0.935415", unitUri: KG_URI, determining: false },
        { id: "aluminium-input", uri: `${ns}aluminium-input`, label: "aluminium frame", direction: "input", flowTypeUri: `${ns}aluminium-alloy`, amount: "2.125", unitUri: KG_URI, determining: false }
      ]
    }]
  };
  state.study = defaultStudy(ns, `${ns}panel-output`, "PV panel PEF study");
  state.study.functionalUnit.whatProvided = "One photovoltaic panel";
  state.study.functionalUnit.howWellProvided = "Electricity-generating panel at the specified performance";
  state.activeActivityId = "panel-production"; state.compatReport = null; state.activeStep = "activities"; state.exportMode = "json";
  render(); closeDisclosures();
}

function resetDataset() {
  const hasWork = state.dataset.activities.length > 0 || state.flowTypes.length > 0 || state.dataset.title !== "Untitled LCI dataset";
  if (hasWork && !window.confirm("Start a new dataset? Your current unsaved work will be cleared.")) return;
  const ns = "https://w3id.org/cerise-see/datasets/new#";
  state.productSystem = { uri: `${ns}product-system`, name: "Untitled product system" };
  state.dataset = { uri: `${ns}untitled-lci-dataset`, namespace: ns, title: "Untitled LCI dataset", type: "DPP", complianceLevel: "EFCompliant", activities: [] };
  state.flowTypes = [];
  state.study = defaultStudy(ns);
  state.activeActivityId = ""; state.compatReport = null; state.activeStep = "dataset"; state.exportMode = "json";
  render(); closeDisclosures();
}

function updateFlowTypeUri(item, newUri) {
  const oldUri = item.uri;
  item.uri = newUri;
  state.dataset.activities.forEach((activity) => activity.flows.forEach((flow) => {
    if (flow.flowTypeUri === oldUri) flow.flowTypeUri = newUri;
  }));
}

function handleEditorEvent(event) {
  const target = event.target;
  if (target instanceof HTMLTextAreaElement) autoSizeTextarea(target);
  const studyFields = {
    studyTitle: ["title"], studyUri: ["uri"], intendedApplication: ["goal", "intendedApplication"], decisionContext: ["goal", "decisionContext"],
    commissionerName: ["goal", "commissionerName"], commissionerUri: ["goal", "commissionerUri"], verifierName: ["goal", "verifierName"], verifierUri: ["goal", "verifierUri"],
    fuWhat: ["functionalUnit", "whatProvided"], fuHowWell: ["functionalUnit", "howWellProvided"], fuHowMuchValue: ["functionalUnit", "howMuchValue"],
    fuHowMuchUnit: ["functionalUnit", "howMuchUnitUri"], fuHowLongValue: ["functionalUnit", "howLongValue"], fuHowLongUnit: ["functionalUnit", "howLongUnitUri"],
    fuReferenceFlow: ["functionalUnit", "referenceFlowUri"], fuConversion: ["functionalUnit", "conversionFactor"], fuNotCovered: ["functionalUnit", "notCoveredAspect"],
    boundaryType: ["systemBoundary", "boundaryTypeUri"], cutOffCriteria: ["systemBoundary", "cutOffCriteria"], boundaryJustification: ["systemBoundary", "justification"],
    excludedActivity: ["systemBoundary", "excludesActivity"], exclusionJustification: ["systemBoundary", "exclusionJustification"],
    scopeAssumption: ["scope", "assumption"], scopeLimitation: ["scope", "limitation"], biodiversityRelevance: ["scope", "biodiversityRelevance"]
  };
  if (target.id === "activeActivity") return;
  if (target.dataset.impactCategory) {
    const categories = new Set(state.study.scope.impactCategoryUris);
    if (target.checked) categories.add(target.dataset.impactCategory); else categories.delete(target.dataset.impactCategory);
    state.study.scope.impactCategoryUris = [...categories];
    refreshDerivedViews(); return;
  }
  if (studyFields[target.id]) {
    const path = studyFields[target.id];
    let owner = state.study;
    path.slice(0, -1).forEach((key) => { owner = owner[key]; });
    owner[path.at(-1)] = target.value;
    refreshDerivedViews(); return;
  }
  if (target.id === "datasetTitle") state.dataset.title = target.value;
  else if (target.id === "datasetNamespace") state.dataset.namespace = ensureNamespace(target.value);
  else if (target.id === "datasetType") state.dataset.type = target.value;
  else if (target.id === "complianceLevel") state.dataset.complianceLevel = target.value;
  else if (target.id === "productSystemName") state.productSystem.name = target.value;
  else if (target.id === "productSystemUri") state.productSystem.uri = target.value.trim();
  else if (target.dataset.activityField) {
    const [id, field] = target.dataset.activityField.split(":");
    const activity = state.dataset.activities.find((item) => item.id === id);
    if (activity) activity[field] = ["checkbox", "radio"].includes(target.type) ? target.checked : target.value;
    if (field === "geographyUri") renderActivities();
    renderActivityNav(); renderActivitySelector(); refreshDerivedViews(); return;
  } else if (target.dataset.flowField) {
    const [id, field] = target.dataset.flowField.split(":");
    const activity = getActiveActivity();
    const flow = activity?.flows.find((item) => item.id === id);
    if (flow) {
      flow[field] = ["checkbox", "radio"].includes(target.type) ? target.checked : target.value;
      if (field === "label") {
        const flowType = getFlowType(flow.flowTypeUri);
        const uses = state.dataset.activities.reduce((count, item) => count + item.flows.filter((candidate) => candidate.flowTypeUri === flow.flowTypeUri).length, 0);
        if (flowType && !flowType.ontologyManaged && uses === 1) flowType.label = flow.label;
      }
      if (field === "determining" && target.checked) activity.flows.forEach((item) => { if (item.id !== flow.id) item.determining = false; });
      if (field === "flowTypeUri") {
        const entity = getFlowType(flow.flowTypeUri);
        if (entity?.className === "ElementaryFlow" && entity.preferredUnitUri) flow.unitUri = entity.preferredUnitUri;
        renderFlowTypeRegistry();
      }
    }
    if (field === "determining" || field === "flowTypeUri") { renderFlows(); renderStudy(); }
    refreshDerivedViews(); return;
  } else if (target.dataset.flowClass) {
    const activity = getActiveActivity();
    const flow = activity?.flows.find((item) => item.id === target.dataset.flowClass);
    if (flow) {
      const item = editableFlowType(flow, target.value);
      item.className = target.value;
      item.ontologyManaged = false;
      item.preferredUnitUri = "";
      item.search = "";
      flow.sourceMode = "";
      flow.linkedOutputFlowUri = "";
      flow.backgroundProvider = null;
      flow.bonsaiSearch = "";
      removeUnusedFlowTypes();
      if (target.value === "ElementaryFlow") loadElementaryIndex();
    }
    renderFlows(); refreshDerivedViews(); return;
  } else if (target.dataset.flowtypeField) {
    const [id, field] = target.dataset.flowtypeField.split(":");
    const item = state.flowTypes.find((entry) => entry.id === id);
    if (item) {
      if (field === "uri") updateFlowTypeUri(item, target.value.trim());
      else item[field] = target.value;
      if (field === "className" && item.className === "ElementaryFlow") {
        item.ontologyManaged = false; item.preferredUnitUri = ""; item.search = ""; loadElementaryIndex();
      }
      if (field === "className" && item.className !== "ElementaryFlow") { item.ontologyManaged = false; item.preferredUnitUri = ""; item.search = ""; }
    }
    if (event.type === "input" && field !== "className") { refreshDerivedViews(); return; }
    renderFlowTypeRegistry(); renderFlows(); refreshDerivedViews(); return;
  } else if (target.dataset.efSearchFlow) {
    if (event.type !== "input") return;
    const flow = findFlow(target.dataset.efSearchFlow);
    const item = flow ? editableFlowType(flow, "ElementaryFlow") : null;
    if (item) item.search = target.value;
    state.elementary.openFlowId = target.dataset.efSearchFlow;
    if (!state.elementary.entries) loadElementaryIndex();
    const searchId = target.dataset.efSearchFlow;
    const cursor = target.value.length;
    renderFlows();
    const replacement = document.querySelector(`[data-ef-search-flow="${searchId}"]`);
    if (replacement) { replacement.focus(); replacement.setSelectionRange(cursor, cursor); }
    return;
  } else if (target.dataset.bonsaiSearchFlow) {
    if (event.type !== "input") return;
    const flow = findFlow(target.dataset.bonsaiSearchFlow);
    if (flow) flow.bonsaiSearch = target.value;
    state.bonsai.openFlowId = target.dataset.bonsaiSearchFlow;
    loadBonsaiIndex();
    const searchId = target.dataset.bonsaiSearchFlow;
    const cursor = target.value.length;
    renderFlows();
    const replacement = document.querySelector(`[data-bonsai-search-flow="${searchId}"]`);
    if (replacement) { replacement.focus(); replacement.setSelectionRange(cursor, cursor); }
    return;
  } else if (target.dataset.bonsaiRegion) {
    const flow = findFlow(target.dataset.bonsaiRegion);
    if (flow?.backgroundProvider) {
      flow.backgroundProvider.region = target.value;
      flow.backgroundProvider.referenceUnit = "";
      applyBonsaiOfferingDefaults(flow);
    }
    renderFlows(); refreshDerivedViews(); return;
  } else if (target.dataset.bonsaiUnit) {
    const flow = findFlow(target.dataset.bonsaiUnit);
    if (flow?.backgroundProvider) {
      flow.backgroundProvider.referenceUnit = target.value;
      reconcileBonsaiFlowUnit(flow);
    }
    renderFlows(); refreshDerivedViews(); return;
  } else if (target.dataset.productSource) {
    const flow = findFlow(target.dataset.productSource);
    if (flow) {
      flow.sourceMode = ["bonsai", "external", "activity"].includes(target.value) ? target.value : "";
      flow.linkedOutputFlowUri = "";
      flow.sourceActivityId = "";
      if (flow.sourceMode !== "bonsai") { flow.backgroundProvider = null; flow.bonsaiSearch = ""; state.bonsai.openFlowId = ""; }
      if (flow.sourceMode === "bonsai") loadBonsaiIndex();
      removeUnusedFlowTypes();
    }
    render(); return;
  } else if (target.dataset.sourceActivity) {
    const flow = findFlow(target.dataset.sourceActivity);
    if (flow) {
      flow.sourceActivityId = target.value;
      flow.linkedOutputFlowUri = "";
    }
    renderFlows(); refreshDerivedViews(); return;
  } else if (target.dataset.sourceOutput) {
    const flow = findFlow(target.dataset.sourceOutput);
    const provider = productOutputs().find((item) => (item.flow.uri || item.flow.id) === target.value);
    if (flow && provider) {
      flow.sourceMode = "activity";
      flow.sourceActivityId = provider.activity.id;
      flow.linkedOutputFlowUri = target.value;
      flow.flowTypeUri = provider.flow.flowTypeUri;
      flow.label = provider.flow.label;
      if (flow.unitUri !== provider.flow.unitUri) {
        flow.unitUri = provider.flow.unitUri;
        flow.amount = "";
      }
    }
    removeUnusedFlowTypes(); render(); return;
  } else return;
  refreshDerivedViews();
}

function showExportFeedback(message) {
  el("exportFeedback").textContent = message;
  clearTimeout(showExportFeedback.timer);
  showExportFeedback.timer = setTimeout(() => { el("exportFeedback").textContent = ""; }, 2400);
}

function downloadExport(mode) {
  const content = mode === "json" ? toJson() : toTtl();
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([content], { type: mode === "json" ? "application/ld+json" : "text/turtle" }));
  link.download = `${slug(state.dataset.title)}.${mode === "json" ? "jsonld" : "ttl"}`;
  document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(link.href);
  showExportFeedback(`Downloaded ${link.download}`);
}

async function copyExport() {
  try { await navigator.clipboard.writeText(el("exportOutput").value); }
  catch { el("exportOutput").select(); document.execCommand("copy"); }
  showExportFeedback("Copied");
}

document.addEventListener("input", handleEditorEvent);
document.addEventListener("change", handleEditorEvent);
document.addEventListener("click", (event) => {
  const target = event.target;
  const activityNav = target.closest?.("[data-select-activity]");
  const elementaryChoice = target.closest?.("[data-select-ef-flow]");
  const stepButton = target.closest?.("[data-step]");
  const goButton = target.closest?.("[data-go-step]");
  const editFlow = target.closest?.("[data-edit-flow]");
  const reviewTarget = target.closest?.("[data-review-target]");
  const validationTarget = target.closest?.("[data-focus-activity]");
  if (target.id === "addActivity") addActivity();
  if (target.id === "addFlowType") addFlowType();
  if (target.id === "addInputFlow") addFlow("input");
  if (target.id === "addOutputFlow") addFlow("output");
  if (target.id === "loadExample") loadExample();
  if (target.id === "loadPvTtl") loadBundledPvTtl();
  if (target.id === "resetDataset") resetDataset();
  if (target.id === "importTtlButton") el("ttlUpload").click();
  if (stepButton) goToStep(stepButton.dataset.step);
  if (goButton) goToStep(goButton.dataset.goStep);
  if (activityNav) {
    state.activeActivityId = activityNav.dataset.selectActivity;
    if (target.closest?.("#graphPreview")) state.activeStep = "activities";
    render();
  }
  if (validationTarget) {
    state.activeActivityId = validationTarget.dataset.focusActivity;
    state.editingFlowId = validationTarget.dataset.focusFlow || "";
    state.activeStep = "activities";
    render();
    const field = validationTarget.dataset.focusField;
    if (field) setTimeout(() => {
      const flowId = validationTarget.dataset.focusFlow;
      const selector = flowId
        ? field === "sourceMode" ? `[data-product-source="${flowId}"]`
          : field === "backgroundProvider" ? `[data-bonsai-search-flow="${flowId}"]`
            : `[data-flow-field="${flowId}:${field}"]`
        : `[data-activity-field="${validationTarget.dataset.focusActivity}:${field}"]`;
      const control = document.querySelector(selector);
      control?.focus(); control?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);
  }
  if (editFlow) { state.editingFlowId = state.editingFlowId === editFlow.dataset.editFlow ? "" : editFlow.dataset.editFlow; renderFlows(); }
  if (reviewTarget) el(reviewTarget.dataset.reviewTarget)?.scrollIntoView({ behavior: "smooth", block: "start" });
  if (target.id === "fitGraph") el("graphPreview")?.scrollIntoView({ behavior: "smooth", block: "center" });
  const exportPreview = target.closest?.("[data-export-preview]");
  if (exportPreview) {
    state.exportMode = exportPreview.dataset.exportPreview;
    document.querySelector(".source-details")?.setAttribute("open", "");
    renderExport();
    document.querySelector(".source-details")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  if (target.id === "showJson" || target.id === "showTtl") { state.exportMode = target.id === "showJson" ? "json" : "ttl"; renderExport(); }
  if (target.id === "copyExport") copyExport();
  if (target.id === "downloadJson") downloadExport("json");
  if (target.id === "downloadTtl") downloadExport("ttl");
  if (target.id === "downloadBoth") { downloadExport("json"); setTimeout(() => downloadExport("ttl"), 180); }
  if (target.dataset.removeActivity) {
    if (!window.confirm("Remove this activity and its flows?")) return;
    state.dataset.activities = state.dataset.activities.filter((item) => item.id !== target.dataset.removeActivity);
    removeUnusedFlowTypes(); state.activeActivityId = state.dataset.activities[0]?.id || ""; render();
  }
  if (target.dataset.removeFlow) { const activity = getActiveActivity(); if (activity) activity.flows = activity.flows.filter((item) => item.id !== target.dataset.removeFlow); removeUnusedFlowTypes(); render(); }
  if (target.dataset.removeFlowtype) { state.flowTypes = state.flowTypes.filter((item) => item.id !== target.dataset.removeFlowtype); render(); }
  if (target.dataset.selectEf) {
    const item = state.flowTypes.find((entry) => entry.id === target.dataset.selectEf);
    selectElementaryFlow(item, target.dataset.efUri);
    render();
  }
  const bonsaiChoice = target.closest?.("[data-select-bonsai-flow]");
  if (bonsaiChoice) {
    const flow = findFlow(bonsaiChoice.dataset.selectBonsaiFlow);
    const entry = state.bonsai.entries?.find((item) => item.code === bonsaiChoice.dataset.bonsaiCode);
    if (flow && entry) {
      flow.sourceMode = "bonsai";
      flow.linkedOutputFlowUri = "";
      flow.backgroundProvider = { code: entry.code, region: entry.offerings[0]?.region || "", referenceUnit: "" };
      flow.bonsaiSearch = "";
      flow.label = entry.label;
      bonsaiFlowType(flow, entry);
      applyBonsaiOfferingDefaults(flow);
      state.bonsai.openFlowId = "";
      removeUnusedFlowTypes();
      render();
    }
  }
  if (elementaryChoice) {
    const flow = findFlow(elementaryChoice.dataset.selectEfFlow);
    const item = flow ? editableFlowType(flow, "ElementaryFlow") : null;
    selectElementaryFlow(item, elementaryChoice.dataset.efUri);
    if (flow && item?.label) flow.label = item.label;
    state.elementary.openFlowId = "";
    removeUnusedFlowTypes();
    render();
  }
});

el("activeActivity").addEventListener("change", (event) => { state.activeActivityId = event.target.value; render(); });
el("ttlUpload").addEventListener("change", (event) => loadUploadedTtl(event.target.files?.[0]));

render();
loadOntologyOptions();
loadStudyOptions();
