// ==========================================
// 1.HTMLから取得
// ==========================================
async function getPortalData() {
    const assignmentData = await GetMoodleData.getAssignment(); 
    const attendanceData = GetMoodleData.getAttendance(); 

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
// 2.計算
// ==========================================
async function calculateScore() {
    console.log("ダッシュボードの点数計算を開始します...");

    const urlParams = new URLSearchParams(window.location.search);
    const courseCode = urlParams.get('id');

    if (!courseCode) return;

    const assignmentData = await GetMoodleData.getAssignment(); 
    
    const weight = await GetSyllabusData.getEvaluationWeight(courseCode);

    // 日付から課題の母数を推定
    const today = new Date();
    const semesterStartDate = new Date(today.getFullYear(), 3, 1); 
    const diffDays = Math.ceil(Math.abs(today - semesterStartDate) / (1000 * 60 * 60 * 24));
    
    let currentLessonCount = Math.ceil(diffDays / 7);
    if (currentLessonCount < 1) currentLessonCount = 1;
    if (currentLessonCount > 14) currentLessonCount = 14; 

    const TOTAL_LESSONS = 14;
    let estimatedTotalTasks = 0;

    if (currentLessonCount > 0) {
        const tasksPerLesson = assignmentData.total / currentLessonCount;
        estimatedTotalTasks = Math.round(tasksPerLesson * TOTAL_LESSONS);
        
        console.log(`日付からの現在の授業回数: ${currentLessonCount}回`);
        console.log(`1回あたりの平均課題数: ${tasksPerLesson.toFixed(2)}個`);
        console.log(`全14回分の推定母数: ${estimatedTotalTasks}個`);
    }

    // 割合の計算
    let assignmentRate = 0;
    if (estimatedTotalTasks > 0) {
        assignmentRate = assignmentData.submitted / estimatedTotalTasks;
    }
    if (assignmentRate > 1.0) assignmentRate = 1.0; 

    const dailyWeight = weight.daily || 0;
    const examWeight = weight.exam || 0;
    const assignmentScore = assignmentRate * dailyWeight; 
    
    const currentTotal = assignmentScore;

    console.log(`実際の提出数: ${assignmentData.submitted} / 推定母数: ${estimatedTotalTasks}個`);
    console.log(`現在の日常枠の獲得点: ${currentTotal.toFixed(1)} / ${dailyWeight}点 (定期試験の配点: ${examWeight}%)`);
    
    injectDashboard(Math.round(currentTotal), dailyWeight, examWeight);
}

// ==========================================
// 3.UIの表示
// ==========================================
function injectDashboard(score, dailyWeight, examWeight) {
    if (document.getElementById('univ-calc-dashboard')) return;

    const targetElement = document.getElementById('region-main') || document.querySelector('.course-content');

    const dashboard = document.createElement('div');
    dashboard.id = 'univ-calc-dashboard';
    
    dashboard.style.cssText = `
        background: #ffffff;
        border: 1px solid #e9ecef;
        border-radius: 12px;
        padding: 24px;
        margin-bottom: 20px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        box-sizing: border-box;
        width: 100%;
    `;

    const progressPercent = dailyWeight > 0 ? Math.min((score / dailyWeight) * 100, 100) : 100;

    dashboard.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <div style="display: flex; align-items: center;">
                <span style="font-size: 20px; margin-right: 8px;"></span>
                <h3 style="margin: 0; font-size: 18px; color: #1a1a1a; font-weight: 700; border: none; padding: 0;">単位取得 進捗状況</h3>
            </div>
            <span style="font-size: 11px; color: #868e96; background: #f1f3f5; padding: 2px 8px; border-radius: 4px;">拡張機能により自動生成</span>
        </div>
        
        <div style="display: flex; align-items: baseline; margin-bottom: 12px;">
            <span style="font-size: 36px; font-weight: 800; color: #ad3333; line-height: 1;">${score}</span>
            <span style="font-size: 16px; color: #495057; margin-left: 4px; font-weight: 600;">/ ${dailyWeight}点 </span>
        </div>
        
        <div style="background: #e9ecef; height: 12px; border-radius: 8px; overflow: hidden; margin-bottom: 14px;">
            <div style="background: linear-gradient(90deg, #ad3333, #d9534f); width: ${progressPercent}%; height: 100%; border-radius: 8px; transition: width 0.8s ease-out;"></div>
        </div>

        <div style="display: flex; justify-content: space-between; font-size: 12px; color: #6c757d; border-top: 1px dashed #dee2e6; padding-top: 10px;">
            <div>残り <span style="font-weight: bold; color: #212529;">${examWeight}%</span> は定期試験で評価</div>
        </div>
    `;

    targetElement.insertBefore(dashboard, targetElement.firstChild);
}


window.addEventListener('load', async () => {
    // リンクにcourseが含まれない場合ストップ
    if (!window.location.href.includes('/course/')) {
        return; 
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    await calculateScore();
});