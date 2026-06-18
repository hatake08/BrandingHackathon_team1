// ===== announcement.js の内容 =====

async function getAnnouncementLinks(courseUrl) {
    try {
        const response = await fetch(courseUrl);
        const htmlText = await response.text();

        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, "text/html");

        const forums = doc.querySelectorAll(".modtype_forum");

        const announcements = [];

        forums.forEach(forum => {
            const link = forum.querySelector("a");

            if (!link) return;

            announcements.push({
                title: link.textContent.trim(),
                href: link.href
            });
        });

        return announcements;

    } catch (error) {
        console.error("取得失敗:", courseUrl, error);
        return [];
    }
}


// ===== 元の content.js =====

function getCourseLinks() {
    const courseLinks = [];

    document
        .querySelectorAll('a[href*="/course/view.php?id="]')
        .forEach(link => {
            courseLinks.push(link.href);
        });

    return [...new Set(courseLinks)];
}


async function main() {

    const courseUrls = getCourseLinks();

    console.log("授業一覧");
    console.log(courseUrls);

    const allAnnouncements = [];

    for (const url of courseUrls) {

        console.log("取得中:", url);

        const announcements =
            await getAnnouncementLinks(url);

        allAnnouncements.push(...announcements);
    }

    console.log("取得結果");
    console.log(allAnnouncements);

    // 動作確認用
    alert(
        allAnnouncements.length > 0
            ? `${allAnnouncements.length}件取得しました`
            : "アナウンスが見つかりません"
    );
}

main();