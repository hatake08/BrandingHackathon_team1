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

async function calculateScore() {
    console.log("ダッシュボードの点数計算を開始します...");

    const urlParams = new URLSearchParams(window.location.search);
    const courseCode = urlParams.get('id');

    if (!courseCode) return 0;

    // 1. 渡してもらった巡回ロジックから、ガチの提出数と公開済み総課題数をもらう
    const assignmentData = await GetMoodleData.getAssignment(); 
    
    // 2. getSyllabus.js からこの科目の評価配点（例: 100%）を取得
    const weight = await GetSyllabusData.getEvaluationWeight(courseCode);

    // ==========================================
    // 🗓️ 【追加】現在の日付から何回目の授業かを導出
    // ==========================================
    const today = new Date();
    // 4月1日を春学期の開始日（基準日）として設定
    const semesterStartDate = new Date(today.getFullYear(), 3, 1); 
    const diffDays = Math.ceil(Math.abs(today - semesterStartDate) / (1000 * 60 * 60 * 24));
    
    // 現在が第何週目（＝第何回授業期間）かを算出
    let currentLessonCount = Math.ceil(diffDays / 7);
    if (currentLessonCount < 1) currentLessonCount = 1;
    if (currentLessonCount > 14) currentLessonCount = 14; 

    // ==========================================
    // 🚀 【追加】検出された総課題数を現在の授業数で割り、14をかけて推定の課題数を導出
    // ==========================================
    const TOTAL_LESSONS = 14;
    let estimatedTotalTasks = 0;

    if (currentLessonCount > 0) {
        // (検出された総課題数 ÷ 現在の授業回数) × 14回 ＝ 推定の課題母数
        const tasksPerLesson = assignmentData.total / currentLessonCount;
        estimatedTotalTasks = Math.round(tasksPerLesson * TOTAL_LESSONS);
        
        console.log(`[計算内訳] 日付からの現在の授業回数: ${currentLessonCount}回`);
        console.log(`[計算内訳] 1回あたりの平均課題数: ${tasksPerLesson.toFixed(2)}個`);
        console.log(`[計算内訳] 全14回分の【推定総母数】: ${estimatedTotalTasks}個`);
    }

    // ==========================================
    // 📊 【追加】提出数をその推定母数で割って割合を導出
    // ==========================================
    let assignmentRate = 0;
    if (estimatedTotalTasks > 0) {
        assignmentRate = assignmentData.submitted / estimatedTotalTasks;
    }
    if (assignmentRate > 1.0) assignmentRate = 1.0; // 100%上限セーフティ

    // 配点（％）を掛け算する
    const assignmentScore = assignmentRate * weight.assignment; 
    
    // 出席率の計算（配点0%なら自動的に0点換算）
    let attendanceRate = 0.8; 
    const attendanceScore = attendanceRate * weight.attendance;
    
    // 現在の合計素点（100点満点中）
    const currentTotal = attendanceScore + assignmentScore;

    console.log(`【最終結果】 実際の提出数: ${assignmentData.submitted} / 推定母数: ${estimatedTotalTasks}個`);
    console.log(`➔ 現在の獲得点: ${currentTotal.toFixed(1)} / 100点`);
    
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