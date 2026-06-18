(async function () {

  // =====================
  // 表示ボックス
  // =====================
  const box = document.createElement("div");

  box.id = "announcement-box";

  Object.assign(box.style, {
    position: "fixed",
    top: "20px",
    right: "20px",
    width: "450px",
    maxHeight: "600px",
    overflowY: "auto",
    background: "white",
    border: "1px solid #ccc",
    padding: "15px",
    zIndex: "99999",
    boxShadow: "0 0 10px rgba(0,0,0,0.2)"
  });

  box.innerHTML = `
    <h3>アナウンス一覧</h3>
    <ul id="announcement-list"></ul>
  `;

  document.body.appendChild(box);

  const listContainer =
    document.getElementById("announcement-list");

  // =====================
  // 重複防止用
  // =====================
  const courseLinks = new Set();
  const discussionIds = new Set();

  // =====================
  // コース取得
  // =====================
  document
    .querySelectorAll(
      'a[href*="/course/view.php?id="]'
    )
    .forEach(link => {
      courseLinks.add(link.href);
    });

  const parser = new DOMParser();

  console.log(
    "取得コース数:",
    courseLinks.size
  );

  // =====================
  // コース巡回
  // =====================
  for (const courseUrl of courseLinks) {

    try {

      const response =
        await fetch(courseUrl);

      const htmlText =
        await response.text();

      const doc =
        parser.parseFromString(
          htmlText,
          "text/html"
        );

      // =====================
      // フォーラム取得
      // =====================
      const forums =
        doc.querySelectorAll(
          '.modtype_forum a[href*="/mod/forum/view.php"]'
        );

      for (const forum of forums) {

        try {

          const forumResponse =
            await fetch(forum.href);

          const forumHtml =
            await forumResponse.text();

          const forumDoc =
            parser.parseFromString(
              forumHtml,
              "text/html"
            );

          // =====================
          // ディスカッション取得
          // =====================
          const discussions =
            forumDoc.querySelectorAll(
              "tr.discussion"
            );

          discussions.forEach(row => {

            const discussion =
              row.querySelector(
                'a[href*="/mod/forum/discuss.php"]'
              );

            if (!discussion) return;

            const title =
              discussion.textContent.trim();

            const href =
              discussion.href;

            const match =
              href.match(
                /discuss\.php\?d=(\d+)/
              );

            if (!match) return;

            const discussionId =
              match[1];

            // 重複除去
            if (
              discussionIds.has(
                discussionId
              )
            ) {
              return;
            }

            discussionIds.add(
              discussionId
            );

            const li =
              document.createElement(
                "li"
              );

            li.style.marginBottom =
              "8px";

            li.innerHTML = `
              <a href="${href}"
                 target="_blank">
                ${title}
              </a>
            `;

            listContainer.appendChild(
              li
            );

          });

        } catch (e) {

          console.error(
            "forum取得失敗",
            forum.href,
            e
          );

        }

      }

    } catch (e) {

      console.error(
        "course取得失敗",
        courseUrl,
        e
      );

    }

  }

  console.log(
    "取得ディスカッション数:",
    discussionIds.size
  );

})();