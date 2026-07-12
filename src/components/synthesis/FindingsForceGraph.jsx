import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import {
  DOMAIN_META,
  EDGE_TYPE_META,
  SYNTHESIS_ACCENT,
  findingEdges,
  findings,
} from './findingsData.js'

const ZOOM_MIN = 0.35
const ZOOM_MAX = 2.5
const FIT_PAD = 48

function primaryDomain(domains) {
  return domains?.[0] ?? 'thermal'
}

function nodeColor(d) {
  return DOMAIN_META[primaryDomain(d.domains)]?.color ?? SYNTHESIS_ACCENT
}

function fitToNodes(svg, zoom, nodes, width, height, { animate = true } = {}) {
  const placed = nodes.filter((d) => Number.isFinite(d.x) && Number.isFinite(d.y))
  if (!placed.length || !width || !height) return

  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const d of placed) {
    minX = Math.min(minX, d.x)
    maxX = Math.max(maxX, d.x)
    minY = Math.min(minY, d.y)
    maxY = Math.max(maxY, d.y)
  }

  const bw = Math.max(maxX - minX, 40)
  const bh = Math.max(maxY - minY, 40)
  const scale = Math.max(
    ZOOM_MIN,
    Math.min(ZOOM_MAX, 0.92 / Math.max(bw / (width - FIT_PAD * 2), bh / (height - FIT_PAD * 2))),
  )
  const midX = (minX + maxX) / 2
  const midY = (minY + maxY) / 2
  const transform = d3.zoomIdentity
    .translate(width / 2, height / 2)
    .scale(scale)
    .translate(-midX, -midY)

  const sel = animate ? svg.transition().duration(400) : svg
  sel.call(zoom.transform, transform)
}

/**
 * D3 force graph of synthesis findings (claims), not Issues nodes.
 */
