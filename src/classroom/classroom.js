function normalizeClassCode(value) {
    return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
}

function classroomCode(seed = Date.now()) {
    const source = `${seed}${Math.random().toString(36).slice(2)}`.toUpperCase().replace(/[^A-Z0-9]/g, '');
    return source.slice(-6).padStart(6, '0');
}

function studentSummary(progress = {}, userId) {
    const completed = Array.isArray(progress.completedLessons) ? progress.completedLessons.length : 0;
    const total = 36;
    const quizAnswered = Number(progress.quizAnswered || 0);
    const quizCorrect = Number(progress.quizCorrect || 0);
    return {
        userId: String(userId),
        active: Boolean(progress.active),
        levelId: progress.levelId || 'starter',
        trackId: progress.trackId || 'general',
        lessonNumber: Number(progress.lessonNumber || 1),
        completedLessons: completed,
        completionPercent: Math.round((completed / total) * 100),
        points: Number(progress.points || 0),
        streak: Number(progress.streak || 0),
        quizAccuracy: quizAnswered ? Math.round((quizCorrect / quizAnswered) * 100) : 0,
        speakingAttempts: Number(progress.speakingAttempts || 0),
        pronunciationScore: progress.pronunciationScore == null ? null : Number(progress.pronunciationScore),
        lastActiveAt: progress.updatedAt || null
    };
}

function classroomSummary(classroom = {}, students = []) {
    const summaries = Array.isArray(students) ? students : [];
    const active = summaries.filter((student) => student.active).length;
    const averageCompletion = summaries.length ? Math.round(summaries.reduce((sum, student) => sum + student.completionPercent, 0) / summaries.length) : 0;
    return {
        id: classroom.id,
        code: classroom.code,
        title: classroom.title,
        teacherId: classroom.teacherId,
        studentCount: summaries.length,
        activeStudents: active,
        averageCompletion,
        students: summaries
    };
}

module.exports = { normalizeClassCode, classroomCode, studentSummary, classroomSummary };
