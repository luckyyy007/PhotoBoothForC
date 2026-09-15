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
const filtersContainer = document.getElementById("filters");
const filterButtons = document.querySelectorAll(".filter-button");

const stripColorButtons = document.querySelectorAll(".strip-color-button");

const downloadToast = document.getElementById("downloadToast");

const switchCameraButton = document.getElementById("switchCamera");

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

let currentFilters = ["original"];

let currentStripColor = "b&w";

let pendingPhoto = null;

let currentFacingMode = "user";


/* CROP STATE */

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

const stripColors = {
    blue: "#8FD9FB",
    pink: "#F7B2D9",
    bw: "#EEEEEE"
}


/* =====================================================
   ERROR HANDLING
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
   UPDATE PHOTO STRIP
===================================================== */

function updateStrip() {

    strip.innerHTML = "";

    strip.style.background =
        stripColors[currentStripColor];

    for (let i = 0; i < 4; i++) {

        if (photos[i]) {

            const image = document.createElement("img");

            image.src = photos[i];

            const combinedFilter = currentFilters.map(
               filter => filterSettings[filter].css).join(" ");

            image.style.setProperty(
               "filter",
               combinedFilter,
               "important");

            strip.appendChild(image);

        } else {

            const empty = document.createElement("div");

            empty.className = "empty-photo";

            empty.textContent = `PHOTO ${i + 1}`;

            strip.appendChild(empty);

        }

    }


    const label = document.createElement("div");

    label.className = "strip-label";

    label.textContent =
        "Charlie's portable photobooth";

    strip.appendChild(label);


    if (photos.length === 4) {

        downloadButton.disabled = false;

    } else {

        downloadButton.disabled = true;

    }

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

                    facingMode: currentFacingMode,

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


        status.textContent =
            "camera ready ♡";


        startButton.disabled = true;

        snapButton.disabled = false;


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
   SWITCH CAMERA
===================================================== */

switchCameraButton.addEventListener("click", async () => {

   currentFacingMode =
      currentFacingMode == "user"
         ? "environment"
         : "user";

   await startCamera();
});



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
    if (takingPhoto || photos.length >= 4) {
        return;
    }

    takingPhoto = true;
    snapButton.disabled = true;

    // COUNTDOWN
    for (let number = 3; number > 0; number--) {
        countdown.style.display = "grid";
        countdown.textContent = number;
        await wait(700);
    }

    countdown.textContent = "📸";
    await wait(180);

    // CAMERA SIZE
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;

    if (!videoWidth || !videoHeight) {
        takingPhoto = false;
        snapButton.disabled = false;
        countdown.style.display = "none";

        showError("Camera is not ready yet. Try again.");
        return;
    }

    /*
     * IMPORTANT:
     *
     * The camera preview uses:
     *
     * object-fit: cover
     *
     * and the camera container is 4:3.
     *
     * So here we calculate EXACTLY which part
     * of the real camera image is visible in
     * the preview.
     */

    const previewWidth = video.clientWidth;
    const previewHeight = video.clientHeight;

    const videoRatio = videoWidth / videoHeight;
    const previewRatio = previewWidth / previewHeight;

    let sourceWidth;
    let sourceHeight;
    let sourceX;
    let sourceY;

    if (videoRatio > previewRatio) {
        /*
         * Video is wider than the preview.
         * object-fit: cover removes the sides.
         */

        sourceHeight = videoHeight;
        sourceWidth = videoHeight * previewRatio;

        sourceX = (videoWidth - sourceWidth) / 2;
        sourceY = 0;

    } else {
        /*
         * Video is taller than the preview.
         * object-fit: cover removes top/bottom.
         */

        sourceWidth = videoWidth;
        sourceHeight = videoWidth / previewRatio;

        sourceX = 0;
        sourceY = (videoHeight - sourceHeight) / 2;
    }

    /*
     * Make the captured image the SAME SIZE RATIO
     * as the actual camera preview.
     *
     * We use 900px wide so the final image
     * still has plenty of quality.
     */

    const outputWidth = 900;
    const outputHeight = Math.round(
        outputWidth / previewRatio
    );

    canvas.width = outputWidth;
    canvas.height = outputHeight;

    const context = canvas.getContext("2d");

    /*
     * Mirror the image exactly like the
     * camera preview.
     */

    context.save();

    context.translate(
        canvas.width,
        0
    );

    context.scale(-1, 1);

    context.drawImage(
        video,

        // SOURCE
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,

        // DESTINATION
        0,
        0,
        canvas.width,
        canvas.height
    );

    context.restore();

    /*
     * Save temporary photo.
     */

    pendingPhoto = canvas.toDataURL(
        "image/jpeg",
        0.92
    );

    /*
     * Open crop editor.
     */

    openCropEditor();

    countdown.style.display = "none";

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


    cropImage.src =
        pendingPhoto;


    /*
       Always start at 1x.

       1x = the complete 4:3 photo
       2x = zoomed in
    */

    cropZoom = 1;


    if (zoomSlider) {

        zoomSlider.value = "1";

    }


    /*
       Reset position.
    */

    cropX = 0;
    cropY = 0;


    /*
       Hide camera controls while editing.
    */

    snapButton.style.display =
        "none";

    resetButton.style.display =
        "none";


    /*
       Wait until image is loaded.
    */

    if (cropImage.complete) {

        setupCropImage();

    } else {

        cropImage.onload =
            setupCropImage;

    }


    /*
       Scroll editor into view.
    */

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

    const areaWidth = cropArea.clientWidth;
    const areaHeight = cropArea.clientHeight;

    /*
     * The crop editor should initially show
     * the COMPLETE captured photo.
     *
     * Therefore we use MIN.
     */

    const fitScale = Math.min(
        areaWidth / cropImage.naturalWidth,
        areaHeight / cropImage.naturalHeight
    );

    cropImageWidth =
        cropImage.naturalWidth * fitScale * cropZoom;

    cropImageHeight =
        cropImage.naturalHeight * fitScale * cropZoom;

    /*
     * ALWAYS center the image.
     *
     * This prevents the subject from suddenly
     * moving up/down when opening the editor.
     */

    cropX =
        (areaWidth - cropImageWidth) / 2;

    cropY =
        (areaHeight - cropImageHeight) / 2;

    limitCropPosition();
    applyCropPosition();
}


