const video = document.getElementById("video");
const canvas = document.getElementById("photoCanvas");

const startButton = document.getElementById("start");
const snapButton = document.getElementById("snap");
const resetButton = document.getElementById("reset");

const countdown = document.getElementById("countdown");
const status = document.getElementById("status");
const error = document.getElementById("error");

const strip = document.getElementById("strip");
const filters = document.getElementById("filters");
const downloadButton = document.getElementById("download");

const cropEditor = document.getElementById("cropEditor");
const cropArea = document.getElementById("cropArea");
const cropImage = document.getElementById("cropImage");
const zoomSlider = document.getElementById("zoomSlider");
const cropConfirm = document.getElementById("cropConfirm");
const cropCancel = document.getElementById("cropCancel");

const TOTAL_PHOTOS = 4;

const filterSettings = {
    original: "none",
    vintage: "sepia(0.35) saturate(0.8) contrast(1.05)",
    bw: "grayscale(1)",
    warm: "sepia(0.18) saturate(1.25) contrast(1.05)",
    cool: "saturate(0.85) hue-rotate(10deg) brightness(1.05)",
    photobooth: "contrast(1.12) saturate(0.85) brightness(1.04)"
};

let stream = null;
let photos = [];

let currentFilter = "original";

let pendingPhoto = null;
let pendingImage = null;

let cropScale = 1;
let cropX = 0;
let cropY = 0;

let dragStartX = 0;
let dragStartY = 0;
let startCropX = 0;
let startCropY = 0;

let dragging = false;
let takingPhoto = false;


// ==========================================
// CAMERA STARTEN
// ==========================================

startButton.addEventListener("click", startCamera);

async function startCamera() {
    error.textContent = "";

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        error.textContent =
            "je browser ondersteunt helaas geen camera :(";
        return;
    }

    try {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }

        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: "user",
                width: {
                    ideal: 1080
                },
                height: {
                    ideal: 1920
                }
            },
            audio: false
        });

        video.srcObject = stream;

        await video.play();

        status.textContent = "camera staat aan ♡";

        startButton.disabled = true;
        snapButton.disabled = false;

    } catch (err) {
        console.error(err);

        error.textContent =
            "je camera kon niet worden geopend :( geef de site camera-toegang en probeer opnieuw.";

        status.textContent = "camera werkt nog niet";
    }
}


// ==========================================
// FOTO MAKEN
// ==========================================

snapButton.addEventListener("click", takePhoto);

function takePhoto() {
    if (!stream || takingPhoto || photos.length >= TOTAL_PHOTOS) {
        return;
    }

    takingPhoto = true;

    let count = 3;

    countdown.style.display = "flex";
    countdown.textContent = count;

    const timer = setInterval(() => {
        count--;

        if (count > 0) {
            countdown.textContent = count;
        } else {
            clearInterval(timer);

            countdown.style.display = "none";

            capturePhoto();
        }
    }, 1000);
}


// ==========================================
// VOLLEDIGE CAMERA FOTO OPSLAAN
// ==========================================

function capturePhoto() {
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;

    if (!videoWidth || !videoHeight) {
        takingPhoto = false;
        return;
    }

    /*
        We gebruiken de VOLLEDIGE camera-afbeelding.

        Dus:
        9:16 camera -> 9:16 foto
        4:3 camera -> 4:3 foto

        Er wordt hier niets afgesneden.
    */

    canvas.width = videoWidth;
    canvas.height = videoHeight;

    const context = canvas.getContext("2d");

    context.save();

    // Selfie-camera spiegelen
    context.translate(canvas.width, 0);
    context.scale(-1, 1);

    context.drawImage(
        video,
        0,
        0,
        videoWidth,
        videoHeight
    );

    context.restore();

    pendingPhoto = canvas.toDataURL(
        "image/jpeg",
        0.95
    );

    openCropEditor();
}


// ==========================================
// CROP EDITOR OPENEN
// ==========================================

