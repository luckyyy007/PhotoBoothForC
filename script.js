/* =====================================================
   CHARLIE'S PORTABLE PHOTOBOOTH
===================================================== */


/* =====================================================
   ELEMENTS
===================================================== */

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
const filterButtons = document.querySelectorAll(".filter-button");


/* =====================================================
   CROP EDITOR
===================================================== */

const cropEditor = document.getElementById("cropEditor");
const cropArea = document.getElementById("cropArea");
const cropImage = document.getElementById("cropImage");

const cropConfirm = document.getElementById("cropConfirm");
const cropCancel = document.getElementById("cropCancel");

const zoomSlider = document.getElementById("zoomSlider");


/* =====================================================
   STATE
===================================================== */

let cameraStream = null;

let photos = [];

let takingPhoto = false;

let currentFilter = "original";

let pendingPhoto = null;


/* =====================================================
   CROP STATE
===================================================== */

let cropZoom = 1;

let cropX = 0;
let cropY = 0;

let cropImageWidth = 0;
let cropImageHeight = 0;

let dragging = false;

let dragStartX = 0;
let dragStartY = 0;

let dragStartCropX = 0;
let dragStartCropY = 0;


/* =====================================================
   FILTERS
===================================================== */

const filterSettings = {

    original: {
        css: "none"
    },

    vintage: {
        css:
            "sepia(0.45) " +
            "contrast(0.90) " +
            "saturate(0.75)"
    },

    bw: {
        css:
            "grayscale(1) " +
            "contrast(1.08)"
    },

    warm: {
        css:
            "sepia(0.25) " +
            "saturate(1.25) " +
            "contrast(0.95)"
    },

    cool: {
        css:
            "saturate(0.85) " +
            "hue-rotate(12deg) " +
            "contrast(1.05)"
    },

    photobooth: {
        css:
            "sepia(0.16) " +
            "saturate(0.82) " +
            "contrast(1.12) " +
            "brightness(1.04)"
    }

};


/* =====================================================
   ERROR
===================================================== */

function showError(message) {

    error.textContent = message;
    error.style.display = "block";

}


function clearError() {

    error.textContent = "";
    error.style.display = "none";

}


/* =====================================================
   UPDATE STRIP
===================================================== */

function updateStrip() {

    strip.innerHTML = "";

    for (let i = 0; i < 4; i++) {

        if (photos[i]) {

            const image =
                document.createElement("img");

            image.src = photos[i];

            image.style.filter =
                filterSettings[currentFilter].css;

            strip.appendChild(image);

        } else {

            const empty =
                document.createElement("div");

            empty.className =
                "empty-photo";

            empty.textContent =
                `PHOTO ${i + 1}`;

            strip.appendChild(empty);

        }

    }


    const label =
        document.createElement("div");

    label.className =
        "strip-label";

    label.textContent =
        "Charlie's portable photobooth";

    strip.appendChild(label);


    downloadButton.disabled =
        photos.length !== 4;

}


/* =====================================================
   START CAMERA
===================================================== */

async function startCamera() {

    clearError();

    try {

        if (
            !navigator.mediaDevices ||
            !navigator.mediaDevices.getUserMedia
        ) {

            throw new Error(
                "Camera access is not supported."
            );

        }


        cameraStream =
            await navigator.mediaDevices.getUserMedia({

                video: {

                    facingMode: "user",

                    width: {
                        ideal: 1920
                    },

                    height: {
                        ideal: 1080
                    }

                },

                audio: false

            });


        video.srcObject =
            cameraStream;


        await video.play();


        status.textContent =
            "camera ready ♡";


        startButton.disabled =
            true;

        snapButton.disabled =
            false;


    } catch (err) {

        console.error(err);

        showError(
            "Could not access the camera. " +
            "Please allow camera permission " +
            "and use HTTPS or localhost."
        );

        status.textContent =
            "camera unavailable";

    }

}


/* =====================================================
   WAIT
===================================================== */

