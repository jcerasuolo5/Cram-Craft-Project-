import React, { useState } from 'react';

const App = () => {
  //landing page phase
  const [view, setView] = useState('landing');
  const [isNewUser, setIsNewUser] = useState(true);

  // Welcome section
  if (view === 'landing') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-6xl font-extrabold text-brand-dark mb-4">CramCraft</h1>
        <p className="text-xl text-gray-600 mb-8 max-w-md">Turn your notes into mastery. The ultimate study engine for CS students.</p>
        <button 
          onClick={() => setView('auth')}
          className="bg-brand-teal text-white px-10 py-4 rounded-full font-bold text-lg shadow-lg hover:scale-105 transition-transform"
        >
          Get Started
        </button>
      </div>
    );
  }
  //Log in/Signup section
  if (view === 'auth') {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl">
          <button onClick={() => setView('landing')} className="text-gray-400 hover:text-gray-600 mb-4">← Close</button>
          <h2 className="text-2xl font-bold mb-6 text-center">{isNewUser ? 'Create Account' : 'Welcome Back'}</h2>
          <div className="space-y-4">
            <input className="w-full p-3 border rounded-lg" placeholder="Email Address" />
            <input className="w-full p-3 border rounded-lg" type="password" placeholder="Password" />
            <button onClick={() => setView('input')} className="w-full bg-brand-teal text-white p-3 rounded-lg font-bold">
              {isNewUser ? 'Sign Up' : 'Log In'}
            </button>
          </div>
          <p className="mt-6 text-sm text-center text-gray-500">
            {isNewUser ? "Already have an account?" : "New to CramCraft?"}{' '}
            <span onClick={() => setIsNewUser(!isNewUser)} className="text-brand-teal cursor-pointer font-bold underline">
              {isNewUser ? 'Log In' : 'Sign Up'}
            </span>
          </p>
        </div>
      </div>
    );
  }

};

export default App;