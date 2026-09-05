/**
 * Plain-language guides for Issues & Potentials “i” modals.
 * Written for non-technical readers — framing only, not new analysis facts.
 */

export const ISSUES_INFO = {
  page: {
    title: 'What Is Issues & Potentials?',
    ariaLabel: 'About Issues & Potentials',
    points: [
      'This page explains the main challenges and opportunities for Mount Lavinia’s coast and community.',
      'It uses four simple views: a connection map, a SWOT board, a PESTEL context scan, and an SFA scorecard for planning ideas.',
      'You do not need planning jargon—open any teal “i” for a short guide to that section.',
      'The maps, lists, and scores show our study findings; the “i” buttons only help you read them.',
    ],
  },

  network: {
    title: 'What Is the Network Overview?',
    ariaLabel: 'About Network Overview',
    points: [
      'This map shows how problems, opportunities, and people connect—not a ranked “worst to best” list.',
      'Each coloured circle is one idea (a root cause, an issue, a potential, or a stakeholder).',
      'Lines between circles mean those ideas are linked in the study.',
      'Use the coloured category buttons to hide or show groups and focus on what matters to you.',
    ],
  },

  networkInteract: {
    title: 'How to Explore the Map',
    ariaLabel: 'How to explore the network graph',
    points: [
      'Click a circle to open a short explanation and see what it connects to.',
      'Drag circles to rearrange; scroll to zoom in or out; drag empty space to pan.',
      'Type in Search to highlight matching circles and fade the others.',
      'Use Reset View to fit all nodes back into the pane.',
      'Use the enlarge icon (next to Reset View) for a full-screen graph — same pattern as the analysis maps.',
    ],
  },

  swot: {
    title: 'What Is SWOT?',
    ariaLabel: 'About SWOT Analysis',
    points: [
      'SWOT is a simple board with four boxes: Strengths, Weaknesses, Opportunities, and Threats.',
      'Strengths and Weaknesses are mostly about Mount Lavinia itself (what it already has or lacks).',
      'Opportunities and Threats are mostly outside pressures or openings for action.',
      'Reading all four together helps you see trade-offs before choosing planning responses.',
    ],
  },

  swotStrengths: {
    title: 'Strengths',
    ariaLabel: 'About SWOT Strengths',
    points: [
      'Things Mount Lavinia already has that can help positive change.',
      'Examples: location, heritage, skills, community resources, and natural assets.',
      'Planners often build new ideas on top of these strengths.',
    ],
  },

  swotWeaknesses: {
    title: 'Weaknesses',
    ariaLabel: 'About SWOT Weaknesses',
    points: [
      'Gaps or problems inside the place that make life harder or block progress.',
      'Examples: missing infrastructure, weak zoning, or governance shortfalls.',
      'These point to what needs fixing or protecting first.',
    ],
  },

  swotOpportunities: {
    title: 'Opportunities',
    ariaLabel: 'About SWOT Opportunities',
    points: [
      'Openings for better planning, livelihoods, or conservation.',
      'Examples: new plans, tourism shifts, reef protection, or working together across groups.',
      'These suggest where effort can create useful change.',
    ],
  },

  swotThreats: {
    title: 'Threats',
    ariaLabel: 'About SWOT Threats',
    points: [
      'Risks that can make conditions worse if ignored.',
      'Examples: erosion, pollution, displacement, speculation, or climate stress.',
      'Threats show where protection or careful timing is needed.',
    ],
  },

  pestel: {
    title: 'What Is PESTEL?',
    ariaLabel: 'About PESTEL Framework',
    points: [
      'PESTEL looks at six “big picture” lenses: Political, Economic, Social, Technological, Environmental, and Legal.',
      'It places local issues inside wider forces that planning must work with.',
      'Each box lists key points for that lens—open the “i” on a box for what that lens means.',
    ],
  },

  pestelPolitical: {
    title: 'Political',
    ariaLabel: 'About Political (PESTEL)',
    points: [
      'Who has power, and how decisions about the coast get made.',
      'Includes clearances, special approvals, and overlapping agencies.',
      'Also includes chances for stronger local or shared decision-making.',
    ],
  },

  pestelEconomic: {
    title: 'Economic',
    ariaLabel: 'About Economic (PESTEL)',
    points: [
      'Money, jobs, and costs—tourism, fishing, housing, and debt pressures.',
      'Shows who may gain or lose under different development paths.',
      'Helps weigh whether an idea is affordable and fair for livelihoods.',
    ],
  },

  pestelSocial: {
    title: 'Social',
    ariaLabel: 'About Social (PESTEL)',
    points: [
      'People, identity, health, safety, and how groups live side by side.',
      'Covers tensions between tourism, residents, and working coast communities.',
      'Also notes community strengths such as literacy and diversity.',
    ],
  },

  pestelTechnological: {
    title: 'Technological',
    ariaLabel: 'About Technological (PESTEL)',
    points: [
      'Tools that can help monitor the coast, support fishing, or improve tourism.',
      'Examples: maps/GIS, digital monitoring, drones, and smarter tourism platforms.',
      'Technology helps—but it does not replace good rules and fair planning.',
    ],
  },

  pestelEnvironmental: {
    title: 'Environmental',
    ariaLabel: 'About Environmental (PESTEL)',
    points: [
      'The condition of beach, sea, reefs, and pollution risks.',
      'Links ecological damage to tourism, fishing, and public health.',
      'Supports nature-based and protective responses as well as built projects.',
    ],
  },

  pestelLegal: {
    title: 'Legal',
    ariaLabel: 'About Legal (PESTEL)',
    points: [
      'Laws and plans that allow or block action on the coast.',
      'Includes coastal management plans, environmental assessment rules, and development powers.',
      'Shows where legal protection exists—and where it is missing.',
    ],
  },

  sfa: {
    title: 'What is SFA?',
    ariaLabel: 'About SFA Assessment',
    points: [
      'SFA is a simple scorecard for planning ideas: Suitability, Feasibility, and Acceptability — each scored from 1 to 10.',
      'This section ranks intervention ideas so you can compare what fits, what can be delivered, and what people may accept.',
      'Use the prioritisation graph for a quick view, then the SFA Scores table for the detailed numbers.',
      'Scores are study labels for discussion — not a final decision.',
    ],
  },

  sfaScores: {
    title: 'SFA Scores',
    ariaLabel: 'About SFA scoring',
    points: [
      'Each planning idea is scored from 1 to 10 on three questions. 1 = weak / hard / unlikely; 10 = strong / realistic / widely supported.',
      'Suitability — Does this idea fit the problem we are trying to solve?',
      'Feasibility — Can it realistically be done (money, capacity, institutions)?',
      'Acceptability — Will the people affected be likely to support or accept it?',
      'Avg is a simple average of the three scores to compare ideas at a glance. Priority High/Medium is a study label for discussion—not a final decision.',
    ],
  },

  sfaMatrix: {
    title: 'How to Read the Prioritisation Graph',
    ariaLabel: 'About the prioritisation matrix',
    points: [
      'Left–right (X) is Feasibility; up–down (Y) is Acceptability. Bigger bubbles mean higher Suitability.',
      'The dashed lines at 7 split the graph into four action zones.',
      'Implement Now (top-right): easier to do and more accepted—good candidates to start with.',
      'Build Consensus (top-left): people may support it, but delivery is harder—build capacity first.',
      'Overcome Resistance (bottom-right): doable, but support is weaker—address concerns.',
      'Long-term Planning (bottom-left): harder and less accepted now—plan for later phases.',
      'Crimson bubbles = High priority; yellow = Medium. Click a bubble, legend item, or table row to highlight the same idea.',
    ],
  },
}
