import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { APP_CONFIG } from '../../config';
import './LoginPage.css';

function getBrowserTelemetry() {
  return {
    browserLanguage: navigator.language || '',
    browserTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
  };
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter your email and password');
      return;
    }

    setLoading(true);
    try {
      const telemetry = getBrowserTelemetry();
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, ...telemetry }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      await login(data.session);
      navigate('/dashboard');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="logo">{APP_CONFIG.name}</div>
        <div className="subtitle">Sign in to your account</div>
        <div className="auth-card">
          {error && <div className="form-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                placeholder="you@company.com"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                placeholder="Enter your password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%' }}
              disabled={!email || !password || loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="auth-footer">
            Don't have an account? <Link to="/signup">Sign up</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
