// connectGoogleCalendar.js
console.log("[MoodleCalendarSync] カレンダー画面専用・超正確システムが起動しました。");

// ========================================================
// 1. カレンダー画面のマス目（HTML）からイベントを正確に抽出
// ========================================================
function extractMoodleEvents() {
    const events = [];
    const eventItems = document.querySelectorAll('li[data-region="event-item"], .event [data-eventtype]');
    const seenUrls = new Set();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const titleHeader = document.querySelector('h2.current')?.textContent || ""; 
    const yearMatch = titleHeader.match(/(\d{4})\s*年/);
    const monthMatch = titleHeader.match(/(\d{1,2})\s*月/);

    if (!yearMatch || !monthMatch) {
        console.log("[CalendarSync] カレンダーの年月ヘッダーが見つかりません。");
        return events;
    }

    const year = parseInt(yearMatch[1], 10);
    const month = parseInt(monthMatch[1], 10) - 1;

    eventItems.forEach(item => {
        const linkEl = item.querySelector('a[data-action="view-event"]') || item.querySelector('a[href*="view.php?id="]');
        const nameEl = item.querySelector('.eventname') || item;
        const dayCell = item.closest('td.day'); // 💡 カレンダーのマス目を基準にする

        if (!linkEl || !nameEl || !dayCell) return;

        const titleText = nameEl.textContent.trim();
        const eventUrl = linkEl.href;
        const dateNum = dayCell.dataset.day; // data-day="21"

        if (!eventUrl.includes('view.php?id=') || seenUrls.has(eventUrl) || !dateNum) return;
        if (titleText.includes("開始") || titleText.includes("公開") || titleText.includes("opens")) return;

        const eventDate = new Date(year, month, parseInt(dateNum, 10));
        eventDate.setHours(0, 0, 0, 0);

        // 💡 厳密な今日以降判定
        if (eventDate >= today) {
            const eventDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dateNum).padStart(2, '0')}`;
            seenUrls.add(eventUrl);
            events.push({
                title: titleText.replace(/[\r\n\t]+/g, " ").trim(),
                url: eventUrl,
                date: eventDateStr
            });
        }
    });

    return events;
}

// ========================================================
// 2. ICSファイルの生成
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
        const dateStr = box.dataset.date;
        const url = box.dataset.url;
        const cleanDate = dateStr.replace(/-/g, "");

        icsContent.push("BEGIN:VEVENT");
        icsContent.push(`SUMMARY:📌【締切】${title}`);
        icsContent.push(`DESCRIPTION:Moodle課題\\n詳細: ${url}`);
        icsContent.push(`DTSTART;VALUE=DATE:${cleanDate}`);
        icsContent.push(`DTEND;VALUE=DATE:${cleanDate}`);
        icsContent.push("END:VEVENT");
    });

    icsContent.push("END:VCALENDAR");
    return new Blob([icsContent.join("\r\n")], { type: "text/calendar;charset=utf-8;" });
}

// ========================================================
// 3. 同期確認モーダルの表示
// ========================================================
function showSyncModal(events) {
    const existModal = document.getElementById('gcal-sync-modal');
    if (existModal) existModal.remove();

    const modal = document.createElement('div');
    modal.id = 'gcal-sync-modal';
    modal.style.cssText = `
        position: fixed; top: 12%; left: 25%; width: 50%; max-height: 75%;
        background: white; border: 1px solid #dee2e6; border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.25); padding: 20px; z-index: 10002;
        overflow-y: auto; font-family: sans-serif; color: #333;
    `;

    let listHtml = "";
    events.forEach((ev, idx) => {
        listHtml += `
            <div style="display: flex; align-items: center; padding: 6px 0; border-bottom: 1px solid #eee;">
                <input type="checkbox" id="ev-${idx}" checked data-title="${ev.title}" data-date="${ev.date}" data-url="${ev.url}" style="margin-right: 10px; transform: scale(1.1); cursor:pointer;">
                <label for="ev-${idx}" style="font-size: 13px; cursor: pointer; user-select: none; margin-bottom: 0;">
                    <strong>[${ev.date}]</strong> ${ev.title}
                </label>
            </div>
        `;
    });

    modal.innerHTML = `
        <h3 style="margin-top: 0; color: #ad3333; font-size: 16px; font-weight: bold;">📅 Googleカレンダー同期（今日以降の予定）</h3>
        <p style="font-size: 11px; color: #666; margin-bottom: 12px;">今日以降の締め切りタスクのみを自動抽出しました。チェックした項目をiCal形式でエクスポートします。</p>
        <div style="max-height: 280px; overflow-y: auto; margin-bottom: 16px; border: 1px solid #eee; padding: 8px; border-radius: 6px; background: #fafafa;">
            ${listHtml || '<p style="font-size:14px; color:#999; padding: 20px 0; text-align:center;">今日以降の対象イベントが見つかりませんでした。</p>'}
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 10px;">
            <button id="gcal-cancel-btn" style="padding: 6px 14px; border-radius: 4px; border: 1px solid #ccc; background: #fff; cursor: pointer; font-size:12px;">キャンセル</button>
            <button id="gcal-execute-btn" style="padding: 6px 14px; border-radius: 4px; border: none; background: #ad3333; color: white; font-weight: bold; cursor: pointer; font-size:12px;" ${events.length === 0 ? 'disabled style="background:#ccc; cursor:not-allowed;"' : ''}>カレンダーファイルを生成</button>
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
        link.download = "moodle_future_tasks.ics";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        const gcalSettingsUrl = "https://calendar.google.com/calendar/u/0/r/settings/export?settings=importandexport";

        modal.innerHTML = `
            <h3 style="color: green; font-size:16px; font-weight: bold;">🎉 カレンダーファイルの作成が完了しました！</h3>
            <p style="font-size:13px; margin-bottom: 12px;">ダウンロードフォルダに <strong>「moodle_future_tasks.ics」</strong> が保存されました。</p>
            <p style="font-size:12px; color: #666; background: #f8f9fa; padding: 10px; border-radius: 6px; border-left: 4px solid #4ea4d9; line-height: 1.4;">
                下のボタンを押すと、Googleカレンダーのインポート画面が開きます。そこに、今ダウンロードされたファイルをドラッグ＆ドロップしてください。
            </p>
            <div style="display:flex; justify-content: flex-end; margin-top: 16px;">
                <a href="${gcalSettingsUrl}" target="_blank" id="gcal-final-link" style="display:inline-block; padding:8px 16px; background:#4ea4d9; color:white; font-weight:bold; border-radius:6px; text-decoration:none; text-align:center; font-size:12px;">🚀 Googleインポート画面を開く</a>
            </div>
        `;
        
        document.getElementById('gcal-final-link').onclick = () => {
            setTimeout(() => modal.remove(), 1000);
        };
    };
}

