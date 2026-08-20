# English Tutor Bot

A Telegram AI English tutor for Myanmar learners. It uses Google Gemini for text and voice conversations, offers a complete teacher-led English Speaking Academy from absolute beginner to Advanced/Pro, preserves the original Beginner Speaking Course, supports IELTS and translation modes, and includes daily usage controls with optional Premium accounts.

## Features

The bot supports `/start`, `/help`, `/mode`, `/course`, `/lesson`, `/nextlesson`, `/progress`, `/resetcourse`, `/myid`, and the admin-only `/upgrade USER_ID DAYS` commands. Users can send text or Telegram voice messages. In Translator mode, users can also upload `.srt`, `.vtt`, or `.txt` files; subtitle timestamps and block formatting are preserved by the translation prompt. Normal Tutor and IELTS modes can return both text and English voice replies.

### English Speaking Academy

The `/academy` command starts a placement interview and then teaches the learner through six levels: Starter (A0), Elementary (A1), Pre-Intermediate (A2), Intermediate (B1), Upper-Intermediate (B2), and Advanced/Pro (C1+). The curriculum contains 36 structured lessons with grammar, vocabulary, speaking objectives, realistic tasks, checkpoint assessments, review, points, practice streaks, role-play, pronunciation coaching, and a final Pro assessment. Starter and Elementary are available as the free path; Pre-Intermediate through Advanced/Pro are Premium levels.

The bot now displays Burmese-labeled quick-action buttons after `/start` and `/help`. The main keyboard provides Speaking Academy, Academy Levels, Beginner Course, My Progress, Tutor Mode, Help, My ID, and Privacy controls. When an Academy lesson is shown, the keyboard changes to lesson, next lesson, progress, review, role-play, lesson quiz, Learning Coach, Daily Study Plan, Word Bank, Pronunciation Coach, Skill Report, assessment, certificate, and main-menu buttons. Each button safely routes to the corresponding command, so users do not need to type slash commands.

Learners can answer every lesson with text or voice. Gemini acts as a teacher rather than only a chat partner: it explains the target language, corrects the learner, gives Burmese guidance where useful, provides pronunciation and fluency tips, asks a follow-up question, and waits for the learner to choose when to continue. Placement is adaptive, while Premium gating prevents a free account from entering paid levels without an active Premium entitlement.

Use `/levels` to view the curriculum, `/academylesson` to repeat the current lesson, `/academyquiz` to receive a fresh four-option question based on the current lesson, `/coach` to ask the English Learning Coach for advice or corrections, `/dailyplan` to generate or view today's level-based study plan, `/nextacademylesson` to complete a lesson, `/academyprogress` to view points, streak, quiz accuracy, daily-plan completion, and progress, `/academyreview` to revisit a completed lesson, `/academyassessment` to take a checkpoint, `/academyroleplay` to practice realistic conversation, `/academycertificate` after completing the full path, and `/academyreset` to begin again.

Each quiz question is generated for the learner's current level and lesson. The bot checks the selected answer, explains why it is correct or incorrect in Burmese, gives a repeat example, tracks quiz accuracy and streak, and can generate another question without repeating the recent question history. The Learning Coach stays in a continuous session so the learner can ask about speaking practice, grammar, vocabulary, pronunciation, study plans, or any English-learning difficulty by text or voice.

The Daily Study Plan uses the learner's current level, lesson objective, quiz results, speaking attempts, previous streak, and recent plan completion to generate four or five measurable tasks for the current day. The tasks cover a balanced mix of speaking, listening/shadowing, vocabulary, grammar, and review with estimated minutes. Each task has a button that marks it complete and awards progress points; the plan is persisted for the day so reopening `/dailyplan` does not generate a new plan unnecessarily.

The Word Bank automatically collects vocabulary from Academy lessons and schedules words with spaced repetition intervals of 1, 3, 7, 14, 30, and 60 days. `/wordbank` shows total, due, and mastered words; the review buttons create a level-appropriate activity and update each word's next due date after an answer. `/pronunciation` opens a voice-only coaching session that scores clarity, records useful sound issues, and gives a repeat task. `/skillreport` summarizes grammar, vocabulary, speaking, fluency, pronunciation, and consistency scores from the learner's stored evidence. These scores are learning indicators and are not official exam results.

`/tracks` lets learners choose a focused path: General English and Travel English are free paths, while IELTS Speaking, TOEFL Speaking, Business English, and Job Interview are Premium paths. The selected track is persisted and is passed into Coach guidance, role-play context, quizzes, and Daily Study Plan generation so the practice stays aligned with the learner's goal.

Privacy controls are available through `/privacy`, `/exportdata`, and `/deletedata`. Export returns the stored profile and learning records; deletion requires an explicit confirmation button and removes the user mode, Premium record, original course progress, Academy progress, Word Bank, diagnostics, quizzes, and daily plans. The deletion path is designed as a user-controlled data lifecycle feature rather than an automatic destructive action.

