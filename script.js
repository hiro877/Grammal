const startScreen = document.getElementById('start-screen');
const quizScreen = document.getElementById('quiz-screen');
const listScreen = document.getElementById('list-screen');

const startQuizButton = document.getElementById('start-quiz-button');
const selectQuestionButton = document.getElementById('select-question-button');
const backToTitleFromQuiz = document.getElementById('back-to-title-from-quiz');
const backToTitleFromList = document.getElementById('back-to-title-from-list');
const selectAllButton = document.getElementById('select-all-button');
const deselectAllButton = document.getElementById('deselect-all-button');

const sentenceDisplay = document.getElementById('sentence-display');
const wordBank = document.getElementById('word-bank');
const answerBox = document.getElementById('answer-box');
const checkButton = document.getElementById('check-button');
const nextButton = document.getElementById('next-button');
const result = document.getElementById('result');
const modeSelector = document.getElementById('mode');
const showAnswerButton = document.getElementById('show-answer-button');
const questionTableBody = document.querySelector('#question-table tbody');
const questionCounter = document.getElementById('question-counter');

let activeSentences = [];
let currentSentenceIndex = 0;
let currentMode = 'en-ja';
let questionCheckedState = new Array(sentences.length).fill(true);
let score = 0;

// --- 画面遷移ロジック ---
startQuizButton.addEventListener('click', () => {
    const selectedIndexes = [];
    questionCheckedState.forEach((isChecked, index) => {
        if (isChecked) {
            selectedIndexes.push(index);
        }
    });

    if (selectedIndexes.length === 0) {
        alert('出題する問題を1つ以上選択してください。');
        return;
    }

    activeSentences = selectedIndexes.map(index => ({
        originalIndex: index,
        sentence: sentences[index],
        answeredCorrectly: false
    }));
    currentSentenceIndex = 0;
    score = 0;

    startScreen.classList.add('hidden');
    quizScreen.classList.remove('hidden');
    displayQuestion();
});

selectQuestionButton.addEventListener('click', () => {
    startScreen.classList.add('hidden');
    listScreen.classList.remove('hidden');
    populateQuestionList();
});

function goBackToTitle() {
    quizScreen.classList.add('hidden');
    listScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
}

backToTitleFromQuiz.addEventListener('click', goBackToTitle);
backToTitleFromList.addEventListener('click', goBackToTitle);

selectAllButton.addEventListener('click', () => {
    questionCheckedState.fill(true);
    populateQuestionList();
});

deselectAllButton.addEventListener('click', () => {
    questionCheckedState.fill(false);
    populateQuestionList();
});

// --- 問題一覧表示ロジック ---
function populateQuestionList() {
    questionTableBody.innerHTML = '';
    sentences.forEach((sentence, index) => {
        const row = document.createElement('tr');
        
        const checkboxCell = document.createElement('td');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = questionCheckedState[index];
        checkbox.dataset.index = index;
        checkbox.addEventListener('change', () => {
            questionCheckedState[index] = checkbox.checked;
        });
        checkboxCell.appendChild(checkbox);

        const englishCell = document.createElement('td');
        const japaneseCell = document.createElement('td');
        englishCell.textContent = sentence.english.join(' ');
        japaneseCell.textContent = sentence.japanese.join(' ');
        
        row.appendChild(checkboxCell);
        row.appendChild(englishCell);
        row.appendChild(japaneseCell);
        questionTableBody.appendChild(row);
    });
}

// --- クイズロジック ---
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function displayQuestion() {
    if (activeSentences.length === 0 || currentSentenceIndex >= activeSentences.length) {
        goBackToTitle();
        return;
    }

    questionCounter.textContent = `${currentSentenceIndex + 1} / ${activeSentences.length}`;

    const currentQuizQuestion = activeSentences[currentSentenceIndex];
    const currentSentence = currentQuizQuestion.sentence;
    let questionWords, answerWords;

    let isEnglishToJapanese = (currentMode === 'random') ? (Math.random() < 0.5) : (currentMode === 'en-ja');

    if (isEnglishToJapanese) {
        questionWords = currentSentence.english;
        answerWords = currentSentence.japanese;
    } else {
        questionWords = currentSentence.japanese;
        answerWords = currentSentence.english;
    }

    sentenceDisplay.textContent = questionWords.join(' ');
    const shuffledWords = shuffle([...answerWords]);

    wordBank.innerHTML = '';
    shuffledWords.forEach(word => {
        const button = document.createElement('button');
        button.textContent = word;
        button.classList.add('word-btn');
        button.addEventListener('click', () => moveWordToAnswer(button));
        wordBank.appendChild(button);
    });

    answerBox.innerHTML = '';
    result.textContent = '';
    nextButton.style.display = 'none';
    checkButton.style.display = 'inline-block';
    showAnswerButton.style.display = 'none';
}

function moveWordToAnswer(wordButton) {
    answerBox.appendChild(wordButton);
    wordButton.removeEventListener('click', () => moveWordToAnswer(wordButton));
    wordButton.addEventListener('click', () => moveWordToBank(wordButton));
}

function moveWordToBank(wordButton) {
    wordBank.appendChild(wordButton);
    wordButton.removeEventListener('click', () => moveWordToBank(wordButton));
    wordButton.addEventListener('click', () => moveWordToAnswer(wordButton));
}

checkButton.addEventListener('click', () => {
    const selectedWords = Array.from(answerBox.children).map(btn => btn.textContent);
    const currentQuizQuestion = activeSentences[currentSentenceIndex];
    const currentSentence = currentQuizQuestion.sentence;

    let isEnglishToJapanese = sentenceDisplay.textContent === currentSentence.english.join(' ');
    const correctWords = isEnglishToJapanese ? currentSentence.japanese : currentSentence.english;

    if (JSON.stringify(selectedWords) === JSON.stringify(correctWords)) {
        result.textContent = '正解！';
        result.className = 'correct';
        checkButton.style.display = 'none';
        score++;
        currentQuizQuestion.answeredCorrectly = true;
    } else {
        result.textContent = '不正解。答えを確認できます。';
        result.className = 'incorrect';
        showAnswerButton.style.display = 'inline-block';
        currentQuizQuestion.answeredCorrectly = false;
    }
    nextButton.style.display = 'inline-block';
});

showAnswerButton.addEventListener('click', () => {
    const currentSentence = activeSentences[currentSentenceIndex].sentence;
    let isEnglishToJapanese = sentenceDisplay.textContent === currentSentence.english.join(' ');
    const correctWords = isEnglishToJapanese ? currentSentence.japanese : currentSentence.english;
    
    answerBox.innerHTML = '';
    correctWords.forEach(word => {
        const button = document.createElement('button');
        button.textContent = word;
        button.classList.add('word-btn');
        button.disabled = true;
        answerBox.appendChild(button);
    });

    wordBank.innerHTML = '';
});

nextButton.addEventListener('click', () => {
    currentSentenceIndex++;
    if (currentSentenceIndex >= activeSentences.length) {
        alert(`クイズ終了！\n\n${score} / ${activeSentences.length} 問正解しました。`);

        activeSentences.forEach(question => {
            questionCheckedState[question.originalIndex] = !question.answeredCorrectly;
        });

        goBackToTitle();
    } else {
        displayQuestion();
    }
});

modeSelector.addEventListener('change', (event) => {
    currentMode = event.target.value;
    currentSentenceIndex = 0;
    displayQuestion();
});