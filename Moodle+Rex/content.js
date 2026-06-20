function getCourseLinks() {
    const courseLinks = [];
    document.querySelectorAll('a[href*="/course/view.php?id="]')
        .forEach(link => {
            courseLinks.push(link.href);
        });
    return [...new Set(courseLinks)];
}

async function displayAnnouncements(allAnnouncements) {
    const existPanel = document.getElementById('moodle-announcement-panel');
    if (existPanel) existPanel.remove();

    const targetArea = document.querySelector('#region-main') || document.querySelector('.course-content');
    if (!targetArea) return;

    const storageData = await new Promise(resolve => {
        chrome.storage.local.get(['readAnnouncementUrls'], res => resolve(res.readAnnouncementUrls || []));
    });
    const readUrls = new Set(storageData);

    const panel = document.createElement('div');
    panel.id = 'moodle-announcement-panel';
    panel.style.cssText = `
        background: white; border: 1px solid #dee2e6; border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.05); padding: 12px 16px; margin-bottom: 16px;
        font-family: sans-serif;
    `;

    panel.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <h3 style="margin: 0; color: #ad3333; font-size: 16px; display: flex; align-items: center; gap: 6px; font-weight: bold;">
                アナウンスメント一括表示
            </h3>
            <div id="ann-filter-tabs" style="display: flex; gap: 6px;">
                <button data-filter="unread" style="padding: 3px 10px; border-radius: 20px; border: 1px solid #ad3333; background: #ad3333; color: white; cursor: pointer; font-size: 11px; font-weight: bold;">未読 (<span id="count-unread">0</span>)</button>
                <button data-filter="read" style="padding: 3px 10px; border-radius: 20px; border: 1px solid #ccc; background: #fff; color: #666; cursor: pointer; font-size: 11px; font-weight: bold;">既読 (<span id="count-read">0</span>)</button>
                <button data-filter="all" style="padding: 3px 10px; border-radius: 20px; border: 1px solid #ccc; background: #fff; color: #666; cursor: pointer; font-size: 11px; font-weight: bold;">すべて (<span id="count-all">0</span>)</button>
            </div>
        </div>
        <div id="ann-list-container" style="max-height: 240px; overflow-y: auto; padding-right: 4px;"></div>
    `;

    targetArea.insertBefore(panel, targetArea.firstChild);

    const listContainer = document.getElementById('ann-list-container');
    const tabs = document.querySelectorAll('#ann-filter-tabs button');

    function renderList(currentFilter) {
        listContainer.innerHTML = "";
        
        let allCnt = 0, unreadCnt = 0, readCnt = 0;
        let displayedItems = 0;

        allAnnouncements.forEach(ann => {
            const isRead = readUrls.has(ann.href);
            
            allCnt++;
            if (isRead) readCnt++; else unreadCnt++;

            if (currentFilter === 'unread' && isRead) return;
            if (currentFilter === 'read' && !isRead) return;

            displayedItems++;

            const item = document.createElement('div');
            item.style.cssText = `
                padding: 6px 0; border-bottom: 1px solid #f3f3f3; display: flex; align-items: center;
                opacity: ${isRead ? '0.5' : '1'};
            `;

            item.innerHTML = `
                <span class="badge" style="background: ${isRead ? '#6c757d' : '#ad3333'}; color: white; font-size: 10px; font-weight: bold; padding: 1px 5px; border-radius: 4px; margin-right: 10px; flex-shrink: 0;">
                    ${isRead ? '既読' : '未読'}
                </span>
                <a href="${ann.href}" target="_blank" style="color: #333; text-decoration: none; font-size: 13px; font-weight: 500; transition: color 0.2s; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${ann.title}
                </a>
            `;

            const link = item.querySelector('a');
            link.onclick = () => {
                if (!isRead) {
                    readUrls.add(ann.href);
                    chrome.storage.local.set({ readAnnouncementUrls: Array.from(readUrls) }, () => {
                        renderList(currentFilter);
                    });
                }
            };

            link.onmouseover = () => link.style.color = '#ad3333';
            link.onmouseout = () => link.style.color = '#333';

            listContainer.appendChild(item);
        });

        document.getElementById('count-all').textContent = allCnt;
        document.getElementById('count-unread').textContent = unreadCnt;
        document.getElementById('count-read').textContent = readCnt;

        if (displayedItems === 0) {
            listContainer.innerHTML = `<p style="color:#999; font-size:13px; text-align:center; padding: 15px 0; margin: 0;">対象のアナウンスメントはありません。</p>`;
        }
    }

    tabs.forEach(tab => {
        tab.onclick = () => {
            tabs.forEach(t => {
                t.style.background = '#fff'; t.style.color = '#666'; t.style.borderColor = '#ccc';
            });
            tab.style.background = '#ad3333'; tab.style.color = 'white'; tab.style.borderColor = '#ad3333';
            renderList(tab.dataset.filter);
        };
    });

    renderList('unread');
}

async function main() {
    const currentUrl = window.location.href;
    const isHomePage = currentUrl.includes('/my/') || 
                       currentUrl.endsWith('lms.ritsumei.ac.jp/') || 
                       currentUrl.endsWith('lms.ritsumei.ac.jp/index.php');
    
    if (!isHomePage) {
        return;
    }

    const courseUrls = getCourseLinks();
    const allAnnouncements = [];

    for (const url of courseUrls) {
        const announcements = await getAnnouncementLinks(url);
        allAnnouncements.push(...announcements);
    }

    const uniqueAnnouncements = [];
    const seenMap = new Set();
    allAnnouncements.forEach(ann => {
        const uniqueKey = `${ann.title}____${ann.href}`;
        if (!seenMap.has(uniqueKey)) {
            seenMap.add(uniqueKey);
            uniqueAnnouncements.push(ann);
        }
    });

    displayAnnouncements(uniqueAnnouncements);
}

if (document.readyState === 'complete') {
    main();
} else {
    window.addEventListener('load', main);
}