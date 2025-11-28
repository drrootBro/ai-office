/* TEXT CLEANER */
function cleanText() {
    let text = document.getElementById("cleanerInput").value;

    text = text.replace(/\r?\n|\r/g, " ");          // remove line breaks
    text = text.replace(/\s+/g, " ");               // collapse spaces
    text = text.replace(/[^\S\r\n]+/g, " ");        // weird spacing
    text = text.trim();

    document.getElementById("cleanerOutput").value = text;
}

/* SUMMARIZER (Lite TF-IDF) */
function summarizeText() {
    const input = document.getElementById("sumInput").value;
    if (!input) return;

    const sentences = input.split(/[.!?]+/).filter(s => s.length > 5);

    let scores = sentences.map(s => {
        const words = s.trim().split(/\s+/);
        return { sentence: s, score: words.length };
    });

    scores.sort((a, b) => a.score - b.score);

    const summary = scores.slice(0, 2).map(s => s.sentence.trim()).join(". ");
    document.getElementById("sumOutput").value = summary;
}

/* PARAPHRASER (Simple Synonym Replace) */
const synonyms = {
    "big": "large",
    "small": "tiny",
    "quick": "fast",
    "smart": "intelligent",
    "help": "assist",
    "use": "utilize"
};

function paraphrase() {
    let text = document.getElementById("paraInput").value;

    for (let w in synonyms) {
        const regex = new RegExp("\\b" + w + "\\b", "gi");
        text = text.replace(regex, synonyms[w]);
    }

    document.getElementById("paraOutput").value = text;
}

/* CASE CONVERTER */
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

/* WORD COUNTER */
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
