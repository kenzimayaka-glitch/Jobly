const offerEl=document.getElementById("offer");
const fieldsEl=document.getElementById("fields");
const statusEl=document.getElementById("status");
const stateEl=document.getElementById("state");
const activationCopy=document.getElementById("activationCopy");
const toggleButton=document.getElementById("toggle");
const scanButton=document.getElementById("scan");
const assistButton=document.getElementById("assist");
let assistantEnabled=false;
let currentContext=null;
scanButton.disabled=true;
assistButton.disabled=true;

function send(message) {
  return new Promise((resolve,reject) => {
    chrome.runtime.sendMessage(message,(response) => {
      if(chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
      if(!response?.ok) return reject(new Error(response?.message || "Action impossible."));
      resolve(response);
    });
  });
}

function renderContext(context) {
  currentContext=context;
  if(!context) {
    offerEl.textContent="Aucune offre Jobly liée. Ouvre d'abord une offre Jobly puis son lien vers le promoteur.";
    assistButton.disabled=true;
    return;
  }
  offerEl.replaceChildren();
  const heading=document.createElement("h2");
  heading.textContent=String(context.title || "Offre Jobly").slice(0,240);
  const byline=document.createElement("p");
  byline.textContent=String(context.company || "").slice(0,180);
  const link=document.createElement("a");
  link.href=String(context.targetUrl || context.sourceUrl || "");
  link.target="_blank";link.rel="noopener noreferrer";
  link.textContent="Ouvrir le site du recruteur";
  offerEl.append(heading,byline,link);
  assistButton.disabled=!assistantEnabled;
}

function renderInstallStatus(status) {
  const enabled=status?.enabled===true;
  assistantEnabled=enabled;
  scanButton.disabled=!enabled;
  assistButton.disabled=!enabled||!currentContext;
  if(!enabled) fieldsEl.replaceChildren();
  stateEl.textContent=enabled?"J'IA activée":"Extension installée · en pause";
  stateEl.style.background=enabled?"#dcfce7":"#fff4b8";
  stateEl.style.color=enabled?"#166534":"#725900";
  activationCopy.textContent=enabled
    ?"J'IA est active dans Jobly. Tu peux la mettre en pause à tout moment."
    :"L'extension est installée, mais J'IA attend ton activation.";
  toggleButton.textContent=enabled?"Mettre J'IA en pause":"Activer J'IA";
  toggleButton.dataset.next=enabled?"false":"true";
}

async function refresh() {
  const [context,status] = await Promise.all([
    chrome.storage.session.get(["externalApplicationContext"]),
    send({type:"JOBLY_GET_INSTALL_STATUS"})
  ]);
  renderContext(context.externalApplicationContext || null);
  renderInstallStatus(status.status);
}
refresh().catch((error)=>{statusEl.textContent=error.message;});

chrome.storage.onChanged.addListener((changes,area)=>{
  if(area==="session" && changes.externalApplicationContext) renderContext(changes.externalApplicationContext.newValue || null);
  if(area==="local" && changes.assistantEnabled) refresh().catch(()=>{});
});

toggleButton.addEventListener("click",async()=>{
  toggleButton.disabled=true;statusEl.textContent="";
  try {
    const response=await send({type:"JOBLY_SET_ASSISTANT_ENABLED",enabled:toggleButton.dataset.next==="true"});
    renderInstallStatus(response.status);
    statusEl.textContent=response.status.enabled?"J'IA est activée. Reviens sur Jobly pour vérifier la connexion.":"J'IA est en pause.";
  } catch(error) { statusEl.textContent=error instanceof Error?error.message:"Activation impossible."; }
  finally { toggleButton.disabled=false; }
});

scanButton.addEventListener("click",async()=>{
  statusEl.textContent="";
  try {
    if(!assistantEnabled) throw new Error("Active d’abord J’IA avant d’analyser un formulaire.");
    const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
    if(!tab?.id||!tab.url)throw new Error("Aucun onglet actif.");
    const page=new URL(tab.url);
    if(!["http:","https:"].includes(page.protocol))throw new Error("Cette page ne permet pas l'analyse.");
    const granted=await chrome.permissions.request({origins:[page.origin+"/*"]});
    if(!granted)throw new Error("Permission refusée. Tu peux toujours demander conseil à J'IA depuis Jobly.");
    const result=await chrome.scripting.executeScript({
      target:{tabId:tab.id},
      func:()=>{
        const visible=(el)=>{const rect=el.getBoundingClientRect(),style=getComputedStyle(el);return rect.width>0&&rect.height>0&&style.display!=="none"&&style.visibility!=="hidden";};
        return Array.from(document.querySelectorAll("input,textarea,select"))
          .filter(el=>visible(el)&&!["password","hidden","file"].includes(String(el.type||"").toLowerCase()))
          .slice(0,40)
          .map(el=>{
            const id=el.id||"";
            const label=id?document.querySelector('label[for="'+CSS.escape(id)+'"]'):null;
            const parent=el.closest("label");
            const options=el.tagName==="SELECT"?Array.from(el.options).slice(0,12).map(o=>o.textContent.trim()).filter(Boolean):[];
            return {
              label:String(label?.textContent||parent?.textContent||el.getAttribute("aria-label")||el.getAttribute("placeholder")||el.getAttribute("name")||el.tagName).trim().slice(0,180),
              type:String(el.type||el.tagName).slice(0,40),
              required:el.required===true||el.getAttribute("aria-required")==="true",
              options
            };
          });
      }
    });
    const fields=result?.[0]?.result||[];
    fieldsEl.replaceChildren();
    for(const field of fields){const item=document.createElement("li");item.textContent=(field.required?"* ":"")+field.label+" ["+field.type+"]";fieldsEl.append(item);}
    const inspectedUrl = new URL(tab.url);
    inspectedUrl.search = "";
    inspectedUrl.hash = "";
    await send({type:"JOBLY_SAVE_FORM_FIELDS",fields,pageUrl:inspectedUrl.toString()});
    statusEl.textContent=fields.length+" champ(s) repéré(s). Les paramètres privés de l'URL et les valeurs saisies ne sont pas conservés.";
  } catch(error) {statusEl.textContent=error instanceof Error?error.message:"Analyse impossible sur cette page.";}
});

assistButton.addEventListener("click",async()=>{
  try {
    await send({type:"JOBLY_OPEN_JIA_ASSIST"});
    statusEl.textContent="J'IA s'ouvre dans un onglet Jobly avec l'offre et les libellés détectés.";
  } catch(error) {statusEl.textContent=error instanceof Error?error.message:"Impossible d'ouvrir J'IA.";}
});
