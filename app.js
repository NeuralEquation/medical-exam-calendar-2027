const $ = (selector) => document.querySelector(selector);
const DATA_URL = './admissions-data.json';
const months = [0, 1, 2];
const typeLabels = { first: '一次試験', second: '二次試験', result: '合格発表', custom: 'その他' };
const stageOrder = ['common', 'first', 'firstResult', 'extra', 'second', 'final'];
const stageLabels = { common: '共通テスト', first: '一次試験', firstResult: '一次発表', extra: '個別試験', second: '二次試験', final: '合格発表' };
const stageShortLabels = { common: '共テ', first: '1次', firstResult: '1次発表', extra: '個別', second: '2次', final: '合格発表' };
const stageTypes = { common: 'first', first: 'first', firstResult: 'result', extra: 'second', second: 'second', final: 'result' };
const universityOrder = {
  '東北・北海道': ['岩手医科大学', '東北医科薬科大学'],
  '関東': ['慶應義塾大学', '順天堂大学', '自治医科大学', '国際医療福祉大学', '昭和医科大学', '東邦大学', '埼玉医科大学', '北里大学', '獨協医科大学', '杏林大学', '東京慈恵会医科大学', '東京女子医科大学', '日本医科大学', '東京医科大学', '日本大学', '聖マリアンナ医科大学', '東海大学', '帝京大学'],
  '北陸・中部': ['金沢医科大学', '愛知医科大学', '藤田医科大学'],
  '関西': ['大阪医科薬科大学', '近畿大学', '関西医科大学', '兵庫医科大学'],
  '中国': ['川崎医科大学'],
  '九州': ['久留米大学', '福岡大学', '産業医科大学']
};

const legacySelectionTargets = {
  teikyo1: [['帝京大学', '一般①']], teikyo2: [['帝京大学', '一般②']], teikyo3: [['帝京大学', '一般③']],
  jichi: [['自治医科大学', '一般']], kokufuku: [['国際医療福祉大学', '一般']], women: [['東京女子医科大学', '一般']],
  nihon1: [['日本大学', '一般（N方式第1期）']], kitasato: [['北里大学', '一般']], kyorin: [['杏林大学', '一般前期']],
  tokai: [['東海大学', '一般①'], ['東海大学', '一般②']], juntendo: [['順天堂大学', '一般A方式'], ['順天堂大学', '一般B方式']],
  saitama: [['埼玉医科大学', '一般前期']], marianna: [['聖マリアンナ医科大学', '一般前期']], 'tokyo-med': [['東京医科大学', '一般']],
  tohoku: [['東北医科薬科大学', '一般']], kanazawa1: [['金沢医科大学', '一般前期①']], kanazawa2: [['金沢医科大学', '一般前期②']],
  fujita: [['藤田医科大学', '一般']], showa: [['昭和医科大学', '一般Ⅰ期']], kinki: [['近畿大学', '一般前期']],
  kansai: [['関西医科大学', '一般前期']], 'hyogo-a': [['兵庫医科大学', '一般A']], 'hyogo-b': [['兵庫医科大学', '一般B']],
  kawasaki: [['川崎医科大学', '一般']], kurume: [['久留米大学', '一般']], fukuoka: [['福岡大学', '一般']],
  iwate: [['岩手医科大学', '一般']], keio: [['慶應義塾大学', '一般']], toho: [['東邦大学', '一般']],
  dokkyo: [['獨協医科大学', '一般前期①'], ['獨協医科大学', '一般前期②'], ['獨協医科大学', '一般後期']],
  jikei: [['東京慈恵会医科大学', '一般']], 'nippon-med': [['日本医科大学', '一般前期'], ['日本医科大学', '一般後期']],
  aichi: [['愛知医科大学', '一般']], 'osaka-med': [['大阪医科薬科大学', '一般前期'], ['大阪医科薬科大学', '一般後期']],
  sangyo: [['産業医科大学', '一般A'], ['産業医科大学', '一般B'], ['産業医科大学', '一般C']],
  [stableId('産業医科大学', '一般A・B')]: [['産業医科大学', '一般A'], ['産業医科大学', '一般B']]
};