function wait(milliseconds) {

    return new Promise(resolve => {

        setTimeout(resolve, milliseconds);

    });

}


/* =====================================================
   TAKE PHOTO
===================================================== */

async function takePhoto() {

    if (
        takingPhoto ||
        photos.length >= 4
    ) {

        return;

    }


    takingPhoto = true;

    snapButton.disabled = true;


    /* COUNTDOWN */

    for (
        let number = 3;
        number > 0;
        number--
    ) {

        countdown.style.display =
            "grid";

        countdown.textContent =
            number;

        await wait(700);

    }


    countdown.textContent =
        "📸";

    await wait(180);


    /* CAMERA DIMENSIONS */

    const videoWidth =
        video.videoWidth;

    const videoHeight =
        video.videoHeight;


    if (
        !videoWidth ||
        !videoHeight
    ) {

        takingPhoto = false;

        snapButton.disabled =
            false;

        countdown.style.display =
            "none";

        showError(
            "Camera is not ready yet. Try again."
        );

        return;

    }


    /*
       IMPORTANT:

       We DO NOT crop the camera image here.

       We save the complete camera frame.

       This is especially important on phones,
       because phone cameras don't always provide
       exactly the same aspect ratio as desktop.
    */

    canvas.width =
        videoWidth;

    canvas.height =
        videoHeight;


    const context =
        canvas.getContext("2d");


    /*
       Mirror the front camera,
       just like the normal selfie preview.
    */

    context.save();

    context.translate(
        canvas.width,
        0
    );

    context.scale(
        -1,
        1
    );


    context.drawImage(

        video,

        0,
        0,
        videoWidth,
        videoHeight,

        0,
        0,
        videoWidth,
        videoHeight

    );


    context.restore();


    /*
       Store the COMPLETE photo.
    */

    pendingPhoto =
        canvas.toDataURL(
            "image/jpeg",
            0.95
        );


    /*
       Open crop editor.
    */

    openCropEditor();


    countdown.style.display =
        "none";


    status.textContent =
        "kies welk stukje je wilt ♡";

}


/* =====================================================
   OPEN CROP EDITOR
===================================================== */

function openCropEditor() {

    if (!pendingPhoto) {
        return;
    }


    cropEditor.style.display =
        "block";


    cropImage.onload =
        () => {

            setupCropImage();

        };


    cropImage.src =
        pendingPhoto;


    /*
       Start at 1x.
    */

    cropZoom = 1;


    if (zoomSlider) {

        zoomSlider.value =
            "1";

    }


    cropX = 0;
    cropY = 0;


    snapButton.style.display =
        "none";

    resetButton.style.display =
        "none";


    setTimeout(() => {

        cropEditor.scrollIntoView({

            behavior: "smooth",

            block: "center"

        });

    }, 50);

}


/* =====================================================
   SETUP CROP IMAGE
===================================================== */

function setupCropImage() {

    if (
        !cropImage.naturalWidth ||
        !cropImage.naturalHeight
    ) {

        return;

    }


    const areaWidth =
        cropArea.clientWidth;

    const areaHeight =
        cropArea.clientHeight;


    /*
       FIT THE ENTIRE IMAGE.

       We use MIN instead of MAX.

       This means:
       - no unnecessary zoom
       - complete photo is visible
       - especially important on phones
    */

    const fitScale =
        Math.min(

            areaWidth /
                cropImage.naturalWidth,

            areaHeight /
                cropImage.naturalHeight

        );


    cropImageWidth =
        cropImage.naturalWidth *
        fitScale *
        cropZoom;


    cropImageHeight =
        cropImage.naturalHeight *
        fitScale *
        cropZoom;


    /*
       Center image.
    */

    cropX =
        (areaWidth -
            cropImageWidth) / 2;

    cropY =
        (areaHeight -
            cropImageHeight) / 2;


    /*
       At 1x we allow the entire photo
       to be visible.

       If the phone image is not 4:3,
       the crop area may show a little
       background on the sides/top.
    */

    applyCropPosition();

}


