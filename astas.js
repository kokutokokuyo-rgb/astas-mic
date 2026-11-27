if('serviceWorker' in navigator){ navigator.serviceWorker.register('sw.js').catch(function(){}); }
/* ===== SHIM: menggantikan google.script.run agar app bisa jalan di GitHub Pages ===== */
(function(){
  var EXEC_URL = 'https://script.google.com/macros/s/AKfycbxiywEW0OFsOvtyD_fTs-kB22wZXvBH8aCOkVWcZ7vLiyZsSZmq50rly4wGwc7POYgYUA/exec';
  try{ if(!/^https:\/\/script\.google\.com\/.+\/exec$/.test(EXEC_URL)) EXEC_URL = localStorage.getItem('sff_exec') || ''; }catch(e){}
  if(!/^https:\/\/script\.google\.com\/.+\/exec$/.test(EXEC_URL)){
    EXEC_URL = (prompt('Tempel link aplikasi (berakhiran /exec):') || '').trim();
    try{ localStorage.setItem('sff_exec', EXEC_URL); }catch(e){}
  }
  function mk(ok, fail){
    return new Proxy({}, { get: function(t, name){
      if(name === 'withSuccessHandler') return function(f){ return mk(f, fail); };
      if(name === 'withFailureHandler') return function(f){ return mk(ok, f); };
      return function(){
        var args = Array.prototype.slice.call(arguments), ck = 'sff_c_' + name;
        if(name === 'getBahanBaku'){ try{ var c = localStorage.getItem(ck); if(c && ok) ok(JSON.parse(c)); }catch(e){} }
        fetch(EXEC_URL, { method: 'POST', body: JSON.stringify({ fn: name, args: args }) })
          .then(function(r){ return r.json(); })
          .then(function(j){ if(j.error) throw new Error(j.error); if(name === 'getBahanBaku'){ try{ localStorage.setItem(ck, JSON.stringify(j.result)); }catch(e){} } if(ok) ok(j.result); })
          .catch(function(e){ if(fail) fail({ message: e.message }); });
      };
    }});
  }
  window.google = { script: { run: mk(), url: { getLocation: function(cb){ cb({ parameter: {} }); } } } };
})();

/* ===== ASTAS ===== */
(function(){
  var st = document.createElement('style'); st.textContent = `
#astas-fab{background:#b45309;left:calc(12px + var(--sal));bottom:calc(var(--navh) + var(--sab) + 12px + var(--fab) + 10px);animation-delay:1.5s}
#astas-fab.on{background:#dc2626;animation:astasring 1.2s ease-out infinite}
@keyframes astasring{0%{box-shadow:0 0 0 0 rgba(220,38,38,.6)}100%{box-shadow:0 0 0 18px rgba(220,38,38,0)}}
@media (orientation:landscape){#astas-fab{left:auto;right:calc(var(--fr) + var(--sar));bottom:calc(14px + var(--sab) + 3*(var(--fab) + 10px))}}
#astas-box{position:fixed;z-index:95;top:calc(var(--hh) + 8px);left:12px;right:12px;max-width:520px;margin:0 auto;background:#fff;border:2px solid #b45309;border-radius:18px;padding:12px;box-shadow:0 10px 30px rgba(15,23,42,.3)}
#astas-msg{font-size:13px;font-weight:700;color:#7c2d12;margin-bottom:8px;max-height:96px;overflow-y:auto}
#astas-row{display:flex;gap:8px}
#astas-row input{flex:1;min-width:0;border:2px solid var(--line);border-radius:12px;padding:10px 12px;font:inherit;font-size:16px;outline:none}
#astas-row button{flex:none;width:44px;border:0;border-radius:12px;color:#fff;font-weight:900;font-size:16px}

#astas-box.native{top:auto;bottom:calc(var(--navh) + var(--sab) + 10px);left:84px;right:84px;max-width:none;padding:8px 12px;border-radius:14px}
#astas-box.native #astas-msg{margin:0;font-size:12.5px}
`; document.head.appendChild(st);
  var d = document.createElement('div'); d.innerHTML = `<button class="fab" id="astas-fab" onclick="astasOpen()" aria-label="ASTAS perintah suara"><span>🎙️</span><span>ASTAS</span></button>

<div id="astas-box" class="hidden">
  <div id="astas-msg">Ucapkan perintah, mis. "buka penyakit lele bintik putih" atau "hitung FCR pakan 50 panen 40".</div>
  <div id="astas-row">
    <input id="astas-in" type="text" placeholder="Ketik perintah..." enterkeyhint="send" onkeydown="if(event.key==='Enter')astasRun(this.value)">
    <button style="background:#b45309" onclick="astasRun($('astas-in').value)" aria-label="Kirim">➤</button>
    <button style="background:#059669" onclick="astasListen()" aria-label="Bicara">🎙️</button>
    <button style="background:#64748b" onclick="astasClose()" aria-label="Tutup">✕</button>
  </div>
</div>`;
  while(d.firstChild) document.body.appendChild(d.firstChild);
})();

