/** Category colors for network nodes and badges. */
export const categoryColors = {
  'Environmental Issue': '#f87171',
  'Socio-Economic Issue': '#fb923c',
  'Governance Issue': '#c4b5fd',
  'Potential - Tourism': '#86efac',
  'Potential - Ecology': '#67e8f9',
  'Potential - Human': '#93c5fd',
  'Potential - Planning': '#a7f3d0',
  'Root Cause': '#fcd34d',
  Stakeholder: '#f9a8d4',
}

/** Display order: foundational → issues → potentials → actors. */
export const CATEGORY_ORDER = [
  'Root Cause',
  'Environmental Issue',
  'Socio-Economic Issue',
  'Governance Issue',
  'Potential - Planning',
  'Potential - Ecology',
  'Potential - Human',
  'Potential - Tourism',
  'Stakeholder',
]

/** Network graph nodes — Issues & Potentials. */
export const nodes = [
  // ROOT CAUSES
  {
    id: 'RC1',
    label: 'Identity Mismatch',
    category: 'Root Cause',
    detail:
      'Mount Lavinia suffers from a severe spatial and socio-economic conflict between luxury tourism, formal residents, and traditional fisherfolk sharing an un-zoned space — creating a fundamental place identity mismatch. Tourism-based development also pressures the residential character of neighbourhoods.',
    group: 1,
  },
  {
    id: 'RC2',
    label: 'Unregulated Development',
    category: 'Root Cause',
    detail:
      'Rapid high-rise condominium and hotel expansion without programmatic spatial separation from residential and working coastal zones, producing a denser and more commercial urban fabric than Mount Lavinia’s original town character.',
    group: 1,
  },
  {
    id: 'RC3',
    label: 'Institutional Failures',
    category: 'Root Cause',
    detail:
      'Large coastal projects sometimes go ahead without a proper environmental impact study, using legal shortcuts (e.g. Coast Conservation Act Section 14). Responsibility is also split between UDA, the Coast Conservation Department, and the municipality, with no single body managing the coast.',
    group: 1,
  },
  {
    id: 'RC4',
    label: 'Displacement of Poor',
    category: 'Root Cause',
    detail:
      'Systematic forced relocation of coastal poor to inland camps like Badowita, disconnecting them from their livelihoods and creating structural poverty cycles.',
    group: 1,
  },
  // ENVIRONMENTAL ISSUES
  {
    id: 'ENV1',
    label: 'Plastic Waste Leakage',
    category: 'Environmental Issue',
    detail:
      '29.6 tons of plastic waste generated daily. 3.8 tons (8%) escapes formal systems and enters waterways and marine ecosystem daily.',
    group: 2,
  },
  {
    id: 'ENV2',
    label: 'Fecal Coliform Pollution',
    category: 'Environmental Issue',
    detail:
      'Luxury hotels discharge untreated sewage directly into the ocean. FC levels exceed safe bathing standard of 150 MPN/100ml. During rough tides, spikes reach 10⁴–10⁵ MPN/100ml.',
    group: 2,
  },
  {
    id: 'ENV3',
    label: 'Beach Nourishment Disaster',
    category: 'Environmental Issue',
    detail:
      'Mismanaged beach nourishment and hard coastal works can smother reefs and block drainage. One example is the Rs. 890 million project that pumped 150,000 cubic meters of deep-sea sand onto the beach without completing a full environmental impact assessment, harming Paragala and Demadagala reefs and causing inland floods.',
    group: 2,
  },
  {
    id: 'ENV4',
    label: 'Coastal Erosion',
    category: 'Environmental Issue',
    detail:
      'Severe sand starvation from unregulated inland river sand mining in Kalu and Kelani rivers, alongside poorly placed artificial breakwaters disrupting natural sediment transport. Consequences include a shrinking beach and loss of natural habitats.',
    group: 2,
  },
  {
    id: 'ENV5',
    label: 'Ship Chemical Spill (2021)',
    category: 'Environmental Issue',
    detail:
      'A cargo ship caught fire and sank off Sri Lanka’s coast in 2021, releasing toxic chemicals and millions of tiny plastic pellets onto beaches and into the sea. This harmed marine life, fishing, and coastal communities. The vessel was the MV X-Press Pearl (May 2021) — about 25 tons of nitric acid and large volumes of plastic nurdles (raw plastic pellets) reached the shore.',
    group: 2,
  },
  {
    id: 'ENV6',
    label: 'Reef Destruction',
    category: 'Environmental Issue',
    detail:
      'Nearshore reef ecosystems are biodiverse breeding grounds and natural wave breakers. Reefs such as Paragala and Demadagala have been severely damaged by beach nourishment and chemical pollution.',
    group: 2,
  },
  // SOCIO-ECONOMIC ISSUES
  {
    id: 'SE1',
    label: 'Fishermen Infrastructure Deficit',
    category: 'Socio-Economic Issue',
    detail:
      '160 active fishermen and 60 boats lack sanitary fish auction center, bathrooms, or fresh water pumps. Middlemen exploit fisherfolk by buying at severely deflated prices.',
    group: 3,
  },
  {
    id: 'SE2',
    label: 'Kadawatha Rock Hazard',
    category: 'Socio-Economic Issue',
    detail:
      'Government refuses to clear the Kadawatha rock — a nearshore boulder that frequently destroys incoming boats, causing equipment loss and fatal drownings.',
    group: 3,
  },
  {
    id: 'SE3',
    label: 'Forced Clearances',
    category: 'Socio-Economic Issue',
    detail:
      'UDA and police use heavy machinery to demolish informal commercial stalls and coastal shanties without providing alternative land or compensation.',
    group: 3,
  },
  {
    id: 'SE4',
    label: 'Structural Poverty (Badowita)',
    category: 'Socio-Economic Issue',
    detail:
      'Displaced families given only 1-2 perches. 81% Dengue fever rate due to poor drainage. 33% unemployment from livelihood disconnection. High-interest debt cycles from fuel crisis.',
    group: 3,
  },
  {
    id: 'SE5',
    label: 'Narcotics Epidemic',
    category: 'Socio-Economic Issue',
    detail:
      '38% of users consume Methamphetamine (Ice), 32% consume Heroin. 36.2% of all local crime is drug-related, generating severe community insecurity.',
    group: 3,
  },
  {
    id: 'SE6',
    label: 'Fuel Crisis Impact',
    category: 'Socio-Economic Issue',
    detail:
      'Fuel costs reach 60% of total operational expenses for fishing, making daily trips economically unviable and forcing families into crippling debt.',
    group: 3,
  },
  {
    id: 'SE7',
    label: 'Resident Privacy Loss',
    category: 'Socio-Economic Issue',
    detail:
      'Persistent stranger feeling, security issues, and socio-cultural conflicts between permanent residents and transient tourist influx. Tourism-based development further erodes the residential nature of local neighbourhoods.',
    group: 3,
  },
  {
    id: 'SE8',
    label: 'Real Estate Speculation',
    category: 'Socio-Economic Issue',
    detail:
      'Unregulated tourism and rapid high-rise development artificially inflate land and housing prices, driving up cost of living for locals and accelerating a denser, more commercial fabric over the original town character.',
    group: 3,
  },
  {
    id: 'SE9',
    label: 'Privatization of Public Facilities',
    category: 'Socio-Economic Issue',
    detail:
      'Tourism-led and commercial development pressure converts or restricts formerly public facilities and amenities, reducing community access and privatizing shared coastal and neighbourhood resources.',
    group: 3,
  },
  {
    id: 'SE10',
    label: 'Weak Neighborhood Social Ties',
    category: 'Socio-Economic Issue',
    detail:
      'Lack of neighbourhood and social connections leaves communities empty, stressed, and isolated — distinct from tourist–resident privacy conflicts, this is about thinning local social fabric.',
    group: 3,
  },
  // GOVERNANCE ISSUES
  {
    id: 'GOV1',
    label: 'Weak Zoning',
    category: 'Governance Issue',
    detail:
      'No programmatic spatial buffer separating luxury hotels from traditional fishery workspaces and residential neighborhoods. No formal zoning framework for the coastal working economy. Weak rules enable rapid high-rise growth that replaces Mount Lavinia’s original town fabric with denser commercial form.',
    group: 4,
  },
  {
    id: 'GOV2',
    label: 'Skipped Environmental Review',
    category: 'Governance Issue',
    detail:
      'Major coastal and beach projects were approved without a full environmental impact assessment — sometimes using Section 14 of the Coast Conservation Act as a shortcut instead of a proper study.',
    group: 4,
  },
  // POTENTIALS - TOURISM
  {
    id: 'PT1',
    label: 'High Tourism Demand',
    category: 'Potential - Tourism',
    detail:
      'Mount Lavinia sits within the Colombo district commanding 11,398 registered tourist rooms — ensuring a highly capitalized, persistent tourism demand base.',
    group: 5,
  },
  {
    id: 'PT2',
    label: 'Colonial Heritage Assets',
    category: 'Potential - Tourism',
    detail:
      'Historic Mount Lavinia Hotel, colonial-era architecture, and the famed Golden Mile hold significant aesthetic, legacy, and international tourism value.',
    group: 5,
  },
  {
    id: 'PT3',
    label: 'Untapped Heritage Tourism',
    category: 'Potential - Tourism',
    detail:
      'Arab-built Fort (893-914 AD) and Roman archaeological site Pupput (2nd century, Emperor Commodus) remain severely under-valorized as cultural heritage assets.',
    group: 5,
  },
  {
    id: 'PT4',
    label: 'Events & Niche Tourism',
    category: 'Potential - Tourism',
    detail:
      'Mount Lavinia can shift away from overcrowded mass beach tourism (sun, sea, sand — often called 3S tourism) toward lower-impact types: events and business tourism (MICE: meetings, incentives, conferences, exhibitions), wellness/Ayurveda, food tourism, and cultural festivals. These need less large-scale coastal building than mass beach packages.',
    group: 5,
  },
  // POTENTIALS - ECOLOGY
  {
    id: 'PE1',
    label: 'Biodiverse Reefs',
    category: 'Potential - Ecology',
    detail:
      'Nearshore reefs such as Paragala and Demadagala can act as breeding grounds and natural wave breakers. If protected, they also support sustainable dive tourism.',
    group: 6,
  },
  {
    id: 'PE2',
    label: 'Historic Shipwrecks',
    category: 'Potential - Ecology',
    detail:
      'Offshore shipwrecks with archaeological value present a major asset for high-end recreational and heritage diving tourism.',
    group: 6,
  },
  // POTENTIALS - HUMAN CAPITAL
  {
    id: 'PH1',
    label: 'High Literacy (95-97%)',
    category: 'Potential - Human',
    detail:
      'Municipality features exceptionally high urban literacy rates of 95-97% and a rich multicultural demographic providing a highly capable, diverse workforce.',
    group: 7,
  },
  {
    id: 'PH2',
    label: 'Generational Fishing Knowledge',
    category: 'Potential - Human',
    detail:
      '160 artisanal fishers possess invaluable generational knowledge of nearshore bathymetry, marine nutrition, seasonal currents, and reef ecology — vital for community-led environmental monitoring.',
    group: 7,
  },
  {
    id: 'PH3',
    label: 'Fishing Heritage',
    category: 'Potential - Human',
    detail: [
      'The community has a long-standing artisanal fishing heritage with many practices.',
      'Madela beach seine is one of those practices; teams of up to 60 people work in sync.',
      'This living heritage has strong cultural tourism potential.',
    ],
    group: 7,
  },
  // POTENTIALS - PLANNING
  {
    id: 'PP1',
    label: 'CZ&CRMP 2024-2029',
    category: 'Potential - Planning',
    detail:
      'New Coastal Zone & Coastal Resource Management Plan provides robust legal framework for sustainable shoreline management and nature-based solutions replacing destructive hard engineering.',
    group: 8,
  },
  {
    id: 'PP2',
    label: 'Working Coast Zoning',
    category: 'Potential - Planning',
    detail:
      'Legal demarcation of formal working coast zones for fishery (secure anchorages, sanitary auction centers) with spatial buffers protecting residential privacy — directly resolves identity mismatch.',
    group: 8,
  },
  {
    id: 'PP3',
    label: 'Decentralized Governance',
    category: 'Potential - Planning',
    detail:
      '2018 Organic Law on Local Collectivities strengthens municipal power, enabling multi-stakeholder partnerships (hoteliers, fisherfolk unions, environmental experts, residents) for collaborative coastal management.',
    group: 8,
  },
  // STAKEHOLDERS
  {
    id: 'ST1',
    label: 'Fisherfolk (160 active)',
    category: 'Stakeholder',
    detail:
      '160 active fishermen operating 60 boats. Primary victims of displacement and infrastructure neglect. Holders of generational ecological knowledge.',
    group: 9,
  },
  {
    id: 'ST2',
    label: 'Hotel & Tourism Industry',
    category: 'Stakeholder',
    detail:
      'Key economic driver but primary source of sewage pollution and visual degradation. Potential partner for sustainable tourism pivot.',
    group: 9,
  },
  {
    id: 'ST3',
    label: 'Formal Residents',
    category: 'Stakeholder',
    detail:
      'Suffer from privacy loss, real estate inflation, and loss of coastal aesthetics. Key voice for residential protection zones.',
    group: 9,
  },
  {
    id: 'ST4',
    label: 'UDA / Government',
    category: 'Stakeholder',
    detail:
      'Urban Development Authority — responsible for clearances and infrastructure decisions. Primary governance actor with power to implement or block planning responses.',
    group: 9,
  },
  {
    id: 'ST5',
    label: 'NGOs & Heritage Groups',
    category: 'Stakeholder',
    detail:
      'Advocates for heritage conservation, environmental protection, and fisherfolk rights. Critical partners for community governance models.',
    group: 9,
  },
]