/* =====================================================
   UPDATE ZOOM
===================================================== */

function updateCropZoom() {

    if (
        !cropImage.naturalWidth ||
        !cropImage.naturalHeight
    ) {

        return;

    }


    const areaWidth =
        cropArea.clientWidth;

    const areaHeight =
        cropArea.clientHeight;


    /*
       Find the current center of the image.
    */

    const oldCenterX =
        cropX +
        cropImageWidth / 2;

    const oldCenterY =
        cropY +
        cropImageHeight / 2;


    /*
       Normal fitting scale.
    */

    const fitScale =
        Math.min(

            areaWidth /
                cropImage.naturalWidth,

            areaHeight /
                cropImage.naturalHeight

        );


    cropImageWidth =
        cropImage.naturalWidth *
        fitScale *
        cropZoom;


    cropImageHeight =
        cropImage.naturalHeight *
        fitScale *
        cropZoom;


    /*
       Keep image centered around
       the same point while zooming.
    */

    cropX =
        oldCenterX -
        cropImageWidth / 2;

    cropY =
        oldCenterY -
        cropImageHeight / 2;


    /*
       At 1x put the complete image
       exactly in the center.
    */

    if (cropZoom === 1) {

        cropX =
            (areaWidth -
                cropImageWidth) / 2;

        cropY =
            (areaHeight -
                cropImageHeight) / 2;

    }


    /*
       Only restrict the image if it is
       larger than the crop window.

       This prevents weird empty areas
       when zoomed in.
    */

    if (
        cropImageWidth >
        areaWidth
    ) {

        const minX =
            areaWidth -
            cropImageWidth;

        cropX =
            Math.max(
                minX,
                Math.min(0, cropX)
            );

    }


    if (
        cropImageHeight >
        areaHeight
    ) {

        const minY =
            areaHeight -
            cropImageHeight;

        cropY =
            Math.max(
                minY,
                Math.min(0, cropY)
            );

    }


    applyCropPosition();

}


/* =====================================================
   APPLY POSITION
===================================================== */

function applyCropPosition() {

    cropImage.style.width =
        `${cropImageWidth}px`;

    cropImage.style.height =
        `${cropImageHeight}px`;

    cropImage.style.left =
        `${cropX}px`;

    cropImage.style.top =
        `${cropY}px`;

}


/* =====================================================
   ZOOM SLIDER
===================================================== */

if (zoomSlider) {

    zoomSlider.addEventListener(
        "input",
        () => {

            cropZoom =
                parseFloat(
                    zoomSlider.value
                );

            updateCropZoom();

        }
    );

}


/* =====================================================
   MOUSE DRAG
===================================================== */

cropArea.addEventListener(
    "mousedown",
    event => {

        dragging = true;

        dragStartX =
            event.clientX;

        dragStartY =
            event.clientY;

        dragStartCropX =
            cropX;

        dragStartCropY =
            cropY;

        cropArea.style.cursor =
            "grabbing";

    }
);


window.addEventListener(
    "mousemove",
    event => {

        if (!dragging) {
            return;
        }


        const movementX =
            event.clientX -
            dragStartX;

        const movementY =
            event.clientY -
            dragStartY;


        cropX =
            dragStartCropX +
            movementX;

        cropY =
            dragStartCropY +
            movementY;


        applyCropPosition();

    }
);


window.addEventListener(
    "mouseup",
    () => {

        dragging = false;

        cropArea.style.cursor =
            "grab";

    }
);


/* =====================================================
   TOUCH DRAG
===================================================== */

cropArea.addEventListener(
    "touchstart",
    event => {

        if (
            !event.touches ||
            !event.touches[0]
        ) {

            return;

        }


        dragging = true;

        dragStartX =
            event.touches[0].clientX;

        dragStartY =
            event.touches[0].clientY;

        dragStartCropX =
            cropX;

        dragStartCropY =
            cropY;

    },
    {
        passive: true
    }
);


