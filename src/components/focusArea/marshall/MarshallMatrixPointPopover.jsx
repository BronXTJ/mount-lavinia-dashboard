import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import MarshallMatrixPointCard from './MarshallMatrixPointCard.jsx'

const VIEWPORT_PAD = 8
const ANCHOR_GAP = 12

function computePosition(anchor, width, height) {
  const vw = window.innerWidth
  const vh = window.innerHeight
  let left = anchor.x + ANCHOR_GAP
  let top = anchor.y + ANCHOR_GAP
  if (left + width > vw - VIEWPORT_PAD) {
    left = anchor.x - width - ANCHOR_GAP
  }
  if (top + height > vh - VIEWPORT_PAD) {
    top = anchor.y - height - ANCHOR_GAP
  }
  left = Math.max(VIEWPORT_PAD, Math.min(left, vw - width - VIEWPORT_PAD))
  top = Math.max(VIEWPORT_PAD, Math.min(top, vh - height - VIEWPORT_PAD))
  return { left, top }
}

export default function MarshallMatrixPointPopover({ anchor, metrics, onClose }) {
  const popupRef = useRef(null)
  const [position, setPosition] = useState(null)

  useLayoutEffect(() => {
    if (!anchor || !metrics) {
      setPosition(null)
      return undefined
    }
    function update() {
      const el = popupRef.current
      if (!el) return
      const { left, top } = computePosition(anchor, el.offsetWidth, el.offsetHeight)
      setPosition({ left, top })
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [anchor, metrics])

  if (!anchor || !metrics) return null

  return createPortal(
    <div
      ref={popupRef}
      className="fixed z-[2100]"
      style={{
        left: position?.left ?? -9999,
        top: position?.top ?? -9999,
        visibility: position ? 'visible' : 'hidden',
      }}
      onClick={(event) => event.stopPropagation()}
    >
      <MarshallMatrixPointCard metrics={metrics} onClose={onClose} />
    </div>,
    document.body,
  )
}