/* =====================================================
   UPDATE CROP IMAGE SIZE
===================================================== */

function updateCropZoom() {

    if (
        !cropImage.naturalWidth ||
        !cropImage.naturalHeight
    ) {

        return;

    }


    /*
       Remember the current center of
       the image before changing zoom.
    */

    const areaWidth =
        cropArea.clientWidth;

    const areaHeight =
        cropArea.clientHeight;


    const centerX =
        areaWidth / 2;

    const centerY =
        areaHeight / 2;


    const imageCenterX =
        cropX +
        cropImageWidth / 2;

    const imageCenterY =
        cropY +
        cropImageHeight / 2;


    /*
       Calculate the base size again.
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
       Keep the same relative center
       when zooming.
    */

    const oldCenterX =
        imageCenterX;

    const oldCenterY =
        imageCenterY;


    const relativeX =
        oldCenterX / areaWidth;

    const relativeY =
        oldCenterY / areaHeight;


    cropX =
        relativeX * areaWidth -
        cropImageWidth / 2;

    cropY =
        relativeY * areaHeight -
        cropImageHeight / 2;


    /*
       If we're at 1x, always center the
       full photo perfectly.
    */

    if (cropZoom === 1) {

        cropX =
            (areaWidth -
                cropImageWidth) / 2;

        cropY =
            (areaHeight -
                cropImageHeight) / 2;

    }


    limitCropPosition();

    applyCropPosition();

}


/* =====================================================
   LIMIT CROP POSITION
===================================================== */

function limitCropPosition() {

    const areaWidth =
        cropArea.clientWidth;

    const areaHeight =
        cropArea.clientHeight;


    /*
       Don't allow empty space around
       the photo when zoomed in.
    */

    if (
        cropImageWidth >= areaWidth
    ) {

        const minX =
            areaWidth -
            cropImageWidth;

        const maxX = 0;

        cropX =
            Math.max(
                minX,
                Math.min(maxX, cropX)
            );

    } else {

        /*
           At 1x this should not normally
           happen because both are 4:3.
        */

        cropX =
            (areaWidth -
                cropImageWidth) / 2;

    }


    if (
        cropImageHeight >= areaHeight
    ) {

        const minY =
            areaHeight -
            cropImageHeight;

        const maxY = 0;

        cropY =
            Math.max(
                minY,
                Math.min(maxY, cropY)
            );

    } else {

        cropY =
            (areaHeight -
                cropImageHeight) / 2;

    }

}


/* =====================================================
   APPLY IMAGE POSITION
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
   CROP DRAGGING
===================================================== */


/* ---------- MOUSE ---------- */

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


        limitCropPosition();

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


/* ---------- TOUCH ---------- */

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


        limitCropPosition();

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
       The crop editor displays the image
       at this scale.

       Convert the visible crop area back
       to coordinates in the original image.
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
       Keep the source rectangle inside
       the original image.
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
       Create final photo.

       900 × 675 = 4:3
    */

    const finalCanvas =
        document.createElement("canvas");

    const finalWidth = 900;

    const finalHeight = Math.round(
       finalWidth *
       (areaHeight / areaWidth));

    finalCanvas.width = finalWidth;
    finalCanvas.height = finalHeight;
   
    const context =
        finalCanvas.getContext("2d");


    context.drawImage(
        cropImage,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        finalWidth,
        finalHeight

    );


    const finalPhoto =
        finalCanvas.toDataURL(
            "image/jpeg",
            0.92
        );


    /*
       Save photo.
    */

    photos.push(finalPhoto);


    /*
       Clear temporary photo.
    */

    pendingPhoto = null;


    /*
       Close editor.
    */

    cropEditor.style.display =
        "none";


    /*
       Show camera controls again.
    */

    snapButton.style.display =
        "";

    resetButton.style.display =
        "";


    /*
       Update interface.
    */

    updateStrip();


    if (photos.length < 4) {

        snapButton.disabled = false;

        snapButton.textContent =
            `photo ${photos.length + 1}/4 📸`;

        status.textContent =
            `foto ${photos.length}/4 klaar ♡`;

    } else {

        snapButton.disabled = true;

        snapButton.textContent =
            "alle foto's klaar ♡";

        status.textContent =
            "je strip is klaar ✨";

    }

    takingPhoto = false;

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


    snapButton.disabled = false;


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
   FILTER BUTTONS
