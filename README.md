# English Tutor Bot

A Telegram AI English tutor for Myanmar learners. It uses Google Gemini for text and voice conversations, offers a teacher-led Beginner Speaking Course and IELTS Examiner mode, translates English text and subtitle files into Burmese, and supports a daily free limit with optional Premium accounts.

## Features

The bot supports `/start`, `/help`, `/mode`, `/course`, `/lesson`, `/nextlesson`, `/progress`, `/resetcourse`, `/myid`, and the admin-only `/upgrade USER_ID DAYS` commands. Users can send text or Telegram voice messages. In Translator mode, users can also upload `.srt`, `.vtt`, or `.txt` files; subtitle timestamps and block formatting are preserved by the translation prompt. Normal Tutor and IELTS modes can return both text and English voice replies.

### Beginner Speaking Course

The `/course` command starts or resumes a 12-lesson path from greetings and introductions through daily routines, questions, shopping, directions, and a final real-life conversation. Each lesson contains a clear goal, short explanation, examples, a practice challenge, and a model answer. Learners can reply with text or voice; Gemini gives encouragement, corrected English, a simple Burmese explanation, a pronunciation tip, and one sentence to repeat. The learner controls progression by sending `/nextlesson` after practicing. `/progress` shows completed lessons and practice attempts, while `/lesson` repeats the current lesson and `/resetcourse` starts the path again from Lesson 1.

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
| `course_progress` | Current lesson, completed lessons, practice attempts, and speaking attempts |

Usage increments use a Firestore transaction, preventing simultaneous requests from bypassing the daily limit.

## Security notes

Keep `.env`, Firebase service-account JSON, and API keys outside version control. The repository includes `.env.example` for documentation while ignoring real `.env` files. Change `ADMIN_ID` to your own Telegram numeric ID before deployment. Restrict the Firebase service account to the minimum permissions required by Firestore.

## Project structure

```text
index.js                  Application entrypoint and health endpoint
src/config.js             Environment configuration and validation
src/bot/handlers.js       Telegram commands, course, text, voice, and document handlers
src/course/content.js     12-lesson beginner speaking syllabus
src/course/teacher.js     Teacher-style lesson and practice prompts
src/ai/gemini.js          Gemini personas and text/audio generation
src/database/firebase.js  Firestore persistence and in-memory local fallback
check.js                  Gemini model availability checker
```