export default function FindingsForceGraph({ selectedId, onSelect, resetToken, activeDomains }) {
  const containerRef = useRef(null)
  const svgRef = useRef(null)
  const tooltipRef = useRef(null)
  const simRef = useRef(null)
  const zoomRef = useRef(null)
  const nodesRef = useRef([])
  const linksRef = useRef([])
  const fitRef = useRef(null)
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  useEffect(() => {
    const container = containerRef.current
    const svgEl = svgRef.current
    if (!container || !svgEl) return undefined

    let width = container.clientWidth || 600
    let height = container.clientHeight || 420
    let fittedOnce = false
    let resizeTimer = null

    const nodes = findings.map((d) => ({ ...d }))
    const links = findingEdges.map((d) => ({ ...d }))
    nodesRef.current = nodes
    linksRef.current = links

    const svg = d3.select(svgEl)
    svg.selectAll('*').remove()
    svg.attr('width', width).attr('height', height).attr('viewBox', `0 0 ${width} ${height}`)

    const defs = svg.append('defs')
    const vignette = defs
      .append('radialGradient')
      .attr('id', 'synth-vignette')
      .attr('cx', '50%')
      .attr('cy', '45%')
      .attr('r', '65%')
    vignette.append('stop').attr('offset', '0%').attr('stop-color', '#1a2535').attr('stop-opacity', 0.12)
    vignette.append('stop').attr('offset', '100%').attr('stop-color', '#0f1923').attr('stop-opacity', 0.5)
    svg
      .append('rect')
      .attr('class', 'vignette')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'url(#synth-vignette)')
      .attr('pointer-events', 'none')

    const glow = defs
      .append('filter')
      .attr('id', 'synth-node-glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%')
    glow.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur')
    const merge = glow.append('feMerge')
    merge.append('feMergeNode').attr('in', 'coloredBlur')
    merge.append('feMergeNode').attr('in', 'SourceGraphic')

    const g = svg.append('g').attr('class', 'graph-root')

    const link = g
      .append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', (d) => EDGE_TYPE_META[d.type]?.color ?? '#475569')
      .attr('stroke-width', (d) => 1 + (d.strength ?? 1) * 0.6)
      .attr('stroke-opacity', 0.55)

    const node = g
      .append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('class', 'node')
      .attr('data-id', (d) => d.id)
      .style('cursor', 'pointer')
      .call(
        d3
          .drag()
          .on('start', (event, d) => {
            if (!event.active) simRef.current?.alphaTarget(0.25).restart()
            d.fx = d.x
            d.fy = d.y
          })
          .on('drag', (event, d) => {
            d.fx = event.x
            d.fy = event.y
          })
          .on('end', (event, d) => {
            if (!event.active) simRef.current?.alphaTarget(0)
            d.fx = null
            d.fy = null
          }),
      )

    node
      .append('circle')
      .attr('class', 'glow-ring')
      .attr('r', 18)
      .attr('fill', 'none')
      .attr('stroke', SYNTHESIS_ACCENT)
      .attr('stroke-width', 2.5)
      .attr('stroke-opacity', 0)
      .attr('pointer-events', 'none')

    node
      .append('circle')
      .attr('class', 'node-fill')
      .attr('r', 11)
      .attr('fill', (d) => nodeColor(d))
      .attr('stroke', '#0f172a')
      .attr('stroke-width', 2)

    node
      .append('text')
      .attr('class', 'node-id')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('fill', '#0f172a')
      .attr('font-size', '8px')
      .attr('font-weight', '700')
      .attr('pointer-events', 'none')
      .text((d) => d.id)

    node
      .append('text')
      .attr('class', 'node-label')
      .attr('text-anchor', 'middle')
      .attr('dy', 22)
      .attr('fill', '#e2e8f0')
      .attr('font-size', '9px')
      .attr('pointer-events', 'none')
      .style('opacity', 0.85)
      .text((d) => (d.label.length > 22 ? `${d.label.slice(0, 20)}…` : d.label))

    const tooltip = d3.select(tooltipRef.current)

    node
      .on('mouseenter', (event, d) => {
        const color = nodeColor(d)
        tooltip
          .style('opacity', 1)
          .style('left', `${event.offsetX + 12}px`)
          .style('top', `${event.offsetY + 12}px`)
          .html(
            `<div class="font-semibold text-surface-50">${d.id} · ${d.label}</div><div class="mt-0.5 text-[11px] text-surface-300">${(d.domains ?? []).join(' · ')}</div>`,
          )
        d3.select(event.currentTarget).select('.node-fill').attr('stroke', color)
      })
      .on('mousemove', (event) => {
        tooltip.style('left', `${event.offsetX + 12}px`).style('top', `${event.offsetY + 12}px`)
      })
      .on('mouseleave', (event) => {
        tooltip.style('opacity', 0)
        d3.select(event.currentTarget).select('.node-fill').attr('stroke', '#0f172a')
      })
      .on('click', (event, d) => {
        event.stopPropagation()
        onSelectRef.current?.(d.id)
      })

    svg.on('click', () => onSelectRef.current?.(null))

    const simulation = d3
      .forceSimulation(nodes)
      .force(
        'link',
        d3
          .forceLink(links)
          .id((d) => d.id)
          .distance(85)
          .strength(0.45),
      )
      .force('charge', d3.forceManyBody().strength(-220))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide().radius(28))

    simRef.current = simulation

    simulation.on('tick', () => {
      link
        .attr('x1', (d) => d.source.x)
        .attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x)
        .attr('y2', (d) => d.target.y)
      node.attr('transform', (d) => `translate(${d.x},${d.y})`)
    })

    const zoom = d3
      .zoom()
      .scaleExtent([ZOOM_MIN, ZOOM_MAX])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
        // Keep truncated labels visible at default fit zoom; hide only when very zoomed out
        g.selectAll('.node-label').style('opacity', event.transform.k < 0.55 ? 0 : 0.85)
      })

    zoomRef.current = zoom
    svg.call(zoom)

    function runFit(animate = true) {
      const w = container.clientWidth || width
      const h = container.clientHeight || height
      width = w
      height = h
      fitToNodes(svg, zoom, nodes, w, h, { animate })
    }

    fitRef.current = runFit

    simulation.on('end', () => {
      if (fittedOnce) return
      fittedOnce = true
      runFit(true)
    })

    // Fallback if simulation end is delayed
    const bootFit = window.setTimeout(() => {
      if (fittedOnce) return
      fittedOnce = true
      runFit(true)
    }, 700)

    const ro = new ResizeObserver(() => {
      const w = container.clientWidth
      const h = container.clientHeight
      if (!w || !h) return
      width = w
      height = h
      svg.attr('width', w).attr('height', h).attr('viewBox', `0 0 ${w} ${h}`)
      svg.select('rect.vignette').attr('width', w).attr('height', h)
      simulation.force('center', d3.forceCenter(w / 2, h / 2))
      simulation.alpha(0.2).restart()
      window.clearTimeout(resizeTimer)
      resizeTimer = window.setTimeout(() => runFit(false), 180)
    })
    ro.observe(container)

    return () => {
      window.clearTimeout(bootFit)
      window.clearTimeout(resizeTimer)
      ro.disconnect()
      simulation.stop()
      fitRef.current = null
      svg.on('.zoom', null)
      svg.selectAll('*').remove()
    }
  }, [])

  useEffect(() => {
    if (resetToken === 0) return
    simRef.current?.alpha(0.45).restart()
    const t = window.setTimeout(() => {
      fitRef.current?.(true)
    }, 350)
    return () => window.clearTimeout(t)
  }, [resetToken])

  useEffect(() => {
    const svg = d3.select(svgRef.current)
    if (!svg.node()) return

    const active = activeDomains ?? new Set()
    const filterOn = active.size > 0
    const connected = new Set()
    if (selectedId) {
      connected.add(selectedId)
      for (const e of linksRef.current) {
        const s = typeof e.source === 'object' ? e.source.id : e.source
        const t = typeof e.target === 'object' ? e.target.id : e.target
        if (s === selectedId) connected.add(t)
        if (t === selectedId) connected.add(s)
      }
    }

    svg.selectAll('.node').each(function (d) {
      const el = d3.select(this)
      const domainOk = !filterOn || (d.domains ?? []).some((dom) => active.has(dom))
      const isSel = d.id === selectedId
      const isConn = connected.has(d.id)
      const dim = selectedId && !isConn

      el.style('display', domainOk ? null : 'none')
      el.select('.glow-ring')
        .attr('stroke-opacity', isSel ? 0.95 : 0)
        .attr('filter', isSel ? 'url(#synth-node-glow)' : null)
      el.select('.node-fill').attr('opacity', dim ? 0.25 : 1)
      el.select('.node-id').attr('opacity', dim ? 0.25 : 1)
      el.select('.node-label').attr('opacity', dim ? 0.2 : null)
    })

    svg.selectAll('.links line').each(function (d) {
      const s = typeof d.source === 'object' ? d.source.id : d.source
      const t = typeof d.target === 'object' ? d.target.id : d.target
      const sNode = nodesRef.current.find((n) => n.id === s)
      const tNode = nodesRef.current.find((n) => n.id === t)
      const sOk = !filterOn || (sNode?.domains ?? []).some((dom) => active.has(dom))
      const tOk = !filterOn || (tNode?.domains ?? []).some((dom) => active.has(dom))
      const hide = !sOk || !tOk
      const linkActive = selectedId && (s === selectedId || t === selectedId)
      d3.select(this)
        .style('display', hide ? 'none' : null)
        .attr('stroke-opacity', selectedId ? (linkActive ? 0.9 : 0.12) : 0.55)
        .attr('stroke-width', linkActive ? 2.5 : 1 + (d.strength ?? 1) * 0.6)
    })
  }, [selectedId, activeDomains])

  return (
    <div ref={containerRef} className="relative h-full min-h-0 flex-1">
      <svg ref={svgRef} className="h-full w-full" />
      <div
        ref={tooltipRef}
        className="pointer-events-none absolute z-10 max-w-[220px] rounded-md border border-surface-700 bg-surface-900/95 px-2.5 py-1.5 text-xs opacity-0 shadow-card backdrop-blur"
      />
    </div>
  )
}