(function(){
  let shell = false, hideT = null;
  const SRN = window.SpeechRecognition || window.webkitSpeechRecognition;
  const NATIVE = window.top === window.self && !!SRN;
  const N = s => (s||'').toLowerCase().replace(/[^a-z0-9,.\s]/g,' ').replace(/\s+/g,' ').trim()
    .replace(/\b([a-z]) ([a-z]) ([a-z])\b/g,'$1$2$3').replace(/\b([a-z]) ([a-z])\b/g,'$1$2');
  const status = t => {
    $('astas-msg').textContent = t;
    if(shell || NATIVE){ $('astas-box').classList.remove('hidden'); $('astas-row').style.display = 'none';
      clearTimeout(hideT); hideT = setTimeout(() => $('astas-box').classList.add('hidden'), 7000); }
  };
  const clean = t => t.replace(/[^\p{L}\p{N}\s.,:%\/()-]/gu,' ').replace(/\s+/g,' ');
  const micMsg = on => {
    const m = {type:'astas-speaking', on:on};
    if(NATIVE){ if(window.__astasPause) window.__astasPause(on); }
    else if(shell){ try{ window.top.postMessage(m,'*'); }catch(e){} }
    else if(micWin && !micWin.closed) micWin.postMessage(m,'*');
  };
  const tell = t => {
    if(pollT && !shell) return; /* mode pairing HP: suara dimatikan agar tidak terdengar mic */
    try{
      speechSynthesis.cancel(); micMsg(true);
      const u = new SpeechSynthesisUtterance(clean(t)); u.lang = 'id-ID';
      u.onend = u.onerror = () => micMsg(false);
      speechSynthesis.speak(u);
    }catch(e){ micMsg(false); }
  };
  const say = t => { status(t); tell(t); };
  window.__astasSay = say;

  const TAB = [['home',/beranda|halaman utama|\bhome\b/],['hitung',/hitung|kalkulator/],['penyakit',/penyakit|diagnosa|diagnosis|gejala/],
    ['pakan',/pakan|formulasi|racik/],['cuan',/cuan|untung|laba|rugi/],['edukasi',/edukasi|belajar|materi/]];
  const CAL = [['pakan-h',/pakan harian|kebutuhan pakan/],['pakan-induk',/pakan induk/],['abw',/\babw\b|berat rata|berat badan rata|average body|rata rata berat/],['biomassa',/biomassa/],
    ['fcr',/\bfcr\b|konversi pakan/],['sr',/survival|\bsr\b|kelangsungan/],['adg',/\badg\b|pertumbuhan harian/],['sgr',/\bsgr\b|laju pertumbuhan/],
    ['vol',/volume/],['padat-induk',/kapasitas kolam|kolam induk/],['padat',/padat tebar/],['air',/kualitas air/],
    ['ovaprim',/ovaprim|hormon|ovaspec|ovagold/],['fekun',/fekunditas/],['hr',/hatching|daya tetas|penetasan|\bhr\b/],['fr',/fertilization|pembuahan|\bfr\b/],
    ['wadah',/kapasitas wadah/],['obat',/dosis obat/],['packing',/packing/],['jantan-stimulan',/jantan|stimulan/],
    ['pijah-ulang',/pijah kembali|pijah ulang|jadwal pijah/],['jam-suntik',/waktu suntik|jam suntik|laten/],
    ['prediksi-telur',/prediksi telur|estimasi telur/],['total-larva',/total larva|produksi larva|prediksi larva/]];
  const IKAN = [['Lele',/lele/],['Nila',/nila/],['Patin',/patin/],['Bawal',/bawal/],['Gurame',/gurame|gurami/],
    ['Ikan Hias',/hias|cupang|koi/],['Udang',/udang|vaname|windu/]];
  const STOP = new Set(['ikan','pada','yang','dengan','buka','pilih','penyakit','diagnosa','gejala','ciri','lagi','sedang','saya','tampilkan','hasil','cek','tab','lele','nila','patin','bawal','gurame','udang']);

  function runDisease(t, raw){
    go('penyakit');
    let ik = IKAN.find(x => x[1].test(t));
    if(!ik && $('diag-ikan').value) ik = [$('diag-ikan').value, /./];
    if(!ik){ say('Halaman penyakit dibuka. Sebutkan jenis ikannya.'); return; }
    $('diag-ikan').value = ik[0]; updateGejala();
    const list = DB_PENYAKIT[ik[0]];
    const words = t.split(' ').filter(w => w.length > 3 && !STOP.has(w));
    let best = -1, bs = 0;
    list.forEach((it,i) => { const g = N(it.g); const s = words.filter(w => g.includes(w)).length; if(s > bs){ bs = s; best = i; } });
    if(bs > 0){
      $('diag-gejala').value = String(best); prosesDiagnosa();
      say([...$('res-diagnosa').querySelectorAll('p')].map(p => p.textContent).join('. '));
    } else {
      say('Ikan ' + ik[0] + ' dipilih. Sebutkan gejalanya, misalnya: ' + list[0].g);
    }
  }

  const calcOpen = () => $('sec-hitung').classList.contains('on') && $('split').classList.contains('has-detail');
  const lev = (a,b) => { const m=[]; for(let i=0;i<=a.length;i++) m[i]=[i]; for(let j=1;j<=b.length;j++) m[0][j]=j;
    for(let i=1;i<=a.length;i++) for(let j=1;j<=b.length;j++) m[i][j]=Math.min(m[i-1][j]+1,m[i][j-1]+1,m[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
    return m[a.length][b.length]; };
  /* Koreksi salah dengar yang umum (ADG jadi ABG, dll) */
  const FIX = [[/\b(abg|adji|adi ji|ad ge|adi ge|adegan|ade ge)\b/g,'adg'],[/\b(ef si er|efsier|ef se er|efcer)\b/g,'fcr'],
    [/\b(es ge er|esgeer|es je er|sjr)\b/g,'sgr'],[/\b(abe we|abwe|ab we)\b/g,'abw'],[/\b(es er)\b/g,'sr'],[/\b(ha er)\b/g,'hr'],[/\b(iwak|ivak|iwa|ibak|ikan) ?(ai|ay|ei|e i)\b/g,'iwak ai'],[/\b(iwak|ivak|iwa|ibak) (lensa|lenz|lens)\b/g,'iwak lens'],
    [/\b(a be we|abewe|abew|abuwe|abu|ab w)\b/g,'abw'],[/\b(pekunditas|vekunditas|fekonditas|fekundita|fekundias|fekunditaz|fekondias)\b/g,'fekunditas'],
    [/\b(hacing|hatsing|haching|hecing|heching|hating|hatcing)( rate| reit| ret| rete)?\b/g,'hatching rate']];
  const fixT = t => FIX.reduce((x,[r,w]) => x.replace(r,w), t);

  /* Cari rumus dengan kemiripan kata (toleran salah dengar) */
  function fuzzyCalc(t){
    const ws = t.split(' ').filter(w => w.length >= 3);
    let best = null, bs = 0, tie = false;
    CALCS.forEach(c => {
      const nm = N(c.nama).split(' ').filter(w => w.length >= 3 && !/^(dan|rate|body|weight|average)$/.test(w));
      let sc = 0;
      nm.forEach(n => { if(ws.some(w => w === n || (n.length >= 5 && lev(w,n) <= (n.length >= 8 ? 2 : 1)) || (n.length === 3 && w.length === 3 && lev(w,n) <= 1))) sc++; });
      if(sc > bs){ bs = sc; best = c.id; tie = false; } else if(sc === bs && sc > 0) tie = true;
    });
    return (bs >= 1 && !tie) ? best : null;
  }

  function fillCalc(raw){
    let rest = raw;
    const tt = fixT(N(raw));
    const sels = [...document.querySelectorAll('#calc-inputs select')];
    sels.forEach(se => {
      if(se.id === 'p-size'){
        const m = rest.match(/(\d+)\s*(?:sampai|hingga|sd|ke|-)\s*(\d+)/i);
        if(m){ const o = [...se.options].findIndex(op => op.text.replace(/\s/g,'').startsWith(m[1] + '-' + m[2])); if(o >= 0){ se.selectedIndex = o; rest = rest.replace(m[0],' '); } }
        return;
      }
      [...se.options].forEach((op,i) => {
        if(/^--/.test(op.text)) return;
        const nmx = N(op.text.replace(/\(.*\)/,''));
        if(nmx.length > 2 && new RegExp('\\b' + nmx + '\\b').test(tt)){ se.selectedIndex = i; se.dispatchEvent(new Event('change')); }
      });
    });
    const fields = [...document.querySelectorAll('#calc-inputs .fld')]
      .map(f => ({inp: f.querySelector('input[type=number]'), lab: N(f.querySelector('label').textContent)})).filter(f => f.inp);
    const tl = rest.toLowerCase(), re = /\d+(?:\.\d+)?/g, used = new Set(); let m, last = 0;
    while((m = re.exec(tl.replace(/(\d),(\d)/g,'$1.$2')))){
      const seg = N(tl.slice(last, m.index)).split(' '); last = m.index + m[0].length;
      let best = null, bs = 0;
      fields.forEach(f => {
        if(used.has(f)) return;
        const sc = f.lab.split(' ').filter(w => w.length >= 2 && (w.length === 2 ? seg.includes(w) : seg.join(' ').includes(w))).length;
        if(sc > bs){ bs = sc; best = f; }
      });
      if(!best) best = fields.find(f => !used.has(f));
      if(!best) break;
      best.inp.value = parseFloat(m[0]); used.add(best);
    }
    const miss = [];
    sels.forEach(se => { if(se.selectedIndex === 0 && /^--/.test(se.options[0].text)) miss.push(se.closest('.fld').querySelector('label').textContent.toLowerCase()); });
    fields.filter(f => f.inp.value === '').forEach(f => miss.push(f.lab));
    if(miss.length){ say('Tercatat. Sebutkan: ' + miss.join(', ') + '.'); return; }
    calculateNow();
    say($('calc-res').textContent);
  }

  function runCalc(id, raw){
    go('hitung'); setGrup('all'); openCalc(id);
    const c = CALCS.find(x => x.id === id);
    if(/\d/.test(raw)){ fillCalc(raw); return; }
    const lab = [...document.querySelectorAll('#calc-inputs label')].map(l => l.textContent).join(', ');
    say(c.nama + ' dibuka. Sebutkan: ' + lab + '.');
  }

  /* Ubah angka berupa kata ("seribu", "dua ribu lima ratus") jadi digit */
  const U = {nol:0,satu:1,dua:2,tiga:3,empat:4,lima:5,enam:6,tujuh:7,delapan:8,sembilan:9};
  const MUL = new Set(['puluh','ratus','ribu','juta','belas']);
  const isNumWord = w => w in U || MUL.has(w) || /^(sepuluh|sebelas|seratus|seribu|sejuta)$/.test(w);
  function angka(text){
    const tk = text.split(/\s+/), out = []; let i = 0;
    while(i < tk.length){
      const w = tk[i].toLowerCase();
      const startDigit = /^\d+$/.test(w) && i + 1 < tk.length && MUL.has(tk[i+1].toLowerCase()) && tk[i+1].toLowerCase() !== 'belas';
      if(!(isNumWord(w) && !MUL.has(w)) && !startDigit){ out.push(tk[i]); i++; continue; }
      let total = 0, cur = 0, u = 0, j = i;
      while(j < tk.length){
        const x = tk[j].toLowerCase();
        if(/^\d+$/.test(x) && j + 1 < tk.length && MUL.has(tk[j+1].toLowerCase())){ cur += parseInt(x,10); u = parseInt(x,10); }
        else if(x in U){ cur += U[x]; u = U[x]; }
        else if(x === 'sepuluh'){ cur += 10; u = 0; }
        else if(x === 'sebelas'){ cur += 11; u = 0; }
        else if(x === 'seratus'){ cur += 100; u = 0; }
        else if(x === 'seribu'){ total += (cur || 0) * 1000 + 1000; cur = 0; u = 0; }
        else if(x === 'sejuta'){ total += 1000000; cur = 0; u = 0; }
        else if(x === 'belas'){ cur += 10; u = 0; }
        else if(x === 'puluh'){ cur = cur - u + (u || 1) * 10; u = 0; }
        else if(x === 'ratus'){ cur = cur - u + (u || 1) * 100; u = 0; }
        else if(x === 'ribu'){ total += (cur || 1) * 1000; cur = 0; u = 0; }
        else if(x === 'juta'){ total = (total + (cur || 1)) * 1000000; cur = 0; u = 0; }
        else break;
        j++;
      }
      out.push(String(total + cur)); i = j;
    }
    return out.join(' ').replace(/(\d+) koma (\d+)/g, '$1.$2').replace(/\d{1,3}(?:\.\d{3})+(?!\d)/g, x => x.replace(/\./g,''));
  }

  /* ===== JARVIS: Pakan, Cuan, Edukasi, Kamera ===== */
  function fillByWords(raw, fields){
    const tl = raw.toLowerCase(), re = /\d+(?:\.\d+)?/g, used = new Set(); let m, last = 0;
    while((m = re.exec(tl))){
      const seg = N(tl.slice(last, m.index)); last = m.index + m[0].length;
      let best = null, bs = 0;
      fields.forEach(f => { if(!f.inp || used.has(f)) return; const sc = f.w.filter(w => seg.includes(w)).length; if(sc > bs){ bs = sc; best = f; } });
      if(!best) best = fields.find(f => f.inp && !used.has(f) && f.inp.value === '');
      if(!best) break;
      best.inp.value = parseFloat(m[0]); used.add(best);
    }
  }
  function runCuan(raw, t){
    if(/lain|operasional|listrik|tenaga|obat|transport/.test(t) && /\d/.test(raw) && document.querySelectorAll('.c-val').length <= 2) addCuanRow();
    const v = [...document.querySelectorAll('.c-val')], H = $('c-harga'), P = $('c-populasi'), B = $('c-bobot');
    fillByWords(raw, [{inp:H,w:['harga','jual']},{inp:P,w:['populasi','ekor','hidup','jumlah']},{inp:B,w:['bobot','berat','gram']},
      {inp:v[0],w:['pakan']},{inp:v[1],w:['benih','bibit']}].concat(v.slice(2).map(i => ({inp:i,w:['lain','operasional','listrik','tenaga','obat']}))));
    if(H.value && P.value && B.value && (/hitung|cek|untung|laba|rugi|hasil/.test(t) || v.some(i => i.value))){ hitungCuan(); say($('res-cuan').innerText); return; }
    const kurang = [[H,'harga jual'],[P,'populasi'],[B,'bobot panen']].filter(x => !x[0].value).map(x => x[1]);
    say(kurang.length ? 'Tercatat. Sebutkan: ' + kurang.join(', ') + '.' : 'Tercatat. Sebutkan biaya pakan atau benih, lalu ucapkan hitung.');
  }
  function bahanCocok(t){ return DB_BAHAN.filter(b => b.p > 0 && N(b.n.replace(/\(.*\)/,'')).split(' ').filter(w => w.length > 2).every(w => t.includes(w))); }
  function runPakan(raw, t){
    const tambah = [];
    bahanCocok(t).forEach(b => {
      const sels = [...document.querySelectorAll('#bahan-container select')];
      if(sels.some(se => se.options[se.selectedIndex].text.startsWith(b.n))) return;
      let se = sels.find(x => x.value === '0');
      if(!se){ tambahBarisBahan(); const a = document.querySelectorAll('#bahan-container select'); se = a[a.length - 1]; }
      se.selectedIndex = [...se.options].findIndex(o => o.text.startsWith(b.n)); tambah.push(b.n);
    });
    if(/\d/.test(raw)) fillByWords(raw, [{inp:$('fp-target'),w:['protein','target']},{inp:$('fp-total-kg'),w:['total','produksi','kilo','kg','campuran']}]);
    if(/hitung|racik|formulasi|proses/.test(t)){
      const pil = [...document.querySelectorAll('#bahan-container select')].map(se => parseFloat(se.value)).filter(x => x > 0);
      if(!$('fp-target').value || !$('fp-total-kg').value) return say('Sebutkan target protein dan total produksi dulu.');
      if(!pil.some(x => x < 20) || !pil.some(x => x >= 20)) return say('Butuh minimal satu bahan energi dan satu bahan protein.');
      prosesPakan();
      return say([...document.querySelectorAll('#res-pakan-mandiri .rline .t')].map(e => e.innerText.replace(/\s+/g,' ')).join('. ') || 'Selesai.');
    }
    say((tambah.length ? 'Ditambahkan: ' + tambah.join(', ') + '. ' : '') + 'Sebutkan bahan, target protein, dan total produksi, lalu ucapkan hitung.');
  }
  function eduItems(){
    const out = [];
    document.querySelectorAll('#sec-edukasi details.ac').forEach(d => {
      const sec = N(d.querySelector('summary').textContent);
      out.push({d, it:null, title:sec, txt:[...d.querySelectorAll('.it b')].map(b => b.textContent).join(', ')});
      d.querySelectorAll('.it').forEach(it => out.push({d, it, title:N(it.querySelector('b').textContent) + ' ' + sec, txt:it.querySelector('p').textContent}));
    });
    return out;
  }
  function eduFind(t){
    const ws = t.split(' ').filter(w => w.length > 3 && !/^(buka|bacakan|tampilkan|materi|tentang|edukasi)$/.test(w));
    let best = null, bs = 0;
    eduItems().forEach(x => {
      const kt = x.title.split(' ');
      const sc = ws.filter(w => x.title.includes(w) || (w.length > 5 && kt.some(k => lev(k, w) <= 1))).length;
      if(sc > bs || (sc === bs && sc > 0 && x.it && !best.it)){ bs = sc; best = x; }
    });
    return best ? {x:best, score:bs} : null;
  }
  function runEdu(t){
    const f = eduFind(t);
    if(!f){ say('Materi belum ditemukan. Sebut judulnya, misalnya kultur daphnia.'); return; }
    document.querySelectorAll('#sec-edukasi details').forEach(d => { d.open = (d === f.x.d); });
    (f.x.it || f.x.d).scrollIntoView({behavior:'smooth', block:'start'});
    say(f.x.it ? f.x.it.querySelector('b').textContent + '. ' + f.x.txt : 'Berisi: ' + f.x.txt);
  }
  /* Kamera Iwak Lens tanpa sentuhan */
  let camStream = null;
  function lensClose(){ if(camStream) camStream.getTracks().forEach(x => x.stop()); camStream = null; const v = $('astas-cam'); if(v) v.style.display = 'none'; }
  async function lensOpen(){
    if(!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)){ openLensChooser(); return; }
    try{ camStream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}}); }catch(e){ say('Kamera belum diizinkan. Buka Iwak Lens lewat tombol.'); return; }
    let v = $('astas-cam');
    if(!v){ v = document.createElement('video'); v.id = 'astas-cam'; v.autoplay = true; v.playsInline = true; v.muted = true;
      v.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;object-fit:cover;z-index:94;background:#000'; v.onclick = lensShot; document.body.appendChild(v); }
    v.srcObject = camStream; v.style.display = 'block'; say('Kamera siap. Ucapkan ambil foto.');
  }
  function lensShot(){
    const v = $('astas-cam'); if(!v || !camStream || !v.videoWidth) return false;
    const c = document.createElement('canvas'), sc = Math.min(1, 1000 / v.videoWidth);
    c.width = v.videoWidth * sc; c.height = v.videoHeight * sc; c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
    const d = c.toDataURL('image/jpeg', .75); lensClose();
    $('modal-content').innerHTML = '<div style="text-align:center;padding:20px 0"><div class="spin"></div><b style="color:#312e81">Iwak Lens sedang menganalisa...</b></div>';
    $('result-modal').classList.remove('hidden');
    google.script.run.withSuccessHandler(r => { $('modal-content').innerHTML = formatAiText(r.message); lastAiText = r.message; say(r.message); })
      .withFailureHandler(e => { $('modal-content').innerHTML = '<p style="color:#dc2626;font-weight:800">⚠️ ' + escapeHtml(e.message || String(e)) + '</p>'; })
      .processIwakAI(d, 'foto_lks.jpg');
    return true;
  }

  /* ===== TAB CATAT (ASTAS pencatatan, dimuat dari catat.html di halaman yang sama) ===== */
  const CATAT_START = /^(catat|catatan|daftarkan|sampling kolam|mulai batch|pindahkan benih|ingatkan|buat pengingat|laba rugi|kondisi kolam|performa kolam|bagaimana (batch|kondisi)|cek peringatan|kegiatan saya|(buka |tampilkan )?(dashboard|siklus|hitung ikan))/;
  (function(){
    const nav = document.getElementById('nav'), wrap = document.querySelector('#main .wrap');
    if(!nav || !wrap || document.getElementById('sec-catat')) return;
    nav.insertAdjacentHTML('beforeend', '<button data-s="catat" onclick="go(\'catat\')"><span class="ic">📝</span>Catat</button>');
    wrap.insertAdjacentHTML('beforeend', '<section class="sec" id="sec-catat"><iframe id="astas-catat" title="ASTAS Catat" allow="microphone; camera" style="width:100%;border:0;border-radius:16px;background:#eef2f8;height:calc(100dvh - var(--hh) - var(--navh) - var(--sab) - 40px)"></iframe></section>');
    const baseGo = window.go;
    window.go = function(sec){ baseGo(sec); if(sec === 'catat') catatLoad(); };
  })();
  function catatLoad(cb){
    const f = $('astas-catat'); if(!f) return;
    if(f.dataset.ready){ if(cb) cb(f); return; }
    if(cb) f._cb = (f._cb || []).concat(cb);
    if(!f.dataset.loading){
      f.dataset.loading = '1';
      f.onload = () => { f.dataset.ready = '1'; setTimeout(() => { (f._cb || []).forEach(c => c(f)); f._cb = []; }, 500); };
      f.src = 'catat.html';
    }
  }
  function catatSend(raw, t){
    go('catat');
    status('Dikirim ke ASTAS Catat: ' + raw);
    catatLoad(f => { try{ f.contentWindow.astasVoice(raw); }catch(e){ status('Halaman Catat belum siap. Coba lagi.'); } });
  }

  /* ===== SIMPAN HASIL HITUNG SFF KE CATATAN ASTAS ===== */
  function catatMsg(k){
    const v = [...document.querySelectorAll('#calc-inputs input')].map(i => parseFloat(i.value));
    const id = (typeof currentType !== 'undefined') ? currentType : '', f = n => Math.round(n * 100) / 100;
    if(id === 'abw' && v[1]) return 'Sampling ' + k + ' bobot rata-rata ' + f(v[0] / v[1]) + ' gram';
    if(id === 'adg' || id === 'sgr') return 'Sampling ' + k + ' bobot rata-rata ' + v[0] + ' gram';
    if(id === 'pakan-h') return 'Catat pakan ' + k + ' sebanyak ' + f(v[0] * v[1] / 100) + ' kilogram';
    if(id === 'air') return 'Catat kualitas air ' + k + ': suhu ' + v[0] + ' derajat Celsius, pH ' + v[1] + ', oksigen terlarut ' + v[2] + ' mg/L';
    return '';
  }
  function cuanMsg(k){
    const H = +$('c-harga').value, P = +$('c-populasi').value, B = +$('c-bobot').value, kg = P * B / 1000;
    const v = [...document.querySelectorAll('.c-val')].map(i => +i.value || 0), out = [];
    if(P && B) out.push('Panen ' + k + ' ' + P + ' ekor total ' + (Math.round(kg * 100) / 100) + ' kilogram');
    if(H && kg) out.push('pendapatan ' + Math.round(kg * H) + ' rupiah dari penjualan panen ' + k);
    if(v[0]) out.push('biaya variabel ' + Math.round(v[0]) + ' rupiah untuk pakan ' + k);
    if(v[1]) out.push('biaya variabel ' + Math.round(v[1]) + ' rupiah untuk benih ' + k);
    v.slice(2).forEach(x => { if(x) out.push('biaya variabel ' + Math.round(x) + ' rupiah operasional ' + k); });
    return out.length ? 'Catat sekaligus: ' + out.join('; ') : '';
  }
  function saveToCatat(hint, byVoice){
    let k = (hint || '').trim();
    if(!k){ try{ k = localStorage.getItem('sff_kolam') || ''; }catch(e){} }
    if(!k && byVoice){ say('Sebutkan nama kolamnya, misalnya: simpan ke catatan kolam 1.'); return; }
    if(!hint && !byVoice){ k = (prompt('Nama kolam untuk catatan (mis. kolam 1):', k) || '').trim(); }
    if(!k) return;
    try{ localStorage.setItem('sff_kolam', k); }catch(e){}
    const msg = $('sec-cuan').classList.contains('on') ? cuanMsg(k) : catatMsg(k);
    if(!msg){ status('Hasil ini dihitung otomatis oleh ASTAS dari catatan kolam, jadi yang disimpan adalah data mentahnya (pakan, kematian, sampling, panen).'); return; }
    catatSend(msg, N(msg));
  }
  (function(){
    const bc = window.calculateNow, bh = window.hitungCuan, SAVABLE = ['abw','adg','sgr','pakan-h','air'];
    const mkBtn = box => {
      if(box.querySelector('.astas-save')) return;
      const b = document.createElement('button'); b.type = 'button'; b.className = 'btn sm astas-save'; b.textContent = '💾 Simpan ke catatan ASTAS';
      b.onclick = () => saveToCatat('', false); box.appendChild(b);
    };
    if(bc) window.calculateNow = function(){ bc.apply(this, arguments); const box = $('calc-res'); if(box && !box.classList.contains('hidden') && SAVABLE.indexOf(currentType) >= 0) mkBtn(box); };
    if(bh) window.hitungCuan = function(){ bh.apply(this, arguments); const box = $('res-cuan'); if(box && !box.classList.contains('hidden')) mkBtn(box); };
  })();

  /* ===== PANDUAN PERINTAH SUARA + NAMA APLIKASI ===== */
  const HELP = [
    ['Pindah menu', ['buka hitung','buka penyakit lele bintik putih','buka pakan','buka cuan','buka edukasi','buka catat']],
    ['Kalkulator', ['buka ABW','buka hatching rate','buka fekunditas','buka FCR','pakan lima puluh panen empat puluh','rumus nomor enam','hitung','kembali']],
    ['Pakan mandiri', ['tambah tepung ikan lokal dan bungkil kedelai','target protein tiga puluh total seratus kilo hitung']],
    ['Cuan', ['harga dua puluh lima ribu populasi lima ribu bobot seratus lima puluh gram','biaya pakan tiga juta hitung']],
    ['Edukasi', ['buka kultur daphnia','buka hama dan penyakit larva']],
    ['Iwak AI dan Iwak Lens', ['buka Iwak AI','tanya cara memijahkan lele','buka Iwak Lens','ambil foto','dari galeri','bacakan jawaban']],
    ['Catat dengan ASTAS', ['catat pakan kolam 1 sebanyak 2 kilogram','daftarkan kolam 1 lele 2000 ekor bobot awal 5 gram','kondisi kolam saya','buka dashboard','laba rugi saya','ya','tidak']],
    ['Simpan hasil hitung', ['simpan ke catatan kolam 1']],
    ['Masukan', ['kirim masukan']]
  ];
  window.astasHelp = function(open){
    let m = document.getElementById('astas-help');
    if(!m){
      m = document.createElement('div'); m.className = 'modal hidden'; m.id = 'astas-help';
      m.onclick = ev => { if(ev.target === m) astasHelp(false); };
      m.innerHTML = '<div class="mbox" style="max-width:560px"><div class="mh"><span>🎙️ PERINTAH SUARA ASTAS</span><button class="ibtn" aria-label="Tutup" onclick="astasHelp(false)">✕</button></div><div class="mc" id="astas-help-body"></div><div class="mf"><button style="background:#4f46e5" onclick="astasHelp(false)">TUTUP</button></div></div>';
      document.body.appendChild(m);
      const body = document.getElementById('astas-help-body');
      const tip = document.createElement('p'); tip.style.cssText = 'margin:0 0 10px;font-size:13px;color:#475569';
      tip.textContent = 'Ketuk salah satu contoh untuk mencobanya. Tombol ASTAS merah berarti standby mendengarkan; ketuk untuk mematikan di tempat bising. Awali kalimat dengan "ASTAS" agar lebih pasti.';
      body.appendChild(tip);
      HELP.forEach(g => {
        const h = document.createElement('div'); h.style.cssText = 'font-weight:800;color:#312e81;margin:12px 0 6px;font-size:13px'; h.textContent = g[0]; body.appendChild(h);
        const w = document.createElement('div'); w.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px';
        g[1].forEach(x => { const b = document.createElement('button'); b.type = 'button'; b.textContent = x;
          b.style.cssText = 'border:1px solid #c7d2fe;background:#eef2ff;color:#312e81;border-radius:999px;padding:6px 12px;font-size:12.5px;font-weight:600;text-align:left';
          b.onclick = () => { astasHelp(false); astasRun(x); }; w.appendChild(b); });
        body.appendChild(w);
      });
    }
    m.classList.toggle('hidden', !open);
  };
  (function(){
    document.title = 'Smart Fish Farmer with ASTAS';
    const h1 = document.querySelector('.brand h1');
    if(h1) h1.innerHTML = 'SMART FISH FARMER <span style="font-weight:600;opacity:.85;font-size:11px;letter-spacing:1px">with ASTAS</span>';
    const hb = document.querySelector('.top .ibtn');
    if(hb && !document.getElementById('astas-helpbtn')){
      const b = document.createElement('button'); b.className = 'ibtn'; b.id = 'astas-helpbtn'; b.title = 'Perintah suara'; b.setAttribute('aria-label', 'Perintah suara'); b.textContent = '🎙️'; b.onclick = () => astasHelp(true);
      const w = document.createElement('div'); w.style.cssText = 'display:flex;gap:8px';
      hb.parentNode.insertBefore(w, hb); w.appendChild(b); w.appendChild(hb);
    }
  })();

  const NAV = /^(buka|bukakan|pindah|pindahkan|ganti|ke|kembali|menu|tab|rumus|kalkulator|halaman|tampilkan|pergi|beranda)\b/;

  window.astasRun = function(raw){
    raw = (raw || '').trim(); if(!raw) return;
    raw = angka(raw);
    const woke = /^(hai |hei |hey |halo |oke )?(astas|asta)\b/i.test(raw);
    raw = raw.replace(/^(hai |hei |hey |halo |oke )?(astas|asta)\b[\s,.:]*/i, '');
    if(!raw){ say('Ya, saya mendengarkan.'); return; }
    $('astas-in').value = raw;
    const t = fixT(N(raw));
    const fbm = document.getElementById('astas-fb');
    if(fbm && !fbm.classList.contains('hidden')){
      if(/^(kirim|kirim masukan|simpan)$/.test(t)) astasFbSend();
      else if(/^(batal|tutup)/.test(t)){ astasFb(false); say('Masukan dibatalkan.'); }
      else { const ta = document.getElementById('fb-t'); ta.value = (ta.value + ' ' + raw).trim(); status('Ditambahkan ke masukan. Ucapkan "kirim" untuk mengirim, atau "batal".'); }
      return;
    }
    if(/^(kirim masukan|masukan|saran|laporkan masalah)$/.test(t)){ astasFb(true); say('Silakan sebutkan masukanmu, lalu katakan kirim.'); return; }
    if(/^(tentang|info aplikasi)/.test(t)){ astasAbout(true); say('Ini informasi tentang aplikasi.'); return; }
    if(/^(bantuan|panduan suara|perintah suara|cara pakai|apa yang bisa|apa saja yang bisa)/.test(t)){ astasHelp(true); say('Ini daftar perintah suara. Ketuk salah satu contoh untuk mencobanya.'); return; }
    if(camStream && /ambil|jepret|foto|potret|capture/.test(t)){ lensShot(); return; }
    if(camStream && /batal|tutup|kembali/.test(t)){ lensClose(); say('Kamera ditutup.'); return; }
    if(/galeri|upload|unggah/.test(t)){
      openLensChooser();
      const g = document.querySelector('#lens-choice-modal .opt.g'); if(g){ g.style.outline = '4px solid #fbbf24'; setTimeout(() => { g.style.outline = ''; }, 8000); }
      say('Iwak Lens dibuka. Ketuk Upload dari Galeri di layar.'); return;
    }
    if(/ambil foto|kamera|jepret|potret/.test(t)){ try{ closeLensChooser(); }catch(e){} lensOpen(); return; }
    if(/iwak lens|\blens\b|foto|gambar/.test(t)){ openLensChooser(); say('Iwak Lens dibuka. Ucapkan ambil foto untuk kamera, atau ketuk Upload dari Galeri.'); return; }
    if(/dengar|bacakan|baca jawaban/.test(t)){ bacakanJawaban(); return; }
    if(/^(tutup|keluar)/.test(t)){ astasAbout(false); astasHelp(false); lensClose(); tutupModal(); toggleChat(false); astasClose(); return; }
    if(/^(buka |bukakan |tampilkan )?(iwak ai|chat)$/.test(t)){ toggleChat(true); say('Iwak AI dibuka. Silakan sebutkan pertanyaanmu.'); return; }
    if(document.body.classList.contains('chat-open') && !NAV.test(t) && !/^(tanya|tanyakan)/.test(t)){ quickAsk(raw); return; }
    const tanya = t.match(/^(?:tanya|tanyakan)(?: iwak ai| ke iwak ai)?\s+(.+)/);
    if(tanya){ astasClose(); quickAsk(raw.replace(/^\S+\s*(iwak ai\s*)?/i,'')); return; }

    if(/^(simpan|catat|masukkan)( hasil| ini| itu)?( ke| dalam)? (catatan|astas)/.test(t)){ const mk = t.match(/kolam\s+(\S+(?:\s+\S+)?)/); saveToCatat(mk ? 'kolam ' + mk[1] : '', true); return; }
    const inCatat = $('sec-catat') && $('sec-catat').classList.contains('on') && !NAV.test(t);
    if(CATAT_START.test(t) || /^(buka |bukakan )?(catat|pencatatan)$/.test(t)){ catatSend(raw, t); return; }
    if(inCatat){
      if(woke || t.split(' ').length >= 3 || /^(ya|iya|tidak|batal|jangan|simpan|oke|setuju|lanjut)\b/.test(t)) catatSend(raw, t);
      else status('Diabaikan (terlalu pendek): "' + raw + '". Awali dengan "ASTAS" bila itu perintah.');
      return;
    }
    const calX = CAL.find(c => c[1].test(t));
    if(calcOpen() && /^(kembali|daftar)/.test(t)){ closeCalc(); say('Kembali ke daftar rumus.'); return; }

    /* FOKUS: selama rumus terbuka, semua ucapan dianggap isian rumus itu, kecuali ada kata perintah pindah */
    const kolomKata = calcOpen() ? [...document.querySelectorAll('#calc-inputs label')].reduce((a, l) => a.concat(N(l.textContent).split(' ')), []).filter(w => w.length >= 3) : [];
    const sebutKolom = kolomKata.some(w => t.includes(w));
    const pindah = NAV.test(t) || (calX && calX[0] !== currentType && !sebutKolom);
    if(calcOpen() && !pindah){
      if(/^(hitung|proses|hasil)\b/.test(t) && !/\d/.test(raw)){ calculateNow(); say($('calc-res').textContent); return; }
      fillCalc(raw); return;
    }
    /* FOKUS: tab penyakit terbuka */
    if($('sec-penyakit').classList.contains('on') && !pindah && !calX){ runDisease(t, raw); return; }
    if(!pindah){
      if($('sec-pakan').classList.contains('on')){ runPakan(raw, t); return; }
      if($('sec-cuan').classList.contains('on')){ runCuan(raw, t); return; }
      if($('sec-edukasi').classList.contains('on')){ runEdu(t); return; }
    }
    if(!calX && bahanCocok(t).length){ go('pakan'); runPakan(raw, t); return; }
    const ef = eduFind(t);
    if(!calX && ef && ef.score >= 2 && NAV.test(t)){ go('edukasi'); runEdu(t); return; }

    if(/penyakit|diagnosa|diagnosis|gejala|sakit/.test(t) || (IKAN.some(x => x[1].test(t)) && /bintik|luka|kumis|insang|mata|sirip|perut|badan|sisik|kutu|jamur/.test(t) && !calX)){ runDisease(t, raw); return; }

    const nm = t.match(/\bnomor (\d+)/);
    if(nm){
      const grp = /benih/.test(t) ? 'benih' : (/besar|pembesaran/.test(t) ? 'besar' : (grupAktif === 'all' ? 'besar' : grupAktif));
      const c = CALCS.filter(x => x.g === grp)[parseInt(nm[1],10) - 1];
      if(c){ runCalc(c.id, raw.replace(/nomor \d+/i,'')); return; }
    }
    if(calX){ runCalc(calX[0], raw); return; }

    const tab = TAB.find(x => x[1].test(t));
    if(tab){ go(tab[0]); say('Membuka ' + tab[0] + '.'); return; }

    const fz = (NAV.test(t) || t.split(' ').length <= 5) ? fuzzyCalc(t) : null;
    if(fz){ runCalc(fz, raw); return; }

    if(NAV.test(t)) say('Belum paham. Coba sebut nama rumusnya, atau "rumus nomor" dan angkanya.');
    else status('Perintah belum dikenali: "' + raw + '"');
  };

  const MIC_URL = 'https://kokutokokuyo-rgb.github.io/astas-mic/cmd.html';
  const MIC_ORIGIN = 'https://kokutokokuyo-rgb.github.io';
  let micWin = null;
  window.astasListen = function(){
    if(shell){ status('Mode HP: mikrofon ada di bar bawah layar.'); return; }
    if(MOBILE){
      startPoll(getCode());
      status('Mode HP. Buka halaman mic (hp.html) di jendela terpisah dan masukkan kode: ' + getCode().toUpperCase() + '. Atau ketuk kolom di bawah, lalu tekan ikon mikrofon di keyboard.');
      return;
    }
    try{ window.speechSynthesis.cancel(); }catch(e){}
    if(micWin && !micWin.closed){ micWin.focus(); status('Jendela mic sudah terbuka. Tekan tombol bicara di sana.'); return; }
    micWin = window.open(MIC_URL, 'astasmic', 'width=420,height=560');
    status(micWin ? '🎙️ Jendela mic dibuka. Izinkan mikrofon, lalu tekan BICARA di sana.' : 'Pop-up diblokir browser. Izinkan pop-up untuk situs ini, atau ketik perintah di bawah.');
  };
  window.astasOpen = function(){ $('astas-box').classList.remove('hidden'); astasListen(); };
  window.astasClose = function(){ if(!shell) stopPoll(); $('astas-box').classList.add('hidden'); $('astas-fab').classList.remove('on'); };

  /* MODE HP / PAIRING: perintah dari halaman hp.html diterima lewat server (polling) */
  const MOBILE = /Android|iPhone|iPad/i.test(navigator.userAgent);
  let pollT = null, busy = false, code = '';
  function getCode(){
    try{ code = localStorage.getItem('astas_code') || ''; }catch(e){}
    if(!/^[a-z0-9]{6}$/.test(code)){ code = Math.random().toString(36).slice(2,8); try{ localStorage.setItem('astas_code', code); }catch(e){} }
    return code;
  }
  function startPoll(sid){
    stopPoll();
    pollT = setInterval(() => {
      if(busy) return; busy = true;
      google.script.run.withSuccessHandler(a => { busy = false; (a || []).forEach(c => astasRun(c)); })
        .withFailureHandler(() => { busy = false; }).astasPoll(sid);
    }, 2000);
  }
  function stopPoll(){ if(pollT){ clearInterval(pollT); pollT = null; } }
  try{ google.script.url.getLocation(loc => {
    const sid = loc.parameter && loc.parameter.sid; if(!sid) return;
    shell = true; $('astas-fab').classList.add('hidden'); startPoll(sid);
  }); }catch(e){}


  /* MODE NATIVE: halaman ini dibuka langsung (bukan iframe), mic langsung di sini */
  if(NATIVE){
    let on = false, paused = false, recN = null;
    $('astas-box').classList.add('native');
    const ui = () => $('astas-fab').classList.toggle('on', on && !paused);
    const startN = () => {
      if(!on || paused) return;
      try{ recN && recN.abort(); }catch(e){}
      recN = new SRN(); recN.lang = 'id-ID'; recN.continuous = true; recN.interimResults = false;
      recN.onresult = e => { for(let i = e.resultIndex; i < e.results.length; i++) if(e.results[i].isFinal) astasRun(e.results[i][0].transcript); };
      recN.onerror = e => { if(e.error === 'not-allowed' || e.error === 'service-not-allowed'){ on = false; ui(); status('Mikrofon belum diizinkan. Izinkan mikrofon untuk situs ini di Chrome.'); } };
      recN.onend = () => { if(on && !paused) setTimeout(startN, 300); };
      try{ recN.start(); }catch(e){}
    };
    window.__astasPause = p => { paused = p; if(p){ try{ recN && recN.abort(); }catch(e){} } else if(on) setTimeout(startN, 500); ui(); };
    window.__astasIsOn = () => on;
    window.astasOpen = window.astasListen = function(){
      on = !on; paused = false; ui();
      if(on){ startN(); status('🎙️ ASTAS standby aktif. Ucapkan perintah.'); try{ navigator.wakeLock && navigator.wakeLock.request('screen'); }catch(e){} }
      else { try{ recN && recN.abort(); }catch(e){} status('ASTAS standby dimatikan.'); }
    };
    window.addEventListener('load', () => setTimeout(() => { if(!on) astasOpen(); }, 800));
  }

  /* Jalur untuk jendela mic eksternal (mis. mic.html): window.opener.postMessage({type:'astas',text:'...'},'*') */
  window.addEventListener('message', e => {
    if(e.origin === MIC_ORIGIN && e.data && e.data.type === 'astas' && e.data.text){ $('astas-box').classList.remove('hidden'); astasRun(String(e.data.text)); }
  });
})();

