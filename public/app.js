console.log("[BOOT] app.js vRECENT-SIMPLE", new Date().toISOString());

const API_NOW = "/now-playing";
const API_REC = "/recent"; // Byt till "/recent?dupes=1" om du vill se exakta 3 spelningar

const el = {
  cardLink:document.getElementById("cardLink"),
  bg:document.getElementById("bg"), content:document.getElementById("content"), empty:document.getElementById("empty"),
  cover:document.getElementById("cover"), title:document.getElementById("title"), artist:document.getElementById("artist"),
  tStart:document.getElementById("tStart"), tEnd:document.getElementById("tEnd"), bar:document.getElementById("bar"),
  recent:document.getElementById("recent")
};

const ms=(x=0)=>{x=Math.max(0,x|0);const s=Math.floor(x/1000),m=Math.floor(s/60);return `${m}:${String(s%60).padStart(2,"0")}`};
const esc=s=>String(s).replace(/[&<>"]/g,m=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[m]));

async function dominantColorFromURL(url){
  return new Promise((resolve)=>{
    const img=new Image(); img.crossOrigin="anonymous";
    img.onload=()=>{
      const w=50,h=50; const c=document.createElement("canvas"); c.width=w;c.height=h;
      const ctx=c.getContext("2d",{willReadFrequently:true}); ctx.drawImage(img,0,0,w,h);
      const d=ctx.getImageData(0,0,w,h).data; let r=0,g=0,b=0,n=0;
      for(let i=0;i<d.length;i+=4){ if(d[i+3]<128) continue; r+=d[i];g+=d[i+1];b+=d[i+2]; n++; }
      resolve(n?`rgb(${Math.round(r/n)},${Math.round(g/n)},${Math.round(b/n)})`:"#c84cff");
    };
    img.onerror=()=>resolve("#c84cff");
    img.src=url;
  });
}
const setAccent=c=>document.documentElement.style.setProperty("--accent",c);

function paintNow(d){
  if(!d||!d.playing){
    el.content.hidden=true; el.empty.hidden=false; el.bg.style.backgroundImage=""; el.cardLink.href="#";
    return;
  }
  el.content.hidden=false; el.empty.hidden=true;
  el.title.textContent=d.title||"Okänd låt";
  el.artist.textContent=(d.artists||[]).join(", ")||d.album||"";
  const p=d.progress_ms||0,t=d.duration_ms||1;
  el.tStart.textContent=ms(p); el.tEnd.textContent=ms(t);
  el.bar.style.width=(100*p/t)+"%";
  if(d.image){ el.cover.src=d.image; el.bg.style.backgroundImage=`url("${d.image}")`; dominantColorFromURL(d.image).then(setAccent); }
  el.cardLink.href = d.url || "#";
}

function renderRecent(items){
  el.recent.innerHTML="";
  const three = (Array.isArray(items)?items:[]).slice(0,3);
  for(const it of three){
    const a=document.createElement("a");
    a.className="chip"; a.href=it.url||"#"; a.target="_blank"; a.rel="noopener";
    a.innerHTML = `
      <img src="${esc(it.image||"")}" alt="">
      <div class="text">
        <div class="t">${esc(it.title||"")}</div>
        <div class="a">${esc((it.artists||[]).join(", "))}</div>
      </div>`;
    el.recent.appendChild(a);
  }
  for(let k=three.length;k<3;k++){
    const ph=document.createElement("div"); ph.className="chip"; ph.style.visibility="hidden"; el.recent.appendChild(ph);
  }
}

async function pollNow(){
  try{
    const r = await fetch(API_NOW,{cache:"no-store"});
    const d = await r.json();
    paintNow(d);
  }catch(e){
    console.warn("[now] error", e);
  }
}

async function pollRecent(){
  try{
    const r = await fetch(API_REC,{cache:"no-store"});
    const j = await r.json();
    console.debug("[recent-simple] count=", (j.items||[]).length, j);
    renderRecent(j.items||[]);
  }catch(e){
    console.warn("[recent-simple] error", e);
  }
}

pollNow(); pollRecent();
setInterval(pollNow, 1000);
setInterval(pollRecent, 2000);
