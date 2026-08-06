// Chord auto-correction
// Capitalises root note, lowercases quality, keeps accidentals (b/#) intact.
// Handles: Am, Cmaj7, F#m7, Bb, G#sus4, Am/G, Bdim, Caug, etc.

function correctChord(raw) {
    const chord = raw.trim();
    if (!chord) return chord;

    // Slash chords: Am/G
    const slash = chord.indexOf('/', 1);
    if (slash > 0) {
        return correctSingle(chord.slice(0, slash)) + '/' + correctSingle(chord.slice(slash + 1));
    }
    return correctSingle(chord);
}

function correctSingle(chord) {
    const m = chord.match(/^([a-gA-G])([b#]?)(.*)$/);
    if (!m) return chord;
    const root       = m[1].toUpperCase();
    const accidental = m[2];            // b or # — keep as-is
    const quality    = m[3].toLowerCase(); // everything else lowercase
    return root + accidental + quality;
}

function correctChordField(input) {
    // Split on spaces/commas, correct each token, rejoin with spaces
    const tokens = input.split(/[\s,]+/).filter(Boolean);
    return tokens.map(correctChord).join('  ');
}

// Wire up a chord textarea to auto-correct on space / comma / blur.
// Each line is corrected independently so multi-line chords are preserved.
function initChordInput(el) {
    function correctAll(keepTrailing) {
        const lines   = el.value.split('\n');
        const lastIdx = lines.length - 1;
        const result  = lines.map((line, i) => {
            const trailing = (keepTrailing && i === lastIdx && /[\s,]$/.test(line)) ? ' ' : '';
            return correctChordField(line) + trailing;
        }).join('\n');
        if (result !== el.value) {
            el.value = result;
            el.dispatchEvent(new Event('input')); // triggers autoResize
        }
    }

    el.addEventListener('keydown', e => {
        if (e.key === ' ' || e.key === ',') setTimeout(() => correctAll(true), 0);
    });
    el.addEventListener('blur', () => correctAll(false));
}
