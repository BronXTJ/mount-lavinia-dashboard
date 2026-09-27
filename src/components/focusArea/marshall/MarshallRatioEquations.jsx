function StackedFraction({ numerator, denominator }) {
  return (
    <span className="mx-0.5 inline-flex min-w-[2.2em] flex-col items-stretch align-middle text-center leading-none">
      <span className="px-1 pb-0.5">{numerator}</span>
      <span className="border-t border-current" aria-hidden />
      <span className="px-1 pt-0.5">{denominator}</span>
    </span>
  )
}

function RatioEquation({ label, numerator, denominator }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span>{label}</span>
      <span aria-hidden>=</span>
      <StackedFraction numerator={numerator} denominator={denominator} />
    </span>
  )
}

export function MarshallJunctionEquations() {
  return (
    <span className="inline-flex flex-wrap items-center gap-x-5 gap-y-2 font-serif text-[1.05em] tracking-wide">
      <RatioEquation label="T-ratio" numerator={<var>T</var>} denominator={<span><var>T</var> + <var>X</var></span>} />
      <RatioEquation label="X-ratio" numerator={<var>X</var>} denominator={<span><var>T</var> + <var>X</var></span>} />
    </span>
  )
}

export function MarshallStructureEquations() {
  return (
    <span className="inline-flex flex-wrap items-center gap-x-5 gap-y-2 font-serif text-[1.05em] tracking-wide">
      <RatioEquation
        label="Cell-ratio"
        numerator="Cells"
        denominator={<span>Cells + Culs</span>}
      />
      <RatioEquation
        label="Cul-ratio"
        numerator="Culs"
        denominator={<span>Cells + Culs</span>}
      />
    </span>
  )
}
