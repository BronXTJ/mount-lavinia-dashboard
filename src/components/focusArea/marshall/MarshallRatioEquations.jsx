function StackedFraction({ numerator, denominator }) {
  return (
    <span className="inline-flex shrink-0 flex-col items-stretch text-center leading-none">
      <span className="whitespace-nowrap px-0.5 pb-px">{numerator}</span>
      <span className="border-t border-current" aria-hidden />
      <span className="whitespace-nowrap px-0.5 pt-px">{denominator}</span>
    </span>
  )
}

function RatioEquation({ label, numerator, denominator }) {
  return (
    <span className="flex min-w-0 flex-nowrap items-center justify-center gap-0.5 rounded-md border border-surface-600 bg-surface-900/40 px-1 py-1.5 text-center text-[10px] leading-tight">
      <span className="shrink-0 whitespace-nowrap">{label}</span>
      <span className="shrink-0" aria-hidden>=</span>
      <StackedFraction numerator={numerator} denominator={denominator} />
    </span>
  )
}

function EquationRow({ children }) {
  return (
    <span className="grid grid-cols-2 gap-1 font-serif text-[10px] leading-tight tracking-normal">
      {children}
    </span>
  )
}

export function MarshallJunctionEquations() {
  return (
    <EquationRow>
      <RatioEquation
        label="T-ratio"
        numerator={<var>T</var>}
        denominator={
          <span className="whitespace-nowrap">
            <var>T</var>&nbsp;+&nbsp;<var>X</var>
          </span>
        }
      />
      <RatioEquation
        label="X-ratio"
        numerator={<var>X</var>}
        denominator={
          <span className="whitespace-nowrap">
            <var>T</var>&nbsp;+&nbsp;<var>X</var>
          </span>
        }
      />
    </EquationRow>
  )
}

export function MarshallStructureEquations() {
  return (
    <EquationRow>
      <RatioEquation
        label="Cell-ratio"
        numerator="Cells"
        denominator={<span className="whitespace-nowrap">Cells&nbsp;+&nbsp;Culs</span>}
      />
      <RatioEquation
        label="Cul-ratio"
        numerator="Culs"
        denominator={<span className="whitespace-nowrap">Cells&nbsp;+&nbsp;Culs</span>}
      />
    </EquationRow>
  )
}
