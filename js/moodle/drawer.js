function createToggleSection(title, contentHtml, isDefaultOpen = false) {
    return `
        <div class="drawer-section" style="margin-bottom: 10px; border: 1px solid #dee2e6; border-radius: 6px; overflow: hidden; background: #fafafa;">
            <div class="drawer-section-header" style="padding: 8px 12px; background: #f1f3f5; font-size: 13px; font-weight: bold; color: #ad3333; cursor: pointer; display: flex; justify-content: space-between; align-items: center; user-select: none;">
                <span>${title}</span>
                <span class="toggle-arrow" style="transition: transform 0.2s; transform: ${isDefaultOpen ? 'rotate(90deg)' : 'rotate(0deg)'};">▶</span>
            </div>
            <div class="drawer-section-content" style="padding: 12px; background: white; display: ${isDefaultOpen ? 'block' : 'none'}; border-top: 1px solid #dee2e6;">
                ${contentHtml}
            </div>
        </div>
    `;
}

async function loadCourseTasks(courseId) {
    return new Promise(resolve => {
        const systemKey = `system_tasks_${courseId}`;
        const customKey = `custom_tasks_${courseId}`;
        chrome.storage.local.get([systemKey, customKey], (res) => {
            const systemTasks = res[systemKey] || [];
            const customTasks = res[customKey] || [];
            resolve([...systemTasks, ...customTasks]);
        });
    });
}

