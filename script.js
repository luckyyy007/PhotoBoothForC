const video = document.getElementById("video");
const canvas = document.getElementById("photoCanvas");
const ctx = canvas.getContext("2d");

const start = document.getElementById("start");
const snap = document.getElementById("snap");
const reset = document.getElementById("reset");
const strip = document.getElementById("strip");
const countdown = document.getElementById("countdown");
const status = document.getElementById("status");
const error = document.getElementById("error");
const download = document.getElementById("download");

const filterButtons = document.querySelectorAll(".filter-button");

const PHOTO_WIDTH = 600;
const PHOTO_HEIGHT = 800;

canvas.width = PHOTO_WIDTH;
canvas.height = PHOTO_HEIGHT;

let stream = null;
let photos = [];
let currentFilter = "original";


// CAMERA
start.addEventListener("click", async () => {
    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: "user",
                width: { ideal: 720 },
                height: { ideal: 960 }
            },
            audio: false
        });

        video.srcObject = stream;

        await video.play();

        start.disabled = true;
        snap.disabled = false;

        status.textContent = "camera ready ♡";
        error.textContent = "";

    } catch (err) {
        error.textContent = "camera toestemming nodig :( ♡";
        console.error(err);
    }
});


// PHOTO
snap.addEventListener("click", async () => {

    if (photos.length >= 4) return;

    snap.disabled = true;

    // COUNTDOWN
    for (let i = 3; i > 0; i--) {
        countdown.textContent = i;
        countdown.style.display = "grid";

        await wait(700);
    }

    countdown.style.display = "none";

    const photo = capturePhoto();

    photos.push(photo);

    updateStrip();

    if (photos.length < 4) {
        snap.textContent = `photo ${photos.length + 1}/4 📸`;
        snap.disabled = false;
    } else {
        snap.textContent = "klaar! ♡";
        status.textContent = "alle foto's zijn klaar ♡";
        download.disabled = false;
    }
});


// CAPTURE PORTRAIT PHOTO
function capturePhoto() {

    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;

    const scale = Math.min(
        PHOTO_WIDTH / videoWidth,
        PHOTO_HEIGHT / videoHeight
    );

    const width = videoWidth * scale;
    const height = videoHeight * scale;

    const x = (PHOTO_WIDTH - width) / 2;
    const y = (PHOTO_HEIGHT - height) / 2;

    // achtergrond
    ctx.fillStyle = "#000";
    ctx.fillRect(
        0,
        0,
        PHOTO_WIDTH,
        PHOTO_HEIGHT
    );

    // spiegel zoals de preview
    ctx.save();

    ctx.translate(PHOTO_WIDTH, 0);
    ctx.scale(-1, 1);

    ctx.drawImage(
        video,
        x,
        y,
        width,
        height
    );

    ctx.restore();

    return canvas.toDataURL(
        "image/jpeg",
        0.92
    );
}


// STRIP
function updateStrip() {

    strip.innerHTML = "";

    photos.forEach((photo, index) => {

        const img = document.createElement("img");

        img.src = photo;
        img.alt = `Photo ${index + 1}`;

        applyFilter(img);

        strip.appendChild(img);
    });

    const label = document.createElement("div");

    label.className = "strip-label";
    label.textContent = "Charlie's portable photobooth";

    strip.appendChild(label);
}


// FILTERS
filterButtons.forEach(button => {

    button.addEventListener("click", () => {

        filterButtons.forEach(b =>
            b.classList.remove("active")
        );

        button.classList.add("active");

        currentFilter =
            button.dataset.filter;

        updateStrip();
    });
});


function applyFilter(img) {

    const filters = {

        original: "none",

        vintage:
            "sepia(0.4) contrast(1.05) saturate(0.8)",

        bw:
            "grayscale(1)",

        warm:
            "sepia(0.2) saturate(1.3)",

        cool:
            "saturate(0.8) hue-rotate(15deg)",

        photobooth:
            "contrast(1.1) saturate(1.15) sepia(0.12)"
    };

    img.style.filter =
        filters[currentFilter] || "none";
}


// DOWNLOAD
download.addEventListener("click", () => {

    if (photos.length !== 4) return;

    const stripCanvas =
        document.createElement("canvas");

    const width = 600;
    const photoHeight = 800;
    const gap = 20;
    const padding = 30;
    const labelHeight = 80;

    stripCanvas.width = width;

    stripCanvas.height =
        padding +
        (photoHeight * 4) +
        (gap * 3) +
        labelHeight +
        padding;

    const c =
        stripCanvas.getContext("2d");

    c.fillStyle = "#ffffff";

    c.fillRect(
        0,
        0,
        stripCanvas.width,
        stripCanvas.height
    );

    let y = padding;

    photos.forEach(photo => {

        const img = new Image();

        img.onload = () => {

            c.save();

            c.filter =
                getCanvasFilter();

            c.drawImage(
                img,
                0,
                y,
                width,
                photoHeight
            );

            c.restore();

            y += photoHeight + gap;

            if (y >= padding +
                photoHeight * 4 +
                gap * 3) {

                c.filter = "none";

                c.font =
                    "20px Arial";

                c.textAlign = "center";

                c.fillStyle = "#222";

                c.fillText(
                    "Charlie's portable photobooth ♡",
                    width / 2,
                    stripCanvas.height - 35
                );

                const link =
                    document.createElement("a");

                link.download =
                    "charlies-photobooth.jpg";

                link.href =
                    stripCanvas.toDataURL(
                        "image/jpeg",
                        0.95
                    );

                link.click();
            }
        };

        img.src = photo;
    });
});


function getCanvasFilter() {

    const filters = {

        original: "none",

        vintage:
            "sepia(0.4) contrast(1.05) saturate(0.8)",

        bw:
            "grayscale(1)",

        warm:
            "sepia(0.2) saturate(1.3)",

        cool:
            "saturate(0.8) hue-rotate(15deg)",

        photobooth:
            "contrast(1.1) saturate(1.15) sepia(0.12)"
    };

    return filters[currentFilter] || "none";
}


// RESET
reset.addEventListener("click", () => {

    photos = [];

    currentFilter = "original";

    strip.innerHTML = `
        <div class="empty-photo">
            PHOTO 1
        </div>

        <div class="empty-photo">
            PHOTO 2
        </div>

        <div class="empty-photo">
            PHOTO 3
        </div>

        <div class="empty-photo">
            PHOTO 4
        </div>

        <div class="strip-label">
            Charlie's portable photobooth
        </div>
    `;

    snap.textContent = "photo 1/4 📸";
    snap.disabled = !stream;

    download.disabled = true;

    status.textContent =
        stream ? "camera ready ♡" : "uhm... camera eerst?";

    filterButtons.forEach(b =>
        b.classList.remove("active")
    );

    document
        .querySelector('[data-filter="original"]')
        .classList.add("active");
});


// HELPER
function wait(ms) {
    return new Promise(
        resolve => setTimeout(resolve, ms)
    );
}
