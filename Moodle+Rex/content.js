console.log("未読ディスカッション抽出 開始");

setTimeout(() => {

  // ★ ディスカッション単位を探す（Moodleの典型構造）
  const posts =
    document.querySelectorAll(".discussion, .forumpost, .post, tr");

  let unread = [];

  posts.forEach(p => {

    const text = (p.innerText || "").trim();
    const link = p.querySelector("a");

    if (!text || !link) return;

    const url = link.href;
    const title = link.innerText.trim();

    // ★ 未読判定（Moodleでよくあるパターン）
    const isUnread =
      p.classList.contains("unread") ||
      p.classList.contains("new") ||
      text.includes("未読") ||
      text.includes("new");

    // ★ forum/news の中だけに限定
    const isAnnouncement =
      url.includes("forum") || url.includes("discuss");

    if (isUnread && isAnnouncement) {
      unread.push({ title, url });
    }
  });

  console.log("未読ディスカッション:", unread);

  // ★ 表作成
  const table = document.createElement("table");

  table.style.position = "fixed";
  table.style.top = "10px";
  table.style.right = "10px";
  table.style.width = "380px";
  table.style.maxHeight = "400px";
  table.style.overflow = "auto";
  table.style.background = "white";
  table.style.border = "1px solid #ccc";
  table.style.zIndex = "9999";
  table.style.fontSize = "12px";
  table.style.borderCollapse = "collapse";

  table.innerHTML = `
    <tr>
      <th style="border:1px solid #ccc;">未読ディスカッション</th>
      <th style="border:1px solid #ccc;">リンク</th>
    </tr>
  `;

  unread.forEach(item => {
    table.innerHTML += `
      <tr>
        <td style="border:1px solid #ccc; padding:4px;">
          ${item.title}
        </td>
        <td style="border:1px solid #ccc; padding:4px;">
          <a href="${item.url}" target="_blank">開く</a>
        </td>
      </tr>
    `;
  });

  document.body.appendChild(table);

}, 2000);