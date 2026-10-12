/* DPP composition uses ordinary FlowLinks for calculation and separate provenance
 * records for source passports. No remote URLs are fetched when a file is linked. */
const DPP_NS = "https://w3id.org/cerise-see/dpp-connections#";
const dppClone = (value) => JSON.parse(JSON.stringify(value));

function dppReadText(text) {
  if (!String(text).trimStart().startsWith("{")) return text;
  let data;
  try { data = JSON.parse(text); } catch { throw new Error("Invalid JSON-LD file."); }
  if (!Array.isArray(data["@graph"]) || !data["@graph"].length) throw new Error("Use the calculator's JSON-LD export or an ontology Turtle file; legacy DPP JSON is not a supported inventory graph.");
  const context = data["@context"] || {};
  if (typeof context !== "object" || Array.isArray(context)) throw new Error("Use a JSON-LD export with a local object context; remote contexts are not fetched.");
  const expand = (value) => {
    if (typeof value !== "string") throw new Error("Invalid JSON-LD identifier.");
    if (/^https?:|^urn:|^data:/.test(value)) return value;
    const colon = value.indexOf(":");
    if (colon > 0 && typeof context[value.slice(0, colon)] === "string") return context[value.slice(0, colon)] + value.slice(colon + 1);
    if (!value.includes(":") && typeof context["@vocab"] === "string") return context["@vocab"] + value;
    throw new Error("JSON-LD identifiers must expand to absolute IRIs.");
  };
  const literal = (value) => `"${escapeTtl(value)}"`;
  const term = (value) => {
    if (typeof value === "string") return literal(value);
    if (typeof value === "boolean") return `${literal(value)}^^<${NS.xsd}boolean>`;
    if (typeof value === "number") return `${literal(value)}^^<${NS.xsd}decimal>`;
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Unsupported JSON-LD value.");
    if (value["@id"]) return iri(expand(value["@id"]));
    if (Object.hasOwn(value, "@value")) return literal(value["@value"]) + (value["@type"] ? `^^${iri(expand(value["@type"]))}` : value["@language"] ? `@${String(value["@language"]).replace(/[^a-zA-Z-]/g, "")}` : "");
    return `[ ${properties(value)} ]`;
  };
  const properties = (node) => Object.entries(node).filter(([key]) => key !== "@id" && key !== "@context").map(([key, value]) => {
    const values = Array.isArray(value) ? value : [value];
    if (!values.length) return "";
    return `${key === "@type" ? "a" : iri(expand(key))} ${values.map((item) => key === "@type" ? iri(expand(item)) : term(item)).join(", ")}`;
  }).filter(Boolean).join(" ; ");
  return data["@graph"].map((node) => {
    if (!node?.["@id"]) throw new Error("Each JSON-LD graph node must have an absolute identity.");
    return `${iri(expand(node["@id"]))} ${properties(node)} .`;
  }).join("\n");
}

function dppFlowTypeNeedsExport(item) {
  return !item.ontologyManaged || !(item.uri.startsWith(NS.bonsai) || item.uri.startsWith(NS.elementary));
}

function dppParseMetadata(nodes, prefixes, datasetUri, activities) {
  const read = (node, name) => predicateValue(node.body, predicateToken(prefixes, DPP_NS, name));
  const json = (node, name, fallback) => {
    const value = literalValue(read(node, name));
    if (!value) return fallback;
    try { return JSON.parse(value); } catch { throw new Error(`Invalid ${name} metadata in ${node.subject}.`); }
  };
  const sources = [];
  nodes.forEach((node) => {
    if (tokenList(node.type).some((token) => expandToken(token, prefixes) === `${DPP_NS}ConnectedDPP`)) {
      const uri = expandToken(read(node, "originalDataset"), prefixes);
      if (!uri || uri === datasetUri || sources.some((item) => item.uri === uri)) throw new Error("Invalid or duplicate connected DPP identity.");
      sources.push({ uri, title: node.title || localName(uri), fileName: literalValue(read(node, "fileName")),
        referenceFlowUri: expandToken(read(node, "referenceOutput"), prefixes),
        productSystemUri: expandToken(read(node, "originalProductSystem"), prefixes),
        study: json(node, "studyContext", null), activityUris: [] });
    }
  });
  activities.forEach((activity) => {
    const node = nodes.get(activity.uri);
    activity.sourceDppUri = expandToken(read(node, "sourceDPP"), prefixes) || "";
    if (activity.sourceDppUri) {
      const source = sources.find((item) => item.uri === activity.sourceDppUri);
      if (!source) throw new Error("An activity refers to an undefined connected DPP.");
      source.activityUris.push(activity.uri);
    }
    activity.flows.forEach((flow) => {
      const flowNode = nodes.get(flow.uri);
      flow.connectedDppUri = expandToken(read(flowNode, "connectedDPP"), prefixes) || "";
      flow.dppPrevious = json(flowNode, "previousInput", null);
      if (flow.connectedDppUri && !sources.some((source) => source.uri === flow.connectedDppUri)) throw new Error("An input refers to an undefined connected DPP.");
    });
  });
  return sources;
}

