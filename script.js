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

/*
    CSS filters are used for the live preview.

    The same filters are also applied to the
    final downloaded canvas.
*/

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

    /*
        Clear the current strip
    */

    strip.innerHTML = "";



    /*
        Create the four photo slots
    */

    for (
        let i = 0;
        i < 4;
        i++
    ) {

        /*
            If we have a photo,
            display it.
        */

        if (photos[i]) {

            const image =
                document.createElement("img");


            image.src =
                photos[i];


            /*
                Apply current filter
                to the preview.
            */

            image.style.filter =
                filterSettings[
                    currentFilter
                ].css;


            strip.appendChild(
                image
            );

        }


        /*
            Otherwise show an
            empty photo slot.
        */

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



    /*
        Add the strip label
    */

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

        /*
            Check whether the browser
            supports camera access.
        */

        if (
            !navigator.mediaDevices ||
            !navigator.mediaDevices.getUserMedia
        ) {

            throw new Error(
                "Camera access is not supported."
            );

        }



        /*
            Ask the user for camera access.
        */

        cameraStream =
            await navigator.mediaDevices
                .getUserMedia({

                    video: {

                        /*
                            "user" means the
                            front/selfie camera.
                        */

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



        /*
            Connect camera stream
            to the video element.
        */

        video.srcObject =
            cameraStream;



        /*
            Update UI.
        */

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
   WAIT HELPER
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

    /*
        Prevent taking another photo
        while countdown is running.
    */

    if (
        takingPhoto ||
        photos.length >= 4
    ) {

        return;

    }


    takingPhoto = true;

    snapButton.disabled =
        true;



    /* -----------------------------------------------
       COUNTDOWN
    ------------------------------------------------ */

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



    /*
        Camera flash indicator
    */

    countdown.textContent =
        "📸";


    await wait(180);



    /* -----------------------------------------------
       CANVAS SETUP
    ------------------------------------------------ */

    canvas.width =
        video.videoWidth;


    canvas.height =
        video.videoHeight;


    const context =
        canvas.getContext("2d");



    /* -----------------------------------------------
       MIRROR SELFIE
    ------------------------------------------------ */

    context.save();


    /*
        Flip canvas horizontally.
    */

    context.translate(
        canvas.width,
        0
    );


    context.scale(
        -1,
        1
    );


    /*
        Draw current camera frame.
    */

    context.drawImage(

        video,

        0,
        0,

        canvas.width,
        canvas.height

    );


    context.restore();



    /* -----------------------------------------------
       SAVE ORIGINAL IMAGE
    ------------------------------------------------ */

    /*
        IMPORTANT:

        We save the original image here.

        We DON'T permanently apply the filter.

        This allows the user to switch filters
        as many times as they want.
    */

    const image =
        canvas.toDataURL(
            "image/jpeg",
            0.92
        );


    photos.push(image);



    /* -----------------------------------------------
       UPDATE STRIP
    ------------------------------------------------ */

    updateStrip();


    countdown.style.display =
        "none";



    /* -----------------------------------------------
       UPDATE PROGRESS
    ------------------------------------------------ */

    if (
        photos.length < 4
    ) {

        /*
            There are still photos
            left to take.
        */

        snapButton.textContent =
            `Take photo ${photos.length + 1}/4`;


        snapButton.disabled =
            false;


        status.textContent =
            `${photos.length} of 4 photos taken`;

    }


    else {

        /*
            All four photos are done.
        */

        snapButton.textContent =
            "Strip complete";


        status.textContent =
            "Your strip is ready ✨";


        downloadButton.disabled =
            false;



        /*
            Enable filters.
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

    /*
        Save selected filter.
    */

    currentFilter =
        filterName;



    /*
        Update which filter button
        appears selected.
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
        Re-render the strip.

        This changes the preview
        immediately.
    */

    updateStrip();

}



/* =====================================================
   RESET
===================================================== */

function reset() {

    /*
        Remove all photos.
    */

    photos = [];


    /*
        Reset filter.
    */

    currentFilter =
        "original";



    /*
        Reset strip.
    */

    updateStrip();



    /*
        Reset active filter button.
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
        Disable filters until
        all four photos exist.
    */

    filtersContainer.classList.remove(
        "ready"
    );



    /*
        Reset snap button.
    */

    snapButton.textContent =
        "Take photo 1/4";


    snapButton.disabled =
        !cameraStream;



    /*
        Disable download.
    */

    downloadButton.disabled =
        true;



    /*
        Reset status.
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

    /*
        Only download when
        all four photos exist.
    */

    if (
        photos.length !== 4
    ) {

        return;

    }



    /* -----------------------------------------------
       FINAL IMAGE DIMENSIONS
    ------------------------------------------------ */

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



    /* -----------------------------------------------
       CREATE OUTPUT CANVAS
    ------------------------------------------------ */

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



    /* -----------------------------------------------
       WHITE BACKGROUND
    ------------------------------------------------ */

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



    /* -----------------------------------------------
       LOAD PHOTOS
    ------------------------------------------------ */

    photos.forEach(
        (photo, index) => {

            const image =
                new Image();



            image.onload =
                () => {

                    /*
                        Save current canvas state.
                    */

                    context.save();



                    /*
                        Apply the selected filter.

                        CanvasRenderingContext2D.filter
                        supports the same CSS filter
                        syntax we use in the preview.
                    */

                    context.filter =
                        filterSettings[
                            currentFilter
                        ].css;



                    /*
                        Draw the filtered image.
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
                        Restore canvas state.
                    */

                    context.restore();



                    loadedImages++;



                    /* --------------------------------
                       ALL PHOTOS LOADED
                    -------------------------------- */

                    if (
                        loadedImages === 4
                    ) {

                        /*
                            Add label underneath.
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
                            Convert final canvas
                            to JPEG.
                        */

                        const imageURL =
                            output.toDataURL(

                                "image/jpeg",

                                0.95

                            );



                        /*
                            Create temporary
                            download link.
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


/*
    Start camera
*/

startButton.addEventListener(
    "click",
    startCamera
);



/*
    Take photo
*/

snapButton.addEventListener(
    "click",
    takePhoto
);



/*
    Reset everything
*/

resetButton.addEventListener(
    "click",
    reset
);



/*
    Download strip
*/

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

/*
    Stop camera when leaving page.
*/

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