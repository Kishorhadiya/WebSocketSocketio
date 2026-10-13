import React, { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { useData } from './Context';
import { API_URL } from '../config';
import chatBg from '../assets/chat-bg.jpg';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const { setAccesstoken, setCureentuser } = useData();

  const handelSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const value = { email, password };
      const res = await axios.post(`${API_URL}/api/v1/login`, value);

      if (res.data.token) {
        setAccesstoken(res.data.token);
        setCureentuser(res.data.U);
        setEmail('');
        setPassword('');
        navigate('/');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || 'Invalid email or login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#0b141a]">
      {/* Left — Background Image Panel */}
      <div
        className="hidden lg:flex lg:w-[45%] relative items-center justify-center"
        style={{
          backgroundImage: `url(${chatBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#00a884]/70 to-[#0b141a]/95" />
        <div className="relative z-10 px-12 text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-md">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 4.418 9 8z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-white mb-3">Chat App</h2>
          <p className="text-white/60 text-sm max-w-xs mx-auto">Connect, share, and chat in real-time.</p>
        </div>
      </div>

      {/* Right — Login Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Logo for mobile */}
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <div className="w-9 h-9 rounded-full bg-[#00a884] flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 4.418 9 8z" />
              </svg>
            </div>
            <span className="text-white font-bold text-lg">Chat App</span>
          </div>

          <h1 className="text-2xl font-bold text-white mb-1">Welcome back</h1>
          <p className="text-[#8696a0] text-sm mb-8">Sign in to continue chatting</p>

          {error && (
            <div className="mb-5 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handelSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#8696a0] mb-1.5 uppercase tracking-wider">Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-[#1a2730] border border-[#2a3942] rounded-lg text-white placeholder-[#8696a0]/40 focus:outline-none focus:ring-2 focus:ring-[#00a884]/60 focus:border-transparent transition-all text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#8696a0] mb-1.5 uppercase tracking-wider">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-[#1a2730] border border-[#2a3942] rounded-lg text-white placeholder-[#8696a0]/40 focus:outline-none focus:ring-2 focus:ring-[#00a884]/60 focus:border-transparent transition-all text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-2 bg-[#00a884] hover:bg-[#00bf96] disabled:opacity-50 text-white font-semibold rounded-lg transition-all active:scale-[0.98] cursor-pointer text-sm"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-[#8696a0] mt-8">
            Don't have an account?{' '}
            <Link to="/register" className="text-[#00a884] hover:text-[#25d366] font-medium transition-colors">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;