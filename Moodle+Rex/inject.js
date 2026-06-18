// inject.js
(function() {
    // ページ本体（window）のMoodle設定を引っこ抜いて、拡張機能側へイベントで送る
    document.dispatchEvent(new CustomEvent('MoodleConfigExtracted', {
        detail: {
            sesskey: window.M?.cfg?.sesskey || "",
            userId: window.M?.cfg?.userId || "",
            calendarAuthToken: window.M?.cfg?.calendarAuthToken || ""
        }
    }));
})();