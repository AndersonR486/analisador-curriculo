if (typeof pdfjsLib !== "undefined") {
    pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
}

const skillMap = {
    "HTML": ["html", "html5", "semantica", "semantico"],
    "CSS": ["css", "css3", "sass", "scss", "tailwind", "bootstrap"],
    "JavaScript": ["javascript", "js", "ecmascript"],
    "React": ["react", "next.js", "nextjs"],
    "Python": ["python", "django", "flask", "pandas"],
    "SQL": ["sql", "mysql", "postgresql", "postgres", "sqlite"],
    "Git": ["git", "github", "gitlab", "versionamento"],
    "UX/UI": ["ux", "ui", "figma", "wireframe", "prototipo", "prototipacao"]
};

const softSkills = [
    "comunicacao",
    "lideranca",
    "trabalho em equipe",
    "adaptabilidade",
    "proatividade",
    "organizacao",
    "resolucao de problemas",
    "pensamento critico"
];

const atsSections = [
    { key: "contato", pattern: /(contato|email|telefone|linkedin)/i, score: 10 },
    { key: "objetivo", pattern: /(objetivo|resumo profissional|perfil profissional)/i, score: 10 },
    { key: "experiencia", pattern: /(experiencia|historico profissional)/i, score: 15 },
    { key: "formacao", pattern: /(formacao|escolaridade|educacao)/i, score: 10 },
    { key: "habilidades", pattern: /(habilidades|competencias|qualificacoes)/i, score: 15 },
    { key: "cursos", pattern: /(cursos|certificacoes|treinamentos)/i, score: 10 }
];

const elements = {
    form: document.getElementById("analysisForm"),
    dropzone: document.getElementById("dropzone"),
    fileInput: document.getElementById("resumeFile"),
    fileFeedback: document.getElementById("fileFeedback"),
    jobDescription: document.getElementById("jobDescription"),
    analyzeButton: document.getElementById("analyzeButton"),
    loadingBox: document.getElementById("loadingBox"),
    successMessage: document.getElementById("successMessage"),
    errorMessage: document.getElementById("errorMessage"),
    compatibilityPercent: document.getElementById("compatibilityPercent"),
    compatibilityStatus: document.getElementById("compatibilityStatus"),
    atsScore: document.getElementById("atsScore"),
    atsMessage: document.getElementById("atsMessage"),
    foundCount: document.getElementById("foundCount"),
    missingCount: document.getElementById("missingCount"),
    progressLabel: document.getElementById("progressLabel"),
    progressFill: document.getElementById("progressFill"),
    foundSkillsList: document.getElementById("foundSkillsList"),
    missingSkillsList: document.getElementById("missingSkillsList"),
    improvementList: document.getElementById("improvementList"),
    keywordsList: document.getElementById("keywordsList"),
    resumePreview: document.getElementById("resumePreview"),
    heroCompatibility: document.getElementById("heroCompatibility"),
    heroAtsScore: document.getElementById("heroAtsScore"),
    heroSkillsCount: document.getElementById("heroSkillsCount")
};

let selectedFile = null;
let skillsChart = null;
let summaryChart = null;

setupInteractions();
renderInitialState();

function setupInteractions() {
    elements.dropzone.addEventListener("dragover", (event) => {
        event.preventDefault();
        elements.dropzone.classList.add("dragover");
    });

    elements.dropzone.addEventListener("dragleave", () => {
        elements.dropzone.classList.remove("dragover");
    });

    elements.dropzone.addEventListener("drop", (event) => {
        event.preventDefault();
        elements.dropzone.classList.remove("dragover");

        const [file] = event.dataTransfer.files;
        if (file) {
            updateSelectedFile(file);
        }
    });

    elements.fileInput.addEventListener("change", (event) => {
        const [file] = event.target.files;
        if (file) {
            updateSelectedFile(file);
        }
    });

    elements.form.addEventListener("submit", async (event) => {
        event.preventDefault();
        await runAnalysis();
    });
}

function renderInitialState() {
    renderSkillsChart(createEmptySkillScores());
    renderSummaryChart(0, 0, 0);
}

function updateSelectedFile(file) {
    selectedFile = file;
    elements.fileFeedback.textContent = `Arquivo selecionado: ${file.name}`;
    hideMessages();
}

async function runAnalysis() {
    hideMessages();

    if (!selectedFile) {
        showError("Selecione um currículo em PDF antes de analisar.");
        return;
    }

    if (!isPdfFile(selectedFile)) {
        showError("Formato inválido. Envie um arquivo PDF.");
        return;
    }

    const vacancyText = elements.jobDescription.value.trim();
    if (!vacancyText) {
        showError("Descreva a vaga para comparar com o currículo.");
        return;
    }

    toggleLoading(true);

    try {
        const resumeText = await extractPdfText(selectedFile);
        const analysis = analyzeResume(resumeText, vacancyText);
        renderAnalysis(analysis, resumeText);
        showSuccess("Análise concluída com sucesso.");
    } catch (error) {
        showError(error.message || "Não foi possível analisar o currículo.");
    } finally {
        toggleLoading(false);
    }
}

