/** ⓘ copy for What-if Compare — definition, unit, caveat. */

export const COMPARE_HEADING_INFO = [
  'Columns are Baseline and each Ready option. Values are change versus the published network unless stated otherwise.',
  'Nearby is existing segments within 500 m of that option’s drawn links, at the selected analysis radius.',
  'Print / PDF is a one-page pack. CSV includes shared and unique Top 5 closeness streets, which are not shown in this rail.',
]

export const COMPARE_SCALE_INFO = [
  'Nearby closeness max Δ at 500 m, 2 km, 3 km, and 5 km.',
  'Unit: the same closeness Δ as Nearby closeness Δ. The filled dot is the selected radius.',
  'Nearby remains a 500 m buffer around the drawing; the dots are analysis radii, not buffer sizes.',
]

export const COMPARE_CLOSENESS_NEARBY_INFO = [
  'Largest closeness change on existing streets within 500 m of the drawing, versus Baseline.',
  'Unit: closeness Δ (NQPDA) at the selected radius.',
  'Layout connectivity only — not travel time or destinations. Baseline is 0.',
]

export const COMPARE_EFFICIENCY_INFO = [
  'Nearby closeness max Δ divided by each 100 m of drawn length.',
  'Unit: closeness Δ per 100 m.',
  'A dash means no length or no nearby Δ. Not construction cost or effort.',
]

export const COMPARE_BETWEENNESS_NEARBY_INFO = [
  'Largest betweenness change on existing streets within 500 m of the drawing, versus Baseline.',
  'Unit: betweenness Δ (BtA) at the selected radius.',
  'Layout role only — not vehicle counts. Negative means those streets lost through-route role.',
]

export const COMPARE_STREETS_CLOSENESS_INFO = [
  'Existing streets within 500 m of the drawing, ranked by closeness Δ versus Baseline.',
  'Unit: signed closeness Δ. Rank 1 is the largest gain or loss.',
  'Duplicate names append the segment id. Click a name to highlight it on the map.',
]

export const COMPARE_STREETS_THROUGH_INFO = [
  'Existing streets within 500 m of the drawing, ranked by betweenness Δ versus Baseline.',
  'Unit: signed betweenness Δ. Rank 1 is the largest gain or loss.',
  'Duplicate names append the segment id. Click a name to highlight it on the map.',
]

export const COMPARE_LINKS_INFO = [
  'Count of finished proposed links and their total drawn length.',
  'Unit: count · metres.',
  'Several links in one option still count as one option.',
]

export const COMPARE_N_CHANGED_NEARBY_INFO = [
  'Existing streets within 500 m of the drawing with a closeness change versus Baseline.',
  'Unit: segment count.',
  'Network appendix counts can include small shifts far from the sketch.',
]

export const COMPARE_NETWORK_DETAIL_INFO = [
  'Whole-study-network closeness and betweenness at the selected radius.',
  'Units: segment count and signed Δ (max / min).',
  'Can include small changes far from the sketch. Use nearby rows for the local effect.',
]

export const COMPARE_SHARED_INFO = [
  'Shared: Top 5 nearby closeness gainers in more than one option. Unique: in only one.',
  'Unit: street identity plus signed closeness Δ.',
  'Exported in CSV only.',
]
