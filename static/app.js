const $ = (id) => document.getElementById(id);
const money = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const number = new Intl.NumberFormat('es-CO');

const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const panels = [
  ['empresa', '1. Empresa'], ['circulo', '2. Círculo dorado'], ['diagnostico', '3. Diagnóstico'], ['foda', '4. FODA'],
  ['pestel', '5. PESTEL'], ['objetivos', '6. SMART'], ['estrategias', '7. Estrategias'], ['presupuesto', '8. Presupuesto'],
  ['kpis', '9. KPIs'], ['seguimiento', '10. Seguimiento'], ['dashboard', '11. Dashboard']
];

let schema = null;
let currentUser = null;
let companies = [];
let companyId = null;
let state = emptyState();

function emptyState() {
  return {
    company: {},
    goldenCircle: {},
    diagnostic: {},
    swot: [],
    pestel: [],
    objectives: [],
    initiatives: [],
    budget: [],
    kpis: [],
    meetings: []
  };
}
function cacheKey(){ return `pm_state_${companyId || 'draft'}`; }
function loadCachedState(){
  try {
    const saved = JSON.parse(localStorage.getItem(cacheKey()));
    return saved ? { ...emptyState(), ...saved } : emptyState();
  }
  catch { return emptyState(); }
}
function persist(){
  collectFormState();
  localStorage.setItem(cacheKey(), JSON.stringify(state));
  renderAll();
}

async function api(path, options={}) {
  const res = await fetch(path, { headers: {'Content-Type':'application/json'}, credentials: 'same-origin', ...options });
  const data = await res.json();
  if (!res.ok) { const err = new Error(data.error || 'Error API'); err.status = res.status; throw err; }
  return data;
}

// ===== Autenticación =====
async function init(){
  schema = await api('/api/schema');
  bindAuthEvents();
  try {
    const session = await api('/api/auth/me');
    boot(session);
  } catch {
    showAuth();
  }
}

function showAuth(){
  $('authScreen').hidden = false;
  $('app').hidden = true;
}

function authError(message){
  const el = $('authError');
  el.textContent = message || '';
  el.hidden = !message;
}

function bindAuthEvents(){
  $('tabLogin').onclick = () => switchAuthTab(true);
  $('tabRegister').onclick = () => switchAuthTab(false);
  $('loginForm').onsubmit = async (e) => {
    e.preventDefault(); authError('');
    try {
      const session = await api('/api/auth/login', { method:'POST', body: JSON.stringify({ email: $('loginEmail').value, password: $('loginPassword').value }) });
      boot(session);
    } catch(err){ authError(err.message); }
  };
  $('registerForm').onsubmit = async (e) => {
    e.preventDefault(); authError('');
    try {
      const session = await api('/api/auth/register', { method:'POST', body: JSON.stringify({ name: $('registerName').value, email: $('registerEmail').value, password: $('registerPassword').value }) });
      boot(session);
    } catch(err){ authError(err.message); }
  };
}

function switchAuthTab(login){
  $('tabLogin').classList.toggle('active', login);
  $('tabRegister').classList.toggle('active', !login);
  $('loginForm').hidden = !login;
  $('registerForm').hidden = login;
  authError('');
}

async function boot(session){
  currentUser = session.user;
  companies = session.companies || [];
  $('authScreen').hidden = true;
  $('app').hidden = false;
  $('userEmail').textContent = currentUser.email;

  renderNav();
  fillSelects();
  bindEvents();

  const saved = localStorage.getItem('pm_company_id');
  companyId = companies.some(c => c.id === saved) ? saved : (companies[0]?.id || null);
  await loadCompanyPlan();
  renderCompanySelect();
  hydrateForms();
  renderAll();
}

function renderCompanySelect(){
  const select = $('companySelect');
  if(!companies.length){
    select.innerHTML = '<option value="">Nueva empresa (sin guardar)</option>';
    return;
  }
  select.innerHTML = companies.map(c => `<option value="${c.id}" ${c.id===companyId?'selected':''}>${escapeHtml(c.name)}</option>`).join('')
    + (companyId ? '' : '<option value="" selected>Nueva empresa (sin guardar)</option>');
}