// グローバル露出
window.triggerMoodleCalendarSync = function() {
    const events = extractMoodleEvents();
    showSyncModal(events);
};

// ボタン自動インジェクション
function injectCalendarPageButton() {
    if (!window.location.href.includes('/calendar/view.php')) return;
    if (document.getElementById('moodle-gcal-sync-btn')) return;

    const targetArea = document.querySelector('.header-actions-container') || 
                       document.querySelector('.card-body .d-flex') || 
                       document.querySelector('div[data-region="controls"]') ||
                       document.querySelector('div[data-region="view-selector"]')?.parentElement;
    if (!targetArea) return;

    const syncBtn = document.createElement('button');
    syncBtn.id = 'moodle-gcal-sync-btn';
    syncBtn.textContent = '📅 Googleカレンダー同期';
    syncBtn.className = 'btn text-white mb-2 me-2'; 
    syncBtn.style.cssText = `background-color: #4ea4d9; border: none; font-weight: bold; cursor: pointer; font-size: 14px;`;
    
    syncBtn.onmouseover = () => syncBtn.style.backgroundColor = "#3b8cb8";
    syncBtn.onmouseout = () => syncBtn.style.backgroundColor = "#4ea4d9";
    syncBtn.onclick = () => { window.triggerMoodleCalendarSync(); };

    if (targetArea.firstChild) {
        targetArea.insertBefore(syncBtn, targetArea.firstChild);
    } else {
        targetArea.appendChild(syncBtn);
    }
}

const observer = new MutationObserver(() => { injectCalendarPageButton(); });
observer.observe(document.body, { childList: true, subtree: true });

if (document.readyState === 'complete') { injectCalendarPageButton(); } else { window.addEventListener('load', injectCalendarPageButton); }