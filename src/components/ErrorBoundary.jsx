import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Dashboard error boundary', error, info)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-6 text-center text-surface-200">
        <p className="text-sm font-semibold text-rose-300">This view hit an unexpected error.</p>
        <p className="max-w-md text-xs text-surface-400">
          The rest of the dashboard is still available. Reload this page, or open another tab from the
          sidebar.
        </p>
        <button
          type="button"
          className="rounded border border-surface-500 px-3 py-1 text-xs text-surface-100 hover:bg-surface-700"
          onClick={() => this.setState({ error: null })}
        >
          Try again
        </button>
      </div>
    )
  }
}
