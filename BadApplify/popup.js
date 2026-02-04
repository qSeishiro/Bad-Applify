
const slider = document.getElementById('volSlider');
const volText = document.getElementById('volText');
const startBtn = document.getElementById('startBtn');

slider.addEventListener('input', async () => {
    const val = slider.value;
    volText.textContent = val + "%";

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { 
            action: "update_volume", 
            volume: val 
        }).catch(() => {}); 
    }
});

startBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.url.includes("youtube.com")) {
        alert("Open YouTube.com!");
        return;
    }

    chrome.tabs.sendMessage(tab.id, { 
        action: "start_bad_apple",
        volume: slider.value 
    }, (response) => {
        if (chrome.runtime.lastError) {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content.js']
            }, () => {
                setTimeout(() => {
                    chrome.tabs.sendMessage(tab.id, { 
                        action: "start_bad_apple",
                        volume: slider.value 
                    });
                }, 100);
            });
        }
    });
});