async function loadCompanyPlan(){
  if(!companyId){ state = loadCachedState(); return; }
  localStorage.setItem('pm_company_id', companyId);
  try {
    const res = await api(`/api/plan?company_id=${encodeURIComponent(companyId)}`);
    state = res.plan ? { ...emptyState(), ...res.plan } : loadCachedState();
  } catch {
    state = loadCachedState();
  }
}

async function switchCompany(id){
  collectFormState();
  localStorage.setItem(cacheKey(), JSON.stringify(state));
  companyId = id || null;
  await loadCompanyPlan();
  hydrateForms();
  renderAll();
}

function newCompany(){
  collectFormState();
  localStorage.setItem(cacheKey(), JSON.stringify(state));
  companyId = null;
  localStorage.removeItem('pm_company_id');
  state = emptyState();
  renderCompanySelect();
  hydrateForms();
  renderAll();
  activatePanel('empresa');
}

async function logout(){
  try { await api('/api/auth/logout', { method:'POST', body: '{}' }); } catch {}
  currentUser = null; companies = []; companyId = null; state = emptyState();
  showAuth();
}

// ===== UI base =====
function renderNav(){
  $('nav').innerHTML = panels.map(([key,label],i)=>`<button class="nav-btn ${i===0?'active':''}" data-target="${key}">${label}</button>`).join('');
  document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', () => activatePanel(btn.dataset.target)));
}
function activatePanel(panel){
  document.querySelectorAll('.panel').forEach(el => el.classList.toggle('active', el.dataset.panel === panel));
  document.querySelectorAll('.nav-btn').forEach(el => el.classList.toggle('active', el.dataset.target === panel));
  if(panel === 'dashboard') setTimeout(renderCharts, 50);
}
function optionHtml(items, valueKey=null){
  return items.map(item => {
    const value = valueKey ? item[valueKey] : item;
    return `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`;
  }).join('');
}
function fillSelects(){
  ['swotArea','objectiveArea','initiativeArea','budgetArea','kpiArea'].forEach(id => $(id).innerHTML = optionHtml(schema.areas));
  $('swotType').innerHTML = optionHtml(schema.swot_types);
  $('pestelFactor').innerHTML = optionHtml(schema.pestel_factors);
  $('initiativePriority').innerHTML = optionHtml(schema.priority_options);
  $('initiativeStatus').innerHTML = optionHtml(schema.status_options);
  $('budgetMonth').innerHTML = optionHtml(months);
  $('companySector').innerHTML = '<option value="">Selecciona sector...</option>' + optionHtml(schema.sectors || []);
  $('meetingType').innerHTML = optionHtml(schema.meeting_types || []);
  $('meetingStatus').innerHTML = optionHtml(schema.commitment_status || []);
}
function hydrateForms(){
  $('companyName').value = state.company.name || '';
  $('companyCountry').value = state.company.country || '';
  $('companyCity').value = state.company.city || '';
  $('companySector').value = state.company.sector || '';
  $('companyEmployees').value = state.company.employees || '';
  $('companyRevenue').value = state.company.revenue || '';
  $('why').value = state.goldenCircle.why || '';
  $('how').value = state.goldenCircle.how || '';
  $('what').value = state.goldenCircle.what || '';
}
function collectFormState(){
  state.company = {
    name: $('companyName').value.trim(), country: $('companyCountry').value.trim(), city: $('companyCity').value.trim(),
    sector: $('companySector').value.trim(), employees: Number($('companyEmployees').value || 0), revenue: Number($('companyRevenue').value || 0)
  };
  state.goldenCircle = { why: $('why').value.trim(), how: $('how').value.trim(), what: $('what').value.trim() };
}
function renderDiagnostics(){
  $('diagnosticList').innerHTML = schema.diagnostic_questions.map((q, idx) => {
    const val = state.diagnostic[idx] || 0;
    const score = (Number(val) * q.weight / 5).toFixed(1);
    return `<div class="question">
      <strong>${escapeHtml(q.area)}</strong>
      <span>${escapeHtml(q.question)}</span>
      <small>Peso: ${q.weight}%</small>
      <input data-diag="${idx}" type="range" min="0" max="5" step="1" value="${val}">
      <strong id="diagScore${idx}">${score}</strong>
    </div>`;
  }).join('');
  document.querySelectorAll('[data-diag]').forEach(input => input.addEventListener('input', e => {
    state.diagnostic[e.target.dataset.diag] = Number(e.target.value);
    persist();
  }));
}
function bindEvents(){
  document.querySelectorAll('#app input, #app textarea, #app select').forEach(el => el.addEventListener('change', (e) => {
    if(e.target.id === 'companySelect') return;
    persist();
  }));
  $('companySelect').addEventListener('change', (e) => switchCompany(e.target.value));
  $('btnNewCompany').onclick = newCompany;
  $('btnLogout').onclick = logout;
  $('addSwot').onclick = () => addRow('swot', {
    type: $('swotType').value, area: $('swotArea').value, text: $('swotText').value, impact: Number($('swotImpact').value), probability: Number($('swotProbability').value)
  }, ['swotText']);
  $('addPestel').onclick = () => addRow('pestel', {
    factor: $('pestelFactor').value, description: $('pestelDescription').value, impact: Number($('pestelImpact').value), opportunity: $('pestelOpportunity').value
  }, ['pestelDescription','pestelOpportunity']);
  $('addObjective').onclick = () => addRow('objectives', {
    area: $('objectiveArea').value, objective: $('objectiveText').value, metric: $('objectiveMetric').value,
    baseline: Number($('objectiveBaseline').value), target: Number($('objectiveTarget').value), deadline: $('objectiveDeadline').value, owner: $('objectiveOwner').value
  }, ['objectiveText','objectiveMetric','objectiveBaseline','objectiveTarget','objectiveDeadline','objectiveOwner']);
  $('addInitiative').onclick = () => addRow('initiatives', {
    area: $('initiativeArea').value, name: $('initiativeName').value, owner: $('initiativeOwner').value,
    priority: $('initiativePriority').value, status: $('initiativeStatus').value, start: $('initiativeStart').value, end: $('initiativeEnd').value,
    progress: Number($('initiativeProgress').value || 0)
  }, ['initiativeName','initiativeOwner','initiativeStart','initiativeEnd','initiativeProgress']);
  $('addBudget').onclick = () => addRow('budget', {
    area: $('budgetArea').value, concept: $('budgetConcept').value, month: $('budgetMonth').value,
    planned: Number($('budgetPlanned').value || 0), actual: Number($('budgetActual').value || 0)
  }, ['budgetConcept','budgetPlanned','budgetActual']);
  $('addKpi').onclick = () => addRow('kpis', {
    area: $('kpiArea').value, name: $('kpiName').value, target: Number($('kpiTarget').value || 0), actual: Number($('kpiActual').value || 0), unit: $('kpiUnit').value, owner: $('kpiOwner').value
  }, ['kpiName','kpiTarget','kpiActual','kpiUnit','kpiOwner']);
  $('addMeeting').onclick = () => addRow('meetings', {
    date: $('meetingDate').value, type: $('meetingType').value, decision: $('meetingDecision').value,
    commitment: $('meetingCommitment').value, owner: $('meetingOwner').value, deadline: $('meetingDeadline').value, status: $('meetingStatus').value
  }, ['meetingDecision','meetingCommitment','meetingOwner']);
  $('btnExport').onclick = exportJson;
  $('btnDemo').onclick = loadDemo;
  $('btnSave').onclick = savePlan;
}
function addRow(collection, row, clearIds){
  const hasText = Object.values(row).some(v => typeof v === 'string' && v.trim().length > 0);
  if(!hasText) return alert('Completa al menos una descripción o nombre.');
  state[collection].push(row);
  clearIds.forEach(id => $(id).value = '');
  persist();
}
function deleteRow(collection, index){
  state[collection].splice(index, 1);
  persist();
}
window.deleteRow = deleteRow;

