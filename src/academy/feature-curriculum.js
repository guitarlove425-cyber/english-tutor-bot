const FEATURE_TASKS = Object.freeze({
    quiz: [
        { levelId: 'starter', title: 'Information exchange', task: 'Choose the correct phrase for introducing yourself and asking a name.', outcome: 'recognise a basic question-and-answer pair' },
        { levelId: 'elementary', title: 'Appointment choice', task: 'Choose the phrase that confirms a time and place politely.', outcome: 'select practical scheduling language' },
        { levelId: 'pre-intermediate', title: 'Travel repair', task: 'Choose the response that explains a delay and asks for a solution.', outcome: 'match a problem to an effective request' },
        { levelId: 'intermediate', title: 'Evidence and opinion', task: 'Choose the sentence that separates a reported fact from an opinion.', outcome: 'notice cautious evidence language' },
        { levelId: 'upper-intermediate', title: 'Professional register', task: 'Choose the most appropriate formal response to a workplace concern.', outcome: 'distinguish tone and register' },
        { levelId: 'advanced-pro', title: 'Argument structure', task: 'Choose the sentence that acknowledges a counterargument before defending a position.', outcome: 'recognise strategic persuasive language' },
        { levelId: 'starter', title: 'Classroom repair', task: 'Choose the phrase that asks for repetition or clarification politely.', outcome: 'recognise survival classroom language' },
        { levelId: 'elementary', title: 'Message detail', task: 'Choose the sentence that gives a clear time, place, and action.', outcome: 'select complete everyday information' },
        { levelId: 'pre-intermediate', title: 'Plan adjustment', task: 'Choose the most natural way to change a plan and give a reason.', outcome: 'select flexible future language' },
        { levelId: 'intermediate', title: 'Meeting decision', task: 'Choose the sentence that summarizes an agreed action and deadline.', outcome: 'recognise decision language' },
        { levelId: 'upper-intermediate', title: 'Cautious interpretation', task: 'Choose the statement that separates evidence from an uncertain conclusion.', outcome: 'identify responsible academic wording' },
        { levelId: 'advanced-pro', title: 'Audience and stance', task: 'Choose the wording that is firm but diplomatic for a senior audience.', outcome: 'distinguish strategic tone' }
    ],
    coach: [
        { levelId: 'starter', title: 'Confidence builder', task: 'Practise a three-line introduction with a sentence starter and one repeat.', outcome: 'speak without translating every word' },
        { levelId: 'elementary', title: 'Daily choice', task: 'Describe one habit, one exception, and one plan using simple connectors.', outcome: 'connect short sentences naturally' },
        { levelId: 'pre-intermediate', title: 'Problem and solution', task: 'Explain an everyday problem, ask for help, and confirm a solution.', outcome: 'complete a practical interaction' },
        { levelId: 'intermediate', title: 'Fluency ladder', task: 'Give a one-minute opinion with a reason, example, and follow-up answer.', outcome: 'develop organised spontaneous speech' },
        { levelId: 'upper-intermediate', title: 'Precision clinic', task: 'Rewrite a vague workplace message using a clear request and a softener.', outcome: 'increase pragmatic precision' },
        { levelId: 'advanced-pro', title: 'Audience control', task: 'Give the same proposal to an expert and a general audience using different wording.', outcome: 'adapt register and explanation depth' },
        { levelId: 'starter', title: 'Question confidence', task: 'Ask and answer three basic questions without reading a full script.', outcome: 'build independent first-turn confidence' },
        { levelId: 'elementary', title: 'Polite repair', task: 'Practise apologizing, explaining a simple problem, and asking for help.', outcome: 'repair a routine interaction' },
        { levelId: 'pre-intermediate', title: 'Experience retell', task: 'Retell a recent experience with a clear sequence and one reaction.', outcome: 'connect past events naturally' },
        { levelId: 'intermediate', title: 'Reasoned opinion', task: 'Give an opinion, a reason, an example, and a respectful question.', outcome: 'sustain a balanced turn' },
        { levelId: 'upper-intermediate', title: 'Diplomatic revision', task: 'Turn a direct complaint into a constructive professional request.', outcome: 'control interpersonal impact' },
        { levelId: 'advanced-pro', title: 'Facilitator move', task: 'Reframe two viewpoints and guide the group toward a decision.', outcome: 'lead interaction strategically' }
    ],
    dailyPlan: [
        { levelId: 'starter', title: 'First-contact routine', task: 'Practise greeting, spelling, one request, and one short listening recall.', outcome: 'complete four small foundation actions' },
        { levelId: 'elementary', title: 'Everyday logistics', task: 'Arrange a time, write a message, practise a route, and review quantities.', outcome: 'use English for routine coordination' },
        { levelId: 'pre-intermediate', title: 'Independent errands', task: 'Plan a trip, solve a service problem, and retell what happened.', outcome: 'manage a connected everyday task' },
        { levelId: 'intermediate', title: 'Workplace communication', task: 'Summarise information, make a suggestion, and give a short update.', outcome: 'communicate clearly in a team context' },
        { levelId: 'upper-intermediate', title: 'Persuasive practice', task: 'Analyse a claim, present a proposal, and revise the tone of a formal email.', outcome: 'combine accuracy with audience awareness' },
        { levelId: 'advanced-pro', title: 'Strategic communication', task: 'Synthesize viewpoints, lead a decision, and reflect on rhetorical choices.', outcome: 'control extended professional discourse' },
        { levelId: 'starter', title: 'Sound and word review', task: 'Repeat a short phrase, recall two words, and use them in one sentence.', outcome: 'combine small practice actions' },
        { levelId: 'elementary', title: 'Useful message day', task: 'Write a schedule update, read it aloud, and check three details.', outcome: 'make daily practice measurable' },
        { levelId: 'pre-intermediate', title: 'Problem-solving day', task: 'Practise a service problem, a future plan, and a short reflection.', outcome: 'combine connected practical language' },
        { levelId: 'intermediate', title: 'Team communication day', task: 'Summarise a task, make one suggestion, and record an action point.', outcome: 'communicate in an organised team context' },
        { levelId: 'upper-intermediate', title: 'Proposal refinement day', task: 'Compare two options and revise a proposal for a specific audience.', outcome: 'combine evidence and register' },
        { levelId: 'advanced-pro', title: 'Leadership practice day', task: 'Synthesize a viewpoint, deliver a briefing, and reflect on audience response.', outcome: 'integrate high-level communication skills' }
    ],
    wordReview: [
        { levelId: 'starter', title: 'Picture-to-sentence recall', task: 'Use a familiar object word in a sentence with this or that.', outcome: 'retrieve a word and place it in a basic sentence' },
        { levelId: 'elementary', title: 'Useful collocations', task: 'Match a service word with a natural verb and use it in a request.', outcome: 'remember words with their common partners' },
        { levelId: 'pre-intermediate', title: 'Travel vocabulary in context', task: 'Use three travel words to explain a change or problem.', outcome: 'retrieve vocabulary under communicative pressure' },
        { levelId: 'intermediate', title: 'Abstract word families', task: 'Use a noun, verb, or adjective form to summarise a workplace issue.', outcome: 'extend vocabulary control beyond isolated words' },
        { levelId: 'upper-intermediate', title: 'Academic collocations', task: 'Use two evidence words in a cautious comparison.', outcome: 'apply precise collocations in formal language' },
        { levelId: 'advanced-pro', title: 'Idiomatic precision', task: 'Choose an idiom or discourse marker that fits the intended tone.', outcome: 'use natural expressions without forcing them' },
        { levelId: 'starter', title: 'Classroom words', task: 'Use three classroom words in short requests and responses.', outcome: 'retrieve words for learning interaction' },
        { levelId: 'elementary', title: 'Home and town words', task: 'Use location and household words to describe a route or room.', outcome: 'use vocabulary with place relationships' },
        { levelId: 'pre-intermediate', title: 'Travel collocations', task: 'Use three travel collocations in a booking or delay conversation.', outcome: 'retrieve practical word partnerships' },
        { levelId: 'intermediate', title: 'Workplace word families', task: 'Use related noun and verb forms to explain a team task.', outcome: 'extend lexical flexibility' },
        { levelId: 'upper-intermediate', title: 'Evidence language', task: 'Use precise academic words to compare two claims cautiously.', outcome: 'improve lexical precision' },
        { levelId: 'advanced-pro', title: 'Register choices', task: 'Choose formal, neutral, or conversational vocabulary for three audiences.', outcome: 'adapt word choice to context' }
    ],
    pronunciation: [
        { levelId: 'starter', title: 'Final sounds', task: 'Practise clear final consonants in short words and names.', outcome: 'make short words easier to understand' },
        { levelId: 'elementary', title: 'Word stress', task: 'Hear and repeat stress in common two-syllable everyday words.', outcome: 'make important syllables clearer' },
        { levelId: 'pre-intermediate', title: 'Sentence rhythm', task: 'Shadow a short request with natural stress on key words.', outcome: 'avoid equal stress on every word' },
        { levelId: 'intermediate', title: 'Connected speech', task: 'Practise linking words in a short workplace sentence.', outcome: 'sound smoother without speaking too fast' },
        { levelId: 'upper-intermediate', title: 'Contrastive stress', task: 'Change the stressed word to correct a misunderstanding politely.', outcome: 'use stress to repair meaning' },
        { levelId: 'advanced-pro', title: 'Prosodic control', task: 'Deliver one sentence with a confident, cautious, and diplomatic intonation.', outcome: 'control stance through voice' },
        { levelId: 'starter', title: 'Question intonation', task: 'Listen to and repeat a simple question with clear final intonation.', outcome: 'make a basic question easy to understand' },
        { levelId: 'elementary', title: 'Polite stress', task: 'Stress the key word in a request and keep the other words lighter.', outcome: 'sound clearer and more polite' },
        { levelId: 'pre-intermediate', title: 'Past-tense endings', task: 'Practise common past-tense endings in a short experience story.', outcome: 'make time meaning clearer' },
        { levelId: 'intermediate', title: 'Chunking for fluency', task: 'Pause between meaning groups in a short explanation.', outcome: 'speak in clear thought groups' },
        { levelId: 'upper-intermediate', title: 'Correction stress', task: 'Use contrastive stress to correct one misunderstood detail.', outcome: 'repair meaning with voice control' },
        { levelId: 'advanced-pro', title: 'Leadership presence', task: 'Deliver a short opening with controlled pace, pause, and emphasis.', outcome: 'sound confident without rushing' }
    ],
    liveVoice: [
        { levelId: 'starter', title: 'Meeting someone', task: 'Introduce yourself, ask one simple question, and respond to a greeting.', outcome: 'complete three turns with support' },
        { levelId: 'elementary', title: 'Making a plan', task: 'Choose an activity, arrange a time, and change the plan once.', outcome: 'maintain a short practical conversation' },
        { levelId: 'pre-intermediate', title: 'Travel support', task: 'Explain a travel problem, ask two questions, and confirm the next step.', outcome: 'manage a service interaction' },
        { levelId: 'intermediate', title: 'Work discussion', task: 'Give an opinion, support it with an example, and ask a follow-up question.', outcome: 'take a balanced conversational turn' },
        { levelId: 'upper-intermediate', title: 'Negotiation call', task: 'State a priority, make a concession, and propose a workable agreement.', outcome: 'use turn-taking and negotiation language' },
        { levelId: 'advanced-pro', title: 'Strategic interview', task: 'Answer a challenging question, qualify your claim, and invite another perspective.', outcome: 'sustain nuanced interaction' },
        { levelId: 'starter', title: 'Class welcome', task: 'Greet a new classmate, ask a name, and say one friendly closing.', outcome: 'complete a safe three-turn exchange' },
        { levelId: 'elementary', title: 'Errand planning', task: 'Plan a simple errand and change one detail after a follow-up question.', outcome: 'keep a practical conversation moving' },
        { levelId: 'pre-intermediate', title: 'Booking conversation', task: 'Make a booking, ask for a detail, and confirm the final arrangement.', outcome: 'manage a multi-turn service exchange' },
        { levelId: 'intermediate', title: 'Opinion follow-up', task: 'State a view, respond to a challenge, and ask for another perspective.', outcome: 'develop interactive discussion' },
        { levelId: 'upper-intermediate', title: 'Concession call', task: 'State a business priority, make one concession, and confirm an agreement.', outcome: 'negotiate with controlled turn-taking' },
        { levelId: 'advanced-pro', title: 'Panel response', task: 'Answer a complex question, qualify the claim, and connect it to a wider impact.', outcome: 'sustain advanced spontaneous speaking' }
    ],
    roleplay: [
        { levelId: 'starter', title: 'Help at a station', task: 'Ask where a place is and thank the helper.', outcome: 'use a polite question and closing' },
        { levelId: 'elementary', title: 'Café correction', task: 'Order an item, notice a mistake, and ask for a correction politely.', outcome: 'complete a service repair' },
        { levelId: 'pre-intermediate', title: 'Hotel change', task: 'Explain a booking issue and negotiate a small change.', outcome: 'solve a travel problem with polite language' },
        { levelId: 'intermediate', title: 'Team meeting', task: 'Suggest a solution, respond to another idea, and agree on an action.', outcome: 'collaborate toward a decision' },
        { levelId: 'upper-intermediate', title: 'Client proposal', task: 'Present a benefit, address a concern, and confirm next steps.', outcome: 'persuade with professional register' },
        { levelId: 'advanced-pro', title: 'Stakeholder mediation', task: 'Reframe disagreement, acknowledge interests, and build a shared proposal.', outcome: 'manage delicate communication strategically' },
        { levelId: 'starter', title: 'Lost-and-found help', task: 'Ask for help finding a simple object and confirm the answer.', outcome: 'complete a polite survival scenario' },
        { levelId: 'elementary', title: 'Service choice', task: 'Choose an item, ask one question, and respond to a small problem.', outcome: 'use practical service language' },
        { levelId: 'pre-intermediate', title: 'Travel recovery', task: 'Explain a delay, suggest an option, and agree on the next step.', outcome: 'solve a realistic travel issue' },
        { levelId: 'intermediate', title: 'Project handover', task: 'Explain progress, identify a risk, and hand over one action.', outcome: 'communicate a work update clearly' },
        { levelId: 'upper-intermediate', title: 'Client concern', task: 'Acknowledge a concern, explain the evidence, and propose a remedy.', outcome: 'maintain trust in professional interaction' },
        { levelId: 'advanced-pro', title: 'Decision mediation', task: 'Help two stakeholders find common ground while preserving a key priority.', outcome: 'mediate a complex decision' }
    ],
    diagnostic: [
        { levelId: 'starter', title: 'Foundation baseline', task: 'Identify a name, number, object, and simple personal message.', outcome: 'estimate survival communication readiness' },
        { levelId: 'elementary', title: 'Routine baseline', task: 'Understand a short schedule and write a practical reply.', outcome: 'estimate everyday communication control' },
        { levelId: 'pre-intermediate', title: 'Connected baseline', task: 'Summarise an experience and respond to a practical problem.', outcome: 'estimate connected-sentence ability' },
        { levelId: 'intermediate', title: 'Discussion baseline', task: 'State an opinion, give reasons, and identify the main point of a short talk.', outcome: 'estimate independent discussion readiness' },
        { levelId: 'upper-intermediate', title: 'Professional baseline', task: 'Interpret implied meaning and explain evidence cautiously.', outcome: 'estimate nuanced workplace communication' },
        { levelId: 'advanced-pro', title: 'Strategic baseline', task: 'Synthesize two perspectives and defend a qualified position.', outcome: 'estimate advanced interaction and mediation' },
        { levelId: 'starter', title: 'Starter follow-up', task: 'Answer a simple personal question and ask one question back.', outcome: 'estimate basic interaction readiness' },
        { levelId: 'elementary', title: 'Routine follow-up', task: 'Read a short practical message and explain the next action.', outcome: 'estimate functional comprehension' },
        { levelId: 'pre-intermediate', title: 'Experience follow-up', task: 'Describe a past event and explain one consequence.', outcome: 'estimate connected narration' },
        { levelId: 'intermediate', title: 'Discussion follow-up', task: 'Compare two choices and justify one with an example.', outcome: 'estimate reasoned production' },
        { levelId: 'upper-intermediate', title: 'Professional follow-up', task: 'Summarise a workplace issue and recommend a cautious next step.', outcome: 'estimate professional mediation' },
        { levelId: 'advanced-pro', title: 'Synthesis follow-up', task: 'Reframe a complex issue for a general audience and state a limitation.', outcome: 'estimate strategic audience control' }
    ],
    project: [
        { levelId: 'starter', title: 'Personal identity card', task: 'Create a short spoken and written profile for a new class.', outcome: 'combine basic personal information' },
        { levelId: 'elementary', title: 'Community guide', task: 'Design a simple guide to a useful place with time and route details.', outcome: 'communicate practical local information' },
        { levelId: 'pre-intermediate', title: 'Trip change plan', task: 'Write a revised itinerary and explain the change to a partner.', outcome: 'coordinate a real-life change' },
        { levelId: 'intermediate', title: 'Team improvement pitch', task: 'Identify a small workplace or study problem and propose a solution.', outcome: 'present a structured recommendation' },
        { levelId: 'upper-intermediate', title: 'Evidence-based proposal', task: 'Compare options, justify a recommendation, and answer objections.', outcome: 'persuade with evidence and register' },
        { levelId: 'advanced-pro', title: 'Public position brief', task: 'Synthesize viewpoints and defend a policy position for a mixed audience.', outcome: 'perform advanced mediation and argumentation' },
        { levelId: 'starter', title: 'Personal profile', task: 'Combine a short introduction with one goal and one question for a partner.', outcome: 'show foundation communication readiness' },
        { levelId: 'elementary', title: 'Local information task', task: 'Give route, time, and opening information for a useful place.', outcome: 'share practical information clearly' },
        { levelId: 'pre-intermediate', title: 'Change-of-plan task', task: 'Explain an original plan, a change, and the reason for the new choice.', outcome: 'show connected everyday communication' },
        { levelId: 'intermediate', title: 'Mini discussion task', task: 'Present a position, two reasons, and a response to one counterpoint.', outcome: 'show independent discussion readiness' },
        { levelId: 'upper-intermediate', title: 'Professional synthesis', task: 'Compare two recommendations and give an evidence-based conclusion.', outcome: 'show professional mediation control' },
        { levelId: 'advanced-pro', title: 'Strategic capstone task', task: 'Synthesize two perspectives, defend a position, and state a responsible next step.', outcome: 'show advanced action-oriented communication' }
    ]
});

function getFeatureTask(feature, levelId, index = 0) {
    const tasks = Array.isArray(FEATURE_TASKS[feature]) ? FEATURE_TASKS[feature] : [];
    if (!tasks.length) return null;
    const exact = tasks.filter((task) => task.levelId === String(levelId));
    const pool = exact.length ? exact : tasks;
    return pool[Math.abs(Number(index) || 0) % pool.length];
}

function featureTaskInstruction(task) {
    if (!task) return '';
    return `\nFeature-specific task (do not replace it with the core lesson task): ${task.title}. Task: ${task.task}. Intended outcome: ${task.outcome}.`;
}

function featureCoverage() {
    return Object.fromEntries(Object.entries(FEATURE_TASKS).map(([feature, tasks]) => [feature, tasks.length]));
}

module.exports = { FEATURE_TASKS, getFeatureTask, featureTaskInstruction, featureCoverage };
