// Exact-identifier EF 3.1 climate calculation. No fuzzy matches or assumed CFs.
const EFClimate = (() => {
  const flowBase = 'https://w3id.org/mintjesba/pefdpp/skos/ef31-elementaryflows#';
  const unitBase = 'https://w3id.org/mintjesba/pefdpp/ef31-units#';
  function prepare(raw) {
    if (raw?.metadata?.method?.uuid !== '6209b35f-9447-40b5-b68c-a1099e3674a0') throw new Error('The total EF 3.1 climate method is required.');
    const known = new Map();
    for (const [group, ids] of Object.entries(raw.knownFlowsByUnitAndDirection || {})) {
      const [unit, direction] = group.split('|');
      if (!unit || !['input', 'output', 'either'].includes(direction)) throw new Error('Invalid EF flow unit/direction group.');
      for (const id of ids) {
        if (known.has(id)) throw new Error('Duplicate EF flow identifier.');
        known.set(id, { unitUri: unitBase + unit, direction });
      }
    }
    if (known.size !== raw.metadata.knownFlowCount) throw new Error('Incomplete EF flow coverage.');
    const factors = new Map();
    let count = 0;
    for (const [id, rows] of Object.entries(raw.factors || {})) {
      if (!known.has(id)) throw new Error('Factor refers to an unknown EF identifier.');
      const seen = new Set();
      for (const [region, direction, value] of rows) {
        const key = region + '|' + direction;
        if (seen.has(key) || !['input', 'output'].includes(direction) || !Number.isFinite(value)) throw new Error('Ambiguous or invalid EF characterisation factor.');
        seen.add(key); count++;
      }
      factors.set(id, rows);
    }
    if (count !== raw.metadata.factorCount) throw new Error('Incomplete EF climate factors.');
    return { metadata: raw.metadata, known, factors };
  }
  function characterise(flow, activity, index) {
    const fail = reason => ({ ok: false, reason });
    if (!index) return fail('EF 3.1 climate factors are not loaded.');
    if (!flow.flowTypeUri?.startsWith(flowBase)) return fail('Use an exact EF 3.1 elementary-flow identifier; custom flows require a verified mapping.');
    const id = flow.flowTypeUri.slice(flowBase.length);
    const known = index.known.get(id);
    if (!known) return fail('The elementary-flow identifier is absent from the published EF 3.1 inventory.');
    if (flow.unitUri !== known.unitUri) return fail('The elementary-flow unit does not match its EF 3.1 reference unit.');
    if (!['input', 'output'].includes(flow.direction) || (known.direction !== 'either' && flow.direction !== known.direction)) return fail('The exchange direction does not match the EF 3.1 emission or resource compartment.');
    if (!String(flow.amount).trim() || !Number.isFinite(Number(flow.amount)) || Number(flow.amount) < 0) return fail('Enter a non-negative elementary-flow quantity.');
    const rows = index.factors.get(id);
    if (!rows) return { ok: true, factor: null, contributionKg: 0, status: 'No climate factor in this method', region: null };
    const sameDirection = rows.filter(row => row[1] === flow.direction);
    if (!sameDirection.length) return fail('No EF 3.1 climate factor is defined for this exchange direction.');
    const region = String(activity.geographyUri || '').split('#').pop();
    const selected = sameDirection.find(row => row[0] === region) || sameDirection.find(row => row[0] === 'GLO');
    if (!selected) return fail('No EF 3.1 climate factor covers this activity geography.');
    return { ok: true, factor: selected[2], contributionKg: Number(flow.amount) * selected[2], status: 'EF 3.1 climate factor', region: selected[0] };
  }
  return { prepare, characterise };
})();
