async function main() {

    const courseUrls = getCourseLinks();

    const allAnnouncements = [];

    for (const url of courseUrls) {

        // 授業ページ取得
        const response = await fetch(url);
        const html = await response.text();

        const doc = new DOMParser()
            .parseFromString(html, "text/html");

        // 授業名取得
        const courseName =
            doc.querySelector("h1")?.textContent.trim()
            || "授業名不明";

        // アナウンス取得
        const announcements =
            await getAnnouncementLinks(url);

        announcements.forEach(item => {
            allAnnouncements.push({
                course: courseName,
                title: item.title,
                href: item.href
            });
        });
    }

    createDashboardPanel(allAnnouncements);
}

main();

function createDashboardPanel(data) {

    const panel = document.createElement("div");

    panel.id = "announcement-panel";

    panel.style.margin = "20px 0";
    panel.style.padding = "15px";
    panel.style.background = "#fff";
    panel.style.border = "1px solid #ccc";

    const title = document.createElement("h2");
    title.textContent = "アナウンス一覧";

    panel.appendChild(title);

    data.forEach(item => {

        const row = document.createElement("div");

        row.style.marginBottom = "10px";

        row.innerHTML = `
            <strong>${item.course}</strong><br>
            <a href="${item.href}" target="_blank">
                ${item.title}
            </a>
        `;

        panel.appendChild(row);
    });

    // Moodleダッシュボードに挿入
    const dashboard =
        document.querySelector("#page-content");

    if (dashboard) {
        dashboard.prepend(panel);
    } else {
        document.body.prepend(panel);
    }
}