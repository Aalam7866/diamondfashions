/* Diamond Fashions – shared code of the shop's phone apps (DF Staff, DF Tailoring, DF Reports).
   Sign-in with the shop's Firebase users, Firestore read / write over REST (no extra libraries), photos made small,
   Hindi / English. Nothing secret is written here: the apps read the shop's private data only after signing in. */
var DF = (function () {
  'use strict';
  var API_KEY = 'AIzaSyDEnVBUgdbQQnpy0aXKS4TFa8EmkuBnKW4';
  var PROJECT = 'diamond-fashions';
  // a test on this PC only (http://localhost…?api=http://localhost:PORT) talks to a pretend Firebase
  var qs = new URLSearchParams(location.search);
  var local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  var TEST = local && qs.get('api') ? qs.get('api').replace(/\/$/, '') : '';
  var AUTH = TEST ? TEST + '/auth' : 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword';
  var TOKEN = TEST ? TEST + '/token' : 'https://securetoken.googleapis.com/v1/token';
  var FS = TEST ? TEST + '/fs' : 'https://firestore.googleapis.com/v1/projects/' + PROJECT + '/databases/(default)/documents';

  // ---------------------------------------------------------------- language
  var lang = localStorage.getItem('df_lang') || 'hi';
  function t(en, hi) { return lang === 'hi' ? hi : en; }
  function setLang(l) { lang = l; localStorage.setItem('df_lang', l); }
  function getLang() { return lang; }

  // ---------------------------------------------------------------- sign-in (kept on this phone)
  function session() { try { return JSON.parse(localStorage.getItem('df_session') || 'null'); } catch (e) { return null; } }
  function save(s) { localStorage.setItem('df_session', JSON.stringify(s)); }
  function signOut() { localStorage.removeItem('df_session'); }

  function explain(status, msg) {
    var m = (msg || '').toUpperCase();
    if (/INVALID_LOGIN_CREDENTIALS|INVALID_PASSWORD|EMAIL_NOT_FOUND|INVALID_EMAIL/.test(m)) return t('Wrong email or password.', 'ईमेल या पासवर्ड गलत है।');
    if (/TOO_MANY_ATTEMPTS/.test(m)) return t('Too many wrong tries – wait a while and try again.', 'बहुत बार गलत – थोड़ी देर बाद फिर कोशिश करें।');
    if (/USER_DISABLED/.test(m)) return t('This user is switched off.', 'यह यूज़र बंद है।');
    if (status === 401 || status === 403 || /PERMISSION|UNAUTHENTICATED/.test(m))
      return t('This user may not see this (ask the owner to add your email to the Firebase rules).', 'इस यूज़र को अनुमति नहीं है (मालिक से अपना ईमेल Firebase rules में जुड़वाएँ)।');
    if (status === 404) return t('Not found yet – the shop PC has not sent it.', 'अभी नहीं मिला – दुकान के कंप्यूटर ने अभी नहीं भेजा।');
    return t('Problem: ', 'समस्या: ') + (msg || status);
  }

  function fail(status, text) {
    var msg = '';
    try { msg = JSON.parse(text).error.message || ''; } catch (e) { msg = ''; }
    var err = new Error(explain(status, msg));
    err.status = status;
    throw err;
  }

  function http(method, url, body, headers) {
    return fetch(url, { method: method, headers: headers || {}, body: body }).then(function (r) {
      return r.text().then(function (text) {
        if (!r.ok) fail(r.status, text);
        return text ? JSON.parse(text) : {};
      });
    }, function () {
      throw new Error(t('No internet connection.', 'इंटरनेट कनेक्शन नहीं है।'));
    });
  }

  function signIn(email, password) {
    return http('POST', AUTH + '?key=' + API_KEY, JSON.stringify({ email: email.trim(), password: password, returnSecureToken: true }),
      { 'Content-Type': 'application/json' }).then(function (r) {
        save({ email: r.email || email.trim(), idToken: r.idToken, refreshToken: r.refreshToken, exp: Date.now() + (+r.expiresIn || 3600) * 1000 });
        return session();
      });
  }

  function token() {
    var s = session();
    if (!s) return Promise.reject(new Error(t('Please sign in.', 'कृपया साइन इन करें।')));
    if (Date.now() < s.exp - 120000) return Promise.resolve(s.idToken);
    return http('POST', TOKEN + '?key=' + API_KEY, 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(s.refreshToken),
      { 'Content-Type': 'application/x-www-form-urlencoded' }).then(function (r) {
        s.idToken = r.id_token; s.refreshToken = r.refresh_token || s.refreshToken; s.exp = Date.now() + (+r.expires_in || 3600) * 1000;
        save(s);
        return s.idToken;
      }, function (e) { if (e.status) signOut(); throw e; });
  }

  function authed(method, url, body) {
    return token().then(function (tk) {
      var h = { Authorization: 'Bearer ' + tk };
      if (body) h['Content-Type'] = 'application/json';
      return http(method, url, body ? JSON.stringify(body) : undefined, h);
    });
  }

  // ---------------------------------------------------------------- Firestore values
  function enc(v) {
    if (v === null || v === undefined) return { nullValue: null };
    if (typeof v === 'string') return { stringValue: v };
    if (typeof v === 'boolean') return { booleanValue: v };
    if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    if (Array.isArray(v)) return { arrayValue: { values: v.map(enc) } };
    var f = {}; Object.keys(v).forEach(function (k) { f[k] = enc(v[k]); });
    return { mapValue: { fields: f } };
  }
  function dec(v) {
    if (!v) return null;
    if ('stringValue' in v) return v.stringValue;
    if ('booleanValue' in v) return v.booleanValue;
    if ('integerValue' in v) return Number(v.integerValue);
    if ('doubleValue' in v) return v.doubleValue;
    if ('nullValue' in v) return null;
    if ('arrayValue' in v) return (v.arrayValue.values || []).map(dec);
    if ('mapValue' in v) return fields(v.mapValue.fields || {});
    return null;
  }
  function fields(f) { var o = {}; Object.keys(f || {}).forEach(function (k) { o[k] = dec(f[k]); }); return o; }
  function docOf(d) { var o = fields(d.fields); o._id = (d.name || '').split('/').pop(); return o; }
  function maskQ(mask) { return (mask || []).map(function (m) { return 'mask.fieldPaths=' + encodeURIComponent(m); }).join('&'); }

  /** One document (signed in), e.g. "reports/today". */
  function get(path, mask) { return authed('GET', FS + '/' + path + (mask ? '?' + maskQ(mask) : '')).then(docOf); }

  /** Every document of a collection (signed in), only the fields in mask (photos are big). */
  function list(coll, mask) {
    var all = [];
    function page(tokenP) {
      var q = 'pageSize=300' + (mask ? '&' + maskQ(mask) : '') + (tokenP ? '&pageToken=' + encodeURIComponent(tokenP) : '');
      return authed('GET', FS + '/' + coll + '?' + q).then(function (r) {
        (r.documents || []).forEach(function (d) { all.push(docOf(d)); });
        return r.nextPageToken ? page(r.nextPageToken) : all;
      });
    }
    return page('');
  }

  /** A new document in a collection (the inbox the shop PC collects). */
  function add(coll, obj) {
    var f = {}; Object.keys(obj).forEach(function (k) { f[k] = enc(obj[k]); });
    return authed('POST', FS + '/' + coll, { fields: f }).then(docOf);
  }

  // ---------------------------------------------------------------- photos
  /** A picture made at most 900 px and JPEG (upright as the camera took it): "data:image/jpeg;base64,…". */
  function shrink(file, max, quality) {
    max = max || 900; quality = quality || 0.7;
    return new Promise(function (ok, bad) {
      var img = new Image();
      var url = URL.createObjectURL(file);
      img.onload = function () {
        var k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        var c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
        var g = c.getContext('2d');
        g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
        g.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        ok(c.toDataURL('image/jpeg', quality));
      };
      img.onerror = function () { URL.revokeObjectURL(url); bad(new Error(t('Not a picture.', 'यह फ़ोटो नहीं है।'))); };
      img.src = url;
    });
  }

  /** Photos together small enough for one Firestore document (under ~850 KB as text): made smaller if needed. */
  function fit(files, budget) {
    budget = budget || 850000;
    var steps = [[900, 0.7], [800, 0.6], [700, 0.55], [600, 0.5], [500, 0.45]];
    function tryStep(i) {
      return Promise.all(files.map(function (f) { return shrink(f, steps[i][0], steps[i][1]); })).then(function (list) {
        var size = list.reduce(function (a, s) { return a + s.length; }, 0);
        return size <= budget || i === steps.length - 1 ? list : tryStep(i + 1);
      });
    }
    return files.length ? tryStep(0) : Promise.resolve([]);
  }

  // ---------------------------------------------------------------- small screen helpers
  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') e.textContent = attrs[k];
      else if (k === 'html') e.innerHTML = attrs[k];
      else if (k.indexOf('on') === 0) e.addEventListener(k.slice(2), attrs[k]);
      else e.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c != null) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  function money(n) { return '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 }); }
  function toast(msg, bad) {
    var b = el('div', { 'class': 'toast' + (bad ? ' bad' : ''), text: msg });
    document.body.appendChild(b);
    setTimeout(function () { b.classList.add('show'); }, 10);
    setTimeout(function () { b.classList.remove('show'); setTimeout(function () { b.remove(); }, 400); }, bad ? 6000 : 3500);
  }

  /** The sign-in screen; calls done() once signed in. */
  function loginScreen(root, title, done) {
    root.innerHTML = '';
    var email = el('input', { type: 'email', placeholder: t('Email', 'ईमेल'), autocomplete: 'username' });
    var pass = el('input', { type: 'password', placeholder: t('Password', 'पासवर्ड'), autocomplete: 'current-password' });
    var msg = el('div', { 'class': 'msg' });
    var btn = el('button', { 'class': 'primary', text: t('Sign in', 'साइन इन') });
    function go() {
      btn.disabled = true; msg.textContent = t('Signing in…', 'साइन इन हो रहा है…');
      signIn(email.value, pass.value).then(function () { done(); }, function (e) { msg.textContent = e.message; btn.disabled = false; });
    }
    btn.addEventListener('click', go);
    pass.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
    root.appendChild(el('div', { 'class': 'login' }, [
      el('img', { src: 'icon-192.png', alt: '', 'class': 'logo' }),
      el('h1', { text: title }),
      el('p', { 'class': 'sub', text: 'DIAMOND FASHIONS' }),
      email, pass, btn, msg,
      el('p', { 'class': 'hint', text: t('Use the shop login the owner gave you.', 'मालिक का दिया हुआ दुकान लॉगिन इस्तेमाल करें।') }),
    ]));
  }

  /** The top bar: title, language switch, sign out. */
  function header(title, onLang) {
    var s = session();
    return el('header', {}, [
      el('img', { src: 'icon-192.png', alt: '' }),
      el('div', { 'class': 'ttl' }, [el('b', { text: title }), el('small', { text: s ? s.email : '' })]),
      el('button', { 'class': 'mini', text: lang === 'hi' ? 'EN' : 'हि', onclick: function () { setLang(lang === 'hi' ? 'en' : 'hi'); onLang(); } }),
      el('button', { 'class': 'mini', text: t('Sign out', 'साइन आउट'), onclick: function () { signOut(); location.reload(); } }),
    ]);
  }

  function registerSW() {
    if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(function () { });
  }

  return {
    t: t, setLang: setLang, getLang: getLang, session: session, signIn: signIn, signOut: signOut,
    get: get, list: list, add: add, enc: enc, dec: dec, shrink: shrink, fit: fit,
    el: el, money: money, toast: toast, loginScreen: loginScreen, header: header, registerSW: registerSW,
  };
})();
