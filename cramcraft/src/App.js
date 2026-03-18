import React, { useEffect, useState } from 'react';
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
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-6xl font-extrabold text-brand-dark mb-4">CramCraft</h1>
        <p className="text-xl text-gray-600 mb-8 max-w-md">
          Turn your notes into mastery. The ultimate study engine for students.
        </p>
        <button
          onClick={() => setView('auth')}
          className="bg-brand-teal text-white px-10 py-4 rounded-full font-bold text-lg shadow-lg hover:scale-105 transition-transform"
        >
          Get Started
        </button>
      </div>
    );
  }

  // Log in/Signup section
  if (view === 'auth') {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl">
          <button onClick={() => setView('landing')} className="text-gray-400 hover:text-gray-600 mb-4">
            ← Close
          </button>
          <h2 className="text-2xl font-bold mb-6 text-center">
            {isNewUser ? 'Create Account' : 'Welcome Back'}
          </h2>

          <div className="space-y-4">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border rounded-lg"
              placeholder="Email Address"
            />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border rounded-lg"
              type="password"
              placeholder="Password"
            />
            <button
              onClick={handleAuth}
              disabled={loading || !email || !password}
              className="w-full bg-brand-teal text-white p-3 rounded-lg font-bold disabled:opacity-50"
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
              className="text-brand-teal cursor-pointer font-bold underline"
            >
              {isNewUser ? 'Log In' : 'Sign Up'}
            </span>
          </p>
        </div>
      </div>
    );
  }

  // Note input
  if (view === 'input') {
    return (
      <div className="min-h-screen bg-slate-100 p-8">
        <div className="max-w-4xl mx-auto">
          <header className="flex justify-between items-center mb-10">
            <h1 className="text-2xl font-bold text-brand-dark underline decoration-brand-teal">
              CramCraft.dashboard
            </h1>
            <div className="flex items-center gap-4">
              {session?.user?.email ? (
                <span className="text-sm text-gray-500">{session.user.email}</span>
              ) : null}
              <button onClick={handleSignOut} className="text-gray-500 hover:text-gray-700">
                Sign out
              </button>
            </div>
          </header>

          <div className="bg-white rounded-3xl p-10 shadow-sm border border-slate-200">
            <h2 className="text-3xl font-bold mb-2">Ready to Craft?</h2>
            <p className="text-gray-500 mb-6">
              Paste your lecture notes or PDF text below to generate your game.
            </p>

            <textarea
              className="w-full h-64 p-6 border-2 border-dashed border-slate-300 rounded-2xl focus:border-brand-teal outline-none transition-colors"
              placeholder="Example: Big O notation describes the execution time of an algorithm..."
            />

            <div className="mt-8 flex justify-end">
              <button className="bg-brand-dark text-white px-8 py-3 rounded-xl font-bold hover:bg-black transition-colors">
                Start Study Session →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
};

// Flashcard logic
const StudySession = ({ onFinish }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [currentCard, setCurrentCard] = useState(0);
  const cards = [
    { q: 'Test Question 1', a: 'Test Answer 1' },
    { q: 'Test Question 2', a: 'Test Answer 2' },
  ];

  const handleNext = () => {
    setIsFlipped(false);
    if (currentCard < cards.length - 1) {
      setCurrentCard(currentCard + 1);
    } else {
      onFinish(); //Triggers the choice
    }
  };

  return null;
};

export default App;
