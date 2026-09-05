/** Shared MetricInfoButton copy for Centrality What-if mode. */

export const BASELINE_VS_WHAT_IF_INFO = [
  'Baseline is the published street network as it is now — no new street.',
  'What-If lets you draw a proposed street and see how the layout would change.',
  'If the worker chip is offline, use the Command Prompt steps on the status card. Then click Connect if Chrome asks to allow the local network.',
  'Without the worker, ▶ downloads a file of your drawn lines instead of running the analysis.',
  'Change rankings need a finished analysis job — drawing alone will not fill the side cards.',
  'Side panels show scenario state, whether the worker is live, and how many streets changed when a scenario is active.',
  'Tips appear above the map toolbar while you draw — dismiss any tip or hide all tips for the session.',
]

export const WHAT_IF_CLOSENESS_INFO = [
  'Closeness Change is how much easier streets become to reach through the layout, versus Baseline.',
  'This is street geometry, not traffic or walking time (sometimes labelled NQPDA).',
  'Rankings fill only after a local analysis job finishes; drawing alone does not fill these cards.',
  'If the worker is offline, use the Command Prompt steps on the status card, then click Connect. Finish a link or press ▶.',
]

export const WHAT_IF_BETWEENNESS_INFO = [
  'Betweenness Change is how much stronger a street’s through-route role becomes, versus Baseline.',
  'This is street geometry, not vehicle counts (sometimes labelled BtA).',
  'Rankings fill only after a local analysis job finishes; drawing alone does not fill these cards.',
  'If the worker is offline, use the Command Prompt steps on the status card, then click Connect. Finish a link or press ▶.',
]

export function whatIfGainersInfo(_metricCode, label) {
  return [
    'These existing streets improved the most versus Baseline — easier to reach, or a stronger through-route in the layout.',
    `A higher number means a bigger gain at the distance you selected (${label}).`,
    'Click a row to highlight it on the map. Click it again, or the ×, to clear.',
    'Lists need a finished analysis job — use the Command Prompt steps if the worker is offline, then finish a link or press ▶.',
  ]
}

export function whatIfLosersInfo(_metricCode, label) {
  return [
    'These existing streets declined the most versus Baseline — harder to reach, or a weaker through-route in the layout.',
    `A lower number means a bigger loss at the distance you selected (${label}).`,
    'Click a row to highlight it on the map. Click it again, or the ×, to clear.',
    'Lists need a finished analysis job — use the Command Prompt steps if the worker is offline, then finish a link or press ▶.',
  ]
}

export function whatIfNearbyInfo(_metricCode, label) {
  return [
    'These are existing streets within 500 m of your drawing that changed the most versus Baseline.',
    'This is the local picture around the sketch — not the whole-network Top Gainers / Top Losers, which can be far away.',
    `Distance is shown after the street name. Green went up; red went down (${label}).`,
    'Click a row to highlight it on the map. Click it again, or the ×, to clear.',
  ]
}

export const WHAT_IF_TOOLBAR_INFO = [
  'Pencil / Eraser: click to turn on; click the same icon again to go back to pan. Choosing another tool turns the previous one off.',
  'Pencil: click magenta snap nodes to draw. Finish with double-click, ✓, Enter, or Esc (when you have 2+ points) — that runs the analysis if the worker is online.',
  'Esc with 1 point clears the draft; Esc with no draft (or in Erase) returns to pan.',
  'Pending links are dashed until analysis finishes — dark on Streets basemap, light on Dark Matter — then they match the closeness or through-route colours.',
  'SNAP: stick to network nodes. FREE: place vertices exactly where you click.',
  'Magenta snap nodes stay on the analysis road network while Snap Nodes is enabled in layers.',
  'Eraser: turn on, then click one drawn link to delete only that link (not all).',
  'Undo / Redo: toolbar or Ctrl+Z / Ctrl+Y.',
  '▶ runs the local analysis when the worker is online; without the worker it downloads your drawn lines as a file.',
  'If the worker chip is offline, use the Command Prompt steps on the status card, then click Connect.',
  'Tips appear above this toolbar while you draw — dismiss any tip or hide all tips for the session.',
]
