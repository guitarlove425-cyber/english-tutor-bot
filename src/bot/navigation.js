const { Markup } = require('telegraf');

async function handleNavigationInput(ctx, progress, userMessage, helpers) {
    const state = progress?.navigationSection;
    if (!['classroom_join', 'classroom_create', 'classroom_dashboard', 'upgrade'].includes(state)) return false;
    const text = String(userMessage || '').trim();
    const userId = ctx.from.id;
    const isAdmin = Number(userId) === Number(helpers.ADMIN_ID);
    const homeKeyboard = typeof helpers.homeKeyboard === 'function' ? helpers.homeKeyboard() : (helpers.homeKeyboard || Markup.keyboard([['🏠 ပင်မ Menu']]).resize().persistent());
    const classroomKeyboard = helpers.classroomKeyboard || (() => homeKeyboard);

    try {
        if (state === 'classroom_join') {
            const classroom = await helpers.joinClassroom(userId, text);
            await helpers.saveAcademyProgress(userId, { ...progress, navigationSection: 'main' });
            await ctx.reply(`✅ ${classroom.title} ထဲ ဝင်ပြီးပါပြီ။\nသင့်ဆရာက သင့် Academy တိုးတက်မှုကို အခုကြည့်နိုင်ပါပြီ။`, classroomKeyboard(false));
            return true;
        }
        if (!isAdmin) {
            await ctx.reply('🔒 ဒီလုပ်ဆောင်ချက်ကို သတ်မှတ်ထားသော Admin/Teacher account မှသာ အသုံးပြုနိုင်ပါသည်။', homeKeyboard);
            return true;
        }
        if (state === 'classroom_create') {
            const classroom = await helpers.createClassroom(userId, text);
            await helpers.saveAcademyProgress(userId, { ...progress, navigationSection: 'main' });
            await ctx.reply(`✅ Classroom ဖန်တီးပြီးပါပြီ။\n\nအမည်: ${classroom.title}\nဝင်ရန် code: ${classroom.code}`, classroomKeyboard(true));
            return true;
        }
        if (state === 'classroom_dashboard') {
            const classroom = await helpers.getClassroomByCode(text);
            if (!classroom || String(classroom.teacherId) !== String(userId)) throw new Error('CLASSROOM_NOT_FOUND');
            const dashboard = await helpers.getClassroomDashboard(classroom);
            const rows = dashboard.students.length
                ? dashboard.students.map((student) => `• ${student.userId} — ${student.levelId} — ပြီးစီးမှု ${student.completionPercent}% — Quiz ${student.quizAccuracy}%`).join('\n')
                : 'ကျောင်းသား မဝင်ရသေးပါ။';
            await helpers.saveAcademyProgress(userId, { ...progress, navigationSection: 'main' });
            await helpers.replyLongText(ctx, `📊 ${dashboard.title}\n\nဝင်ရန် code: ${dashboard.code}\nကျောင်းသား: ${dashboard.studentCount}\nလက်ရှိလေ့လာနေသူ: ${dashboard.activeStudents}\nပျမ်းမျှပြီးစီးမှု: ${dashboard.averageCompletion}%\n\n${rows}`);
            await ctx.reply('Teacher Center ကို ဆက်သုံးရန် အောက်ကခလုတ်ကို အသုံးပြုပါ။', classroomKeyboard(true));
            return true;
        }
        const [targetUserId, days] = text.split(/\s+/);
        if (!targetUserId || !days) {
            await ctx.reply('ပုံစံမှားနေပါတယ်။ User ID နဲ့ ရက်အရေအတွက်ကို space ခြားပြီး ပြန်ပို့ပါ။\nဥပမာ: 123456789 30', classroomKeyboard(true));
            return true;
        }
        await helpers.makeUserPremium(targetUserId, days);
        await helpers.saveAcademyProgress(userId, { ...progress, navigationSection: 'main' });
        await ctx.reply(`✅ User ${targetUserId} ကို Premium ${days} ရက် ဖွင့်ပြီးပါပြီ။`, classroomKeyboard(true));
        return true;
    } catch (error) {
        await helpers.saveAcademyProgress(userId, { ...progress, navigationSection: 'main' });
        const message = error.message === 'CLASSROOM_NOT_FOUND' ? '❌ Classroom code ကို ရှာမတွေ့ပါ။ code ကို ပြန်စစ်ပါ။' : `🙏 အခုလုပ်မရသေးပါ။ ${error.message || ''}`;
            await ctx.reply(message, state === 'upgrade' || isAdmin ? classroomKeyboard(isAdmin) : classroomKeyboard(false));
        return true;
    }
}

module.exports = { handleNavigationInput };
