import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          height: '100vh', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          background: 'var(--bg-primary)', 
          color: 'var(--text-primary)',
          padding: '20px',
          textAlign: 'center'
        }}>
          <h1 className="text-gradient" style={{ fontSize: '3rem', marginBottom: '20px' }}>Oops!</h1>
          <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', maxWidth: '500px', marginBottom: '30px' }}>
            Something went wrong in the application. We've logged the error and our team will look into it.
          </p>
          <button 
            className="btn btn-primary" 
            onClick={() => window.location.href = '/'}
            style={{ padding: '12px 30px' }}
          >
            Restart Application
          </button>
          {process.env.NODE_ENV !== 'production' && (
            <pre style={{ 
              marginTop: '40px', 
              padding: '20px', 
              background: 'rgba(255,0,0,0.1)', 
              borderRadius: '8px', 
              textAlign: 'left',
              maxWidth: '80%',
              overflow: 'auto',
              fontSize: '0.8rem',
              color: 'var(--danger)'
            }}>
              {this.state.error?.toString()}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