/** Network graph edges. */
export const edges = [
  { source: 'RC1', target: 'SE7', strength: 2 },
  { source: 'RC1', target: 'SE8', strength: 2 },
  { source: 'RC1', target: 'SE9', strength: 2 },
  { source: 'RC1', target: 'SE10', strength: 2 },
  { source: 'RC1', target: 'GOV1', strength: 3 },
  { source: 'RC1', target: 'SE3', strength: 2 },
  { source: 'SE7', target: 'SE10', strength: 2 },
  { source: 'RC2', target: 'ENV2', strength: 2 },
  { source: 'RC2', target: 'ENV4', strength: 2 },
  { source: 'RC2', target: 'GOV1', strength: 3 },
  { source: 'RC2', target: 'SE8', strength: 2 },
  { source: 'RC3', target: 'GOV2', strength: 3 },
  { source: 'RC3', target: 'ENV3', strength: 2 },
  { source: 'RC3', target: 'SE2', strength: 1 },
  { source: 'RC4', target: 'SE3', strength: 3 },
  { source: 'RC4', target: 'SE4', strength: 3 },
  { source: 'RC4', target: 'SE5', strength: 2 },
  { source: 'ENV2', target: 'ST2', strength: 2 },
  { source: 'ENV2', target: 'ST1', strength: 2 },
  { source: 'ENV3', target: 'ENV4', strength: 2 },
  { source: 'ENV3', target: 'ENV6', strength: 3 },
  { source: 'ENV3', target: 'SE3', strength: 1 },
  { source: 'ENV5', target: 'ST1', strength: 3 },
  { source: 'ENV5', target: 'ENV6', strength: 3 },
  { source: 'ENV6', target: 'PE1', strength: 2 },
  { source: 'SE4', target: 'SE5', strength: 3 },
  { source: 'SE6', target: 'ST1', strength: 3 },
  { source: 'SE6', target: 'SE4', strength: 2 },
  { source: 'GOV2', target: 'ENV3', strength: 3 },
  { source: 'GOV2', target: 'ENV6', strength: 2 },
  { source: 'ST2', target: 'ENV2', strength: 2 },
  { source: 'ST4', target: 'SE3', strength: 2 },
  { source: 'ST4', target: 'GOV2', strength: 2 },
  { source: 'PE1', target: 'PT4', strength: 2 },
  { source: 'PE2', target: 'PT4', strength: 2 },
  { source: 'PH2', target: 'PP3', strength: 2 },
  { source: 'PH1', target: 'PP3', strength: 1 },
  { source: 'PH3', target: 'PT4', strength: 2 },
  { source: 'PP1', target: 'PP2', strength: 3 },
  { source: 'PP2', target: 'SE1', strength: 2 },
  { source: 'PP3', target: 'GOV1', strength: 2 },
  { source: 'PT2', target: 'PT3', strength: 2 },
  { source: 'PT3', target: 'PT4', strength: 2 },
  { source: 'ST5', target: 'PP3', strength: 2 },
  { source: 'ST1', target: 'PH2', strength: 3 },
  { source: 'ST1', target: 'PH3', strength: 2 },
  // Plastic PPW (Kariyawasam et al.), residents tourism impacts (Madawala), tourism demand base
  { source: 'PT1', target: 'PT2', strength: 2 },
  { source: 'PT1', target: 'ENV1', strength: 2 },
  { source: 'PT1', target: 'SE9', strength: 2 },
  { source: 'PT1', target: 'ST3', strength: 2 },
  { source: 'PT1', target: 'ST2', strength: 2 },
  { source: 'ENV1', target: 'ST2', strength: 2 },
  { source: 'ENV1', target: 'ST1', strength: 2 },
  { source: 'ENV1', target: 'ST3', strength: 2 },
  { source: 'ENV1', target: 'ST4', strength: 2 },
  { source: 'ST3', target: 'SE7', strength: 3 },
  { source: 'ST3', target: 'SE8', strength: 2 },
  { source: 'RC1', target: 'ST3', strength: 2 },
  { source: 'ST3', target: 'PP3', strength: 1 },
]

