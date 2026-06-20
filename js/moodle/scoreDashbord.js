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
    
    const taskCacheKey = `system_tasks_${courseCode}`;
    await new Promise(resolve => {
        chrome.storage.local.set({ [taskCacheKey]: assignmentData.tasks || [] }, resolve);
    });

    window.dispatchEvent(new CustomEvent('moodleTasksLoaded'));

    const weight = await GetSyllabusData.getEvaluationWeight(courseCode);

    const scoreStorageKey = `course_scores_${courseCode}`;
    const manualSyllabusKey = `manual_syllabus_${courseCode}`;
    const customTasksKey = `custom_tasks_${courseCode}`;

    const storageData = await new Promise(resolve => {
        chrome.storage.local.get([scoreStorageKey, manualSyllabusKey, customTasksKey], resolve);
    });

    const savedScores = storageData[scoreStorageKey] || {};
    const manualSyllabus = storageData[manualSyllabusKey] || {};
    const customTasks = storageData[customTasksKey] || [];
    const systemTasks = assignmentData.tasks || [];
    const allTasks = [...systemTasks, ...customTasks];

    let hasDrawerInput = Object.values(savedScores).some(t => t.weight && parseFloat(t.weight) > 0);

    if (hasDrawerInput) {
        console.log("[ScoreDashboard] ドロワーの手動設定を検知。詳細割合計算を実行します。");
        let totalAcquiredPercent = 0;

        allTasks.forEach(task => {
            const taskData = savedScores[task.id] || { score: '', max: '', weight: '', isPass: false };
            let calcScore = parseFloat(taskData.score) || 0;
            let calcMax = parseFloat(taskData.max) || 0;
            let taskWeight = parseFloat(taskData.weight) || 0;

            if (taskData.isPass && task.isCompleted) {
                calcScore = 100;
                calcMax = 100;
            }

            if (calcMax > 0 && taskWeight > 0) {
                totalAcquiredPercent += (calcScore / calcMax) * taskWeight;
            }
        });

        const dailyWeight = parseFloat(manualSyllabus.daily) || (weight.daily || 100);
        const examWeight = parseFloat(manualSyllabus.exam) || (weight.exam || 0);

        injectDashboard(Math.round(totalAcquiredPercent), Math.round(dailyWeight), Math.round(examWeight));
    } 
    
    else {
        console.log("[ScoreDashboard] ドロワー入力なし。従来の自動推定モードで計算します。");
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

        let assignmentRate = 0;
        if (estimatedTotalTasks > 0) {
            assignmentRate = assignmentData.submitted / estimatedTotalTasks;
        }
        if (assignmentRate > 1.0) assignmentRate = 1.0; 

        const dailyWeight = weight.daily || 0;
        const examWeight = weight.exam || 0;
        const assignmentScore = assignmentRate * dailyWeight; 
        
        injectDashboard(Math.round(assignmentScore), dailyWeight, examWeight);
    }
}

// ==========================================
// 3.UIの表示
// ==========================================
function injectDashboard(score, dailyWeight, examWeight) {
    const existDashboard = document.getElementById('univ-calc-dashboard');
    if (existDashboard) existDashboard.remove();

    const targetElement = document.getElementById('region-main') || document.querySelector('.course-content');
    if (!targetElement) return;

    const dashboard = document.createElement('div');
    dashboard.id = 'univ-calc-dashboard';
    
    dashboard.style.cssText = `
        background: #ffffff; border: 1px solid #e9ecef; border-radius: 12px;
        padding: 24px; margin-bottom: 20px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; box-sizing: border-box; width: 100%;
    `;

    const progressPercent = dailyWeight > 0 ? Math.min((score / dailyWeight) * 100, 100) : 100;

    dashboard.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <div style="display: flex; align-items: center;">
                <h3 style="margin: 0; font-size: 18px; color: #1a1a1a; font-weight: 700; border: none; padding: 0;">単位取得 進捗状況</h3>
            </div>
            <span style="font-size: 11px; color: #868e96; background: #f1f3f5; padding: 2px 8px; border-radius: 4px;">リアル評価連動システム</span>
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
    if (!window.location.href.includes('/course/')) return;
    await new Promise(resolve => setTimeout(resolve, 1000));
    await calculateScore();
});