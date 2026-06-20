console.log("connectCalendar");

// ========================================================
// 1. Moodleのカレンダーから抽出
// ========================================================
function extractMoodleEvents() {
    const events = [];
    const eventItems = document.querySelectorAll('li[data-region="event-item"]');
    const seenUrls = new Set();

    eventItems.forEach(item => {
        const linkEl = item.querySelector('a[data-action="view-event"]');
        const nameEl = item.querySelector('.eventname');

        if (!linkEl || !nameEl) return;

        const titleText = nameEl.textContent.trim();
        const eventUrl = linkEl.href;

        if (seenUrls.has(eventUrl)) return;

        // 自動フィルター
        if (titleText.includes("開始") || titleText.includes("公開") || titleText.includes("opens")) {
            return; 
        }

        const dayCell = item.closest('td.day');
        let eventDateStr = "";

        if (dayCell) {
            const dateNum = dayCell.dataset.day;
            if (dateNum) {
                const titleHeader = document.querySelector('h2.current')?.textContent || ""; 
                const yearMatch = titleHeader.match(/(\d{4})年/);
                const monthMatch = titleHeader.match(/(\d{2})月/);
                
                if (yearMatch && monthMatch) {
                    eventDateStr = `${yearMatch[1]}-${monthMatch[1]}-${dateNum.padStart(2, '0')}`;
                }
            }
        }

        if (eventDateStr) {
            seenUrls.add(eventUrl);
            events.push({
                title: titleText,
                url: eventUrl,
                date: eventDateStr
            });
        }
    });

    return events;
}

// ========================================================
// 2. カレンダーファイルを生成
// ========================================================
function generateIcsFile(checkedBoxes) {
    let icsContent = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Moodle Calendar Sync Extension//JP",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH"
    ];

    checkedBoxes.forEach(box => {
        const title = box.dataset.title;
        const dateStr = box.dataset.date; // YYYY-MM-DD
        const url = box.dataset.url;

        // ハイフンを除去して YYYYMMDD 形式にする
        const cleanDate = dateStr.replace(/-/g, "");

        icsContent.push("BEGIN:VEVENT");
        icsContent.push(`SUMMARY:締切:${title}`);
        icsContent.push(`DESCRIPTION:課題\\n詳細ページ: ${url}`);
        icsContent.push(`DTSTART;VALUE=DATE:${cleanDate}`); // 終日イベントとして登録
        icsContent.push(`DTEND;VALUE=DATE:${cleanDate}`);
        icsContent.push("END:VEVENT");
    });

    icsContent.push("END:VCALENDAR");

    return new Blob([icsContent.join("\r\n")], { type: "text/calendar;charset=utf-8;" });
}

