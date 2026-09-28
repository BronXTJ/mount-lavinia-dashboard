import { describe, expect, it } from 'vitest'
import scopesDoc from '../public/data/network-form/marshall/marshall_scopes.json'
import {
  formatStoredPercent,
  marshallChartPoints,
  marshallTableRows,
  matrixPoint,
} from '../src/utils/marshallMorphologyFormat.js'

const metrics = scopesDoc.scopes[0]

describe('marshallMorphologyFormat', () => {
  it('reads the published Mount Lavinia matrix point without recomputing ratios', () => {
    const point = matrixPoint(metrics)
    expect(point).toEqual({
      x: metrics.matrix.x_ratio,
      y: metrics.matrix.y_cell_ratio,
    })
    expect(point.x).toBe(metrics.ratios.X_ratio)
    expect(point.y).toBe(metrics.ratios.Cell_ratio)
    expect(metrics.matrix.quadrant).toBeUndefined()
  })

  it('formats stored percents and table rows from the published file', () => {
    expect(formatStoredPercent(metrics.ratios.T_ratio)).toBe('89%')
    expect(formatStoredPercent(metrics.ratios.X_ratio)).toBe('11%')
    expect(formatStoredPercent(metrics.ratios.Cell_ratio)).toBe('24%')
    expect(formatStoredPercent(metrics.ratios.Cul_ratio)).toBe('76%')
    expect(formatStoredPercent(null)).toBe('—')

    const rows = marshallTableRows(metrics)
    expect(rows.map((r) => r.value)).toEqual(['108', '13', '65', '21', '89%', '11%', '76%', '24%'])
    expect(metrics.counts.n_T + metrics.counts.n_X).toBe(121)
    expect(metrics.ratios.T_ratio + metrics.ratios.X_ratio).toBeCloseTo(1, 12)
    expect(metrics.ratios.Cell_ratio + metrics.ratios.Cul_ratio).toBeCloseTo(1, 12)
  })

  it('plots one stored point per GN and keeps Mount Lavinia on its published coordinates', () => {
    const points = marshallChartPoints(scopesDoc.scopes)
    expect(points.map((point) => point.name)).toEqual([
      'Mount Lavinia',
      'Kawdana West',
      'Watarappala',
      'Wathumulla',
      'Wedikanda',
    ])
    expect(points[0]).toEqual({
      name: 'Mount Lavinia',
      x: metrics.matrix.x_ratio,
      y: metrics.matrix.y_cell_ratio,
    })
    expect(marshallChartPoints([{ gn_name: 'Empty', ratios: {}, matrix: {} }])).toEqual([])
    expect(scopesDoc.study_area.counts.n_T).toBe(376)
    expect(scopesDoc.uncertainty.junctions).toBe(3)
    expect(scopesDoc.uncertainty.cells).toBe(1)
    expect(scopesDoc.uncertainty.cul_de_sacs).toBe(2)
    expect(scopesDoc.uncertainty.excluded_cases).toHaveLength(6)
  })

  it('returns null when metrics are missing', () => {
    expect(matrixPoint(null)).toBeNull()
    expect(marshallTableRows({})).toBeNull()
  })
})
