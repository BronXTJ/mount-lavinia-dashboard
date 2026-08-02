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
  walk: { label: 'Walk Access', color: '#0d9488' },
  network: { label: 'Network Form', color: '#f59e0b' },
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
    label: 'Split Built Form Across the Primary Area',
    domains: ['density', 'morphology'],
    observation: [
      'Primary 5-GN density analysis uses a 100 m hex grid (447 hexes; 341 analysis-grade at ≥90% complete).',
      'Typology on analysis-grade hexes is split: about 40% Dense Congested Urban and about 40% Open Underdeveloped, with smaller shares of vertical and sprawling types.',
      'See Built Form typology and median FSI–GSI on the Density tab.',
    ],
    interpretation: [
      'The fabric is not uniformly compact: dense congested cells sit alongside large open-underdeveloped patches.',
      'Where compact types cluster, canyon effects and competition for open space still intensify heat and enclosure.',
    ],
    implication: [
      'In DMMC and UDA approvals, require usable open space and cross-ventilation, not floor area alone—especially in dense congested hexes.',
      'Refuse forms that deepen street canyons without compensating ground-level openness on the primary density fabric.',
      'Treat open-underdeveloped hexes as opportunities for managed growth rather than leftover land for unregulated slabs.',
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
      'Median OSR (open-space ratio) on primary analysis-grade density hexes (≥90% complete) is about 0.34 — limited open space relative to built coverage.',
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
    domains: ['morphology', 'social', 'maturation', 'walk'],
    observation: [
      'Centrality maps (closeness / betweenness at multiple scales) highlight Mount Lavinia Junction and corridor links as key movement spines.',
      'UMI accessibility (from 5000 m closeness NQPDA5000 and betweenness BtA5000) averages only about 0.11 on a 0–1 scale across 341 analysis-grade hexes (≥90% complete).',
      'Network importance is high where measured accessibility still lags.',
      'Five analysis hexes combine top-quartile mean BtA5000 with destination access_score under 0.5 — high betweenness without matching daily destination reach.',
    ],
    interpretation: [
      'Shannon entropy (land-use mix) remains a strong maturation lens for reading mix.',
      'Accessibility is the weak part of the UMI composite on the primary grid.',
      'Heat, crowding, and tourism–resident friction still pile onto the most central streets.',
      'Being on a busy spine is not the same as fair, mature access — nor as destination walk reach.',
    ],
    implication: [
      'Put shade, sidewalk, and cooling packages first on high betweenness and closeness links through Mount Lavinia Junction.',
      'Improve walkable access to daily destinations so network importance is matched by real accessibility, which currently averages only about 0.11 on UMI.',
      'Read corridor pressure through Shannon land-use mix maps, centrality, and destination walk mismatch together so upgrades serve both movement and lived access.',
    ],
    evidence: [
      { tab: 'centrality', label: 'Centrality maps', path: '/focus-area', focusSub: 'centrality' },
      {
        tab: 'maturation',
        label: 'Shannon Entropy + UMI accessibility',
        path: '/focus-area',
        focusSub: 'maturation',
      },
      {
        tab: 'walk',
        label: 'Walk access · centrality mismatch',
        path: '/focus-area',
        focusSub: 'walk-access',
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
      'Rapid high-rise growth is producing denser, more commercial patches compared with Mount Lavinia’s original town character (also linked to SE8 speculation), alongside still-open underdeveloped hexes on the primary grid.',
    ],
    interpretation: [
      'Weak rules help produce low-OSR and congested form where towers cluster, while leaving other cells under-structured.',
      'They also intensify outdoor heat on shared streets.',
    ],
    implication: [
      'Tighten zoning, height, and setback rules for hotels and condominiums before more towers lock in canyon enclosure on the Galle Road corridor.',
      'Separate high-rise tourism stock from residential and working-coast blocks so Mount Lavinia does not lose its town grain to unregulated slabs.',
      'Tie new bulk approvals to open-space and ventilation obligations that counter low-OSR and congested fabric already measured in primary density analysis.',
    ],
    evidence: [
      { tab: 'issues', label: 'Issues · RC2 / GOV1', path: '/problems', node: 'RC2' },
      { tab: 'density', label: 'Density fabric', path: '/focus-area', focusSub: 'density' },
    ],
    issuesLinks: ['RC2', 'GOV1', 'SE8'],
  },
  {
    id: 'F11',
    label: 'Coastal Projects Skipped Environmental Review',
    domains: ['governance'],
    observation: [
      'Major coastal projects were approved without a full environmental impact study — recorded under Institutional Failures (RC3) and Skipped Environmental Review (GOV2).',
      'In some cases, legal shortcuts (e.g. Coast Conservation Act Section 14) were used instead of a proper assessment.',
      'Control is split across UDA, CCD, and municipal bodies.',
      'The beach nourishment episode (ENV3) is part of this pattern.',
    ],
    interpretation: [
      'Beach and coastal damage is not only from climate or overcrowding — it also happens when projects are approved without checking environmental harm first.',
    ],
    implication: [
      'Require a full environmental impact study before any large beach or foreshore project — no approvals through legal shortcuts alone.',
      'Coordinate UDA, CCD, and municipal clearance so split control cannot skip environmental review on beach and foreshore projects.',
      'Treat spatial analysis as decision support, not as a substitute for enforceable environmental process.',
    ],
    evidence: [
      { tab: 'issues', label: 'Issues · Skipped review (GOV2) · Beach harm (ENV3)', path: '/problems', node: 'GOV2' },
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
      'Steer tourism growth toward heritage, events and business tourism (MICE: meetings, conferences), and niche markets that need less bulk on already hot Junction streets.',
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
      'Heat stress, uneven Shannon entropy, mid-range UMI with weak accessibility, weak zoning, and tourism–resident conflict show up together across the analysis layers.',
      'These are linked themes, not separate problems.',
    ],
    interpretation: [
      'A single-sector response (trees only, or zoning only, or tourism marketing only) will under-perform.',
      'Primary maturation shows meaningful mix and diversity, but access still lags—so climate and zoning responses must close that gap, not chase “early UMI” myths from the old 500 m study.',
    ],
    implication: [
      'Package heat mitigation, zoning reform, and tourism management as one Mount Lavinia programme instead of separate sector projects.',
      'Raise walkable access, outdoor comfort, and fair foreshore space alongside land-use mix in a shared delivery sequence.',
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
      'Primary study area: 447 hex cells at 100 m (341 analysis-grade at ≥90% complete for KPIs).',
      'Mean Shannon entropy (normalized land-use mix): about 0.44 on a 0–1 scale.',
      'Shannon remains a strong final signal for maturation (mix).',
      'Mean UMI (composite of Shannon + access + diversity): about 0.34.',
      'UMI tiers on analysis-grade hexes: about 62% moderately matured (0.15–0.35), about 36% highly matured (over 0.35), and about 1–2% early-tier cells (under 0.15).',
      'UMI sits below Shannon largely because accessibility is weaker than mix and diversity.',
    ],
    interpretation: [
      'Shannon is still a strong maturation lens here — it measures mix directly.',
      'UMI is useful as the combined index and is mid-range on the primary grid, not an early-stage mean.',
      'The gap between Shannon and UMI points to access (and local delivery), not a lack of mix.',
    ],
    implication: [
      'Site mix and Live+Work interventions using Shannon entropy maps as the primary maturation reading across the 100 m hex fabric.',
      'Use the UMI–Shannon gap to flag where accessibility fails to convert mix into everyday functional maturity.',
      'Brief decision makers with Shannon first for mix, then UMI as the composite check—especially the weak access component.',
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
    label: 'Accessibility Lags Mix and Diversity',
    domains: ['maturation', 'morphology', 'walk'],
    observation: [
      'UMI component means on primary analysis-grade hexes (0–1): Shannon entropy about 0.44.',
      'Land-use diversity about 0.46.',
      'Accessibility about 0.11 (from 5000 m closeness and betweenness).',
      'Shannon and diversity are the stronger maturation readings.',
      'Weak accessibility pulls the composite UMI down to about 0.34—below what mix alone would suggest.',
      'Destination walk access averages about 0.872 across 341 analysis hexes, but health (80.3%) and education (82.7%) 10-minute coverage still lag food (99.4%).',
    ],
    interpretation: [
      'A mid UMI does not mean “no mix.”',
      'Shannon and diversity show more functional variety than the accessibility layer delivers.',
      'Functional reach is thin relative to network and tourism pressure (see F8).',
      'UMI accessibility measures network potential; destination walk scores measure lived reach to services — both lag behind mix in different ways.',
    ],
    implication: [
      'Insert reachable shops, services, and daily destinations along main corridors so accessibility rises toward the stronger Shannon and diversity readings.',
      'Prefer mixed Live+Work hexes over repeating mono-typology hotel or condo slabs.',
      'Target access upgrades where UMI lags Shannon — and where destination deserts or health/education gaps remain — so the composite score can catch up to real land-use mix.',
    ],
    evidence: [
      {
        tab: 'maturation',
        label: 'Index components (Shannon / access / diversity)',
        path: '/focus-area',
        focusSub: 'maturation',
      },
      { tab: 'centrality', label: 'Centrality maps', path: '/focus-area', focusSub: 'centrality' },
      {
        tab: 'walk',
        label: 'Destination walk accessibility',
        path: '/focus-area',
        focusSub: 'walk-access',
      },
    ],
    issuesLinks: ['GOV1', 'PT1'],
  },
  {
    id: 'F16',
    label: 'Uneven Shannon Fabric Meets Heat and Conflict',
    domains: ['maturation', 'thermal', 'social'],
    observation: [
      'Mean Shannon entropy is about 0.44 on primary analysis-grade hexes.',
      'UMI composite averages about 0.34 (mostly moderate and highly matured tiers).',
      'On the same geography, mean UTCI is ~39 °C (strong heat stress).',
      'Issues RC1 describes tourism–resident–fisher identity mismatch on shared un-zoned space.',
    ],
    interpretation: [
      'Read maturation first through Shannon mix, then confirm with UMI—especially the weak access component.',
      'A fabric with mid UMI and uneven mix still absorbs tourism and climate stress poorly where access and comfort lag.',
      'Limited accessibility sits alongside harsh outdoor comfort and competing place claims.',
    ],
    implication: [
      'Run one coordinated programme that upgrades walkable access, outdoor walking comfort, and coastal zoning on the same geography.',
      'Treat uneven Shannon fabric, mid UMI with weak access, strong UTCI, and tourism–resident–fisher conflict as linked delivery problems, not separate files.',
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
  {
    id: 'WA1',
    label: 'Food Access Is Strong; Health and Education Lag',
    domains: ['walk', 'morphology'],
    observation: [
      'Among 341 analysis hexes (area_ratio≥0.90 and snapped within 100 m), mean destination access_score is 0.872.',
      'Within a 10-minute walk, food coverage is 99.4% while health is 80.3% and education is 82.7%.',
      'Transit (89.7%), finance (88.0%), and open space (83.0%) sit between those extremes.',
    ],
    interpretation: [
      'Daily retail/food destinations are already dense relative to other essential services.',
      'Health and education remain the thinnest 10-minute destination groups, so accessibility is uneven by function rather than uniformly poor.',
      'Five-minute coverage is much lower for health/education than for food, so short-trip equity gaps are sharper than 10-minute totals alone suggest.',
    ],
    implication: [
      'Prioritise pharmacies/clinics and school-adjacent walking links where 10-minute health/education reach is weakest.',
      'Do not treat high food coverage as proof that all daily needs are walkable.',
      'Use destination-group time maps and coverage bars to target service insertion or crossing upgrades.',
    ],
    evidence: [
      {
        tab: 'walk',
        label: 'Walk Accessibility · coverage by group',
        path: '/focus-area',
        focusSub: 'walk-access',
      },
    ],
    issuesLinks: ['GOV1', 'PT1'],
  },
  {
    id: 'WA2',
    label: 'Destination Deserts Are Localized',
    domains: ['walk', 'morphology'],
    observation: [
      '29 analysis hexes are low-tier deserts (groups_within_10 ≤ 2), about 8.5% of the analysis set.',
      'Tier among all 447 hexes: high 272, medium 40, low 29, excluded 106.',
      'Excluded cells are incomplete (<90% area) or unsnapped (>100 m from the walk network); they remain mapped but are outside KPI denominators.',
    ],
    interpretation: [
      'Most of the primary area already reaches five or more destination groups within 10 minutes.',
      'Deserts are concentrated pockets, not an area-wide failure of walk access.',
      'Treating only legacy is_edge cells as invalid would mis-state the problem; the analysis_ok gate keeps near-complete boundary hexes in the evidence.',
    ],
    implication: [
      'Treat the 29 desert hexes as priority zones for missing daily destinations or safer walk links into existing clusters.',
      'Keep deserts visible alongside high-access fabric so interventions stay place-specific.',
      'Re-check deserts after any POI inventory update (health/education especially).',
    ],
    evidence: [
      {
        tab: 'walk',
        label: 'Walk Accessibility · deserts outline',
        path: '/focus-area',
        focusSub: 'walk-access',
      },
    ],
    issuesLinks: ['GOV1'],
  },
  {
    id: 'WA3',
    label: 'A Few High-Betweenness Cells Still Lack Daily Destinations',
    domains: ['walk', 'morphology', 'maturation'],
    observation: [
      '5 analysis hexes combine top-quartile mean BtA5000 with access_score under 0.5.',
      'These cells sit on structurally important movement corridors but still fail to reach half of the six destination groups within 10 minutes.',
      'This is the spatial bridge to synthesis finding F8 (network centrality concentrates pressure).',
    ],
    interpretation: [
      'Network importance (space-syntax betweenness) is not the same as destination reach.',
      'UMI accessibility (~0.11 from NQPDA/BtA) measures network potential; destination walk scores measure lived reach to services.',
      'Mismatch hexes show where movement spines still under-serve daily needs.',
    ],
    implication: [
      'Put service insertion, sidewalk continuity, and shade packages first on mismatch corridors.',
      'When reading F8/F15, cite destination walk results alongside centrality so accessibility lag is not read as network topology alone.',
      'Avoid assuming high betweenness streets already have complete daily amenity catchments.',
    ],
    evidence: [
      {
        tab: 'walk',
        label: 'Walk Accessibility · mismatch outline',
        path: '/focus-area',
        focusSub: 'walk-access',
      },
      { tab: 'centrality', label: 'Centrality maps', path: '/focus-area', focusSub: 'centrality' },
    ],
    issuesLinks: ['PT1', 'SE7'],
  },
  {
    id: 'NF1',
    label: 'Tree-like Fabric and Cul-de-sac Depth',
    domains: ['network', 'morphology'],
    observation: [
      'Across five GNs, junctions are 3-way dominated (4-way : 3-way ≈ 0.09 : 0.91; 4-way share ~9%).',
      '259 primary cul-de-sacs; median stub length 59.6 m; depth mix short/medium/long = 105 / 139 / 15.',
      '247 cul-de-sacs sit in the interior versus only 12 within 50 m of corridor spines.',
    ],
    interpretation: [
      'The residential street fabric is tree-like rather than a permeable grid — dead-ends and T-junctions dominate local choice.',
      'Most stubs are short-to-medium (<150 m); long stubs (>150 m) are rare but still present as deep enclosures.',
      'Cul-de-sacs concentrate off the spines, so interior blocks absorb most enclosure.',
    ],
    implication: [
      'Prioritise interior permeability upgrades (through-links, mid-block paths) instead of assuming destination walk scores prove a grid form.',
      'Treat long stubs as candidate cut-through or shared-path sites where ownership and safety allow.',
      'Cite Network Form stub depth alongside junction mix when arguing for finer-grain connectivity.',
    ],
    evidence: [
      {
        tab: 'network',
        label: 'Network Form · cul-de-sac depth',
        path: '/focus-area',
        focusSub: 'network-form',
      },
    ],
    issuesLinks: ['GOV1', 'PT1'],
  },
  {
    id: 'NF2',
    label: 'Cul-de-sac Density Concentrates in Smaller GNs',
    domains: ['network', 'morphology'],
    observation: [
      'By cul-de-sacs per km², Watarappala leads (~111.4/km²) and Kawdana West is close (~110.5/km²).',
      'Mount Lavinia has the highest count (65) but the lowest density among the five (~56.5/km²).',
      'All-GN corridor 4-way share (~13%) exceeds interior (~8%); spines remain relatively more permeable.',
    ],
    interpretation: [
      'Enclosure intensity is uneven across GNs — smaller, denser residential GNs pack more dead-ends per hectare.',
      'Raw cul-de-sac counts alone understate pressure in Watarappala and Kawdana West.',
      'Corridor-versus-interior still holds: permeability rides spines while interiors stay tree-like.',
    ],
    implication: [
      'Target permeability pilots where density of cul-de-sacs is highest (Watarappala / Kawdana West), not only where absolute counts peak.',
      'Keep GN ranking and hex density layers visible when scoping local through-block interventions.',
      'Do not read Mount Lavinia’s larger count as higher enclosure intensity without normalising by area.',
    ],
    evidence: [
      {
        tab: 'network',
        label: 'Network Form · GN ranking / hex density',
        path: '/focus-area',
        focusSub: 'network-form',
      },
    ],
    issuesLinks: ['GOV1'],
  },
  {
    id: 'NF3',
    label: 'Walk Access and UMI Do Not Prove Grid Permeability',
    domains: ['network', 'walk', 'maturation', 'density'],
    observation: [
      '33 primary cul-de-sacs (~12.7%) fall in walk-access desert hexes (19 hexes); ~70% sit in high walk-access tier.',
      'Mean destination access among cul-de-sac hexes is ~0.835 — still high even where form is tree-like.',
      'Among valid cul-de-sac hexes, mean UMI is ~0.312 and mean FSI ~1.86; ~75% of cul-de-sacs sit in medium maturation tier.',
    ],
    interpretation: [
      'Strong destination reach on many dead-end streets can coexist with low junction permeability — access scores are not a proxy for grid form.',
      'A minority of cul-de-sacs co-locate with destination deserts; those pockets need both connectivity and service attention.',
      'Moderate UMI/FSI in cul-de-sac hexes shows built intensity without implying mature, mixed, permeable blocks.',
    ],
    implication: [
      'When reading WA2 deserts or F8/F15 access claims, cite Network Form so high walk scores are not mistaken for permeable interiors.',
      'Pair desert-cul-de-sac hexes for joint walk + permeability upgrades.',
      'Prefer interior through-links over assuming maturation or density alone will open the fabric.',
    ],
    evidence: [
      {
        tab: 'network',
        label: 'Network Form · walk / UMI overlays',
        path: '/focus-area',
        focusSub: 'network-form',
      },
      {
        tab: 'walk',
        label: 'Walk Accessibility · deserts',
        path: '/focus-area',
        focusSub: 'walk-access',
      },
      {
        tab: 'maturation',
        label: 'Urban Maturation · UMI',
        path: '/focus-area',
        focusSub: 'maturation',
      },
    ],
    issuesLinks: ['GOV1', 'PT1'],
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
  { source: 'WA1', target: 'F15', type: 'amplifies', strength: 2 },
  { source: 'WA2', target: 'WA1', type: 'co_located', strength: 2 },
  { source: 'WA3', target: 'F8', type: 'amplifies', strength: 2 },
  { source: 'WA3', target: 'F15', type: 'caused_by', strength: 2 },
  { source: 'NF1', target: 'NF2', type: 'amplifies', strength: 2 },
  { source: 'NF2', target: 'NF3', type: 'amplifies', strength: 2 },
  { source: 'NF3', target: 'WA2', type: 'co_located', strength: 2 },
  { source: 'NF3', target: 'F8', type: 'amplifies', strength: 1 },
  { source: 'NF3', target: 'F15', type: 'caused_by', strength: 2 },
]

/**
 * Six-step key argument path.
 * Shannon-first maturation: Shannon profile → access lag → centrality → heat → identity → coupled response.
 */
export const storySpine = [
  {
    findingId: 'F14',
    title: 'Shannon Profile',
    blurb: 'Primary grid: Shannon mix ~0.44; UMI combined score ~0.34.',
  },
  {
    findingId: 'F15',
    title: 'Access Lags',
    blurb: 'Accessibility (~0.11) lags mix and diversity, holding UMI below Shannon.',
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
    blurb: 'Raise access, comfort, and zoning together with mix.',
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