function openCropEditor() {
    cropEditor.style.display = "block";

    cropImage.onload = () => {
        setupCropEditor();
    };

    cropImage.src = pendingPhoto;
}


// ==========================================
// CROP EDITOR INSTELLEN
// ==========================================

function setupCropEditor() {
    pendingImage = cropImage;

    const imageWidth = cropImage.naturalWidth;
    const imageHeight = cropImage.naturalHeight;

    if (!imageWidth || !imageHeight) {
        return;
    }

    /*
        De crop editor krijgt exact dezelfde
        verhouding als de gemaakte foto.

        Bij een telefoon:
        1080 / 1920 = 9:16
    */

    const ratio = imageWidth / imageHeight;

    cropArea.style.aspectRatio = `${ratio}`;

    cropScale = 1;
    cropX = 0;
    cropY = 0;

    zoomSlider.value = 1;

    updateCropImage();
}


// ==========================================
// CROP IMAGE UPDATEN
// ==========================================

function updateCropImage() {
    if (!pendingImage) {
        return;
    }

    const areaWidth = cropArea.clientWidth;
    const areaHeight = cropArea.clientHeight;

    const imageWidth = pendingImage.naturalWidth;
    const imageHeight = pendingImage.naturalHeight;

    const baseScale = Math.min(
        areaWidth / imageWidth,
        areaHeight / imageHeight
    );

    const displayWidth =
        imageWidth * baseScale * cropScale;

    const displayHeight =
        imageHeight * baseScale * cropScale;

    pendingImage.style.width =
        `${displayWidth}px`;

    pendingImage.style.height =
        `${displayHeight}px`;

    pendingImage.style.left =
        `${(areaWidth - displayWidth) / 2 + cropX}px`;

    pendingImage.style.top =
        `${(areaHeight - displayHeight) / 2 + cropY}px`;
}


// ==========================================
// ZOOM
// ==========================================

zoomSlider.addEventListener("input", () => {
    cropScale = Number(zoomSlider.value);

    updateCropImage();
});


// ==========================================
// MOUSE DRAG
// ==========================================

cropArea.addEventListener("mousedown", startMouseDrag);

document.addEventListener("mousemove", moveMouseDrag);
document.addEventListener("mouseup", stopDrag);

function startMouseDrag(event) {
    dragging = true;

    dragStartX = event.clientX;
    dragStartY = event.clientY;

    startCropX = cropX;
    startCropY = cropY;
}

function moveMouseDrag(event) {
    if (!dragging) {
        return;
    }

    cropX =
        startCropX +
        (event.clientX - dragStartX);

    cropY =
        startCropY +
        (event.clientY - dragStartY);

    updateCropImage();
}

function stopDrag() {
    dragging = false;
}


// ==========================================
// TOUCH DRAG
// ==========================================

cropArea.addEventListener(
    "touchstart",
    startTouchDrag,
    { passive: false }
);

cropArea.addEventListener(
    "touchmove",
    moveTouchDrag,
    { passive: false }
);

cropArea.addEventListener(
    "touchend",
    stopDrag
);

function startTouchDrag(event) {
    event.preventDefault();

    if (!event.touches.length) {
        return;
    }

    const touch = event.touches[0];

    dragging = true;

    dragStartX = touch.clientX;
    dragStartY = touch.clientY;

    startCropX = cropX;
    startCropY = cropY;
}

function moveTouchDrag(event) {
    if (!dragging || !event.touches.length) {
        return;
    }

    event.preventDefault();

    const touch = event.touches[0];

    cropX =
        startCropX +
        (touch.clientX - dragStartX);

    cropY =
        startCropY +
        (touch.clientY - dragStartY);

    updateCropImage();
}


// ==========================================
// FOTO BEVESTIGEN
// ==========================================

cropConfirm.addEventListener("click", confirmCrop);

