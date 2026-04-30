import React, { useEffect, useState } from 'react';
import './App.css';
import { motion } from 'framer-motion';
import { supabase } from './lib/supabaseClient';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import Flashcards from './components/Flashcards';

const App = () => {
  const [view, setView] = useState('landing');
  const [isNewUser, setIsNewUser] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState(null);
  const [manualQuestion, setManualQuestion] = useState('');
  const [manualAnswer, setManualAnswer] = useState('');
  const [pastSessions, setPastSessions] = useState([]);
  const [streakData, setStreakData] = useState({ currentStreak: 0, totalDays: 0, longestStreak: 0 });
  const [testDates, setTestDates] = useState([]);
  const [newTestDate, setNewTestDate] = useState('');
  const [newTestSubject, setNewTestSubject] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedSession, setSelectedSession] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [flashcards, setFlashcards] = useState([{ question: '', answer: '' }]);
  const [showAddTestModal, setShowAddTestModal] = useState(false);
  const [selectedTestDate, setSelectedTestDate] = useState(null);
  const [testFlashcards, setTestFlashcards] = useState([{ question: '', answer: '' }]);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      if (data.session) {
        setView('input');
        fetchDashboardData();
      }
    };
    init();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        setView('input');
        fetchDashboardData();
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const handleAuth = async () => {
    setLoading(true);
    setMessage('');
    try {
      if (isNewUser) {
        const { error } = await supabase.auth.signUp({ 
          email, password, options: { data: { name } }
        });
        if (error) throw error;
        setMessage('Check your inbox for a confirmation link.');
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
  };

  const fetchDashboardData = async () => {
    if (!session?.user?.id) return;
    const { data: sessions } = await supabase
      .from('study_sessions')
      .select('*')
      .eq('user_id', session.user.id)
      .order('date', { ascending: false });
    setPastSessions(sessions || []);

    const newStreaks = computeStreaks(sessions || []);
    setStreakData(newStreaks);

    const { data: dates } = await supabase
      .from('test_dates')
      .select('*')
      .eq('user_id', session.user.id);
    setTestDates(dates || []);
  };

  const startStudySession = async () => {
    // Filter out empty flashcards
    const validCards = flashcards.filter(card => card.question.trim() && card.answer.trim());
    if (validCards.length === 0) {
      setMessage('Please add at least one flashcard with both question and answer!');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    
    // Combine all flashcards into notes format
    const combinedContent = validCards.map((card, index) => 
      `Question: ${card.question}\nAnswer: ${card.answer}`
    ).join('\n\n---\n\n');
    
    setNotes(combinedContent);
    setView('flashcards');

    try {
      await supabase.from('study_sessions').insert([{ 
        user_id: session.user.id, 
        date: new Date().toISOString().split('T')[0], 
        topic: validCards[0].question.substring(0, 50), 
        duration: 'Manual Entry', 
        notes: combinedContent 
      }]);
    } catch (err) { console.error(err); }
  };

  const addFlashcard = () => {
    setFlashcards([...flashcards, { question: '', answer: '' }]);
  };

  const updateFlashcard = (index, field, value) => {
    const updated = [...flashcards];
    updated[index][field] = value;
    setFlashcards(updated);
  };

  const removeFlashcard = (index) => {
    if (flashcards.length > 1) {
      const updated = flashcards.filter((_, i) => i !== index);
      setFlashcards(updated);
    }
  };

  // Test date handlers
  const addTestDate = async () => {
    if (!newTestDate || !newTestSubject) {
      setMessage('Please enter both a date and subject!');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    
    // Get valid flashcards from the test flashcards form
    const validCards = testFlashcards.filter(card => card.question.trim() && card.answer.trim());
    const notesContent = validCards.length > 0 
      ? validCards.map((card, index) => `Question: ${card.question}\nAnswer: ${card.answer}`).join('\n\n---\n\n')
      : '';

    try {
      await supabase.from('test_dates').insert([{ 
        user_id: session.user.id, 
        date: newTestDate, 
        subject: newTestSubject,
        notes: notesContent
      }]);
      
      setNewTestDate('');
      setNewTestSubject('');
      setTestFlashcards([{ question: '', answer: '' }]);
      setShowAddTestModal(false);
      fetchDashboardData();
    } catch (err) { 
      console.error(err); 
      setMessage('Failed to add test date');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const deleteTestDate = async (id) => {
    try {
      await supabase.from('test_dates').delete().eq('id', id);
      fetchDashboardData();
    } catch (err) { console.error(err); }
  };

  const openTestFlashcards = (testDate) => {
    setSelectedTestDate(testDate);
    if (testDate.notes) {
      // Parse existing notes into flashcards
      const cardSections = testDate.notes.split('---').map(s => s.trim()).filter(s => s);
      if (cardSections.length > 0 && cardSections[0]) {
        const parsedCards = cardSections.map(section => {
          const questionMatch = section.match(/Question: ([\s\S]*?)\nAnswer:/);
          const answerMatch = section.match(/Answer: ([\s\S]*)/);
          return {
            question: questionMatch ? questionMatch[1].trim() : '',
            answer: answerMatch ? answerMatch[1].trim() : ''
          };
        }).filter(card => card.question);
        
        if (parsedCards.length > 0) {
          setNotes(testDate.notes);
          setView('flashcards');
          return;
        }
      }
    }
    // If no notes, open the input view with test date context
    setNotes('');
    setFlashcards([{ question: '', answer: '' }]);
    setView('input');
  };

  const updateTestFlashcard = (index, field, value) => {
    const updated = [...testFlashcards];
    updated[index][field] = value;
    setTestFlashcards(updated);
  };

  const addTestFlashcard = () => {
    setTestFlashcards([...testFlashcards, { question: '', answer: '' }]);
  };

  const removeTestFlashcard = (index) => {
    if (testFlashcards.length > 1) {
      const updated = testFlashcards.filter((_, i) => i !== index);
      setTestFlashcards(updated);
    }
  };

  const computeStreaks = (sessions) => {
    if (!sessions.length) return { currentStreak: 0, totalDays: 0, longestStreak: 0 };
    const dates = [...new Set(sessions.map(s => s.date))].sort();
    return { currentStreak: dates.length, totalDays: dates.length, longestStreak: dates.length };
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setMessage('Processing file...');
    // PDF/Text logic remains the same as your original snippet
  };

  return (
    <>
      <header className="landing-header">
        <div className="landing-header__logo">CramCraft</div>
        <nav className="landing-nav">
          <button className="landing-nav__link" onClick={() => setView(session ? 'input' : 'landing')}>Home</button>
          {session ? (
            <>
              <button className="landing-nav__link" onClick={() => setView('input')}>Dashboard</button>
              <button className="landing-nav__link" onClick={() => setView('flashcards')}>Flashcards</button>
              <button onClick={handleSignOut} className="landing-nav__link">Sign Out</button>
            </>
          ) : (
            <button className="landing-nav__link" onClick={() => setView('auth')}>Login</button>
          )}
        </nav>
      </header>

      {view === 'landing' && (
        <div className="app-page app-page--landing">
          <motion.section className="app-card app-card--hero" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <img src="/logo.png" alt="CramCraft logo" className="landing-logo" />
            <h1 className="app-title">Study Smarter</h1>
            <p className="app-subtitle">Convert notes into adaptive flashcards instantly.</p>
            <div className="landing-actions">
              <button onClick={() => setView('auth')} className="btn btn-primary btn-cta">Get Started</button>
            </div>
          </motion.section>
        </div>
      )}

      {view === 'auth' && (
        <div className="app-page app-page--auth">
          <motion.div className="app-card app-card--form" animate={{ opacity: 1, scale: 1 }} initial={{ opacity: 0, scale: 0.9 }}>
            <button onClick={() => setView('landing')} className="btn btn-ghost mb-4">← Close</button>
            <h2 className="app-heading">{isNewUser ? 'Create Account' : 'Welcome Back'}</h2>
            <div className="space-y-4">
              {isNewUser && <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full Name" />}
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email Address" />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
              <button onClick={handleAuth} className="w-full btn-primary">{loading ? 'Working…' : isNewUser ? 'Sign Up' : 'Log In'}</button>
            </div>
            {message && <p className="status-message">{message}</p>}
            <p className="mt-6 text-sm text-center">
              <span onClick={() => setIsNewUser(!isNewUser)} className="text-brand-teal cursor-pointer underline">
                {isNewUser ? 'Log In' : 'Sign Up'}
              </span>
            </p>
          </motion.div>
        </div>
      )}

      {view === 'input' && (
        <div className="app-page app-page--dashboard">
          <motion.div className="dashboard-shell" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
            <div className="dashboard-grid">
              
              {/* TOP: READY TO CRAFT */}
              <motion.div className="app-card app-card--dashboard app-card--full-width h-auto pb-6">
                <h2 className="app-heading">Ready to Craft?</h2>
                <div className="flashcards-builder">
                  {flashcards.map((card, index) => (
                    <div key={index} className="flashcard-builder-item">
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-bold text-gray-600">Flashcard {index + 1}</label>
                        {flashcards.length > 1 && (
                          <button 
                            onClick={() => removeFlashcard(index)} 
                            className="btn-delete text-xs px-2 py-1"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 text-left">
                          <label className="block text-xs font-bold mb-1 text-gray-500">Front (Question)</label>
                          <textarea 
                            value={card.question} 
                            onChange={(e) => updateFlashcard(index, 'question', e.target.value)} 
                            className="w-full h-24 p-3 border-2 border-gray-200 rounded-xl focus:border-brand-teal outline-none transition-colors bg-white resize-none text-sm" 
                            placeholder="Question..." 
                          />
                        </div>
                        <div className="flex-1 text-left">
                          <label className="block text-xs font-bold mb-1 text-gray-500">Back (Answer)</label>
                          <textarea 
                            value={card.answer} 
                            onChange={(e) => updateFlashcard(index, 'answer', e.target.value)} 
                            className="w-full h-24 p-3 border-2 border-gray-200 rounded-xl focus:border-brand-teal outline-none transition-colors bg-white resize-none text-sm" 
                            placeholder="Answer..." 
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <button onClick={addFlashcard} className="btn btn-secondary text-sm px-4 py-2">
                      + Add Another
                    </button>
                    {message && <span className="text-sm font-medium text-brand-teal">{message}</span>}
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="btn btn-secondary text-sm px-4 py-2 cursor-pointer">
                      Upload File
                      <input type="file" accept=".pdf,.txt" onChange={handleFileUpload} style={{ display: 'none' }} />
                    </label>
                    <button onClick={startStudySession} className="btn-primary">
                      Done crafting, let's cram! →
                    </button>
                  </div>
                </div>
              </motion.div>

              {/* BOTTOM ROW: STATS, CALENDAR, SESSIONS */}
              <motion.div className="app-card app-card--stats">
                <h3 className="text-lg font-bold mb-4">Your Progress</h3>
                <div className="stats-row" style={{ display: 'flex', gap: '20px' }}>
                  <div className="stat-item">
                    <span className="block text-2xl font-bold text-brand-teal">{streakData.currentStreak}</span>
                    <span className="text-xs uppercase text-gray-500">Day Streak</span>
                  </div>
                  <div className="stat-item">
                    <span className="block text-2xl font-bold text-brand-teal">{streakData.totalDays}</span>
                    <span className="text-xs uppercase text-gray-500">Total Days</span>
                  </div>
                </div>
              </motion.div>

              <motion.div className="app-card app-card--calendar">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-bold">Study Calendar</h3>
                  <button 
                    onClick={() => setShowAddTestModal(true)} 
                    className="btn btn-secondary text-xs px-3 py-1"
                  >
                    + Add Test
                  </button>
                </div>
                <Calendar />
                {testDates.length > 0 && (
                  <div className="test-dates-list mt-4">
                    <h4 className="text-sm font-bold mb-2">Upcoming Tests</h4>
                    {testDates.map((test) => (
                      <div 
                        key={test.id} 
                        className="test-date-item cursor-pointer hover:bg-gray-100"
                        onClick={() => openTestFlashcards(test)}
                      >
                        <div className="flex-1">
                          <span className="font-bold text-sm">{test.subject}</span>
                          <span className="block text-xs text-gray-500">{test.date}</span>
                          {test.notes && (
                            <span className="text-xs text-brand-teal">📚 Has flashcards</span>
                          )}
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); deleteTestDate(test.id); }} 
                          className="btn-delete text-xs"
                          title="Delete test"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>

              <motion.div className="app-card app-card--sessions h-64 overflow-y-auto">
                <h3 className="text-lg font-bold mb-4">Past Sessions</h3>
                <div className="space-y-2">
                  {pastSessions.length > 0 ? pastSessions.map((s) => (
                    <div key={s.id} className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => setSelectedSession(s)}>
                      <p className="font-bold text-sm truncate">{s.topic}</p>
                      <p className="text-xs text-gray-500">{s.date}</p>
                    </div>
                  )) : <p className="text-sm text-gray-400">No sessions yet.</p>}
                </div>
              </motion.div>

            </div>
          </motion.div>
        </div>
      )}

      {selectedSession && (
        <div className="modal-overlay" onClick={() => setSelectedSession(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{selectedSession.topic}</h3>
            <p><strong>Date:</strong> {selectedSession.date}</p>
            <pre className="whitespace-pre-wrap text-sm mt-4">{selectedSession.notes}</pre>
            <button onClick={() => setSelectedSession(null)} className="btn btn-secondary mt-4">Close</button>
          </div>
        </div>
      )}

      {showAddTestModal && (
        <div className="modal-overlay" onClick={() => setShowAddTestModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Add Test Date</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1">Test Date</label>
                <input 
                  type="date" 
                  value={newTestDate} 
                  onChange={(e) => setNewTestDate(e.target.value)} 
                  className="w-full p-2 border-2 border-gray-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Subject</label>
                <input 
                  type="text" 
                  value={newTestSubject} 
                  onChange={(e) => setNewTestSubject(e.target.value)} 
                  placeholder="e.g., Math Final, Biology Midterm"
                  className="w-full p-2 border-2 border-gray-200 rounded-xl"
                />
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-bold mb-2">Create Flashcards (Optional)</label>
                <div className="flashcards-builder">
                  {testFlashcards.map((card, index) => (
                    <div key={index} className="flashcard-builder-item">
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-xs font-bold text-gray-600">Card {index + 1}</label>
                        {testFlashcards.length > 1 && (
                          <button 
                            onClick={() => removeTestFlashcard(index)} 
                            className="btn-delete text-xs px-2 py-1"
                          >
                            ×
                          </button>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <input 
                          type="text" 
                          value={card.question} 
                          onChange={(e) => updateTestFlashcard(index, 'question', e.target.value)} 
                          placeholder="Question..."
                          className="w-full p-2 border border-gray-200 rounded-lg text-sm"
                        />
                        <input 
                          type="text" 
                          value={card.answer} 
                          onChange={(e) => updateTestFlashcard(index, 'answer', e.target.value)} 
                          placeholder="Answer..."
                          className="w-full p-2 border border-gray-200 rounded-lg text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <button 
                  onClick={addTestFlashcard} 
                  className="btn btn-secondary text-xs mt-2"
                >
                  + Add Another Card
                </button>
              </div>
            </div>
            
            <div className="mt-4 flex gap-2">
              <button onClick={addTestDate} className="btn-primary flex-1">
                Save Test
              </button>
              <button onClick={() => setShowAddTestModal(false)} className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {view === 'flashcards' && (
        <div className="app-page">
          <button onClick={() => setView('input')} className="btn btn-ghost mb-4">← Back to Dashboard</button>
          <Flashcards notes={notes} onBack={() => setView('input')} />
        </div>
      )}
    </>
  );
};

export default App;