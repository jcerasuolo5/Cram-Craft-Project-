import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const Flashcards = ({ notes, onBack }) => {
  const [cards, setCards] = useState([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);

  // Generate flashcards from notes (simplified for now)
  useEffect(() => {
    if (notes) {
      // 1. Try to split the string based on our custom labels
      const questionMatch = notes.match(/Question: ([\s\S]*?)\nAnswer:/);
      const answerMatch = notes.match(/Answer: ([\s\S]*)/);

      // 2. Extract the text or use fallbacks if the format is wrong
      const questionText = questionMatch ? questionMatch[1].trim() : "No question found";
      const answerText = answerMatch ? answerMatch[1].trim() : notes;

      // 3. Create a single card (or multiple if you expand this later)
      const generatedCards = [{
        id: 0,
        question: questionText,
        answer: answerText,
        difficulty: 'medium'
      }];

      setCards(generatedCards);
    }
  }, [notes]);

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
    // Here you could implement spaced repetition logic
    console.log(`Card ${currentCardIndex} rated: ${rating}`);
    nextCard();
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