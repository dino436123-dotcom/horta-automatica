const $ = (id) => document.getElementById(id);
const state = { demo: true, apiUrl: "", apiKey: "", poll: null, data: { soil: 42, temperature: 28.4, airHumidity: 58, light: 12000, pumpOn: false, autoMode: true, threshold: 35, maxPumpSeconds: 15, lastWatered: null } };

function toast(message) {
  const el = $("toast"); el.textContent = message; el.classList.add("show");
  clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove("show"), 2600);
}
function setConnection(online, text) {
  $("connectionDot").classList.toggle("online", online);
  $("connectionText").textContent = text;
}
function render(data) {
  state.data = {...state.data, ...data};
  const d = state.data;
  $("soilValue").textContent = Number.isFinite(Number(d.soil)) ? Math.round(d.soil) : "--";
  $("soilBar").style.width = `${Math.max(0,Math.min(100,Number(d.soil)||0))}%`;
  $("soilStatus").textContent = d.soil == null ? "Sem leitura" : Number(d.soil) < Number(d.threshold ?? 35) ? "Solo abaixo do limite" : "Dentro do limite configurado";
  $("tempValue").textContent = d.temperature == null ? "--" : Number(d.temperature).toFixed(1);
  $("airValue").textContent = d.airHumidity == null ? "--" : Math.round(d.airHumidity);
  $("lightValue").textContent = d.light == null ? "--" : Math.round(d.light).toLocaleString("pt-BR");
  $("pumpState").textContent = d.pumpOn ? "Bomba ligada" : "Bomba desligada";
  $("pumpBadge").textContent = d.pumpOn ? "Ligada" : "Desligada";
  $("pumpBadge").classList.toggle("running", !!d.pumpOn);
  $("pumpBtn").textContent = d.pumpOn ? "Bomba em funcionamento" : "Iniciar irrigação";
  $("pumpBtn").disabled = !!d.pumpOn;
  $("stopBtn").disabled = !d.pumpOn;
  $("autoToggle").checked = !!d.autoMode;
  $("threshold").value = d.threshold ?? 35;
  $("duration").value = d.maxPumpSeconds ?? 15;
  $("lastWatered").textContent = d.lastWatered ? `Última irrigação: ${new Date(d.lastWatered).toLocaleString("pt-BR")}` : "Última irrigação: sem dados";
}
function headers() {
  const h = {"Content-Type":"application/json"};
  if (state.apiKey) h.Authorization = `Bearer ${state.apiKey}`;
  return h;
}
async function api(path, options={}) {
  if (!state.apiUrl) throw new Error("Configure a URL base da API.");
  const url = `${state.apiUrl.replace(/\/+$/,"")}${path}`;
  const response = await fetch(url, {...options, headers:{...headers(), ...(options.headers||{})}});
  if (!response.ok) throw new Error(`API respondeu HTTP ${response.status}`);
  const type = response.headers.get("content-type") || "";
  return type.includes("application/json") ? response.json() : {};
}
async function refresh() {
  if (state.demo) {
    render(state.data);
    setConnection(false, "Modo demonstração");
    return;
  }
  try {
    const data = await api("/api/status");
    render(data);
    setConnection(true, "ESP32 conectado");
    $("apiMessage").textContent = "Dados recebidos com sucesso.";
  } catch (e) {
    setConnection(false, "Sem conexão");
    $("apiMessage").textContent = `${e.message} — exibindo a última leitura disponível.`;
  }
}
async function sendCommand(path, body, successText) {
  if (state.demo) { toast("Demonstração: conecte a API para enviar comandos reais."); return; }
  try { await api(path, {method:"POST", body:JSON.stringify(body)}); toast(successText); await refresh(); }
  catch (e) { toast(`Não foi possível enviar: ${e.message}`); }
}
function useDemo() {
  state.demo = true;
  clearInterval(state.poll);
  render({soil:42,temperature:28.4,airHumidity:58,light:12000,pumpOn:false,autoMode:true,threshold:35,maxPumpSeconds:15});
  setConnection(false,"Modo demonstração");
  $("apiMessage").textContent = "Os valores exibidos são fictícios. Nenhum comando será enviado ao hardware.";
}
$("refreshBtn").addEventListener("click", refresh);
$("pumpBtn").addEventListener("click", () => {
  if (!confirm("Solicitar irrigação manual? Confirme que há água no reservatório.")) return;
  sendCommand("/api/pump", {on:true, durationSeconds:Number($("duration").value)}, "Comando de irrigação enviado.");
});
$("stopBtn").addEventListener("click", () => sendCommand("/api/pump", {on:false}, "Comando para parar enviado."));
$("autoToggle").addEventListener("change", e => {
  if (state.demo) { state.data.autoMode=e.target.checked; toast("Demonstração: modo não enviado ao ESP32."); return; }
  sendCommand("/api/settings", {autoMode:e.target.checked}, "Modo automático atualizado.");
});
$("saveSettingsBtn").addEventListener("click", () => {
  const threshold=Number($("threshold").value), duration=Number($("duration").value);
  if (!Number.isFinite(threshold)||threshold<1||threshold>90) return toast("Limite deve estar entre 1 e 90%.");
  if (!Number.isFinite(duration)||duration<1||duration>120) return toast("Duração máxima deve estar entre 1 e 120 segundos.");
  state.data.threshold=threshold; state.data.maxPumpSeconds=duration;
  sendCommand("/api/settings",{threshold,maxPumpSeconds:duration,autoMode:$("autoToggle").checked},"Configurações enviadas.");
  if(state.demo) render(state.data);
});
$("connectBtn").addEventListener("click", async () => {
  const url=$("apiUrl").value.trim();
  if (!/^https?:\/\//i.test(url)) return toast("Informe uma URL completa começando com https:// ou http://.");
  state.apiUrl=url.replace(/\/+$/,""); state.apiKey=$("apiKey").value.trim(); state.demo=false;
  localStorage.setItem("hortaApiUrl",state.apiUrl); localStorage.setItem("hortaApiKey",state.apiKey);
  clearInterval(state.poll); await refresh(); state.poll=setInterval(refresh,5000);
});
$("demoBtn").addEventListener("click",useDemo);
$("saveGrowthBtn").addEventListener("click",()=>{
  const entry={date:new Date().toISOString(),height:$("plantHeight").value,leaves:$("leafCount").value,notes:$("plantNotes").value};
  const entries=JSON.parse(localStorage.getItem("hortaGrowth")||"[]"); entries.push(entry); localStorage.setItem("hortaGrowth",JSON.stringify(entries));
  $("growthSaved").textContent=`Registro salvo neste aparelho em ${new Date(entry.date).toLocaleString("pt-BR")}.`;
  toast("Registro de crescimento salvo.");
});
$("navIrrigation").addEventListener("click",e=>{e.preventDefault();document.querySelector(".plant-health").scrollIntoView({behavior:"smooth"});});
$("navGrowth").addEventListener("click",e=>{e.preventDefault();document.querySelector(".growth-grid").scrollIntoView({behavior:"smooth"});});
$("navConnection").addEventListener("click",e=>{e.preventDefault();document.querySelector(".settings-panel").scrollIntoView({behavior:"smooth"});});
const savedUrl=localStorage.getItem("hortaApiUrl"); const savedKey=localStorage.getItem("hortaApiKey");
if(savedUrl){$("apiUrl").value=savedUrl;$("apiKey").value=savedKey||"";}
render(state.data); useDemo();
if ("serviceWorker" in navigator) window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));