function dppSourceNodeUri(source) { return `${source.uri}${source.uri.includes("#") ? "-" : "#"}connection-provenance`; }

function dppMetadataGraph() {
  const graph = [];
  (state.connectedDpps || []).forEach((source) => {
    graph.push({ "@id": dppSourceNodeUri(source), "@type": `${DPP_NS}ConnectedDPP`,
      [`${NS.dcterms}title`]: source.title, [`${DPP_NS}originalDataset`]: { "@id": source.uri },
      [`${DPP_NS}fileName`]: source.fileName || "",
      ...(source.referenceFlowUri ? { [`${DPP_NS}referenceOutput`]: { "@id": source.referenceFlowUri } } : {}),
      ...(source.productSystemUri ? { [`${DPP_NS}originalProductSystem`]: { "@id": source.productSystemUri } } : {}),
      [`${DPP_NS}studyContext`]: JSON.stringify(source.study || null) });
  });
  return graph;
}

function dppMetadataTtl() {
  return dppMetadataGraph().map((node) => {
    const properties = Object.entries(node).filter(([key]) => key !== "@id").map(([key, value]) =>
      `${key === "@type" ? "a" : iri(key)} ${key === "@type" ? iri(value) : value?.["@id"] ? iri(value["@id"]) : `"${escapeTtl(value)}"`}`);
    return `${iri(node["@id"])} ${properties.join(" ;\n  ")} .\n`;
  }).join("\n");
}

function dppActivitySignature(activity) {
  return JSON.stringify([activity.uri, activity.name, activity.geographyUri, activity.lifeCycleStageUri,
    activity.companySpecific, activity.activityTypeUri || "", activity.note || "",
    activity.flows.map((flow) => [flow.uri, flow.label, flow.direction, flow.flowTypeUri,
      Number(flow.amount), flow.unitUri, Boolean(flow.determining), flow.linkedOutputFlowUri || "",
      flow.providerActivityUri || selectedBonsaiOffering(flow)?.activityUri || "", flow.note || ""])
      .sort((a, b) => a[0].localeCompare(b[0]))]);
}

function dppInventoryClosure(activities, outputUri, types) {
  const owners = new Map();
  const ids = new Set();
  activities.forEach((activity) => {
    if (ids.has(activity.uri)) throw new Error("Duplicate activity URI.");
    ids.add(activity.uri);
    activity.flows.forEach((flow) => {
      if (owners.has(flow.uri)) throw new Error("Duplicate flow URI.");
      owners.set(flow.uri, { activity, flow });
    });
  });
  const root = owners.get(outputUri);
  const product = (flow) => types.find((type) => type.uri === flow.flowTypeUri)?.className === "ProductFlow";
  if (!root || root.flow.direction !== "output" || !root.flow.determining || !product(root.flow)) throw new Error("Choose a determining product output from the imported DPP.");
  const visited = new Set();
  const visit = (activity, path) => {
    if (path.has(activity.uri)) throw new Error("The DPP contains an activity connection cycle.");
    if (visited.has(activity.uri)) return;
    const nextPath = new Set([...path, activity.uri]);
    if (!validUri(activity.uri) || !validUri(activity.activityLinkUri) || !validUri(activity.geographyUri) || !activity.name.trim() || !LIFE_CYCLE_STAGES.some((stage) => stage.uri === activity.lifeCycleStageUri)) throw new Error(`${activity.name}: complete the activity identity, geography and life-cycle stage.`);
    if (activity.flows.filter((flow) => flow.direction === "output" && flow.determining && product(flow)).length !== 1) throw new Error(`${activity.name}: select exactly one determining product output.`);
    activity.flows.forEach((input) => {
      if (![input.uri, input.flowTypeUri, input.unitUri].every(validUri)) throw new Error(`${input.label}: an inventory identifier or unit URI is invalid.`);
      if (!Number.isFinite(Number(input.amount)) || !input.unitUri ||
        (product(input) && Number(input.amount) <= 0)) throw new Error(`${input.label}: invalid quantity or missing unit.`);
      if (input.sourceMode === "activity") {
        if (input.direction !== "input" || !product(input)) throw new Error("An activity connection must supply a product input.");
        const provider = owners.get(input.linkedOutputFlowUri);
        if (!provider || provider.flow.direction !== "output" || !provider.flow.determining || !product(provider.flow)) throw new Error(`${input.label}: supplying output is missing or is not a determining product output.`);
        if (input.flowTypeUri !== provider.flow.flowTypeUri || input.unitUri !== provider.flow.unitUri) throw new Error(`${input.label}: connected flow types and units must match.`);
        visit(provider.activity, nextPath);
      }
    });
    visited.add(activity.uri);
  };
  visit(root.activity, new Set());
  return { activities: activities.filter((activity) => visited.has(activity.uri)), output: root.flow, owner: root.activity };
}

