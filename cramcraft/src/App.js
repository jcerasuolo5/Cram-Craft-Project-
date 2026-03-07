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
};

export default App;