function renderAll(){
  renderDiagnostics();
  renderTables();
  renderKpis();
  renderCharts();
}
function diagnosticScore(){
  const totalWeight = schema.diagnostic_questions.reduce((a,q)=>a+q.weight,0);
  const score = schema.diagnostic_questions.reduce((acc,q,idx)=> acc + ((Number(state.diagnostic[idx] || 0) / 5) * q.weight),0);
  return totalWeight ? Math.round(score / totalWeight * 100) : 0;
}
function initiativeCompletion(){
  if(!state.initiatives.length) return 0;
  return Math.round(state.initiatives.reduce((a,i)=>a+Number(i.progress||0),0) / state.initiatives.length);
}
function kpiCompletion(){
  if(!state.kpis.length) return 0;
  return Math.round(state.kpis.reduce((a,k)=>a + Math.min(100, (Number(k.actual||0) / Math.max(1, Number(k.target||0))) * 100), 0) / state.kpis.length);
}
function budgetVariance(){
  const planned = state.budget.reduce((a,b)=>a+Number(b.planned||0),0);
  const actual = state.budget.reduce((a,b)=>a+Number(b.actual||0),0);
  return {planned, actual, variance: actual - planned};
}
function renderKpis(){
  const budget = budgetVariance();
  const planCompletion = Math.round((diagnosticScore() + initiativeCompletion() + kpiCompletion()) / 3);
  $('sideProgress').style.width = `${planCompletion}%`;
  $('sideProgressText').textContent = `${planCompletion}%`;
  $('kpiGrid').innerHTML = [
    ['Madurez estratégica', `${diagnosticScore()}%`, 'Promedio ponderado del diagnóstico'],
    ['Avance iniciativas', `${initiativeCompletion()}%`, 'Promedio de ejecución del roadmap'],
    ['Cumplimiento KPIs', `${kpiCompletion()}%`, 'Resultado actual vs meta'],
    ['Desviación presupuesto', money.format(budget.variance), 'Real menos planeado']
  ].map(([title,value,caption])=>`<div class="kpi-card"><small>${title}</small><strong>${value}</strong><span>${caption}</span></div>`).join('');
}

