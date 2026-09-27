function StackedFraction({ numerator, denominator }) {
  return (
    <span className="inline-flex min-w-[2.2em] shrink flex-col items-stretch text-center leading-none">
      <span className="px-1 pb-0.5">{numerator}</span>
      <span className="border-t border-current" aria-hidden />
      <span className="px-1 pt-0.5">{denominator}</span>
    </span>
  )
}

function RatioEquation({ label, numerator, denominator }) {
  return (
    <span className="flex flex-nowrap items-center justify-center gap-1.5 rounded-md border border-surface-600 bg-surface-900/40 px-1.5 py-2 text-center">
      <span className="shrink-0 whitespace-nowrap">{label}</span>
      <span className="shrink-0" aria-hidden>=</span>
      <StackedFraction numerator={numerator} denominator={denominator} />
    </span>
  )
}

function EquationRow({ children }) {
  return (
    <span className="grid grid-cols-2 gap-2 font-serif text-[0.95em] tracking-wide">
      {children}
    </span>
  )
}

export function MarshallJunctionEquations() {
  return (
    <EquationRow>
      <RatioEquation label="T-ratio" numerator={<var>T</var>} denominator={<span><var>T</var> + <var>X</var></span>} />
      <RatioEquation label="X-ratio" numerator={<var>X</var>} denominator={<span><var>T</var> + <var>X</var></span>} />
    </EquationRow>
  )
}

export function MarshallStructureEquations() {
  return (
    <EquationRow>
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
    </EquationRow>
  )
}
