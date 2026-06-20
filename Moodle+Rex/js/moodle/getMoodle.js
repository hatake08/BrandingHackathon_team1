class GetMoodleData {

    static getAttendance(){
        return null;
    }

    static async getAssignment() {
        console.log("getAssignment関数がスタートしました");

        const links = document.querySelectorAll(".section_goto a");
        console.log(`見つかった各回のページ数: ${links.length}個`);

        if (links.length === 0) return { submitted: 0, total: 0, tasks: [] };
        
        let submittedCount = 0;
        let totalCount = 0;
        const parser = new DOMParser();

        const taskList = [];

        for (let link of links) {
            const url = link.href;
            
            await new Promise(resolve => setTimeout(resolve, 150));
            console.log(`➔ 回のページを読み込み中: ${url}`);

            try {
                const response = await fetch(url);
                const htmlText = await response.text();
                const doc = parser.parseFromString(htmlText, 'text/html');

                const activityInfos = doc.querySelectorAll(".activity-information");

                activityInfos.forEach(activityInfo => {
                    const activityName = activityInfo.getAttribute("data-activityname") || "";

                    const isTargetTask = activityName.includes("クイズ") || 
                                        activityName.includes("課題") || 
                                        activityName.includes("テスト") || 
                                        activityName.includes("レポート");

                    if (!isTargetTask || activityName.includes("opens") || activityName.includes("開始")) {
                        return; 
                    }

                    console.log(`   ➔ ターゲット課題検知: 「${activityName}」`);

                    // 4. その課題の枠の中に「緑の完了ボタン (.btn-success)」があるかチェック
                    const isCompleted = activityInfo.querySelector(".btn-success") !== null;

                    if (isCompleted) {
                        console.log(`       ★ 【ステータス】クリア ⭕`);
                        submittedCount++;
                    } else {
                        console.log(`       ★ 【ステータス】未完了 ❌`);
                    }

                    taskList.push({
                        id: activityName.trim(), // 名前そのものを目印にする
                        title: activityName.replace(' 課題', '').replace(' 小テスト', '').trim(),
                        isCompleted: isCompleted,
                        isCustom: false
                    });

                    totalCount++;
                });

            } catch (e) {
                console.error(`各回のページ [${url}] の解析に失敗しました:`, e);
            }
        }

        console.log(`【巡回集計完了】 検出された総課題数(分母): ${totalCount}, 提出数(分子): ${submittedCount}`);
        
        return { 
            submitted: submittedCount, 
            total: totalCount,
            tasks: taskList
        };
    }
}