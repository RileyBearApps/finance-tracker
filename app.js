'use strict';

// ─── Globals ─────────────────────────────────────────────────────────────────
const { useState, useMemo, useEffect, useCallback } = React;
const { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } = Recharts;
const h = React.createElement;

// ─── Data ────────────────────────────────────────────────────────────────────
const CATEGORIES = {
  income: [
    { label: 'Salary',     icon: '💼', color: '#4ade80' },
    { label: 'Freelance',  icon: '🖥️', color: '#34d399' },
    { label: 'Investment', icon: '📈', color: '#6ee7b7' },
    { label: 'Other',      icon: '✨', color: '#a7f3d0' },
  ],
  expense: [
    { label: 'Food',          icon: '🍜', color: '#f87171' },
    { label: 'Transport',     icon: '🚇', color: '#fb923c' },
    { label: 'Housing',       icon: '🏠', color: '#fbbf24' },
    { label: 'Health',        icon: '💊', color: '#a78bfa' },
    { label: 'Shopping',      icon: '🛍️', color: '#f472b6' },
    { label: 'Entertainment', icon: '🎬', color: '#38bdf8' },
    { label: 'Other',         icon: '📦', color: '#94a3b8' },
  ],
};

const EXPENSE_RULES = [
  { cat: 'Food',          words: ['restaurant','cafe','coffee','starbucks','mcdonald','burger','pizza','sushi','chipotle','doordash','ubereats','grubhub','instacart','whole foods','trader joe','safeway','kroger','aldi','wegmans','food','grocery','groceries','bakery','deli','taco','kfc','subway','wendy','domino','panera','chick-fil','dunkin'] },
  { cat: 'Transport',     words: ['uber','lyft','taxi','cab','metro','transit','mta','bart','caltrain','parking','toll','gas','shell','chevron','bp ','exxon','mobil','fuel','airline','delta','united','southwest','american air','spirit','jetblue','amtrak','hertz','enterprise rent','avis','zipcar','waymo'] },
  { cat: 'Housing',       words: ['rent','mortgage','hoa','landlord','property','electric','pg&e','con ed','national grid','water bill','sewer','internet','comcast','xfinity','at&t','verizon','t-mobile','spectrum','cox ','phone bill','insurance','state farm','geico','allstate','progressive','renters'] },
  { cat: 'Health',        words: ['pharmacy','cvs','walgreens','rite aid','hospital','clinic','doctor','physician','dental','dentist','optometrist','vision','gym','planet fitness','la fitness','equinox','anytime fitness','crunch','24 hour fitness','health','medical','urgent care','kaiser'] },
  { cat: 'Shopping',      words: ['amazon','amzn','walmart','target','costco','best buy','apple store','ikea','home depot','lowes','bed bath','nordstrom','macy','zara','h&m','gap ','old navy','uniqlo','nike','adidas','etsy','ebay','shopify','wayfair','overstock','newegg'] },
  { cat: 'Entertainment', words: ['netflix','spotify','hulu','disney','hbo','apple tv','youtube','twitch','xbox','playstation','steam','epic games','movie','cinema','amc ','regal','theatre','theater','bar ','brewery','winery','concert','ticketmaster','stubhub','live nation','museum','bowling','golf','arcade'] },
];

const INCOME_RULES = [
  { cat: 'Salary',     words: ['payroll','direct deposit','salary','wages','employer','paycheck','adp','paychex','gusto','bamboohr','workday'] },
  { cat: 'Freelance',  words: ['freelance','contract','consulting','upwork','fiverr','toptal','invoice','client payment','venmo','zelle','cashapp','paypal'] },
  { cat: 'Investment', words: ['dividend','interest','stock','etf','fidelity','vanguard','schwab','robinhood','coinbase','crypto','bitcoin','gain','yield','bond','brokerage'] },
];

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTH_MAP = {};
MONTHS.forEach((m,i)=>{ MONTH_MAP[m.toLowerCase()]=i+1; });
MONTHS_FULL.forEach((m,i)=>{ MONTH_MAP[m.toLowerCase()]=i+1; });

const today = new Date();

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt(n) {
  return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:0}).format(n);
}

function getCatMeta(type, label) {
  return (CATEGORIES[type]||[]).find(c=>c.label===label) || { icon:'📦', color:'#94a3b8' };
}

function autoCategory(desc, type) {
  const d = desc.toLowerCase();
  const rules = type === 'income' ? INCOME_RULES : EXPENSE_RULES;
  for (const rule of rules) {
    if (rule.words.some(w => d.includes(w))) return rule.cat;
  }
  return 'Other';
}

