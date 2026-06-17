function getCourseLinks() {
    const courseLinks = [];

    document.querySelectorAll('a[href*="/course/view.php?id="]')
        .forEach(link => {
            courseLinks.push(link.href);
        });

    return [...new Set(courseLinks)];
}