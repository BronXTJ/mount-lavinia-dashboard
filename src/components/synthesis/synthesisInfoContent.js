/** MetricInfoButton copy for the Synthesis tab. */

export const SYNTHESIS_INFO = {
  page: {
    title: 'Synthesis — Integrated Findings',
    ariaLabel: 'About Synthesis',
    points: [
      'This page connects findings from Environmental, Density, Centrality, Maturation, and Issues into one story.',
      'Each finding has an observation, interpretation, and implication, with links back to the maps.',
      'Shannon = how balanced the land-use mix is; UMI (Urban Maturation Index) = how “complete” a place feels (mix + access + diversity).',
      'Key argument steps (1–6) set the reading order; use All findings in the header for the full list.',
    ],
  },
  spine: {
    title: 'Key Argument',
    ariaLabel: 'About the key argument steps',
    points: [
      'Six steps in order: land-use mix (Shannon) and maturation (UMI), accessibility lag, corridors, heat, identity, coupled response.',
      'Previous / Next move along this path; selecting a step opens that finding.',
    ],
  },
  graph: {
    title: 'Relationships',
    ariaLabel: 'About the relationships graph',
    points: [
      'Nodes are synthesis findings (F1…), not Issues categories.',
      'Amplifies: one finding makes another stronger or more severe.',
      'Co-located: findings share the same place or corridor on the maps.',
      'Mitigates: one finding softens or counters another.',
      'Caused by: one finding is a driver or underlying reason for another.',
      'Domain filters dim unrelated nodes; Reset view fits all nodes in view.',
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