function isPdfFile(file) {
    return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

async function extractPdfText(file) {
    if (typeof pdfjsLib === "undefined") {
        throw new Error("PDF.js não foi carregado.");
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item) => item.str).join(" ");
        fullText += `${pageText}\n`;
    }

    return fullText;
}

function analyzeResume(resumeText, vacancyText) {
    const normalizedResume = normalizeText(resumeText);
    const normalizedVacancy = normalizeText(vacancyText);
    const vacancyKeywords = extractVacancyKeywords(normalizedVacancy);
    const foundSkills = findFoundSkills(normalizedResume);
    const matchedKeywords = vacancyKeywords.filter((keyword) => normalizedResume.includes(keyword));
    const missingKeywords = vacancyKeywords.filter((keyword) => !normalizedResume.includes(keyword));
    const compatibility = calculateCompatibility(vacancyKeywords, matchedKeywords);
    const ats = calculateAtsScore(resumeText, normalizedResume, vacancyKeywords, matchedKeywords);
    const suggestions = buildSuggestions({
        matchedKeywords,
        missingKeywords,
        ats,
        foundSkills,
        normalizedResume
    });

    return {
        compatibility,
        ats,
        foundSkills,
        matchedKeywords,
        missingKeywords,
        suggestions,
        skillScores: buildSkillScores(normalizedResume),
        preview: resumeText.slice(0, 900).trim() || "Não foi possível exibir uma prévia do texto.",
        vacancyKeywords
    };
}

function normalizeText(text) {
    return text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}