// ===== Reglas de negocio =====
function todayIso(){ return new Date().toISOString().slice(0,10); }
function isOverdue(initiative){
  return initiative.end && initiative.end < todayIso() && initiative.status !== 'Completado';
}
function budgetLineAlert(b){
  const planned = Number(b.planned||0), actual = Number(b.actual||0);
  if(!planned) return false;
  return (actual - planned) / planned > 0.10; // regla: desviación > 10%
}
function areaMaturities(){
  const acc = {};
  schema.diagnostic_questions.forEach((q, idx) => {
    acc[q.area] = acc[q.area] || {score:0, weight:0};
    acc[q.area].score += (Number(state.diagnostic[idx] || 0) / 5) * q.weight;
    acc[q.area].weight += q.weight;
  });
  const out = {};
  Object.entries(acc).forEach(([area, v]) => out[area] = v.weight ? Math.round(v.score / v.weight * 100) : 0);
  return out;
}
function weakAreas(threshold = 60){
  return Object.entries(areaMaturities()).filter(([,pct]) => pct < threshold).sort((a,b)=>a[1]-b[1]);
}
function planAlerts(){
  const alerts = [];
  state.budget.filter(budgetLineAlert).forEach(b => {
    const pct = Math.round(((b.actual - b.planned) / b.planned) * 100);
    alerts.push({level:'bad', text:`Presupuesto excedido ${pct}% en ${b.area} · ${b.concept} (${b.month}): planeado ${money.format(b.planned)}, real ${money.format(b.actual)}.`});
  });
  state.initiatives.filter(isOverdue).forEach(i => alerts.push({level:'bad', text:`Iniciativa atrasada: "${i.name}" venció el ${i.end} y va en ${i.progress || 0}%. Responsable: ${i.owner || 'sin asignar'}.`}));
  state.kpis.forEach(k => { if(kpiPct(k) < 70) alerts.push({level:'warn', text:`KPI en rojo: "${k.name}" (${k.area}) va en ${kpiPct(k)}% de la meta. Responsable: ${k.owner || 'sin asignar'}.`}); });
  state.objectives.forEach(o => {
    if(!o.metric || !o.target || !o.deadline || !o.owner) alerts.push({level:'warn', text:`Objetivo incompleto: "${o.objective}" necesita métrica, meta, fecha y responsable para aprobarse.`});
  });
  const meetings = state.meetings || [];
  meetings.forEach(m => {
    if(m.deadline && m.deadline < todayIso() && m.status !== 'Cumplido') alerts.push({level:'bad', text:`Compromiso vencido: "${m.commitment}" (${m.owner || 'sin responsable'}) venció el ${m.deadline}.`});
  });
  return alerts;
}

