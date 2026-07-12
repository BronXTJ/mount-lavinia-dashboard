/** Chart-specific MetricInfoButton copy for Environmental Analysis. */

export const ENV_INFO = {
  utci: {
    title: 'UTCI — Universal Thermal Climate Index',
    ariaLabel: 'What is UTCI?',
    points: [
      'UTCI estimates how the outdoor climate feels on the human body, in °C.',
      'It combines air temperature, humidity, wind, and radiation, not air temperature alone.',
      'Values here are modelled for Mount Lavinia (10 m grid), not live weather from a phone app.',
      'Higher UTCI = more heat stress for people outdoors.',
    ],
  },
  uhi: {
    title: 'Urban Heat Island Intensity',
    ariaLabel: 'What is UHI intensity?',
    points: [
      'UHI intensity is how much warmer (or cooler) each cell is versus a rural background temperature.',
      'Positive values mean the urban cell is warmer than the rural reference.',
      'Buildings, roads, and sparse shade usually raise UHI; vegetation and open water can lower it.',
    ],
  },
  airTemp: {
    title: 'Air Temperature',
    ariaLabel: 'What is modelled air temperature?',
    points: [
      'Modelled near-surface air temperature for each 10 m cell (°C).',
      'Useful for comparing local pockets of hot and cool air within the study area.',
    ],
  },
  tmrt: {
    title: 'Mean Radiant Temperature (Tmrt)',
    ariaLabel: 'What is mean radiant temperature?',
    points: [
      'Tmrt reflects heat from sun and surfaces (walls, ground, roofs) felt by a person outdoors.',
      'High Tmrt often drives uncomfortable UTCI even when air temperature looks moderate.',
    ],
  },
  svf: {
    title: 'Sky View Factor (SVF)',
    ariaLabel: 'What is Sky View Factor?',
    points: [
      'SVF measures how much open sky you can see from a point (0 = fully enclosed, 1 = fully open).',
      'Sample points show street-level openness. Enclosed canyons trap heat differently than open squares.',
    ],
  },
  shadow: {
    title: 'Shadow Exposure',
    ariaLabel: 'What is shadow exposure?',
    points: [
      'Shadow exposure is the fraction of modelled daylight hours when a 10 m cell is in shadow (0 = always sunlit, 1 = always shaded).',
      'Values come from a solar shadow model for 5 July 2026, 07:00–18:00 LST, not live cloud cover.',
      'Highly shaded cells (>75%) are the share of the grid in shadow for most of those hours; highly sunlit cells (<25%) are mostly in sun.',
      'The stacked bar shows sunlit, moderate, and shaded shares across all cells.',
      'This complements SVF: SVF is sky openness at sample points; shadow is time in shade across the full grid.',
    ],
  },
  modeledVsLive: {
    title: 'Modelled Analysis vs Live Weather',
    ariaLabel: 'How does this differ from live weather?',
    points: [
      'This page shows a modelled thermal comfort / UHI analysis for the Mount Lavinia study area.',
      'Live temperature on the Overview tab comes from Open-Meteo for a clicked map point.',
      'Use this tab for spatial patterns and planning; use live weather for “what is it like right now”.',
    ],
  },
  utciGauge: {
    title: 'How to Read the UTCI Gauge',
    ariaLabel: 'About the UTCI comfort gauge',
    points: [
      'The centre number is the mean modelled UTCI across the analysis grid, in °C.',
      'The arc fills from a cooler reference (~26 °C) toward extreme heat (~48 °C).',
      'Min and max below the gauge show the coolest and hottest cells in the study area.',
      'This is a spatial model average, not today’s live weather.',
    ],
  },
  shadowGauge: {
    title: 'How to Read the Shadow Gauge',
    ariaLabel: 'About the shadow exposure gauge',
    points: [
      'The centre number is the mean share of modelled daylight hours spent in shadow across the grid.',
      '0% = always sunlit during 07:00–18:00 LST; 100% = always shaded in the model.',
      'Above the gauge, Highly shaded (>75%) and Highly sunlit (<25%) show what share of cells sit at those extremes.',
      'Use the map shadow layer or hourly chart to see how exposure changes through the day.',
    ],
  },
  shadowHourly: {
    title: 'How to Read the Hourly Shadow Chart',
    ariaLabel: 'About the hourly shadow line chart',
    points: [
      'Each point is the area-wide mean shadow fraction at that hour (07:00–18:00 LST).',
      'A higher line means more of the 10 m grid is in building or terrain shadow at that time.',
      'This is one modelled clear-sky day, not live cloud cover or today’s weather.',
      'Compare with UTCI/Tmrt: less shadow around midday can raise radiant heat even when air temp is similar.',
    ],
  },
  stressDonut: {
    title: 'How to Read Heat Stress Classes',
    ariaLabel: 'About the stress-class donut',
    points: [
      'Each slice is the share of 10 m cells in a model heat-stress class (utci_class), not the continuous UTCI °C on the map.',
      'Class 4 — Strong heat stress ≈ 32–38 °C UTCI on the standard assessment scale.',
      'Class 5 — Very strong heat stress ≈ 38–46 °C UTCI.',
      'This study’s grid only shows classes 4 and 5; cooler or no-stress classes are absent because modelled UTCI is already in the heat range.',
      'Use the donut for how widespread severe stress is; use the map or gauge for exact °C.',
    ],
  },
  utciUhiScatter: {
    title: 'How to Read UTCI vs UHI',
    ariaLabel: 'About the UTCI–UHI scatter plot',
    points: [
      'Each dot is a sampled 10 m cell: horizontal = UTCI (°C), vertical = UHI intensity (°C).',
      'Dots higher up are warmer than the rural background; farther right feel hotter for people.',
      'Dashed lines mark mean UTCI and mean UHI for the whole grid.',
      'Only a sample of cells is drawn so the chart stays fast. Patterns still represent the area.',
    ],
  },
  driverRadar: {
    title: 'How to Read the Driver Radar',
    ariaLabel: 'About the microclimate driver radar',
    points: [
      'Each spoke is one microclimate driver (UTCI, UHI, air, radiant heat, wind, sky view, shadow).',
      'Distance from the centre is a relative score (0–1) so different units can share one shape.',
      'Hover a spoke to see the real mean value with its proper unit (°C or openness).',
      'A larger “blob” toward heat axes means a harsher outdoor climate signature overall.',
    ],
  },
  svfStack: {
    title: 'How to Read the SVF Stacked Bar',
    ariaLabel: 'About the SVF openness bar',
    points: [
      'Sample streetscape: Mount Lavinia Junction → along Galle Road → supermarket & bus stand (and nearby surroundings) — not every street in the study area.',
      'The full bar is 100% of those SVF sample points.',
      'Coloured segments show how many points are very enclosed → very open.',
      'More “open” sky can mean more sun exposure. More “enclosed” often means canyon shading. Both matter for comfort.',
      'Turning on SVF Sample Points on the map zooms to this corridor automatically.',
    ],
  },
}
