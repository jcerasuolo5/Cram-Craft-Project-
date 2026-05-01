import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

const Flashcards = ({ notes, onBack, onSessionComplete }) => {
  const [cards, setCards] = useState([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [cardHistory, setCardHistory] = useState([]);
  const [sessionStartTime] = useState(new Date());
  const [isSessionComplete, setIsSessionComplete] = useState(false);
  const [sessionStats, setSessionStats] = useState({ easy: 0, good: 0, hard: 0, again: 0 });
  const timerRef = useRef(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Generate flashcards from notes (supports multiple cards)
  useEffect(() => {
    if (notes) {
      // Split by "---" to get multiple flashcards
      const cardSections = notes.split('---').map(s => s.trim()).filter(s => s);
      
      const generatedCards = cardSections.map((section, index) => {
        // Try to split the string based on our custom labels
        const questionMatch = section.match(/Question: ([\s\S]*?)\nAnswer:/);
        const answerMatch = section.match(/Answer: ([\s\S]*)/);

        // Extract the text or use fallbacks if the format is wrong
        const questionText = questionMatch ? questionMatch[1].trim() : "No question found";
        const answerText = answerMatch ? answerMatch[1].trim() : section;

        return {
          id: index,
          question: questionText,
          answer: answerText,
          difficulty: 'medium'
        };
      }).filter(card => card.question !== "No question found");

      // Shuffle the cards for randomized order
      const shuffledCards = [...generatedCards].sort(() => Math.random() - 0.5);
      setCards(shuffledCards);
      
      // Load history from localStorage
      const savedHistory = localStorage.getItem('flashcardHistory');
      if (savedHistory) {
        setCardHistory(JSON.parse(savedHistory));
      }
    }
  }, [notes]);

  // Timer effect for session duration
  useEffect(() => {
    if (!isSessionComplete) {
      timerRef.current = setInterval(() => {
        setElapsedTime(Math.floor((new Date() - sessionStartTime) / 1000));
      }, 1000);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isSessionComplete, sessionStartTime]);

  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const nextCard = () => {
    if (currentCardIndex < cards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setShowAnswer(false);
      setIsFlipped(false);
    }
  };

  const prevCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
      setShowAnswer(false);
      setIsFlipped(false);
    }
  };

  const flipCard = () => {
    setIsFlipped(!isFlipped);
    setShowAnswer(!showAnswer);
  };

  const rateCard = (rating) => {
    const currentCard = cards[currentCardIndex];
    const newHistoryEntry = {
      cardId: currentCard.id,
      question: currentCard.question,
      answer: currentCard.answer,
      rating: rating,
      timestamp: new Date().toISOString()
    };
    
    const updatedHistory = [...cardHistory, newHistoryEntry];
    setCardHistory(updatedHistory);
    
    // Update session stats
    setSessionStats(prev => ({
      ...prev,
      [rating]: (prev[rating] || 0) + 1
    }));
    
    // Save to localStorage
    localStorage.setItem('flashcardHistory', JSON.stringify(updatedHistory));
    
    console.log(`Card ${currentCardIndex} rated: ${rating}`);
    
    // Check if this was the last card
    if (currentCardIndex === cards.length - 1) {
      // Session complete - show finished screen
      setIsSessionComplete(true);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      // Call the callback to update progress in parent
      if (onSessionComplete) {
        onSessionComplete({
          ...sessionStats,
          [rating]: (sessionStats[rating] || 0) + 1,
          duration: formatTime(elapsedTime),
          totalCards: cards.length
        });
      }
    } else {
      nextCard();
    }
  };

  if (cards.length === 0) {
    return (
      <div className="app-page app-page--flashcards">
        <motion.div
          className="app-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <button onClick={onBack} className="btn btn-ghost mb-4">
            ← Back to Dashboard
          </button>
          <h2 className="app-heading">No Flashcards Available</h2>
          <p>Please add some notes first to generate flashcards.</p>
        </motion.div>
      </div>
    );
  }

  const currentCard = cards[currentCardIndex];

  // Finished screen component
  const renderFinishedScreen = () => {
    const totalCards = sessionStats.easy + sessionStats.good + sessionStats.hard + sessionStats.again;
    
    return (
      <motion.div
        className="app-card"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        style={{ maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}
      >
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
        <h2 className="app-heading" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Session Complete!</h2>
        <p style={{ color: '#64748b', marginBottom: '2rem' }}>Great job completing your study session</p>
        
        {/* Session Stats */}
        <div style={{ 
          background: '#f8fafc', 
          borderRadius: '1rem', 
          padding: '1.5rem', 
          marginBottom: '1.5rem' 
        }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1rem', color: '#1e293b' }}>
            Session Summary
          </h3>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)', 
            gap: '1rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{ 
              background: 'white', 
              padding: '1rem', 
              borderRadius: '0.5rem',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ fontSize: '2rem', fontWeight: '800', color: '#10b981' }}>
                {sessionStats.easy}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Easy</div>
            </div>
            
            <div style={{ 
              background: 'white', 
              padding: '1rem', 
              borderRadius: '0.5rem',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ fontSize: '2rem', fontWeight: '800', color: '#3b82f6' }}>
                {sessionStats.good}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Good</div>
            </div>
            
            <div style={{ 
              background: 'white', 
              padding: '1rem', 
              borderRadius: '0.5rem',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ fontSize: '2rem', fontWeight: '800', color: '#f59e0b' }}>
                {sessionStats.hard}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Hard</div>
            </div>
            
            <div style={{ 
              background: 'white', 
              padding: '1rem', 
              borderRadius: '0.5rem',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ fontSize: '2rem', fontWeight: '800', color: '#ef4444' }}>
                {sessionStats.again}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Again</div>
            </div>
          </div>
          
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            gap: '0.5rem',
            padding: '1rem',
            background: 'white',
            borderRadius: '0.5rem',
            border: '1px solid #e2e8f0'
          }}>
            <span style={{ fontSize: '1.5rem' }}>⏱️</span>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#1e293b' }}>
                {formatTime(elapsedTime)}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Total Time</div>
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button 
            onClick={onBack}
            className="btn btn-secondary"
          >
            Back to Dashboard
          </button>
        </div>
      </motion.div>
    );
  };

  // If session is complete, show finished screen
  if (isSessionComplete) {
    return (
      <div className="app-page app-page--flashcards">
        {renderFinishedScreen()}
      </div>
    );
  }

  return (
    <div className="app-page app-page--flashcards">
      <motion.div
        className="flashcards-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flashcards-header">
          <button onClick={onBack} className="btn btn-ghost">
            ← Back to Dashboard
          </button>
          <div className="flashcards-progress">
            <span>{currentCardIndex + 1} / {cards.length}</span>
          </div>
        </div>

        <motion.div
          className="flashcard"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          onClick={flipCard}
          style={{ cursor: 'pointer' }}
        >
          <motion.div
            className="flashcard-inner"
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={{ duration: 0.6 }}
            style={{ transformStyle: 'preserve-3d' }}
          >
            <div className="flashcard-front">
              <h3>Question</h3>
              <p>{currentCard.question}</p>
              <div className="flashcard-hint">Click to reveal answer</div>
            </div>
            <div className="flashcard-back">
              <h3>Answer</h3>
              <p>{currentCard.answer}</p>
            </div>
          </motion.div>
        </motion.div>

        <div className="flashcard-controls">
          <button
            onClick={prevCard}
            disabled={currentCardIndex === 0}
            className="btn btn-secondary"
          >
            ← Previous
          </button>

          {isFlipped ? (
            <div className="flashcard-rating">
              <span>How well did you know this?</span>
              <div className="rating-buttons">
                <button onClick={() => rateCard('again')} className="btn-rating btn-rating--again">
                  Again
                </button>
                <button onClick={() => rateCard('hard')} className="btn-rating btn-rating--hard">
                  Hard
                </button>
                <button onClick={() => rateCard('good')} className="btn-rating btn-rating--good">
                  Good
                </button>
                <button onClick={() => rateCard('easy')} className="btn-rating btn-rating--easy">
                  Easy
                </button>
              </div>
            </div>
          ) : (
            <div className="flashcard-rating">
              <span className="text-gray-400 text-sm">Click the card to reveal answer</span>
            </div>
          )}

          <button
            onClick={nextCard}
            disabled={currentCardIndex === cards.length - 1}
            className="btn btn-secondary"
          >
            Next →
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Flashcards;