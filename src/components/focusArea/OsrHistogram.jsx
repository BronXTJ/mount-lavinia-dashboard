import MetricHistogram from './MetricHistogram.jsx'

/** @deprecated Prefer MetricHistogram with title/barColor props. */
export default function OsrHistogram({ data }) {
  return (
    <MetricHistogram title="OSR Value Distribution" data={data} barColor="#e879f9" />
  )
}
