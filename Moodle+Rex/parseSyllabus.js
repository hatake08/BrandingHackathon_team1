(async function() {
    const urlParams = new URLSearchParams(window.location.search);
    const isAutoFetch = urlParams.get('autofetch');
    const classCode = urlParams.get('coursecode');

    if (isAutoFetch !== 'true' || !classCode) return;

    if (!window.location.href.includes("/s/r-syllabus/")) {
        let keywordInput = null;
        let searchButton = null;

        for (let i = 0; i < 100; i++) {
            keywordInput = document.querySelector('input[name="keyword-search"]') || document.querySelector('input[placeholder*="授業コード"]');
            const buttons = document.querySelectorAll('button.slds-button_brand, button');
            for (let btn of buttons) {
                if (btn.textContent.includes("検索") && !btn.textContent.includes("クリア")) {
                    searchButton = btn;
                    break;
                }
            }
            if (keywordInput && searchButton) break;
            await new Promise(r => setTimeout(r, 100));
        }

        if (!keywordInput || !searchButton) {
            chrome.runtime.sendMessage({ action: "syllabusParseComplete", data: null });
            return;
        }

        keywordInput.value = classCode;
        keywordInput.setAttribute('value', classCode);
        keywordInput.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
        keywordInput.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
        await new Promise(r => setTimeout(r, 300));

        searchButton.click();

        let resultLink = null;
        for (let j = 0; j < 80; j++) { 
            resultLink = document.querySelector('a[href*="/s/r-syllabus/"]') || document.querySelector('.slds-card a');
            if (resultLink && resultLink.href.includes("/s/r-syllabus/")) break;
            await new Promise(r => setTimeout(r, 100));
        }

        if (resultLink) {
            const nextUrl = `https://syllabus.ritsumei.ac.jp${resultLink.getAttribute('href')}${(resultLink.getAttribute('href').includes('?') ? '&' : '?')}autofetch=true&coursecode=${classCode}`;
            window.location.href = nextUrl;
        } else {
            chrome.runtime.sendMessage({ action: "syllabusParseComplete", data: null });
        }
    } 
    
    else if (window.location.href.includes("/s/r-syllabus/")) {
        await new Promise(r => setTimeout(r, 3000));

        let tempExam = 0;
        let tempDaily = 0;
        let foundCustomWeight = false;

        let evaluationSection = null;
        const allElements = document.querySelectorAll('h1, h2, h3, div, span, label, th');
        for (let el of allElements) {
            const text = el.textContent.trim();
            if (text === "評価方法" || text === "成績評価基準" || text === "評価基準") {
                evaluationSection = el.closest('.slds-card') || el.parentElement;
                break;
            }
        }

        const searchArea = evaluationSection || document;
        const rows = searchArea.querySelectorAll('tr');

        rows.forEach((row) => {
            const cells = Array.from(row.querySelectorAll('td, th, div, span'))
                               .map(el => el.textContent.trim())
                               .filter(text => text.length > 0);

            const uniqueCells = [...new Set(cells)];

            if (uniqueCells.length >= 2) {
                const typeText = uniqueCells[0];
                
                for (let m = 1; m < uniqueCells.length; m++) {
                    const percentNum = parseInt(uniqueCells[m], 10);
                    
                    if (!isNaN(percentNum) && percentNum >= 5 && percentNum <= 100) {
                        if (
                            typeText.includes("出席") || typeText.includes("平常点") || 
                            typeText.includes("レポート") || typeText.includes("課題") || 
                            typeText.includes("クイズ") || typeText.includes("テスト") || 
                            typeText.includes("試験") || typeText.includes("発表") || 
                            typeText.includes("作品") || typeText.includes("成果") || 
                            typeText.includes("筆記") || typeText.includes("小テスト")
                        ) {

                            if (typeText.includes("定期試験") || typeText.includes("筆記試験") || typeText.includes("期末試験")) {
                                tempExam += percentNum;
                                foundCustomWeight = true;
                            } else {
                                tempDaily += percentNum;
                                foundCustomWeight = true;
                            }
                            break;
                        }
                    }
                }
            }
        });

        const parsedData = foundCustomWeight ? { exam: tempExam, daily: tempDaily } : null;
        console.log("[SyllabusHunter] Moodle側へ送る仕分けデータ：", parsedData);

        chrome.runtime.sendMessage({ action: "syllabusParseComplete", data: parsedData });
    }
})();