function dppPrepare(text, fileName) {
  if (typeof text !== "string" || text.length > 20 * 1024 * 1024) throw new Error("Choose a Turtle file smaller than 20 MB.");
  const parsed = parseTtlSubset(dppReadText(text));
  if (!validUri(parsed.dataset.uri) || !validUri(parsed.productSystem.uri)) throw new Error("The DPP needs valid dataset and product-system identities.");
  if (!parsed.dataset.activities.length) throw new Error("The DPP has no modelled activities.");
  if (parsed.report.warnings.length) throw new Error(`Complete the DPP before connecting: ${parsed.report.warnings[0].title}.`);
  parsed.fileName = fileName || "Imported DPP.ttl";
  parsed.outputs = parsed.dataset.activities.flatMap((activity) => activity.flows
    .filter((flow) => flow.direction === "output" && flow.determining && parsed.flowTypes.find((type) => type.uri === flow.flowTypeUri)?.className === "ProductFlow")
    .map((flow) => ({ activity, flow })));
  if (!parsed.outputs.length) throw new Error("The DPP needs a determining product output before it can be connected.");
  return parsed;
}

function dppSourceReadiness(parsed, activities) {
  let resolved = 0, unresolved = 0, elementary = 0;
  activities.forEach((activity) => activity.flows.forEach((flow) => {
    const type = parsed.flowTypes.find((item) => item.uri === flow.flowTypeUri)?.className;
    if (type === "ElementaryFlow") { elementary += 1; return; }
    if (!(flow.direction === "input" && type === "ProductFlow") && !(flow.direction === "output" && type === "WasteFlow")) return;
    if (flow.sourceMode === "activity") return;
    const matches = (state.bonsai.entries || []).flatMap((entry) => entry.offerings.filter((offering) => offering.activityUri === flow.providerActivityUri));
    if (flow.sourceMode === "bonsai" && matches.some((offering) => Number.isFinite(Number(offering.gwp100)) && convertToProviderDemand(flow.amount, flow.unitUri, offering.referenceUnit).ok)) resolved += 1;
    else unresolved += 1;
  }));
  return state.bonsai.entries ? `${resolved} background exchanges resolved; ${unresolved} unresolved; ${elementary} elementary exchanges requiring characterisation.` : "Background catalogue is loading; calculation readiness will be checked after connection.";
}

function dppPrune(candidate) {
  const roots = candidate.dataset.activities.filter((activity) => !activity.sourceDppUri);
  const byOutput = new Map(candidate.dataset.activities.flatMap((activity) => activity.flows.filter((flow) => flow.direction === "output").map((flow) => [flow.uri, activity])));
  const keep = new Set();
  const visit = (activity) => {
    if (keep.has(activity.uri)) return;
    keep.add(activity.uri);
    activity.flows.filter((flow) => flow.sourceMode === "activity").forEach((flow) => { const provider = byOutput.get(flow.linkedOutputFlowUri); if (provider) visit(provider); });
  };
  roots.forEach(visit);
  candidate.dataset.activities = candidate.dataset.activities.filter((activity) => keep.has(activity.uri));
  const usedTypes = new Set(candidate.dataset.activities.flatMap((activity) => activity.flows.map((flow) => flow.flowTypeUri)));
  candidate.flowTypes = candidate.flowTypes.filter((type) => usedTypes.has(type.uri));
  const referencedSources = new Set(candidate.dataset.activities.flatMap((activity) => [activity.sourceDppUri, ...activity.flows.map((flow) => flow.connectedDppUri)]).filter(Boolean));
  candidate.connectedDpps = (candidate.connectedDpps || []).map((source) => ({ ...source,
    activityUris: candidate.dataset.activities.filter((activity) => activity.sourceDppUri === source.uri).map((activity) => activity.uri) }))
    .filter((source) => referencedSources.has(source.uri));
}

