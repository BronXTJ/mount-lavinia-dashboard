/** Curated synthesis claims — evidence bridge between analysis tabs and Issues & Potentials. */

export const SYNTHESIS_ACCENT = '#f59e0b'

export const DOMAIN_META = {
  maturation: { label: 'Maturation', color: '#b45309' },
  thermal: { label: 'Thermal', color: '#f46d43' },
  shadow: { label: 'Shadow', color: '#a78a7f' },
  morphology: { label: 'Morphology', color: '#a78bfa' },
  density: { label: 'Density', color: '#22d3ee' },
  social: { label: 'Social', color: '#fb923c' },
  governance: { label: 'Governance', color: '#c4b5fd' },
}

export const EDGE_TYPE_META = {
  amplifies: { label: 'Amplifies', color: '#f87171' },
  co_located: { label: 'Co-located', color: '#94a3b8' },
  mitigates: { label: 'Mitigates', color: '#34d399' },
  caused_by: { label: 'Caused By', color: '#fbbf24' },
}

/**
 * Panel-ready findings. Each links to spatial evidence and optional Issues node IDs.
 * observation / interpretation / implication are bullet arrays (one idea per line).
 */
export const findings = [
  {
    id: 'F1',
    label: 'Pervasive Strong Heat Stress',
    domains: ['thermal'],
    observation: [
      'Mean UTCI (how hot it feels outdoors) across the 10 m grid is ~39.1 °C.',
      'Range is about 31.2–46.9 °C.',
      'About 87% of cells are class 4 (strong heat stress).',
      'About 11% are class 5 (very strong heat stress).',
    ],
    interpretation: [
      'Most of the 800 m study area feels uncomfortable outdoors under these model conditions.',
      'Heat is common across the area, not limited to a few hotspots.',
    ],
    implication: [
      'Treat outdoor heat as an area-wide design constraint for Mount Lavinia’s walking network, especially Galle Road and Junction approaches.',
      'Prioritise continuous shade and cooler paving on shared sidewalks used by residents, workers, and tourists together.',
      'Do not rely on boutique greening at hotel frontages as a substitute for corridor-scale comfort upgrades.',
    ],
    evidence: [
      { tab: 'environmental', label: 'Mean UTCI ~39.1 °C', path: '/environmental' },
      { tab: 'environmental', label: 'Stress-class donut (4 vs 5)', path: '/environmental' },
    ],
    issuesLinks: ['RC2', 'PT1'],
  },
  {
    id: 'F2',
    label: 'Midday Streets Stay Heavily Shaded',
    domains: ['shadow', 'thermal'],
    observation: [
      'Mean shadow cover is ~61% of modelled daylight hours (5 Jul 2026, 07:00–18:00 LST).',
      'Area-wide shadow peaks near 13:00 LST at ~79%.',
    ],
    interpretation: [
      'Buildings and street canyons cast a lot of shade, even at midday.',
      'UTCI is still high, so shade alone does not mean outdoor comfort.',
    ],
    implication: [
      'Combine canyon shade with cooler ground materials and better street-level airflow on the main spines.',
      'Do not assume midday building shadow means outdoor comfort when UTCI stays in strong heat-stress classes.',
      'Test street redesigns against both the hourly shadow profile and the UTCI map before locking in planting-only schemes.',
    ],
    evidence: [
      { tab: 'environmental', label: 'Shadow exposure gauge', path: '/environmental' },
      { tab: 'environmental', label: 'Hourly shadow chart', path: '/environmental' },
    ],
    issuesLinks: ['RC2'],
  },
  {
    id: 'F3',
    label: 'Shade Does Not Cancel Heat Stress',
    domains: ['thermal', 'shadow'],
    observation: [
      'Many grid cells are both heavily shaded and in UTCI classes 4–5 (strong / very strong heat stress).',
    ],
    interpretation: [
      'Solar shade and high heat stress can appear in the same place.',
      'Air, humidity, and radiant heat can still make conditions harsh.',
    ],
    implication: [
      'Require design review to read UTCI and mean radiant temperature together with the shadow layer before accepting outdoor comfort claims.',
      'Reject proposals that treat high modelled shade cover as proof that walking routes will feel safe in heat.',
      'Use co-located high shade and class 4–5 UTCI cells to target cooling interventions where people already walk.',
    ],
    evidence: [
      { tab: 'environmental', label: 'UTCI + Shadow layers', path: '/environmental' },
    ],
    issuesLinks: ['RC1', 'RC2'],
  },
  {
    id: 'F4',
    label: 'Junction Sky Enclosure',
    domains: ['morphology', 'shadow'],
    observation: [
      'SVF (sky view factor) samples from Mount Lavinia Junction along Galle Road to the supermarket and bus stand area (and nearby surroundings) vary from enclosed to more open.',
      'Each block traps or releases heat differently.',
    ],
    interpretation: [
      'Street shape and buildings shape outdoor exposure along the main corridor.',
      'This is local form, not only regional climate.',
    ],
    implication: [
      'Sequence street upgrades first along enclosed SVF segments from Mount Lavinia Junction toward the supermarket and bus stand corridor.',
      'Concentrate street trees, canopies, and sidewalk widening on those busy walking blocks where sky enclosure is strongest.',
      'Use the SVF sample corridor as the pilot spine for form-sensitive heat mitigation rather than spreading thin greening across quiet side streets.',
    ],
    evidence: [
      { tab: 'environmental', label: 'SVF sample points + stacked bar', path: '/environmental' },
    ],
    issuesLinks: ['GOV1', 'PT1'],
  },
  {
    id: 'F5',
    label: 'Radiant Heat Drives Discomfort',
    domains: ['thermal'],
    observation: [
      'Mean radiant temperature (Tmrt) is ~28.4 °C across the grid.',
      'Mean air temperature is ~26.7 °C.',
      'Radiant load sits above air temperature in the model.',
    ],
    interpretation: [
      'Surfaces and sun geometry make places feel hotter than air temperature alone suggests.',
    ],
    implication: [
      'Specify cooler paving, lighter roofs, and shade structures in public realm briefs where radiant load exceeds air temperature.',
      'Reduce large asphalt forecourts and parking aprons on pedestrian approaches to the Junction and beach edge.',
      'Add radiant-control checks to municipal street and plaza approvals so projects are not scored on air temperature alone.',
    ],
    evidence: [
      { tab: 'environmental', label: 'Tmrt map layer + driver radar', path: '/environmental' },
    ],
    issuesLinks: ['RC2'],
  },
  {
    id: 'F6',
    label: 'Compact Built Form Dominates',
    domains: ['density', 'morphology'],
    observation: [
      'Density hex analysis shows large shares of the 500 m study area in compact / dense built-form types.',
      'See Built Form typology and median FSI–GSI on the Density tab.',
    ],
    interpretation: [
      'A compact fabric strengthens canyon effects and shadow patterns.',
      'It also increases competition for open space — linking form to heat findings.',
    ],
    implication: [
      'In DMMC and UDA approvals, require usable open space and cross-ventilation, not floor area alone.',
      'Refuse forms that deepen street canyons without compensating ground-level openness on the 500 m density fabric.',
      'Align height and setback decisions with the compact typology already dominating the hex analysis so new stock does not lock in worse enclosure.',
    ],
    evidence: [
      { tab: 'density', label: 'Density typology + FSI/GSI', path: '/focus-area', focusSub: 'density' },
    ],
    issuesLinks: ['RC2', 'GOV1'],
  },
  {
    id: 'F7',
    label: 'Limited Open-Space Ratio',
    domains: ['density'],
    observation: [
      'Median OSR (open-space ratio) on the density hex grid shows limited open space relative to built coverage.',
      'See the Openness panel on the Density tab.',
    ],
    interpretation: [
      'Where OSR is low, there is less room for trees, permeable ground, and cooler microclimates.',
      'That makes it harder to ease UTCI.',
    ],
    implication: [
      'Protect remaining open ground in low-OSR hexes before it is absorbed by tourism or condominium footprints.',
      'Write on-site open-space ratios into hotel and condo conditions so new projects repay openness to the street.',
      'Treat OSR as a hard comfort and equity constraint alongside FSI when negotiating coastal redevelopment.',
    ],
    evidence: [
      { tab: 'density', label: 'OSR / openness metrics', path: '/focus-area', focusSub: 'density' },
    ],
    issuesLinks: ['GOV1', 'SE8'],
  },
  {
    id: 'F8',
    label: 'Network Centrality Concentrates Pressure',
    domains: ['morphology', 'social', 'maturation'],
    observation: [
      'Centrality maps (closeness / betweenness) highlight Mount Lavinia Junction and corridor links as key movement spines.',
      'UMI accessibility averages only ~0.13 (0–1) across 113 hexes.',
      'Network importance is high where measured accessibility still lags.',
    ],
    interpretation: [
      'Shannon entropy (land-use mix) is the preferred maturation lens.',
      'Accessibility is the weak part of the UMI composite.',
      'Heat, crowding, and tourism–resident friction still pile onto the most central streets.',
      'Being on a busy spine is not the same as fair, mature access.',
    ],
    implication: [
      'Put shade, sidewalk, and cooling packages first on high betweenness and closeness links through Mount Lavinia Junction.',
      'Improve walkable access to daily destinations so network importance is matched by real accessibility, which currently averages only about 0.13 on UMI.',
      'Read corridor pressure through Shannon land-use mix maps and centrality together so upgrades serve both movement and maturation.',
    ],
    evidence: [
      { tab: 'centrality', label: 'Centrality maps', path: '/focus-area', focusSub: 'centrality' },
      {
        tab: 'maturation',
        label: 'Shannon Entropy + UMI accessibility',
        path: '/focus-area',
        focusSub: 'maturation',
      },
    ],
    issuesLinks: ['PT1', 'SE7'],
  },
  {
    id: 'F9',
    label: 'Identity Mismatch Is Spatial',
    domains: ['social', 'governance'],
    observation: [
      'Issues root cause RC1 (Identity Mismatch): luxury tourism, formal residents, and fisherfolk share an un-zoned coastal space.',
      'Tourism-based development pressures residential neighbourhood character (SE7) and drives privatization of public facilities (SE9).',
      'Weak neighbourhood social ties (SE10) leave communities stressed and isolated — related to, but distinct from, tourist–resident privacy conflict.',
      'Related demand signal: PT1 (High Tourism Demand).',
    ],
    interpretation: [
      'Conflicts are not only attitudes.',
      'They show up as competing claims on the same streets, shore, and shade — and as thinning local social fabric.',
    ],
    implication: [
      'Use clear zoning to separate tourism, residential, and fishing claims on the shared coastal edge instead of leaving them to compete in unallocated foreshore space.',
      'Add working-coast buffers so fisher livelihoods are not squeezed by hotel and condo expansion along the beach.',
      'Keep public facilities in civic use and invest in neighbourhood social ties so tourism growth does not hollow out local community life.',
    ],
    evidence: [
      { tab: 'issues', label: 'Issues network · RC1', path: '/problems', node: 'RC1' },
    ],
    issuesLinks: ['RC1', 'SE7', 'SE9', 'SE10', 'PT1', 'ST3'],
  },
  {
    id: 'F10',
    label: 'Unregulated High-Rise Expansion',
    domains: ['governance', 'density', 'morphology'],
    observation: [
      'RC2 (Unregulated Development) and GOV1 (Weak Zoning) describe condo/hotel growth without clear separation from homes and the working coast.',
      'Rapid high-rise growth is producing a denser, more commercial urban fabric compared with Mount Lavinia’s original town character (also linked to SE8 speculation).',
    ],
    interpretation: [
      'Weak rules help produce the compact form and low OSR seen in density analysis.',
      'They also intensify outdoor heat on shared streets.',
    ],
    implication: [
      'Tighten zoning, height, and setback rules for hotels and condominiums before more towers lock in canyon enclosure on the Galle Road corridor.',
      'Separate high-rise tourism stock from residential and working-coast blocks so Mount Lavinia does not lose its town grain to unregulated slabs.',
      'Tie new bulk approvals to open-space and ventilation obligations that counter the compact, low-OSR fabric already measured in density analysis.',
    ],
    evidence: [
      { tab: 'issues', label: 'Issues · RC2 / GOV1', path: '/problems', node: 'RC2' },
      { tab: 'density', label: 'Density fabric', path: '/focus-area', focusSub: 'density' },
    ],
    issuesLinks: ['RC2', 'GOV1', 'SE8'],
  },
  {
    id: 'F11',
    label: 'Institutional EIA Failures',
    domains: ['governance'],
    observation: [
      'RC3 / GOV2 document EIA bypass (e.g. Coast Conservation Act Section 14).',
      'Control is split across UDA, CCD, and municipal bodies.',
      'The beach nourishment episode (ENV3) is part of this pattern.',
    ],
    interpretation: [
      'Environmental harm and flood risk are enabled by weak process, not only by climate or density.',
    ],
    implication: [
      'Require a complete environmental review before large coastal works, including cases where Coast Conservation Act shortcuts have been used before.',
      'Coordinate UDA, CCD, and municipal clearance so split control cannot bypass EIA on beach and foreshore projects.',
      'Treat spatial analysis as decision support, not as a substitute for enforceable environmental process.',
    ],
    evidence: [
      { tab: 'issues', label: 'Issues · RC3 / GOV2 / ENV3', path: '/problems', node: 'GOV2' },
    ],
    issuesLinks: ['RC3', 'GOV2', 'ENV3'],
  },
  {
    id: 'F12',
    label: 'Tourism Demand Without Spatial Buffers',
    domains: ['social', 'thermal'],
    observation: [
      'PT1 (High Tourism Demand) sits on a large Colombo-district room base.',
      'Outdoor UTCI along the junction corridor stays in strong heat-stress classes.',
      'Demand pressure also shows up as privatization of public facilities (SE9) where tourism and commercial use crowd out shared amenities.',
    ],
    interpretation: [
      'Growth pressure lands on streets that are already hot and socially contested.',
    ],
    implication: [
      'Steer tourism growth toward heritage, MICE, and niche markets that need less bulk on already hot Junction streets.',
      'Fund shade and walking comfort on central corridors that carry both visitors and residents under strong UTCI.',
      'Keep schools, clinics, and other public facilities publicly accessible as commercial tourism pressure rises.',
    ],
    evidence: [
      { tab: 'issues', label: 'Issues · PT1', path: '/problems', node: 'PT1' },
      { tab: 'environmental', label: 'UTCI map', path: '/environmental' },
    ],
    issuesLinks: ['PT1', 'PT3', 'SE7', 'SE9'],
  },
  {
    id: 'F13',
    label: 'Planning Must Couple Climate and Zoning',
    domains: ['governance', 'thermal', 'density', 'maturation'],
    observation: [
      'Heat stress, uneven Shannon entropy, a still-low UMI, weak zoning, and tourism–resident conflict show up together across the analysis layers.',
      'These are linked themes, not separate problems.',
    ],
    interpretation: [
      'A single-sector response (trees only, or zoning only, or tourism marketing only) will under-perform.',
      'Shannon-led maturation and the UMI composite both show a fabric that is not yet mature.',
    ],
    implication: [
      'Package heat mitigation, zoning reform, and tourism management as one Mount Lavinia programme instead of separate sector projects.',
      'Raise land-use mix, outdoor comfort, walkable access, and fair foreshore space in a shared delivery sequence.',
      'Use the SFA priorities in Issues and Potentials to order which interventions start first on the ground.',
    ],
    evidence: [
      { tab: 'issues', label: 'SFA Assessment', path: '/problems' },
      { tab: 'environmental', label: 'Environmental Analysis', path: '/environmental' },
      {
        tab: 'maturation',
        label: 'Shannon Entropy + UMI',
        path: '/focus-area',
        focusSub: 'maturation',
      },
    ],
    issuesLinks: ['GOV1', 'RC1', 'RC2'],
  },
  {
    id: 'F14',
    label: 'Shannon Entropy Leads the Maturation Reading',
    domains: ['maturation', 'morphology'],
    observation: [
      'Study area: 113 hex cells, each 100 m.',
      'Mean Shannon entropy (land-use mix): ~0.23 on a 0–1 scale.',
      'Shannon is the preferred final signal for maturation (mix).',
      'Mean UMI (composite of Shannon + access + diversity): ~0.16.',
      'UMI tiers: ~51% early (under 0.15), ~42% moderate (0.15–0.35), ~7% highly matured (over 0.35).',
      'UMI sits lower than Shannon because access and diversity are weaker.',
    ],
    interpretation: [
      'Shannon is the strongest maturation lens here — it measures mix directly.',
      'UMI is still useful as the combined index.',
      'Its lower mean shows access and diversity pulling the score down.',
    ],
    implication: [
      'Site mix and Live+Work interventions using Shannon entropy maps as the primary maturation reading across the 100 m hex fabric.',
      'Use the lower UMI mean to flag where access and diversity fail to convert mix into everyday functional maturity.',
      'Brief decision makers with Shannon first and UMI as the composite check, not the other way around.',
    ],
    evidence: [
      {
        tab: 'maturation',
        label: 'Shannon Entropy map',
        path: '/focus-area',
        focusSub: 'maturation',
      },
      {
        tab: 'maturation',
        label: 'UMI gauge + tier breakdown',
        path: '/focus-area',
        focusSub: 'maturation',
      },
    ],
    issuesLinks: ['RC2', 'GOV1'],
  },
  {
    id: 'F15',
    label: 'Access and Diversity Pull UMI Below Shannon',
    domains: ['maturation', 'morphology'],
    observation: [
      'UMI component means (0–1): Shannon entropy ~0.23.',
      'Accessibility ~0.13.',
      'Land-use diversity ~0.12.',
      'Shannon is the stronger maturation reading.',
      'Access and diversity pull the composite UMI down to ~0.16.',
    ],
    interpretation: [
      'A low UMI does not mean “no mix.”',
      'Shannon shows more mix than access and diversity deliver.',
      'Functional maturity is thin relative to network and tourism pressure (see F8).',
    ],
    implication: [
      'Insert reachable shops, services, and daily destinations along main corridors so accessibility rises toward the stronger Shannon mix reading.',
      'Prefer mixed Live+Work hexes over repeating mono-typology hotel or condo slabs that score poorly on diversity.',
      'Target access and diversity upgrades where UMI components lag Shannon so the composite score can catch up to real land-use mix.',
    ],
    evidence: [
      {
        tab: 'maturation',
        label: 'Index components (Shannon / access / diversity)',
        path: '/focus-area',
        focusSub: 'maturation',
      },
      { tab: 'centrality', label: 'Centrality maps', path: '/focus-area', focusSub: 'centrality' },
    ],
    issuesLinks: ['GOV1', 'PT1'],
  },
  {
    id: 'F16',
    label: 'Uneven Shannon Fabric Meets Heat and Conflict',
    domains: ['maturation', 'thermal', 'social'],
    observation: [
      'Mean Shannon entropy is ~0.23.',
      'UMI composite is still early (~0.16; mostly early/moderate tiers).',
      'On the same geography, mean UTCI is ~39 °C (strong heat stress).',
      'Issues RC1 describes tourism–resident–fisher identity mismatch on shared un-zoned space.',
    ],
    interpretation: [
      'Read maturation first through Shannon mix, then confirm with UMI.',
      'An incompletely matured fabric absorbs tourism and climate stress poorly.',
      'Limited access/diversity sit alongside harsh outdoor comfort and competing place claims.',
    ],
    implication: [
      'Run one coordinated programme that upgrades land-use mix, outdoor walking comfort, and coastal zoning on the same geography.',
      'Treat uneven Shannon fabric, early UMI tiers, strong UTCI, and tourism–resident–fisher conflict as linked delivery problems, not separate files.',
      'Sequence work with the same integrated path used for climate and zoning coupling, so heat and identity stress are not left for a later phase.',
    ],
    evidence: [
      {
        tab: 'maturation',
        label: 'Shannon Entropy map',
        path: '/focus-area',
        focusSub: 'maturation',
      },
      {
        tab: 'maturation',
        label: 'UMI map',
        path: '/focus-area',
        focusSub: 'maturation',
      },
      { tab: 'environmental', label: 'UTCI map', path: '/environmental' },
      { tab: 'issues', label: 'Issues · RC1', path: '/problems', node: 'RC1' },
    ],
    issuesLinks: ['RC1', 'RC2', 'GOV1'],
  },
]