cropArea.addEventListener(
    "touchmove",
    event => {

        if (
            !dragging ||
            !event.touches ||
            !event.touches[0]
        ) {

            return;

        }


        const movementX =
            event.touches[0].clientX -
            dragStartX;

        const movementY =
            event.touches[0].clientY -
            dragStartY;


        cropX =
            dragStartCropX +
            movementX;

        cropY =
            dragStartCropY +
            movementY;


        applyCropPosition();

    },
    {
        passive: true
    }
);


cropArea.addEventListener(
    "touchend",
    () => {

        dragging = false;

    }
);


/* =====================================================
   CONFIRM CROP
===================================================== */

function confirmCrop() {

    if (!pendingPhoto) {
        return;
    }


    const areaWidth =
        cropArea.clientWidth;

    const areaHeight =
        cropArea.clientHeight;


    /*
       Convert displayed coordinates
       back to original photo coordinates.
    */

    const scaleX =
        cropImage.naturalWidth /
        cropImageWidth;

    const scaleY =
        cropImage.naturalHeight /
        cropImageHeight;


    let sourceX =
        -cropX * scaleX;

    let sourceY =
        -cropY * scaleY;


    let sourceWidth =
        areaWidth * scaleX;

    let sourceHeight =
        areaHeight * scaleY;


    /*
       Make sure we don't go outside
       the original photo.
    */

    sourceX =
        Math.max(
            0,
            Math.min(
                cropImage.naturalWidth -
                sourceWidth,
                sourceX
            )
        );


    sourceY =
        Math.max(
            0,
            Math.min(
                cropImage.naturalHeight -
                sourceHeight,
                sourceY
            )
        );


    /*
       Final strip photo is 4:3.
    */

    const finalCanvas =
        document.createElement(
            "canvas"
        );


    finalCanvas.width =
        900;

    finalCanvas.height =
        675;


    const context =
        finalCanvas.getContext(
            "2d"
        );


    context.drawImage(

        cropImage,

        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,

        0,
        0,
        900,
        675

    );


    const finalPhoto =
        finalCanvas.toDataURL(
            "image/jpeg",
            0.95
        );


    photos.push(
        finalPhoto
    );


    pendingPhoto = null;


    cropEditor.style.display =
        "none";


    snapButton.style.display =
        "";

    resetButton.style.display =
        "";


    updateStrip();


    /*
       IMPORTANT:
       allow the next photo!
    */

    takingPhoto = false;


    if (photos.length < 4) {

        snapButton.disabled =
            false;

        snapButton.textContent =
            `photo ${photos.length + 1}/4 📸`;

        status.textContent =
            `foto ${photos.length}/4 klaar ♡`;

    } else {

        snapButton.disabled =
            true;

        snapButton.textContent =
            "alle foto's klaar ♡";

        status.textContent =
            "je strip is klaar ✨";

    }

}


/* =====================================================
   CANCEL CROP
===================================================== */

function cancelCrop() {

    pendingPhoto = null;

    takingPhoto = false;


    cropEditor.style.display =
        "none";


    snapButton.style.display =
        "";

    resetButton.style.display =
        "";


    snapButton.disabled =
        false;


    snapButton.textContent =
        `photo ${photos.length + 1}/4 📸`;


    status.textContent =
        "opnieuw proberen 📸";

}


/* =====================================================
   CROP BUTTONS
===================================================== */

cropConfirm.addEventListener(
    "click",
    confirmCrop
);


cropCancel.addEventListener(
    "click",
    cancelCrop
);


/* =====================================================
   FILTERS
===================================================== */

filterButtons.forEach(
    button => {

        button.addEventListener(
            "click",
            () => {

                currentFilter =
                    button.dataset.filter;


                filterButtons.forEach(
                    otherButton => {

                        otherButton.classList.remove(
                            "active"
                        );

                    }
                );


                button.classList.add(
                    "active"
                );


                updateStrip();

            }
        );

    }
);


