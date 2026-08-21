function normalizeTelegramText(input) {
    let text = String(input || '').replace(/\r\n?/g, '\n').trim();
    if (!text) return '';
    text = text
        .replace(/```(?:[a-zA-Z0-9_-]+)?[ \t]*\n?/g, '')
        .replace(/```/g, '')
        .replace(/^[ \t]*#{1,6}[ \t]*/gm, '')
        .replace(/^[ \t]*>[ \t]?/gm, '')
        .replace(/^[ \t]*([-*_])(?:[ \t]*\1){2,}[ \t]*$/gm, '──────────')
        .replace(/^[ \t]*[-*][ \t]+/gm, '• ')
        .replace(/\*\*(.*?)\*\*/gs, '$1')
        .replace(/__(.*?)__/gs, '$1')
        .replace(/~~(.*?)~~/gs, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    return text;
}

function readableLines(input) {
    return normalizeTelegramText(input).split('\n').map((line) => line.trimEnd());
}

module.exports = { normalizeTelegramText, readableLines };