The configured admin account also has a Teacher Center. `/classroom_create CLASS_NAME` creates a classroom and returns a six-character join code. Students join with `/classroom_join CODE`; `/classroom` lists the learner's classes, while `/classroom_dashboard CODE` shows student count, active learners, average completion, level, quiz accuracy, points, speaking activity, and streak. The classroom dashboard reads Academy progress only and keeps payment manual through the existing `/upgrade USER_ID DAYS` command.

`/livevoice` opens a Premium multi-turn voice conversation. The learner sends voice messages, the AI replies naturally with one short coaching note and a follow-up question, and the session remains active until `/endlive`. This is a reliable Telegram voice-turn workflow rather than a browser WebRTC call; it works with the existing Gemini audio integration and persists the number of turns and speaking activity.

### Original Beginner Speaking Course

The `/course` command remains available as a lighter 12-lesson path from greetings and introductions through daily routines, questions, shopping, directions, and a final real-life conversation. It is useful for learners who want a short path instead of the full Academy.

User modes, Premium status, and daily usage are stored in Firestore when Firebase credentials are configured. If Firebase credentials are absent, the bot starts with an in-memory fallback so it remains usable for local testing, but usage and Premium data will be lost when the process restarts.

## Requirements

Node.js 18 or newer is recommended because the project uses the built-in `fetch` API. You also need a Telegram bot token from BotFather and a Gemini API key from Google AI Studio. Firestore credentials are recommended for production so Premium and usage data persist.

## Local setup

```bash
npm install
cp .env.example .env
```

Edit `.env` and provide at least:

```env
BOT_TOKEN=your_telegram_bot_token
GEMINI_API_KEY=your_gemini_api_key
ADMIN_ID=your_telegram_user_id
```

For persistent Firebase storage, choose one credential method. The safest deployment option is a host secret containing the complete JSON:

```env
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account", "project_id":"..."}
```

A base64-encoded JSON secret is also supported:

```env
FIREBASE_SERVICE_ACCOUNT_BASE64=...
```

For local development only, you may place the service-account file at `firebase-key.json` in the project root, or set `FIREBASE_SERVICE_ACCOUNT_FILE` to another ignored path. Never commit service-account JSON or API tokens.

## Run

```bash
npm start
```

For development with automatic restart:

```bash
npm run dev
```

To list Gemini models available to your API key:

```bash
npm run check
```

The health endpoint is available at `http://localhost:3000/` or the port specified by `PORT`.

## Render deployment

Create a Render Web Service connected to this repository. Use `npm install` as the build command and `npm start` as the start command. Add `BOT_TOKEN`, `GEMINI_API_KEY`, `ADMIN_ID`, and `FIREBASE_SERVICE_ACCOUNT_JSON` as Render environment secrets. Render supplies `PORT` automatically. The service health endpoint is `/`.

Telegram polling requires only one running instance of the bot. Do not run the same bot token in two production services at the same time, or Telegram will reject one polling connection.

## Firestore collections

The bot uses the following collections:

| Collection | Purpose |
|---|---|
| `users` | Premium status, Premium expiry, and the user's selected mode |
| `user_daily_usage` | Per-user UTC date and request count for the free limit |
| `course_progress` | Current lesson, completed lessons, practice attempts, and speaking attempts for the original course |
| `academy_progress` | Placement, CEFR level, current lesson, completed lessons, points, streaks, assessments, role-play, quiz state/statistics, Learning Coach session state, daily-plan completion, Word Bank, pronunciation diagnostics, skill scores, selected track, and live-voice session state |
| `classrooms` | Teacher-owned classroom metadata, join codes, and student Telegram IDs for progress dashboards |

Usage increments use a Firestore transaction, preventing simultaneous requests from bypassing the daily limit.

## Security notes

Keep `.env`, Firebase service-account JSON, and API keys outside version control. The repository includes `.env.example` for documentation while ignoring real `.env` files. Change `ADMIN_ID` to your own Telegram numeric ID before deployment. Restrict the Firebase service account to the minimum permissions required by Firestore.

## Project structure

```text
index.js                  Application entrypoint and health endpoint
src/config.js             Environment configuration and validation
src/bot/handlers.js       Telegram commands, course, text, voice, and document handlers
src/course/content.js     Original 12-lesson beginner speaking syllabus
src/course/teacher.js      Original course teacher prompts
src/academy/curriculum.js  Six-level, 36-lesson Starter-to-Pro curriculum
src/academy/teacher.js     Placement, lesson, quiz, coach, daily-plan, Word Bank review, pronunciation, assessment, role-play, and feedback prompts
src/academy/learning.js     Spaced repetition scheduling and skill-score helpers
src/academy/tracks.js      Free and Premium learning-track catalog
src/classroom/classroom.js Classroom codes and student-summary helpers
src/ai/gemini.js            Gemini personas and text/audio generation
src/database/firebase.js   Firestore persistence and in-memory local fallback
check.js                  Gemini model availability checker
```
