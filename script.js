const video=document.getElementById("video"),canvas=document.getElementById("photoCanvas"),countdown=document.getElementById("countdown"),status=document.getElementById("status"),error=document.getElementById("error"),start=document.getElementById("start"),snap=document.getElementById("snap"),reset=document.getElementById("reset"),download=document.getElementById("download"),strip=document.getElementById("strip"),filters=document.getElementById("filters"),filterButtons=document.querySelectorAll(".filter-button");

let stream=null,photos=[],taking=false,currentFilter="original";

const filterSettings={
    original:"none",
    vintage:"sepia(.45) contrast(.9) saturate(.75)",
    bw:"grayscale(1) contrast(1.08)",
    warm:"sepia(.25) saturate(1.25) contrast(.95)",
    cool:"saturate(.85) hue-rotate(12deg) contrast(1.05)",
    photobooth:"sepia(.16) saturate(.82) contrast(1.12) brightness(1.04)"
};

function showError(msg){error.textContent=msg;error.style.display="block"}
function clearError(){error.style.display="none"}
function wait(ms){return new Promise(r=>setTimeout(r,ms))}

function updateStrip(){
    strip.innerHTML="";
    for(let i=0;i<4;i++){
        if(photos[i]){
            const img=new Image();
            img.src=photos[i];
            img.style.filter=filterSettings[currentFilter];
            strip.appendChild(img);
        }else{
            const empty=document.createElement("div");
            empty.className="empty-photo";
            empty.textContent=`PHOTO ${i+1}`;
            strip.appendChild(empty);
        }
    }
    const label=document.createElement("div");
    label.className="strip-label";
    label.textContent="charlie • 2026";
    strip.appendChild(label);
}

async function startCamera(){
    clearError();
    try{
        if(!navigator.mediaDevices?.getUserMedia)throw Error();
        stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"user"},audio:false});
        video.srcObject=stream;
        await new Promise(r=>video.readyState>=1?r():video.addEventListener("loadedmetadata",r,{once:true}));
        status.textContent="okayyy, we're ready ✨";
        start.disabled=true;
        snap.disabled=false;
    }catch(e){
        showError("Could not access the camera. Please allow camera permission and use HTTPS or localhost.");
        status.textContent="Camera unavailable";
    }
}

async function takePhoto(){
    if(taking||photos.length>=4)return;
    taking=true;snap.disabled=true;

    for(let n=3;n>0;n--){
        countdown.style.display="grid";
        countdown.textContent=n;
        await wait(700);
    }

    countdown.textContent="📸";
    await wait(180);

    /*
      IMPORTANT:
      No crop.
      No forced resolution.
      Save the complete camera frame.
    */
    canvas.width=video.videoWidth;
    canvas.height=video.videoHeight;

    const ctx=canvas.getContext("2d");
    ctx.drawImage(video,0,0,video.videoWidth,video.videoHeight);

    photos.push(canvas.toDataURL("image/jpeg",.92));
    updateStrip();

    countdown.style.display="none";

    if(photos.length<4){
        snap.textContent=`photo ${photos.length+1}/4 📸`;
        snap.disabled=false;
        status.textContent=`${photos.length}/4 ... looking cute ♡`;
    }else{
        snap.textContent="we got the pics ♡";
        status.textContent="okay Charlie, that's actually cute ✨";
        download.disabled=false;
        filters.classList.add("ready");
    }

    taking=false;
}

function applyFilter(name){
    currentFilter=name;
    filterButtons.forEach(b=>b.classList.toggle("active",b.dataset.filter===name));
    updateStrip();
}

function resetPhotos(){
    photos=[];
    currentFilter="original";
    updateStrip();
    filterButtons.forEach(b=>b.classList.toggle("active",b.dataset.filter==="original"));
    filters.classList.remove("ready");
    snap.textContent="photo 1/4 📸";
    snap.disabled=!stream;
    download.disabled=true;
    status.textContent=stream?"okayyy, we're ready ✨":"uhm... camera first?";
    clearError();
}

function downloadStrip(){
    if(photos.length!==4)return;

    const width=900,padding=42,gap=24,labelHeight=72;
    const photoWidth=width-padding*2;
    const photoHeight=Math.round(photoWidth*video.videoHeight/video.videoWidth);

    const out=document.createElement("canvas");
    out.width=width;
    out.height=padding+photoHeight*4+gap*3+labelHeight+padding;

    const ctx=out.getContext("2d");
    ctx.fillStyle="#fff";
    ctx.fillRect(0,0,out.width,out.height);

    let loaded=0;

    photos.forEach((src,i)=>{
        const img=new Image();
        img.onload=()=>{
            ctx.save();
            ctx.filter=filterSettings[currentFilter];
            ctx.drawImage(img,padding,padding+i*(photoHeight+gap),photoWidth,photoHeight);
            ctx.restore();

            if(++loaded===4){
                ctx.fillStyle="#77706a";
                ctx.font="600 24px system-ui";
                ctx.textAlign="center";
                ctx.fillText("charlie • 2026",width/2,out.height-34);

                const a=document.createElement("a");
                a.download=`charlie-photobooth-${currentFilter}.jpg`;
                a.href=out.toDataURL("image/jpeg",.95);
                a.click();
            }
        };
        img.src=src;
    });
}

start.addEventListener("click",startCamera);
snap.addEventListener("click",takePhoto);
reset.addEventListener("click",resetPhotos);
download.addEventListener("click",downloadStrip);
filterButtons.forEach(b=>b.addEventListener("click",()=>applyFilter(b.dataset.filter)));

window.addEventListener("beforeunload",()=>{
    stream?.getTracks().forEach(track=>track.stop());
});
