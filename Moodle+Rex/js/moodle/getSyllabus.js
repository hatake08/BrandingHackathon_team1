class GetSyllabusData {
    static async getEvaluationWeight(courseId) {
        console.log(`========================================`);
        console.log(`科目ID: ${courseId}`);

        let result = {
            exam: 0,
            daily: 0
        };

        // 画面から5桁の授業コードを抽出
        const summaryElement = document.querySelector(".block_course_summary .text_to_html");
        let classCode = null;

        if (summaryElement) {
            const htmlContent = summaryElement.innerHTML || "";
            const lines = htmlContent.split(/<br\s*\/?>/i);
            for (let line of lines) {
                const cleanLine = line.replace(/<\/?[^>]+(>|$)/g, "").trim();
                const match = cleanLine.match(/(\d{5})/);
                if (match && !cleanLine.startsWith("2026")) {
                    classCode = match[1];
                    break;
                }
            }
        }

        // ストレージから既存のデータを検索
        const cacheKey = `syllabus_${classCode}`;
        const cachedData = await new Promise((resolve) => {
            chrome.storage.local.get([cacheKey], (res) => resolve(res[cacheKey]));
        });

        if (cachedData) {
            return cachedData;
        }

        // 初回起動
        // バックグラウンドにシラバス同期をしてもらう
        const response = await new Promise((resolve) => {
            chrome.runtime.sendMessage({ action: "openSyllabusTab", classCode: classCode }, resolve);
        });

        if (response && response.success && response.data) {
            result.exam = response.data.exam;
            result.daily = response.data.daily;
            console.log(`シラバス同期に成功：定期試験: ${result.exam}%, その他: ${result.daily}%`);
        }

        await new Promise((resolve) => {
            chrome.storage.local.set({ [cacheKey]: result }, () => {
                console.log("データをローカルに保存");
                resolve();
            });
        });

        console.log(`========================================`);
        return result;
    }
}