export function nodeRadius(category) {
  if (category === 'Root Cause') return 18
  if (category === 'Stakeholder') return 12
  return 14
}

/** Darken a hex color by mixing toward black (~20%). */
export function darkenHex(hex, amount = 0.2) {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  const r = Math.round(((n >> 16) & 255) * (1 - amount))
  const g = Math.round(((n >> 8) & 255) * (1 - amount))
  const b = Math.round((n & 255) * (1 - amount))
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}

export const swotData = {
  strengths: {
    title: 'S — Strengths',
    icon: '⚡',
    color: '#166534',
    items: [
      'Golden Mile coastal location',
      'Colonial architectural heritage',
      'High literacy rate (95-97%)',
      'Strong tourism infrastructure base',
      'Generational fishing knowledge',
      'Biodiverse nearshore reef ecosystem',
      'Multicultural diverse community',
      'Long-standing artisanal fishing heritage, including Madela beach seine',
    ],
  },
  weaknesses: {
    title: 'W — Weaknesses',
    icon: '⚠️',
    color: '#991b1b',
    items: [
      'No spatial zoning framework',
      'Inadequate fisheries infrastructure',
      'Sewage and waste systems failure',
      'Institutional governance gaps',
      'Kadawatha rock navigational hazard',
      'No formal working coast designation',
      'Loss of coastal views and aesthetics',
      'Privatization of public facilities under tourism pressure',
      'Weak neighbourhood social connections and isolation',
    ],
  },
  opportunities: {
    title: 'O — Opportunities',
    icon: '🎯',
    color: '#1e3a8a',
    items: [
      'CZ&CRMP 2024-2029 legal framework',
      'Events & business tourism pivot (MICE: meetings, conferences, exhibitions)',
      'Heritage and cultural tourism development',
      'Reef conservation and dive tourism',
      'Working coast zoning implementation',
      'Decentralized multi-stakeholder governance',
      'Community-led environmental monitoring',
      'Sustainable fishing economy',
    ],
  },
  threats: {
    title: 'T — Threats',
    icon: '🔥',
    color: '#78350f',
    items: [
      'Accelerating coastal erosion',
      'Chemical and waste pollution events',
      'Continued forced displacement',
      'Narcotics epidemic growth',
      'Real estate speculation pressure',
      'Climate change and sea level rise',
      'Fuel cost volatility',
    ],
  },
}