===================================================== */

filterButtons.forEach(button => {

    button.addEventListener("click", () => {

        const filter = button.dataset.filter;

        if (filter === "original") {

            currentFilters = ["original"];

            filterButtons.forEach(otherButton => {
                otherButton.classList.remove("active");
            });

            button.classList.add("active");

        } else {

            currentFilters =
                currentFilters.filter(
                    f => f !== "original"
                );

            if (currentFilters.includes(filter)) {

                currentFilters =
                    currentFilters.filter(
                        f => f !== filter
                    );

                button.classList.remove("active");

            } else {

                currentFilters.push(filter);

                button.classList.add("active");
            }

            if (currentFilters.length === 0) {

                currentFilters = ["original"];

                document
                    .querySelector('[data-filter="original"]')
                    .classList.add("active");
            }
        }

        updateStrip();

    });

});

stripColorButtons.forEach(button => {

    button.addEventListener("click", () => {

        currentStripColor = button.dataset.color;

        stripColorButtons.forEach(otherButton => {
            otherButton.classList.remove("active");
        });
        button.classList.add("active");

        updateStrip();
    });

});

/* =====================================================
   DOWNLOAD PHOTO STRIP
===================================================== */

downloadButton.addEventListener(
    "click",
    () => {

        if (photos.length !== 4) {
            return;
        }


        /*
           Create a new canvas for the
           complete vertical strip.
        */

        const photoWidth = 900;

        const photoHeight = 1600;

        const spacing = 20;

        const topPadding = 40;

        const bottomPadding = 100;


        const stripWidth =
            photoWidth +
            spacing * 2;


        const stripHeight =
            topPadding +
            (photoHeight * 4) +
            (spacing * 3) +
            bottomPadding;


        const downloadCanvas =
            document.createElement("canvas");


        downloadCanvas.width =
            stripWidth;

        downloadCanvas.height =
            stripHeight;


        const context =
            downloadCanvas.getContext("2d");


        /*
           Background
        */

        context.fillStyle = stripColors[currentStripColor];

        context.fillRect(
            0,
            0,
            stripWidth,
            stripHeight
        );


        /*
           Draw each photo.
        */

        let loadedImages = 0;


        photos.forEach(
            (photo, index) => {

                const image =
                    new Image();


                image.onload = () => {

                    const y =
                        topPadding +
                        index *
                        (photoHeight + spacing);


                    context.save();


                    /*
                       Apply selected filter
                       to the final downloaded strip.
                    */

                    const filter = currentFilters.map(
                       filter => filterSettings[filter].css).join(" ");


                    context.filter =
                        filter;


                    context.drawImage(

                        image,

                        spacing,
                        y,

                        photoWidth,
                        photoHeight

                    );


                    context.restore();


                    loadedImages++;


                    /*
                       Once all 4 images are
                       loaded, download them.
                    */

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

                        setTimeout(() => {
                            showDownloadToast();
                        }, 100);

                    }

                };


                image.src = photo;

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

function showDownloadToast() {

    downloadToast.classList.add("show");

    setTimeout(() => {

        downloadToast.classList.remove("show");

    }, 2500);
}



/* =====================================================
   RESET
===================================================== */

function resetPhotobooth() {

    currentStripColor = "bw";

    stripColorButtons.forEach(button => {

        button.classList.remove("active");
    });

    document.querySelector('.strip-color-button[data-color="bw"]').classList.add("active");
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
       Reset photos.
    */

    photos = [];

    pendingPhoto = null;

    takingPhoto = false;


    /*
       Reset filter.
    */

    currentFilters =
        "original";


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
       Close crop editor.
    */

    cropEditor.style.display =
        "none";


    /*
       Reset crop.
    */

    cropZoom = 1;

    cropX = 0;

    cropY = 0;


    if (zoomSlider) {

        zoomSlider.value = "1";

    }


    /*
       Reset camera UI.
    */

    video.srcObject = null;


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


    status.textContent =
        "uhm... camera eerst?";


    countdown.style.display =
        "none";


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
   INITIAL STATE
===================================================== */

updateStrip();

/* =====================================================
   DARK MODE
===================================================== */

const darkModeToggle =
    document.getElementById("darkModeToggle");


if (darkModeToggle) {

    darkModeToggle.addEventListener(
        "click",
        () => {

            document.body.classList.toggle(
                "dark-mode"
            );


            if (
                document.body.classList.contains(
                    "dark-mode"
                )
            ) {

                darkModeToggle.textContent =
                    "☀ light mode";

            } else {

                darkModeToggle.textContent =
                    "☾ dark mode";

            }

        }
    );

}
