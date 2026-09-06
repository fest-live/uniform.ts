var Me;
try {
  Me = new TextDecoder();
} catch {
}
var p, L, a = 0, et = [], ot = 105, ut = 57342, ct = 57343, $e = 57337, Je = 6, te = {}, se = 11281e4, H = 1681e4, ke = et, Ue = 0, E = {}, v, pe, we = 0, ae = 0, D, z, x = [], Be = [], C, V, le, We = {
  useRecords: !1,
  mapsAsObjects: !0
}, fe = !1, tt = 2;
try {
  new Function("");
} catch {
  tt = 1 / 0;
}
var rt = class Re {
  constructor(t) {
    if (t && ((t.keyMap || t._keyMap) && !t.useRecords && (t.useRecords = !1, t.mapsAsObjects = !0), t.useRecords === !1 && t.mapsAsObjects === void 0 && (t.mapsAsObjects = !0), t.getStructures && (t.getShared = t.getStructures), t.getShared && !t.structures && ((t.structures = []).uninitialized = !0), t.keyMap)) {
      this.mapKey = /* @__PURE__ */ new Map();
      for (let [n, f] of Object.entries(t.keyMap)) this.mapKey.set(f, n);
    }
    Object.assign(this, t);
  }
  decodeKey(t) {
    return this.keyMap && this.mapKey.get(t) || t;
  }
  encodeKey(t) {
    return this.keyMap && this.keyMap.hasOwnProperty(t) ? this.keyMap[t] : t;
  }
  encodeKeys(t) {
    if (!this._keyMap) return t;
    let n = /* @__PURE__ */ new Map();
    for (let [f, l] of Object.entries(t)) n.set(this._keyMap.hasOwnProperty(f) ? this._keyMap[f] : f, l);
    return n;
  }
  decodeKeys(t) {
    if (!this._keyMap || t.constructor.name != "Map") return t;
    if (!this._mapKey) {
      this._mapKey = /* @__PURE__ */ new Map();
      for (let [f, l] of Object.entries(this._keyMap)) this._mapKey.set(l, f);
    }
    let n = {};
    return t.forEach((f, l) => n[$(this._mapKey.has(l) ? this._mapKey.get(l) : l)] = f), n;
  }
  mapDecode(t, n) {
    let f = this.decode(t);
    return this._keyMap && f.constructor.name === "Array" ? f.map((l) => this.decodeKeys(l)) : f;
  }
  decode(t, n) {
    if (p) return lt(() => (De(), this ? this.decode(t, n) : Re.prototype.decode.call(We, t, n)));
    L = n > -1 ? n : t.length, a = 0, Ue = 0, ae = 0, pe = null, ke = et, D = null, p = t;
    try {
      V = t.dataView || (t.dataView = new DataView(t.buffer, t.byteOffset, t.byteLength));
    } catch (f) {
      throw p = null, t instanceof Uint8Array ? f : new Error("Source must be a Uint8Array or Buffer but was a " + (t && typeof t == "object" ? t.constructor.name : typeof t));
    }
    if (this instanceof Re) {
      if (E = this, C = this.sharedValues && (this.pack ? new Array(this.maxPrivatePackedValues || 16).concat(this.sharedValues) : this.sharedValues), this.structures)
        return v = this.structures, ce();
      (!v || v.length > 0) && (v = []);
    } else
      E = We, (!v || v.length > 0) && (v = []), C = null;
    return ce();
  }
  decodeMultiple(t, n) {
    let f, l = 0;
    try {
      let o = t.length;
      fe = !0;
      let h = this ? this.decode(t, o) : Ce.decode(t, o);
      if (n) {
        if (n(h) === !1) return;
        for (; a < o; )
          if (l = a, n(ce()) === !1) return;
      } else {
        for (f = [h]; a < o; )
          l = a, f.push(ce());
        return f;
      }
    } catch (o) {
      throw o.lastPosition = l, o.values = f, o;
    } finally {
      fe = !1, De();
    }
  }
};
function ce() {
  try {
    let e = O();
    if (D) {
      if (a >= D.postBundlePosition) {
        let t = /* @__PURE__ */ new Error("Unexpected bundle position");
        throw t.incomplete = !0, t;
      }
      a = D.postBundlePosition, D = null;
    }
    if (a == L)
      v = null, p = null, z && (z = null);
    else if (a > L) {
      let t = /* @__PURE__ */ new Error("Unexpected end of CBOR data");
      throw t.incomplete = !0, t;
    } else if (!fe) throw new Error("Data read, but end of buffer not reached");
    return e;
  } catch (e) {
    throw De(), (e instanceof RangeError || e.message.startsWith("Unexpected end of buffer")) && (e.incomplete = !0), e;
  }
}
function Z() {
  let e = /* @__PURE__ */ new Error("Unexpected end of CBOR data");
  return e.incomplete = !0, e;
}
function O() {
  if (!(a < L)) throw Z();
  let e = p[a++], t = e >> 5;
  if (e = e & 31, e > 23) switch (e) {
    case 24:
      if (a >= L) throw Z();
      e = p[a++];
      break;
    case 25:
      if (t == 7) return pt();
      e = V.getUint16(a), a += 2;
      break;
    case 26:
      if (t == 7) {
        let n = V.getFloat32(a);
        if (E.useFloat32 > 2) {
          let f = Ve[(p[a] & 127) << 1 | p[a + 1] >> 7];
          return a += 4, (f * n + (n > 0 ? 0.5 : -0.5) >> 0) / f;
        }
        return a += 4, n;
      }
      if (e = V.getUint32(a), a += 4, t === 1) return -1 - e;
      break;
    case 27:
      if (t == 7) {
        let n = V.getFloat64(a);
        return a += 8, n;
      }
      if (t > 1) {
        if (V.getUint32(a) > 0) throw new Error("JavaScript does not support arrays, maps, or strings with length over 4294967295");
        e = V.getUint32(a + 4);
      } else E.int64AsNumber ? (e = V.getUint32(a) * 4294967296, e += V.getUint32(a + 4)) : e = V.getBigUint64(a);
      a += 8;
      break;
    case 31:
      switch (t) {
        case 2:
        case 3:
          throw new Error("Indefinite length not supported for byte or text strings");
        case 4:
          let n = [], f, l = 0;
          for (; (f = O()) != te; ) {
            if (l >= se) throw new Error(`Array length exceeds ${se}`);
            n[l++] = f;
          }
          return t == 4 ? n : t == 3 ? n.join("") : Buffer.concat(n);
        case 5:
          let o;
          if (E.mapsAsObjects) {
            let h = {}, y = 0;
            if (E.keyMap) for (; (o = O()) != te; ) {
              if (y++ >= H) throw new Error(`Property count exceeds ${H}`);
              h[$(E.decodeKey(o))] = O();
            }
            else for (; (o = O()) != te; ) {
              if (y++ >= H) throw new Error(`Property count exceeds ${H}`);
              h[$(o)] = O();
            }
            return h;
          } else {
            le && (E.mapsAsObjects = !0, le = !1);
            let h = /* @__PURE__ */ new Map();
            if (E.keyMap) {
              let y = 0;
              for (; (o = O()) != te; ) {
                if (y++ >= H) throw new Error(`Map size exceeds ${H}`);
                h.set(E.decodeKey(o), O());
              }
            } else {
              let y = 0;
              for (; (o = O()) != te; ) {
                if (y++ >= H) throw new Error(`Map size exceeds ${H}`);
                h.set(o, O());
              }
            }
            return h;
          }
        case 7:
          return te;
        default:
          throw new Error("Invalid major type for indefinite length " + t);
      }
    default:
      throw new Error("Unknown token " + e);
  }
  switch (t) {
    case 0:
      return e;
    case 1:
      return ~e;
    case 2:
      return yt(e);
    case 3:
      if (ae >= a) return pe.slice(a - we, (a += e) - we);
      if (ae == 0 && L < 140 && e < 32) {
        let l = e < 16 ? it(e) : ht(e);
        if (l != null) return l;
      }
      return dt(e);
    case 4:
      if (e >= se) throw new Error(`Array length exceeds ${se}`);
      if (e > L - a) throw Z();
      let n = new Array(e);
      for (let l = 0; l < e; l++) n[l] = O();
      return n;
    case 5:
      if (e >= H) throw new Error(`Map size exceeds ${se}`);
      if (e > (L - a) / 2) throw Z();
      if (E.mapsAsObjects) {
        let l = {};
        if (E.keyMap) for (let o = 0; o < e; o++) l[$(E.decodeKey(O()))] = O();
        else for (let o = 0; o < e; o++) l[$(O())] = O();
        return l;
      } else {
        le && (E.mapsAsObjects = !0, le = !1);
        let l = /* @__PURE__ */ new Map();
        if (E.keyMap) for (let o = 0; o < e; o++) l.set(E.decodeKey(O()), O());
        else for (let o = 0; o < e; o++) l.set(O(), O());
        return l;
      }
    case 6:
      if (e >= $e) {
        let l = v[e & 8191];
        if (l)
          return l.read || (l.read = ve(l)), l.read();
        if (e < 65536) {
          if (e == ct) {
            let o = ie(), h = O(), y = O();
            _e(h, y);
            let U = {};
            if (E.keyMap) for (let S = 2; S < o; S++) {
              let R = E.decodeKey(y[S - 2]);
              U[$(R)] = O();
            }
            else for (let S = 2; S < o; S++) {
              let R = y[S - 2];
              U[$(R)] = O();
            }
            return U;
          } else if (e == ut) {
            let o = ie(), h = O();
            for (let y = 2; y < o; y++) _e(h++, O());
            return O();
          } else if (e == $e) return At();
          if (E.getShared && (Fe(), l = v[e & 8191], l))
            return l.read || (l.read = ve(l)), l.read();
        }
      }
      let f = x[e];
      if (f)
        return f.handlesRead ? f(O) : f(O());
      {
        let l = O();
        for (let o = 0; o < Be.length; o++) {
          let h = Be[o](e, l);
          if (h !== void 0) return h;
        }
        return new X(l, e);
      }
    case 7:
      switch (e) {
        case 20:
          return !1;
        case 21:
          return !0;
        case 22:
          return null;
        case 23:
          return;
        default:
          let l = (C || G())[e];
          if (l !== void 0) return l;
          throw new Error("Unknown token " + e);
      }
    default:
      throw isNaN(e) ? Z() : new Error("Unknown CBOR token " + e);
  }
}
var He = /^[a-zA-Z_$][a-zA-Z\d_$]*$/;
function ve(e) {
  if (!e) throw new Error("Structure is required in record definition");
  function t() {
    let n = p[a++];
    if (n = n & 31, n > 23) switch (n) {
      case 24:
        n = p[a++];
        break;
      case 25:
        n = V.getUint16(a), a += 2;
        break;
      case 26:
        n = V.getUint32(a), a += 4;
        break;
      default:
        throw new Error("Expected array header, but got " + p[a - 1]);
    }
    let f = this.compiledReader;
    for (; f; ) {
      if (f.propertyCount === n) return f(O);
      f = f.next;
    }
    if (this.slowReads++ >= tt) {
      let o = this.length == n ? this : this.slice(0, n);
      return f = E.keyMap ? new Function("r", "return {" + o.map((h) => E.decodeKey(h)).map((h) => He.test(h) ? $(h) + ":r()" : "[" + JSON.stringify(h) + "]:r()").join(",") + "}") : new Function("r", "return {" + o.map((h) => He.test(h) ? $(h) + ":r()" : "[" + JSON.stringify(h) + "]:r()").join(",") + "}"), this.compiledReader && (f.next = this.compiledReader), f.propertyCount = n, this.compiledReader = f, f(O);
    }
    let l = {};
    if (E.keyMap) for (let o = 0; o < n; o++) l[$(E.decodeKey(this[o]))] = O();
    else for (let o = 0; o < n; o++) l[$(this[o])] = O();
    return l;
  }
  return e.slowReads = 0, t;
}
function $(e) {
  if (typeof e == "string") return e === "__proto__" ? "__proto_" : e;
  if (typeof e == "number" || typeof e == "boolean" || typeof e == "bigint") return e.toString();
  if (e == null) return e + "";
  throw new Error("Invalid property name type " + typeof e);
}
var dt = xe;
function xe(e) {
  let t;
  if (e < 16 && (t = it(e)))
    return t;
  if (e > 64 && Me) return Me.decode(p.subarray(a, a += e));
  const n = a + e, f = [];
  for (t = ""; a < n; ) {
    const l = p[a++];
    if ((l & 128) === 0) f.push(l);
    else if ((l & 224) === 192)
      if (l < 194 || a >= n || (p[a] & 192) !== 128) f.push(65533);
      else {
        const o = p[a++] & 63;
        f.push((l & 31) << 6 | o);
      }
    else if ((l & 240) === 224) {
      const o = a < n ? p[a] : 0;
      if (a >= n || (o & 192) !== 128 || l === 224 && o < 160 || l === 237 && o >= 160) f.push(65533);
      else if (a++, a >= n || (p[a] & 192) !== 128) f.push(65533);
      else {
        const h = p[a++] & 63;
        f.push((l & 31) << 12 | (o & 63) << 6 | h);
      }
    } else if ((l & 248) === 240) {
      const o = a < n ? p[a] : 0;
      if (l > 244 || a >= n || (o & 192) !== 128 || l === 240 && o < 144 || l === 244 && o >= 144) f.push(65533);
      else if (a++, a >= n || (p[a] & 192) !== 128) f.push(65533);
      else {
        const h = p[a++] & 63;
        if (a >= n || (p[a] & 192) !== 128) f.push(65533);
        else {
          const y = p[a++] & 63;
          let U = (l & 7) << 18 | (o & 63) << 12 | h << 6 | y;
          U -= 65536, f.push(U >>> 10 & 1023 | 55296), f.push(56320 | U & 1023);
        }
      }
    } else f.push(65533);
    f.length >= 4096 && (t += P.apply(String, f), f.length = 0);
  }
  return f.length > 0 && (t += P.apply(String, f)), t;
}
var P = String.fromCharCode;
function ht(e) {
  let t = a, n = new Array(e);
  for (let f = 0; f < e; f++) {
    const l = p[a++];
    if ((l & 128) > 0) {
      a = t;
      return;
    }
    n[f] = l;
  }
  return P.apply(String, n);
}
function it(e) {
  if (e < 4)
    if (e < 2) {
      if (e === 0) return "";
      {
        let t = p[a++];
        if ((t & 128) > 1) {
          a -= 1;
          return;
        }
        return P(t);
      }
    } else {
      let t = p[a++], n = p[a++];
      if ((t & 128) > 0 || (n & 128) > 0) {
        a -= 2;
        return;
      }
      if (e < 3) return P(t, n);
      let f = p[a++];
      if ((f & 128) > 0) {
        a -= 3;
        return;
      }
      return P(t, n, f);
    }
  else {
    let t = p[a++], n = p[a++], f = p[a++], l = p[a++];
    if ((t & 128) > 0 || (n & 128) > 0 || (f & 128) > 0 || (l & 128) > 0) {
      a -= 4;
      return;
    }
    if (e < 6) {
      if (e === 4) return P(t, n, f, l);
      {
        let o = p[a++];
        if ((o & 128) > 0) {
          a -= 5;
          return;
        }
        return P(t, n, f, l, o);
      }
    } else if (e < 8) {
      let o = p[a++], h = p[a++];
      if ((o & 128) > 0 || (h & 128) > 0) {
        a -= 6;
        return;
      }
      if (e < 7) return P(t, n, f, l, o, h);
      let y = p[a++];
      if ((y & 128) > 0) {
        a -= 7;
        return;
      }
      return P(t, n, f, l, o, h, y);
    } else {
      let o = p[a++], h = p[a++], y = p[a++], U = p[a++];
      if ((o & 128) > 0 || (h & 128) > 0 || (y & 128) > 0 || (U & 128) > 0) {
        a -= 8;
        return;
      }
      if (e < 10) {
        if (e === 8) return P(t, n, f, l, o, h, y, U);
        {
          let S = p[a++];
          if ((S & 128) > 0) {
            a -= 9;
            return;
          }
          return P(t, n, f, l, o, h, y, U, S);
        }
      } else if (e < 12) {
        let S = p[a++], R = p[a++];
        if ((S & 128) > 0 || (R & 128) > 0) {
          a -= 10;
          return;
        }
        if (e < 11) return P(t, n, f, l, o, h, y, U, S, R);
        let B = p[a++];
        if ((B & 128) > 0) {
          a -= 11;
          return;
        }
        return P(t, n, f, l, o, h, y, U, S, R, B);
      } else {
        let S = p[a++], R = p[a++], B = p[a++], N = p[a++];
        if ((S & 128) > 0 || (R & 128) > 0 || (B & 128) > 0 || (N & 128) > 0) {
          a -= 12;
          return;
        }
        if (e < 14) {
          if (e === 12) return P(t, n, f, l, o, h, y, U, S, R, B, N);
          {
            let F = p[a++];
            if ((F & 128) > 0) {
              a -= 13;
              return;
            }
            return P(t, n, f, l, o, h, y, U, S, R, B, N, F);
          }
        } else {
          let F = p[a++], T = p[a++];
          if ((F & 128) > 0 || (T & 128) > 0) {
            a -= 14;
            return;
          }
          if (e < 15) return P(t, n, f, l, o, h, y, U, S, R, B, N, F, T);
          let K = p[a++];
          if ((K & 128) > 0) {
            a -= 15;
            return;
          }
          return P(t, n, f, l, o, h, y, U, S, R, B, N, F, T, K);
        }
      }
    }
  }
}
function yt(e) {
  return E.copyBuffers ? Uint8Array.prototype.slice.call(p, a, a += e) : p.subarray(a, a += e);
}
var nt = /* @__PURE__ */ new Float32Array(1), de = new Uint8Array(nt.buffer, 0, 4);
function pt() {
  let e = p[a++], t = p[a++], n = (e & 127) >> 2;
  if (n === 31)
    return t || e & 3 ? NaN : e & 128 ? -1 / 0 : 1 / 0;
  if (n === 0) {
    let f = ((e & 3) << 8 | t) / 16777216;
    return e & 128 ? -f : f;
  }
  return de[3] = e & 128 | (n >> 1) + 56, de[2] = (e & 7) << 5 | t >> 3, de[1] = t << 5, de[0] = 0, nt[0];
}
new Array(4096);
var X = class {
  constructor(e, t) {
    this.value = e, this.tag = t;
  }
};
x[0] = (e) => new Date(e);
x[1] = (e) => new Date(Math.round(e * 1e3));
x[2] = (e) => {
  let t = BigInt(0);
  for (let n = 0, f = e.byteLength; n < f; n++) t = BigInt(e[n]) + (t << BigInt(8));
  return t;
};
x[3] = (e) => BigInt(-1) - x[2](e);
x[4] = (e) => +(e[1] + "e" + e[0]);
x[5] = (e) => e[1] * Math.exp(e[0] * Math.log(2));
var _e = (e, t) => {
  e = e - 57344;
  let n = v[e];
  n && n.isShared && ((v.restoreStructures || (v.restoreStructures = []))[e] = n), v[e] = t, t.read = ve(t);
};
x[ot] = (e) => {
  let t = e.length, n = e[1];
  _e(e[0], n);
  let f = {};
  for (let l = 2; l < t; l++) {
    let o = n[l - 2];
    f[$(o)] = e[l];
  }
  return f;
};
x[14] = (e) => D ? D[0].slice(D.position0, D.position0 += e) : new X(e, 14);
x[15] = (e) => D ? D[1].slice(D.position1, D.position1 += e) : new X(e, 15);
var wt = {
  Error,
  RegExp
};
x[27] = (e) => (wt[e[0]] || Error)(e[1], e[2]);
var st = (e) => {
  if (p[a++] != 132) {
    let n = /* @__PURE__ */ new Error("Packed values structure must be followed by a 4 element array");
    throw p.length < a && (n.incomplete = !0), n;
  }
  let t = e();
  if (!t || !t.length) {
    let n = /* @__PURE__ */ new Error("Packed values structure must be followed by a 4 element array");
    throw n.incomplete = !0, n;
  }
  return C = C ? t.concat(C.slice(t.length)) : t, C.prefixes = e(), C.suffixes = e(), e();
};
st.handlesRead = !0;
x[51] = st;
x[Je] = (e) => {
  if (!C)
    if (E.getShared) Fe();
    else return new X(e, Je);
  if (typeof e == "number") return C[16 + (e >= 0 ? 2 * e : -2 * e - 1)];
  let t = /* @__PURE__ */ new Error("No support for non-integer packed references yet");
  throw e === void 0 && (t.incomplete = !0), t;
};
x[28] = (e) => {
  z || (z = /* @__PURE__ */ new Map(), z.id = 0);
  let t = z.id++, n = a, f = p[a], l;
  f >> 5 == 4 ? l = [] : l = {};
  let o = { target: l };
  z.set(t, o);
  let h = e();
  return o.used ? (Object.getPrototypeOf(l) !== Object.getPrototypeOf(h) && (a = n, l = h, z.set(t, { target: l }), h = e()), Object.assign(l, h)) : (o.target = h, h);
};
x[28].handlesRead = !0;
x[29] = (e) => {
  let t = z.get(e);
  return t.used = !0, t.target;
};
x[258] = (e) => new Set(e);
(x[259] = (e) => (E.mapsAsObjects && (E.mapsAsObjects = !1, le = !0), e())).handlesRead = !0;
function re(e, t) {
  return typeof e == "string" ? e + t : e instanceof Array ? e.concat(t) : Object.assign({}, e, t);
}
function G() {
  if (!C)
    if (E.getShared) Fe();
    else throw new Error("No packed values available");
  return C;
}
var gt = 1399353956;
Be.push((e, t) => {
  if (e >= 225 && e <= 255) return re(G().prefixes[e - 224], t);
  if (e >= 28704 && e <= 32767) return re(G().prefixes[e - 28672], t);
  if (e >= 1879052288 && e <= 2147483647) return re(G().prefixes[e - 1879048192], t);
  if (e >= 216 && e <= 223) return re(t, G().suffixes[e - 216]);
  if (e >= 27647 && e <= 28671) return re(t, G().suffixes[e - 27639]);
  if (e >= 1811940352 && e <= 1879048191) return re(t, G().suffixes[e - 1811939328]);
  if (e == gt) return {
    packedValues: C,
    structures: v.slice(0),
    version: t
  };
  if (e == 55799) return t;
});
var bt = new Uint8Array(new Uint16Array([1]).buffer)[0] == 1, Ye = [
  Uint8Array,
  Uint8ClampedArray,
  Uint16Array,
  Uint32Array,
  typeof BigUint64Array > "u" ? { name: "BigUint64Array" } : BigUint64Array,
  Int8Array,
  Int16Array,
  Int32Array,
  typeof BigInt64Array > "u" ? { name: "BigInt64Array" } : BigInt64Array,
  Float32Array,
  Float64Array
], mt = [
  64,
  68,
  69,
  70,
  71,
  72,
  77,
  78,
  79,
  85,
  86
];
for (let e = 0; e < Ye.length; e++) St(Ye[e], mt[e]);
function St(e, t) {
  let n = "get" + e.name.slice(0, -5), f;
  typeof e == "function" ? f = e.BYTES_PER_ELEMENT : e = null;
  for (let l = 0; l < 2; l++) {
    if (!l && f == 1) continue;
    let o = f == 2 ? 1 : f == 4 ? 2 : f == 8 ? 3 : 0;
    x[l ? t : t - 4] = f == 1 || l == bt ? (h) => {
      if (!e) throw new Error("Could not find typed array for code " + t);
      return !E.copyBuffers && (f === 1 || f === 2 && !(h.byteOffset & 1) || f === 4 && !(h.byteOffset & 3) || f === 8 && !(h.byteOffset & 7)) ? new e(h.buffer, h.byteOffset, h.byteLength >> o) : new e(Uint8Array.prototype.slice.call(h, 0).buffer);
    } : (h) => {
      if (!e) throw new Error("Could not find typed array for code " + t);
      let y = new DataView(h.buffer, h.byteOffset, h.byteLength), U = h.length >> o, S = new e(U), R = y[n];
      for (let B = 0; B < U; B++) S[B] = R.call(y, B << o, l);
      return S;
    };
  }
}
function At() {
  let e = ie(), t = a + O();
  for (let f = 2; f < e; f++) {
    let l = ie();
    a += l;
  }
  let n = a;
  return a = t, D = [xe(ie()), xe(ie())], D.position0 = 0, D.position1 = 0, D.postBundlePosition = a, a = n, O();
}
function ie() {
  if (!(a < L)) throw Z();
  let e = p[a++] & 31;
  if (e > 23) switch (e) {
    case 24:
      if (a >= L) throw Z();
      e = p[a++];
      break;
    case 25:
      e = V.getUint16(a), a += 2;
      break;
    case 26:
      e = V.getUint32(a), a += 4;
  }
  return e;
}
function Fe() {
  if (E.getShared) {
    let e = lt(() => (p = null, E.getShared())) || {}, t = e.structures || [];
    E.sharedVersion = e.version, C = E.sharedValues = e.packedValues, v === !0 ? E.structures = v = t : v.splice.apply(v, [0, t.length].concat(t));
  }
}
function lt(e) {
  let t = L, n = a, f = Ue, l = we, o = ae, h = pe, y = ke, U = z, S = D, R = new Uint8Array(p.slice(0, L)), B = v, N = E, F = fe, T = e();
  return L = t, a = n, Ue = f, we = l, ae = o, pe = h, ke = y, z = U, D = S, p = R, fe = F, v = B, E = N, V = new DataView(p.buffer, p.byteOffset, p.byteLength), T;
}
function De() {
  p = null, z = null, v = null;
}
var Ve = new Array(147);
for (let e = 0; e < 256; e++) Ve[e] = +("1e" + Math.floor(45.15 - e * 0.30103));
var Ce = new rt({ useRecords: !1 }), Rt = Ce.decode, vt = Ce.decodeMultiple, Et = {
  NEVER: 0,
  ALWAYS: 1,
  DECIMAL_ROUND: 3,
  DECIMAL_FIT: 4
}, he;
try {
  he = new TextEncoder();
} catch {
}
var Pe, at, ge = typeof globalThis == "object" && globalThis.Buffer, oe = typeof ge < "u", Ae = oe ? ge.allocUnsafeSlow : Uint8Array, qe = oe ? ge : Uint8Array, Ge = 256, Ze = oe ? 4294967296 : 2144337920, Ee, s, k, r = 0, Y, _ = null, Ot = 61440, It = /[\u0080-\uFFFF]/, j = /* @__PURE__ */ Symbol("record-id"), Mt = class extends rt {
  constructor(e) {
    super(e), this.offset = 0;
    let t, n, f, l, o;
    e = e || {};
    let h = qe.prototype.utf8Write ? function(i, w) {
      return s.utf8Write(i, w, s.byteLength - w);
    } : he && he.encodeInto ? function(i, w) {
      return he.encodeInto(i, s.subarray(w)).written;
    } : !1, y = this, U = e.structures || e.saveStructures, S = e.maxSharedStructures;
    if (S == null && (S = U ? 128 : 0), S > 8190) throw new Error("Maximum maxSharedStructure is 8190");
    let R = e.sequential;
    R && (S = 0), this.structures || (this.structures = []), this.saveStructures && (this.saveShared = this.saveStructures);
    let B, N, F = e.sharedValues, T;
    if (F) {
      T = /* @__PURE__ */ Object.create(null);
      for (let i = 0, w = F.length; i < w; i++) T[F[i]] = i;
    }
    let K = [], be = 0, ue = 0;
    this.mapEncode = function(i, w) {
      return this._keyMap && !this._mapped && i.constructor.name === "Array" && (i = i.map((c) => this.encodeKeys(c))), this.encode(i, w);
    }, this.encode = function(i, w) {
      if (s || (s = new Ae(8192), k = new DataView(s.buffer, 0, 8192), r = 0), Y = s.length - 10, Y - r < 2048 ? (s = new Ae(s.length), k = new DataView(s.buffer, 0, s.length), Y = s.length - 10, r = 0) : w === 512 && (r = r + 7 & 2147483640), t = r, y.useSelfDescribedHeader && (k.setUint32(r, 3654940416), r += 3), o = y.structuredClone ? /* @__PURE__ */ new Map() : null, y.bundleStrings && typeof i != "string" ? (_ = [], _.size = 1 / 0) : _ = null, n = y.structures, n) {
        if (n.uninitialized) {
          let d = y.getShared() || {};
          y.structures = n = d.structures || [], y.sharedVersion = d.version;
          let u = y.sharedValues = d.packedValues;
          if (u) {
            T = {};
            for (let g = 0, b = u.length; g < b; g++) T[u[g]] = g;
          }
        }
        let c = n.length;
        if (c > S && !R && (c = S), !n.transitions) {
          n.transitions = /* @__PURE__ */ Object.create(null);
          for (let d = 0; d < c; d++) {
            let u = n[d];
            if (!u) continue;
            let g, b = n.transitions;
            for (let m = 0, A = u.length; m < A; m++) {
              b[j] === void 0 && (b[j] = d);
              let I = u[m];
              g = b[I], g || (g = b[I] = /* @__PURE__ */ Object.create(null)), b = g;
            }
            b[j] = d | 1048576;
          }
        }
        R || (n.nextId = c);
      }
      if (f && (f = !1), l = n || [], N = T, e.pack) {
        let c = /* @__PURE__ */ new Map();
        if (c.values = [], c.encoder = y, c.maxValues = e.maxPrivatePackedValues || (T ? 16 : 1 / 0), c.objectMap = T || !1, c.samplingPackedValues = B, ye(i, c), c.values.length > 0) {
          s[r++] = 216, s[r++] = 51, W(4);
          let d = c.values;
          M(d), W(0), W(0), N = Object.create(T || null);
          for (let u = 0, g = d.length; u < g; u++) N[d[u]] = u;
        }
      }
      Ee = w & Ie;
      try {
        if (Ee) return;
        if (M(i), _ && Qe(t, M), y.offset = r, o && o.idsToInsert) {
          r += o.idsToInsert.length * 2, r > Y && Q(r), y.offset = r;
          let c = Bt(s.subarray(t, r), o.idsToInsert);
          return o = null, c;
        }
        return w & 512 ? (s.start = t, s.end = r, s) : s.subarray(t, r);
      } finally {
        if (n) {
          if (ue < 10 && ue++, n.length > S && (n.length = S), be > 1e4)
            n.transitions = null, ue = 0, be = 0, K.length > 0 && (K = []);
          else if (K.length > 0 && !R) {
            for (let c = 0, d = K.length; c < d; c++) K[c][j] = void 0;
            K = [];
          }
        }
        if (f && y.saveShared) {
          y.structures.length > S && (y.structures = y.structures.slice(0, S));
          let c = s.subarray(t, r);
          return y.updateSharedData() === !1 ? y.encode(i) : c;
        }
        w & 1024 && (r = t);
      }
    }, this.findCommonStringsToPack = () => (B = /* @__PURE__ */ new Map(), T || (T = /* @__PURE__ */ Object.create(null)), (i) => {
      let w = i && i.threshold || 4, c = this.pack ? i.maxPrivatePackedValues || 16 : 0;
      F || (F = this.sharedValues = []);
      for (let [d, u] of B) u.count > w && (T[d] = c++, F.push(d), f = !0);
      for (; this.saveShared && this.updateSharedData() === !1; ) ;
      B = null;
    });
    const M = (i) => {
      r > Y && (s = Q(r));
      var w = typeof i, c;
      if (w === "string") {
        if (N) {
          let b = N[i];
          if (b >= 0) {
            b < 16 ? s[r++] = b + 224 : (s[r++] = 198, b & 1 ? M(15 - b >> 1) : M(b - 16 >> 1));
            return;
          } else if (B && !e.pack) {
            let m = B.get(i);
            m ? m.count++ : B.set(i, { count: 1 });
          }
        }
        let d = i.length;
        if (_ && d >= 4 && d < 1024) {
          if ((_.size += d) > Ot) {
            let m, A = (_[0] ? _[0].length * 3 + _[1].length : 0) + 10;
            r + A > Y && (s = Q(r + A)), s[r++] = 217, s[r++] = 223, s[r++] = 249, s[r++] = _.position ? 132 : 130, s[r++] = 26, m = r - t, r += 4, _.position && Qe(t, M), _ = ["", ""], _.size = 0, _.position = m;
          }
          let b = It.test(i);
          _[b ? 0 : 1] += i, s[r++] = b ? 206 : 207, M(d);
          return;
        }
        let u;
        d < 32 ? u = 1 : d < 256 ? u = 2 : d < 65536 ? u = 3 : u = 5;
        let g = d * 3;
        if (r + g > Y && (s = Q(r + g)), d < 64 || !h) {
          let b, m, A, I = r + u;
          for (b = 0; b < d; b++)
            m = i.charCodeAt(b), m < 128 ? s[I++] = m : m < 2048 ? (s[I++] = m >> 6 | 192, s[I++] = m & 63 | 128) : (m & 64512) === 55296 && ((A = i.charCodeAt(b + 1)) & 64512) === 56320 ? (m = 65536 + ((m & 1023) << 10) + (A & 1023), b++, s[I++] = m >> 18 | 240, s[I++] = m >> 12 & 63 | 128, s[I++] = m >> 6 & 63 | 128, s[I++] = m & 63 | 128) : (s[I++] = m >> 12 | 224, s[I++] = m >> 6 & 63 | 128, s[I++] = m & 63 | 128);
          c = I - r - u;
        } else c = h(i, r + u, g);
        c < 24 ? s[r++] = 96 | c : c < 256 ? (u < 2 && s.copyWithin(r + 2, r + 1, r + 1 + c), s[r++] = 120, s[r++] = c) : c < 65536 ? (u < 3 && s.copyWithin(r + 3, r + 2, r + 2 + c), s[r++] = 121, s[r++] = c >> 8, s[r++] = c & 255) : (u < 5 && s.copyWithin(r + 5, r + 3, r + 3 + c), s[r++] = 122, k.setUint32(r, c), r += 4), r += c;
      } else if (w === "number")
        if (!this.alwaysUseFloat && i >>> 0 === i)
          i < 24 ? s[r++] = i : i < 256 ? (s[r++] = 24, s[r++] = i) : i < 65536 ? (s[r++] = 25, s[r++] = i >> 8, s[r++] = i & 255) : (s[r++] = 26, k.setUint32(r, i), r += 4);
        else if (!this.alwaysUseFloat && i >> 0 === i)
          i >= -24 ? s[r++] = 31 - i : i >= -256 ? (s[r++] = 56, s[r++] = ~i) : i >= -65536 ? (s[r++] = 57, k.setUint16(r, ~i), r += 2) : (s[r++] = 58, k.setUint32(r, ~i), r += 4);
        else if (!this.alwaysUseFloat && i < 0 && i >= -4294967296 && Math.floor(i) === i)
          s[r++] = 58, k.setUint32(r, -1 - i), r += 4;
        else {
          let d;
          if ((d = this.useFloat32) > 0 && i < 4294967296 && i >= -2147483648) {
            s[r++] = 250, k.setFloat32(r, i);
            let u;
            if (d < 4 || (u = i * Ve[(s[r] & 127) << 1 | s[r + 1] >> 7]) >> 0 === u) {
              r += 4;
              return;
            } else r--;
          }
          s[r++] = 251, k.setFloat64(r, i), r += 8;
        }
      else if (w === "object")
        if (!i) s[r++] = 246;
        else {
          if (o) {
            let u = o.get(i);
            if (u) {
              if (s[r++] = 216, s[r++] = 29, s[r++] = 25, !u.references) {
                let g = o.idsToInsert || (o.idsToInsert = []);
                u.references = [], g.push(u);
              }
              u.references.push(r - t), r += 2;
              return;
            } else o.set(i, { offset: r - t });
          }
          let d = i.constructor;
          if (d === Object)
            this.skipFunction === !0 && (i = Object.fromEntries([...Object.keys(i).filter((u) => typeof i[u] != "function").map((u) => [u, i[u]])])), me(i);
          else if (d === Array) {
            c = i.length, c < 24 ? s[r++] = 128 | c : W(c);
            for (let u = 0; u < c; u++) M(i[u]);
          } else if (d === Map)
            if ((this.mapsAsObjects ? this.useTag259ForMaps !== !1 : this.useTag259ForMaps) && (s[r++] = 217, s[r++] = 1, s[r++] = 3), c = i.size, c < 24 ? s[r++] = 160 | c : c < 256 ? (s[r++] = 184, s[r++] = c) : c < 65536 ? (s[r++] = 185, s[r++] = c >> 8, s[r++] = c & 255) : (s[r++] = 186, k.setUint32(r, c), r += 4), y.keyMap) for (let [u, g] of i)
              M(y.encodeKey(u)), M(g);
            else for (let [u, g] of i)
              M(u), M(g);
          else {
            for (let u = 0, g = Pe.length; u < g; u++) {
              let b = at[u];
              if (i instanceof b) {
                let m = Pe[u], A = m.tag;
                A == null && (A = m.getTag && m.getTag.call(this, i)), A < 24 ? s[r++] = 192 | A : A < 256 ? (s[r++] = 216, s[r++] = A) : A < 65536 ? (s[r++] = 217, s[r++] = A >> 8, s[r++] = A & 255) : A > -1 && (s[r++] = 218, k.setUint32(r, A), r += 4), m.encode.call(this, i, M, Q);
                return;
              }
            }
            if (i[Symbol.iterator]) {
              if (Ee) {
                let u = /* @__PURE__ */ new Error("Iterable should be serialized as iterator");
                throw u.iteratorNotHandled = !0, u;
              }
              s[r++] = 159;
              for (let u of i) M(u);
              s[r++] = 255;
              return;
            }
            if (i[Symbol.asyncIterator] || Oe(i)) {
              let u = /* @__PURE__ */ new Error("Iterable/blob should be serialized as iterator");
              throw u.iteratorNotHandled = !0, u;
            }
            if (this.useToJSON && i.toJSON) {
              const u = i.toJSON();
              if (u !== i) return M(u);
            }
            me(i);
          }
        }
      else if (w === "boolean") s[r++] = i ? 245 : 244;
      else if (w === "bigint") {
        if (i < BigInt(1) << BigInt(64) && i >= 0)
          s[r++] = 27, k.setBigUint64(r, i);
        else if (i > -(BigInt(1) << BigInt(64)) && i < 0)
          s[r++] = 59, k.setBigUint64(r, -i - BigInt(1));
        else if (this.largeBigIntToFloat)
          s[r++] = 251, k.setFloat64(r, Number(i));
        else {
          i >= BigInt(0) ? s[r++] = 194 : (s[r++] = 195, i = BigInt(-1) - i);
          let d = [];
          for (; i; )
            d.push(Number(i & BigInt(255))), i >>= BigInt(8);
          Te(new Uint8Array(d.reverse()), Q);
          return;
        }
        r += 8;
      } else if (w === "undefined") s[r++] = 247;
      else throw new Error("Unknown type: " + w);
    }, me = this.useRecords === !1 ? this.variableMapSize ? (i) => {
      let w = Object.keys(i), c = Object.values(i), d = w.length;
      if (d < 24 ? s[r++] = 160 | d : d < 256 ? (s[r++] = 184, s[r++] = d) : d < 65536 ? (s[r++] = 185, s[r++] = d >> 8, s[r++] = d & 255) : (s[r++] = 186, k.setUint32(r, d), r += 4), y.keyMap) for (let u = 0; u < d; u++)
        M(y.encodeKey(w[u])), M(c[u]);
      else for (let u = 0; u < d; u++)
        M(w[u]), M(c[u]);
    } : (i) => {
      s[r++] = 185;
      let w = r - t;
      r += 2;
      let c = 0;
      if (y.keyMap)
        for (let d in i) (typeof i.hasOwnProperty != "function" || i.hasOwnProperty(d)) && (M(y.encodeKey(d)), M(i[d]), c++);
      else for (let d in i) (typeof i.hasOwnProperty != "function" || i.hasOwnProperty(d)) && (M(d), M(i[d]), c++);
      s[w++ + t] = c >> 8, s[w + t] = c & 255;
    } : (i, w) => {
      let c, d = l.transitions || (l.transitions = /* @__PURE__ */ Object.create(null)), u = 0, g = 0, b, m;
      if (this.keyMap) {
        m = Object.keys(i).map((I) => this.encodeKey(I)), g = m.length;
        for (let I = 0; I < g; I++) {
          let ze = m[I];
          c = d[ze], c || (c = d[ze] = /* @__PURE__ */ Object.create(null), u++), d = c;
        }
      } else for (let I in i) (typeof i.hasOwnProperty != "function" || i.hasOwnProperty(I)) && (c = d[I], c || (d[j] & 1048576 && (b = d[j] & 65535), c = d[I] = /* @__PURE__ */ Object.create(null), u++), d = c, g++);
      let A = d[j];
      if (A !== void 0)
        A &= 65535, s[r++] = 217, s[r++] = A >> 8 | 224, s[r++] = A & 255;
      else if (m || (m = d.__keys__ || (d.__keys__ = Object.keys(i))), b === void 0 ? (A = l.nextId++, A || (A = 0, l.nextId = 1), A >= Ge && (l.nextId = (A = S) + 1)) : A = b, l[A] = m, A < S) {
        s[r++] = 217, s[r++] = A >> 8 | 224, s[r++] = A & 255, d = l.transitions;
        for (let I = 0; I < g; I++)
          (d[j] === void 0 || d[j] & 1048576) && (d[j] = A), d = d[m[I]];
        d[j] = A | 1048576, f = !0;
      } else {
        if (d[j] = A, k.setUint32(r, 3655335680), r += 3, u && (be += ue * u), K.length >= Ge - S && (K.shift()[j] = void 0), K.push(d), W(g + 2), M(57344 + A), M(m), w) return;
        for (let I in i) (typeof i.hasOwnProperty != "function" || i.hasOwnProperty(I)) && M(i[I]);
        return;
      }
      if (g < 24 ? s[r++] = 128 | g : W(g), !w)
        for (let I in i) (typeof i.hasOwnProperty != "function" || i.hasOwnProperty(I)) && M(i[I]);
    }, Q = (i) => {
      let w;
      if (i > 16777216) {
        if (i - t > Ze) throw new Error("Encoded buffer would be larger than maximum buffer size");
        w = Math.min(Ze, Math.round(Math.max((i - t) * (i > 67108864 ? 1.25 : 2), 4194304) / 4096) * 4096);
      } else w = (Math.max(i - t << 2, s.length - 1) >> 12) + 1 << 12;
      let c = new Ae(w);
      return k = new DataView(c.buffer, 0, w), s.copy ? s.copy(c, 0, t, i) : c.set(s.slice(t, i)), r -= t, t = 0, Y = c.length - 10, s = c;
    };
    let q = 100, je = 1e3;
    this.encodeAsIterable = function(i, w) {
      return Le(i, w, ee);
    }, this.encodeAsAsyncIterable = function(i, w) {
      return Le(i, w, Ke);
    };
    function* ee(i, w, c) {
      let d = i.constructor;
      if (d === Object) {
        let u = y.useRecords !== !1;
        u ? me(i, !0) : Xe(Object.keys(i).length, 160);
        for (let g in i) {
          let b = i[g];
          u || M(g), b && typeof b == "object" ? w[g] ? yield* ee(b, w[g]) : yield* Se(b, w, g) : M(b);
        }
      } else if (d === Array) {
        let u = i.length;
        W(u);
        for (let g = 0; g < u; g++) {
          let b = i[g];
          b && (typeof b == "object" || r - t > q) ? w.element ? yield* ee(b, w.element) : yield* Se(b, w, "element") : M(b);
        }
      } else if (i[Symbol.iterator] && !i.buffer) {
        s[r++] = 159;
        for (let u of i) u && (typeof u == "object" || r - t > q) ? w.element ? yield* ee(u, w.element) : yield* Se(u, w, "element") : M(u);
        s[r++] = 255;
      } else Oe(i) ? (Xe(i.size, 64), yield s.subarray(t, r), yield i, ne()) : i[Symbol.asyncIterator] ? (s[r++] = 159, yield s.subarray(t, r), yield i, ne(), s[r++] = 255) : M(i);
      c && r > t ? yield s.subarray(t, r) : r - t > q && (yield s.subarray(t, r), ne());
    }
    function* Se(i, w, c) {
      let d = r - t;
      try {
        M(i), r - t > q && (yield s.subarray(t, r), ne());
      } catch (u) {
        if (u.iteratorNotHandled)
          w[c] = {}, r = t + d, yield* ee.call(this, i, w[c]);
        else throw u;
      }
    }
    function ne() {
      q = je, y.encode(null, Ie);
    }
    function Le(i, w, c) {
      return w && w.chunkThreshold ? q = je = w.chunkThreshold : q = 100, i && typeof i == "object" ? (y.encode(null, Ie), c(i, y.iterateProperties || (y.iterateProperties = {}), !0)) : [y.encode(i)];
    }
    async function* Ke(i, w) {
      for (let c of ee(i, w, !0)) {
        let d = c.constructor;
        if (d === qe || d === Uint8Array) yield c;
        else if (Oe(c)) {
          let u = c.stream().getReader(), g;
          for (; !(g = await u.read()).done; ) yield g.value;
        } else if (c[Symbol.asyncIterator]) for await (let u of c)
          ne(), u ? yield* Ke(u, w.async || (w.async = {})) : yield y.encode(u);
        else yield c;
      }
    }
  }
  useBuffer(e) {
    s = e, k = new DataView(s.buffer, s.byteOffset, s.byteLength), r = 0;
  }
  clearSharedData() {
    this.structures && (this.structures = []), this.sharedValues && (this.sharedValues = void 0);
  }
  updateSharedData() {
    let e = this.sharedVersion || 0;
    this.sharedVersion = e + 1;
    let t = this.structures.slice(0), n = new ft(t, this.sharedValues, this.sharedVersion), f = this.saveShared(n, (l) => (l && l.version || 0) == e);
    return f === !1 ? (n = this.getShared() || {}, this.structures = n.structures || [], this.sharedValues = n.packedValues, this.sharedVersion = n.version, this.structures.nextId = this.structures.length) : t.forEach((l, o) => this.structures[o] = l), f;
  }
};
function Xe(e, t) {
  e < 24 ? s[r++] = t | e : e < 256 ? (s[r++] = t | 24, s[r++] = e) : e < 65536 ? (s[r++] = t | 25, s[r++] = e >> 8, s[r++] = e & 255) : (s[r++] = t | 26, k.setUint32(r, e), r += 4);
}
var ft = class {
  constructor(e, t, n) {
    this.structures = e, this.packedValues = t, this.version = n;
  }
};
function W(e) {
  e < 24 ? s[r++] = 128 | e : e < 256 ? (s[r++] = 152, s[r++] = e) : e < 65536 ? (s[r++] = 153, s[r++] = e >> 8, s[r++] = e & 255) : (s[r++] = 154, k.setUint32(r, e), r += 4);
}
var kt = typeof Blob > "u" ? function() {
} : Blob;
function Oe(e) {
  if (e instanceof kt) return !0;
  let t = e[Symbol.toStringTag];
  return t === "Blob" || t === "File";
}
function ye(e, t) {
  switch (typeof e) {
    case "string":
      if (e.length > 3) {
        if (t.objectMap[e] > -1 || t.values.length >= t.maxValues) return;
        let f = t.get(e);
        if (f)
          ++f.count == 2 && t.values.push(e);
        else if (t.set(e, { count: 1 }), t.samplingPackedValues) {
          let l = t.samplingPackedValues.get(e);
          l ? l.count++ : t.samplingPackedValues.set(e, { count: 1 });
        }
      }
      break;
    case "object":
      if (e)
        if (e instanceof Array) for (let f = 0, l = e.length; f < l; f++) ye(e[f], t);
        else {
          let f = !t.encoder.useRecords;
          for (var n in e) e.hasOwnProperty(n) && (f && ye(n, t), ye(e[n], t));
        }
      break;
    case "function":
      console.log(e);
  }
}
var Ut = new Uint8Array(new Uint16Array([1]).buffer)[0] == 1;
at = [
  Date,
  Set,
  Error,
  RegExp,
  X,
  ArrayBuffer,
  Uint8Array,
  Uint8ClampedArray,
  Uint16Array,
  Uint32Array,
  typeof BigUint64Array > "u" ? function() {
  } : BigUint64Array,
  Int8Array,
  Int16Array,
  Int32Array,
  typeof BigInt64Array > "u" ? function() {
  } : BigInt64Array,
  Float32Array,
  Float64Array,
  ft
];
Pe = [
  {
    tag: 1,
    encode(e, t) {
      let n = e.getTime() / 1e3;
      (this.useTimestamp32 || e.getMilliseconds() === 0) && n >= 0 && n < 4294967296 ? (s[r++] = 26, k.setUint32(r, n), r += 4) : (s[r++] = 251, k.setFloat64(r, n), r += 8);
    }
  },
  {
    tag: 258,
    encode(e, t) {
      t(Array.from(e));
    }
  },
  {
    tag: 27,
    encode(e, t) {
      t([e.name, e.message]);
    }
  },
  {
    tag: 27,
    encode(e, t) {
      t([
        "RegExp",
        e.source,
        e.flags
      ]);
    }
  },
  {
    getTag(e) {
      return e.tag;
    },
    encode(e, t) {
      t(e.value);
    }
  },
  { encode(e, t, n) {
    Te(e, n);
  } },
  {
    getTag(e) {
      if (e.constructor === Uint8Array && (this.tagUint8Array || oe && this.tagUint8Array !== !1))
        return 64;
    },
    encode(e, t, n) {
      Te(e, n);
    }
  },
  J(68, 1),
  J(69, 2),
  J(70, 4),
  J(71, 8),
  J(72, 1),
  J(77, 2),
  J(78, 4),
  J(79, 8),
  J(85, 4),
  J(86, 8),
  { encode(e, t) {
    let n = e.packedValues || [], f = e.structures || [];
    if (n.values.length > 0) {
      s[r++] = 216, s[r++] = 51, W(4);
      let l = n.values;
      t(l), W(0), W(0), packedObjectMap = Object.create(sharedPackedObjectMap || null);
      for (let o = 0, h = l.length; o < h; o++) packedObjectMap[l[o]] = o;
    }
    if (f) {
      k.setUint32(r, 3655335424), r += 3;
      let l = f.slice(0);
      l.unshift(57344), l.push(new X(e.version, 1399353956)), t(l);
    } else t(new X(e.version, 1399353956));
  } }
];
function J(e, t) {
  return !Ut && t > 1 && (e -= 4), {
    tag: e,
    encode: function(f, l) {
      let o = f.byteLength, h = f.byteOffset || 0, y = f.buffer || f;
      l(oe ? ge.from(y, h, o) : new Uint8Array(y, h, o));
    }
  };
}
function Te(e, t) {
  let n = e.byteLength;
  n < 24 ? s[r++] = 64 + n : n < 256 ? (s[r++] = 88, s[r++] = n) : n < 65536 ? (s[r++] = 89, s[r++] = n >> 8, s[r++] = n & 255) : (s[r++] = 90, k.setUint32(r, n), r += 4), r + n >= s.length && t(r + n), s.set(e.buffer ? e : new Uint8Array(e), r), r += n;
}
function Bt(e, t) {
  let n, f = t.length * 2, l = e.length - f;
  t.sort((o, h) => o.offset > h.offset ? 1 : -1);
  for (let o = 0; o < t.length; o++) {
    let h = t[o];
    h.id = o;
    for (let y of h.references)
      e[y++] = o >> 8, e[y] = o & 255;
  }
  for (; n = t.pop(); ) {
    let o = n.offset;
    e.copyWithin(o + f, o, l), f -= 2;
    let h = o + f;
    e[h++] = 216, e[h++] = 28, l = o;
  }
  return e;
}
function Qe(e, t) {
  k.setUint32(_.position + e, r - _.position - e + 1);
  let n = _;
  _ = null, t(n[0]), t(n[1]);
}
var Ne = new Mt({ useRecords: !1 }), xt = Ne.encode, _t = Ne.encodeAsIterable, Dt = Ne.encodeAsAsyncIterable, { NEVER: Pt, ALWAYS: Tt, DECIMAL_ROUND: Ft, DECIMAL_FIT: Vt } = Et;
var Ie = 2048;
export {
  Rt as decode,
  xt as encode
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiY2Jvci14LSF+ezAwMH1+LmpzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyIvLyNyZWdpb24gLi4vLi4vLi4vbm9kZV9tb2R1bGVzL2Nib3IteC9kZWNvZGUuanNcbnZhciBkZWNvZGVyO1xudHJ5IHtcblx0ZGVjb2RlciA9IG5ldyBUZXh0RGVjb2RlcigpO1xufSBjYXRjaCAoZXJyb3IpIHt9XG52YXIgc3JjO1xudmFyIHNyY0VuZDtcbnZhciBwb3NpdGlvbiQxID0gMDtcbnZhciBFTVBUWV9BUlJBWSA9IFtdO1xudmFyIExFR0FDWV9SRUNPUkRfSU5MSU5FX0lEID0gMTA1O1xudmFyIFJFQ09SRF9ERUZJTklUSU9OU19JRCA9IDU3MzQyO1xudmFyIFJFQ09SRF9JTkxJTkVfSUQgPSA1NzM0MztcbnZhciBCVU5ETEVEX1NUUklOR1NfSUQgPSA1NzMzNztcbnZhciBQQUNLRURfUkVGRVJFTkNFX1RBR19JRCA9IDY7XG52YXIgU1RPUF9DT0RFID0ge307XG52YXIgbWF4QXJyYXlTaXplID0gMTEyODFlNDtcbnZhciBtYXhNYXBTaXplID0gMTY4MWU0O1xudmFyIHN0cmluZ3MgPSBFTVBUWV9BUlJBWTtcbnZhciBzdHJpbmdQb3NpdGlvbiA9IDA7XG52YXIgY3VycmVudERlY29kZXIgPSB7fTtcbnZhciBjdXJyZW50U3RydWN0dXJlcztcbnZhciBzcmNTdHJpbmc7XG52YXIgc3JjU3RyaW5nU3RhcnQgPSAwO1xudmFyIHNyY1N0cmluZ0VuZCA9IDA7XG52YXIgYnVuZGxlZFN0cmluZ3MkMTtcbnZhciByZWZlcmVuY2VNYXA7XG52YXIgY3VycmVudEV4dGVuc2lvbnMgPSBbXTtcbnZhciBjdXJyZW50RXh0ZW5zaW9uUmFuZ2VzID0gW107XG52YXIgcGFja2VkVmFsdWVzO1xudmFyIGRhdGFWaWV3O1xudmFyIHJlc3RvcmVNYXBzQXNPYmplY3Q7XG52YXIgZGVmYXVsdE9wdGlvbnMgPSB7XG5cdHVzZVJlY29yZHM6IGZhbHNlLFxuXHRtYXBzQXNPYmplY3RzOiB0cnVlXG59O1xudmFyIHNlcXVlbnRpYWxNb2RlID0gZmFsc2U7XG52YXIgaW5saW5lT2JqZWN0UmVhZFRocmVzaG9sZCA9IDI7XG50cnkge1xuXHRuZXcgRnVuY3Rpb24oXCJcIik7XG59IGNhdGNoIChlcnJvcikge1xuXHRpbmxpbmVPYmplY3RSZWFkVGhyZXNob2xkID0gSW5maW5pdHk7XG59XG52YXIgRGVjb2RlciA9IGNsYXNzIERlY29kZXIge1xuXHRjb25zdHJ1Y3RvcihvcHRpb25zKSB7XG5cdFx0aWYgKG9wdGlvbnMpIHtcblx0XHRcdGlmICgob3B0aW9ucy5rZXlNYXAgfHwgb3B0aW9ucy5fa2V5TWFwKSAmJiAhb3B0aW9ucy51c2VSZWNvcmRzKSB7XG5cdFx0XHRcdG9wdGlvbnMudXNlUmVjb3JkcyA9IGZhbHNlO1xuXHRcdFx0XHRvcHRpb25zLm1hcHNBc09iamVjdHMgPSB0cnVlO1xuXHRcdFx0fVxuXHRcdFx0aWYgKG9wdGlvbnMudXNlUmVjb3JkcyA9PT0gZmFsc2UgJiYgb3B0aW9ucy5tYXBzQXNPYmplY3RzID09PSB2b2lkIDApIG9wdGlvbnMubWFwc0FzT2JqZWN0cyA9IHRydWU7XG5cdFx0XHRpZiAob3B0aW9ucy5nZXRTdHJ1Y3R1cmVzKSBvcHRpb25zLmdldFNoYXJlZCA9IG9wdGlvbnMuZ2V0U3RydWN0dXJlcztcblx0XHRcdGlmIChvcHRpb25zLmdldFNoYXJlZCAmJiAhb3B0aW9ucy5zdHJ1Y3R1cmVzKSAob3B0aW9ucy5zdHJ1Y3R1cmVzID0gW10pLnVuaW5pdGlhbGl6ZWQgPSB0cnVlO1xuXHRcdFx0aWYgKG9wdGlvbnMua2V5TWFwKSB7XG5cdFx0XHRcdHRoaXMubWFwS2V5ID0gLyogQF9fUFVSRV9fICovIG5ldyBNYXAoKTtcblx0XHRcdFx0Zm9yIChsZXQgW2ssIHZdIG9mIE9iamVjdC5lbnRyaWVzKG9wdGlvbnMua2V5TWFwKSkgdGhpcy5tYXBLZXkuc2V0KHYsIGspO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRPYmplY3QuYXNzaWduKHRoaXMsIG9wdGlvbnMpO1xuXHR9XG5cdGRlY29kZUtleShrZXkpIHtcblx0XHRyZXR1cm4gdGhpcy5rZXlNYXAgPyB0aGlzLm1hcEtleS5nZXQoa2V5KSB8fCBrZXkgOiBrZXk7XG5cdH1cblx0ZW5jb2RlS2V5KGtleSkge1xuXHRcdHJldHVybiB0aGlzLmtleU1hcCAmJiB0aGlzLmtleU1hcC5oYXNPd25Qcm9wZXJ0eShrZXkpID8gdGhpcy5rZXlNYXBba2V5XSA6IGtleTtcblx0fVxuXHRlbmNvZGVLZXlzKHJlYykge1xuXHRcdGlmICghdGhpcy5fa2V5TWFwKSByZXR1cm4gcmVjO1xuXHRcdGxldCBtYXAgPSAvKiBAX19QVVJFX18gKi8gbmV3IE1hcCgpO1xuXHRcdGZvciAobGV0IFtrLCB2XSBvZiBPYmplY3QuZW50cmllcyhyZWMpKSBtYXAuc2V0KHRoaXMuX2tleU1hcC5oYXNPd25Qcm9wZXJ0eShrKSA/IHRoaXMuX2tleU1hcFtrXSA6IGssIHYpO1xuXHRcdHJldHVybiBtYXA7XG5cdH1cblx0ZGVjb2RlS2V5cyhtYXApIHtcblx0XHRpZiAoIXRoaXMuX2tleU1hcCB8fCBtYXAuY29uc3RydWN0b3IubmFtZSAhPSBcIk1hcFwiKSByZXR1cm4gbWFwO1xuXHRcdGlmICghdGhpcy5fbWFwS2V5KSB7XG5cdFx0XHR0aGlzLl9tYXBLZXkgPSAvKiBAX19QVVJFX18gKi8gbmV3IE1hcCgpO1xuXHRcdFx0Zm9yIChsZXQgW2ssIHZdIG9mIE9iamVjdC5lbnRyaWVzKHRoaXMuX2tleU1hcCkpIHRoaXMuX21hcEtleS5zZXQodiwgayk7XG5cdFx0fVxuXHRcdGxldCByZXMgPSB7fTtcblx0XHRtYXAuZm9yRWFjaCgodiwgaykgPT4gcmVzW3NhZmVLZXkodGhpcy5fbWFwS2V5LmhhcyhrKSA/IHRoaXMuX21hcEtleS5nZXQoaykgOiBrKV0gPSB2KTtcblx0XHRyZXR1cm4gcmVzO1xuXHR9XG5cdG1hcERlY29kZShzb3VyY2UsIGVuZCkge1xuXHRcdGxldCByZXMgPSB0aGlzLmRlY29kZShzb3VyY2UpO1xuXHRcdGlmICh0aGlzLl9rZXlNYXApIHN3aXRjaCAocmVzLmNvbnN0cnVjdG9yLm5hbWUpIHtcblx0XHRcdGNhc2UgXCJBcnJheVwiOiByZXR1cm4gcmVzLm1hcCgocikgPT4gdGhpcy5kZWNvZGVLZXlzKHIpKTtcblx0XHR9XG5cdFx0cmV0dXJuIHJlcztcblx0fVxuXHRkZWNvZGUoc291cmNlLCBlbmQpIHtcblx0XHRpZiAoc3JjKSByZXR1cm4gc2F2ZVN0YXRlKCgpID0+IHtcblx0XHRcdGNsZWFyU291cmNlKCk7XG5cdFx0XHRyZXR1cm4gdGhpcyA/IHRoaXMuZGVjb2RlKHNvdXJjZSwgZW5kKSA6IERlY29kZXIucHJvdG90eXBlLmRlY29kZS5jYWxsKGRlZmF1bHRPcHRpb25zLCBzb3VyY2UsIGVuZCk7XG5cdFx0fSk7XG5cdFx0c3JjRW5kID0gZW5kID4gLTEgPyBlbmQgOiBzb3VyY2UubGVuZ3RoO1xuXHRcdHBvc2l0aW9uJDEgPSAwO1xuXHRcdHN0cmluZ1Bvc2l0aW9uID0gMDtcblx0XHRzcmNTdHJpbmdFbmQgPSAwO1xuXHRcdHNyY1N0cmluZyA9IG51bGw7XG5cdFx0c3RyaW5ncyA9IEVNUFRZX0FSUkFZO1xuXHRcdGJ1bmRsZWRTdHJpbmdzJDEgPSBudWxsO1xuXHRcdHNyYyA9IHNvdXJjZTtcblx0XHR0cnkge1xuXHRcdFx0ZGF0YVZpZXcgPSBzb3VyY2UuZGF0YVZpZXcgfHwgKHNvdXJjZS5kYXRhVmlldyA9IG5ldyBEYXRhVmlldyhzb3VyY2UuYnVmZmVyLCBzb3VyY2UuYnl0ZU9mZnNldCwgc291cmNlLmJ5dGVMZW5ndGgpKTtcblx0XHR9IGNhdGNoIChlcnJvcikge1xuXHRcdFx0c3JjID0gbnVsbDtcblx0XHRcdGlmIChzb3VyY2UgaW5zdGFuY2VvZiBVaW50OEFycmF5KSB0aHJvdyBlcnJvcjtcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIlNvdXJjZSBtdXN0IGJlIGEgVWludDhBcnJheSBvciBCdWZmZXIgYnV0IHdhcyBhIFwiICsgKHNvdXJjZSAmJiB0eXBlb2Ygc291cmNlID09IFwib2JqZWN0XCIgPyBzb3VyY2UuY29uc3RydWN0b3IubmFtZSA6IHR5cGVvZiBzb3VyY2UpKTtcblx0XHR9XG5cdFx0aWYgKHRoaXMgaW5zdGFuY2VvZiBEZWNvZGVyKSB7XG5cdFx0XHRjdXJyZW50RGVjb2RlciA9IHRoaXM7XG5cdFx0XHRwYWNrZWRWYWx1ZXMgPSB0aGlzLnNoYXJlZFZhbHVlcyAmJiAodGhpcy5wYWNrID8gbmV3IEFycmF5KHRoaXMubWF4UHJpdmF0ZVBhY2tlZFZhbHVlcyB8fCAxNikuY29uY2F0KHRoaXMuc2hhcmVkVmFsdWVzKSA6IHRoaXMuc2hhcmVkVmFsdWVzKTtcblx0XHRcdGlmICh0aGlzLnN0cnVjdHVyZXMpIHtcblx0XHRcdFx0Y3VycmVudFN0cnVjdHVyZXMgPSB0aGlzLnN0cnVjdHVyZXM7XG5cdFx0XHRcdHJldHVybiBjaGVja2VkUmVhZCgpO1xuXHRcdFx0fSBlbHNlIGlmICghY3VycmVudFN0cnVjdHVyZXMgfHwgY3VycmVudFN0cnVjdHVyZXMubGVuZ3RoID4gMCkgY3VycmVudFN0cnVjdHVyZXMgPSBbXTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0Y3VycmVudERlY29kZXIgPSBkZWZhdWx0T3B0aW9ucztcblx0XHRcdGlmICghY3VycmVudFN0cnVjdHVyZXMgfHwgY3VycmVudFN0cnVjdHVyZXMubGVuZ3RoID4gMCkgY3VycmVudFN0cnVjdHVyZXMgPSBbXTtcblx0XHRcdHBhY2tlZFZhbHVlcyA9IG51bGw7XG5cdFx0fVxuXHRcdHJldHVybiBjaGVja2VkUmVhZCgpO1xuXHR9XG5cdGRlY29kZU11bHRpcGxlKHNvdXJjZSwgZm9yRWFjaCkge1xuXHRcdGxldCB2YWx1ZXMsIGxhc3RQb3NpdGlvbiA9IDA7XG5cdFx0dHJ5IHtcblx0XHRcdGxldCBzaXplID0gc291cmNlLmxlbmd0aDtcblx0XHRcdHNlcXVlbnRpYWxNb2RlID0gdHJ1ZTtcblx0XHRcdGxldCB2YWx1ZSA9IHRoaXMgPyB0aGlzLmRlY29kZShzb3VyY2UsIHNpemUpIDogZGVmYXVsdERlY29kZXIuZGVjb2RlKHNvdXJjZSwgc2l6ZSk7XG5cdFx0XHRpZiAoZm9yRWFjaCkge1xuXHRcdFx0XHRpZiAoZm9yRWFjaCh2YWx1ZSkgPT09IGZhbHNlKSByZXR1cm47XG5cdFx0XHRcdHdoaWxlIChwb3NpdGlvbiQxIDwgc2l6ZSkge1xuXHRcdFx0XHRcdGxhc3RQb3NpdGlvbiA9IHBvc2l0aW9uJDE7XG5cdFx0XHRcdFx0aWYgKGZvckVhY2goY2hlY2tlZFJlYWQoKSkgPT09IGZhbHNlKSByZXR1cm47XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHZhbHVlcyA9IFt2YWx1ZV07XG5cdFx0XHRcdHdoaWxlIChwb3NpdGlvbiQxIDwgc2l6ZSkge1xuXHRcdFx0XHRcdGxhc3RQb3NpdGlvbiA9IHBvc2l0aW9uJDE7XG5cdFx0XHRcdFx0dmFsdWVzLnB1c2goY2hlY2tlZFJlYWQoKSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIHZhbHVlcztcblx0XHRcdH1cblx0XHR9IGNhdGNoIChlcnJvcikge1xuXHRcdFx0ZXJyb3IubGFzdFBvc2l0aW9uID0gbGFzdFBvc2l0aW9uO1xuXHRcdFx0ZXJyb3IudmFsdWVzID0gdmFsdWVzO1xuXHRcdFx0dGhyb3cgZXJyb3I7XG5cdFx0fSBmaW5hbGx5IHtcblx0XHRcdHNlcXVlbnRpYWxNb2RlID0gZmFsc2U7XG5cdFx0XHRjbGVhclNvdXJjZSgpO1xuXHRcdH1cblx0fVxufTtcbmZ1bmN0aW9uIGNoZWNrZWRSZWFkKCkge1xuXHR0cnkge1xuXHRcdGxldCByZXN1bHQgPSByZWFkKCk7XG5cdFx0aWYgKGJ1bmRsZWRTdHJpbmdzJDEpIHtcblx0XHRcdGlmIChwb3NpdGlvbiQxID49IGJ1bmRsZWRTdHJpbmdzJDEucG9zdEJ1bmRsZVBvc2l0aW9uKSB7XG5cdFx0XHRcdGxldCBlcnJvciA9IC8qIEBfX1BVUkVfXyAqLyBuZXcgRXJyb3IoXCJVbmV4cGVjdGVkIGJ1bmRsZSBwb3NpdGlvblwiKTtcblx0XHRcdFx0ZXJyb3IuaW5jb21wbGV0ZSA9IHRydWU7XG5cdFx0XHRcdHRocm93IGVycm9yO1xuXHRcdFx0fVxuXHRcdFx0cG9zaXRpb24kMSA9IGJ1bmRsZWRTdHJpbmdzJDEucG9zdEJ1bmRsZVBvc2l0aW9uO1xuXHRcdFx0YnVuZGxlZFN0cmluZ3MkMSA9IG51bGw7XG5cdFx0fVxuXHRcdGlmIChwb3NpdGlvbiQxID09IHNyY0VuZCkge1xuXHRcdFx0Y3VycmVudFN0cnVjdHVyZXMgPSBudWxsO1xuXHRcdFx0c3JjID0gbnVsbDtcblx0XHRcdGlmIChyZWZlcmVuY2VNYXApIHJlZmVyZW5jZU1hcCA9IG51bGw7XG5cdFx0fSBlbHNlIGlmIChwb3NpdGlvbiQxID4gc3JjRW5kKSB7XG5cdFx0XHRsZXQgZXJyb3IgPSAvKiBAX19QVVJFX18gKi8gbmV3IEVycm9yKFwiVW5leHBlY3RlZCBlbmQgb2YgQ0JPUiBkYXRhXCIpO1xuXHRcdFx0ZXJyb3IuaW5jb21wbGV0ZSA9IHRydWU7XG5cdFx0XHR0aHJvdyBlcnJvcjtcblx0XHR9IGVsc2UgaWYgKCFzZXF1ZW50aWFsTW9kZSkgdGhyb3cgbmV3IEVycm9yKFwiRGF0YSByZWFkLCBidXQgZW5kIG9mIGJ1ZmZlciBub3QgcmVhY2hlZFwiKTtcblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9IGNhdGNoIChlcnJvcikge1xuXHRcdGNsZWFyU291cmNlKCk7XG5cdFx0aWYgKGVycm9yIGluc3RhbmNlb2YgUmFuZ2VFcnJvciB8fCBlcnJvci5tZXNzYWdlLnN0YXJ0c1dpdGgoXCJVbmV4cGVjdGVkIGVuZCBvZiBidWZmZXJcIikpIGVycm9yLmluY29tcGxldGUgPSB0cnVlO1xuXHRcdHRocm93IGVycm9yO1xuXHR9XG59XG5mdW5jdGlvbiBlbmRPZkNCT1JFcnJvcigpIHtcblx0bGV0IGVycm9yID0gLyogQF9fUFVSRV9fICovIG5ldyBFcnJvcihcIlVuZXhwZWN0ZWQgZW5kIG9mIENCT1IgZGF0YVwiKTtcblx0ZXJyb3IuaW5jb21wbGV0ZSA9IHRydWU7XG5cdHJldHVybiBlcnJvcjtcbn1cbmZ1bmN0aW9uIHJlYWQoKSB7XG5cdGlmICghKHBvc2l0aW9uJDEgPCBzcmNFbmQpKSB0aHJvdyBlbmRPZkNCT1JFcnJvcigpO1xuXHRsZXQgdG9rZW4gPSBzcmNbcG9zaXRpb24kMSsrXTtcblx0bGV0IG1ham9yVHlwZSA9IHRva2VuID4+IDU7XG5cdHRva2VuID0gdG9rZW4gJiAzMTtcblx0aWYgKHRva2VuID4gMjMpIHN3aXRjaCAodG9rZW4pIHtcblx0XHRjYXNlIDI0OlxuXHRcdFx0aWYgKHBvc2l0aW9uJDEgPj0gc3JjRW5kKSB0aHJvdyBlbmRPZkNCT1JFcnJvcigpO1xuXHRcdFx0dG9rZW4gPSBzcmNbcG9zaXRpb24kMSsrXTtcblx0XHRcdGJyZWFrO1xuXHRcdGNhc2UgMjU6XG5cdFx0XHRpZiAobWFqb3JUeXBlID09IDcpIHJldHVybiBnZXRGbG9hdDE2KCk7XG5cdFx0XHR0b2tlbiA9IGRhdGFWaWV3LmdldFVpbnQxNihwb3NpdGlvbiQxKTtcblx0XHRcdHBvc2l0aW9uJDEgKz0gMjtcblx0XHRcdGJyZWFrO1xuXHRcdGNhc2UgMjY6XG5cdFx0XHRpZiAobWFqb3JUeXBlID09IDcpIHtcblx0XHRcdFx0bGV0IHZhbHVlID0gZGF0YVZpZXcuZ2V0RmxvYXQzMihwb3NpdGlvbiQxKTtcblx0XHRcdFx0aWYgKGN1cnJlbnREZWNvZGVyLnVzZUZsb2F0MzIgPiAyKSB7XG5cdFx0XHRcdFx0bGV0IG11bHRpcGxpZXIgPSBtdWx0MTBbKHNyY1twb3NpdGlvbiQxXSAmIDEyNykgPDwgMSB8IHNyY1twb3NpdGlvbiQxICsgMV0gPj4gN107XG5cdFx0XHRcdFx0cG9zaXRpb24kMSArPSA0O1xuXHRcdFx0XHRcdHJldHVybiAobXVsdGlwbGllciAqIHZhbHVlICsgKHZhbHVlID4gMCA/IC41IDogLS41KSA+PiAwKSAvIG11bHRpcGxpZXI7XG5cdFx0XHRcdH1cblx0XHRcdFx0cG9zaXRpb24kMSArPSA0O1xuXHRcdFx0XHRyZXR1cm4gdmFsdWU7XG5cdFx0XHR9XG5cdFx0XHR0b2tlbiA9IGRhdGFWaWV3LmdldFVpbnQzMihwb3NpdGlvbiQxKTtcblx0XHRcdHBvc2l0aW9uJDEgKz0gNDtcblx0XHRcdGlmIChtYWpvclR5cGUgPT09IDEpIHJldHVybiAtMSAtIHRva2VuO1xuXHRcdFx0YnJlYWs7XG5cdFx0Y2FzZSAyNzpcblx0XHRcdGlmIChtYWpvclR5cGUgPT0gNykge1xuXHRcdFx0XHRsZXQgdmFsdWUgPSBkYXRhVmlldy5nZXRGbG9hdDY0KHBvc2l0aW9uJDEpO1xuXHRcdFx0XHRwb3NpdGlvbiQxICs9IDg7XG5cdFx0XHRcdHJldHVybiB2YWx1ZTtcblx0XHRcdH1cblx0XHRcdGlmIChtYWpvclR5cGUgPiAxKSB7XG5cdFx0XHRcdGlmIChkYXRhVmlldy5nZXRVaW50MzIocG9zaXRpb24kMSkgPiAwKSB0aHJvdyBuZXcgRXJyb3IoXCJKYXZhU2NyaXB0IGRvZXMgbm90IHN1cHBvcnQgYXJyYXlzLCBtYXBzLCBvciBzdHJpbmdzIHdpdGggbGVuZ3RoIG92ZXIgNDI5NDk2NzI5NVwiKTtcblx0XHRcdFx0dG9rZW4gPSBkYXRhVmlldy5nZXRVaW50MzIocG9zaXRpb24kMSArIDQpO1xuXHRcdFx0fSBlbHNlIGlmIChjdXJyZW50RGVjb2Rlci5pbnQ2NEFzTnVtYmVyKSB7XG5cdFx0XHRcdHRva2VuID0gZGF0YVZpZXcuZ2V0VWludDMyKHBvc2l0aW9uJDEpICogNDI5NDk2NzI5Njtcblx0XHRcdFx0dG9rZW4gKz0gZGF0YVZpZXcuZ2V0VWludDMyKHBvc2l0aW9uJDEgKyA0KTtcblx0XHRcdH0gZWxzZSB0b2tlbiA9IGRhdGFWaWV3LmdldEJpZ1VpbnQ2NChwb3NpdGlvbiQxKTtcblx0XHRcdHBvc2l0aW9uJDEgKz0gODtcblx0XHRcdGJyZWFrO1xuXHRcdGNhc2UgMzE6IHN3aXRjaCAobWFqb3JUeXBlKSB7XG5cdFx0XHRjYXNlIDI6XG5cdFx0XHRjYXNlIDM6IHRocm93IG5ldyBFcnJvcihcIkluZGVmaW5pdGUgbGVuZ3RoIG5vdCBzdXBwb3J0ZWQgZm9yIGJ5dGUgb3IgdGV4dCBzdHJpbmdzXCIpO1xuXHRcdFx0Y2FzZSA0OlxuXHRcdFx0XHRsZXQgYXJyYXkgPSBbXTtcblx0XHRcdFx0bGV0IHZhbHVlLCBpID0gMDtcblx0XHRcdFx0d2hpbGUgKCh2YWx1ZSA9IHJlYWQoKSkgIT0gU1RPUF9DT0RFKSB7XG5cdFx0XHRcdFx0aWYgKGkgPj0gbWF4QXJyYXlTaXplKSB0aHJvdyBuZXcgRXJyb3IoYEFycmF5IGxlbmd0aCBleGNlZWRzICR7bWF4QXJyYXlTaXplfWApO1xuXHRcdFx0XHRcdGFycmF5W2krK10gPSB2YWx1ZTtcblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4gbWFqb3JUeXBlID09IDQgPyBhcnJheSA6IG1ham9yVHlwZSA9PSAzID8gYXJyYXkuam9pbihcIlwiKSA6IEJ1ZmZlci5jb25jYXQoYXJyYXkpO1xuXHRcdFx0Y2FzZSA1OlxuXHRcdFx0XHRsZXQga2V5O1xuXHRcdFx0XHRpZiAoY3VycmVudERlY29kZXIubWFwc0FzT2JqZWN0cykge1xuXHRcdFx0XHRcdGxldCBvYmplY3QgPSB7fTtcblx0XHRcdFx0XHRsZXQgaSA9IDA7XG5cdFx0XHRcdFx0aWYgKGN1cnJlbnREZWNvZGVyLmtleU1hcCkgd2hpbGUgKChrZXkgPSByZWFkKCkpICE9IFNUT1BfQ09ERSkge1xuXHRcdFx0XHRcdFx0aWYgKGkrKyA+PSBtYXhNYXBTaXplKSB0aHJvdyBuZXcgRXJyb3IoYFByb3BlcnR5IGNvdW50IGV4Y2VlZHMgJHttYXhNYXBTaXplfWApO1xuXHRcdFx0XHRcdFx0b2JqZWN0W3NhZmVLZXkoY3VycmVudERlY29kZXIuZGVjb2RlS2V5KGtleSkpXSA9IHJlYWQoKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWxzZSB3aGlsZSAoKGtleSA9IHJlYWQoKSkgIT0gU1RPUF9DT0RFKSB7XG5cdFx0XHRcdFx0XHRpZiAoaSsrID49IG1heE1hcFNpemUpIHRocm93IG5ldyBFcnJvcihgUHJvcGVydHkgY291bnQgZXhjZWVkcyAke21heE1hcFNpemV9YCk7XG5cdFx0XHRcdFx0XHRvYmplY3Rbc2FmZUtleShrZXkpXSA9IHJlYWQoKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0cmV0dXJuIG9iamVjdDtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRpZiAocmVzdG9yZU1hcHNBc09iamVjdCkge1xuXHRcdFx0XHRcdFx0Y3VycmVudERlY29kZXIubWFwc0FzT2JqZWN0cyA9IHRydWU7XG5cdFx0XHRcdFx0XHRyZXN0b3JlTWFwc0FzT2JqZWN0ID0gZmFsc2U7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGxldCBtYXAgPSAvKiBAX19QVVJFX18gKi8gbmV3IE1hcCgpO1xuXHRcdFx0XHRcdGlmIChjdXJyZW50RGVjb2Rlci5rZXlNYXApIHtcblx0XHRcdFx0XHRcdGxldCBpID0gMDtcblx0XHRcdFx0XHRcdHdoaWxlICgoa2V5ID0gcmVhZCgpKSAhPSBTVE9QX0NPREUpIHtcblx0XHRcdFx0XHRcdFx0aWYgKGkrKyA+PSBtYXhNYXBTaXplKSB0aHJvdyBuZXcgRXJyb3IoYE1hcCBzaXplIGV4Y2VlZHMgJHttYXhNYXBTaXplfWApO1xuXHRcdFx0XHRcdFx0XHRtYXAuc2V0KGN1cnJlbnREZWNvZGVyLmRlY29kZUtleShrZXkpLCByZWFkKCkpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRsZXQgaSA9IDA7XG5cdFx0XHRcdFx0XHR3aGlsZSAoKGtleSA9IHJlYWQoKSkgIT0gU1RPUF9DT0RFKSB7XG5cdFx0XHRcdFx0XHRcdGlmIChpKysgPj0gbWF4TWFwU2l6ZSkgdGhyb3cgbmV3IEVycm9yKGBNYXAgc2l6ZSBleGNlZWRzICR7bWF4TWFwU2l6ZX1gKTtcblx0XHRcdFx0XHRcdFx0bWFwLnNldChrZXksIHJlYWQoKSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHJldHVybiBtYXA7XG5cdFx0XHRcdH1cblx0XHRcdGNhc2UgNzogcmV0dXJuIFNUT1BfQ09ERTtcblx0XHRcdGRlZmF1bHQ6IHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgbWFqb3IgdHlwZSBmb3IgaW5kZWZpbml0ZSBsZW5ndGggXCIgKyBtYWpvclR5cGUpO1xuXHRcdH1cblx0XHRkZWZhdWx0OiB0aHJvdyBuZXcgRXJyb3IoXCJVbmtub3duIHRva2VuIFwiICsgdG9rZW4pO1xuXHR9XG5cdHN3aXRjaCAobWFqb3JUeXBlKSB7XG5cdFx0Y2FzZSAwOiByZXR1cm4gdG9rZW47XG5cdFx0Y2FzZSAxOiByZXR1cm4gfnRva2VuO1xuXHRcdGNhc2UgMjogcmV0dXJuIHJlYWRCaW4odG9rZW4pO1xuXHRcdGNhc2UgMzpcblx0XHRcdGlmIChzcmNTdHJpbmdFbmQgPj0gcG9zaXRpb24kMSkgcmV0dXJuIHNyY1N0cmluZy5zbGljZShwb3NpdGlvbiQxIC0gc3JjU3RyaW5nU3RhcnQsIChwb3NpdGlvbiQxICs9IHRva2VuKSAtIHNyY1N0cmluZ1N0YXJ0KTtcblx0XHRcdGlmIChzcmNTdHJpbmdFbmQgPT0gMCAmJiBzcmNFbmQgPCAxNDAgJiYgdG9rZW4gPCAzMikge1xuXHRcdFx0XHRsZXQgc3RyaW5nID0gdG9rZW4gPCAxNiA/IHNob3J0U3RyaW5nSW5KUyh0b2tlbikgOiBsb25nU3RyaW5nSW5KUyh0b2tlbik7XG5cdFx0XHRcdGlmIChzdHJpbmcgIT0gbnVsbCkgcmV0dXJuIHN0cmluZztcblx0XHRcdH1cblx0XHRcdHJldHVybiByZWFkRml4ZWRTdHJpbmcodG9rZW4pO1xuXHRcdGNhc2UgNDpcblx0XHRcdGlmICh0b2tlbiA+PSBtYXhBcnJheVNpemUpIHRocm93IG5ldyBFcnJvcihgQXJyYXkgbGVuZ3RoIGV4Y2VlZHMgJHttYXhBcnJheVNpemV9YCk7XG5cdFx0XHRpZiAodG9rZW4gPiBzcmNFbmQgLSBwb3NpdGlvbiQxKSB0aHJvdyBlbmRPZkNCT1JFcnJvcigpO1xuXHRcdFx0bGV0IGFycmF5ID0gbmV3IEFycmF5KHRva2VuKTtcblx0XHRcdGZvciAobGV0IGkgPSAwOyBpIDwgdG9rZW47IGkrKykgYXJyYXlbaV0gPSByZWFkKCk7XG5cdFx0XHRyZXR1cm4gYXJyYXk7XG5cdFx0Y2FzZSA1OlxuXHRcdFx0aWYgKHRva2VuID49IG1heE1hcFNpemUpIHRocm93IG5ldyBFcnJvcihgTWFwIHNpemUgZXhjZWVkcyAke21heEFycmF5U2l6ZX1gKTtcblx0XHRcdGlmICh0b2tlbiA+IChzcmNFbmQgLSBwb3NpdGlvbiQxKSAvIDIpIHRocm93IGVuZE9mQ0JPUkVycm9yKCk7XG5cdFx0XHRpZiAoY3VycmVudERlY29kZXIubWFwc0FzT2JqZWN0cykge1xuXHRcdFx0XHRsZXQgb2JqZWN0ID0ge307XG5cdFx0XHRcdGlmIChjdXJyZW50RGVjb2Rlci5rZXlNYXApIGZvciAobGV0IGkgPSAwOyBpIDwgdG9rZW47IGkrKykgb2JqZWN0W3NhZmVLZXkoY3VycmVudERlY29kZXIuZGVjb2RlS2V5KHJlYWQoKSkpXSA9IHJlYWQoKTtcblx0XHRcdFx0ZWxzZSBmb3IgKGxldCBpID0gMDsgaSA8IHRva2VuOyBpKyspIG9iamVjdFtzYWZlS2V5KHJlYWQoKSldID0gcmVhZCgpO1xuXHRcdFx0XHRyZXR1cm4gb2JqZWN0O1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0aWYgKHJlc3RvcmVNYXBzQXNPYmplY3QpIHtcblx0XHRcdFx0XHRjdXJyZW50RGVjb2Rlci5tYXBzQXNPYmplY3RzID0gdHJ1ZTtcblx0XHRcdFx0XHRyZXN0b3JlTWFwc0FzT2JqZWN0ID0gZmFsc2U7XG5cdFx0XHRcdH1cblx0XHRcdFx0bGV0IG1hcCA9IC8qIEBfX1BVUkVfXyAqLyBuZXcgTWFwKCk7XG5cdFx0XHRcdGlmIChjdXJyZW50RGVjb2Rlci5rZXlNYXApIGZvciAobGV0IGkgPSAwOyBpIDwgdG9rZW47IGkrKykgbWFwLnNldChjdXJyZW50RGVjb2Rlci5kZWNvZGVLZXkocmVhZCgpKSwgcmVhZCgpKTtcblx0XHRcdFx0ZWxzZSBmb3IgKGxldCBpID0gMDsgaSA8IHRva2VuOyBpKyspIG1hcC5zZXQocmVhZCgpLCByZWFkKCkpO1xuXHRcdFx0XHRyZXR1cm4gbWFwO1xuXHRcdFx0fVxuXHRcdGNhc2UgNjpcblx0XHRcdGlmICh0b2tlbiA+PSBCVU5ETEVEX1NUUklOR1NfSUQpIHtcblx0XHRcdFx0bGV0IHN0cnVjdHVyZSA9IGN1cnJlbnRTdHJ1Y3R1cmVzW3Rva2VuICYgODE5MV07XG5cdFx0XHRcdGlmIChzdHJ1Y3R1cmUpIHtcblx0XHRcdFx0XHRpZiAoIXN0cnVjdHVyZS5yZWFkKSBzdHJ1Y3R1cmUucmVhZCA9IGNyZWF0ZVN0cnVjdHVyZVJlYWRlcihzdHJ1Y3R1cmUpO1xuXHRcdFx0XHRcdHJldHVybiBzdHJ1Y3R1cmUucmVhZCgpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmICh0b2tlbiA8IDY1NTM2KSB7XG5cdFx0XHRcdFx0aWYgKHRva2VuID09IFJFQ09SRF9JTkxJTkVfSUQpIHtcblx0XHRcdFx0XHRcdGxldCBsZW5ndGggPSByZWFkSnVzdExlbmd0aCgpO1xuXHRcdFx0XHRcdFx0bGV0IGlkID0gcmVhZCgpO1xuXHRcdFx0XHRcdFx0bGV0IHN0cnVjdHVyZSA9IHJlYWQoKTtcblx0XHRcdFx0XHRcdHJlY29yZERlZmluaXRpb24oaWQsIHN0cnVjdHVyZSk7XG5cdFx0XHRcdFx0XHRsZXQgb2JqZWN0ID0ge307XG5cdFx0XHRcdFx0XHRpZiAoY3VycmVudERlY29kZXIua2V5TWFwKSBmb3IgKGxldCBpID0gMjsgaSA8IGxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdFx0XHRcdGxldCBrZXkgPSBjdXJyZW50RGVjb2Rlci5kZWNvZGVLZXkoc3RydWN0dXJlW2kgLSAyXSk7XG5cdFx0XHRcdFx0XHRcdG9iamVjdFtzYWZlS2V5KGtleSldID0gcmVhZCgpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0ZWxzZSBmb3IgKGxldCBpID0gMjsgaSA8IGxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdFx0XHRcdGxldCBrZXkgPSBzdHJ1Y3R1cmVbaSAtIDJdO1xuXHRcdFx0XHRcdFx0XHRvYmplY3Rbc2FmZUtleShrZXkpXSA9IHJlYWQoKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHJldHVybiBvYmplY3Q7XG5cdFx0XHRcdFx0fSBlbHNlIGlmICh0b2tlbiA9PSBSRUNPUkRfREVGSU5JVElPTlNfSUQpIHtcblx0XHRcdFx0XHRcdGxldCBsZW5ndGggPSByZWFkSnVzdExlbmd0aCgpO1xuXHRcdFx0XHRcdFx0bGV0IGlkID0gcmVhZCgpO1xuXHRcdFx0XHRcdFx0Zm9yIChsZXQgaSA9IDI7IGkgPCBsZW5ndGg7IGkrKykgcmVjb3JkRGVmaW5pdGlvbihpZCsrLCByZWFkKCkpO1xuXHRcdFx0XHRcdFx0cmV0dXJuIHJlYWQoKTtcblx0XHRcdFx0XHR9IGVsc2UgaWYgKHRva2VuID09IEJVTkRMRURfU1RSSU5HU19JRCkgcmV0dXJuIHJlYWRCdW5kbGVFeHQoKTtcblx0XHRcdFx0XHRpZiAoY3VycmVudERlY29kZXIuZ2V0U2hhcmVkKSB7XG5cdFx0XHRcdFx0XHRsb2FkU2hhcmVkKCk7XG5cdFx0XHRcdFx0XHRzdHJ1Y3R1cmUgPSBjdXJyZW50U3RydWN0dXJlc1t0b2tlbiAmIDgxOTFdO1xuXHRcdFx0XHRcdFx0aWYgKHN0cnVjdHVyZSkge1xuXHRcdFx0XHRcdFx0XHRpZiAoIXN0cnVjdHVyZS5yZWFkKSBzdHJ1Y3R1cmUucmVhZCA9IGNyZWF0ZVN0cnVjdHVyZVJlYWRlcihzdHJ1Y3R1cmUpO1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gc3RydWN0dXJlLnJlYWQoKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGxldCBleHRlbnNpb24gPSBjdXJyZW50RXh0ZW5zaW9uc1t0b2tlbl07XG5cdFx0XHRpZiAoZXh0ZW5zaW9uKSB7XG5cdFx0XHRcdGlmIChleHRlbnNpb24uaGFuZGxlc1JlYWQpIHJldHVybiBleHRlbnNpb24ocmVhZCk7XG5cdFx0XHRcdGVsc2UgcmV0dXJuIGV4dGVuc2lvbihyZWFkKCkpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0bGV0IGlucHV0ID0gcmVhZCgpO1xuXHRcdFx0XHRmb3IgKGxldCBpID0gMDsgaSA8IGN1cnJlbnRFeHRlbnNpb25SYW5nZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0XHRsZXQgdmFsdWUgPSBjdXJyZW50RXh0ZW5zaW9uUmFuZ2VzW2ldKHRva2VuLCBpbnB1dCk7XG5cdFx0XHRcdFx0aWYgKHZhbHVlICE9PSB2b2lkIDApIHJldHVybiB2YWx1ZTtcblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4gbmV3IFRhZyhpbnB1dCwgdG9rZW4pO1xuXHRcdFx0fVxuXHRcdGNhc2UgNzogc3dpdGNoICh0b2tlbikge1xuXHRcdFx0Y2FzZSAyMDogcmV0dXJuIGZhbHNlO1xuXHRcdFx0Y2FzZSAyMTogcmV0dXJuIHRydWU7XG5cdFx0XHRjYXNlIDIyOiByZXR1cm4gbnVsbDtcblx0XHRcdGNhc2UgMjM6IHJldHVybjtcblx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdGxldCBwYWNrZWRWYWx1ZSA9IChwYWNrZWRWYWx1ZXMgfHwgZ2V0UGFja2VkVmFsdWVzKCkpW3Rva2VuXTtcblx0XHRcdFx0aWYgKHBhY2tlZFZhbHVlICE9PSB2b2lkIDApIHJldHVybiBwYWNrZWRWYWx1ZTtcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiVW5rbm93biB0b2tlbiBcIiArIHRva2VuKTtcblx0XHR9XG5cdFx0ZGVmYXVsdDpcblx0XHRcdGlmIChpc05hTih0b2tlbikpIHRocm93IGVuZE9mQ0JPUkVycm9yKCk7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJVbmtub3duIENCT1IgdG9rZW4gXCIgKyB0b2tlbik7XG5cdH1cbn1cbnZhciB2YWxpZE5hbWUgPSAvXlthLXpBLVpfJF1bYS16QS1aXFxkXyRdKiQvO1xuZnVuY3Rpb24gY3JlYXRlU3RydWN0dXJlUmVhZGVyKHN0cnVjdHVyZSkge1xuXHRpZiAoIXN0cnVjdHVyZSkgdGhyb3cgbmV3IEVycm9yKFwiU3RydWN0dXJlIGlzIHJlcXVpcmVkIGluIHJlY29yZCBkZWZpbml0aW9uXCIpO1xuXHRmdW5jdGlvbiByZWFkT2JqZWN0KCkge1xuXHRcdGxldCBsZW5ndGggPSBzcmNbcG9zaXRpb24kMSsrXTtcblx0XHRsZW5ndGggPSBsZW5ndGggJiAzMTtcblx0XHRpZiAobGVuZ3RoID4gMjMpIHN3aXRjaCAobGVuZ3RoKSB7XG5cdFx0XHRjYXNlIDI0OlxuXHRcdFx0XHRsZW5ndGggPSBzcmNbcG9zaXRpb24kMSsrXTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlIDI1OlxuXHRcdFx0XHRsZW5ndGggPSBkYXRhVmlldy5nZXRVaW50MTYocG9zaXRpb24kMSk7XG5cdFx0XHRcdHBvc2l0aW9uJDEgKz0gMjtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlIDI2OlxuXHRcdFx0XHRsZW5ndGggPSBkYXRhVmlldy5nZXRVaW50MzIocG9zaXRpb24kMSk7XG5cdFx0XHRcdHBvc2l0aW9uJDEgKz0gNDtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRkZWZhdWx0OiB0aHJvdyBuZXcgRXJyb3IoXCJFeHBlY3RlZCBhcnJheSBoZWFkZXIsIGJ1dCBnb3QgXCIgKyBzcmNbcG9zaXRpb24kMSAtIDFdKTtcblx0XHR9XG5cdFx0bGV0IGNvbXBpbGVkUmVhZGVyID0gdGhpcy5jb21waWxlZFJlYWRlcjtcblx0XHR3aGlsZSAoY29tcGlsZWRSZWFkZXIpIHtcblx0XHRcdGlmIChjb21waWxlZFJlYWRlci5wcm9wZXJ0eUNvdW50ID09PSBsZW5ndGgpIHJldHVybiBjb21waWxlZFJlYWRlcihyZWFkKTtcblx0XHRcdGNvbXBpbGVkUmVhZGVyID0gY29tcGlsZWRSZWFkZXIubmV4dDtcblx0XHR9XG5cdFx0aWYgKHRoaXMuc2xvd1JlYWRzKysgPj0gaW5saW5lT2JqZWN0UmVhZFRocmVzaG9sZCkge1xuXHRcdFx0bGV0IGFycmF5ID0gdGhpcy5sZW5ndGggPT0gbGVuZ3RoID8gdGhpcyA6IHRoaXMuc2xpY2UoMCwgbGVuZ3RoKTtcblx0XHRcdGNvbXBpbGVkUmVhZGVyID0gY3VycmVudERlY29kZXIua2V5TWFwID8gbmV3IEZ1bmN0aW9uKFwiclwiLCBcInJldHVybiB7XCIgKyBhcnJheS5tYXAoKGspID0+IGN1cnJlbnREZWNvZGVyLmRlY29kZUtleShrKSkubWFwKChrKSA9PiB2YWxpZE5hbWUudGVzdChrKSA/IHNhZmVLZXkoaykgKyBcIjpyKClcIiA6IFwiW1wiICsgSlNPTi5zdHJpbmdpZnkoaykgKyBcIl06cigpXCIpLmpvaW4oXCIsXCIpICsgXCJ9XCIpIDogbmV3IEZ1bmN0aW9uKFwiclwiLCBcInJldHVybiB7XCIgKyBhcnJheS5tYXAoKGtleSkgPT4gdmFsaWROYW1lLnRlc3Qoa2V5KSA/IHNhZmVLZXkoa2V5KSArIFwiOnIoKVwiIDogXCJbXCIgKyBKU09OLnN0cmluZ2lmeShrZXkpICsgXCJdOnIoKVwiKS5qb2luKFwiLFwiKSArIFwifVwiKTtcblx0XHRcdGlmICh0aGlzLmNvbXBpbGVkUmVhZGVyKSBjb21waWxlZFJlYWRlci5uZXh0ID0gdGhpcy5jb21waWxlZFJlYWRlcjtcblx0XHRcdGNvbXBpbGVkUmVhZGVyLnByb3BlcnR5Q291bnQgPSBsZW5ndGg7XG5cdFx0XHR0aGlzLmNvbXBpbGVkUmVhZGVyID0gY29tcGlsZWRSZWFkZXI7XG5cdFx0XHRyZXR1cm4gY29tcGlsZWRSZWFkZXIocmVhZCk7XG5cdFx0fVxuXHRcdGxldCBvYmplY3QgPSB7fTtcblx0XHRpZiAoY3VycmVudERlY29kZXIua2V5TWFwKSBmb3IgKGxldCBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSBvYmplY3Rbc2FmZUtleShjdXJyZW50RGVjb2Rlci5kZWNvZGVLZXkodGhpc1tpXSkpXSA9IHJlYWQoKTtcblx0XHRlbHNlIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIG9iamVjdFtzYWZlS2V5KHRoaXNbaV0pXSA9IHJlYWQoKTtcblx0XHRyZXR1cm4gb2JqZWN0O1xuXHR9XG5cdHN0cnVjdHVyZS5zbG93UmVhZHMgPSAwO1xuXHRyZXR1cm4gcmVhZE9iamVjdDtcbn1cbmZ1bmN0aW9uIHNhZmVLZXkoa2V5KSB7XG5cdGlmICh0eXBlb2Yga2V5ID09PSBcInN0cmluZ1wiKSByZXR1cm4ga2V5ID09PSBcIl9fcHJvdG9fX1wiID8gXCJfX3Byb3RvX1wiIDoga2V5O1xuXHRpZiAodHlwZW9mIGtleSA9PT0gXCJudW1iZXJcIiB8fCB0eXBlb2Yga2V5ID09PSBcImJvb2xlYW5cIiB8fCB0eXBlb2Yga2V5ID09PSBcImJpZ2ludFwiKSByZXR1cm4ga2V5LnRvU3RyaW5nKCk7XG5cdGlmIChrZXkgPT0gbnVsbCkgcmV0dXJuIGtleSArIFwiXCI7XG5cdHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgcHJvcGVydHkgbmFtZSB0eXBlIFwiICsgdHlwZW9mIGtleSk7XG59XG52YXIgcmVhZEZpeGVkU3RyaW5nID0gcmVhZFN0cmluZ0pTO1xuZnVuY3Rpb24gcmVhZFN0cmluZ0pTKGxlbmd0aCkge1xuXHRsZXQgcmVzdWx0O1xuXHRpZiAobGVuZ3RoIDwgMTYpIHtcblx0XHRpZiAocmVzdWx0ID0gc2hvcnRTdHJpbmdJbkpTKGxlbmd0aCkpIHJldHVybiByZXN1bHQ7XG5cdH1cblx0aWYgKGxlbmd0aCA+IDY0ICYmIGRlY29kZXIpIHJldHVybiBkZWNvZGVyLmRlY29kZShzcmMuc3ViYXJyYXkocG9zaXRpb24kMSwgcG9zaXRpb24kMSArPSBsZW5ndGgpKTtcblx0Y29uc3QgZW5kID0gcG9zaXRpb24kMSArIGxlbmd0aDtcblx0Y29uc3QgdW5pdHMgPSBbXTtcblx0cmVzdWx0ID0gXCJcIjtcblx0d2hpbGUgKHBvc2l0aW9uJDEgPCBlbmQpIHtcblx0XHRjb25zdCBieXRlMSA9IHNyY1twb3NpdGlvbiQxKytdO1xuXHRcdGlmICgoYnl0ZTEgJiAxMjgpID09PSAwKSB1bml0cy5wdXNoKGJ5dGUxKTtcblx0XHRlbHNlIGlmICgoYnl0ZTEgJiAyMjQpID09PSAxOTIpIHtcblx0XHRcdGlmIChieXRlMSA8IDE5NCB8fCBwb3NpdGlvbiQxID49IGVuZCB8fCAoc3JjW3Bvc2l0aW9uJDFdICYgMTkyKSAhPT0gMTI4KSB1bml0cy5wdXNoKDY1NTMzKTtcblx0XHRcdGVsc2Uge1xuXHRcdFx0XHRjb25zdCBieXRlMiA9IHNyY1twb3NpdGlvbiQxKytdICYgNjM7XG5cdFx0XHRcdHVuaXRzLnB1c2goKGJ5dGUxICYgMzEpIDw8IDYgfCBieXRlMik7XG5cdFx0XHR9XG5cdFx0fSBlbHNlIGlmICgoYnl0ZTEgJiAyNDApID09PSAyMjQpIHtcblx0XHRcdGNvbnN0IGJ5dGUyID0gcG9zaXRpb24kMSA8IGVuZCA/IHNyY1twb3NpdGlvbiQxXSA6IDA7XG5cdFx0XHRpZiAocG9zaXRpb24kMSA+PSBlbmQgfHwgKGJ5dGUyICYgMTkyKSAhPT0gMTI4IHx8IGJ5dGUxID09PSAyMjQgJiYgYnl0ZTIgPCAxNjAgfHwgYnl0ZTEgPT09IDIzNyAmJiBieXRlMiA+PSAxNjApIHVuaXRzLnB1c2goNjU1MzMpO1xuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdHBvc2l0aW9uJDErKztcblx0XHRcdFx0aWYgKHBvc2l0aW9uJDEgPj0gZW5kIHx8IChzcmNbcG9zaXRpb24kMV0gJiAxOTIpICE9PSAxMjgpIHVuaXRzLnB1c2goNjU1MzMpO1xuXHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRjb25zdCBieXRlMyA9IHNyY1twb3NpdGlvbiQxKytdICYgNjM7XG5cdFx0XHRcdFx0dW5pdHMucHVzaCgoYnl0ZTEgJiAzMSkgPDwgMTIgfCAoYnl0ZTIgJiA2MykgPDwgNiB8IGJ5dGUzKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0gZWxzZSBpZiAoKGJ5dGUxICYgMjQ4KSA9PT0gMjQwKSB7XG5cdFx0XHRjb25zdCBieXRlMiA9IHBvc2l0aW9uJDEgPCBlbmQgPyBzcmNbcG9zaXRpb24kMV0gOiAwO1xuXHRcdFx0aWYgKGJ5dGUxID4gMjQ0IHx8IHBvc2l0aW9uJDEgPj0gZW5kIHx8IChieXRlMiAmIDE5MikgIT09IDEyOCB8fCBieXRlMSA9PT0gMjQwICYmIGJ5dGUyIDwgMTQ0IHx8IGJ5dGUxID09PSAyNDQgJiYgYnl0ZTIgPj0gMTQ0KSB1bml0cy5wdXNoKDY1NTMzKTtcblx0XHRcdGVsc2Uge1xuXHRcdFx0XHRwb3NpdGlvbiQxKys7XG5cdFx0XHRcdGlmIChwb3NpdGlvbiQxID49IGVuZCB8fCAoc3JjW3Bvc2l0aW9uJDFdICYgMTkyKSAhPT0gMTI4KSB1bml0cy5wdXNoKDY1NTMzKTtcblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0Y29uc3QgYnl0ZTMgPSBzcmNbcG9zaXRpb24kMSsrXSAmIDYzO1xuXHRcdFx0XHRcdGlmIChwb3NpdGlvbiQxID49IGVuZCB8fCAoc3JjW3Bvc2l0aW9uJDFdICYgMTkyKSAhPT0gMTI4KSB1bml0cy5wdXNoKDY1NTMzKTtcblx0XHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRcdGNvbnN0IGJ5dGU0ID0gc3JjW3Bvc2l0aW9uJDErK10gJiA2Mztcblx0XHRcdFx0XHRcdGxldCB1bml0ID0gKGJ5dGUxICYgNykgPDwgMTggfCAoYnl0ZTIgJiA2MykgPDwgMTIgfCBieXRlMyA8PCA2IHwgYnl0ZTQ7XG5cdFx0XHRcdFx0XHR1bml0IC09IDY1NTM2O1xuXHRcdFx0XHRcdFx0dW5pdHMucHVzaCh1bml0ID4+PiAxMCAmIDEwMjMgfCA1NTI5Nik7XG5cdFx0XHRcdFx0XHR1bml0cy5wdXNoKDU2MzIwIHwgdW5pdCAmIDEwMjMpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0gZWxzZSB1bml0cy5wdXNoKDY1NTMzKTtcblx0XHRpZiAodW5pdHMubGVuZ3RoID49IDQwOTYpIHtcblx0XHRcdHJlc3VsdCArPSBmcm9tQ2hhckNvZGUuYXBwbHkoU3RyaW5nLCB1bml0cyk7XG5cdFx0XHR1bml0cy5sZW5ndGggPSAwO1xuXHRcdH1cblx0fVxuXHRpZiAodW5pdHMubGVuZ3RoID4gMCkgcmVzdWx0ICs9IGZyb21DaGFyQ29kZS5hcHBseShTdHJpbmcsIHVuaXRzKTtcblx0cmV0dXJuIHJlc3VsdDtcbn1cbnZhciBmcm9tQ2hhckNvZGUgPSBTdHJpbmcuZnJvbUNoYXJDb2RlO1xuZnVuY3Rpb24gbG9uZ1N0cmluZ0luSlMobGVuZ3RoKSB7XG5cdGxldCBzdGFydCA9IHBvc2l0aW9uJDE7XG5cdGxldCBieXRlcyA9IG5ldyBBcnJheShsZW5ndGgpO1xuXHRmb3IgKGxldCBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG5cdFx0Y29uc3QgYnl0ZSA9IHNyY1twb3NpdGlvbiQxKytdO1xuXHRcdGlmICgoYnl0ZSAmIDEyOCkgPiAwKSB7XG5cdFx0XHRwb3NpdGlvbiQxID0gc3RhcnQ7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdGJ5dGVzW2ldID0gYnl0ZTtcblx0fVxuXHRyZXR1cm4gZnJvbUNoYXJDb2RlLmFwcGx5KFN0cmluZywgYnl0ZXMpO1xufVxuZnVuY3Rpb24gc2hvcnRTdHJpbmdJbkpTKGxlbmd0aCkge1xuXHRpZiAobGVuZ3RoIDwgNCkge1xuXHRcdGlmIChsZW5ndGggPCAyKSB7XG5cdFx0XHRpZiAobGVuZ3RoID09PSAwKSByZXR1cm4gXCJcIjtcblx0XHRcdGVsc2Uge1xuXHRcdFx0XHRsZXQgYSA9IHNyY1twb3NpdGlvbiQxKytdO1xuXHRcdFx0XHRpZiAoKGEgJiAxMjgpID4gMSkge1xuXHRcdFx0XHRcdHBvc2l0aW9uJDEgLT0gMTtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIGZyb21DaGFyQ29kZShhKTtcblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0bGV0IGEgPSBzcmNbcG9zaXRpb24kMSsrXTtcblx0XHRcdGxldCBiID0gc3JjW3Bvc2l0aW9uJDErK107XG5cdFx0XHRpZiAoKGEgJiAxMjgpID4gMCB8fCAoYiAmIDEyOCkgPiAwKSB7XG5cdFx0XHRcdHBvc2l0aW9uJDEgLT0gMjtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdFx0aWYgKGxlbmd0aCA8IDMpIHJldHVybiBmcm9tQ2hhckNvZGUoYSwgYik7XG5cdFx0XHRsZXQgYyA9IHNyY1twb3NpdGlvbiQxKytdO1xuXHRcdFx0aWYgKChjICYgMTI4KSA+IDApIHtcblx0XHRcdFx0cG9zaXRpb24kMSAtPSAzO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gZnJvbUNoYXJDb2RlKGEsIGIsIGMpO1xuXHRcdH1cblx0fSBlbHNlIHtcblx0XHRsZXQgYSA9IHNyY1twb3NpdGlvbiQxKytdO1xuXHRcdGxldCBiID0gc3JjW3Bvc2l0aW9uJDErK107XG5cdFx0bGV0IGMgPSBzcmNbcG9zaXRpb24kMSsrXTtcblx0XHRsZXQgZCA9IHNyY1twb3NpdGlvbiQxKytdO1xuXHRcdGlmICgoYSAmIDEyOCkgPiAwIHx8IChiICYgMTI4KSA+IDAgfHwgKGMgJiAxMjgpID4gMCB8fCAoZCAmIDEyOCkgPiAwKSB7XG5cdFx0XHRwb3NpdGlvbiQxIC09IDQ7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdGlmIChsZW5ndGggPCA2KSB7XG5cdFx0XHRpZiAobGVuZ3RoID09PSA0KSByZXR1cm4gZnJvbUNoYXJDb2RlKGEsIGIsIGMsIGQpO1xuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdGxldCBlID0gc3JjW3Bvc2l0aW9uJDErK107XG5cdFx0XHRcdGlmICgoZSAmIDEyOCkgPiAwKSB7XG5cdFx0XHRcdFx0cG9zaXRpb24kMSAtPSA1O1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4gZnJvbUNoYXJDb2RlKGEsIGIsIGMsIGQsIGUpO1xuXHRcdFx0fVxuXHRcdH0gZWxzZSBpZiAobGVuZ3RoIDwgOCkge1xuXHRcdFx0bGV0IGUgPSBzcmNbcG9zaXRpb24kMSsrXTtcblx0XHRcdGxldCBmID0gc3JjW3Bvc2l0aW9uJDErK107XG5cdFx0XHRpZiAoKGUgJiAxMjgpID4gMCB8fCAoZiAmIDEyOCkgPiAwKSB7XG5cdFx0XHRcdHBvc2l0aW9uJDEgLT0gNjtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdFx0aWYgKGxlbmd0aCA8IDcpIHJldHVybiBmcm9tQ2hhckNvZGUoYSwgYiwgYywgZCwgZSwgZik7XG5cdFx0XHRsZXQgZyA9IHNyY1twb3NpdGlvbiQxKytdO1xuXHRcdFx0aWYgKChnICYgMTI4KSA+IDApIHtcblx0XHRcdFx0cG9zaXRpb24kMSAtPSA3O1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gZnJvbUNoYXJDb2RlKGEsIGIsIGMsIGQsIGUsIGYsIGcpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRsZXQgZSA9IHNyY1twb3NpdGlvbiQxKytdO1xuXHRcdFx0bGV0IGYgPSBzcmNbcG9zaXRpb24kMSsrXTtcblx0XHRcdGxldCBnID0gc3JjW3Bvc2l0aW9uJDErK107XG5cdFx0XHRsZXQgaCA9IHNyY1twb3NpdGlvbiQxKytdO1xuXHRcdFx0aWYgKChlICYgMTI4KSA+IDAgfHwgKGYgJiAxMjgpID4gMCB8fCAoZyAmIDEyOCkgPiAwIHx8IChoICYgMTI4KSA+IDApIHtcblx0XHRcdFx0cG9zaXRpb24kMSAtPSA4O1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0XHRpZiAobGVuZ3RoIDwgMTApIHtcblx0XHRcdFx0aWYgKGxlbmd0aCA9PT0gOCkgcmV0dXJuIGZyb21DaGFyQ29kZShhLCBiLCBjLCBkLCBlLCBmLCBnLCBoKTtcblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0bGV0IGkgPSBzcmNbcG9zaXRpb24kMSsrXTtcblx0XHRcdFx0XHRpZiAoKGkgJiAxMjgpID4gMCkge1xuXHRcdFx0XHRcdFx0cG9zaXRpb24kMSAtPSA5O1xuXHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRyZXR1cm4gZnJvbUNoYXJDb2RlKGEsIGIsIGMsIGQsIGUsIGYsIGcsIGgsIGkpO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2UgaWYgKGxlbmd0aCA8IDEyKSB7XG5cdFx0XHRcdGxldCBpID0gc3JjW3Bvc2l0aW9uJDErK107XG5cdFx0XHRcdGxldCBqID0gc3JjW3Bvc2l0aW9uJDErK107XG5cdFx0XHRcdGlmICgoaSAmIDEyOCkgPiAwIHx8IChqICYgMTI4KSA+IDApIHtcblx0XHRcdFx0XHRwb3NpdGlvbiQxIC09IDEwO1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAobGVuZ3RoIDwgMTEpIHJldHVybiBmcm9tQ2hhckNvZGUoYSwgYiwgYywgZCwgZSwgZiwgZywgaCwgaSwgaik7XG5cdFx0XHRcdGxldCBrID0gc3JjW3Bvc2l0aW9uJDErK107XG5cdFx0XHRcdGlmICgoayAmIDEyOCkgPiAwKSB7XG5cdFx0XHRcdFx0cG9zaXRpb24kMSAtPSAxMTtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIGZyb21DaGFyQ29kZShhLCBiLCBjLCBkLCBlLCBmLCBnLCBoLCBpLCBqLCBrKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGxldCBpID0gc3JjW3Bvc2l0aW9uJDErK107XG5cdFx0XHRcdGxldCBqID0gc3JjW3Bvc2l0aW9uJDErK107XG5cdFx0XHRcdGxldCBrID0gc3JjW3Bvc2l0aW9uJDErK107XG5cdFx0XHRcdGxldCBsID0gc3JjW3Bvc2l0aW9uJDErK107XG5cdFx0XHRcdGlmICgoaSAmIDEyOCkgPiAwIHx8IChqICYgMTI4KSA+IDAgfHwgKGsgJiAxMjgpID4gMCB8fCAobCAmIDEyOCkgPiAwKSB7XG5cdFx0XHRcdFx0cG9zaXRpb24kMSAtPSAxMjtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKGxlbmd0aCA8IDE0KSB7XG5cdFx0XHRcdFx0aWYgKGxlbmd0aCA9PT0gMTIpIHJldHVybiBmcm9tQ2hhckNvZGUoYSwgYiwgYywgZCwgZSwgZiwgZywgaCwgaSwgaiwgaywgbCk7XG5cdFx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0XHRsZXQgbSA9IHNyY1twb3NpdGlvbiQxKytdO1xuXHRcdFx0XHRcdFx0aWYgKChtICYgMTI4KSA+IDApIHtcblx0XHRcdFx0XHRcdFx0cG9zaXRpb24kMSAtPSAxMztcblx0XHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0cmV0dXJuIGZyb21DaGFyQ29kZShhLCBiLCBjLCBkLCBlLCBmLCBnLCBoLCBpLCBqLCBrLCBsLCBtKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0bGV0IG0gPSBzcmNbcG9zaXRpb24kMSsrXTtcblx0XHRcdFx0XHRsZXQgbiA9IHNyY1twb3NpdGlvbiQxKytdO1xuXHRcdFx0XHRcdGlmICgobSAmIDEyOCkgPiAwIHx8IChuICYgMTI4KSA+IDApIHtcblx0XHRcdFx0XHRcdHBvc2l0aW9uJDEgLT0gMTQ7XG5cdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmIChsZW5ndGggPCAxNSkgcmV0dXJuIGZyb21DaGFyQ29kZShhLCBiLCBjLCBkLCBlLCBmLCBnLCBoLCBpLCBqLCBrLCBsLCBtLCBuKTtcblx0XHRcdFx0XHRsZXQgbyA9IHNyY1twb3NpdGlvbiQxKytdO1xuXHRcdFx0XHRcdGlmICgobyAmIDEyOCkgPiAwKSB7XG5cdFx0XHRcdFx0XHRwb3NpdGlvbiQxIC09IDE1O1xuXHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRyZXR1cm4gZnJvbUNoYXJDb2RlKGEsIGIsIGMsIGQsIGUsIGYsIGcsIGgsIGksIGosIGssIGwsIG0sIG4sIG8pO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG59XG5mdW5jdGlvbiByZWFkQmluKGxlbmd0aCkge1xuXHRyZXR1cm4gY3VycmVudERlY29kZXIuY29weUJ1ZmZlcnMgPyBVaW50OEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKHNyYywgcG9zaXRpb24kMSwgcG9zaXRpb24kMSArPSBsZW5ndGgpIDogc3JjLnN1YmFycmF5KHBvc2l0aW9uJDEsIHBvc2l0aW9uJDEgKz0gbGVuZ3RoKTtcbn1cbnZhciBmMzJBcnJheSA9IC8qIEBfX1BVUkVfXyAqLyBuZXcgRmxvYXQzMkFycmF5KDEpO1xudmFyIHU4QXJyYXkgPSBuZXcgVWludDhBcnJheShmMzJBcnJheS5idWZmZXIsIDAsIDQpO1xuZnVuY3Rpb24gZ2V0RmxvYXQxNigpIHtcblx0bGV0IGJ5dGUwID0gc3JjW3Bvc2l0aW9uJDErK107XG5cdGxldCBieXRlMSA9IHNyY1twb3NpdGlvbiQxKytdO1xuXHRsZXQgZXhwb25lbnQgPSAoYnl0ZTAgJiAxMjcpID4+IDI7XG5cdGlmIChleHBvbmVudCA9PT0gMzEpIHtcblx0XHRpZiAoYnl0ZTEgfHwgYnl0ZTAgJiAzKSByZXR1cm4gTmFOO1xuXHRcdHJldHVybiBieXRlMCAmIDEyOCA/IC1JbmZpbml0eSA6IEluZmluaXR5O1xuXHR9XG5cdGlmIChleHBvbmVudCA9PT0gMCkge1xuXHRcdGxldCBhYnMgPSAoKGJ5dGUwICYgMykgPDwgOCB8IGJ5dGUxKSAvICgxIDw8IDI0KTtcblx0XHRyZXR1cm4gYnl0ZTAgJiAxMjggPyAtYWJzIDogYWJzO1xuXHR9XG5cdHU4QXJyYXlbM10gPSBieXRlMCAmIDEyOCB8IChleHBvbmVudCA+PiAxKSArIDU2O1xuXHR1OEFycmF5WzJdID0gKGJ5dGUwICYgNykgPDwgNSB8IGJ5dGUxID4+IDM7XG5cdHU4QXJyYXlbMV0gPSBieXRlMSA8PCA1O1xuXHR1OEFycmF5WzBdID0gMDtcblx0cmV0dXJuIGYzMkFycmF5WzBdO1xufVxubmV3IEFycmF5KDQwOTYpO1xudmFyIFRhZyA9IGNsYXNzIHtcblx0Y29uc3RydWN0b3IodmFsdWUsIHRhZykge1xuXHRcdHRoaXMudmFsdWUgPSB2YWx1ZTtcblx0XHR0aGlzLnRhZyA9IHRhZztcblx0fVxufTtcbmN1cnJlbnRFeHRlbnNpb25zWzBdID0gKGRhdGVTdHJpbmcpID0+IHtcblx0cmV0dXJuIG5ldyBEYXRlKGRhdGVTdHJpbmcpO1xufTtcbmN1cnJlbnRFeHRlbnNpb25zWzFdID0gKGVwb2NoU2VjKSA9PiB7XG5cdHJldHVybiBuZXcgRGF0ZShNYXRoLnJvdW5kKGVwb2NoU2VjICogMWUzKSk7XG59O1xuY3VycmVudEV4dGVuc2lvbnNbMl0gPSAoYnVmZmVyKSA9PiB7XG5cdGxldCB2YWx1ZSA9IEJpZ0ludCgwKTtcblx0Zm9yIChsZXQgaSA9IDAsIGwgPSBidWZmZXIuYnl0ZUxlbmd0aDsgaSA8IGw7IGkrKykgdmFsdWUgPSBCaWdJbnQoYnVmZmVyW2ldKSArICh2YWx1ZSA8PCBCaWdJbnQoOCkpO1xuXHRyZXR1cm4gdmFsdWU7XG59O1xuY3VycmVudEV4dGVuc2lvbnNbM10gPSAoYnVmZmVyKSA9PiB7XG5cdHJldHVybiBCaWdJbnQoLTEpIC0gY3VycmVudEV4dGVuc2lvbnNbMl0oYnVmZmVyKTtcbn07XG5jdXJyZW50RXh0ZW5zaW9uc1s0XSA9IChmcmFjdGlvbikgPT4ge1xuXHRyZXR1cm4gKyhmcmFjdGlvblsxXSArIFwiZVwiICsgZnJhY3Rpb25bMF0pO1xufTtcbmN1cnJlbnRFeHRlbnNpb25zWzVdID0gKGZyYWN0aW9uKSA9PiB7XG5cdHJldHVybiBmcmFjdGlvblsxXSAqIE1hdGguZXhwKGZyYWN0aW9uWzBdICogTWF0aC5sb2coMikpO1xufTtcbnZhciByZWNvcmREZWZpbml0aW9uID0gKGlkLCBzdHJ1Y3R1cmUpID0+IHtcblx0aWQgPSBpZCAtIDU3MzQ0O1xuXHRsZXQgZXhpc3RpbmdTdHJ1Y3R1cmUgPSBjdXJyZW50U3RydWN0dXJlc1tpZF07XG5cdGlmIChleGlzdGluZ1N0cnVjdHVyZSAmJiBleGlzdGluZ1N0cnVjdHVyZS5pc1NoYXJlZCkgKGN1cnJlbnRTdHJ1Y3R1cmVzLnJlc3RvcmVTdHJ1Y3R1cmVzIHx8IChjdXJyZW50U3RydWN0dXJlcy5yZXN0b3JlU3RydWN0dXJlcyA9IFtdKSlbaWRdID0gZXhpc3RpbmdTdHJ1Y3R1cmU7XG5cdGN1cnJlbnRTdHJ1Y3R1cmVzW2lkXSA9IHN0cnVjdHVyZTtcblx0c3RydWN0dXJlLnJlYWQgPSBjcmVhdGVTdHJ1Y3R1cmVSZWFkZXIoc3RydWN0dXJlKTtcbn07XG5jdXJyZW50RXh0ZW5zaW9uc1tMRUdBQ1lfUkVDT1JEX0lOTElORV9JRF0gPSAoZGF0YSkgPT4ge1xuXHRsZXQgbGVuZ3RoID0gZGF0YS5sZW5ndGg7XG5cdGxldCBzdHJ1Y3R1cmUgPSBkYXRhWzFdO1xuXHRyZWNvcmREZWZpbml0aW9uKGRhdGFbMF0sIHN0cnVjdHVyZSk7XG5cdGxldCBvYmplY3QgPSB7fTtcblx0Zm9yIChsZXQgaSA9IDI7IGkgPCBsZW5ndGg7IGkrKykge1xuXHRcdGxldCBrZXkgPSBzdHJ1Y3R1cmVbaSAtIDJdO1xuXHRcdG9iamVjdFtzYWZlS2V5KGtleSldID0gZGF0YVtpXTtcblx0fVxuXHRyZXR1cm4gb2JqZWN0O1xufTtcbmN1cnJlbnRFeHRlbnNpb25zWzE0XSA9ICh2YWx1ZSkgPT4ge1xuXHRpZiAoYnVuZGxlZFN0cmluZ3MkMSkgcmV0dXJuIGJ1bmRsZWRTdHJpbmdzJDFbMF0uc2xpY2UoYnVuZGxlZFN0cmluZ3MkMS5wb3NpdGlvbjAsIGJ1bmRsZWRTdHJpbmdzJDEucG9zaXRpb24wICs9IHZhbHVlKTtcblx0cmV0dXJuIG5ldyBUYWcodmFsdWUsIDE0KTtcbn07XG5jdXJyZW50RXh0ZW5zaW9uc1sxNV0gPSAodmFsdWUpID0+IHtcblx0aWYgKGJ1bmRsZWRTdHJpbmdzJDEpIHJldHVybiBidW5kbGVkU3RyaW5ncyQxWzFdLnNsaWNlKGJ1bmRsZWRTdHJpbmdzJDEucG9zaXRpb24xLCBidW5kbGVkU3RyaW5ncyQxLnBvc2l0aW9uMSArPSB2YWx1ZSk7XG5cdHJldHVybiBuZXcgVGFnKHZhbHVlLCAxNSk7XG59O1xudmFyIGdsYmwgPSB7XG5cdEVycm9yLFxuXHRSZWdFeHBcbn07XG5jdXJyZW50RXh0ZW5zaW9uc1syN10gPSAoZGF0YSkgPT4ge1xuXHRyZXR1cm4gKGdsYmxbZGF0YVswXV0gfHwgRXJyb3IpKGRhdGFbMV0sIGRhdGFbMl0pO1xufTtcbnZhciBwYWNrZWRUYWJsZSA9IChyZWFkKSA9PiB7XG5cdGlmIChzcmNbcG9zaXRpb24kMSsrXSAhPSAxMzIpIHtcblx0XHRsZXQgZXJyb3IgPSAvKiBAX19QVVJFX18gKi8gbmV3IEVycm9yKFwiUGFja2VkIHZhbHVlcyBzdHJ1Y3R1cmUgbXVzdCBiZSBmb2xsb3dlZCBieSBhIDQgZWxlbWVudCBhcnJheVwiKTtcblx0XHRpZiAoc3JjLmxlbmd0aCA8IHBvc2l0aW9uJDEpIGVycm9yLmluY29tcGxldGUgPSB0cnVlO1xuXHRcdHRocm93IGVycm9yO1xuXHR9XG5cdGxldCBuZXdQYWNrZWRWYWx1ZXMgPSByZWFkKCk7XG5cdGlmICghbmV3UGFja2VkVmFsdWVzIHx8ICFuZXdQYWNrZWRWYWx1ZXMubGVuZ3RoKSB7XG5cdFx0bGV0IGVycm9yID0gLyogQF9fUFVSRV9fICovIG5ldyBFcnJvcihcIlBhY2tlZCB2YWx1ZXMgc3RydWN0dXJlIG11c3QgYmUgZm9sbG93ZWQgYnkgYSA0IGVsZW1lbnQgYXJyYXlcIik7XG5cdFx0ZXJyb3IuaW5jb21wbGV0ZSA9IHRydWU7XG5cdFx0dGhyb3cgZXJyb3I7XG5cdH1cblx0cGFja2VkVmFsdWVzID0gcGFja2VkVmFsdWVzID8gbmV3UGFja2VkVmFsdWVzLmNvbmNhdChwYWNrZWRWYWx1ZXMuc2xpY2UobmV3UGFja2VkVmFsdWVzLmxlbmd0aCkpIDogbmV3UGFja2VkVmFsdWVzO1xuXHRwYWNrZWRWYWx1ZXMucHJlZml4ZXMgPSByZWFkKCk7XG5cdHBhY2tlZFZhbHVlcy5zdWZmaXhlcyA9IHJlYWQoKTtcblx0cmV0dXJuIHJlYWQoKTtcbn07XG5wYWNrZWRUYWJsZS5oYW5kbGVzUmVhZCA9IHRydWU7XG5jdXJyZW50RXh0ZW5zaW9uc1s1MV0gPSBwYWNrZWRUYWJsZTtcbmN1cnJlbnRFeHRlbnNpb25zW1BBQ0tFRF9SRUZFUkVOQ0VfVEFHX0lEXSA9IChkYXRhKSA9PiB7XG5cdGlmICghcGFja2VkVmFsdWVzKSB7XG5cdFx0aWYgKGN1cnJlbnREZWNvZGVyLmdldFNoYXJlZCkgbG9hZFNoYXJlZCgpO1xuXHRcdGVsc2UgcmV0dXJuIG5ldyBUYWcoZGF0YSwgUEFDS0VEX1JFRkVSRU5DRV9UQUdfSUQpO1xuXHR9XG5cdGlmICh0eXBlb2YgZGF0YSA9PSBcIm51bWJlclwiKSByZXR1cm4gcGFja2VkVmFsdWVzWzE2ICsgKGRhdGEgPj0gMCA/IDIgKiBkYXRhIDogLTIgKiBkYXRhIC0gMSldO1xuXHRsZXQgZXJyb3IgPSAvKiBAX19QVVJFX18gKi8gbmV3IEVycm9yKFwiTm8gc3VwcG9ydCBmb3Igbm9uLWludGVnZXIgcGFja2VkIHJlZmVyZW5jZXMgeWV0XCIpO1xuXHRpZiAoZGF0YSA9PT0gdm9pZCAwKSBlcnJvci5pbmNvbXBsZXRlID0gdHJ1ZTtcblx0dGhyb3cgZXJyb3I7XG59O1xuY3VycmVudEV4dGVuc2lvbnNbMjhdID0gKHJlYWQpID0+IHtcblx0aWYgKCFyZWZlcmVuY2VNYXApIHtcblx0XHRyZWZlcmVuY2VNYXAgPSAvKiBAX19QVVJFX18gKi8gbmV3IE1hcCgpO1xuXHRcdHJlZmVyZW5jZU1hcC5pZCA9IDA7XG5cdH1cblx0bGV0IGlkID0gcmVmZXJlbmNlTWFwLmlkKys7XG5cdGxldCBzdGFydGluZ1Bvc2l0aW9uID0gcG9zaXRpb24kMTtcblx0bGV0IHRva2VuID0gc3JjW3Bvc2l0aW9uJDFdO1xuXHRsZXQgdGFyZ2V0O1xuXHRpZiAodG9rZW4gPj4gNSA9PSA0KSB0YXJnZXQgPSBbXTtcblx0ZWxzZSB0YXJnZXQgPSB7fTtcblx0bGV0IHJlZkVudHJ5ID0geyB0YXJnZXQgfTtcblx0cmVmZXJlbmNlTWFwLnNldChpZCwgcmVmRW50cnkpO1xuXHRsZXQgdGFyZ2V0UHJvcGVydGllcyA9IHJlYWQoKTtcblx0aWYgKHJlZkVudHJ5LnVzZWQpIHtcblx0XHRpZiAoT2JqZWN0LmdldFByb3RvdHlwZU9mKHRhcmdldCkgIT09IE9iamVjdC5nZXRQcm90b3R5cGVPZih0YXJnZXRQcm9wZXJ0aWVzKSkge1xuXHRcdFx0cG9zaXRpb24kMSA9IHN0YXJ0aW5nUG9zaXRpb247XG5cdFx0XHR0YXJnZXQgPSB0YXJnZXRQcm9wZXJ0aWVzO1xuXHRcdFx0cmVmZXJlbmNlTWFwLnNldChpZCwgeyB0YXJnZXQgfSk7XG5cdFx0XHR0YXJnZXRQcm9wZXJ0aWVzID0gcmVhZCgpO1xuXHRcdH1cblx0XHRyZXR1cm4gT2JqZWN0LmFzc2lnbih0YXJnZXQsIHRhcmdldFByb3BlcnRpZXMpO1xuXHR9XG5cdHJlZkVudHJ5LnRhcmdldCA9IHRhcmdldFByb3BlcnRpZXM7XG5cdHJldHVybiB0YXJnZXRQcm9wZXJ0aWVzO1xufTtcbmN1cnJlbnRFeHRlbnNpb25zWzI4XS5oYW5kbGVzUmVhZCA9IHRydWU7XG5jdXJyZW50RXh0ZW5zaW9uc1syOV0gPSAoaWQpID0+IHtcblx0bGV0IHJlZkVudHJ5ID0gcmVmZXJlbmNlTWFwLmdldChpZCk7XG5cdHJlZkVudHJ5LnVzZWQgPSB0cnVlO1xuXHRyZXR1cm4gcmVmRW50cnkudGFyZ2V0O1xufTtcbmN1cnJlbnRFeHRlbnNpb25zWzI1OF0gPSAoYXJyYXkpID0+IG5ldyBTZXQoYXJyYXkpO1xuKGN1cnJlbnRFeHRlbnNpb25zWzI1OV0gPSAocmVhZCkgPT4ge1xuXHRpZiAoY3VycmVudERlY29kZXIubWFwc0FzT2JqZWN0cykge1xuXHRcdGN1cnJlbnREZWNvZGVyLm1hcHNBc09iamVjdHMgPSBmYWxzZTtcblx0XHRyZXN0b3JlTWFwc0FzT2JqZWN0ID0gdHJ1ZTtcblx0fVxuXHRyZXR1cm4gcmVhZCgpO1xufSkuaGFuZGxlc1JlYWQgPSB0cnVlO1xuZnVuY3Rpb24gY29tYmluZShhLCBiKSB7XG5cdGlmICh0eXBlb2YgYSA9PT0gXCJzdHJpbmdcIikgcmV0dXJuIGEgKyBiO1xuXHRpZiAoYSBpbnN0YW5jZW9mIEFycmF5KSByZXR1cm4gYS5jb25jYXQoYik7XG5cdHJldHVybiBPYmplY3QuYXNzaWduKHt9LCBhLCBiKTtcbn1cbmZ1bmN0aW9uIGdldFBhY2tlZFZhbHVlcygpIHtcblx0aWYgKCFwYWNrZWRWYWx1ZXMpIHtcblx0XHRpZiAoY3VycmVudERlY29kZXIuZ2V0U2hhcmVkKSBsb2FkU2hhcmVkKCk7XG5cdFx0ZWxzZSB0aHJvdyBuZXcgRXJyb3IoXCJObyBwYWNrZWQgdmFsdWVzIGF2YWlsYWJsZVwiKTtcblx0fVxuXHRyZXR1cm4gcGFja2VkVmFsdWVzO1xufVxudmFyIFNIQVJFRF9EQVRBX1RBR19JRCA9IDEzOTkzNTM5NTY7XG5jdXJyZW50RXh0ZW5zaW9uUmFuZ2VzLnB1c2goKHRhZywgaW5wdXQpID0+IHtcblx0aWYgKHRhZyA+PSAyMjUgJiYgdGFnIDw9IDI1NSkgcmV0dXJuIGNvbWJpbmUoZ2V0UGFja2VkVmFsdWVzKCkucHJlZml4ZXNbdGFnIC0gMjI0XSwgaW5wdXQpO1xuXHRpZiAodGFnID49IDI4NzA0ICYmIHRhZyA8PSAzMjc2NykgcmV0dXJuIGNvbWJpbmUoZ2V0UGFja2VkVmFsdWVzKCkucHJlZml4ZXNbdGFnIC0gMjg2NzJdLCBpbnB1dCk7XG5cdGlmICh0YWcgPj0gMTg3OTA1MjI4OCAmJiB0YWcgPD0gMjE0NzQ4MzY0NykgcmV0dXJuIGNvbWJpbmUoZ2V0UGFja2VkVmFsdWVzKCkucHJlZml4ZXNbdGFnIC0gMTg3OTA0ODE5Ml0sIGlucHV0KTtcblx0aWYgKHRhZyA+PSAyMTYgJiYgdGFnIDw9IDIyMykgcmV0dXJuIGNvbWJpbmUoaW5wdXQsIGdldFBhY2tlZFZhbHVlcygpLnN1ZmZpeGVzW3RhZyAtIDIxNl0pO1xuXHRpZiAodGFnID49IDI3NjQ3ICYmIHRhZyA8PSAyODY3MSkgcmV0dXJuIGNvbWJpbmUoaW5wdXQsIGdldFBhY2tlZFZhbHVlcygpLnN1ZmZpeGVzW3RhZyAtIDI3NjM5XSk7XG5cdGlmICh0YWcgPj0gMTgxMTk0MDM1MiAmJiB0YWcgPD0gMTg3OTA0ODE5MSkgcmV0dXJuIGNvbWJpbmUoaW5wdXQsIGdldFBhY2tlZFZhbHVlcygpLnN1ZmZpeGVzW3RhZyAtIDE4MTE5MzkzMjhdKTtcblx0aWYgKHRhZyA9PSBTSEFSRURfREFUQV9UQUdfSUQpIHJldHVybiB7XG5cdFx0cGFja2VkVmFsdWVzLFxuXHRcdHN0cnVjdHVyZXM6IGN1cnJlbnRTdHJ1Y3R1cmVzLnNsaWNlKDApLFxuXHRcdHZlcnNpb246IGlucHV0XG5cdH07XG5cdGlmICh0YWcgPT0gNTU3OTkpIHJldHVybiBpbnB1dDtcbn0pO1xudmFyIGlzTGl0dGxlRW5kaWFuTWFjaGluZSQxID0gbmV3IFVpbnQ4QXJyYXkobmV3IFVpbnQxNkFycmF5KFsxXSkuYnVmZmVyKVswXSA9PSAxO1xudmFyIHR5cGVkQXJyYXlzID0gW1xuXHRVaW50OEFycmF5LFxuXHRVaW50OENsYW1wZWRBcnJheSxcblx0VWludDE2QXJyYXksXG5cdFVpbnQzMkFycmF5LFxuXHR0eXBlb2YgQmlnVWludDY0QXJyYXkgPT0gXCJ1bmRlZmluZWRcIiA/IHsgbmFtZTogXCJCaWdVaW50NjRBcnJheVwiIH0gOiBCaWdVaW50NjRBcnJheSxcblx0SW50OEFycmF5LFxuXHRJbnQxNkFycmF5LFxuXHRJbnQzMkFycmF5LFxuXHR0eXBlb2YgQmlnSW50NjRBcnJheSA9PSBcInVuZGVmaW5lZFwiID8geyBuYW1lOiBcIkJpZ0ludDY0QXJyYXlcIiB9IDogQmlnSW50NjRBcnJheSxcblx0RmxvYXQzMkFycmF5LFxuXHRGbG9hdDY0QXJyYXlcbl07XG52YXIgdHlwZWRBcnJheVRhZ3MgPSBbXG5cdDY0LFxuXHQ2OCxcblx0NjksXG5cdDcwLFxuXHQ3MSxcblx0NzIsXG5cdDc3LFxuXHQ3OCxcblx0NzksXG5cdDg1LFxuXHQ4NlxuXTtcbmZvciAobGV0IGkgPSAwOyBpIDwgdHlwZWRBcnJheXMubGVuZ3RoOyBpKyspIHJlZ2lzdGVyVHlwZWRBcnJheSh0eXBlZEFycmF5c1tpXSwgdHlwZWRBcnJheVRhZ3NbaV0pO1xuZnVuY3Rpb24gcmVnaXN0ZXJUeXBlZEFycmF5KFR5cGVkQXJyYXksIHRhZykge1xuXHRsZXQgZHZNZXRob2QgPSBcImdldFwiICsgVHlwZWRBcnJheS5uYW1lLnNsaWNlKDAsIC01KTtcblx0bGV0IGJ5dGVzUGVyRWxlbWVudDtcblx0aWYgKHR5cGVvZiBUeXBlZEFycmF5ID09PSBcImZ1bmN0aW9uXCIpIGJ5dGVzUGVyRWxlbWVudCA9IFR5cGVkQXJyYXkuQllURVNfUEVSX0VMRU1FTlQ7XG5cdGVsc2UgVHlwZWRBcnJheSA9IG51bGw7XG5cdGZvciAobGV0IGxpdHRsZUVuZGlhbiA9IDA7IGxpdHRsZUVuZGlhbiA8IDI7IGxpdHRsZUVuZGlhbisrKSB7XG5cdFx0aWYgKCFsaXR0bGVFbmRpYW4gJiYgYnl0ZXNQZXJFbGVtZW50ID09IDEpIGNvbnRpbnVlO1xuXHRcdGxldCBzaXplU2hpZnQgPSBieXRlc1BlckVsZW1lbnQgPT0gMiA/IDEgOiBieXRlc1BlckVsZW1lbnQgPT0gNCA/IDIgOiBieXRlc1BlckVsZW1lbnQgPT0gOCA/IDMgOiAwO1xuXHRcdGN1cnJlbnRFeHRlbnNpb25zW2xpdHRsZUVuZGlhbiA/IHRhZyA6IHRhZyAtIDRdID0gYnl0ZXNQZXJFbGVtZW50ID09IDEgfHwgbGl0dGxlRW5kaWFuID09IGlzTGl0dGxlRW5kaWFuTWFjaGluZSQxID8gKGJ1ZmZlcikgPT4ge1xuXHRcdFx0aWYgKCFUeXBlZEFycmF5KSB0aHJvdyBuZXcgRXJyb3IoXCJDb3VsZCBub3QgZmluZCB0eXBlZCBhcnJheSBmb3IgY29kZSBcIiArIHRhZyk7XG5cdFx0XHRpZiAoIWN1cnJlbnREZWNvZGVyLmNvcHlCdWZmZXJzKSB7XG5cdFx0XHRcdGlmIChieXRlc1BlckVsZW1lbnQgPT09IDEgfHwgYnl0ZXNQZXJFbGVtZW50ID09PSAyICYmICEoYnVmZmVyLmJ5dGVPZmZzZXQgJiAxKSB8fCBieXRlc1BlckVsZW1lbnQgPT09IDQgJiYgIShidWZmZXIuYnl0ZU9mZnNldCAmIDMpIHx8IGJ5dGVzUGVyRWxlbWVudCA9PT0gOCAmJiAhKGJ1ZmZlci5ieXRlT2Zmc2V0ICYgNykpIHJldHVybiBuZXcgVHlwZWRBcnJheShidWZmZXIuYnVmZmVyLCBidWZmZXIuYnl0ZU9mZnNldCwgYnVmZmVyLmJ5dGVMZW5ndGggPj4gc2l6ZVNoaWZ0KTtcblx0XHRcdH1cblx0XHRcdHJldHVybiBuZXcgVHlwZWRBcnJheShVaW50OEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGJ1ZmZlciwgMCkuYnVmZmVyKTtcblx0XHR9IDogKGJ1ZmZlcikgPT4ge1xuXHRcdFx0aWYgKCFUeXBlZEFycmF5KSB0aHJvdyBuZXcgRXJyb3IoXCJDb3VsZCBub3QgZmluZCB0eXBlZCBhcnJheSBmb3IgY29kZSBcIiArIHRhZyk7XG5cdFx0XHRsZXQgZHYgPSBuZXcgRGF0YVZpZXcoYnVmZmVyLmJ1ZmZlciwgYnVmZmVyLmJ5dGVPZmZzZXQsIGJ1ZmZlci5ieXRlTGVuZ3RoKTtcblx0XHRcdGxldCBlbGVtZW50cyA9IGJ1ZmZlci5sZW5ndGggPj4gc2l6ZVNoaWZ0O1xuXHRcdFx0bGV0IHRhID0gbmV3IFR5cGVkQXJyYXkoZWxlbWVudHMpO1xuXHRcdFx0bGV0IG1ldGhvZCA9IGR2W2R2TWV0aG9kXTtcblx0XHRcdGZvciAobGV0IGkgPSAwOyBpIDwgZWxlbWVudHM7IGkrKykgdGFbaV0gPSBtZXRob2QuY2FsbChkdiwgaSA8PCBzaXplU2hpZnQsIGxpdHRsZUVuZGlhbik7XG5cdFx0XHRyZXR1cm4gdGE7XG5cdFx0fTtcblx0fVxufVxuZnVuY3Rpb24gcmVhZEJ1bmRsZUV4dCgpIHtcblx0bGV0IGxlbmd0aCA9IHJlYWRKdXN0TGVuZ3RoKCk7XG5cdGxldCBidW5kbGVQb3NpdGlvbiA9IHBvc2l0aW9uJDEgKyByZWFkKCk7XG5cdGZvciAobGV0IGkgPSAyOyBpIDwgbGVuZ3RoOyBpKyspIHtcblx0XHRsZXQgYnVuZGxlTGVuZ3RoID0gcmVhZEp1c3RMZW5ndGgoKTtcblx0XHRwb3NpdGlvbiQxICs9IGJ1bmRsZUxlbmd0aDtcblx0fVxuXHRsZXQgZGF0YVBvc2l0aW9uID0gcG9zaXRpb24kMTtcblx0cG9zaXRpb24kMSA9IGJ1bmRsZVBvc2l0aW9uO1xuXHRidW5kbGVkU3RyaW5ncyQxID0gW3JlYWRTdHJpbmdKUyhyZWFkSnVzdExlbmd0aCgpKSwgcmVhZFN0cmluZ0pTKHJlYWRKdXN0TGVuZ3RoKCkpXTtcblx0YnVuZGxlZFN0cmluZ3MkMS5wb3NpdGlvbjAgPSAwO1xuXHRidW5kbGVkU3RyaW5ncyQxLnBvc2l0aW9uMSA9IDA7XG5cdGJ1bmRsZWRTdHJpbmdzJDEucG9zdEJ1bmRsZVBvc2l0aW9uID0gcG9zaXRpb24kMTtcblx0cG9zaXRpb24kMSA9IGRhdGFQb3NpdGlvbjtcblx0cmV0dXJuIHJlYWQoKTtcbn1cbmZ1bmN0aW9uIHJlYWRKdXN0TGVuZ3RoKCkge1xuXHRpZiAoIShwb3NpdGlvbiQxIDwgc3JjRW5kKSkgdGhyb3cgZW5kT2ZDQk9SRXJyb3IoKTtcblx0bGV0IHRva2VuID0gc3JjW3Bvc2l0aW9uJDErK10gJiAzMTtcblx0aWYgKHRva2VuID4gMjMpIHN3aXRjaCAodG9rZW4pIHtcblx0XHRjYXNlIDI0OlxuXHRcdFx0aWYgKHBvc2l0aW9uJDEgPj0gc3JjRW5kKSB0aHJvdyBlbmRPZkNCT1JFcnJvcigpO1xuXHRcdFx0dG9rZW4gPSBzcmNbcG9zaXRpb24kMSsrXTtcblx0XHRcdGJyZWFrO1xuXHRcdGNhc2UgMjU6XG5cdFx0XHR0b2tlbiA9IGRhdGFWaWV3LmdldFVpbnQxNihwb3NpdGlvbiQxKTtcblx0XHRcdHBvc2l0aW9uJDEgKz0gMjtcblx0XHRcdGJyZWFrO1xuXHRcdGNhc2UgMjY6XG5cdFx0XHR0b2tlbiA9IGRhdGFWaWV3LmdldFVpbnQzMihwb3NpdGlvbiQxKTtcblx0XHRcdHBvc2l0aW9uJDEgKz0gNDtcblx0fVxuXHRyZXR1cm4gdG9rZW47XG59XG5mdW5jdGlvbiBsb2FkU2hhcmVkKCkge1xuXHRpZiAoY3VycmVudERlY29kZXIuZ2V0U2hhcmVkKSB7XG5cdFx0bGV0IHNoYXJlZERhdGEgPSBzYXZlU3RhdGUoKCkgPT4ge1xuXHRcdFx0c3JjID0gbnVsbDtcblx0XHRcdHJldHVybiBjdXJyZW50RGVjb2Rlci5nZXRTaGFyZWQoKTtcblx0XHR9KSB8fCB7fTtcblx0XHRsZXQgdXBkYXRlZFN0cnVjdHVyZXMgPSBzaGFyZWREYXRhLnN0cnVjdHVyZXMgfHwgW107XG5cdFx0Y3VycmVudERlY29kZXIuc2hhcmVkVmVyc2lvbiA9IHNoYXJlZERhdGEudmVyc2lvbjtcblx0XHRwYWNrZWRWYWx1ZXMgPSBjdXJyZW50RGVjb2Rlci5zaGFyZWRWYWx1ZXMgPSBzaGFyZWREYXRhLnBhY2tlZFZhbHVlcztcblx0XHRpZiAoY3VycmVudFN0cnVjdHVyZXMgPT09IHRydWUpIGN1cnJlbnREZWNvZGVyLnN0cnVjdHVyZXMgPSBjdXJyZW50U3RydWN0dXJlcyA9IHVwZGF0ZWRTdHJ1Y3R1cmVzO1xuXHRcdGVsc2UgY3VycmVudFN0cnVjdHVyZXMuc3BsaWNlLmFwcGx5KGN1cnJlbnRTdHJ1Y3R1cmVzLCBbMCwgdXBkYXRlZFN0cnVjdHVyZXMubGVuZ3RoXS5jb25jYXQodXBkYXRlZFN0cnVjdHVyZXMpKTtcblx0fVxufVxuZnVuY3Rpb24gc2F2ZVN0YXRlKGNhbGxiYWNrKSB7XG5cdGxldCBzYXZlZFNyY0VuZCA9IHNyY0VuZDtcblx0bGV0IHNhdmVkUG9zaXRpb24gPSBwb3NpdGlvbiQxO1xuXHRsZXQgc2F2ZWRTdHJpbmdQb3NpdGlvbiA9IHN0cmluZ1Bvc2l0aW9uO1xuXHRsZXQgc2F2ZWRTcmNTdHJpbmdTdGFydCA9IHNyY1N0cmluZ1N0YXJ0O1xuXHRsZXQgc2F2ZWRTcmNTdHJpbmdFbmQgPSBzcmNTdHJpbmdFbmQ7XG5cdGxldCBzYXZlZFNyY1N0cmluZyA9IHNyY1N0cmluZztcblx0bGV0IHNhdmVkU3RyaW5ncyA9IHN0cmluZ3M7XG5cdGxldCBzYXZlZFJlZmVyZW5jZU1hcCA9IHJlZmVyZW5jZU1hcDtcblx0bGV0IHNhdmVkQnVuZGxlZFN0cmluZ3MgPSBidW5kbGVkU3RyaW5ncyQxO1xuXHRsZXQgc2F2ZWRTcmMgPSBuZXcgVWludDhBcnJheShzcmMuc2xpY2UoMCwgc3JjRW5kKSk7XG5cdGxldCBzYXZlZFN0cnVjdHVyZXMgPSBjdXJyZW50U3RydWN0dXJlcztcblx0bGV0IHNhdmVkRGVjb2RlciA9IGN1cnJlbnREZWNvZGVyO1xuXHRsZXQgc2F2ZWRTZXF1ZW50aWFsTW9kZSA9IHNlcXVlbnRpYWxNb2RlO1xuXHRsZXQgdmFsdWUgPSBjYWxsYmFjaygpO1xuXHRzcmNFbmQgPSBzYXZlZFNyY0VuZDtcblx0cG9zaXRpb24kMSA9IHNhdmVkUG9zaXRpb247XG5cdHN0cmluZ1Bvc2l0aW9uID0gc2F2ZWRTdHJpbmdQb3NpdGlvbjtcblx0c3JjU3RyaW5nU3RhcnQgPSBzYXZlZFNyY1N0cmluZ1N0YXJ0O1xuXHRzcmNTdHJpbmdFbmQgPSBzYXZlZFNyY1N0cmluZ0VuZDtcblx0c3JjU3RyaW5nID0gc2F2ZWRTcmNTdHJpbmc7XG5cdHN0cmluZ3MgPSBzYXZlZFN0cmluZ3M7XG5cdHJlZmVyZW5jZU1hcCA9IHNhdmVkUmVmZXJlbmNlTWFwO1xuXHRidW5kbGVkU3RyaW5ncyQxID0gc2F2ZWRCdW5kbGVkU3RyaW5ncztcblx0c3JjID0gc2F2ZWRTcmM7XG5cdHNlcXVlbnRpYWxNb2RlID0gc2F2ZWRTZXF1ZW50aWFsTW9kZTtcblx0Y3VycmVudFN0cnVjdHVyZXMgPSBzYXZlZFN0cnVjdHVyZXM7XG5cdGN1cnJlbnREZWNvZGVyID0gc2F2ZWREZWNvZGVyO1xuXHRkYXRhVmlldyA9IG5ldyBEYXRhVmlldyhzcmMuYnVmZmVyLCBzcmMuYnl0ZU9mZnNldCwgc3JjLmJ5dGVMZW5ndGgpO1xuXHRyZXR1cm4gdmFsdWU7XG59XG5mdW5jdGlvbiBjbGVhclNvdXJjZSgpIHtcblx0c3JjID0gbnVsbDtcblx0cmVmZXJlbmNlTWFwID0gbnVsbDtcblx0Y3VycmVudFN0cnVjdHVyZXMgPSBudWxsO1xufVxudmFyIG11bHQxMCA9IG5ldyBBcnJheSgxNDcpO1xuZm9yIChsZXQgaSA9IDA7IGkgPCAyNTY7IGkrKykgbXVsdDEwW2ldID0gKyhcIjFlXCIgKyBNYXRoLmZsb29yKDQ1LjE1IC0gaSAqIC4zMDEwMykpO1xudmFyIGRlZmF1bHREZWNvZGVyID0gbmV3IERlY29kZXIoeyB1c2VSZWNvcmRzOiBmYWxzZSB9KTtcbnZhciBkZWNvZGUgPSBkZWZhdWx0RGVjb2Rlci5kZWNvZGU7XG52YXIgZGVjb2RlTXVsdGlwbGUgPSBkZWZhdWx0RGVjb2Rlci5kZWNvZGVNdWx0aXBsZTtcbnZhciBGTE9BVDMyX09QVElPTlMgPSB7XG5cdE5FVkVSOiAwLFxuXHRBTFdBWVM6IDEsXG5cdERFQ0lNQUxfUk9VTkQ6IDMsXG5cdERFQ0lNQUxfRklUOiA0XG59O1xuXG4vLyNlbmRyZWdpb25cbi8vI3JlZ2lvbiAuLi8uLi8uLi9ub2RlX21vZHVsZXMvY2Jvci14L2VuY29kZS5qc1xudmFyIHRleHRFbmNvZGVyO1xudHJ5IHtcblx0dGV4dEVuY29kZXIgPSBuZXcgVGV4dEVuY29kZXIoKTtcbn0gY2F0Y2ggKGVycm9yKSB7fVxudmFyIGV4dGVuc2lvbnM7XG52YXIgZXh0ZW5zaW9uQ2xhc3NlcztcbnZhciBCdWZmZXIkMSA9IHR5cGVvZiBnbG9iYWxUaGlzID09PSBcIm9iamVjdFwiICYmIGdsb2JhbFRoaXMuQnVmZmVyO1xudmFyIGhhc05vZGVCdWZmZXIgPSB0eXBlb2YgQnVmZmVyJDEgIT09IFwidW5kZWZpbmVkXCI7XG52YXIgQnl0ZUFycmF5QWxsb2NhdGUgPSBoYXNOb2RlQnVmZmVyID8gQnVmZmVyJDEuYWxsb2NVbnNhZmVTbG93IDogVWludDhBcnJheTtcbnZhciBCeXRlQXJyYXkgPSBoYXNOb2RlQnVmZmVyID8gQnVmZmVyJDEgOiBVaW50OEFycmF5O1xudmFyIE1BWF9TVFJVQ1RVUkVTID0gMjU2O1xudmFyIE1BWF9CVUZGRVJfU0laRSA9IGhhc05vZGVCdWZmZXIgPyA0Mjk0OTY3Mjk2IDogMjE0NDMzNzkyMDtcbnZhciB0aHJvd09uSXRlcmFibGU7XG52YXIgdGFyZ2V0O1xudmFyIHRhcmdldFZpZXc7XG52YXIgcG9zaXRpb24gPSAwO1xudmFyIHNhZmVFbmQ7XG52YXIgYnVuZGxlZFN0cmluZ3MgPSBudWxsO1xudmFyIE1BWF9CVU5ETEVfU0laRSA9IDYxNDQwO1xudmFyIGhhc05vbkxhdGluID0gL1tcXHUwMDgwLVxcdUZGRkZdLztcbnZhciBSRUNPUkRfU1lNQk9MID0gU3ltYm9sKFwicmVjb3JkLWlkXCIpO1xudmFyIEVuY29kZXIgPSBjbGFzcyBleHRlbmRzIERlY29kZXIge1xuXHRjb25zdHJ1Y3RvcihvcHRpb25zKSB7XG5cdFx0c3VwZXIob3B0aW9ucyk7XG5cdFx0dGhpcy5vZmZzZXQgPSAwO1xuXHRcdGxldCBzdGFydDtcblx0XHRsZXQgc2hhcmVkU3RydWN0dXJlcztcblx0XHRsZXQgaGFzU2hhcmVkVXBkYXRlO1xuXHRcdGxldCBzdHJ1Y3R1cmVzO1xuXHRcdGxldCByZWZlcmVuY2VNYXA7XG5cdFx0b3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cdFx0bGV0IGVuY29kZVV0ZjggPSBCeXRlQXJyYXkucHJvdG90eXBlLnV0ZjhXcml0ZSA/IGZ1bmN0aW9uKHN0cmluZywgcG9zaXRpb24pIHtcblx0XHRcdHJldHVybiB0YXJnZXQudXRmOFdyaXRlKHN0cmluZywgcG9zaXRpb24sIHRhcmdldC5ieXRlTGVuZ3RoIC0gcG9zaXRpb24pO1xuXHRcdH0gOiB0ZXh0RW5jb2RlciAmJiB0ZXh0RW5jb2Rlci5lbmNvZGVJbnRvID8gZnVuY3Rpb24oc3RyaW5nLCBwb3NpdGlvbikge1xuXHRcdFx0cmV0dXJuIHRleHRFbmNvZGVyLmVuY29kZUludG8oc3RyaW5nLCB0YXJnZXQuc3ViYXJyYXkocG9zaXRpb24pKS53cml0dGVuO1xuXHRcdH0gOiBmYWxzZTtcblx0XHRsZXQgZW5jb2RlciA9IHRoaXM7XG5cdFx0bGV0IGhhc1NoYXJlZFN0cnVjdHVyZXMgPSBvcHRpb25zLnN0cnVjdHVyZXMgfHwgb3B0aW9ucy5zYXZlU3RydWN0dXJlcztcblx0XHRsZXQgbWF4U2hhcmVkU3RydWN0dXJlcyA9IG9wdGlvbnMubWF4U2hhcmVkU3RydWN0dXJlcztcblx0XHRpZiAobWF4U2hhcmVkU3RydWN0dXJlcyA9PSBudWxsKSBtYXhTaGFyZWRTdHJ1Y3R1cmVzID0gaGFzU2hhcmVkU3RydWN0dXJlcyA/IDEyOCA6IDA7XG5cdFx0aWYgKG1heFNoYXJlZFN0cnVjdHVyZXMgPiA4MTkwKSB0aHJvdyBuZXcgRXJyb3IoXCJNYXhpbXVtIG1heFNoYXJlZFN0cnVjdHVyZSBpcyA4MTkwXCIpO1xuXHRcdGxldCBpc1NlcXVlbnRpYWwgPSBvcHRpb25zLnNlcXVlbnRpYWw7XG5cdFx0aWYgKGlzU2VxdWVudGlhbCkgbWF4U2hhcmVkU3RydWN0dXJlcyA9IDA7XG5cdFx0aWYgKCF0aGlzLnN0cnVjdHVyZXMpIHRoaXMuc3RydWN0dXJlcyA9IFtdO1xuXHRcdGlmICh0aGlzLnNhdmVTdHJ1Y3R1cmVzKSB0aGlzLnNhdmVTaGFyZWQgPSB0aGlzLnNhdmVTdHJ1Y3R1cmVzO1xuXHRcdGxldCBzYW1wbGluZ1BhY2tlZFZhbHVlcywgcGFja2VkT2JqZWN0TWFwLCBzaGFyZWRWYWx1ZXMgPSBvcHRpb25zLnNoYXJlZFZhbHVlcztcblx0XHRsZXQgc2hhcmVkUGFja2VkT2JqZWN0TWFwO1xuXHRcdGlmIChzaGFyZWRWYWx1ZXMpIHtcblx0XHRcdHNoYXJlZFBhY2tlZE9iamVjdE1hcCA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG5cdFx0XHRmb3IgKGxldCBpID0gMCwgbCA9IHNoYXJlZFZhbHVlcy5sZW5ndGg7IGkgPCBsOyBpKyspIHNoYXJlZFBhY2tlZE9iamVjdE1hcFtzaGFyZWRWYWx1ZXNbaV1dID0gaTtcblx0XHR9XG5cdFx0bGV0IHJlY29yZElkc1RvUmVtb3ZlID0gW107XG5cdFx0bGV0IHRyYW5zaXRpb25zQ291bnQgPSAwO1xuXHRcdGxldCBzZXJpYWxpemF0aW9uc1NpbmNlVHJhbnNpdGlvblJlYnVpbGQgPSAwO1xuXHRcdHRoaXMubWFwRW5jb2RlID0gZnVuY3Rpb24odmFsdWUsIGVuY29kZU9wdGlvbnMpIHtcblx0XHRcdGlmICh0aGlzLl9rZXlNYXAgJiYgIXRoaXMuX21hcHBlZCkgc3dpdGNoICh2YWx1ZS5jb25zdHJ1Y3Rvci5uYW1lKSB7XG5cdFx0XHRcdGNhc2UgXCJBcnJheVwiOiB2YWx1ZSA9IHZhbHVlLm1hcCgocikgPT4gdGhpcy5lbmNvZGVLZXlzKHIpKTtcblx0XHRcdH1cblx0XHRcdHJldHVybiB0aGlzLmVuY29kZSh2YWx1ZSwgZW5jb2RlT3B0aW9ucyk7XG5cdFx0fTtcblx0XHR0aGlzLmVuY29kZSA9IGZ1bmN0aW9uKHZhbHVlLCBlbmNvZGVPcHRpb25zKSB7XG5cdFx0XHRpZiAoIXRhcmdldCkge1xuXHRcdFx0XHR0YXJnZXQgPSBuZXcgQnl0ZUFycmF5QWxsb2NhdGUoODE5Mik7XG5cdFx0XHRcdHRhcmdldFZpZXcgPSBuZXcgRGF0YVZpZXcodGFyZ2V0LmJ1ZmZlciwgMCwgODE5Mik7XG5cdFx0XHRcdHBvc2l0aW9uID0gMDtcblx0XHRcdH1cblx0XHRcdHNhZmVFbmQgPSB0YXJnZXQubGVuZ3RoIC0gMTA7XG5cdFx0XHRpZiAoc2FmZUVuZCAtIHBvc2l0aW9uIDwgMjA0OCkge1xuXHRcdFx0XHR0YXJnZXQgPSBuZXcgQnl0ZUFycmF5QWxsb2NhdGUodGFyZ2V0Lmxlbmd0aCk7XG5cdFx0XHRcdHRhcmdldFZpZXcgPSBuZXcgRGF0YVZpZXcodGFyZ2V0LmJ1ZmZlciwgMCwgdGFyZ2V0Lmxlbmd0aCk7XG5cdFx0XHRcdHNhZmVFbmQgPSB0YXJnZXQubGVuZ3RoIC0gMTA7XG5cdFx0XHRcdHBvc2l0aW9uID0gMDtcblx0XHRcdH0gZWxzZSBpZiAoZW5jb2RlT3B0aW9ucyA9PT0gNTEyKSBwb3NpdGlvbiA9IHBvc2l0aW9uICsgNyAmIDIxNDc0ODM2NDA7XG5cdFx0XHRzdGFydCA9IHBvc2l0aW9uO1xuXHRcdFx0aWYgKGVuY29kZXIudXNlU2VsZkRlc2NyaWJlZEhlYWRlcikge1xuXHRcdFx0XHR0YXJnZXRWaWV3LnNldFVpbnQzMihwb3NpdGlvbiwgMzY1NDk0MDQxNik7XG5cdFx0XHRcdHBvc2l0aW9uICs9IDM7XG5cdFx0XHR9XG5cdFx0XHRyZWZlcmVuY2VNYXAgPSBlbmNvZGVyLnN0cnVjdHVyZWRDbG9uZSA/IC8qIEBfX1BVUkVfXyAqLyBuZXcgTWFwKCkgOiBudWxsO1xuXHRcdFx0aWYgKGVuY29kZXIuYnVuZGxlU3RyaW5ncyAmJiB0eXBlb2YgdmFsdWUgIT09IFwic3RyaW5nXCIpIHtcblx0XHRcdFx0YnVuZGxlZFN0cmluZ3MgPSBbXTtcblx0XHRcdFx0YnVuZGxlZFN0cmluZ3Muc2l6ZSA9IEluZmluaXR5O1xuXHRcdFx0fSBlbHNlIGJ1bmRsZWRTdHJpbmdzID0gbnVsbDtcblx0XHRcdHNoYXJlZFN0cnVjdHVyZXMgPSBlbmNvZGVyLnN0cnVjdHVyZXM7XG5cdFx0XHRpZiAoc2hhcmVkU3RydWN0dXJlcykge1xuXHRcdFx0XHRpZiAoc2hhcmVkU3RydWN0dXJlcy51bmluaXRpYWxpemVkKSB7XG5cdFx0XHRcdFx0bGV0IHNoYXJlZERhdGEgPSBlbmNvZGVyLmdldFNoYXJlZCgpIHx8IHt9O1xuXHRcdFx0XHRcdGVuY29kZXIuc3RydWN0dXJlcyA9IHNoYXJlZFN0cnVjdHVyZXMgPSBzaGFyZWREYXRhLnN0cnVjdHVyZXMgfHwgW107XG5cdFx0XHRcdFx0ZW5jb2Rlci5zaGFyZWRWZXJzaW9uID0gc2hhcmVkRGF0YS52ZXJzaW9uO1xuXHRcdFx0XHRcdGxldCBzaGFyZWRWYWx1ZXMgPSBlbmNvZGVyLnNoYXJlZFZhbHVlcyA9IHNoYXJlZERhdGEucGFja2VkVmFsdWVzO1xuXHRcdFx0XHRcdGlmIChzaGFyZWRWYWx1ZXMpIHtcblx0XHRcdFx0XHRcdHNoYXJlZFBhY2tlZE9iamVjdE1hcCA9IHt9O1xuXHRcdFx0XHRcdFx0Zm9yIChsZXQgaSA9IDAsIGwgPSBzaGFyZWRWYWx1ZXMubGVuZ3RoOyBpIDwgbDsgaSsrKSBzaGFyZWRQYWNrZWRPYmplY3RNYXBbc2hhcmVkVmFsdWVzW2ldXSA9IGk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdGxldCBzaGFyZWRTdHJ1Y3R1cmVzTGVuZ3RoID0gc2hhcmVkU3RydWN0dXJlcy5sZW5ndGg7XG5cdFx0XHRcdGlmIChzaGFyZWRTdHJ1Y3R1cmVzTGVuZ3RoID4gbWF4U2hhcmVkU3RydWN0dXJlcyAmJiAhaXNTZXF1ZW50aWFsKSBzaGFyZWRTdHJ1Y3R1cmVzTGVuZ3RoID0gbWF4U2hhcmVkU3RydWN0dXJlcztcblx0XHRcdFx0aWYgKCFzaGFyZWRTdHJ1Y3R1cmVzLnRyYW5zaXRpb25zKSB7XG5cdFx0XHRcdFx0c2hhcmVkU3RydWN0dXJlcy50cmFuc2l0aW9ucyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG5cdFx0XHRcdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCBzaGFyZWRTdHJ1Y3R1cmVzTGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0XHRcdGxldCBrZXlzID0gc2hhcmVkU3RydWN0dXJlc1tpXTtcblx0XHRcdFx0XHRcdGlmICgha2V5cykgY29udGludWU7XG5cdFx0XHRcdFx0XHRsZXQgbmV4dFRyYW5zaXRpb24sIHRyYW5zaXRpb24gPSBzaGFyZWRTdHJ1Y3R1cmVzLnRyYW5zaXRpb25zO1xuXHRcdFx0XHRcdFx0Zm9yIChsZXQgaiA9IDAsIGwgPSBrZXlzLmxlbmd0aDsgaiA8IGw7IGorKykge1xuXHRcdFx0XHRcdFx0XHRpZiAodHJhbnNpdGlvbltSRUNPUkRfU1lNQk9MXSA9PT0gdm9pZCAwKSB0cmFuc2l0aW9uW1JFQ09SRF9TWU1CT0xdID0gaTtcblx0XHRcdFx0XHRcdFx0bGV0IGtleSA9IGtleXNbal07XG5cdFx0XHRcdFx0XHRcdG5leHRUcmFuc2l0aW9uID0gdHJhbnNpdGlvbltrZXldO1xuXHRcdFx0XHRcdFx0XHRpZiAoIW5leHRUcmFuc2l0aW9uKSBuZXh0VHJhbnNpdGlvbiA9IHRyYW5zaXRpb25ba2V5XSA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG5cdFx0XHRcdFx0XHRcdHRyYW5zaXRpb24gPSBuZXh0VHJhbnNpdGlvbjtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHRyYW5zaXRpb25bUkVDT1JEX1NZTUJPTF0gPSBpIHwgMTA0ODU3Njtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKCFpc1NlcXVlbnRpYWwpIHNoYXJlZFN0cnVjdHVyZXMubmV4dElkID0gc2hhcmVkU3RydWN0dXJlc0xlbmd0aDtcblx0XHRcdH1cblx0XHRcdGlmIChoYXNTaGFyZWRVcGRhdGUpIGhhc1NoYXJlZFVwZGF0ZSA9IGZhbHNlO1xuXHRcdFx0c3RydWN0dXJlcyA9IHNoYXJlZFN0cnVjdHVyZXMgfHwgW107XG5cdFx0XHRwYWNrZWRPYmplY3RNYXAgPSBzaGFyZWRQYWNrZWRPYmplY3RNYXA7XG5cdFx0XHRpZiAob3B0aW9ucy5wYWNrKSB7XG5cdFx0XHRcdGxldCBwYWNrZWRWYWx1ZXMgPSAvKiBAX19QVVJFX18gKi8gbmV3IE1hcCgpO1xuXHRcdFx0XHRwYWNrZWRWYWx1ZXMudmFsdWVzID0gW107XG5cdFx0XHRcdHBhY2tlZFZhbHVlcy5lbmNvZGVyID0gZW5jb2Rlcjtcblx0XHRcdFx0cGFja2VkVmFsdWVzLm1heFZhbHVlcyA9IG9wdGlvbnMubWF4UHJpdmF0ZVBhY2tlZFZhbHVlcyB8fCAoc2hhcmVkUGFja2VkT2JqZWN0TWFwID8gMTYgOiBJbmZpbml0eSk7XG5cdFx0XHRcdHBhY2tlZFZhbHVlcy5vYmplY3RNYXAgPSBzaGFyZWRQYWNrZWRPYmplY3RNYXAgfHwgZmFsc2U7XG5cdFx0XHRcdHBhY2tlZFZhbHVlcy5zYW1wbGluZ1BhY2tlZFZhbHVlcyA9IHNhbXBsaW5nUGFja2VkVmFsdWVzO1xuXHRcdFx0XHRmaW5kUmVwZXRpdGl2ZVN0cmluZ3ModmFsdWUsIHBhY2tlZFZhbHVlcyk7XG5cdFx0XHRcdGlmIChwYWNrZWRWYWx1ZXMudmFsdWVzLmxlbmd0aCA+IDApIHtcblx0XHRcdFx0XHR0YXJnZXRbcG9zaXRpb24rK10gPSAyMTY7XG5cdFx0XHRcdFx0dGFyZ2V0W3Bvc2l0aW9uKytdID0gNTE7XG5cdFx0XHRcdFx0d3JpdGVBcnJheUhlYWRlcig0KTtcblx0XHRcdFx0XHRsZXQgdmFsdWVzQXJyYXkgPSBwYWNrZWRWYWx1ZXMudmFsdWVzO1xuXHRcdFx0XHRcdGVuY29kZSh2YWx1ZXNBcnJheSk7XG5cdFx0XHRcdFx0d3JpdGVBcnJheUhlYWRlcigwKTtcblx0XHRcdFx0XHR3cml0ZUFycmF5SGVhZGVyKDApO1xuXHRcdFx0XHRcdHBhY2tlZE9iamVjdE1hcCA9IE9iamVjdC5jcmVhdGUoc2hhcmVkUGFja2VkT2JqZWN0TWFwIHx8IG51bGwpO1xuXHRcdFx0XHRcdGZvciAobGV0IGkgPSAwLCBsID0gdmFsdWVzQXJyYXkubGVuZ3RoOyBpIDwgbDsgaSsrKSBwYWNrZWRPYmplY3RNYXBbdmFsdWVzQXJyYXlbaV1dID0gaTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0dGhyb3dPbkl0ZXJhYmxlID0gZW5jb2RlT3B0aW9ucyAmIFRIUk9XX09OX0lURVJBQkxFO1xuXHRcdFx0dHJ5IHtcblx0XHRcdFx0aWYgKHRocm93T25JdGVyYWJsZSkgcmV0dXJuO1xuXHRcdFx0XHRlbmNvZGUodmFsdWUpO1xuXHRcdFx0XHRpZiAoYnVuZGxlZFN0cmluZ3MpIHdyaXRlQnVuZGxlcyhzdGFydCwgZW5jb2RlKTtcblx0XHRcdFx0ZW5jb2Rlci5vZmZzZXQgPSBwb3NpdGlvbjtcblx0XHRcdFx0aWYgKHJlZmVyZW5jZU1hcCAmJiByZWZlcmVuY2VNYXAuaWRzVG9JbnNlcnQpIHtcblx0XHRcdFx0XHRwb3NpdGlvbiArPSByZWZlcmVuY2VNYXAuaWRzVG9JbnNlcnQubGVuZ3RoICogMjtcblx0XHRcdFx0XHRpZiAocG9zaXRpb24gPiBzYWZlRW5kKSBtYWtlUm9vbShwb3NpdGlvbik7XG5cdFx0XHRcdFx0ZW5jb2Rlci5vZmZzZXQgPSBwb3NpdGlvbjtcblx0XHRcdFx0XHRsZXQgc2VyaWFsaXplZCA9IGluc2VydElkcyh0YXJnZXQuc3ViYXJyYXkoc3RhcnQsIHBvc2l0aW9uKSwgcmVmZXJlbmNlTWFwLmlkc1RvSW5zZXJ0KTtcblx0XHRcdFx0XHRyZWZlcmVuY2VNYXAgPSBudWxsO1xuXHRcdFx0XHRcdHJldHVybiBzZXJpYWxpemVkO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmIChlbmNvZGVPcHRpb25zICYgNTEyKSB7XG5cdFx0XHRcdFx0dGFyZ2V0LnN0YXJ0ID0gc3RhcnQ7XG5cdFx0XHRcdFx0dGFyZ2V0LmVuZCA9IHBvc2l0aW9uO1xuXHRcdFx0XHRcdHJldHVybiB0YXJnZXQ7XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIHRhcmdldC5zdWJhcnJheShzdGFydCwgcG9zaXRpb24pO1xuXHRcdFx0fSBmaW5hbGx5IHtcblx0XHRcdFx0aWYgKHNoYXJlZFN0cnVjdHVyZXMpIHtcblx0XHRcdFx0XHRpZiAoc2VyaWFsaXphdGlvbnNTaW5jZVRyYW5zaXRpb25SZWJ1aWxkIDwgMTApIHNlcmlhbGl6YXRpb25zU2luY2VUcmFuc2l0aW9uUmVidWlsZCsrO1xuXHRcdFx0XHRcdGlmIChzaGFyZWRTdHJ1Y3R1cmVzLmxlbmd0aCA+IG1heFNoYXJlZFN0cnVjdHVyZXMpIHNoYXJlZFN0cnVjdHVyZXMubGVuZ3RoID0gbWF4U2hhcmVkU3RydWN0dXJlcztcblx0XHRcdFx0XHRpZiAodHJhbnNpdGlvbnNDb3VudCA+IDFlNCkge1xuXHRcdFx0XHRcdFx0c2hhcmVkU3RydWN0dXJlcy50cmFuc2l0aW9ucyA9IG51bGw7XG5cdFx0XHRcdFx0XHRzZXJpYWxpemF0aW9uc1NpbmNlVHJhbnNpdGlvblJlYnVpbGQgPSAwO1xuXHRcdFx0XHRcdFx0dHJhbnNpdGlvbnNDb3VudCA9IDA7XG5cdFx0XHRcdFx0XHRpZiAocmVjb3JkSWRzVG9SZW1vdmUubGVuZ3RoID4gMCkgcmVjb3JkSWRzVG9SZW1vdmUgPSBbXTtcblx0XHRcdFx0XHR9IGVsc2UgaWYgKHJlY29yZElkc1RvUmVtb3ZlLmxlbmd0aCA+IDAgJiYgIWlzU2VxdWVudGlhbCkge1xuXHRcdFx0XHRcdFx0Zm9yIChsZXQgaSA9IDAsIGwgPSByZWNvcmRJZHNUb1JlbW92ZS5sZW5ndGg7IGkgPCBsOyBpKyspIHJlY29yZElkc1RvUmVtb3ZlW2ldW1JFQ09SRF9TWU1CT0xdID0gdm9pZCAwO1xuXHRcdFx0XHRcdFx0cmVjb3JkSWRzVG9SZW1vdmUgPSBbXTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKGhhc1NoYXJlZFVwZGF0ZSAmJiBlbmNvZGVyLnNhdmVTaGFyZWQpIHtcblx0XHRcdFx0XHRpZiAoZW5jb2Rlci5zdHJ1Y3R1cmVzLmxlbmd0aCA+IG1heFNoYXJlZFN0cnVjdHVyZXMpIGVuY29kZXIuc3RydWN0dXJlcyA9IGVuY29kZXIuc3RydWN0dXJlcy5zbGljZSgwLCBtYXhTaGFyZWRTdHJ1Y3R1cmVzKTtcblx0XHRcdFx0XHRsZXQgcmV0dXJuQnVmZmVyID0gdGFyZ2V0LnN1YmFycmF5KHN0YXJ0LCBwb3NpdGlvbik7XG5cdFx0XHRcdFx0aWYgKGVuY29kZXIudXBkYXRlU2hhcmVkRGF0YSgpID09PSBmYWxzZSkgcmV0dXJuIGVuY29kZXIuZW5jb2RlKHZhbHVlKTtcblx0XHRcdFx0XHRyZXR1cm4gcmV0dXJuQnVmZmVyO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmIChlbmNvZGVPcHRpb25zICYgMTAyNCkgcG9zaXRpb24gPSBzdGFydDtcblx0XHRcdH1cblx0XHR9O1xuXHRcdHRoaXMuZmluZENvbW1vblN0cmluZ3NUb1BhY2sgPSAoKSA9PiB7XG5cdFx0XHRzYW1wbGluZ1BhY2tlZFZhbHVlcyA9IC8qIEBfX1BVUkVfXyAqLyBuZXcgTWFwKCk7XG5cdFx0XHRpZiAoIXNoYXJlZFBhY2tlZE9iamVjdE1hcCkgc2hhcmVkUGFja2VkT2JqZWN0TWFwID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcblx0XHRcdHJldHVybiAob3B0aW9ucykgPT4ge1xuXHRcdFx0XHRsZXQgdGhyZXNob2xkID0gb3B0aW9ucyAmJiBvcHRpb25zLnRocmVzaG9sZCB8fCA0O1xuXHRcdFx0XHRsZXQgcG9zaXRpb24gPSB0aGlzLnBhY2sgPyBvcHRpb25zLm1heFByaXZhdGVQYWNrZWRWYWx1ZXMgfHwgMTYgOiAwO1xuXHRcdFx0XHRpZiAoIXNoYXJlZFZhbHVlcykgc2hhcmVkVmFsdWVzID0gdGhpcy5zaGFyZWRWYWx1ZXMgPSBbXTtcblx0XHRcdFx0Zm9yIChsZXQgW2tleSwgc3RhdHVzXSBvZiBzYW1wbGluZ1BhY2tlZFZhbHVlcykgaWYgKHN0YXR1cy5jb3VudCA+IHRocmVzaG9sZCkge1xuXHRcdFx0XHRcdHNoYXJlZFBhY2tlZE9iamVjdE1hcFtrZXldID0gcG9zaXRpb24rKztcblx0XHRcdFx0XHRzaGFyZWRWYWx1ZXMucHVzaChrZXkpO1xuXHRcdFx0XHRcdGhhc1NoYXJlZFVwZGF0ZSA9IHRydWU7XG5cdFx0XHRcdH1cblx0XHRcdFx0d2hpbGUgKHRoaXMuc2F2ZVNoYXJlZCAmJiB0aGlzLnVwZGF0ZVNoYXJlZERhdGEoKSA9PT0gZmFsc2UpO1xuXHRcdFx0XHRzYW1wbGluZ1BhY2tlZFZhbHVlcyA9IG51bGw7XG5cdFx0XHR9O1xuXHRcdH07XG5cdFx0Y29uc3QgZW5jb2RlID0gKHZhbHVlKSA9PiB7XG5cdFx0XHRpZiAocG9zaXRpb24gPiBzYWZlRW5kKSB0YXJnZXQgPSBtYWtlUm9vbShwb3NpdGlvbik7XG5cdFx0XHR2YXIgdHlwZSA9IHR5cGVvZiB2YWx1ZTtcblx0XHRcdHZhciBsZW5ndGg7XG5cdFx0XHRpZiAodHlwZSA9PT0gXCJzdHJpbmdcIikge1xuXHRcdFx0XHRpZiAocGFja2VkT2JqZWN0TWFwKSB7XG5cdFx0XHRcdFx0bGV0IHBhY2tlZFBvc2l0aW9uID0gcGFja2VkT2JqZWN0TWFwW3ZhbHVlXTtcblx0XHRcdFx0XHRpZiAocGFja2VkUG9zaXRpb24gPj0gMCkge1xuXHRcdFx0XHRcdFx0aWYgKHBhY2tlZFBvc2l0aW9uIDwgMTYpIHRhcmdldFtwb3NpdGlvbisrXSA9IHBhY2tlZFBvc2l0aW9uICsgMjI0O1xuXHRcdFx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0XHRcdHRhcmdldFtwb3NpdGlvbisrXSA9IDE5ODtcblx0XHRcdFx0XHRcdFx0aWYgKHBhY2tlZFBvc2l0aW9uICYgMSkgZW5jb2RlKDE1IC0gcGFja2VkUG9zaXRpb24gPj4gMSk7XG5cdFx0XHRcdFx0XHRcdGVsc2UgZW5jb2RlKHBhY2tlZFBvc2l0aW9uIC0gMTYgPj4gMSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0fSBlbHNlIGlmIChzYW1wbGluZ1BhY2tlZFZhbHVlcyAmJiAhb3B0aW9ucy5wYWNrKSB7XG5cdFx0XHRcdFx0XHRsZXQgc3RhdHVzID0gc2FtcGxpbmdQYWNrZWRWYWx1ZXMuZ2V0KHZhbHVlKTtcblx0XHRcdFx0XHRcdGlmIChzdGF0dXMpIHN0YXR1cy5jb3VudCsrO1xuXHRcdFx0XHRcdFx0ZWxzZSBzYW1wbGluZ1BhY2tlZFZhbHVlcy5zZXQodmFsdWUsIHsgY291bnQ6IDEgfSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdGxldCBzdHJMZW5ndGggPSB2YWx1ZS5sZW5ndGg7XG5cdFx0XHRcdGlmIChidW5kbGVkU3RyaW5ncyAmJiBzdHJMZW5ndGggPj0gNCAmJiBzdHJMZW5ndGggPCAxMDI0KSB7XG5cdFx0XHRcdFx0aWYgKChidW5kbGVkU3RyaW5ncy5zaXplICs9IHN0ckxlbmd0aCkgPiBNQVhfQlVORExFX1NJWkUpIHtcblx0XHRcdFx0XHRcdGxldCBleHRTdGFydDtcblx0XHRcdFx0XHRcdGxldCBtYXhCeXRlcyA9IChidW5kbGVkU3RyaW5nc1swXSA/IGJ1bmRsZWRTdHJpbmdzWzBdLmxlbmd0aCAqIDMgKyBidW5kbGVkU3RyaW5nc1sxXS5sZW5ndGggOiAwKSArIDEwO1xuXHRcdFx0XHRcdFx0aWYgKHBvc2l0aW9uICsgbWF4Qnl0ZXMgPiBzYWZlRW5kKSB0YXJnZXQgPSBtYWtlUm9vbShwb3NpdGlvbiArIG1heEJ5dGVzKTtcblx0XHRcdFx0XHRcdHRhcmdldFtwb3NpdGlvbisrXSA9IDIxNztcblx0XHRcdFx0XHRcdHRhcmdldFtwb3NpdGlvbisrXSA9IDIyMztcblx0XHRcdFx0XHRcdHRhcmdldFtwb3NpdGlvbisrXSA9IDI0OTtcblx0XHRcdFx0XHRcdHRhcmdldFtwb3NpdGlvbisrXSA9IGJ1bmRsZWRTdHJpbmdzLnBvc2l0aW9uID8gMTMyIDogMTMwO1xuXHRcdFx0XHRcdFx0dGFyZ2V0W3Bvc2l0aW9uKytdID0gMjY7XG5cdFx0XHRcdFx0XHRleHRTdGFydCA9IHBvc2l0aW9uIC0gc3RhcnQ7XG5cdFx0XHRcdFx0XHRwb3NpdGlvbiArPSA0O1xuXHRcdFx0XHRcdFx0aWYgKGJ1bmRsZWRTdHJpbmdzLnBvc2l0aW9uKSB3cml0ZUJ1bmRsZXMoc3RhcnQsIGVuY29kZSk7XG5cdFx0XHRcdFx0XHRidW5kbGVkU3RyaW5ncyA9IFtcIlwiLCBcIlwiXTtcblx0XHRcdFx0XHRcdGJ1bmRsZWRTdHJpbmdzLnNpemUgPSAwO1xuXHRcdFx0XHRcdFx0YnVuZGxlZFN0cmluZ3MucG9zaXRpb24gPSBleHRTdGFydDtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0bGV0IHR3b0J5dGUgPSBoYXNOb25MYXRpbi50ZXN0KHZhbHVlKTtcblx0XHRcdFx0XHRidW5kbGVkU3RyaW5nc1t0d29CeXRlID8gMCA6IDFdICs9IHZhbHVlO1xuXHRcdFx0XHRcdHRhcmdldFtwb3NpdGlvbisrXSA9IHR3b0J5dGUgPyAyMDYgOiAyMDc7XG5cdFx0XHRcdFx0ZW5jb2RlKHN0ckxlbmd0aCk7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGxldCBoZWFkZXJTaXplO1xuXHRcdFx0XHRpZiAoc3RyTGVuZ3RoIDwgMzIpIGhlYWRlclNpemUgPSAxO1xuXHRcdFx0XHRlbHNlIGlmIChzdHJMZW5ndGggPCAyNTYpIGhlYWRlclNpemUgPSAyO1xuXHRcdFx0XHRlbHNlIGlmIChzdHJMZW5ndGggPCA2NTUzNikgaGVhZGVyU2l6ZSA9IDM7XG5cdFx0XHRcdGVsc2UgaGVhZGVyU2l6ZSA9IDU7XG5cdFx0XHRcdGxldCBtYXhCeXRlcyA9IHN0ckxlbmd0aCAqIDM7XG5cdFx0XHRcdGlmIChwb3NpdGlvbiArIG1heEJ5dGVzID4gc2FmZUVuZCkgdGFyZ2V0ID0gbWFrZVJvb20ocG9zaXRpb24gKyBtYXhCeXRlcyk7XG5cdFx0XHRcdGlmIChzdHJMZW5ndGggPCA2NCB8fCAhZW5jb2RlVXRmOCkge1xuXHRcdFx0XHRcdGxldCBpLCBjMSwgYzIsIHN0clBvc2l0aW9uID0gcG9zaXRpb24gKyBoZWFkZXJTaXplO1xuXHRcdFx0XHRcdGZvciAoaSA9IDA7IGkgPCBzdHJMZW5ndGg7IGkrKykge1xuXHRcdFx0XHRcdFx0YzEgPSB2YWx1ZS5jaGFyQ29kZUF0KGkpO1xuXHRcdFx0XHRcdFx0aWYgKGMxIDwgMTI4KSB0YXJnZXRbc3RyUG9zaXRpb24rK10gPSBjMTtcblx0XHRcdFx0XHRcdGVsc2UgaWYgKGMxIDwgMjA0OCkge1xuXHRcdFx0XHRcdFx0XHR0YXJnZXRbc3RyUG9zaXRpb24rK10gPSBjMSA+PiA2IHwgMTkyO1xuXHRcdFx0XHRcdFx0XHR0YXJnZXRbc3RyUG9zaXRpb24rK10gPSBjMSAmIDYzIHwgMTI4O1xuXHRcdFx0XHRcdFx0fSBlbHNlIGlmICgoYzEgJiA2NDUxMikgPT09IDU1Mjk2ICYmICgoYzIgPSB2YWx1ZS5jaGFyQ29kZUF0KGkgKyAxKSkgJiA2NDUxMikgPT09IDU2MzIwKSB7XG5cdFx0XHRcdFx0XHRcdGMxID0gNjU1MzYgKyAoKGMxICYgMTAyMykgPDwgMTApICsgKGMyICYgMTAyMyk7XG5cdFx0XHRcdFx0XHRcdGkrKztcblx0XHRcdFx0XHRcdFx0dGFyZ2V0W3N0clBvc2l0aW9uKytdID0gYzEgPj4gMTggfCAyNDA7XG5cdFx0XHRcdFx0XHRcdHRhcmdldFtzdHJQb3NpdGlvbisrXSA9IGMxID4+IDEyICYgNjMgfCAxMjg7XG5cdFx0XHRcdFx0XHRcdHRhcmdldFtzdHJQb3NpdGlvbisrXSA9IGMxID4+IDYgJiA2MyB8IDEyODtcblx0XHRcdFx0XHRcdFx0dGFyZ2V0W3N0clBvc2l0aW9uKytdID0gYzEgJiA2MyB8IDEyODtcblx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdHRhcmdldFtzdHJQb3NpdGlvbisrXSA9IGMxID4+IDEyIHwgMjI0O1xuXHRcdFx0XHRcdFx0XHR0YXJnZXRbc3RyUG9zaXRpb24rK10gPSBjMSA+PiA2ICYgNjMgfCAxMjg7XG5cdFx0XHRcdFx0XHRcdHRhcmdldFtzdHJQb3NpdGlvbisrXSA9IGMxICYgNjMgfCAxMjg7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGxlbmd0aCA9IHN0clBvc2l0aW9uIC0gcG9zaXRpb24gLSBoZWFkZXJTaXplO1xuXHRcdFx0XHR9IGVsc2UgbGVuZ3RoID0gZW5jb2RlVXRmOCh2YWx1ZSwgcG9zaXRpb24gKyBoZWFkZXJTaXplLCBtYXhCeXRlcyk7XG5cdFx0XHRcdGlmIChsZW5ndGggPCAyNCkgdGFyZ2V0W3Bvc2l0aW9uKytdID0gOTYgfCBsZW5ndGg7XG5cdFx0XHRcdGVsc2UgaWYgKGxlbmd0aCA8IDI1Nikge1xuXHRcdFx0XHRcdGlmIChoZWFkZXJTaXplIDwgMikgdGFyZ2V0LmNvcHlXaXRoaW4ocG9zaXRpb24gKyAyLCBwb3NpdGlvbiArIDEsIHBvc2l0aW9uICsgMSArIGxlbmd0aCk7XG5cdFx0XHRcdFx0dGFyZ2V0W3Bvc2l0aW9uKytdID0gMTIwO1xuXHRcdFx0XHRcdHRhcmdldFtwb3NpdGlvbisrXSA9IGxlbmd0aDtcblx0XHRcdFx0fSBlbHNlIGlmIChsZW5ndGggPCA2NTUzNikge1xuXHRcdFx0XHRcdGlmIChoZWFkZXJTaXplIDwgMykgdGFyZ2V0LmNvcHlXaXRoaW4ocG9zaXRpb24gKyAzLCBwb3NpdGlvbiArIDIsIHBvc2l0aW9uICsgMiArIGxlbmd0aCk7XG5cdFx0XHRcdFx0dGFyZ2V0W3Bvc2l0aW9uKytdID0gMTIxO1xuXHRcdFx0XHRcdHRhcmdldFtwb3NpdGlvbisrXSA9IGxlbmd0aCA+PiA4O1xuXHRcdFx0XHRcdHRhcmdldFtwb3NpdGlvbisrXSA9IGxlbmd0aCAmIDI1NTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRpZiAoaGVhZGVyU2l6ZSA8IDUpIHRhcmdldC5jb3B5V2l0aGluKHBvc2l0aW9uICsgNSwgcG9zaXRpb24gKyAzLCBwb3NpdGlvbiArIDMgKyBsZW5ndGgpO1xuXHRcdFx0XHRcdHRhcmdldFtwb3NpdGlvbisrXSA9IDEyMjtcblx0XHRcdFx0XHR0YXJnZXRWaWV3LnNldFVpbnQzMihwb3NpdGlvbiwgbGVuZ3RoKTtcblx0XHRcdFx0XHRwb3NpdGlvbiArPSA0O1xuXHRcdFx0XHR9XG5cdFx0XHRcdHBvc2l0aW9uICs9IGxlbmd0aDtcblx0XHRcdH0gZWxzZSBpZiAodHlwZSA9PT0gXCJudW1iZXJcIikge1xuXHRcdFx0XHRpZiAoIXRoaXMuYWx3YXlzVXNlRmxvYXQgJiYgdmFsdWUgPj4+IDAgPT09IHZhbHVlKSB7XG5cdFx0XHRcdFx0aWYgKHZhbHVlIDwgMjQpIHRhcmdldFtwb3NpdGlvbisrXSA9IHZhbHVlO1xuXHRcdFx0XHRcdGVsc2UgaWYgKHZhbHVlIDwgMjU2KSB7XG5cdFx0XHRcdFx0XHR0YXJnZXRbcG9zaXRpb24rK10gPSAyNDtcblx0XHRcdFx0XHRcdHRhcmdldFtwb3NpdGlvbisrXSA9IHZhbHVlO1xuXHRcdFx0XHRcdH0gZWxzZSBpZiAodmFsdWUgPCA2NTUzNikge1xuXHRcdFx0XHRcdFx0dGFyZ2V0W3Bvc2l0aW9uKytdID0gMjU7XG5cdFx0XHRcdFx0XHR0YXJnZXRbcG9zaXRpb24rK10gPSB2YWx1ZSA+PiA4O1xuXHRcdFx0XHRcdFx0dGFyZ2V0W3Bvc2l0aW9uKytdID0gdmFsdWUgJiAyNTU7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdHRhcmdldFtwb3NpdGlvbisrXSA9IDI2O1xuXHRcdFx0XHRcdFx0dGFyZ2V0Vmlldy5zZXRVaW50MzIocG9zaXRpb24sIHZhbHVlKTtcblx0XHRcdFx0XHRcdHBvc2l0aW9uICs9IDQ7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9IGVsc2UgaWYgKCF0aGlzLmFsd2F5c1VzZUZsb2F0ICYmIHZhbHVlID4+IDAgPT09IHZhbHVlKSB7XG5cdFx0XHRcdFx0aWYgKHZhbHVlID49IC0yNCkgdGFyZ2V0W3Bvc2l0aW9uKytdID0gMzEgLSB2YWx1ZTtcblx0XHRcdFx0XHRlbHNlIGlmICh2YWx1ZSA+PSAtMjU2KSB7XG5cdFx0XHRcdFx0XHR0YXJnZXRbcG9zaXRpb24rK10gPSA1Njtcblx0XHRcdFx0XHRcdHRhcmdldFtwb3NpdGlvbisrXSA9IH52YWx1ZTtcblx0XHRcdFx0XHR9IGVsc2UgaWYgKHZhbHVlID49IC02NTUzNikge1xuXHRcdFx0XHRcdFx0dGFyZ2V0W3Bvc2l0aW9uKytdID0gNTc7XG5cdFx0XHRcdFx0XHR0YXJnZXRWaWV3LnNldFVpbnQxNihwb3NpdGlvbiwgfnZhbHVlKTtcblx0XHRcdFx0XHRcdHBvc2l0aW9uICs9IDI7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdHRhcmdldFtwb3NpdGlvbisrXSA9IDU4O1xuXHRcdFx0XHRcdFx0dGFyZ2V0Vmlldy5zZXRVaW50MzIocG9zaXRpb24sIH52YWx1ZSk7XG5cdFx0XHRcdFx0XHRwb3NpdGlvbiArPSA0O1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSBlbHNlIGlmICghdGhpcy5hbHdheXNVc2VGbG9hdCAmJiB2YWx1ZSA8IDAgJiYgdmFsdWUgPj0gLTQyOTQ5NjcyOTYgJiYgTWF0aC5mbG9vcih2YWx1ZSkgPT09IHZhbHVlKSB7XG5cdFx0XHRcdFx0dGFyZ2V0W3Bvc2l0aW9uKytdID0gNTg7XG5cdFx0XHRcdFx0dGFyZ2V0Vmlldy5zZXRVaW50MzIocG9zaXRpb24sIC0xIC0gdmFsdWUpO1xuXHRcdFx0XHRcdHBvc2l0aW9uICs9IDQ7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0bGV0IHVzZUZsb2F0MzI7XG5cdFx0XHRcdFx0aWYgKCh1c2VGbG9hdDMyID0gdGhpcy51c2VGbG9hdDMyKSA+IDAgJiYgdmFsdWUgPCA0Mjk0OTY3Mjk2ICYmIHZhbHVlID49IC0yMTQ3NDgzNjQ4KSB7XG5cdFx0XHRcdFx0XHR0YXJnZXRbcG9zaXRpb24rK10gPSAyNTA7XG5cdFx0XHRcdFx0XHR0YXJnZXRWaWV3LnNldEZsb2F0MzIocG9zaXRpb24sIHZhbHVlKTtcblx0XHRcdFx0XHRcdGxldCB4U2hpZnRlZDtcblx0XHRcdFx0XHRcdGlmICh1c2VGbG9hdDMyIDwgNCB8fCAoeFNoaWZ0ZWQgPSB2YWx1ZSAqIG11bHQxMFsodGFyZ2V0W3Bvc2l0aW9uXSAmIDEyNykgPDwgMSB8IHRhcmdldFtwb3NpdGlvbiArIDFdID4+IDddKSA+PiAwID09PSB4U2hpZnRlZCkge1xuXHRcdFx0XHRcdFx0XHRwb3NpdGlvbiArPSA0O1xuXHRcdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0XHR9IGVsc2UgcG9zaXRpb24tLTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0dGFyZ2V0W3Bvc2l0aW9uKytdID0gMjUxO1xuXHRcdFx0XHRcdHRhcmdldFZpZXcuc2V0RmxvYXQ2NChwb3NpdGlvbiwgdmFsdWUpO1xuXHRcdFx0XHRcdHBvc2l0aW9uICs9IDg7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSBpZiAodHlwZSA9PT0gXCJvYmplY3RcIikge1xuXHRcdFx0XHRpZiAoIXZhbHVlKSB0YXJnZXRbcG9zaXRpb24rK10gPSAyNDY7XG5cdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdGlmIChyZWZlcmVuY2VNYXApIHtcblx0XHRcdFx0XHRcdGxldCByZWZlcmVlID0gcmVmZXJlbmNlTWFwLmdldCh2YWx1ZSk7XG5cdFx0XHRcdFx0XHRpZiAocmVmZXJlZSkge1xuXHRcdFx0XHRcdFx0XHR0YXJnZXRbcG9zaXRpb24rK10gPSAyMTY7XG5cdFx0XHRcdFx0XHRcdHRhcmdldFtwb3NpdGlvbisrXSA9IDI5O1xuXHRcdFx0XHRcdFx0XHR0YXJnZXRbcG9zaXRpb24rK10gPSAyNTtcblx0XHRcdFx0XHRcdFx0aWYgKCFyZWZlcmVlLnJlZmVyZW5jZXMpIHtcblx0XHRcdFx0XHRcdFx0XHRsZXQgaWRzVG9JbnNlcnQgPSByZWZlcmVuY2VNYXAuaWRzVG9JbnNlcnQgfHwgKHJlZmVyZW5jZU1hcC5pZHNUb0luc2VydCA9IFtdKTtcblx0XHRcdFx0XHRcdFx0XHRyZWZlcmVlLnJlZmVyZW5jZXMgPSBbXTtcblx0XHRcdFx0XHRcdFx0XHRpZHNUb0luc2VydC5wdXNoKHJlZmVyZWUpO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdHJlZmVyZWUucmVmZXJlbmNlcy5wdXNoKHBvc2l0aW9uIC0gc3RhcnQpO1xuXHRcdFx0XHRcdFx0XHRwb3NpdGlvbiArPSAyO1xuXHRcdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0XHR9IGVsc2UgcmVmZXJlbmNlTWFwLnNldCh2YWx1ZSwgeyBvZmZzZXQ6IHBvc2l0aW9uIC0gc3RhcnQgfSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGxldCBjb25zdHJ1Y3RvciA9IHZhbHVlLmNvbnN0cnVjdG9yO1xuXHRcdFx0XHRcdGlmIChjb25zdHJ1Y3RvciA9PT0gT2JqZWN0KSB7XG5cdFx0XHRcdFx0XHRpZiAodGhpcy5za2lwRnVuY3Rpb24gPT09IHRydWUpIHZhbHVlID0gT2JqZWN0LmZyb21FbnRyaWVzKFsuLi5PYmplY3Qua2V5cyh2YWx1ZSkuZmlsdGVyKCh4KSA9PiB0eXBlb2YgdmFsdWVbeF0gIT09IFwiZnVuY3Rpb25cIikubWFwKCh4KSA9PiBbeCwgdmFsdWVbeF1dKV0pO1xuXHRcdFx0XHRcdFx0d3JpdGVPYmplY3QodmFsdWUpO1xuXHRcdFx0XHRcdH0gZWxzZSBpZiAoY29uc3RydWN0b3IgPT09IEFycmF5KSB7XG5cdFx0XHRcdFx0XHRsZW5ndGggPSB2YWx1ZS5sZW5ndGg7XG5cdFx0XHRcdFx0XHRpZiAobGVuZ3RoIDwgMjQpIHRhcmdldFtwb3NpdGlvbisrXSA9IDEyOCB8IGxlbmd0aDtcblx0XHRcdFx0XHRcdGVsc2Ugd3JpdGVBcnJheUhlYWRlcihsZW5ndGgpO1xuXHRcdFx0XHRcdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykgZW5jb2RlKHZhbHVlW2ldKTtcblx0XHRcdFx0XHR9IGVsc2UgaWYgKGNvbnN0cnVjdG9yID09PSBNYXApIHtcblx0XHRcdFx0XHRcdGlmICh0aGlzLm1hcHNBc09iamVjdHMgPyB0aGlzLnVzZVRhZzI1OUZvck1hcHMgIT09IGZhbHNlIDogdGhpcy51c2VUYWcyNTlGb3JNYXBzKSB7XG5cdFx0XHRcdFx0XHRcdHRhcmdldFtwb3NpdGlvbisrXSA9IDIxNztcblx0XHRcdFx0XHRcdFx0dGFyZ2V0W3Bvc2l0aW9uKytdID0gMTtcblx0XHRcdFx0XHRcdFx0dGFyZ2V0W3Bvc2l0aW9uKytdID0gMztcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGxlbmd0aCA9IHZhbHVlLnNpemU7XG5cdFx0XHRcdFx0XHRpZiAobGVuZ3RoIDwgMjQpIHRhcmdldFtwb3NpdGlvbisrXSA9IDE2MCB8IGxlbmd0aDtcblx0XHRcdFx0XHRcdGVsc2UgaWYgKGxlbmd0aCA8IDI1Nikge1xuXHRcdFx0XHRcdFx0XHR0YXJnZXRbcG9zaXRpb24rK10gPSAxODQ7XG5cdFx0XHRcdFx0XHRcdHRhcmdldFtwb3NpdGlvbisrXSA9IGxlbmd0aDtcblx0XHRcdFx0XHRcdH0gZWxzZSBpZiAobGVuZ3RoIDwgNjU1MzYpIHtcblx0XHRcdFx0XHRcdFx0dGFyZ2V0W3Bvc2l0aW9uKytdID0gMTg1O1xuXHRcdFx0XHRcdFx0XHR0YXJnZXRbcG9zaXRpb24rK10gPSBsZW5ndGggPj4gODtcblx0XHRcdFx0XHRcdFx0dGFyZ2V0W3Bvc2l0aW9uKytdID0gbGVuZ3RoICYgMjU1O1xuXHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0dGFyZ2V0W3Bvc2l0aW9uKytdID0gMTg2O1xuXHRcdFx0XHRcdFx0XHR0YXJnZXRWaWV3LnNldFVpbnQzMihwb3NpdGlvbiwgbGVuZ3RoKTtcblx0XHRcdFx0XHRcdFx0cG9zaXRpb24gKz0gNDtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGlmIChlbmNvZGVyLmtleU1hcCkgZm9yIChsZXQgW2tleSwgZW50cnlWYWx1ZV0gb2YgdmFsdWUpIHtcblx0XHRcdFx0XHRcdFx0ZW5jb2RlKGVuY29kZXIuZW5jb2RlS2V5KGtleSkpO1xuXHRcdFx0XHRcdFx0XHRlbmNvZGUoZW50cnlWYWx1ZSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRlbHNlIGZvciAobGV0IFtrZXksIGVudHJ5VmFsdWVdIG9mIHZhbHVlKSB7XG5cdFx0XHRcdFx0XHRcdGVuY29kZShrZXkpO1xuXHRcdFx0XHRcdFx0XHRlbmNvZGUoZW50cnlWYWx1ZSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGZvciAobGV0IGkgPSAwLCBsID0gZXh0ZW5zaW9ucy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcblx0XHRcdFx0XHRcdFx0bGV0IGV4dGVuc2lvbkNsYXNzID0gZXh0ZW5zaW9uQ2xhc3Nlc1tpXTtcblx0XHRcdFx0XHRcdFx0aWYgKHZhbHVlIGluc3RhbmNlb2YgZXh0ZW5zaW9uQ2xhc3MpIHtcblx0XHRcdFx0XHRcdFx0XHRsZXQgZXh0ZW5zaW9uID0gZXh0ZW5zaW9uc1tpXTtcblx0XHRcdFx0XHRcdFx0XHRsZXQgdGFnID0gZXh0ZW5zaW9uLnRhZztcblx0XHRcdFx0XHRcdFx0XHRpZiAodGFnID09IHZvaWQgMCkgdGFnID0gZXh0ZW5zaW9uLmdldFRhZyAmJiBleHRlbnNpb24uZ2V0VGFnLmNhbGwodGhpcywgdmFsdWUpO1xuXHRcdFx0XHRcdFx0XHRcdGlmICh0YWcgPCAyNCkgdGFyZ2V0W3Bvc2l0aW9uKytdID0gMTkyIHwgdGFnO1xuXHRcdFx0XHRcdFx0XHRcdGVsc2UgaWYgKHRhZyA8IDI1Nikge1xuXHRcdFx0XHRcdFx0XHRcdFx0dGFyZ2V0W3Bvc2l0aW9uKytdID0gMjE2O1xuXHRcdFx0XHRcdFx0XHRcdFx0dGFyZ2V0W3Bvc2l0aW9uKytdID0gdGFnO1xuXHRcdFx0XHRcdFx0XHRcdH0gZWxzZSBpZiAodGFnIDwgNjU1MzYpIHtcblx0XHRcdFx0XHRcdFx0XHRcdHRhcmdldFtwb3NpdGlvbisrXSA9IDIxNztcblx0XHRcdFx0XHRcdFx0XHRcdHRhcmdldFtwb3NpdGlvbisrXSA9IHRhZyA+PiA4O1xuXHRcdFx0XHRcdFx0XHRcdFx0dGFyZ2V0W3Bvc2l0aW9uKytdID0gdGFnICYgMjU1O1xuXHRcdFx0XHRcdFx0XHRcdH0gZWxzZSBpZiAodGFnID4gLTEpIHtcblx0XHRcdFx0XHRcdFx0XHRcdHRhcmdldFtwb3NpdGlvbisrXSA9IDIxODtcblx0XHRcdFx0XHRcdFx0XHRcdHRhcmdldFZpZXcuc2V0VWludDMyKHBvc2l0aW9uLCB0YWcpO1xuXHRcdFx0XHRcdFx0XHRcdFx0cG9zaXRpb24gKz0gNDtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0ZXh0ZW5zaW9uLmVuY29kZS5jYWxsKHRoaXMsIHZhbHVlLCBlbmNvZGUsIG1ha2VSb29tKTtcblx0XHRcdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGlmICh2YWx1ZVtTeW1ib2wuaXRlcmF0b3JdKSB7XG5cdFx0XHRcdFx0XHRcdGlmICh0aHJvd09uSXRlcmFibGUpIHtcblx0XHRcdFx0XHRcdFx0XHRsZXQgZXJyb3IgPSAvKiBAX19QVVJFX18gKi8gbmV3IEVycm9yKFwiSXRlcmFibGUgc2hvdWxkIGJlIHNlcmlhbGl6ZWQgYXMgaXRlcmF0b3JcIik7XG5cdFx0XHRcdFx0XHRcdFx0ZXJyb3IuaXRlcmF0b3JOb3RIYW5kbGVkID0gdHJ1ZTtcblx0XHRcdFx0XHRcdFx0XHR0aHJvdyBlcnJvcjtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR0YXJnZXRbcG9zaXRpb24rK10gPSAxNTk7XG5cdFx0XHRcdFx0XHRcdGZvciAobGV0IGVudHJ5IG9mIHZhbHVlKSBlbmNvZGUoZW50cnkpO1xuXHRcdFx0XHRcdFx0XHR0YXJnZXRbcG9zaXRpb24rK10gPSAyNTU7XG5cdFx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGlmICh2YWx1ZVtTeW1ib2wuYXN5bmNJdGVyYXRvcl0gfHwgaXNCbG9iKHZhbHVlKSkge1xuXHRcdFx0XHRcdFx0XHRsZXQgZXJyb3IgPSAvKiBAX19QVVJFX18gKi8gbmV3IEVycm9yKFwiSXRlcmFibGUvYmxvYiBzaG91bGQgYmUgc2VyaWFsaXplZCBhcyBpdGVyYXRvclwiKTtcblx0XHRcdFx0XHRcdFx0ZXJyb3IuaXRlcmF0b3JOb3RIYW5kbGVkID0gdHJ1ZTtcblx0XHRcdFx0XHRcdFx0dGhyb3cgZXJyb3I7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRpZiAodGhpcy51c2VUb0pTT04gJiYgdmFsdWUudG9KU09OKSB7XG5cdFx0XHRcdFx0XHRcdGNvbnN0IGpzb24gPSB2YWx1ZS50b0pTT04oKTtcblx0XHRcdFx0XHRcdFx0aWYgKGpzb24gIT09IHZhbHVlKSByZXR1cm4gZW5jb2RlKGpzb24pO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0d3JpdGVPYmplY3QodmFsdWUpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIGlmICh0eXBlID09PSBcImJvb2xlYW5cIikgdGFyZ2V0W3Bvc2l0aW9uKytdID0gdmFsdWUgPyAyNDUgOiAyNDQ7XG5cdFx0XHRlbHNlIGlmICh0eXBlID09PSBcImJpZ2ludFwiKSB7XG5cdFx0XHRcdGlmICh2YWx1ZSA8IEJpZ0ludCgxKSA8PCBCaWdJbnQoNjQpICYmIHZhbHVlID49IDApIHtcblx0XHRcdFx0XHR0YXJnZXRbcG9zaXRpb24rK10gPSAyNztcblx0XHRcdFx0XHR0YXJnZXRWaWV3LnNldEJpZ1VpbnQ2NChwb3NpdGlvbiwgdmFsdWUpO1xuXHRcdFx0XHR9IGVsc2UgaWYgKHZhbHVlID4gLShCaWdJbnQoMSkgPDwgQmlnSW50KDY0KSkgJiYgdmFsdWUgPCAwKSB7XG5cdFx0XHRcdFx0dGFyZ2V0W3Bvc2l0aW9uKytdID0gNTk7XG5cdFx0XHRcdFx0dGFyZ2V0Vmlldy5zZXRCaWdVaW50NjQocG9zaXRpb24sIC12YWx1ZSAtIEJpZ0ludCgxKSk7XG5cdFx0XHRcdH0gZWxzZSBpZiAodGhpcy5sYXJnZUJpZ0ludFRvRmxvYXQpIHtcblx0XHRcdFx0XHR0YXJnZXRbcG9zaXRpb24rK10gPSAyNTE7XG5cdFx0XHRcdFx0dGFyZ2V0Vmlldy5zZXRGbG9hdDY0KHBvc2l0aW9uLCBOdW1iZXIodmFsdWUpKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRpZiAodmFsdWUgPj0gQmlnSW50KDApKSB0YXJnZXRbcG9zaXRpb24rK10gPSAxOTQ7XG5cdFx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0XHR0YXJnZXRbcG9zaXRpb24rK10gPSAxOTU7XG5cdFx0XHRcdFx0XHR2YWx1ZSA9IEJpZ0ludCgtMSkgLSB2YWx1ZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0bGV0IGJ5dGVzID0gW107XG5cdFx0XHRcdFx0d2hpbGUgKHZhbHVlKSB7XG5cdFx0XHRcdFx0XHRieXRlcy5wdXNoKE51bWJlcih2YWx1ZSAmIEJpZ0ludCgyNTUpKSk7XG5cdFx0XHRcdFx0XHR2YWx1ZSA+Pj0gQmlnSW50KDgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHR3cml0ZUJ1ZmZlcihuZXcgVWludDhBcnJheShieXRlcy5yZXZlcnNlKCkpLCBtYWtlUm9vbSk7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHBvc2l0aW9uICs9IDg7XG5cdFx0XHR9IGVsc2UgaWYgKHR5cGUgPT09IFwidW5kZWZpbmVkXCIpIHRhcmdldFtwb3NpdGlvbisrXSA9IDI0Nztcblx0XHRcdGVsc2UgdGhyb3cgbmV3IEVycm9yKFwiVW5rbm93biB0eXBlOiBcIiArIHR5cGUpO1xuXHRcdH07XG5cdFx0Y29uc3Qgd3JpdGVPYmplY3QgPSB0aGlzLnVzZVJlY29yZHMgPT09IGZhbHNlID8gdGhpcy52YXJpYWJsZU1hcFNpemUgPyAob2JqZWN0KSA9PiB7XG5cdFx0XHRsZXQga2V5cyA9IE9iamVjdC5rZXlzKG9iamVjdCk7XG5cdFx0XHRsZXQgdmFscyA9IE9iamVjdC52YWx1ZXMob2JqZWN0KTtcblx0XHRcdGxldCBsZW5ndGggPSBrZXlzLmxlbmd0aDtcblx0XHRcdGlmIChsZW5ndGggPCAyNCkgdGFyZ2V0W3Bvc2l0aW9uKytdID0gMTYwIHwgbGVuZ3RoO1xuXHRcdFx0ZWxzZSBpZiAobGVuZ3RoIDwgMjU2KSB7XG5cdFx0XHRcdHRhcmdldFtwb3NpdGlvbisrXSA9IDE4NDtcblx0XHRcdFx0dGFyZ2V0W3Bvc2l0aW9uKytdID0gbGVuZ3RoO1xuXHRcdFx0fSBlbHNlIGlmIChsZW5ndGggPCA2NTUzNikge1xuXHRcdFx0XHR0YXJnZXRbcG9zaXRpb24rK10gPSAxODU7XG5cdFx0XHRcdHRhcmdldFtwb3NpdGlvbisrXSA9IGxlbmd0aCA+PiA4O1xuXHRcdFx0XHR0YXJnZXRbcG9zaXRpb24rK10gPSBsZW5ndGggJiAyNTU7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0YXJnZXRbcG9zaXRpb24rK10gPSAxODY7XG5cdFx0XHRcdHRhcmdldFZpZXcuc2V0VWludDMyKHBvc2l0aW9uLCBsZW5ndGgpO1xuXHRcdFx0XHRwb3NpdGlvbiArPSA0O1xuXHRcdFx0fVxuXHRcdFx0aWYgKGVuY29kZXIua2V5TWFwKSBmb3IgKGxldCBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdGVuY29kZShlbmNvZGVyLmVuY29kZUtleShrZXlzW2ldKSk7XG5cdFx0XHRcdGVuY29kZSh2YWxzW2ldKTtcblx0XHRcdH1cblx0XHRcdGVsc2UgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuXHRcdFx0XHRlbmNvZGUoa2V5c1tpXSk7XG5cdFx0XHRcdGVuY29kZSh2YWxzW2ldKTtcblx0XHRcdH1cblx0XHR9IDogKG9iamVjdCkgPT4ge1xuXHRcdFx0dGFyZ2V0W3Bvc2l0aW9uKytdID0gMTg1O1xuXHRcdFx0bGV0IG9iamVjdE9mZnNldCA9IHBvc2l0aW9uIC0gc3RhcnQ7XG5cdFx0XHRwb3NpdGlvbiArPSAyO1xuXHRcdFx0bGV0IHNpemUgPSAwO1xuXHRcdFx0aWYgKGVuY29kZXIua2V5TWFwKSB7XG5cdFx0XHRcdGZvciAobGV0IGtleSBpbiBvYmplY3QpIGlmICh0eXBlb2Ygb2JqZWN0Lmhhc093blByb3BlcnR5ICE9PSBcImZ1bmN0aW9uXCIgfHwgb2JqZWN0Lmhhc093blByb3BlcnR5KGtleSkpIHtcblx0XHRcdFx0XHRlbmNvZGUoZW5jb2Rlci5lbmNvZGVLZXkoa2V5KSk7XG5cdFx0XHRcdFx0ZW5jb2RlKG9iamVjdFtrZXldKTtcblx0XHRcdFx0XHRzaXplKys7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSBmb3IgKGxldCBrZXkgaW4gb2JqZWN0KSBpZiAodHlwZW9mIG9iamVjdC5oYXNPd25Qcm9wZXJ0eSAhPT0gXCJmdW5jdGlvblwiIHx8IG9iamVjdC5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG5cdFx0XHRcdGVuY29kZShrZXkpO1xuXHRcdFx0XHRlbmNvZGUob2JqZWN0W2tleV0pO1xuXHRcdFx0XHRzaXplKys7XG5cdFx0XHR9XG5cdFx0XHR0YXJnZXRbb2JqZWN0T2Zmc2V0KysgKyBzdGFydF0gPSBzaXplID4+IDg7XG5cdFx0XHR0YXJnZXRbb2JqZWN0T2Zmc2V0ICsgc3RhcnRdID0gc2l6ZSAmIDI1NTtcblx0XHR9IDogKG9iamVjdCwgc2tpcFZhbHVlcykgPT4ge1xuXHRcdFx0bGV0IG5leHRUcmFuc2l0aW9uLCB0cmFuc2l0aW9uID0gc3RydWN0dXJlcy50cmFuc2l0aW9ucyB8fCAoc3RydWN0dXJlcy50cmFuc2l0aW9ucyA9IE9iamVjdC5jcmVhdGUobnVsbCkpO1xuXHRcdFx0bGV0IG5ld1RyYW5zaXRpb25zID0gMDtcblx0XHRcdGxldCBsZW5ndGggPSAwO1xuXHRcdFx0bGV0IHBhcmVudFJlY29yZElkO1xuXHRcdFx0bGV0IGtleXM7XG5cdFx0XHRpZiAodGhpcy5rZXlNYXApIHtcblx0XHRcdFx0a2V5cyA9IE9iamVjdC5rZXlzKG9iamVjdCkubWFwKChrKSA9PiB0aGlzLmVuY29kZUtleShrKSk7XG5cdFx0XHRcdGxlbmd0aCA9IGtleXMubGVuZ3RoO1xuXHRcdFx0XHRmb3IgKGxldCBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdFx0bGV0IGtleSA9IGtleXNbaV07XG5cdFx0XHRcdFx0bmV4dFRyYW5zaXRpb24gPSB0cmFuc2l0aW9uW2tleV07XG5cdFx0XHRcdFx0aWYgKCFuZXh0VHJhbnNpdGlvbikge1xuXHRcdFx0XHRcdFx0bmV4dFRyYW5zaXRpb24gPSB0cmFuc2l0aW9uW2tleV0gPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuXHRcdFx0XHRcdFx0bmV3VHJhbnNpdGlvbnMrKztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0dHJhbnNpdGlvbiA9IG5leHRUcmFuc2l0aW9uO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2UgZm9yIChsZXQga2V5IGluIG9iamVjdCkgaWYgKHR5cGVvZiBvYmplY3QuaGFzT3duUHJvcGVydHkgIT09IFwiZnVuY3Rpb25cIiB8fCBvYmplY3QuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuXHRcdFx0XHRuZXh0VHJhbnNpdGlvbiA9IHRyYW5zaXRpb25ba2V5XTtcblx0XHRcdFx0aWYgKCFuZXh0VHJhbnNpdGlvbikge1xuXHRcdFx0XHRcdGlmICh0cmFuc2l0aW9uW1JFQ09SRF9TWU1CT0xdICYgMTA0ODU3NikgcGFyZW50UmVjb3JkSWQgPSB0cmFuc2l0aW9uW1JFQ09SRF9TWU1CT0xdICYgNjU1MzU7XG5cdFx0XHRcdFx0bmV4dFRyYW5zaXRpb24gPSB0cmFuc2l0aW9uW2tleV0gPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuXHRcdFx0XHRcdG5ld1RyYW5zaXRpb25zKys7XG5cdFx0XHRcdH1cblx0XHRcdFx0dHJhbnNpdGlvbiA9IG5leHRUcmFuc2l0aW9uO1xuXHRcdFx0XHRsZW5ndGgrKztcblx0XHRcdH1cblx0XHRcdGxldCByZWNvcmRJZCA9IHRyYW5zaXRpb25bUkVDT1JEX1NZTUJPTF07XG5cdFx0XHRpZiAocmVjb3JkSWQgIT09IHZvaWQgMCkge1xuXHRcdFx0XHRyZWNvcmRJZCAmPSA2NTUzNTtcblx0XHRcdFx0dGFyZ2V0W3Bvc2l0aW9uKytdID0gMjE3O1xuXHRcdFx0XHR0YXJnZXRbcG9zaXRpb24rK10gPSByZWNvcmRJZCA+PiA4IHwgMjI0O1xuXHRcdFx0XHR0YXJnZXRbcG9zaXRpb24rK10gPSByZWNvcmRJZCAmIDI1NTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGlmICgha2V5cykga2V5cyA9IHRyYW5zaXRpb24uX19rZXlzX18gfHwgKHRyYW5zaXRpb24uX19rZXlzX18gPSBPYmplY3Qua2V5cyhvYmplY3QpKTtcblx0XHRcdFx0aWYgKHBhcmVudFJlY29yZElkID09PSB2b2lkIDApIHtcblx0XHRcdFx0XHRyZWNvcmRJZCA9IHN0cnVjdHVyZXMubmV4dElkKys7XG5cdFx0XHRcdFx0aWYgKCFyZWNvcmRJZCkge1xuXHRcdFx0XHRcdFx0cmVjb3JkSWQgPSAwO1xuXHRcdFx0XHRcdFx0c3RydWN0dXJlcy5uZXh0SWQgPSAxO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAocmVjb3JkSWQgPj0gTUFYX1NUUlVDVFVSRVMpIHN0cnVjdHVyZXMubmV4dElkID0gKHJlY29yZElkID0gbWF4U2hhcmVkU3RydWN0dXJlcykgKyAxO1xuXHRcdFx0XHR9IGVsc2UgcmVjb3JkSWQgPSBwYXJlbnRSZWNvcmRJZDtcblx0XHRcdFx0c3RydWN0dXJlc1tyZWNvcmRJZF0gPSBrZXlzO1xuXHRcdFx0XHRpZiAocmVjb3JkSWQgPCBtYXhTaGFyZWRTdHJ1Y3R1cmVzKSB7XG5cdFx0XHRcdFx0dGFyZ2V0W3Bvc2l0aW9uKytdID0gMjE3O1xuXHRcdFx0XHRcdHRhcmdldFtwb3NpdGlvbisrXSA9IHJlY29yZElkID4+IDggfCAyMjQ7XG5cdFx0XHRcdFx0dGFyZ2V0W3Bvc2l0aW9uKytdID0gcmVjb3JkSWQgJiAyNTU7XG5cdFx0XHRcdFx0dHJhbnNpdGlvbiA9IHN0cnVjdHVyZXMudHJhbnNpdGlvbnM7XG5cdFx0XHRcdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuXHRcdFx0XHRcdFx0aWYgKHRyYW5zaXRpb25bUkVDT1JEX1NZTUJPTF0gPT09IHZvaWQgMCB8fCB0cmFuc2l0aW9uW1JFQ09SRF9TWU1CT0xdICYgMTA0ODU3NikgdHJhbnNpdGlvbltSRUNPUkRfU1lNQk9MXSA9IHJlY29yZElkO1xuXHRcdFx0XHRcdFx0dHJhbnNpdGlvbiA9IHRyYW5zaXRpb25ba2V5c1tpXV07XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHRyYW5zaXRpb25bUkVDT1JEX1NZTUJPTF0gPSByZWNvcmRJZCB8IDEwNDg1NzY7XG5cdFx0XHRcdFx0aGFzU2hhcmVkVXBkYXRlID0gdHJ1ZTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHR0cmFuc2l0aW9uW1JFQ09SRF9TWU1CT0xdID0gcmVjb3JkSWQ7XG5cdFx0XHRcdFx0dGFyZ2V0Vmlldy5zZXRVaW50MzIocG9zaXRpb24sIDM2NTUzMzU2ODApO1xuXHRcdFx0XHRcdHBvc2l0aW9uICs9IDM7XG5cdFx0XHRcdFx0aWYgKG5ld1RyYW5zaXRpb25zKSB0cmFuc2l0aW9uc0NvdW50ICs9IHNlcmlhbGl6YXRpb25zU2luY2VUcmFuc2l0aW9uUmVidWlsZCAqIG5ld1RyYW5zaXRpb25zO1xuXHRcdFx0XHRcdGlmIChyZWNvcmRJZHNUb1JlbW92ZS5sZW5ndGggPj0gTUFYX1NUUlVDVFVSRVMgLSBtYXhTaGFyZWRTdHJ1Y3R1cmVzKSByZWNvcmRJZHNUb1JlbW92ZS5zaGlmdCgpW1JFQ09SRF9TWU1CT0xdID0gdm9pZCAwO1xuXHRcdFx0XHRcdHJlY29yZElkc1RvUmVtb3ZlLnB1c2godHJhbnNpdGlvbik7XG5cdFx0XHRcdFx0d3JpdGVBcnJheUhlYWRlcihsZW5ndGggKyAyKTtcblx0XHRcdFx0XHRlbmNvZGUoNTczNDQgKyByZWNvcmRJZCk7XG5cdFx0XHRcdFx0ZW5jb2RlKGtleXMpO1xuXHRcdFx0XHRcdGlmIChza2lwVmFsdWVzKSByZXR1cm47XG5cdFx0XHRcdFx0Zm9yIChsZXQga2V5IGluIG9iamVjdCkgaWYgKHR5cGVvZiBvYmplY3QuaGFzT3duUHJvcGVydHkgIT09IFwiZnVuY3Rpb25cIiB8fCBvYmplY3QuaGFzT3duUHJvcGVydHkoa2V5KSkgZW5jb2RlKG9iamVjdFtrZXldKTtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGlmIChsZW5ndGggPCAyNCkgdGFyZ2V0W3Bvc2l0aW9uKytdID0gMTI4IHwgbGVuZ3RoO1xuXHRcdFx0ZWxzZSB3cml0ZUFycmF5SGVhZGVyKGxlbmd0aCk7XG5cdFx0XHRpZiAoc2tpcFZhbHVlcykgcmV0dXJuO1xuXHRcdFx0Zm9yIChsZXQga2V5IGluIG9iamVjdCkgaWYgKHR5cGVvZiBvYmplY3QuaGFzT3duUHJvcGVydHkgIT09IFwiZnVuY3Rpb25cIiB8fCBvYmplY3QuaGFzT3duUHJvcGVydHkoa2V5KSkgZW5jb2RlKG9iamVjdFtrZXldKTtcblx0XHR9O1xuXHRcdGNvbnN0IG1ha2VSb29tID0gKGVuZCkgPT4ge1xuXHRcdFx0bGV0IG5ld1NpemU7XG5cdFx0XHRpZiAoZW5kID4gMTY3NzcyMTYpIHtcblx0XHRcdFx0aWYgKGVuZCAtIHN0YXJ0ID4gTUFYX0JVRkZFUl9TSVpFKSB0aHJvdyBuZXcgRXJyb3IoXCJFbmNvZGVkIGJ1ZmZlciB3b3VsZCBiZSBsYXJnZXIgdGhhbiBtYXhpbXVtIGJ1ZmZlciBzaXplXCIpO1xuXHRcdFx0XHRuZXdTaXplID0gTWF0aC5taW4oTUFYX0JVRkZFUl9TSVpFLCBNYXRoLnJvdW5kKE1hdGgubWF4KChlbmQgLSBzdGFydCkgKiAoZW5kID4gNjcxMDg4NjQgPyAxLjI1IDogMiksIDQxOTQzMDQpIC8gNDA5NikgKiA0MDk2KTtcblx0XHRcdH0gZWxzZSBuZXdTaXplID0gKE1hdGgubWF4KGVuZCAtIHN0YXJ0IDw8IDIsIHRhcmdldC5sZW5ndGggLSAxKSA+PiAxMikgKyAxIDw8IDEyO1xuXHRcdFx0bGV0IG5ld0J1ZmZlciA9IG5ldyBCeXRlQXJyYXlBbGxvY2F0ZShuZXdTaXplKTtcblx0XHRcdHRhcmdldFZpZXcgPSBuZXcgRGF0YVZpZXcobmV3QnVmZmVyLmJ1ZmZlciwgMCwgbmV3U2l6ZSk7XG5cdFx0XHRpZiAodGFyZ2V0LmNvcHkpIHRhcmdldC5jb3B5KG5ld0J1ZmZlciwgMCwgc3RhcnQsIGVuZCk7XG5cdFx0XHRlbHNlIG5ld0J1ZmZlci5zZXQodGFyZ2V0LnNsaWNlKHN0YXJ0LCBlbmQpKTtcblx0XHRcdHBvc2l0aW9uIC09IHN0YXJ0O1xuXHRcdFx0c3RhcnQgPSAwO1xuXHRcdFx0c2FmZUVuZCA9IG5ld0J1ZmZlci5sZW5ndGggLSAxMDtcblx0XHRcdHJldHVybiB0YXJnZXQgPSBuZXdCdWZmZXI7XG5cdFx0fTtcblx0XHRsZXQgY2h1bmtUaHJlc2hvbGQgPSAxMDA7XG5cdFx0bGV0IGNvbnRpbnVlZENodW5rVGhyZXNob2xkID0gMWUzO1xuXHRcdHRoaXMuZW5jb2RlQXNJdGVyYWJsZSA9IGZ1bmN0aW9uKHZhbHVlLCBvcHRpb25zKSB7XG5cdFx0XHRyZXR1cm4gc3RhcnRFbmNvZGluZyh2YWx1ZSwgb3B0aW9ucywgZW5jb2RlT2JqZWN0QXNJdGVyYWJsZSk7XG5cdFx0fTtcblx0XHR0aGlzLmVuY29kZUFzQXN5bmNJdGVyYWJsZSA9IGZ1bmN0aW9uKHZhbHVlLCBvcHRpb25zKSB7XG5cdFx0XHRyZXR1cm4gc3RhcnRFbmNvZGluZyh2YWx1ZSwgb3B0aW9ucywgZW5jb2RlT2JqZWN0QXNBc3luY0l0ZXJhYmxlKTtcblx0XHR9O1xuXHRcdGZ1bmN0aW9uKiBlbmNvZGVPYmplY3RBc0l0ZXJhYmxlKG9iamVjdCwgaXRlcmF0ZVByb3BlcnRpZXMsIGZpbmFsSXRlcmFibGUpIHtcblx0XHRcdGxldCBjb25zdHJ1Y3RvciA9IG9iamVjdC5jb25zdHJ1Y3Rvcjtcblx0XHRcdGlmIChjb25zdHJ1Y3RvciA9PT0gT2JqZWN0KSB7XG5cdFx0XHRcdGxldCB1c2VSZWNvcmRzID0gZW5jb2Rlci51c2VSZWNvcmRzICE9PSBmYWxzZTtcblx0XHRcdFx0aWYgKHVzZVJlY29yZHMpIHdyaXRlT2JqZWN0KG9iamVjdCwgdHJ1ZSk7XG5cdFx0XHRcdGVsc2Ugd3JpdGVFbnRpdHlMZW5ndGgoT2JqZWN0LmtleXMob2JqZWN0KS5sZW5ndGgsIDE2MCk7XG5cdFx0XHRcdGZvciAobGV0IGtleSBpbiBvYmplY3QpIHtcblx0XHRcdFx0XHRsZXQgdmFsdWUgPSBvYmplY3Rba2V5XTtcblx0XHRcdFx0XHRpZiAoIXVzZVJlY29yZHMpIGVuY29kZShrZXkpO1xuXHRcdFx0XHRcdGlmICh2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT09IFwib2JqZWN0XCIpIHtcblx0XHRcdFx0XHRcdGlmIChpdGVyYXRlUHJvcGVydGllc1trZXldKSB5aWVsZCogZW5jb2RlT2JqZWN0QXNJdGVyYWJsZSh2YWx1ZSwgaXRlcmF0ZVByb3BlcnRpZXNba2V5XSk7XG5cdFx0XHRcdFx0XHRlbHNlIHlpZWxkKiB0cnlFbmNvZGUodmFsdWUsIGl0ZXJhdGVQcm9wZXJ0aWVzLCBrZXkpO1xuXHRcdFx0XHRcdH0gZWxzZSBlbmNvZGUodmFsdWUpO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2UgaWYgKGNvbnN0cnVjdG9yID09PSBBcnJheSkge1xuXHRcdFx0XHRsZXQgbGVuZ3RoID0gb2JqZWN0Lmxlbmd0aDtcblx0XHRcdFx0d3JpdGVBcnJheUhlYWRlcihsZW5ndGgpO1xuXHRcdFx0XHRmb3IgKGxldCBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdFx0bGV0IHZhbHVlID0gb2JqZWN0W2ldO1xuXHRcdFx0XHRcdGlmICh2YWx1ZSAmJiAodHlwZW9mIHZhbHVlID09PSBcIm9iamVjdFwiIHx8IHBvc2l0aW9uIC0gc3RhcnQgPiBjaHVua1RocmVzaG9sZCkpIHtcblx0XHRcdFx0XHRcdGlmIChpdGVyYXRlUHJvcGVydGllcy5lbGVtZW50KSB5aWVsZCogZW5jb2RlT2JqZWN0QXNJdGVyYWJsZSh2YWx1ZSwgaXRlcmF0ZVByb3BlcnRpZXMuZWxlbWVudCk7XG5cdFx0XHRcdFx0XHRlbHNlIHlpZWxkKiB0cnlFbmNvZGUodmFsdWUsIGl0ZXJhdGVQcm9wZXJ0aWVzLCBcImVsZW1lbnRcIik7XG5cdFx0XHRcdFx0fSBlbHNlIGVuY29kZSh2YWx1ZSk7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSBpZiAob2JqZWN0W1N5bWJvbC5pdGVyYXRvcl0gJiYgIW9iamVjdC5idWZmZXIpIHtcblx0XHRcdFx0dGFyZ2V0W3Bvc2l0aW9uKytdID0gMTU5O1xuXHRcdFx0XHRmb3IgKGxldCB2YWx1ZSBvZiBvYmplY3QpIGlmICh2YWx1ZSAmJiAodHlwZW9mIHZhbHVlID09PSBcIm9iamVjdFwiIHx8IHBvc2l0aW9uIC0gc3RhcnQgPiBjaHVua1RocmVzaG9sZCkpIHtcblx0XHRcdFx0XHRpZiAoaXRlcmF0ZVByb3BlcnRpZXMuZWxlbWVudCkgeWllbGQqIGVuY29kZU9iamVjdEFzSXRlcmFibGUodmFsdWUsIGl0ZXJhdGVQcm9wZXJ0aWVzLmVsZW1lbnQpO1xuXHRcdFx0XHRcdGVsc2UgeWllbGQqIHRyeUVuY29kZSh2YWx1ZSwgaXRlcmF0ZVByb3BlcnRpZXMsIFwiZWxlbWVudFwiKTtcblx0XHRcdFx0fSBlbHNlIGVuY29kZSh2YWx1ZSk7XG5cdFx0XHRcdHRhcmdldFtwb3NpdGlvbisrXSA9IDI1NTtcblx0XHRcdH0gZWxzZSBpZiAoaXNCbG9iKG9iamVjdCkpIHtcblx0XHRcdFx0d3JpdGVFbnRpdHlMZW5ndGgob2JqZWN0LnNpemUsIDY0KTtcblx0XHRcdFx0eWllbGQgdGFyZ2V0LnN1YmFycmF5KHN0YXJ0LCBwb3NpdGlvbik7XG5cdFx0XHRcdHlpZWxkIG9iamVjdDtcblx0XHRcdFx0cmVzdGFydEVuY29kaW5nKCk7XG5cdFx0XHR9IGVsc2UgaWYgKG9iamVjdFtTeW1ib2wuYXN5bmNJdGVyYXRvcl0pIHtcblx0XHRcdFx0dGFyZ2V0W3Bvc2l0aW9uKytdID0gMTU5O1xuXHRcdFx0XHR5aWVsZCB0YXJnZXQuc3ViYXJyYXkoc3RhcnQsIHBvc2l0aW9uKTtcblx0XHRcdFx0eWllbGQgb2JqZWN0O1xuXHRcdFx0XHRyZXN0YXJ0RW5jb2RpbmcoKTtcblx0XHRcdFx0dGFyZ2V0W3Bvc2l0aW9uKytdID0gMjU1O1xuXHRcdFx0fSBlbHNlIGVuY29kZShvYmplY3QpO1xuXHRcdFx0aWYgKGZpbmFsSXRlcmFibGUgJiYgcG9zaXRpb24gPiBzdGFydCkgeWllbGQgdGFyZ2V0LnN1YmFycmF5KHN0YXJ0LCBwb3NpdGlvbik7XG5cdFx0XHRlbHNlIGlmIChwb3NpdGlvbiAtIHN0YXJ0ID4gY2h1bmtUaHJlc2hvbGQpIHtcblx0XHRcdFx0eWllbGQgdGFyZ2V0LnN1YmFycmF5KHN0YXJ0LCBwb3NpdGlvbik7XG5cdFx0XHRcdHJlc3RhcnRFbmNvZGluZygpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRmdW5jdGlvbiogdHJ5RW5jb2RlKHZhbHVlLCBpdGVyYXRlUHJvcGVydGllcywga2V5KSB7XG5cdFx0XHRsZXQgcmVzdGFydCA9IHBvc2l0aW9uIC0gc3RhcnQ7XG5cdFx0XHR0cnkge1xuXHRcdFx0XHRlbmNvZGUodmFsdWUpO1xuXHRcdFx0XHRpZiAocG9zaXRpb24gLSBzdGFydCA+IGNodW5rVGhyZXNob2xkKSB7XG5cdFx0XHRcdFx0eWllbGQgdGFyZ2V0LnN1YmFycmF5KHN0YXJ0LCBwb3NpdGlvbik7XG5cdFx0XHRcdFx0cmVzdGFydEVuY29kaW5nKCk7XG5cdFx0XHRcdH1cblx0XHRcdH0gY2F0Y2ggKGVycm9yKSB7XG5cdFx0XHRcdGlmIChlcnJvci5pdGVyYXRvck5vdEhhbmRsZWQpIHtcblx0XHRcdFx0XHRpdGVyYXRlUHJvcGVydGllc1trZXldID0ge307XG5cdFx0XHRcdFx0cG9zaXRpb24gPSBzdGFydCArIHJlc3RhcnQ7XG5cdFx0XHRcdFx0eWllbGQqIGVuY29kZU9iamVjdEFzSXRlcmFibGUuY2FsbCh0aGlzLCB2YWx1ZSwgaXRlcmF0ZVByb3BlcnRpZXNba2V5XSk7XG5cdFx0XHRcdH0gZWxzZSB0aHJvdyBlcnJvcjtcblx0XHRcdH1cblx0XHR9XG5cdFx0ZnVuY3Rpb24gcmVzdGFydEVuY29kaW5nKCkge1xuXHRcdFx0Y2h1bmtUaHJlc2hvbGQgPSBjb250aW51ZWRDaHVua1RocmVzaG9sZDtcblx0XHRcdGVuY29kZXIuZW5jb2RlKG51bGwsIFRIUk9XX09OX0lURVJBQkxFKTtcblx0XHR9XG5cdFx0ZnVuY3Rpb24gc3RhcnRFbmNvZGluZyh2YWx1ZSwgb3B0aW9ucywgZW5jb2RlSXRlcmFibGUpIHtcblx0XHRcdGlmIChvcHRpb25zICYmIG9wdGlvbnMuY2h1bmtUaHJlc2hvbGQpIGNodW5rVGhyZXNob2xkID0gY29udGludWVkQ2h1bmtUaHJlc2hvbGQgPSBvcHRpb25zLmNodW5rVGhyZXNob2xkO1xuXHRcdFx0ZWxzZSBjaHVua1RocmVzaG9sZCA9IDEwMDtcblx0XHRcdGlmICh2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT09IFwib2JqZWN0XCIpIHtcblx0XHRcdFx0ZW5jb2Rlci5lbmNvZGUobnVsbCwgVEhST1dfT05fSVRFUkFCTEUpO1xuXHRcdFx0XHRyZXR1cm4gZW5jb2RlSXRlcmFibGUodmFsdWUsIGVuY29kZXIuaXRlcmF0ZVByb3BlcnRpZXMgfHwgKGVuY29kZXIuaXRlcmF0ZVByb3BlcnRpZXMgPSB7fSksIHRydWUpO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIFtlbmNvZGVyLmVuY29kZSh2YWx1ZSldO1xuXHRcdH1cblx0XHRhc3luYyBmdW5jdGlvbiogZW5jb2RlT2JqZWN0QXNBc3luY0l0ZXJhYmxlKHZhbHVlLCBpdGVyYXRlUHJvcGVydGllcykge1xuXHRcdFx0Zm9yIChsZXQgZW5jb2RlZFZhbHVlIG9mIGVuY29kZU9iamVjdEFzSXRlcmFibGUodmFsdWUsIGl0ZXJhdGVQcm9wZXJ0aWVzLCB0cnVlKSkge1xuXHRcdFx0XHRsZXQgY29uc3RydWN0b3IgPSBlbmNvZGVkVmFsdWUuY29uc3RydWN0b3I7XG5cdFx0XHRcdGlmIChjb25zdHJ1Y3RvciA9PT0gQnl0ZUFycmF5IHx8IGNvbnN0cnVjdG9yID09PSBVaW50OEFycmF5KSB5aWVsZCBlbmNvZGVkVmFsdWU7XG5cdFx0XHRcdGVsc2UgaWYgKGlzQmxvYihlbmNvZGVkVmFsdWUpKSB7XG5cdFx0XHRcdFx0bGV0IHJlYWRlciA9IGVuY29kZWRWYWx1ZS5zdHJlYW0oKS5nZXRSZWFkZXIoKTtcblx0XHRcdFx0XHRsZXQgbmV4dDtcblx0XHRcdFx0XHR3aGlsZSAoIShuZXh0ID0gYXdhaXQgcmVhZGVyLnJlYWQoKSkuZG9uZSkgeWllbGQgbmV4dC52YWx1ZTtcblx0XHRcdFx0fSBlbHNlIGlmIChlbmNvZGVkVmFsdWVbU3ltYm9sLmFzeW5jSXRlcmF0b3JdKSBmb3IgYXdhaXQgKGxldCBhc3luY1ZhbHVlIG9mIGVuY29kZWRWYWx1ZSkge1xuXHRcdFx0XHRcdHJlc3RhcnRFbmNvZGluZygpO1xuXHRcdFx0XHRcdGlmIChhc3luY1ZhbHVlKSB5aWVsZCogZW5jb2RlT2JqZWN0QXNBc3luY0l0ZXJhYmxlKGFzeW5jVmFsdWUsIGl0ZXJhdGVQcm9wZXJ0aWVzLmFzeW5jIHx8IChpdGVyYXRlUHJvcGVydGllcy5hc3luYyA9IHt9KSk7XG5cdFx0XHRcdFx0ZWxzZSB5aWVsZCBlbmNvZGVyLmVuY29kZShhc3luY1ZhbHVlKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIHlpZWxkIGVuY29kZWRWYWx1ZTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblx0dXNlQnVmZmVyKGJ1ZmZlcikge1xuXHRcdHRhcmdldCA9IGJ1ZmZlcjtcblx0XHR0YXJnZXRWaWV3ID0gbmV3IERhdGFWaWV3KHRhcmdldC5idWZmZXIsIHRhcmdldC5ieXRlT2Zmc2V0LCB0YXJnZXQuYnl0ZUxlbmd0aCk7XG5cdFx0cG9zaXRpb24gPSAwO1xuXHR9XG5cdGNsZWFyU2hhcmVkRGF0YSgpIHtcblx0XHRpZiAodGhpcy5zdHJ1Y3R1cmVzKSB0aGlzLnN0cnVjdHVyZXMgPSBbXTtcblx0XHRpZiAodGhpcy5zaGFyZWRWYWx1ZXMpIHRoaXMuc2hhcmVkVmFsdWVzID0gdm9pZCAwO1xuXHR9XG5cdHVwZGF0ZVNoYXJlZERhdGEoKSB7XG5cdFx0bGV0IGxhc3RWZXJzaW9uID0gdGhpcy5zaGFyZWRWZXJzaW9uIHx8IDA7XG5cdFx0dGhpcy5zaGFyZWRWZXJzaW9uID0gbGFzdFZlcnNpb24gKyAxO1xuXHRcdGxldCBzdHJ1Y3R1cmVzQ29weSA9IHRoaXMuc3RydWN0dXJlcy5zbGljZSgwKTtcblx0XHRsZXQgc2hhcmVkRGF0YSA9IG5ldyBTaGFyZWREYXRhKHN0cnVjdHVyZXNDb3B5LCB0aGlzLnNoYXJlZFZhbHVlcywgdGhpcy5zaGFyZWRWZXJzaW9uKTtcblx0XHRsZXQgc2F2ZVJlc3VsdHMgPSB0aGlzLnNhdmVTaGFyZWQoc2hhcmVkRGF0YSwgKGV4aXN0aW5nU2hhcmVkKSA9PiAoZXhpc3RpbmdTaGFyZWQgJiYgZXhpc3RpbmdTaGFyZWQudmVyc2lvbiB8fCAwKSA9PSBsYXN0VmVyc2lvbik7XG5cdFx0aWYgKHNhdmVSZXN1bHRzID09PSBmYWxzZSkge1xuXHRcdFx0c2hhcmVkRGF0YSA9IHRoaXMuZ2V0U2hhcmVkKCkgfHwge307XG5cdFx0XHR0aGlzLnN0cnVjdHVyZXMgPSBzaGFyZWREYXRhLnN0cnVjdHVyZXMgfHwgW107XG5cdFx0XHR0aGlzLnNoYXJlZFZhbHVlcyA9IHNoYXJlZERhdGEucGFja2VkVmFsdWVzO1xuXHRcdFx0dGhpcy5zaGFyZWRWZXJzaW9uID0gc2hhcmVkRGF0YS52ZXJzaW9uO1xuXHRcdFx0dGhpcy5zdHJ1Y3R1cmVzLm5leHRJZCA9IHRoaXMuc3RydWN0dXJlcy5sZW5ndGg7XG5cdFx0fSBlbHNlIHN0cnVjdHVyZXNDb3B5LmZvckVhY2goKHN0cnVjdHVyZSwgaSkgPT4gdGhpcy5zdHJ1Y3R1cmVzW2ldID0gc3RydWN0dXJlKTtcblx0XHRyZXR1cm4gc2F2ZVJlc3VsdHM7XG5cdH1cbn07XG5mdW5jdGlvbiB3cml0ZUVudGl0eUxlbmd0aChsZW5ndGgsIG1ham9yVmFsdWUpIHtcblx0aWYgKGxlbmd0aCA8IDI0KSB0YXJnZXRbcG9zaXRpb24rK10gPSBtYWpvclZhbHVlIHwgbGVuZ3RoO1xuXHRlbHNlIGlmIChsZW5ndGggPCAyNTYpIHtcblx0XHR0YXJnZXRbcG9zaXRpb24rK10gPSBtYWpvclZhbHVlIHwgMjQ7XG5cdFx0dGFyZ2V0W3Bvc2l0aW9uKytdID0gbGVuZ3RoO1xuXHR9IGVsc2UgaWYgKGxlbmd0aCA8IDY1NTM2KSB7XG5cdFx0dGFyZ2V0W3Bvc2l0aW9uKytdID0gbWFqb3JWYWx1ZSB8IDI1O1xuXHRcdHRhcmdldFtwb3NpdGlvbisrXSA9IGxlbmd0aCA+PiA4O1xuXHRcdHRhcmdldFtwb3NpdGlvbisrXSA9IGxlbmd0aCAmIDI1NTtcblx0fSBlbHNlIHtcblx0XHR0YXJnZXRbcG9zaXRpb24rK10gPSBtYWpvclZhbHVlIHwgMjY7XG5cdFx0dGFyZ2V0Vmlldy5zZXRVaW50MzIocG9zaXRpb24sIGxlbmd0aCk7XG5cdFx0cG9zaXRpb24gKz0gNDtcblx0fVxufVxudmFyIFNoYXJlZERhdGEgPSBjbGFzcyB7XG5cdGNvbnN0cnVjdG9yKHN0cnVjdHVyZXMsIHZhbHVlcywgdmVyc2lvbikge1xuXHRcdHRoaXMuc3RydWN0dXJlcyA9IHN0cnVjdHVyZXM7XG5cdFx0dGhpcy5wYWNrZWRWYWx1ZXMgPSB2YWx1ZXM7XG5cdFx0dGhpcy52ZXJzaW9uID0gdmVyc2lvbjtcblx0fVxufTtcbmZ1bmN0aW9uIHdyaXRlQXJyYXlIZWFkZXIobGVuZ3RoKSB7XG5cdGlmIChsZW5ndGggPCAyNCkgdGFyZ2V0W3Bvc2l0aW9uKytdID0gMTI4IHwgbGVuZ3RoO1xuXHRlbHNlIGlmIChsZW5ndGggPCAyNTYpIHtcblx0XHR0YXJnZXRbcG9zaXRpb24rK10gPSAxNTI7XG5cdFx0dGFyZ2V0W3Bvc2l0aW9uKytdID0gbGVuZ3RoO1xuXHR9IGVsc2UgaWYgKGxlbmd0aCA8IDY1NTM2KSB7XG5cdFx0dGFyZ2V0W3Bvc2l0aW9uKytdID0gMTUzO1xuXHRcdHRhcmdldFtwb3NpdGlvbisrXSA9IGxlbmd0aCA+PiA4O1xuXHRcdHRhcmdldFtwb3NpdGlvbisrXSA9IGxlbmd0aCAmIDI1NTtcblx0fSBlbHNlIHtcblx0XHR0YXJnZXRbcG9zaXRpb24rK10gPSAxNTQ7XG5cdFx0dGFyZ2V0Vmlldy5zZXRVaW50MzIocG9zaXRpb24sIGxlbmd0aCk7XG5cdFx0cG9zaXRpb24gKz0gNDtcblx0fVxufVxudmFyIEJsb2JDb25zdHJ1Y3RvciA9IHR5cGVvZiBCbG9iID09PSBcInVuZGVmaW5lZFwiID8gZnVuY3Rpb24oKSB7fSA6IEJsb2I7XG5mdW5jdGlvbiBpc0Jsb2Iob2JqZWN0KSB7XG5cdGlmIChvYmplY3QgaW5zdGFuY2VvZiBCbG9iQ29uc3RydWN0b3IpIHJldHVybiB0cnVlO1xuXHRsZXQgdGFnID0gb2JqZWN0W1N5bWJvbC50b1N0cmluZ1RhZ107XG5cdHJldHVybiB0YWcgPT09IFwiQmxvYlwiIHx8IHRhZyA9PT0gXCJGaWxlXCI7XG59XG5mdW5jdGlvbiBmaW5kUmVwZXRpdGl2ZVN0cmluZ3ModmFsdWUsIHBhY2tlZFZhbHVlcykge1xuXHRzd2l0Y2ggKHR5cGVvZiB2YWx1ZSkge1xuXHRcdGNhc2UgXCJzdHJpbmdcIjpcblx0XHRcdGlmICh2YWx1ZS5sZW5ndGggPiAzKSB7XG5cdFx0XHRcdGlmIChwYWNrZWRWYWx1ZXMub2JqZWN0TWFwW3ZhbHVlXSA+IC0xIHx8IHBhY2tlZFZhbHVlcy52YWx1ZXMubGVuZ3RoID49IHBhY2tlZFZhbHVlcy5tYXhWYWx1ZXMpIHJldHVybjtcblx0XHRcdFx0bGV0IHBhY2tlZFN0YXR1cyA9IHBhY2tlZFZhbHVlcy5nZXQodmFsdWUpO1xuXHRcdFx0XHRpZiAocGFja2VkU3RhdHVzKSB7XG5cdFx0XHRcdFx0aWYgKCsrcGFja2VkU3RhdHVzLmNvdW50ID09IDIpIHBhY2tlZFZhbHVlcy52YWx1ZXMucHVzaCh2YWx1ZSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0cGFja2VkVmFsdWVzLnNldCh2YWx1ZSwgeyBjb3VudDogMSB9KTtcblx0XHRcdFx0XHRpZiAocGFja2VkVmFsdWVzLnNhbXBsaW5nUGFja2VkVmFsdWVzKSB7XG5cdFx0XHRcdFx0XHRsZXQgc3RhdHVzID0gcGFja2VkVmFsdWVzLnNhbXBsaW5nUGFja2VkVmFsdWVzLmdldCh2YWx1ZSk7XG5cdFx0XHRcdFx0XHRpZiAoc3RhdHVzKSBzdGF0dXMuY291bnQrKztcblx0XHRcdFx0XHRcdGVsc2UgcGFja2VkVmFsdWVzLnNhbXBsaW5nUGFja2VkVmFsdWVzLnNldCh2YWx1ZSwgeyBjb3VudDogMSB9KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGJyZWFrO1xuXHRcdGNhc2UgXCJvYmplY3RcIjpcblx0XHRcdGlmICh2YWx1ZSkge1xuXHRcdFx0XHRpZiAodmFsdWUgaW5zdGFuY2VvZiBBcnJheSkgZm9yIChsZXQgaSA9IDAsIGwgPSB2YWx1ZS5sZW5ndGg7IGkgPCBsOyBpKyspIGZpbmRSZXBldGl0aXZlU3RyaW5ncyh2YWx1ZVtpXSwgcGFja2VkVmFsdWVzKTtcblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0bGV0IGluY2x1ZGVLZXlzID0gIXBhY2tlZFZhbHVlcy5lbmNvZGVyLnVzZVJlY29yZHM7XG5cdFx0XHRcdFx0Zm9yICh2YXIga2V5IGluIHZhbHVlKSBpZiAodmFsdWUuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuXHRcdFx0XHRcdFx0aWYgKGluY2x1ZGVLZXlzKSBmaW5kUmVwZXRpdGl2ZVN0cmluZ3Moa2V5LCBwYWNrZWRWYWx1ZXMpO1xuXHRcdFx0XHRcdFx0ZmluZFJlcGV0aXRpdmVTdHJpbmdzKHZhbHVlW2tleV0sIHBhY2tlZFZhbHVlcyk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRicmVhaztcblx0XHRjYXNlIFwiZnVuY3Rpb25cIjogY29uc29sZS5sb2codmFsdWUpO1xuXHR9XG59XG52YXIgaXNMaXR0bGVFbmRpYW5NYWNoaW5lID0gbmV3IFVpbnQ4QXJyYXkobmV3IFVpbnQxNkFycmF5KFsxXSkuYnVmZmVyKVswXSA9PSAxO1xuZXh0ZW5zaW9uQ2xhc3NlcyA9IFtcblx0RGF0ZSxcblx0U2V0LFxuXHRFcnJvcixcblx0UmVnRXhwLFxuXHRUYWcsXG5cdEFycmF5QnVmZmVyLFxuXHRVaW50OEFycmF5LFxuXHRVaW50OENsYW1wZWRBcnJheSxcblx0VWludDE2QXJyYXksXG5cdFVpbnQzMkFycmF5LFxuXHR0eXBlb2YgQmlnVWludDY0QXJyYXkgPT0gXCJ1bmRlZmluZWRcIiA/IGZ1bmN0aW9uKCkge30gOiBCaWdVaW50NjRBcnJheSxcblx0SW50OEFycmF5LFxuXHRJbnQxNkFycmF5LFxuXHRJbnQzMkFycmF5LFxuXHR0eXBlb2YgQmlnSW50NjRBcnJheSA9PSBcInVuZGVmaW5lZFwiID8gZnVuY3Rpb24oKSB7fSA6IEJpZ0ludDY0QXJyYXksXG5cdEZsb2F0MzJBcnJheSxcblx0RmxvYXQ2NEFycmF5LFxuXHRTaGFyZWREYXRhXG5dO1xuZXh0ZW5zaW9ucyA9IFtcblx0e1xuXHRcdHRhZzogMSxcblx0XHRlbmNvZGUoZGF0ZSwgZW5jb2RlKSB7XG5cdFx0XHRsZXQgc2Vjb25kcyA9IGRhdGUuZ2V0VGltZSgpIC8gMWUzO1xuXHRcdFx0aWYgKCh0aGlzLnVzZVRpbWVzdGFtcDMyIHx8IGRhdGUuZ2V0TWlsbGlzZWNvbmRzKCkgPT09IDApICYmIHNlY29uZHMgPj0gMCAmJiBzZWNvbmRzIDwgNDI5NDk2NzI5Nikge1xuXHRcdFx0XHR0YXJnZXRbcG9zaXRpb24rK10gPSAyNjtcblx0XHRcdFx0dGFyZ2V0Vmlldy5zZXRVaW50MzIocG9zaXRpb24sIHNlY29uZHMpO1xuXHRcdFx0XHRwb3NpdGlvbiArPSA0O1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGFyZ2V0W3Bvc2l0aW9uKytdID0gMjUxO1xuXHRcdFx0XHR0YXJnZXRWaWV3LnNldEZsb2F0NjQocG9zaXRpb24sIHNlY29uZHMpO1xuXHRcdFx0XHRwb3NpdGlvbiArPSA4O1xuXHRcdFx0fVxuXHRcdH1cblx0fSxcblx0e1xuXHRcdHRhZzogMjU4LFxuXHRcdGVuY29kZShzZXQsIGVuY29kZSkge1xuXHRcdFx0ZW5jb2RlKEFycmF5LmZyb20oc2V0KSk7XG5cdFx0fVxuXHR9LFxuXHR7XG5cdFx0dGFnOiAyNyxcblx0XHRlbmNvZGUoZXJyb3IsIGVuY29kZSkge1xuXHRcdFx0ZW5jb2RlKFtlcnJvci5uYW1lLCBlcnJvci5tZXNzYWdlXSk7XG5cdFx0fVxuXHR9LFxuXHR7XG5cdFx0dGFnOiAyNyxcblx0XHRlbmNvZGUocmVnZXgsIGVuY29kZSkge1xuXHRcdFx0ZW5jb2RlKFtcblx0XHRcdFx0XCJSZWdFeHBcIixcblx0XHRcdFx0cmVnZXguc291cmNlLFxuXHRcdFx0XHRyZWdleC5mbGFnc1xuXHRcdFx0XSk7XG5cdFx0fVxuXHR9LFxuXHR7XG5cdFx0Z2V0VGFnKHRhZykge1xuXHRcdFx0cmV0dXJuIHRhZy50YWc7XG5cdFx0fSxcblx0XHRlbmNvZGUodGFnLCBlbmNvZGUpIHtcblx0XHRcdGVuY29kZSh0YWcudmFsdWUpO1xuXHRcdH1cblx0fSxcblx0eyBlbmNvZGUoYXJyYXlCdWZmZXIsIGVuY29kZSwgbWFrZVJvb20pIHtcblx0XHR3cml0ZUJ1ZmZlcihhcnJheUJ1ZmZlciwgbWFrZVJvb20pO1xuXHR9IH0sXG5cdHtcblx0XHRnZXRUYWcodHlwZWRBcnJheSkge1xuXHRcdFx0aWYgKHR5cGVkQXJyYXkuY29uc3RydWN0b3IgPT09IFVpbnQ4QXJyYXkpIHtcblx0XHRcdFx0aWYgKHRoaXMudGFnVWludDhBcnJheSB8fCBoYXNOb2RlQnVmZmVyICYmIHRoaXMudGFnVWludDhBcnJheSAhPT0gZmFsc2UpIHJldHVybiA2NDtcblx0XHRcdH1cblx0XHR9LFxuXHRcdGVuY29kZSh0eXBlZEFycmF5LCBlbmNvZGUsIG1ha2VSb29tKSB7XG5cdFx0XHR3cml0ZUJ1ZmZlcih0eXBlZEFycmF5LCBtYWtlUm9vbSk7XG5cdFx0fVxuXHR9LFxuXHR0eXBlZEFycmF5RW5jb2Rlcig2OCwgMSksXG5cdHR5cGVkQXJyYXlFbmNvZGVyKDY5LCAyKSxcblx0dHlwZWRBcnJheUVuY29kZXIoNzAsIDQpLFxuXHR0eXBlZEFycmF5RW5jb2Rlcig3MSwgOCksXG5cdHR5cGVkQXJyYXlFbmNvZGVyKDcyLCAxKSxcblx0dHlwZWRBcnJheUVuY29kZXIoNzcsIDIpLFxuXHR0eXBlZEFycmF5RW5jb2Rlcig3OCwgNCksXG5cdHR5cGVkQXJyYXlFbmNvZGVyKDc5LCA4KSxcblx0dHlwZWRBcnJheUVuY29kZXIoODUsIDQpLFxuXHR0eXBlZEFycmF5RW5jb2Rlcig4NiwgOCksXG5cdHsgZW5jb2RlKHNoYXJlZERhdGEsIGVuY29kZSkge1xuXHRcdGxldCBwYWNrZWRWYWx1ZXMgPSBzaGFyZWREYXRhLnBhY2tlZFZhbHVlcyB8fCBbXTtcblx0XHRsZXQgc2hhcmVkU3RydWN0dXJlcyA9IHNoYXJlZERhdGEuc3RydWN0dXJlcyB8fCBbXTtcblx0XHRpZiAocGFja2VkVmFsdWVzLnZhbHVlcy5sZW5ndGggPiAwKSB7XG5cdFx0XHR0YXJnZXRbcG9zaXRpb24rK10gPSAyMTY7XG5cdFx0XHR0YXJnZXRbcG9zaXRpb24rK10gPSA1MTtcblx0XHRcdHdyaXRlQXJyYXlIZWFkZXIoNCk7XG5cdFx0XHRsZXQgdmFsdWVzQXJyYXkgPSBwYWNrZWRWYWx1ZXMudmFsdWVzO1xuXHRcdFx0ZW5jb2RlKHZhbHVlc0FycmF5KTtcblx0XHRcdHdyaXRlQXJyYXlIZWFkZXIoMCk7XG5cdFx0XHR3cml0ZUFycmF5SGVhZGVyKDApO1xuXHRcdFx0cGFja2VkT2JqZWN0TWFwID0gT2JqZWN0LmNyZWF0ZShzaGFyZWRQYWNrZWRPYmplY3RNYXAgfHwgbnVsbCk7XG5cdFx0XHRmb3IgKGxldCBpID0gMCwgbCA9IHZhbHVlc0FycmF5Lmxlbmd0aDsgaSA8IGw7IGkrKykgcGFja2VkT2JqZWN0TWFwW3ZhbHVlc0FycmF5W2ldXSA9IGk7XG5cdFx0fVxuXHRcdGlmIChzaGFyZWRTdHJ1Y3R1cmVzKSB7XG5cdFx0XHR0YXJnZXRWaWV3LnNldFVpbnQzMihwb3NpdGlvbiwgMzY1NTMzNTQyNCk7XG5cdFx0XHRwb3NpdGlvbiArPSAzO1xuXHRcdFx0bGV0IGRlZmluaXRpb25zID0gc2hhcmVkU3RydWN0dXJlcy5zbGljZSgwKTtcblx0XHRcdGRlZmluaXRpb25zLnVuc2hpZnQoNTczNDQpO1xuXHRcdFx0ZGVmaW5pdGlvbnMucHVzaChuZXcgVGFnKHNoYXJlZERhdGEudmVyc2lvbiwgMTM5OTM1Mzk1NikpO1xuXHRcdFx0ZW5jb2RlKGRlZmluaXRpb25zKTtcblx0XHR9IGVsc2UgZW5jb2RlKG5ldyBUYWcoc2hhcmVkRGF0YS52ZXJzaW9uLCAxMzk5MzUzOTU2KSk7XG5cdH0gfVxuXTtcbmZ1bmN0aW9uIHR5cGVkQXJyYXlFbmNvZGVyKHRhZywgc2l6ZSkge1xuXHRpZiAoIWlzTGl0dGxlRW5kaWFuTWFjaGluZSAmJiBzaXplID4gMSkgdGFnIC09IDQ7XG5cdHJldHVybiB7XG5cdFx0dGFnLFxuXHRcdGVuY29kZTogZnVuY3Rpb24gd3JpdGVFeHRCdWZmZXIodHlwZWRBcnJheSwgZW5jb2RlKSB7XG5cdFx0XHRsZXQgbGVuZ3RoID0gdHlwZWRBcnJheS5ieXRlTGVuZ3RoO1xuXHRcdFx0bGV0IG9mZnNldCA9IHR5cGVkQXJyYXkuYnl0ZU9mZnNldCB8fCAwO1xuXHRcdFx0bGV0IGJ1ZmZlciA9IHR5cGVkQXJyYXkuYnVmZmVyIHx8IHR5cGVkQXJyYXk7XG5cdFx0XHRlbmNvZGUoaGFzTm9kZUJ1ZmZlciA/IEJ1ZmZlciQxLmZyb20oYnVmZmVyLCBvZmZzZXQsIGxlbmd0aCkgOiBuZXcgVWludDhBcnJheShidWZmZXIsIG9mZnNldCwgbGVuZ3RoKSk7XG5cdFx0fVxuXHR9O1xufVxuZnVuY3Rpb24gd3JpdGVCdWZmZXIoYnVmZmVyLCBtYWtlUm9vbSkge1xuXHRsZXQgbGVuZ3RoID0gYnVmZmVyLmJ5dGVMZW5ndGg7XG5cdGlmIChsZW5ndGggPCAyNCkgdGFyZ2V0W3Bvc2l0aW9uKytdID0gNjQgKyBsZW5ndGg7XG5cdGVsc2UgaWYgKGxlbmd0aCA8IDI1Nikge1xuXHRcdHRhcmdldFtwb3NpdGlvbisrXSA9IDg4O1xuXHRcdHRhcmdldFtwb3NpdGlvbisrXSA9IGxlbmd0aDtcblx0fSBlbHNlIGlmIChsZW5ndGggPCA2NTUzNikge1xuXHRcdHRhcmdldFtwb3NpdGlvbisrXSA9IDg5O1xuXHRcdHRhcmdldFtwb3NpdGlvbisrXSA9IGxlbmd0aCA+PiA4O1xuXHRcdHRhcmdldFtwb3NpdGlvbisrXSA9IGxlbmd0aCAmIDI1NTtcblx0fSBlbHNlIHtcblx0XHR0YXJnZXRbcG9zaXRpb24rK10gPSA5MDtcblx0XHR0YXJnZXRWaWV3LnNldFVpbnQzMihwb3NpdGlvbiwgbGVuZ3RoKTtcblx0XHRwb3NpdGlvbiArPSA0O1xuXHR9XG5cdGlmIChwb3NpdGlvbiArIGxlbmd0aCA+PSB0YXJnZXQubGVuZ3RoKSBtYWtlUm9vbShwb3NpdGlvbiArIGxlbmd0aCk7XG5cdHRhcmdldC5zZXQoYnVmZmVyLmJ1ZmZlciA/IGJ1ZmZlciA6IG5ldyBVaW50OEFycmF5KGJ1ZmZlciksIHBvc2l0aW9uKTtcblx0cG9zaXRpb24gKz0gbGVuZ3RoO1xufVxuZnVuY3Rpb24gaW5zZXJ0SWRzKHNlcmlhbGl6ZWQsIGlkc1RvSW5zZXJ0KSB7XG5cdGxldCBuZXh0SWQ7XG5cdGxldCBkaXN0YW5jZVRvTW92ZSA9IGlkc1RvSW5zZXJ0Lmxlbmd0aCAqIDI7XG5cdGxldCBsYXN0RW5kID0gc2VyaWFsaXplZC5sZW5ndGggLSBkaXN0YW5jZVRvTW92ZTtcblx0aWRzVG9JbnNlcnQuc29ydCgoYSwgYikgPT4gYS5vZmZzZXQgPiBiLm9mZnNldCA/IDEgOiAtMSk7XG5cdGZvciAobGV0IGlkID0gMDsgaWQgPCBpZHNUb0luc2VydC5sZW5ndGg7IGlkKyspIHtcblx0XHRsZXQgcmVmZXJlZSA9IGlkc1RvSW5zZXJ0W2lkXTtcblx0XHRyZWZlcmVlLmlkID0gaWQ7XG5cdFx0Zm9yIChsZXQgcG9zaXRpb24gb2YgcmVmZXJlZS5yZWZlcmVuY2VzKSB7XG5cdFx0XHRzZXJpYWxpemVkW3Bvc2l0aW9uKytdID0gaWQgPj4gODtcblx0XHRcdHNlcmlhbGl6ZWRbcG9zaXRpb25dID0gaWQgJiAyNTU7XG5cdFx0fVxuXHR9XG5cdHdoaWxlIChuZXh0SWQgPSBpZHNUb0luc2VydC5wb3AoKSkge1xuXHRcdGxldCBvZmZzZXQgPSBuZXh0SWQub2Zmc2V0O1xuXHRcdHNlcmlhbGl6ZWQuY29weVdpdGhpbihvZmZzZXQgKyBkaXN0YW5jZVRvTW92ZSwgb2Zmc2V0LCBsYXN0RW5kKTtcblx0XHRkaXN0YW5jZVRvTW92ZSAtPSAyO1xuXHRcdGxldCBwb3NpdGlvbiA9IG9mZnNldCArIGRpc3RhbmNlVG9Nb3ZlO1xuXHRcdHNlcmlhbGl6ZWRbcG9zaXRpb24rK10gPSAyMTY7XG5cdFx0c2VyaWFsaXplZFtwb3NpdGlvbisrXSA9IDI4O1xuXHRcdGxhc3RFbmQgPSBvZmZzZXQ7XG5cdH1cblx0cmV0dXJuIHNlcmlhbGl6ZWQ7XG59XG5mdW5jdGlvbiB3cml0ZUJ1bmRsZXMoc3RhcnQsIGVuY29kZSkge1xuXHR0YXJnZXRWaWV3LnNldFVpbnQzMihidW5kbGVkU3RyaW5ncy5wb3NpdGlvbiArIHN0YXJ0LCBwb3NpdGlvbiAtIGJ1bmRsZWRTdHJpbmdzLnBvc2l0aW9uIC0gc3RhcnQgKyAxKTtcblx0bGV0IHdyaXRlU3RyaW5ncyA9IGJ1bmRsZWRTdHJpbmdzO1xuXHRidW5kbGVkU3RyaW5ncyA9IG51bGw7XG5cdGVuY29kZSh3cml0ZVN0cmluZ3NbMF0pO1xuXHRlbmNvZGUod3JpdGVTdHJpbmdzWzFdKTtcbn1cbnZhciBkZWZhdWx0RW5jb2RlciA9IG5ldyBFbmNvZGVyKHsgdXNlUmVjb3JkczogZmFsc2UgfSk7XG52YXIgZW5jb2RlID0gZGVmYXVsdEVuY29kZXIuZW5jb2RlO1xudmFyIGVuY29kZUFzSXRlcmFibGUgPSBkZWZhdWx0RW5jb2Rlci5lbmNvZGVBc0l0ZXJhYmxlO1xudmFyIGVuY29kZUFzQXN5bmNJdGVyYWJsZSA9IGRlZmF1bHRFbmNvZGVyLmVuY29kZUFzQXN5bmNJdGVyYWJsZTtcbnZhciB7IE5FVkVSLCBBTFdBWVMsIERFQ0lNQUxfUk9VTkQsIERFQ0lNQUxfRklUIH0gPSBGTE9BVDMyX09QVElPTlM7XG52YXIgUkVVU0VfQlVGRkVSX01PREUgPSA1MTI7XG52YXIgUkVTRVRfQlVGRkVSX01PREUgPSAxMDI0O1xudmFyIFRIUk9XX09OX0lURVJBQkxFID0gMjA0ODtcblxuLy8jZW5kcmVnaW9uXG5leHBvcnQgeyBkZWNvZGUsIGVuY29kZSB9OyJdLAogICJtYXBwaW5ncyI6ICJBQUNBLElBQUlBO0FBQ0osSUFBSTtBQUNILEVBQUFBLEtBQVUsSUFBSSxZQUFZO0FBQzNCLFFBQWdCO0FBQUM7QUFDakIsSUFBSUMsR0FDQUMsR0FDQUMsSUFBYSxHQUNiQyxLQUFjLENBQUMsR0FDZkMsS0FBMEIsS0FDMUJDLEtBQXdCLE9BQ3hCQyxLQUFtQixPQUNuQkMsS0FBcUIsT0FDckJDLEtBQTBCLEdBQzFCQyxLQUFZLENBQUMsR0FDYkMsS0FBZSxTQUNmQyxJQUFhLFFBQ2JDLEtBQVVULElBQ1ZVLEtBQWlCLEdBQ2pCQyxJQUFpQixDQUFDLEdBQ2xCQyxHQUNBQyxJQUNBQyxLQUFpQixHQUNqQkMsS0FBZSxHQUNmQyxHQUNBQyxHQUNBQyxJ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Z0YsRUFBYSxDQUFDLENBQUM7QUFDdkI7QUFDQSxJQUFJQyxLQUFpQixJQUFJekcsR0FBUSxFQUFFLFlBQVksR0FBTSxDQUFDLEdBQ2xEd0IsS0FBU2lGLEdBQWUsUUFDeEJDLEtBQW1CRCxHQUFlLGtCQUNsQ0UsS0FBd0JGLEdBQWUsdUJBQ3ZDLEVBQUUsT0FBQUcsSUFBTyxRQUFBQyxJQUFRLGVBQUFDLElBQWUsYUFBQUMsR0FBWSxJQUFJakk7QUFHcEQsSUFBSWtJLEtBQW9COyIsCiAgIm5hbWVzIjogWyJkZWNvZGVyIiwgInNyYyIsICJzcmNFbmQiLCAicG9zaXRpb24kMSIsICJFTVBUWV9BUlJBWSIsICJMRUdBQ1lfUkVDT1JEX0lOTElORV9JRCIsICJSRUNPUkRfREVGSU5JVElPTlNfSUQiLCAiUkVDT1JEX0lOTElORV9JRCIsICJCVU5ETEVEX1NUUklOR1NfSUQiLCAiUEFDS0VEX1JFRkVSRU5DRV9UQUdfSUQiLCAiU1RPUF9DT0RFIiwgIm1heEFycmF5U2l6ZSIsICJtYXhNYXBTaXplIiwgInN0cmluZ3MiLCAic3RyaW5nUG9zaXRpb24iLCAiY3VycmVudERlY29kZXIiLCAiY3VycmVudFN0cnVjdHVyZXMiLCAic3JjU3RyaW5nIiwgInNyY1N0cmluZ1N0YXJ0IiwgInNyY1N0cmluZ0VuZCIsICJidW5kbGVkU3RyaW5ncyQxIiwgInJlZmVyZW5jZU1hcCIsICJjdXJyZW50RXh0ZW5zaW9ucyIsICJjdXJyZW50RXh0ZW5zaW9uUmFuZ2VzIiwgInBhY2tlZFZhbHVlcyIsICJkYXRhVmlldyIsICJyZXN0b3JlTWFwc0FzT2JqZWN0IiwgImRlZmF1bHRPcHRpb25zIiwgInNlcXVlbnRpYWxNb2RlIiwgImlubGluZU9iamVjdFJlYWRUaHJlc2hvbGQiLCAiRGVjb2RlciIsICJvcHRpb25zIiwgImsiLCAidiIsICJrZXkiLCAicmVjIiwgIm1hcCIsICJyZXMiLCAic2FmZUtleSIsICJzb3VyY2UiLCAiZW5kIiwgInIiLCAic2F2ZVN0YXRlIiwgImNsZWFyU291cmNlIiwgImVycm9yIiwgImNoZWNrZWRSZWFkIiwgImZvckVhY2giLCAidmFsdWVzIiwgImxhc3RQb3NpdGlvbiIsICJzaXplIiwgInZhbHVlIiwgImRlZmF1bHREZWNvZGVyIiwgInJlc3VsdCIsICJyZWFkIiwgImVuZE9mQ0JPUkVycm9yIiwgInRva2VuIiwgIm1ham9yVHlwZSIsICJnZXRGbG9hdDE2IiwgIm11bHRpcGxpZXIiLCAibXVsdDEwIiwgImFycmF5IiwgImkiLCAib2JqZWN0IiwgInJlYWRCaW4iLCAic3RyaW5nIiwgInNob3J0U3RyaW5nSW5KUyIsICJsb25nU3RyaW5nSW5KUyIsICJyZWFkRml4ZWRTdHJpbmciLCAic3RydWN0dXJlIiwgImNyZWF0ZVN0cnVjdHVyZVJlYWRlciIsICJsZW5ndGgiLCAicmVhZEp1c3RMZW5ndGgiLCAiaWQiLCAicmVjb3JkRGVmaW5pdGlvbiIsICJyZWFkQnVuZGxlRXh0IiwgImxvYWRTaGFyZWQiLCAiZXh0ZW5zaW9uIiwgImlucHV0IiwgIlRhZyIsICJwYWNrZWRWYWx1ZSIsICJnZXRQYWNrZWRWYWx1ZXMiLCAidmFsaWROYW1lIiwgInJlYWRPYmplY3QiLCAiY29tcGlsZWRSZWFkZXIiLCAicmVhZFN0cmluZ0pTIiwgInVuaXRzIiwgImJ5dGUxIiwgImJ5dGUyIiwgImJ5dGUzIiwgImJ5dGU0IiwgInVuaXQiLCAiZnJvbUNoYXJDb2RlIiwgInN0YXJ0IiwgImJ5dGVzIiwgImJ5dGUiLCAiYSIsICJiIiwgImMiLCAiZCIsICJlIiwgImYiLCAiZyIsICJoIiwgImoiLCAibCIsICJtIiwgIm4iLCAibyIsICJmMzJBcnJheSIsICJ1OEFycmF5IiwgImJ5dGUwIiwgImV4cG9uZW50IiwgImFicyIsICJ0YWciLCAiZGF0ZVN0cmluZyIsICJlcG9jaFNlYyIsICJidWZmZXIiLCAiZnJhY3Rpb24iLCAiZXhpc3RpbmdTdHJ1Y3R1cmUiLCAiZGF0YSIsICJnbGJsIiwgInBhY2tlZFRhYmxlIiwgIm5ld1BhY2tlZFZhbHVlcyIsICJzdGFydGluZ1Bvc2l0aW9uIiwgInRhcmdldCIsICJyZWZFbnRyeSIsICJ0YXJnZXRQcm9wZXJ0aWVzIiwgImNvbWJpbmUiLCAiU0hBUkVEX0RBVEFfVEFHX0lEIiwgImlzTGl0dGxlRW5kaWFuTWFjaGluZSQxIiwgInR5cGVkQXJyYXlzIiwgInR5cGVkQXJyYXlUYWdzIiwgInJlZ2lzdGVyVHlwZWRBcnJheSIsICJUeXBlZEFycmF5IiwgImR2TWV0aG9kIiwgImJ5dGVzUGVyRWxlbWVudCIsICJsaXR0bGVFbmRpYW4iLCAic2l6ZVNoaWZ0IiwgImR2IiwgImVsZW1lbnRzIiwgInRhIiwgIm1ldGhvZCIsICJidW5kbGVQb3NpdGlvbiIsICJidW5kbGVMZW5ndGgiLCAiZGF0YVBvc2l0aW9uIiwgInNoYXJlZERhdGEiLCAidXBkYXRlZFN0cnVjdHVyZXMiLCAiY2FsbGJhY2siLCAic2F2ZWRTcmNFbmQiLCAic2F2ZWRQb3NpdGlvbiIsICJzYXZlZFN0cmluZ1Bvc2l0aW9uIiwgInNhdmVkU3JjU3RyaW5nU3RhcnQiLCAic2F2ZWRTcmNTdHJpbmdFbmQiLCAic2F2ZWRTcmNTdHJpbmciLCAic2F2ZWRTdHJpbmdzIiwgInNhdmVkUmVmZXJlbmNlTWFwIiwgInNhdmVkQnVuZGxlZFN0cmluZ3MiLCAic2F2ZWRTcmMiLCAic2F2ZWRTdHJ1Y3R1cmVzIiwgInNhdmVkRGVjb2RlciIsICJzYXZlZFNlcXVlbnRpYWxNb2RlIiwgImRlY29kZSIsICJkZWNvZGVNdWx0aXBsZSIsICJGTE9BVDMyX09QVElPTlMiLCAidGV4dEVuY29kZXIiLCAiZXh0ZW5zaW9ucyIsICJleHRlbnNpb25DbGFzc2VzIiwgIkJ1ZmZlciQxIiwgImhhc05vZGVCdWZmZXIiLCAiQnl0ZUFycmF5QWxsb2NhdGUiLCAiQnl0ZUFycmF5IiwgIk1BWF9TVFJVQ1RVUkVTIiwgIk1BWF9CVUZGRVJfU0laRSIsICJ0aHJvd09uSXRlcmFibGUiLCAidGFyZ2V0VmlldyIsICJwb3NpdGlvbiIsICJzYWZlRW5kIiwgImJ1bmRsZWRTdHJpbmdzIiwgIk1BWF9CVU5ETEVfU0laRSIsICJoYXNOb25MYXRpbiIsICJSRUNPUkRfU1lNQk9MIiwgIkVuY29kZXIiLCAic2hhcmVkU3RydWN0dXJlcyIsICJoYXNTaGFyZWRVcGRhdGUiLCAic3RydWN0dXJlcyIsICJlbmNvZGVVdGY4IiwgImVuY29kZXIiLCAiaGFzU2hhcmVkU3RydWN0dXJlcyIsICJtYXhTaGFyZWRTdHJ1Y3R1cmVzIiwgImlzU2VxdWVudGlhbCIsICJzYW1wbGluZ1BhY2tlZFZhbHVlcyIsICJwYWNrZWRPYmplY3RNYXAiLCAic2hhcmVkVmFsdWVzIiwgInNoYXJlZFBhY2tlZE9iamVjdE1hcCIsICJyZWNvcmRJZHNUb1JlbW92ZSIsICJ0cmFuc2l0aW9uc0NvdW50IiwgInNlcmlhbGl6YXRpb25zU2luY2VUcmFuc2l0aW9uUmVidWlsZCIsICJlbmNvZGVPcHRpb25zIiwgInNoYXJlZFN0cnVjdHVyZXNMZW5ndGgiLCAia2V5cyIsICJuZXh0VHJhbnNpdGlvbiIsICJ0cmFuc2l0aW9uIiwgImZpbmRSZXBldGl0aXZlU3RyaW5ncyIsICJ3cml0ZUFycmF5SGVhZGVyIiwgInZhbHVlc0FycmF5IiwgImVuY29kZSIsICJUSFJPV19PTl9JVEVSQUJMRSIsICJ3cml0ZUJ1bmRsZXMiLCAibWFrZVJvb20iLCAic2VyaWFsaXplZCIsICJpbnNlcnRJZHMiLCAicmV0dXJuQnVmZmVyIiwgInRocmVzaG9sZCIsICJzdGF0dXMiLCAidHlwZSIsICJwYWNrZWRQb3NpdGlvbiIsICJzdHJMZW5ndGgiLCAiZXh0U3RhcnQiLCAibWF4Qnl0ZXMiLCAidHdvQnl0ZSIsICJoZWFkZXJTaXplIiwgImMxIiwgImMyIiwgInN0clBvc2l0aW9uIiwgInVzZUZsb2F0MzIiLCAieFNoaWZ0ZWQiLCAicmVmZXJlZSIsICJpZHNUb0luc2VydCIsICJjb25zdHJ1Y3RvciIsICJ4IiwgIndyaXRlT2JqZWN0IiwgImVudHJ5VmFsdWUiLCAiZXh0ZW5zaW9uQ2xhc3MiLCAiZW50cnkiLCAiaXNCbG9iIiwgImpzb24iLCAid3JpdGVCdWZmZXIiLCAidmFscyIsICJvYmplY3RPZmZzZXQiLCAic2tpcFZhbHVlcyIsICJuZXdUcmFuc2l0aW9ucyIsICJwYXJlbnRSZWNvcmRJZCIsICJyZWNvcmRJZCIsICJuZXdTaXplIiwgIm5ld0J1ZmZlciIsICJjaHVua1RocmVzaG9sZCIsICJjb250aW51ZWRDaHVua1RocmVzaG9sZCIsICJzdGFydEVuY29kaW5nIiwgImVuY29kZU9iamVjdEFzSXRlcmFibGUiLCAiZW5jb2RlT2JqZWN0QXNBc3luY0l0ZXJhYmxlIiwgIml0ZXJhdGVQcm9wZXJ0aWVzIiwgImZpbmFsSXRlcmFibGUiLCAidXNlUmVjb3JkcyIsICJ3cml0ZUVudGl0eUxlbmd0aCIsICJ0cnlFbmNvZGUiLCAicmVzdGFydEVuY29kaW5nIiwgInJlc3RhcnQiLCAiZW5jb2RlSXRlcmFibGUiLCAiZW5jb2RlZFZhbHVlIiwgInJlYWRlciIsICJuZXh0IiwgImFzeW5jVmFsdWUiLCAibGFzdFZlcnNpb24iLCAic3RydWN0dXJlc0NvcHkiLCAiU2hhcmVkRGF0YSIsICJzYXZlUmVzdWx0cyIsICJleGlzdGluZ1NoYXJlZCIsICJtYWpvclZhbHVlIiwgInZlcnNpb24iLCAiQmxvYkNvbnN0cnVjdG9yIiwgInBhY2tlZFN0YXR1cyIsICJpbmNsdWRlS2V5cyIsICJpc0xpdHRsZUVuZGlhbk1hY2hpbmUiLCAiZGF0ZSIsICJzZWNvbmRzIiwgInNldCIsICJyZWdleCIsICJhcnJheUJ1ZmZlciIsICJ0eXBlZEFycmF5IiwgInR5cGVkQXJyYXlFbmNvZGVyIiwgImRlZmluaXRpb25zIiwgIm9mZnNldCIsICJuZXh0SWQiLCAiZGlzdGFuY2VUb01vdmUiLCAibGFzdEVuZCIsICJ3cml0ZVN0cmluZ3MiLCAiZGVmYXVsdEVuY29kZXIiLCAiZW5jb2RlQXNJdGVyYWJsZSIsICJlbmNvZGVBc0FzeW5jSXRlcmFibGUiLCAiTkVWRVIiLCAiQUxXQVlTIiwgIkRFQ0lNQUxfUk9VTkQiLCAiREVDSU1BTF9GSVQiLCAiVEhST1dfT05fSVRFUkFCTEUiXQp9Cg==