// ========================================================
// 3. チェックボックスの描画
// ========================================================
function showSyncModal(events) {
    const existModal = document.getElementById('gcal-sync-modal');
    if (existModal) existModal.remove();

    const modal = document.createElement('div');
    modal.id = 'gcal-sync-modal';
    modal.style.cssText = `
        position: fixed; top: 10%; left: 25%; width: 50%; max-height: 80%;
        background: white; border: 1px solid #dee2e6; border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2); padding: 24px; z-index: 9999;
        overflow-y: auto; font-family: sans-serif; color: #333;
    `;

    let listHtml = "";
    events.forEach((ev, idx) => {
        listHtml += `
            <div style="display: flex; align-items: center; padding: 8px 0; border-bottom: 1px solid #eee;">
                <input type="checkbox" id="ev-${idx}" checked data-title="${ev.title}" data-date="${ev.date}" data-url="${ev.url}" style="margin-right: 12px; transform: scale(1.2); cursor:pointer;">
                <label for="ev-${idx}" style="font-size: 14px; cursor: pointer; user-select: none; margin-bottom: 0;">
                    <strong>[${ev.date}]</strong> ${ev.title}
                </label>
            </div>
        `;
    });

    modal.innerHTML = `
        <h3 style="margin-top: 0; color: #ad3333; font-size: 18px;"> カレンダー同期 </h3>
        <p style="font-size: 12px; color: #666; margin-bottom: 12px;">チェックを入れたイベントをまとめたカレンダーファイルを生成します。</p>
        <div style="max-height: 350px; overflow-y: auto; margin-bottom: 16px; border: 1px solid #eee; padding: 8px; border-radius: 6px; background: #fafafa;">
            ${listHtml || '<p style="font-size:14px; color:#999; padding: 20px 0; text-align:center;">同期対象のイベントが見つかりませんでした。</p>'}
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 12px;">
            <button id="gcal-cancel-btn" style="padding: 8px 16px; border-radius: 6px; border: 1px solid #ccc; background: #fff; cursor: pointer; font-size:14px;">キャンセル</button>
            <button id="gcal-execute-btn" style="padding: 8px 16px; border-radius: 6px; border: none; background: #ad3333; color: white; font-weight: bold; cursor: pointer; font-size:14px;" ${events.length === 0 ? 'disabled style="background:#ccc; cursor:not-allowed;"' : ''}>カレンダーファイルを生成</button>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('gcal-cancel-btn').onclick = () => modal.remove();
    document.getElementById('gcal-execute-btn').onclick = () => {
        const checkedBoxes = modal.querySelectorAll('input[type="checkbox"]:checked');
        if (checkedBoxes.length === 0) {
            alert("1つ以上選択してください。");
            return;
        }

        const blob = generateIcsFile(checkedBoxes);
        
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "moodle_tasks.ics";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        const gcalSettingsUrl = "https://calendar.google.com/calendar/u/0/r/settings/export?settings=importandexport";

        modal.innerHTML = `
            <h3 style="color: green; font-size:18px;">カレンダーファイルの作成が完了しました！</h3>
            <p style="font-size:14px; margin-bottom: 12px;">ダウンロードフォルダに <strong>「moodle_tasks.ics」</strong> が保存されました。</p>
            <p style="font-size:13px; color: #666; background: #f8f9fa; padding: 10px; border-radius: 6px; border-left: 4px solid #4ea4d9;">
                下のボタンを押すと、Googleカレンダーのインポート画面が開きます。そこに、今ダウンロードされたファイルをドラッグ&ドロップしてください。
            </p>
            <div style="display:flex; justify-content: flex-end; margin-top: 16px;">
                <a href="${gcalSettingsUrl}" target="_blank" id="gcal-final-link" style="display:inline-block; padding:10px 20px; background:#4ea4d9; color:white; font-weight:bold; border-radius:6px; text-decoration:none; text-align:center;">🚀 Googleインポート画面を開く</a>
            </div>
        `;
        
        document.getElementById('gcal-final-link').onclick = () => {
            setTimeout(() => modal.remove(), 1000);
        };
    };
}

// ========================================================
// 4. UI
// ========================================================
function injectSyncButton() {
    if (document.getElementById('moodle-gcal-sync-btn')) return;

    const targetArea = document.querySelector('.header-actions-container') || 
                       document.querySelector('.card-body .d-flex') || 
                       document.querySelector('div[data-region="controls"]') ||
                       document.querySelector('div[data-region="view-selector"]')?.parentElement;
    if (!targetArea) return;

    const syncBtn = document.createElement('button');
    syncBtn.id = 'moodle-gcal-sync-btn';
    syncBtn.textContent = 'Googleカレンダー同期';
    syncBtn.className = 'btn text-white mb-2 me-2'; 
    syncBtn.style.cssText = `
        background-color: #ad3333; border: none; font-weight: bold; cursor: pointer; font-size: 14px;
    `;
    
    syncBtn.onmouseover = () => syncBtn.style.backgroundColor = "#ad3333";
    syncBtn.onmouseout = () => syncBtn.style.backgroundColor = "#ad3333";

    syncBtn.onclick = () => {
        const events = extractMoodleEvents();
        showSyncModal(events);
    };

    if (targetArea.firstChild) {
        targetArea.insertBefore(syncBtn, targetArea.firstChild);
    } else {
        targetArea.appendChild(syncBtn);
    }
}

const observer = new MutationObserver(() => {
    injectSyncButton();
});
observer.observe(document.body, { childList: true, subtree: true });

if (document.readyState === 'complete') {
    injectSyncButton();
} else {
    window.addEventListener('load', injectSyncButton);
}