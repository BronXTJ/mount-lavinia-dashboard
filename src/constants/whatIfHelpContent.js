/** Shared MetricInfoButton copy for Centrality What-if mode. */

export const BASELINE_VS_WHAT_IF_INFO = [
  'Baseline shows the published sDNA closeness / betweenness network.',
  'What-if lets you draw proposed links and recompute centrality with a local sDNA worker.',
  'Start npm run what-if:worker on this Windows PC, then open the GitHub Pages dashboard and finish a link or press ▶.',
  'If the worker chip stays offline, click Connect and Allow local network in Chrome.',
  'Without the worker, ▶ downloads proposed_links.geojson instead of running sDNA.',
  'Δ rankings need a finished sDNA job — drawing alone will not fill the side cards.',
  'Side panels show a status card with scenario state, worker online (pulsing dot when live), and changed segment count when a scenario is active.',
  'Contextual tips appear above the map toolbar while you draw — dismiss any tip or hide all tips for the session.',
]

export const WHAT_IF_CLOSENESS_INFO = [
  'Closeness Change is scenario minus published baseline in angular closeness (NQPDA) — exploratory network geometry, not traffic or accessibility counts.',
  'Δ rankings and KPIs fill only after a local sDNA job finishes; drawing alone does not populate these cards.',
  'Start npm run what-if:worker on this Windows PC, then finish a link or press ▶. Click Connect if Chrome asks to Allow local network.',
  'The status card above shows scenario state and whether the worker is online (pulsing dot when live).',
]

export const WHAT_IF_BETWEENNESS_INFO = [
  'Betweenness Change is scenario minus published baseline in angular betweenness (BtA) — exploratory network geometry, not traffic or accessibility counts.',
  'Δ rankings and KPIs fill only after a local sDNA job finishes; drawing alone does not populate these cards.',
  'Start npm run what-if:worker on this Windows PC, then finish a link or press ▶. Click Connect if Chrome asks to Allow local network.',
  'The status card above shows scenario state and whether the worker is online (pulsing dot when live).',
]

export function whatIfGainersInfo(metricCode, label) {
  return [
    `Top Gainers are road segments with the largest positive Δ in ${label} (${metricCode}) after your proposed links vs the published baseline.`,
    'A higher Δ means that segment became more central (easier to reach / stronger through-route role) at the active scale.',
    'Click a row to highlight it on the map. Click it again, or the ×, to clear.',
    'Lists need a finished sDNA job — start npm run what-if:worker and finish a link or press ▶.',
  ]
}

export function whatIfLosersInfo(metricCode, label) {
  return [
    `Top Losers are road segments with the largest negative Δ in ${label} (${metricCode}) after your proposed links vs the published baseline.`,
    'A lower Δ means that segment became less central (less reachable / weaker through-route role) at the active scale.',
    'Click a row to highlight it on the map. Click it again, or the ×, to clear.',
    'Lists need a finished sDNA job — start npm run what-if:worker and finish a link or press ▶.',
  ]
}

export function whatIfNearbyInfo(metricCode, label) {
  return [
    `Nearby 500m lists existing road segments within 500 m of your proposed links, with the largest |Δ| in ${label} (${metricCode}).`,
    'This is local context around the sketch — not the whole-network Top Gainers / Top Losers, which can be far away.',
    'Distance is shown after the segment id. Green Δ went up; red Δ went down.',
    'Click a row to highlight it on the map. Click it again, or the ×, to clear.',
  ]
}

export const WHAT_IF_TOOLBAR_INFO = [
  'Pencil / Eraser: click to activate; click the same icon again to deselect (back to pan). Choosing another tool quits the previous one.',
  'Pencil: click magenta snap nodes to draw. Finish with double-click, ✓, Enter, or Esc (when you have 2+ points) — that runs sDNA if the worker is online.',
  'Esc with 1 point clears the draft; Esc with no draft (or in Erase) returns to pan.',
  'Pending links are dashed until sDNA finishes — dark (#0f172a) on Streets basemap, light on Dark Matter — then they match the active closeness/betweenness ramp.',
  'SNAP: stick to network nodes. FREE: place vertices exactly where you click.',
  'Magenta snap nodes stay on the analysis road network while Snap Nodes is enabled in layers.',
  'Eraser: activate, then click one drawn link to delete only that link (not all).',
  'Undo / Redo: toolbar or Ctrl+Z / Ctrl+Y.',
  '▶ runs local sDNA when npm run what-if:worker is online; without the worker it downloads proposed_links.geojson.',
  'GitHub Pages talks to the local worker after you click Connect and Allow local network in Chrome.',
  'Contextual tips appear above this toolbar while you draw — dismiss any tip or hide all tips for the session.',
]