/* =====================================================
   DOWNLOAD
===================================================== */

downloadButton.addEventListener(
    "click",
    () => {

        if (photos.length !== 4) {
            return;
        }


        const photoWidth = 900;
        const photoHeight = 675;

        const spacing = 20;

        const topPadding = 40;

        const bottomPadding = 100;


        const stripWidth =
            photoWidth +
            spacing * 2;


        const stripHeight =
            topPadding +
            photoHeight * 4 +
            spacing * 3 +
            bottomPadding;


        const downloadCanvas =
            document.createElement(
                "canvas"
            );


        downloadCanvas.width =
            stripWidth;

        downloadCanvas.height =
            stripHeight;


        const context =
            downloadCanvas.getContext(
                "2d"
            );


        /*
           Background
        */

        context.fillStyle =
            "#fffaf7";

        context.fillRect(
            0,
            0,
            stripWidth,
            stripHeight
        );


        let loadedImages = 0;


        photos.forEach(
            (photo, index) => {

                const image =
                    new Image();


                image.onload =
                    () => {

                        const y =
                            topPadding +
                            index *
                            (photoHeight +
                                spacing);


                        context.save();


                        context.filter =
                            filterSettings[
                                currentFilter
                            ].css;


                        context.drawImage(

                            image,

                            spacing,
                            y,

                            photoWidth,
                            photoHeight

                        );


                        context.restore();


                        loadedImages++;


                        if (
                            loadedImages === 4
                        ) {

                            drawDownloadLabel(
                                context,
                                stripWidth,
                                stripHeight
                            );


                            const link =
                                document.createElement(
                                    "a"
                                );


                            link.download =
                                "charlies-photobooth.jpg";


                            link.href =
                                downloadCanvas.toDataURL(
                                    "image/jpeg",
                                    0.95
                                );


                            link.click();

                        }

                    };


                image.src =
                    photo;

            }

        );

    }
);


/* =====================================================
   DOWNLOAD LABEL
===================================================== */

function drawDownloadLabel(
    context,
    width,
    height
) {

    context.fillStyle =
        "#3d3030";

    context.textAlign =
        "center";

    context.font =
        "bold 28px Arial";


    context.fillText(

        "Charlie's portable photobooth ♡",

        width / 2,

        height - 45

    );

}


/* =====================================================
   RESET
===================================================== */

function resetPhotobooth() {

    /*
       Stop camera.
    */

    if (cameraStream) {

        cameraStream
            .getTracks()
            .forEach(track => {

                track.stop();

            });

        cameraStream = null;

    }


    /*
       Reset everything.
    */

    photos = [];

    pendingPhoto = null;

    takingPhoto = false;

    currentFilter =
        "original";


    /*
       Reset filter buttons.
    */

    filterButtons.forEach(
        button => {

            button.classList.remove(
                "active"
            );

        }
    );


    const originalButton =
        document.querySelector(
            '.filter-button[data-filter="original"]'
        );


    if (originalButton) {

        originalButton.classList.add(
            "active"
        );

    }


    /*
       Reset crop editor.
    */

    cropEditor.style.display =
        "none";


    cropZoom = 1;

    cropX = 0;

    cropY = 0;


    if (zoomSlider) {

        zoomSlider.value =
            "1";

    }


    /*
       Reset camera.
    */

    video.srcObject =
        null;


    startButton.disabled =
        false;

    snapButton.disabled =
        true;


    snapButton.style.display =
        "";

    resetButton.style.display =
        "";


    snapButton.textContent =
        "photo 1/4 📸";


    countdown.style.display =
        "none";


    status.textContent =
        "uhm... camera eerst?";


    clearError();


    updateStrip();

}


/* =====================================================
   BUTTON EVENTS
===================================================== */

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
    resetPhotobooth
);


/* =====================================================
   INITIALIZE
===================================================== */

updateStrip();
