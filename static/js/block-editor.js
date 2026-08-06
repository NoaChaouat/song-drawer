// Shared block-editor logic (used by new_song.html and song.html)

const SECTION_LABELS = {
    verse_a: 'Verse A',
    verse_b: 'Verse B',
    chorus:  'Chorus',
    bridge:  'Bridge',
    part_c:  'Part C',
    part_d:  'Part D'
};

let blockCounter   = 0;
let popupState     = null;
let selectionTimer = null;

function nextId() { return ++blockCounter; }

function autoResize(el) {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
}

function togglePanel(id) {
    document.querySelectorAll('.panel').forEach(p => {
        if (p.id !== id) p.classList.remove('open');
    });
    document.getElementById(id).classList.toggle('open');
}

/* ── section bar ── */
function setSelectionActive(on) {
    document.querySelectorAll('.section-bar-btn').forEach(b => b.classList.toggle('active', on));
}

function hidePopup() {
    popupState = null;
    setSelectionActive(false);
}

/* ── selection tracking ── */
function evalSelection(ta, blockId) {
    const start = ta.selectionStart;
    const end   = ta.selectionEnd;
    if (start !== end && ta.value.substring(start, end).trim()) {
        const fullText = ta.value;
        // Pre-compute everything now so focus-loss doesn't matter
        popupState = {
            blockId,
            before:   fullText.substring(0, start).trimEnd(),
            selected: fullText.substring(start, end).trim(),
            after:    fullText.substring(end).trimStart(),
        };
        setSelectionActive(true);
    } else {
        hidePopup();
    }
}

function scheduleEval(ta, blockId, delay) {
    clearTimeout(selectionTimer);
    selectionTimer = setTimeout(() => evalSelection(ta, blockId), delay);
}

/* ── selectionchange (most reliable on iOS) ── */
document.addEventListener('selectionchange', () => {
    const active = document.activeElement;
    if (!active) return;
    const isEditor = active.classList.contains('raw-editor') || active.classList.contains('section-lyrics');
    if (!isEditor) return;
    const blockItem = active.closest('.block-item');
    if (!blockItem) return;
    scheduleEval(active, blockItem.dataset.blockId, 80);
});

/* ── mouseup fallback (desktop) ── */
function handleSelection(ta, blockId) {
    scheduleEval(ta, blockId, 150);
}

/* ── section bar clicks — prevent blur on touch, convert on click ── */
document.addEventListener('touchstart', e => {
    const btn = e.target.closest('.section-bar-btn');
    if (!btn || !btn.classList.contains('active')) return;
    e.preventDefault(); // keep textarea focused & selection intact
    convertSelection(btn.dataset.type);
}, { passive: false });

document.addEventListener('click', e => {
    const btn = e.target.closest('.section-bar-btn');
    if (!btn || !btn.classList.contains('active')) return;
    convertSelection(btn.dataset.type);
});

/* ── close on outside click ── */
document.addEventListener('mousedown', e => {
    if (e.target.closest('.section-bar-btn')) return;
    if (e.target.closest('.raw-editor, .section-lyrics')) return;
    hidePopup();
});

/* ── block builders ── */
function makeTextBlock(content) {
    const id  = nextId();
    const div = document.createElement('div');
    div.className       = 'block-item';
    div.dataset.blockId = id;
    div.dataset.type    = 'text';

    const ta = document.createElement('textarea');
    ta.className   = 'raw-editor';
    ta.dir         = 'auto';
    ta.value       = content || '';
    ta.placeholder = 'Write here...';
    ta.addEventListener('input', () => { autoResize(ta); updateTitlePreview(); });
    ta.addEventListener('mouseup',  () => handleSelection(ta, id));
    ta.addEventListener('keyup',    () => { if (ta.selectionStart === ta.selectionEnd) hidePopup(); });

    div.appendChild(ta);
    setTimeout(() => autoResize(ta), 0);
    return div;
}

