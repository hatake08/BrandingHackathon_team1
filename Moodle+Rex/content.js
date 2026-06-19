(async function () {

  const DASHBOARD_SELECTOR = "#page-content";

  const box = document.createElement("div");
  box.id = "announcement-box";

  Object.assign(box.style, {
    width: "100%",
    maxWidth: "900px",
    maxHeight: "600px",
    overflowY: "auto",
    background: "white",
    border: "1px solid #ccc",
    padding: "15px",
    margin: "20px 0",
    boxShadow: "0 0 10px rgba(0,0,0,0.15)",
    boxSizing: "border-box"
  });

  box.innerHTML = `
    <h3 style="margin-top:0;">未読アナウンス一覧</h3>
    <ul id="announcement-list" style="padding-left:0; list-style:none;"></ul>
  `;

  const dashboardTarget = document.querySelector(DASHBOARD_SELECTOR);

  if (dashboardTarget) {
    dashboardTarget.prepend(box);
  } else {
    Object.assign(box.style, {
      position: "fixed",
      top: "20px",
      right: "20px",
      width: "450px",
      zIndex: "99999"
    });
    document.body.appendChild(box);
  }

  const listContainer = document.getElementById("announcement-list");

  const courseLinks = new Set();
  const discussionIds = new Set();

  document
    .querySelectorAll('a[href*="/course/view.php?id="]')
    .forEach(link => {
      courseLinks.add(link.href);
    });

  const parser = new DOMParser();

  console.log("取得コース数:", courseLinks.size);

  for (const courseUrl of courseLinks) {

    try {

      const response = await fetch(courseUrl);
      const htmlText = await response.text();

      const doc = parser.parseFromString(htmlText, "text/html");

      const courseName =
        doc.querySelector("h1")?.textContent.trim() ||
        doc.querySelector(".page-header-headings h1")?.textContent.trim() ||
        "授業名不明";

      const forums = doc.querySelectorAll(
        '.modtype_forum a[href*="/mod/forum/view.php"]'
      );

      for (const forum of forums) {

        try {

          const forumResponse = await fetch(forum.href);
          const forumHtml = await forumResponse.text();

          const forumDoc = parser.parseFromString(forumHtml, "text/html");

          const discussions = forumDoc.querySelectorAll("tr.discussion");

          discussions.forEach(row => {

            // =====================
            // 未読判定
            // =====================
            const isUnread =
              row.classList.contains("unread") ||
              row.querySelector(".unread") ||
              row.querySelector(".forum-post-unread") ||
              row.querySelector('[class*="unread"]') ||
              row.textContent.includes("未読");

            if (!isUnread) return;

            const discussion = row.querySelector(
              'a[href*="/mod/forum/discuss.php"]'
            );

            if (!discussion) return;

            const title = discussion.textContent.trim();
            const href = discussion.href;

            const match = href.match(/discuss\.php\?d=(\d+)/);
            if (!match) return;

            const discussionId = match[1];

            if (discussionIds.has(discussionId)) {
              return;
            }

            discussionIds.add(discussionId);

            const dateText =
              row.querySelector(".lastpost")?.textContent.trim() ||
              row.querySelector(".author")?.textContent.trim() ||
              row.querySelector("td:last-child")?.textContent.trim() ||
              "日付不明";

            const li = document.createElement("li");

            Object.assign(li.style, {
              marginBottom: "12px",
              paddingBottom: "10px",
              borderBottom: "1px solid #eee"
            });

            li.innerHTML = `
              <div style="font-size:13px; color:#555; margin-bottom:4px;">
                <strong>${courseName}</strong>
              </div>

              <a href="${href}" target="_blank"
                 style="font-size:15px; font-weight:bold; color:#0645ad; text-decoration:none;">
                ${title}
              </a>

              <div style="font-size:12px; color:#777; margin-top:4px;">
                ${dateText}
              </div>
            `;

            listContainer.appendChild(li);

          });

        } catch (e) {
          console.error("forum取得失敗", forum.href, e);
        }

      }

    } catch (e) {
      console.error("course取得失敗", courseUrl, e);
    }

  }

  if (discussionIds.size === 0) {
    listContainer.innerHTML = `
      <li style="color:#777;">
        未読アナウンスはありません。
      </li>
    `;
  }

  console.log("取得未読ディスカッション数:", discussionIds.size);

})();