const $ = (id) => document.getElementById(id);
const money = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const number = new Intl.NumberFormat('es-CO');

const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const panels = [
  ['empresa', '1. Empresa'], ['circulo', '2. Círculo dorado'], ['diagnostico', '3. Diagnóstico'], ['foda', '4. FODA'],
  ['pestel', '5. PESTEL'], ['objetivos', '6. SMART'], ['estrategias', '7. Estrategias'], ['presupuesto', '8. Presupuesto'],
  ['kpis', '9. KPIs'], ['seguimiento', '10. Seguimiento'], ['dashboard', '11. Dashboard'],
  ['datos', '12. Datos'], ['reportes', '13. Reportes']
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
    meetings: [],
    datasets: { sales: [], expenses: [], inventory: [] }
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
  const resetToken = new URLSearchParams(location.search).get('reset');
  if(resetToken){
    showAuth();
    showAuthView('reset');
    return;
  }
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

function authInfo(message){
  const el = $('authInfo');
  el.textContent = message || '';
  el.hidden = !message;
}

function showAuthView(view){
  $('loginForm').hidden = view !== 'login';
  $('registerForm').hidden = view !== 'register';
  $('forgotForm').hidden = view !== 'forgot';
  $('resetForm').hidden = view !== 'reset';
  $('linkForgot').hidden = view !== 'login';
  $('tabLogin').classList.toggle('active', view === 'login');
  $('tabRegister').classList.toggle('active', view === 'register');
  authError(''); authInfo('');
}

function busy(form, isBusy){
  form.querySelectorAll('button').forEach(b => b.disabled = isBusy);
}

function bindAuthEvents(){
  $('tabLogin').onclick = () => showAuthView('login');
  $('tabRegister').onclick = () => showAuthView('register');
  $('linkForgot').onclick = () => showAuthView('forgot');
  $('backToLogin').onclick = () => showAuthView('login');
  $('loginForm').onsubmit = async (e) => {
    e.preventDefault(); authError('');
    busy(e.target, true);
    try {
      const session = await api('/api/auth/login', { method:'POST', body: JSON.stringify({ email: $('loginEmail').value, password: $('loginPassword').value }) });
      boot(session);
    } catch(err){ authError(err.message); }
    finally { busy(e.target, false); }
  };
  $('registerForm').onsubmit = async (e) => {
    e.preventDefault(); authError('');
    busy(e.target, true);
    const email = $('registerEmail').value, password = $('registerPassword').value;
    try {
      const session = await api('/api/auth/register', { method:'POST', body: JSON.stringify({ name: $('registerName').value, email, password }) });
      boot(session);
    } catch(err){
      if(err.status === 409){
        // La cuenta ya existe: intentamos entrar con esas credenciales
        try {
          const session = await api('/api/auth/login', { method:'POST', body: JSON.stringify({ email, password }) });
          boot(session);
        } catch {
          authError('Ese correo ya tiene cuenta. Inicia sesión o usa "¿Olvidaste tu contraseña?".');
          showAuthView('login');
          $('loginEmail').value = email;
          authError('Ese correo ya tiene cuenta. Inicia sesión o recupera tu contraseña.');
        }
      } else {
        authError(err.message);
      }
    }
    finally { busy(e.target, false); }
  };
  $('forgotForm').onsubmit = async (e) => {
    e.preventDefault(); authError('');
    busy(e.target, true);
    try {
      const res = await api('/api/auth/forgot', { method:'POST', body: JSON.stringify({ email: $('forgotEmail').value }) });
      authInfo(res.message || 'Si el correo está registrado, enviamos un enlace de recuperación.');
    } catch(err){ authError(err.message); }
    finally { busy(e.target, false); }
  };
  $('resetForm').onsubmit = async (e) => {
    e.preventDefault(); authError('');
    busy(e.target, true);
    try {
      const token = new URLSearchParams(location.search).get('reset');
      const session = await api('/api/auth/reset', { method:'POST', body: JSON.stringify({ token, password: $('resetPassword').value }) });
      history.replaceState(null, '', location.pathname);
      boot(session);
    } catch(err){ authError(err.message); }
    finally { busy(e.target, false); }
  };
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
  if(panel === 'reportes') setTimeout(renderReports, 50);
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
  $('btnProcessData').onclick = processDataFile;
  $('btnTplVentas').onclick = () => downloadTemplate('sales');
  $('btnTplGastos').onclick = () => downloadTemplate('expenses');
  $('btnTplInventario').onclick = () => downloadTemplate('inventory');
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
  renderDataStatus();
  renderReports();
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

// ===== Carga de datos Excel/CSV =====
const DATASET_DEFS = {
  sales: {
    label: 'Ventas',
    fields: {
      fecha: ['fecha','date','dia','fecha_venta','fecha_de_venta'],
      producto: ['producto','articulo','item','descripcion','product','plato','servicio'],
      categoria: ['categoria','category','linea','rubro','familia'],
      cantidad: ['cantidad','unidades','qty','cant','cantidad_vendida'],
      precio: ['precio','precio_unitario','precio_venta','pu','valor_unitario'],
      costo: ['costo','costo_unitario','cu','costo_unit'],
      total: ['total','venta_total','importe','valor_total','monto_total','valor'],
      canal: ['canal','channel','medio','punto_venta','sucursal'],
      cliente: ['cliente','customer','comprador']
    },
    required: ['fecha','producto'],
    template: 'fecha,producto,categoria,cantidad,precio,costo,canal\n2026-07-01,Producto ejemplo,Categoria A,3,25000,11000,Local',
    filename: 'plantilla_ventas.csv'
  },
  expenses: {
    label: 'Gastos',
    fields: {
      fecha: ['fecha','date','dia'],
      categoria: ['categoria','category','rubro','tipo','tipo_gasto'],
      concepto: ['concepto','detalle','descripcion','gasto','proveedor'],
      monto: ['monto','valor','importe','total','costo'],
      area: ['area','departamento','centro_costo']
    },
    required: ['fecha','monto'],
    template: 'fecha,categoria,concepto,monto,area\n2026-07-02,Servicios,Energia electrica,850000,Operaciones',
    filename: 'plantilla_gastos.csv'
  },
  inventory: {
    label: 'Inventario',
    fields: {
      producto: ['producto','articulo','item','descripcion','insumo','material'],
      categoria: ['categoria','category','linea','familia'],
      stock: ['stock','existencias','cantidad','unidades','inventario'],
      costo: ['costo','costo_unitario','cu','costo_promedio'],
      precio: ['precio','precio_venta','pv'],
      minimo: ['stock_minimo','minimo','min','punto_reorden','stock_min']
    },
    required: ['producto','stock'],
    template: 'producto,categoria,stock,costo,precio,stock_minimo\nInsumo ejemplo,Insumos,12,18000,0,5',
    filename: 'plantilla_inventario.csv'
  }
};

function normKey(s){ return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,''); }

function mapHeaders(row, def){
  const map = {};
  Object.keys(row).forEach(h => {
    const n = normKey(h);
    for(const [field, aliases] of Object.entries(def.fields)){
      if(!(field in map) && aliases.includes(n)) map[field] = h;
    }
  });
  return map;
}

function toIsoDate(v){
  if(v instanceof Date && !isNaN(v)) return v.toISOString().slice(0,10);
  const s = String(v||'').trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if(m) return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
  m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if(m){
    let d = +m[1], mo = +m[2], y = +m[3];
    if(mo > 12){ const t = d; d = mo; mo = t; } // formato mm/dd detectado
    if(y < 100) y += 2000;
    return `${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  }
  return '';
}

function toNum(v){
  if(typeof v === 'number') return isFinite(v) ? v : 0;
  let s = String(v||'').replace(/[^0-9,.\-]/g,'');
  if(!s) return 0;
  const lastComma = s.lastIndexOf(','), lastDot = s.lastIndexOf('.');
  if(lastComma > -1 && lastDot > -1){
    s = lastComma > lastDot ? s.replace(/\./g,'').replace(',', '.') : s.replace(/,/g,'');
  } else if(lastComma > -1){
    const dec = s.length - lastComma - 1;
    s = (s.split(',').length === 2 && dec >= 1 && dec <= 2) ? s.replace(',', '.') : s.replace(/,/g,'');
  } else if(lastDot > -1){
    const dec = s.length - lastDot - 1;
    s = (s.split('.').length === 2 && dec >= 1 && dec <= 2) ? s : s.replace(/\./g,'');
  }
  return Number(s) || 0;
}

async function processDataFile(){
  const fileInput = $('dataFile');
  const tipo = $('dataType').value;
  const def = DATASET_DEFS[tipo];
  const status = (msg, cls) => { $('dataStatusMsg').innerHTML = `<div class="recommendation ${cls||''}">${msg}</div>`; };
  const file = fileInput.files[0];
  if(!file) return status('Selecciona primero un archivo Excel (.xlsx) o CSV.', 'alert-warn');
  if(typeof XLSX === 'undefined') return status('No se pudo cargar el lector de Excel. Revisa tu conexión a internet y recarga la página.', 'alert-bad');
  try {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
    if(!rows.length) return status('El archivo está vacío o no tiene encabezados en la primera fila.', 'alert-bad');
    const map = mapHeaders(rows[0], def);
    const missing = def.required.filter(f => !(f in map));
    if(missing.length) return status(`No encontré las columnas obligatorias: <strong>${missing.join(', ')}</strong>. Columnas detectadas: ${Object.keys(rows[0]).map(escapeHtml).join(', ')}. Descarga la plantilla para ver el formato esperado.`, 'alert-bad');
    const MAX = 10000;
    const clean = rows.slice(0, MAX).map(r => {
      const o = {};
      Object.entries(map).forEach(([field, col]) => { o[field] = r[col]; });
      if('fecha' in o) o.fecha = toIsoDate(o.fecha);
      ['cantidad','precio','costo','total','monto','stock','minimo'].forEach(k => { if(k in o) o[k] = toNum(o[k]); });
      Object.keys(o).forEach(k => { if(typeof o[k] === 'string') o[k] = o[k].trim(); });
      return o;
    }).filter(r => Object.values(r).some(v => v !== '' && v !== 0 && v !== null && v !== undefined));
    if(!state.datasets) state.datasets = { sales: [], expenses: [], inventory: [] };
    state.datasets[tipo] = clean;
    fileInput.value = '';
    persist();
    status(`✅ ${fmtNum(clean.length)} registros de ${def.label} cargados${rows.length > MAX ? ` (se limitó a ${fmtNum(MAX)})` : ''}. Revisa el paso 13 (Reportes) y pulsa <strong>Guardar</strong> para conservarlos en el servidor.`, 'alert-good');
  } catch(err){
    status('Error leyendo el archivo: ' + escapeHtml(err.message), 'alert-bad');
  }
}

function downloadTemplate(tipo){
  const def = DATASET_DEFS[tipo];
  const blob = new Blob(['﻿' + def.template], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = def.filename;
  a.click(); URL.revokeObjectURL(url);
}

function renderDataStatus(){
  const el = $('dataStatus'); if(!el) return;
  el.innerHTML = Object.entries(DATASET_DEFS).map(([key, def]) => {
    const n = ((state.datasets || {})[key] || []).length;
    return `<div class="kpi-card"><small>${def.label}</small><strong>${fmtNum(n)}</strong><span>registros cargados${n ? ` · <span class="delete" onclick="clearDataset('${key}')">Borrar</span>` : ''}</span></div>`;
  }).join('');
}
function clearDataset(key){
  if(!state.datasets) state.datasets = { sales: [], expenses: [], inventory: [] };
  state.datasets[key] = [];
  persist();
}
window.clearDataset = clearDataset;

// ===== Reportes de ventas, rentabilidad, gastos e inventario =====
function salesRows(){ return ((state.datasets || {}).sales) || []; }

function salesSummary(){
  const rows = salesRows();
  let total = 0, cost = 0, units = 0;
  const byMonth = {}, byProduct = {}, byChannel = {};
  rows.forEach(r => {
    const qty = Number(r.cantidad) || 1;
    const t = Number(r.total) || qty * (Number(r.precio) || 0);
    const c = (Number(r.costo) || 0) * qty;
    total += t; cost += c; units += qty;
    const m = (r.fecha || '').slice(0,7) || 'Sin fecha';
    byMonth[m] = (byMonth[m] || 0) + t;
    const p = r.producto || 'Sin producto';
    byProduct[p] = byProduct[p] || { venta: 0, costo: 0, unidades: 0 };
    byProduct[p].venta += t; byProduct[p].costo += c; byProduct[p].unidades += qty;
    if(r.canal) byChannel[r.canal] = (byChannel[r.canal] || 0) + t;
  });
  return {
    total, cost, units, byMonth, byProduct, byChannel,
    margin: total - cost,
    marginPct: total ? Math.round((total - cost) / total * 100) : 0,
    ticket: units ? total / units : 0,
    count: rows.length
  };
}

function expensesSummary(){
  const rows = ((state.datasets || {}).expenses) || [];
  let total = 0; const byCat = {}, byMonth = {};
  rows.forEach(r => {
    const m = Number(r.monto) || 0; total += m;
    const c = r.categoria || r.concepto || 'Otros';
    byCat[c] = (byCat[c] || 0) + m;
    const mo = (r.fecha || '').slice(0,7) || 'Sin fecha';
    byMonth[mo] = (byMonth[mo] || 0) + m;
  });
  return { total, byCat, byMonth, count: rows.length };
}

function inventorySummary(){
  const rows = ((state.datasets || {}).inventory) || [];
  let value = 0; const low = [];
  const sold = {};
  salesRows().forEach(r => { const p = normKey(r.producto || ''); if(p) sold[p] = (sold[p] || 0) + (Number(r.cantidad) || 1); });
  const months = new Set(salesRows().map(r => (r.fecha || '').slice(0,7)).filter(Boolean)).size || 1;
  const items = rows.map(r => {
    const stock = Number(r.stock) || 0;
    const val = stock * (Number(r.costo) || 0);
    value += val;
    const vendidas = sold[normKey(r.producto || '')] || 0;
    const ventaDiaria = (vendidas / months) / 30;
    const diasInv = ventaDiaria > 0 ? Math.round(stock / ventaDiaria) : null;
    const isLow = r.minimo !== undefined && r.minimo !== '' && stock <= (Number(r.minimo) || 0);
    if(isLow) low.push(r);
    return { ...r, valor: val, vendidas, diasInv, isLow };
  });
  return { value, low, items, count: rows.length };
}

function renderReports(){
  const el = $('reportKpis'); if(!el) return;
  const s = salesSummary(), g = expensesSummary(), inv = inventorySummary();
  const anyData = s.count || g.count || inv.count;
  const net = s.margin - g.total;
  el.innerHTML = [
    ['Ventas totales', money.format(s.total), `${fmtNum(s.count)} registros · ${fmtNum(s.units)} unidades`],
    ['Utilidad bruta', money.format(s.margin), `Margen bruto ${s.marginPct}%`],
    ['Gastos totales', money.format(g.total), `${fmtNum(g.count)} registros de gasto`],
    ['Utilidad neta aprox.', money.format(net), 'Utilidad bruta menos gastos cargados'],
    ['Ticket promedio', money.format(s.ticket), 'Venta promedio por unidad'],
    ['Valor de inventario', money.format(inv.value), `${inv.low.length} producto(s) para reponer`]
  ].map(([t,v,c]) => `<div class="kpi-card"><small>${t}</small><strong>${v}</strong><span>${c}</span></div>`).join('');

  const prods = Object.entries(s.byProduct)
    .map(([p, v]) => ({ p, ...v, margen: v.venta - v.costo, pct: v.venta ? Math.round((v.venta - v.costo) / v.venta * 100) : 0 }))
    .sort((a,b) => b.venta - a.venta);
  $('topProductsTable').innerHTML = prods.length
    ? table(['Producto','Unidades','Ventas','Costo','Utilidad','Margen'], prods.slice(0,10).map(r => [escapeHtml(r.p), fmtNum(r.unidades), money.format(r.venta), money.format(r.costo), money.format(r.margen), r.costo ? badge(r.pct, r.pct + '%') : '<span class="badge">Sin costo</span>']))
    : '<div class="empty">Carga tu archivo de ventas en el Paso 12 para ver la rentabilidad por producto.</div>';

  const canales = Object.entries(s.byChannel).sort((a,b) => b[1] - a[1]);
  $('channelTable').innerHTML = canales.length
    ? table(['Canal','Ventas','% del total'], canales.map(([c,v]) => [escapeHtml(c), money.format(v), Math.round(v / Math.max(1, s.total) * 100) + '%']))
    : '<div class="empty">Tu archivo de ventas no incluye la columna "canal".</div>';

  const cats = Object.entries(g.byCat).sort((a,b) => b[1] - a[1]);
  $('expensesTable').innerHTML = cats.length
    ? table(['Categoría','Gasto','% de las ventas'], cats.map(([c,v]) => [escapeHtml(c), money.format(v), s.total ? Math.round(v / s.total * 100) + '%' : '—']))
    : '<div class="empty">Carga tu archivo de gastos en el Paso 12 para ver este reporte.</div>';

  const invItems = inv.items.sort((a,b) => (b.isLow ? 1 : 0) - (a.isLow ? 1 : 0) || b.valor - a.valor);
  $('inventoryTable').innerHTML = inv.count
    ? table(['Producto','Stock','Mínimo','Valor a costo','Vendidas','Días de inventario','Estado'], invItems.slice(0,15).map(r => [
        escapeHtml(r.producto || ''), fmtNum(r.stock), (r.minimo !== undefined && r.minimo !== '') ? fmtNum(r.minimo) : '—',
        money.format(r.valor), fmtNum(r.vendidas), r.diasInv !== null && r.diasInv !== undefined ? r.diasInv + ' días' : '—',
        r.isLow ? '<span class="badge bad">Reponer</span>' : '<span class="badge good">OK</span>'
      ]))
    : '<div class="empty">Carga tu archivo de inventario en el Paso 12 para ver este reporte.</div>';

  if(anyData) drawReportCharts(s, g);
}

function drawReportCharts(s, g){
  const c1 = $('salesChart');
  if(c1){
    const ctx = c1.getContext('2d');
    ctx.clearRect(0, 0, c1.width, c1.height);
    const ms = Object.keys(s.byMonth).sort();
    if(ms.length) drawBarChart(ctx, ms, ms.map(m => s.byMonth[m]), '$');
  }
  const c2 = $('expensesChart');
  if(c2){
    const ctx = c2.getContext('2d');
    ctx.clearRect(0, 0, c2.width, c2.height);
    const cats = Object.entries(g.byCat).sort((a,b) => b[1] - a[1]).slice(0, 8);
    if(cats.length) drawBarChart(ctx, cats.map(c => c[0]), cats.map(c => c[1]), '$');
  }
}

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