// ─── Parser ──────────────────────────────────────────────────────────────────
function parseDate(raw) {
  if (!raw) return null;
  const yr = today.getFullYear();
  let m;

  m = raw.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;

  m = raw.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (m) { const y=m[3].length===2?'20'+m[3]:m[3]; return `${y}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`; }

  m = raw.match(/^(\d{1,2})[\/\-](\d{1,2})$/);
  if (m) return `${yr}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`;

  m = raw.match(/([a-z]+)\.?\s+(\d{1,2})(?:[,\s]+(\d{4}))?/i);
  if (m) { const mo=MONTH_MAP[m[1].toLowerCase()]; if(mo) return `${m[3]||yr}-${String(mo).padStart(2,'0')}-${m[2].padStart(2,'0')}`; }

  m = raw.match(/(\d{1,2})\s+([a-z]+)(?:[,\s]+(\d{4}))?/i);
  if (m) { const mo=MONTH_MAP[m[2].toLowerCase()]; if(mo) return `${m[3]||yr}-${String(mo).padStart(2,'0')}-${m[1].padStart(2,'0')}`; }

  return null;
}

function parseStatement(text) {
  const results = [];
  const DATE_RE = /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}|\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2}(?:[,\s]+\d{4})?|\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*)/i;
  const AMT_RE = /\((\d[\d,]*\.?\d{0,2})\)|\$?\s*([\d,]+\.\d{2})/g;

  const lines = text.split(/\n/).map(l=>l.trim()).filter(l=>l.length>3);

  for (const line of lines) {
    if (/^(date|description|amount|balance|transaction|total|opening|closing|account|statement|page|available|posting|ref|type)/i.test(line)) continue;
    if (/^[\*\-=]{3,}/.test(line)) continue;

    // Find amounts
    const amounts = [];
    let am; AMT_RE.lastIndex = 0;
    while ((am = AMT_RE.exec(line)) !== null) {
      const raw = am[1] || am[2];
      const val = parseFloat(raw.replace(/,/g,''));
      const inParens = !!am[1];
      if (val > 0 && val < 500000) amounts.push({ val, inParens, idx: am.index });
    }
    if (!amounts.length) continue;

    // Date
    const dateMatch = line.match(DATE_RE);
    const dateStr = dateMatch ? parseDate(dateMatch[0]) : null;
    if (!dateStr) continue;

    // Pick the transaction amount (first one; if there are two, prefer smaller = not a running balance)
    const txAmt = amounts.length > 1
      ? amounts.reduce((a,b) => a.val < b.val ? a : b)
      : amounts[0];

    // Direction
    const hasNeg     = /(?:^|\s)-\$?[\d]|\(-/.test(line) || txAmt.inParens;
    const hasCredit  = /\b(cr|credit|deposit|refund|transfer in|received|salary|payroll)\b/i.test(line);
    const hasDebit   = /\b(dr|debit|purchase|withdrawal|payment|transfer out|charged|charge)\b/i.test(line);
    const type = hasCredit && !hasNeg ? 'income' : 'expense';

    // Description: strip date, amounts, keywords
    let desc = line;
    if (dateMatch) desc = desc.replace(dateMatch[0], '');
    desc = desc.replace(/\([\d,\.]+\)/g, '').replace(/\$?\s*[\d,]+\.\d{2}/g, '').replace(/\$[\d,]+/g, '');
    desc = desc.replace(/\b(cr|dr|debit|credit|purchase|withdrawal|deposit|refund|payment|transfer)\b/gi, '');
    desc = desc.replace(/[·•|#*\[\]]/g,' ').replace(/\s{2,}/g,' ').replace(/^[\-\/\s]+|[\-\/\s]+$/g,'').trim();
    if (desc.length < 2) continue;

    const note = desc.length > 42 ? desc.slice(0,42) : desc;
    const category = autoCategory(desc, type);

    results.push({ date: dateStr, amount: txAmt.val, type, note, category });
  }
  return results;
}

// ─── PDF Extractor ────────────────────────────────────────────────────────────
async function extractTextFromPDF(file) {
  const pdfjsLib = window['pdfjs-dist/build/pdf'];
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    // Reconstruct lines by grouping items with similar Y positions
    const items = content.items.map(item => ({
      text: item.str,
      x: item.transform[4],
      y: Math.round(item.transform[5]),
    }));
    // Group by Y, sort groups top-to-bottom, items left-to-right
    const lineMap = {};
    for (const item of items) {
      if (!lineMap[item.y]) lineMap[item.y] = [];
      lineMap[item.y].push(item);
    }
    const lines = Object.keys(lineMap)
      .map(Number)
      .sort((a, b) => b - a)
      .map(y => lineMap[y].sort((a, b) => a.x - b.x).map(i => i.text).join(' '));
    fullText += lines.join('\n') + '\n';
  }
  return fullText;
}




// ─── Logo ─────────────────────────────────────────────────────────────────────
function AppLogo() {
  const container = document.createElement('div');
  container.style.marginBottom = '16px';
  container.innerHTML = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 480 160' style='display:block;height:90px;width:auto'>
  <defs>
    <linearGradient id='lShield' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' stop-color='#1e3a8a'/><stop offset='100%' stop-color='#0c1e3d'/></linearGradient>
    <linearGradient id='lStroke' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' stop-color='#60a5fa'/><stop offset='100%' stop-color='#2563eb'/></linearGradient>
    <linearGradient id='lLine' x1='0%' y1='100%' x2='100%' y2='0%'><stop offset='0%' stop-color='#2563eb'/><stop offset='50%' stop-color='#34d399'/><stop offset='100%' stop-color='#60a5fa'/></linearGradient>
    <linearGradient id='lTitle' x1='0%' y1='0%' x2='100%' y2='0%'><stop offset='0%' stop-color='#e8f0fe'/><stop offset='100%' stop-color='#93c5fd'/></linearGradient>
    <linearGradient id='lSub' x1='0%' y1='0%' x2='100%' y2='0%'><stop offset='0%' stop-color='#60a5fa'/><stop offset='100%' stop-color='#3b82f6'/></linearGradient>
    <filter id='lGlow'><feGaussianBlur stdDeviation='3' result='blur'/><feMerge><feMergeNode in='blur'/><feMergeNode in='SourceGraphic'/></feMerge></filter>
  </defs>
  <path d='M80,26 L124,43 L124,88 Q124,116 80,132 Q36,116 36,88 L36,43 Z' fill='url(#lShield)' stroke='url(#lStroke)' stroke-width='1.5'/>
  <path d='M80,32 L118,47 L118,88 Q118,112 80,126' fill='none' stroke='white' stroke-width='0.8' opacity='0.1'/>
  <polyline points='48,98 60,88 72,92 84,74 96,78 108,60' fill='none' stroke='url(#lLine)' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round' filter='url(#lGlow)'/>
  <polygon points='48,98 60,88 72,92 84,74 96,78 108,60 108,106 48,106' fill='url(#lLine)' opacity='0.12'/>
  <circle cx='48'  cy='98' r='2.5' fill='#2563eb'/>
  <circle cx='72'  cy='92' r='2.5' fill='#3b82f6'/>
  <circle cx='96'  cy='78' r='2.5' fill='#60a5fa'/>
  <circle cx='108' cy='60' r='4'   fill='#34d399' stroke='#060c1a' stroke-width='1.5' filter='url(#lGlow)'/>
  <rect x='148' y='40' width='2' height='94' rx='1' fill='url(#lStroke)' opacity='0.5'/>
  <text x='162' y='78'  font-family='DM Sans,system-ui,sans-serif' font-size='42' font-weight='700' letter-spacing='-1' fill='url(#lTitle)'>Finance</text>
  <text x='162' y='122' font-family='DM Sans,system-ui,sans-serif' font-size='42' font-weight='700' letter-spacing='-1' fill='url(#lSub)'>Tracker</text>
</svg>`;
  return container;
}

function renderLogo() {
  return h('div', { style:{marginBottom:16}, dangerouslySetInnerHTML:{ __html: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 480 160' style='display:block;height:90px;width:auto'>
  <defs>
    <linearGradient id='lShield' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' stop-color='#1e3a8a'/><stop offset='100%' stop-color='#0c1e3d'/></linearGradient>
    <linearGradient id='lStroke' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' stop-color='#60a5fa'/><stop offset='100%' stop-color='#2563eb'/></linearGradient>
    <linearGradient id='lLine' x1='0%' y1='100%' x2='100%' y2='0%'><stop offset='0%' stop-color='#2563eb'/><stop offset='50%' stop-color='#34d399'/><stop offset='100%' stop-color='#60a5fa'/></linearGradient>
    <linearGradient id='lTitle' x1='0%' y1='0%' x2='100%' y2='0%'><stop offset='0%' stop-color='#e8f0fe'/><stop offset='100%' stop-color='#93c5fd'/></linearGradient>
    <linearGradient id='lSub' x1='0%' y1='0%' x2='100%' y2='0%'><stop offset='0%' stop-color='#60a5fa'/><stop offset='100%' stop-color='#3b82f6'/></linearGradient>
    <filter id='lGlow'><feGaussianBlur stdDeviation='3' result='blur'/><feMerge><feMergeNode in='blur'/><feMergeNode in='SourceGraphic'/></feMerge></filter>
  </defs>
  <path d='M80,26 L124,43 L124,88 Q124,116 80,132 Q36,116 36,88 L36,43 Z' fill='url(#lShield)' stroke='url(#lStroke)' stroke-width='1.5'/>
  <path d='M80,32 L118,47 L118,88 Q118,112 80,126' fill='none' stroke='white' stroke-width='0.8' opacity='0.1'/>
  <polyline points='48,98 60,88 72,92 84,74 96,78 108,60' fill='none' stroke='url(#lLine)' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round' filter='url(#lGlow)'/>
  <polygon points='48,98 60,88 72,92 84,74 96,78 108,60 108,106 48,106' fill='url(#lLine)' opacity='0.12'/>
  <circle cx='48'  cy='98' r='2.5' fill='#2563eb'/>
  <circle cx='72'  cy='92' r='2.5' fill='#3b82f6'/>
  <circle cx='96'  cy='78' r='2.5' fill='#60a5fa'/>
  <circle cx='108' cy='60' r='4'   fill='#34d399' stroke='#060c1a' stroke-width='1.5' filter='url(#lGlow)'/>
  <rect x='148' y='40' width='2' height='94' rx='1' fill='url(#lStroke)' opacity='0.5'/>
  <text x='162' y='78'  font-family='DM Sans,system-ui,sans-serif' font-size='42' font-weight='700' letter-spacing='-1' fill='url(#lTitle)'>Finance</text>
  <text x='162' y='122' font-family='DM Sans,system-ui,sans-serif' font-size='42' font-weight='700' letter-spacing='-1' fill='url(#lSub)'>Tracker</text>
</svg>` } });
}

