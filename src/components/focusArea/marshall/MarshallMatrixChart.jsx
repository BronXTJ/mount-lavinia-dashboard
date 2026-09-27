import { marshallDataUrl } from '../../../constants/marshallMorphology.js'

/**
 * Stored Marshall matrix figure. The study-area total is not a point.
 * @param {{ size?: 'compact' | 'expanded' }} props
 */
export default function MarshallMatrixChart({ size = 'compact' }) {
  const expanded = size === 'expanded'
  return (
    <div data-testid="marshall-matrix" className={expanded ? 'w-full' : 'min-h-0 w-full flex-1'}>
      <img
        src={marshallDataUrl('marshall_matrix_gn.svg')}
        alt="Marshall matrix. Horizontal axis X-ratio, vertical axis Cell-ratio, five GN divisions."
        className={expanded ? 'mx-auto w-full bg-white' : 'h-auto max-h-full w-full bg-white'}
        data-testid="marshall-matrix-figure"
      />
    </div>
  )
}
