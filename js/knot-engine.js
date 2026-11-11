// Canvas renderer from the crew-supplied ocean-rowing-knots.html.
  var PAL = {
    tan:   { out: '#3d230c', base: '#d79a4e', light: '#f6d29a', tex: '#9a5f22' },
    blue:  { out: '#0f2747', base: '#3f7fc4', light: '#a9cdf2', tex: '#1f4f86' },
    green: { out: '#123b1c', base: '#4f9d5d', light: '#b6e3bd', tex: '#2a6a37' },
    white: { out: '#4a4f57', base: '#e9e6df', light: '#ffffff', tex: '#b9b3a6' },
    purple:{ out: '#2b1645', base: '#8a5cc2', light: '#d6c0f2', tex: '#5b3990' }
  };
  var WHIP = '#c0392b';
  var NIGHT_PAL = {
    tan:   { out: '#100000', base: '#dc0000', light: '#ff0000', tex: '#900000' },
    blue:  { out: '#100000', base: '#900000', light: '#c00000', tex: '#580000' },
    green: { out: '#100000', base: '#ae0000', light: '#e00000', tex: '#700000' },
    white: { out: '#100000', base: '#f00000', light: '#ff0000', tex: '#aa0000' },
    purple:{ out: '#100000', base: '#b80000', light: '#e80000', tex: '#780000' }
  };
  function ease(u) { return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // ---------- preparation ----------
  function prep(K) {
    if (K._p) return K._p;
    var ropes = K.ropes.map(function (r) {
      var names = {}, loose = r.pts.map(function (q, i) {
        var o = typeof q[0] === 'string' ? 1 : 0;
        if (o) names[q[0]] = i;
        return { x: q[o], y: q[o + 1], z: q[o + 2] || 0, w: q[o + 3] == null ? 1 : q[o + 3], name: o ? q[0] : null };
      });
      var shapes = { loose: loose };
      var T = r.tighten || K.tighten;
      if (T) shapes.tight = loose.map(function (p) {
        var k = 1 - T.f * p.w; return { x: T.cx + (p.x - T.cx) * k, y: T.cy + (p.y - T.cy) * k, z: p.z };
      });
      Object.keys(r.shapes || {}).forEach(function (nm) {
        var arr = r.shapes[nm];
        if (typeof arr === 'function') arr = arr(loose);
        shapes[nm] = loose.map(function (p, i) { var a = arr[i] || [p.x, p.y]; return { x: a[0], y: a[1], z: a[2] == null ? p.z : a[2] }; });
      });
      return { def: r, loose: loose, names: names, shapes: shapes, n: loose.length,
        pal: PAL[r.color || 'tan'] || PAL.tan, W: r.width || K.width || 14 };
    });
    function resolveP(R, v) {
      if (v == null || v === 'end') return R.n - 1;
      if (typeof v === 'number') return clamp(v, 0, R.n - 1);
      var m = /^([A-Za-z0-9_]+)([+-][0-9.]+)?$/.exec(v);
      if (!m || !(m[1] in R.names)) throw new Error('Unknown point name ' + v + ' in ' + K.id);
      return clamp(R.names[m[1]] + (m[2] ? parseFloat(m[2]) : 0), 0, R.n - 1);
    }
    var prev = null;
    var steps = K.steps.map(function (s) {
      var rs = ropes.map(function (R, i) {
        var spec = (s.ropes && s.ropes[i]) || {};
        var base = prev ? prev[i] : { p: R.n - 1, shape: 'loose' };
        var st = { p: spec.p != null ? resolveP(R, spec.p) : base.p, shape: spec.shape || (prev ? base.shape : 'loose') };
        if (!R.shapes[st.shape]) throw new Error('Unknown shape ' + st.shape + ' in ' + K.id);
        return st;
      });
      prev = rs; return rs;
    });
    K._p = { ropes: ropes, steps: steps };
    return K._p;
  }

  // ---------- geometry ----------
  function cr(a, b, c, d, t) {
    var t2 = t * t, t3 = t2 * t;
    return 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
  }
  function sample(P, pEnd, N) {
    N = N || 10;
    var n = P.length;
    function get(i) {
      if (i < 0) return { x: 2 * P[0].x - P[1].x, y: 2 * P[0].y - P[1].y };
      if (i >= n) return { x: 2 * P[n - 1].x - P[n - 2].x, y: 2 * P[n - 1].y - P[n - 2].y };
      return P[i];
    }
    function pt(k, t) {
      var a = get(k - 1), b = get(k), c = get(k + 1), d = get(k + 2);
      return { x: cr(a.x, b.x, c.x, d.x, t), y: cr(a.y, b.y, c.y, d.y, t), z: P[k].z + (P[Math.min(k + 1, n - 1)].z - P[k].z) * t, k: k + t };
    }
    var out = [], kMax = Math.min(Math.floor(pEnd + 1e-9), n - 1), fr = pEnd - kMax;
    for (var k = 0; k < kMax; k++) for (var s = 0; s < N; s++) out.push(pt(k, s / N));
    if (kMax < n - 1 && fr > 1e-6) {
      var st = Math.max(1, Math.ceil(fr * N));
      for (var j = 0; j < st; j++) out.push(pt(kMax, fr * j / st));
      out.push(pt(kMax, fr));
    } else out.push({ x: P[kMax].x, y: P[kMax].y, z: P[kMax].z, k: kMax });
    var acc = 0; out[0].s = 0;
    for (var i = 1; i < out.length; i++) { acc += Math.hypot(out[i].x - out[i - 1].x, out[i].y - out[i - 1].y); out[i].s = acc; }
    return out;
  }
  function sub(pts, s0, s1) {
    var out = [];
    for (var i = 0; i < pts.length - 1; i++) {
      var a = pts[i], b = pts[i + 1];
      if (b.s < s0 || a.s > s1) continue;
      var len = (b.s - a.s) || 1e-9;
      if (a.s <= s0) { var t = (s0 - a.s) / len; out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t, s: s0 }); }
      else if (!out.length) out.push(a);
      if (b.s >= s1) { var t2 = (s1 - a.s) / len; out.push({ x: a.x + (b.x - a.x) * t2, y: a.y + (b.y - a.y) * t2, z: a.z + (b.z - a.z) * t2, s: s1 }); break; }
      out.push(b);
    }
    return out;
  }
  function segX(a, b, c, d) {
    var rx = b.x - a.x, ry = b.y - a.y, sx = d.x - c.x, sy = d.y - c.y, den = rx * sy - ry * sx;
    if (Math.abs(den) < 1e-9) return null;
    var t = ((c.x - a.x) * sy - (c.y - a.y) * sx) / den, u = ((c.x - a.x) * ry - (c.y - a.y) * rx) / den;
    if (t < 0 || t > 1 || u < 0 || u > 1) return null;
    return { t: t, u: u, x: a.x + rx * t, y: a.y + ry * t };
  }
  function crossings(S) {
    var res = [];
    for (var A = 0; A < S.length; A++) for (var B = A; B < S.length; B++) {
      var pa = S[A].pts, pb = S[B].pts;
      for (var i = 0; i < pa.length - 1; i++) {
        var a = pa[i], b = pa[i + 1];
        var minx = Math.min(a.x, b.x), maxx = Math.max(a.x, b.x), miny = Math.min(a.y, b.y), maxy = Math.max(a.y, b.y);
        for (var j = (A === B ? i + 3 : 0); j < pb.length - 1; j++) {
          var c = pb[j], d = pb[j + 1];
          if (Math.max(c.x, d.x) < minx || Math.min(c.x, d.x) > maxx || Math.max(c.y, d.y) < miny || Math.min(c.y, d.y) > maxy) continue;
          var X = segX(a, b, c, d); if (!X) continue;
          var zi = a.z + (b.z - a.z) * X.t, zj = c.z + (d.z - c.z) * X.u;
          var si = a.s + (b.s - a.s) * X.t, sj = c.s + (d.s - c.s) * X.u;
          var ki = a.k + (b.k - a.k) * X.t, kj = c.k + (d.k - c.k) * X.u;
          var I = { rope: A, s: si, z: zi, k: ki }, J = { rope: B, s: sj, z: zj, k: kj };
          var overJ = zj > zi || (zj === zi && (B > A || j > i));
          res.push({ over: overJ ? J : I, under: overJ ? I : J, x: X.x, y: X.y });
        }
      }
    }
    // de-duplicate near-identical hits at sample joints
    var out = [];
    res.forEach(function (c) {
      for (var i = 0; i < out.length; i++) if (Math.abs(out[i].x - c.x) < 0.5 && Math.abs(out[i].y - c.y) < 0.5) return;
      out.push(c);
    });
    return out;
  }
  function runsOf(pts) {
    var runs = [], cur = null;
    for (var i = 0; i < pts.length; i++) {
      var L = pts[i].z < 0 ? 0 : 1;
      if (!cur || cur.layer !== L) {
        if (cur) cur.pts.push(pts[i]);
        cur = { layer: L, pts: cur ? [pts[i - 1], pts[i]] : [pts[i]] };
        runs.push(cur);
      } else cur.pts.push(pts[i]);
    }
    runs.forEach(function (r) { r.s0 = r.pts[0].s; r.s1 = r.pts[r.pts.length - 1].s; });
    return runs;
  }

  // ---------- drawing ----------
  function path(ctx, poly) { ctx.beginPath(); ctx.moveTo(poly[0].x, poly[0].y); for (var i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y); }
  function dot(ctx, p, r, col) { ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill(); }
  function drawRope(ctx, poly, R, info) {
    if (poly.length < 2) return;
    var W = R.W, pal = info.night ? (NIGHT_PAL[R.def.color || 'tan'] || NIGHT_PAL.tan) : R.pal;
    var first = poly[0], end = poly[poly.length - 1];
    var capS = info.startCap && first.s <= 0.01, capE = info.endCap && end.s >= info.total - 0.01;
    ctx.lineJoin = 'round'; ctx.lineCap = 'butt';
    path(ctx, poly); ctx.strokeStyle = pal.out; ctx.lineWidth = W + 4; ctx.stroke();
    if (capS) dot(ctx, first, (W + 4) / 2, pal.out);
    if (capE) dot(ctx, end, (W + 4) / 2, pal.out);
    path(ctx, poly); ctx.strokeStyle = pal.base; ctx.lineWidth = W; ctx.stroke();
    if (capS) dot(ctx, first, W / 2, pal.base);
    if (capE) dot(ctx, end, W / 2, pal.base);
    ctx.globalAlpha = 0.55; ctx.strokeStyle = pal.light; ctx.lineWidth = W * 0.42; path(ctx, poly); ctx.stroke(); ctx.globalAlpha = 1;
    ctx.save(); ctx.setLineDash([2.5, 4.5]); ctx.lineDashOffset = first.s; ctx.globalAlpha = 0.45;
    ctx.strokeStyle = pal.tex; ctx.lineWidth = W * 0.9; path(ctx, poly); ctx.stroke(); ctx.restore();
    if (info.whip) {
      var ws = info.total - 14;
      if (end.s > ws) {
        var band = sub(poly, Math.max(ws, first.s), end.s);
        if (band.length > 1) { path(ctx, band); ctx.strokeStyle = info.night ? '#ff0000' : WHIP; ctx.lineWidth = W; ctx.stroke(); }
        if (capE) dot(ctx, end, W / 2, info.night ? '#ff0000' : WHIP);
      }
    }
  }
  function roundBar(ctx, x1, y1, x2, y2, r, fill, out, hi) {
    ctx.save(); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = out; ctx.lineWidth = 2 * r + 4; ctx.stroke();
    ctx.strokeStyle = fill; ctx.lineWidth = 2 * r; ctx.stroke();
    var dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, nx = -dy / L * r * 0.35, ny = dx / L * r * 0.35;
    if (ny > 0) { nx = -nx; ny = -ny; }
    ctx.beginPath(); ctx.moveTo(x1 + nx, y1 + ny); ctx.lineTo(x2 + nx, y2 + ny);
    ctx.globalAlpha = 0.6; ctx.strokeStyle = hi; ctx.lineWidth = r * 0.45; ctx.stroke();
    ctx.restore();
  }
  function drawProps(ctx, K, layer, th) {
    function color(day, night) { return th.night ? night : day; }
    (K.props || []).forEach(function (p) {
      var isBg = p.type === 'deck' || p.type === 'buoy' || p.type === 'cleatbase' || p.type === 'bundle';
      if ((layer === 'bg') !== isBg) return;
      ctx.save();
      if (p.type === 'rail' || p.type === 'post') roundBar(ctx, p.x1, p.y1, p.x2, p.y2, p.r || 11, color(p.fill || '#a7b0ba', '#640000'), color('#3a4048', '#180000'), color('#eef2f6', '#a00000'));
      else if (p.type === 'ring') {
        ctx.beginPath(); ctx.arc(p.cx, p.cy, p.r, 0, Math.PI * 2);
        ctx.strokeStyle = color('#3a4048', '#180000'); ctx.lineWidth = (p.t || 9) + 4; ctx.stroke();
        ctx.strokeStyle = color(p.fill || '#b8c0c9', '#640000'); ctx.lineWidth = p.t || 9; ctx.stroke();
        ctx.beginPath(); ctx.arc(p.cx, p.cy, p.r, Math.PI * 1.05, Math.PI * 1.6);
        ctx.strokeStyle = color('#f4f7fa', '#a00000'); ctx.globalAlpha = 0.7; ctx.lineWidth = (p.t || 9) * 0.35; ctx.stroke();
      } else if (p.type === 'cleat') {
        roundBar(ctx, p.cx - p.len / 2, p.cy, p.cx + p.len / 2, p.cy, p.t || 12, color('#b8c0c9', '#640000'), color('#3a4048', '#180000'), color('#f4f7fa', '#a00000'));
      } else if (p.type === 'cleatbase') {
        ctx.beginPath(); ctx.ellipse(p.cx, p.cy, p.rx || 40, p.ry || 26, 0, 0, Math.PI * 2);
        ctx.fillStyle = color('#7d8691', '#480000'); ctx.fill(); ctx.strokeStyle = color('#3a4048', '#180000'); ctx.lineWidth = 2; ctx.stroke();
      } else if (p.type === 'deck') {
        ctx.fillStyle = color(p.fill || 'rgba(140,110,70,0.12)', 'rgba(90,0,0,0.2)'); ctx.fillRect(p.x, p.y, p.w, p.h);
      } else if (p.type === 'buoy') {
        ctx.beginPath(); ctx.ellipse(p.cx, p.cy, p.rx, p.ry, 0, 0, Math.PI * 2);
        ctx.fillStyle = color('#ef7d22', '#a00000'); ctx.fill(); ctx.strokeStyle = color('#7a3a08', '#380000'); ctx.lineWidth = 3; ctx.stroke();
      } else if (p.type === 'bundle') {
        ctx.beginPath(); ctx.ellipse(p.cx, p.cy, p.rx, p.ry, 0, 0, Math.PI * 2);
        ctx.fillStyle = color(p.fill || '#d9d2c3', '#440000'); ctx.fill(); ctx.strokeStyle = color('#6b6457', '#180000'); ctx.lineWidth = 2; ctx.stroke();
      }
      ctx.restore();
    });
  }
  function arrowHead(ctx, a, b, col) {
    var ang = Math.atan2(b.y - a.y, b.x - a.x), L = 14;
    ctx.beginPath(); ctx.moveTo(b.x + Math.cos(ang) * 6, b.y + Math.sin(ang) * 6);
    ctx.lineTo(b.x - Math.cos(ang - 0.5) * L, b.y - Math.sin(ang - 0.5) * L);
    ctx.lineTo(b.x - Math.cos(ang + 0.5) * L, b.y - Math.sin(ang + 0.5) * L);
    ctx.closePath(); ctx.fillStyle = col; ctx.fill();
  }
  function label(ctx, th, L) {
    ctx.save();
    ctx.font = '600 15px "Segoe UI", system-ui, sans-serif';
    var w = ctx.measureText(L.text).width + 16, h = 26;
    if (L.ax != null) {
      ctx.strokeStyle = th.muted; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(L.x, L.y); ctx.lineTo(L.ax, L.ay); ctx.stroke(); ctx.setLineDash([]);
      dot(ctx, { x: L.ax, y: L.ay }, 3.5, th.muted);
    }
    var x = L.x - w / 2, y = L.y - h / 2, r = 8;
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
    ctx.fillStyle = th.labelBg; ctx.fill(); ctx.strokeStyle = th.muted; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = th.text; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(L.text, L.x, L.y + 1);
    ctx.restore();
  }

  function state(K, step, u) {
    var P = prep(K), e = ease(clamp(u, 0, 1));
    var cur = P.steps[step], prv = step > 0 ? P.steps[step - 1] : cur;
    return P.ropes.map(function (R, i) {
      var a = prv[i], b = cur[i];
      var A = R.shapes[a.shape], B = R.shapes[b.shape];
      var pts = a.shape === b.shape ? A : A.map(function (p, j) { return { x: p.x + (B[j].x - p.x) * e, y: p.y + (B[j].y - p.y) * e, z: p.z + (B[j].z - p.z) * e }; });
      return { R: R, P: pts, p: a.p + (b.p - a.p) * e, ghost: (b.p !== a.p && u < 1) ? b.p : null, e: e };
    });
  }

  function drawFrame(ctx, K, step, u, th) {
    var st = state(K, step, u);
    var S = st.map(function (r) { var pts = sample(r.P, r.p, 10); return { pts: pts, total: pts[pts.length - 1].s, R: r.R, st: r }; });
    S.forEach(function (o) { o.runs = runsOf(o.pts); var d = o.R.def; o.info = { total: o.total, startCap: d.startCap !== false && d.start !== 'none', endCap: d.end !== 'none', whip: (d.end || 'whip') === 'whip', night: th.night }; });
    var X = crossings(S);
    drawProps(ctx, K, 'bg', th);
    [0, 1].forEach(function (layer) {
      S.forEach(function (o) { o.runs.forEach(function (r) { if (r.layer === layer) drawRope(ctx, r.pts, o.R, o.info); }); });
      X.filter(function (c) { return (c.over.z < 0 ? 0 : 1) === layer; }).sort(function (a, b) { return a.over.z - b.over.z; }).forEach(function (c) {
        var o = S[c.over.rope], L = o.R.W * 1.5, s0 = Math.max(0, c.over.s - L), s1 = Math.min(o.total, c.over.s + L);
        o.runs.forEach(function (r) { if (r.layer === layer && c.over.s >= r.s0 - 0.01 && c.over.s <= r.s1 + 0.01) { s0 = Math.max(s0, r.s0); s1 = Math.min(s1, r.s1); } });
        drawRope(ctx, sub(o.pts, s0, s1), o.R, o.info);
      });
      if (layer === 0) drawProps(ctx, K, 'main', th);
    });
    S.forEach(function (o) {
      if (o.st.ghost == null) return;
      var g = sample(o.st.P, o.st.ghost, 10), g2 = sub(g, o.total + o.R.W * 0.6, g[g.length - 1].s);
      if (g2.length < 2) return;
      ctx.save(); ctx.setLineDash([7, 7]); ctx.strokeStyle = th.ghost; ctx.lineWidth = 3; ctx.lineCap = 'round';
      path(ctx, g2); ctx.stroke(); ctx.restore();
      arrowHead(ctx, g2[Math.max(0, g2.length - 4)], g2[g2.length - 1], th.ghost);
    });
    var sd = K.steps[step], e = st.length ? st[0].e : 1;
    (sd.arrows || []).forEach(function (a) {
      ctx.save(); ctx.globalAlpha = step === 0 ? 1 : e; ctx.strokeStyle = th.accent; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(a.from[0], a.from[1]); ctx.lineTo(a.to[0], a.to[1]); ctx.stroke();
      arrowHead(ctx, { x: a.from[0], y: a.from[1] }, { x: a.to[0], y: a.to[1] }, th.accent);
      if (a.text) { ctx.font = '700 15px "Segoe UI", system-ui, sans-serif'; ctx.fillStyle = th.accent; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
        ctx.fillText(a.text, a.tx != null ? a.tx : a.to[0] + 26, a.ty != null ? a.ty : (a.from[1] + a.to[1]) / 2); }
      ctx.restore();
    });
    if (u >= 1) (sd.labels || []).forEach(function (L) { label(ctx, th, L); });
    return X;
  }

  function nearestName(R, k) {
    var best = null, bd = 1e9;
    R.loose.forEach(function (p, i) { if (p.name && Math.abs(i - k) < bd) { bd = Math.abs(i - k); best = p.name; } });
    return (best || '#' + Math.round(k)) + '(' + k.toFixed(1) + ')';
  }
  function analyze(K, step, u) {
    if (u == null) u = 1;
    var st = state(K, step, u);
    var S = st.map(function (r) { var pts = sample(r.P, r.p, 10); return { pts: pts, total: pts[pts.length - 1].s, R: r.R }; });
    var X = crossings(S).map(function (c) {
      return 'OVER rope' + c.over.rope + ' ' + nearestName(S[c.over.rope].R, c.over.k) + ' z=' + c.over.z.toFixed(2) +
        '  /  UNDER rope' + c.under.rope + ' ' + nearestName(S[c.under.rope].R, c.under.k) + ' z=' + c.under.z.toFixed(2) +
        '  at (' + c.x.toFixed(0) + ',' + c.y.toFixed(0) + ')';
    });
    var props = [];
    (K.props || []).forEach(function (p, pi) {
      var segs = [];
      if (p.type === 'rail' || p.type === 'post') segs.push([{ x: p.x1, y: p.y1 }, { x: p.x2, y: p.y2 }]);
      if (p.type === 'cleat') segs.push([{ x: p.cx - p.len / 2, y: p.cy }, { x: p.cx + p.len / 2, y: p.cy }]);
      if (p.type === 'ring') for (var a = 0; a < 48; a++) segs.push([{ x: p.cx + p.r * Math.cos(a / 48 * 6.2832), y: p.cy + p.r * Math.sin(a / 48 * 6.2832) }, { x: p.cx + p.r * Math.cos((a + 1) / 48 * 6.2832), y: p.cy + p.r * Math.sin((a + 1) / 48 * 6.2832) }]);
      S.forEach(function (o, ri) {
        for (var i = 0; i < o.pts.length - 1; i++) segs.forEach(function (sg) {
          var Xx = segX(o.pts[i], o.pts[i + 1], sg[0], sg[1]);
          if (Xx) { var z = o.pts[i].z + (o.pts[i + 1].z - o.pts[i].z) * Xx.t, k = o.pts[i].k + (o.pts[i + 1].k - o.pts[i].k) * Xx.t;
            props.push('rope' + ri + ' ' + nearestName(o.R, k) + (z < 0 ? ' BEHIND ' : ' IN FRONT OF ') + p.type + pi + ' at (' + Xx.x.toFixed(0) + ',' + Xx.y.toFixed(0) + ') z=' + z.toFixed(2)); }
        });
      });
    });
    return { crossings: X, props: props };
  }


export { drawFrame, analyze, prep };
