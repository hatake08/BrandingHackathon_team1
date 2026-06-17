export async function getAnnouncementLinks(courseUrl) {
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
}