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


    /*
       Retro digital photobooth look
    */

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
        "SNAPSTRIP • 2026";


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
            "Camera ready";


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



    /*
       Countdown
    */

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



    /*
       Canvas
    */

    canvas.width =
        video.videoWidth;


    canvas.height =
        video.videoHeight;


    const context =
        canvas.getContext("2d");



    /*
       IMPORTANT:
       Do NOT mirror the actual photo.

       The video preview is mirrored with CSS,
       but the saved photo is drawn normally.
    */

    context.drawImage(

        video,

        0,
        0,

        canvas.width,
        canvas.height

    );



    /*
       Save ORIGINAL photo
    */

    const image =
        canvas.toDataURL(
            "image/jpeg",
            0.92
        );


    photos.push(image);



    /*
       Update strip
    */

    updateStrip();


    countdown.style.display =
        "none";



    /*
       Progress
    */

    if (
        photos.length < 4
    ) {

        snapButton.textContent =
            `Take photo ${photos.length + 1}/4`;


        snapButton.disabled =
            false;


        status.textContent =
            `${photos.length} of 4 photos taken`;

    }

    else {

        snapButton.textContent =
            "Strip complete";


        status.textContent =
            "Your strip is ready ✨";


        downloadButton.disabled =
            false;


        /*
           Enable filters
        */

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


    /*
       Update active button
    */

    filterButtons.forEach(
        button => {

            button.classList.toggle(

                "active",

                button.dataset.filter ===
                filterName

            );

        }
    );


    /*
       Re-render strip
    */

    updateStrip();

}



/* =====================================================
   RESET
===================================================== */

function reset() {

    photos = [];

    currentFilter =
        "original";


    /*
       Reset strip
    */

    updateStrip();


    /*
       Reset filter buttons
    */

    filterButtons.forEach(
        button => {

            button.classList.toggle(

                "active",

                button.dataset.filter ===
                "original"

            );

        }
    );


    /*
       Disable filters
    */

    filtersContainer.classList.remove(
        "ready"
    );


    /*
       Reset buttons
    */

    snapButton.textContent =
        "Take photo 1/4";


    snapButton.disabled =
        !cameraStream;


    downloadButton.disabled =
        true;


    /*
       Reset status
    */

    status.textContent =
        cameraStream
            ? "Camera ready"
            : "Camera not started";


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



    /*
       Dimensions
    */

    const width =
        900;


    const photoHeight =
        675;


    const padding =
        42;


    const gap =
        24;


    const labelHeight =
        72;



    /*
       Output canvas
    */

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



    /*
       White background
    */

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



    /*
       Load photos
    */

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
                       Draw photo

                       No mirroring here either.
                    */

                    context.drawImage(

                        image,

                        padding,

                        padding +
                        index *
                        (photoHeight + gap),

                        width -
                        padding * 2,

                        photoHeight

                    );


                    /*
                       Restore state
                    */

                    context.restore();


                    loadedImages++;



                    /*
                       All four loaded
                    */

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

                            "SNAPSTRIP • 2026",

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
                            `snapstrip-${currentFilter}.jpg`;


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
