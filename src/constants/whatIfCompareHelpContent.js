/** ⓘ copy for What-if Compare — everyday meaning first; technical names as an aside. */

export const COMPARE_HEADING_INFO = [
  'Read the table from the top: nearby metrics, then the scale strip, then street lists. Numbers sit in columns for Baseline, A, B, and C.',
  'Baseline is the published street network — no new street. A, B, and C are change from Baseline, not standalone scores.',
  'Nearby means existing streets within 500 m of that idea’s drawing. Broader network numbers sit under More Detail.',
  'This is how the street layout connects — not traffic, travel time, or shops.',
  'Click a street name to highlight it on the map. When a Ready idea is selected, green means up versus Baseline and red means down.',
  'Print / PDF is a one-page pack: date, distance, option names, and this table. CSV is the data file.',
]

export const COMPARE_SCALE_INFO = [
  'This strip shows how nearby closeness changes at 500 m, 2 km, 3 km, and 5 km — so you do not have to click every distance chip.',
  'A local shortcut often looks strong at 500 m and fades at 5 km. A longer connector can do the opposite.',
  'Nearby still means streets within 500 m of the drawing. The four dots are analysis distances. Switching a chip still updates the map and table together.',
]

export const COMPARE_CLOSENESS_NEARBY_INFO = [
  'This is the biggest nearby gain in how easy streets are to reach through the layout, versus Baseline.',
  'Nearby means existing streets within 500 m of that idea’s drawing, at the distance chip you selected.',
  'This is layout, not walking time or access to shops. The bar is relative to the other Ready ideas. Baseline is 0 — nothing new has been added.',
]

export const COMPARE_EFFICIENCY_INFO = [
  'This divides the biggest nearby closeness gain by each 100 m of new street you drew.',
  'A short connector and a long corridor can then be compared fairly.',
  'This is layout only — not traffic, travel time, or construction cost. A dash means there is no length or no nearby gain.',
]

export const COMPARE_BETWEENNESS_NEARBY_INFO = [
  'This is the biggest nearby gain in through-route role — how often streets sit on paths between other places — versus Baseline.',
  'Nearby means existing streets within 500 m of that idea’s drawing, at the distance chip you selected.',
  'This is layout, not vehicle counts. A negative number means those streets lost through-route role after the idea.',
]

export const COMPARE_STREETS_CLOSENESS_INFO = [
  'Rank 1 is the biggest nearby gain or loss in how easy streets are to reach, versus Baseline.',
  'Nearby means existing streets within 500 m of that idea’s drawing. Green is gained; red is lost.',
  'Same name plus a number means two pieces of that street. Click a name to highlight it on the map. This is layout, not traffic.',
]

export const COMPARE_STREETS_THROUGH_INFO = [
  'Rank 1 is the biggest nearby gain or loss in through-route role — how often a street sits on paths between other places — versus Baseline.',
  'Nearby means existing streets within 500 m of that idea’s drawing. Green is gained; red is lost.',
  'Same name plus a number means two pieces of that street. Click a name to highlight it on the map. This is layout, not vehicle counts.',
]

export const COMPARE_LINKS_INFO = [
  'New links is how many finished lines belong to that idea. Length is their total drawn distance.',
  'Several links in one idea still count as one option. Option B is a different idea, not extra streets on A.',
]

export const COMPARE_N_CHANGED_NEARBY_INFO = [
  'How many existing streets within 500 m of that idea’s drawing changed versus Baseline.',
  'Use this for the local picture. Whole-network counts under More Detail can include tiny shifts far from the sketch.',
]

export const COMPARE_NETWORK_DETAIL_INFO = [
  'These numbers cover the whole study network at the selected distance — not only streets near your drawing.',
  'They can include small changes far from the sketch. Use the nearby rows for the local effect.',
]

export const COMPARE_SHARED_INFO = [
  'Shared streets appear in more than one idea’s Top 5 nearby closeness gains. Unique streets appear in only one.',
  'A shared name can look like a win for every idea. Unique streets show that idea’s own local effect — not the same corridor twice.',
  'Click a name to highlight it on the map.',
]