function dppValidateHierarchy(candidate) {
  const graph = new Map();
  const owners = new Map(candidate.dataset.activities.flatMap((activity) => activity.flows.map((flow) => [flow.uri, activity])));
  candidate.dataset.activities.forEach((activity) => activity.flows.filter((flow) => flow.sourceMode === "activity").forEach((flow) => {
    const target = owners.get(flow.linkedOutputFlowUri);
    const from = activity.sourceDppUri || candidate.dataset.uri;
    const to = target?.sourceDppUri || candidate.dataset.uri;
    if (from === to) return;
    if (!graph.has(from)) graph.set(from, new Set());
    graph.get(from).add(to);
  }));
  const visit = (uri, path) => {
    if (path.has(uri)) throw new Error("This connection would create a nested DPP cycle.");
    (graph.get(uri) || []).forEach((next) => visit(next, new Set([...path, uri])));
  };
  graph.forEach((_, uri) => visit(uri, new Set()));
}

function dppAttach(flowId, parsed, outputUri, amount) {
  const candidate = dppClone({ dataset: state.dataset, flowTypes: state.flowTypes, connectedDpps: state.connectedDpps || [] });
  const input = candidate.dataset.activities.flatMap((activity) => activity.flows).find((flow) => flow.id === flowId);
  if (!input || input.direction !== "input" || candidate.flowTypes.find((type) => type.uri === input.flowTypeUri)?.className !== "ProductFlow") throw new Error("The receiving product input no longer exists.");
  if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) throw new Error("Enter a required quantity greater than zero.");
  if (parsed.dataset.uri === candidate.dataset.uri || parsed.connectedDpps?.some((source) => source.uri === candidate.dataset.uri)) throw new Error("A DPP cannot contain itself.");
  const closure = dppInventoryClosure(parsed.dataset.activities, outputUri, parsed.flowTypes);
  const imported = dppClone(closure.activities);
  const usedTypes = new Set(imported.flatMap((activity) => activity.flows.map((flow) => flow.flowTypeUri)));
  parsed.flowTypes.filter((type) => usedTypes.has(type.uri)).forEach((type) => {
    const existing = candidate.flowTypes.find((item) => item.uri === type.uri);
    if (existing && existing.className !== type.className) throw new Error("An exchanged entity URI has conflicting flow classes.");
    if (!existing) candidate.flowTypes.push({ ...dppClone(type), id: uid("dpp-ft") });
  });
  const sources = [...(parsed.connectedDpps || []), { uri: parsed.dataset.uri, title: parsed.dataset.title,
    fileName: parsed.fileName, referenceFlowUri: outputUri, productSystemUri: parsed.productSystem.uri, study: parsed.study }];
  imported.forEach((activity) => {
    activity.sourceDppUri ||= parsed.dataset.uri;
    const existing = candidate.dataset.activities.find((item) => item.uri === activity.uri);
    if (existing) {
      if (existing.sourceDppUri !== activity.sourceDppUri || dppActivitySignature(existing) !== dppActivitySignature(activity)) throw new Error("The same activity URI already has different inventory data. Use a new version URI or disconnect the old source first.");
      return;
    }
    const existingFlowUris = new Set(candidate.dataset.activities.flatMap((item) => item.flows.map((flow) => flow.uri)));
    if (activity.flows.some((flow) => existingFlowUris.has(flow.uri))) throw new Error("A flow URI is already owned by another activity.");
    activity.id = uid("dpp-act");
    activity.flows.forEach((flow) => { flow.id = uid("dpp-flow"); });
    candidate.dataset.activities.push(activity);
  });
  const requiredSourceUris = new Set([parsed.dataset.uri, ...imported.flatMap((activity) =>
    [activity.sourceDppUri, ...activity.flows.map((flow) => flow.connectedDppUri)].filter(Boolean))]);
  sources.filter((source) => requiredSourceUris.has(source.uri)).forEach((source) => {
    const existing = candidate.connectedDpps.find((item) => item.uri === source.uri);
    if (existing && JSON.stringify(existing.study) !== JSON.stringify(source.study)) throw new Error("This DPP URI has a different study context. Import it with a new version URI.");
    if (!existing) candidate.connectedDpps.push(dppClone(source));
  });
  input.dppPrevious ||= dppClone({ flowTypeUri: input.flowTypeUri, label: input.label, amount: input.amount,
    unitUri: input.unitUri, sourceMode: input.sourceMode, linkedOutputFlowUri: input.linkedOutputFlowUri || "", providerActivityUri: input.providerActivityUri || "", backgroundProvider: input.backgroundProvider || null });
  Object.assign(input, { flowTypeUri: closure.output.flowTypeUri, amount: String(amount), unitUri: closure.output.unitUri,
    sourceMode: "activity", linkedOutputFlowUri: outputUri, providerActivityUri: "", backgroundProvider: null, connectedDppUri: parsed.dataset.uri });
  dppValidateHierarchy(candidate);
  // Validate the entire receiving chain as well, including existing internal links.
  const receiver = candidate.dataset.activities.find((activity) => activity.flows.includes(input));
  const receiverOutput = receiver.flows.find((flow) => flow.direction === "output" && flow.determining);
  if (!receiverOutput) throw new Error("Add a determining product output to the receiving activity first.");
  dppInventoryClosure(candidate.dataset.activities, receiverOutput.uri, candidate.flowTypes);
  dppPrune(candidate);
  state.dataset = candidate.dataset; state.flowTypes = candidate.flowTypes; state.connectedDpps = candidate.connectedDpps;
  reconcileImportedBonsaiSources();
  return { importedActivities: imported.length, totalActivities: parsed.dataset.activities.length, output: closure.output };
}