function confirmCrop() {
    if (!pendingImage) {
        return;
    }

    const imageWidth = pendingImage.naturalWidth;
    const imageHeight = pendingImage.naturalHeight;

    /*
        We maken ALTIJD een echte 9:16 foto.

        1080 x 1920
    */

    const outputWidth = 1080;
    const outputHeight = 1920;

    const outputCanvas =
        document.createElement("canvas");

    outputCanvas.width = outputWidth;
    outputCanvas.height = outputHeight;

    const context =
        outputCanvas.getContext("2d");

    const areaWidth = cropArea.clientWidth;
    const areaHeight = cropArea.clientHeight;

    const baseScale = Math.min(
        areaWidth / imageWidth,
        areaHeight / imageHeight
    );

    const displayedWidth =
        imageWidth *
        baseScale *
        cropScale;

    const displayedHeight =
        imageHeight *
        baseScale *
        cropScale;

    const imageLeft =
        (areaWidth - displayedWidth) / 2 +
        cropX;

    const imageTop =
        (areaHeight - displayedHeight) / 2 +
        cropY;

    /*
        Bereken welk gedeelte van de
        originele afbeelding zichtbaar is.
    */

    const sourceX =
        -imageLeft /
        (displayedWidth / imageWidth);

    const sourceY =
        -imageTop /
        (displayedHeight / imageHeight);

    const sourceWidth =
        areaWidth /
        (displayedWidth / imageWidth);

    const sourceHeight =
        areaHeight /
        (displayedHeight / imageHeight);

    /*
        Bij zoom 1 willen we de volledige foto.

        Daarom tekenen we bij de normale situatie
        gewoon de volledige originele afbeelding.
    */

    if (cropScale === 1 && cropX === 0 && cropY === 0) {

        context.drawImage(
            pendingImage,
            0,
            0,
            imageWidth,
            imageHeight,
            0,
            0,
            outputWidth,
            outputHeight
        );

    } else {

        /*
            Bij zoom / slepen gebruiken we
            de gekozen positie.
        */

        const safeX =
            Math.max(
                0,
                Math.min(
                    imageWidth - sourceWidth,
                    sourceX
                )
            );

        const safeY =
            Math.max(
                0,
                Math.min(
                    imageHeight - sourceHeight,
                    sourceY
                )
            );

        const safeWidth =
            Math.min(
                sourceWidth,
                imageWidth - safeX
            );

        const safeHeight =
            Math.min(
                sourceHeight,
                imageHeight - safeY
            );

        context.drawImage(
            pendingImage,
            safeX,
            safeY,
            safeWidth,
            safeHeight,
            0,
            0,
            outputWidth,
            outputHeight
        );
    }

    const finalPhoto =
        outputCanvas.toDataURL(
            "image/jpeg",
            0.95
        );

    photos.push(finalPhoto);

    pendingPhoto = null;
    pendingImage = null;

    cropEditor.style.display = "none";

    takingPhoto = false;

    updateStrip();

    if (photos.length < TOTAL_PHOTOS) {

        snapButton.textContent =
            `photo ${photos.length + 1}/4 📸`;

        status.textContent =
            `foto ${photos.length} klaar ♡`;

    } else {

        snapButton.disabled = true;

        snapButton.textContent =
            "alle foto's zijn klaar ♡";

        status.textContent =
            "jouw strip is klaar ✨";

        downloadButton.disabled = false;
    }
}


// ==========================================
// FOTO OPNIEUW MAKEN
// ==========================================

cropCancel.addEventListener("click", cancelCrop);

function cancelCrop() {
    pendingPhoto = null;
    pendingImage = null;

    cropEditor.style.display = "none";

    takingPhoto = false;

    status.textContent =
        "oke opnieuw 📸";
}


// ==========================================
// STRIP UPDATEN
// ==========================================

function updateStrip() {
    strip.innerHTML = "";

    photos.forEach((photo, index) => {

        const image =
            document.createElement("img");

        image.src = photo;

        image.className =
            "strip-photo";

        image.alt =
            `Photo ${index + 1}`;

        image.style.filter =
            filterSettings[currentFilter];

        strip.appendChild(image);
    });

    const label =
        document.createElement("div");

    label.className =
        "strip-label";

    label.textContent =
        "Charlie's portable photobooth";

    strip.appendChild(label);
}


