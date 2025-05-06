document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const apiKeyInput = document.getElementById('apiKeyInput');
    const saveApiKeyButton = document.getElementById('saveApiKeyButton');
    const clearApiKeyButton = document.getElementById('clearApiKeyButton');
    const apiKeyStatus = document.getElementById('apiKeyStatus');
    const wordInput = document.getElementById('wordInput');
    const searchButton = document.getElementById('searchButton');
    const statusMessage = document.getElementById('statusMessage');
    const resultSection = document.getElementById('resultSection');
    const wordTitle = document.getElementById('wordTitle');
    const wordIpa = document.getElementById('wordIpa');
    const etymologyAnalysis = document.getElementById('etymologyAnalysis');
    const wordPhrases = document.getElementById('wordPhrases');
    const wordExamples = document.getElementById('wordExamples');
    const relatedWords = document.getElementById('relatedWords');

    // Constants
    const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
    const API_KEY_STORAGE_KEY = 'deepseek_api_key';

    // --- API Key Management ---
    function loadApiKey() {
        const storedKey = localStorage.getItem(API_KEY_STORAGE_KEY);
        if (storedKey) {
            apiKeyInput.value = storedKey;
            apiKeyStatus.textContent = 'API Key 已加载。';
            apiKeyStatus.style.color = 'green';
        } else {
            apiKeyStatus.textContent = '请先输入并保存您的 DeepSeek API Key。';
            apiKeyStatus.style.color = '#666';
        }
    }

    function saveApiKey() {
        const apiKey = apiKeyInput.value.trim();
        if (apiKey) {
            localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
            apiKeyStatus.textContent = 'API Key 已保存！';
            apiKeyStatus.style.color = 'green';
        } else {
            apiKeyStatus.textContent = 'API Key 不能为空！';
            apiKeyStatus.style.color = 'red';
        }
    }

    function clearApiKey() {
        localStorage.removeItem(API_KEY_STORAGE_KEY);
        apiKeyInput.value = '';
        apiKeyStatus.textContent = 'API Key 已清除。';
        apiKeyStatus.style.color = '#666';
    }

    saveApiKeyButton.addEventListener('click', saveApiKey);
    clearApiKeyButton.addEventListener('click', clearApiKey);
    loadApiKey();

    // --- Core API Call Function ---
    async function callDeepseekAPI(prompt, apiKey) {
        if (!apiKey) {
            throw new Error("API Key 缺失。请先保存您的 API Key。");
        }

        try {
            const response = await fetch(DEEPSEEK_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "deepseek-chat",
                    messages: [
                        { 
                            "role": "system", 
                            "content": "You are an expert English etymology assistant that provides detailed word analysis for Chinese learners." 
                        },
                        { "role": "user", "content": prompt }
                    ],
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`API 错误 (${response.status}): ${errorData.error?.message || response.statusText}`);
            }

            const data = await response.json();
            if (data.choices && data.choices.length > 0 && data.choices[0].message) {
                return data.choices[0].message.content.trim();
            }
            throw new Error("API 返回格式无效");
        } catch (error) {
            console.error('调用 Deepseek API 出错:', error);
            throw error;
        }
    }

    // --- Word Analysis Logic ---
    searchButton.addEventListener('click', async () => {
        const word = wordInput.value.trim();
        const apiKey = localStorage.getItem(API_KEY_STORAGE_KEY);

        // Validation
        if (!apiKey) {
            showStatus('错误：请先输入并保存 API Key。', 'error');
            apiKeyInput.focus();
            return;
        }

        if (!word) {
            showStatus('错误：请输入要查询的单词。', 'error');
            wordInput.focus();
            return;
        }

        // Prepare UI
        showStatus('正在查询，请稍候...', 'loading');
        searchButton.disabled = true;
        resultSection.style.display = 'none';

        try {
            // Construct prompt
            const prompt = `请对单词 "${word}" 进行详细的词根词缀分析，并以 JSON 格式返回以下信息：
1. 单词: "${word}"
2. 音标 (IPA)
3. 词根词缀拆解 (如: prefix-root-suffix)
4. 每个词根/词缀的含义解释
5. 常用短语/搭配 (3-5个)
6. 例句:
   - 简单句 (CEFR A2/B1)
   - 复杂句 (CEFR B2/C1)
7. 相关词汇 (3-5个基于相同词根的单词)
   - 对每个相关词汇提供:
     * 单词
     * 音标
     * 1个短语/搭配
     * 1个例句

要求:
- 所有解释使用英文
- 返回严格符合以下 JSON 格式:
{
  "word": "",
  "ipa": "",
  "etymology": {
    "breakdown": "",
    "meanings": []
  },
  "phrases": [],
  "examples": {
    "simple": "",
    "complex": ""
  },
  "relatedWords": [
    {
      "word": "",
      "ipa": "",
      "phrase": "",
      "example": ""
    }
  ]
}`;

            // Call API
            const result = await callDeepseekAPI(prompt, apiKey);
            const data = parseApiResult(result);
            displayResults(data);
            showStatus('查询完成！', 'success');
        } catch (error) {
            console.error("单词分析失败:", error);
            showStatus(`错误: ${error.message}`, 'error');
        } finally {
            searchButton.disabled = false;
        }
    });

    function parseApiResult(result) {
        try {
            // Try to parse as JSON
            const startIdx = result.indexOf('{');
            const endIdx = result.lastIndexOf('}');
            const jsonStr = result.slice(startIdx, endIdx + 1);
            return JSON.parse(jsonStr);
        } catch (e) {
            console.error("解析 API 结果失败:", e);
            throw new Error("无法解析 API 返回结果");
        }
    }

    function displayResults(data) {
        // Clear previous results
        etymologyAnalysis.innerHTML = '';
        wordPhrases.innerHTML = '';
        wordExamples.innerHTML = '';
        relatedWords.innerHTML = '';

        // Display main word info
        wordTitle.textContent = data.word;
        wordIpa.textContent = data.ipa;

        // Display etymology
        const etymologyHTML = `
            <p><strong>结构:</strong> ${data.etymology.breakdown}</p>
            <p><strong>含义分析:</strong></p>
            <ul>
                ${data.etymology.meanings.map(m => `<li>${m}</li>`).join('')}
            </ul>
        `;
        etymologyAnalysis.innerHTML = etymologyHTML;

        // Display phrases
        data.phrases.forEach(phrase => {
            const li = document.createElement('li');
            li.textContent = phrase;
            wordPhrases.appendChild(li);
        });

        // Display examples
        wordExamples.innerHTML = `
            <p class="example simple-example"><strong>简单例句:</strong> ${data.examples.simple}</p>
            <p class="example complex-example"><strong>复杂例句:</strong> ${data.examples.complex}</p>
        `;

        // Display related words
        data.relatedWords.forEach(related => {
            const card = document.createElement('div');
            card.className = 'word-card';
            card.innerHTML = `
                <h4>${related.word} <span class="ipa">${related.ipa}</span></h4>
                <p><strong>短语:</strong> ${related.phrase}</p>
                <p class="example"><strong>例句:</strong> ${related.example}</p>
            `;
            relatedWords.appendChild(card);
        });

        // Show results section
        resultSection.style.display = 'block';
    }

    function showStatus(message, type) {
        statusMessage.textContent = message;
        statusMessage.className = `status-message ${type}`;
    }

    // Enable search on Enter key
    wordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchButton.click();
        }
    });
});