async function generateDrawerContent() {
    const currentUrl = window.location.href;
    
    const isHomePage = currentUrl.includes('/my/') || 
                       currentUrl.endsWith('lms.ritsumei.ac.jp/') || 
                       currentUrl.endsWith('lms.ritsumei.ac.jp/index.php') ||
                       currentUrl.includes('redirect=0');

    const isCoursePage = currentUrl.includes('course/view.php') && currentUrl.includes('id=');

    if (isHomePage) {
        const annHtml = `
            <p style="font-size: 11px; color: #666; margin-bottom: 8px;">表示するお知らせを個別にON/OFFします。</p>
            <button id="drawer-manage-ann-btn" style="width: 100%; padding: 6px; background: #4ea4d9; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 12px;">表示するアナウンスを選択</button>
        `;
        const gcalHtml = `
            <p style="font-size: 11px; color: #666; margin-bottom: 8px;">カレンダーファイルを生成します。</p>
            <button id="drawer-sync-gcal-btn" style="width: 100%; padding: 8px; background: #ad3333; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 13px;">カレンダー同期</button>
        `;
        return createToggleSection("アナウンスメント設定", annHtml, true) + 
               createToggleSection("カレンダー連携", gcalHtml, false);
    }

    if (isCoursePage) {
        const courseIdMatch = currentUrl.match(/id=(\d+)/);
        const courseId = courseIdMatch ? courseIdMatch[1] : "default";
        
        const currentTasks = await loadCourseTasks(courseId);

        const scoreStorageKey = `course_scores_${courseId}`;
        const manualSyllabusKey = `manual_syllabus_${courseId}`;
        
        const savedData = await new Promise(resolve => {
            chrome.storage.local.get([scoreStorageKey, manualSyllabusKey], resolve);
        });
        const savedScores = savedData[scoreStorageKey] || {};
        const savedSyllabus = savedData[manualSyllabusKey] || { exam: '', daily: '' };

        let taskRowsHtml = "";
        let totalAcquiredPercent = 0; 

        currentTasks.forEach(task => {
            const taskData = savedScores[task.id] || { score: '', max: '', weight: '', isPass: true };
            
            let calcScore = parseFloat(taskData.score) || 0;
            let calcMax = parseFloat(taskData.max) || 0;
            let weight = parseFloat(taskData.weight) || 0;
            
            if (taskData.isPass && task.isCompleted) {
                calcScore = 100;
                calcMax = 100;
            }

            let taskEarnedPercent = 0;
            if (calcMax > 0 && weight > 0) {
                taskEarnedPercent = (calcScore / calcMax) * weight;
                totalAcquiredPercent += taskEarnedPercent;
            }

            taskRowsHtml += `
                <div class="task-form-row" data-task-id="${task.id}" style="padding: 8px 0; border-bottom: 1px solid #eee; font-size: 12px;">
                    <div style="font-weight: bold; margin-bottom: 4px; display: flex; justify-content: space-between; align-items: center; color: #333;">
                        <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 170px;" title="${task.title}">
                            ${task.isCustom ? '' : ''}${task.title}
                        </span>
                        <span>
                            ${task.isCompleted ? '<span style="color:green; font-size:10px; font-weight:bold;">[完了]</span>' : '<span style="color:#ad3333; font-size:10px; font-weight:bold;">[未完了]</span>'}
                        </span>
                    </div>
                    <div style="display: flex; gap: 4px; align-items: center; margin-bottom: 4px;">
                        <input type="number" class="input-score" value="${taskData.score}" placeholder="分子" style="width: 45px; padding: 2px; border: 1px solid #ccc; border-radius: 4px; font-size: 11px;" ${taskData.isPass ? 'disabled' : ''}>
                        <span>/</span>
                        <input type="number" class="input-max" value="${taskData.max}" placeholder="分母" style="width: 45px; padding: 2px; border: 1px solid #ccc; border-radius: 4px; font-size: 11px;" ${taskData.isPass ? 'disabled' : ''}>
                        <span style="margin-left: 6px;">配分:</span>
                        <input type="number" class="input-weight" value="${taskData.weight}" placeholder="%" style="width: 40px; padding: 2px; border: 1px solid #ccc; border-radius: 4px; font-size: 11px;"><span>%</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <label style="font-size: 11px; color: #666; cursor: pointer; display: flex; align-items: center; margin: 0;">
                            <input type="checkbox" class="input-pass" ${taskData.isPass ? 'checked' : ''} style="margin-right: 4px;"> 提出で100%
                        </label>
                        <span style="font-size: 11px; font-weight: bold; color: #28a745;">
                            獲得: +${taskEarnedPercent.toFixed(2)}%
                        </span>
                    </div>
                </div>
            `;
        });

        const listContentHtml = taskRowsHtml || `
            <div style="text-align:center; padding: 20px 0; color:#ad3333; font-weight:bold;">
                課題データを同期中...
                <div style="font-size:10px; color:#999; font-weight:normal; margin-top:4px;"></div>
            </div>
        `;

        const scoreHtml = `
            <div style="background: #ad3333; color: white; padding: 8px; border-radius: 6px; text-align: center; margin-bottom: 12px;">
                <div style="font-size: 11px; opacity: 0.9;">累計獲得リアルスコア</div>
                <div style="font-size: 20px; font-weight: bold;">${totalAcquiredPercent.toFixed(2)}%</div>
            </div>
            <div style="max-height: 240px; overflow-y: auto; border: 1px solid #eee; padding: 6px; border-radius: 6px; margin-bottom: 10px;">
                ${listContentHtml}
            </div>
            <button id="drawer-save-scores-btn" style="width: 100%; padding: 6px; background: #ad3333; color: white; border: none; border-radius: 4px; font-size: 12px; font-weight: bold; cursor: pointer;" ${currentTasks.length === 0 ? 'disabled' : ''}>保存</button>
        `;

        const syllabusHtml = `
            <p style="font-size: 11px; color: #666; margin-bottom: 6px;">自動取得されたシラバスの割合よりも、ここに入力した割合を優先します。</p>
            <div style="display: flex; gap: 6px; margin-bottom: 8px;">
                <input type="number" id="manual-syllabus-exam" value="${savedSyllabus.exam}" placeholder="定期試験 %" style="width: 50%; padding: 4px; font-size: 12px; border: 1px solid #ccc; border-radius: 4px;">
                <input type="number" id="manual-syllabus-daily" value="${savedSyllabus.daily}" placeholder="その他 %" style="width: 50%; padding: 4px; font-size: 12px; border: 1px solid #ccc; border-radius: 4px;">
            </div>
            <button id="drawer-save-syllabus-btn" style="width: 100%; padding: 6px; background: #4ea4d9; color: white; border: none; border-radius: 4px; font-size: 12px; font-weight: bold; cursor: pointer;">保存</button>
        `;

        const customTaskHtml = `
            <p style="font-size: 11px; color: #666; margin-bottom: 6px;">追加された課題やテストを入力できます</p>
            <input type="text" id="custom-task-title" placeholder="追加する課題名を入力" style="width: 100%; padding: 4px; font-size: 12px; border: 1px solid #ccc; border-radius: 4px; margin-bottom: 6px;">
            <label style="font-size: 11px; cursor: pointer; display: inline-flex; align-items: center; margin-bottom: 8px;">
                <input type="checkbox" id="custom-task-completed" style="margin-right:4px;"> すでに提出・完了済み
            </label>
            <button id="drawer-add-custom-task-btn" style="width: 100%; padding: 6px; background: #28a745; color: white; border: none; border-radius: 4px; font-size: 12px; font-weight: bold; cursor: pointer;">追加</button>
        `;

        return createToggleSection("課題の点数入力", scoreHtml, true) +
               createToggleSection("シラバス割合の手動入力", syllabusHtml, false) +
               createToggleSection("弾かれた課題の追加", customTaskHtml, false);
    }

    return `<p style="font-size: 13px; color: #999; text-align: center; padding-top: 20px;">このページで利用できる設定はありません。</p>`;
}

