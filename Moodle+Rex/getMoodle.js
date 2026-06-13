class GetMoodleData {
    static getAttendance(){
        return null;
    }

    static async getAssignment(){
        console.log("getAssignment関数がスタートしました");

        const links = document.querySelectorAll(".section_goto a");

        console.log(`見つかったリンクの数: ${links.length}個`);

        if (links.length === 0){
            return { submitted: 0, total: 0 };
        }

        let submittedCount = 0;
        let totalCount = 0;

        for (let link of links){
            const url = link.href;
            await new Promise(resolve => setTimeout(resolve, 200));

            console.log(`読み込み中 ${url}`);

            const response = await fetch(url);
            const htmlText = await response.text();

            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlText, 'text/html');

            const activityInfos = doc.querySelectorAll(".activity-information");

            activityInfos.forEach(activityInfo => {
                const activityName = activityInfo.getAttribute("data-activityname") || "";

                console.log("活動の名前:", activityName);

                const isTargetTask = activityName.includes("クイズ") || 
                                     activityName.includes("課題") || 
                                     activityName.includes("テスト") || 
                                     activityName.includes("レポート");

                if (!isTargetTask) {
                    console.log(`➔ 【対象外】「${activityName}」は資料等のためスキップします`);
                    return; 
                }

                const isCompleted = activityInfo.querySelector(".btn-success");

                if (isCompleted){
                    console.log(`➔ 【カウント】「${activityName}」はクリアしています`);
                    submittedCount++;
                } else {
                    console.log(`➔ 【カウント】「${activityName}」は未完了です`);
                }

                totalCount++;
            });        }

        console.log(`集計完了 対象の提出数: ${submittedCount}, 対象の総数: ${totalCount}`);
        return { submitted: submittedCount, total: totalCount };
    }
}