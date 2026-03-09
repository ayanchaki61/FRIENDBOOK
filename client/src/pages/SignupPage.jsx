import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GoogleAuthButton from '../components/GoogleAuthButton';

function SignupPage() {
  const { signup, googleAuth } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    try {
      await signup(form.name, form.email, form.password);
      navigate('/home');
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed');
    }
  };

  const handleGoogleCredential = async (credential) => {
    setError('');
    setGoogleLoading(true);

    try {
      await googleAuth(credential);
      navigate('/home');
    } catch (err) {
      setError(err.response?.data?.message || 'Google signup failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <form className="card auth-card" onSubmit={handleSubmit}>
        <div className="auth-brand-pill">FriendBook</div>
        <h1 className="auth-title">Create Account</h1>
        <p className="auth-subtitle">Join FriendBook and start connecting.</p>

        <div className="auth-fields">
          <input
            className="auth-input"
            type="text"
            placeholder="Full name"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            required
          />
          <input
            className="auth-input"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            required
          />
          <input
            className="auth-input"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
            required
          />
        </div>

        {error && <div className="error">{error}</div>}

        <button type="submit" className="auth-primary-btn">Sign Up</button>
        <div className="auth-divider">or</div>
        <GoogleAuthButton onCredential={handleGoogleCredential} disabled={googleLoading} />

        <p className="auth-switch-text">
          Already registered? <Link to="/login">Log in</Link>
        </p>
      </form>
    </div>
  );
}

export default SignupPage;