// ─── TxRow component ─────────────────────────────────────────────────────────
function TxRow({ tx, showDate, swipedId, setSwipedId, onDelete }) {
  const meta   = getCatMeta(tx.type, tx.category);
  const swiped = swipedId === tx.id;

  return h('div', { className: 'tx-wrap' },
    h('button', { className: 'tx-delete-btn', onClick: () => onDelete(tx.id) }, 'Delete'),
    h('div', {
      className: 'tx-row' + (swiped ? ' swiped' : ''),
      onClick: () => setSwipedId(swiped ? null : tx.id),
    },
      h('div', { className: 'tx-icon', style: { background: meta.color + '20' } }, meta.icon),
      h('div', { className: 'tx-meta' },
        h('div', { className: 'tx-cat' }, tx.category),
        h('div', { className: 'tx-note' }, tx.note + (showDate ? ' · ' + tx.date.slice(5) : ''))
      ),
      h('div', { className: 'tx-amount ' + (tx.type === 'income' ? 'income-color' : 'expense-color') },
        (tx.type === 'income' ? '+' : '−') + fmt(tx.amount)
      )
    )
  );
}

// ─── Add Modal ───────────────────────────────────────────────────────────────
function AddModal({ onClose, onAdd }) {
  const [form, setForm] = useState({ type: 'expense', category: 'Food', amount: '', note: '', date: today.toISOString().slice(0,10) });
  const set = (k,v) => setForm(f => ({ ...f, [k]: v }));

  function submit() {
    const amt = parseFloat(form.amount);
    if (!amt || isNaN(amt)) return;
    onAdd({ ...form, amount: amt, id: Date.now() });
  }

  const cats = CATEGORIES[form.type];

  return h('div', { className: 'modal-overlay', onClick: e => { if(e.target===e.currentTarget) onClose(); } },
    h('div', { className: 'modal-box' },
      h('div', { className: 'modal-title' }, 'Add Transaction'),
      h('div', { className: 'seg-row' },
        h('button', { className: 'seg-btn' + (form.type==='expense'?' active':''), onClick: () => setForm(f=>({...f,type:'expense',category:'Food'})) }, 'Expense'),
        h('button', { className: 'seg-btn' + (form.type==='income'?' active':''),  onClick: () => setForm(f=>({...f,type:'income',category:'Salary'})) }, 'Income'),
      ),
      h('label', { className: 'field-label' }, 'Category'),
      h('div', { className: 'cat-grid' },
        cats.map(c =>
          h('button', {
            key: c.label,
            className: 'cat-chip',
            style: form.category===c.label ? { border: `1px solid ${c.color}`, background: c.color+'22', color: c.color } : {},
            onClick: () => set('category', c.label),
          }, c.icon + ' ' + c.label)
        )
      ),
      h('label', { className: 'field-label' }, 'Amount ($)'),
      h('input', { className: 'field', type: 'number', inputMode: 'decimal', placeholder: '0.00', value: form.amount, onChange: e => set('amount', e.target.value) }),
      h('label', { className: 'field-label' }, 'Note'),
      h('input', { className: 'field', type: 'text', placeholder: 'Optional note', value: form.note, onChange: e => set('note', e.target.value) }),
      h('label', { className: 'field-label' }, 'Date'),
      h('input', { className: 'field', type: 'date', style:{colorScheme:'dark'}, value: form.date, onChange: e => set('date', e.target.value) }),
      h('button', { className: 'submit-btn', onClick: submit }, 'Add Transaction'),
    )
  );
}

