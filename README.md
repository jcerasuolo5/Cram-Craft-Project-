# CramCraft
A study tool that uses different study methods to help students better prepare for class. Need to cram? Let CramCraft "craft" your success!

# Team Members
- Jasmine Cerasuolo
- Ashley Leon Cuatlayotl
- John Yohannan

# The Idea
Unlike traditional study tools, CramCraft focuses on a high-speed "Input-to-Game" loop. We minimize the friction between having notes and starting a study session.

# User Flow
Our application logic follows a strict "Game Loop" design to ensure maximum engagement and ease of use.

## Flow
1. Entry: User arrives at the landing page and is prompted to log in or sign up.
2. Authentication: New users create accounts; returning users log in to access their history.
3. The Crafting Stage: Users input raw study materials (text/files) to generate a study set.
4. The Cramming Stage: Users answer questions and complete a timed or scored study session.
5. The Loop: Upon completion, users choose to "Continue" with new material or "Leave" the app.

(insert diagrams here)

# Key Features
- Instant Study Sets: Paste your notes and start a session immediately.
- Gamified Interface: Track your "streaks" and compete against your own high scores.
- Keyboard-First Design: Study faster with hotkeys for flipping and rating cards.
- Spaced Repetition: Smart logic that surfaces difficult cards more frequently.

# Current Tech Stack
- Frontend: React.js, Tailwind CSS
- Backend: Node.js, Express
- Database: PostgreSQL/Supbase (currently a proposal, not yet implemented)
- Animations: Framer Motion

## Supabase Integration

This project is now wired to use Supabase for authentication and future data storage.

### Setup
1. Copy `cramcraft/.env.example` to `cramcraft/.env.local`.
2. In the Supabase dashboard for project **ipspkgqkzaoivbggjrpm**, go to **Settings → API** and copy the **anon key**.
3. Paste the anon key into `REACT_APP_SUPABASE_ANON_KEY`.

### Dev run
From `cramcraft/`:

```bash
npm install
npm start
```

Once the app is running, you can sign up/login using the Supabase auth flow.