function renderTables(){
  $('swotTable').innerHTML = table(['Tipo','Área','Hallazgo','Impacto','Prob.','Prioridad',''], state.swot.map((r,i)=>[r.type,r.area,r.text,r.impact,r.probability, priorityBadge(r.impact*r.probability), del('swot',i)]));
  $('pestelTable').innerHTML = table(['Factor','Descripción','Impacto','Respuesta estratégica',''], state.pestel.map((r,i)=>[r.factor,r.description,r.impact,r.opportunity,del('pestel',i)]));
  $('objectivesTable').innerHTML = table(['Área','Objetivo','Métrica','Base','Meta','Fecha','Responsable','Cumpl.',''], state.objectives.map((r,i)=>[r.area,r.objective,r.metric,fmtNum(r.baseline),fmtNum(r.target),r.deadline,r.owner, badge(percent(r.baseline,r.target), percent(r.baseline,r.target)),del('objectives',i)]));
  $('initiativesTable').innerHTML = table(['Área','Iniciativa','Responsable','Prioridad','Estado','Inicio','Fin','Avance',''], state.initiatives.map((r,i)=>[r.area,r.name,r.owner,r.priority, isOverdue(r) ? '<span class="badge bad">Atrasada</span>' : statusBadge(r.status), r.start,r.end,progress(r.progress),del('initiatives',i)]));
  $('budgetTable').innerHTML = table(['Área','Concepto','Mes','Planeado','Real','Variación','Alerta',''], state.budget.map((r,i)=>[r.area,r.concept,r.month,money.format(r.planned||0),money.format(r.actual||0),varianceBadge((r.actual||0)-(r.planned||0)), budgetLineAlert(r) ? '<span class="badge bad">&gt;10%</span>' : '<span class="badge good">OK</span>', del('budget',i)]));
  $('kpisTable').innerHTML = table(['Área','KPI','Meta','Actual','Unidad','Responsable','Semáforo',''], state.kpis.map((r,i)=>[r.area,r.name,fmtNum(r.target),fmtNum(r.actual),r.unit,r.owner,badge(kpiPct(r), `${kpiPct(r)}%`),del('kpis',i)]));
  $('meetingsTable').innerHTML = table(['Fecha','Tipo','Decisión','Compromiso','Responsable','Límite','Estado',''], (state.meetings||[]).map((r,i)=>[r.date,r.type,r.decision,r.commitment,r.owner,r.deadline,commitmentBadge(r),del('meetings',i)]));
  renderCrossMatrix();
  renderCommitteeAgenda();
  renderAlerts();
  renderRoadmap();
  renderRecommendations();
}

