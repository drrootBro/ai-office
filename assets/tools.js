/* ---------------------------------------------------
   TEXT CLEANER
--------------------------------------------------- */
function cleanText() {
    let text = document.getElementById("cleanerInput").value;

    text = text.replace(/\r?\n|\r/g, " ");         
    text = text.replace(/\s+/g, " ");              
    text = text.replace(/[^\S\r\n]+/g, " ");        
    text = text.trim();

    document.getElementById("cleanerOutput").value = text;
}


/* ---------------------------------------------------
   SUMMARIZER LITE - REAL VERSION (LOCAL)
   Algorithm:
   - Split into sentences
   - Score by: length, position, TF-IDF keywords
   - Select best 1–2 sentences
--------------------------------------------------- */
function summarizeText() {
    const input = document.getElementById("sumInput").value;
    if (!input) return;

    const sentences = input.match(/[^.!?]+[.!?]/g) || [input];

    if (sentences.length <= 2) {
        document.getElementById("sumOutput").value = input;
        return;
    }

    const words = input.toLowerCase().match(/\b[a-z]+\b/g);
    let freq = {};

    words.forEach(w => freq[w] = (freq[w] || 0) + 1);

    const scores = sentences.map((sent, idx) => {
        const wlist = sent.toLowerCase().match(/\b[a-z]+\b/g) || [];
        let score = 0;

        wlist.forEach(w => score += (freq[w] || 0));

        score += (1 / (idx + 1));          
        score += (wlist.length / 10);      

        return { sentence: sent.trim(), score };
    });

    scores.sort((a, b) => b.score - a.score);

    const bestTwo = scores.slice(0, 2).map(s => s.sentence).join(" ");
    document.getElementById("sumOutput").value = bestTwo;
}


/* ---------------------------------------------------
   PARAPHRASER LITE - REAL VERSION
   Uses expanded synonyms & phrase replacements
--------------------------------------------------- */

const synonymTable = {
    "important": "significant",
    "big": "large",
    "small": "tiny",
    "quick": "rapid",
    "slow": "gradual",
    "smart": "intelligent",
    "help": "assist",
    "easy": "simple",
    "hard": "difficult",
    "use": "utilize",
    "improve": "enhance",
    "change": "modify",
    "good": "beneficial",
    "bad": "harmful",
    "start": "begin",
    "make": "create",
    "show": "demonstrate",
    "need": "require",
    "try": "attempt",
    "fix": "resolve",
    "explain": "clarify",
    "idea": "concept",
    "problem": "issue"
};

const phraseTable = {
    "in order to": "to",
    "as a result": "therefore",
    "a lot of": "many",
    "very important": "crucial",
    "really important": "essential",
    "in the end": "ultimately",
    "for example": "for instance",
    "as well as": "in addition to"
};

function paraphrase() {
    let text = document.getElementById("paraInput").value;

    // phrase replacement first
    for (let p in phraseTable) {
        const regex = new RegExp(p, "gi");
        text = text.replace(regex, phraseTable[p]);
    }

    // word replacement
    for (let w in synonymTable) {
        const regex = new RegExp("\\b" + w + "\\b", "gi");
        text = text.replace(regex, synonymTable[w]);
    }

    document.getElementById("paraOutput").value = text;
}


/* ---------------------------------------------------
   CASE CONVERTER
--------------------------------------------------- */
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


/* ---------------------------------------------------
   WORD COUNTER
--------------------------------------------------- */
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
