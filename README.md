# English Tutor Bot

A Telegram AI English tutor for Myanmar learners. It uses Google Gemini for text and voice conversations, offers a complete teacher-led English Speaking Academy from absolute beginner to Advanced/Pro, preserves the original Beginner Speaking Course, supports IELTS and translation modes, and includes daily usage controls with optional Premium accounts. The user experience is Burmese-first: the bot gives instructions, action prompts, explanations, error messages, and navigation guidance in Burmese, while English examples, target sentences, questions, and practice answers remain in English for learning. All learning features now follow a teacher-led classroom pattern: explain the idea, model the English, check understanding, provide guided practice, ask for independent use, assess, assign homework, and schedule review.

## Features

The bot supports `/start`, `/help`, `/mode`, `/course`, `/lesson`, `/nextlesson`, `/progress`, `/resetcourse`, `/myid`, and the admin-only `/upgrade USER_ID DAYS` commands. Users can send text or Telegram voice messages. In Translator mode, users can also upload `.srt`, `.vtt`, or `.txt` files; subtitle timestamps and block formatting are preserved by the translation prompt. Normal Tutor and IELTS modes can return both text and English voice replies.

### English Speaking Academy

The `/academy` command starts a placement interview and then teaches the learner through six levels: Starter (A0), Elementary (A1), Pre-Intermediate (A2), Intermediate (B1), Upper-Intermediate (B2), and Advanced/Pro (C1+). The curriculum contains 36 structured lessons with grammar, vocabulary, speaking objectives, realistic tasks, checkpoint assessments, review, points, practice streaks, role-play, pronunciation coaching, and a final Pro assessment. Starter and Elementary are available as the free path; Pre-Intermediate through Advanced/Pro are Premium levels.

The bot now uses a Burmese-first hierarchical keyboard instead of putting every feature on one crowded screen. The main menu contains `အဆင့်လိုက်သင်ယူမယ်`, `ဒီနေ့သင်မယ်`, `လေ့ကျင့်ခန်းများ`, `My Progress`, `ကိုယ်ပိုင်လမ်းကြောင်း`, `နောက်ထပ်`, `Beginner Course`, and `အကူအညီ`. Learning, Practice, Progress, and Profile/Settings are separate submenus with a visible Home button. Existing slash commands and older labels remain routed for backward compatibility. English target material is intentionally preserved as English while navigation, instructions, and guidance remain Burmese-first.

Learners can answer every lesson with text or voice. Gemini acts as a teacher rather than only a chat partner: it explains the target language, corrects the learner, gives Burmese guidance where useful, provides pronunciation and fluency tips, asks a follow-up question, and waits for the learner to choose when to continue. Every lesson now records attempts, evidence scores, checks, best performance, weak-skill remediation notes, and a mastery state. A lesson is not marked complete merely because the learner presses a button: the learner must provide meaningful practice evidence and reach the mastery threshold, or repeat the targeted remediation. Placement is adaptive, while Premium gating prevents a free account from entering paid levels without an active Premium entitlement.

Use `/levels` to view the curriculum, `/academylesson` to repeat the current lesson, `/teacherlesson` to start the shared teacher-led phase flow, `/homework` to view and complete assigned practice, `/academyquiz` to receive a fresh four-option question based on the current lesson, `/coach` to ask the English Learning Coach for advice or corrections, `/dailyplan` to generate or view today's level-based study plan, `/nextacademylesson` to complete a lesson, `/academyprogress` to view points, streak, quiz accuracy, daily-plan completion, and progress, `/academyreview` to revisit a completed lesson, `/academyassessment` to take a checkpoint, `/academyroleplay` to practice realistic conversation, `/academycertificate` after completing the full path, and `/academyreset` to begin again.

Each quiz question is generated for the learner's current level and lesson. The bot validates that the question is non-empty, has four unique bounded options, and has a valid answer index before showing it. It checks the selected answer, explains why it is correct or incorrect in Burmese, gives a repeat example, tracks quiz accuracy and streak, and can generate another question without repeating the recent question history. The Learning Coach stays in a continuous session so the learner can ask about speaking practice, grammar, vocabulary, pronunciation, study plans, or any English-learning difficulty by text or voice.

