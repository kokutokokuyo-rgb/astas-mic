/* gas-shim.js: pengganti google.script.run untuk GitHub Pages + masuk sederhana (nama + Gmail + kode kelas) + cache.
   Sebelum memuat file ini, halaman mengisi: window.GAS_EXEC (link /exec ASTAS). */
(function(){
  var URL = window.GAS_EXEC || '', SK = 'astas_session', sess = '', loginP = null;
  try{ sess = localStorage.getItem(SK) || ''; }catch(e){}
  var CACHE = { getStatus: 1 };
  var shimScript = { run: null, url: { getLocation: function(cb){ cb({ parameter: {} }); } } };

  function post(fn, args, token){
    return fetch(URL, { method: 'POST', body: JSON.stringify({ fn: fn, args: args, token: token || '' }) }).then(function(r){ return r.json(); });
  }
  function ls(k){ try{ return localStorage.getItem(k) || ''; }catch(e){ return ''; } }
  function showLogin(){
    if(loginP) return loginP;
    loginP = new Promise(function(resolve){
      var ov = document.createElement('div');
      ov.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#071B32;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;font-family:system-ui,sans-serif;text-align:center;padding:24px';
      var inp = 'width:100%;max-width:320px;padding:12px;border-radius:10px;border:0;font-size:16px;box-sizing:border-box';
      ov.innerHTML = '<div style="font-size:48px">🐟</div><b style="font-size:20px">ASTAS Catat</b>' +
        '<div style="font-size:14px;opacity:.8;max-width:300px">Masuk dengan nama dan email, tanpa kata sandi. Cukup sekali; setelah itu otomatis masuk.</div>' +
        '<input id="lg-n" placeholder="Nama" style="' + inp + '" autocomplete="name">' +
        '<input id="lg-e" type="email" placeholder="Email" style="' + inp + '" autocomplete="email">' +
        '<input id="lg-k" placeholder="Kode kelas" style="display:none;' + inp + '">' +
        '<button id="lg-b" style="padding:12px 28px;border:0;border-radius:99px;background:#21C7D9;color:#071B32;font-weight:800;font-size:16px;margin-top:6px">MASUK</button>' +
        '<div id="lg-x" style="color:#fecaca;font-size:13px;min-height:18px"></div>';
      document.body.appendChild(ov);
      var $ = function(i){ return document.getElementById(i); };
      $('lg-n').value = ls('astas_nama'); $('lg-e').value = ls('astas_email');
      $('lg-b').onclick = function(){
        var n = $('lg-n').value.trim(), e = $('lg-e').value.trim().toLowerCase(), k = $('lg-k').value.trim();
        if(!n || !e){ $('lg-x').textContent = 'Isi nama dan email.'; return; }
        $('lg-b').disabled = true; $('lg-x').textContent = 'Memeriksa…';
        post('login', [n, e, k]).then(function(j){
          if(j.error) throw new Error(j.error);
          sess = j.result; try{ localStorage.setItem(SK, sess); localStorage.setItem('astas_nama', n); localStorage.setItem('astas_email', e); }catch(x){}
          ov.remove(); loginP = null; resolve(sess);
        }).catch(function(x){ $('lg-x').textContent = x.message; $('lg-b').disabled = false; if(/kode kelas/i.test(x.message)) $('lg-k').style.display = 'block'; });
      };
    });
    return loginP;
  }
  function call(fn, args, retry){
    return Promise.resolve(sess || showLogin()).then(function(){ return post(fn, args, sess); }).then(function(j){
      if(j.error && /SESI/.test(j.error)){ sess = ''; try{ localStorage.removeItem(SK); }catch(e){} if(!retry) return call(fn, args, true); }
      return j;
    });
  }
  function mk(ok, fail){
    return new Proxy({}, { get: function(t, name){
      if(name === 'withSuccessHandler') return function(f){ return mk(f, fail); };
      if(name === 'withFailureHandler') return function(f){ return mk(ok, f); };
      return function(){
        var args = Array.prototype.slice.call(arguments), ck = 'astas_c_' + name;
        if(CACHE[name]){ try{ var c = localStorage.getItem(ck); if(c && ok) ok(JSON.parse(c)); }catch(e){} }
        call(name, args).then(function(j){
          if(j.error) throw new Error(j.error);
          if(CACHE[name]){ try{ localStorage.setItem(ck, JSON.stringify(j.result)); }catch(e){} }
          if(ok) ok(j.result);
        }).catch(function(e){ if(fail) fail({ message: e.message }); });
      };
    } });
  }
  shimScript.run = mk();
  window.google = { script: shimScript };
})();