function extractVacancyKeywords(normalizedVacancy) {
    const rawTerms = normalizedVacancy.match(/[a-z0-9+#./-]{3,}/g) || [];
    const stopWords = new Set([
        "com", "para", "uma", "das", "dos", "que", "por", "ser", "mais", "como",
        "vaga", "area", "profissional", "experiencia", "trabalho", "conhecimento",
        "desejavel", "requisitos", "responsavel", "atuacao", "empresa", "time"
    ]);

    return [...new Set(rawTerms.filter((term) => !stopWords.has(term)))].slice(0, 18);
}

function findFoundSkills(normalizedResume) {
    const found = [];

    Object.entries(skillMap).forEach(([skill, aliases]) => {
        if (aliases.some((alias) => normalizedResume.includes(alias))) {
            found.push(skill);
        }
    });

    softSkills.forEach((skill) => {
        if (normalizedResume.includes(skill)) {
            found.push(skill);
        }
    });

    return [...new Set(found)];
}

function calculateCompatibility(vacancyKeywords, matchedKeywords) {
    if (!vacancyKeywords.length) {
        return {
            percent: 0,
            label: "Descreva melhor a vaga para calcular a compatibilidade.",
            level: "low"
        };
    }

    const percent = Math.round((matchedKeywords.length / vacancyKeywords.length) * 100);

    if (percent >= 75) {
        return { percent, label: "Alta compatibilidade com a vaga.", level: "high" };
    }

    if (percent >= 45) {
        return { percent, label: "Compatibilidade intermediária com a vaga.", level: "medium" };
    }

    return { percent, label: "Baixa compatibilidade com a vaga.", level: "low" };
}

function calculateAtsScore(resumeText, normalizedResume, vacancyKeywords, matchedKeywords) {
    let score = 0;

    atsSections.forEach((section) => {
        if (section.pattern.test(resumeText)) {
            score += section.score;
        }
    });

    const skillPoints = Math.min(findFoundSkills(normalizedResume).length * 4, 24);
    const keywordPoints = vacancyKeywords.length ? Math.round((matchedKeywords.length / vacancyKeywords.length) * 26) : 0;

    score += skillPoints + keywordPoints;
    return Math.min(score, 100);
}

function buildSuggestions(context) {
    const suggestions = [];

    if (context.missingKeywords.length) {
        suggestions.push(`Inclua ou destaque termos como: ${context.missingKeywords.slice(0, 5).join(", ")}.`);
    }

    if (context.ats < 70) {
        suggestions.push("Organize o currículo com títulos claros como Experiência, Formação e Habilidades.");
    }

    if (!context.normalizedResume.includes("resultado") && !context.normalizedResume.includes("%")) {
        suggestions.push("Adicione resultados mensuráveis para fortalecer o currículo.");
    }

    if (!context.normalizedResume.includes("linkedin")) {
        suggestions.push("Inclua LinkedIn ou portfólio para enriquecer o perfil.");
    }

    if (context.foundSkills.length < 4) {
        suggestions.push("Evidencie mais competências técnicas no currículo.");
    }

    return suggestions.length ? suggestions : ["Seu currículo já está bem estruturado para esta vaga."];
}

function buildSkillScores(normalizedResume) {
    const scores = {};

    Object.entries(skillMap).forEach(([skill, aliases]) => {
        const mentions = aliases.reduce((total, alias) => total + countOccurrences(normalizedResume, alias), 0);
        scores[skill] = Math.min(mentions * 25, 100);
    });

    return scores;
}

function createEmptySkillScores() {
    return Object.keys(skillMap).reduce((accumulator, skill) => {
        accumulator[skill] = 0;
        return accumulator;
    }, {});
}

function countOccurrences(text, term) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matches = text.match(new RegExp(escaped, "g")) || [];
    return matches.length;
}

function renderAnalysis(analysis, resumeText) {
    elements.compatibilityPercent.textContent = `${analysis.compatibility.percent}%`;
    elements.compatibilityStatus.textContent = analysis.compatibility.label;
    elements.atsScore.textContent = analysis.ats;
    elements.atsMessage.textContent = buildAtsMessage(analysis.ats);
    elements.foundCount.textContent = analysis.foundSkills.length;
    elements.missingCount.textContent = analysis.missingKeywords.length;
    elements.progressLabel.textContent = `${analysis.compatibility.percent}%`;
    elements.progressFill.style.width = `${analysis.compatibility.percent}%`;

    elements.heroCompatibility.textContent = `${analysis.compatibility.percent}%`;
    elements.heroAtsScore.textContent = analysis.ats;
    elements.heroSkillsCount.textContent = analysis.foundSkills.length;
    elements.resumePreview.textContent = analysis.preview || resumeText.slice(0, 900);

    fillList(elements.foundSkillsList, analysis.foundSkills, "Nenhuma habilidade principal encontrada.");
    fillList(elements.missingSkillsList, analysis.missingKeywords, "Nenhuma lacuna principal detectada.");
    fillList(elements.improvementList, analysis.suggestions, "Nenhuma sugestão no momento.");
    fillList(elements.keywordsList, analysis.vacancyKeywords, "Nenhuma palavra-chave identificada.");

    renderSkillsChart(analysis.skillScores);
    renderSummaryChart(analysis.matchedKeywords.length, analysis.missingKeywords.length, analysis.ats);
}

function buildAtsMessage(score) {
    if (score >= 80) return "Currículo forte para leitura ATS.";
    if (score >= 60) return "Currículo bom, mas ainda pode melhorar.";
    return "Currículo precisa de mais estrutura e palavras-chave.";
}

function fillList(target, items, emptyMessage) {
    target.innerHTML = "";
    const values = items.length ? items : [emptyMessage];

    values.forEach((item) => {
        const li = document.createElement("li");
        li.textContent = item;
        target.appendChild(li);
    });
}

function renderSkillsChart(skillScores) {
    if (typeof Chart === "undefined") return;

    const labels = Object.keys(skillScores);
    const data = Object.values(skillScores);
    const context = document.getElementById("skillsChart").getContext("2d");

    if (skillsChart) {
        skillsChart.destroy();
    }

    skillsChart = new Chart(context, {
        type: "radar",
        data: {
            labels,
            datasets: [{
                label: "Conhecimentos detectados",
                data,
                backgroundColor: "rgba(10, 102, 194, 0.18)",
                borderColor: "#0a66c2",
                borderWidth: 2,
                pointBackgroundColor: "#0a66c2"
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    min: 0,
                    max: 100,
                    ticks: { stepSize: 20 }
                }
            },
            plugins: {
                legend: { position: "bottom" }
            }
        }
    });
}

function renderSummaryChart(matchCount, missingCount, atsScore) {
    if (typeof Chart === "undefined") return;

    const context = document.getElementById("summaryChart").getContext("2d");

    if (summaryChart) {
        summaryChart.destroy();
    }

    summaryChart = new Chart(context, {
        type: "bar",
        data: {
            labels: ["Matches", "Faltantes", "ATS"],
            datasets: [{
                label: "Resumo da análise",
                data: [matchCount, missingCount, atsScore],
                backgroundColor: ["#0a66c2", "#f59e0b", "#15803d"],
                borderRadius: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function toggleLoading(isVisible) {
    elements.loadingBox.hidden = !isVisible;
    elements.analyzeButton.disabled = isVisible;
    elements.analyzeButton.textContent = isVisible ? "Analisando..." : "Analisar Currículo";
}

function hideMessages() {
    elements.successMessage.hidden = true;
    elements.errorMessage.hidden = true;
    elements.successMessage.textContent = "";
    elements.errorMessage.textContent = "";
}

function showSuccess(message) {
    elements.successMessage.hidden = false;
    elements.successMessage.textContent = message;
}

function showError(message) {
    elements.errorMessage.hidden = false;
    elements.errorMessage.textContent = message;
}
