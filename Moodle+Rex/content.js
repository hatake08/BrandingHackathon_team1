(async function () {
  // =====================
  // 設定
  // =====================
  const DASHBOARD_SELECTOR = "#page-content";

  // =====================
  // 既存表示の削除
  // =====================
  document.getElementById("announcement-box")?.remove();

  // =====================
  // 表示ボックス
  // =====================
  const box = document.createElement("div");
  box.id = "announcement-box";

  Object.assign(box.style, {
    width: "100%",
    maxWidth: "900px",
    maxHeight: "600px",
    overflowY: "auto",
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: "6px",
    padding: "16px",
    margin: "20px 0",
    boxShadow: "0 2px 10px rgba(0,0,0,0.12)",
    boxSizing: "border-box",
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
  });

  box.innerHTML = `
    <h3 style="margin:0 0 12px;">未読アナウンス一覧</h3>
    <div id="announcement-status" style="font-size:13px; color:#666; margin-bottom:10px;">
      取得中...
    </div>
    <ul id="announcement-list" style="padding-left:0; margin:0; list-style:none;"></ul>
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

  const status = document.getElementById("announcement-status");
  const listContainer = document.getElementById("announcement-list");

  // =====================
  // 重複防止用
  // =====================
  const courseLinks = new Set();
  const discussionIds = new Set();

  // =====================
  // コースリンク取得
  // =====================
  document
    .querySelectorAll('a[href*="/course/view.php?id="]')
    .forEach(link => {
      courseLinks.add(link.href);
    });

  const parser = new DOMParser();

  console.log("取得コース数:", courseLinks.size);

  // =====================
  // 未読判定
  // =====================
  function isUnreadDiscussion(row) {
    const classText = row.className.toString().toLowerCase();
    const text = row.textContent.trim();

    return (
      classText.includes("unread") ||
      row.querySelector(".unread") ||
      row.querySelector(".forum-post-unread") ||
      row.querySelector('[class*="unread"]') ||
      row.querySelector('[aria-label*="未読"]') ||
      row.querySelector('[title*="未読"]') ||
      text.includes("未読")
    );
  }

  // =====================
  // 日付取得
  // =====================
  function getDateText(row) {
    return (
      row.querySelector(".lastpost")?.textContent.trim() ||
      row.querySelector(".latestpost")?.textContent.trim() ||
      row.querySelector("td:last-child")?.textContent.trim() ||
      "日付不明"
    );
  }

  // =====================
  // 表示追加
  // =====================
  function addAnnouncement({ courseName, title, href, dateText }) {
    const li = document.createElement("li");

    Object.assign(li.style, {
      marginBottom: "12px",
      paddingBottom: "12px",
      borderBottom: "1px solid #eee"
    });

    const course = document.createElement("div");
    course.textContent = courseName;
    Object.assign(course.style, {
      fontSize: "13px",
      color: "#555",
      fontWeight: "700",
      marginBottom: "4px"
    });

    const link = document.createElement("a");
    link.textContent = title;
    link.href = href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    Object.assign(link.style, {
      fontSize: "15px",
      fontWeight: "700",
      color: "#0645ad",
      textDecoration: "none"
    });

    const date = document.createElement("div");
    date.textContent = dateText;
    Object.assign(date.style, {
      fontSize: "12px",
      color: "#777",
      marginTop: "4px",
      lineHeight: "1.4"
    });

    li.appendChild(course);
    li.appendChild(link);
    li.appendChild(date);

    listContainer.appendChild(li);
  }

  // =====================
  // コース巡回
  // =====================
  for (const courseUrl of courseLinks) {
    try {
      status.textContent = `取得中... ${discussionIds.size}件`;

      const response = await fetch(courseUrl);
      const htmlText = await response.text();
      const doc = parser.parseFromString(htmlText, "text/html");

      const courseName =
        doc.querySelector(".page-header-headings h1")?.textContent.trim() ||
        doc.querySelector("h1")?.textContent.trim() ||
        "授業名不明";

      const forums = doc.querySelectorAll(
        '.modtype_forum a[href*="/mod/forum/view.php"], a[href*="/mod/forum/view.php"]'
      );

      for (const forum of forums) {
        try {
          const forumResponse = await fetch(forum.href);
          const forumHtml = await forumResponse.text();
          const forumDoc = parser.parseFromString(forumHtml, "text/html");

          const discussions = forumDoc.querySelectorAll(
            'tr.discussion, article.discussion, div.discussion'
          );

          console.log("forum:", forum.href);
          console.log("discussion行数:", discussions.length);

          discussions.forEach(row => {
            if (!isUnreadDiscussion(row)) return;

            const discussion = row.querySelector(
              'a[href*="/mod/forum/discuss.php"]'
            );

            if (!discussion) return;

            const title = discussion.textContent.trim();
            const href = discussion.href;

            const match = href.match(/discuss\.php\?d=(\d+)/);
            if (!match) return;

            const discussionId = match[1];

            if (discussionIds.has(discussionId)) return;
            discussionIds.add(discussionId);

            addAnnouncement({
              courseName,
              title,
              href,
              dateText: getDateText(row)
            });
          });

        } catch (e) {
          console.error("forum取得失敗", forum.href, e);
        }
      }

    } catch (e) {
      console.error("course取得失敗", courseUrl, e);
    }
  }

  // =====================
  // 完了表示
  // =====================
  if (discussionIds.size === 0) {
    listContainer.innerHTML = `
      <li style="color:#777; font-size:14px;">
        未読アナウンスはありません。
      </li>
    `;
  }

  status.textContent = `取得完了：未読 ${discussionIds.size}件`;

  console.log("取得未読ディスカッション数:", discussionIds.size);
})();