/** Typed edges for the claim interconnection diagram. */
export const findingEdges = [
  { source: 'F2', target: 'F3', type: 'amplifies', strength: 2 },
  { source: 'F1', target: 'F3', type: 'co_located', strength: 2 },
  { source: 'F4', target: 'F2', type: 'caused_by', strength: 2 },
  { source: 'F4', target: 'F1', type: 'amplifies', strength: 1 },
  { source: 'F5', target: 'F1', type: 'amplifies', strength: 2 },
  { source: 'F6', target: 'F4', type: 'amplifies', strength: 2 },
  { source: 'F6', target: 'F7', type: 'co_located', strength: 2 },
  { source: 'F7', target: 'F1', type: 'amplifies', strength: 1 },
  { source: 'F8', target: 'F1', type: 'co_located', strength: 1 },
  { source: 'F8', target: 'F9', type: 'amplifies', strength: 2 },
  { source: 'F10', target: 'F6', type: 'caused_by', strength: 2 },
  { source: 'F10', target: 'F9', type: 'amplifies', strength: 2 },
  { source: 'F11', target: 'F10', type: 'amplifies', strength: 2 },
  { source: 'F12', target: 'F9', type: 'amplifies', strength: 2 },
  { source: 'F12', target: 'F1', type: 'co_located', strength: 1 },
  { source: 'F3', target: 'F13', type: 'amplifies', strength: 2 },
  { source: 'F9', target: 'F13', type: 'amplifies', strength: 2 },
  { source: 'F10', target: 'F13', type: 'amplifies', strength: 2 },
  { source: 'F7', target: 'F13', type: 'amplifies', strength: 1 },
  { source: 'F15', target: 'F8', type: 'caused_by', strength: 2 },
  { source: 'F15', target: 'F14', type: 'amplifies', strength: 2 },
  { source: 'F14', target: 'F6', type: 'amplifies', strength: 2 },
  { source: 'F14', target: 'F1', type: 'co_located', strength: 2 },
  { source: 'F14', target: 'F16', type: 'amplifies', strength: 2 },
  { source: 'F16', target: 'F1', type: 'co_located', strength: 2 },
  { source: 'F16', target: 'F9', type: 'amplifies', strength: 2 },
  { source: 'F16', target: 'F13', type: 'amplifies', strength: 2 },
  { source: 'F8', target: 'F16', type: 'amplifies', strength: 1 },
]

