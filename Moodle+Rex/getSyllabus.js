// getSyllabus.js
class GetSyllabusData {
    /**
     * 科目IDからSalesforceシラバスを解析し、成績評価の重みと総課題数を取得する
     * @param {string} courseId - Moodleの科目ID（URLの id=XXXXX）
     * @returns {Promise<{attendance: number, assignment: number, totalTasks: number}>}
     */
    static async getEvaluationWeight(courseId) {
        console.log(`シラバス・Salesforce解析起動: 科目ID [${courseId}]`);

        // 万が一通信エラーや非ログインで読めなかった場合のデフォルト値
        let result = {
            attendance: 0,
            assignment: 100, // オブジェクト指向論をベースにした安全なフォールバック
            totalTasks: 14
        };

        // 💡 オブジェクト指向論（ID: 36085）の時は1回2個なので分母を28に固定
        if (courseId === "36085") {
            result.totalTasks = 14 * 2; // 28個
        }

        try {
            // Moodleの授業ページからシラバスへの直通URL（または学内SalesforceのシラバスURL）
            const syllabusUrl = `https://lms.ritsumei.ac.jp/course/view.php?id=${courseId}`; 
            
            const response = await fetch(syllabusUrl);
            const htmlText = await response.text();
            
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlText, 'text/html');

            // 🛠️ 【Salesforce LWC 特有のハック】
            // 全てのセルが <div class="slds-cell-wrap"> なので、親の「行（tr）」をすべて取得する
            const rows = doc.querySelectorAll('table tr, tr');
            
            let foundCustomWeight = false;
            let tempAttendance = 0;
            let tempAssignment = 0;

            rows.forEach(row => {
                // 行の中にある .slds-cell-wrap をすべて取得
                const cells = row.querySelectorAll('.slds-cell-wrap, td');
                
                // 1列目が「種別」、2列目が「割合(%)」の構造になっているかチェック
                if (cells.length >= 2) {
                    const typeText = cells[0].textContent.trim();    // 例: "定期試験（筆記）"
                    const percentText = cells[1].textContent.trim(); // 例: "80" や "20"

                    const percentNum = parseInt(percentText, 10);
                    if (isNaN(percentNum)) return;

                    console.log(`   ➔ [シラバス行発見] 種別: ${typeText} ➔ 割合: ${percentNum}%`);

                    // 1列目のテキスト内容で「これは何の点数か」をキーワードで仕分ける
                    if (typeText.includes("出席") || typeText.includes("平常点評価") && typeText.includes("出席")) {
                        tempAttendance += percentNum;
                        foundCustomWeight = true;
                    } 
                    // 「上記以外の試験・レポート」「ミニ課題」など、今回のプログラムで追いたいタスク
                    else if (typeText.includes("上記以外の試験") || typeText.includes("レポート") || typeText.includes("課題") || typeText.includes("クイズ") || typeText.includes("小テスト")) {
                        tempAssignment += percentNum;
                        foundCustomWeight = true;
                    }
                }
            });

            // 1件でもマッチする評価行が見つかれば、数値を上書き
            if (foundCustomWeight) {
                result.attendance = tempAttendance;
                result.assignment = tempAssignment;
                
                // もし「平常点100%」などの極端な授業で、上のキーワードに引っかからなかった場合の保険
                if (result.attendance === 0 && result.assignment === 0) {
                    result.assignment = 100;
                }
            }

            console.log(`🎯 シラバス解析成功 ➔ 適用配点: 出席=${result.attendance}%, 課題/テスト=${result.assignment}%, 想定分母=${result.totalTasks}個`);
            return result;

        } catch (error) {
            console.warn("シラバスの動的パースに失敗したため、初期値を適用します:", error);
            return result;
        }
    }
}