function renderCrossMatrix(){
  const el = $('crossMatrix'); if(!el) return;
  const top = type => state.swot.filter(s=>s.type===type).sort((a,b)=>(b.impact*b.probability)-(a.impact*a.probability)).slice(0,3);
  const F = top('Fortaleza'), O = top('Oportunidad'), D = top('Debilidad'), A = top('Amenaza');
  const combos = [
    ['FO · Estrategias ofensivas', 'Usa tus fortalezas para capturar oportunidades', F, O, (f,o)=>`Apalanca "${f.text}" para aprovechar "${o.text}".`],
    ['FA · Estrategias defensivas', 'Usa tus fortalezas para neutralizar amenazas', F, A, (f,a)=>`Usa "${f.text}" para mitigar "${a.text}".`],
    ['DO · Estrategias de adaptación', 'Corrige debilidades para no perder oportunidades', D, O, (d,o)=>`Cierra la brecha "${d.text}" para no perder "${o.text}".`],
    ['DA · Estrategias de supervivencia', 'Reduce debilidades expuestas a amenazas', D, A, (d,a)=>`Atiende "${d.text}" antes de que "${a.text}" golpee.`],
  ];
  el.innerHTML = combos.map(([title, hint, list1, list2, fn]) => {
    let items = [];
    list1.forEach(x => list2.forEach(y => items.push(fn(x,y))));
    items = items.slice(0,3);
    return `<div class="matrix-cell"><strong>${title}</strong><small>${hint}</small>${
      items.length ? items.map(t=>`<div class="matrix-item">${escapeHtml(t)}</div>`).join('') : '<div class="empty small">Agrega hallazgos de ambos tipos para generar estrategias.</div>'
    }</div>`;
  }).join('');
}

function renderCommitteeAgenda(){
  const el = $('committeeAgenda'); if(!el) return;
  const done = state.initiatives.filter(i=>i.status==='Completado');
  const late = state.initiatives.filter(isOverdue);
  const over = state.budget.filter(budgetLineAlert);
  const redKpis = state.kpis.filter(k=>kpiPct(k)<70);
  const pending = (state.meetings||[]).filter(m=>m.status && m.status!=='Cumplido' && m.commitment);
  const items = [
    ['✅ Qué se logró', done.length ? done.map(i=>i.name).join(' · ') : 'Sin iniciativas completadas aún.'],
    ['⏰ Qué está atrasado', late.length ? late.map(i=>`${i.name} (vencía ${i.end})`).join(' · ') : 'Nada atrasado. Buen ritmo.'],
    ['💸 Presupuesto excedido', over.length ? over.map(b=>`${b.concept} (${b.area})`).join(' · ') : 'Sin desviaciones mayores al 10%.'],
    ['🔴 KPIs en rojo', redKpis.length ? redKpis.map(k=>`${k.name} (${kpiPct(k)}%)`).join(' · ') : 'Todos los KPIs por encima del 70%.'],
    ['🤝 Compromisos abiertos', pending.length ? pending.map(m=>`${m.commitment} — ${m.owner || 'sin responsable'} (${m.deadline || 'sin fecha'})`).join(' · ') : 'Sin compromisos pendientes registrados.'],
  ];
  el.innerHTML = items.map(([t,c])=>`<div class="recommendation"><strong>${t}:</strong> ${escapeHtml(c)}</div>`).join('');
}

function renderAlerts(){
  const el = $('alerts'); if(!el) return;
  const alerts = planAlerts();
  el.innerHTML = alerts.length
    ? alerts.map(a=>`<div class="recommendation alert-${a.level}">${escapeHtml(a.text)}</div>`).join('')
    : '<div class="recommendation alert-good">Sin alertas activas. El plan está bajo control.</div>';
}
function table(headers, rows){
  if(!rows.length) return '<div class="empty">Aún no hay registros. Agrega el primer dato para construir el plan.</div>';
  return `<table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(c=>`<td>${c ?? ''}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}