/* ===== TEMA 2026: tema.css + ikon SVG (menggantikan emoji) ===== */
(function(){
  var lk = document.createElement('link'); lk.rel = 'stylesheet'; lk.href = 'tema.css'; document.head.appendChild(lk);
  var P = {
    home:'<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
    calc:'<path d="M5 20V11M12 20V4M19 20v-6"/><path d="M3 20h18"/>',
    steth:'<path d="M6 3v6a4 4 0 0 0 8 0V3"/><path d="M10 13v1a5 5 0 0 0 10 0v-2"/><circle cx="20" cy="10" r="2"/>',
    bowl:'<path d="M4 11h16a8 8 0 0 1-16 0z"/><path d="M8 7c0-2 2-2 2-4M13 7c0-2 2-2 2-4"/>',
    coin:'<circle cx="12" cy="12" r="9"/><path d="M14.5 9.2a3 3 0 0 0-5 1.6c0 3 5 1.5 5 4.4a3 3 0 0 1-5 1.6M12 6.5v1.8M12 15.7v1.8"/>',
    book:'<path d="M3 5h6a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H3z"/><path d="M21 5h-6a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h7z"/>',
    note:'<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/>',
    mic:'<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
    spk:'<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>',
    cam:'<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    fish:'<path d="M2 12c3-4 7-6 11-5 2 .6 4 2 5 5-1 3-3 4.5-5 5-4 1-8-1-11-5z"/><path d="M18 12l4-4v8z"/><circle cx="8" cy="11" r=".8"/>',
    egg:'<path d="M12 3c3.5 0 6 6 6 10a6 6 0 0 1-12 0c0-4 2.5-10 6-10z"/>'
  };
  var svg = function(n){ return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[n] || '') + '</svg>'; };
  var SEC = {home:'home', hitung:'calc', penyakit:'steth', pakan:'bowl', cuan:'coin', edukasi:'book', catat:'note'};
  document.querySelectorAll('#nav button[data-s]').forEach(function(b){ var ic = b.querySelector('.ic'); if(ic && SEC[b.dataset.s]) ic.innerHTML = svg(SEC[b.dataset.s]); });
  document.querySelectorAll('.tile').forEach(function(t){
    var o = t.getAttribute('onclick') || '', n = /besar/.test(o) ? 'calc' : /benih/.test(o) ? 'egg' : /penyakit/.test(o) ? 'steth' : /pakan/.test(o) ? 'bowl' : /cuan/.test(o) ? 'coin' : /edukasi/.test(o) ? 'book' : '';
    var ti = t.querySelector('.ti'); if(ti && n) ti.innerHTML = svg(n);
  });
  document.querySelectorAll('.sec').forEach(function(sec){ var c = sec.querySelector('.sec-h .chip'), n = SEC[(sec.id || '').replace('sec-','')]; if(c && n) c.innerHTML = svg(n); });
  var logo = document.querySelector('.logo'); if(logo) logo.innerHTML = svg('fish');
  var hb = document.getElementById('astas-helpbtn'); if(hb) hb.innerHTML = svg('mic');
  [['.fab.ai','fish'],['.fab.lens','cam'],['#astas-fab','mic']].forEach(function(x){ var f = document.querySelector(x[0]), sp = f && f.querySelector('span'); if(sp){ sp.className = 'ico'; sp.style.fontSize = ''; sp.innerHTML = svg(x[1]); } });
  var li = document.getElementById('listen-icon');
  if(li){ li.style.display = 'none'; li.insertAdjacentHTML('beforebegin', '<span class="ico">' + svg('spk') + '</span>'); }

  /* --- Footer dipindah ke jendela "Tentang"; emoji di banner diganti ikon; warna bilah browser --- */
  P.info = '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.5"/>';
  var small = function(n){ return svg(n).replace('<svg ', '<svg style="width:16px;height:16px;vertical-align:-3px;margin-right:6px" '); };
  var h2 = document.querySelector('.hero h2'); if(h2) h2.innerHTML = h2.innerHTML.replace(/\s*(\uD83D\uDC4B|&#128075;)\s*/, '');
  var hb2 = document.querySelectorAll('.hero-btns .btn-w');
  if(hb2[0]) hb2[0].innerHTML = small('fish') + 'Tanya Iwak AI';
  if(hb2[1]) hb2[1].innerHTML = small('cam') + 'Iwak Lens';
  var tc = document.querySelector('meta[name=theme-color]'); if(tc) tc.setAttribute('content', '#0c3b3d');
  var foot = document.querySelector('.foot'); if(foot) foot.style.display = 'none';
  var ab = document.createElement('div'); ab.className = 'modal hidden'; ab.id = 'astas-about';
  ab.onclick = function(e){ if(e.target === ab) astasAbout(false); };
  ab.innerHTML = '<div class="mbox" style="max-width:420px"><div class="mh"><span>TENTANG APLIKASI</span><button class="ibtn" aria-label="Tutup" onclick="astasAbout(false)">\u2715</button></div>' +
    '<div class="mc" style="text-align:center"><div style="color:#0f5c5c;display:grid;place-items:center">' + svg('fish').replace('<svg ', '<svg style="width:46px;height:46px" ') + '</div>' +
    '<div style="font-family:Bricolage Grotesque,Inter,sans-serif;font-weight:800;font-size:19px;color:#12201f;margin:8px 0 2px">Smart Fish Farmer</div>' +
    '<div style="font-weight:700;color:#0f766e;margin-bottom:12px">with ASTAS</div>' +
    '<div style="font-size:13px;color:#5c6b69;line-height:1.7">Aplikasi hitung, diagnosa, dan pencatatan budidaya ikan air tawar dengan asisten suara.<br><b style="color:#12201f">Developed by ECOSYSTEM FISHERY\u00AE</b><br>Agribisnis Perikanan Air Tawar \u00B7 SMKN 1 Plosoklaten Kediri<br>Versi uji coba \u00B7 \u00A9 2026</div></div>' +
    '<div class="mf"><button style="background:#0f5c5c" onclick="astasAbout(false);openTutorial()">PANDUAN</button><button style="background:#26373a" onclick="astasAbout(false);astasHelp(true)">SUARA</button><button style="background:#b45309" onclick="astasAbout(false);astasFb(true)">MASUKAN</button></div></div>';
  document.body.appendChild(ab);
  window.astasAbout = function(open){ ab.classList.toggle('hidden', !open); };

  /* --- Masukan pengguna, tur pertama kali, pemanasan server --- */
  var cid = function(){ var c = ''; try{ c = localStorage.getItem('sff_cid') || ''; if(!c){ c = Math.random().toString(36).slice(2, 12); localStorage.setItem('sff_cid', c); } }catch(e){ c = 'x'; } return c; };
  var say2 = function(t){ if(window.__astasSay) window.__astasSay(t); };
  var IN = 'width:100%;padding:10px;border:1px solid #d8d3c4;border-radius:10px;font:inherit;margin-bottom:8px;box-sizing:border-box;background:#fff';
  var fb = document.createElement('div'); fb.className = 'modal hidden'; fb.id = 'astas-fb';
  fb.onclick = function(e){ if(e.target === fb) astasFb(false); };
  fb.innerHTML = '<div class="mbox" style="max-width:460px"><div class="mh"><span>KIRIM MASUKAN</span><button class="ibtn" aria-label="Tutup" onclick="astasFb(false)">\u2715</button></div>' +
    '<div class="mc"><p style="margin:0 0 10px;font-size:13px;color:#5c6b69">Ada yang membingungkan, rusak, atau ingin ditambah? Tulis di sini, atau ucapkan lewat ASTAS lalu katakan "kirim".</p>' +
    '<select id="fb-j" style="' + IN + '"><option>Saran</option><option>Masalah</option><option>Pertanyaan</option></select>' +
    '<input id="fb-n" placeholder="Nama (boleh kosong)" style="' + IN + '">' +
    '<textarea id="fb-t" rows="5" placeholder="Tulis masukanmu..." style="' + IN + ';resize:vertical"></textarea><div id="fb-s" style="font-size:13px;font-weight:600;color:#0f5c5c;min-height:18px"></div></div>' +
    '<div class="mf"><button style="background:#64748b" onclick="astasFb(false)">BATAL</button><button id="fb-send" style="background:#0f5c5c" onclick="astasFbSend()">KIRIM</button></div></div>';
  document.body.appendChild(fb);
  window.astasFb = function(open){
    if(open){ try{ var n = document.getElementById('fb-n'); if(!n.value) n.value = localStorage.getItem('astas_nama') || ''; }catch(e){} document.getElementById('fb-s').textContent = ''; }
    fb.classList.toggle('hidden', !open);
  };
  window.astasFbSend = function(){
    var t = document.getElementById('fb-t').value.trim(), st = document.getElementById('fb-s'), bt = document.getElementById('fb-send');
    if(!t){ st.textContent = 'Tulis masukan dulu.'; return; }
    var tab = ((document.querySelector('#nav button.on') || {}).dataset || {}).s || '';
    bt.disabled = true; st.textContent = 'Mengirim...';
    google.script.run.withSuccessHandler(function(r){ st.textContent = r; document.getElementById('fb-t').value = ''; bt.disabled = false; say2('Terima kasih, masukanmu terkirim.'); setTimeout(function(){ astasFb(false); }, 1600); })
      .withFailureHandler(function(e){ st.textContent = e.message || 'Gagal mengirim. Coba lagi.'; bt.disabled = false; })
      .sendFeedback({ nama: document.getElementById('fb-n').value, jenis: document.getElementById('fb-j').value, pesan: t, tab: tab, cid: cid(), ua: navigator.userAgent });
  };

  var TOUR = [
    ['Selamat datang', 'Satu aplikasi untuk menghitung, mendiagnosa penyakit, dan mencatat kolam. Semuanya bisa lewat suara.'],
    ['Bicara dengan ASTAS', 'Tombol ASTAS berwarna merah berarti sedang mendengarkan. Izinkan mikrofon saat diminta. Di tempat bising, ketuk tombolnya untuk mematikan.'],
    ['Coba sekarang', 'Ketuk satu perintah di bawah untuk melihat hasilnya.']
  ];
  var tour = document.createElement('div'); tour.className = 'modal hidden'; tour.id = 'astas-tour'; tour.style.zIndex = 300;
  tour.innerHTML = '<div class="mbox" style="max-width:420px"><div class="mc" style="text-align:center;padding:26px 22px 8px"><div id="tr-i" style="color:#0f5c5c;display:grid;place-items:center"></div>' +
    '<div id="tr-t" style="font-family:Bricolage Grotesque,Inter,sans-serif;font-weight:800;font-size:20px;color:#12201f;margin:10px 0 6px"></div><div id="tr-x" style="font-size:14px;color:#475569;line-height:1.6"></div>' +
    '<div id="tr-c" style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:14px"></div><div id="tr-d" style="margin-top:16px"></div></div>' +
    '<div class="mf"><button id="tr-s" style="background:#64748b">LEWATI</button><button id="tr-n" style="background:#0f5c5c;flex:2">LANJUT</button></div></div>';
  document.body.appendChild(tour);
  window.astasTour = function(i){
    if(i === false){ tour.classList.add('hidden'); try{ localStorage.setItem('sff_tour', '1'); }catch(e){} return; }
    var last = i === TOUR.length - 1, icons = ['fish', 'mic', 'mic'];
    document.getElementById('tr-i').innerHTML = svg(icons[i]).replace('<svg ', '<svg style="width:44px;height:44px" ');
    document.getElementById('tr-t').textContent = TOUR[i][0]; document.getElementById('tr-x').textContent = TOUR[i][1];
    var c = document.getElementById('tr-c'); c.textContent = '';
    if(last){ ['buka hitung', 'buka penyakit lele bintik putih', 'buka edukasi'].forEach(function(x){
      var b = document.createElement('button'); b.type = 'button'; b.textContent = x; b.style.cssText = 'border:1px solid #c7d2fe;background:#eef2ff;color:#312e81;border-radius:999px;padding:7px 13px;font-size:13px;font-weight:600';
      b.onclick = function(){ astasTour(false); astasRun(x); }; c.appendChild(b); }); }
    document.getElementById('tr-d').innerHTML = TOUR.map(function(_, k){ return '<span style="display:inline-block;height:6px;border-radius:3px;margin:0 3px;background:' + (k === i ? '#0f5c5c' : '#d8d3c4') + ';width:' + (k === i ? 20 : 6) + 'px"></span>'; }).join('');
    document.getElementById('tr-n').textContent = last ? 'MULAI' : 'LANJUT';
    document.getElementById('tr-s').style.display = last ? 'none' : '';
    document.getElementById('tr-n').onclick = function(){ if(last) astasTour(false); else astasTour(i + 1); };
    document.getElementById('tr-s').onclick = function(){ astasTour(false); };
    tour.classList.remove('hidden');
  };
  var seenTour = false; try{ seenTour = !!localStorage.getItem('sff_tour'); }catch(e){}
  if(!seenTour){
    try{ localStorage.setItem('sff_tutorial_seen', '1'); }catch(e){}
    var t0 = setInterval(function(){ if(!document.getElementById('app-loading')){ clearInterval(t0); setTimeout(function(){ astasTour(0); }, 500); } }, 400);
  }
  try{ google.script.run.ping(); }catch(e){}

  var hb3 = document.getElementById('astas-helpbtn');
  if(hb3 && hb3.parentNode){
    var ib = document.createElement('button'); ib.className = 'ibtn'; ib.title = 'Tentang'; ib.setAttribute('aria-label', 'Tentang'); ib.innerHTML = svg('info'); ib.onclick = function(){ astasAbout(true); };
    hb3.parentNode.insertBefore(ib, hb3);
  }
})();
