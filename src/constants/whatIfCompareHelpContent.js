/** ⓘ copy for What-if Compare — technical labels on the table, plain language here. */

export const COMPARE_HEADING_INFO = [
  'Each column is one proposed idea versus today (no new street) on the published angular sDNA network.',
  'Metrics are closeness (NQPDA) and betweenness (BtA) from the local worker. All options share the same radius chip (500 m–5 km).',
  'This is exploratory network geometry — not traffic counts, travel time, or walking to shops.',
  'The table appears only when two or more options are Ready. Nearby rows use streets within 500 m of that option’s drawing.',
  'Click a gainer/loser id to highlight that street on the map. The map colours follow the selected card.',
]

export const COMPARE_SCALE_INFO = [
  'All three options use the same analysis radius. Switching a chip reloads layers already computed by sDNA — it does not draw again or start new jobs.',
  '500 m is walking scale; 2000 m neighbourhood; 3000 m district; 5000 m regional.',
  'A local shortcut can look strong at 500 m and fade at 5 km. A connector into the corridor can do the opposite.',
]

export const COMPARE_CLOSENESS_NEARBY_INFO = [
  'Closeness change (NQPDA) nearby is the largest positive Δ in angular closeness among existing streets within 500 m of that option’s proposed links, versus the published baseline, at the active radius.',
  'Higher Δ means nearby streets became easier to reach through the street layout. It is not walking time or access to shops.',
  'Click the strongest-gainer row to see the street. Change the radius chips to read another scale.',
]

export const COMPARE_BETWEENNESS_NEARBY_INFO = [
  'Betweenness change (BtA) nearby is the largest positive Δ in angular betweenness among existing streets within 500 m of that option’s proposed links, versus baseline, at the active radius.',
  'Higher Δ means nearby streets gained a stronger through-route role in the network. It is not vehicle counts.',
  'A negative strongest-loser Δ means those streets lost through-route role after the idea.',
]

export const COMPARE_GAINER_INFO = [
  'Strongest gainer (nearby) is the existing street within 500 m of the drawing with the largest positive Δ for that metric.',
  'Click the id to fly to it on the map. Names appear when a named-road match exists.',
  '“Gained” is layout centrality, not measured traffic.',
]

export const COMPARE_LOSER_INFO = [
  'Strongest loser (nearby) is the existing street within 500 m of the drawing with the largest negative Δ for that metric.',
  'A new link can weaken another street’s closeness or through-route role. Click the id to inspect it.',
  'This is still NQPDA / BtA versus baseline, not traffic.',
]

export const COMPARE_LINKS_INFO = [
  'Links drawn is how many finished proposed polylines belong to that idea. Length is the summed geometry in metres.',
  'Several links in default What-if stay one Option A. Option B is a different idea, not extra streets on A.',
]

export const COMPARE_N_CHANGED_NEARBY_INFO = [
  'n changed (nearby) is how many existing streets within 500 m of that option’s drawing have a non-zero Δ at the active radius.',
  'Use this for the local ground story. Whole-network n changed (More detail) can include tiny shifts far from the sketch.',
]

export const COMPARE_NETWORK_DETAIL_INFO = [
  'Whole-network n changed, Max Δ, and Min Δ come from the sDNA summary for the active radius across the study network.',
  'These can include small changes far from your drawing. Prefer Nearby rows for the local story.',
]
