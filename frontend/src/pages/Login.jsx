import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { BookOpen } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // Success message after registration redirect
  const registrationSuccessMessage = location.state?.message;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: null });
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.email) newErrors.email = 'Email is required';
    if (!formData.password) newErrors.password = 'Password is required';
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setIsLoading(true);
    setErrors({});
    try {
      const result = await login(formData.email, formData.password);
      if (result.success) {
        navigate('/');
      } else {
        setErrors({ general: result.error || 'Login failed' });
      }
    } catch (error) {
      setErrors({ general: 'An unexpected error occurred' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-paper px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <BookOpen className="w-12 h-12 text-accent mx-auto mb-2" strokeWidth={1.5} />
          <h1 className="mt-3 text-3xl font-serif font-bold text-ink tracking-tight">
            BookNest
          </h1>
          <p className="text-xs font-semibold text-ink-muted uppercase tracking-widest mt-1">Access Your Library</p>
        </div>

        <div className="border border-hairline bg-white rounded-lg shadow-sm p-8">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {registrationSuccessMessage && (
              <div className="bg-paper border border-hairline text-green-700 px-4 py-3 rounded-lg text-xs font-semibold text-center">
                {registrationSuccessMessage}
              </div>
            )}

            {errors.general && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-xs font-semibold">
                {errors.general}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-xs font-bold text-ink-muted uppercase mb-1.5">Email Address</label>
                <input 
                  id="email" 
                  name="email" 
                  type="email" 
                  autoComplete="email" 
                  required
                  className={`input-field ${errors.email ? 'input-error' : ''}`}
                  placeholder="you@example.com" 
                  value={formData.email} 
                  onChange={handleChange} 
                />
                {errors.email && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.email}</p>}
              </div>

              <div>
                <label htmlFor="password" className="block text-xs font-bold text-ink-muted uppercase mb-1.5">Password</label>
                <input 
                  id="password" 
                  name="password" 
                  type="password" 
                  autoComplete="current-password" 
                  required
                  className={`input-field ${errors.password ? 'input-error' : ''}`}
                  placeholder="••••••••" 
                  value={formData.password} 
                  onChange={handleChange} 
                />
                {errors.password && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.password}</p>}
              </div>
            </div>

            <button type="submit" disabled={isLoading} className="w-full btn-primary mt-4">
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>

            <div className="text-xs font-bold text-center text-ink-muted mt-4">
              Don't have an account?{' '}
              <Link to="/register" className="text-accent hover:text-accent-hover hover:underline">
                Sign Up
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;