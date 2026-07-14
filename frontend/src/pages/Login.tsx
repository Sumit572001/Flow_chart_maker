import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, LogIn, ArrowRight, FolderKanban } from 'lucide-react';

interface LoginProps {
  navigateTo: (page: any) => void;
}

const Login: React.FC<LoginProps> = ({ navigateTo }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all credentials');
      return;
    }

    setError(null);
    setSubmitting(true);
    const res = await login(email, password);
    setSubmitting(false);

    if (!res.success) {
      setError(res.error || 'Invalid email or password');
    } else {
      navigateTo('dashboard');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        {/* Title / Logo Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: 'white',
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-lg)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)'
            }}
          >
            <FolderKanban size={24} />
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
            Welcome Back
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Sign in to access your saved flowcharts
          </p>
        </div>

        {/* Error alert */}
        {error && (
          <div
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              color: 'var(--danger)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.75rem',
              fontSize: '0.8rem',
              marginBottom: '1.25rem',
              fontWeight: 500
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail
                size={16}
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
              />
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: '100%', paddingLeft: '2.5rem', height: '42px' }}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={16}
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
              />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', paddingLeft: '2.5rem', height: '42px' }}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="primary"
            disabled={submitting}
            style={{ height: '44px', width: '100%', fontWeight: 600, marginTop: '0.5rem', borderRadius: 'var(--radius-sm)' }}
          >
            {submitting ? 'Signing in...' : (
              <>
                Sign In <LogIn size={16} />
              </>
            )}
          </button>
        </form>

        {/* Redirect toggle */}
        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Don't have an account?{' '}
          <span
            onClick={() => navigateTo('signup')}
            style={{
              color: 'var(--accent-primary)',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.1rem'
            }}
          >
            Create account <ArrowRight size={12} />
          </span>
        </div>
      </div>
    </div>
  );
};

export default Login;
