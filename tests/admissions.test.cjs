const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'admissions-data.json'), 'utf8'));
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const storage = new Map();
const context = vm.createContext({
  localStorage: { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
  document: { querySelector: () => null }
});
// Load application functions without starting DOM listeners or network requests.
vm.runInContext(app.slice(0, app.indexOf("$('#prevMonth').addEventListener")), context);
context.data = data;
vm.runInContext('examOptions = data.rows.map(row => normalizeMethod(row, data.columns, data.sources));', context);
const run = (expression) => JSON.parse(JSON.stringify(vm.runInContext(expression, context)));
const method = (university, name) => `examOptions.find(o => o.university === ${JSON.stringify(university)} && o.method === ${JSON.stringify(name)})`;

test('all 31 universities and 84 methods have valid, ordered 2027 stages', () => {
  vm.runInContext('validateAdmissionsData(examOptions, data.coverage)', context);
  assert.equal(data.rows.length, 84);
  for (const row of data.rows) {
    assert.equal(row.length, data.columns.length);
    const option = run(method(row[0], row[2]));
    for (const [stage, dates] of Object.entries(option.stages)) {
      assert.equal(new Set(dates).size, dates.length);
      assert.deepEqual(dates, [...dates].sort());
      for (const date of dates) assert.equal(new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10), date);
      if (['firstResult', 'second', 'final'].includes(stage) || stage === 'first' && !option.commonTest) assert.ok(dates.length, `${row[0]} ${row[2]} ${stage} is missing`);
    }
    const { first, firstResult, second, final } = option.stages;
    if (first.length) assert.ok(first.at(-1) <= firstResult[0]);
    assert.ok(firstResult[0] <= second[0]);
    assert.ok(second.at(-1) <= final[0]);
  }
});

test('Nippon Medical School creates second-stage events only on February 10 and 12', () => {
  const expression = method('日本医科大学', '一般前期');
  assert.deepEqual(run(`${expression}.stages.second`), ['2027-02-10', '2027-02-12']);
  assert.equal(run(`flattenOption(${expression}).some(e => e.date === '2027-02-11')`), false);
  assert.equal(run(`formatStage(${expression}, 'second')`), '2/10(水)・2/12(金)');
  assert.deepEqual(run(`${expression}.stageTimes`), { firstResult: '18:00', final: '12:00' });
});

test('newly published result dates are generated for both Tokai exam days', () => {
  for (const name of ['一般①', '一般②']) {
    const option = run(method('東海大学', name));
    assert.deepEqual(option.stages.firstResult, ['2027-02-07']);
    assert.deepEqual(option.stages.final, ['2027-02-18']);
    assert.deepEqual(option.stageTimes, { firstResult: '09:30', final: '09:30' });
  }
});

test('Juntendo B keeps both required second-stage days and its later result schedule', () => {
  const option = run(method('順天堂大学', '一般B方式'));
  assert.deepEqual(option.stages.second, ['2027-03-02', '2027-03-03']);
  assert.deepEqual(option.stages.firstResult, ['2027-02-20']);
  assert.deepEqual(option.stages.final, ['2027-03-06']);
  assert.match(option.note, /両日/);
});

test('every new method has an official source and the correct checked date', () => {
  const oldNames = new Set(JSON.parse(fs.readFileSync(path.join(root, 'tests/original-methods.json'), 'utf8')).map(pair => pair.join('|')));
  for (const option of run('examOptions')) {
    if (!oldNames.has(`${option.university}|${option.method}`)) assert.ok(option.source);
    if (option.source) {
      assert.equal(new URL(option.source.url).protocol, 'https:');
      assert.equal(option.source.checkedOn, '2026-10-15');
    }
  }
  for (const source of Object.values(data.sources)) {
    assert.equal(new URL(source.url).protocol, 'https:');
    assert.equal(source.checkedOn, '2026-10-15');
  }
  assert.equal(run(`${method('日本医科大学', '一般前期')}.source.url`), data.sources['日本医科大学'].url);
});

