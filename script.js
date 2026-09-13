/* =====================================================
   SNAPSTRIP
   Digital Photobooth
===================================================== */


/* =====================================================
   ELEMENTS
===================================================== */

const video =
    document.getElementById("video");

const canvas =
    document.getElementById("photoCanvas");

const countdown =
    document.getElementById("countdown");

const status =
    document.getElementById("status");

const error =
    document.getElementById("error");

const startButton =
    document.getElementById("start");

const snapButton =
    document.getElementById("snap");

const resetButton =
    document.getElementById("reset");

const downloadButton =
    document.getElementById("download");

const strip =
    document.getElementById("strip");

const filtersContainer =
    document.getElementById("filters");

const filterButtons =
    document.querySelectorAll(".filter-button");


/* =====================================================
   STATE
===================================================== */

let cameraStream = null;

let photos = [];

let takingPhoto = false;

let currentFilter = "original";


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
   ERROR HANDLING
===================================================== */

function showError(message) {

    error.textContent =
        message;

    error.style.display =
        "block";
}


function clearError() {

    error.style.display =
        "none";
}


/* =====================================================
   UPDATE STRIP
===================================================== */

function updateStrip() {

    strip.innerHTML = "";

    for (
        let i = 0;
        i < 4;
        i++
    ) {

        if (photos[i]) {

            const image =
                document.createElement("img");

            image.src =
                photos[i];

            image.style.filter =
                filterSettings[
                    currentFilter
                ].css;

            strip.appendChild(
                image
            );

        }

        else {

            const empty =
                document.createElement("div");

            empty.className =
                "empty-photo";

            empty.textContent =
                `PHOTO ${i + 1}`;

            strip.appendChild(
                empty
            );
        }
    }

    const label =
        document.createElement("div");

    label.className =
        "strip-label";

    label.textContent =
        "charlie • 2026";

    strip.appendChild(
        label
    );
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
            await navigator.mediaDevices
                .getUserMedia({

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

        video.srcObject =
            cameraStream;

        status.textContent =
            "okayyy, we're ready ✨";

        startButton.disabled =
            true;

        snapButton.disabled =
            false;

    }

    catch (err) {

        console.error(err);

        showError(
            "Could not access the camera. " +
            "Please allow camera permission " +
            "and use HTTPS or localhost."
        );

        status.textContent =
            "Camera unavailable";
    }
}


/* =====================================================
   WAIT
===================================================== */

function wait(milliseconds) {

    return new Promise(
        resolve =>
            setTimeout(
                resolve,
                milliseconds
            )
    );
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

    snapButton.disabled =
        true;


    /* =================================================
       COUNTDOWN
    ================================================= */

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


    /* =================================================
       CREATE PHOTO
    ================================================= */

    const videoWidth =
        video.videoWidth;

    const videoHeight =
        video.videoHeight;


    /*
       Keep the REAL camera ratio.

       We do not force the image to 1:1.
       We use the actual video dimensions.
    */

    canvas.width =
        videoWidth;

    canvas.height =
        videoHeight;


    const context =
        canvas.getContext("2d");


    /*
       IMPORTANT:

       The preview is mirrored with CSS.

       The saved photo is NOT mirrored.
    */

    context.drawImage(
        video,
        0,
        0,
        videoWidth,
        videoHeight
    );


    /* =================================================
       SAVE ORIGINAL PHOTO
    ================================================= */

    const image =
        canvas.toDataURL(
            "image/jpeg",
            0.92
        );

    photos.push(
        image
    );


    /* =================================================
       UPDATE STRIP
    ================================================= */

    updateStrip();

    countdown.style.display =
        "none";


    /* =================================================
       PROGRESS
    ================================================= */

    if (
        photos.length < 4
    ) {

        snapButton.textContent =
            `photo ${photos.length + 1}/4 📸`;

        snapButton.disabled =
            false;

        status.textContent =
            `${photos.length}/4 ... looking cute ♡`;

    }

    else {

        snapButton.textContent =
            "we got the pics ♡";

        status.textContent =
            "okay Charlie, that's actually cute ✨";

        downloadButton.disabled =
            false;

        filtersContainer.classList.add(
            "ready"
        );
    }

    takingPhoto = false;
}


/* =====================================================
   APPLY FILTER
===================================================== */

function applyFilter(filterName) {

    currentFilter =
        filterName;


    filterButtons.forEach(
        button => {

            button.classList.toggle(
                "active",
                button.dataset.filter ===
                filterName
            );
        }
    );


    updateStrip();
}


/* =====================================================
   RESET
===================================================== */

function reset() {

    photos = [];

    currentFilter =
        "original";


    updateStrip();


    filterButtons.forEach(
        button => {

            button.classList.toggle(
                "active",
                button.dataset.filter ===
                "original"
            );
        }
    );


    filtersContainer.classList.remove(
        "ready"
    );


    snapButton.textContent =
        "photo 1/4 📸";

    snapButton.disabled =
        !cameraStream;

    downloadButton.disabled =
        true;


    status.textContent =
        cameraStream
            ? "okayyy, we're ready ✨"
            : "uhm... camera first?";


    clearError();
}


/* =====================================================
   DRAW IMAGE WITHOUT STRETCHING
===================================================== */

function drawImageCover(
    context,
    image,
    x,
    y,
    targetWidth,
    targetHeight
) {

    /*
       Source dimensions
    */

    const sourceWidth =
        image.naturalWidth;

    const sourceHeight =
        image.naturalHeight;


    /*
       Source ratio
    */

    const sourceRatio =
        sourceWidth /
        sourceHeight;


    /*
       Target ratio
    */

    const targetRatio =
        targetWidth /
        targetHeight;


    let sourceX = 0;
    let sourceY = 0;

    let cropWidth =
        sourceWidth;

    let cropHeight =
        sourceHeight;


    /*
       If source is wider than target:
       crop the left/right.

       If source is taller than target:
       crop the top/bottom.
    */

    if (
        sourceRatio > targetRatio
    ) {

        cropWidth =
            sourceHeight *
            targetRatio;

        sourceX =
            (sourceWidth - cropWidth) / 2;

    }

    else if (
        sourceRatio < targetRatio
    ) {

        cropHeight =
            sourceWidth /
            targetRatio;

        sourceY =
            (sourceHeight - cropHeight) / 2;
    }


    /*
       Draw the image using the crop.

       This NEVER stretches the original image.
    */

    context.drawImage(
        image,

        sourceX,
        sourceY,

        cropWidth,
        cropHeight,

        x,
        y,

        targetWidth,
        targetHeight
    );
}


/* =====================================================
   DOWNLOAD STRIP
===================================================== */

function downloadStrip() {

    if (
        photos.length !== 4
    ) {
        return;
    }


    /* =================================================
       STRIP DIMENSIONS
    ================================================= */

    const width =
        900;

    const photoWidth =
        width - 84;

    /*
       4:3 target ratio.

       The downloaded photos therefore have
       the same visual ratio as the camera.
    */

    const photoHeight =
        Math.round(
            photoWidth * 3 / 4
        );

    const padding =
        42;

    const gap =
        24;

    const labelHeight =
        72;


    /* =================================================
       OUTPUT CANVAS
    ================================================= */

    const output =
        document.createElement("canvas");

    output.width =
        width;

    output.height =
        padding +
        photoHeight * 4 +
        gap * 3 +
        labelHeight +
        padding;


    const context =
        output.getContext("2d");


    /* =================================================
       WHITE BACKGROUND
    ================================================= */

    context.fillStyle =
        "#ffffff";

    context.fillRect(
        0,
        0,
        output.width,
        output.height
    );


    let loadedImages =
        0;


    /* =================================================
       LOAD PHOTOS
    ================================================= */

    photos.forEach(
        (photo, index) => {

            const image =
                new Image();


            image.onload =
                () => {

                    /*
                       Save canvas state
                    */

                    context.save();


                    /*
                       Apply selected filter
                    */

                    context.filter =
                        filterSettings[
                            currentFilter
                        ].css;


                    /*
                       Draw with COVER logic.

                       The source photo keeps
                       its original ratio.

                       Any excess is cropped.

                       NOTHING gets stretched.
                    */

                    drawImageCover(
                        context,

                        image,

                        padding,

                        padding +
                        index *
                        (photoHeight + gap),

                        photoWidth,

                        photoHeight
                    );


                    /*
                       Restore state
                    */

                    context.restore();


                    loadedImages++;


                    /* =================================
                       ALL PHOTOS LOADED
                    ================================= */

                    if (
                        loadedImages === 4
                    ) {

                        /*
                           Label
                        */

                        context.fillStyle =
                            "#77706a";

                        context.font =
                            "600 24px system-ui";

                        context.textAlign =
                            "center";

                        context.fillText(
                            "charlie • 2026",

                            width / 2,

                            output.height - 34
                        );


                        /*
                           Convert to JPEG
                        */

                        const imageURL =
                            output.toDataURL(
                                "image/jpeg",
                                0.95
                            );


                        /*
                           Download
                        */

                        const link =
                            document.createElement(
                                "a"
                            );

                        link.download =
                            `charlie-photobooth-${currentFilter}.jpg`;

                        link.href =
                            imageURL;

                        link.click();
                    }
                };


            image.src =
                photo;
        }
    );
}


/* =====================================================
   EVENT LISTENERS
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
    reset
);

downloadButton.addEventListener(
    "click",
    downloadStrip
);


/*
   Filter buttons
*/

filterButtons.forEach(
    button => {

        button.addEventListener(
            "click",
            () => {

                applyFilter(
                    button.dataset.filter
                );

            }
        );

    }
);


/* =====================================================
   CLEANUP
===================================================== */

window.addEventListener(
    "beforeunload",
    () => {

        if (cameraStream) {

            cameraStream
                .getTracks()
                .forEach(
                    track =>
                        track.stop()
                );
        }

    }
);
