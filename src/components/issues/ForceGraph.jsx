import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import {
  categoryColors,
  darkenHex,
  edges as edgeData,
  nodeRadius,
  nodes as nodeData,
} from './issuesData.js'

const ZOOM_MIN = 0.3
const ZOOM_MAX = 3
const FIT_PAD = 48

function fitToNodes(svg, zoom, nodes, width, height, { animate = true } = {}) {
  const placed = nodes.filter((d) => Number.isFinite(d.x) && Number.isFinite(d.y))
  if (!placed.length || !width || !height) return

  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const d of placed) {
    const r = nodeRadius(d.category) + 8
    minX = Math.min(minX, d.x - r)
    maxX = Math.max(maxX, d.x + r)
    minY = Math.min(minY, d.y - r)
    maxY = Math.max(maxY, d.y + r + 14)
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
 * D3 force-directed graph for Issues & Potentials network.
 * Supports zoom/pan, drag, click, hover tooltip, search highlight, category filter.
 * Default / Reset View fits all nodes into the pane.
 */
export default function ForceGraph({
  selectedId,
  onSelect,
  searchQuery,
  hiddenCategories,
  resetToken,
}) {
  const containerRef = useRef(null)
  const svgRef = useRef(null)
  const tooltipRef = useRef(null)
  const simRef = useRef(null)
  const zoomRef = useRef(null)
  const nodesRef = useRef([])
  const linksRef = useRef([])
  const zoomKRef = useRef(1)
  const fitRef = useRef(null)
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  useEffect(() => {
    const container = containerRef.current
    const svgEl = svgRef.current
    if (!container || !svgEl) return undefined

    let width = container.clientWidth || 600
    let height = container.clientHeight || 500
    let fittedOnce = false
    let resizeTimer = null

    const nodes = nodeData.map((d) => ({ ...d }))
    const links = edgeData.map((d) => ({ ...d }))
    nodesRef.current = nodes
    linksRef.current = links

    const svg = d3.select(svgEl)
    svg.selectAll('*').remove()
    svg.attr('width', width).attr('height', height).attr('viewBox', `0 0 ${width} ${height}`)

    const defs = svg.append('defs')
    const vignette = defs
      .append('radialGradient')
      .attr('id', 'graph-vignette')
      .attr('cx', '50%')
      .attr('cy', '45%')
      .attr('r', '65%')
    vignette.append('stop').attr('offset', '0%').attr('stop-color', '#1a2535').attr('stop-opacity', 0.15)
    vignette.append('stop').attr('offset', '100%').attr('stop-color', '#0f1923').attr('stop-opacity', 0.55)
    svg
      .append('rect')
      .attr('class', 'vignette')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'url(#graph-vignette)')
      .attr('pointer-events', 'none')

    const glow = defs
      .append('filter')
      .attr('id', 'node-glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%')
    glow.append('feGaussianBlur').attr('stdDeviation', '3.5').attr('result', 'coloredBlur')
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
      .attr('stroke', '#334155')
      .attr('stroke-width', (d) => d.strength * 0.8)
      .attr('stroke-opacity', (d) => 0.15 + d.strength * 0.15)

    const node = g
      .append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
      .call(
        d3
          .drag()
          .on('start', (event, d) => {
            if (!event.active) simRef.current?.alphaTarget(0.3).restart()
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
      .attr('r', (d) => nodeRadius(d.category) + 6)
      .attr('fill', 'none')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0)
      .attr('pointer-events', 'none')

    node
      .append('circle')
      .attr('class', 'node-fill')
      .attr('r', (d) => nodeRadius(d.category))
      .attr('fill', (d) => categoryColors[d.category] ?? '#94a3b8')
      .attr('stroke', (d) => darkenHex(categoryColors[d.category] ?? '#94a3b8', 0.2))
      .attr('stroke-width', 3)

    node
      .append('text')
      .attr('class', 'node-label')
      .attr('text-anchor', 'middle')
      .attr('dy', (d) => nodeRadius(d.category) + 12)
      .attr('fill', '#ffffff')
      .attr('font-size', '10px')
      .attr('font-family', 'Inter, system-ui, sans-serif')
      .attr('pointer-events', 'none')
      .style('opacity', 0.85)
      .text((d) => (d.label.length > 22 ? `${d.label.slice(0, 20)}…` : d.label))

    const tooltip = d3.select(tooltipRef.current)

    node
      .on('mouseenter', (event, d) => {
        const color = categoryColors[d.category] ?? '#94a3b8'
        tooltip
          .style('opacity', 1)
          .style('left', `${event.offsetX + 12}px`)
          .style('top', `${event.offsetY + 12}px`)
          .html(
            `<div class="flex items-center gap-2"><span class="h-2 w-2 shrink-0 rounded-full" style="background:${color}"></span><span class="font-semibold text-surface-50">${d.label}</span></div><div class="mt-0.5 pl-4 text-[11px] text-surface-200">${d.category}</div>`,
          )
      })
      .on('mousemove', (event) => {
        tooltip.style('left', `${event.offsetX + 12}px`).style('top', `${event.offsetY + 12}px`)
      })
      .on('mouseleave', () => {
        tooltip.style('opacity', 0)
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
          .distance(70)
          .strength((d) => 0.2 + (d.strength ?? 1) * 0.15),
      )
      .force('charge', d3.forceManyBody().strength(-180))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force(
        'collide',
        d3.forceCollide().radius((d) => nodeRadius(d.category) + 6),
      )

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
        zoomKRef.current = event.transform.k
        g.selectAll('.node-label').style('opacity', event.transform.k < 0.45 ? 0 : 0.85)
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
      simulation.alpha(0.25).restart()
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
    simRef.current?.alpha(0.5).restart()
    const t = window.setTimeout(() => {
      fitRef.current?.(true)
    }, 350)
    return () => window.clearTimeout(t)
  }, [resetToken])

  useEffect(() => {
    const svg = d3.select(svgRef.current)
    if (!svg.node()) return

    const q = (searchQuery ?? '').trim().toLowerCase()
    const hidden = hiddenCategories ?? new Set()

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
      const catHidden = hidden.has(d.category)
      const matchesSearch =
        !q || d.label.toLowerCase().includes(q) || d.category.toLowerCase().includes(q)
      const isSelected = selectedId === d.id
      const isConnected = connected.has(d.id)

      let opacity = 1
      if (catHidden) opacity = 0.08
      else if (q && !matchesSearch) opacity = 0.15
      else if (selectedId && !isConnected) opacity = 0.22

      el.style('opacity', opacity)
      el.select('.node-fill')
        .attr('stroke-width', isSelected ? 4 : 3)
        .attr('stroke', isSelected ? '#ffffff' : darkenHex(categoryColors[d.category] ?? '#94a3b8', 0.2))
        .attr('filter', isSelected ? 'url(#node-glow)' : null)
      el.select('.glow-ring')
        .attr('stroke-opacity', isSelected ? 0.85 : 0)
        .attr('class', isSelected ? 'glow-ring issues-node-pulse' : 'glow-ring')
    })

    svg.selectAll('.links line').each(function (d) {
      const s = typeof d.source === 'object' ? d.source.id : d.source
      const t = typeof d.target === 'object' ? d.target.id : d.target
      const sNode = nodesRef.current.find((n) => n.id === s)
      const tNode = nodesRef.current.find((n) => n.id === t)
      const catHidden =
        (sNode && hidden.has(sNode.category)) || (tNode && hidden.has(tNode.category))
      const isLinkConnected = selectedId && connected.has(s) && connected.has(t)
      let opacity = 0.15 + (d.strength ?? 1) * 0.15
      let stroke = '#334155'
      let width = (d.strength ?? 1) * 0.8
      if (catHidden) opacity = 0.04
      else if (selectedId && !isLinkConnected) opacity = 0.05
      else if (isLinkConnected) {
        opacity = 0.75
        stroke = '#94a3b8'
        width = (d.strength ?? 1) * 1.4
      }
      d3.select(this)
        .attr('stroke', stroke)
        .attr('stroke-opacity', opacity)
        .attr('stroke-width', width)
    })
  }, [selectedId, searchQuery, hiddenCategories])

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-surface-900/40">
      <svg ref={svgRef} className="h-full w-full touch-none" />
      <div
        ref={tooltipRef}
        className="pointer-events-none absolute z-20 rounded-lg border border-surface-700/80 bg-surface-900/90 px-2.5 py-1.5 text-xs shadow-lg backdrop-blur-[8px] opacity-0 transition-opacity"
      />
      <p className="pointer-events-none absolute bottom-2 right-2 z-10 rounded-md border border-surface-700/60 bg-surface-900/70 px-2 py-1 text-[10px] text-surface-400 backdrop-blur-[8px]">
        Drag · scroll to zoom · click a node
      </p>
    </div>
  )
}