function dppDisconnect(flowId) {
  const flow = findFlow(flowId);
  if (!flow?.connectedDppUri) return;
  const previous = flow.dppPrevious;
  if (previous) Object.assign(flow, previous);
  else Object.assign(flow, { sourceMode: "external", linkedOutputFlowUri: "", providerActivityUri: "", backgroundProvider: null });
  flow.connectedDppUri = ""; flow.dppPrevious = null;
  // A restored custom type may have been pruned when the connection was made.
  if (!getFlowType(flow.flowTypeUri)) state.flowTypes.push({ id: uid("ft"), uri: flow.flowTypeUri, label: flow.label, className: "ProductFlow", ontologyManaged: false });
  dppPrune(state);
}

function dppSourceCard(flow) {
  if (flow.direction !== "input" || getFlowType(flow.flowTypeUri)?.className !== "ProductFlow") return "";
  if (flow.sourceMode !== "external" && !flow.connectedDppUri) return "";
  const source = (state.connectedDpps || []).find((item) => item.uri === flow.connectedDppUri);
  return `<div class="dpp-source-card">${source ? `<strong>Connected DPP: ${escapeHtml(source.title)}</strong><span>${escapeHtml(flow.amount)} ${escapeHtml(unitLabel(flow.unitUri))} required per receiving activity output.</span><details><summary>Source and study context</summary><p>${escapeHtml(source.fileName)}</p><p>${escapeHtml(source.uri)}</p><p>${escapeHtml(source.study?.functionalUnit?.whatProvided || "")}</p><p>${escapeHtml(source.study?.scope?.assumption || "")}</p><p>${escapeHtml(source.study?.scope?.limitation || "")}</p></details>` : `<strong>Connect an existing DPP</strong><span>Import a supplier passport and link its product output to this input.</span>`}<div class="dpp-actions"><button type="button" class="button secondary" data-connect-dpp="${flow.id}">${source ? "Replace DPP" : "Connect DPP"}</button>${source ? `<button type="button" class="button quiet" data-disconnect-dpp="${flow.id}">Disconnect DPP</button>` : ""}</div></div>`;
}

function dppRenderHierarchy() {
  const container = document.getElementById("dppHierarchy");
  if (!container) return;
  container.hidden = !(state.connectedDpps || []).length;
  if (container.hidden) { container.innerHTML = ""; return; }
  const title = (uri) => uri === state.dataset.uri ? state.dataset.title : state.connectedDpps.find((source) => source.uri === uri)?.title || localName(uri);
  const owners = new Map(state.dataset.activities.flatMap((activity) => activity.flows.filter((flow) => flow.direction === "output").map((flow) => [flow.uri, activity])));
  const edges = state.dataset.activities.flatMap((activity) => activity.flows.filter((flow) => flow.sourceMode === "activity").map((flow) => {
    const supplier = owners.get(flow.linkedOutputFlowUri);
    const parent = activity.sourceDppUri || state.dataset.uri;
    const child = supplier?.sourceDppUri || state.dataset.uri;
    return parent !== child ? `<li><strong>${escapeHtml(title(parent))}</strong> ← ${escapeHtml(flow.amount)} ${escapeHtml(unitLabel(flow.unitUri))} ${escapeHtml(flow.label)} ← <strong>${escapeHtml(title(child))}</strong></li>` : "";
  })).filter(Boolean);
  container.innerHTML = `<h3>Connected DPPs</h3><p>Supplier outputs feed receiving inputs. Shared suppliers are stored once; all required quantities are added in the calculation.</p><ul>${edges.join("")}</ul><p class="method-note">Source study contexts are retained. The calculation uses the connected inventory per selected output and the current parent study definition.</p>`;
}

