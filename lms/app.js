/* Nur Academy — Islamic classes LMS prototype.
   Pure JS, data in localStorage. Zoom integration is SIMULATED (see zoomCreateMeeting). */
(function () {
'use strict';

/* ---------- helpers ---------- */
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = p => p + Math.random().toString(36).slice(2, 9);
const DAY = 864e5, MIN = 6e4;
const UR = window.NUR_UR || {SUB:{}, EXACT:{}, PATTERNS:[], INLINE:[], WD:[]};
let LANG = 'en';
try { if (localStorage.getItem('nur-lms.lang') === 'ur') LANG = 'ur'; } catch (e) {}
const loc = () => (LANG === 'ur' ? 'ur-PK' : undefined);
const WD = () => (LANG === 'ur' ? UR.WD : ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']);
const fmtTime = d => LANG === 'ur'
  ? `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() < 12 ? 'صبح' : 'شام'}`
  : d.toLocaleTimeString(undefined, {hour: 'numeric', minute: '2-digit'});
const fmtDate = d => d.toLocaleDateString(loc(), {weekday: 'short', day: 'numeric', month: 'short'});
const sod = d => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const toLocalInput = d => { const x = new Date(d - d.getTimezoneOffset() * MIN); return x.toISOString().slice(0, 16); };
const hijri = d => { try { return new Intl.DateTimeFormat((LANG === 'ur' ? 'ur-PK' : 'en') + '-u-ca-islamic-umalqura', {day:'numeric', month:'long', year:'numeric'}).format(d); } catch (e) { return ''; } };
const initials = n => n.split(' ').filter(w => /^[A-Z]/.test(w)).slice(0, 2).map(w => w[0]).join('');

/* ---------- store ---------- */
const KEY = 'nur-lms.v1';
let db;
function load() { try { db = JSON.parse(localStorage.getItem(KEY)); } catch (e) { db = null; } if (!db) { db = seed(); save(); } }
function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {} }
function resetDemo() { db = seed(); save(); route(); toast('Demo data reset'); }

function seed() {
  const users = [
    {id:'a1', role:'admin',   name:'Br. Omar Farooq (Admin)'},
    {id:'t1', role:'teacher', name:'Ustadh Yusuf Rahman'},
    {id:'t2', role:'teacher', name:'Ustadha Maryam Siddiqui'},
    {id:'t3', role:'teacher', name:'Ustadh Ibrahim Khalil'},
    ...['Aisha Khan','Bilal Ahmed','Fatima Zahra','Hamza Ali','Khadija Noor','Musa Patel','Zainab Hussain','Idris Malik']
      .map((n, i) => ({id:'s' + (i + 1), role:'student', name:n, email:n.split(' ')[0].toLowerCase() + '@example.com'})),
  ];
  const courses = [
    {id:'c1', title:'Tajweed & Quran Recitation', ar:'التجويد', level:'Beginner', teacherId:'t1', color:'#0f4c3a',
      desc:'Correct pronunciation (makharij), rules of noon sakinah, meem sakinah and madd, with weekly recitation practice.', unit:'Rules mastered'},
    {id:'c2', title:'Hifz Circle — Juz Amma', ar:'الحفظ', level:'All levels', teacherId:'t2', color:'#7a5a12',
      desc:'Guided memorisation of Juz Amma with daily revision (muraja\'ah) and weekly sabaq/sabqi/manzil review.', unit:'Surahs memorised'},
    {id:'c3', title:'Arabic Language — Level 1', ar:'اللغة العربية', level:'Beginner', teacherId:'t3', color:'#1d5fa8',
      desc:'Arabic alphabet, connecting letters, basic vocabulary and simple sentences, using the Madinah method.', unit:'Lessons completed'},
    {id:'c4', title:'Fiqh of Worship', ar:'فقه العبادات', level:'Intermediate', teacherId:'t1', color:'#8a3b2a',
      desc:'Practical rulings on purification, salah, fasting and zakah according to the Hanafi/Shafi\'i comparative approach.', unit:'Chapters covered'},
    {id:'c5', title:'Seerah of the Prophet ﷺ', ar:'السيرة النبوية', level:'All levels', teacherId:'t2', color:'#5b3f8c',
      desc:'A chronological study of the life of the Prophet ﷺ — lessons, character and context.', unit:'Lessons completed'},
  ];
  const enroll = {c1:['s1','s2','s3','s4','s7'], c2:['s1','s3','s5','s6'], c3:['s2','s4','s5','s8'], c4:['s1','s2','s6','s7','s8'], c5:['s3','s4','s5','s7','s8']};
  const enrollments = [];
  Object.entries(enroll).forEach(([c, ss]) => ss.forEach(s => enrollments.push({courseId:c, studentId:s})));

  // recurring patterns: [course, weekdays, hh, mm, minutes, label]
  const pat = [['c1',[1,3],18,0,60,'Tajweed'], ['c2',[2,4],6,0,45,'Hifz review'], ['c3',[6],10,0,90,'Arabic'], ['c4',[0],19,0,60,'Fiqh'], ['c5',[5],20,0,60,'Seerah']];
  const sessions = [], attendance = {};
  const now = Date.now(); let r = 7;
  const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
  const zoomIds = {};
  const today = sod(new Date());
  for (let i = -21; i <= 28; i++) {
    const day = addDays(today, i);
    pat.forEach(([cid, days, hh, mm, dur, label]) => {
      if (!days.includes(day.getDay())) return;
      const start = new Date(day); start.setHours(hh, mm, 0, 0);
      const course = courses.find(c => c.id === cid);
      const z = zoomIds[cid] || (zoomIds[cid] = zoomCreateMeeting(course.title));
      const s = {id:uid('x'), courseId:cid, title:label, start:start.toISOString(), duration:dur, teacherId:course.teacherId, zoom:z, status:'scheduled', seriesId:'ser-' + cid};
      if (start.getTime() + dur * MIN < now) {
        s.status = 'completed';
        attendance[s.id] = {};
        enroll[cid].forEach(st => { const x = rnd(); attendance[s.id][st] = x < .74 ? 'present' : x < .86 ? 'late' : x < .94 ? 'absent' : 'excused'; });
      }
      sessions.push(s);
    });
  }
  const progress = {};
  const ex = {c1:['Noon sakinah','Meem sakinah','Madd rules','Qalqalah','Ghunnah'], c2:['An-Naba','An-Nazi\'at','Abasa','At-Takwir','Al-Infitar'], c3:['Lesson 3','Lesson 5','Lesson 2','Lesson 7','Lesson 4'], c4:['Wudu','Ghusl','Salah conditions','Salah pillars','Sujud as-sahw'], c5:['Birth & childhood','Revelation','Makkan period','Hijrah','Badr']};
  enrollments.forEach((e, i) => {
    const pct = Math.round(25 + rnd() * 65);
    progress[e.courseId + ':' + e.studentId] = {pct, current: ex[e.courseId][i % 5], note: pct > 70 ? 'Excellent progress, keep revising.' : pct > 45 ? 'Steady. Needs more practice between classes.' : 'Just getting started — encourage daily practice.'};
  });
  return {v:1, users, courses, enrollments, sessions, attendance, progress, me:'a1'};
}

/* ---------- Zoom (SIMULATED) ----------
   Real integration (server side, Zoom Server-to-Server OAuth):
     POST https://api.zoom.us/v2/users/me/meetings
       {topic, type: 2 (scheduled) | 8 (recurring), start_time, duration, timezone, recurrence, settings:{waiting_room:true}}
     PATCH /meetings/{id}  to reschedule,  DELETE /meetings/{id}  to cancel.
   Here we only fabricate an id/passcode so the UI flow can be demoed. The links below do not point to a real meeting. */
function zoomCreateMeeting(topic) {
  const id = String(Math.floor(1e9 + Math.random() * 9e9));
  const pass = Math.random().toString(36).slice(2, 8);
  return {mode:'demo', meetingId:id, passcode:pass, joinUrl:`https://zoom.us/j/${id}?pwd=${pass}`, topic};
}
function zoomFromUrl(url) {
  const m = /zoom\.[a-z]+\/j\/(\d+)/i.exec(url); const p = /[?&]pwd=([^&]+)/.exec(url);
  return {mode:'manual', meetingId:m ? m[1] : '—', passcode:p ? p[1] : '—', joinUrl:url};
}
const fmtMeetingId = id => String(id).replace(/(\d{3})(\d{3,4})(\d{3,4})?/, (_, a, b, c) => [a, b, c].filter(Boolean).join(' '));

/* ---------- queries ---------- */
const me = () => db.users.find(u => u.id === db.me) || db.users[0];
const user = id => db.users.find(u => u.id === id);
const course = id => db.courses.find(c => c.id === id);
const isStaff = () => me().role !== 'student';
const isAdmin = () => me().role === 'admin';
const enrolled = cid => db.enrollments.filter(e => e.courseId === cid).map(e => user(e.studentId)).filter(Boolean);
const myCourses = () => {
  const u = me();
  if (u.role === 'admin') return db.courses;
  if (u.role === 'teacher') return db.courses.filter(c => c.teacherId === u.id);
  const ids = db.enrollments.filter(e => e.studentId === u.id).map(e => e.courseId);
  return db.courses.filter(c => ids.includes(c.id));
};
const mySessions = () => { const ids = myCourses().map(c => c.id); return db.sessions.filter(s => ids.includes(s.courseId)).sort((a, b) => new Date(a.start) - new Date(b.start)); };
const sEnd = s => new Date(new Date(s.start).getTime() + s.duration * MIN);
const upcoming = () => mySessions().filter(s => s.status === 'scheduled' && sEnd(s) > new Date());
function attRate(studentId, cid) {
  let n = 0, ok = 0;
  db.sessions.forEach(s => {
    if (cid && s.courseId !== cid) return;
    const a = db.attendance[s.id]; if (!a || !a[studentId] || a[studentId] === 'excused') return;
    n++; if (a[studentId] !== 'absent') ok++;
  });
  return n ? Math.round(ok / n * 100) : null;
}
const prog = (cid, sid) => db.progress[cid + ':' + sid] || {pct:0, current:'', note:''};
const courseAvg = cid => { const es = enrolled(cid); return es.length ? Math.round(es.reduce((a, s) => a + prog(cid, s.id).pct, 0) / es.length) : 0; };
function joinState(s) {
  const now = Date.now(), st = new Date(s.start).getTime(), en = sEnd(s).getTime();
  if (s.status === 'cancelled') return 'cancelled';
  if (now > en) return 'ended';
  if (now >= st - 10 * MIN) return 'open';
  return 'soon';
}
function until(s) {
  const ms = new Date(s.start) - Date.now(); if (ms <= 0) return 'now';
  const m = Math.round(ms / MIN); if (m < 60) return `in ${m} min`;
  const h = Math.floor(m / 60); if (h < 24) return `in ${h}h ${m % 60}m`;
  return `in ${Math.round(h / 24)} day${Math.round(h / 24) > 1 ? 's' : ''}`;
}


/* ---------- translation (Urdu) ---------- */
const SUBKEYS = Object.keys(UR.SUB).sort((a, b) => b.length - a.length);
function tr(text) {
  if (LANG !== 'ur' || !text) return text;
  const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(text); if (!m[2]) return text;
  let core = m[2];
  for (const k of SUBKEYS) if (core.includes(k)) core = core.split(k).join(UR.SUB[k]);
  const part = s => {
    const w = /^(\s*)([\s\S]*?)(\s*)$/.exec(s), c = w[2]; if (!c) return s;
    let r = UR.EXACT[c];
    if (r === undefined) for (const [re, fn] of UR.PATTERNS) { const x = re.exec(c); if (x) { r = fn(x, tr); break; } }
    return r === undefined ? s : w[1] + r + w[3];
  };
  let out = part(core);
  if (out === core) {
    const bits = core.split(/(\s*[·—]\s*)/);
    if (bits.length > 1) out = bits.map((b, i) => (i % 2 ? b : part(b))).join('');
  }
  for (const [re, fn] of UR.INLINE) out = out.replace(re, fn);
  return m[1] + out + m[3];
}
const ORIG = new WeakMap(), ORIGA = new WeakMap(), ATTRS = ['placeholder', 'aria-label', 'label'];
function localize(root) {
  if (!root) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {acceptNode: n => n.parentElement && !/^(SCRIPT|STYLE|CODE)$/.test(n.parentElement.tagName) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT});
  const nodes = []; while (w.nextNode()) nodes.push(w.currentNode);
  nodes.forEach(n => { if (!ORIG.has(n)) ORIG.set(n, n.nodeValue); const v = LANG === 'ur' ? tr(ORIG.get(n)) : ORIG.get(n); if (n.nodeValue !== v) n.nodeValue = v; });
  root.querySelectorAll(ATTRS.map(a => '[' + a + ']').join(',')).forEach(el => {
    const o = ORIGA.get(el) || {}; ORIGA.set(el, o);
    ATTRS.forEach(a => { if (!el.hasAttribute(a)) return; if (!(a in o)) o[a] = el.getAttribute(a); el.setAttribute(a, LANG === 'ur' ? tr(o[a]) : o[a]); });
  });
}
function applyLang() {
  const de = document.documentElement;
  de.lang = LANG; de.dir = LANG === 'ur' ? 'rtl' : 'ltr';
  document.title = LANG === 'ur' ? 'نور اکیڈمی — اسلامی کلاسز ایل ایم ایس' : 'Nur Academy — Islamic Classes LMS (prototype)';
  localize($('#sidebar')); localize($('.topbar'));
  $('#hijri').textContent = hijri(new Date());
  $('#langBtn').textContent = LANG === 'ur' ? 'English' : 'اردو';
  $('#langBtn').lang = LANG === 'ur' ? 'en' : 'ur';
}
function setLang(l) { LANG = l; try { localStorage.setItem('nur-lms.lang', l); } catch (e) {} closeModal(); applyLang(); fillWho(); route(); }

/* ---------- UI plumbing ---------- */
function toast(msg) { const t = $('#toast'); t.textContent = tr(msg); t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2400); }
function openModal(html, mount) {
  const m = $('#modal'); m.innerHTML = `<div class="modal-in">${html}</div>`; localize(m);
  if (!m.open) m.showModal();
  m.querySelectorAll('[data-close]').forEach(b => b.onclick = () => m.close());
  if (mount) mount(m);
}
const closeModal = () => { const m = $('#modal'); if (m.open) m.close(); };
function ask(msg, yes, label = 'Confirm') {
  openModal(`<h2>${esc(msg)}</h2><div class="modal-actions"><button class="btn ghost" data-close>Go back</button><button class="btn danger" id="ask-yes">${esc(label)}</button></div>`,
    m => { $('#ask-yes', m).onclick = () => { closeModal(); yes(); }; });
}
function notice(msg) { openModal(`<h2>Can't schedule that</h2><p>${esc(msg)}</p><div class="modal-actions"><button class="btn" data-close>OK</button></div>`); }
function copy(text) { (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(() => toast('Copied'), () => toast('Copy not available')); }

const NAV = {
  admin:   [['dashboard','🏠','Dashboard'],['courses','📚','Courses'],['schedule','🗓️','Class schedule'],['attendance','✅','Attendance'],['students','👥','Students'],['zoom','🎥','Zoom setup']],
  teacher: [['dashboard','🏠','Dashboard'],['courses','📚','My courses'],['schedule','🗓️','Class schedule'],['attendance','✅','Attendance'],['students','👥','My students']],
  student: [['dashboard','🏠','Dashboard'],['courses','📚','My courses'],['schedule','🗓️','Class schedule'],['record','📈','Attendance & progress']],
};

/* ---------- routing ---------- */
let weekStart = startOfWeek(new Date());
function startOfWeek(d) { return addDays(sod(d), -sod(d).getDay()); }

function route() {
  const h = location.hash.replace(/^#\/?/, '') || 'dashboard', i = h.indexOf('-'), page = i < 0 ? h : h.slice(0, i), arg = i < 0 ? '' : h.slice(i + 1);
  const allowed = NAV[me().role].map(n => n[0]).concat(['course', 'attend']);
  const p = allowed.includes(page) ? page : 'dashboard';
  $('#nav').innerHTML = NAV[me().role].map(([k, ico, label]) => {
    const active = p === k || (p === 'course' && k === 'courses') || (p === 'attend' && k === 'attendance');
    return `<a href="#${k}" class="${active ? 'active' : ''}"><span aria-hidden="true">${ico}</span>${label}</a>`;
  }).join('');
  const v = ({dashboard, courses, course:() => courseDetail(arg), schedule, attendance, attend:() => attendMark(arg), students, record, zoom})[p];
  $('#view').innerHTML = v();
  localize($('#view')); localize($('#nav'));
  bind();
  $('#sidebar').classList.remove('open');
  window.scrollTo(0, 0);
}

/* ---------- views ---------- */
function sessionRow(s, opts = {}) {
  const c = course(s.courseId), st = new Date(s.start), js = joinState(s);
  const joinBtn = js === 'open' ? `<a class="btn gold sm" href="${esc(s.zoom.joinUrl)}" target="_blank" rel="noopener" data-stop>${isStaff() ? 'Start' : 'Join'}</a>` : '';
  return `<div class="row" data-session="${s.id}" style="cursor:pointer">
    <div class="when"><b>${st.getDate()}</b><small>${WD()[st.getDay()]}</small></div>
    <div class="grow"><div class="title">${esc(c.title)} <span class="muted">· ${esc(s.title)}</span></div>
      <div class="small muted">${fmtTime(st)} – ${fmtTime(sEnd(s))} · ${esc(user(s.teacherId).name)}${s.status === 'cancelled' ? ' · <span class="badge red">Cancelled</span>' : js === 'open' ? ' · <span class="badge gold">Live window</span>' : ''}</div></div>
    ${joinBtn}${opts.noArrow ? '' : '<span class="muted" aria-hidden="true">›</span>'}</div>`;
}

function dashboard() {
  const u = me(), up = upcoming(), next = up[0], cs = myCourses();
  const weekEnd = addDays(sod(new Date()), 7);
  const wk = up.filter(s => new Date(s.start) < weekEnd).length;
  let stats = '';
  if (u.role === 'admin') {
    const rates = db.users.filter(x => x.role === 'student').map(s => attRate(s.id)).filter(x => x !== null);
    stats = stat(db.courses.length, 'Active courses') + stat(db.users.filter(x => x.role === 'student').length, 'Students') + stat(wk, 'Classes next 7 days') + stat((rates.length ? Math.round(rates.reduce((a, b) => a + b) / rates.length) : 0) + '%', 'Avg. attendance');
  } else if (u.role === 'teacher') {
    const ss = new Set(cs.flatMap(c => enrolled(c.id).map(s => s.id)));
    stats = stat(cs.length, 'My courses') + stat(ss.size, 'My students') + stat(wk, 'Classes next 7 days') + stat(upcoming().filter(s => sod(new Date(s.start)).getTime() === sod(new Date()).getTime()).length, 'Classes today');
  } else {
    const rate = attRate(u.id);
    const avg = cs.length ? Math.round(cs.reduce((a, c) => a + prog(c.id, u.id).pct, 0) / cs.length) : 0;
    stats = stat(cs.length, 'Enrolled courses') + stat(wk, 'Classes next 7 days') + stat(rate === null ? '—' : rate + '%', 'My attendance') + stat(avg + '%', 'Average progress');
  }
  const hero = next ? (() => { const c = course(next.courseId), js = joinState(next); return `<div class="card hero"><div class="small meta">NEXT CLASS · ${until(next).toUpperCase()}</div>
      <h2>${esc(c.title)} — ${esc(next.title)}</h2><div class="meta">${fmtDate(new Date(next.start))}, ${fmtTime(new Date(next.start))} · ${next.duration} min · ${esc(user(next.teacherId).name)}</div>
      <div class="actions">${js === 'open' ? `<a class="btn gold" href="${esc(next.zoom.joinUrl)}" target="_blank" rel="noopener">${isStaff() ? 'Start on Zoom' : 'Join on Zoom'}</a>` : `<button class="btn gold" disabled>Join opens 10 min before</button>`}
      <button class="btn ghost" data-session="${next.id}">Details</button></div></div>`; })()
    : `<div class="card hero"><h2>No upcoming classes</h2><div class="meta">${isStaff() ? 'Schedule a class to get started.' : 'Your teacher has not scheduled anything yet.'}</div></div>`;
  return `<div class="page-head"><div><h1>Assalamu alaikum, ${esc(u.name.replace(/ \(.*\)/, '').split(' ').slice(0, 2).join(' '))}</h1><p>${hijri(new Date())} · ${new Date().toLocaleDateString(loc(), {dateStyle:'full'})}</p></div>
      ${isStaff() ? '<button class="btn gold" data-new-session>+ Schedule class</button>' : ''}</div>
    <div class="grid cols-4" style="margin-bottom:16px">${stats}</div>
    <div class="grid two"><div class="grid">${hero}
      <div class="card"><h2>Upcoming classes</h2><div class="list">${up.slice(0, 6).map(s => sessionRow(s)).join('') || '<div class="empty">Nothing scheduled.</div>'}</div></div></div>
      <div class="card"><h2>${u.role === 'student' ? 'My courses' : 'Courses'}</h2><div class="list">${cs.map(c => `<a class="row" href="#course-${c.id}" style="text-decoration:none;color:inherit"><div class="grow"><div class="title">${esc(c.title)}</div><div class="small muted">${enrolled(c.id).length} students</div></div><span class="badge">${u.role === 'student' ? prog(c.id, u.id).pct : courseAvg(c.id)}%</span></a>`).join('') || '<div class="empty">No courses yet.</div>'}</div></div></div>`;
}
const stat = (n, l) => `<div class="card stat"><b>${n}</b><span>${l}</span></div>`;

function courses() {
  const u = me();
  return `<div class="page-head"><div><h1>${u.role === 'student' ? 'My courses' : 'Courses'}</h1><p>${u.role === 'student' ? 'Courses you are enrolled in.' : 'Curriculum, rosters and progress.'}</p></div>
    ${isAdmin() ? '<button class="btn gold" data-new-course>+ New course</button>' : ''}</div>
    <div class="grid cols-3">${myCourses().map(c => {
      const pct = u.role === 'student' ? prog(c.id, u.id).pct : courseAvg(c.id);
      return `<a class="card course-card" href="#course-${c.id}" style="--c:${c.color};text-decoration:none;color:inherit">
        <div class="ar" lang="ar">${esc(c.ar)}</div><h2 style="margin:0">${esc(c.title)}</h2>
        <div class="small muted">${esc(user(c.teacherId).name)} · <span class="badge grey">${esc(c.level)}</span></div>
        <div class="bar"><i style="width:${pct}%"></i></div>
        <div class="small muted">${u.role === 'student' ? 'My progress' : 'Class average'} ${pct}% · ${enrolled(c.id).length} students</div></a>`; }).join('') || '<div class="card empty">No courses to show.</div>'}</div>`;
}

function courseDetail(id) {
  const c = course(id); if (!c || !myCourses().includes(c)) return '<div class="card empty">Course not found.</div>';
  const es = enrolled(c.id), u = me();
  const canEdit = isAdmin() || (u.role === 'teacher' && c.teacherId === u.id);
  const ups = upcoming().filter(s => s.courseId === c.id).slice(0, 4);
  const rows = (u.role === 'student' ? es.filter(s => s.id === u.id) : es).map(s => {
    const p = prog(c.id, s.id), ar = attRate(s.id, c.id);
    return `<tr><td><b>${esc(s.name)}</b></td><td style="min-width:150px"><div class="bar"><i style="width:${p.pct}%"></i></div><span class="small muted">${p.pct}% · ${esc(p.current || '—')}</span></td><td>${ar === null ? '—' : ar + '%'}</td>
      <td class="small muted">${esc(p.note)}</td><td>${canEdit ? `<button class="btn ghost sm" data-prog="${c.id}:${s.id}">Update</button> ${isAdmin() ? `<button class="btn danger sm" data-unenroll="${c.id}:${s.id}">Remove</button>` : ''}` : ''}</td></tr>`;
  }).join('');
  return `<p><a href="#courses">← Courses</a></p>
    <div class="page-head"><div><div class="ar" lang="ar" style="font-family:Amiri,serif;font-size:1.6rem;color:${c.color}">${esc(c.ar)}</div><h1>${esc(c.title)}</h1><p>${esc(c.desc)}</p>
      <p><span class="badge grey">${esc(c.level)}</span> <span class="badge">${esc(user(c.teacherId).name)}</span></p></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">${isStaff() && canEdit ? `<button class="btn gold" data-new-session="${c.id}">+ Schedule class</button>` : ''}${isAdmin() ? `<button class="btn ghost" data-edit-course="${c.id}">Edit</button><button class="btn ghost" data-enroll="${c.id}">+ Enrol student</button>` : ''}</div></div>
    <div class="grid two"><div class="card"><h2>${u.role === 'student' ? 'My progress' : 'Students (' + es.length + ')'}</h2><div class="table-wrap"><table><thead><tr><th>Student</th><th>${esc(c.unit)}</th><th>Attendance</th><th>Teacher note</th><th></th></tr></thead><tbody>${rows || '<tr><td colspan="5" class="empty">No students enrolled.</td></tr>'}</tbody></table></div></div>
      <div class="card"><h2>Upcoming classes</h2><div class="list">${ups.map(s => sessionRow(s)).join('') || '<div class="empty">None scheduled.</div>'}</div></div></div>`;
}

function schedule() {
  const days = [...Array(7)].map((_, i) => addDays(weekStart, i)), ss = mySessions();
  const todayT = sod(new Date()).getTime();
  const label = `${days[0].toLocaleDateString(loc(), {day:'numeric', month:'short'})} – ${days[6].toLocaleDateString(loc(), {day:'numeric', month:'short', year:'numeric'})}`;
  return `<div class="page-head"><div><h1>Class schedule</h1><p>Times shown in your local time zone.</p></div>
    <div class="week-nav"><button class="btn ghost sm" data-week="-1">‹ Prev</button><button class="btn ghost sm" data-week="0">Today</button><button class="btn ghost sm" data-week="1">Next ›</button><b style="margin-inline-start:6px">${label}</b>${isStaff() ? '<button class="btn gold sm" data-new-session>+ Schedule class</button>' : ''}</div></div>
    <div class="week">${days.map(d => {
      const list = ss.filter(s => sod(new Date(s.start)).getTime() === d.getTime());
      return `<div class="day ${d.getTime() === todayT ? 'today' : ''}"><div class="day-h">${WD()[d.getDay()]}<b>${d.getDate()}</b></div>${list.map(s => {
        const c = course(s.courseId), done = s.status === 'completed' || sEnd(s) < new Date();
        return `<button class="chip ${s.status === 'cancelled' ? 'cancelled' : done ? 'done' : ''}" style="--c:${c.color}" data-session="${s.id}"><b>${fmtTime(new Date(s.start))}</b>${esc(c.title)}</button>`; }).join('')}</div>`; }).join('')}</div>`;
}

function attendance() {
  const done = mySessions().filter(s => s.status !== 'cancelled' && new Date(s.start) <= new Date()).reverse().slice(0, 30);
  return `<div class="page-head"><div><h1>Attendance</h1><p>Open a class to mark who attended.</p></div></div>
    <div class="card"><div class="list">${done.map(s => {
      const a = db.attendance[s.id], n = enrolled(s.courseId).length, marked = a ? Object.keys(a).length : 0, st = new Date(s.start);
      return `<a class="row" href="#attend-${s.id}" style="text-decoration:none;color:inherit"><div class="when"><b>${st.getDate()}</b><small>${WD()[st.getDay()]}</small></div>
        <div class="grow"><div class="title">${esc(course(s.courseId).title)} <span class="muted">· ${esc(s.title)}</span></div><div class="small muted">${fmtTime(st)} · ${esc(user(s.teacherId).name)}</div></div>
        <span class="badge ${marked >= n && n ? '' : marked ? 'amber' : 'red'}">${marked}/${n} marked</span></a>`; }).join('') || '<div class="empty">No past classes yet.</div>'}</div></div>`;
}

function attendMark(id) {
  const s = db.sessions.find(x => x.id === id); if (!s || !isStaff()) return '<div class="card empty">Not available.</div>';
  const c = course(s.courseId), es = enrolled(c.id), a = db.attendance[s.id] || {};
  const opts = [['present','Present'],['late','Late'],['absent','Absent'],['excused','Excused']];
  return `<p><a href="#attendance">← Attendance</a></p><div class="page-head"><div><h1>${esc(c.title)}</h1><p>${fmtDate(new Date(s.start))}, ${fmtTime(new Date(s.start))} · ${esc(s.title)}</p></div><button class="btn" data-all-present="${s.id}">Mark all present</button></div>
    <div class="card"><div class="list">${es.map(st => `<div class="row"><div class="grow"><b>${esc(st.name)}</b></div><div class="seg" role="group" aria-label="Attendance for ${esc(st.name)}">${opts.map(([k, l]) => `<button class="${k} ${a[st.id] === k ? 'on' : ''}" data-mark="${s.id}:${st.id}:${k}" aria-pressed="${a[st.id] === k}">${l}</button>`).join('')}</div></div>`).join('') || '<div class="empty">No students enrolled.</div>'}</div></div>`;
}

function students() {
  const cs = myCourses(), seen = new Map();
  cs.forEach(c => enrolled(c.id).forEach(s => { (seen.get(s.id) || seen.set(s.id, {s, cs:[]}).get(s.id)).cs.push(c); }));
  const list = isAdmin() ? db.users.filter(u => u.role === 'student').map(s => seen.get(s.id) || {s, cs:[]}) : [...seen.values()];
  return `<div class="page-head"><div><h1>${isAdmin() ? 'Students' : 'My students'}</h1><p>${list.length} learners</p></div>${isAdmin() ? '<button class="btn gold" data-new-student>+ Add student</button>' : ''}</div>
    <div class="card"><div class="table-wrap"><table><thead><tr><th>Name</th><th>Courses</th><th>Attendance</th>${isAdmin() ? '<th></th>' : ''}</tr></thead><tbody>${list.map(({s, cs}) => { const r = attRate(s.id); return `<tr><td><b>${esc(s.name)}</b><div class="small muted">${esc(s.email || '')}</div></td><td>${cs.map(c => `<a class="badge" style="text-decoration:none" href="#course-${c.id}">${esc(tr(c.title).split(/[—&]/)[0].trim())}</a>`).join(' ') || '<span class="muted">—</span>'}</td><td>${r === null ? '—' : `<span class="badge ${r >= 80 ? '' : r >= 60 ? 'amber' : 'red'}">${r}%</span>`}</td>${isAdmin() ? `<td><button class="btn ghost sm" data-enroll-student="${s.id}">Enrol in course</button></td>` : ''}</tr>`; }).join('')}</tbody></table></div></div>`;
}

function record() {
  const u = me();
  return `<div class="page-head"><div><h1>Attendance & progress</h1><p>Your record across all courses.</p></div></div>
    <div class="grid cols-3">${myCourses().map(c => { const p = prog(c.id, u.id), r = attRate(u.id, c.id);
      const hist = db.sessions.filter(s => s.courseId === c.id && db.attendance[s.id] && db.attendance[s.id][u.id]).sort((a, b) => new Date(b.start) - new Date(a.start)).slice(0, 6);
      const col = {present:'', late:'amber', absent:'red', excused:'blue'};
      return `<div class="card" style="border-top:5px solid ${c.color}"><h2>${esc(c.title)}</h2><div class="bar"><i style="width:${p.pct}%"></i></div><p class="small muted">${p.pct}% · ${esc(c.unit)}: ${esc(p.current || '—')}</p>
        <p class="small"><b>Teacher note:</b> ${esc(p.note || '—')}</p><p class="small muted" style="margin-bottom:6px">Attendance ${r === null ? '—' : r + '%'}</p>
        <div>${hist.map(s => `<span class="badge ${col[db.attendance[s.id][u.id]]}" title="${fmtDate(new Date(s.start))}">${WD()[new Date(s.start).getDay()]} ${new Date(s.start).getDate()} · ${db.attendance[s.id][u.id]}</span>`).join(' ') || '<span class="muted small">No records yet.</span>'}</div></div>`; }).join('')}</div>`;
}

function zoom() {
  const n = db.sessions.filter(s => s.zoom).length;
  if (LANG === 'ur') return UR.zoomPage(n);
  return `<div class="page-head"><div><h1>Zoom setup</h1><p>How classes get their meeting links.</p></div><button class="btn danger sm" data-reset>Reset demo data</button></div>
    <div class="note"><b>Prototype mode.</b> Meeting IDs and passcodes are generated locally to show the flow — they do not open real Zoom meetings. You can still paste any real Zoom link when scheduling a class.</div>
    <div class="grid two"><div class="card"><h2>Production integration plan</h2><ol class="steps">
      <li>Institute creates a <b>Server-to-Server OAuth</b> app in the Zoom Marketplace (scopes: <code>meeting:write:admin</code>, <code>meeting:read:admin</code>, <code>user:read:admin</code>).</li>
      <li>Backend stores Account ID / Client ID / Secret securely and fetches short-lived tokens.</li>
      <li>Scheduling a class calls <code>POST /users/me/meetings</code>; a weekly series becomes <b>one recurring meeting</b> so students keep a single link.</li>
      <li>Reschedule → <code>PATCH /meetings/{id}</code>; cancel → <code>DELETE /meetings/{id}</code>.</li>
      <li>Optional: Zoom webhooks (<code>meeting.participant_joined</code>) auto-fill attendance; recording-completed webhook attaches recordings to the course.</li>
      <li>Waiting room + passcode on by default; the join link is shown to students only inside the 10-minute join window.</li></ol></div>
      <div class="card"><h2>Status</h2><dl class="kv"><dt>Mode</dt><dd><span class="badge amber">Demo (simulated)</span></dd><dt>Meetings</dt><dd>${n} linked</dd><dt>Join window</dt><dd>10 min before start</dd><dt>Account</dt><dd class="muted">Not connected</dd></dl></div></div>`;
}

/* ---------- modals ---------- */
function sessionModal(id) {
  const s = db.sessions.find(x => x.id === id); if (!s) return;
  const c = course(s.courseId), st = new Date(s.start), js = joinState(s);
  const canEdit = isAdmin() || (me().role === 'teacher' && s.teacherId === me().id);
  const seriesCount = s.seriesId ? db.sessions.filter(x => x.seriesId === s.seriesId && x.status === 'scheduled' && new Date(x.start) >= st).length : 0;
  openModal(`<h2>${esc(c.title)}</h2><dl class="kv"><dt>Class</dt><dd>${esc(s.title)} ${s.status === 'cancelled' ? '<span class="badge red">Cancelled</span>' : s.status === 'completed' ? '<span class="badge grey">Completed</span>' : ''}</dd>
    <dt>When</dt><dd>${st.toLocaleDateString(loc(), {dateStyle:'full'})}<br>${fmtTime(st)} – ${fmtTime(sEnd(s))} (${s.duration} min) · ${hijri(st)}</dd><dt>Teacher</dt><dd>${esc(user(s.teacherId).name)}</dd></dl>
    <div class="zoom-box"><b>🎥 Zoom meeting</b> ${s.zoom.mode === 'demo' ? '<span class="badge amber">simulated</span>' : ''}<br>
      ID <code>${esc(fmtMeetingId(s.zoom.meetingId))}</code> · Passcode <code>${esc(s.zoom.passcode)}</code><br><span class="small" style="word-break:break-all">${esc(s.zoom.joinUrl)}</span></div>
    <div class="modal-actions">
      ${js === 'open' ? `<a class="btn gold" href="${esc(s.zoom.joinUrl)}" target="_blank" rel="noopener">${isStaff() ? 'Start on Zoom' : 'Join on Zoom'}</a>` : js === 'soon' ? `<button class="btn" disabled>Join opens 10 min before (${until(s)})</button>` : ''}
      <button class="btn ghost" data-copy="${esc(s.zoom.joinUrl)}">Copy link</button><a class="btn ghost" href="${esc(gcalUrl(s))}" target="_blank" rel="noopener">Add to calendar</a>
      ${isStaff() && new Date(s.start) <= new Date() ? `<a class="btn ghost" href="#attend-${s.id}" data-close-link>Attendance</a>` : ''}
      ${canEdit && s.status === 'scheduled' && js !== 'ended' ? `<button class="btn ghost" data-edit-session="${s.id}">Reschedule</button><button class="btn danger" data-cancel="${s.id}">Cancel class</button>` : ''}
      ${canEdit && s.status === 'scheduled' && seriesCount > 1 ? `<button class="btn danger" data-cancel-series="${s.id}">Cancel this & ${seriesCount - 1} later</button>` : ''}
      <button class="btn ghost" data-close>Close</button></div>`,
    m => {
      m.querySelector('[data-copy]').onclick = e => copy(e.target.dataset.copy);
      const l = m.querySelector('[data-close-link]'); if (l) l.onclick = () => m.close();
      const bind1 = (sel, fn) => { const b = m.querySelector(sel); if (b) b.onclick = fn; };
      bind1('[data-edit-session]', () => sessionForm(s));
      bind1('[data-cancel]', () => { ask('Cancel this class? Students will see it as cancelled.', () => { s.status = 'cancelled'; save(); route(); toast('Class cancelled (Zoom meeting would be deleted)'); }, 'Cancel class'); });
      bind1('[data-cancel-series]', () => { ask('Cancel this and all later classes in the series?', () => { db.sessions.forEach(x => { if (x.seriesId === s.seriesId && x.status === 'scheduled' && new Date(x.start) >= st) x.status = 'cancelled'; }); save(); route(); toast('Series cancelled'); }, 'Cancel series'); });
    });
}

function sessionForm(existing, courseId) {
  const cs = myCourses().filter(c => isAdmin() || c.teacherId === me().id);
  if (!cs.length) return toast('You have no courses to schedule');
  const e = existing, def = e ? new Date(e.start) : (() => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(18, 0, 0, 0); return d; })();
  openModal(`<h2>${e ? 'Reschedule class' : 'Schedule a class'}</h2><form id="sf">
    <div class="field"><label for="f-course">Course</label><select id="f-course" name="course" ${e ? 'disabled' : ''}>${cs.map(c => `<option value="${c.id}" ${(e ? e.courseId : courseId) === c.id ? 'selected' : ''}>${esc(c.title)} — ${esc(user(c.teacherId).name)}</option>`).join('')}</select></div>
    <div class="field"><label for="f-title">Class title</label><input id="f-title" name="title" required value="${esc(e ? e.title : tr('Weekly class'))}"></div>
    <div class="field-row"><div class="field"><label for="f-start">Date & time</label><input id="f-start" type="datetime-local" name="start" required value="${toLocalInput(def)}"></div>
      <div class="field"><label for="f-dur">Duration (minutes)</label><input id="f-dur" type="number" name="duration" min="15" max="240" step="5" required value="${e ? e.duration : 60}"></div></div>
    ${e ? '<p class="small muted">Changes apply to this class only. The Zoom link stays the same.</p>' : `
    <div class="field"><label for="f-rep">Repeat</label><select id="f-rep" name="repeat"><option value="none">Does not repeat</option><option value="weekly">Weekly</option></select></div>
    <div id="rep-opts" hidden><fieldset><legend class="small muted" style="font-weight:600">On these days</legend><div class="checks">${WD().map((d, i) => `<label><input type="checkbox" name="wd" value="${i}">${d}</label>`).join('')}</div></fieldset>
      <div class="field"><label for="f-weeks">For how many weeks</label><input id="f-weeks" type="number" name="weeks" min="1" max="52" value="8"></div></div>
    <fieldset><legend class="small muted" style="font-weight:600">Zoom meeting</legend><div class="checks"><label><input type="radio" name="zmode" value="auto" checked>Create automatically (simulated)</label><label><input type="radio" name="zmode" value="manual">Paste my own link</label></div></fieldset>
    <div class="field" id="zurl" hidden><label for="f-zurl">Zoom join link</label><input id="f-zurl" type="url" name="zurl" placeholder="https://zoom.us/j/123456789?pwd=…"></div>`}
    <div class="modal-actions"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn gold" type="submit">${e ? 'Save changes' : 'Schedule'}</button></div></form>`,
  m => {
    const f = $('#sf', m);
    if (!e) {
      const syncRep = () => { $('#rep-opts', m).hidden = f.repeat.value === 'none'; if (f.repeat.value !== 'none' && ![...f.wd].some(x => x.checked)) f.wd[new Date(f.start.value).getDay()].checked = true; };
      f.repeat.onchange = syncRep;
      f.querySelectorAll('[name=zmode]').forEach(r => r.onchange = () => { $('#zurl', m).hidden = f.zmode.value !== 'manual'; });
    }
    f.onsubmit = ev => {
      ev.preventDefault();
      const start = new Date(f.start.value), dur = +f.duration.value;
      if (isNaN(start)) return toast('Pick a date and time');
      const cid = e ? e.courseId : f.course.value, c = course(cid);
      const starts = [start];
      if (!e && f.repeat.value === 'weekly') {
        const days = [...f.wd].filter(x => x.checked).map(x => +x.value), n = Math.min(+f.weeks.value || 1, 52);
        starts.length = 0;
        for (let i = 0; i < n * 7; i++) { const d = addDays(start, i); if (days.includes(d.getDay())) starts.push(d); }
      }
      const conflicts = starts.filter(st => db.sessions.some(x => x.teacherId === c.teacherId && x.status === 'scheduled' && (!e || x.id !== e.id) &&
        new Date(x.start) < new Date(st.getTime() + dur * MIN) && sEnd(x) > st));
      if (conflicts.length) return notice(`${user(c.teacherId).name} already has a class at ${fmtDate(conflicts[0])} ${fmtTime(conflicts[0])}${conflicts.length > 1 ? ` (and ${conflicts.length - 1} more)` : ''}. Choose another time.`);
      if (e) { e.title = f.title.value.trim(); e.start = start.toISOString(); e.duration = dur; toast('Class updated (Zoom meeting would be PATCHed)'); }
      else {
        let z; if (f.zmode.value === 'manual') { if (!f.zurl.value) return toast('Paste a Zoom link'); z = zoomFromUrl(f.zurl.value.trim()); } else z = zoomCreateMeeting(c.title);
        const series = starts.length > 1 ? uid('ser-') : null;
        starts.forEach(st => db.sessions.push({id:uid('x'), courseId:cid, title:f.title.value.trim(), start:st.toISOString(), duration:dur, teacherId:c.teacherId, zoom:z, status:'scheduled', seriesId:series}));
        toast(starts.length > 1 ? `${starts.length} classes scheduled with one recurring Zoom link` : 'Class scheduled & Zoom link created');
        weekStart = startOfWeek(start);
      }
      save(); closeModal(); if (!location.hash.startsWith('#schedule') && !e) location.hash = '#schedule'; else route();
    };
  });
}

function courseForm(c) {
  const teachers = db.users.filter(u => u.role === 'teacher');
  openModal(`<h2>${c ? 'Edit course' : 'New course'}</h2><form id="cf">
    <div class="field"><label for="c-t">Title</label><input id="c-t" name="title" required value="${esc(c?.title)}"></div>
    <div class="field-row"><div class="field"><label for="c-a">Arabic title (optional)</label><input id="c-a" name="ar" lang="ar" dir="rtl" value="${esc(c?.ar)}"></div><div class="field"><label for="c-l">Level</label><select id="c-l" name="level">${['Beginner','Intermediate','Advanced','All levels'].map(l => `<option ${c?.level === l ? 'selected' : ''}>${l}</option>`).join('')}</select></div></div>
    <div class="field"><label for="c-te">Teacher</label><select id="c-te" name="teacher">${teachers.map(t => `<option value="${t.id}" ${c?.teacherId === t.id ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select></div>
    <div class="field"><label for="c-d">Description</label><textarea id="c-d" name="desc" rows="3">${esc(c?.desc)}</textarea></div>
    <div class="modal-actions"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn gold">Save</button></div></form>`,
  m => { $('#cf', m).onsubmit = ev => { ev.preventDefault(); const f = ev.target;
    const o = c || {id:uid('c'), color:['#0f4c3a','#7a5a12','#1d5fa8','#8a3b2a','#5b3f8c'][db.courses.length % 5], unit:'Lessons completed'};
    Object.assign(o, {title:f.title.value.trim(), ar:f.ar.value.trim(), level:f.level.value, teacherId:f.teacher.value, desc:f.desc.value.trim()});
    if (!c) db.courses.push(o); save(); closeModal(); location.hash = '#course-' + o.id; route(); toast('Course saved'); }; });
}

function enrollModal(cid, sid) {
  const courseOpts = db.courses, studs = db.users.filter(u => u.role === 'student');
  openModal(`<h2>Enrol student</h2><form id="ef"><div class="field"><label for="e-s">Student</label><select id="e-s" name="s">${studs.map(s => `<option value="${s.id}" ${s.id === sid ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div>
    <div class="field"><label for="e-c">Course</label><select id="e-c" name="c">${courseOpts.map(c => `<option value="${c.id}" ${c.id === cid ? 'selected' : ''}>${esc(c.title)}</option>`).join('')}</select></div>
    <div class="modal-actions"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn gold">Enrol</button></div></form>`,
  m => { $('#ef', m).onsubmit = ev => { ev.preventDefault(); const f = ev.target;
    if (db.enrollments.some(x => x.courseId === f.c.value && x.studentId === f.s.value)) return toast('Already enrolled');
    db.enrollments.push({courseId:f.c.value, studentId:f.s.value}); save(); closeModal(); route(); toast('Student enrolled'); }; });
}

function studentModal() {
  openModal(`<h2>Add student</h2><form id="nf"><div class="field"><label for="n-n">Full name</label><input id="n-n" name="n" required></div>
    <div class="field"><label for="n-e">Email</label><input id="n-e" type="email" name="e"></div>
    <div class="modal-actions"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn gold">Add</button></div></form>`,
  m => { $('#nf', m).onsubmit = ev => { ev.preventDefault(); const f = ev.target; db.users.push({id:uid('s'), role:'student', name:f.n.value.trim(), email:f.e.value.trim()}); save(); closeModal(); fillWho(); route(); toast('Student added'); }; });
}

function progressModal(key) {
  const [cid, sid] = key.split(':'), p = prog(cid, sid), c = course(cid);
  openModal(`<h2>${esc(user(sid).name)}</h2><p class="muted small">${esc(c.title)}</p><form id="pf">
    <div class="field"><label for="p-p">Progress: <output id="p-o">${p.pct}</output>%</label><input id="p-p" type="range" name="pct" min="0" max="100" value="${p.pct}"></div>
    <div class="field"><label for="p-c">${esc(c.unit)} — currently on</label><input id="p-c" name="cur" value="${esc(p.current)}"></div>
    <div class="field"><label for="p-n">Teacher note (visible to student)</label><textarea id="p-n" name="note" rows="3">${esc(p.note)}</textarea></div>
    <div class="modal-actions"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn gold">Save</button></div></form>`,
  m => { const f = $('#pf', m); f.pct.oninput = () => $('#p-o', m).textContent = f.pct.value;
    f.onsubmit = ev => { ev.preventDefault(); db.progress[key] = {pct:+f.pct.value, current:f.cur.value.trim(), note:f.note.value.trim()}; save(); closeModal(); route(); toast('Progress saved'); }; });
}

function gcalUrl(s) {
  const z = d => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const c = course(s.courseId);
  return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(c.title + ' - ' + s.title) + '&dates=' + z(s.start) + '/' + z(sEnd(s)) +
    '&details=' + encodeURIComponent('Zoom: ' + s.zoom.joinUrl + '\nMeeting ID: ' + s.zoom.meetingId + '\nPasscode: ' + s.zoom.passcode) + '&location=' + encodeURIComponent(s.zoom.joinUrl);
}

/* ---------- event binding (delegated per render) ---------- */
function bind() {
  const v = $('#view');
  v.onclick = e => {
    const t = e.target.closest('[data-session],[data-new-session],[data-week],[data-new-course],[data-edit-course],[data-enroll],[data-enroll-student],[data-new-student],[data-prog],[data-unenroll],[data-mark],[data-all-present],[data-reset],[data-stop]');
    if (!t) return;
    const d = t.dataset;
    if ('stop' in d) return; // let the Zoom link open
    if (d.session) return sessionModal(d.session);
    if ('newSession' in d) return sessionForm(null, d.newSession || undefined);
    if (d.week !== undefined) { weekStart = d.week === '0' ? startOfWeek(new Date()) : addDays(weekStart, 7 * +d.week); return route(); }
    if ('newCourse' in d) return courseForm();
    if (d.editCourse) return courseForm(course(d.editCourse));
    if (d.enroll) return enrollModal(d.enroll);
    if (d.enrollStudent) return enrollModal(null, d.enrollStudent);
    if ('newStudent' in d) return studentModal();
    if (d.prog) return progressModal(d.prog);
    if (d.unenroll) { const [c, s] = d.unenroll.split(':'); ask('Remove this student from the course?', () => { db.enrollments = db.enrollments.filter(x => !(x.courseId === c && x.studentId === s)); save(); route(); }, 'Remove'); return; }
    if (d.mark) { const [sid, st, k] = d.mark.split(':'); (db.attendance[sid] = db.attendance[sid] || {})[st] = k; save(); return route(); }
    if (d.allPresent) { const a = db.attendance[d.allPresent] = db.attendance[d.allPresent] || {}; enrolled(db.sessions.find(x => x.id === d.allPresent).courseId).forEach(s => a[s.id] = 'present'); save(); toast('All marked present'); return route(); }
    if ('reset' in d) ask('Reset all demo data?', resetDemo, 'Reset');
  };
}

function fillWho() {
  const groups = [['admin','Admin'],['teacher','Teachers'],['student','Students']];
  $('#who').innerHTML = groups.map(([r, l]) => `<optgroup label="${l}">${db.users.filter(u => u.role === r).map(u => `<option value="${u.id}" ${u.id === db.me ? 'selected' : ''}>${esc(u.name)}</option>`).join('')}</optgroup>`).join('');
  localize($('#who'));
}

/* ---------- boot ---------- */
load();
fillWho();
applyLang();
$('#langBtn').onclick = () => setLang(LANG === 'ur' ? 'en' : 'ur');
$('#who').onchange = e => { db.me = e.target.value; save(); location.hash = '#dashboard'; route(); };
$('#menuBtn').onclick = () => $('#sidebar').classList.toggle('open');
window.addEventListener('hashchange', route);
route();
setInterval(() => { if (!$('#modal').open && /^#?(dashboard|schedule)?$/.test(location.hash)) route(); }, 60000);
})();