/**
 * Six-step key argument path.
 * Shannon-first maturation: Shannon profile → components/UMI → centrality → heat → identity → coupled response.
 */
export const storySpine = [
  {
    findingId: 'F14',
    title: 'Shannon Profile',
    blurb: 'Shannon mix ~0.23; UMI combined score ~0.16.',
  },
  {
    findingId: 'F15',
    title: 'Access/Diversity Lag',
    blurb: 'Access and diversity are low, so UMI falls below Shannon.',
  },
  {
    findingId: 'F8',
    title: 'Central Corridors',
    blurb: 'Junction links carry the most movement and pressure.',
  },
  {
    findingId: 'F1',
    title: 'Heat Stress',
    blurb: 'Mean UTCI ~39 °C — strong outdoor heat stress.',
  },
  {
    findingId: 'F9',
    title: 'Identity Mismatch',
    blurb: 'Tourism, residents, and fishers share un-zoned space.',
  },
  {
    findingId: 'F16',
    title: 'Couple Shannon + Climate',
    blurb: 'Raise mix, UMI, comfort, and zoning together.',
  },
]

export function getFindingById(id) {
  return findings.find((f) => f.id === id) ?? null
}

export function getConnectedFindingIds(findingId) {
  const ids = new Set()
  for (const e of findingEdges) {
    if (e.source === findingId) ids.add(e.target)
    if (e.target === findingId) ids.add(e.source)
  }
  return [...ids]
}