function del(collection,i){ return `<span class="delete" onclick="deleteRow('${collection}',${i})">Eliminar</span>`; }
function fmtNum(v){ return Number(v || 0).toLocaleString('es-CO'); }
function percent(base,target){ return target ? Math.round((base / target) * 100) : 0; }
function kpiPct(k){ return Math.round(Math.min(100, Number(k.actual||0) / Math.max(1,Number(k.target||0)) * 100)); }
function badge(pct, label){ const cls = pct >= 90 ? 'good' : pct >= 70 ? 'warn' : 'bad'; return `<span class="badge ${cls}">${label}</span>`; }
function statusBadge(status){ const cls = status === 'Completado' ? 'good' : status === 'Bloqueado' ? 'bad' : status === 'En proceso' ? 'warn' : ''; return `<span class="badge ${cls}">${status}</span>`; }
function priorityBadge(p){ const cls = p >= 16 ? 'bad' : p >= 9 ? 'warn' : 'good'; return `<span class="badge ${cls}">${p}</span>`; }
function commitmentBadge(m){
  const overdue = m.deadline && m.deadline < todayIso() && m.status !== 'Cumplido';
  const status = overdue ? 'Vencido' : (m.status || 'Pendiente');
  const cls = status === 'Cumplido' ? 'good' : status === 'Vencido' ? 'bad' : 'warn';
  return `<span class="badge ${cls}">${status}</span>`;
}
function varianceBadge(v){ const cls = v <= 0 ? 'good' : 'bad'; return `<span class="badge ${cls}">${money.format(v)}</span>`; }
function progress(v){ v = Math.max(0, Math.min(100, Number(v||0))); return `<div class="progress"><span style="width:${v}%"></span></div><small>${v}%</small>`; }
function renderRoadmap(){
  $('roadmap').innerHTML = state.initiatives.length ? state.initiatives.map(i=>`<div class="roadmap-item"><strong>${escapeHtml(i.name)} ${isOverdue(i) ? '<span class="badge bad">Atrasada</span>' : ''}</strong><small>${escapeHtml(i.area)} · ${escapeHtml(i.owner || 'Sin responsable')} · ${escapeHtml(i.start || '')} → ${escapeHtml(i.end || '')}</small>${progress(i.progress)}</div>`).join('') : '<p>No hay iniciativas cargadas.</p>';
}

