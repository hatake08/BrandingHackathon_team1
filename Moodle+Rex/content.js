// ==========================================
// 1. サイトのHTMLから現在の数字を取得する
// ==========================================
async function getPortalData() {
    const assignmentData = await GetMoodleData.getAssignment(); 
    const attendanceData = GetMoodleData.getAttendance(); // 現在は null が返ってくる

    let assignmentRate = 0;
    if (assignmentData && assignmentData.total > 0) {
        assignmentRate = assignmentData.submitted / assignmentData.total;
    }

    let attendanceRate = 0.80; 
    if (attendanceData && attendanceData.total > 0) {
        attendanceRate = attendanceData.present / attendanceData.total;
    }

    return {
        attendanceRate: attendanceRate,
        assignmentRate: assignmentRate
    };
}

function getSyllabusWeight() {
    return {
        attendance: 30,
        assignment: 40
    };
}

// ==========================================
// 2. 計算ロジック
// ==========================================
async function calculateScore() {
    const data = await getPortalData();
    const weight = getSyllabusWeight();

    // 割合と重みを掛け算
    const attendanceScore = data.attendanceRate * weight.attendance;
    const assignmentScore = data.assignmentRate * weight.assignment;
    
    const currentTotal = attendanceScore + assignmentScore;
    return Math.round(currentTotal);
}

// ==========================================
// 3. UIのインジェクション（サイト内埋め込み版）
// ==========================================
function injectDashboard(score) {
    if (document.getElementById('univ-calc-dashboard')) return;


    const targetElement = document.getElementById('region-main') || document.querySelector('.course-content');
    
    if (!targetElement) {
        console.log("埋め込み先のターゲット要素が見つかりませんでした。別のページを開いている可能性があります。");
        return;
    }

    const dashboard = document.createElement('div');
    dashboard.id = 'univ-calc-dashboard';
    
    dashboard.style.cssText = `
        background: #1a1a1a;
        color: #ffffff;
        padding: 20px;
        border-radius: 12px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.15);
        font-family: Arial, sans-serif;
        margin-bottom: 20px; /* 下のコンテンツとの隙間 */
        width: 100%; /* 横幅いっぱいに広げる */
        box-sizing: border-box;
    `;

    // 単位取得ライン（60点）までの進捗率
    const progressPercent = Math.min((score / 60) * 100, 100);

    // HTMLの中身を構築
    dashboard.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <h4 style="margin: 0; font-size: 16px; color: #deff9a; font-weight: bold;">📊 単位取得 進捗状況/h4>
            <span style="font-size: 12px; color: #aaa;">拡張機能により自動生成</span>
        </div>
        <div style="display: flex; align-items: baseline; margin-bottom: 5px;">
            <span style="font-size: 28px; font-weight: bold; color: #deff9a; margin-right: 5px;">${score}</span>
            <span style="font-size: 16px; color: #ccc;">/ 60 (単位取得ライン)</span>
        </div>
        <div style="font-size: 12px; color: #bbb; margin-bottom: 12px;">
            現在のクイズ・課題の完了状況から、現時点の暫定スコアを算出しています。
            (目標まで あと <strong style="color: #deff9a;">${Math.max(60 - score, 0)}</strong> 点)
        </div>
        <div style="background: #333; height: 16px; border-radius: 8px; overflow: hidden; position: relative;">
            <div style="background: #deff9a; width: ${progressPercent}%; height: 100%; transition: width 0.8s ease-out;"></div>
            <div style="position: absolute; left: 100%; top: 0; width: 2px; height: 100%; background: red; opacity: 0.5;"></div>
        </div>
    `;

    targetElement.insertBefore(dashboard, targetElement.firstChild);
}

window.addEventListener('load', async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const currentScore = await calculateScore();
    injectDashboard(currentScore);
});