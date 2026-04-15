// ==UserScript==
// @name         spirituhq
// @version      1.1.4.2
// @description  Hack Kahoot.it 2026 - Auto answer + answer viewer + quiz loader (proxy + fallback)
// @namespace    https://github.com/spirituhq
// @match        https://kahoot.it/*
// @icon         https://raw.githubusercontent.com/spirituhq/spirituhq/refs/heads/main/kahoot.svg
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const Version = '1.1.4.2';
    let questions = [];
    let info = {
        numQuestions: 0,
        questionNum: -1,
        lastAnsweredQuestion: -1,
        ILSetQuestion: -1,
    };

    let PPT = 900;
    let Answered_PPT = 900;
    let autoAnswer = false;
    let showAnswers = false;
    let inputLag = 120; // un peu plus haut par défaut en 2026

    let lastValidQuizID = null;
    let lastKnownPin = null;

    // ====================== HELPERS ======================
    function sanitizeInput(val) {
        val = val.trim();
        if (val.startsWith("https//")) val = val.replace("https//", "https://");
        if (/^https?:\/\//i.test(val)) {
            const parts = val.replace(/^https?:\/\//i, '').split('/');
            return parts.filter(Boolean).pop() || val;
        }
        return val;
    }

    function isValidGameId(str) {
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
    }

    // Recherche robuste d'élément (plusieurs méthodes)
    function findElement(selectors, textContent = null) {
        for (let sel of selectors) {
            const el = document.querySelector(sel);
            if (el) {
                if (!textContent || el.textContent.includes(textContent)) return el;
            }
        }
        // fallback par texte
        if (textContent) {
            const els = document.querySelectorAll('div, span, button, p');
            for (let el of els) {
                if (el.textContent.trim() === textContent) return el;
            }
        }
        return null;
    }

    // ====================== UI (inchangée sauf version) ======================
    // ... (tout le code de création de l'UI reste identique jusqu'à la fin de la partie UI)
    // Je ne le recopie pas ici pour gagner de la place, mais garde exactement la même création d'uiElement, handle, inputBox, toggles, sliders, etc.
    // Change juste la version dans le handle :
    // versionSpan.textContent = 'v' + Version;

    // ====================== UPDATED FUNCTIONS 2026 ======================

    function onQuestionStart() {
        const question = questions[info.questionNum];
        if (!question) return;

        console.log(`[spirituhq] Question ${info.questionNum + 1} started`);

        if (showAnswers) highlightAnswers(question);
        if (autoAnswer) {
            const delay = Math.max(0, question.time - (question.time / (500 / (PPT - 500))) - inputLag);
            answer(question, delay);
        }
    }

    function highlightAnswers(question) {
        if (!question.answers) return;

        // Nouveau sélecteur 2026 (plus fiable)
        const answerButtons = document.querySelectorAll('[data-functional-selector^="answer-"], button[role="button"]');

        answerButtons.forEach((btn, index) => {
            const isCorrect = question.answers.includes(index);
            if (isCorrect) {
                btn.style.transition = 'all 0.3s';
                btn.style.backgroundColor = '#00ff00';
                btn.style.boxShadow = '0 0 15px #00ff00';
            } else if (question.incorrectAnswers && question.incorrectAnswers.includes(index)) {
                btn.style.backgroundColor = '#ff0000';
            }
        });
    }

    function answer(question, time) {
        Answered_PPT = PPT;

        setTimeout(() => {
            if (question.type === 'quiz') {
                if (question.answers && question.answers.length > 0) {
                    const key = (question.answers[0] + 1).toString();
                    window.dispatchEvent(new KeyboardEvent('keydown', { key }));
                }
            } else if (question.type === 'multiple_select_quiz') {
                question.answers.forEach((ans, i) => {
                    setTimeout(() => {
                        const key = (ans + 1).toString();
                        window.dispatchEvent(new KeyboardEvent('keydown', { key }));
                    }, i * 50);
                });

                // Submit button (nouveau sélecteur possible)
                setTimeout(() => {
                    const submit = findElement([
                        '[data-functional-selector="multi-select-submit-button"]',
                        'button:contains("Submit")',
                        'button span:contains("Submit")'
                    ]);
                    if (submit) submit.click();
                }, 100);
            }
        }, Math.max(0, time));
    }

    function parseQuestions(questionsJson) {
        return questionsJson.map(q => {
            const parsed = { type: q.type, time: q.time || 20000 };

            if (['quiz', 'multiple_select_quiz'].includes(q.type)) {
                parsed.answers = [];
                parsed.incorrectAnswers = [];
                q.choices.forEach((choice, i) => {
                    if (choice.correct) parsed.answers.push(i);
                    else parsed.incorrectAnswers.push(i);
                });
            } else if (q.type === 'open_ended') {
                parsed.answers = q.choices ? q.choices.map(c => c.answer) : [];
            }

            return parsed;
        });
    }

    // ====================== INPUT HANDLING ======================
    function handleInputChange() {
        let raw = inputBox.value.trim();
        let quizID = sanitizeInput(raw);

        if (!quizID) {
            inputBox.style.backgroundColor = '#333';
            return;
        }

        const url = `https://damp-leaf-16aa.johnwee.workers.dev/api-proxy/${encodeURIComponent(quizID)}`;

        fetch(url)
            .then(r => {
                if (!r.ok) throw new Error('Direct failed');
                return r.json();
            })
            .then(data => {
                inputBox.style.backgroundColor = '#0a0';
                dropdown.style.display = 'none';
                dropdownCloseButton.style.display = 'none';

                questions = parseQuestions(data.questions || []);
                info.numQuestions = questions.length;
                lastValidQuizID = quizID;

                updateQuestionsList(data.questions || []);
            })
            .catch(() => {
                inputBox.style.backgroundColor = '#f00';
                searchPublicUUID(quizID); // fallback
            });
    }

    // Le reste de ton code (searchPublicUUID, updateQuestionsList, resetUI, etc.) reste identique.

    // ====================== MAIN LOOP (mise à jour 2026) ======================
    setInterval(() => {
        // Détection question number (plusieurs fallbacks)
        let qIndexEl = findElement([
            '[data-functional-selector="question-index-counter"]',
            'div[class*="questionCounter"]',
            'span[class*="question"]'
        ]);

        if (qIndexEl) {
            const num = parseInt(qIndexEl.textContent);
            if (!isNaN(num)) info.questionNum = num - 1;
        }

        // Détection du moment où les réponses apparaissent
        const answerButtons = document.querySelectorAll('[data-functional-selector^="answer-"], button[role="button"]');
        if (answerButtons.length > 0 && info.lastAnsweredQuestion !== info.questionNum) {
            info.lastAnsweredQuestion = info.questionNum;
            onQuestionStart();
        }

        // Auto lag compensation
        if (autoAnswer && info.ILSetQuestion !== info.questionNum) {
            const incrementEl = findElement(['[data-functional-selector="score-increment"]']);
            if (incrementEl) {
                const incText = incrementEl.textContent;
                const increment = parseInt(incText.replace(/[^0-9-]/g, '')) || 0;

                if (increment !== 0) {
                    info.ILSetQuestion = info.questionNum;
                    let adjustment = (PPT - increment) * 12;
                    inputLag = Math.max(30, Math.round(inputLag + adjustment));
                }
            }
        }

        // Update label
        questionsLabel.textContent = `Question ${info.questionNum + 1} / ${info.numQuestions || '?'}`;

        // PIN detection (très améliorée)
        let pin = null;

        // Méthodes 2026
        const pinInput = document.querySelector('input[name="gameId"], input[placeholder*="PIN"], input[data-functional-selector*="pin"]');
        if (pinInput && pinInput.value) pin = pinInput.value.trim();

        if (!pin) {
            const pinDisplay = document.querySelector('[data-functional-selector*="pin"], .pin-code, .game-pin, span[class*="pin"]');
            if (pinDisplay) pin = pinDisplay.textContent.trim().replace(/\D/g, '');
        }

        if (pin && pin.length >= 5) {
            lastKnownPin = pin;
        }

        // Affichage PIN seulement sur les pages de jeu
        if (isGameRelatedPage()) {
            if (lastKnownPin) {
                gamePinLabel.textContent = lastKnownPin;
                gamePinBox.setAttribute('data-pin', lastKnownPin);
                gamePinBox.setAttribute('data-has-pin', 'true');
                copyIcon.style.display = 'inline-block';
            }
        } else {
            gamePinLabel.textContent = 'None';
            gamePinBox.removeAttribute('data-pin');
            gamePinBox.removeAttribute('data-has-pin');
            copyIcon.style.display = 'none';
        }
    }, 80); // intervalle plus rapide

    function isGameRelatedPage() {
        const p = window.location.pathname;
        return /\/(join|instructions|start|getready|gameblock|answer|ranking|contentblock)/.test(p);
    }

    // ====================== INITIALISATION ======================
    // Colle tout le code de création de l'UI ici (celui que tu avais déjà)
    // Puis ajoute à la fin :

    document.body.appendChild(uiElement);

    // Event listeners existants (inputBox, buttons, etc.) restent les mêmes.

    console.log(`%c[spirituhq v${Version}] Loaded & ready for 2026`, 'color:#0f0; font-weight:bold');
})();
