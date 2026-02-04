console.log("BadApplify");

let isPlaying = false;
let videoElement = null;
let currentVolume = 0.2;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "ping") sendResponse({status: "pong"});

    if (request.action === "update_volume") {
        currentVolume = request.volume / 100;
        if (videoElement) {
            videoElement.volume = currentVolume;
        }
    }

    if (request.action === "start_bad_apple" && !isPlaying) {
        if (request.volume) {
            currentVolume = request.volume / 100;
        }
        initBadApple();
    }
});

function initBadApple() {
    isPlaying = true;

    const style = document.createElement('style');
    style.innerHTML = `
        #video-preview, 
        .ytd-video-preview, 
        #mouseover-overlay, 
        .ytd-moving-thumbnail-renderer, 
        ytd-moving-thumbnail-renderer {
            display: none !important;
            opacity: 0 !important;
            pointer-events: none !important;
        }

        .bad-apple-canvas {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 2000; 
            pointer-events: none; 
            object-fit: cover;
            background-color: #000; 
        }

        [data-bad-appled="true"] > img, 
        [data-bad-appled="true"] > .yt-core-image {
            opacity: 0 !important;
            visibility: hidden !important;
        }

        yt-thumbnail-view-model[data-bad-appled="true"] img,
        yt-thumbnail-view-model[data-bad-appled="true"] .yt-core-image {
            opacity: 0 !important;
            visibility: hidden !important;
        }
    `;
    document.head.appendChild(style);

    videoElement = document.createElement('video');
    videoElement.src = chrome.runtime.getURL('bad_apple.mp4');
    videoElement.loop = true;
    videoElement.muted = false; 
    videoElement.volume = currentVolume;
    videoElement.style.display = 'none';
    document.body.appendChild(videoElement);

    videoElement.play().then(() => {
        requestAnimationFrame(renderLoop);
        startObserving(); 
        processPage();    
    }).catch(e => {
        console.warn("Sound autoplay is blocked. Trying without sound...", e);
        videoElement.muted = true;
        videoElement.play().then(() => {
            videoElement.muted = false;
            videoElement.volume = currentVolume;
            requestAnimationFrame(renderLoop);
            startObserving();
            processPage();
        });
    });
}

function startObserving() {
    const observer = new MutationObserver((mutations) => {
        if (!this.debounceTimer) {
            this.debounceTimer = setTimeout(() => {
                processPage();
                this.debounceTimer = null;
            }, 100);
        }
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
}

function processPage() {
    const oldThumbs = document.querySelectorAll('ytd-thumbnail a#thumbnail');
    oldThumbs.forEach(el => applyBadApple(el, false));

    const newThumbs = document.querySelectorAll('yt-thumbnail-view-model');
    newThumbs.forEach(el => applyBadApple(el, false));

    const avatars = document.querySelectorAll('yt-avatar-shape');
    avatars.forEach(el => applyBadApple(el, true));
}

function applyBadApple(container, isAvatar) {
    if (container.querySelector('.bad-apple-canvas')) return;

    if (container.offsetWidth < 10 && container.offsetHeight < 10) return;

    container.setAttribute('data-bad-appled', 'true');

    const internalImg = container.querySelector('img');
    if (internalImg) internalImg.style.visibility = 'hidden';

    const canvas = document.createElement('canvas');
    canvas.className = 'bad-apple-canvas';
    
    if (isAvatar) {
        canvas.style.borderRadius = '50%';
    } else {
        const computed = window.getComputedStyle(container);
        canvas.style.borderRadius = computed.borderRadius !== '0px' ? computed.borderRadius : '12px';
    }

    const style = window.getComputedStyle(container);
    if (style.position === 'static') {
        container.style.position = 'relative';
    }

    container.appendChild(canvas);
}

function renderLoop() {
    if (!videoElement) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const vidW = videoElement.videoWidth;
    const vidH = videoElement.videoHeight;

    if (vidW === 0) {
        requestAnimationFrame(renderLoop);
        return;
    }

    const canvases = document.querySelectorAll('.bad-apple-canvas');

    canvases.forEach(canvas => {
        const rect = canvas.getBoundingClientRect();

        if (rect.bottom < 0 || rect.top > vh || rect.right < 0 || rect.left > vw) return;

        const dPR = window.devicePixelRatio || 1;
        const targetWidth = Math.floor(rect.width * dPR);
        const targetHeight = Math.floor(rect.height * dPR);

        if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
            canvas.width = targetWidth;
            canvas.height = targetHeight;
        }

        const ctx = canvas.getContext('2d', { alpha: false }); 

        const sx = (rect.left / vw) * vidW;
        const sy = (rect.top / vh) * vidH;
        const sWidth = (rect.width / vw) * vidW;
        const sHeight = (rect.height / vh) * vidH;

        try {
            ctx.drawImage(videoElement, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);
        } catch(e) {
        }
    });

    requestAnimationFrame(renderLoop);
}