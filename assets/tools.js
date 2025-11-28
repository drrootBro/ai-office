/* ============================================================
   TEXT CLEANER
============================================================ */
function cleanText() {
    let text = document.getElementById("cleanerInput").value;

    text = text.replace(/\r?\n|\r/g, " ");         
    text = text.replace(/\s+/g, " ");              
    text = text.replace(/[^\S\r\n]+/g, " ");        
    text = text.trim();

    document.getElementById("cleanerOutput").value = text;
}


/* ============================================================
   SUMMARIZER PRO (TextRank Algorithm - Browser Based)
   100% front-end, no API. Good actual results.
============================================================ */

// Split into sentences
function splitSentences(text) {
    return text
        .match(/[^.!?]+[.!?]/g)  
        ?.map(s => s.trim()) || [text.trim()];
}

// Tokenizer: extract words
function tokenize(text) {
    return text.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
}

// Sentence similarity (cosine-like)
function sentenceSimilarity(a, b) {
    const wordsA = tokenize(a);
    const wordsB = tokenize(b);
    const setA = new Set(wordsA);

    let overlap = 0;
    wordsB.forEach(w => { if (setA.has(w)) overlap++; });

    return overlap / (Math.log(wordsA.length + 1) + Math.log(wordsB.length + 1));
}

// TextRank scoring
function textRank(sentences, iterations = 20, d = 0.85) {
    const n = sentences.length;
    let scores = Array(n).fill(1);

    let simMatrix = Array(n).fill(0).map(() => Array(n).fill(0));

    // Build similarity matrix
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            if (i !== j) simMatrix[i][j] = sentenceSimilarity(sentences[i], sentences[j]);
        }
    }

    // Run TextRank
    for (let iter = 0; iter < iterations; iter++) {
        let newScores = Array(n).fill((1 - d));

        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if (simMatrix[j][i] !== 0) {
                    newScores[i] += d * (simMatrix[j][i] / simMatrix[j].reduce((a,b)=>a+b,0)) * scores[j];
                }
            }
        }

        scores = newScores;
    }

    return scores;
}

function summarizeText() {
    const input = document.getElementById("sumInput").value;
    if (!input) return;

    const sentences = splitSentences(input);

    // short text: return directly
    if (sentences.length <= 2) {
        document.getElementById("sumOutput").value = input;
        return;
    }

    const scores = textRank(sentences);

    // choose top 2 sentences
    const topSentences = sentences
        .map((s, i) => ({ sentence: s, score: scores[i] }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 2)
        .map(s => s.sentence)
        .join(" ");

    document.getElementById("sumOutput").value = topSentences;
}


/* ============================================================
   PARAPHRASER PRO (Phrase + Word Replacement)
   More advanced than simple synonyms.
============================================================ */

const phraseReplacements = {
    "in order to": "to",
    "a lot of": "many",
    "as a result": "therefore",
    "very important": "crucial",
    "really important": "essential",
    "in the end": "ultimately",
    "for example": "for instance",
    "due to the fact that": "because",
    "in addition to": "besides"
};

const wordReplacements = {
    "important": "significant",
    "big": "large",
    "small": "tiny",
    "quick": "rapid",
    "slow": "gradual",
    "smart": "intelligent",
    "help": "assist",
    "easy": "simple",
    "hard": "challenging",
    "use": "utilize",
    "make": "create",
    "show": "demonstrate",
    "need": "require",
    "try": "attempt",
    "fix": "resolve",
    "explain": "clarify",
    "idea": "concept",
    "problem": "issue",
    "good": "beneficial",
    "bad": "harmful",
    "start": "begin",
    "change": "modify"
};

function paraphrase() {
    let text = document.getElementById("paraInput").value;

    // Replace phrases first (longest match first)
    for (let p in phraseReplacements) {
        const regex = new RegExp(p, "gi");
        text = text.replace(regex, phraseReplacements[p]);
    }

    // Replace single words
    for (let w in wordReplacements) {
        const regex = new RegExp("\\b" + w + "\\b", "gi");
        text = text.replace(regex, wordReplacements[w]);
    }

    // Basic grammar variation: add slight structure shift
    text = text.replace(/It is (\w+) to/g, "It can be $1 to");
    text = text.replace(/This is (\w+)/g, "This appears $1");

    document.getElementById("paraOutput").value = text;
}


/* ============================================================
   CASE CONVERTER
============================================================ */
function convertCase(type) {
    const text = document.getElementById("caseInput").value;

    let output = "";
    if (type === "upper") output = text.toUpperCase();
    if (type === "lower") output = text.toLowerCase();
    if (type === "title")
        output = text.replace(/\w\S*/g, w => w[0].toUpperCase() + w.substring(1).toLowerCase());
    if (type === "sentence")
        output = text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();

    document.getElementById("caseOutput").value = output;
}


/* ============================================================
   WORD COUNTER
============================================================ */
function countWords() {
    const text = document.getElementById("wcInput").value.trim();
    const words = text.split(/\s+/).filter(w => w);
    const chars = text.length;

    let freq = {};
    words.forEach(w => freq[w] = (freq[w] || 0) + 1);

    let result = `Words: ${words.length}\nCharacters: ${chars}\n\nWord Frequency:\n`;
    for (let k in freq) {
        result += `${k}: ${freq[k]}\n`;
    }

    document.getElementById("wcOutput").value = result;
}