let examOptions = [];
let officialEvents = [];
let currentMonth = 0;
let selectedDate = '2027-01-21';
let activeFilter = 'all';
let customEvents = readJSON('medExamCustomEvents2027', []);
let selectedOptions = new Set();
let showAll = localStorage.getItem('medExamShowAll2027') !== 'false';
let optionMemos = readJSON('medExamOptionMemos2027', {});

function readJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

function stableId(university, method) {
  const text = `${university}|${method}`;
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `m-${(hash >>> 0).toString(36)}`;
}

function normalizeDate(value) {
  if (!value) return null;
  const match = String(value).match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (!match) throw new Error(`日付形式が不正です: ${value}`);
  return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function expandRange(start, end) {
  if (!start) return [];
  const first = new Date(`${start}T12:00:00`);
  const last = new Date(`${end || start}T12:00:00`);
  const dates = [];
  for (const cursor = new Date(first); cursor <= last; cursor.setDate(cursor.getDate() + 1)) dates.push(dateKey(cursor));
  return dates;
}

function normalizeMethod(row, columns, sources = {}) {
  const source = Object.fromEntries(columns.map((column, index) => [column, row[index]]));
  const firstStart = normalizeDate(source.firstStart);
  const firstEnd = normalizeDate(source.firstEnd);
  const secondStart = normalizeDate(source.secondStart);
  const secondEnd = normalizeDate(source.secondEnd);
  const commonDates = (source.commonDates || []).map(normalizeDate);
  const additionalTests = (source.additionalTests || []).map((test) => ({ ...test, date: normalizeDate(test.date) }));
  return {
    id: stableId(source.university, source.method),
    university: source.university,
    region: source.region,
    method: source.method,
    shortName: source.shortName,
    stages: {
      common: commonDates,
      first: expandRange(firstStart, firstEnd),
      firstResult: source.firstResult ? [normalizeDate(source.firstResult)] : [],
      extra: additionalTests.map((test) => test.date),
      second: source.secondDates ? source.secondDates.map(normalizeDate) : expandRange(secondStart, secondEnd),
      final: source.secondResult ? [normalizeDate(source.secondResult)] : []
    },
    stageTimes: { firstResult: source.firstResultTime || '', final: source.secondResultTime || '' },
    firstVenue: source.firstVenue || '',
    secondVenue: source.secondVenue || '',
    note: source.note || '',
    additionalTests,
    source: source.sourceUrl ? { url: source.sourceUrl, checkedOn: source.sourceCheckedOn } : sources[source.university] || null,
    commonTest: commonDates.length > 0 && !firstStart
  };
}

function validateAdmissionsData(options, coverage = null) {
  const universities = new Set(options.map((option) => option.university));
  const ids = new Set(options.map((option) => option.id));
  if (!options.length) throw new Error('入試方式がありません');
  if (coverage && (options.length !== coverage.methods || universities.size !== coverage.universities)) throw new Error('収録件数と日程データが一致しません');
  if (universities.size !== 31) throw new Error(`大学数が31校ではありません: ${universities.size}`);
  if (ids.size !== options.length) throw new Error('入試方式キーが重複しています');
  for (const option of options) {
    for (const stage of stageOrder) {
      for (const date of option.stages[stage]) {
        if (!/^2027-(01|02|03)-\d{2}$/.test(date)) throw new Error(`範囲外の日付です: ${option.university} ${option.method} ${date}`);
      }
    }
  }
  const regionCounts = Object.fromEntries(Object.keys(universityOrder).map((region) => [region, new Set(options.filter((o) => o.region === region).map((o) => o.university)).size]));
  const expected = { '東北・北海道': 2, '関東': 18, '北陸・中部': 3, '関西': 4, '中国': 1, '九州': 3 };
  for (const [region, count] of Object.entries(expected)) if (regionCounts[region] !== count) throw new Error(`${region}の大学数が不正です`);
}

function findMethodId(university, method) {
  return examOptions.find((option) => option.university === university && option.method === method)?.id;
}

function migrateStoredData() {
  const validIds = new Set(examOptions.map((option) => option.id));
  const storedSelections = readJSON('medExamSelectedOptions2027', []);
  const migratedSelections = new Set();
  for (const storedId of storedSelections) {
    if (validIds.has(storedId)) migratedSelections.add(storedId);
    for (const target of legacySelectionTargets[storedId] || []) {
      const id = findMethodId(target[0], target[1]);
      if (id) migratedSelections.add(id);
    }
  }
  selectedOptions = migratedSelections;
  localStorage.setItem('medExamSelectedOptions2027', JSON.stringify([...selectedOptions]));

  const migratedMemos = { ...optionMemos };
  for (const [legacyId, targets] of Object.entries(legacySelectionTargets)) {
    if (!optionMemos[legacyId]) continue;
    for (const target of targets) {
      const id = findMethodId(target[0], target[1]);
      if (id && !migratedMemos[id]) migratedMemos[id] = optionMemos[legacyId];
    }
  }
  optionMemos = migratedMemos;
  localStorage.setItem('medExamOptionMemos2027', JSON.stringify(optionMemos));
}

function flattenOption(option) {
  return stageOrder.flatMap((stage) => option.stages[stage].map((date) => ({
    id: `${option.id}-${stage}-${date}`,
    optionId: option.id,
    date,
    name: option.shortName,
    university: option.university,
    label: stage === 'extra' ? option.additionalTests.find((test) => test.date === date).label : stageLabels[stage],
    stage,
    type: stageTypes[stage],
    note: option.method,
    custom: false
  })));
}

function allEvents() { return [...officialEvents, ...customEvents]; }

function eventIsVisible(event) {
  if (event.custom) return activeFilter === 'all' || activeFilter === 'custom' || event.type === activeFilter;
  return (showAll || selectedOptions.has(event.optionId)) && (activeFilter === 'all' || event.type === activeFilter);
}

function visibleMethodEvents(date) { return allEvents().filter((event) => event.date === date && eventIsVisible(event)); }

function calendarEvents(date) {
  const groups = new Map();
  for (const event of visibleMethodEvents(date)) {
    if (event.custom) {
      groups.set(`custom:${event.id}`, { ...event, stages: [event.stage || 'custom'] });
      continue;
    }
    const key = `${event.name}|${event.date}`;
    if (!groups.has(key)) groups.set(key, { ...event, stages: [], optionIds: new Set() });
    const group = groups.get(key);
    if (!group.stages.includes(event.stage)) group.stages.push(event.stage);
    group.optionIds.add(event.optionId);
  }
  return [...groups.values()].map((group) => {
    if (group.custom) return group;
    group.stages.sort((a, b) => stageOrder.indexOf(a) - stageOrder.indexOf(b));
    group.type = group.stages.some((stage) => stageTypes[stage] === 'first') ? 'first' : group.stages.some((stage) => stageTypes[stage] === 'second') ? 'second' : 'result';
    return group;
  });
}

function formatDateList(dates, time = '') {
  if (!dates.length) return '未定';
  const format = (value) => {
    const date = new Date(`${value}T12:00:00`);
    return `${date.getMonth() + 1}/${date.getDate()}(${['日', '月', '火', '水', '木', '金', '土'][date.getDay()]})`;
  };
  const consecutive = dates.every((value, index) => !index || new Date(value) - new Date(dates[index - 1]) === 86400000);
  const text = dates.length === 1 ? format(dates[0]) : consecutive ? `${format(dates[0])}〜${format(dates[dates.length - 1])}` : dates.map(format).join('・');
  return time ? `${text} ${time}` : text;
}

function formatStage(option, stage) {
  if (stage === 'extra') return option.additionalTests.map((test) => `${escapeHTML(test.label)} ${formatDateList([test.date])}`).join('<br>');
  return formatDateList(option.stages[stage], option.stageTimes[stage] || '');
}

function calendarEventLabel(event) {
  if (event.custom) return `${event.name}${event.label || ''}`;
  return `${event.name}${event.stages.map((stage) => stageShortLabels[stage]).join('・')}`;
}

function escapeHTML(value) {
  const div = document.createElement('div');
  div.textContent = value ?? '';
  return div.innerHTML;
}

function renderCalendar() {
  const year = 2027;
  const month = months[currentMonth];
  $('#monthTitle').textContent = `${year}年${month + 1}月`;
  $('#prevMonth').disabled = currentMonth === 0;
  $('#nextMonth').disabled = currentMonth === 2;
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  const cells = [];
  for (let index = 0; index < 42; index += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const key = dateKey(date);
    const events = calendarEvents(key);
    const outside = date.getMonth() !== month;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `day${outside ? ' is-outside' : ''}${key === selectedDate ? ' is-selected' : ''}`;
    button.setAttribute('role', 'gridcell');
    button.setAttribute('aria-label', `${date.getMonth() + 1}月${date.getDate()}日、予定${events.length}件`);
    button.innerHTML = `<span class="day-number">${date.getDate()}</span>${events.map((event) => `<span class="event-mini ${event.custom ? 'custom' : event.type}">${escapeHTML(calendarEventLabel(event))}</span>`).join('')}`;
    button.addEventListener('click', () => {
      selectedDate = key;
      if (outside && date.getFullYear() === 2027 && months.includes(date.getMonth())) currentMonth = months.indexOf(date.getMonth());
      renderCalendar();
      renderDetails();
      openDateModal(key);
    });
    cells.push(button);
  }
  $('#calendarGrid').replaceChildren(...cells);
}

function renderDetails() {
  const date = new Date(`${selectedDate}T12:00:00`);
  const events = visibleMethodEvents(selectedDate);
  $('#selectedDay').textContent = date.getDate();
  $('#selectedWeekday').textContent = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
  $('#selectedDate').textContent = `${date.getMonth() + 1}月${date.getDate()}日`;
  $('#dayEvents').innerHTML = events.length ? events.map((event) => `<article class="event-card ${event.custom ? 'custom' : event.type}"><div class="event-card-main"><small class="event-tag">${escapeHTML(event.label || typeLabels[event.type])}</small><b>${escapeHTML(event.name)}</b>${event.note ? `<small>${escapeHTML(event.note)}</small>` : ''}</div>${event.custom ? `<button class="delete-event" type="button" data-delete="${event.id}" aria-label="${escapeHTML(event.name)}を削除">×</button>` : ''}</article>`).join('') : '<div class="empty-state"><strong>表示する予定はありません</strong>大学・入試方式を選ぶか、自分の予定を追加できます。</div>';
  document.querySelectorAll('[data-delete]').forEach((button) => button.addEventListener('click', () => {
    customEvents = customEvents.filter((event) => event.id !== button.dataset.delete);
    localStorage.setItem('medExamCustomEvents2027', JSON.stringify(customEvents));
    renderAll();
  }));
}

function optionCardHTML(option, contextDate = '') {
  const selected = selectedOptions.has(option.id);
  const eventAtDate = contextDate ? flattenOption(option).find((event) => event.date === contextDate) : null;
  const meta = [
    option.firstVenue ? `<div><b>一次会場</b><span>${escapeHTML(option.firstVenue)}</span></div>` : '',
    option.secondVenue ? `<div><b>二次会場</b><span>${escapeHTML(option.secondVenue)}</span></div>` : '',
    option.additionalTests.length ? `<div><b>個別試験</b><span>${formatStage(option, 'extra')}</span></div>` : '',
    option.note ? `<div class="option-note"><b>備考</b><span>${escapeHTML(option.note)}</span></div>` : '',
    option.source ? `<div><b>出典</b><span><a href="${escapeHTML(option.source.url)}" target="_blank" rel="noopener noreferrer">公式入試情報</a>（${escapeHTML(option.source.checkedOn)}確認）</span></div>` : ''
  ].join('');
  return `<article class="exam-option${selected ? ' is-selected' : ''}" data-option-card="${option.id}"><div class="option-top"><label class="option-check"><input type="checkbox" data-option-check="${option.id}" ${selected ? 'checked' : ''}><span><b>${escapeHTML(option.shortName)} ${escapeHTML(option.method)}</b><small>${escapeHTML(option.university)} 医学部</small></span></label>${eventAtDate ? `<span class="option-day-tag">${escapeHTML(eventAtDate.label)}</span>` : ''}</div><div class="stage-flow">${stageOrder.filter((stage) => stage === 'extra' ? false : stage === 'common' ? option.stages.common.length : stage !== 'first' || !option.commonTest).map((stage) => `<div class="stage"><span>${stageLabels[stage]}</span><b>${formatStage(option, stage)}</b></div>`).join('')}</div>${meta ? `<div class="option-meta">${meta}</div>` : ''}<input class="option-memo" data-option-memo="${option.id}" value="${escapeHTML(optionMemos[option.id] || '')}" placeholder="${escapeHTML(option.shortName)} ${escapeHTML(option.method)}のメモ..."></article>`;
}

function bindOptionControls(root = document) {
  root.querySelectorAll('[data-option-check]').forEach((input) => input.addEventListener('change', () => {
    setOptionSelected(input.dataset.optionCheck, input.checked);
    renderAll();
    if (!$('#scheduleModal').hidden) openDateModal(selectedDate);
  }));
  root.querySelectorAll('[data-option-memo]').forEach((input) => input.addEventListener('input', () => {
    optionMemos[input.dataset.optionMemo] = input.value;
    localStorage.setItem('medExamOptionMemos2027', JSON.stringify(optionMemos));
  }));
}

function setOptionSelected(id, checked) {
  if (checked) selectedOptions.add(id); else selectedOptions.delete(id);
  showAll = false;
  localStorage.setItem('medExamSelectedOptions2027', JSON.stringify([...selectedOptions]));
  localStorage.setItem('medExamShowAll2027', 'false');
}

function renderUniversities() {
  const regions = ['東北・北海道', '関東', '北陸・中部', '関西', '中国', '九州'];
  let html = '';
  for (const region of regions) {
    const options = examOptions.filter((option) => option.region === region);
    html += `<section class="region-block"><h3 class="region-title">${region}エリア</h3>`;
    for (const university of universityOrder[region]) {
      const universityOptions = options.filter((option) => option.university === university);
      html += `<article class="university-card"><button class="university-toggle" type="button" aria-expanded="false"><span><em>${universityOptions.length}</em>${escapeHTML(university)} 医学部</span><i>＋</i></button><div class="option-list" hidden>${universityOptions.map((option) => optionCardHTML(option)).join('')}</div></article>`;
    }
    html += '</section>';
  }
  $('#universityList').innerHTML = html;
  document.querySelectorAll('.university-toggle').forEach((button) => button.addEventListener('click', () => {
    const card = button.closest('.university-card');
    const list = card.querySelector('.option-list');
    const open = list.hidden;
    list.hidden = !open;
    card.classList.toggle('is-open', open);
    button.setAttribute('aria-expanded', String(open));
  }));
  bindOptionControls($('#universityList'));
  $('#selectedSummary').innerHTML = `<b>${selectedOptions.size}方式を選択中</b><span>${showAll ? '現在は全大学を表示しています' : '選択方式だけを表示しています'}</span>${selectedOptions.size ? '<button id="clearSelected" type="button">選択をクリア</button>' : ''}`;
  $('#clearSelected')?.addEventListener('click', () => {
    selectedOptions.clear();
    localStorage.setItem('medExamSelectedOptions2027', '[]');
    renderAll();
  });
}

function openDateModal(key) {
  const date = new Date(`${key}T12:00:00`);
  const options = examOptions.filter((option) => flattenOption(option).some((event) => event.date === key));
  $('#modalTitle').textContent = `2027年${date.getMonth() + 1}月${date.getDate()}日 ${['日', '月', '火', '水', '木', '金', '土'][date.getDay()]}曜日`;
  $('#modalCount').textContent = `${options.length}件の入試方式`;
  $('#modalEvents').innerHTML = options.length ? options.map((option) => optionCardHTML(option, key)).join('') : '<div class="no-modal-events">この日に登録された入試日程はありません。</div>';
  $('#scheduleModal').hidden = false;
  document.body.style.overflow = 'hidden';
  bindOptionControls($('#modalEvents'));
  $('#modalClose').focus();
}

function closeModal() { $('#scheduleModal').hidden = true; document.body.style.overflow = ''; }
function renderAll() { $('#showAllToggle').checked = showAll; renderCalendar(); renderDetails(); renderUniversities(); }

async function initAdmissions() {
  const response = await fetch(DATA_URL);
  if (!response.ok) throw new Error(`日程データを読み込めませんでした (${response.status})`);
  const data = await response.json();
  examOptions = data.rows.map((row) => normalizeMethod(row, data.columns, data.sources));
  validateAdmissionsData(examOptions, data.coverage);
  officialEvents = examOptions.flatMap(flattenOption);
  $('#dataCoverage').textContent = `${new Set(examOptions.map((option) => option.university)).size}大学・${examOptions.length}方式。共通テスト利用・併用方式も掲載しています。`;
  migrateStoredData();
  renderAll();
}

function showDataError(error) {
  console.error(error);
  $('#calendarGrid').innerHTML = '<div class="data-error">日程データを読み込めませんでした。ページを再読み込みしてください。</div>';
  $('#universityList').innerHTML = '<div class="data-error">大学一覧を読み込めませんでした。</div>';
}

$('#prevMonth').addEventListener('click', () => { if (currentMonth > 0) { currentMonth -= 1; selectedDate = `2027-${String(currentMonth + 1).padStart(2, '0')}-01`; renderCalendar(); renderDetails(); } });
$('#nextMonth').addEventListener('click', () => { if (currentMonth < 2) { currentMonth += 1; selectedDate = `2027-${String(currentMonth + 1).padStart(2, '0')}-01`; renderCalendar(); renderDetails(); } });
$('#todayButton').addEventListener('click', () => { currentMonth = 0; selectedDate = '2027-01-21'; renderCalendar(); renderDetails(); });
document.querySelectorAll('.filter-chip').forEach((button) => button.addEventListener('click', () => { activeFilter = button.dataset.type; document.querySelectorAll('.filter-chip').forEach((item) => item.classList.toggle('is-active', item === button)); renderCalendar(); renderDetails(); }));
$('#showAllToggle').addEventListener('change', (event) => { showAll = event.target.checked; localStorage.setItem('medExamShowAll2027', String(showAll)); renderAll(); });
$('#modalClose').addEventListener('click', closeModal);
$('#scheduleModal').addEventListener('click', (event) => { if (event.target === $('#scheduleModal')) closeModal(); });
document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !$('#scheduleModal').hidden) closeModal(); });
$('#addFormToggle').addEventListener('click', () => { const fields = $('#addFormFields'); fields.hidden = !fields.hidden; $('#addFormToggle').setAttribute('aria-expanded', String(!fields.hidden)); if (!fields.hidden) $('#customName').focus(); });
$('#addForm').addEventListener('submit', (event) => { event.preventDefault(); const type = $('#customType').value; customEvents.push({ id: `custom-${Date.now()}`, date: selectedDate, name: $('#customName').value.trim(), label: typeLabels[type], type, note: $('#customNote').value.trim(), custom: true }); localStorage.setItem('medExamCustomEvents2027', JSON.stringify(customEvents)); event.target.reset(); $('#addFormFields').hidden = true; renderAll(); });
const memo = $('#memo');
memo.value = localStorage.getItem('medExamMemo2027') || '';
let memoTimer;
memo.addEventListener('input', () => { clearTimeout(memoTimer); $('#saveStatus').textContent = '保存中…'; memoTimer = setTimeout(() => { localStorage.setItem('medExamMemo2027', memo.value); $('#saveStatus').textContent = '保存しました'; }, 350); });
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (event) => { event.preventDefault(); deferredPrompt = event; $('#installButton').hidden = false; });
$('#installButton').addEventListener('click', async () => { if (!deferredPrompt) return; deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; $('#installButton').hidden = true; });
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js'));

initAdmissions().catch(showDataError);
