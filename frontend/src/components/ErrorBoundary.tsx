import React from 'react'

export class ErrorBoundary extends React.Component<{ children: React.ReactNode, name: string }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: React.ReactNode, name: string }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`Error caught by ErrorBoundary in ${this.props.name}:`, error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl">
          <h3 className="font-bold mb-2">{this.props.name} failed to load</h3>
          <p className="text-sm font-mono whitespace-pre-wrap">{this.state.error?.message}</p>
        </div>
      )
    }

    return this.props.children
  }
}
