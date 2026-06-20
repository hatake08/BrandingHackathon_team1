async function getAnnouncementLinks(courseUrl) {
    const response = await fetch(courseUrl);
    const htmlText = await response.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, "text/html");

    const pageTitleEl = doc.querySelector('h1') || doc.querySelector('.page-header-headings h2') || doc.querySelector('title');
    let courseName = "";
    
    if (pageTitleEl) {
        courseName = pageTitleEl.textContent.trim().replace("コース: ", "");
    }

    const forums = doc.querySelectorAll(".modtype_forum");
    const announcements = [];

    forums.forEach(forum => {
        const link = forum.querySelector("a");
        if (!link) return;

        announcements.push({
            title: `[${courseName}] ${link.textContent.trim()}`,
            href: link.href
        });
    });

    return announcements;
}