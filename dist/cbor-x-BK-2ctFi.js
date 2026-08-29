var Ie;
try {
  Ie = new TextDecoder();
} catch {
}
var p, G, f = 0, Qe = [], ft = 105, ot = 57342, ut = 57343, ze = 57337, $e = 6, ee = {}, ne = 11281e4, W = 1681e4, Me = Qe, ke = 0, E = {}, B, ye, pe = 0, le = 0, D, K, R = [], Ue = [], N, V, se, Je = {
  useRecords: !1,
  mapsAsObjects: !0
}, ae = !1, et = 2;
try {
  new Function("");
} catch {
  et = 1 / 0;
}
var tt = class ve {
  constructor(t) {
    if (t && ((t.keyMap || t._keyMap) && !t.useRecords && (t.useRecords = !1, t.mapsAsObjects = !0), t.useRecords === !1 && t.mapsAsObjects === void 0 && (t.mapsAsObjects = !0), t.getStructures && (t.getShared = t.getStructures), t.getShared && !t.structures && ((t.structures = []).uninitialized = !0), t.keyMap)) {
      this.mapKey = /* @__PURE__ */ new Map();
      for (let [n, a] of Object.entries(t.keyMap)) this.mapKey.set(a, n);
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
    for (let [a, l] of Object.entries(t)) n.set(this._keyMap.hasOwnProperty(a) ? this._keyMap[a] : a, l);
    return n;
  }
  decodeKeys(t) {
    if (!this._keyMap || t.constructor.name != "Map") return t;
    if (!this._mapKey) {
      this._mapKey = /* @__PURE__ */ new Map();
      for (let [a, l] of Object.entries(this._keyMap)) this._mapKey.set(l, a);
    }
    let n = {};
    return t.forEach((a, l) => n[z(this._mapKey.has(l) ? this._mapKey.get(l) : l)] = a), n;
  }
  mapDecode(t, n) {
    let a = this.decode(t);
    return this._keyMap && a.constructor.name === "Array" ? a.map((l) => this.decodeKeys(l)) : a;
  }
  decode(t, n) {
    if (p) return st(() => (_e(), this ? this.decode(t, n) : ve.prototype.decode.call(Je, t, n)));
    G = n > -1 ? n : t.length, f = 0, ke = 0, le = 0, ye = null, Me = Qe, D = null, p = t;
    try {
      V = t.dataView || (t.dataView = new DataView(t.buffer, t.byteOffset, t.byteLength));
    } catch (a) {
      throw p = null, t instanceof Uint8Array ? a : new Error("Source must be a Uint8Array or Buffer but was a " + (t && typeof t == "object" ? t.constructor.name : typeof t));
    }
    if (this instanceof ve) {
      if (E = this, N = this.sharedValues && (this.pack ? new Array(this.maxPrivatePackedValues || 16).concat(this.sharedValues) : this.sharedValues), this.structures)
        return B = this.structures, ue();
      (!B || B.length > 0) && (B = []);
    } else
      E = Je, (!B || B.length > 0) && (B = []), N = null;
    return ue();
  }
  decodeMultiple(t, n) {
    let a, l = 0;
    try {
      let o = t.length;
      ae = !0;
      let h = this ? this.decode(t, o) : Ve.decode(t, o);
      if (n) {
        if (n(h) === !1) return;
        for (; f < o; )
          if (l = f, n(ue()) === !1) return;
      } else {
        for (a = [h]; f < o; )
          l = f, a.push(ue());
        return a;
      }
    } catch (o) {
      throw o.lastPosition = l, o.values = a, o;
    } finally {
      ae = !1, _e();
    }
  }
};
function ue() {
  try {
    let e = O();
    if (D) {
      if (f >= D.postBundlePosition) {
        let t = /* @__PURE__ */ new Error("Unexpected bundle position");
        throw t.incomplete = !0, t;
      }
      f = D.postBundlePosition, D = null;
    }
    if (f == G)
      B = null, p = null, K && (K = null);
    else if (f > G) {
      let t = /* @__PURE__ */ new Error("Unexpected end of CBOR data");
      throw t.incomplete = !0, t;
    } else if (!ae) throw new Error("Data read, but end of buffer not reached");
    return e;
  } catch (e) {
    throw _e(), (e instanceof RangeError || e.message.startsWith("Unexpected end of buffer")) && (e.incomplete = !0), e;
  }
}
function O() {
  let e = p[f++], t = e >> 5;
  if (e = e & 31, e > 23) switch (e) {
    case 24:
      e = p[f++];
      break;
    case 25:
      if (t == 7) return yt();
      e = V.getUint16(f), f += 2;
      break;
    case 26:
      if (t == 7) {
        let n = V.getFloat32(f);
        if (E.useFloat32 > 2) {
          let a = Fe[(p[f] & 127) << 1 | p[f + 1] >> 7];
          return f += 4, (a * n + (n > 0 ? 0.5 : -0.5) >> 0) / a;
        }
        return f += 4, n;
      }
      if (e = V.getUint32(f), f += 4, t === 1) return -1 - e;
      break;
    case 27:
      if (t == 7) {
        let n = V.getFloat64(f);
        return f += 8, n;
      }
      if (t > 1) {
        if (V.getUint32(f) > 0) throw new Error("JavaScript does not support arrays, maps, or strings with length over 4294967295");
        e = V.getUint32(f + 4);
      } else E.int64AsNumber ? (e = V.getUint32(f) * 4294967296, e += V.getUint32(f + 4)) : e = V.getBigUint64(f);
      f += 8;
      break;
    case 31:
      switch (t) {
        case 2:
        case 3:
          throw new Error("Indefinite length not supported for byte or text strings");
        case 4:
          let n = [], a, l = 0;
          for (; (a = O()) != ee; ) {
            if (l >= ne) throw new Error(`Array length exceeds ${ne}`);
            n[l++] = a;
          }
          return t == 4 ? n : t == 3 ? n.join("") : Buffer.concat(n);
        case 5:
          let o;
          if (E.mapsAsObjects) {
            let h = {}, y = 0;
            if (E.keyMap) for (; (o = O()) != ee; ) {
              if (y++ >= W) throw new Error(`Property count exceeds ${W}`);
              h[z(E.decodeKey(o))] = O();
            }
            else for (; (o = O()) != ee; ) {
              if (y++ >= W) throw new Error(`Property count exceeds ${W}`);
              h[z(o)] = O();
            }
            return h;
          } else {
            se && (E.mapsAsObjects = !0, se = !1);
            let h = /* @__PURE__ */ new Map();
            if (E.keyMap) {
              let y = 0;
              for (; (o = O()) != ee; ) {
                if (y++ >= W) throw new Error(`Map size exceeds ${W}`);
                h.set(E.decodeKey(o), O());
              }
            } else {
              let y = 0;
              for (; (o = O()) != ee; ) {
                if (y++ >= W) throw new Error(`Map size exceeds ${W}`);
                h.set(o, O());
              }
            }
            return h;
          }
        case 7:
          return ee;
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
      return ht(e);
    case 3:
      if (le >= f) return ye.slice(f - pe, (f += e) - pe);
      if (le == 0 && G < 140 && e < 32) {
        let l = e < 16 ? rt(e) : dt(e);
        if (l != null) return l;
      }
      return ct(e);
    case 4:
      if (e >= ne) throw new Error(`Array length exceeds ${ne}`);
      let n = new Array(e);
      for (let l = 0; l < e; l++) n[l] = O();
      return n;
    case 5:
      if (e >= W) throw new Error(`Map size exceeds ${ne}`);
      if (E.mapsAsObjects) {
        let l = {};
        if (E.keyMap) for (let o = 0; o < e; o++) l[z(E.decodeKey(O()))] = O();
        else for (let o = 0; o < e; o++) l[z(O())] = O();
        return l;
      } else {
        se && (E.mapsAsObjects = !0, se = !1);
        let l = /* @__PURE__ */ new Map();
        if (E.keyMap) for (let o = 0; o < e; o++) l.set(E.decodeKey(O()), O());
        else for (let o = 0; o < e; o++) l.set(O(), O());
        return l;
      }
    case 6:
      if (e >= ze) {
        let l = B[e & 8191];
        if (l)
          return l.read || (l.read = xe(l)), l.read();
        if (e < 65536) {
          if (e == ut) {
            let o = re(), h = O(), y = O();
            Re(h, y);
            let U = {};
            if (E.keyMap) for (let S = 2; S < o; S++) {
              let x = E.decodeKey(y[S - 2]);
              U[z(x)] = O();
            }
            else for (let S = 2; S < o; S++) {
              let x = y[S - 2];
              U[z(x)] = O();
            }
            return U;
          } else if (e == ot) {
            let o = re(), h = O();
            for (let y = 2; y < o; y++) Re(h++, O());
            return O();
          } else if (e == ze) return St();
          if (E.getShared && (Te(), l = B[e & 8191], l))
            return l.read || (l.read = xe(l)), l.read();
        }
      }
      let a = R[e];
      if (a)
        return a.handlesRead ? a(O) : a(O());
      {
        let l = O();
        for (let o = 0; o < Ue.length; o++) {
          let h = Ue[o](e, l);
          if (h !== void 0) return h;
        }
        return new Z(l, e);
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
          let l = (N || q())[e];
          if (l !== void 0) return l;
          throw new Error("Unknown token " + e);
      }
    default:
      if (isNaN(e)) {
        let l = /* @__PURE__ */ new Error("Unexpected end of CBOR data");
        throw l.incomplete = !0, l;
      }
      throw new Error("Unknown CBOR token " + e);
  }
}
var We = /^[a-zA-Z_$][a-zA-Z\d_$]*$/;
function xe(e) {
  if (!e) throw new Error("Structure is required in record definition");
  function t() {
    let n = p[f++];
    if (n = n & 31, n > 23) switch (n) {
      case 24:
        n = p[f++];
        break;
      case 25:
        n = V.getUint16(f), f += 2;
        break;
      case 26:
        n = V.getUint32(f), f += 4;
        break;
      default:
        throw new Error("Expected array header, but got " + p[f - 1]);
    }
    let a = this.compiledReader;
    for (; a; ) {
      if (a.propertyCount === n) return a(O);
      a = a.next;
    }
    if (this.slowReads++ >= et) {
      let o = this.length == n ? this : this.slice(0, n);
      return a = E.keyMap ? new Function("r", "return {" + o.map((h) => E.decodeKey(h)).map((h) => We.test(h) ? z(h) + ":r()" : "[" + JSON.stringify(h) + "]:r()").join(",") + "}") : new Function("r", "return {" + o.map((h) => We.test(h) ? z(h) + ":r()" : "[" + JSON.stringify(h) + "]:r()").join(",") + "}"), this.compiledReader && (a.next = this.compiledReader), a.propertyCount = n, this.compiledReader = a, a(O);
    }
    let l = {};
    if (E.keyMap) for (let o = 0; o < n; o++) l[z(E.decodeKey(this[o]))] = O();
    else for (let o = 0; o < n; o++) l[z(this[o])] = O();
    return l;
  }
  return e.slowReads = 0, t;
}
function z(e) {
  if (typeof e == "string") return e === "__proto__" ? "__proto_" : e;
  if (typeof e == "number" || typeof e == "boolean" || typeof e == "bigint") return e.toString();
  if (e == null) return e + "";
  throw new Error("Invalid property name type " + typeof e);
}
var ct = Be;
function Be(e) {
  let t;
  if (e < 16 && (t = rt(e)))
    return t;
  if (e > 64 && Ie) return Ie.decode(p.subarray(f, f += e));
  const n = f + e, a = [];
  for (t = ""; f < n; ) {
    const l = p[f++];
    if ((l & 128) === 0) a.push(l);
    else if ((l & 224) === 192)
      if (l < 194 || f >= n || (p[f] & 192) !== 128) a.push(65533);
      else {
        const o = p[f++] & 63;
        a.push((l & 31) << 6 | o);
      }
    else if ((l & 240) === 224) {
      const o = f < n ? p[f] : 0;
      if (f >= n || (o & 192) !== 128 || l === 224 && o < 160 || l === 237 && o >= 160) a.push(65533);
      else if (f++, f >= n || (p[f] & 192) !== 128) a.push(65533);
      else {
        const h = p[f++] & 63;
        a.push((l & 31) << 12 | (o & 63) << 6 | h);
      }
    } else if ((l & 248) === 240) {
      const o = f < n ? p[f] : 0;
      if (l > 244 || f >= n || (o & 192) !== 128 || l === 240 && o < 144 || l === 244 && o >= 144) a.push(65533);
      else if (f++, f >= n || (p[f] & 192) !== 128) a.push(65533);
      else {
        const h = p[f++] & 63;
        if (f >= n || (p[f] & 192) !== 128) a.push(65533);
        else {
          const y = p[f++] & 63;
          let U = (l & 7) << 18 | (o & 63) << 12 | h << 6 | y;
          U -= 65536, a.push(U >>> 10 & 1023 | 55296), a.push(56320 | U & 1023);
        }
      }
    } else a.push(65533);
    a.length >= 4096 && (t += P.apply(String, a), a.length = 0);
  }
  return a.length > 0 && (t += P.apply(String, a)), t;
}
var P = String.fromCharCode;
function dt(e) {
  let t = f, n = new Array(e);
  for (let a = 0; a < e; a++) {
    const l = p[f++];
    if ((l & 128) > 0) {
      f = t;
      return;
    }
    n[a] = l;
  }
  return P.apply(String, n);
}
function rt(e) {
  if (e < 4)
    if (e < 2) {
      if (e === 0) return "";
      {
        let t = p[f++];
        if ((t & 128) > 1) {
          f -= 1;
          return;
        }
        return P(t);
      }
    } else {
      let t = p[f++], n = p[f++];
      if ((t & 128) > 0 || (n & 128) > 0) {
        f -= 2;
        return;
      }
      if (e < 3) return P(t, n);
      let a = p[f++];
      if ((a & 128) > 0) {
        f -= 3;
        return;
      }
      return P(t, n, a);
    }
  else {
    let t = p[f++], n = p[f++], a = p[f++], l = p[f++];
    if ((t & 128) > 0 || (n & 128) > 0 || (a & 128) > 0 || (l & 128) > 0) {
      f -= 4;
      return;
    }
    if (e < 6) {
      if (e === 4) return P(t, n, a, l);
      {
        let o = p[f++];
        if ((o & 128) > 0) {
          f -= 5;
          return;
        }
        return P(t, n, a, l, o);
      }
    } else if (e < 8) {
      let o = p[f++], h = p[f++];
      if ((o & 128) > 0 || (h & 128) > 0) {
        f -= 6;
        return;
      }
      if (e < 7) return P(t, n, a, l, o, h);
      let y = p[f++];
      if ((y & 128) > 0) {
        f -= 7;
        return;
      }
      return P(t, n, a, l, o, h, y);
    } else {
      let o = p[f++], h = p[f++], y = p[f++], U = p[f++];
      if ((o & 128) > 0 || (h & 128) > 0 || (y & 128) > 0 || (U & 128) > 0) {
        f -= 8;
        return;
      }
      if (e < 10) {
        if (e === 8) return P(t, n, a, l, o, h, y, U);
        {
          let S = p[f++];
          if ((S & 128) > 0) {
            f -= 9;
            return;
          }
          return P(t, n, a, l, o, h, y, U, S);
        }
      } else if (e < 12) {
        let S = p[f++], x = p[f++];
        if ((S & 128) > 0 || (x & 128) > 0) {
          f -= 10;
          return;
        }
        if (e < 11) return P(t, n, a, l, o, h, y, U, S, x);
        let v = p[f++];
        if ((v & 128) > 0) {
          f -= 11;
          return;
        }
        return P(t, n, a, l, o, h, y, U, S, x, v);
      } else {
        let S = p[f++], x = p[f++], v = p[f++], C = p[f++];
        if ((S & 128) > 0 || (x & 128) > 0 || (v & 128) > 0 || (C & 128) > 0) {
          f -= 12;
          return;
        }
        if (e < 14) {
          if (e === 12) return P(t, n, a, l, o, h, y, U, S, x, v, C);
          {
            let F = p[f++];
            if ((F & 128) > 0) {
              f -= 13;
              return;
            }
            return P(t, n, a, l, o, h, y, U, S, x, v, C, F);
          }
        } else {
          let F = p[f++], T = p[f++];
          if ((F & 128) > 0 || (T & 128) > 0) {
            f -= 14;
            return;
          }
          if (e < 15) return P(t, n, a, l, o, h, y, U, S, x, v, C, F, T);
          let L = p[f++];
          if ((L & 128) > 0) {
            f -= 15;
            return;
          }
          return P(t, n, a, l, o, h, y, U, S, x, v, C, F, T, L);
        }
      }
    }
  }
}
function ht(e) {
  return E.copyBuffers ? Uint8Array.prototype.slice.call(p, f, f += e) : p.subarray(f, f += e);
}
var it = /* @__PURE__ */ new Float32Array(1), ce = new Uint8Array(it.buffer, 0, 4);
function yt() {
  let e = p[f++], t = p[f++], n = (e & 127) >> 2;
  if (n === 31)
    return t || e & 3 ? NaN : e & 128 ? -1 / 0 : 1 / 0;
  if (n === 0) {
    let a = ((e & 3) << 8 | t) / 16777216;
    return e & 128 ? -a : a;
  }
  return ce[3] = e & 128 | (n >> 1) + 56, ce[2] = (e & 7) << 5 | t >> 3, ce[1] = t << 5, ce[0] = 0, it[0];
}
new Array(4096);
var Z = class {
  constructor(e, t) {
    this.value = e, this.tag = t;
  }
};
R[0] = (e) => new Date(e);
R[1] = (e) => new Date(Math.round(e * 1e3));
R[2] = (e) => {
  let t = BigInt(0);
  for (let n = 0, a = e.byteLength; n < a; n++) t = BigInt(e[n]) + (t << BigInt(8));
  return t;
};
R[3] = (e) => BigInt(-1) - R[2](e);
R[4] = (e) => +(e[1] + "e" + e[0]);
R[5] = (e) => e[1] * Math.exp(e[0] * Math.log(2));
var Re = (e, t) => {
  e = e - 57344;
  let n = B[e];
  n && n.isShared && ((B.restoreStructures || (B.restoreStructures = []))[e] = n), B[e] = t, t.read = xe(t);
};
R[ft] = (e) => {
  let t = e.length, n = e[1];
  Re(e[0], n);
  let a = {};
  for (let l = 2; l < t; l++) {
    let o = n[l - 2];
    a[z(o)] = e[l];
  }
  return a;
};
R[14] = (e) => D ? D[0].slice(D.position0, D.position0 += e) : new Z(e, 14);
R[15] = (e) => D ? D[1].slice(D.position1, D.position1 += e) : new Z(e, 15);
var pt = {
  Error,
  RegExp
};
R[27] = (e) => (pt[e[0]] || Error)(e[1], e[2]);
var nt = (e) => {
  if (p[f++] != 132) {
    let n = /* @__PURE__ */ new Error("Packed values structure must be followed by a 4 element array");
    throw p.length < f && (n.incomplete = !0), n;
  }
  let t = e();
  if (!t || !t.length) {
    let n = /* @__PURE__ */ new Error("Packed values structure must be followed by a 4 element array");
    throw n.incomplete = !0, n;
  }
  return N = N ? t.concat(N.slice(t.length)) : t, N.prefixes = e(), N.suffixes = e(), e();
};
nt.handlesRead = !0;
R[51] = nt;
R[$e] = (e) => {
  if (!N)
    if (E.getShared) Te();
    else return new Z(e, $e);
  if (typeof e == "number") return N[16 + (e >= 0 ? 2 * e : -2 * e - 1)];
  let t = /* @__PURE__ */ new Error("No support for non-integer packed references yet");
  throw e === void 0 && (t.incomplete = !0), t;
};
R[28] = (e) => {
  K || (K = /* @__PURE__ */ new Map(), K.id = 0);
  let t = K.id++, n = f, a = p[f], l;
  a >> 5 == 4 ? l = [] : l = {};
  let o = { target: l };
  K.set(t, o);
  let h = e();
  return o.used ? (Object.getPrototypeOf(l) !== Object.getPrototypeOf(h) && (f = n, l = h, K.set(t, { target: l }), h = e()), Object.assign(l, h)) : (o.target = h, h);
};
R[28].handlesRead = !0;
R[29] = (e) => {
  let t = K.get(e);
  return t.used = !0, t.target;
};
R[258] = (e) => new Set(e);
(R[259] = (e) => (E.mapsAsObjects && (E.mapsAsObjects = !1, se = !0), e())).handlesRead = !0;
function te(e, t) {
  return typeof e == "string" ? e + t : e instanceof Array ? e.concat(t) : Object.assign({}, e, t);
}
function q() {
  if (!N)
    if (E.getShared) Te();
    else throw new Error("No packed values available");
  return N;
}
var wt = 1399353956;
Ue.push((e, t) => {
  if (e >= 225 && e <= 255) return te(q().prefixes[e - 224], t);
  if (e >= 28704 && e <= 32767) return te(q().prefixes[e - 28672], t);
  if (e >= 1879052288 && e <= 2147483647) return te(q().prefixes[e - 1879048192], t);
  if (e >= 216 && e <= 223) return te(t, q().suffixes[e - 216]);
  if (e >= 27647 && e <= 28671) return te(t, q().suffixes[e - 27639]);
  if (e >= 1811940352 && e <= 1879048191) return te(t, q().suffixes[e - 1811939328]);
  if (e == wt) return {
    packedValues: N,
    structures: B.slice(0),
    version: t
  };
  if (e == 55799) return t;
});
var gt = new Uint8Array(new Uint16Array([1]).buffer)[0] == 1, He = [
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
], bt = [
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
for (let e = 0; e < He.length; e++) mt(He[e], bt[e]);
function mt(e, t) {
  let n = "get" + e.name.slice(0, -5), a;
  typeof e == "function" ? a = e.BYTES_PER_ELEMENT : e = null;
  for (let l = 0; l < 2; l++) {
    if (!l && a == 1) continue;
    let o = a == 2 ? 1 : a == 4 ? 2 : a == 8 ? 3 : 0;
    R[l ? t : t - 4] = a == 1 || l == gt ? (h) => {
      if (!e) throw new Error("Could not find typed array for code " + t);
      return !E.copyBuffers && (a === 1 || a === 2 && !(h.byteOffset & 1) || a === 4 && !(h.byteOffset & 3) || a === 8 && !(h.byteOffset & 7)) ? new e(h.buffer, h.byteOffset, h.byteLength >> o) : new e(Uint8Array.prototype.slice.call(h, 0).buffer);
    } : (h) => {
      if (!e) throw new Error("Could not find typed array for code " + t);
      let y = new DataView(h.buffer, h.byteOffset, h.byteLength), U = h.length >> o, S = new e(U), x = y[n];
      for (let v = 0; v < U; v++) S[v] = x.call(y, v << o, l);
      return S;
    };
  }
}
function St() {
  let e = re(), t = f + O();
  for (let a = 2; a < e; a++) {
    let l = re();
    f += l;
  }
  let n = f;
  return f = t, D = [Be(re()), Be(re())], D.position0 = 0, D.position1 = 0, D.postBundlePosition = f, f = n, O();
}
function re() {
  let e = p[f++] & 31;
  if (e > 23) switch (e) {
    case 24:
      e = p[f++];
      break;
    case 25:
      e = V.getUint16(f), f += 2;
      break;
    case 26:
      e = V.getUint32(f), f += 4;
  }
  return e;
}
function Te() {
  if (E.getShared) {
    let e = st(() => (p = null, E.getShared())) || {}, t = e.structures || [];
    E.sharedVersion = e.version, N = E.sharedValues = e.packedValues, B === !0 ? E.structures = B = t : B.splice.apply(B, [0, t.length].concat(t));
  }
}
function st(e) {
  let t = G, n = f, a = ke, l = pe, o = le, h = ye, y = Me, U = K, S = D, x = new Uint8Array(p.slice(0, G)), v = B, C = E, F = ae, T = e();
  return G = t, f = n, ke = a, pe = l, le = o, ye = h, Me = y, K = U, D = S, p = x, ae = F, B = v, E = C, V = new DataView(p.buffer, p.byteOffset, p.byteLength), T;
}
function _e() {
  p = null, K = null, B = null;
}
var Fe = new Array(147);
for (let e = 0; e < 256; e++) Fe[e] = +("1e" + Math.floor(45.15 - e * 0.30103));
var Ve = new tt({ useRecords: !1 }), vt = Ve.decode, xt = Ve.decodeMultiple, At = {
  NEVER: 0,
  ALWAYS: 1,
  DECIMAL_ROUND: 3,
  DECIMAL_FIT: 4
}, de;
try {
  de = new TextEncoder();
} catch {
}
var De, lt, we = typeof globalThis == "object" && globalThis.Buffer, fe = typeof we < "u", Se = fe ? we.allocUnsafeSlow : Uint8Array, Ye = fe ? we : Uint8Array, qe = 256, Ge = fe ? 4294967296 : 2144337920, Ae, s, k, r = 0, H, _ = null, Et = 61440, Ot = /[\u0080-\uFFFF]/, j = /* @__PURE__ */ Symbol("record-id"), It = class extends tt {
  constructor(e) {
    super(e), this.offset = 0;
    let t, n, a, l, o;
    e = e || {};
    let h = Ye.prototype.utf8Write ? function(i, w) {
      return s.utf8Write(i, w, s.byteLength - w);
    } : de && de.encodeInto ? function(i, w) {
      return de.encodeInto(i, s.subarray(w)).written;
    } : !1, y = this, U = e.structures || e.saveStructures, S = e.maxSharedStructures;
    if (S == null && (S = U ? 128 : 0), S > 8190) throw new Error("Maximum maxSharedStructure is 8190");
    let x = e.sequential;
    x && (S = 0), this.structures || (this.structures = []), this.saveStructures && (this.saveShared = this.saveStructures);
    let v, C, F = e.sharedValues, T;
    if (F) {
      T = /* @__PURE__ */ Object.create(null);
      for (let i = 0, w = F.length; i < w; i++) T[F[i]] = i;
    }
    let L = [], ge = 0, oe = 0;
    this.mapEncode = function(i, w) {
      return this._keyMap && !this._mapped && i.constructor.name === "Array" && (i = i.map((c) => this.encodeKeys(c))), this.encode(i, w);
    }, this.encode = function(i, w) {
      if (s || (s = new Se(8192), k = new DataView(s.buffer, 0, 8192), r = 0), H = s.length - 10, H - r < 2048 ? (s = new Se(s.length), k = new DataView(s.buffer, 0, s.length), H = s.length - 10, r = 0) : w === 512 && (r = r + 7 & 2147483640), t = r, y.useSelfDescribedHeader && (k.setUint32(r, 3654940416), r += 3), o = y.structuredClone ? /* @__PURE__ */ new Map() : null, y.bundleStrings && typeof i != "string" ? (_ = [], _.size = 1 / 0) : _ = null, n = y.structures, n) {
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
        if (c > S && !x && (c = S), !n.transitions) {
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
        x || (n.nextId = c);
      }
      if (a && (a = !1), l = n || [], C = T, e.pack) {
        let c = /* @__PURE__ */ new Map();
        if (c.values = [], c.encoder = y, c.maxValues = e.maxPrivatePackedValues || (T ? 16 : 1 / 0), c.objectMap = T || !1, c.samplingPackedValues = v, he(i, c), c.values.length > 0) {
          s[r++] = 216, s[r++] = 51, J(4);
          let d = c.values;
          M(d), J(0), J(0), C = Object.create(T || null);
          for (let u = 0, g = d.length; u < g; u++) C[d[u]] = u;
        }
      }
      Ae = w & Oe;
      try {
        if (Ae) return;
        if (M(i), _ && Xe(t, M), y.offset = r, o && o.idsToInsert) {
          r += o.idsToInsert.length * 2, r > H && X(r), y.offset = r;
          let c = Ut(s.subarray(t, r), o.idsToInsert);
          return o = null, c;
        }
        return w & 512 ? (s.start = t, s.end = r, s) : s.subarray(t, r);
      } finally {
        if (n) {
          if (oe < 10 && oe++, n.length > S && (n.length = S), ge > 1e4)
            n.transitions = null, oe = 0, ge = 0, L.length > 0 && (L = []);
          else if (L.length > 0 && !x) {
            for (let c = 0, d = L.length; c < d; c++) L[c][j] = void 0;
            L = [];
          }
        }
        if (a && y.saveShared) {
          y.structures.length > S && (y.structures = y.structures.slice(0, S));
          let c = s.subarray(t, r);
          return y.updateSharedData() === !1 ? y.encode(i) : c;
        }
        w & 1024 && (r = t);
      }
    }, this.findCommonStringsToPack = () => (v = /* @__PURE__ */ new Map(), T || (T = /* @__PURE__ */ Object.create(null)), (i) => {
      let w = i && i.threshold || 4, c = this.pack ? i.maxPrivatePackedValues || 16 : 0;
      F || (F = this.sharedValues = []);
      for (let [d, u] of v) u.count > w && (T[d] = c++, F.push(d), a = !0);
      for (; this.saveShared && this.updateSharedData() === !1; ) ;
      v = null;
    });
    const M = (i) => {
      r > H && (s = X(r));
      var w = typeof i, c;
      if (w === "string") {
        if (C) {
          let b = C[i];
          if (b >= 0) {
            b < 16 ? s[r++] = b + 224 : (s[r++] = 198, b & 1 ? M(15 - b >> 1) : M(b - 16 >> 1));
            return;
          } else if (v && !e.pack) {
            let m = v.get(i);
            m ? m.count++ : v.set(i, { count: 1 });
          }
        }
        let d = i.length;
        if (_ && d >= 4 && d < 1024) {
          if ((_.size += d) > Et) {
            let m, A = (_[0] ? _[0].length * 3 + _[1].length : 0) + 10;
            r + A > H && (s = X(r + A)), s[r++] = 217, s[r++] = 223, s[r++] = 249, s[r++] = _.position ? 132 : 130, s[r++] = 26, m = r - t, r += 4, _.position && Xe(t, M), _ = ["", ""], _.size = 0, _.position = m;
          }
          let b = Ot.test(i);
          _[b ? 0 : 1] += i, s[r++] = b ? 206 : 207, M(d);
          return;
        }
        let u;
        d < 32 ? u = 1 : d < 256 ? u = 2 : d < 65536 ? u = 3 : u = 5;
        let g = d * 3;
        if (r + g > H && (s = X(r + g)), d < 64 || !h) {
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
            if (d < 4 || (u = i * Fe[(s[r] & 127) << 1 | s[r + 1] >> 7]) >> 0 === u) {
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
            this.skipFunction === !0 && (i = Object.fromEntries([...Object.keys(i).filter((u) => typeof i[u] != "function").map((u) => [u, i[u]])])), be(i);
          else if (d === Array) {
            c = i.length, c < 24 ? s[r++] = 128 | c : J(c);
            for (let u = 0; u < c; u++) M(i[u]);
          } else if (d === Map)
            if ((this.mapsAsObjects ? this.useTag259ForMaps !== !1 : this.useTag259ForMaps) && (s[r++] = 217, s[r++] = 1, s[r++] = 3), c = i.size, c < 24 ? s[r++] = 160 | c : c < 256 ? (s[r++] = 184, s[r++] = c) : c < 65536 ? (s[r++] = 185, s[r++] = c >> 8, s[r++] = c & 255) : (s[r++] = 186, k.setUint32(r, c), r += 4), y.keyMap) for (let [u, g] of i)
              M(y.encodeKey(u)), M(g);
            else for (let [u, g] of i)
              M(u), M(g);
          else {
            for (let u = 0, g = De.length; u < g; u++) {
              let b = lt[u];
              if (i instanceof b) {
                let m = De[u], A = m.tag;
                A == null && (A = m.getTag && m.getTag.call(this, i)), A < 24 ? s[r++] = 192 | A : A < 256 ? (s[r++] = 216, s[r++] = A) : A < 65536 ? (s[r++] = 217, s[r++] = A >> 8, s[r++] = A & 255) : A > -1 && (s[r++] = 218, k.setUint32(r, A), r += 4), m.encode.call(this, i, M, X);
                return;
              }
            }
            if (i[Symbol.iterator]) {
              if (Ae) {
                let u = /* @__PURE__ */ new Error("Iterable should be serialized as iterator");
                throw u.iteratorNotHandled = !0, u;
              }
              s[r++] = 159;
              for (let u of i) M(u);
              s[r++] = 255;
              return;
            }
            if (i[Symbol.asyncIterator] || Ee(i)) {
              let u = /* @__PURE__ */ new Error("Iterable/blob should be serialized as iterator");
              throw u.iteratorNotHandled = !0, u;
            }
            if (this.useToJSON && i.toJSON) {
              const u = i.toJSON();
              if (u !== i) return M(u);
            }
            be(i);
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
          Pe(new Uint8Array(d.reverse()), X);
          return;
        }
        r += 8;
      } else if (w === "undefined") s[r++] = 247;
      else throw new Error("Unknown type: " + w);
    }, be = this.useRecords === !1 ? this.variableMapSize ? (i) => {
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
          let Ke = m[I];
          c = d[Ke], c || (c = d[Ke] = /* @__PURE__ */ Object.create(null), u++), d = c;
        }
      } else for (let I in i) (typeof i.hasOwnProperty != "function" || i.hasOwnProperty(I)) && (c = d[I], c || (d[j] & 1048576 && (b = d[j] & 65535), c = d[I] = /* @__PURE__ */ Object.create(null), u++), d = c, g++);
      let A = d[j];
      if (A !== void 0)
        A &= 65535, s[r++] = 217, s[r++] = A >> 8 | 224, s[r++] = A & 255;
      else if (m || (m = d.__keys__ || (d.__keys__ = Object.keys(i))), b === void 0 ? (A = l.nextId++, A || (A = 0, l.nextId = 1), A >= qe && (l.nextId = (A = S) + 1)) : A = b, l[A] = m, A < S) {
        s[r++] = 217, s[r++] = A >> 8 | 224, s[r++] = A & 255, d = l.transitions;
        for (let I = 0; I < g; I++)
          (d[j] === void 0 || d[j] & 1048576) && (d[j] = A), d = d[m[I]];
        d[j] = A | 1048576, a = !0;
      } else {
        if (d[j] = A, k.setUint32(r, 3655335680), r += 3, u && (ge += oe * u), L.length >= qe - S && (L.shift()[j] = void 0), L.push(d), J(g + 2), M(57344 + A), M(m), w) return;
        for (let I in i) (typeof i.hasOwnProperty != "function" || i.hasOwnProperty(I)) && M(i[I]);
        return;
      }
      if (g < 24 ? s[r++] = 128 | g : J(g), !w)
        for (let I in i) (typeof i.hasOwnProperty != "function" || i.hasOwnProperty(I)) && M(i[I]);
    }, X = (i) => {
      let w;
      if (i > 16777216) {
        if (i - t > Ge) throw new Error("Encoded buffer would be larger than maximum buffer size");
        w = Math.min(Ge, Math.round(Math.max((i - t) * (i > 67108864 ? 1.25 : 2), 4194304) / 4096) * 4096);
      } else w = (Math.max(i - t << 2, s.length - 1) >> 12) + 1 << 12;
      let c = new Se(w);
      return k = new DataView(c.buffer, 0, w), s.copy ? s.copy(c, 0, t, i) : c.set(s.slice(t, i)), r -= t, t = 0, H = c.length - 10, s = c;
    };
    let Y = 100, Ce = 1e3;
    this.encodeAsIterable = function(i, w) {
      return je(i, w, Q);
    }, this.encodeAsAsyncIterable = function(i, w) {
      return je(i, w, Le);
    };
    function* Q(i, w, c) {
      let d = i.constructor;
      if (d === Object) {
        let u = y.useRecords !== !1;
        u ? be(i, !0) : Ze(Object.keys(i).length, 160);
        for (let g in i) {
          let b = i[g];
          u || M(g), b && typeof b == "object" ? w[g] ? yield* Q(b, w[g]) : yield* me(b, w, g) : M(b);
        }
      } else if (d === Array) {
        let u = i.length;
        J(u);
        for (let g = 0; g < u; g++) {
          let b = i[g];
          b && (typeof b == "object" || r - t > Y) ? w.element ? yield* Q(b, w.element) : yield* me(b, w, "element") : M(b);
        }
      } else if (i[Symbol.iterator] && !i.buffer) {
        s[r++] = 159;
        for (let u of i) u && (typeof u == "object" || r - t > Y) ? w.element ? yield* Q(u, w.element) : yield* me(u, w, "element") : M(u);
        s[r++] = 255;
      } else Ee(i) ? (Ze(i.size, 64), yield s.subarray(t, r), yield i, ie()) : i[Symbol.asyncIterator] ? (s[r++] = 159, yield s.subarray(t, r), yield i, ie(), s[r++] = 255) : M(i);
      c && r > t ? yield s.subarray(t, r) : r - t > Y && (yield s.subarray(t, r), ie());
    }
    function* me(i, w, c) {
      let d = r - t;
      try {
        M(i), r - t > Y && (yield s.subarray(t, r), ie());
      } catch (u) {
        if (u.iteratorNotHandled)
          w[c] = {}, r = t + d, yield* Q.call(this, i, w[c]);
        else throw u;
      }
    }
    function ie() {
      Y = Ce, y.encode(null, Oe);
    }
    function je(i, w, c) {
      return w && w.chunkThreshold ? Y = Ce = w.chunkThreshold : Y = 100, i && typeof i == "object" ? (y.encode(null, Oe), c(i, y.iterateProperties || (y.iterateProperties = {}), !0)) : [y.encode(i)];
    }
    async function* Le(i, w) {
      for (let c of Q(i, w, !0)) {
        let d = c.constructor;
        if (d === Ye || d === Uint8Array) yield c;
        else if (Ee(c)) {
          let u = c.stream().getReader(), g;
          for (; !(g = await u.read()).done; ) yield g.value;
        } else if (c[Symbol.asyncIterator]) for await (let u of c)
          ie(), u ? yield* Le(u, w.async || (w.async = {})) : yield y.encode(u);
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
    let t = this.structures.slice(0), n = new at(t, this.sharedValues, this.sharedVersion), a = this.saveShared(n, (l) => (l && l.version || 0) == e);
    return a === !1 ? (n = this.getShared() || {}, this.structures = n.structures || [], this.sharedValues = n.packedValues, this.sharedVersion = n.version, this.structures.nextId = this.structures.length) : t.forEach((l, o) => this.structures[o] = l), a;
  }
};
function Ze(e, t) {
  e < 24 ? s[r++] = t | e : e < 256 ? (s[r++] = t | 24, s[r++] = e) : e < 65536 ? (s[r++] = t | 25, s[r++] = e >> 8, s[r++] = e & 255) : (s[r++] = t | 26, k.setUint32(r, e), r += 4);
}
var at = class {
  constructor(e, t, n) {
    this.structures = e, this.packedValues = t, this.version = n;
  }
};
function J(e) {
  e < 24 ? s[r++] = 128 | e : e < 256 ? (s[r++] = 152, s[r++] = e) : e < 65536 ? (s[r++] = 153, s[r++] = e >> 8, s[r++] = e & 255) : (s[r++] = 154, k.setUint32(r, e), r += 4);
}
var Mt = typeof Blob > "u" ? function() {
} : Blob;
function Ee(e) {
  if (e instanceof Mt) return !0;
  let t = e[Symbol.toStringTag];
  return t === "Blob" || t === "File";
}
function he(e, t) {
  switch (typeof e) {
    case "string":
      if (e.length > 3) {
        if (t.objectMap[e] > -1 || t.values.length >= t.maxValues) return;
        let a = t.get(e);
        if (a)
          ++a.count == 2 && t.values.push(e);
        else if (t.set(e, { count: 1 }), t.samplingPackedValues) {
          let l = t.samplingPackedValues.get(e);
          l ? l.count++ : t.samplingPackedValues.set(e, { count: 1 });
        }
      }
      break;
    case "object":
      if (e)
        if (e instanceof Array) for (let a = 0, l = e.length; a < l; a++) he(e[a], t);
        else {
          let a = !t.encoder.useRecords;
          for (var n in e) e.hasOwnProperty(n) && (a && he(n, t), he(e[n], t));
        }
      break;
    case "function":
      console.log(e);
  }
}
var kt = new Uint8Array(new Uint16Array([1]).buffer)[0] == 1;
lt = [
  Date,
  Set,
  Error,
  RegExp,
  Z,
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
  at
];
De = [
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
    Pe(e, n);
  } },
  {
    getTag(e) {
      if (e.constructor === Uint8Array && (this.tagUint8Array || fe && this.tagUint8Array !== !1))
        return 64;
    },
    encode(e, t, n) {
      Pe(e, n);
    }
  },
  $(68, 1),
  $(69, 2),
  $(70, 4),
  $(71, 8),
  $(72, 1),
  $(77, 2),
  $(78, 4),
  $(79, 8),
  $(85, 4),
  $(86, 8),
  { encode(e, t) {
    let n = e.packedValues || [], a = e.structures || [];
    if (n.values.length > 0) {
      s[r++] = 216, s[r++] = 51, J(4);
      let l = n.values;
      t(l), J(0), J(0), packedObjectMap = Object.create(sharedPackedObjectMap || null);
      for (let o = 0, h = l.length; o < h; o++) packedObjectMap[l[o]] = o;
    }
    if (a) {
      k.setUint32(r, 3655335424), r += 3;
      let l = a.slice(0);
      l.unshift(57344), l.push(new Z(e.version, 1399353956)), t(l);
    } else t(new Z(e.version, 1399353956));
  } }
];
function $(e, t) {
  return !kt && t > 1 && (e -= 4), {
    tag: e,
    encode: function(a, l) {
      let o = a.byteLength, h = a.byteOffset || 0, y = a.buffer || a;
      l(fe ? we.from(y, h, o) : new Uint8Array(y, h, o));
    }
  };
}
function Pe(e, t) {
  let n = e.byteLength;
  n < 24 ? s[r++] = 64 + n : n < 256 ? (s[r++] = 88, s[r++] = n) : n < 65536 ? (s[r++] = 89, s[r++] = n >> 8, s[r++] = n & 255) : (s[r++] = 90, k.setUint32(r, n), r += 4), r + n >= s.length && t(r + n), s.set(e.buffer ? e : new Uint8Array(e), r), r += n;
}
function Ut(e, t) {
  let n, a = t.length * 2, l = e.length - a;
  t.sort((o, h) => o.offset > h.offset ? 1 : -1);
  for (let o = 0; o < t.length; o++) {
    let h = t[o];
    h.id = o;
    for (let y of h.references)
      e[y++] = o >> 8, e[y] = o & 255;
  }
  for (; n = t.pop(); ) {
    let o = n.offset;
    e.copyWithin(o + a, o, l), a -= 2;
    let h = o + a;
    e[h++] = 216, e[h++] = 28, l = o;
  }
  return e;
}
function Xe(e, t) {
  k.setUint32(_.position + e, r - _.position - e + 1);
  let n = _;
  _ = null, t(n[0]), t(n[1]);
}
var Ne = new It({ useRecords: !1 }), Bt = Ne.encode, Rt = Ne.encodeAsIterable, _t = Ne.encodeAsAsyncIterable, { NEVER: Dt, ALWAYS: Pt, DECIMAL_ROUND: Tt, DECIMAL_FIT: Ft } = At;
var Oe = 2048;
export {
  vt as decode,
  Bt as encode
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiY2Jvci14LSF+ezAwMH1+LmpzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyIvLyNyZWdpb24gLi4vLi4vLi4vbm9kZV9tb2R1bGVzL2Nib3IteC9kZWNvZGUuanNcbnZhciBkZWNvZGVyO1xudHJ5IHtcblx0ZGVjb2RlciA9IG5ldyBUZXh0RGVjb2RlcigpO1xufSBjYXRjaCAoZXJyb3IpIHt9XG52YXIgc3JjO1xudmFyIHNyY0VuZDtcbnZhciBwb3NpdGlvbiQxID0gMDtcbnZhciBFTVBUWV9BUlJBWSA9IFtdO1xudmFyIExFR0FDWV9SRUNPUkRfSU5MSU5FX0lEID0gMTA1O1xudmFyIFJFQ09SRF9ERUZJTklUSU9OU19JRCA9IDU3MzQyO1xudmFyIFJFQ09SRF9JTkxJTkVfSUQgPSA1NzM0MztcbnZhciBCVU5ETEVEX1NUUklOR1NfSUQgPSA1NzMzNztcbnZhciBQQUNLRURfUkVGRVJFTkNFX1RBR19JRCA9IDY7XG52YXIgU1RPUF9DT0RFID0ge307XG52YXIgbWF4QXJyYXlTaXplID0gMTEyODFlNDtcbnZhciBtYXhNYXBTaXplID0gMTY4MWU0O1xudmFyIHN0cmluZ3MgPSBFTVBUWV9BUlJBWTtcbnZhciBzdHJpbmdQb3NpdGlvbiA9IDA7XG52YXIgY3VycmVudERlY29kZXIgPSB7fTtcbnZhciBjdXJyZW50U3RydWN0dXJlcztcbnZhciBzcmNTdHJpbmc7XG52YXIgc3JjU3RyaW5nU3RhcnQgPSAwO1xudmFyIHNyY1N0cmluZ0VuZCA9IDA7XG52YXIgYnVuZGxlZFN0cmluZ3MkMTtcbnZhciByZWZlcmVuY2VNYXA7XG52YXIgY3VycmVudEV4dGVuc2lvbnMgPSBbXTtcbnZhciBjdXJyZW50RXh0ZW5zaW9uUmFuZ2VzID0gW107XG52YXIgcGFja2VkVmFsdWVzO1xudmFyIGRhdGFWaWV3O1xudmFyIHJlc3RvcmVNYXBzQXNPYmplY3Q7XG52YXIgZGVmYXVsdE9wdGlvbnMgPSB7XG5cdHVzZVJlY29yZHM6IGZhbHNlLFxuXHRtYXBzQXNPYmplY3RzOiB0cnVlXG59O1xudmFyIHNlcXVlbnRpYWxNb2RlID0gZmFsc2U7XG52YXIgaW5saW5lT2JqZWN0UmVhZFRocmVzaG9sZCA9IDI7XG50cnkge1xuXHRuZXcgRnVuY3Rpb24oXCJcIik7XG59IGNhdGNoIChlcnJvcikge1xuXHRpbmxpbmVPYmplY3RSZWFkVGhyZXNob2xkID0gSW5maW5pdHk7XG59XG52YXIgRGVjb2RlciA9IGNsYXNzIERlY29kZXIge1xuXHRjb25zdHJ1Y3RvcihvcHRpb25zKSB7XG5cdFx0aWYgKG9wdGlvbnMpIHtcblx0XHRcdGlmICgob3B0aW9ucy5rZXlNYXAgfHwgb3B0aW9ucy5fa2V5TWFwKSAmJiAhb3B0aW9ucy51c2VSZWNvcmRzKSB7XG5cdFx0XHRcdG9wdGlvbnMudXNlUmVjb3JkcyA9IGZhbHNlO1xuXHRcdFx0XHRvcHRpb25zLm1hcHNBc09iamVjdHMgPSB0cnVlO1xuXHRcdFx0fVxuXHRcdFx0aWYgKG9wdGlvbnMudXNlUmVjb3JkcyA9PT0gZmFsc2UgJiYgb3B0aW9ucy5tYXBzQXNPYmplY3RzID09PSB2b2lkIDApIG9wdGlvbnMubWFwc0FzT2JqZWN0cyA9IHRydWU7XG5cdFx0XHRpZiAob3B0aW9ucy5nZXRTdHJ1Y3R1cmVzKSBvcHRpb25zLmdldFNoYXJlZCA9IG9wdGlvbnMuZ2V0U3RydWN0dXJlcztcblx0XHRcdGlmIChvcHRpb25zLmdldFNoYXJlZCAmJiAhb3B0aW9ucy5zdHJ1Y3R1cmVzKSAob3B0aW9ucy5zdHJ1Y3R1cmVzID0gW10pLnVuaW5pdGlhbGl6ZWQgPSB0cnVlO1xuXHRcdFx0aWYgKG9wdGlvbnMua2V5TWFwKSB7XG5cdFx0XHRcdHRoaXMubWFwS2V5ID0gLyogQF9fUFVSRV9fICovIG5ldyBNYXAoKTtcblx0XHRcdFx0Zm9yIChsZXQgW2ssIHZdIG9mIE9iamVjdC5lbnRyaWVzKG9wdGlvbnMua2V5TWFwKSkgdGhpcy5tYXBLZXkuc2V0KHYsIGspO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRPYmplY3QuYXNzaWduKHRoaXMsIG9wdGlvbnMpO1xuXHR9XG5cdGRlY29kZUtleShrZXkpIHtcblx0XHRyZXR1cm4gdGhpcy5rZXlNYXAgPyB0aGlzLm1hcEtleS5nZXQoa2V5KSB8fCBrZXkgOiBrZXk7XG5cdH1cblx0ZW5jb2RlS2V5KGtleSkge1xuXHRcdHJldHVybiB0aGlzLmtleU1hcCAmJiB0aGlzLmtleU1hcC5oYXNPd25Qcm9wZXJ0eShrZXkpID8gdGhpcy5rZXlNYXBba2V5XSA6IGtleTtcblx0fVxuXHRlbmNvZGVLZXlzKHJlYykge1xuXHRcdGlmICghdGhpcy5fa2V5TWFwKSByZXR1cm4gcmVjO1xuXHRcdGxldCBtYXAgPSAvKiBAX19QVVJFX18gKi8gbmV3IE1hcCgpO1xuXHRcdGZvciAobGV0IFtrLCB2XSBvZiBPYmplY3QuZW50cmllcyhyZWMpKSBtYXAuc2V0KHRoaXMuX2tleU1hcC5oYXNPd25Qcm9wZXJ0eShrKSA/IHRoaXMuX2tleU1hcFtrXSA6IGssIHYpO1xuXHRcdHJldHVybiBtYXA7XG5cdH1cblx0ZGVjb2RlS2V5cyhtYXApIHtcblx0XHRpZiAoIXRoaXMuX2tleU1hcCB8fCBtYXAuY29uc3RydWN0b3IubmFtZSAhPSBcIk1hcFwiKSByZXR1cm4gbWFwO1xuXHRcdGlmICghdGhpcy5fbWFwS2V5KSB7XG5cdFx0XHR0aGlzLl9tYXBLZXkgPSAvKiBAX19QVVJFX18gKi8gbmV3IE1hcCgpO1xuXHRcdFx0Zm9yIChsZXQgW2ssIHZdIG9mIE9iamVjdC5lbnRyaWVzKHRoaXMuX2tleU1hcCkpIHRoaXMuX21hcEtleS5zZXQodiwgayk7XG5cdFx0fVxuXHRcdGxldCByZXMgPSB7fTtcblx0XHRtYXAuZm9yRWFjaCgodiwgaykgPT4gcmVzW3NhZmVLZXkodGhpcy5fbWFwS2V5LmhhcyhrKSA/IHRoaXMuX21hcEtleS5nZXQoaykgOiBrKV0gPSB2KTtcblx0XHRyZXR1cm4gcmVzO1xuXHR9XG5cdG1hcERlY29kZShzb3VyY2UsIGVuZCkge1xuXHRcdGxldCByZXMgPSB0aGlzLmRlY29kZShzb3VyY2UpO1xuXHRcdGlmICh0aGlzLl9rZXlNYXApIHN3aXRjaCAocmVzLmNvbnN0cnVjdG9yLm5hbWUpIHtcblx0XHRcdGNhc2UgXCJBcnJheVwiOiByZXR1cm4gcmVzLm1hcCgocikgPT4gdGhpcy5kZWNvZGVLZXlzKHIpKTtcblx0XHR9XG5cdFx0cmV0dXJuIHJlcztcblx0fVxuXHRkZWNvZGUoc291cmNlLCBlbmQpIHtcblx0XHRpZiAoc3JjKSByZXR1cm4gc2F2ZVN0YXRlKCgpID0+IHtcblx0XHRcdGNsZWFyU291cmNlKCk7XG5cdFx0XHRyZXR1cm4gdGhpcyA/IHRoaXMuZGVjb2RlKHNvdXJjZSwgZW5kKSA6IERlY29kZXIucHJvdG90eXBlLmRlY29kZS5jYWxsKGRlZmF1bHRPcHRpb25zLCBzb3VyY2UsIGVuZCk7XG5cdFx0fSk7XG5cdFx0c3JjRW5kID0gZW5kID4gLTEgPyBlbmQgOiBzb3VyY2UubGVuZ3RoO1xuXHRcdHBvc2l0aW9uJDEgPSAwO1xuXHRcdHN0cmluZ1Bvc2l0aW9uID0gMDtcblx0XHRzcmNTdHJpbmdFbmQgPSAwO1xuXHRcdHNyY1N0cmluZyA9IG51bGw7XG5cdFx0c3RyaW5ncyA9IEVNUFRZX0FSUkFZO1xuXHRcdGJ1bmRsZWRTdHJpbmdzJDEgPSBudWxsO1xuXHRcdHNyYyA9IHNvdXJjZTtcblx0XHR0cnkge1xuXHRcdFx0ZGF0YVZpZXcgPSBzb3VyY2UuZGF0YVZpZXcgfHwgKHNvdXJjZS5kYXRhVmlldyA9IG5ldyBEYXRhVmlldyhzb3VyY2UuYnVmZmVyLCBzb3VyY2UuYnl0ZU9mZnNldCwgc291cmNlLmJ5dGVMZW5ndGgpKTtcblx0XHR9IGNhdGNoIChlcnJvcikge1xuXHRcdFx0c3JjID0gbnVsbDtcblx0XHRcdGlmIChzb3VyY2UgaW5zdGFuY2VvZiBVaW50OEFycmF5KSB0aHJvdyBlcnJvcjtcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIlNvdXJjZSBtdXN0IGJlIGEgVWludDhBcnJheSBvciBCdWZmZXIgYnV0IHdhcyBhIFwiICsgKHNvdXJjZSAmJiB0eXBlb2Ygc291cmNlID09IFwib2JqZWN0XCIgPyBzb3VyY2UuY29uc3RydWN0b3IubmFtZSA6IHR5cGVvZiBzb3VyY2UpKTtcblx0XHR9XG5cdFx0aWYgKHRoaXMgaW5zdGFuY2VvZiBEZWNvZGVyKSB7XG5cdFx0XHRjdXJyZW50RGVjb2RlciA9IHRoaXM7XG5cdFx0XHRwYWNrZWRWYWx1ZXMgPSB0aGlzLnNoYXJlZFZhbHVlcyAmJiAodGhpcy5wYWNrID8gbmV3IEFycmF5KHRoaXMubWF4UHJpdmF0ZVBhY2tlZFZhbHVlcyB8fCAxNikuY29uY2F0KHRoaXMuc2hhcmVkVmFsdWVzKSA6IHRoaXMuc2hhcmVkVmFsdWVzKTtcblx0XHRcdGlmICh0aGlzLnN0cnVjdHVyZXMpIHtcblx0XHRcdFx0Y3VycmVudFN0cnVjdHVyZXMgPSB0aGlzLnN0cnVjdHVyZXM7XG5cdFx0XHRcdHJldHVybiBjaGVja2VkUmVhZCgpO1xuXHRcdFx0fSBlbHNlIGlmICghY3VycmVudFN0cnVjdHVyZXMgfHwgY3VycmVudFN0cnVjdHVyZXMubGVuZ3RoID4gMCkgY3VycmVudFN0cnVjdHVyZXMgPSBbXTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0Y3VycmVudERlY29kZXIgPSBkZWZhdWx0T3B0aW9ucztcblx0XHRcdGlmICghY3VycmVudFN0cnVjdHVyZXMgfHwgY3VycmVudFN0cnVjdHVyZXMubGVuZ3RoID4gMCkgY3VycmVudFN0cnVjdHVyZXMgPSBbXTtcblx0XHRcdHBhY2tlZFZhbHVlcyA9IG51bGw7XG5cdFx0fVxuXHRcdHJldHVybiBjaGVja2VkUmVhZCgpO1xuXHR9XG5cdGRlY29kZU11bHRpcGxlKHNvdXJjZSwgZm9yRWFjaCkge1xuXHRcdGxldCB2YWx1ZXMsIGxhc3RQb3NpdGlvbiA9IDA7XG5cdFx0dHJ5IHtcblx0XHRcdGxldCBzaXplID0gc291cmNlLmxlbmd0aDtcblx0XHRcdHNlcXVlbnRpYWxNb2RlID0gdHJ1ZTtcblx0XHRcdGxldCB2YWx1ZSA9IHRoaXMgPyB0aGlzLmRlY29kZShzb3VyY2UsIHNpemUpIDogZGVmYXVsdERlY29kZXIuZGVjb2RlKHNvdXJjZSwgc2l6ZSk7XG5cdFx0XHRpZiAoZm9yRWFjaCkge1xuXHRcdFx0XHRpZiAoZm9yRWFjaCh2YWx1ZSkgPT09IGZhbHNlKSByZXR1cm47XG5cdFx0XHRcdHdoaWxlIChwb3NpdGlvbiQxIDwgc2l6ZSkge1xuXHRcdFx0XHRcdGxhc3RQb3NpdGlvbiA9IHBvc2l0aW9uJDE7XG5cdFx0XHRcdFx0aWYgKGZvckVhY2goY2hlY2tlZFJlYWQoKSkgPT09IGZhbHNlKSByZXR1cm47XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHZhbHVlcyA9IFt2YWx1ZV07XG5cdFx0XHRcdHdoaWxlIChwb3NpdGlvbiQxIDwgc2l6ZSkge1xuXHRcdFx0XHRcdGxhc3RQb3NpdGlvbiA9IHBvc2l0aW9uJDE7XG5cdFx0XHRcdFx0dmFsdWVzLnB1c2goY2hlY2tlZFJlYWQoKSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIHZhbHVlcztcblx0XHRcdH1cblx0XHR9IGNhdGNoIChlcnJvcikge1xuXHRcdFx0ZXJyb3IubGFzdFBvc2l0aW9uID0gbGFzdFBvc2l0aW9uO1xuXHRcdFx0ZXJyb3IudmFsdWVzID0gdmFsdWVzO1xuXHRcdFx0dGhyb3cgZXJyb3I7XG5cdFx0fSBmaW5hbGx5IHtcblx0XHRcdHNlcXVlbnRpYWxNb2RlID0gZmFsc2U7XG5cdFx0XHRjbGVhclNvdXJjZSgpO1xuXHRcdH1cblx0fVxufTtcbmZ1bmN0aW9uIGNoZWNrZWRSZWFkKCkge1xuXHR0cnkge1xuXHRcdGxldCByZXN1bHQgPSByZWFkKCk7XG5cdFx0aWYgKGJ1bmRsZWRTdHJpbmdzJDEpIHtcblx0XHRcdGlmIChwb3NpdGlvbiQxID49IGJ1bmRsZWRTdHJpbmdzJDEucG9zdEJ1bmRsZVBvc2l0aW9uKSB7XG5cdFx0XHRcdGxldCBlcnJvciA9IC8qIEBfX1BVUkVfXyAqLyBuZXcgRXJyb3IoXCJVbmV4cGVjdGVkIGJ1bmRsZSBwb3NpdGlvblwiKTtcblx0XHRcdFx0ZXJyb3IuaW5jb21wbGV0ZSA9IHRydWU7XG5cdFx0XHRcdHRocm93IGVycm9yO1xuXHRcdFx0fVxuXHRcdFx0cG9zaXRpb24kMSA9IGJ1bmRsZWRTdHJpbmdzJDEucG9zdEJ1bmRsZVBvc2l0aW9uO1xuXHRcdFx0YnVuZGxlZFN0cmluZ3MkMSA9IG51bGw7XG5cdFx0fVxuXHRcdGlmIChwb3NpdGlvbiQxID09IHNyY0VuZCkge1xuXHRcdFx0Y3VycmVudFN0cnVjdHVyZXMgPSBudWxsO1xuXHRcdFx0c3JjID0gbnVsbDtcblx0XHRcdGlmIChyZWZlcmVuY2VNYXApIHJlZmVyZW5jZU1hcCA9IG51bGw7XG5cdFx0fSBlbHNlIGlmIChwb3NpdGlvbiQxID4gc3JjRW5kKSB7XG5cdFx0XHRsZXQgZXJyb3IgPSAvKiBAX19QVVJFX18gKi8gbmV3IEVycm9yKFwiVW5leHBlY3RlZCBlbmQgb2YgQ0JPUiBkYXRhXCIpO1xuXHRcdFx0ZXJyb3IuaW5jb21wbGV0ZSA9IHRydWU7XG5cdFx0XHR0aHJvdyBlcnJvcjtcblx0XHR9IGVsc2UgaWYgKCFzZXF1ZW50aWFsTW9kZSkgdGhyb3cgbmV3IEVycm9yKFwiRGF0YSByZWFkLCBidXQgZW5kIG9mIGJ1ZmZlciBub3QgcmVhY2hlZFwiKTtcblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9IGNhdGNoIChlcnJvcikge1xuXHRcdGNsZWFyU291cmNlKCk7XG5cdFx0aWYgKGVycm9yIGluc3RhbmNlb2YgUmFuZ2VFcnJvciB8fCBlcnJvci5tZXNzYWdlLnN0YXJ0c1dpdGgoXCJVbmV4cGVjdGVkIGVuZCBvZiBidWZmZXJcIikpIGVycm9yLmluY29tcGxldGUgPSB0cnVlO1xuXHRcdHRocm93IGVycm9yO1xuXHR9XG59XG5mdW5jdGlvbiByZWFkKCkge1xuXHRsZXQgdG9rZW4gPSBzcmNbcG9zaXRpb24kMSsrXTtcblx0bGV0IG1ham9yVHlwZSA9IHRva2VuID4+IDU7XG5cdHRva2VuID0gdG9rZW4gJiAzMTtcblx0aWYgKHRva2VuID4gMjMpIHN3aXRjaCAodG9rZW4pIHtcblx0XHRjYXNlIDI0OlxuXHRcdFx0dG9rZW4gPSBzcmNbcG9zaXRpb24kMSsrXTtcblx0XHRcdGJyZWFrO1xuXHRcdGNhc2UgMjU6XG5cdFx0XHRpZiAobWFqb3JUeXBlID09IDcpIHJldHVybiBnZXRGbG9hdDE2KCk7XG5cdFx0XHR0b2tlbiA9IGRhdGFWaWV3LmdldFVpbnQxNihwb3NpdGlvbiQxKTtcblx0XHRcdHBvc2l0aW9uJDEgKz0gMjtcblx0XHRcdGJyZWFrO1xuXHRcdGNhc2UgMjY6XG5cdFx0XHRpZiAobWFqb3JUeXBlID09IDcpIHtcblx0XHRcdFx0bGV0IHZhbHVlID0gZGF0YVZpZXcuZ2V0RmxvYXQzMihwb3NpdGlvbiQxKTtcblx0XHRcdFx0aWYgKGN1cnJlbnREZWNvZGVyLnVzZUZsb2F0MzIgPiAyKSB7XG5cdFx0XHRcdFx0bGV0IG11bHRpcGxpZXIgPSBtdWx0MTBbKHNyY1twb3NpdGlvbiQxXSAmIDEyNykgPDwgMSB8IHNyY1twb3NpdGlvbiQxICsgMV0gPj4gN107XG5cdFx0XHRcdFx0cG9zaXRpb24kMSArPSA0O1xuXHRcdFx0XHRcdHJldHVybiAobXVsdGlwbGllciAqIHZhbHVlICsgKHZhbHVlID4gMCA/IC41IDogLS41KSA+PiAwKSAvIG11bHRpcGxpZXI7XG5cdFx0XHRcdH1cblx0XHRcdFx0cG9zaXRpb24kMSArPSA0O1xuXHRcdFx0XHRyZXR1cm4gdmFsdWU7XG5cdFx0XHR9XG5cdFx0XHR0b2tlbiA9IGRhdGFWaWV3LmdldFVpbnQzMihwb3NpdGlvbiQxKTtcblx0XHRcdHBvc2l0aW9uJDEgKz0gNDtcblx0XHRcdGlmIChtYWpvclR5cGUgPT09IDEpIHJldHVybiAtMSAtIHRva2VuO1xuXHRcdFx0YnJlYWs7XG5cdFx0Y2FzZSAyNzpcblx0XHRcdGlmIChtYWpvclR5cGUgPT0gNykge1xuXHRcdFx0XHRsZXQgdmFsdWUgPSBkYXRhVmlldy5nZXRGbG9hdDY0KHBvc2l0aW9uJDEpO1xuXHRcdFx0XHRwb3NpdGlvbiQxICs9IDg7XG5cdFx0XHRcdHJldHVybiB2YWx1ZTtcblx0XHRcdH1cblx0XHRcdGlmIChtYWpvclR5cGUgPiAxKSB7XG5cdFx0XHRcdGlmIChkYXRhVmlldy5nZXRVaW50MzIocG9zaXRpb24kMSkgPiAwKSB0aHJvdyBuZXcgRXJyb3IoXCJKYXZhU2NyaXB0IGRvZXMgbm90IHN1cHBvcnQgYXJyYXlzLCBtYXBzLCBvciBzdHJpbmdzIHdpdGggbGVuZ3RoIG92ZXIgNDI5NDk2NzI5NVwiKTtcblx0XHRcdFx0dG9rZW4gPSBkYXRhVmlldy5nZXRVaW50MzIocG9zaXRpb24kMSArIDQpO1xuXHRcdFx0fSBlbHNlIGlmIChjdXJyZW50RGVjb2Rlci5pbnQ2NEFzTnVtYmVyKSB7XG5cdFx0XHRcdHRva2VuID0gZGF0YVZpZXcuZ2V0VWludDMyKHBvc2l0aW9uJDEpICogNDI5NDk2NzI5Njtcblx0XHRcdFx0dG9rZW4gKz0gZGF0YVZpZXcuZ2V0VWludDMyKHBvc2l0aW9uJDEgKyA0KTtcblx0XHRcdH0gZWxzZSB0b2tlbiA9IGRhdGFWaWV3LmdldEJpZ1VpbnQ2NChwb3NpdGlvbiQxKTtcblx0XHRcdHBvc2l0aW9uJDEgKz0gODtcblx0XHRcdGJyZWFrO1xuXHRcdGNhc2UgMzE6IHN3aXRjaCAobWFqb3JUeXBlKSB7XG5cdFx0XHRjYXNlIDI6XG5cdFx0XHRjYXNlIDM6IHRocm93IG5ldyBFcnJvcihcIkluZGVmaW5pdGUgbGVuZ3RoIG5vdCBzdXBwb3J0ZWQgZm9yIGJ5dGUgb3IgdGV4dCBzdHJpbmdzXCIpO1xuXHRcdFx0Y2FzZSA0OlxuXHRcdFx0XHRsZXQgYXJyYXkgPSBbXTtcblx0XHRcdFx0bGV0IHZhbHVlLCBpID0gMDtcblx0XHRcdFx0d2hpbGUgKCh2YWx1ZSA9IHJlYWQoKSkgIT0gU1RPUF9DT0RFKSB7XG5cdFx0XHRcdFx0aWYgKGkgPj0gbWF4QXJyYXlTaXplKSB0aHJvdyBuZXcgRXJyb3IoYEFycmF5IGxlbmd0aCBleGNlZWRzICR7bWF4QXJyYXlTaXplfWApO1xuXHRcdFx0XHRcdGFycmF5W2krK10gPSB2YWx1ZTtcblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4gbWFqb3JUeXBlID09IDQgPyBhcnJheSA6IG1ham9yVHlwZSA9PSAzID8gYXJyYXkuam9pbihcIlwiKSA6IEJ1ZmZlci5jb25jYXQoYXJyYXkpO1xuXHRcdFx0Y2FzZSA1OlxuXHRcdFx0XHRsZXQga2V5O1xuXHRcdFx0XHRpZiAoY3VycmVudERlY29kZXIubWFwc0FzT2JqZWN0cykge1xuXHRcdFx0XHRcdGxldCBvYmplY3QgPSB7fTtcblx0XHRcdFx0XHRsZXQgaSA9IDA7XG5cdFx0XHRcdFx0aWYgKGN1cnJlbnREZWNvZGVyLmtleU1hcCkgd2hpbGUgKChrZXkgPSByZWFkKCkpICE9IFNUT1BfQ09ERSkge1xuXHRcdFx0XHRcdFx0aWYgKGkrKyA+PSBtYXhNYXBTaXplKSB0aHJvdyBuZXcgRXJyb3IoYFByb3BlcnR5IGNvdW50IGV4Y2VlZHMgJHttYXhNYXBTaXplfWApO1xuXHRcdFx0XHRcdFx0b2JqZWN0W3NhZmVLZXkoY3VycmVudERlY29kZXIuZGVjb2RlS2V5KGtleSkpXSA9IHJlYWQoKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWxzZSB3aGlsZSAoKGtleSA9IHJlYWQoKSkgIT0gU1RPUF9DT0RFKSB7XG5cdFx0XHRcdFx0XHRpZiAoaSsrID49IG1heE1hcFNpemUpIHRocm93IG5ldyBFcnJvcihgUHJvcGVydHkgY291bnQgZXhjZWVkcyAke21heE1hcFNpemV9YCk7XG5cdFx0XHRcdFx0XHRvYmplY3Rbc2FmZUtleShrZXkpXSA9IHJlYWQoKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0cmV0dXJuIG9iamVjdDtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRpZiAocmVzdG9yZU1hcHNBc09iamVjdCkge1xuXHRcdFx0XHRcdFx0Y3VycmVudERlY29kZXIubWFwc0FzT2JqZWN0cyA9IHRydWU7XG5cdFx0XHRcdFx0XHRyZXN0b3JlTWFwc0FzT2JqZWN0ID0gZmFsc2U7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGxldCBtYXAgPSAvKiBAX19QVVJFX18gKi8gbmV3IE1hcCgpO1xuXHRcdFx0XHRcdGlmIChjdXJyZW50RGVjb2Rlci5rZXlNYXApIHtcblx0XHRcdFx0XHRcdGxldCBpID0gMDtcblx0XHRcdFx0XHRcdHdoaWxlICgoa2V5ID0gcmVhZCgpKSAhPSBTVE9QX0NPREUpIHtcblx0XHRcdFx0XHRcdFx0aWYgKGkrKyA+PSBtYXhNYXBTaXplKSB0aHJvdyBuZXcgRXJyb3IoYE1hcCBzaXplIGV4Y2VlZHMgJHttYXhNYXBTaXplfWApO1xuXHRcdFx0XHRcdFx0XHRtYXAuc2V0KGN1cnJlbnREZWNvZGVyLmRlY29kZUtleShrZXkpLCByZWFkKCkpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRsZXQgaSA9IDA7XG5cdFx0XHRcdFx0XHR3aGlsZSAoKGtleSA9IHJlYWQoKSkgIT0gU1RPUF9DT0RFKSB7XG5cdFx0XHRcdFx0XHRcdGlmIChpKysgPj0gbWF4TWFwU2l6ZSkgdGhyb3cgbmV3IEVycm9yKGBNYXAgc2l6ZSBleGNlZWRzICR7bWF4TWFwU2l6ZX1gKTtcblx0XHRcdFx0XHRcdFx0bWFwLnNldChrZXksIHJlYWQoKSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHJldHVybiBtYXA7XG5cdFx0XHRcdH1cblx0XHRcdGNhc2UgNzogcmV0dXJuIFNUT1BfQ09ERTtcblx0XHRcdGRlZmF1bHQ6IHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgbWFqb3IgdHlwZSBmb3IgaW5kZWZpbml0ZSBsZW5ndGggXCIgKyBtYWpvclR5cGUpO1xuXHRcdH1cblx0XHRkZWZhdWx0OiB0aHJvdyBuZXcgRXJyb3IoXCJVbmtub3duIHRva2VuIFwiICsgdG9rZW4pO1xuXHR9XG5cdHN3aXRjaCAobWFqb3JUeXBlKSB7XG5cdFx0Y2FzZSAwOiByZXR1cm4gdG9rZW47XG5cdFx0Y2FzZSAxOiByZXR1cm4gfnRva2VuO1xuXHRcdGNhc2UgMjogcmV0dXJuIHJlYWRCaW4odG9rZW4pO1xuXHRcdGNhc2UgMzpcblx0XHRcdGlmIChzcmNTdHJpbmdFbmQgPj0gcG9zaXRpb24kMSkgcmV0dXJuIHNyY1N0cmluZy5zbGljZShwb3NpdGlvbiQxIC0gc3JjU3RyaW5nU3RhcnQsIChwb3NpdGlvbiQxICs9IHRva2VuKSAtIHNyY1N0cmluZ1N0YXJ0KTtcblx0XHRcdGlmIChzcmNTdHJpbmdFbmQgPT0gMCAmJiBzcmNFbmQgPCAxNDAgJiYgdG9rZW4gPCAzMikge1xuXHRcdFx0XHRsZXQgc3RyaW5nID0gdG9rZW4gPCAxNiA/IHNob3J0U3RyaW5nSW5KUyh0b2tlbikgOiBsb25nU3RyaW5nSW5KUyh0b2tlbik7XG5cdFx0XHRcdGlmIChzdHJpbmcgIT0gbnVsbCkgcmV0dXJuIHN0cmluZztcblx0XHRcdH1cblx0XHRcdHJldHVybiByZWFkRml4ZWRTdHJpbmcodG9rZW4pO1xuXHRcdGNhc2UgNDpcblx0XHRcdGlmICh0b2tlbiA+PSBtYXhBcnJheVNpemUpIHRocm93IG5ldyBFcnJvcihgQXJyYXkgbGVuZ3RoIGV4Y2VlZHMgJHttYXhBcnJheVNpemV9YCk7XG5cdFx0XHRsZXQgYXJyYXkgPSBuZXcgQXJyYXkodG9rZW4pO1xuXHRcdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCB0b2tlbjsgaSsrKSBhcnJheVtpXSA9IHJlYWQoKTtcblx0XHRcdHJldHVybiBhcnJheTtcblx0XHRjYXNlIDU6XG5cdFx0XHRpZiAodG9rZW4gPj0gbWF4TWFwU2l6ZSkgdGhyb3cgbmV3IEVycm9yKGBNYXAgc2l6ZSBleGNlZWRzICR7bWF4QXJyYXlTaXplfWApO1xuXHRcdFx0aWYgKGN1cnJlbnREZWNvZGVyLm1hcHNBc09iamVjdHMpIHtcblx0XHRcdFx0bGV0IG9iamVjdCA9IHt9O1xuXHRcdFx0XHRpZiAoY3VycmVudERlY29kZXIua2V5TWFwKSBmb3IgKGxldCBpID0gMDsgaSA8IHRva2VuOyBpKyspIG9iamVjdFtzYWZlS2V5KGN1cnJlbnREZWNvZGVyLmRlY29kZUtleShyZWFkKCkpKV0gPSByZWFkKCk7XG5cdFx0XHRcdGVsc2UgZm9yIChsZXQgaSA9IDA7IGkgPCB0b2tlbjsgaSsrKSBvYmplY3Rbc2FmZUtleShyZWFkKCkpXSA9IHJlYWQoKTtcblx0XHRcdFx0cmV0dXJuIG9iamVjdDtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGlmIChyZXN0b3JlTWFwc0FzT2JqZWN0KSB7XG5cdFx0XHRcdFx0Y3VycmVudERlY29kZXIubWFwc0FzT2JqZWN0cyA9IHRydWU7XG5cdFx0XHRcdFx0cmVzdG9yZU1hcHNBc09iamVjdCA9IGZhbHNlO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGxldCBtYXAgPSAvKiBAX19QVVJFX18gKi8gbmV3IE1hcCgpO1xuXHRcdFx0XHRpZiAoY3VycmVudERlY29kZXIua2V5TWFwKSBmb3IgKGxldCBpID0gMDsgaSA8IHRva2VuOyBpKyspIG1hcC5zZXQoY3VycmVudERlY29kZXIuZGVjb2RlS2V5KHJlYWQoKSksIHJlYWQoKSk7XG5cdFx0XHRcdGVsc2UgZm9yIChsZXQgaSA9IDA7IGkgPCB0b2tlbjsgaSsrKSBtYXAuc2V0KHJlYWQoKSwgcmVhZCgpKTtcblx0XHRcdFx0cmV0dXJuIG1hcDtcblx0XHRcdH1cblx0XHRjYXNlIDY6XG5cdFx0XHRpZiAodG9rZW4gPj0gQlVORExFRF9TVFJJTkdTX0lEKSB7XG5cdFx0XHRcdGxldCBzdHJ1Y3R1cmUgPSBjdXJyZW50U3RydWN0dXJlc1t0b2tlbiAmIDgxOTFdO1xuXHRcdFx0XHRpZiAoc3RydWN0dXJlKSB7XG5cdFx0XHRcdFx0aWYgKCFzdHJ1Y3R1cmUucmVhZCkgc3RydWN0dXJlLnJlYWQgPSBjcmVhdGVTdHJ1Y3R1cmVSZWFkZXIoc3RydWN0dXJlKTtcblx0XHRcdFx0XHRyZXR1cm4gc3RydWN0dXJlLnJlYWQoKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAodG9rZW4gPCA2NTUzNikge1xuXHRcdFx0XHRcdGlmICh0b2tlbiA9PSBSRUNPUkRfSU5MSU5FX0lEKSB7XG5cdFx0XHRcdFx0XHRsZXQgbGVuZ3RoID0gcmVhZEp1c3RMZW5ndGgoKTtcblx0XHRcdFx0XHRcdGxldCBpZCA9IHJlYWQoKTtcblx0XHRcdFx0XHRcdGxldCBzdHJ1Y3R1cmUgPSByZWFkKCk7XG5cdFx0XHRcdFx0XHRyZWNvcmREZWZpbml0aW9uKGlkLCBzdHJ1Y3R1cmUpO1xuXHRcdFx0XHRcdFx0bGV0IG9iamVjdCA9IHt9O1xuXHRcdFx0XHRcdFx0aWYgKGN1cnJlbnREZWNvZGVyLmtleU1hcCkgZm9yIChsZXQgaSA9IDI7IGkgPCBsZW5ndGg7IGkrKykge1xuXHRcdFx0XHRcdFx0XHRsZXQga2V5ID0gY3VycmVudERlY29kZXIuZGVjb2RlS2V5KHN0cnVjdHVyZVtpIC0gMl0pO1xuXHRcdFx0XHRcdFx0XHRvYmplY3Rbc2FmZUtleShrZXkpXSA9IHJlYWQoKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGVsc2UgZm9yIChsZXQgaSA9IDI7IGkgPCBsZW5ndGg7IGkrKykge1xuXHRcdFx0XHRcdFx0XHRsZXQga2V5ID0gc3RydWN0dXJlW2kgLSAyXTtcblx0XHRcdFx0XHRcdFx0b2JqZWN0W3NhZmVLZXkoa2V5KV0gPSByZWFkKCk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRyZXR1cm4gb2JqZWN0O1xuXHRcdFx0XHRcdH0gZWxzZSBpZiAodG9rZW4gPT0gUkVDT1JEX0RFRklOSVRJT05TX0lEKSB7XG5cdFx0XHRcdFx0XHRsZXQgbGVuZ3RoID0gcmVhZEp1c3RMZW5ndGgoKTtcblx0XHRcdFx0XHRcdGxldCBpZCA9IHJlYWQoKTtcblx0XHRcdFx0XHRcdGZvciAobGV0IGkgPSAyOyBpIDwgbGVuZ3RoOyBpKyspIHJlY29yZERlZmluaXRpb24oaWQrKywgcmVhZCgpKTtcblx0XHRcdFx0XHRcdHJldHVybiByZWFkKCk7XG5cdFx0XHRcdFx0fSBlbHNlIGlmICh0b2tlbiA9PSBCVU5ETEVEX1NUUklOR1NfSUQpIHJldHVybiByZWFkQnVuZGxlRXh0KCk7XG5cdFx0XHRcdFx0aWYgKGN1cnJlbnREZWNvZGVyLmdldFNoYXJlZCkge1xuXHRcdFx0XHRcdFx0bG9hZFNoYXJlZCgpO1xuXHRcdFx0XHRcdFx0c3RydWN0dXJlID0gY3VycmVudFN0cnVjdHVyZXNbdG9rZW4gJiA4MTkxXTtcblx0XHRcdFx0XHRcdGlmIChzdHJ1Y3R1cmUpIHtcblx0XHRcdFx0XHRcdFx0aWYgKCFzdHJ1Y3R1cmUucmVhZCkgc3RydWN0dXJlLnJlYWQgPSBjcmVhdGVTdHJ1Y3R1cmVSZWFkZXIoc3RydWN0dXJlKTtcblx0XHRcdFx0XHRcdFx0cmV0dXJuIHN0cnVjdHVyZS5yZWFkKCk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRsZXQgZXh0ZW5zaW9uID0gY3VycmVudEV4dGVuc2lvbnNbdG9rZW5dO1xuXHRcdFx0aWYgKGV4dGVuc2lvbikge1xuXHRcdFx0XHRpZiAoZXh0ZW5zaW9uLmhhbmRsZXNSZWFkKSByZXR1cm4gZXh0ZW5zaW9uKHJlYWQpO1xuXHRcdFx0XHRlbHNlIHJldHVybiBleHRlbnNpb24ocmVhZCgpKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGxldCBpbnB1dCA9IHJlYWQoKTtcblx0XHRcdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCBjdXJyZW50RXh0ZW5zaW9uUmFuZ2VzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdFx0bGV0IHZhbHVlID0gY3VycmVudEV4dGVuc2lvblJhbmdlc1tpXSh0b2tlbiwgaW5wdXQpO1xuXHRcdFx0XHRcdGlmICh2YWx1ZSAhPT0gdm9pZCAwKSByZXR1cm4gdmFsdWU7XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIG5ldyBUYWcoaW5wdXQsIHRva2VuKTtcblx0XHRcdH1cblx0XHRjYXNlIDc6IHN3aXRjaCAodG9rZW4pIHtcblx0XHRcdGNhc2UgMjA6IHJldHVybiBmYWxzZTtcblx0XHRcdGNhc2UgMjE6IHJldHVybiB0cnVlO1xuXHRcdFx0Y2FzZSAyMjogcmV0dXJuIG51bGw7XG5cdFx0XHRjYXNlIDIzOiByZXR1cm47XG5cdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRsZXQgcGFja2VkVmFsdWUgPSAocGFja2VkVmFsdWVzIHx8IGdldFBhY2tlZFZhbHVlcygpKVt0b2tlbl07XG5cdFx0XHRcdGlmIChwYWNrZWRWYWx1ZSAhPT0gdm9pZCAwKSByZXR1cm4gcGFja2VkVmFsdWU7XG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihcIlVua25vd24gdG9rZW4gXCIgKyB0b2tlbik7XG5cdFx0fVxuXHRcdGRlZmF1bHQ6XG5cdFx0XHRpZiAoaXNOYU4odG9rZW4pKSB7XG5cdFx0XHRcdGxldCBlcnJvciA9IC8qIEBfX1BVUkVfXyAqLyBuZXcgRXJyb3IoXCJVbmV4cGVjdGVkIGVuZCBvZiBDQk9SIGRhdGFcIik7XG5cdFx0XHRcdGVycm9yLmluY29tcGxldGUgPSB0cnVlO1xuXHRcdFx0XHR0aHJvdyBlcnJvcjtcblx0XHRcdH1cblx0XHRcdHRocm93IG5ldyBFcnJvcihcIlVua25vd24gQ0JPUiB0b2tlbiBcIiArIHRva2VuKTtcblx0fVxufVxudmFyIHZhbGlkTmFtZSA9IC9eW2EtekEtWl8kXVthLXpBLVpcXGRfJF0qJC87XG5mdW5jdGlvbiBjcmVhdGVTdHJ1Y3R1cmVSZWFkZXIoc3RydWN0dXJlKSB7XG5cdGlmICghc3RydWN0dXJlKSB0aHJvdyBuZXcgRXJyb3IoXCJTdHJ1Y3R1cmUgaXMgcmVxdWlyZWQgaW4gcmVjb3JkIGRlZmluaXRpb25cIik7XG5cdGZ1bmN0aW9uIHJlYWRPYmplY3QoKSB7XG5cdFx0bGV0IGxlbmd0aCA9IHNyY1twb3NpdGlvbiQxKytdO1xuXHRcdGxlbmd0aCA9IGxlbmd0aCAmIDMxO1xuXHRcdGlmIChsZW5ndGggPiAyMykgc3dpdGNoIChsZW5ndGgpIHtcblx0XHRcdGNhc2UgMjQ6XG5cdFx0XHRcdGxlbmd0aCA9IHNyY1twb3NpdGlvbiQxKytdO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgMjU6XG5cdFx0XHRcdGxlbmd0aCA9IGRhdGFWaWV3LmdldFVpbnQxNihwb3NpdGlvbiQxKTtcblx0XHRcdFx0cG9zaXRpb24kMSArPSAyO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgMjY6XG5cdFx0XHRcdGxlbmd0aCA9IGRhdGFWaWV3LmdldFVpbnQzMihwb3NpdGlvbiQxKTtcblx0XHRcdFx0cG9zaXRpb24kMSArPSA0O1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGRlZmF1bHQ6IHRocm93IG5ldyBFcnJvcihcIkV4cGVjdGVkIGFycmF5IGhlYWRlciwgYnV0IGdvdCBcIiArIHNyY1twb3NpdGlvbiQxIC0gMV0pO1xuXHRcdH1cblx0XHRsZXQgY29tcGlsZWRSZWFkZXIgPSB0aGlzLmNvbXBpbGVkUmVhZGVyO1xuXHRcdHdoaWxlIChjb21waWxlZFJlYWRlcikge1xuXHRcdFx0aWYgKGNvbXBpbGVkUmVhZGVyLnByb3BlcnR5Q291bnQgPT09IGxlbmd0aCkgcmV0dXJuIGNvbXBpbGVkUmVhZGVyKHJlYWQpO1xuXHRcdFx0Y29tcGlsZWRSZWFkZXIgPSBjb21waWxlZFJlYWRlci5uZXh0O1xuXHRcdH1cblx0XHRpZiAodGhpcy5zbG93UmVhZHMrKyA+PSBpbmxpbmVPYmplY3RSZWFkVGhyZXNob2xkKSB7XG5cdFx0XHRsZXQgYXJyYXkgPSB0aGlzLmxlbmd0aCA9PSBsZW5ndGggPyB0aGlzIDogdGhpcy5zbGljZSgwLCBsZW5ndGgpO1xuXHRcdFx0Y29tcGlsZWRSZWFkZXIgPSBjdXJyZW50RGVjb2Rlci5rZXlNYXAgPyBuZXcgRnVuY3Rpb24oXCJyXCIsIFwicmV0dXJuIHtcIiArIGFycmF5Lm1hcCgoaykgPT4gY3VycmVudERlY29kZXIuZGVjb2RlS2V5KGspKS5tYXAoKGspID0+IHZhbGlkTmFtZS50ZXN0KGspID8gc2FmZUtleShrKSArIFwiOnIoKVwiIDogXCJbXCIgKyBKU09OLnN0cmluZ2lmeShrKSArIFwiXTpyKClcIikuam9pbihcIixcIikgKyBcIn1cIikgOiBuZXcgRnVuY3Rpb24oXCJyXCIsIFwicmV0dXJuIHtcIiArIGFycmF5Lm1hcCgoa2V5KSA9PiB2YWxpZE5hbWUudGVzdChrZXkpID8gc2FmZUtleShrZXkpICsgXCI6cigpXCIgOiBcIltcIiArIEpTT04uc3RyaW5naWZ5KGtleSkgKyBcIl06cigpXCIpLmpvaW4oXCIsXCIpICsgXCJ9XCIpO1xuXHRcdFx0aWYgKHRoaXMuY29tcGlsZWRSZWFkZXIpIGNvbXBpbGVkUmVhZGVyLm5leHQgPSB0aGlzLmNvbXBpbGVkUmVhZGVyO1xuXHRcdFx0Y29tcGlsZWRSZWFkZXIucHJvcGVydHlDb3VudCA9IGxlbmd0aDtcblx0XHRcdHRoaXMuY29tcGlsZWRSZWFkZXIgPSBjb21waWxlZFJlYWRlcjtcblx0XHRcdHJldHVybiBjb21waWxlZFJlYWRlcihyZWFkKTtcblx0XHR9XG5cdFx0bGV0IG9iamVjdCA9IHt9O1xuXHRcdGlmIChjdXJyZW50RGVjb2Rlci5rZXlNYXApIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIG9iamVjdFtzYWZlS2V5KGN1cnJlbnREZWNvZGVyLmRlY29kZUtleSh0aGlzW2ldKSldID0gcmVhZCgpO1xuXHRcdGVsc2UgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykgb2JqZWN0W3NhZmVLZXkodGhpc1tpXSldID0gcmVhZCgpO1xuXHRcdHJldHVybiBvYmplY3Q7XG5cdH1cblx0c3RydWN0dXJlLnNsb3dSZWFkcyA9IDA7XG5cdHJldHVybiByZWFkT2JqZWN0O1xufVxuZnVuY3Rpb24gc2FmZUtleShrZXkpIHtcblx0aWYgKHR5cGVvZiBrZXkgPT09IFwic3RyaW5nXCIpIHJldHVybiBrZXkgPT09IFwiX19wcm90b19fXCIgPyBcIl9fcHJvdG9fXCIgOiBrZXk7XG5cdGlmICh0eXBlb2Yga2V5ID09PSBcIm51bWJlclwiIHx8IHR5cGVvZiBrZXkgPT09IFwiYm9vbGVhblwiIHx8IHR5cGVvZiBrZXkgPT09IFwiYmlnaW50XCIpIHJldHVybiBrZXkudG9TdHJpbmcoKTtcblx0aWYgKGtleSA9PSBudWxsKSByZXR1cm4ga2V5ICsgXCJcIjtcblx0dGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCBwcm9wZXJ0eSBuYW1lIHR5cGUgXCIgKyB0eXBlb2Yga2V5KTtcbn1cbnZhciByZWFkRml4ZWRTdHJpbmcgPSByZWFkU3RyaW5nSlM7XG5mdW5jdGlvbiByZWFkU3RyaW5nSlMobGVuZ3RoKSB7XG5cdGxldCByZXN1bHQ7XG5cdGlmIChsZW5ndGggPCAxNikge1xuXHRcdGlmIChyZXN1bHQgPSBzaG9ydFN0cmluZ0luSlMobGVuZ3RoKSkgcmV0dXJuIHJlc3VsdDtcblx0fVxuXHRpZiAobGVuZ3RoID4gNjQgJiYgZGVjb2RlcikgcmV0dXJuIGRlY29kZXIuZGVjb2RlKHNyYy5zdWJhcnJheShwb3NpdGlvbiQxLCBwb3NpdGlvbiQxICs9IGxlbmd0aCkpO1xuXHRjb25zdCBlbmQgPSBwb3NpdGlvbiQxICsgbGVuZ3RoO1xuXHRjb25zdCB1bml0cyA9IFtdO1xuXHRyZXN1bHQgPSBcIlwiO1xuXHR3aGlsZSAocG9zaXRpb24kMSA8IGVuZCkge1xuXHRcdGNvbnN0IGJ5dGUxID0gc3JjW3Bvc2l0aW9uJDErK107XG5cdFx0aWYgKChieXRlMSAmIDEyOCkgPT09IDApIHVuaXRzLnB1c2goYnl0ZTEpO1xuXHRcdGVsc2UgaWYgKChieXRlMSAmIDIyNCkgPT09IDE5Mikge1xuXHRcdFx0aWYgKGJ5dGUxIDwgMTk0IHx8IHBvc2l0aW9uJDEgPj0gZW5kIHx8IChzcmNbcG9zaXRpb24kMV0gJiAxOTIpICE9PSAxMjgpIHVuaXRzLnB1c2goNjU1MzMpO1xuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdGNvbnN0IGJ5dGUyID0gc3JjW3Bvc2l0aW9uJDErK10gJiA2Mztcblx0XHRcdFx0dW5pdHMucHVzaCgoYnl0ZTEgJiAzMSkgPDwgNiB8IGJ5dGUyKTtcblx0XHRcdH1cblx0XHR9IGVsc2UgaWYgKChieXRlMSAmIDI0MCkgPT09IDIyNCkge1xuXHRcdFx0Y29uc3QgYnl0ZTIgPSBwb3NpdGlvbiQxIDwgZW5kID8gc3JjW3Bvc2l0aW9uJDFdIDogMDtcblx0XHRcdGlmIChwb3NpdGlvbiQxID49IGVuZCB8fCAoYnl0ZTIgJiAxOTIpICE9PSAxMjggfHwgYnl0ZTEgPT09IDIyNCAmJiBieXRlMiA8IDE2MCB8fCBieXRlMSA9PT0gMjM3ICYmIGJ5dGUyID49IDE2MCkgdW5pdHMucHVzaCg2NTUzMyk7XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0cG9zaXRpb24kMSsrO1xuXHRcdFx0XHRpZiAocG9zaXRpb24kMSA+PSBlbmQgfHwgKHNyY1twb3NpdGlvbiQxXSAmIDE5MikgIT09IDEyOCkgdW5pdHMucHVzaCg2NTUzMyk7XG5cdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdGNvbnN0IGJ5dGUzID0gc3JjW3Bvc2l0aW9uJDErK10gJiA2Mztcblx0XHRcdFx0XHR1bml0cy5wdXNoKChieXRlMSAmIDMxKSA8PCAxMiB8IChieXRlMiAmIDYzKSA8PCA2IHwgYnl0ZTMpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSBlbHNlIGlmICgoYnl0ZTEgJiAyNDgpID09PSAyNDApIHtcblx0XHRcdGNvbnN0IGJ5dGUyID0gcG9zaXRpb24kMSA8IGVuZCA/IHNyY1twb3NpdGlvbiQxXSA6IDA7XG5cdFx0XHRpZiAoYnl0ZTEgPiAyNDQgfHwgcG9zaXRpb24kMSA+PSBlbmQgfHwgKGJ5dGUyICYgMTkyKSAhPT0gMTI4IHx8IGJ5dGUxID09PSAyNDAgJiYgYnl0ZTIgPCAxNDQgfHwgYnl0ZTEgPT09IDI0NCAmJiBieXRlMiA+PSAxNDQpIHVuaXRzLnB1c2goNjU1MzMpO1xuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdHBvc2l0aW9uJDErKztcblx0XHRcdFx0aWYgKHBvc2l0aW9uJDEgPj0gZW5kIHx8IChzcmNbcG9zaXRpb24kMV0gJiAxOTIpICE9PSAxMjgpIHVuaXRzLnB1c2goNjU1MzMpO1xuXHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRjb25zdCBieXRlMyA9IHNyY1twb3NpdGlvbiQxKytdICYgNjM7XG5cdFx0XHRcdFx0aWYgKHBvc2l0aW9uJDEgPj0gZW5kIHx8IChzcmNbcG9zaXRpb24kMV0gJiAxOTIpICE9PSAxMjgpIHVuaXRzLnB1c2goNjU1MzMpO1xuXHRcdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdFx0Y29uc3QgYnl0ZTQgPSBzcmNbcG9zaXRpb24kMSsrXSAmIDYzO1xuXHRcdFx0XHRcdFx0bGV0IHVuaXQgPSAoYnl0ZTEgJiA3KSA8PCAxOCB8IChieXRlMiAmIDYzKSA8PCAxMiB8IGJ5dGUzIDw8IDYgfCBieXRlNDtcblx0XHRcdFx0XHRcdHVuaXQgLT0gNjU1MzY7XG5cdFx0XHRcdFx0XHR1bml0cy5wdXNoKHVuaXQgPj4+IDEwICYgMTAyMyB8IDU1Mjk2KTtcblx0XHRcdFx0XHRcdHVuaXRzLnB1c2goNTYzMjAgfCB1bml0ICYgMTAyMyk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSBlbHNlIHVuaXRzLnB1c2goNjU1MzMpO1xuXHRcdGlmICh1bml0cy5sZW5ndGggPj0gNDA5Nikge1xuXHRcdFx0cmVzdWx0ICs9IGZyb21DaGFyQ29kZS5hcHBseShTdHJpbmcsIHVuaXRzKTtcblx0XHRcdHVuaXRzLmxlbmd0aCA9IDA7XG5cdFx0fVxuXHR9XG5cdGlmICh1bml0cy5sZW5ndGggPiAwKSByZXN1bHQgKz0gZnJvbUNoYXJDb2RlLmFwcGx5KFN0cmluZywgdW5pdHMpO1xuXHRyZXR1cm4gcmVzdWx0O1xufVxudmFyIGZyb21DaGFyQ29kZSA9IFN0cmluZy5mcm9tQ2hhckNvZGU7XG5mdW5jdGlvbiBsb25nU3RyaW5nSW5KUyhsZW5ndGgpIHtcblx0bGV0IHN0YXJ0ID0gcG9zaXRpb24kMTtcblx0bGV0IGJ5dGVzID0gbmV3IEFycmF5KGxlbmd0aCk7XG5cdGZvciAobGV0IGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcblx0XHRjb25zdCBieXRlID0gc3JjW3Bvc2l0aW9uJDErK107XG5cdFx0aWYgKChieXRlICYgMTI4KSA+IDApIHtcblx0XHRcdHBvc2l0aW9uJDEgPSBzdGFydDtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0Ynl0ZXNbaV0gPSBieXRlO1xuXHR9XG5cdHJldHVybiBmcm9tQ2hhckNvZGUuYXBwbHkoU3RyaW5nLCBieXRlcyk7XG59XG5mdW5jdGlvbiBzaG9ydFN0cmluZ0luSlMobGVuZ3RoKSB7XG5cdGlmIChsZW5ndGggPCA0KSB7XG5cdFx0aWYgKGxlbmd0aCA8IDIpIHtcblx0XHRcdGlmIChsZW5ndGggPT09IDApIHJldHVybiBcIlwiO1xuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdGxldCBhID0gc3JjW3Bvc2l0aW9uJDErK107XG5cdFx0XHRcdGlmICgoYSAmIDEyOCkgPiAxKSB7XG5cdFx0XHRcdFx0cG9zaXRpb24kMSAtPSAxO1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4gZnJvbUNoYXJDb2RlKGEpO1xuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHRsZXQgYSA9IHNyY1twb3NpdGlvbiQxKytdO1xuXHRcdFx0bGV0IGIgPSBzcmNbcG9zaXRpb24kMSsrXTtcblx0XHRcdGlmICgoYSAmIDEyOCkgPiAwIHx8IChiICYgMTI4KSA+IDApIHtcblx0XHRcdFx0cG9zaXRpb24kMSAtPSAyO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0XHRpZiAobGVuZ3RoIDwgMykgcmV0dXJuIGZyb21DaGFyQ29kZShhLCBiKTtcblx0XHRcdGxldCBjID0gc3JjW3Bvc2l0aW9uJDErK107XG5cdFx0XHRpZiAoKGMgJiAxMjgpID4gMCkge1xuXHRcdFx0XHRwb3NpdGlvbiQxIC09IDM7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHRcdHJldHVybiBmcm9tQ2hhckNvZGUoYSwgYiwgYyk7XG5cdFx0fVxuXHR9IGVsc2Uge1xuXHRcdGxldCBhID0gc3JjW3Bvc2l0aW9uJDErK107XG5cdFx0bGV0IGIgPSBzcmNbcG9zaXRpb24kMSsrXTtcblx0XHRsZXQgYyA9IHNyY1twb3NpdGlvbiQxKytdO1xuXHRcdGxldCBkID0gc3JjW3Bvc2l0aW9uJDErK107XG5cdFx0aWYgKChhICYgMTI4KSA+IDAgfHwgKGIgJiAxMjgpID4gMCB8fCAoYyAmIDEyOCkgPiAwIHx8IChkICYgMTI4KSA+IDApIHtcblx0XHRcdHBvc2l0aW9uJDEgLT0gNDtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0aWYgKGxlbmd0aCA8IDYpIHtcblx0XHRcdGlmIChsZW5ndGggPT09IDQpIHJldHVybiBmcm9tQ2hhckNvZGUoYSwgYiwgYywgZCk7XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0bGV0IGUgPSBzcmNbcG9zaXRpb24kMSsrXTtcblx0XHRcdFx0aWYgKChlICYgMTI4KSA+IDApIHtcblx0XHRcdFx0XHRwb3NpdGlvbiQxIC09IDU7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiBmcm9tQ2hhckNvZGUoYSwgYiwgYywgZCwgZSk7XG5cdFx0XHR9XG5cdFx0fSBlbHNlIGlmIChsZW5ndGggPCA4KSB7XG5cdFx0XHRsZXQgZSA9IHNyY1twb3NpdGlvbiQxKytdO1xuXHRcdFx0bGV0IGYgPSBzcmNbcG9zaXRpb24kMSsrXTtcblx0XHRcdGlmICgoZSAmIDEyOCkgPiAwIHx8IChmICYgMTI4KSA+IDApIHtcblx0XHRcdFx0cG9zaXRpb24kMSAtPSA2O1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0XHRpZiAobGVuZ3RoIDwgNykgcmV0dXJuIGZyb21DaGFyQ29kZShhLCBiLCBjLCBkLCBlLCBmKTtcblx0XHRcdGxldCBnID0gc3JjW3Bvc2l0aW9uJDErK107XG5cdFx0XHRpZiAoKGcgJiAxMjgpID4gMCkge1xuXHRcdFx0XHRwb3NpdGlvbiQxIC09IDc7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHRcdHJldHVybiBmcm9tQ2hhckNvZGUoYSwgYiwgYywgZCwgZSwgZiwgZyk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGxldCBlID0gc3JjW3Bvc2l0aW9uJDErK107XG5cdFx0XHRsZXQgZiA9IHNyY1twb3NpdGlvbiQxKytdO1xuXHRcdFx0bGV0IGcgPSBzcmNbcG9zaXRpb24kMSsrXTtcblx0XHRcdGxldCBoID0gc3JjW3Bvc2l0aW9uJDErK107XG5cdFx0XHRpZiAoKGUgJiAxMjgpID4gMCB8fCAoZiAmIDEyOCkgPiAwIHx8IChnICYgMTI4KSA+IDAgfHwgKGggJiAxMjgpID4gMCkge1xuXHRcdFx0XHRwb3NpdGlvbiQxIC09IDg7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHRcdGlmIChsZW5ndGggPCAxMCkge1xuXHRcdFx0XHRpZiAobGVuZ3RoID09PSA4KSByZXR1cm4gZnJvbUNoYXJDb2RlKGEsIGIsIGMsIGQsIGUsIGYsIGcsIGgpO1xuXHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRsZXQgaSA9IHNyY1twb3NpdGlvbiQxKytdO1xuXHRcdFx0XHRcdGlmICgoaSAmIDEyOCkgPiAwKSB7XG5cdFx0XHRcdFx0XHRwb3NpdGlvbiQxIC09IDk7XG5cdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHJldHVybiBmcm9tQ2hhckNvZGUoYSwgYiwgYywgZCwgZSwgZiwgZywgaCwgaSk7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSBpZiAobGVuZ3RoIDwgMTIpIHtcblx0XHRcdFx0bGV0IGkgPSBzcmNbcG9zaXRpb24kMSsrXTtcblx0XHRcdFx0bGV0IGogPSBzcmNbcG9zaXRpb24kMSsrXTtcblx0XHRcdFx0aWYgKChpICYgMTI4KSA+IDAgfHwgKGogJiAxMjgpID4gMCkge1xuXHRcdFx0XHRcdHBvc2l0aW9uJDEgLT0gMTA7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmIChsZW5ndGggPCAxMSkgcmV0dXJuIGZyb21DaGFyQ29kZShhLCBiLCBjLCBkLCBlLCBmLCBnLCBoLCBpLCBqKTtcblx0XHRcdFx0bGV0IGsgPSBzcmNbcG9zaXRpb24kMSsrXTtcblx0XHRcdFx0aWYgKChrICYgMTI4KSA+IDApIHtcblx0XHRcdFx0XHRwb3NpdGlvbiQxIC09IDExO1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4gZnJvbUNoYXJDb2RlKGEsIGIsIGMsIGQsIGUsIGYsIGcsIGgsIGksIGosIGspO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0bGV0IGkgPSBzcmNbcG9zaXRpb24kMSsrXTtcblx0XHRcdFx0bGV0IGogPSBzcmNbcG9zaXRpb24kMSsrXTtcblx0XHRcdFx0bGV0IGsgPSBzcmNbcG9zaXRpb24kMSsrXTtcblx0XHRcdFx0bGV0IGwgPSBzcmNbcG9zaXRpb24kMSsrXTtcblx0XHRcdFx0aWYgKChpICYgMTI4KSA+IDAgfHwgKGogJiAxMjgpID4gMCB8fCAoayAmIDEyOCkgPiAwIHx8IChsICYgMTI4KSA+IDApIHtcblx0XHRcdFx0XHRwb3NpdGlvbiQxIC09IDEyO1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAobGVuZ3RoIDwgMTQpIHtcblx0XHRcdFx0XHRpZiAobGVuZ3RoID09PSAxMikgcmV0dXJuIGZyb21DaGFyQ29kZShhLCBiLCBjLCBkLCBlLCBmLCBnLCBoLCBpLCBqLCBrLCBsKTtcblx0XHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRcdGxldCBtID0gc3JjW3Bvc2l0aW9uJDErK107XG5cdFx0XHRcdFx0XHRpZiAoKG0gJiAxMjgpID4gMCkge1xuXHRcdFx0XHRcdFx0XHRwb3NpdGlvbiQxIC09IDEzO1xuXHRcdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRyZXR1cm4gZnJvbUNoYXJDb2RlKGEsIGIsIGMsIGQsIGUsIGYsIGcsIGgsIGksIGosIGssIGwsIG0pO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRsZXQgbSA9IHNyY1twb3NpdGlvbiQxKytdO1xuXHRcdFx0XHRcdGxldCBuID0gc3JjW3Bvc2l0aW9uJDErK107XG5cdFx0XHRcdFx0aWYgKChtICYgMTI4KSA+IDAgfHwgKG4gJiAxMjgpID4gMCkge1xuXHRcdFx0XHRcdFx0cG9zaXRpb24kMSAtPSAxNDtcblx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKGxlbmd0aCA8IDE1KSByZXR1cm4gZnJvbUNoYXJDb2RlKGEsIGIsIGMsIGQsIGUsIGYsIGcsIGgsIGksIGosIGssIGwsIG0sIG4pO1xuXHRcdFx0XHRcdGxldCBvID0gc3JjW3Bvc2l0aW9uJDErK107XG5cdFx0XHRcdFx0aWYgKChvICYgMTI4KSA+IDApIHtcblx0XHRcdFx0XHRcdHBvc2l0aW9uJDEgLT0gMTU7XG5cdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHJldHVybiBmcm9tQ2hhckNvZGUoYSwgYiwgYywgZCwgZSwgZiwgZywgaCwgaSwgaiwgaywgbCwgbSwgbiwgbyk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH1cbn1cbmZ1bmN0aW9uIHJlYWRCaW4obGVuZ3RoKSB7XG5cdHJldHVybiBjdXJyZW50RGVjb2Rlci5jb3B5QnVmZmVycyA/IFVpbnQ4QXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoc3JjLCBwb3NpdGlvbiQxLCBwb3NpdGlvbiQxICs9IGxlbmd0aCkgOiBzcmMuc3ViYXJyYXkocG9zaXRpb24kMSwgcG9zaXRpb24kMSArPSBsZW5ndGgpO1xufVxudmFyIGYzMkFycmF5ID0gLyogQF9fUFVSRV9fICovIG5ldyBGbG9hdDMyQXJyYXkoMSk7XG52YXIgdThBcnJheSA9IG5ldyBVaW50OEFycmF5KGYzMkFycmF5LmJ1ZmZlciwgMCwgNCk7XG5mdW5jdGlvbiBnZXRGbG9hdDE2KCkge1xuXHRsZXQgYnl0ZTAgPSBzcmNbcG9zaXRpb24kMSsrXTtcblx0bGV0IGJ5dGUxID0gc3JjW3Bvc2l0aW9uJDErK107XG5cdGxldCBleHBvbmVudCA9IChieXRlMCAmIDEyNykgPj4gMjtcblx0aWYgKGV4cG9uZW50ID09PSAzMSkge1xuXHRcdGlmIChieXRlMSB8fCBieXRlMCAmIDMpIHJldHVybiBOYU47XG5cdFx0cmV0dXJuIGJ5dGUwICYgMTI4ID8gLUluZmluaXR5IDogSW5maW5pdHk7XG5cdH1cblx0aWYgKGV4cG9uZW50ID09PSAwKSB7XG5cdFx0bGV0IGFicyA9ICgoYnl0ZTAgJiAzKSA8PCA4IHwgYnl0ZTEpIC8gKDEgPDwgMjQpO1xuXHRcdHJldHVybiBieXRlMCAmIDEyOCA/IC1hYnMgOiBhYnM7XG5cdH1cblx0dThBcnJheVszXSA9IGJ5dGUwICYgMTI4IHwgKGV4cG9uZW50ID4+IDEpICsgNTY7XG5cdHU4QXJyYXlbMl0gPSAoYnl0ZTAgJiA3KSA8PCA1IHwgYnl0ZTEgPj4gMztcblx0dThBcnJheVsxXSA9IGJ5dGUxIDw8IDU7XG5cdHU4QXJyYXlbMF0gPSAwO1xuXHRyZXR1cm4gZjMyQXJyYXlbMF07XG59XG5uZXcgQXJyYXkoNDA5Nik7XG52YXIgVGFnID0gY2xhc3Mge1xuXHRjb25zdHJ1Y3Rvcih2YWx1ZSwgdGFnKSB7XG5cdFx0dGhpcy52YWx1ZSA9IHZhbHVlO1xuXHRcdHRoaXMudGFnID0gdGFnO1xuXHR9XG59O1xuY3VycmVudEV4dGVuc2lvbnNbMF0gPSAoZGF0ZVN0cmluZykgPT4ge1xuXHRyZXR1cm4gbmV3IERhdGUoZGF0ZVN0cmluZyk7XG59O1xuY3VycmVudEV4dGVuc2lvbnNbMV0gPSAoZXBvY2hTZWMpID0+IHtcblx0cmV0dXJuIG5ldyBEYXRlKE1hdGgucm91bmQoZXBvY2hTZWMgKiAxZTMpKTtcbn07XG5jdXJyZW50RXh0ZW5zaW9uc1syXSA9IChidWZmZXIpID0+IHtcblx0bGV0IHZhbHVlID0gQmlnSW50KDApO1xuXHRmb3IgKGxldCBpID0gMCwgbCA9IGJ1ZmZlci5ieXRlTGVuZ3RoOyBpIDwgbDsgaSsrKSB2YWx1ZSA9IEJpZ0ludChidWZmZXJbaV0pICsgKHZhbHVlIDw8IEJpZ0ludCg4KSk7XG5cdHJldHVybiB2YWx1ZTtcbn07XG5jdXJyZW50RXh0ZW5zaW9uc1szXSA9IChidWZmZXIpID0+IHtcblx0cmV0dXJuIEJpZ0ludCgtMSkgLSBjdXJyZW50RXh0ZW5zaW9uc1syXShidWZmZXIpO1xufTtcbmN1cnJlbnRFeHRlbnNpb25zWzRdID0gKGZyYWN0aW9uKSA9PiB7XG5cdHJldHVybiArKGZyYWN0aW9uWzFdICsgXCJlXCIgKyBmcmFjdGlvblswXSk7XG59O1xuY3VycmVudEV4dGVuc2lvbnNbNV0gPSAoZnJhY3Rpb24pID0+IHtcblx0cmV0dXJuIGZyYWN0aW9uWzFdICogTWF0aC5leHAoZnJhY3Rpb25bMF0gKiBNYXRoLmxvZygyKSk7XG59O1xudmFyIHJlY29yZERlZmluaXRpb24gPSAoaWQsIHN0cnVjdHVyZSkgPT4ge1xuXHRpZCA9IGlkIC0gNTczNDQ7XG5cdGxldCBleGlzdGluZ1N0cnVjdHVyZSA9IGN1cnJlbnRTdHJ1Y3R1cmVzW2lkXTtcblx0aWYgKGV4aXN0aW5nU3RydWN0dXJlICYmIGV4aXN0aW5nU3RydWN0dXJlLmlzU2hhcmVkKSAoY3VycmVudFN0cnVjdHVyZXMucmVzdG9yZVN0cnVjdHVyZXMgfHwgKGN1cnJlbnRTdHJ1Y3R1cmVzLnJlc3RvcmVTdHJ1Y3R1cmVzID0gW10pKVtpZF0gPSBleGlzdGluZ1N0cnVjdHVyZTtcblx0Y3VycmVudFN0cnVjdHVyZXNbaWRdID0gc3RydWN0dXJlO1xuXHRzdHJ1Y3R1cmUucmVhZCA9IGNyZWF0ZVN0cnVjdHVyZVJlYWRlcihzdHJ1Y3R1cmUpO1xufTtcbmN1cnJlbnRFeHRlbnNpb25zW0xFR0FDWV9SRUNPUkRfSU5MSU5FX0lEXSA9IChkYXRhKSA9PiB7XG5cdGxldCBsZW5ndGggPSBkYXRhLmxlbmd0aDtcblx0bGV0IHN0cnVjdHVyZSA9IGRhdGFbMV07XG5cdHJlY29yZERlZmluaXRpb24oZGF0YVswXSwgc3RydWN0dXJlKTtcblx0bGV0IG9iamVjdCA9IHt9O1xuXHRmb3IgKGxldCBpID0gMjsgaSA8IGxlbmd0aDsgaSsrKSB7XG5cdFx0bGV0IGtleSA9IHN0cnVjdHVyZVtpIC0gMl07XG5cdFx0b2JqZWN0W3NhZmVLZXkoa2V5KV0gPSBkYXRhW2ldO1xuXHR9XG5cdHJldHVybiBvYmplY3Q7XG59O1xuY3VycmVudEV4dGVuc2lvbnNbMTRdID0gKHZhbHVlKSA9PiB7XG5cdGlmIChidW5kbGVkU3RyaW5ncyQxKSByZXR1cm4gYnVuZGxlZFN0cmluZ3MkMVswXS5zbGljZShidW5kbGVkU3RyaW5ncyQxLnBvc2l0aW9uMCwgYnVuZGxlZFN0cmluZ3MkMS5wb3NpdGlvbjAgKz0gdmFsdWUpO1xuXHRyZXR1cm4gbmV3IFRhZyh2YWx1ZSwgMTQpO1xufTtcbmN1cnJlbnRFeHRlbnNpb25zWzE1XSA9ICh2YWx1ZSkgPT4ge1xuXHRpZiAoYnVuZGxlZFN0cmluZ3MkMSkgcmV0dXJuIGJ1bmRsZWRTdHJpbmdzJDFbMV0uc2xpY2UoYnVuZGxlZFN0cmluZ3MkMS5wb3NpdGlvbjEsIGJ1bmRsZWRTdHJpbmdzJDEucG9zaXRpb24xICs9IHZhbHVlKTtcblx0cmV0dXJuIG5ldyBUYWcodmFsdWUsIDE1KTtcbn07XG52YXIgZ2xibCA9IHtcblx0RXJyb3IsXG5cdFJlZ0V4cFxufTtcbmN1cnJlbnRFeHRlbnNpb25zWzI3XSA9IChkYXRhKSA9PiB7XG5cdHJldHVybiAoZ2xibFtkYXRhWzBdXSB8fCBFcnJvcikoZGF0YVsxXSwgZGF0YVsyXSk7XG59O1xudmFyIHBhY2tlZFRhYmxlID0gKHJlYWQpID0+IHtcblx0aWYgKHNyY1twb3NpdGlvbiQxKytdICE9IDEzMikge1xuXHRcdGxldCBlcnJvciA9IC8qIEBfX1BVUkVfXyAqLyBuZXcgRXJyb3IoXCJQYWNrZWQgdmFsdWVzIHN0cnVjdHVyZSBtdXN0IGJlIGZvbGxvd2VkIGJ5IGEgNCBlbGVtZW50IGFycmF5XCIpO1xuXHRcdGlmIChzcmMubGVuZ3RoIDwgcG9zaXRpb24kMSkgZXJyb3IuaW5jb21wbGV0ZSA9IHRydWU7XG5cdFx0dGhyb3cgZXJyb3I7XG5cdH1cblx0bGV0IG5ld1BhY2tlZFZhbHVlcyA9IHJlYWQoKTtcblx0aWYgKCFuZXdQYWNrZWRWYWx1ZXMgfHwgIW5ld1BhY2tlZFZhbHVlcy5sZW5ndGgpIHtcblx0XHRsZXQgZXJyb3IgPSAvKiBAX19QVVJFX18gKi8gbmV3IEVycm9yKFwiUGFja2VkIHZhbHVlcyBzdHJ1Y3R1cmUgbXVzdCBiZSBmb2xsb3dlZCBieSBhIDQgZWxlbWVudCBhcnJheVwiKTtcblx0XHRlcnJvci5pbmNvbXBsZXRlID0gdHJ1ZTtcblx0XHR0aHJvdyBlcnJvcjtcblx0fVxuXHRwYWNrZWRWYWx1ZXMgPSBwYWNrZWRWYWx1ZXMgPyBuZXdQYWNrZWRWYWx1ZXMuY29uY2F0KHBhY2tlZFZhbHVlcy5zbGljZShuZXdQYWNrZWRWYWx1ZXMubGVuZ3RoKSkgOiBuZXdQYWNrZWRWYWx1ZXM7XG5cdHBhY2tlZFZhbHVlcy5wcmVmaXhlcyA9IHJlYWQoKTtcblx0cGFja2VkVmFsdWVzLnN1ZmZpeGVzID0gcmVhZCgpO1xuXHRyZXR1cm4gcmVhZCgpO1xufTtcbnBhY2tlZFRhYmxlLmhhbmRsZXNSZWFkID0gdHJ1ZTtcbmN1cnJlbnRFeHRlbnNpb25zWzUxXSA9IHBhY2tlZFRhYmxlO1xuY3VycmVudEV4dGVuc2lvbnNbUEFDS0VEX1JFRkVSRU5DRV9UQUdfSURdID0gKGRhdGEpID0+IHtcblx0aWYgKCFwYWNrZWRWYWx1ZXMpIHtcblx0XHRpZiAoY3VycmVudERlY29kZXIuZ2V0U2hhcmVkKSBsb2FkU2hhcmVkKCk7XG5cdFx0ZWxzZSByZXR1cm4gbmV3IFRhZyhkYXRhLCBQQUNLRURfUkVGRVJFTkNFX1RBR19JRCk7XG5cdH1cblx0aWYgKHR5cGVvZiBkYXRhID09IFwibnVtYmVyXCIpIHJldHVybiBwYWNrZWRWYWx1ZXNbMTYgKyAoZGF0YSA+PSAwID8gMiAqIGRhdGEgOiAtMiAqIGRhdGEgLSAxKV07XG5cdGxldCBlcnJvciA9IC8qIEBfX1BVUkVfXyAqLyBuZXcgRXJyb3IoXCJObyBzdXBwb3J0IGZvciBub24taW50ZWdlciBwYWNrZWQgcmVmZXJlbmNlcyB5ZXRcIik7XG5cdGlmIChkYXRhID09PSB2b2lkIDApIGVycm9yLmluY29tcGxldGUgPSB0cnVlO1xuXHR0aHJvdyBlcnJvcjtcbn07XG5jdXJyZW50RXh0ZW5zaW9uc1syOF0gPSAocmVhZCkgPT4ge1xuXHRpZiAoIXJlZmVyZW5jZU1hcCkge1xuXHRcdHJlZmVyZW5jZU1hcCA9IC8qIEBfX1BVUkVfXyAqLyBuZXcgTWFwKCk7XG5cdFx0cmVmZXJlbmNlTWFwLmlkID0gMDtcblx0fVxuXHRsZXQgaWQgPSByZWZlcmVuY2VNYXAuaWQrKztcblx0bGV0IHN0YXJ0aW5nUG9zaXRpb24gPSBwb3NpdGlvbiQxO1xuXHRsZXQgdG9rZW4gPSBzcmNbcG9zaXRpb24kMV07XG5cdGxldCB0YXJnZXQ7XG5cdGlmICh0b2tlbiA+PiA1ID09IDQpIHRhcmdldCA9IFtdO1xuXHRlbHNlIHRhcmdldCA9IHt9O1xuXHRsZXQgcmVmRW50cnkgPSB7IHRhcmdldCB9O1xuXHRyZWZlcmVuY2VNYXAuc2V0KGlkLCByZWZFbnRyeSk7XG5cdGxldCB0YXJnZXRQcm9wZXJ0aWVzID0gcmVhZCgpO1xuXHRpZiAocmVmRW50cnkudXNlZCkge1xuXHRcdGlmIChPYmplY3QuZ2V0UHJvdG90eXBlT2YodGFyZ2V0KSAhPT0gT2JqZWN0LmdldFByb3RvdHlwZU9mKHRhcmdldFByb3BlcnRpZXMpKSB7XG5cdFx0XHRwb3NpdGlvbiQxID0gc3RhcnRpbmdQb3NpdGlvbjtcblx0XHRcdHRhcmdldCA9IHRhcmdldFByb3BlcnRpZXM7XG5cdFx0XHRyZWZlcmVuY2VNYXAuc2V0KGlkLCB7IHRhcmdldCB9KTtcblx0XHRcdHRhcmdldFByb3BlcnRpZXMgPSByZWFkKCk7XG5cdFx0fVxuXHRcdHJldHVybiBPYmplY3QuYXNzaWduKHRhcmdldCwgdGFyZ2V0UHJvcGVydGllcyk7XG5cdH1cblx0cmVmRW50cnkudGFyZ2V0ID0gdGFyZ2V0UHJvcGVydGllcztcblx0cmV0dXJuIHRhcmdldFByb3BlcnRpZXM7XG59O1xuY3VycmVudEV4dGVuc2lvbnNbMjhdLmhhbmRsZXNSZWFkID0gdHJ1ZTtcbmN1cnJlbnRFeHRlbnNpb25zWzI5XSA9IChpZCkgPT4ge1xuXHRsZXQgcmVmRW50cnkgPSByZWZlcmVuY2VNYXAuZ2V0KGlkKTtcblx0cmVmRW50cnkudXNlZCA9IHRydWU7XG5cdHJldHVybiByZWZFbnRyeS50YXJnZXQ7XG59O1xuY3VycmVudEV4dGVuc2lvbnNbMjU4XSA9IChhcnJheSkgPT4gbmV3IFNldChhcnJheSk7XG4oY3VycmVudEV4dGVuc2lvbnNbMjU5XSA9IChyZWFkKSA9PiB7XG5cdGlmIChjdXJyZW50RGVjb2Rlci5tYXBzQXNPYmplY3RzKSB7XG5cdFx0Y3VycmVudERlY29kZXIubWFwc0FzT2JqZWN0cyA9IGZhbHNlO1xuXHRcdHJlc3RvcmVNYXBzQXNPYmplY3QgPSB0cnVlO1xuXHR9XG5cdHJldHVybiByZWFkKCk7XG59KS5oYW5kbGVzUmVhZCA9IHRydWU7XG5mdW5jdGlvbiBjb21iaW5lKGEsIGIpIHtcblx0aWYgKHR5cGVvZiBhID09PSBcInN0cmluZ1wiKSByZXR1cm4gYSArIGI7XG5cdGlmIChhIGluc3RhbmNlb2YgQXJyYXkpIHJldHVybiBhLmNvbmNhdChiKTtcblx0cmV0dXJuIE9iamVjdC5hc3NpZ24oe30sIGEsIGIpO1xufVxuZnVuY3Rpb24gZ2V0UGFja2VkVmFsdWVzKCkge1xuXHRpZiAoIXBhY2tlZFZhbHVlcykge1xuXHRcdGlmIChjdXJyZW50RGVjb2Rlci5nZXRTaGFyZWQpIGxvYWRTaGFyZWQoKTtcblx0XHRlbHNlIHRocm93IG5ldyBFcnJvcihcIk5vIHBhY2tlZCB2YWx1ZXMgYXZhaWxhYmxlXCIpO1xuXHR9XG5cdHJldHVybiBwYWNrZWRWYWx1ZXM7XG59XG52YXIgU0hBUkVEX0RBVEFfVEFHX0lEID0gMTM5OTM1Mzk1NjtcbmN1cnJlbnRFeHRlbnNpb25SYW5nZXMucHVzaCgodGFnLCBpbnB1dCkgPT4ge1xuXHRpZiAodGFnID49IDIyNSAmJiB0YWcgPD0gMjU1KSByZXR1cm4gY29tYmluZShnZXRQYWNrZWRWYWx1ZXMoKS5wcmVmaXhlc1t0YWcgLSAyMjRdLCBpbnB1dCk7XG5cdGlmICh0YWcgPj0gMjg3MDQgJiYgdGFnIDw9IDMyNzY3KSByZXR1cm4gY29tYmluZShnZXRQYWNrZWRWYWx1ZXMoKS5wcmVmaXhlc1t0YWcgLSAyODY3Ml0sIGlucHV0KTtcblx0aWYgKHRhZyA+PSAxODc5MDUyMjg4ICYmIHRhZyA8PSAyMTQ3NDgzNjQ3KSByZXR1cm4gY29tYmluZShnZXRQYWNrZWRWYWx1ZXMoKS5wcmVmaXhlc1t0YWcgLSAxODc5MDQ4MTkyXSwgaW5wdXQpO1xuXHRpZiAodGFnID49IDIxNiAmJiB0YWcgPD0gMjIzKSByZXR1cm4gY29tYmluZShpbnB1dCwgZ2V0UGFja2VkVmFsdWVzKCkuc3VmZml4ZXNbdGFnIC0gMjE2XSk7XG5cdGlmICh0YWcgPj0gMjc2NDcgJiYgdGFnIDw9IDI4NjcxKSByZXR1cm4gY29tYmluZShpbnB1dCwgZ2V0UGFja2VkVmFsdWVzKCkuc3VmZml4ZXNbdGFnIC0gMjc2MzldKTtcblx0aWYgKHRhZyA+PSAxODExOTQwMzUyICYmIHRhZyA8PSAxODc5MDQ4MTkxKSByZXR1cm4gY29tYmluZShpbnB1dCwgZ2V0UGFja2VkVmFsdWVzKCkuc3VmZml4ZXNbdGFnIC0gMTgxMTkzOTMyOF0pO1xuXHRpZiAodGFnID09IFNIQVJFRF9EQVRBX1RBR19JRCkgcmV0dXJuIHtcblx0XHRwYWNrZWRWYWx1ZXMsXG5cdFx0c3RydWN0dXJlczogY3VycmVudFN0cnVjdHVyZXMuc2xpY2UoMCksXG5cdFx0dmVyc2lvbjogaW5wdXRcblx0fTtcblx0aWYgKHRhZyA9PSA1NTc5OSkgcmV0dXJuIGlucHV0O1xufSk7XG52YXIgaXNMaXR0bGVFbmRpYW5NYWNoaW5lJDEgPSBuZXcgVWludDhBcnJheShuZXcgVWludDE2QXJyYXkoWzFdKS5idWZmZXIpWzBdID09IDE7XG52YXIgdHlwZWRBcnJheXMgPSBbXG5cdFVpbnQ4QXJyYXksXG5cdFVpbnQ4Q2xhbXBlZEFycmF5LFxuXHRVaW50MTZBcnJheSxcblx0VWludDMyQXJyYXksXG5cdHR5cGVvZiBCaWdVaW50NjRBcnJheSA9PSBcInVuZGVmaW5lZFwiID8geyBuYW1lOiBcIkJpZ1VpbnQ2NEFycmF5XCIgfSA6IEJpZ1VpbnQ2NEFycmF5LFxuXHRJbnQ4QXJyYXksXG5cdEludDE2QXJyYXksXG5cdEludDMyQXJyYXksXG5cdHR5cGVvZiBCaWdJbnQ2NEFycmF5ID09IFwidW5kZWZpbmVkXCIgPyB7IG5hbWU6IFwiQmlnSW50NjRBcnJheVwiIH0gOiBCaWdJbnQ2NEFycmF5LFxuXHRGbG9hdDMyQXJyYXksXG5cdEZsb2F0NjRBcnJheVxuXTtcbnZhciB0eXBlZEFycmF5VGFncyA9IFtcblx0NjQsXG5cdDY4LFxuXHQ2OSxcblx0NzAsXG5cdDcxLFxuXHQ3Mixcblx0NzcsXG5cdDc4LFxuXHQ3OSxcblx0ODUsXG5cdDg2XG5dO1xuZm9yIChsZXQgaSA9IDA7IGkgPCB0eXBlZEFycmF5cy5sZW5ndGg7IGkrKykgcmVnaXN0ZXJUeXBlZEFycmF5KHR5cGVkQXJyYXlzW2ldLCB0eXBlZEFycmF5VGFnc1tpXSk7XG5mdW5jdGlvbiByZWdpc3RlclR5cGVkQXJyYXkoVHlwZWRBcnJheSwgdGFnKSB7XG5cdGxldCBkdk1ldGhvZCA9IFwiZ2V0XCIgKyBUeXBlZEFycmF5Lm5hbWUuc2xpY2UoMCwgLTUpO1xuXHRsZXQgYnl0ZXNQZXJFbGVtZW50O1xuXHRpZiAodHlwZW9mIFR5cGVkQXJyYXkgPT09IFwiZnVuY3Rpb25cIikgYnl0ZXNQZXJFbGVtZW50ID0gVHlwZWRBcnJheS5CWVRFU19QRVJfRUxFTUVOVDtcblx0ZWxzZSBUeXBlZEFycmF5ID0gbnVsbDtcblx0Zm9yIChsZXQgbGl0dGxlRW5kaWFuID0gMDsgbGl0dGxlRW5kaWFuIDwgMjsgbGl0dGxlRW5kaWFuKyspIHtcblx0XHRpZiAoIWxpdHRsZUVuZGlhbiAmJiBieXRlc1BlckVsZW1lbnQgPT0gMSkgY29udGludWU7XG5cdFx0bGV0IHNpemVTaGlmdCA9IGJ5dGVzUGVyRWxlbWVudCA9PSAyID8gMSA6IGJ5dGVzUGVyRWxlbWVudCA9PSA0ID8gMiA6IGJ5dGVzUGVyRWxlbWVudCA9PSA4ID8gMyA6IDA7XG5cdFx0Y3VycmVudEV4dGVuc2lvbnNbbGl0dGxlRW5kaWFuID8gdGFnIDogdGFnIC0gNF0gPSBieXRlc1BlckVsZW1lbnQgPT0gMSB8fCBsaXR0bGVFbmRpYW4gPT0gaXNMaXR0bGVFbmRpYW5NYWNoaW5lJDEgPyAoYnVmZmVyKSA9PiB7XG5cdFx0XHRpZiAoIVR5cGVkQXJyYXkpIHRocm93IG5ldyBFcnJvcihcIkNvdWxkIG5vdCBmaW5kIHR5cGVkIGFycmF5IGZvciBjb2RlIFwiICsgdGFnKTtcblx0XHRcdGlmICghY3VycmVudERlY29kZXIuY29weUJ1ZmZlcnMpIHtcblx0XHRcdFx0aWYgKGJ5dGVzUGVyRWxlbWVudCA9PT0gMSB8fCBieXRlc1BlckVsZW1lbnQgPT09IDIgJiYgIShidWZmZXIuYnl0ZU9mZnNldCAmIDEpIHx8IGJ5dGVzUGVyRWxlbWVudCA9PT0gNCAmJiAhKGJ1ZmZlci5ieXRlT2Zmc2V0ICYgMykgfHwgYnl0ZXNQZXJFbGVtZW50ID09PSA4ICYmICEoYnVmZmVyLmJ5dGVPZmZzZXQgJiA3KSkgcmV0dXJuIG5ldyBUeXBlZEFycmF5KGJ1ZmZlci5idWZmZXIsIGJ1ZmZlci5ieXRlT2Zmc2V0LCBidWZmZXIuYnl0ZUxlbmd0aCA+PiBzaXplU2hpZnQpO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIG5ldyBUeXBlZEFycmF5KFVpbnQ4QXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYnVmZmVyLCAwKS5idWZmZXIpO1xuXHRcdH0gOiAoYnVmZmVyKSA9PiB7XG5cdFx0XHRpZiAoIVR5cGVkQXJyYXkpIHRocm93IG5ldyBFcnJvcihcIkNvdWxkIG5vdCBmaW5kIHR5cGVkIGFycmF5IGZvciBjb2RlIFwiICsgdGFnKTtcblx0XHRcdGxldCBkdiA9IG5ldyBEYXRhVmlldyhidWZmZXIuYnVmZmVyLCBidWZmZXIuYnl0ZU9mZnNldCwgYnVmZmVyLmJ5dGVMZW5ndGgpO1xuXHRcdFx0bGV0IGVsZW1lbnRzID0gYnVmZmVyLmxlbmd0aCA+PiBzaXplU2hpZnQ7XG5cdFx0XHRsZXQgdGEgPSBuZXcgVHlwZWRBcnJheShlbGVtZW50cyk7XG5cdFx0XHRsZXQgbWV0aG9kID0gZHZbZHZNZXRob2RdO1xuXHRcdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCBlbGVtZW50czsgaSsrKSB0YVtpXSA9IG1ldGhvZC5jYWxsKGR2LCBpIDw8IHNpemVTaGlmdCwgbGl0dGxlRW5kaWFuKTtcblx0XHRcdHJldHVybiB0YTtcblx0XHR9O1xuXHR9XG59XG5mdW5jdGlvbiByZWFkQnVuZGxlRXh0KCkge1xuXHRsZXQgbGVuZ3RoID0gcmVhZEp1c3RMZW5ndGgoKTtcblx0bGV0IGJ1bmRsZVBvc2l0aW9uID0gcG9zaXRpb24kMSArIHJlYWQoKTtcblx0Zm9yIChsZXQgaSA9IDI7IGkgPCBsZW5ndGg7IGkrKykge1xuXHRcdGxldCBidW5kbGVMZW5ndGggPSByZWFkSnVzdExlbmd0aCgpO1xuXHRcdHBvc2l0aW9uJDEgKz0gYnVuZGxlTGVuZ3RoO1xuXHR9XG5cdGxldCBkYXRhUG9zaXRpb24gPSBwb3NpdGlvbiQxO1xuXHRwb3NpdGlvbiQxID0gYnVuZGxlUG9zaXRpb247XG5cdGJ1bmRsZWRTdHJpbmdzJDEgPSBbcmVhZFN0cmluZ0pTKHJlYWRKdXN0TGVuZ3RoKCkpLCByZWFkU3RyaW5nSlMocmVhZEp1c3RMZW5ndGgoKSldO1xuXHRidW5kbGVkU3RyaW5ncyQxLnBvc2l0aW9uMCA9IDA7XG5cdGJ1bmRsZWRTdHJpbmdzJDEucG9zaXRpb24xID0gMDtcblx0YnVuZGxlZFN0cmluZ3MkMS5wb3N0QnVuZGxlUG9zaXRpb24gPSBwb3NpdGlvbiQxO1xuXHRwb3NpdGlvbiQxID0gZGF0YVBvc2l0aW9uO1xuXHRyZXR1cm4gcmVhZCgpO1xufVxuZnVuY3Rpb24gcmVhZEp1c3RMZW5ndGgoKSB7XG5cdGxldCB0b2tlbiA9IHNyY1twb3NpdGlvbiQxKytdICYgMzE7XG5cdGlmICh0b2tlbiA+IDIzKSBzd2l0Y2ggKHRva2VuKSB7XG5cdFx0Y2FzZSAyNDpcblx0XHRcdHRva2VuID0gc3JjW3Bvc2l0aW9uJDErK107XG5cdFx0XHRicmVhaztcblx0XHRjYXNlIDI1OlxuXHRcdFx0dG9rZW4gPSBkYXRhVmlldy5nZXRVaW50MTYocG9zaXRpb24kMSk7XG5cdFx0XHRwb3NpdGlvbiQxICs9IDI7XG5cdFx0XHRicmVhaztcblx0XHRjYXNlIDI2OlxuXHRcdFx0dG9rZW4gPSBkYXRhVmlldy5nZXRVaW50MzIocG9zaXRpb24kMSk7XG5cdFx0XHRwb3NpdGlvbiQxICs9IDQ7XG5cdH1cblx0cmV0dXJuIHRva2VuO1xufVxuZnVuY3Rpb24gbG9hZFNoYXJlZCgpIHtcblx0aWYgKGN1cnJlbnREZWNvZGVyLmdldFNoYXJlZCkge1xuXHRcdGxldCBzaGFyZWREYXRhID0gc2F2ZVN0YXRlKCgpID0+IHtcblx0XHRcdHNyYyA9IG51bGw7XG5cdFx0XHRyZXR1cm4gY3VycmVudERlY29kZXIuZ2V0U2hhcmVkKCk7XG5cdFx0fSkgfHwge307XG5cdFx0bGV0IHVwZGF0ZWRTdHJ1Y3R1cmVzID0gc2hhcmVkRGF0YS5zdHJ1Y3R1cmVzIHx8IFtdO1xuXHRcdGN1cnJlbnREZWNvZGVyLnNoYXJlZFZlcnNpb24gPSBzaGFyZWREYXRhLnZlcnNpb247XG5cdFx0cGFja2VkVmFsdWVzID0gY3VycmVudERlY29kZXIuc2hhcmVkVmFsdWVzID0gc2hhcmVkRGF0YS5wYWNrZWRWYWx1ZXM7XG5cdFx0aWYgKGN1cnJlbnRTdHJ1Y3R1cmVzID09PSB0cnVlKSBjdXJyZW50RGVjb2Rlci5zdHJ1Y3R1cmVzID0gY3VycmVudFN0cnVjdHVyZXMgPSB1cGRhdGVkU3RydWN0dXJlcztcblx0XHRlbHNlIGN1cnJlbnRTdHJ1Y3R1cmVzLnNwbGljZS5hcHBseShjdXJyZW50U3RydWN0dXJlcywgWzAsIHVwZGF0ZWRTdHJ1Y3R1cmVzLmxlbmd0aF0uY29uY2F0KHVwZGF0ZWRTdHJ1Y3R1cmVzKSk7XG5cdH1cbn1cbmZ1bmN0aW9uIHNhdmVTdGF0ZShjYWxsYmFjaykge1xuXHRsZXQgc2F2ZWRTcmNFbmQgPSBzcmNFbmQ7XG5cdGxldCBzYXZlZFBvc2l0aW9uID0gcG9zaXRpb24kMTtcblx0bGV0IHNhdmVkU3RyaW5nUG9zaXRpb24gPSBzdHJpbmdQb3NpdGlvbjtcblx0bGV0IHNhdmVkU3JjU3RyaW5nU3RhcnQgPSBzcmNTdHJpbmdTdGFydDtcblx0bGV0IHNhdmVkU3JjU3RyaW5nRW5kID0gc3JjU3RyaW5nRW5kO1xuXHRsZXQgc2F2ZWRTcmNTdHJpbmcgPSBzcmNTdHJpbmc7XG5cdGxldCBzYXZlZFN0cmluZ3MgPSBzdHJpbmdzO1xuXHRsZXQgc2F2ZWRSZWZlcmVuY2VNYXAgPSByZWZlcmVuY2VNYXA7XG5cdGxldCBzYXZlZEJ1bmRsZWRTdHJpbmdzID0gYnVuZGxlZFN0cmluZ3MkMTtcblx0bGV0IHNhdmVkU3JjID0gbmV3IFVpbnQ4QXJyYXkoc3JjLnNsaWNlKDAsIHNyY0VuZCkpO1xuXHRsZXQgc2F2ZWRTdHJ1Y3R1cmVzID0gY3VycmVudFN0cnVjdHVyZXM7XG5cdGxldCBzYXZlZERlY29kZXIgPSBjdXJyZW50RGVjb2Rlcjtcblx0bGV0IHNhdmVkU2VxdWVudGlhbE1vZGUgPSBzZXF1ZW50aWFsTW9kZTtcblx0bGV0IHZhbHVlID0gY2FsbGJhY2soKTtcblx0c3JjRW5kID0gc2F2ZWRTcmNFbmQ7XG5cdHBvc2l0aW9uJDEgPSBzYXZlZFBvc2l0aW9uO1xuXHRzdHJpbmdQb3NpdGlvbiA9IHNhdmVkU3RyaW5nUG9zaXRpb247XG5cdHNyY1N0cmluZ1N0YXJ0ID0gc2F2ZWRTcmNTdHJpbmdTdGFydDtcblx0c3JjU3RyaW5nRW5kID0gc2F2ZWRTcmNTdHJpbmdFbmQ7XG5cdHNyY1N0cmluZyA9IHNhdmVkU3JjU3RyaW5nO1xuXHRzdHJpbmdzID0gc2F2ZWRTdHJpbmdzO1xuXHRyZWZlcmVuY2VNYXAgPSBzYXZlZFJlZmVyZW5jZU1hcDtcblx0YnVuZGxlZFN0cmluZ3MkMSA9IHNhdmVkQnVuZGxlZFN0cmluZ3M7XG5cdHNyYyA9IHNhdmVkU3JjO1xuXHRzZXF1ZW50aWFsTW9kZSA9IHNhdmVkU2VxdWVudGlhbE1vZGU7XG5cdGN1cnJlbnRTdHJ1Y3R1cmVzID0gc2F2ZWRTdHJ1Y3R1cmVzO1xuXHRjdXJyZW50RGVjb2RlciA9IHNhdmVkRGVjb2Rlcjtcblx0ZGF0YVZpZXcgPSBuZXcgRGF0YVZpZXcoc3JjLmJ1ZmZlciwgc3JjLmJ5dGVPZmZzZXQsIHNyYy5ieXRlTGVuZ3RoKTtcblx0cmV0dXJuIHZhbHVlO1xufVxuZnVuY3Rpb24gY2xlYXJTb3VyY2UoKSB7XG5cdHNyYyA9IG51bGw7XG5cdHJlZmVyZW5jZU1hcCA9IG51bGw7XG5cdGN1cnJlbnRTdHJ1Y3R1cmVzID0gbnVsbDtcbn1cbnZhciBtdWx0MTAgPSBuZXcgQXJyYXkoMTQ3KTtcbmZvciAobGV0IGkgPSAwOyBpIDwgMjU2OyBpKyspIG11bHQxMFtpXSA9ICsoXCIxZVwiICsgTWF0aC5mbG9vcig0NS4xNSAtIGkgKiAuMzAxMDMpKTtcbnZhciBkZWZhdWx0RGVjb2RlciA9IG5ldyBEZWNvZGVyKHsgdXNlUmVjb3JkczogZmFsc2UgfSk7XG52YXIgZGVjb2RlID0gZGVmYXVsdERlY29kZXIuZGVjb2RlO1xudmFyIGRlY29kZU11bHRpcGxlID0gZGVmYXVsdERlY29kZXIuZGVjb2RlTXVsdGlwbGU7XG52YXIgRkxPQVQzMl9PUFRJT05TID0ge1xuXHRORVZFUjogMCxcblx0QUxXQVlTOiAxLFxuXHRERUNJTUFMX1JPVU5EOiAzLFxuXHRERUNJTUFMX0ZJVDogNFxufTtcblxuLy8jZW5kcmVnaW9uXG4vLyNyZWdpb24gLi4vLi4vLi4vbm9kZV9tb2R1bGVzL2Nib3IteC9lbmNvZGUuanNcbnZhciB0ZXh0RW5jb2RlcjtcbnRyeSB7XG5cdHRleHRFbmNvZGVyID0gbmV3IFRleHRFbmNvZGVyKCk7XG59IGNhdGNoIChlcnJvcikge31cbnZhciBleHRlbnNpb25zO1xudmFyIGV4dGVuc2lvbkNsYXNzZXM7XG52YXIgQnVmZmVyJDEgPSB0eXBlb2YgZ2xvYmFsVGhpcyA9PT0gXCJvYmplY3RcIiAmJiBnbG9iYWxUaGlzLkJ1ZmZlcjtcbnZhciBoYXNOb2RlQnVmZmVyID0gdHlwZW9mIEJ1ZmZlciQxICE9PSBcInVuZGVmaW5lZFwiO1xudmFyIEJ5dGVBcnJheUFsbG9jYXRlID0gaGFzTm9kZUJ1ZmZlciA/IEJ1ZmZlciQxLmFsbG9jVW5zYWZlU2xvdyA6IFVpbnQ4QXJyYXk7XG52YXIgQnl0ZUFycmF5ID0gaGFzTm9kZUJ1ZmZlciA/IEJ1ZmZlciQxIDogVWludDhBcnJheTtcbnZhciBNQVhfU1RSVUNUVVJFUyA9IDI1NjtcbnZhciBNQVhfQlVGRkVSX1NJWkUgPSBoYXNOb2RlQnVmZmVyID8gNDI5NDk2NzI5NiA6IDIxNDQzMzc5MjA7XG52YXIgdGhyb3dPbkl0ZXJhYmxlO1xudmFyIHRhcmdldDtcbnZhciB0YXJnZXRWaWV3O1xudmFyIHBvc2l0aW9uID0gMDtcbnZhciBzYWZlRW5kO1xudmFyIGJ1bmRsZWRTdHJpbmdzID0gbnVsbDtcbnZhciBNQVhfQlVORExFX1NJWkUgPSA2MTQ0MDtcbnZhciBoYXNOb25MYXRpbiA9IC9bXFx1MDA4MC1cXHVGRkZGXS87XG52YXIgUkVDT1JEX1NZTUJPTCA9IFN5bWJvbChcInJlY29yZC1pZFwiKTtcbnZhciBFbmNvZGVyID0gY2xhc3MgZXh0ZW5kcyBEZWNvZGVyIHtcblx0Y29uc3RydWN0b3Iob3B0aW9ucykge1xuXHRcdHN1cGVyKG9wdGlvbnMpO1xuXHRcdHRoaXMub2Zmc2V0ID0gMDtcblx0XHRsZXQgc3RhcnQ7XG5cdFx0bGV0IHNoYXJlZFN0cnVjdHVyZXM7XG5cdFx0bGV0IGhhc1NoYXJlZFVwZGF0ZTtcblx0XHRsZXQgc3RydWN0dXJlcztcblx0XHRsZXQgcmVmZXJlbmNlTWFwO1xuXHRcdG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXHRcdGxldCBlbmNvZGVVdGY4ID0gQnl0ZUFycmF5LnByb3RvdHlwZS51dGY4V3JpdGUgPyBmdW5jdGlvbihzdHJpbmcsIHBvc2l0aW9uKSB7XG5cdFx0XHRyZXR1cm4gdGFyZ2V0LnV0ZjhXcml0ZShzdHJpbmcsIHBvc2l0aW9uLCB0YXJnZXQuYnl0ZUxlbmd0aCAtIHBvc2l0aW9uKTtcblx0XHR9IDogdGV4dEVuY29kZXIgJiYgdGV4dEVuY29kZXIuZW5jb2RlSW50byA/IGZ1bmN0aW9uKHN0cmluZywgcG9zaXRpb24pIHtcblx0XHRcdHJldHVybiB0ZXh0RW5jb2Rlci5lbmNvZGVJbnRvKHN0cmluZywgdGFyZ2V0LnN1YmFycmF5KHBvc2l0aW9uKSkud3JpdHRlbjtcblx0XHR9IDogZmFsc2U7XG5cdFx0bGV0IGVuY29kZXIgPSB0aGlzO1xuXHRcdGxldCBoYXNTaGFyZWRTdHJ1Y3R1cmVzID0gb3B0aW9ucy5zdHJ1Y3R1cmVzIHx8IG9wdGlvbnMuc2F2ZVN0cnVjdHVyZXM7XG5cdFx0bGV0IG1heFNoYXJlZFN0cnVjdHVyZXMgPSBvcHRpb25zLm1heFNoYXJlZFN0cnVjdHVyZXM7XG5cdFx0aWYgKG1heFNoYXJlZFN0cnVjdHVyZXMgPT0gbnVsbCkgbWF4U2hhcmVkU3RydWN0dXJlcyA9IGhhc1NoYXJlZFN0cnVjdHVyZXMgPyAxMjggOiAwO1xuXHRcdGlmIChtYXhTaGFyZWRTdHJ1Y3R1cmVzID4gODE5MCkgdGhyb3cgbmV3IEVycm9yKFwiTWF4aW11bSBtYXhTaGFyZWRTdHJ1Y3R1cmUgaXMgODE5MFwiKTtcblx0XHRsZXQgaXNTZXF1ZW50aWFsID0gb3B0aW9ucy5zZXF1ZW50aWFsO1xuXHRcdGlmIChpc1NlcXVlbnRpYWwpIG1heFNoYXJlZFN0cnVjdHVyZXMgPSAwO1xuXHRcdGlmICghdGhpcy5zdHJ1Y3R1cmVzKSB0aGlzLnN0cnVjdHVyZXMgPSBbXTtcblx0XHRpZiAodGhpcy5zYXZlU3RydWN0dXJlcykgdGhpcy5zYXZlU2hhcmVkID0gdGhpcy5zYXZlU3RydWN0dXJlcztcblx0XHRsZXQgc2FtcGxpbmdQYWNrZWRWYWx1ZXMsIHBhY2tlZE9iamVjdE1hcCwgc2hhcmVkVmFsdWVzID0gb3B0aW9ucy5zaGFyZWRWYWx1ZXM7XG5cdFx0bGV0IHNoYXJlZFBhY2tlZE9iamVjdE1hcDtcblx0XHRpZiAoc2hhcmVkVmFsdWVzKSB7XG5cdFx0XHRzaGFyZWRQYWNrZWRPYmplY3RNYXAgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuXHRcdFx0Zm9yIChsZXQgaSA9IDAsIGwgPSBzaGFyZWRWYWx1ZXMubGVuZ3RoOyBpIDwgbDsgaSsrKSBzaGFyZWRQYWNrZWRPYmplY3RNYXBbc2hhcmVkVmFsdWVzW2ldXSA9IGk7XG5cdFx0fVxuXHRcdGxldCByZWNvcmRJZHNUb1JlbW92ZSA9IFtdO1xuXHRcdGxldCB0cmFuc2l0aW9uc0NvdW50ID0gMDtcblx0XHRsZXQgc2VyaWFsaXphdGlvbnNTaW5jZVRyYW5zaXRpb25SZWJ1aWxkID0gMDtcblx0XHR0aGlzLm1hcEVuY29kZSA9IGZ1bmN0aW9uKHZhbHVlLCBlbmNvZGVPcHRpb25zKSB7XG5cdFx0XHRpZiAodGhpcy5fa2V5TWFwICYmICF0aGlzLl9tYXBwZWQpIHN3aXRjaCAodmFsdWUuY29uc3RydWN0b3IubmFtZSkge1xuXHRcdFx0XHRjYXNlIFwiQXJyYXlcIjogdmFsdWUgPSB2YWx1ZS5tYXAoKHIpID0+IHRoaXMuZW5jb2RlS2V5cyhyKSk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gdGhpcy5lbmNvZGUodmFsdWUsIGVuY29kZU9wdGlvbnMpO1xuXHRcdH07XG5cdFx0dGhpcy5lbmNvZGUgPSBmdW5jdGlvbih2YWx1ZSwgZW5jb2RlT3B0aW9ucykge1xuXHRcdFx0aWYgKCF0YXJnZXQpIHtcblx0XHRcdFx0dGFyZ2V0ID0gbmV3IEJ5dGVBcnJheUFsbG9jYXRlKDgxOTIpO1xuXHRcdFx0XHR0YXJnZXRWaWV3ID0gbmV3IERhdGFWaWV3KHRhcmdldC5idWZmZXIsIDAsIDgxOTIpO1xuXHRcdFx0XHRwb3NpdGlvbiA9IDA7XG5cdFx0XHR9XG5cdFx0XHRzYWZlRW5kID0gdGFyZ2V0Lmxlbmd0aCAtIDEwO1xuXHRcdFx0aWYgKHNhZmVFbmQgLSBwb3NpdGlvbiA8IDIwNDgpIHtcblx0XHRcdFx0dGFyZ2V0ID0gbmV3IEJ5dGVBcnJheUFsbG9jYXRlKHRhcmdldC5sZW5ndGgpO1xuXHRcdFx0XHR0YXJnZXRWaWV3ID0gbmV3IERhdGFWaWV3KHRhcmdldC5idWZmZXIsIDAsIHRhcmdldC5sZW5ndGgpO1xuXHRcdFx0XHRzYWZlRW5kID0gdGFyZ2V0Lmxlbmd0aCAtIDEwO1xuXHRcdFx0XHRwb3NpdGlvbiA9IDA7XG5cdFx0XHR9IGVsc2UgaWYgKGVuY29kZU9wdGlvbnMgPT09IDUxMikgcG9zaXRpb24gPSBwb3NpdGlvbiArIDcgJiAyMTQ3NDgzNjQwO1xuXHRcdFx0c3RhcnQgPSBwb3NpdGlvbjtcblx0XHRcdGlmIChlbmNvZGVyLnVzZVNlbGZEZXNjcmliZWRIZWFkZXIpIHtcblx0XHRcdFx0dGFyZ2V0Vmlldy5zZXRVaW50MzIocG9zaXRpb24sIDM2NTQ5NDA0MTYpO1xuXHRcdFx0XHRwb3NpdGlvbiArPSAzO1xuXHRcdFx0fVxuXHRcdFx0cmVmZXJlbmNlTWFwID0gZW5jb2Rlci5zdHJ1Y3R1cmVkQ2xvbmUgPyAvKiBAX19QVVJFX18gKi8gbmV3IE1hcCgpIDogbnVsbDtcblx0XHRcdGlmIChlbmNvZGVyLmJ1bmRsZVN0cmluZ3MgJiYgdHlwZW9mIHZhbHVlICE9PSBcInN0cmluZ1wiKSB7XG5cdFx0XHRcdGJ1bmRsZWRTdHJpbmdzID0gW107XG5cdFx0XHRcdGJ1bmRsZWRTdHJpbmdzLnNpemUgPSBJbmZpbml0eTtcblx0XHRcdH0gZWxzZSBidW5kbGVkU3RyaW5ncyA9IG51bGw7XG5cdFx0XHRzaGFyZWRTdHJ1Y3R1cmVzID0gZW5jb2Rlci5zdHJ1Y3R1cmVzO1xuXHRcdFx0aWYgKHNoYXJlZFN0cnVjdHVyZXMpIHtcblx0XHRcdFx0aWYgKHNoYXJlZFN0cnVjdHVyZXMudW5pbml0aWFsaXplZCkge1xuXHRcdFx0XHRcdGxldCBzaGFyZWREYXRhID0gZW5jb2Rlci5nZXRTaGFyZWQoKSB8fCB7fTtcblx0XHRcdFx0XHRlbmNvZGVyLnN0cnVjdHVyZXMgPSBzaGFyZWRTdHJ1Y3R1cmVzID0gc2hhcmVkRGF0YS5zdHJ1Y3R1cmVzIHx8IFtdO1xuXHRcdFx0XHRcdGVuY29kZXIuc2hhcmVkVmVyc2lvbiA9IHNoYXJlZERhdGEudmVyc2lvbjtcblx0XHRcdFx0XHRsZXQgc2hhcmVkVmFsdWVzID0gZW5jb2Rlci5zaGFyZWRWYWx1ZXMgPSBzaGFyZWREYXRhLnBhY2tlZFZhbHVlcztcblx0XHRcdFx0XHRpZiAoc2hhcmVkVmFsdWVzKSB7XG5cdFx0XHRcdFx0XHRzaGFyZWRQYWNrZWRPYmplY3RNYXAgPSB7fTtcblx0XHRcdFx0XHRcdGZvciAobGV0IGkgPSAwLCBsID0gc2hhcmVkVmFsdWVzLmxlbmd0aDsgaSA8IGw7IGkrKykgc2hhcmVkUGFja2VkT2JqZWN0TWFwW3NoYXJlZFZhbHVlc1tpXV0gPSBpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRsZXQgc2hhcmVkU3RydWN0dXJlc0xlbmd0aCA9IHNoYXJlZFN0cnVjdHVyZXMubGVuZ3RoO1xuXHRcdFx0XHRpZiAoc2hhcmVkU3RydWN0dXJlc0xlbmd0aCA+IG1heFNoYXJlZFN0cnVjdHVyZXMgJiYgIWlzU2VxdWVudGlhbCkgc2hhcmVkU3RydWN0dXJlc0xlbmd0aCA9IG1heFNoYXJlZFN0cnVjdHVyZXM7XG5cdFx0XHRcdGlmICghc2hhcmVkU3RydWN0dXJlcy50cmFuc2l0aW9ucykge1xuXHRcdFx0XHRcdHNoYXJlZFN0cnVjdHVyZXMudHJhbnNpdGlvbnMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuXHRcdFx0XHRcdGZvciAobGV0IGkgPSAwOyBpIDwgc2hhcmVkU3RydWN0dXJlc0xlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdFx0XHRsZXQga2V5cyA9IHNoYXJlZFN0cnVjdHVyZXNbaV07XG5cdFx0XHRcdFx0XHRpZiAoIWtleXMpIGNvbnRpbnVlO1xuXHRcdFx0XHRcdFx0bGV0IG5leHRUcmFuc2l0aW9uLCB0cmFuc2l0aW9uID0gc2hhcmVkU3RydWN0dXJlcy50cmFuc2l0aW9ucztcblx0XHRcdFx0XHRcdGZvciAobGV0IGogPSAwLCBsID0ga2V5cy5sZW5ndGg7IGogPCBsOyBqKyspIHtcblx0XHRcdFx0XHRcdFx0aWYgKHRyYW5zaXRpb25bUkVDT1JEX1NZTUJPTF0gPT09IHZvaWQgMCkgdHJhbnNpdGlvbltSRUNPUkRfU1lNQk9MXSA9IGk7XG5cdFx0XHRcdFx0XHRcdGxldCBrZXkgPSBrZXlzW2pdO1xuXHRcdFx0XHRcdFx0XHRuZXh0VHJhbnNpdGlvbiA9IHRyYW5zaXRpb25ba2V5XTtcblx0XHRcdFx0XHRcdFx0aWYgKCFuZXh0VHJhbnNpdGlvbikgbmV4dFRyYW5zaXRpb24gPSB0cmFuc2l0aW9uW2tleV0gPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuXHRcdFx0XHRcdFx0XHR0cmFuc2l0aW9uID0gbmV4dFRyYW5zaXRpb247XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR0cmFuc2l0aW9uW1JFQ09SRF9TWU1CT0xdID0gaSB8IDEwNDg1NzY7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdGlmICghaXNTZXF1ZW50aWFsKSBzaGFyZWRTdHJ1Y3R1cmVzLm5leHRJZCA9IHNoYXJlZFN0cnVjdHVyZXNMZW5ndGg7XG5cdFx0XHR9XG5cdFx0XHRpZiAoaGFzU2hhcmVkVXBkYXRlKSBoYXNTaGFyZWRVcGRhdGUgPSBmYWxzZTtcblx0XHRcdHN0cnVjdHVyZXMgPSBzaGFyZWRTdHJ1Y3R1cmVzIHx8IFtdO1xuXHRcdFx0cGFja2VkT2JqZWN0TWFwID0gc2hhcmVkUGFja2VkT2JqZWN0TWFwO1xuXHRcdFx0aWYgKG9wdGlvbnMucGFjaykge1xuXHRcdFx0XHRsZXQgcGFja2VkVmFsdWVzID0gLyogQF9fUFVSRV9fICovIG5ldyBNYXAoKTtcblx0XHRcdFx0cGFja2VkVmFsdWVzLnZhbHVlcyA9IFtdO1xuXHRcdFx0XHRwYWNrZWRWYWx1ZXMuZW5jb2RlciA9IGVuY29kZXI7XG5cdFx0XHRcdHBhY2tlZFZhbHVlcy5tYXhWYWx1ZXMgPSBvcHRpb25zLm1heFByaXZhdGVQYWNrZWRWYWx1ZXMgfHwgKHNoYXJlZFBhY2tlZE9iamVjdE1hcCA/IDE2IDogSW5maW5pdHkpO1xuXHRcdFx0XHRwYWNrZWRWYWx1ZXMub2JqZWN0TWFwID0gc2hhcmVkUGFja2VkT2JqZWN0TWFwIHx8IGZhbHNlO1xuXHRcdFx0XHRwYWNrZWRWYWx1ZXMuc2FtcGxpbmdQYWNrZWRWYWx1ZXMgPSBzYW1wbGluZ1BhY2tlZFZhbHVlcztcblx0XHRcdFx0ZmluZFJlcGV0aXRpdmVTdHJpbmdzKHZhbHVlLCBwYWNrZWRWYWx1ZXMpO1xuXHRcdFx0XHRpZiAocGFja2VkVmFsdWVzLnZhbHVlcy5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdFx0dGFyZ2V0W3Bvc2l0aW9uKytdID0gMjE2O1xuXHRcdFx0XHRcdHRhcmdldFtwb3NpdGlvbisrXSA9IDUxO1xuXHRcdFx0XHRcdHdyaXRlQXJyYXlIZWFkZXIoNCk7XG5cdFx0XHRcdFx0bGV0IHZhbHVlc0FycmF5ID0gcGFja2VkVmFsdWVzLnZhbHVlcztcblx0XHRcdFx0XHRlbmNvZGUodmFsdWVzQXJyYXkpO1xuXHRcdFx0XHRcdHdyaXRlQXJyYXlIZWFkZXIoMCk7XG5cdFx0XHRcdFx0d3JpdGVBcnJheUhlYWRlcigwKTtcblx0XHRcdFx0XHRwYWNrZWRPYmplY3RNYXAgPSBPYmplY3QuY3JlYXRlKHNoYXJlZFBhY2tlZE9iamVjdE1hcCB8fCBudWxsKTtcblx0XHRcdFx0XHRmb3IgKGxldCBpID0gMCwgbCA9IHZhbHVlc0FycmF5Lmxlbmd0aDsgaSA8IGw7IGkrKykgcGFja2VkT2JqZWN0TWFwW3ZhbHVlc0FycmF5W2ldXSA9IGk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdHRocm93T25JdGVyYWJsZSA9IGVuY29kZU9wdGlvbnMgJiBUSFJPV19PTl9JVEVSQUJMRTtcblx0XHRcdHRyeSB7XG5cdFx0XHRcdGlmICh0aHJvd09uSXRlcmFibGUpIHJldHVybjtcblx0XHRcdFx0ZW5jb2RlKHZhbHVlKTtcblx0XHRcdFx0aWYgKGJ1bmRsZWRTdHJpbmdzKSB3cml0ZUJ1bmRsZXMoc3RhcnQsIGVuY29kZSk7XG5cdFx0XHRcdGVuY29kZXIub2Zmc2V0ID0gcG9zaXRpb247XG5cdFx0XHRcdGlmIChyZWZlcmVuY2VNYXAgJiYgcmVmZXJlbmNlTWFwLmlkc1RvSW5zZXJ0KSB7XG5cdFx0XHRcdFx0cG9zaXRpb24gKz0gcmVmZXJlbmNlTWFwLmlkc1RvSW5zZXJ0Lmxlbmd0aCAqIDI7XG5cdFx0XHRcdFx0aWYgKHBvc2l0aW9uID4gc2FmZUVuZCkgbWFrZVJvb20ocG9zaXRpb24pO1xuXHRcdFx0XHRcdGVuY29kZXIub2Zmc2V0ID0gcG9zaXRpb247XG5cdFx0XHRcdFx0bGV0IHNlcmlhbGl6ZWQgPSBpbnNlcnRJZHModGFyZ2V0LnN1YmFycmF5KHN0YXJ0LCBwb3NpdGlvbiksIHJlZmVyZW5jZU1hcC5pZHNUb0luc2VydCk7XG5cdFx0XHRcdFx0cmVmZXJlbmNlTWFwID0gbnVsbDtcblx0XHRcdFx0XHRyZXR1cm4gc2VyaWFsaXplZDtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoZW5jb2RlT3B0aW9ucyAmIDUxMikge1xuXHRcdFx0XHRcdHRhcmdldC5zdGFydCA9IHN0YXJ0O1xuXHRcdFx0XHRcdHRhcmdldC5lbmQgPSBwb3NpdGlvbjtcblx0XHRcdFx0XHRyZXR1cm4gdGFyZ2V0O1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiB0YXJnZXQuc3ViYXJyYXkoc3RhcnQsIHBvc2l0aW9uKTtcblx0XHRcdH0gZmluYWxseSB7XG5cdFx0XHRcdGlmIChzaGFyZWRTdHJ1Y3R1cmVzKSB7XG5cdFx0XHRcdFx0aWYgKHNlcmlhbGl6YXRpb25zU2luY2VUcmFuc2l0aW9uUmVidWlsZCA8IDEwKSBzZXJpYWxpemF0aW9uc1NpbmNlVHJhbnNpdGlvblJlYnVpbGQrKztcblx0XHRcdFx0XHRpZiAoc2hhcmVkU3RydWN0dXJlcy5sZW5ndGggPiBtYXhTaGFyZWRTdHJ1Y3R1cmVzKSBzaGFyZWRTdHJ1Y3R1cmVzLmxlbmd0aCA9IG1heFNoYXJlZFN0cnVjdHVyZXM7XG5cdFx0XHRcdFx0aWYgKHRyYW5zaXRpb25zQ291bnQgPiAxZTQpIHtcblx0XHRcdFx0XHRcdHNoYXJlZFN0cnVjdHVyZXMudHJhbnNpdGlvbnMgPSBudWxsO1xuXHRcdFx0XHRcdFx0c2VyaWFsaXphdGlvbnNTaW5jZVRyYW5zaXRpb25SZWJ1aWxkID0gMDtcblx0XHRcdFx0XHRcdHRyYW5zaXRpb25zQ291bnQgPSAwO1xuXHRcdFx0XHRcdFx0aWYgKHJlY29yZElkc1RvUmVtb3ZlLmxlbmd0aCA+IDApIHJlY29yZElkc1RvUmVtb3ZlID0gW107XG5cdFx0XHRcdFx0fSBlbHNlIGlmIChyZWNvcmRJZHNUb1JlbW92ZS5sZW5ndGggPiAwICYmICFpc1NlcXVlbnRpYWwpIHtcblx0XHRcdFx0XHRcdGZvciAobGV0IGkgPSAwLCBsID0gcmVjb3JkSWRzVG9SZW1vdmUubGVuZ3RoOyBpIDwgbDsgaSsrKSByZWNvcmRJZHNUb1JlbW92ZVtpXVtSRUNPUkRfU1lNQk9MXSA9IHZvaWQgMDtcblx0XHRcdFx0XHRcdHJlY29yZElkc1RvUmVtb3ZlID0gW107XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdGlmIChoYXNTaGFyZWRVcGRhdGUgJiYgZW5jb2Rlci5zYXZlU2hhcmVkKSB7XG5cdFx0XHRcdFx0aWYgKGVuY29kZXIuc3RydWN0dXJlcy5sZW5ndGggPiBtYXhTaGFyZWRTdHJ1Y3R1cmVzKSBlbmNvZGVyLnN0cnVjdHVyZXMgPSBlbmNvZGVyLnN0cnVjdHVyZXMuc2xpY2UoMCwgbWF4U2hhcmVkU3RydWN0dXJlcyk7XG5cdFx0XHRcdFx0bGV0IHJldHVybkJ1ZmZlciA9IHRhcmdldC5zdWJhcnJheShzdGFydCwgcG9zaXRpb24pO1xuXHRcdFx0XHRcdGlmIChlbmNvZGVyLnVwZGF0ZVNoYXJlZERhdGEoKSA9PT0gZmFsc2UpIHJldHVybiBlbmNvZGVyLmVuY29kZSh2YWx1ZSk7XG5cdFx0XHRcdFx0cmV0dXJuIHJldHVybkJ1ZmZlcjtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoZW5jb2RlT3B0aW9ucyAmIDEwMjQpIHBvc2l0aW9uID0gc3RhcnQ7XG5cdFx0XHR9XG5cdFx0fTtcblx0XHR0aGlzLmZpbmRDb21tb25TdHJpbmdzVG9QYWNrID0gKCkgPT4ge1xuXHRcdFx0c2FtcGxpbmdQYWNrZWRWYWx1ZXMgPSAvKiBAX19QVVJFX18gKi8gbmV3IE1hcCgpO1xuXHRcdFx0aWYgKCFzaGFyZWRQYWNrZWRPYmplY3RNYXApIHNoYXJlZFBhY2tlZE9iamVjdE1hcCA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG5cdFx0XHRyZXR1cm4gKG9wdGlvbnMpID0+IHtcblx0XHRcdFx0bGV0IHRocmVzaG9sZCA9IG9wdGlvbnMgJiYgb3B0aW9ucy50aHJlc2hvbGQgfHwgNDtcblx0XHRcdFx0bGV0IHBvc2l0aW9uID0gdGhpcy5wYWNrID8gb3B0aW9ucy5tYXhQcml2YXRlUGFja2VkVmFsdWVzIHx8IDE2IDogMDtcblx0XHRcdFx0aWYgKCFzaGFyZWRWYWx1ZXMpIHNoYXJlZFZhbHVlcyA9IHRoaXMuc2hhcmVkVmFsdWVzID0gW107XG5cdFx0XHRcdGZvciAobGV0IFtrZXksIHN0YXR1c10gb2Ygc2FtcGxpbmdQYWNrZWRWYWx1ZXMpIGlmIChzdGF0dXMuY291bnQgPiB0aHJlc2hvbGQpIHtcblx0XHRcdFx0XHRzaGFyZWRQYWNrZWRPYmplY3RNYXBba2V5XSA9IHBvc2l0aW9uKys7XG5cdFx0XHRcdFx0c2hhcmVkVmFsdWVzLnB1c2goa2V5KTtcblx0XHRcdFx0XHRoYXNTaGFyZWRVcGRhdGUgPSB0cnVlO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHdoaWxlICh0aGlzLnNhdmVTaGFyZWQgJiYgdGhpcy51cGRhdGVTaGFyZWREYXRhKCkgPT09IGZhbHNlKTtcblx0XHRcdFx0c2FtcGxpbmdQYWNrZWRWYWx1ZXMgPSBudWxsO1xuXHRcdFx0fTtcblx0XHR9O1xuXHRcdGNvbnN0IGVuY29kZSA9ICh2YWx1ZSkgPT4ge1xuXHRcdFx0aWYgKHBvc2l0aW9uID4gc2FmZUVuZCkgdGFyZ2V0ID0gbWFrZVJvb20ocG9zaXRpb24pO1xuXHRcdFx0dmFyIHR5cGUgPSB0eXBlb2YgdmFsdWU7XG5cdFx0XHR2YXIgbGVuZ3RoO1xuXHRcdFx0aWYgKHR5cGUgPT09IFwic3RyaW5nXCIpIHtcblx0XHRcdFx0aWYgKHBhY2tlZE9iamVjdE1hcCkge1xuXHRcdFx0XHRcdGxldCBwYWNrZWRQb3NpdGlvbiA9IHBhY2tlZE9iamVjdE1hcFt2YWx1ZV07XG5cdFx0XHRcdFx0aWYgKHBhY2tlZFBvc2l0aW9uID49IDApIHtcblx0XHRcdFx0XHRcdGlmIChwYWNrZWRQb3NpdGlvbiA8IDE2KSB0YXJnZXRbcG9zaXRpb24rK10gPSBwYWNrZWRQb3NpdGlvbiArIDIyNDtcblx0XHRcdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdFx0XHR0YXJnZXRbcG9zaXRpb24rK10gPSAxOTg7XG5cdFx0XHRcdFx0XHRcdGlmIChwYWNrZWRQb3NpdGlvbiAmIDEpIGVuY29kZSgxNSAtIHBhY2tlZFBvc2l0aW9uID4+IDEpO1xuXHRcdFx0XHRcdFx0XHRlbHNlIGVuY29kZShwYWNrZWRQb3NpdGlvbiAtIDE2ID4+IDEpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdH0gZWxzZSBpZiAoc2FtcGxpbmdQYWNrZWRWYWx1ZXMgJiYgIW9wdGlvbnMucGFjaykge1xuXHRcdFx0XHRcdFx0bGV0IHN0YXR1cyA9IHNhbXBsaW5nUGFja2VkVmFsdWVzLmdldCh2YWx1ZSk7XG5cdFx0XHRcdFx0XHRpZiAoc3RhdHVzKSBzdGF0dXMuY291bnQrKztcblx0XHRcdFx0XHRcdGVsc2Ugc2FtcGxpbmdQYWNrZWRWYWx1ZXMuc2V0KHZhbHVlLCB7IGNvdW50OiAxIH0pO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRsZXQgc3RyTGVuZ3RoID0gdmFsdWUubGVuZ3RoO1xuXHRcdFx0XHRpZiAoYnVuZGxlZFN0cmluZ3MgJiYgc3RyTGVuZ3RoID49IDQgJiYgc3RyTGVuZ3RoIDwgMTAyNCkge1xuXHRcdFx0XHRcdGlmICgoYnVuZGxlZFN0cmluZ3Muc2l6ZSArPSBzdHJMZW5ndGgpID4gTUFYX0JVTkRMRV9TSVpFKSB7XG5cdFx0XHRcdFx0XHRsZXQgZXh0U3RhcnQ7XG5cdFx0XHRcdFx0XHRsZXQgbWF4Qnl0ZXMgPSAoYnVuZGxlZFN0cmluZ3NbMF0gPyBidW5kbGVkU3RyaW5nc1swXS5sZW5ndGggKiAzICsgYnVuZGxlZFN0cmluZ3NbMV0ubGVuZ3RoIDogMCkgKyAxMDtcblx0XHRcdFx0XHRcdGlmIChwb3NpdGlvbiArIG1heEJ5dGVzID4gc2FmZUVuZCkgdGFyZ2V0ID0gbWFrZVJvb20ocG9zaXRpb24gKyBtYXhCeXRlcyk7XG5cdFx0XHRcdFx0XHR0YXJnZXRbcG9zaXRpb24rK10gPSAyMTc7XG5cdFx0XHRcdFx0XHR0YXJnZXRbcG9zaXRpb24rK10gPSAyMjM7XG5cdFx0XHRcdFx0XHR0YXJnZXRbcG9zaXRpb24rK10gPSAyNDk7XG5cdFx0XHRcdFx0XHR0YXJnZXRbcG9zaXRpb24rK10gPSBidW5kbGVkU3RyaW5ncy5wb3NpdGlvbiA/IDEzMiA6IDEzMDtcblx0XHRcdFx0XHRcdHRhcmdldFtwb3NpdGlvbisrXSA9IDI2O1xuXHRcdFx0XHRcdFx0ZXh0U3RhcnQgPSBwb3NpdGlvbiAtIHN0YXJ0O1xuXHRcdFx0XHRcdFx0cG9zaXRpb24gKz0gNDtcblx0XHRcdFx0XHRcdGlmIChidW5kbGVkU3RyaW5ncy5wb3NpdGlvbikgd3JpdGVCdW5kbGVzKHN0YXJ0LCBlbmNvZGUpO1xuXHRcdFx0XHRcdFx0YnVuZGxlZFN0cmluZ3MgPSBbXCJcIiwgXCJcIl07XG5cdFx0XHRcdFx0XHRidW5kbGVkU3RyaW5ncy5zaXplID0gMDtcblx0XHRcdFx0XHRcdGJ1bmRsZWRTdHJpbmdzLnBvc2l0aW9uID0gZXh0U3RhcnQ7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGxldCB0d29CeXRlID0gaGFzTm9uTGF0aW4udGVzdCh2YWx1ZSk7XG5cdFx0XHRcdFx0YnVuZGxlZFN0cmluZ3NbdHdvQnl0ZSA/IDAgOiAxXSArPSB2YWx1ZTtcblx0XHRcdFx0XHR0YXJnZXRbcG9zaXRpb24rK10gPSB0d29CeXRlID8gMjA2IDogMjA3O1xuXHRcdFx0XHRcdGVuY29kZShzdHJMZW5ndGgpO1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXHRcdFx0XHRsZXQgaGVhZGVyU2l6ZTtcblx0XHRcdFx0aWYgKHN0ckxlbmd0aCA8IDMyKSBoZWFkZXJTaXplID0gMTtcblx0XHRcdFx0ZWxzZSBpZiAoc3RyTGVuZ3RoIDwgMjU2KSBoZWFkZXJTaXplID0gMjtcblx0XHRcdFx0ZWxzZSBpZiAoc3RyTGVuZ3RoIDwgNjU1MzYpIGhlYWRlclNpemUgPSAzO1xuXHRcdFx0XHRlbHNlIGhlYWRlclNpemUgPSA1O1xuXHRcdFx0XHRsZXQgbWF4Qnl0ZXMgPSBzdHJMZW5ndGggKiAzO1xuXHRcdFx0XHRpZiAocG9zaXRpb24gKyBtYXhCeXRlcyA+IHNhZmVFbmQpIHRhcmdldCA9IG1ha2VSb29tKHBvc2l0aW9uICsgbWF4Qnl0ZXMpO1xuXHRcdFx0XHRpZiAoc3RyTGVuZ3RoIDwgNjQgfHwgIWVuY29kZVV0ZjgpIHtcblx0XHRcdFx0XHRsZXQgaSwgYzEsIGMyLCBzdHJQb3NpdGlvbiA9IHBvc2l0aW9uICsgaGVhZGVyU2l6ZTtcblx0XHRcdFx0XHRmb3IgKGkgPSAwOyBpIDwgc3RyTGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0XHRcdGMxID0gdmFsdWUuY2hhckNvZGVBdChpKTtcblx0XHRcdFx0XHRcdGlmIChjMSA8IDEyOCkgdGFyZ2V0W3N0clBvc2l0aW9uKytdID0gYzE7XG5cdFx0XHRcdFx0XHRlbHNlIGlmIChjMSA8IDIwNDgpIHtcblx0XHRcdFx0XHRcdFx0dGFyZ2V0W3N0clBvc2l0aW9uKytdID0gYzEgPj4gNiB8IDE5Mjtcblx0XHRcdFx0XHRcdFx0dGFyZ2V0W3N0clBvc2l0aW9uKytdID0gYzEgJiA2MyB8IDEyODtcblx0XHRcdFx0XHRcdH0gZWxzZSBpZiAoKGMxICYgNjQ1MTIpID09PSA1NTI5NiAmJiAoKGMyID0gdmFsdWUuY2hhckNvZGVBdChpICsgMSkpICYgNjQ1MTIpID09PSA1NjMyMCkge1xuXHRcdFx0XHRcdFx0XHRjMSA9IDY1NTM2ICsgKChjMSAmIDEwMjMpIDw8IDEwKSArIChjMiAmIDEwMjMpO1xuXHRcdFx0XHRcdFx0XHRpKys7XG5cdFx0XHRcdFx0XHRcdHRhcmdldFtzdHJQb3NpdGlvbisrXSA9IGMxID4+IDE4IHwgMjQwO1xuXHRcdFx0XHRcdFx0XHR0YXJnZXRbc3RyUG9zaXRpb24rK10gPSBjMSA+PiAxMiAmIDYzIHwgMTI4O1xuXHRcdFx0XHRcdFx0XHR0YXJnZXRbc3RyUG9zaXRpb24rK10gPSBjMSA+PiA2ICYgNjMgfCAxMjg7XG5cdFx0XHRcdFx0XHRcdHRhcmdldFtzdHJQb3NpdGlvbisrXSA9IGMxICYgNjMgfCAxMjg7XG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHR0YXJnZXRbc3RyUG9zaXRpb24rK10gPSBjMSA+PiAxMiB8IDIyNDtcblx0XHRcdFx0XHRcdFx0dGFyZ2V0W3N0clBvc2l0aW9uKytdID0gYzEgPj4gNiAmIDYzIHwgMTI4O1xuXHRcdFx0XHRcdFx0XHR0YXJnZXRbc3RyUG9zaXRpb24rK10gPSBjMSAmIDYzIHwgMTI4O1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRsZW5ndGggPSBzdHJQb3NpdGlvbiAtIHBvc2l0aW9uIC0gaGVhZGVyU2l6ZTtcblx0XHRcdFx0fSBlbHNlIGxlbmd0aCA9IGVuY29kZVV0ZjgodmFsdWUsIHBvc2l0aW9uICsgaGVhZGVyU2l6ZSwgbWF4Qnl0ZXMpO1xuXHRcdFx0XHRpZiAobGVuZ3RoIDwgMjQpIHRhcmdldFtwb3NpdGlvbisrXSA9IDk2IHwgbGVuZ3RoO1xuXHRcdFx0XHRlbHNlIGlmIChsZW5ndGggPCAyNTYpIHtcblx0XHRcdFx0XHRpZiAoaGVhZGVyU2l6ZSA8IDIpIHRhcmdldC5jb3B5V2l0aGluKHBvc2l0aW9uICsgMiwgcG9zaXRpb24gKyAxLCBwb3NpdGlvbiArIDEgKyBsZW5ndGgpO1xuXHRcdFx0XHRcdHRhcmdldFtwb3NpdGlvbisrXSA9IDEyMDtcblx0XHRcdFx0XHR0YXJnZXRbcG9zaXRpb24rK10gPSBsZW5ndGg7XG5cdFx0XHRcdH0gZWxzZSBpZiAobGVuZ3RoIDwgNjU1MzYpIHtcblx0XHRcdFx0XHRpZiAoaGVhZGVyU2l6ZSA8IDMpIHRhcmdldC5jb3B5V2l0aGluKHBvc2l0aW9uICsgMywgcG9zaXRpb24gKyAyLCBwb3NpdGlvbiArIDIgKyBsZW5ndGgpO1xuXHRcdFx0XHRcdHRhcmdldFtwb3NpdGlvbisrXSA9IDEyMTtcblx0XHRcdFx0XHR0YXJnZXRbcG9zaXRpb24rK10gPSBsZW5ndGggPj4gODtcblx0XHRcdFx0XHR0YXJnZXRbcG9zaXRpb24rK10gPSBsZW5ndGggJiAyNTU7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0aWYgKGhlYWRlclNpemUgPCA1KSB0YXJnZXQuY29weVdpdGhpbihwb3NpdGlvbiArIDUsIHBvc2l0aW9uICsgMywgcG9zaXRpb24gKyAzICsgbGVuZ3RoKTtcblx0XHRcdFx0XHR0YXJnZXRbcG9zaXRpb24rK10gPSAxMjI7XG5cdFx0XHRcdFx0dGFyZ2V0Vmlldy5zZXRVaW50MzIocG9zaXRpb24sIGxlbmd0aCk7XG5cdFx0XHRcdFx0cG9zaXRpb24gKz0gNDtcblx0XHRcdFx0fVxuXHRcdFx0XHRwb3NpdGlvbiArPSBsZW5ndGg7XG5cdFx0XHR9IGVsc2UgaWYgKHR5cGUgPT09IFwibnVtYmVyXCIpIHtcblx0XHRcdFx0aWYgKCF0aGlzLmFsd2F5c1VzZUZsb2F0ICYmIHZhbHVlID4+PiAwID09PSB2YWx1ZSkge1xuXHRcdFx0XHRcdGlmICh2YWx1ZSA8IDI0KSB0YXJnZXRbcG9zaXRpb24rK10gPSB2YWx1ZTtcblx0XHRcdFx0XHRlbHNlIGlmICh2YWx1ZSA8IDI1Nikge1xuXHRcdFx0XHRcdFx0dGFyZ2V0W3Bvc2l0aW9uKytdID0gMjQ7XG5cdFx0XHRcdFx0XHR0YXJnZXRbcG9zaXRpb24rK10gPSB2YWx1ZTtcblx0XHRcdFx0XHR9IGVsc2UgaWYgKHZhbHVlIDwgNjU1MzYpIHtcblx0XHRcdFx0XHRcdHRhcmdldFtwb3NpdGlvbisrXSA9IDI1O1xuXHRcdFx0XHRcdFx0dGFyZ2V0W3Bvc2l0aW9uKytdID0gdmFsdWUgPj4gODtcblx0XHRcdFx0XHRcdHRhcmdldFtwb3NpdGlvbisrXSA9IHZhbHVlICYgMjU1O1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHR0YXJnZXRbcG9zaXRpb24rK10gPSAyNjtcblx0XHRcdFx0XHRcdHRhcmdldFZpZXcuc2V0VWludDMyKHBvc2l0aW9uLCB2YWx1ZSk7XG5cdFx0XHRcdFx0XHRwb3NpdGlvbiArPSA0O1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSBlbHNlIGlmICghdGhpcy5hbHdheXNVc2VGbG9hdCAmJiB2YWx1ZSA+PiAwID09PSB2YWx1ZSkge1xuXHRcdFx0XHRcdGlmICh2YWx1ZSA+PSAtMjQpIHRhcmdldFtwb3NpdGlvbisrXSA9IDMxIC0gdmFsdWU7XG5cdFx0XHRcdFx0ZWxzZSBpZiAodmFsdWUgPj0gLTI1Nikge1xuXHRcdFx0XHRcdFx0dGFyZ2V0W3Bvc2l0aW9uKytdID0gNTY7XG5cdFx0XHRcdFx0XHR0YXJnZXRbcG9zaXRpb24rK10gPSB+dmFsdWU7XG5cdFx0XHRcdFx0fSBlbHNlIGlmICh2YWx1ZSA+PSAtNjU1MzYpIHtcblx0XHRcdFx0XHRcdHRhcmdldFtwb3NpdGlvbisrXSA9IDU3O1xuXHRcdFx0XHRcdFx0dGFyZ2V0Vmlldy5zZXRVaW50MTYocG9zaXRpb24sIH52YWx1ZSk7XG5cdFx0XHRcdFx0XHRwb3NpdGlvbiArPSAyO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHR0YXJnZXRbcG9zaXRpb24rK10gPSA1ODtcblx0XHRcdFx0XHRcdHRhcmdldFZpZXcuc2V0VWludDMyKHBvc2l0aW9uLCB+dmFsdWUpO1xuXHRcdFx0XHRcdFx0cG9zaXRpb24gKz0gNDtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0gZWxzZSBpZiAoIXRoaXMuYWx3YXlzVXNlRmxvYXQgJiYgdmFsdWUgPCAwICYmIHZhbHVlID49IC00Mjk0OTY3Mjk2ICYmIE1hdGguZmxvb3IodmFsdWUpID09PSB2YWx1ZSkge1xuXHRcdFx0XHRcdHRhcmdldFtwb3NpdGlvbisrXSA9IDU4O1xuXHRcdFx0XHRcdHRhcmdldFZpZXcuc2V0VWludDMyKHBvc2l0aW9uLCAtMSAtIHZhbHVlKTtcblx0XHRcdFx0XHRwb3NpdGlvbiArPSA0O1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGxldCB1c2VGbG9hdDMyO1xuXHRcdFx0XHRcdGlmICgodXNlRmxvYXQzMiA9IHRoaXMudXNlRmxvYXQzMikgPiAwICYmIHZhbHVlIDwgNDI5NDk2NzI5NiAmJiB2YWx1ZSA+PSAtMjE0NzQ4MzY0OCkge1xuXHRcdFx0XHRcdFx0dGFyZ2V0W3Bvc2l0aW9uKytdID0gMjUwO1xuXHRcdFx0XHRcdFx0dGFyZ2V0Vmlldy5zZXRGbG9hdDMyKHBvc2l0aW9uLCB2YWx1ZSk7XG5cdFx0XHRcdFx0XHRsZXQgeFNoaWZ0ZWQ7XG5cdFx0XHRcdFx0XHRpZiAodXNlRmxvYXQzMiA8IDQgfHwgKHhTaGlmdGVkID0gdmFsdWUgKiBtdWx0MTBbKHRhcmdldFtwb3NpdGlvbl0gJiAxMjcpIDw8IDEgfCB0YXJnZXRbcG9zaXRpb24gKyAxXSA+PiA3XSkgPj4gMCA9PT0geFNoaWZ0ZWQpIHtcblx0XHRcdFx0XHRcdFx0cG9zaXRpb24gKz0gNDtcblx0XHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdFx0fSBlbHNlIHBvc2l0aW9uLS07XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHRhcmdldFtwb3NpdGlvbisrXSA9IDI1MTtcblx0XHRcdFx0XHR0YXJnZXRWaWV3LnNldEZsb2F0NjQocG9zaXRpb24sIHZhbHVlKTtcblx0XHRcdFx0XHRwb3NpdGlvbiArPSA4O1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2UgaWYgKHR5cGUgPT09IFwib2JqZWN0XCIpIHtcblx0XHRcdFx0aWYgKCF2YWx1ZSkgdGFyZ2V0W3Bvc2l0aW9uKytdID0gMjQ2O1xuXHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRpZiAocmVmZXJlbmNlTWFwKSB7XG5cdFx0XHRcdFx0XHRsZXQgcmVmZXJlZSA9IHJlZmVyZW5jZU1hcC5nZXQodmFsdWUpO1xuXHRcdFx0XHRcdFx0aWYgKHJlZmVyZWUpIHtcblx0XHRcdFx0XHRcdFx0dGFyZ2V0W3Bvc2l0aW9uKytdID0gMjE2O1xuXHRcdFx0XHRcdFx0XHR0YXJnZXRbcG9zaXRpb24rK10gPSAyOTtcblx0XHRcdFx0XHRcdFx0dGFyZ2V0W3Bvc2l0aW9uKytdID0gMjU7XG5cdFx0XHRcdFx0XHRcdGlmICghcmVmZXJlZS5yZWZlcmVuY2VzKSB7XG5cdFx0XHRcdFx0XHRcdFx0bGV0IGlkc1RvSW5zZXJ0ID0gcmVmZXJlbmNlTWFwLmlkc1RvSW5zZXJ0IHx8IChyZWZlcmVuY2VNYXAuaWRzVG9JbnNlcnQgPSBbXSk7XG5cdFx0XHRcdFx0XHRcdFx0cmVmZXJlZS5yZWZlcmVuY2VzID0gW107XG5cdFx0XHRcdFx0XHRcdFx0aWRzVG9JbnNlcnQucHVzaChyZWZlcmVlKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRyZWZlcmVlLnJlZmVyZW5jZXMucHVzaChwb3NpdGlvbiAtIHN0YXJ0KTtcblx0XHRcdFx0XHRcdFx0cG9zaXRpb24gKz0gMjtcblx0XHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdFx0fSBlbHNlIHJlZmVyZW5jZU1hcC5zZXQodmFsdWUsIHsgb2Zmc2V0OiBwb3NpdGlvbiAtIHN0YXJ0IH0pO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRsZXQgY29uc3RydWN0b3IgPSB2YWx1ZS5jb25zdHJ1Y3Rvcjtcblx0XHRcdFx0XHRpZiAoY29uc3RydWN0b3IgPT09IE9iamVjdCkge1xuXHRcdFx0XHRcdFx0aWYgKHRoaXMuc2tpcEZ1bmN0aW9uID09PSB0cnVlKSB2YWx1ZSA9IE9iamVjdC5mcm9tRW50cmllcyhbLi4uT2JqZWN0LmtleXModmFsdWUpLmZpbHRlcigoeCkgPT4gdHlwZW9mIHZhbHVlW3hdICE9PSBcImZ1bmN0aW9uXCIpLm1hcCgoeCkgPT4gW3gsIHZhbHVlW3hdXSldKTtcblx0XHRcdFx0XHRcdHdyaXRlT2JqZWN0KHZhbHVlKTtcblx0XHRcdFx0XHR9IGVsc2UgaWYgKGNvbnN0cnVjdG9yID09PSBBcnJheSkge1xuXHRcdFx0XHRcdFx0bGVuZ3RoID0gdmFsdWUubGVuZ3RoO1xuXHRcdFx0XHRcdFx0aWYgKGxlbmd0aCA8IDI0KSB0YXJnZXRbcG9zaXRpb24rK10gPSAxMjggfCBsZW5ndGg7XG5cdFx0XHRcdFx0XHRlbHNlIHdyaXRlQXJyYXlIZWFkZXIobGVuZ3RoKTtcblx0XHRcdFx0XHRcdGZvciAobGV0IGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIGVuY29kZSh2YWx1ZVtpXSk7XG5cdFx0XHRcdFx0fSBlbHNlIGlmIChjb25zdHJ1Y3RvciA9PT0gTWFwKSB7XG5cdFx0XHRcdFx0XHRpZiAodGhpcy5tYXBzQXNPYmplY3RzID8gdGhpcy51c2VUYWcyNTlGb3JNYXBzICE9PSBmYWxzZSA6IHRoaXMudXNlVGFnMjU5Rm9yTWFwcykge1xuXHRcdFx0XHRcdFx0XHR0YXJnZXRbcG9zaXRpb24rK10gPSAyMTc7XG5cdFx0XHRcdFx0XHRcdHRhcmdldFtwb3NpdGlvbisrXSA9IDE7XG5cdFx0XHRcdFx0XHRcdHRhcmdldFtwb3NpdGlvbisrXSA9IDM7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRsZW5ndGggPSB2YWx1ZS5zaXplO1xuXHRcdFx0XHRcdFx0aWYgKGxlbmd0aCA8IDI0KSB0YXJnZXRbcG9zaXRpb24rK10gPSAxNjAgfCBsZW5ndGg7XG5cdFx0XHRcdFx0XHRlbHNlIGlmIChsZW5ndGggPCAyNTYpIHtcblx0XHRcdFx0XHRcdFx0dGFyZ2V0W3Bvc2l0aW9uKytdID0gMTg0O1xuXHRcdFx0XHRcdFx0XHR0YXJnZXRbcG9zaXRpb24rK10gPSBsZW5ndGg7XG5cdFx0XHRcdFx0XHR9IGVsc2UgaWYgKGxlbmd0aCA8IDY1NTM2KSB7XG5cdFx0XHRcdFx0XHRcdHRhcmdldFtwb3NpdGlvbisrXSA9IDE4NTtcblx0XHRcdFx0XHRcdFx0dGFyZ2V0W3Bvc2l0aW9uKytdID0gbGVuZ3RoID4+IDg7XG5cdFx0XHRcdFx0XHRcdHRhcmdldFtwb3NpdGlvbisrXSA9IGxlbmd0aCAmIDI1NTtcblx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdHRhcmdldFtwb3NpdGlvbisrXSA9IDE4Njtcblx0XHRcdFx0XHRcdFx0dGFyZ2V0Vmlldy5zZXRVaW50MzIocG9zaXRpb24sIGxlbmd0aCk7XG5cdFx0XHRcdFx0XHRcdHBvc2l0aW9uICs9IDQ7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRpZiAoZW5jb2Rlci5rZXlNYXApIGZvciAobGV0IFtrZXksIGVudHJ5VmFsdWVdIG9mIHZhbHVlKSB7XG5cdFx0XHRcdFx0XHRcdGVuY29kZShlbmNvZGVyLmVuY29kZUtleShrZXkpKTtcblx0XHRcdFx0XHRcdFx0ZW5jb2RlKGVudHJ5VmFsdWUpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0ZWxzZSBmb3IgKGxldCBba2V5LCBlbnRyeVZhbHVlXSBvZiB2YWx1ZSkge1xuXHRcdFx0XHRcdFx0XHRlbmNvZGUoa2V5KTtcblx0XHRcdFx0XHRcdFx0ZW5jb2RlKGVudHJ5VmFsdWUpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRmb3IgKGxldCBpID0gMCwgbCA9IGV4dGVuc2lvbnMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG5cdFx0XHRcdFx0XHRcdGxldCBleHRlbnNpb25DbGFzcyA9IGV4dGVuc2lvbkNsYXNzZXNbaV07XG5cdFx0XHRcdFx0XHRcdGlmICh2YWx1ZSBpbnN0YW5jZW9mIGV4dGVuc2lvbkNsYXNzKSB7XG5cdFx0XHRcdFx0XHRcdFx0bGV0IGV4dGVuc2lvbiA9IGV4dGVuc2lvbnNbaV07XG5cdFx0XHRcdFx0XHRcdFx0bGV0IHRhZyA9IGV4dGVuc2lvbi50YWc7XG5cdFx0XHRcdFx0XHRcdFx0aWYgKHRhZyA9PSB2b2lkIDApIHRhZyA9IGV4dGVuc2lvbi5nZXRUYWcgJiYgZXh0ZW5zaW9uLmdldFRhZy5jYWxsKHRoaXMsIHZhbHVlKTtcblx0XHRcdFx0XHRcdFx0XHRpZiAodGFnIDwgMjQpIHRhcmdldFtwb3NpdGlvbisrXSA9IDE5MiB8IHRhZztcblx0XHRcdFx0XHRcdFx0XHRlbHNlIGlmICh0YWcgPCAyNTYpIHtcblx0XHRcdFx0XHRcdFx0XHRcdHRhcmdldFtwb3NpdGlvbisrXSA9IDIxNjtcblx0XHRcdFx0XHRcdFx0XHRcdHRhcmdldFtwb3NpdGlvbisrXSA9IHRhZztcblx0XHRcdFx0XHRcdFx0XHR9IGVsc2UgaWYgKHRhZyA8IDY1NTM2KSB7XG5cdFx0XHRcdFx0XHRcdFx0XHR0YXJnZXRbcG9zaXRpb24rK10gPSAyMTc7XG5cdFx0XHRcdFx0XHRcdFx0XHR0YXJnZXRbcG9zaXRpb24rK10gPSB0YWcgPj4gODtcblx0XHRcdFx0XHRcdFx0XHRcdHRhcmdldFtwb3NpdGlvbisrXSA9IHRhZyAmIDI1NTtcblx0XHRcdFx0XHRcdFx0XHR9IGVsc2UgaWYgKHRhZyA+IC0xKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHR0YXJnZXRbcG9zaXRpb24rK10gPSAyMTg7XG5cdFx0XHRcdFx0XHRcdFx0XHR0YXJnZXRWaWV3LnNldFVpbnQzMihwb3NpdGlvbiwgdGFnKTtcblx0XHRcdFx0XHRcdFx0XHRcdHBvc2l0aW9uICs9IDQ7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdGV4dGVuc2lvbi5lbmNvZGUuY2FsbCh0aGlzLCB2YWx1ZSwgZW5jb2RlLCBtYWtlUm9vbSk7XG5cdFx0XHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRpZiAodmFsdWVbU3ltYm9sLml0ZXJhdG9yXSkge1xuXHRcdFx0XHRcdFx0XHRpZiAodGhyb3dPbkl0ZXJhYmxlKSB7XG5cdFx0XHRcdFx0XHRcdFx0bGV0IGVycm9yID0gLyogQF9fUFVSRV9fICovIG5ldyBFcnJvcihcIkl0ZXJhYmxlIHNob3VsZCBiZSBzZXJpYWxpemVkIGFzIGl0ZXJhdG9yXCIpO1xuXHRcdFx0XHRcdFx0XHRcdGVycm9yLml0ZXJhdG9yTm90SGFuZGxlZCA9IHRydWU7XG5cdFx0XHRcdFx0XHRcdFx0dGhyb3cgZXJyb3I7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0dGFyZ2V0W3Bvc2l0aW9uKytdID0gMTU5O1xuXHRcdFx0XHRcdFx0XHRmb3IgKGxldCBlbnRyeSBvZiB2YWx1ZSkgZW5jb2RlKGVudHJ5KTtcblx0XHRcdFx0XHRcdFx0dGFyZ2V0W3Bvc2l0aW9uKytdID0gMjU1O1xuXHRcdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRpZiAodmFsdWVbU3ltYm9sLmFzeW5jSXRlcmF0b3JdIHx8IGlzQmxvYih2YWx1ZSkpIHtcblx0XHRcdFx0XHRcdFx0bGV0IGVycm9yID0gLyogQF9fUFVSRV9fICovIG5ldyBFcnJvcihcIkl0ZXJhYmxlL2Jsb2Igc2hvdWxkIGJlIHNlcmlhbGl6ZWQgYXMgaXRlcmF0b3JcIik7XG5cdFx0XHRcdFx0XHRcdGVycm9yLml0ZXJhdG9yTm90SGFuZGxlZCA9IHRydWU7XG5cdFx0XHRcdFx0XHRcdHRocm93IGVycm9yO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0aWYgKHRoaXMudXNlVG9KU09OICYmIHZhbHVlLnRvSlNPTikge1xuXHRcdFx0XHRcdFx0XHRjb25zdCBqc29uID0gdmFsdWUudG9KU09OKCk7XG5cdFx0XHRcdFx0XHRcdGlmIChqc29uICE9PSB2YWx1ZSkgcmV0dXJuIGVuY29kZShqc29uKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHdyaXRlT2JqZWN0KHZhbHVlKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSBpZiAodHlwZSA9PT0gXCJib29sZWFuXCIpIHRhcmdldFtwb3NpdGlvbisrXSA9IHZhbHVlID8gMjQ1IDogMjQ0O1xuXHRcdFx0ZWxzZSBpZiAodHlwZSA9PT0gXCJiaWdpbnRcIikge1xuXHRcdFx0XHRpZiAodmFsdWUgPCBCaWdJbnQoMSkgPDwgQmlnSW50KDY0KSAmJiB2YWx1ZSA+PSAwKSB7XG5cdFx0XHRcdFx0dGFyZ2V0W3Bvc2l0aW9uKytdID0gMjc7XG5cdFx0XHRcdFx0dGFyZ2V0Vmlldy5zZXRCaWdVaW50NjQocG9zaXRpb24sIHZhbHVlKTtcblx0XHRcdFx0fSBlbHNlIGlmICh2YWx1ZSA+IC0oQmlnSW50KDEpIDw8IEJpZ0ludCg2NCkpICYmIHZhbHVlIDwgMCkge1xuXHRcdFx0XHRcdHRhcmdldFtwb3NpdGlvbisrXSA9IDU5O1xuXHRcdFx0XHRcdHRhcmdldFZpZXcuc2V0QmlnVWludDY0KHBvc2l0aW9uLCAtdmFsdWUgLSBCaWdJbnQoMSkpO1xuXHRcdFx0XHR9IGVsc2UgaWYgKHRoaXMubGFyZ2VCaWdJbnRUb0Zsb2F0KSB7XG5cdFx0XHRcdFx0dGFyZ2V0W3Bvc2l0aW9uKytdID0gMjUxO1xuXHRcdFx0XHRcdHRhcmdldFZpZXcuc2V0RmxvYXQ2NChwb3NpdGlvbiwgTnVtYmVyKHZhbHVlKSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0aWYgKHZhbHVlID49IEJpZ0ludCgwKSkgdGFyZ2V0W3Bvc2l0aW9uKytdID0gMTk0O1xuXHRcdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdFx0dGFyZ2V0W3Bvc2l0aW9uKytdID0gMTk1O1xuXHRcdFx0XHRcdFx0dmFsdWUgPSBCaWdJbnQoLTEpIC0gdmFsdWU7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGxldCBieXRlcyA9IFtdO1xuXHRcdFx0XHRcdHdoaWxlICh2YWx1ZSkge1xuXHRcdFx0XHRcdFx0Ynl0ZXMucHVzaChOdW1iZXIodmFsdWUgJiBCaWdJbnQoMjU1KSkpO1xuXHRcdFx0XHRcdFx0dmFsdWUgPj49IEJpZ0ludCg4KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0d3JpdGVCdWZmZXIobmV3IFVpbnQ4QXJyYXkoYnl0ZXMucmV2ZXJzZSgpKSwgbWFrZVJvb20pO1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXHRcdFx0XHRwb3NpdGlvbiArPSA4O1xuXHRcdFx0fSBlbHNlIGlmICh0eXBlID09PSBcInVuZGVmaW5lZFwiKSB0YXJnZXRbcG9zaXRpb24rK10gPSAyNDc7XG5cdFx0XHRlbHNlIHRocm93IG5ldyBFcnJvcihcIlVua25vd24gdHlwZTogXCIgKyB0eXBlKTtcblx0XHR9O1xuXHRcdGNvbnN0IHdyaXRlT2JqZWN0ID0gdGhpcy51c2VSZWNvcmRzID09PSBmYWxzZSA/IHRoaXMudmFyaWFibGVNYXBTaXplID8gKG9iamVjdCkgPT4ge1xuXHRcdFx0bGV0IGtleXMgPSBPYmplY3Qua2V5cyhvYmplY3QpO1xuXHRcdFx0bGV0IHZhbHMgPSBPYmplY3QudmFsdWVzKG9iamVjdCk7XG5cdFx0XHRsZXQgbGVuZ3RoID0ga2V5cy5sZW5ndGg7XG5cdFx0XHRpZiAobGVuZ3RoIDwgMjQpIHRhcmdldFtwb3NpdGlvbisrXSA9IDE2MCB8IGxlbmd0aDtcblx0XHRcdGVsc2UgaWYgKGxlbmd0aCA8IDI1Nikge1xuXHRcdFx0XHR0YXJnZXRbcG9zaXRpb24rK10gPSAxODQ7XG5cdFx0XHRcdHRhcmdldFtwb3NpdGlvbisrXSA9IGxlbmd0aDtcblx0XHRcdH0gZWxzZSBpZiAobGVuZ3RoIDwgNjU1MzYpIHtcblx0XHRcdFx0dGFyZ2V0W3Bvc2l0aW9uKytdID0gMTg1O1xuXHRcdFx0XHR0YXJnZXRbcG9zaXRpb24rK10gPSBsZW5ndGggPj4gODtcblx0XHRcdFx0dGFyZ2V0W3Bvc2l0aW9uKytdID0gbGVuZ3RoICYgMjU1O1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGFyZ2V0W3Bvc2l0aW9uKytdID0gMTg2O1xuXHRcdFx0XHR0YXJnZXRWaWV3LnNldFVpbnQzMihwb3NpdGlvbiwgbGVuZ3RoKTtcblx0XHRcdFx0cG9zaXRpb24gKz0gNDtcblx0XHRcdH1cblx0XHRcdGlmIChlbmNvZGVyLmtleU1hcCkgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuXHRcdFx0XHRlbmNvZGUoZW5jb2Rlci5lbmNvZGVLZXkoa2V5c1tpXSkpO1xuXHRcdFx0XHRlbmNvZGUodmFsc1tpXSk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0ZW5jb2RlKGtleXNbaV0pO1xuXHRcdFx0XHRlbmNvZGUodmFsc1tpXSk7XG5cdFx0XHR9XG5cdFx0fSA6IChvYmplY3QpID0+IHtcblx0XHRcdHRhcmdldFtwb3NpdGlvbisrXSA9IDE4NTtcblx0XHRcdGxldCBvYmplY3RPZmZzZXQgPSBwb3NpdGlvbiAtIHN0YXJ0O1xuXHRcdFx0cG9zaXRpb24gKz0gMjtcblx0XHRcdGxldCBzaXplID0gMDtcblx0XHRcdGlmIChlbmNvZGVyLmtleU1hcCkge1xuXHRcdFx0XHRmb3IgKGxldCBrZXkgaW4gb2JqZWN0KSBpZiAodHlwZW9mIG9iamVjdC5oYXNPd25Qcm9wZXJ0eSAhPT0gXCJmdW5jdGlvblwiIHx8IG9iamVjdC5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG5cdFx0XHRcdFx0ZW5jb2RlKGVuY29kZXIuZW5jb2RlS2V5KGtleSkpO1xuXHRcdFx0XHRcdGVuY29kZShvYmplY3Rba2V5XSk7XG5cdFx0XHRcdFx0c2l6ZSsrO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2UgZm9yIChsZXQga2V5IGluIG9iamVjdCkgaWYgKHR5cGVvZiBvYmplY3QuaGFzT3duUHJvcGVydHkgIT09IFwiZnVuY3Rpb25cIiB8fCBvYmplY3QuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuXHRcdFx0XHRlbmNvZGUoa2V5KTtcblx0XHRcdFx0ZW5jb2RlKG9iamVjdFtrZXldKTtcblx0XHRcdFx0c2l6ZSsrO1xuXHRcdFx0fVxuXHRcdFx0dGFyZ2V0W29iamVjdE9mZnNldCsrICsgc3RhcnRdID0gc2l6ZSA+PiA4O1xuXHRcdFx0dGFyZ2V0W29iamVjdE9mZnNldCArIHN0YXJ0XSA9IHNpemUgJiAyNTU7XG5cdFx0fSA6IChvYmplY3QsIHNraXBWYWx1ZXMpID0+IHtcblx0XHRcdGxldCBuZXh0VHJhbnNpdGlvbiwgdHJhbnNpdGlvbiA9IHN0cnVjdHVyZXMudHJhbnNpdGlvbnMgfHwgKHN0cnVjdHVyZXMudHJhbnNpdGlvbnMgPSBPYmplY3QuY3JlYXRlKG51bGwpKTtcblx0XHRcdGxldCBuZXdUcmFuc2l0aW9ucyA9IDA7XG5cdFx0XHRsZXQgbGVuZ3RoID0gMDtcblx0XHRcdGxldCBwYXJlbnRSZWNvcmRJZDtcblx0XHRcdGxldCBrZXlzO1xuXHRcdFx0aWYgKHRoaXMua2V5TWFwKSB7XG5cdFx0XHRcdGtleXMgPSBPYmplY3Qua2V5cyhvYmplY3QpLm1hcCgoaykgPT4gdGhpcy5lbmNvZGVLZXkoaykpO1xuXHRcdFx0XHRsZW5ndGggPSBrZXlzLmxlbmd0aDtcblx0XHRcdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuXHRcdFx0XHRcdGxldCBrZXkgPSBrZXlzW2ldO1xuXHRcdFx0XHRcdG5leHRUcmFuc2l0aW9uID0gdHJhbnNpdGlvbltrZXldO1xuXHRcdFx0XHRcdGlmICghbmV4dFRyYW5zaXRpb24pIHtcblx0XHRcdFx0XHRcdG5leHRUcmFuc2l0aW9uID0gdHJhbnNpdGlvbltrZXldID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcblx0XHRcdFx0XHRcdG5ld1RyYW5zaXRpb25zKys7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHRyYW5zaXRpb24gPSBuZXh0VHJhbnNpdGlvbjtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIGZvciAobGV0IGtleSBpbiBvYmplY3QpIGlmICh0eXBlb2Ygb2JqZWN0Lmhhc093blByb3BlcnR5ICE9PSBcImZ1bmN0aW9uXCIgfHwgb2JqZWN0Lmhhc093blByb3BlcnR5KGtleSkpIHtcblx0XHRcdFx0bmV4dFRyYW5zaXRpb24gPSB0cmFuc2l0aW9uW2tleV07XG5cdFx0XHRcdGlmICghbmV4dFRyYW5zaXRpb24pIHtcblx0XHRcdFx0XHRpZiAodHJhbnNpdGlvbltSRUNPUkRfU1lNQk9MXSAmIDEwNDg1NzYpIHBhcmVudFJlY29yZElkID0gdHJhbnNpdGlvbltSRUNPUkRfU1lNQk9MXSAmIDY1NTM1O1xuXHRcdFx0XHRcdG5leHRUcmFuc2l0aW9uID0gdHJhbnNpdGlvbltrZXldID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcblx0XHRcdFx0XHRuZXdUcmFuc2l0aW9ucysrO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHRyYW5zaXRpb24gPSBuZXh0VHJhbnNpdGlvbjtcblx0XHRcdFx0bGVuZ3RoKys7XG5cdFx0XHR9XG5cdFx0XHRsZXQgcmVjb3JkSWQgPSB0cmFuc2l0aW9uW1JFQ09SRF9TWU1CT0xdO1xuXHRcdFx0aWYgKHJlY29yZElkICE9PSB2b2lkIDApIHtcblx0XHRcdFx0cmVjb3JkSWQgJj0gNjU1MzU7XG5cdFx0XHRcdHRhcmdldFtwb3NpdGlvbisrXSA9IDIxNztcblx0XHRcdFx0dGFyZ2V0W3Bvc2l0aW9uKytdID0gcmVjb3JkSWQgPj4gOCB8IDIyNDtcblx0XHRcdFx0dGFyZ2V0W3Bvc2l0aW9uKytdID0gcmVjb3JkSWQgJiAyNTU7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRpZiAoIWtleXMpIGtleXMgPSB0cmFuc2l0aW9uLl9fa2V5c19fIHx8ICh0cmFuc2l0aW9uLl9fa2V5c19fID0gT2JqZWN0LmtleXMob2JqZWN0KSk7XG5cdFx0XHRcdGlmIChwYXJlbnRSZWNvcmRJZCA9PT0gdm9pZCAwKSB7XG5cdFx0XHRcdFx0cmVjb3JkSWQgPSBzdHJ1Y3R1cmVzLm5leHRJZCsrO1xuXHRcdFx0XHRcdGlmICghcmVjb3JkSWQpIHtcblx0XHRcdFx0XHRcdHJlY29yZElkID0gMDtcblx0XHRcdFx0XHRcdHN0cnVjdHVyZXMubmV4dElkID0gMTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKHJlY29yZElkID49IE1BWF9TVFJVQ1RVUkVTKSBzdHJ1Y3R1cmVzLm5leHRJZCA9IChyZWNvcmRJZCA9IG1heFNoYXJlZFN0cnVjdHVyZXMpICsgMTtcblx0XHRcdFx0fSBlbHNlIHJlY29yZElkID0gcGFyZW50UmVjb3JkSWQ7XG5cdFx0XHRcdHN0cnVjdHVyZXNbcmVjb3JkSWRdID0ga2V5cztcblx0XHRcdFx0aWYgKHJlY29yZElkIDwgbWF4U2hhcmVkU3RydWN0dXJlcykge1xuXHRcdFx0XHRcdHRhcmdldFtwb3NpdGlvbisrXSA9IDIxNztcblx0XHRcdFx0XHR0YXJnZXRbcG9zaXRpb24rK10gPSByZWNvcmRJZCA+PiA4IHwgMjI0O1xuXHRcdFx0XHRcdHRhcmdldFtwb3NpdGlvbisrXSA9IHJlY29yZElkICYgMjU1O1xuXHRcdFx0XHRcdHRyYW5zaXRpb24gPSBzdHJ1Y3R1cmVzLnRyYW5zaXRpb25zO1xuXHRcdFx0XHRcdGZvciAobGV0IGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0XHRcdGlmICh0cmFuc2l0aW9uW1JFQ09SRF9TWU1CT0xdID09PSB2b2lkIDAgfHwgdHJhbnNpdGlvbltSRUNPUkRfU1lNQk9MXSAmIDEwNDg1NzYpIHRyYW5zaXRpb25bUkVDT1JEX1NZTUJPTF0gPSByZWNvcmRJZDtcblx0XHRcdFx0XHRcdHRyYW5zaXRpb24gPSB0cmFuc2l0aW9uW2tleXNbaV1dO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHR0cmFuc2l0aW9uW1JFQ09SRF9TWU1CT0xdID0gcmVjb3JkSWQgfCAxMDQ4NTc2O1xuXHRcdFx0XHRcdGhhc1NoYXJlZFVwZGF0ZSA9IHRydWU7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0dHJhbnNpdGlvbltSRUNPUkRfU1lNQk9MXSA9IHJlY29yZElkO1xuXHRcdFx0XHRcdHRhcmdldFZpZXcuc2V0VWludDMyKHBvc2l0aW9uLCAzNjU1MzM1NjgwKTtcblx0XHRcdFx0XHRwb3NpdGlvbiArPSAzO1xuXHRcdFx0XHRcdGlmIChuZXdUcmFuc2l0aW9ucykgdHJhbnNpdGlvbnNDb3VudCArPSBzZXJpYWxpemF0aW9uc1NpbmNlVHJhbnNpdGlvblJlYnVpbGQgKiBuZXdUcmFuc2l0aW9ucztcblx0XHRcdFx0XHRpZiAocmVjb3JkSWRzVG9SZW1vdmUubGVuZ3RoID49IE1BWF9TVFJVQ1RVUkVTIC0gbWF4U2hhcmVkU3RydWN0dXJlcykgcmVjb3JkSWRzVG9SZW1vdmUuc2hpZnQoKVtSRUNPUkRfU1lNQk9MXSA9IHZvaWQgMDtcblx0XHRcdFx0XHRyZWNvcmRJZHNUb1JlbW92ZS5wdXNoKHRyYW5zaXRpb24pO1xuXHRcdFx0XHRcdHdyaXRlQXJyYXlIZWFkZXIobGVuZ3RoICsgMik7XG5cdFx0XHRcdFx0ZW5jb2RlKDU3MzQ0ICsgcmVjb3JkSWQpO1xuXHRcdFx0XHRcdGVuY29kZShrZXlzKTtcblx0XHRcdFx0XHRpZiAoc2tpcFZhbHVlcykgcmV0dXJuO1xuXHRcdFx0XHRcdGZvciAobGV0IGtleSBpbiBvYmplY3QpIGlmICh0eXBlb2Ygb2JqZWN0Lmhhc093blByb3BlcnR5ICE9PSBcImZ1bmN0aW9uXCIgfHwgb2JqZWN0Lmhhc093blByb3BlcnR5KGtleSkpIGVuY29kZShvYmplY3Rba2V5XSk7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRpZiAobGVuZ3RoIDwgMjQpIHRhcmdldFtwb3NpdGlvbisrXSA9IDEyOCB8IGxlbmd0aDtcblx0XHRcdGVsc2Ugd3JpdGVBcnJheUhlYWRlcihsZW5ndGgpO1xuXHRcdFx0aWYgKHNraXBWYWx1ZXMpIHJldHVybjtcblx0XHRcdGZvciAobGV0IGtleSBpbiBvYmplY3QpIGlmICh0eXBlb2Ygb2JqZWN0Lmhhc093blByb3BlcnR5ICE9PSBcImZ1bmN0aW9uXCIgfHwgb2JqZWN0Lmhhc093blByb3BlcnR5KGtleSkpIGVuY29kZShvYmplY3Rba2V5XSk7XG5cdFx0fTtcblx0XHRjb25zdCBtYWtlUm9vbSA9IChlbmQpID0+IHtcblx0XHRcdGxldCBuZXdTaXplO1xuXHRcdFx0aWYgKGVuZCA+IDE2Nzc3MjE2KSB7XG5cdFx0XHRcdGlmIChlbmQgLSBzdGFydCA+IE1BWF9CVUZGRVJfU0laRSkgdGhyb3cgbmV3IEVycm9yKFwiRW5jb2RlZCBidWZmZXIgd291bGQgYmUgbGFyZ2VyIHRoYW4gbWF4aW11bSBidWZmZXIgc2l6ZVwiKTtcblx0XHRcdFx0bmV3U2l6ZSA9IE1hdGgubWluKE1BWF9CVUZGRVJfU0laRSwgTWF0aC5yb3VuZChNYXRoLm1heCgoZW5kIC0gc3RhcnQpICogKGVuZCA+IDY3MTA4ODY0ID8gMS4yNSA6IDIpLCA0MTk0MzA0KSAvIDQwOTYpICogNDA5Nik7XG5cdFx0XHR9IGVsc2UgbmV3U2l6ZSA9IChNYXRoLm1heChlbmQgLSBzdGFydCA8PCAyLCB0YXJnZXQubGVuZ3RoIC0gMSkgPj4gMTIpICsgMSA8PCAxMjtcblx0XHRcdGxldCBuZXdCdWZmZXIgPSBuZXcgQnl0ZUFycmF5QWxsb2NhdGUobmV3U2l6ZSk7XG5cdFx0XHR0YXJnZXRWaWV3ID0gbmV3IERhdGFWaWV3KG5ld0J1ZmZlci5idWZmZXIsIDAsIG5ld1NpemUpO1xuXHRcdFx0aWYgKHRhcmdldC5jb3B5KSB0YXJnZXQuY29weShuZXdCdWZmZXIsIDAsIHN0YXJ0LCBlbmQpO1xuXHRcdFx0ZWxzZSBuZXdCdWZmZXIuc2V0KHRhcmdldC5zbGljZShzdGFydCwgZW5kKSk7XG5cdFx0XHRwb3NpdGlvbiAtPSBzdGFydDtcblx0XHRcdHN0YXJ0ID0gMDtcblx0XHRcdHNhZmVFbmQgPSBuZXdCdWZmZXIubGVuZ3RoIC0gMTA7XG5cdFx0XHRyZXR1cm4gdGFyZ2V0ID0gbmV3QnVmZmVyO1xuXHRcdH07XG5cdFx0bGV0IGNodW5rVGhyZXNob2xkID0gMTAwO1xuXHRcdGxldCBjb250aW51ZWRDaHVua1RocmVzaG9sZCA9IDFlMztcblx0XHR0aGlzLmVuY29kZUFzSXRlcmFibGUgPSBmdW5jdGlvbih2YWx1ZSwgb3B0aW9ucykge1xuXHRcdFx0cmV0dXJuIHN0YXJ0RW5jb2RpbmcodmFsdWUsIG9wdGlvbnMsIGVuY29kZU9iamVjdEFzSXRlcmFibGUpO1xuXHRcdH07XG5cdFx0dGhpcy5lbmNvZGVBc0FzeW5jSXRlcmFibGUgPSBmdW5jdGlvbih2YWx1ZSwgb3B0aW9ucykge1xuXHRcdFx0cmV0dXJuIHN0YXJ0RW5jb2RpbmcodmFsdWUsIG9wdGlvbnMsIGVuY29kZU9iamVjdEFzQXN5bmNJdGVyYWJsZSk7XG5cdFx0fTtcblx0XHRmdW5jdGlvbiogZW5jb2RlT2JqZWN0QXNJdGVyYWJsZShvYmplY3QsIGl0ZXJhdGVQcm9wZXJ0aWVzLCBmaW5hbEl0ZXJhYmxlKSB7XG5cdFx0XHRsZXQgY29uc3RydWN0b3IgPSBvYmplY3QuY29uc3RydWN0b3I7XG5cdFx0XHRpZiAoY29uc3RydWN0b3IgPT09IE9iamVjdCkge1xuXHRcdFx0XHRsZXQgdXNlUmVjb3JkcyA9IGVuY29kZXIudXNlUmVjb3JkcyAhPT0gZmFsc2U7XG5cdFx0XHRcdGlmICh1c2VSZWNvcmRzKSB3cml0ZU9iamVjdChvYmplY3QsIHRydWUpO1xuXHRcdFx0XHRlbHNlIHdyaXRlRW50aXR5TGVuZ3RoKE9iamVjdC5rZXlzKG9iamVjdCkubGVuZ3RoLCAxNjApO1xuXHRcdFx0XHRmb3IgKGxldCBrZXkgaW4gb2JqZWN0KSB7XG5cdFx0XHRcdFx0bGV0IHZhbHVlID0gb2JqZWN0W2tleV07XG5cdFx0XHRcdFx0aWYgKCF1c2VSZWNvcmRzKSBlbmNvZGUoa2V5KTtcblx0XHRcdFx0XHRpZiAodmFsdWUgJiYgdHlwZW9mIHZhbHVlID09PSBcIm9iamVjdFwiKSB7XG5cdFx0XHRcdFx0XHRpZiAoaXRlcmF0ZVByb3BlcnRpZXNba2V5XSkgeWllbGQqIGVuY29kZU9iamVjdEFzSXRlcmFibGUodmFsdWUsIGl0ZXJhdGVQcm9wZXJ0aWVzW2tleV0pO1xuXHRcdFx0XHRcdFx0ZWxzZSB5aWVsZCogdHJ5RW5jb2RlKHZhbHVlLCBpdGVyYXRlUHJvcGVydGllcywga2V5KTtcblx0XHRcdFx0XHR9IGVsc2UgZW5jb2RlKHZhbHVlKTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIGlmIChjb25zdHJ1Y3RvciA9PT0gQXJyYXkpIHtcblx0XHRcdFx0bGV0IGxlbmd0aCA9IG9iamVjdC5sZW5ndGg7XG5cdFx0XHRcdHdyaXRlQXJyYXlIZWFkZXIobGVuZ3RoKTtcblx0XHRcdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuXHRcdFx0XHRcdGxldCB2YWx1ZSA9IG9iamVjdFtpXTtcblx0XHRcdFx0XHRpZiAodmFsdWUgJiYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJvYmplY3RcIiB8fCBwb3NpdGlvbiAtIHN0YXJ0ID4gY2h1bmtUaHJlc2hvbGQpKSB7XG5cdFx0XHRcdFx0XHRpZiAoaXRlcmF0ZVByb3BlcnRpZXMuZWxlbWVudCkgeWllbGQqIGVuY29kZU9iamVjdEFzSXRlcmFibGUodmFsdWUsIGl0ZXJhdGVQcm9wZXJ0aWVzLmVsZW1lbnQpO1xuXHRcdFx0XHRcdFx0ZWxzZSB5aWVsZCogdHJ5RW5jb2RlKHZhbHVlLCBpdGVyYXRlUHJvcGVydGllcywgXCJlbGVtZW50XCIpO1xuXHRcdFx0XHRcdH0gZWxzZSBlbmNvZGUodmFsdWUpO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2UgaWYgKG9iamVjdFtTeW1ib2wuaXRlcmF0b3JdICYmICFvYmplY3QuYnVmZmVyKSB7XG5cdFx0XHRcdHRhcmdldFtwb3NpdGlvbisrXSA9IDE1OTtcblx0XHRcdFx0Zm9yIChsZXQgdmFsdWUgb2Ygb2JqZWN0KSBpZiAodmFsdWUgJiYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJvYmplY3RcIiB8fCBwb3NpdGlvbiAtIHN0YXJ0ID4gY2h1bmtUaHJlc2hvbGQpKSB7XG5cdFx0XHRcdFx0aWYgKGl0ZXJhdGVQcm9wZXJ0aWVzLmVsZW1lbnQpIHlpZWxkKiBlbmNvZGVPYmplY3RBc0l0ZXJhYmxlKHZhbHVlLCBpdGVyYXRlUHJvcGVydGllcy5lbGVtZW50KTtcblx0XHRcdFx0XHRlbHNlIHlpZWxkKiB0cnlFbmNvZGUodmFsdWUsIGl0ZXJhdGVQcm9wZXJ0aWVzLCBcImVsZW1lbnRcIik7XG5cdFx0XHRcdH0gZWxzZSBlbmNvZGUodmFsdWUpO1xuXHRcdFx0XHR0YXJnZXRbcG9zaXRpb24rK10gPSAyNTU7XG5cdFx0XHR9IGVsc2UgaWYgKGlzQmxvYihvYmplY3QpKSB7XG5cdFx0XHRcdHdyaXRlRW50aXR5TGVuZ3RoKG9iamVjdC5zaXplLCA2NCk7XG5cdFx0XHRcdHlpZWxkIHRhcmdldC5zdWJhcnJheShzdGFydCwgcG9zaXRpb24pO1xuXHRcdFx0XHR5aWVsZCBvYmplY3Q7XG5cdFx0XHRcdHJlc3RhcnRFbmNvZGluZygpO1xuXHRcdFx0fSBlbHNlIGlmIChvYmplY3RbU3ltYm9sLmFzeW5jSXRlcmF0b3JdKSB7XG5cdFx0XHRcdHRhcmdldFtwb3NpdGlvbisrXSA9IDE1OTtcblx0XHRcdFx0eWllbGQgdGFyZ2V0LnN1YmFycmF5KHN0YXJ0LCBwb3NpdGlvbik7XG5cdFx0XHRcdHlpZWxkIG9iamVjdDtcblx0XHRcdFx0cmVzdGFydEVuY29kaW5nKCk7XG5cdFx0XHRcdHRhcmdldFtwb3NpdGlvbisrXSA9IDI1NTtcblx0XHRcdH0gZWxzZSBlbmNvZGUob2JqZWN0KTtcblx0XHRcdGlmIChmaW5hbEl0ZXJhYmxlICYmIHBvc2l0aW9uID4gc3RhcnQpIHlpZWxkIHRhcmdldC5zdWJhcnJheShzdGFydCwgcG9zaXRpb24pO1xuXHRcdFx0ZWxzZSBpZiAocG9zaXRpb24gLSBzdGFydCA+IGNodW5rVGhyZXNob2xkKSB7XG5cdFx0XHRcdHlpZWxkIHRhcmdldC5zdWJhcnJheShzdGFydCwgcG9zaXRpb24pO1xuXHRcdFx0XHRyZXN0YXJ0RW5jb2RpbmcoKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0ZnVuY3Rpb24qIHRyeUVuY29kZSh2YWx1ZSwgaXRlcmF0ZVByb3BlcnRpZXMsIGtleSkge1xuXHRcdFx0bGV0IHJlc3RhcnQgPSBwb3NpdGlvbiAtIHN0YXJ0O1xuXHRcdFx0dHJ5IHtcblx0XHRcdFx0ZW5jb2RlKHZhbHVlKTtcblx0XHRcdFx0aWYgKHBvc2l0aW9uIC0gc3RhcnQgPiBjaHVua1RocmVzaG9sZCkge1xuXHRcdFx0XHRcdHlpZWxkIHRhcmdldC5zdWJhcnJheShzdGFydCwgcG9zaXRpb24pO1xuXHRcdFx0XHRcdHJlc3RhcnRFbmNvZGluZygpO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGNhdGNoIChlcnJvcikge1xuXHRcdFx0XHRpZiAoZXJyb3IuaXRlcmF0b3JOb3RIYW5kbGVkKSB7XG5cdFx0XHRcdFx0aXRlcmF0ZVByb3BlcnRpZXNba2V5XSA9IHt9O1xuXHRcdFx0XHRcdHBvc2l0aW9uID0gc3RhcnQgKyByZXN0YXJ0O1xuXHRcdFx0XHRcdHlpZWxkKiBlbmNvZGVPYmplY3RBc0l0ZXJhYmxlLmNhbGwodGhpcywgdmFsdWUsIGl0ZXJhdGVQcm9wZXJ0aWVzW2tleV0pO1xuXHRcdFx0XHR9IGVsc2UgdGhyb3cgZXJyb3I7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGZ1bmN0aW9uIHJlc3RhcnRFbmNvZGluZygpIHtcblx0XHRcdGNodW5rVGhyZXNob2xkID0gY29udGludWVkQ2h1bmtUaHJlc2hvbGQ7XG5cdFx0XHRlbmNvZGVyLmVuY29kZShudWxsLCBUSFJPV19PTl9JVEVSQUJMRSk7XG5cdFx0fVxuXHRcdGZ1bmN0aW9uIHN0YXJ0RW5jb2RpbmcodmFsdWUsIG9wdGlvbnMsIGVuY29kZUl0ZXJhYmxlKSB7XG5cdFx0XHRpZiAob3B0aW9ucyAmJiBvcHRpb25zLmNodW5rVGhyZXNob2xkKSBjaHVua1RocmVzaG9sZCA9IGNvbnRpbnVlZENodW5rVGhyZXNob2xkID0gb3B0aW9ucy5jaHVua1RocmVzaG9sZDtcblx0XHRcdGVsc2UgY2h1bmtUaHJlc2hvbGQgPSAxMDA7XG5cdFx0XHRpZiAodmFsdWUgJiYgdHlwZW9mIHZhbHVlID09PSBcIm9iamVjdFwiKSB7XG5cdFx0XHRcdGVuY29kZXIuZW5jb2RlKG51bGwsIFRIUk9XX09OX0lURVJBQkxFKTtcblx0XHRcdFx0cmV0dXJuIGVuY29kZUl0ZXJhYmxlKHZhbHVlLCBlbmNvZGVyLml0ZXJhdGVQcm9wZXJ0aWVzIHx8IChlbmNvZGVyLml0ZXJhdGVQcm9wZXJ0aWVzID0ge30pLCB0cnVlKTtcblx0XHRcdH1cblx0XHRcdHJldHVybiBbZW5jb2Rlci5lbmNvZGUodmFsdWUpXTtcblx0XHR9XG5cdFx0YXN5bmMgZnVuY3Rpb24qIGVuY29kZU9iamVjdEFzQXN5bmNJdGVyYWJsZSh2YWx1ZSwgaXRlcmF0ZVByb3BlcnRpZXMpIHtcblx0XHRcdGZvciAobGV0IGVuY29kZWRWYWx1ZSBvZiBlbmNvZGVPYmplY3RBc0l0ZXJhYmxlKHZhbHVlLCBpdGVyYXRlUHJvcGVydGllcywgdHJ1ZSkpIHtcblx0XHRcdFx0bGV0IGNvbnN0cnVjdG9yID0gZW5jb2RlZFZhbHVlLmNvbnN0cnVjdG9yO1xuXHRcdFx0XHRpZiAoY29uc3RydWN0b3IgPT09IEJ5dGVBcnJheSB8fCBjb25zdHJ1Y3RvciA9PT0gVWludDhBcnJheSkgeWllbGQgZW5jb2RlZFZhbHVlO1xuXHRcdFx0XHRlbHNlIGlmIChpc0Jsb2IoZW5jb2RlZFZhbHVlKSkge1xuXHRcdFx0XHRcdGxldCByZWFkZXIgPSBlbmNvZGVkVmFsdWUuc3RyZWFtKCkuZ2V0UmVhZGVyKCk7XG5cdFx0XHRcdFx0bGV0IG5leHQ7XG5cdFx0XHRcdFx0d2hpbGUgKCEobmV4dCA9IGF3YWl0IHJlYWRlci5yZWFkKCkpLmRvbmUpIHlpZWxkIG5leHQudmFsdWU7XG5cdFx0XHRcdH0gZWxzZSBpZiAoZW5jb2RlZFZhbHVlW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSkgZm9yIGF3YWl0IChsZXQgYXN5bmNWYWx1ZSBvZiBlbmNvZGVkVmFsdWUpIHtcblx0XHRcdFx0XHRyZXN0YXJ0RW5jb2RpbmcoKTtcblx0XHRcdFx0XHRpZiAoYXN5bmNWYWx1ZSkgeWllbGQqIGVuY29kZU9iamVjdEFzQXN5bmNJdGVyYWJsZShhc3luY1ZhbHVlLCBpdGVyYXRlUHJvcGVydGllcy5hc3luYyB8fCAoaXRlcmF0ZVByb3BlcnRpZXMuYXN5bmMgPSB7fSkpO1xuXHRcdFx0XHRcdGVsc2UgeWllbGQgZW5jb2Rlci5lbmNvZGUoYXN5bmNWYWx1ZSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB5aWVsZCBlbmNvZGVkVmFsdWU7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cdHVzZUJ1ZmZlcihidWZmZXIpIHtcblx0XHR0YXJnZXQgPSBidWZmZXI7XG5cdFx0dGFyZ2V0VmlldyA9IG5ldyBEYXRhVmlldyh0YXJnZXQuYnVmZmVyLCB0YXJnZXQuYnl0ZU9mZnNldCwgdGFyZ2V0LmJ5dGVMZW5ndGgpO1xuXHRcdHBvc2l0aW9uID0gMDtcblx0fVxuXHRjbGVhclNoYXJlZERhdGEoKSB7XG5cdFx0aWYgKHRoaXMuc3RydWN0dXJlcykgdGhpcy5zdHJ1Y3R1cmVzID0gW107XG5cdFx0aWYgKHRoaXMuc2hhcmVkVmFsdWVzKSB0aGlzLnNoYXJlZFZhbHVlcyA9IHZvaWQgMDtcblx0fVxuXHR1cGRhdGVTaGFyZWREYXRhKCkge1xuXHRcdGxldCBsYXN0VmVyc2lvbiA9IHRoaXMuc2hhcmVkVmVyc2lvbiB8fCAwO1xuXHRcdHRoaXMuc2hhcmVkVmVyc2lvbiA9IGxhc3RWZXJzaW9uICsgMTtcblx0XHRsZXQgc3RydWN0dXJlc0NvcHkgPSB0aGlzLnN0cnVjdHVyZXMuc2xpY2UoMCk7XG5cdFx0bGV0IHNoYXJlZERhdGEgPSBuZXcgU2hhcmVkRGF0YShzdHJ1Y3R1cmVzQ29weSwgdGhpcy5zaGFyZWRWYWx1ZXMsIHRoaXMuc2hhcmVkVmVyc2lvbik7XG5cdFx0bGV0IHNhdmVSZXN1bHRzID0gdGhpcy5zYXZlU2hhcmVkKHNoYXJlZERhdGEsIChleGlzdGluZ1NoYXJlZCkgPT4gKGV4aXN0aW5nU2hhcmVkICYmIGV4aXN0aW5nU2hhcmVkLnZlcnNpb24gfHwgMCkgPT0gbGFzdFZlcnNpb24pO1xuXHRcdGlmIChzYXZlUmVzdWx0cyA9PT0gZmFsc2UpIHtcblx0XHRcdHNoYXJlZERhdGEgPSB0aGlzLmdldFNoYXJlZCgpIHx8IHt9O1xuXHRcdFx0dGhpcy5zdHJ1Y3R1cmVzID0gc2hhcmVkRGF0YS5zdHJ1Y3R1cmVzIHx8IFtdO1xuXHRcdFx0dGhpcy5zaGFyZWRWYWx1ZXMgPSBzaGFyZWREYXRhLnBhY2tlZFZhbHVlcztcblx0XHRcdHRoaXMuc2hhcmVkVmVyc2lvbiA9IHNoYXJlZERhdGEudmVyc2lvbjtcblx0XHRcdHRoaXMuc3RydWN0dXJlcy5uZXh0SWQgPSB0aGlzLnN0cnVjdHVyZXMubGVuZ3RoO1xuXHRcdH0gZWxzZSBzdHJ1Y3R1cmVzQ29weS5mb3JFYWNoKChzdHJ1Y3R1cmUsIGkpID0+IHRoaXMuc3RydWN0dXJlc1tpXSA9IHN0cnVjdHVyZSk7XG5cdFx0cmV0dXJuIHNhdmVSZXN1bHRzO1xuXHR9XG59O1xuZnVuY3Rpb24gd3JpdGVFbnRpdHlMZW5ndGgobGVuZ3RoLCBtYWpvclZhbHVlKSB7XG5cdGlmIChsZW5ndGggPCAyNCkgdGFyZ2V0W3Bvc2l0aW9uKytdID0gbWFqb3JWYWx1ZSB8IGxlbmd0aDtcblx0ZWxzZSBpZiAobGVuZ3RoIDwgMjU2KSB7XG5cdFx0dGFyZ2V0W3Bvc2l0aW9uKytdID0gbWFqb3JWYWx1ZSB8IDI0O1xuXHRcdHRhcmdldFtwb3NpdGlvbisrXSA9IGxlbmd0aDtcblx0fSBlbHNlIGlmIChsZW5ndGggPCA2NTUzNikge1xuXHRcdHRhcmdldFtwb3NpdGlvbisrXSA9IG1ham9yVmFsdWUgfCAyNTtcblx0XHR0YXJnZXRbcG9zaXRpb24rK10gPSBsZW5ndGggPj4gODtcblx0XHR0YXJnZXRbcG9zaXRpb24rK10gPSBsZW5ndGggJiAyNTU7XG5cdH0gZWxzZSB7XG5cdFx0dGFyZ2V0W3Bvc2l0aW9uKytdID0gbWFqb3JWYWx1ZSB8IDI2O1xuXHRcdHRhcmdldFZpZXcuc2V0VWludDMyKHBvc2l0aW9uLCBsZW5ndGgpO1xuXHRcdHBvc2l0aW9uICs9IDQ7XG5cdH1cbn1cbnZhciBTaGFyZWREYXRhID0gY2xhc3Mge1xuXHRjb25zdHJ1Y3RvcihzdHJ1Y3R1cmVzLCB2YWx1ZXMsIHZlcnNpb24pIHtcblx0XHR0aGlzLnN0cnVjdHVyZXMgPSBzdHJ1Y3R1cmVzO1xuXHRcdHRoaXMucGFja2VkVmFsdWVzID0gdmFsdWVzO1xuXHRcdHRoaXMudmVyc2lvbiA9IHZlcnNpb247XG5cdH1cbn07XG5mdW5jdGlvbiB3cml0ZUFycmF5SGVhZGVyKGxlbmd0aCkge1xuXHRpZiAobGVuZ3RoIDwgMjQpIHRhcmdldFtwb3NpdGlvbisrXSA9IDEyOCB8IGxlbmd0aDtcblx0ZWxzZSBpZiAobGVuZ3RoIDwgMjU2KSB7XG5cdFx0dGFyZ2V0W3Bvc2l0aW9uKytdID0gMTUyO1xuXHRcdHRhcmdldFtwb3NpdGlvbisrXSA9IGxlbmd0aDtcblx0fSBlbHNlIGlmIChsZW5ndGggPCA2NTUzNikge1xuXHRcdHRhcmdldFtwb3NpdGlvbisrXSA9IDE1Mztcblx0XHR0YXJnZXRbcG9zaXRpb24rK10gPSBsZW5ndGggPj4gODtcblx0XHR0YXJnZXRbcG9zaXRpb24rK10gPSBsZW5ndGggJiAyNTU7XG5cdH0gZWxzZSB7XG5cdFx0dGFyZ2V0W3Bvc2l0aW9uKytdID0gMTU0O1xuXHRcdHRhcmdldFZpZXcuc2V0VWludDMyKHBvc2l0aW9uLCBsZW5ndGgpO1xuXHRcdHBvc2l0aW9uICs9IDQ7XG5cdH1cbn1cbnZhciBCbG9iQ29uc3RydWN0b3IgPSB0eXBlb2YgQmxvYiA9PT0gXCJ1bmRlZmluZWRcIiA/IGZ1bmN0aW9uKCkge30gOiBCbG9iO1xuZnVuY3Rpb24gaXNCbG9iKG9iamVjdCkge1xuXHRpZiAob2JqZWN0IGluc3RhbmNlb2YgQmxvYkNvbnN0cnVjdG9yKSByZXR1cm4gdHJ1ZTtcblx0bGV0IHRhZyA9IG9iamVjdFtTeW1ib2wudG9TdHJpbmdUYWddO1xuXHRyZXR1cm4gdGFnID09PSBcIkJsb2JcIiB8fCB0YWcgPT09IFwiRmlsZVwiO1xufVxuZnVuY3Rpb24gZmluZFJlcGV0aXRpdmVTdHJpbmdzKHZhbHVlLCBwYWNrZWRWYWx1ZXMpIHtcblx0c3dpdGNoICh0eXBlb2YgdmFsdWUpIHtcblx0XHRjYXNlIFwic3RyaW5nXCI6XG5cdFx0XHRpZiAodmFsdWUubGVuZ3RoID4gMykge1xuXHRcdFx0XHRpZiAocGFja2VkVmFsdWVzLm9iamVjdE1hcFt2YWx1ZV0gPiAtMSB8fCBwYWNrZWRWYWx1ZXMudmFsdWVzLmxlbmd0aCA+PSBwYWNrZWRWYWx1ZXMubWF4VmFsdWVzKSByZXR1cm47XG5cdFx0XHRcdGxldCBwYWNrZWRTdGF0dXMgPSBwYWNrZWRWYWx1ZXMuZ2V0KHZhbHVlKTtcblx0XHRcdFx0aWYgKHBhY2tlZFN0YXR1cykge1xuXHRcdFx0XHRcdGlmICgrK3BhY2tlZFN0YXR1cy5jb3VudCA9PSAyKSBwYWNrZWRWYWx1ZXMudmFsdWVzLnB1c2godmFsdWUpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHBhY2tlZFZhbHVlcy5zZXQodmFsdWUsIHsgY291bnQ6IDEgfSk7XG5cdFx0XHRcdFx0aWYgKHBhY2tlZFZhbHVlcy5zYW1wbGluZ1BhY2tlZFZhbHVlcykge1xuXHRcdFx0XHRcdFx0bGV0IHN0YXR1cyA9IHBhY2tlZFZhbHVlcy5zYW1wbGluZ1BhY2tlZFZhbHVlcy5nZXQodmFsdWUpO1xuXHRcdFx0XHRcdFx0aWYgKHN0YXR1cykgc3RhdHVzLmNvdW50Kys7XG5cdFx0XHRcdFx0XHRlbHNlIHBhY2tlZFZhbHVlcy5zYW1wbGluZ1BhY2tlZFZhbHVlcy5zZXQodmFsdWUsIHsgY291bnQ6IDEgfSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRicmVhaztcblx0XHRjYXNlIFwib2JqZWN0XCI6XG5cdFx0XHRpZiAodmFsdWUpIHtcblx0XHRcdFx0aWYgKHZhbHVlIGluc3RhbmNlb2YgQXJyYXkpIGZvciAobGV0IGkgPSAwLCBsID0gdmFsdWUubGVuZ3RoOyBpIDwgbDsgaSsrKSBmaW5kUmVwZXRpdGl2ZVN0cmluZ3ModmFsdWVbaV0sIHBhY2tlZFZhbHVlcyk7XG5cdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdGxldCBpbmNsdWRlS2V5cyA9ICFwYWNrZWRWYWx1ZXMuZW5jb2Rlci51c2VSZWNvcmRzO1xuXHRcdFx0XHRcdGZvciAodmFyIGtleSBpbiB2YWx1ZSkgaWYgKHZhbHVlLmhhc093blByb3BlcnR5KGtleSkpIHtcblx0XHRcdFx0XHRcdGlmIChpbmNsdWRlS2V5cykgZmluZFJlcGV0aXRpdmVTdHJpbmdzKGtleSwgcGFja2VkVmFsdWVzKTtcblx0XHRcdFx0XHRcdGZpbmRSZXBldGl0aXZlU3RyaW5ncyh2YWx1ZVtrZXldLCBwYWNrZWRWYWx1ZXMpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0YnJlYWs7XG5cdFx0Y2FzZSBcImZ1bmN0aW9uXCI6IGNvbnNvbGUubG9nKHZhbHVlKTtcblx0fVxufVxudmFyIGlzTGl0dGxlRW5kaWFuTWFjaGluZSA9IG5ldyBVaW50OEFycmF5KG5ldyBVaW50MTZBcnJheShbMV0pLmJ1ZmZlcilbMF0gPT0gMTtcbmV4dGVuc2lvbkNsYXNzZXMgPSBbXG5cdERhdGUsXG5cdFNldCxcblx0RXJyb3IsXG5cdFJlZ0V4cCxcblx0VGFnLFxuXHRBcnJheUJ1ZmZlcixcblx0VWludDhBcnJheSxcblx0VWludDhDbGFtcGVkQXJyYXksXG5cdFVpbnQxNkFycmF5LFxuXHRVaW50MzJBcnJheSxcblx0dHlwZW9mIEJpZ1VpbnQ2NEFycmF5ID09IFwidW5kZWZpbmVkXCIgPyBmdW5jdGlvbigpIHt9IDogQmlnVWludDY0QXJyYXksXG5cdEludDhBcnJheSxcblx0SW50MTZBcnJheSxcblx0SW50MzJBcnJheSxcblx0dHlwZW9mIEJpZ0ludDY0QXJyYXkgPT0gXCJ1bmRlZmluZWRcIiA/IGZ1bmN0aW9uKCkge30gOiBCaWdJbnQ2NEFycmF5LFxuXHRGbG9hdDMyQXJyYXksXG5cdEZsb2F0NjRBcnJheSxcblx0U2hhcmVkRGF0YVxuXTtcbmV4dGVuc2lvbnMgPSBbXG5cdHtcblx0XHR0YWc6IDEsXG5cdFx0ZW5jb2RlKGRhdGUsIGVuY29kZSkge1xuXHRcdFx0bGV0IHNlY29uZHMgPSBkYXRlLmdldFRpbWUoKSAvIDFlMztcblx0XHRcdGlmICgodGhpcy51c2VUaW1lc3RhbXAzMiB8fCBkYXRlLmdldE1pbGxpc2Vjb25kcygpID09PSAwKSAmJiBzZWNvbmRzID49IDAgJiYgc2Vjb25kcyA8IDQyOTQ5NjcyOTYpIHtcblx0XHRcdFx0dGFyZ2V0W3Bvc2l0aW9uKytdID0gMjY7XG5cdFx0XHRcdHRhcmdldFZpZXcuc2V0VWludDMyKHBvc2l0aW9uLCBzZWNvbmRzKTtcblx0XHRcdFx0cG9zaXRpb24gKz0gNDtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHRhcmdldFtwb3NpdGlvbisrXSA9IDI1MTtcblx0XHRcdFx0dGFyZ2V0Vmlldy5zZXRGbG9hdDY0KHBvc2l0aW9uLCBzZWNvbmRzKTtcblx0XHRcdFx0cG9zaXRpb24gKz0gODtcblx0XHRcdH1cblx0XHR9XG5cdH0sXG5cdHtcblx0XHR0YWc6IDI1OCxcblx0XHRlbmNvZGUoc2V0LCBlbmNvZGUpIHtcblx0XHRcdGVuY29kZShBcnJheS5mcm9tKHNldCkpO1xuXHRcdH1cblx0fSxcblx0e1xuXHRcdHRhZzogMjcsXG5cdFx0ZW5jb2RlKGVycm9yLCBlbmNvZGUpIHtcblx0XHRcdGVuY29kZShbZXJyb3IubmFtZSwgZXJyb3IubWVzc2FnZV0pO1xuXHRcdH1cblx0fSxcblx0e1xuXHRcdHRhZzogMjcsXG5cdFx0ZW5jb2RlKHJlZ2V4LCBlbmNvZGUpIHtcblx0XHRcdGVuY29kZShbXG5cdFx0XHRcdFwiUmVnRXhwXCIsXG5cdFx0XHRcdHJlZ2V4LnNvdXJjZSxcblx0XHRcdFx0cmVnZXguZmxhZ3Ncblx0XHRcdF0pO1xuXHRcdH1cblx0fSxcblx0e1xuXHRcdGdldFRhZyh0YWcpIHtcblx0XHRcdHJldHVybiB0YWcudGFnO1xuXHRcdH0sXG5cdFx0ZW5jb2RlKHRhZywgZW5jb2RlKSB7XG5cdFx0XHRlbmNvZGUodGFnLnZhbHVlKTtcblx0XHR9XG5cdH0sXG5cdHsgZW5jb2RlKGFycmF5QnVmZmVyLCBlbmNvZGUsIG1ha2VSb29tKSB7XG5cdFx0d3JpdGVCdWZmZXIoYXJyYXlCdWZmZXIsIG1ha2VSb29tKTtcblx0fSB9LFxuXHR7XG5cdFx0Z2V0VGFnKHR5cGVkQXJyYXkpIHtcblx0XHRcdGlmICh0eXBlZEFycmF5LmNvbnN0cnVjdG9yID09PSBVaW50OEFycmF5KSB7XG5cdFx0XHRcdGlmICh0aGlzLnRhZ1VpbnQ4QXJyYXkgfHwgaGFzTm9kZUJ1ZmZlciAmJiB0aGlzLnRhZ1VpbnQ4QXJyYXkgIT09IGZhbHNlKSByZXR1cm4gNjQ7XG5cdFx0XHR9XG5cdFx0fSxcblx0XHRlbmNvZGUodHlwZWRBcnJheSwgZW5jb2RlLCBtYWtlUm9vbSkge1xuXHRcdFx0d3JpdGVCdWZmZXIodHlwZWRBcnJheSwgbWFrZVJvb20pO1xuXHRcdH1cblx0fSxcblx0dHlwZWRBcnJheUVuY29kZXIoNjgsIDEpLFxuXHR0eXBlZEFycmF5RW5jb2Rlcig2OSwgMiksXG5cdHR5cGVkQXJyYXlFbmNvZGVyKDcwLCA0KSxcblx0dHlwZWRBcnJheUVuY29kZXIoNzEsIDgpLFxuXHR0eXBlZEFycmF5RW5jb2Rlcig3MiwgMSksXG5cdHR5cGVkQXJyYXlFbmNvZGVyKDc3LCAyKSxcblx0dHlwZWRBcnJheUVuY29kZXIoNzgsIDQpLFxuXHR0eXBlZEFycmF5RW5jb2Rlcig3OSwgOCksXG5cdHR5cGVkQXJyYXlFbmNvZGVyKDg1LCA0KSxcblx0dHlwZWRBcnJheUVuY29kZXIoODYsIDgpLFxuXHR7IGVuY29kZShzaGFyZWREYXRhLCBlbmNvZGUpIHtcblx0XHRsZXQgcGFja2VkVmFsdWVzID0gc2hhcmVkRGF0YS5wYWNrZWRWYWx1ZXMgfHwgW107XG5cdFx0bGV0IHNoYXJlZFN0cnVjdHVyZXMgPSBzaGFyZWREYXRhLnN0cnVjdHVyZXMgfHwgW107XG5cdFx0aWYgKHBhY2tlZFZhbHVlcy52YWx1ZXMubGVuZ3RoID4gMCkge1xuXHRcdFx0dGFyZ2V0W3Bvc2l0aW9uKytdID0gMjE2O1xuXHRcdFx0dGFyZ2V0W3Bvc2l0aW9uKytdID0gNTE7XG5cdFx0XHR3cml0ZUFycmF5SGVhZGVyKDQpO1xuXHRcdFx0bGV0IHZhbHVlc0FycmF5ID0gcGFja2VkVmFsdWVzLnZhbHVlcztcblx0XHRcdGVuY29kZSh2YWx1ZXNBcnJheSk7XG5cdFx0XHR3cml0ZUFycmF5SGVhZGVyKDApO1xuXHRcdFx0d3JpdGVBcnJheUhlYWRlcigwKTtcblx0XHRcdHBhY2tlZE9iamVjdE1hcCA9IE9iamVjdC5jcmVhdGUoc2hhcmVkUGFja2VkT2JqZWN0TWFwIHx8IG51bGwpO1xuXHRcdFx0Zm9yIChsZXQgaSA9IDAsIGwgPSB2YWx1ZXNBcnJheS5sZW5ndGg7IGkgPCBsOyBpKyspIHBhY2tlZE9iamVjdE1hcFt2YWx1ZXNBcnJheVtpXV0gPSBpO1xuXHRcdH1cblx0XHRpZiAoc2hhcmVkU3RydWN0dXJlcykge1xuXHRcdFx0dGFyZ2V0Vmlldy5zZXRVaW50MzIocG9zaXRpb24sIDM2NTUzMzU0MjQpO1xuXHRcdFx0cG9zaXRpb24gKz0gMztcblx0XHRcdGxldCBkZWZpbml0aW9ucyA9IHNoYXJlZFN0cnVjdHVyZXMuc2xpY2UoMCk7XG5cdFx0XHRkZWZpbml0aW9ucy51bnNoaWZ0KDU3MzQ0KTtcblx0XHRcdGRlZmluaXRpb25zLnB1c2gobmV3IFRhZyhzaGFyZWREYXRhLnZlcnNpb24sIDEzOTkzNTM5NTYpKTtcblx0XHRcdGVuY29kZShkZWZpbml0aW9ucyk7XG5cdFx0fSBlbHNlIGVuY29kZShuZXcgVGFnKHNoYXJlZERhdGEudmVyc2lvbiwgMTM5OTM1Mzk1NikpO1xuXHR9IH1cbl07XG5mdW5jdGlvbiB0eXBlZEFycmF5RW5jb2Rlcih0YWcsIHNpemUpIHtcblx0aWYgKCFpc0xpdHRsZUVuZGlhbk1hY2hpbmUgJiYgc2l6ZSA+IDEpIHRhZyAtPSA0O1xuXHRyZXR1cm4ge1xuXHRcdHRhZyxcblx0XHRlbmNvZGU6IGZ1bmN0aW9uIHdyaXRlRXh0QnVmZmVyKHR5cGVkQXJyYXksIGVuY29kZSkge1xuXHRcdFx0bGV0IGxlbmd0aCA9IHR5cGVkQXJyYXkuYnl0ZUxlbmd0aDtcblx0XHRcdGxldCBvZmZzZXQgPSB0eXBlZEFycmF5LmJ5dGVPZmZzZXQgfHwgMDtcblx0XHRcdGxldCBidWZmZXIgPSB0eXBlZEFycmF5LmJ1ZmZlciB8fCB0eXBlZEFycmF5O1xuXHRcdFx0ZW5jb2RlKGhhc05vZGVCdWZmZXIgPyBCdWZmZXIkMS5mcm9tKGJ1ZmZlciwgb2Zmc2V0LCBsZW5ndGgpIDogbmV3IFVpbnQ4QXJyYXkoYnVmZmVyLCBvZmZzZXQsIGxlbmd0aCkpO1xuXHRcdH1cblx0fTtcbn1cbmZ1bmN0aW9uIHdyaXRlQnVmZmVyKGJ1ZmZlciwgbWFrZVJvb20pIHtcblx0bGV0IGxlbmd0aCA9IGJ1ZmZlci5ieXRlTGVuZ3RoO1xuXHRpZiAobGVuZ3RoIDwgMjQpIHRhcmdldFtwb3NpdGlvbisrXSA9IDY0ICsgbGVuZ3RoO1xuXHRlbHNlIGlmIChsZW5ndGggPCAyNTYpIHtcblx0XHR0YXJnZXRbcG9zaXRpb24rK10gPSA4ODtcblx0XHR0YXJnZXRbcG9zaXRpb24rK10gPSBsZW5ndGg7XG5cdH0gZWxzZSBpZiAobGVuZ3RoIDwgNjU1MzYpIHtcblx0XHR0YXJnZXRbcG9zaXRpb24rK10gPSA4OTtcblx0XHR0YXJnZXRbcG9zaXRpb24rK10gPSBsZW5ndGggPj4gODtcblx0XHR0YXJnZXRbcG9zaXRpb24rK10gPSBsZW5ndGggJiAyNTU7XG5cdH0gZWxzZSB7XG5cdFx0dGFyZ2V0W3Bvc2l0aW9uKytdID0gOTA7XG5cdFx0dGFyZ2V0Vmlldy5zZXRVaW50MzIocG9zaXRpb24sIGxlbmd0aCk7XG5cdFx0cG9zaXRpb24gKz0gNDtcblx0fVxuXHRpZiAocG9zaXRpb24gKyBsZW5ndGggPj0gdGFyZ2V0Lmxlbmd0aCkgbWFrZVJvb20ocG9zaXRpb24gKyBsZW5ndGgpO1xuXHR0YXJnZXQuc2V0KGJ1ZmZlci5idWZmZXIgPyBidWZmZXIgOiBuZXcgVWludDhBcnJheShidWZmZXIpLCBwb3NpdGlvbik7XG5cdHBvc2l0aW9uICs9IGxlbmd0aDtcbn1cbmZ1bmN0aW9uIGluc2VydElkcyhzZXJpYWxpemVkLCBpZHNUb0luc2VydCkge1xuXHRsZXQgbmV4dElkO1xuXHRsZXQgZGlzdGFuY2VUb01vdmUgPSBpZHNUb0luc2VydC5sZW5ndGggKiAyO1xuXHRsZXQgbGFzdEVuZCA9IHNlcmlhbGl6ZWQubGVuZ3RoIC0gZGlzdGFuY2VUb01vdmU7XG5cdGlkc1RvSW5zZXJ0LnNvcnQoKGEsIGIpID0+IGEub2Zmc2V0ID4gYi5vZmZzZXQgPyAxIDogLTEpO1xuXHRmb3IgKGxldCBpZCA9IDA7IGlkIDwgaWRzVG9JbnNlcnQubGVuZ3RoOyBpZCsrKSB7XG5cdFx0bGV0IHJlZmVyZWUgPSBpZHNUb0luc2VydFtpZF07XG5cdFx0cmVmZXJlZS5pZCA9IGlkO1xuXHRcdGZvciAobGV0IHBvc2l0aW9uIG9mIHJlZmVyZWUucmVmZXJlbmNlcykge1xuXHRcdFx0c2VyaWFsaXplZFtwb3NpdGlvbisrXSA9IGlkID4+IDg7XG5cdFx0XHRzZXJpYWxpemVkW3Bvc2l0aW9uXSA9IGlkICYgMjU1O1xuXHRcdH1cblx0fVxuXHR3aGlsZSAobmV4dElkID0gaWRzVG9JbnNlcnQucG9wKCkpIHtcblx0XHRsZXQgb2Zmc2V0ID0gbmV4dElkLm9mZnNldDtcblx0XHRzZXJpYWxpemVkLmNvcHlXaXRoaW4ob2Zmc2V0ICsgZGlzdGFuY2VUb01vdmUsIG9mZnNldCwgbGFzdEVuZCk7XG5cdFx0ZGlzdGFuY2VUb01vdmUgLT0gMjtcblx0XHRsZXQgcG9zaXRpb24gPSBvZmZzZXQgKyBkaXN0YW5jZVRvTW92ZTtcblx0XHRzZXJpYWxpemVkW3Bvc2l0aW9uKytdID0gMjE2O1xuXHRcdHNlcmlhbGl6ZWRbcG9zaXRpb24rK10gPSAyODtcblx0XHRsYXN0RW5kID0gb2Zmc2V0O1xuXHR9XG5cdHJldHVybiBzZXJpYWxpemVkO1xufVxuZnVuY3Rpb24gd3JpdGVCdW5kbGVzKHN0YXJ0LCBlbmNvZGUpIHtcblx0dGFyZ2V0Vmlldy5zZXRVaW50MzIoYnVuZGxlZFN0cmluZ3MucG9zaXRpb24gKyBzdGFydCwgcG9zaXRpb24gLSBidW5kbGVkU3RyaW5ncy5wb3NpdGlvbiAtIHN0YXJ0ICsgMSk7XG5cdGxldCB3cml0ZVN0cmluZ3MgPSBidW5kbGVkU3RyaW5ncztcblx0YnVuZGxlZFN0cmluZ3MgPSBudWxsO1xuXHRlbmNvZGUod3JpdGVTdHJpbmdzWzBdKTtcblx0ZW5jb2RlKHdyaXRlU3RyaW5nc1sxXSk7XG59XG52YXIgZGVmYXVsdEVuY29kZXIgPSBuZXcgRW5jb2Rlcih7IHVzZVJlY29yZHM6IGZhbHNlIH0pO1xudmFyIGVuY29kZSA9IGRlZmF1bHRFbmNvZGVyLmVuY29kZTtcbnZhciBlbmNvZGVBc0l0ZXJhYmxlID0gZGVmYXVsdEVuY29kZXIuZW5jb2RlQXNJdGVyYWJsZTtcbnZhciBlbmNvZGVBc0FzeW5jSXRlcmFibGUgPSBkZWZhdWx0RW5jb2Rlci5lbmNvZGVBc0FzeW5jSXRlcmFibGU7XG52YXIgeyBORVZFUiwgQUxXQVlTLCBERUNJTUFMX1JPVU5ELCBERUNJTUFMX0ZJVCB9ID0gRkxPQVQzMl9PUFRJT05TO1xudmFyIFJFVVNFX0JVRkZFUl9NT0RFID0gNTEyO1xudmFyIFJFU0VUX0JVRkZFUl9NT0RFID0gMTAyNDtcbnZhciBUSFJPV19PTl9JVEVSQUJMRSA9IDIwNDg7XG5cbi8vI2VuZHJlZ2lvblxuZXhwb3J0IHsgZGVjb2RlLCBlbmNvZGUgfTsiXSwKICAibWFwcGluZ3MiOiAiQUFDQSxJQUFJQTtBQUNKLElBQUk7QUFDSCxFQUFBQSxLQUFVLElBQUksWUFBWTtBQUMzQixRQUFnQjtBQUFDO0FBQ2pCLElBQUlDLEdBQ0FDLEdBQ0FDLElBQWEsR0FDYkMsS0FBYyxDQUFDLEdBQ2ZDLEtBQTBCLEtBQzFCQyxLQUF3QixPQUN4QkMsS0FBbUIsT0FDbkJDLEtBQXFCLE9BQ3JCQyxLQUEwQixHQUMxQkMsS0FBWSxDQUFDLEdBQ2JDLEtBQWUsU0FDZkMsSUFBYSxRQUNiQyxLQUFVVCxJQUNWVSxLQUFpQixHQUNqQkMsSUFBaUIsQ0FBQyxHQUNsQkMsR0FDQUMsSUFDQUMsS0FBaUIsR0FDakJDLEtBQWUsR0FDZkMsR0FDQUMsR0FDQUMsSUFBb0IsQ0FBQyxHQUNyQkMsS0FBeUIsQ0FBQyxHQUMxQkMsR0FDQUMsR0FDQUMsSUFDQUMsS0FBaUI7QUFBQSxFQUNwQixZQUFZO0FBQUEsRUFDWixlQUFlO0FBQ2hCLEdBQ0lDLEtBQWlCLElBQ2pCQyxLQUE0QjtBQUNoQyxJQUFJO0FBQ0gsTUFBSSxTQUFTLEVBQUU7QUFDaEIsUUFBZ0I7QUFDZixFQUFBQSxLQUE0QjtBQUM3QjtBQUNBLElBQUlDLEtBQVUsTUFBTUEsR0FBUTtBQUFBLEVBQzNCLFlBQVlDLEdBQVM7QUFDcEIsUUFBSUEsT0FDRUEsRUFBUSxVQUFVQSxFQUFRLFlBQVksQ0FBQ0EsRUFBUSxlQUNuREEsRUFBUSxhQUFhLElBQ3JCQSxFQUFRLGdCQUFnQixLQUVyQkEsRUFBUSxlQUFlLE1BQVNBLEVBQVEsa0JBQWtCLFdBQVFBLEVBQVEsZ0JBQWdCLEtBQzFGQSxFQUFR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QUFVLElBQUksS0FDekJrQyxFQUFXbEMsR0FBVSxJQUFJLElBQ3pCNkcsSUFBVUg7QUFBQSxFQUNYO0FBQ0EsU0FBT3hFO0FBQ1I7QUFDQSxTQUFTRixHQUFhbkgsR0FBT2lILEdBQVE7QUFDcEMsRUFBQS9CLEVBQVcsVUFBVUcsRUFBZSxXQUFXckYsR0FBT21GLElBQVdFLEVBQWUsV0FBV3JGLElBQVEsQ0FBQztBQUNwRyxNQUFJaU0sSUFBZTVHO0FBQ25CLEVBQUFBLElBQWlCLE1BQ2pCNEIsRUFBT2dGLEVBQWEsQ0FBQyxDQUFDLEdBQ3RCaEYsRUFBT2dGLEVBQWEsQ0FBQyxDQUFDO0FBQ3ZCO0FBQ0EsSUFBSUMsS0FBaUIsSUFBSXpHLEdBQVEsRUFBRSxZQUFZLEdBQU0sQ0FBQyxHQUNsRHdCLEtBQVNpRixHQUFlLFFBQ3hCQyxLQUFtQkQsR0FBZSxrQkFDbENFLEtBQXdCRixHQUFlLHVCQUN2QyxFQUFFLE9BQUFHLElBQU8sUUFBQUMsSUFBUSxlQUFBQyxJQUFlLGFBQUFDLEdBQVksSUFBSWpJO0FBR3BELElBQUlrSSxLQUFvQjsiLAogICJuYW1lcyI6IFsiZGVjb2RlciIsICJzcmMiLCAic3JjRW5kIiwgInBvc2l0aW9uJDEiLCAiRU1QVFlfQVJSQVkiLCAiTEVHQUNZX1JFQ09SRF9JTkxJTkVfSUQiLCAiUkVDT1JEX0RFRklOSVRJT05TX0lEIiwgIlJFQ09SRF9JTkxJTkVfSUQiLCAiQlVORExFRF9TVFJJTkdTX0lEIiwgIlBBQ0tFRF9SRUZFUkVOQ0VfVEFHX0lEIiwgIlNUT1BfQ09ERSIsICJtYXhBcnJheVNpemUiLCAibWF4TWFwU2l6ZSIsICJzdHJpbmdzIiwgInN0cmluZ1Bvc2l0aW9uIiwgImN1cnJlbnREZWNvZGVyIiwgImN1cnJlbnRTdHJ1Y3R1cmVzIiwgInNyY1N0cmluZyIsICJzcmNTdHJpbmdTdGFydCIsICJzcmNTdHJpbmdFbmQiLCAiYnVuZGxlZFN0cmluZ3MkMSIsICJyZWZlcmVuY2VNYXAiLCAiY3VycmVudEV4dGVuc2lvbnMiLCAiY3VycmVudEV4dGVuc2lvblJhbmdlcyIsICJwYWNrZWRWYWx1ZXMiLCAiZGF0YVZpZXciLCAicmVzdG9yZU1hcHNBc09iamVjdCIsICJkZWZhdWx0T3B0aW9ucyIsICJzZXF1ZW50aWFsTW9kZSIsICJpbmxpbmVPYmplY3RSZWFkVGhyZXNob2xkIiwgIkRlY29kZXIiLCAib3B0aW9ucyIsICJrIiwgInYiLCAia2V5IiwgInJlYyIsICJtYXAiLCAicmVzIiwgInNhZmVLZXkiLCAic291cmNlIiwgImVuZCIsICJyIiwgInNhdmVTdGF0ZSIsICJjbGVhclNvdXJjZSIsICJlcnJvciIsICJjaGVja2VkUmVhZCIsICJmb3JFYWNoIiwgInZhbHVlcyIsICJsYXN0UG9zaXRpb24iLCAic2l6ZSIsICJ2YWx1ZSIsICJkZWZhdWx0RGVjb2RlciIsICJyZXN1bHQiLCAicmVhZCIsICJ0b2tlbiIsICJtYWpvclR5cGUiLCAiZ2V0RmxvYXQxNiIsICJtdWx0aXBsaWVyIiwgIm11bHQxMCIsICJhcnJheSIsICJpIiwgIm9iamVjdCIsICJyZWFkQmluIiwgInN0cmluZyIsICJzaG9ydFN0cmluZ0luSlMiLCAibG9uZ1N0cmluZ0luSlMiLCAicmVhZEZpeGVkU3RyaW5nIiwgInN0cnVjdHVyZSIsICJjcmVhdGVTdHJ1Y3R1cmVSZWFkZXIiLCAibGVuZ3RoIiwgInJlYWRKdXN0TGVuZ3RoIiwgImlkIiwgInJlY29yZERlZmluaXRpb24iLCAicmVhZEJ1bmRsZUV4dCIsICJsb2FkU2hhcmVkIiwgImV4dGVuc2lvbiIsICJpbnB1dCIsICJUYWciLCAicGFja2VkVmFsdWUiLCAiZ2V0UGFja2VkVmFsdWVzIiwgInZhbGlkTmFtZSIsICJyZWFkT2JqZWN0IiwgImNvbXBpbGVkUmVhZGVyIiwgInJlYWRTdHJpbmdKUyIsICJ1bml0cyIsICJieXRlMSIsICJieXRlMiIsICJieXRlMyIsICJieXRlNCIsICJ1bml0IiwgImZyb21DaGFyQ29kZSIsICJzdGFydCIsICJieXRlcyIsICJieXRlIiwgImEiLCAiYiIsICJjIiwgImQiLCAiZSIsICJmIiwgImciLCAiaCIsICJqIiwgImwiLCAibSIsICJuIiwgIm8iLCAiZjMyQXJyYXkiLCAidThBcnJheSIsICJieXRlMCIsICJleHBvbmVudCIsICJhYnMiLCAidGFnIiwgImRhdGVTdHJpbmciLCAiZXBvY2hTZWMiLCAiYnVmZmVyIiwgImZyYWN0aW9uIiwgImV4aXN0aW5nU3RydWN0dXJlIiwgImRhdGEiLCAiZ2xibCIsICJwYWNrZWRUYWJsZSIsICJuZXdQYWNrZWRWYWx1ZXMiLCAic3RhcnRpbmdQb3NpdGlvbiIsICJ0YXJnZXQiLCAicmVmRW50cnkiLCAidGFyZ2V0UHJvcGVydGllcyIsICJjb21iaW5lIiwgIlNIQVJFRF9EQVRBX1RBR19JRCIsICJpc0xpdHRsZUVuZGlhbk1hY2hpbmUkMSIsICJ0eXBlZEFycmF5cyIsICJ0eXBlZEFycmF5VGFncyIsICJyZWdpc3RlclR5cGVkQXJyYXkiLCAiVHlwZWRBcnJheSIsICJkdk1ldGhvZCIsICJieXRlc1BlckVsZW1lbnQiLCAibGl0dGxlRW5kaWFuIiwgInNpemVTaGlmdCIsICJkdiIsICJlbGVtZW50cyIsICJ0YSIsICJtZXRob2QiLCAiYnVuZGxlUG9zaXRpb24iLCAiYnVuZGxlTGVuZ3RoIiwgImRhdGFQb3NpdGlvbiIsICJzaGFyZWREYXRhIiwgInVwZGF0ZWRTdHJ1Y3R1cmVzIiwgImNhbGxiYWNrIiwgInNhdmVkU3JjRW5kIiwgInNhdmVkUG9zaXRpb24iLCAic2F2ZWRTdHJpbmdQb3NpdGlvbiIsICJzYXZlZFNyY1N0cmluZ1N0YXJ0IiwgInNhdmVkU3JjU3RyaW5nRW5kIiwgInNhdmVkU3JjU3RyaW5nIiwgInNhdmVkU3RyaW5ncyIsICJzYXZlZFJlZmVyZW5jZU1hcCIsICJzYXZlZEJ1bmRsZWRTdHJpbmdzIiwgInNhdmVkU3JjIiwgInNhdmVkU3RydWN0dXJlcyIsICJzYXZlZERlY29kZXIiLCAic2F2ZWRTZXF1ZW50aWFsTW9kZSIsICJkZWNvZGUiLCAiZGVjb2RlTXVsdGlwbGUiLCAiRkxPQVQzMl9PUFRJT05TIiwgInRleHRFbmNvZGVyIiwgImV4dGVuc2lvbnMiLCAiZXh0ZW5zaW9uQ2xhc3NlcyIsICJCdWZmZXIkMSIsICJoYXNOb2RlQnVmZmVyIiwgIkJ5dGVBcnJheUFsbG9jYXRlIiwgIkJ5dGVBcnJheSIsICJNQVhfU1RSVUNUVVJFUyIsICJNQVhfQlVGRkVSX1NJWkUiLCAidGhyb3dPbkl0ZXJhYmxlIiwgInRhcmdldFZpZXciLCAicG9zaXRpb24iLCAic2FmZUVuZCIsICJidW5kbGVkU3RyaW5ncyIsICJNQVhfQlVORExFX1NJWkUiLCAiaGFzTm9uTGF0aW4iLCAiUkVDT1JEX1NZTUJPTCIsICJFbmNvZGVyIiwgInNoYXJlZFN0cnVjdHVyZXMiLCAiaGFzU2hhcmVkVXBkYXRlIiwgInN0cnVjdHVyZXMiLCAiZW5jb2RlVXRmOCIsICJlbmNvZGVyIiwgImhhc1NoYXJlZFN0cnVjdHVyZXMiLCAibWF4U2hhcmVkU3RydWN0dXJlcyIsICJpc1NlcXVlbnRpYWwiLCAic2FtcGxpbmdQYWNrZWRWYWx1ZXMiLCAicGFja2VkT2JqZWN0TWFwIiwgInNoYXJlZFZhbHVlcyIsICJzaGFyZWRQYWNrZWRPYmplY3RNYXAiLCAicmVjb3JkSWRzVG9SZW1vdmUiLCAidHJhbnNpdGlvbnNDb3VudCIsICJzZXJpYWxpemF0aW9uc1NpbmNlVHJhbnNpdGlvblJlYnVpbGQiLCAiZW5jb2RlT3B0aW9ucyIsICJzaGFyZWRTdHJ1Y3R1cmVzTGVuZ3RoIiwgImtleXMiLCAibmV4dFRyYW5zaXRpb24iLCAidHJhbnNpdGlvbiIsICJmaW5kUmVwZXRpdGl2ZVN0cmluZ3MiLCAid3JpdGVBcnJheUhlYWRlciIsICJ2YWx1ZXNBcnJheSIsICJlbmNvZGUiLCAiVEhST1dfT05fSVRFUkFCTEUiLCAid3JpdGVCdW5kbGVzIiwgIm1ha2VSb29tIiwgInNlcmlhbGl6ZWQiLCAiaW5zZXJ0SWRzIiwgInJldHVybkJ1ZmZlciIsICJ0aHJlc2hvbGQiLCAic3RhdHVzIiwgInR5cGUiLCAicGFja2VkUG9zaXRpb24iLCAic3RyTGVuZ3RoIiwgImV4dFN0YXJ0IiwgIm1heEJ5dGVzIiwgInR3b0J5dGUiLCAiaGVhZGVyU2l6ZSIsICJjMSIsICJjMiIsICJzdHJQb3NpdGlvbiIsICJ1c2VGbG9hdDMyIiwgInhTaGlmdGVkIiwgInJlZmVyZWUiLCAiaWRzVG9JbnNlcnQiLCAiY29uc3RydWN0b3IiLCAieCIsICJ3cml0ZU9iamVjdCIsICJlbnRyeVZhbHVlIiwgImV4dGVuc2lvbkNsYXNzIiwgImVudHJ5IiwgImlzQmxvYiIsICJqc29uIiwgIndyaXRlQnVmZmVyIiwgInZhbHMiLCAib2JqZWN0T2Zmc2V0IiwgInNraXBWYWx1ZXMiLCAibmV3VHJhbnNpdGlvbnMiLCAicGFyZW50UmVjb3JkSWQiLCAicmVjb3JkSWQiLCAibmV3U2l6ZSIsICJuZXdCdWZmZXIiLCAiY2h1bmtUaHJlc2hvbGQiLCAiY29udGludWVkQ2h1bmtUaHJlc2hvbGQiLCAic3RhcnRFbmNvZGluZyIsICJlbmNvZGVPYmplY3RBc0l0ZXJhYmxlIiwgImVuY29kZU9iamVjdEFzQXN5bmNJdGVyYWJsZSIsICJpdGVyYXRlUHJvcGVydGllcyIsICJmaW5hbEl0ZXJhYmxlIiwgInVzZVJlY29yZHMiLCAid3JpdGVFbnRpdHlMZW5ndGgiLCAidHJ5RW5jb2RlIiwgInJlc3RhcnRFbmNvZGluZyIsICJyZXN0YXJ0IiwgImVuY29kZUl0ZXJhYmxlIiwgImVuY29kZWRWYWx1ZSIsICJyZWFkZXIiLCAibmV4dCIsICJhc3luY1ZhbHVlIiwgImxhc3RWZXJzaW9uIiwgInN0cnVjdHVyZXNDb3B5IiwgIlNoYXJlZERhdGEiLCAic2F2ZVJlc3VsdHMiLCAiZXhpc3RpbmdTaGFyZWQiLCAibWFqb3JWYWx1ZSIsICJ2ZXJzaW9uIiwgIkJsb2JDb25zdHJ1Y3RvciIsICJwYWNrZWRTdGF0dXMiLCAiaW5jbHVkZUtleXMiLCAiaXNMaXR0bGVFbmRpYW5NYWNoaW5lIiwgImRhdGUiLCAic2Vjb25kcyIsICJzZXQiLCAicmVnZXgiLCAiYXJyYXlCdWZmZXIiLCAidHlwZWRBcnJheSIsICJ0eXBlZEFycmF5RW5jb2RlciIsICJkZWZpbml0aW9ucyIsICJvZmZzZXQiLCAibmV4dElkIiwgImRpc3RhbmNlVG9Nb3ZlIiwgImxhc3RFbmQiLCAid3JpdGVTdHJpbmdzIiwgImRlZmF1bHRFbmNvZGVyIiwgImVuY29kZUFzSXRlcmFibGUiLCAiZW5jb2RlQXNBc3luY0l0ZXJhYmxlIiwgIk5FVkVSIiwgIkFMV0FZUyIsICJERUNJTUFMX1JPVU5EIiwgIkRFQ0lNQUxfRklUIiwgIlRIUk9XX09OX0lURVJBQkxFIl0KfQo=