function initDppConnections() {
  const upload = document.getElementById("dppUpload");
  const dialog = document.getElementById("dppDialog");
  let receivingId = "";
  let pending = null;
  const error = (message) => { document.getElementById("dppError").textContent = message; };
  const preview = () => {
    if (!pending) return;
    try {
      const uri = document.getElementById("dppOutput").value;
      const closure = dppInventoryClosure(pending.dataset.activities, uri, pending.flowTypes);
      document.getElementById("dppUnit").textContent = unitLabel(closure.output.unitUri);
      document.getElementById("dppPreview").textContent = `${closure.activities.length} of ${pending.dataset.activities.length} activities supply this output. Reference output: ${closure.output.amount} ${unitLabel(closure.output.unitUri)}. Only these contributing activities will be connected. ${dppSourceReadiness(pending, closure.activities)}`;
      error("");
    } catch (problem) { error(problem.message); }
  };
  document.addEventListener("click", (event) => {
    const connect = event.target.closest("[data-connect-dpp]");
    if (connect) { receivingId = connect.dataset.connectDpp; pending = null; upload.value = ""; upload.click(); }
    const disconnect = event.target.closest("[data-disconnect-dpp]");
    if (disconnect) { dppDisconnect(disconnect.dataset.disconnectDpp); render(); }
    if (event.target.id === "dppCancel") { dialog.close(); pending = null; }
    if (event.target.id === "dppConfirm" && pending) {
      try {
        dppAttach(receivingId, pending, document.getElementById("dppOutput").value, document.getElementById("dppAmount").value);
        dialog.close(); pending = null; render();
        if (!state.bonsai.entries) loadBonsaiIndex();
      } catch (problem) { error(problem.message); }
    }
  });
  dialog.addEventListener("cancel", () => { pending = null; });
  document.getElementById("dppOutput").addEventListener("change", () => { document.getElementById("dppAmount").value = ""; preview(); });
  upload.addEventListener("change", async () => {
    const file = upload.files?.[0];
    if (!file) return;
    document.getElementById("dppConfirm").disabled = true;
    document.getElementById("dppOutput").innerHTML = "";
    document.getElementById("dppPreview").textContent = "Reading DPP…";
    document.getElementById("dppContext").textContent = "";
    document.getElementById("dppUnit").textContent = "";
    document.getElementById("dppTitle").textContent = "Connect DPP";
    error(""); dialog.showModal();
    try {
      if (file.size > 20 * 1024 * 1024) throw new Error("Choose a Turtle file smaller than 20 MB.");
      pending = dppPrepare(await file.text(), file.name);
      document.getElementById("dppTitle").textContent = pending.dataset.title;
      document.getElementById("dppOutput").innerHTML = pending.outputs.map(({ activity, flow }) => `<option value="${escapeHtml(flow.uri)}">${escapeHtml(activity.name)} → ${escapeHtml(flow.label)}</option>`).join("");
      const preferred = pending.outputs.find(({ flow }) => flow.uri === pending.study.functionalUnit.referenceFlowUri);
      if (preferred) document.getElementById("dppOutput").value = preferred.flow.uri;
      const input = findFlow(receivingId);
      const output = pending.outputs.find(({ flow }) => flow.uri === document.getElementById("dppOutput").value)?.flow;
      document.getElementById("dppAmount").value = input?.unitUri === output?.unitUri ? input.amount : "";
      document.getElementById("dppContext").textContent = [pending.study.functionalUnit.whatProvided, pending.study.scope.assumption, pending.study.scope.limitation].filter(Boolean).join("\n\n");
      document.getElementById("dppConfirm").disabled = false;
      preview(); document.getElementById("dppAmount").focus();
    } catch (problem) { pending = null; error(problem.message); document.getElementById("dppPreview").textContent = "No inventory has been changed."; }
  });
}