// ==========================================
// FILTERS
// ==========================================

filters.addEventListener("click", event => {

    const button =
        event.target.closest(".filter-button");

    if (!button) {
        return;
    }

    currentFilter =
        button.dataset.filter;

    document
        .querySelectorAll(".filter-button")
        .forEach(btn => {
            btn.classList.remove("active");
        });

    button.classList.add("active");

    updateStrip();
});


// ==========================================
// DOWNLOAD
// ==========================================

downloadButton.addEventListener(
    "click",
    downloadStrip
);

function downloadStrip() {

    if (photos.length !== TOTAL_PHOTOS) {
        return;
    }

    /*
        Iedere foto:
        1080 x 1920 = 9:16
    */

    const photoWidth = 1080;
    const photoHeight = 1920;

    const gap = 30;
    const labelHeight = 160;

    const stripWidth = photoWidth;

    const stripHeight =
        photoHeight * TOTAL_PHOTOS +
        gap * (TOTAL_PHOTOS - 1) +
        labelHeight;

    const output =
        document.createElement("canvas");

    output.width = stripWidth;
    output.height = stripHeight;

    const context =
        output.getContext("2d");

    context.fillStyle = "#ffffff";

    context.fillRect(
        0,
        0,
        stripWidth,
        stripHeight
    );

    let loaded = 0;

    photos.forEach((photo, index) => {

        const image = new Image();

        image.onload = () => {

            const y =
                index *
                (photoHeight + gap);

            context.save();

            context.filter =
                filterSettings[currentFilter];

            context.drawImage(
                image,
                0,
                y,
                photoWidth,
                photoHeight
            );

            context.restore();

            loaded++;

            if (loaded === photos.length) {

                drawStripLabel(
                    context,
                    stripWidth,
                    stripHeight,
                    labelHeight
                );

                const link =
                    document.createElement("a");

                link.download =
                    "charlie-photobooth.jpg";

                link.href =
                    output.toDataURL(
                        "image/jpeg",
                        0.95
                    );

                link.click();
            }
        };

        image.src = photo;
    });
}


// ==========================================
// STRIP TEKST
// ==========================================

function drawStripLabel(
    context,
    width,
    height,
    labelHeight
) {

    context.fillStyle = "#ffffff";

    context.fillRect(
        0,
        height - labelHeight,
        width,
        labelHeight
    );

    context.fillStyle = "#222222";

    context.textAlign = "center";
    context.textBaseline = "middle";

    context.font =
        "bold 34px Arial";

    context.fillText(
        "Charlie's portable photobooth",
        width / 2,
        height - labelHeight / 2
    );
}


// ==========================================
// RESET
// ==========================================

resetButton.addEventListener(
    "click",
    resetEverything
);

function resetEverything() {

    photos = [];

    pendingPhoto = null;
    pendingImage = null;

    currentFilter = "original";

    cropEditor.style.display = "none";

    downloadButton.disabled = true;

    snapButton.disabled = true;

    startButton.disabled = false;

    snapButton.textContent =
        "photo 1/4 📸";

    status.textContent =
        "uhm... camera eerst?";

    error.textContent = "";

    strip.innerHTML = `
        <div class="empty-photo">PHOTO 1</div>
        <div class="empty-photo">PHOTO 2</div>
        <div class="empty-photo">PHOTO 3</div>
        <div class="empty-photo">PHOTO 4</div>

        <div class="strip-label">
            Charlie's portable photobooth
        </div>
    `;

    document
        .querySelectorAll(".filter-button")
        .forEach(button => {

            button.classList.remove("active");

            if (
                button.dataset.filter === "original"
            ) {
                button.classList.add("active");
            }
        });

    if (stream) {

        stream
            .getTracks()
            .forEach(track => track.stop());

        stream = null;
    }

    video.srcObject = null;

    takingPhoto = false;
}
