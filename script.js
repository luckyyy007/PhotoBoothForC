const video = document.getElementById("video");
const canvas = document.getElementById("photoCanvas");
const countdown = document.getElementById("countdown");
const status = document.getElementById("status");
const error = document.getElementById("error");
const startButton = document.getElementById("start");
const snapButton = document.getElementById("snap");
const resetButton = document.getElementById("reset");
const downloadButton = document.getElementById("download");
const strip = document.getElementById("strip");
const filtersContainer = document.getElementById("filters");
const filterButtons = document.querySelectorAll(".filter-button");

let cameraStream = null;
let photos = [];
let takingPhoto = false;
let currentFilter = "original";

const filterSettings = {
    original: {
        css: "none"
    },
    vintage: {
        css: "sepia(0.45) contrast(0.90) saturate(0.75)"
    },
    bw: {
        css: "grayscale(1) contrast(1.08)"
    },
    warm: {
        css: "sepia(0.25) saturate(1.25) contrast(0.95)"
    },
    cool: {
        css: "saturate(0.85) hue-rotate(12deg) contrast(1.05)"
    },
    photobooth: {
        css: "sepia(0.16) saturate(0.82) contrast(1.12) brightness(1.04)"
    }
};


/* =========================
   CAMERA
========================= */

async function startCamera() {
    try {
        error.textContent = "";

        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: "user",
                width: {
                    ideal: 1280
                },
                height: {
                    ideal: 960
                }
            },
            audio: false
        });

        video.srcObject = cameraStream;

        await video.play();

        status.textContent = "Camera ready";
        startButton.disabled = true;
        snapButton.disabled = false;

    } catch (err) {
        console.error(err);

        error.textContent =
            "Could not access the camera. Please allow camera access.";
        status.textContent = "Camera unavailable";
    }
}


/* =========================
   TAKE PHOTO
========================= */

async function takePhoto() {
    if (takingPhoto || photos.length >= 4) {
        return;
    }

    takingPhoto = true;
    snapButton.disabled = true;

    /* Countdown */

    for (let number = 3; number >= 1; number--) {
        countdown.textContent = number;
        countdown.classList.add("show");

        await wait(700);
    }

    countdown.textContent = "📸";
    await wait(180);

    /* =========================
       CANVAS
       
       Keep the output at 4:3,
       matching the camera preview.
    ========================= */

    canvas.width = 1200;
    canvas.height = 900;

    const context = canvas.getContext("2d");

    /*
        The camera preview uses:

            object-fit: cover

        inside a 4:3 container.

        Therefore we must crop the ORIGINAL
        camera frame before drawing it onto
        the canvas.

        This makes the saved photo show
        exactly the same part of the image
        that is visible in the preview.
    */

    const cameraContainer =
        document.querySelector(".camera-container");

    const previewRatio =
        cameraContainer.clientWidth /
        cameraContainer.clientHeight;

    const videoRatio =
        video.videoWidth /
        video.videoHeight;

    let sourceWidth = video.videoWidth;
    let sourceHeight = video.videoHeight;
    let sourceX = 0;
    let sourceY = 0;

    /*
        Same crop logic as:

            object-fit: cover
    */

    if (videoRatio > previewRatio) {
        /*
            Video is wider than the preview.

            Crop left and right.
        */

        sourceWidth =
            video.videoHeight * previewRatio;

        sourceX =
            (video.videoWidth - sourceWidth) / 2;

    } else if (videoRatio < previewRatio) {
        /*
            Video is taller than the preview.

            Crop top and bottom.
        */

        sourceHeight =
            video.videoWidth / previewRatio;

        sourceY =
            (video.videoHeight - sourceHeight) / 2;
    }

    /*
        Draw exactly the visible preview area
        into the 4:3 canvas.

        IMPORTANT:
        We intentionally do NOT mirror the
        saved photo. The preview is mirrored
        through CSS, while the saved photo
        remains normal.
    */

    context.drawImage(
        video,

        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,

        0,
        0,
        canvas.width,
        canvas.height
    );

    /* Convert to image */

    const image =
        canvas.toDataURL("image/jpeg", 0.92);

    photos.push(image);

    updateStrip();

    countdown.classList.remove("show");

    status.textContent =
        `${photos.length}/4 photos taken`;

    if (photos.length >= 4) {
        snapButton.disabled = true;
        downloadButton.disabled = false;
        filtersContainer.classList.remove("disabled");
    } else {
        snapButton.disabled = false;
    }

    takingPhoto = false;
}


