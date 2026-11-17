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
        var args = Array.prototype.slice.call(arguments);
        fetch(EXEC_URL, { method: 'POST', body: JSON.stringify({ fn: name, args: args }) })
          .then(function(r){ return r.json(); })
          .then(function(j){ if(j.error) throw new Error(j.error); if(ok) ok(j.result); })
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

  const TAB = [['home',/beranda|halaman utama|\bhome\b/],['hitung',/hitung|kalkulator/],['penyakit',/penyakit|diagnosa|diagnosis|gejala/],
    ['pakan',/pakan|formulasi|racik/],['cuan',/cuan|untung|laba|rugi/],['edukasi',/edukasi|belajar|materi/]];
  const CAL = [['pakan-h',/pakan harian|kebutuhan pakan/],['pakan-induk',/pakan induk/],['abw',/\babw\b|berat rata/],['biomassa',/biomassa/],
    ['fcr',/\bfcr\b|konversi pakan/],['sr',/survival|\bsr\b|kelangsungan/],['adg',/\badg\b|pertumbuhan harian/],['sgr',/\bsgr\b|laju pertumbuhan/],
    ['vol',/volume/],['padat-induk',/kapasitas kolam|kolam induk/],['padat',/padat tebar/],['air',/kualitas air/],
    ['ovaprim',/ovaprim|hormon|ovaspec|ovagold/],['fekun',/fekunditas/],['hr',/hatching|daya tetas|\bhr\b/],['fr',/fertilization|pembuahan|\bfr\b/],
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
    [/\b(es ge er|esgeer|es je er|sjr)\b/g,'sgr'],[/\b(abe we|abwe|ab we)\b/g,'abw'],[/\b(es er)\b/g,'sr'],[/\b(ha er)\b/g,'hr'],[/\b(iwak|ivak|iwa|ibak|ikan) ?(ai|ay|ei|e i)\b/g,'iwak ai'],[/\b(iwak|ivak|iwa|ibak) (lensa|lenz|lens)\b/g,'iwak lens']];
  const fixT = t => FIX.reduce((x,[r,w]) => x.replace(r,w), t);

  /* Cari rumus dengan kemiripan kata (toleran salah dengar) */
  function fuzzyCalc(t){
    const ws = t.split(' ').filter(w => w.length >= 3);
    let best = null, bs = 0, tie = false;
    CALCS.forEach(c => {
      const nm = N(c.nama).split(' ').filter(w => w.length >= 3 && !/^(dan|rate|body|weight|average)$/.test(w));
      let sc = 0;
      nm.forEach(n => { if(ws.some(w => w === n || (n.length >= 5 && lev(w,n) <= 1) || (n.length === 3 && w.length === 3 && lev(w,n) <= 1))) sc++; });
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

  const NAV = /^(buka|bukakan|pindah|pindahkan|ganti|ke|kembali|menu|tab|rumus|kalkulator|halaman|tampilkan|pergi|beranda)\b/;

  window.astasRun = function(raw){
    raw = (raw || '').trim(); if(!raw) return;
    raw = angka(raw);
    $('astas-in').value = raw;
    const t = fixT(N(raw));
    if(/iwak lens|kamera|foto/.test(t)){ openLensChooser(); status('Iwak Lens dibuka.'); return; }
    if(/dengar|bacakan|baca jawaban/.test(t)){ bacakanJawaban(); return; }
    if(/^(tutup|keluar)/.test(t)){ tutupModal(); toggleChat(false); astasClose(); return; }
    if(/^(buka |bukakan |tampilkan )?(iwak ai|chat)$/.test(t)){ toggleChat(true); say('Iwak AI dibuka. Silakan sebutkan pertanyaanmu.'); return; }
    if(document.body.classList.contains('chat-open') && !NAV.test(t) && !/^(tanya|tanyakan)/.test(t)){ quickAsk(raw); return; }
    const tanya = t.match(/^(?:tanya|tanyakan)(?: iwak ai| ke iwak ai)?\s+(.+)/);
    if(tanya){ astasClose(); quickAsk(raw.replace(/^\S+\s*(iwak ai\s*)?/i,'')); return; }

    const calX = CAL.find(c => c[1].test(t));
    if(calcOpen() && /^(kembali|daftar)/.test(t)){ closeCalc(); say('Kembali ke daftar rumus.'); return; }

    /* FOKUS: selama rumus terbuka, semua ucapan dianggap isian rumus itu, kecuali ada kata perintah pindah */
    const pindah = NAV.test(t) || (calX && calX[0] !== currentType);
    if(calcOpen() && !pindah){
      if(/^(hitung|proses|hasil)\b/.test(t) && !/\d/.test(raw)){ calculateNow(); say($('calc-res').textContent); return; }
      fillCalc(raw); return;
    }
    /* FOKUS: tab penyakit terbuka */
    if($('sec-penyakit').classList.contains('on') && !pindah && !calX){ runDisease(t, raw); return; }

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
