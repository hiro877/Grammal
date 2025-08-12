// data.jsから読み込まれるグローバルなsentences変数を、このスクリプトのスコープで安全に扱うための準備
const originalSentences = [...sentences];

const startScreen = document.getElementById('start-screen');
const quizScreen = document.getElementById('quiz-screen');
const listScreen = document.getElementById('list-screen');

const startQuizButton = document.getElementById('start-quiz-button');
const selectQuestionButton = document.getElementById('select-question-button');
const backToTitleFromQuiz = document.getElementById('back-to-title-from-quiz');
const backToTitleFromList = document.getElementById('back-to-title-from-list');
const selectAllButton = document.getElementById('select-all-button');
const deselectAllButton = document.getElementById('deselect-all-button');
const uploadDataFile = document.getElementById('upload-data-file');
const deleteDatasetButton = document.getElementById('delete-dataset-button');
const datasetSelect = document.getElementById('dataset-select');

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
let questionCheckedState = [];
let score = 0;
let currentSentences = []; // 現在選択されている問題セットを保持
const STORAGE_KEY = 'custom_english_quiz_datasets';

// --- データセット管理ロジック ---

// スクリプトを動的に読み込むヘルパー関数
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
        document.head.appendChild(script);
    });
}

function getCustomDatasets() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
}

function saveCustomDatasets(datasets) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(datasets));
}

async function updateDatasetSelector() {
    const customDatasets = getCustomDatasets();
    const selectedValue = datasetSelect.value;

    datasetSelect.innerHTML = '<option value="original">元の問題</option>';
    
    // 静的データセットを追加
    if (typeof staticDatasets !== 'undefined') { // staticDatasetsがロードされているか確認
        staticDatasets.forEach(dataset => {
            const option = document.createElement('option');
            option.value = `static-${dataset.name}`;
            option.textContent = `静的: ${dataset.name}`;
            datasetSelect.appendChild(option);
        });
    }

    // カスタムデータセットを追加
    for (const name in customDatasets) {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        datasetSelect.appendChild(option);
    }
    
    // 以前選択していた値があればそれを復元、なければ「元の問題」を選択
    if (selectedValue && (customDatasets[selectedValue] || selectedValue.startsWith('static-'))) {
        datasetSelect.value = selectedValue;
    } else {
        datasetSelect.value = 'original';
    }
    
    deleteDatasetButton.style.display = datasetSelect.value === 'original' || datasetSelect.value.startsWith('static-') ? 'none' : 'inline-block';
}

async function loadSelectedDataset() {
    const selectedName = datasetSelect.value;
    if (selectedName === 'original') {
        currentSentences = [...originalSentences];
    } else if (selectedName.startsWith('static-')) {
        const staticDatasetName = selectedName.replace('static-', '');
        const datasetInfo = staticDatasets.find(d => d.name === staticDatasetName);
        if (datasetInfo) {
            try {
                const response = await fetch(datasetInfo.path);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const fileContent = await response.text();
                // ファイル内容を安全に評価してsentences配列を取得
                const newSentences = new Function(`${fileContent}; return sentences;`)();
                if (!Array.isArray(newSentences)) {
                    throw new Error('ファイルに"sentences"という名前の配列が含まれていません。');
                }
                currentSentences = [...newSentences];
            } catch (error) {
                console.error(`静的データセットの読み込みに失敗しました: ${datasetInfo.path}`, error);
                alert(`静的データセット「${staticDatasetName}」の読み込みに失敗しました。エラー: ${error.message}`);
                currentSentences = []; // エラー時は空にするか、元の問題に戻す
            }
        } else {
            currentSentences = [];
        }
    } else {
        const customDatasets = getCustomDatasets();
        currentSentences = customDatasets[selectedName];
    }
    questionCheckedState = new Array(currentSentences.length).fill(true);
    populateQuestionList();
}

// アプリ起動時に静的データセットマニフェストをロード
loadScript('./static_datasets_manifest.js')
    .then(() => {
        console.log('Static datasets manifest loaded.');
        // マニフェストロード後に初期化処理を呼び出す
        updateDatasetSelector();
        loadSelectedDataset();
    })
    .catch(error => {
        console.error('Failed to load static datasets manifest:', error);
        // マニフェストがロードできない場合でも、アプリの基本機能は動作するようにする
        updateDatasetSelector();
        loadSelectedDataset();
    });

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
        sentence: currentSentences[index],
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
    updateDatasetSelector();
    loadSelectedDataset();
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

// --- データセット関連イベントリスナー ---

datasetSelect.addEventListener('change', loadSelectedDataset);

uploadDataFile.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const datasetName = prompt('この問題セットの名前を入力してください:', file.name.replace(/\.js$/, ''));
    if (!datasetName) {
        uploadDataFile.value = ''; // プロンプトがキャンセルされた場合もリセット
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const fileContent = e.target.result;
            // ファイル内容を安全に評価してsentences配列を取得
            const newSentences = new Function(`${fileContent}; return sentences;`)();
            if (!Array.isArray(newSentences)) {
                throw new Error('ファイルに"sentences"という名前の配列が含まれていません。');
            }

            const customDatasets = getCustomDatasets();
            customDatasets[datasetName] = newSentences;
            saveCustomDatasets(customDatasets);

            updateDatasetSelector();
            datasetSelect.value = datasetName; // アップロードしたデータセットを選択状態にする
            loadSelectedDataset();
            alert(`問題セット「${datasetName}」が保存されました。`);
        } catch (error) {
            console.error('ファイルの処理中にエラーが発生しました:', error);
            alert(`エラー: ${error.message}`);
        }
    };
    reader.readAsText(file);
    uploadDataFile.value = ''; // 同じファイルを連続で選択できるようにリセット
});

deleteDatasetButton.addEventListener('click', () => {
    const selectedName = datasetSelect.value;
    if (selectedName === 'original' || !confirm(`問題セット「${selectedName}」を削除しますか？この操作は元に戻せません。`)) {
        return;
    }

    const customDatasets = getCustomDatasets();
    delete customDatasets[selectedName];
    saveCustomDatasets(customDatasets);

    updateDatasetSelector();
    loadSelectedDataset(); // リストを再読み込み
    alert(`問題セット「${selectedName}」を削除しました。`);
});


// --- 問題一覧表示ロジック ---
function populateQuestionList() {
    questionTableBody.innerHTML = '';
    currentSentences.forEach((sentence, index) => {
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
