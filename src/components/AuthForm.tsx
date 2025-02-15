import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, Lock, User, Phone } from 'lucide-react';
import toast from 'react-hot-toast';

interface AuthFormProps {
  onSuccess: () => void;
}

function AuthForm({ onSuccess }: AuthFormProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    contactNumber: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const validatePassword = (password: string) => {
    if (password.length < 8) return 'Password must be at least 8 characters long';
    if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
    if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter';
    if (!/[0-9]/.test(password)) return 'Password must contain at least one number';
    return null;
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      toast.error(passwordError);
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          full_name: formData.fullName,
          contact_number: formData.contactNumber
        }
      }
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Please check your email to verify your account');
      setIsSignUp(false);
    }
    setLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: formData.email,
      password: formData.password
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Successfully signed in');
      onSuccess();
    }
    setLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(formData.email);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Password reset instructions sent to your email');
      setIsResetPassword(false);
    }
    setLoading(false);
  };

  if (isResetPassword) {
    return (
      <div className="w-full max-w-md">
        <form onSubmit={handleResetPassword} className="space-y-4">
          <h2 className="text-2xl font-bold text-white mb-6">Reset Password</h2>
          
          <div>
            <label className="block text-white/70 mb-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full bg-white/10 border border-white/20 rounded-lg py-2 pl-10 pr-4 text-white placeholder-white/40"
                placeholder="Enter your email"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-pink-500 hover:bg-pink-600 text-white py-2 rounded-lg transition-colors"
          >
            {loading ? 'Sending...' : 'Send Reset Instructions'}
          </button>

          <button
            type="button"
            onClick={() => setIsResetPassword(false)}
            className="w-full text-white/70 hover:text-white py-2"
          >
            Back to Sign In
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-4">
        <h2 className="text-2xl font-bold text-white mb-6">
          {isSignUp ? 'Create an Account' : 'Sign In'}
        </h2>

        {isSignUp && (
          <>
            <div>
              <label className="block text-white/70 mb-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-white/10 border border-white/20 rounded-lg py-2 pl-10 pr-4 text-white placeholder-white/40"
                  placeholder="Enter your full name"
                />
              </div>
            </div>

            <div>
              <label className="block text-white/70 mb-1">Contact Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
                <input
                  type="tel"
                  name="contactNumber"
                  value={formData.contactNumber}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-white/10 border border-white/20 rounded-lg py-2 pl-10 pr-4 text-white placeholder-white/40"
                  placeholder="Enter your contact number"
                />
              </div>
            </div>
          </>
        )}

        <div>
          <label className="block text-white/70 mb-1">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              className="w-full bg-white/10 border border-white/20 rounded-lg py-2 pl-10 pr-4 text-white placeholder-white/40"
              placeholder="Enter your email"
            />
          </div>
        </div>

        <div>
          <label className="block text-white/70 mb-1">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required
              className="w-full bg-white/10 border border-white/20 rounded-lg py-2 pl-10 pr-4 text-white placeholder-white/40"
              placeholder="Enter your password"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-pink-500 hover:bg-pink-600 text-white py-2 rounded-lg transition-colors"
        >
          {loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Sign In')}
        </button>

        {!isSignUp && (
          <button
            type="button"
            onClick={() => setIsResetPassword(true)}
            className="w-full text-white/70 hover:text-white py-2"
          >
            Forgot Password?
          </button>
        )}

        <button
          type="button"
          onClick={() => setIsSignUp(!isSignUp)}
          className="w-full text-white/70 hover:text-white py-2"
        >
          {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
        </button>
      </form>
    </div>
  );
}

export default AuthForm;