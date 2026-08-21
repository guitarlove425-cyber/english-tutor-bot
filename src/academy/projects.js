const PROJECTS = Object.freeze([
    { id: 'self_introduction', title: 'My Introduction', levelId: 'starter', task: 'Record or write a 30-second self-introduction.', skills: ['speaking', 'grammar', 'fluency'], success: 'Name, home, work/study, and one goal are clear.' },
    { id: 'daily_routine', title: 'My Daily Routine', levelId: 'elementary', task: 'Describe your daily routine in one minute.', skills: ['speaking', 'vocabulary', 'grammar'], success: 'Use sequence words and at least five understandable sentences.' },
    { id: 'travel_problem', title: 'Travel Problem Solver', levelId: 'pre-intermediate', task: 'Handle a travel delay or booking problem politely.', skills: ['speaking', 'fluency', 'vocabulary'], success: 'Explain the problem, ask for help, and confirm the solution.' },
    { id: 'mini_presentation', title: 'Mini Presentation', levelId: 'intermediate', task: 'Give a three-minute presentation about a useful topic.', skills: ['speaking', 'fluency', 'vocabulary'], success: 'Use an opening, two organized points, and a closing.' },
    { id: 'formal_proposal', title: 'Professional Proposal', levelId: 'upper-intermediate', task: 'Present a proposal and answer two follow-up questions.', skills: ['speaking', 'grammar', 'fluency'], success: 'Use clear signposting, reasons, and a practical recommendation.' },
    { id: 'pro_defense', title: 'Pro Position Defense', levelId: 'advanced-pro', task: 'Defend a position in a structured discussion.', skills: ['speaking', 'fluency', 'vocabulary'], success: 'State a position, acknowledge another view, use evidence, and conclude.' }
]);

const RUBRIC = Object.freeze(['clarity', 'grammar', 'vocabulary', 'fluency', 'pronunciation', 'taskCompletion']);
const LEVEL_ORDER = Object.freeze(['starter', 'elementary', 'pre-intermediate', 'intermediate', 'upper-intermediate', 'advanced-pro']);

function clampScore(value) {
    const score = Number(value);
    return Number.isFinite(score) ? Math.max(0, Math.min(10, Math.round(score * 10) / 10)) : 0;
}

function normalizeProjectState(state = {}) {
    const source = state && typeof state === 'object' ? state : {};
    const submissions = Array.isArray(source.submissions) ? source.submissions.slice(-30).map((item) => ({
        projectId: String(item.projectId || ''),
        scores: Object.fromEntries(RUBRIC.map((key) => [key, clampScore(item.scores?.[key])])),
        feedback: String(item.feedback || '').slice(0, 1000),
        nextTask: String(item.nextTask || '').slice(0, 500),
        completed: Boolean(item.completed),
        submittedAt: item.submittedAt || null
    })) : [];
    return {
        currentProjectId: source.currentProjectId ? String(source.currentProjectId) : null,
        submissions,
        completedProjectIds: [...new Set((Array.isArray(source.completedProjectIds) ? source.completedProjectIds : []).map(String))].slice(-30),
        lastProjectId: source.lastProjectId ? String(source.lastProjectId) : null,
        updatedAt: source.updatedAt || null
    };
}

function projectForLevel(levelId) {
    const index = Math.max(0, LEVEL_ORDER.indexOf(String(levelId)));
    return PROJECTS[Math.min(index, PROJECTS.length - 1)];
}

function getProject(projectId) {
    return PROJECTS.find((project) => project.id === String(projectId)) || null;
}

function startProject(state, projectId = null) {
    const current = normalizeProjectState(state);
    const project = getProject(projectId) || getProject(current.currentProjectId) || PROJECTS[0];
    return { ...current, currentProjectId: project.id, updatedAt: new Date().toISOString() };
}

function recordProjectSubmission(state, projectId, scores = {}, feedback = '', nextTask = '') {
    const current = normalizeProjectState(state);
    const project = getProject(projectId);
    if (!project) return current;
    const normalizedScores = Object.fromEntries(RUBRIC.map((key) => [key, clampScore(scores[key])]));
    const average = Object.values(normalizedScores).reduce((sum, score) => sum + score, 0) / RUBRIC.length;
    const completed = average >= 7 && normalizedScores.taskCompletion >= 7;
    const submission = { projectId: project.id, scores: normalizedScores, feedback: String(feedback || '').slice(0, 1000), nextTask: String(nextTask || '').slice(0, 500), completed, submittedAt: new Date().toISOString() };
    return normalizeProjectState({
        ...current,
        currentProjectId: completed ? null : project.id,
        lastProjectId: project.id,
        submissions: [...current.submissions.filter((item) => item.projectId !== project.id), submission],
        completedProjectIds: completed ? [...new Set([...current.completedProjectIds, project.id])] : current.completedProjectIds,
        updatedAt: new Date().toISOString()
    });
}

function projectReadiness(state, projectId) {
    const current = normalizeProjectState(state);
    const project = getProject(projectId || current.currentProjectId);
    if (!project) return { ready: false, project: null, average: 0, missing: RUBRIC };
    const submission = [...current.submissions].reverse().find((item) => item.projectId === project.id);
    if (!submission) return { ready: false, project, average: 0, missing: RUBRIC };
    const average = Object.values(submission.scores).reduce((sum, score) => sum + score, 0) / RUBRIC.length;
    return { ready: submission.completed, project, average: Math.round(average * 10) / 10, missing: RUBRIC.filter((key) => submission.scores[key] < 7), submission };
}

function projectSummary(state) {
    const current = normalizeProjectState(state);
    return { current: getProject(current.currentProjectId), completed: current.completedProjectIds.length, total: PROJECTS.length, submissions: current.submissions.length };
}

module.exports = { PROJECTS, RUBRIC, normalizeProjectState, projectForLevel, getProject, startProject, recordProjectSubmission, projectReadiness, projectSummary };
