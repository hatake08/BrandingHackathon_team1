let activeFetchResolver = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "openSyllabusTab") {        
        activeFetchResolver = sendResponse;

        const url = `https://syllabus.ritsumei.ac.jp/syllabus/s/?coursecode=${request.classCode}&autofetch=true`;
        
        chrome.tabs.create({ url: url, active: false }, (tab) => {
            setTimeout(() => {
                if (activeFetchResolver) {
                    chrome.tabs.remove(tab.id, () => {
                        activeFetchResolver({ success: false });
                        activeFetchResolver = null;
                    });
                }
            }, 15000);
        });

        return true; 
    } 
    
    else if (request.action === "syllabusParseComplete") {
        if (activeFetchResolver) {
            activeFetchResolver({ success: true, data: request.data });
            activeFetchResolver = null;
        }
        if (sender.tab && sender.tab.id) {
            chrome.tabs.remove(sender.tab.id);
        }
    }
});