The Daily Study Plan uses the learner's current level, lesson objective, quiz results, speaking attempts, previous streak, recent plan completion, skill report, weak skills, and lesson mastery records to generate four or five measurable tasks for the current day. The tasks cover a balanced mix of speaking, listening/shadowing, vocabulary, grammar, and review with estimated minutes. Each task has a button that marks it complete and awards progress points; the plan is persisted for the day so reopening `/dailyplan` does not generate a new plan unnecessarily. Coach text and voice prompts receive the same diagnostics, so remediation is personalized instead of generic. The adaptive Teaching Orchestrator also uses the learner's profile, skill scores, confidence, goal, and weak skills to recommend a next mode such as Confidence Builder, Pronunciation Lab, Error Clinic, Conversation Ladder, Scenario Simulation, or Exam Simulator. `/profile` creates a guided profile with goal, daily minutes, preferred practice type, and confidence. `/recommend` displays the current teacher recommendation. `/errorclinic` teaches repeated mistakes as a focused mini-class, while `/conversation` runs a four-step speaking ladder from a short answer to a two-minute response. Both new practice sessions accept text or voice.

The Word Bank automatically collects vocabulary from Academy lessons and schedules words with spaced repetition intervals of 1, 3, 7, 14, 30, and 60 days. Vocabulary review begins with a Burmese teacher note, moves through a guided question, checks the learner's answer, and assigns a speaking sentence for independent use. `/wordbank` shows total, due, and mastered words; the review buttons create a level-appropriate activity and update each word's next due date after an answer. `/pronunciation` opens a voice-only coaching session that scores clarity, records useful sound issues, and gives a repeat task. `/skillreport` summarizes grammar, vocabulary, speaking, fluency, pronunciation, and consistency scores from the learner's stored evidence. These scores are learning indicators and are not official exam results. Lesson review is also scheduled separately: `/academyreview` prioritizes the oldest due review item and falls back to the latest completed lesson when no review is due.

`/tracks` lets learners choose a focused path: General English and Travel English are free paths, while IELTS Speaking, TOEFL Speaking, Business English, and Job Interview are Premium paths. The selected track is combined with the learner profile so the Teaching Orchestrator can recommend practice that matches both the learner's goal and current evidence. The selected track is persisted and is passed into Coach guidance, role-play context, quizzes, and Daily Study Plan generation so the practice stays aligned with the learner's goal.

Privacy controls are available through `/privacy`, `/exportdata`, and `/deletedata`. Export returns the stored profile and learning records; deletion requires an explicit confirmation button and removes the user mode, Premium record, original course progress, Academy progress, Word Bank, diagnostics, quizzes, and daily plans. The deletion path is designed as a user-controlled data lifecycle feature rather than an automatic destructive action.

The configured admin account also has a Teacher Center. `/classroom_create CLASS_NAME` creates a classroom and returns a six-character join code. Students join with `/classroom_join CODE`; `/classroom` lists the learner's classes, while `/classroom_dashboard CODE` shows student count, active learners, average completion, level, quiz accuracy, points, speaking activity, and streak. The classroom dashboard reads Academy progress only and keeps payment manual through the existing `/upgrade USER_ID DAYS` command.

`/livevoice` opens a Premium multi-turn voice conversation. Each turn keeps the classroom sequence by giving a short context/model, allowing the learner to speak, giving one Burmese coaching note, and asking the next practical question. The learner sends voice messages, the AI replies naturally with one short coaching note and a follow-up question, and the session remains active until `/endlive`. This is a reliable Telegram voice-turn workflow rather than a browser WebRTC call; it works with the existing Gemini audio integration and persists the number of turns and speaking activity.

### Kids English School — Primary to Young Pro

The `/kids` command starts a separate child-friendly pathway with 30 lessons across six stages: Discovery English (Pre-A1, ages 5–7), Primary Foundations (Pre-A1–A1, ages 6–9), Elementary English (A1–A2, ages 8–11), Junior Communicator (A2–B1, ages 10–13), Academic Bridge (B1–B2, ages 12–15), and Young Pro English (B2–C1+, ages 14+). The age-band selector adjusts lesson language and difficulty; it does not request or store a child’s name, address, school, phone number, private photos, or other unnecessary personal information.

