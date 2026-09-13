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
   CAMERA RATIO
===================================================== */

/*
   Everything uses the same 3:4 portrait ratio.

   This means:

   CAMERA PREVIEW
        ↓
   CAPTURED PHOTO
        ↓
   STRIP
        ↓
   DOWNLOADED PHOTO

   all have exactly the same crop.
*/

const PHOTO_WIDTH = 900;

const PHOTO_HEIGHT = 1200;


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

                        /*
                           Ask for a portrait-friendly
                           high-resolution camera stream.
                        */

                        width: {
                            ideal: 1200
                        },

                        height: {
                            ideal: 1600
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
       CAMERA DIMENSIONS
    ================================================= */

    const videoWidth =
        video.videoWidth;

    const videoHeight =
        video.videoHeight;


    /*
       We need a 3:4 portrait crop.

       Target ratio:

       3 / 4 = 0.75
    */

    const targetRatio =
        3 / 4;

    const videoRatio =
        videoWidth /
        videoHeight;


    let sourceWidth;
    let sourceHeight;
    let sourceX;
    let sourceY;


    /* =================================================
       CALCULATE EXACT PREVIEW CROP
    ================================================= */

    if (
        videoRatio > targetRatio
    ) {

        /*
           Camera is too wide.

           Crop left + right.
        */

        sourceHeight =
            videoHeight;

        sourceWidth =
            videoHeight *
            targetRatio;

        sourceX =
            (videoWidth - sourceWidth) / 2;

        sourceY =
            0;

    }

    else {

        /*
           Camera is too tall.

           Crop top + bottom.
        */

        sourceWidth =
            videoWidth;

        sourceHeight =
            videoWidth /
            targetRatio;

        sourceX =
            0;

        sourceY =
            (videoHeight - sourceHeight) / 2;
    }


    /* =================================================
       CREATE FINAL PHOTO
    ================================================= */

    canvas.width =
        PHOTO_WIDTH;

    canvas.height =
        PHOTO_HEIGHT;


    const context =
        canvas.getContext("2d");


    /*
       IMPORTANT:

       The preview is mirrored with CSS.

       The actual saved photo is NOT mirrored.

       The crop is EXACTLY the same crop
       that the user sees in the preview.
    */

    context.drawImage(

        video,

        sourceX,
        sourceY,

        sourceWidth,
        sourceHeight,

        0,
        0,

        PHOTO_WIDTH,
        PHOTO_HEIGHT
    );


    /* =================================================
       SAVE PHOTO
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

    const padding =
        42;

    const gap =
        24;

    const labelHeight =
        72;


    /*
       The photos have the exact same
       3:4 ratio as the captured images.

       No crop is needed here.

       No stretching is possible.
    */

    const photoWidth =
        width -
        padding * 2;

    const photoHeight =
        Math.round(
            photoWidth *
            4 / 3
        );


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

                    context.save();


                    /*
                       Apply selected filter.
                    */

                    context.filter =
                        filterSettings[
                            currentFilter
                        ].css;


                    /*
                       IMPORTANT:

                       The image is ALREADY
                       exactly 3:4.

                       The destination is ALSO
                       exactly 3:4.

                       Therefore there is NO crop
                       and NO stretching.
                    */

                    context.drawImage(

                        image,

                        padding,

                        padding +
                        index *
                        (
                            photoHeight +
                            gap
                        ),

                        photoWidth,

                        photoHeight
                    );


                    context.restore();


                    loadedImages++;


                    /* =================================
                       ALL FOUR PHOTOS LOADED
                    ================================= */

                    if (
                        loadedImages === 4
                    ) {

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


                        /* =============================
                           CREATE DOWNLOAD
                        ============================= */

                        const imageURL =
                            output.toDataURL(
                                "image/jpeg",
                                0.95
                            );


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


/* =====================================================
   FILTER BUTTONS
===================================================== */

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
