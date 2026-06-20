class GetMoodleData {

    static getAttendance(){
        return null;
    }

    static async getAssignment() {
        console.log("getAssignment関数（授業ページ完全巡回版）がスタートしました");

        // 1. 授業トップページから、各回（第1回〜第14回など）へのリンクをすべて取得
        const links = document.querySelectorAll(".section_goto a");
        console.log(`見つかった各回のページ数: ${links.length}個`);

        if (links.length === 0) return { submitted: 0, total: 0 };
        
        let submittedCount = 0;
        let totalCount = 0;
        const parser = new DOMParser();

        // 2. 見つかった回のページを順番にめくっていく（直列処理）
        for (let link of links) {
            const url = link.href;
            
            // サーバーに負荷をかけない＆ブラウザに怪しまれないための絶妙な待機（150ms）
            await new Promise(resolve => setTimeout(resolve, 150));
            console.log(`➔ 回のページを読み込み中: ${url}`);

            try {
                const response = await fetch(url);
                const htmlText = await response.text();
                const doc = parser.parseFromString(htmlText, 'text/html');

                // 3. その回のページの中にある「活動（課題やクイズ）」の枠をすべて取得
                const activityInfos = doc.querySelectorAll(".activity-information");

                activityInfos.forEach(activityInfo => {
                    // 活動の名称（例: "第8回ミニ課題", "確認クイズ" など）を取得
                    const activityName = activityInfo.getAttribute("data-activityname") || "";

                    // 「クイズ」「課題」「テスト」「レポート」という言葉が含まれるものだけを標的にする
                    const isTargetTask = activityName.includes("クイズ") || 
                                        activityName.includes("課題") || 
                                        activityName.includes("テスト") || 
                                        activityName.includes("レポート");

                    // 資料やただのURL、かつ「開始」系の重複イベントはすべてスルー
                    if (!isTargetTask || activityName.includes("opens") || activityName.includes("開始")) {
                        return; 
                    }

                    console.log(`   ➔ ターゲット課題検知: 「${activityName}」`);

                    // 4. その課題の枠の中に「緑の完了ボタン (.btn-success)」があるかチェック
                    // ページ直行型なので、Moodle標準の完了ボタンが100%ヒットします
                    const isCompleted = activityInfo.querySelector(".btn-success");

                    if (isCompleted) {
                        console.log(`       ★ 【ステータス】クリア ⭕`);
                        submittedCount++;
                    } else {
                        console.log(`       ★ 【ステータス】未完了 ❌`);
                    }

                    totalCount++;
                });

            } catch (e) {
                console.error(`各回のページ [${url}] の解析に失敗しました:`, e);
            }
        }

        console.log(`【巡回集計完了】 検出された総課題数(分母): ${totalCount}, 提出数(分子): ${submittedCount}`);
        return { submitted: submittedCount, total: totalCount };
    }
}