/** MetricInfoButton copy for the Synthesis tab. */

export const SYNTHESIS_INFO = {
  page: {
    title: 'Synthesis — Integrated Findings',
    ariaLabel: 'About Synthesis',
    points: [
      'This page connects findings from Environmental, Density, Centrality, Maturation, Walk Accessibility, Network Form, Land Cover, Movement, and Issues into one story.',
      'Each finding has an observation, interpretation, and implication, with links back to the maps.',
      'Shannon = how balanced the land-use mix is; UMI (Urban Maturation Index) = how “complete” a place feels (mix + access + diversity).',
      'Key argument steps set the reading order; use All findings in the header for the full list (F, WA, NF, LC, MB).',
    ],
  },
  spine: {
    title: 'Key Argument',
    ariaLabel: 'About the key argument steps',
    points: [
      'Seven steps in order: land-use mix (Shannon) and maturation (UMI), accessibility lag, corridors, canopy loss, heat, identity, coupled response.',
      'Previous / Next move along this path; selecting a step opens that finding.',
    ],
  },
  graph: {
    title: 'Relationships',
    ariaLabel: 'About the relationships graph',
    points: [
      'Nodes are synthesis findings (F, WA, NF, LC, MB), not Issues categories.',
      'Amplifies: one finding makes another stronger or more severe.',
      'Co-located: findings share the same place or corridor on the maps.',
      'Mitigates: one finding softens or counters another.',
      'Caused by: one finding is a driver or underlying reason for another.',
      'Domain filters dim unrelated nodes; Reset view fits all nodes in view.',
      'Use the enlarge icon (next to Reset view) for a full-screen graph — same pattern as the analysis maps.',
    ],
  },
  index: {
    title: 'All Findings',
    ariaLabel: 'About all findings',
    points: [
      'Open All findings in the header chip row for the full claim list.',
      'Selecting a row updates the detail panel, Relationships highlight, and URL (?f=F14).',
    ],
  },
}