export const pestelData = {
  Political: {
    color: '#4c1d95',
    icon: '🏛️',
    points: [
      'UDA forced clearances without consultation',
      'Coastal projects approved without full environmental impact studies (legal shortcuts, e.g. Section 14)',
      '2018 Organic Law strengthening local governance',
      'Fragmented jurisdiction: UDA, CCD, municipal overlap',
      'Tourism-first political agenda marginalizing fisherfolk',
    ],
  },
  Economic: {
    color: '#b45309',
    icon: '💰',
    points: [
      'Colombo district: 11,398 registered tourist rooms with massive demand',
      'Fuel crisis: 60% of fishing operational costs',
      'Real estate speculation inflating local housing costs',
      'Privatization of public facilities reducing community access',
      'Middlemen exploitation of informal fish market',
      'Debt traps from high-interest loans during crises',
      'Service sector growth vs informal economy marginalization',
    ],
  },
  Social: {
    color: '#c4a574',
    icon: '👥',
    points: [
      'Identity mismatch: tourism vs residential vs working coast',
      'Tourism-based development impacting residential neighbourhood character',
      'Weak neighbourhood social ties producing stressed, isolated communities',
      'Narcotics epidemic: 38% meth, 32% heroin usage',
      '33% unemployment in Badowita relocation camp',
      '81% Dengue fever rate in displaced settlements',
      'Multicultural community with 95-97% literacy rate',
      'Generational conflict between old and new land uses',
    ],
  },
  Technological: {
    color: '#0c4a6e',
    icon: '🔬',
    points: [
      'Digital monitoring potential for reef health and coastal data',
      'Sustainable fishing technology to reduce fuel dependency',
      'GIS-based coastal zone management tools',
      'Drone surveillance for illegal waste dumping',
      'Smart tourism platforms for niche market access',
    ],
  },
  Environmental: {
    color: '#14532d',
    icon: '🌊',
    points: [
      '3.8 tons of plastic waste leaking into ocean daily',
      'FC levels exceeding 150 MPN/100ml safe bathing standard',
      'Ship chemical and plastic spills harming coastal waters (e.g. MV X-Press Pearl cargo ship, 2021)',
      'Nearshore reef ecosystems under severe threat (e.g. Paragala and Demadagala)',
      'Sand starvation from inland river mining causing erosion, shrinking beaches, and habitat loss',
      'Mismanaged beach nourishment and hard coastal works harming reefs and drainage (e.g. Rs. 890M project)',
    ],
  },
  Legal: {
    color: '#44403c',
    icon: '⚖️',
    points: [
      'CZ&CRMP 2024-2029: new sustainable coastal management plan',
      'Coastal projects approved without full environmental impact studies (legal shortcuts, e.g. Section 14)',
      'Required environmental reviews are often skipped for coastal works',
      'Organic Law 2018: decentralized municipal authority',
      'No formal working coast or fishery protection legislation',
      'Urban Development Authority Act enabling forced clearances',
    ],
  },
}