// アナウンスメント管理用モーダル表示
async function openAnnouncementManagerModal() {
    const res = await new Promise(resolve => {
        chrome.storage.local.get(['hiddenAnnouncementUrls', 'cachedAllAnnouncements'], resolve);
    });
    
    const hiddenUrls = new Set(res.hiddenAnnouncementUrls || []);
    const allAnnouncements = res.cachedAllAnnouncements || [];

    const existModal = document.getElementById('drawer-ann-modal');
    if (existModal) existModal.remove();

    const modal = document.createElement('div');
    modal.id = 'drawer-ann-modal';
    modal.style.cssText = `
        position: fixed; top: 12%; left: 25%; width: 50%; max-height: 75%;
        background: white; border: 1px solid #dee2e6; border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.25); padding: 20px; z-index: 10001;
        overflow-y: auto; font-family: sans-serif; color: #333;
    `;

    let listHtml = "";
    allAnnouncements.forEach((ann, idx) => {
        const isChecked = !hiddenUrls.has(ann.href);
        listHtml += `
            <div style="display: flex; align-items: center; padding: 6px 0; border-bottom: 1px solid #eee;">
                <input type="checkbox" id="manage-ann-${idx}" ${isChecked ? 'checked' : ''} data-href="${ann.href}" style="margin-right: 10px; transform: scale(1.1); cursor: pointer;">
                <label for="manage-ann-${idx}" style="font-size: 13px; cursor: pointer; user-select: none; margin-bottom: 0;">
                    ${ann.title}
                </label>
            </div>
        `;
    });

    modal.innerHTML = `
        <h3 style="margin-top: 0; color: #ad3333; font-size: 16px; font-weight: bold;">アナウンスメント表示管理</h3>
        <p style="font-size: 11px; color: #666; margin-bottom: 12px;">チェックを外したお知らせは、一括表示パネルに表示されなくなります。</p>
        <div style="max-height: 320px; overflow-y: auto; margin-bottom: 16px; border: 1px solid #eee; padding: 8px; border-radius: 6px; background: #fafafa;">
            ${listHtml || '<p style="font-size:13px; color:#999; text-align:center; padding:20px;">現在保持しているお知らせデータがありません。ホーム画面を更新してください。</p>'}
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 10px;">
            <button id="drawer-ann-modal-cancel" style="padding: 6px 14px; border-radius: 4px; border: 1px solid #ccc; background: #fff; cursor: pointer; font-size:12px;">キャンセル</button>
            <button id="drawer-ann-modal-save" style="padding: 6px 14px; border-radius: 4px; border: none; background: #ad3333; color: white; font-weight: bold; cursor: pointer; font-size:12px;">設定を保存</button>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('drawer-ann-modal-cancel').onclick = () => modal.remove();
    document.getElementById('drawer-ann-modal-save').onclick = () => {
        const newHiddenUrls = [];
        modal.querySelectorAll('input[type="checkbox"]').forEach(box => {
            if (!box.checked) {
                newHiddenUrls.push(box.dataset.href);
            }
        });

        chrome.storage.local.set({ hiddenAnnouncementUrls: newHiddenUrls }, () => {
            modal.remove();
            window.location.reload();
        });
    };
}

function initMoodleExtDrawer() {
    if (document.getElementById('moodle-ext-drawer')) return;

    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'moodle-ext-drawer-toggle';
    toggleBtn.innerHTML = "";
    toggleBtn.style.cssText = `
        position: fixed; right: 0; top: 40%; width: 28px; padding: 40px 0;
        background: #ad3333; color: white; border: 1px solid #dee2e6; border-right: none;
        border-radius: 8px 0 0 8px; box-shadow: -2px 4px 10px rgba(0,0,0,0.15);
        font-size: 11px; font-weight: bold; line-height: 1.3; cursor: pointer;
        z-index: 10000; display: flex; flex-direction: column; align-items: center; justify-content: center;
        transition: right 0.3s ease-in-out, background-color 0.2s;
    `;

    const drawer = document.createElement('div');
    drawer.id = 'moodle-ext-drawer';
    drawer.style.cssText = `
        position: fixed; top: 0; right: -320px; width: 300px; height: 100vh;
        background: white; border-left: 1px solid #dee2e6;
        box-shadow: -4px 0 20px rgba(0,0,0,0.15); padding: 16px; z-index: 9999;
        font-family: sans-serif; transition: right 0.3s ease-in-out;
        box-sizing: border-box; overflow-y: auto; color: #333;
    `;

    drawer.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 1px solid #eee; padding-bottom: 8px;">
            <h3 style="margin: 0; font-size: 15px; color: #333; font-weight: bold;">moodle+R ex 設定</h3>
            <button id="moodle-ext-drawer-close" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #999; padding: 0 5px;">&times;</button>
        </div>
        <div id="moodle-ext-drawer-body">
            <!-- 動的コンテンツがここに展開されます -->
        </div>
    `;

    document.body.appendChild(toggleBtn);
    document.body.appendChild(drawer);

    const refreshDrawerContent = async () => {
        const drawerBodyHtml = await generateDrawerContent();
        const bodyEl = document.getElementById('moodle-ext-drawer-body');
        if (bodyEl) {
            bodyEl.innerHTML = drawerBodyHtml;
        }
    };
    refreshDrawerContent();

    window.addEventListener('moodleTasksLoaded', () => {
        refreshDrawerContent();
    });

    let isOpen = false;

    function openDrawer() {
        refreshDrawerContent();
        drawer.style.right = '0px';
        toggleBtn.style.right = '300px';
        isOpen = true;
    }

    function closeDrawer() {
        drawer.style.right = '-320px';
        toggleBtn.style.right = '0px';
        isOpen = false;
    }

    toggleBtn.onclick = () => { if (isOpen) closeDrawer(); else openDrawer(); };

    drawer.addEventListener('click', (e) => {
        if (e.target.id === 'moodle-ext-drawer-close') {
            closeDrawer();
        }
    });

    drawer.addEventListener('click', (e) => {
        const header = e.target.closest('.drawer-section-header');
        if (!header) return;
        const content = header.nextElementSibling;
        const arrow = header.querySelector('.toggle-arrow');
        if (content.style.display === 'none') {
            content.style.display = 'block';
            arrow.style.transform = 'rotate(90deg)';
        } else {
            content.style.display = 'none';
            arrow.style.transform = 'rotate(0deg)';
        }
    });

    // カレンダー自動同期ボタン
    drawer.addEventListener('click', (e) => {
        if (e.target.id !== 'drawer-sync-gcal-btn') return;
        closeDrawer();
        window.location.href = "https://lms.ritsumei.ac.jp/calendar/view.php?view=month&autoSync=true";
    });

    // アナウンスメント管理ボタン
    drawer.addEventListener('click', (e) => {
        if (e.target.id !== 'drawer-manage-ann-btn') return;
        openAnnouncementManagerModal();
    });

    // コースページ：点数・割合保存ボタン
    drawer.addEventListener('click', (e) => {
        if (e.target.id !== 'drawer-save-scores-btn') return;
        
        const courseIdMatch = window.location.href.match(/id=(\d+)/);
        const courseId = courseIdMatch ? courseIdMatch[1] : "default";
        const scoreStorageKey = `course_scores_${courseId}`;
        const newData = {};

        drawer.querySelectorAll('.task-form-row').forEach(row => {
            const taskId = row.dataset.taskId;
            newData[taskId] = {
                score: row.querySelector('.input-score').value,
                max: row.querySelector('.input-max').value,
                weight: row.querySelector('.input-weight').value,
                isPass: row.querySelector('.input-pass').checked
            };
        });

        chrome.storage.local.set({ [scoreStorageKey]: newData }, () => {
            alert("画面全体の進捗バーを再計算します");
            window.location.reload(); 
        });
    });

    // コースページ：シラバス割合優先保存ボタン
    drawer.addEventListener('click', (e) => {
        if (e.target.id !== 'drawer-save-syllabus-btn') return;

        const courseIdMatch = window.location.href.match(/id=(\d+)/);
        const courseId = courseIdMatch ? courseIdMatch[1] : "default";
        const manualSyllabusKey = `manual_syllabus_${courseId}`;

        const examVal = document.getElementById('manual-syllabus-exam').value;
        const dailyVal = document.getElementById('manual-syllabus-daily').value;

        chrome.storage.local.set({
            [manualSyllabusKey]: { exam: examVal, daily: dailyVal }
        }, () => {
            alert("シラバス優先割合を保存しました");
            window.location.reload(); 
        });
    });

    // コースページ：カスタム課題の追加ボタン
    drawer.addEventListener('click', async (e) => {
        if (e.target.id !== 'drawer-add-custom-task-btn') return;

        const titleInput = document.getElementById('custom-task-title');
        const titleText = titleInput.value.trim();
        if (!titleText) {
            alert("課題名を入力してください。");
            return;
        }

        const courseIdMatch = window.location.href.match(/id=(\d+)/);
        const courseId = courseIdMatch ? courseIdMatch[1] : "default";
        const customKey = `custom_tasks_${courseId}`;
        
        const res = await new Promise(resolve => chrome.storage.local.get([customKey], resolve));
        const currentCustoms = res[customKey] || [];

        currentCustoms.push({
            id: 'custom_' + Date.now(),
            title: titleText,
            isCompleted: document.getElementById('custom-task-completed').checked,
            isCustom: true
        });

        chrome.storage.local.set({ [customKey]: currentCustoms }, () => {
            alert(`カスタム項目「${titleText}」を追加しました`);
            titleInput.value = "";
            document.getElementById('custom-task-completed').checked = false;
            window.location.reload();
        });
    });

    // コースページ：チェックボックスの変更イベント
    drawer.addEventListener('change', (e) => {
        if (!e.target.classList.contains('input-pass')) return;
        const chk = e.target;
        const row = chk.closest('.task-form-row');
        const scoreInput = row.querySelector('.input-score');
        const maxInput = row.querySelector('.input-max');
        
        scoreInput.disabled = chk.checked;
        maxInput.disabled = chk.checked;
    });
}

function checkAutoSyncFlag() {
    if (window.location.href.includes('autoSync=true')) {
        setTimeout(() => {
            if (typeof window.triggerMoodleCalendarSync === 'function') {
                window.triggerMoodleCalendarSync();
            }
        }, 600);
    }
}

if (document.readyState === 'complete') {
    initMoodleExtDrawer();
    checkAutoSyncFlag();
} else {
    window.addEventListener('load', () => {
        initMoodleExtDrawer();
        checkAutoSyncFlag();
    });
}