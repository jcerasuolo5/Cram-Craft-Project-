import React, { useEffect, useState } from 'react';
import './App.css';
import { motion } from 'framer-motion';
import { supabase } from './lib/supabaseClient';

const App = () => {
  // landing page phase
  const [view, setView] = useState('landing');
  const [isNewUser, setIsNewUser] = useState(true);

  // auth inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // UI state
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState(null);

  useEffect(() => {
    let listener;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);

      if (data.session) {
        setView('input');
      }
    };

    init();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) setView('input');
    });

    listener = authListener;

    return () => {
      listener?.subscription?.unsubscribe();
    };
  }, []);

  const handleAuth = async () => {
    setLoading(true);
    setMessage('');

    try {
      if (isNewUser) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage('Check your inbox for a confirmation link (if required).');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setView('landing');
    setEmail('');
    setPassword('');
    setMessage('');
  };

  // Welcome section
  if (view === 'landing') {
    return (
      <div className="app-page app-page--landing">
        <header className="landing-header">
          <div className="landing-header__logo">CramCraft</div>
          <nav className="landing-nav">
            <button className="landing-nav__link" onClick={() => setView('landing')}>Home</button>
            <button className="landing-nav__link" onClick={() => setView('auth')}>Login</button>
            <button className="landing-nav__link" onClick={() => setView('input')}>Dashboard</button>
          </nav>
        </header>

        <motion.section
          className="app-card app-card--hero"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <img src="/logo192.png" alt="CramCraft logo" className="landing-logo" />
          <h1 className="app-title">Study Smarter, Not Harder</h1>
          <p className="app-subtitle">
            Convert your notes into adaptive flashcards, track mastery, and stay motivated with science-backed study streaks.
          </p>

          <div className="landing-visual-section">
            <img src="/logo192.png" alt="App preview" className="landing-visual" />
            <div className="landing-social-proof">
              <span>Trusted by 1,400+ students</span>
              <div className="landing-testimonials">
                <blockquote>“Saved me 3 hours a week and boosted my exam score.” – Ana S.</blockquote>
                <blockquote>“Finally, a study tool that actually adapts to me.” – Jordan L.</blockquote>
              </div>
            </div>
          </div>

          <div className="landing-actions">
            <button onClick={() => setView('auth')} className="btn btn-primary btn-cta">Get Started</button>
          </div>

          <p className="landing-secondary-cta">
            Already have an account? <button className="landing-login-link" onClick={() => setView('auth')}>Log in</button>
          </p>

          <div className="landing-feature-grid">
            <div className="feature-card">
              <h3>Instant flashcards</h3>
              <p>Transform your lecture notes into bite-sized questions in seconds.</p>
            </div>
            <div className="feature-card">
              <h3>Smart review</h3>
              <p>Adaptive spacing helps you remember longer and retain deeper understanding.</p>
            </div>
            <div className="feature-card">
              <h3>Track progress</h3>
              <p>Daily streaks, mastery score, and performance insights that keep you on track.</p>
            </div>
          </div>
        </motion.section>
      </div>
    );
  }

  // Log in/Signup section
  if (view === 'auth') {
    return (
      <div className="app-page app-page--auth">
        <motion.div
          className="app-card app-card--form"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <button onClick={() => setView('landing')} className="btn btn-ghost mb-4">
            ← Close
          </button>
          <h2 className="app-heading">
            {isNewUser ? 'Create Account' : 'Welcome Back'}
          </h2>

          <div className="space-y-4">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-brand-teal outline-none transition-colors"
              placeholder="Email Address"
            />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-brand-teal outline-none transition-colors"
              type="password"
              placeholder="Password"
            />
            <button
              onClick={handleAuth}
              disabled={loading || !email || !password}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? 'Working…' : isNewUser ? 'Sign Up' : 'Log In'}
            </button>
          </div>

          {message ? <p className="mt-4 text-sm text-center text-red-500">{message}</p> : null}

          <p className="mt-6 text-sm text-center text-gray-500">
            {isNewUser ? 'Already have an account?' : 'New to CramCraft?'}{' '}
            <span
              onClick={() => {
                setIsNewUser(!isNewUser);
                setMessage('');
              }}
              className="text-brand-teal cursor-pointer font-bold underline hover:text-brand-dark transition-colors"
            >
              {isNewUser ? 'Log In' : 'Sign Up'}
            </span>
          </p>
        </motion.div>
      </div>
    );
  }

  // Note input
  if (view === 'input') {
    return (
      <div className="app-page app-page--dashboard">
        <div className="dashboard-shell">
          <motion.header
            className="dashboard-header"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="dashboard-title">CramCraft.dashboard</h1>
            <div className="dashboard-actions">
              {session?.user?.email ? (
                <span className="dashboard-user">{session.user.email}</span>
              ) : null}
              <button onClick={handleSignOut} className="btn btn-ghost">
                Sign out
              </button>
            </div>
          </motion.header>

          <motion.div
            className="app-card app-card--dashboard"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h2 className="app-heading">Ready to Craft?</h2>
            <p className="app-text">
              Paste your lecture notes or PDF text below to generate your game.
            </p>

            <textarea
              className="w-full h-64 p-6 border-2 border-dashed border-gray-300 rounded-2xl focus:border-brand-teal outline-none transition-colors bg-gray-50/50"
              placeholder="Example: Big O notation describes the execution time of an algorithm..."
            />

            <div className="mt-8 flex justify-end">
              <button className="btn-primary">
                Start Study Session →
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }
};

export default App;
