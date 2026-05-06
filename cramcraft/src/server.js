const express = require('express');
const multer = require('multer');
const { PDFParse } = require('pdf-parse');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Function to extract Q&A from text
function extractQuestionsAndAnswers(text) {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line);

  const flashcards = [];
  let currentQuestion = null;
  let currentAnswers = [];

  for (const line of lines) {
    // Check if line starts with a number followed by period (question)
    if (/^\d+\./.test(line)) {
      // If we have a previous question with answers, save it
      if (currentQuestion && currentAnswers.length > 0) {
        flashcards.push({
          question: currentQuestion,
          answer: currentAnswers.join(' ')
        });
      }
      // Start new question
      currentQuestion = line;
      currentAnswers = [];
    }
    // Check if line starts with a letter followed by period (answer)
    else if (/^[a-z]\./i.test(line)) {
      currentAnswers.push(line);
    }
    // If it's continuation of question or answer
    else if (currentQuestion) {
      if (currentAnswers.length > 0) {
        // Continuation of last answer
        currentAnswers[currentAnswers.length - 1] += ' ' + line;
      } else {
        // Continuation of question
        currentQuestion += ' ' + line;
      }
    }
  }

  // Don't forget the last Q&A pair
  if (currentQuestion && currentAnswers.length > 0) {
    flashcards.push({
      question: currentQuestion,
      answer: currentAnswers.join(' ')
    });
  }

  return flashcards;
}

// Generic route to handle file uploads and parse the content
app.post('/upload-file', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileName = req.file.originalname.toLowerCase();
    const isPDF = req.file.mimetype === 'application/pdf' || fileName.endsWith('.pdf');

    let text;
    if (isPDF) {
      const pdfParser = new PDFParse({ data: req.file.buffer });
      const pdfData = await pdfParser.getText();
      text = pdfData.text;
    } else {
      text = req.file.buffer.toString('utf-8');
    }

    const flashcards = extractQuestionsAndAnswers(text);
    res.json({ flashcards });
  } catch (error) {
    console.error('Error processing upload:', error);
    const errorMessage = error.message || 'Unexpected server error';
    res.status(500).json({ error: `Failed to process file: ${errorMessage}` });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});