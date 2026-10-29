// Inventory identity stays in the existing EF catalogue. This index contains
// method data plus a reference-unit/direction cross-check, never name matches.
const EFClimate = (() => {
  const flowBase = 'https://w3id.org/mintjesba/pefdpp/skos/ef31-elementaryflows#';
  const unitBase = 'https://w3id.org/mintjesba/pefdpp/ef31-units#';
  const geographyBase = 'https://w3id.org/mintjesba/pefdpp/skos/pef-geographies#';
  const om = 'http://www.ontology-of-units-of-measure.org/resource/om-2/';
  function unitConversion(source, reference) {
    if (source === reference && reference) return 1;
    if (reference === unitBase + 'Kilogram') return ({[om+'kilogram']:1,[om+'gram']:0.001,[om+'milligram']:0.000001,[om+'tonne']:1000})[source] ?? null;
    return null;
  }
  function prepare(raw) {
    if (raw?.metadata?.method?.uuid !== '6209b35f-9447-40b5-b68c-a1099e3674a0' || raw.metadata.missingFactorPolicy !== 'unresolved') throw new Error('The total EF 3.1 climate method and explicit missing-factor policy are required.');
    const known = new Map(), factors = new Map();
    for (const [group, ids] of Object.entries(raw.knownFlowsByUnitAndDirection || {})) {
      const [unit, direction] = group.split('|');
      if (!unit || !['input', 'output', 'unknown'].includes(direction)) throw new Error('Invalid EF reference-unit/direction group.');
      for (const id of ids) {
        if (known.has(id)) throw new Error('Duplicate EF flow identifier.');
        known.set(id, { unitUri: unitBase + unit, direction });
      }
    }
    if (known.size !== raw.metadata.knownFlowCount) throw new Error('Incomplete EF flow coverage.');
    let count = 0;
    for (const [id, rows] of Object.entries(raw.factors || {})) {
      if (!known.has(id)) throw new Error('Factor refers to an unknown EF identifier.');
      const seen = new Set();
      for (const [region, direction, value] of rows) {
        const key = region + '|' + direction;
        if (!region || seen.has(key) || !['input', 'output'].includes(direction) || !Number.isFinite(value)) throw new Error('Ambiguous or invalid EF characterisation factor.');
        seen.add(key); count++;
      }
      factors.set(id, rows);
    }
    if (count !== raw.metadata.factorCount) throw new Error('Incomplete EF climate factors.');
    if (!raw.geographyUris?.length) throw new Error('Missing ontology geographies.');
    return { metadata: raw.metadata, known, factors, geographyUris: new Set(raw.geographyUris) };
  }
  function characterise(flow, activity, index) {
    const fail = reason => ({ ok: false, status: 'unresolved', reason, contributionKg: null });
    if (!index) return fail('EF 3.1 climate factors are not loaded.');
    if (!flow.flowTypeUri?.startsWith(flowBase)) return fail('Select an exact EF 3.1 elementary-flow identifier.');
    const id = flow.flowTypeUri.slice(flowBase.length), known = index.known.get(id);
    if (!known) return fail('Unknown EF 3.1 elementary-flow identifier.');
    if (!['input', 'output'].includes(flow.direction) || flow.direction !== known.direction) return fail('Exchange direction does not match the EF resource or emission compartment.');
    // Only these recognised mass-unit conversions are supported. Other native
    // units must match exactly; energy, volume, radioactivity are never guessed.
    const conversionFactor = unitConversion(flow.unitUri, known.unitUri);
    if (conversionFactor === null) return fail('Unit is incompatible with the EF reference unit; no supported conversion.');
    if (typeof flow.amount !== 'string' && typeof flow.amount !== 'number') return fail('Enter a non-negative numeric quantity.');
    if (!String(flow.amount).trim() || !Number.isFinite(Number(flow.amount)) || Number(flow.amount) < 0) return fail('Enter a non-negative numeric quantity.');
    if (!index.geographyUris.has(activity.geographyUri)) return fail('Select an ontology geography for the activity.');
    const rows = index.factors.get(id);
    if (!rows?.length) return fail('Known EF inventory flow, but no verified climate factor or documented no-contribution rule.');
    const sameDirection = rows.filter(row => row[1] === flow.direction);
    if (!sameDirection.length) return fail('No climate factor for this exchange direction.');
    const region = activity.geographyUri.slice(geographyBase.length);
    const selected = sameDirection.find(row => row[0] === region) || sameDirection.find(row => row[0] === 'GLO');
    if (!selected) return fail('No applicable regional or published GLO climate factor.');
    const quantity = Number(flow.amount) * conversionFactor;
    const contributionKg = quantity * selected[2];
    if (!Number.isFinite(contributionKg)) return fail('Quantity exceeds the supported calculation range.');
    return { ok: true, status: selected[2] === 0 ? 'verified_no_contribution' : 'characterised', factor: selected[2], region: selected[0], referenceUnitUri: known.unitUri, referenceQuantity: quantity, conversionFactor, contributionKg, method: index.metadata.method };
  }
  return { prepare, characterise, unitConversion };
})();
