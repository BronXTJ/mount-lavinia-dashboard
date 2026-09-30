import { describe, expect, it } from 'vitest'
import scopesDoc from '../public/data/network-form/marshall/marshall_scopes.json'
import {
  formatStoredPercent,
  marshallChartPoints,
  marshallMatrixDomainMax,
  marshallMatrixTicks,
  marshallPlotCoord,
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
    expect(formatStoredPercent(metrics.ratios.T_ratio)).toBe('93%')
    expect(formatStoredPercent(metrics.ratios.X_ratio)).toBe('7%')
    expect(formatStoredPercent(metrics.ratios.Cell_ratio)).toBe('25%')
    expect(formatStoredPercent(metrics.ratios.Cul_ratio)).toBe('75%')
    expect(formatStoredPercent(null)).toBe('—')

    const rows = marshallTableRows(metrics)
    expect(rows.map((r) => r.value)).toEqual(['115', '9', '63', '21', '93%', '7%', '75%', '25%'])
    expect(metrics.counts.n_T + metrics.counts.n_X).toBe(124)
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
    expect(scopesDoc.study_area.counts.n_T).toBe(404)
    expect(scopesDoc.uncertainty.junctions).toBe(0)
    expect(scopesDoc.uncertainty.cells).toBe(1)
    expect(scopesDoc.uncertainty.cul_de_sacs).toBe(0)
    expect(scopesDoc.uncertainty.excluded_cases).toHaveLength(1)
    for (const row of scopesDoc.uncertainty.excluded_cases) {
      expect(row).toMatchObject({
        kind: expect.any(String),
        id: expect.any(String),
        primary_id: expect.any(String),
        lat: expect.any(Number),
        lng: expect.any(Number),
      })
      expect(row.lat).toBeGreaterThan(6)
      expect(row.lat).toBeLessThan(7)
      expect(row.lng).toBeGreaterThan(79)
      expect(row.lng).toBeLessThan(80)
    }
  })

  it('returns null when metrics are missing', () => {
    expect(matrixPoint(null)).toBeNull()
    expect(marshallTableRows({})).toBeNull()
  })

  it('maps plot coords for compact 0.5 domain vs full 1 domain', () => {
    expect(marshallPlotCoord(0.1, 0.5)).toBe(0.2)
    expect(marshallPlotCoord(0.1, 1)).toBe(0.1)
    expect(marshallMatrixDomainMax('compact')).toBe(0.5)
    expect(marshallMatrixDomainMax('expanded')).toBe(1)
    expect(marshallMatrixTicks(0.5)).toEqual([0, 0.1, 0.2, 0.3, 0.4, 0.5])
    expect(marshallMatrixTicks(1)).toEqual([0, 0.25, 0.5, 0.75, 1])
  })
})