// ─── Import Modal ─────────────────────────────────────────────────────────────
function ImportModal({ onClose, onImport }) {
  const [step,      setStep]      = useState('paste');
  const [mode,      setMode]      = useState('paste'); // 'paste' | 'pdf'
  const [text,      setText]      = useState('');
  const [parsed,    setParsed]    = useState([]);
  const [error,     setError]     = useState('');
  const [pdfName,   setPdfName]   = useState('');
  const [pdfLoading,setPdfLoading]= useState(false);
  const fileRef = { current: null };

  async function handlePDF(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!window['pdfjs-dist/build/pdf']) {
      setError('PDF.js is still loading — please wait a moment and try again.');
      return;
    }
    setPdfLoading(true);
    setError('');
    setPdfName(file.name);
    try {
      const extracted = await extractTextFromPDF(file);
      setText(extracted);
      setPdfLoading(false);
    } catch(err) {
      setError('Could not read the PDF. Try copying and pasting the text instead.');
      setPdfLoading(false);
    }
  }

  function runParse() {
    setError('');
    const results = parseStatement(text);
    if (!results.length) {
      setError('No transactions detected. Make sure the document has dates and dollar amounts on each line.');
      return;
    }
    setParsed(results.map((t,i) => ({ ...t, id: Date.now()+i, selected: true })));
    setStep('reviewing');
  }

  function toggle(id) { setParsed(p => p.map(t => t.id===id ? {...t,selected:!t.selected} : t)); }
  function selectAll(v) { setParsed(p => p.map(t => ({...t,selected:v}))); }

  function confirm() {
    onImport(parsed.filter(t=>t.selected));
    onClose();
  }

  const selectedCount = parsed.filter(t=>t.selected).length;
  const canParse = mode === 'paste' ? text.trim().length > 0 : (text.trim().length > 0 && !pdfLoading);

  if (step === 'paste') return h('div', { className: 'modal-overlay', onClick: e => { if(e.target===e.currentTarget) onClose(); } },
    h('div', { className: 'modal-box' },
      h('div', { className: 'modal-title' }, 'Import Bank Statement'),

      // Mode toggle
      h('div', { style:{display:'flex',gap:8,marginBottom:16} },
        h('button', {
          onClick: ()=>{ setMode('paste'); setText(''); setPdfName(''); setError(''); },
          style:{ flex:1, padding:'10px 0', borderRadius:10, border:'none', fontWeight:600, cursor:'pointer', fontSize:13, fontFamily:'inherit',
            background: mode==='paste'?'#1d4ed8':'#111e35', color: mode==='paste'?'#fff':'#6b8cc4' }
        }, '📋 Paste Text'),
        h('button', {
          onClick: ()=>{ setMode('pdf'); setText(''); setPdfName(''); setError(''); },
          style:{ flex:1, padding:'10px 0', borderRadius:10, border:'none', fontWeight:600, cursor:'pointer', fontSize:13, fontFamily:'inherit',
            background: mode==='pdf'?'#1d4ed8':'#111e35', color: mode==='pdf'?'#fff':'#6b8cc4' }
        }, '📄 Upload PDF'),
      ),

      // PASTE MODE
      mode === 'paste' && h('div', null,
        h('div', { className: 'modal-sub', style:{marginBottom:12} }, 'Copy and paste transactions from your bank\'s website.'),
        h('div', { className: 'code-hint' },
          h('strong', null, 'Formats supported:'),
          h('code', null,
            '05/01  PAYROLL DEPOSIT       $4,500.00', h('br'),
            '05/03  WHOLE FOODS MARKET    -$87.42', h('br'),
            'May 5 · Uber · -$24.00', h('br'),
            '2026-05-08  Netflix  15.99 DR', h('br'),
            '01/12/2026  Amazon  (132.50)',
          )
        ),
        h('label', { className: 'field-label' }, 'Paste your statement below'),
        h('textarea', { className: 'field', style:{height:'160px'}, placeholder:'Paste your bank transactions here...\n\nEach line should have a date and an amount.', value: text, onChange: e=>setText(e.target.value) }),
      ),

      // PDF MODE
      mode === 'pdf' && h('div', null,
        h('div', { className: 'modal-sub', style:{marginBottom:12} }, 'Upload a PDF bank statement. Text is extracted locally — your file never leaves your device.'),
        // Drop zone
        h('div', {
          onClick: () => { const inp = document.getElementById('pdf-file-input'); if(inp) inp.click(); },
          style:{ border:'2px dashed #2e2e3e', borderRadius:14, padding:'28px 20px', textAlign:'center', cursor:'pointer',
            background: pdfName?'#0a2018':'#111e35', marginBottom:14, transition:'all .2s' }
        },
          h('input', { id:'pdf-file-input', type:'file', accept:'.pdf,application/pdf', style:{display:'none'}, onChange: handlePDF }),
          pdfLoading
            ? h('div', null,
                h('div', { style:{fontSize:28,marginBottom:8} }, '⏳'),
                h('div', { style:{fontSize:14,color:'#6b8cc4'} }, 'Extracting text from PDF…'),
              )
            : pdfName
            ? h('div', null,
                h('div', { style:{fontSize:28,marginBottom:8} }, '✅'),
                h('div', { style:{fontSize:14,color:'#34d399',fontWeight:600,marginBottom:4} }, pdfName),
                h('div', { style:{fontSize:12,color:'#6b8cc4'} }, `${text.split('\n').filter(l=>l.trim()).length} lines extracted — tap to change`),
              )
            : h('div', null,
                h('div', { style:{fontSize:32,marginBottom:8} }, '📄'),
                h('div', { style:{fontSize:14,color:'#6b8cc4',fontWeight:600,marginBottom:4} }, 'Tap to select a PDF'),
                h('div', { style:{fontSize:12,color:'#3a5278'} }, 'Bank statements, credit card bills, etc.'),
              ),
        ),
        // Preview extracted text
        pdfName && !pdfLoading && h('div', null,
          h('label', { className: 'field-label' }, 'Extracted text preview'),
          h('textarea', { className: 'field', style:{height:'120px',fontSize:11,color:'#6b8cc4'}, readOnly:true, value: text }),
        ),
      ),

      error && h('div', { className: 'error-box' }, error),
      h('button', { className: mode==='pdf'?'import-btn':'import-btn', style:{background: mode==='pdf'?'linear-gradient(135deg,#0ea5e9,#0284c7)':'linear-gradient(135deg,#0ea5e9,#0284c7)'}, disabled: !canParse, onClick: runParse },
        pdfLoading ? 'Extracting PDF…' : 'Parse & Categorize →'
      ),
    )
  );

  return h('div', { className: 'modal-overlay', onClick: e => { if(e.target===e.currentTarget) onClose(); } },
    h('div', { className: 'modal-box' },
      h('div', { className: 'modal-title' }, 'Review Transactions'),
      h('div', { className: 'modal-sub' }, `${parsed.length} transaction${parsed.length!==1?'s':''} found. Tap any to deselect.`),
      h('div', { className: 'review-controls' },
        h('button', { className: 'review-ctrl-btn', style:{color:'#60a5fa',fontWeight:600}, onClick: ()=>selectAll(true)  }, 'Select all'),
        h('button', { className: 'review-ctrl-btn', style:{color:'#6b8cc4'},               onClick: ()=>selectAll(false) }, 'Deselect all'),
      ),
      h('div', { className: 'review-list' },
        parsed.map(tx => {
          const meta = getCatMeta(tx.type, tx.category);
          return h('div', {
            key: tx.id,
            className: 'review-item ' + (tx.selected ? 'selected' : 'deselected'),
            onClick: () => toggle(tx.id),
          },
            h('div', { className: 'review-checkbox ' + (tx.selected ? 'checked' : '') }, tx.selected ? '✓' : ''),
            h('div', { className: 'tx-icon', style: { background: meta.color+'20', width:34, height:34, fontSize:15, flexShrink:0 } }, meta.icon),
            h('div', { style:{flex:1,minWidth:0} },
              h('div', { style:{fontSize:13,fontWeight:600,color:'#e8f0fe'} }, tx.category),
              h('div', { style:{fontSize:11,color:'#6b8cc4',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'} }, tx.note + ' · ' + tx.date.slice(5)),
            ),
            h('div', { style:{fontSize:14,fontWeight:700,color:tx.type==='income'?'#4ade80':'#f87171',flexShrink:0} },
              (tx.type==='income'?'+':'−') + fmt(tx.amount)
            ),
          );
        })
      ),
      h('button', { className: 'import-btn', onClick: confirm },
        `Import ${selectedCount} Transaction${selectedCount!==1?'s':''}`
      ),
      h('button', { className: 'back-btn', onClick: ()=>setStep('paste') }, '← Back to edit'),
    )
  );
}

// ─── Home Tab ─────────────────────────────────────────────────────────────────
function HomeTab({ txs, balance, totalIncome, totalExpense, swipedId, setSwipedId, onDelete }) {
  const recent = [...txs].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,5);
  return h('div', null,
    h('div', { className: 'header' },
      h('div', { className: 'app-logo-bar', style:{paddingBottom:0,paddingTop:20,paddingLeft:24} }, renderLogo()),
      h('div', { className: 'greeting' }, MONTHS[today.getMonth()] + ' ' + today.getFullYear()),
      h('div', { className: 'bal-label' }, 'Net balance'),
      h('div', { className: 'bal-amount ' + (balance>=0?'bal-positive':'bal-negative') }, fmt(balance)),
      h('div', { className: 'pill-row' },
        h('div', { className: 'pill', style:{border:'1px solid #4ade8022'} },
          h('div', { className: 'pill-label' }, 'Income'),
          h('div', { className: 'pill-val', style:{color:'#34d399'} }, fmt(totalIncome)),
        ),
        h('div', { className: 'pill', style:{border:'1px solid #f8717122'} },
          h('div', { className: 'pill-label' }, 'Expenses'),
          h('div', { className: 'pill-val', style:{color:'#f87171'} }, fmt(totalExpense)),
        ),
      ),
    ),
    h('div', { className: 'section' },
      h('div', { className: 'section-title' }, 'Recent transactions'),
      recent.length === 0
        ? h('div', { className: 'empty-state' },
            'No transactions yet',
            h('br'),
            h('span', { className: 'empty-hint' }, 'Tap ＋ to add or 📋 to import a statement'),
          )
        : recent.map(tx => h(TxRow, { key: tx.id, tx, showDate: false, swipedId, setSwipedId, onDelete }))
    )
  );
}

// ─── Charts Tab ──────────────────────────────────────────────────────────────
function ChartsTab({ last6Months, expenseByCategory, totalExpense }) {
  return h('div', null,
    h('div', { className: 'header', style:{paddingBottom:24} },
      h('div', { style:{padding:'20px 24px 0'} }, renderLogo()),
      h('div', { className: 'greeting' }, 'Analytics'),
      h('div', { style:{fontSize:28,fontWeight:700,letterSpacing:'-.02em'} }, 'Income vs Expenses'),
    ),
    h('div', { className: 'section' },
      h('div', { className: 'section-title' }, 'Last 6 months'),
      h(ResponsiveContainer, { width:'100%', height:180 },
        h(BarChart, { data: last6Months, barCategoryGap:'30%' },
          h(XAxis, { dataKey:'month', tick:{fill:'#6b8cc4',fontSize:11}, axisLine:false, tickLine:false }),
          h(YAxis, { hide: true }),
          h(Tooltip, { contentStyle:{background:'#111e35',border:'1px solid #2e2e3e',borderRadius:10,color:'#e8f0fe',fontSize:12}, formatter: v=>fmt(v) }),
          h(Bar, { dataKey:'income',  fill:'#4ade80', radius:[6,6,0,0] }),
          h(Bar, { dataKey:'expense', fill:'#f87171', radius:[6,6,0,0] }),
        )
      ),
      h('div', { className: 'chart-legend' },
        h('span', { className: 'legend-dot', style:{color:'#34d399'} }, '● Income'),
        h('span', { className: 'legend-dot', style:{color:'#f87171'} }, '● Expenses'),
      ),
    ),
    h('div', { className: 'section' },
      h('div', { className: 'section-title' }, 'Spending by category (this month)'),
      expenseByCategory.length > 0
        ? h('div', null,
            h(ResponsiveContainer, { width:'100%', height:180 },
              h(PieChart, null,
                h(Pie, { data:expenseByCategory, cx:'50%', cy:'50%', innerRadius:50, outerRadius:80, paddingAngle:3, dataKey:'value' },
                  expenseByCategory.map((e,i) => h(Cell, { key:i, fill:e.color }))
                ),
                h(Tooltip, { contentStyle:{background:'#111e35',border:'1px solid #2e2e3e',borderRadius:10,color:'#e8f0fe',fontSize:12}, formatter:v=>fmt(v) }),
              )
            ),
            h('div', { className: 'cat-breakdown' },
              expenseByCategory.map((c,i) =>
                h('div', { key:i, className:'cat-breakdown-row' },
                  h('div', { className:'cat-dot', style:{background:c.color} }),
                  h('span', { style:{flex:1,fontSize:13,color:'#6b8cc4'} }, c.icon + ' ' + c.name),
                  h('span', { style:{fontSize:13,fontWeight:600,color:'#e8f0fe'} }, fmt(c.value)),
                  h('span', { style:{fontSize:12,color:'#6b8cc4'} }, (totalExpense ? Math.round(c.value/totalExpense*100) : 0) + '%'),
                )
              )
            ),
          )
        : h('div', { style:{color:'#3a5278',textAlign:'center',padding:'32px 0'} }, 'No expense data this month'),
    )
  );
}

// ─── Summary Tab ─────────────────────────────────────────────────────────────
function SummaryTab({ txs, selectedMonth, setSelectedMonth, selectedYear, currentMonthTxs, totalIncome, totalExpense, balance, swipedId, setSwipedId, onDelete }) {
  const sorted = [...currentMonthTxs].sort((a,b)=>new Date(b.date)-new Date(a.date));
  return h('div', null,
    h('div', { className: 'header', style:{paddingBottom:24} },
      h('div', { style:{padding:'20px 24px 0'} }, renderLogo()),
      h('div', { className: 'greeting' }, 'Monthly summary'),
      h('div', { style:{fontSize:28,fontWeight:700,letterSpacing:'-.02em'} }, MONTHS[selectedMonth] + ' ' + selectedYear),
    ),
    h('div', { style:{padding:'0 24px'} },
      h('div', { className: 'month-scroll' },
        MONTHS.map((m,i) =>
          h('button', { key:i, className:'month-btn'+(i===selectedMonth?' active':''), onClick:()=>setSelectedMonth(i) }, m)
        )
      )
    ),
    h('div', { className: 'section' },
      h('div', { className: 'summary-cards' },
        [{label:'Income',val:fmt(totalIncome),color:'#34d399'},{label:'Expenses',val:fmt(totalExpense),color:'#f87171'},{label:'Saved',val:fmt(Math.max(0,balance)),color:'#60a5fa'}]
          .map((s,i) =>
            h('div', { key:i, className:'summary-card', style:{border:`1px solid ${s.color}18`} },
              h('div', { className:'summary-card-label' }, s.label),
              h('div', { className:'summary-card-val', style:{color:s.color} }, s.val),
            )
          )
      ),
      h('div', { className: 'section-title' }, 'All transactions'),
      sorted.length === 0
        ? h('div', { style:{color:'#3a5278',textAlign:'center',padding:'32px 0'} }, 'No transactions this month')
        : sorted.map(tx => h(TxRow, { key:tx.id, tx, showDate:true, swipedId, setSwipedId, onDelete }))
    )
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────
function App() {
  const [tab, setTab] = useState('home');
  const [txs, setTxs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('finapp_txs') || '[]'); } catch { return []; }
  });
  const [showAdd,    setShowAdd]    = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedYear]  = useState(today.getFullYear());
  const [swipedId, setSwipedId] = useState(null);

  useEffect(() => { localStorage.setItem('finapp_txs', JSON.stringify(txs)); }, [txs]);

  function onDelete(id) { setTxs(p=>p.filter(t=>t.id!==id)); setSwipedId(null); }
  function onAdd(tx)     { setTxs(p=>[tx,...p]); setShowAdd(false); }
  function onImport(list){ setTxs(p=>[...list,...p]); }

  const currentMonthTxs = useMemo(() =>
    txs.filter(t=>{ const d=new Date(t.date); return d.getMonth()===selectedMonth && d.getFullYear()===selectedYear; }),
    [txs,selectedMonth,selectedYear]);

  const totalIncome  = useMemo(()=>currentMonthTxs.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0),  [currentMonthTxs]);
  const totalExpense = useMemo(()=>currentMonthTxs.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0), [currentMonthTxs]);
  const balance = totalIncome - totalExpense;

  const expenseByCategory = useMemo(() => {
    const map = {};
    currentMonthTxs.filter(t=>t.type==='expense').forEach(t=>{ map[t.category]=(map[t.category]||0)+t.amount; });
    return Object.entries(map).map(([name,value])=>({ name, value, ...getCatMeta('expense',name) }));
  }, [currentMonthTxs]);

  const last6Months = useMemo(() =>
    Array.from({length:6},(_,i)=>{
      const m = (selectedMonth-5+i+12)%12;
      const y = (selectedMonth-5+i<0) ? selectedYear-1 : selectedYear;
      const mt = txs.filter(t=>{ const d=new Date(t.date); return d.getMonth()===m && d.getFullYear()===y; });
      return { month:MONTHS[m], income:mt.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0), expense:mt.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0) };
    }), [txs,selectedMonth,selectedYear]);

  const navItems = [
    { id:'home',    icon:'⊞', label:'Home'    },
    { id:'charts',  icon:'◉', label:'Charts'  },
    { id:'summary', icon:'≡', label:'Summary' },
  ];

  const sharedRowProps = { swipedId, setSwipedId, onDelete };

  return h('div', { id:'app' },
    h('div', { className:'content' },
      tab==='home'    && h(HomeTab,    { txs, balance, totalIncome, totalExpense, ...sharedRowProps }),
      tab==='charts'  && h(ChartsTab,  { last6Months, expenseByCategory, totalExpense }),
      tab==='summary' && h(SummaryTab, { txs, selectedMonth, setSelectedMonth, selectedYear, currentMonthTxs, totalIncome, totalExpense, balance, ...sharedRowProps }),
    ),

    // FABs
    h('div', { className:'fab-row' },
      h('button', { className:'fab fab-import', title:'Import bank statement', onClick:()=>setShowImport(true) }, '📋'),
      h('button', { className:'fab fab-add',    title:'Add transaction',       onClick:()=>setShowAdd(true)   }, '＋'),
    ),

    // Bottom nav
    h('nav', { className:'bottom-nav' },
      navItems.map(n =>
        h('button', { key:n.id, className:'nav-btn'+(tab===n.id?' active':''), onClick:()=>setTab(n.id) },
          h('span', { className:'nav-icon' }, n.icon),
          n.label,
        )
      )
    ),

    // Modals
    showAdd    && h(AddModal,    { onClose:()=>setShowAdd(false),    onAdd }),
    showImport && h(ImportModal, { onClose:()=>setShowImport(false), onImport }),
  );
}

// ─── Mount ────────────────────────────────────────────────────────────────────
ReactDOM.createRoot(document.getElementById('app')).render(h(App));