The Kids classroom begins with letter names, phonics, short vowels, sound blending, colors, and numbers. It then progresses through family, school, manners, feelings, weather, stories, questions, role-play, opinions, reading main ideas, paragraph writing, mini-presentations, projects, discussion, advanced storytelling, formal writing, presentation Q&A, and a Young Pro capstone. Each lesson stays short, uses simple Burmese instructions, preserves English target content, accepts text or voice practice, and uses the same mastery gate before allowing the next lesson.

Kids navigation is intentionally small: `📘 Kids ဒီနေ့ Lesson`, `📊 Kids တိုးတက်မှု`, `🔁 Kids Review`, and `🏠 ပင်မ Menu`. The Kids teacher uses encouragement rather than shame, asks for only age-band information, avoids unsafe or adult topics, and redirects personal or dangerous questions to a trusted adult. Progress reports use non-competitive language and include a simple at-home practice suggestion for a parent or trusted adult. Use `/kids`, `/kidslesson`, `/kidsprogress`, and `/kidsreview` to access the pathway.

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
GEMINI_MODEL=gemini-3.5-flash
# Optional: automatic fallback for temporary Gemini overloads
GEMINI_FALLBACK_MODEL=gemini-2.5-flash
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

The health endpoint is available at `http://localhost:3000/` or the port specified by `PORT`. Gemini text and audio calls retry transient `429`, `500`, `502`, `503`, and `504` responses with bounded exponential backoff. If the primary model remains temporarily unavailable, the bot automatically tries `GEMINI_FALLBACK_MODEL` (default `gemini-2.5-flash`) before returning an API error. This protects the Telegram classroom flow from temporary high-demand outages without hiding permanent credential or permission errors.

## Render deployment

Create a Render Web Service connected to this repository. Use `npm install` as the build command and `npm start` as the start command. Add `BOT_TOKEN`, `GEMINI_API_KEY`, `ADMIN_ID`, `FIREBASE_SERVICE_ACCOUNT_JSON`, and optionally `GEMINI_FALLBACK_MODEL=gemini-2.5-flash` as Render environment secrets. The recommended primary is stable `gemini-3.5-flash`; the fallback is stable `gemini-2.5-flash`. Render supplies `PORT` automatically. The service health endpoint is `/`.

Telegram polling requires only one running instance of the bot. Do not run the same bot token in two production services at the same time, or Telegram will reject one polling connection.

## Firestore collections

The bot uses the following collections:

| Collection | Purpose |
|---|---|
| `users` | Premium status, Premium expiry, and the user's selected mode |
| `user_daily_usage` | Per-user UTC date and request count for the free limit |
| `course_progress` | Current lesson, completed lessons, teacher session, homework/review state, lesson mastery evidence, practice attempts, and speaking attempts for the original course |
| `academy_progress` | Placement, CEFR level, current lesson, completed lessons, lesson mastery evidence and progression gates, teacher session, homework/review state, learner profile, adaptive recommendation, navigation state, points, streaks, assessments, role-play, quiz state/statistics, Learning Coach diagnostics, daily-plan completion, Word Bank, pronunciation diagnostics, skill scores, selected track, and live-voice session state |
| `kids_progress` | Kids age band, six-stage pathway, current lesson, completed lessons, lesson mastery evidence, teacher session, review state, practice/speaking activity, points, streak, and learner profile |
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
src/academy/teacher.js     Placement, lesson, quiz, coach, daily-plan, Word Bank review, pronunciation, assessment, role-play, teacher-phase, and feedback prompts
src/academy/session.js      Shared explain/model/check/guided/independent/assess/homework/review session framework
src/academy/learning.js     Spaced repetition, skill reports, mastery evidence, progression gates, and weak-skill helpers
src/academy/tracks.js      Free and Premium learning-track catalog
src/kids/content.js         30-lesson Discovery-to-Young-Pro Kids curriculum
src/kids/teacher.js          Child-safe Burmese-first Kids prompts
src/classroom/classroom.js Classroom codes and student-summary helpers
src/ai/gemini.js            Gemini personas and text/audio generation
src/database/firebase.js   Firestore persistence, Kids progress, and in-memory local fallback
check.js                  Gemini model availability checker
```