function makeSectionBlock(type, lyrics, chords) {
    const id  = nextId();
    const div = document.createElement('div');
    div.className       = 'block-item section-block';
    div.dataset.blockId = id;
    div.dataset.type    = type;

    /* ── header ── */
    const header = document.createElement('div');
    header.className = 'section-header';

    const tag = document.createElement('span');
    tag.className   = `section-tag section-tag-${type}`;
    tag.textContent = SECTION_LABELS[type];

    const chordsInput = document.createElement('textarea');
    chordsInput.className    = 'section-chords';
    chordsInput.dir          = 'ltr';
    chordsInput.value        = chords || '';
    chordsInput.placeholder  = 'Am  G  F  E';
    chordsInput.autocomplete = 'off';
    chordsInput.spellcheck   = false;
    chordsInput.rows         = 1;
    chordsInput.addEventListener('input', () => {
        chordsInput.rows = Math.max(1, chordsInput.value.split('\n').length);
    });

    /* action buttons */
    const actions = document.createElement('div');
    actions.className = 'section-actions';

    function mkActionBtn(label, title, cls, handler) {
        const btn = document.createElement('button');
        btn.type        = 'button';
        btn.className   = 'section-action-btn' + (cls ? ' ' + cls : '');
        btn.title       = title;
        btn.textContent = label;
        btn.onclick     = handler;
        return btn;
    }

    actions.appendChild(mkActionBtn('↑', 'Move up', '', () => {
        const prev = div.previousElementSibling;
        if (prev) div.parentNode.insertBefore(div, prev);
    }));
    actions.appendChild(mkActionBtn('↓', 'Move down', '', () => {
        const next = div.nextElementSibling;
        if (next) div.parentNode.insertBefore(next, div);
    }));
    actions.appendChild(mkActionBtn('⧉', 'Duplicate', 'dup', () => {
        const dup = makeSectionBlock(
            type,
            div.querySelector('.section-lyrics').value,
            div.querySelector('.section-chords').value
        );
        div.parentNode.insertBefore(dup, div.nextSibling);
    }));
    actions.appendChild(mkActionBtn('✕', 'Remove label', 'remove', () => {
        const text = div.querySelector('.section-lyrics').value;
        const tb   = makeTextBlock(text);
        div.parentNode.replaceChild(tb, div);
        tb.querySelector('.raw-editor').focus();
        updateTitlePreview();
    }));

    header.appendChild(tag);
    header.appendChild(chordsInput);
    header.appendChild(actions);

    /* ── lyrics textarea ── */
    const lyricsArea = document.createElement('textarea');
    lyricsArea.className   = 'section-lyrics';
    lyricsArea.dir         = 'auto';
    lyricsArea.value       = lyrics || '';
    lyricsArea.placeholder = `Write ${SECTION_LABELS[type]} lyrics...`;
    lyricsArea.addEventListener('input', () => { autoResize(lyricsArea); updateTitlePreview(); });
    lyricsArea.addEventListener('mouseup',  () => handleSelection(lyricsArea, id));
    lyricsArea.addEventListener('keyup',    () => { if (lyricsArea.selectionStart === lyricsArea.selectionEnd) hidePopup(); });

    div.appendChild(header);
    div.appendChild(lyricsArea);

    initChordInput(chordsInput);
    setTimeout(() => {
        chordsInput.rows = Math.max(1, chordsInput.value.split('\n').length);
        autoResize(lyricsArea);
    }, 0);
    return div;
}

/* ── convert selected text → section ── */
function convertSelection(type) {
    if (!popupState) return;
    const { blockId, before, selected, after } = popupState;
    hidePopup();

    const blockItem = document.querySelector(`.block-item[data-block-id="${blockId}"]`);
    if (!blockItem) return;

    const container = blockItem.parentNode;
    const refNode   = blockItem.nextSibling;

    const newSection = makeSectionBlock(type, selected, '');
    const toInsert   = [];
    if (before) toInsert.push(makeTextBlock(before));
    toInsert.push(newSection);
    toInsert.push(makeTextBlock(after));

    if (refNode) toInsert.forEach(el => container.insertBefore(el, refNode));
    else         toInsert.forEach(el => container.appendChild(el));
    container.removeChild(blockItem);

    newSection.querySelector('.section-lyrics').focus();
    updateTitlePreview();
}

/* ── title preview (shared) ── */
function updateTitlePreview() {
    const explicit = document.getElementById('title-input').value.trim();
    if (explicit) { document.getElementById('title-label').textContent = explicit; return; }
    for (const el of document.querySelectorAll('.raw-editor, .section-lyrics')) {
        const line = el.value.trim().split('\n')[0].trim();
        if (line) { document.getElementById('title-label').textContent = line; return; }
    }
    document.getElementById('title-label').textContent = 'Untitled';
}

/* ── collect all blocks as sections array ── */
function collectSections() {
    const sections = [];
    document.querySelectorAll('.block-item').forEach(item => {
        const type = item.dataset.type;
        if (type === 'text') {
            const content = item.querySelector('.raw-editor').value.trim();
            if (content) sections.push({ type: 'text', label: '', chords: '', lyrics: content });
        } else {
            const rawChords = item.querySelector('.section-chords').value;
            const chords = rawChords.split('\n')
                .map(line => line.trim() ? correctChordField(line.trim()) : '')
                .join('\n').trim();
            const lyrics = item.querySelector('.section-lyrics').value.trim();
            sections.push({ type, label: SECTION_LABELS[type], chords, lyrics });
        }
    });
    return sections;
}