test('saved current selections, legacy selections and per-method memos survive migration', () => {
  const id = run(`${method('日本医科大学', '一般前期')}.id`);
  storage.set('medExamSelectedOptions2027', JSON.stringify([id, 'jikei']));
  vm.runInContext(`optionMemos = { [${JSON.stringify(id)}]: '保存済みメモ', jikei: '以前のメモ' }; migrateStoredData();`, context);
  assert.deepEqual(JSON.parse(storage.get('medExamSelectedOptions2027')), [id, run(`${method('東京慈恵会医科大学', '一般')}.id`)]);
  const memos = JSON.parse(storage.get('medExamOptionMemos2027'));
  assert.equal(memos[id], '保存済みメモ');
  assert.equal(memos[run(`${method('東京慈恵会医科大学', '一般')}.id`)], '以前のメモ');
});

test('common-test-only and combined routes generate the required January and individual exam events', () => {
  const pure = method('北里大学', '共通テスト利用（後期）');
  assert.deepEqual(run(`${pure}.stages.common`), ['2027-01-16', '2027-01-17']);
  assert.deepEqual(run(`${pure}.stages.first`), []);
  const combined = method('関西医科大学', '共通テスト・一般併用');
  assert.deepEqual(run(`${combined}.stages.common`), ['2027-01-16', '2027-01-17']);
  assert.deepEqual(run(`${combined}.stages.first`), ['2027-02-02']);
  assert.deepEqual(run(`flattenOption(${combined}).filter(e => e.stage === 'common').map(e => [e.date, e.label, e.type])`), [['2027-01-16', '共通テスト', 'first'], ['2027-01-17', '共通テスト', 'first']]);
});

test('IUHW common-test second-stage exams never fill the intervening days', () => {
  const expression = method('国際医療福祉大学', '共通テスト利用');
  assert.deepEqual(run(`${expression}.stages.second`), ['2027-02-16', '2027-02-20']);
  for (const day of ['17', '18', '19']) assert.equal(run(`flattenOption(${expression}).some(e => e.date === '2027-02-${day}')`), false);
});

test('required essays and conditional second-stage exams retain their distinct labels', () => {
  const essay = run(`flattenOption(${method('東京医科大学', '共通テスト利用')}).find(e => e.date === '2027-02-06')`);
  assert.equal(essay.label, '小論文（必須）');
  assert.equal(essay.type, 'second');
  const reserve = run(`flattenOption(${method('大阪医科薬科大学', '一般前期')}).find(e => e.date === '2027-03-03')`);
  assert.equal(reserve.label, '二次試験（繰上合格候補対象者のみ）');
  assert.equal(reserve.type, 'second');
});

test('old combined UOEH selection and memo migrate to A and B without adding the common test to B', () => {
  const oldId = run("stableId('産業医科大学','一般A・B')");
  storage.set('medExamSelectedOptions2027', JSON.stringify([oldId]));
  vm.runInContext(`optionMemos = { [${JSON.stringify(oldId)}]: '引き継ぐメモ' }; migrateStoredData();`, context);
  const a = run(method('産業医科大学', '一般A'));
  const b = run(method('産業医科大学', '一般B'));
  assert.deepEqual(JSON.parse(storage.get('medExamSelectedOptions2027')), [a.id, b.id]);
  const memos = JSON.parse(storage.get('medExamOptionMemos2027'));
  assert.equal(memos[a.id], '引き継ぐメモ');
  assert.equal(memos[b.id], '引き継ぐメモ');
  assert.deepEqual(a.stages.common, ['2027-01-16', '2027-01-17']);
  assert.deepEqual(b.stages.common, []);
});

test('original method identities remain selectable after the expansion', () => {
  const pairs = JSON.parse(fs.readFileSync(path.join(root, 'tests/original-methods.json'), 'utf8'));
  for (const [university, name] of pairs) {
    if (university === '産業医科大学' && name === '一般A・B') continue;
    assert.ok(run(`Boolean(${method(university, name)})`), `${university} ${name} disappeared`);
  }
});