// ===== Motor de recomendaciones inteligentes =====
function renderRecommendations(){
  const recs = [];

  // 1. Recomendaciones por sector (playbook)
  const sector = state.company.sector;
  const playbook = (schema.sector_playbooks || {})[sector];
  if(playbook){
    playbook.slice(0,3).forEach(r => recs.push({tag: sector, text: r}));
  } else if(!sector) {
    recs.push({tag:'Perfil', text:'Selecciona el sector de tu empresa en el Paso 1 para recibir recomendaciones específicas de tu industria.'});
  }

  // 2. Plan de acción para áreas débiles (madurez < 60%)
  const weak = weakAreas().slice(0,3);
  weak.forEach(([area, pct]) => {
    const plans = (schema.area_action_plans || {})[area] || [];
    plans.slice(0,1).forEach(p => recs.push({tag:`${area} · ${pct}%`, text: p}));
  });

  // 3. Reglas transversales
  if(kpiCompletion() < 70 && state.kpis.length) recs.push({tag:'KPIs', text:'El cumplimiento promedio está por debajo del 70%. Revisa si las metas son realistas y confirma dueño, frecuencia y fuente de datos de cada indicador.'});
  const over = state.budget.filter(budgetLineAlert);
  if(over.length) recs.push({tag:'Presupuesto', text:`Hay ${over.length} concepto(s) con desviación mayor al 10%. Define topes de gasto por área y autorización previa para excedentes.`});
  const late = state.initiatives.filter(isOverdue);
  if(late.length) recs.push({tag:'Roadmap', text:`Tienes ${late.length} iniciativa(s) atrasada(s). Replantea fecha o alcance en el próximo comité y asigna un desbloqueador con nombre propio.`});
  const bigThreats = state.pestel.filter(p => Number(p.impact) >= 4);
  if(bigThreats.length) recs.push({tag:'Entorno', text:`Hay ${bigThreats.length} factor(es) externo(s) de alto impacto. Asegura que cada uno tenga una respuesta estratégica y un responsable en el PESTEL.`});
  if(!state.objectives.length) recs.push({tag:'SMART', text:'Agrega mínimo 1 objetivo SMART por área crítica: ventas, operaciones y finanzas primero.'});
  if(!state.swot.length) recs.push({tag:'FODA', text:'Completa el FODA para que la matriz FO/FA/DO/DA genere estrategias automáticas.'});
  if(!recs.length) recs.push({tag:'Plan', text:'El plan tiene buena estructura. Mantén revisión semanal y comité mensual con la agenda automática del Paso 10.'});

  $('recommendations').innerHTML = recs.map(r=>`<div class="recommendation"><span class="rec-tag">${escapeHtml(r.tag)}</span>${escapeHtml(r.text)}</div>`).join('');
}
function renderCharts(){
  drawMaturity();
  drawBudget();
}
function drawMaturity(){
  const canvas = $('maturityChart'); if(!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const byArea = areaMaturities();
  drawBarChart(ctx, Object.keys(byArea), Object.values(byArea), '%');
}
function drawBudget(){
  const canvas = $('budgetChart'); if(!canvas) return;
  const ctx = canvas.getContext('2d'); ctx.clearRect(0,0,canvas.width,canvas.height);
  const byArea = {};
  state.budget.forEach(b => {
    byArea[b.area] = byArea[b.area] || {planned:0, actual:0};
    byArea[b.area].planned += Number(b.planned||0);
    byArea[b.area].actual += Number(b.actual||0);
  });
  const labels = Object.keys(byArea);
  const values = labels.map(a => byArea[a].actual - byArea[a].planned);
  drawBarChart(ctx, labels, values, '$');
}
function drawBarChart(ctx, labels, values, suffix){
  const w = ctx.canvas.width, h = ctx.canvas.height;
  const pad = 50, barGap = 12;
  const maxAbs = Math.max(1, ...values.map(v => Math.abs(v)));
  ctx.font = '14px system-ui';
  ctx.strokeStyle = '#e5e7eb'; ctx.beginPath(); ctx.moveTo(pad, h-pad); ctx.lineTo(w-pad, h-pad); ctx.stroke();
  const barW = Math.max(20, (w - pad*2 - barGap*(labels.length-1)) / Math.max(1,labels.length));
  values.forEach((v,i)=>{
    const x = pad + i*(barW+barGap);
    const bh = Math.abs(v)/maxAbs*(h-pad*2-20);
    const y = h - pad - bh;
    ctx.fillStyle = v < 0 ? '#dc2626' : '#0f766e';
    ctx.fillRect(x, y, barW, bh);
    ctx.fillStyle = '#111827';
    ctx.fillText(short(labels[i],14), x, h-pad+20);
    ctx.fillText(suffix === '$' ? compactMoney(v) : `${Math.round(v)}%`, x, y-6);
  });
}
function short(text,n){ return text.length > n ? text.slice(0,n-1)+'…' : text; }
function compactMoney(v){ return new Intl.NumberFormat('es-CO',{notation:'compact', maximumFractionDigits:1}).format(v); }
function escapeHtml(value){ return String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c])); }

// ===== Guardado multi-empresa =====
async function savePlan(){
  collectFormState();
  try {
    if(!companyId){
      if(!state.company.name) return alert('Escribe el nombre de la empresa en el Paso 1 antes de guardar.');
      const created = await api('/api/companies', { method:'POST', body: JSON.stringify(state.company) });
      companyId = created.company_id;
      companies.push({ id: companyId, name: state.company.name, role: 'owner' });
      localStorage.setItem('pm_company_id', companyId);
      renderCompanySelect();
    }
    await api('/api/plan/save', { method:'POST', body: JSON.stringify({ company_id: companyId, plan: state }) });
    localStorage.setItem(cacheKey(), JSON.stringify(state));
    alert('Plan guardado correctamente.');
  } catch(err){
    if(err.status === 401){ showAuth(); return; }
    alert(err.message);
  }
}
async function loadDemo(){
  const demo = await api('/api/demo');
  state = { ...emptyState(), ...demo };
  localStorage.setItem(cacheKey(), JSON.stringify(state));
  hydrateForms();
  renderAll();
}
function exportJson(){
  collectFormState();
  const blob = new Blob([JSON.stringify(state,null,2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `planeacion_${(state.company.name || 'empresa').replace(/\s+/g,'_')}.json`;
  a.click(); URL.revokeObjectURL(url);
}

init().catch(err => alert(`Error inicializando: ${err.message}`));
