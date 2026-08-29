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
