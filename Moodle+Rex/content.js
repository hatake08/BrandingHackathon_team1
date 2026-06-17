import { getAnnouncementLinks } from "./announcement.js";

function getCourseLinks() {
    const courseLinks = [];

    document.querySelectorAll('a[href*="/course/view.php?id="]')
        .forEach(link => {
            courseLinks.push(link.href);
        });

    return [...new Set(courseLinks)];
}

async function main() {

    const courseUrls = getCourseLinks();

    const allAnnouncements = [];

    for (const url of courseUrls) {

        const announcements =
            await getAnnouncementLinks(url);

        allAnnouncements.push(...announcements);
    }

    console.log(allAnnouncements);
}

main();