export const sfaData = [
  {
    intervention: 'Working Coast Zoning',
    description: 'Legally demarcate fishery zones with buffers from hotels and residences',
    suitability: 9,
    feasibility: 6,
    acceptability: 7,
    priority: 'High',
  },
  {
    intervention: 'Sustainable Tourism Pivot',
    description:
      'Shift from mass beach tourism (3S: sun, sea, sand) to events tourism (MICE: meetings, conferences), heritage, and niche markets',
    suitability: 8,
    feasibility: 7,
    acceptability: 8,
    priority: 'High',
  },
  {
    intervention: 'Reef Conservation Program',
    description: 'Legal protection of nearshore reefs (e.g. Paragala/Demadagala) with dive tourism integration',
    suitability: 9,
    feasibility: 6,
    acceptability: 7,
    priority: 'High',
  },
  {
    intervention: 'Community Governance Model',
    description: 'Multi-stakeholder board: hoteliers, fisherfolk, residents, NGOs',
    suitability: 8,
    feasibility: 7,
    acceptability: 6,
    priority: 'Medium',
  },
  {
    intervention: 'Fishery Infrastructure Upgrade',
    description: 'Sanitary auction center, fresh water access, Kadawatha rock clearance',
    suitability: 9,
    feasibility: 7,
    acceptability: 9,
    priority: 'High',
  },
  {
    intervention: 'Heritage Tourism Circuit',
    description:
      'Develop Arab Fort, Pupput ruins, and long-standing fishing heritage (including Madela) as cultural assets',
    suitability: 7,
    feasibility: 8,
    acceptability: 8,
    priority: 'Medium',
  },
]

export function scoreColor(score) {
  if (score >= 8) return '#86efac'
  if (score >= 5) return '#fcd34d'
  return '#f87171'
}
