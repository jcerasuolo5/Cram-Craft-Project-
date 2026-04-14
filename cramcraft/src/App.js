import React, { useEffect, useState } from 'react';
import './App.css';
import { motion } from 'framer-motion';
import { supabase } from './lib/supabaseClient';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import Flashcards from './components/Flashcards';

const App = () => {
  // landing page phase
  const [view, setView] = useState('landing');
  const [isNewUser, setIsNewUser] = useState(true);

  // auth inputs - done in supabase
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  // UI state
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState(null);

  // Dashboard data
  const [pastSessions, setPastSessions] = useState([]);
  const [streakData, setStreakData] = useState({ currentStreak: 0, totalDays: 0, longestStreak: 0 });
  const [testDates, setTestDates] = useState([]);
  const [newTestDate, setNewTestDate] = useState('');
  const [newTestSubject, setNewTestSubject] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedSession, setSelectedSession] = useState(null);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    let listener;

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

    listener = authListener;

    return () => {
      listener?.subscription?.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAuth = async () => {
    setLoading(true);
    setMessage('');

    try {
      if (isNewUser) {
        const { error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: {
              name: name
            }
          }
        });
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
    setName('');
    setMessage('');
  };

  const fetchDashboardData = async () => {
    if (!session?.user?.id) return;

    // Fetch past sessions
    const { data: sessions } = await supabase
      .from('study_sessions')
      .select('*')
      .eq('user_id', session.user.id)
      .order('date', { ascending: false });

    setPastSessions(sessions || []);

    // Compute and update streaks
    const newStreaks = computeStreaks(sessions || []);
    await supabase
      .from('streaks')
      .upsert([{ user_id: session.user.id, ...newStreaks, last_study_date: new Date().toISOString().split('T')[0] }]);
    setStreakData(newStreaks);

    // Fetch test dates
    const { data: dates } = await supabase
      .from('test_dates')
      .select('*')
      .eq('user_id', session.user.id)
      .order('date', { ascending: true });

    setTestDates(dates || []);
    generateNotifications(dates || []);
  };

  const startStudySession = async () => {
    if (!notes.trim()) return;

    const today = new Date().toISOString().split('T')[0];
    const duration = '45 min'; // Placeholder

    const { error } = await supabase
      .from('study_sessions')
      .insert([{ user_id: session.user.id, date: today, topic: notes.substring(0, 50), duration, notes }]);

    if (!error) {
      setNotes('');
      fetchDashboardData();
    }
  };

  const addTestDate = async () => {
    if (!newTestDate || !newTestSubject) return;

    const { error } = await supabase
      .from('test_dates')
      .insert([{ user_id: session.user.id, date: newTestDate, subject: newTestSubject }]);

    if (!error) {
      setNewTestDate('');
      setNewTestSubject('');
      fetchDashboardData();
    }
  };

  const deleteTestDate = async (id) => {
    await supabase.from('test_dates').delete().eq('id', id);
    fetchDashboardData();
  };

  const computeStreaks = (sessions) => {
    if (!sessions.length) return { currentStreak: 0, totalDays: 0, longestStreak: 0 };

    const dates = [...new Set(sessions.map(s => s.date))].sort();
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 1;

    for (let i = dates.length - 1; i >= 0; i--) {
      const current = new Date(dates[i]);
      const next = i > 0 ? new Date(dates[i - 1]) : null;

      if (next && (current - next) / (1000 * 60 * 60 * 24) === 1) {
        tempStreak++;
      } else {
        if (i === dates.length - 1) currentStreak = tempStreak;
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    return {
      currentStreak,
      totalDays: dates.length,
      longestStreak
    };
  };

  const generateNotifications = (testDates) => {
    const today = new Date();
    const upcoming = testDates.filter(event => {
      const eventDate = new Date(event.date);
      const diff = (eventDate - today) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= 7; // Within 7 days
    });
    setNotifications(upcoming);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setMessage('Processing file...');
    try {
      if (file.type === 'application/pdf') {
        // Dynamically load PDF.js from CDN to bypass Webpack compilation issues entirely
        const loadPdfJs = async () => {
          if (window.pdfjsLib) return window.pdfjsLib;
          return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
            script.onload = () => {
              window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
              resolve(window.pdfjsLib);
            };
            script.onerror = () => reject(new Error('Failed to load PDF.js'));
            document.body.appendChild(script);
          });
        };

        const pdfjsLib = await loadPdfJs();
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let extractedText = '';
        
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map(item => item.str).join(' ');
          extractedText += pageText + '\n';
        }
        
        setNotes(extractedText);
        setMessage('PDF loaded successfully!');
      } else if (file.type === 'text/plain') {
        const reader = new FileReader();
        reader.onload = (event) => {
          setNotes(event.target.result);
          setMessage('Text file loaded successfully!');
        };
        reader.readAsText(file);
      } else {
        setMessage('Unsupported file type. Please upload a PDF or Text file.');
      }
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error reading file:', error);
      setMessage('Error reading file. Could not parse PDF.');
      setTimeout(() => setMessage(''), 5000);
    }
  };

  return (
    <>
      <header className="landing-header">
        <div className="landing-header__logo">CramCraft</div>
        <nav className="landing-nav">
          <button
            className="landing-nav__link"
            onClick={() => {
              setView('landing');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            Home
          </button>
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

        <motion.section
          id="landing-hero"
          className="app-card app-card--hero"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <img src="/logo.png" alt="CramCraft logo" className="landing-logo" />
          <h1 className="app-title">Study Smarter, Not Harder</h1>
          <p className="app-subtitle">
            Convert your notes into adaptive flashcards, track mastery, and stay motivated with science-backed study streaks.
          </p>

          <div className="landing-actions">
            <button onClick={() => setView('auth')} className="btn btn-primary btn-cta">Get Started</button>
          </div>

          <p className="landing-secondary-cta">
            Already have an account? <button className="landing-login-link" onClick={() => setView('auth')}>Log in</button>
          </p>

          <div className="landing-visual-section">
            <img src="/logo192.png" alt="App preview" className="landing-visual" />
            <div className="landing-social-proof">
              <span>Trusted by students</span>
              <div className="landing-testimonials">
                <blockquote>“Finally, a study tool that actually adapts to my students.” – Mehdi P.</blockquote>
              </div>
            </div>
          </div>

          <motion.div
            className="landing-feature-grid"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.55 }}
          >
            <motion.div className="feature-card" whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
              <h3>Instant flashcards</h3>
              <p>Transform your lecture notes into bite-sized questions in seconds.</p>
            </motion.div>
            <motion.div className="feature-card" whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
              <h3>Smart review</h3>
              <p>Adaptive spacing helps you remember longer and retain deeper understanding.</p>
            </motion.div>
            <motion.div className="feature-card" whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
              <h3>Track progress</h3>
              <p>Daily streaks, mastery score, and performance insights that keep you on track.</p>
            </motion.div>
          </motion.div>
        </motion.section>

        <motion.section
          className="landing-more"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.6 }}
        >
          <div className="landing-more__inner">
            <article>
              <h2>Everything you need in one study dashboard</h2>
              <p>
                CramCraft automatically creates review queues, scores your streaks, and lets you save cards for later.
              </p>
            </article>

            <div className="landing-more-grid">
              <div className="landing-card">
                <h3>Workflows in seconds</h3>
                <p>Paste notes, generate questions, and start reviewing in under a minute.</p>
              </div>
              <div className="landing-card">
                <h3>AI-powered context</h3>
                <p>Flashcards adapt to difficulty and topic so you study what matters most.</p>
              </div>
              <div className="landing-card">
                <h3>Focus on retention</h3>
                <p>Built-in adaptive spacing helps you remember more and stress less.</p>
              </div>
            </div>
          </div>
        </motion.section>

        <footer className="landing-footer">
          <p>© {new Date().getFullYear()} CramCraft. Built for student success.</p>
        </footer>
      </div>
      )}

      {view === 'auth' && (
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
            {isNewUser && (
              <motion.input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-brand-teal outline-none transition-colors"
                placeholder="Full Name"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              />
            )}
            <motion.input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-brand-teal outline-none transition-colors"
              placeholder="Email Address"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: isNewUser ? 0.2 : 0.1 }}
            />
            <motion.input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-brand-teal outline-none transition-colors"
              type="password"
              placeholder="Password"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: isNewUser ? 0.3 : 0.2 }}
            />
            <motion.button
              onClick={handleAuth}
              disabled={loading || !email || !password || (isNewUser && !name)}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: isNewUser ? 0.4 : 0.3 }}
            >
              {loading ? 'Working…' : isNewUser ? 'Sign Up' : 'Log In'}
            </motion.button>
          </div>

          {message ? (
            <motion.p 
              className="mt-4 text-sm text-center text-red-500"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {message}
            </motion.p>
          ) : null}

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
      )}

      {view === 'input' && (
        <div className="app-page app-page--dashboard">
        <motion.div 
          className="dashboard-shell"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="dashboard-grid">
            <motion.div
              className="app-card app-card--past-sessions"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <h3 className="app-heading">Past Sessions</h3>
              <div className="past-sessions-list">
                {pastSessions.map(session => (
                  <div key={session.id} className="past-session-item" onClick={() => setSelectedSession(session)}>
                    <div className="session-date">{session.date}</div>
                    <div className="session-topic">{session.topic}</div>
                    <div className="session-duration">{session.duration}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              className="app-card app-card--streaks"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <h3 className="app-heading">Study Streaks</h3>
              <div className="streaks-stats">
                <div className="streak-stat">
                  <span className="stat-number">{streakData.currentStreak}</span>
                  <span className="stat-label">Current Streak</span>
                </div>
                <div className="streak-stat">
                  <span className="stat-number">{streakData.totalDays}</span>
                  <span className="stat-label">Total Days</span>
                </div>
                <div className="streak-stat">
                  <span className="stat-number">{streakData.longestStreak}</span>
                  <span className="stat-label">Longest Streak</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="app-card app-card--calendar"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              <h3 className="app-heading">Upcoming Tests</h3>
              <Calendar
                value={new Date()}
                tileContent={({ date, view }) => {
                  if (view === 'month') {
                    const dateStr = date.toISOString().split('T')[0];
                    const event = testDates.find(d => d.date === dateStr);
                    return event ? <div className="calendar-event-marker">{event.subject}</div> : null;
                  }
                }}
              />
              <div className="add-test-form">
                <input
                  type="date"
                  value={newTestDate}
                  onChange={(e) => setNewTestDate(e.target.value)}
                  className="w-full p-2 border rounded mb-2"
                />
                <input
                  type="text"
                  value={newTestSubject}
                  onChange={(e) => setNewTestSubject(e.target.value)}
                  placeholder="Subject"
                  className="w-full p-2 border rounded mb-2"
                />
                <button onClick={addTestDate} className="btn btn-secondary">Add Test Date</button>
              </div>
              <div className="test-dates-list">
                {testDates.map(event => (
                  <div key={event.id} className="test-date-item">
                    <span>{event.date}: {event.subject}</span>
                    <button onClick={() => deleteTestDate(event.id)} className="btn-delete">×</button>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              className="app-card app-card--dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              <h2 className="app-heading">Ready to Craft?</h2>
              <p className="app-text">
                Paste your lecture notes or PDF text below to generate your game.
              </p>

              <div className="mb-4 flex items-center">
                <label className="btn btn-secondary cursor-pointer inline-block mr-4">
                  Upload File
                  <input
                    type="file"
                    accept=".pdf,.txt"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                </label>
                {message && <span className="text-sm font-medium text-brand-teal">{message}</span>}
              </div>

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full h-64 p-6 border-2 border-dashed border-gray-300 rounded-2xl focus:border-brand-teal outline-none transition-colors bg-gray-50/50"
                placeholder="Example: Big O notation describes the execution time of an algorithm..."
              />

              <div className="mt-8 flex justify-end">
                <button onClick={startStudySession} className="btn-primary">
                  Start Study Session →
                </button>
              </div>
            </motion.div>
          </div>

          {notifications.length > 0 && (
            <motion.div
              className="notifications"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h3>Upcoming Tests (Next 7 Days)</h3>
              {notifications.map(event => (
                <div key={event.id} className="notification-item">
                  {event.subject} on {event.date}
                </div>
              ))}
            </motion.div>
          )}

          {selectedSession && (
            <motion.div
              className="modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => setSelectedSession(null)}
            >
              <motion.div
                className="modal-content"
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                onClick={(e) => e.stopPropagation()}
              >
                <h3>{selectedSession.topic}</h3>
                <p><strong>Date:</strong> {selectedSession.date}</p>
                <p><strong>Duration:</strong> {selectedSession.duration}</p>
                <p><strong>Notes:</strong></p>
                <pre>{selectedSession.notes}</pre>
                <button onClick={() => setSelectedSession(null)} className="btn btn-secondary">Close</button>
              </motion.div>
            </motion.div>
          )}
        </motion.div>
      </div>
      )}

      {view === 'flashcards' && (
        <Flashcards
          notes={notes}
          onBack={() => setView('input')}
        />
      )}
    </>
  );
};

export default App;
