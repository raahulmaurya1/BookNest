import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getPasswordRuleMessage } from '../utils/constants';
import { BookOpen } from 'lucide-react';

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = getPasswordRuleMessage();
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
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
      const result = await register(formData.name, formData.email, formData.password);
      if (result.success) {
        navigate('/login', { state: { message: 'Registration successful! Please sign in.' } });
      } else {
        setErrors({ general: result.error || 'Registration failed' });
      }
    } catch (error) {
      setErrors({ general: 'An unexpected error occurred' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: null });
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-paper px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <BookOpen className="w-12 h-12 text-accent mx-auto mb-2" strokeWidth={1.5} />
          <h1 className="mt-3 text-3xl font-serif font-bold text-ink tracking-tight">
            BookNest
          </h1>
          <p className="text-xs font-semibold text-ink-muted uppercase tracking-widest mt-1">Create Your Account</p>
        </div>

        <div className="border border-hairline bg-white rounded-lg shadow-sm p-8">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {errors.general && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-xs font-semibold">
                {errors.general}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-xs font-bold text-ink-muted uppercase mb-1.5">Full Name</label>
                <input 
                  id="name" 
                  name="name" 
                  type="text" 
                  autoComplete="name" 
                  required
                  className={`input-field ${errors.name ? 'input-error' : ''}`}
                  placeholder="e.g. John Doe" 
                  value={formData.name} 
                  onChange={handleChange} 
                />
                {errors.name && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.name}</p>}
              </div>

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
                  autoComplete="new-password" 
                  required
                  className={`input-field ${errors.password ? 'input-error' : ''}`}
                  placeholder="Minimum 8 characters" 
                  value={formData.password} 
                  onChange={handleChange} 
                />
                {errors.password && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.password}</p>}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-xs font-bold text-ink-muted uppercase mb-1.5">Confirm Password</label>
                <input 
                  id="confirmPassword" 
                  name="confirmPassword" 
                  type="password" 
                  autoComplete="new-password" 
                  required
                  className={`input-field ${errors.confirmPassword ? 'input-error' : ''}`}
                  placeholder="Re-enter password" 
                  value={formData.confirmPassword} 
                  onChange={handleChange} 
                />
                {errors.confirmPassword && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.confirmPassword}</p>}
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full btn-primary mt-4"
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>

            <div className="text-xs font-bold text-center text-ink-muted mt-4">
              Already have an account?{' '}
              <Link to="/login" className="text-accent hover:text-accent-hover hover:underline">
                Sign In
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;