/* =========================
   UPDATE PHOTO STRIP
========================= */

function updateStrip() {
    const slots = strip.querySelectorAll(".photo-slot");

    slots.forEach((slot, index) => {
        slot.innerHTML = "";

        if (photos[index]) {
            const image = document.createElement("img");

            image.src = photos[index];

            image.style.filter =
                filterSettings[currentFilter].css;

            slot.appendChild(image);
        }
    });
}


/* =========================
   FILTERS
========================= */

filterButtons.forEach(button => {
    button.addEventListener("click", () => {
        currentFilter =
            button.dataset.filter;

        filterButtons.forEach(item => {
            item.classList.remove("active");
        });

        button.classList.add("active");

        updateStrip();
    });
});


/* =========================
   RESET
========================= */

function resetPhotos() {
    photos = [];
    currentFilter = "original";

    const slots = strip.querySelectorAll(".photo-slot");

    slots.forEach(slot => {
        slot.innerHTML = "";
    });

    filterButtons.forEach(button => {
        button.classList.remove("active");
    });

    const originalButton =
        document.querySelector(
            '.filter-button[data-filter="original"]'
        );

    if (originalButton) {
        originalButton.classList.add("active");
    }

    countdown.classList.remove("show");

    status.textContent = cameraStream
        ? "Camera ready"
        : "Start the camera";

    downloadButton.disabled = true;

    if (cameraStream) {
        snapButton.disabled = false;
    }
}


/* =========================
   DOWNLOAD PHOTO STRIP
========================= */

function downloadStrip() {
    if (photos.length === 0) {
        return;
    }

    /*
        Each photo is 4:3.

        900px wide
        675px high
    */

    const photoWidth = 900;
    const photoHeight = 675;

    const padding = 30;
    const gap = 20;

    const outputWidth =
        photoWidth + padding * 2;

    const outputHeight =
        padding * 2 +
        photoHeight * photos.length +
        gap * (photos.length - 1);

    const outputCanvas =
        document.createElement("canvas");

    outputCanvas.width = outputWidth;
    outputCanvas.height = outputHeight;

    const context =
        outputCanvas.getContext("2d");

    /*
        Background
    */

    context.fillStyle = "#f8f1e8";
    context.fillRect(
        0,
        0,
        outputWidth,
        outputHeight
    );

    /*
        Draw every photo
    */

    let y = padding;

    photos.forEach(photo => {
        const image =
            new Image();

        image.src = photo;

        /*
            Wait for image loading.
            Because this function can be
            called after the images are
            already loaded, onload handles
            both cases safely.
        */

        image.onload = () => {
            context.save();

            context.filter =
                filterSettings[currentFilter].css;

            context.drawImage(
                image,
                padding,
                y,
                photoWidth,
                photoHeight
            );

            context.restore();

            y += photoHeight + gap;

            /*
                Only download after the final
                photo has been drawn.
            */

            if (y >=
                padding +
                photoHeight * photos.length +
                gap * (photos.length - 1)) {

                const link =
                    document.createElement("a");

                link.download =
                    `snapstrip-${currentFilter}.jpg`;

                link.href =
                    outputCanvas.toDataURL(
                        "image/jpeg",
                        0.92
                    );

                link.click();
            }
        };
    });
}


/* =========================
   HELPER
========================= */

function wait(milliseconds) {
    return new Promise(resolve => {
        setTimeout(resolve, milliseconds);
    });
}


/* =========================
   BUTTON EVENTS
========================= */

startButton.addEventListener(
    "click",
    startCamera
);

snapButton.addEventListener(
    "click",
    takePhoto
);

resetButton.addEventListener(
    "click",
    resetPhotos
);

downloadButton.addEventListener(
    "click",
    downloadStrip
);


/* =========================
   INITIAL STATE
========================= */

downloadButton.disabled = true;
snapButton.disabled = true;
filtersContainer.classList.add("disabled");
