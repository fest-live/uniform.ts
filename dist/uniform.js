var or = /* @__PURE__ */ (function(e) {
  return e.SUCCESS = "success", e.ERROR = "error", e;
})({}), ar = /* @__PURE__ */ (function(e) {
  return e.PRIMITIVE = "primitive", e.NUMBER = "number", e.STRING = "string", e.BOOLEAN = "boolean", e.BIGINT = "bigint", e.UNDEFINED = "undefined", e.NULL = "null", e.OBJECT = "object", e.FUNCTION = "function", e.ARRAY = "array", e.MAP = "map", e.SET = "set", e.SYMBOL = "symbol", e.WEAK_REF = "weakRef", e.PROMISE = "promise", e.UNKNOWN = "unknown", e;
})({}), d = /* @__PURE__ */ (function(e) {
  return e.GET = "get", e.SET = "set", e.CALL = "call", e.APPLY = "apply", e.CONSTRUCT = "construct", e.DELETE = "delete", e.DELETE_PROPERTY = "deleteProperty", e.HAS = "has", e.OWN_KEYS = "ownKeys", e.GET_OWN_PROPERTY_DESCRIPTOR = "getOwnPropertyDescriptor", e.GET_PROPERTY_DESCRIPTOR = "getPropertyDescriptor", e.GET_PROTOTYPE_OF = "getPrototypeOf", e.SET_PROTOTYPE_OF = "setPrototypeOf", e.IS_EXTENSIBLE = "isExtensible", e.PREVENT_EXTENSIONS = "preventExtensions", e.TRANSFER = "transfer", e.IMPORT = "import", e.DISPOSE = "dispose", e;
})({}), dn = {
  ws: "websocket",
  socket: "websocket",
  socketio: "socket-io",
  service: "service-worker",
  sw: "service-worker",
  "service-worker-client": "service-worker",
  "service-worker-host": "service-worker",
  "ring-buffer": "atomics"
};
function fn(e) {
  const t = String(e ?? "").trim().toLowerCase();
  return t ? dn[t] ?? t : "internal";
}
function ie(e) {
  return typeof e == "string" ? fn(e) : typeof Worker < "u" && e instanceof Worker ? "worker" : typeof SharedWorker < "u" && e instanceof SharedWorker ? "shared-worker" : typeof MessagePort < "u" && e instanceof MessagePort ? "message-port" : typeof BroadcastChannel < "u" && e instanceof BroadcastChannel ? "broadcast" : typeof WebSocket < "u" && e instanceof WebSocket ? "websocket" : typeof RTCDataChannel < "u" && e instanceof RTCDataChannel ? "rtc-data" : typeof chrome < "u" && e && typeof e == "object" && typeof e.postMessage == "function" && e.onMessage?.addListener ? "chrome-port" : "internal";
}
function dt(e) {
  const t = ie(e);
  return {
    type: t,
    supports: {
      worker: {
        transfer: !0,
        binary: !0,
        bidirectional: !0,
        broadcast: !1,
        persistent: !0
      },
      "shared-worker": {
        transfer: !0,
        binary: !0,
        bidirectional: !0,
        broadcast: !0,
        persistent: !0
      },
      "service-worker": {
        transfer: !0,
        binary: !0,
        bidirectional: !0,
        broadcast: !0,
        persistent: !0
      },
      broadcast: {
        transfer: !1,
        binary: !1,
        bidirectional: !1,
        broadcast: !0,
        persistent: !1
      },
      "message-port": {
        transfer: !0,
        binary: !0,
        bidirectional: !0,
        broadcast: !1,
        persistent: !1
      },
      websocket: {
        transfer: !1,
        binary: !0,
        bidirectional: !0,
        broadcast: !1,
        persistent: !0
      },
      "chrome-runtime": {
        transfer: !1,
        binary: !1,
        bidirectional: !0,
        broadcast: !0,
        persistent: !1
      },
      "chrome-tabs": {
        transfer: !1,
        binary: !1,
        bidirectional: !0,
        broadcast: !1,
        persistent: !1
      },
      "chrome-port": {
        transfer: !1,
        binary: !1,
        bidirectional: !0,
        broadcast: !1,
        persistent: !0
      },
      "chrome-external": {
        transfer: !1,
        binary: !1,
        bidirectional: !0,
        broadcast: !1,
        persistent: !1
      },
      "socket-io": {
        transfer: !1,
        binary: !0,
        bidirectional: !0,
        broadcast: !0,
        persistent: !0
      },
      "rtc-data": {
        transfer: !1,
        binary: !0,
        bidirectional: !0,
        broadcast: !1,
        persistent: !0
      },
      atomics: {
        transfer: !1,
        binary: !0,
        bidirectional: !0,
        broadcast: !1,
        persistent: !0
      },
      self: {
        transfer: !0,
        binary: !0,
        bidirectional: !0,
        broadcast: !1,
        persistent: !0
      },
      internal: {
        transfer: !1,
        binary: !1,
        bidirectional: !0,
        broadcast: !1,
        persistent: !1
      }
    }[t]
  };
}
function b(e, t) {
  return (n, s) => {
    const r = s ?? n?.transferable ?? [], { transferable: i, ...o } = n;
    if (e instanceof Worker) {
      e.postMessage(o, { transfer: r });
      return;
    }
    if (typeof SharedWorker < "u" && e instanceof SharedWorker) {
      e.port.postMessage(o, { transfer: r });
      return;
    }
    if (e instanceof MessagePort) {
      e.postMessage(o, { transfer: r });
      return;
    }
    if (e instanceof BroadcastChannel) {
      e.postMessage(o);
      return;
    }
    if (e instanceof WebSocket) {
      e.readyState === WebSocket.OPEN && (o instanceof ArrayBuffer || ArrayBuffer.isView(o) ? e.send(o) : e.send(JSON.stringify(o)));
      return;
    }
    if (e === "chrome-runtime") {
      typeof chrome < "u" && chrome.runtime && chrome.runtime.sendMessage(o);
      return;
    }
    if (e === "chrome-tabs") {
      if (typeof chrome < "u" && chrome.tabs) {
        const a = t?.tabId ?? n?._tabId;
        a != null && chrome.tabs.sendMessage(a, o);
      }
      return;
    }
    if (e === "chrome-port") {
      if (typeof chrome < "u" && chrome.runtime) {
        const a = t?.portName ?? n?._portName;
        if (a) {
          const c = t?.tabId ?? n?._tabId;
          (c != null && chrome.tabs?.connect ? chrome.tabs.connect(c, { name: a }) : chrome.runtime.connect({ name: a })).postMessage(o);
        }
      }
      return;
    }
    if (e === "chrome-external") {
      if (typeof chrome < "u" && chrome.runtime) {
        const a = t?.externalId ?? n?._externalId;
        a && chrome.runtime.sendMessage(a, o);
      }
      return;
    }
    if (e === "service-worker-client") {
      "serviceWorker" in navigator && navigator.serviceWorker.ready.then((a) => {
        a.active?.postMessage(o, r);
      });
      return;
    }
    if (e === "service-worker-host") {
      if (typeof clients < "u") {
        const a = t?.clientId ?? n?._clientId;
        a ? clients.get(a).then((c) => c?.postMessage(o, r)) : clients.matchAll({ includeUncontrolled: !0 }).then((c) => {
          c.forEach((l) => l.postMessage(o, r));
        });
      }
      return;
    }
    if (e === "self") {
      typeof self < "u" && "postMessage" in self && self.postMessage(o, { transfer: r });
      return;
    }
  };
}
function m(e, t, n, s, r) {
  const i = (c) => {
    if (e instanceof WebSocket && typeof c.data == "string") try {
      t(JSON.parse(c.data));
    } catch (l) {
      n?.(l);
    }
    else e instanceof WebSocket && c.data instanceof ArrayBuffer, t(c.data);
  }, o = (c) => {
    n?.(new Error(c.message ?? "Transport error"));
  }, a = () => s?.();
  if (e instanceof Worker)
    return e.addEventListener("message", i), e.addEventListener("error", o), () => {
      e.removeEventListener("message", i), e.removeEventListener("error", o);
    };
  if (typeof SharedWorker < "u" && e instanceof SharedWorker)
    return e.port.addEventListener("message", i), e.port.addEventListener("messageerror", o), e.port.start(), () => {
      e.port.removeEventListener("message", i), e.port.removeEventListener("messageerror", o), e.port.close();
    };
  if (e instanceof MessagePort)
    return e.addEventListener("message", i), e.start(), () => {
      e.removeEventListener("message", i), e.close();
    };
  if (e instanceof BroadcastChannel)
    return e.addEventListener("message", i), () => {
      e.removeEventListener("message", i), e.close();
    };
  if (e instanceof WebSocket)
    return e.addEventListener("message", i), e.addEventListener("error", o), e.addEventListener("close", a), () => {
      e.removeEventListener("message", i), e.removeEventListener("error", o), e.removeEventListener("close", a), e.readyState === WebSocket.OPEN && e.close();
    };
  if (e === "chrome-runtime" && typeof chrome < "u" && chrome.runtime) {
    const c = (l) => (t(l), !1);
    return chrome.runtime.onMessage.addListener(c), () => chrome.runtime.onMessage.removeListener(c);
  }
  if (e === "chrome-tabs" && typeof chrome < "u" && chrome.runtime) {
    const c = r?.tabId;
    if (c != null) return ft(c, (u) => t(u));
    const l = (u) => (t(u), !1);
    return chrome.runtime.onMessage.addListener(l), () => chrome.runtime.onMessage.removeListener(l);
  }
  if (e === "chrome-port" && typeof chrome < "u" && chrome.runtime) {
    const c = r?.portName;
    if (c) {
      const l = chrome.runtime.connect({ name: c });
      return l.onMessage.addListener(t), l.onDisconnect.addListener(a), () => l.disconnect();
    }
  }
  if (e === "chrome-external" && typeof chrome < "u" && chrome.runtime?.onMessageExternal) {
    const c = (l) => (t(l), !1);
    return chrome.runtime.onMessageExternal.addListener(c), () => chrome.runtime.onMessageExternal.removeListener(c);
  }
  if (e === "service-worker-client" && "serviceWorker" in navigator)
    return navigator.serviceWorker.addEventListener("message", i), () => navigator.serviceWorker.removeEventListener("message", i);
  if (e === "service-worker-host" || e === "self") {
    const c = (l) => {
      const u = e === "service-worker-host" ? l.source?.id : void 0;
      t(u ? {
        ...l.data,
        _clientId: u
      } : l.data);
    };
    return self.addEventListener("message", c), () => self.removeEventListener("message", c);
  }
  return () => {
  };
}
function pn(e, t) {
  if (typeof chrome > "u" || !chrome.runtime) return () => {
  };
  const n = (s, r, i) => e(s, i, r);
  return t?.external && chrome.runtime.onMessageExternal ? (chrome.runtime.onMessageExternal.addListener(n), () => chrome.runtime.onMessageExternal.removeListener(n)) : (chrome.runtime.onMessage.addListener(n), () => chrome.runtime.onMessage.removeListener(n));
}
function ft(e, t) {
  if (typeof chrome > "u" || !chrome.runtime) return () => {
  };
  const n = (s, r) => {
    r.tab?.id === e && t(s, r);
  };
  return chrome.runtime.onMessage.addListener(n), () => chrome.runtime.onMessage.removeListener(n);
}
function pt(e, t = {}) {
  let n = new WebSocket(e, t.protocols);
  t.binaryType && (n.binaryType = t.binaryType);
  let s = 0, r = null;
  const i = (c, l) => {
    n.readyState === WebSocket.OPEN && (c instanceof ArrayBuffer || ArrayBuffer.isView(c) ? n.send(c) : n.send(JSON.stringify(c)));
  }, o = () => {
    s >= (t.maxReconnectAttempts ?? 5) || (s++, n = new WebSocket(e, t.protocols), t.binaryType && (n.binaryType = t.binaryType));
  }, a = () => {
    r && clearTimeout(r), n.close();
  };
  return t.reconnect && n.addEventListener("close", () => {
    r = setTimeout(o, t.reconnectInterval ?? 3e3);
  }), {
    socket: n,
    send: i,
    listen: (c) => {
      const l = (u) => {
        if (typeof u.data == "string") try {
          c(JSON.parse(u.data));
        } catch {
        }
        else c(u.data);
      };
      return n.addEventListener("message", l), () => n.removeEventListener("message", l);
    },
    reconnect: o,
    close: a
  };
}
function _t(e) {
  const t = new BroadcastChannel(e);
  return {
    channel: t,
    send: (n) => t.postMessage(n),
    listen: (n) => {
      const s = (r) => n(r.data);
      return t.addEventListener("message", s), () => t.removeEventListener("message", s);
    },
    close: () => t.close()
  };
}
var cr = {
  createSender: b,
  createListener: m,
  detectType: ie,
  getMeta: dt,
  chrome: {
    createListener: pn,
    createTabsListener: ft
  },
  websocket: pt,
  broadcast: _t
};
function _n() {
  const e = globalThis;
  if (typeof e.HTMLElement == "function") return;
  const t = class {
  }, n = (s) => {
    typeof e[s] != "function" && (e[s] = t);
  };
  n("EventTarget"), n("Node"), n("Element"), n("HTMLElement"), n("SVGElement"), n("Text"), n("Comment"), n("DocumentFragment"), n("ShadowRoot"), n("HTMLDocument"), n("Document"), n("HTMLBodyElement"), n("HTMLHeadElement"), n("HTMLCanvasElement"), n("HTMLInputElement"), n("HTMLLinkElement"), n("HTMLStyleElement"), n("HTMLPreElement"), n("HTMLDivElement"), n("CSSStyleRule"), n("CSSLayerBlockRule");
}
var mn = class {
  channels = /* @__PURE__ */ new Map();
  listeners = /* @__PURE__ */ new Map();
  register(e, t) {
    this.channels.set(e, t);
    const n = this.listeners.get(e);
    if (n) for (const s of n) try {
      s(t);
    } catch (r) {
      console.error(`[ChannelRegistry] Listener error for ${e}:`, r);
    }
    return t;
  }
  get(e) {
    return this.channels.get(e);
  }
  has(e) {
    return this.channels.has(e);
  }
  unregister(e) {
    const t = this.channels.delete(e);
    if (t) {
      const n = this.listeners.get(e);
      if (n) for (const s of n) try {
        s(null);
      } catch (r) {
        console.error(`[ChannelRegistry] Unregister listener error for ${e}:`, r);
      }
    }
    return t;
  }
  onChannelChange(e, t) {
    this.listeners.has(e) || this.listeners.set(e, /* @__PURE__ */ new Set());
    const n = this.listeners.get(e);
    if (n.add(t), this.channels.has(e)) try {
      t(this.channels.get(e));
    } catch (s) {
      console.error(`[ChannelRegistry] Initial listener error for ${e}:`, s);
    }
    return () => {
      n.delete(t), n.size === 0 && this.listeners.delete(e);
    };
  }
  getChannelNames() {
    return Array.from(this.channels.keys());
  }
  clear() {
    this.channels.clear(), this.listeners.clear();
  }
}, lr = new mn(), gn = class {
  healthChecks = /* @__PURE__ */ new Map();
  intervals = /* @__PURE__ */ new Map();
  healthStatus = /* @__PURE__ */ new Map();
  registerHealthCheck(e, t, n = 3e4) {
    this.healthChecks.set(e, t);
    const s = this.intervals.get(e);
    s && clearInterval(s);
    const r = setInterval(async () => {
      try {
        const i = await t();
        this.healthStatus.set(e, i), i || console.warn(`[ChannelHealth] Channel '${e}' is unhealthy`);
      } catch (i) {
        console.error(`[ChannelHealth] Health check failed for '${e}':`, i), this.healthStatus.set(e, !1);
      }
    }, n);
    this.intervals.set(e, r), t().then((i) => {
      this.healthStatus.set(e, i);
    }).catch(() => {
      this.healthStatus.set(e, !1);
    });
  }
  isHealthy(e) {
    return this.healthStatus.get(e) ?? !1;
  }
  getAllHealthStatuses() {
    const e = {};
    for (const [t, n] of this.healthStatus) e[t] = n;
    return e;
  }
  stopMonitoring(e) {
    const t = this.intervals.get(e);
    t && (clearInterval(t), this.intervals.delete(e)), this.healthChecks.delete(e), this.healthStatus.delete(e);
  }
  stopAllMonitoring() {
    for (const e of this.intervals.values()) clearInterval(e);
    this.intervals.clear(), this.healthChecks.clear(), this.healthStatus.clear();
  }
}, hr = new gn();
WeakMap.prototype.getOrInsert ??= function(e, t) {
  return this.has(e) || this.set(e, t), this.get(e);
};
WeakMap.prototype.getOrInsertComputed ??= function(e, t) {
  return this.has(e) || this.set(e, t(e)), this.get(e);
};
Map.prototype.getOrInsert ??= function(e, t) {
  return this.has(e) || this.set(e, t), this.get(e);
};
Map.prototype.getOrInsertComputed ??= function(e, t) {
  return this.has(e) || this.set(e, t(e)), this.get(e);
};
var mt = /* @__PURE__ */ Symbol.for("@fix"), A = (e) => typeof e == "string" || typeof e == "number" || typeof e == "boolean" || typeof e == "bigint" || typeof e > "u" || e == null, bn = (e, t) => A(e) ? t == "number" ? Number(e) || 0 : t == "string" ? String(e) || "" : t == "boolean" ? !!e : e : null, g = (e, t) => e?.[mt] ?? e ?? t ?? t, yn = (e) => {
  if (typeof e == "function" || e == null) return e;
  const t = function() {
  };
  return t[mt] = e, t;
}, wn = (e) => crypto?.getRandomValues ? crypto?.getRandomValues?.(e) : (() => {
  const t = new Uint8Array(e.length);
  for (let n = 0; n < e.length; n++) t[n] = Math.floor(Math.random() * 256);
  return t;
})(), h = () => crypto?.randomUUID ? crypto?.randomUUID?.() : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (e) => (+e ^ wn?.(/* @__PURE__ */ new Uint8Array(1))?.[0] & 15 >> +e / 4).toString(16)), gt = (e) => Array.isArray(e) ? e?.flatMap?.((t) => Array.isArray(t) ? gt(t) : t) : e, Ne = (e) => gt(e)?.every?.(L), L = (e) => A(e) || typeof SharedArrayBuffer == "function" && e instanceof SharedArrayBuffer || vn(e) || Array.isArray(e) && Ne(e), vn = (e) => ArrayBuffer.isView(e) && !(e instanceof DataView), Re = (e) => A(e) || typeof ArrayBuffer == "function" && e instanceof ArrayBuffer || typeof MessagePort == "function" && e instanceof MessagePort || typeof ReadableStream == "function" && e instanceof ReadableStream || typeof WritableStream == "function" && e instanceof WritableStream || typeof TransformStream == "function" && e instanceof TransformStream || typeof ImageBitmap == "function" && e instanceof ImageBitmap || typeof VideoFrame == "function" && e instanceof VideoFrame || typeof OffscreenCanvas == "function" && e instanceof OffscreenCanvas || typeof RTCDataChannel == "function" && e instanceof RTCDataChannel || typeof AudioData == "function" && e instanceof AudioData || typeof WebTransportReceiveStream == "function" && e instanceof WebTransportReceiveStream || typeof WebTransportSendStream == "function" && e instanceof WebTransportSendStream || typeof WebTransportReceiveStream == "function" && e instanceof WebTransportReceiveStream, B = (e, t, n) => {
  if (Array.isArray(e)) return e.every(L) ? e.map(t) : e.map((s, r) => B(s, t, [e, r]));
  if (e instanceof Map) {
    const s = Array.from(e.entries());
    return s.map(([r, i]) => i).every(L) ? new Map(s.map(([r, i]) => [r, t(i, r, e)])) : new Map(s.map(([r, i]) => [r, B(i, t, [e, r])]));
  }
  if (e instanceof Set) {
    const s = Array.from(e.entries()), r = s.map(([i, o]) => o);
    return s.every(L) ? new Set(r.map(t)) : new Set(r.map((i) => B(i, t, [e, i])));
  }
  if (typeof e == "object" && e?.constructor == Object && Object.prototype.toString.call(e) == "[object Object]") {
    const s = Array.from(Object.entries(e));
    return s.map(([r, i]) => i).every(L) ? Object.fromEntries(s.map(([r, i]) => [r, t(i, r, e)])) : Object.fromEntries(s.map(([r, i]) => [r, B(i, t, [e, r])]));
  }
  return t(e, n?.[1] ?? "", n?.[0] ?? null);
}, R = /* @__PURE__ */ new WeakMap(), Ze = /* @__PURE__ */ new WeakMap(), x = (e, t) => e instanceof Promise || typeof e?.then == "function" ? R?.has?.(e) ? t(R?.get?.(e)) : Promise.try?.(async () => {
  const n = await e;
  return R?.set?.(e, n), n;
})?.then?.(t) : t(e), Cn = class {
  #e;
  #t;
  constructor(e, t) {
    this.#e = e, this.#t = t;
  }
  defineProperty(e, t, n) {
    return g(e) instanceof Promise ? Reflect.defineProperty(e, t, n) : x(g(e), (s) => Reflect.defineProperty(s, t, n));
  }
  deleteProperty(e, t) {
    return g(e) instanceof Promise ? Reflect.deleteProperty(e, t) : x(g(e), (n) => Reflect.deleteProperty(n, t));
  }
  getPrototypeOf(e) {
    return g(e) instanceof Promise ? Reflect.getPrototypeOf(e) : x(g(e), (t) => Reflect.getPrototypeOf(t));
  }
  setPrototypeOf(e, t) {
    return g(e) instanceof Promise ? Reflect.setPrototypeOf(e, t) : x(g(e), (n) => Reflect.setPrototypeOf(n, t));
  }
  isExtensible(e) {
    return g(e) instanceof Promise ? Reflect.isExtensible(e) : x(g(e), (t) => Reflect.isExtensible(t));
  }
  preventExtensions(e) {
    return g(e) instanceof Promise ? Reflect.ownKeys(e) : x(g(e), (t) => Reflect.preventExtensions(t));
  }
  ownKeys(e) {
    const t = g(e);
    return t instanceof Promise ? Object.keys(t) : x(t, (n) => (typeof n == "object" || typeof n == "function") && n != null ? Object.keys(n) : []) ?? [];
  }
  getOwnPropertyDescriptor(e, t) {
    return g(e) instanceof Promise ? Reflect.getOwnPropertyDescriptor(e, t) : x(g(e), (n) => Reflect.getOwnPropertyDescriptor(n, t));
  }
  construct(e, t, n) {
    return x(g(e), (s) => Reflect.construct(s, t, n));
  }
  has(e, t) {
    return g(e) instanceof Promise ? Reflect.has(e, t) : x(g(e), (n) => Reflect.has(n, t));
  }
  get(e, t, n) {
    if (e = g(e), t == "promise") return e;
    if (t == "resolve" && this.#e) return (...r) => {
      const i = this.#e?.(...r);
      return this.#e = null, i;
    };
    if (t == "reject" && this.#t) return (...r) => {
      const i = this.#t?.(...r);
      return this.#t = null, i;
    };
    if (t == "then" || t == "catch" || t == "finally") {
      if (e instanceof Promise) return e?.[t]?.bind?.(e);
      {
        const r = Promise.try(() => e);
        return r?.[t]?.bind?.(r);
      }
    }
    let s;
    return R?.has?.(e) && (s = R?.get?.(e))?.[t] != null ? s = R?.get?.(e)?.[t] : s = bt(x(e, async (r) => {
      if (g(r) instanceof Promise) return Reflect.get(r, t, n);
      if (A(r)) return t == Symbol.toPrimitive || t == Symbol.toStringTag ? r : void 0;
      let i;
      try {
        i = Reflect.get(r, t, n);
      } catch {
        i = e?.[t];
      }
      return typeof i == "function" ? i?.bind?.(r) : i;
    })), t == Symbol.toStringTag ? A(s) ? String(s ?? "") || "" : s?.[Symbol.toStringTag]?.() || String(s ?? "") || "" : t == Symbol.toPrimitive ? (r) => {
      if (A(s)) return bn(s, r);
    } : s;
  }
  set(e, t, n) {
    return x(g(e), (s) => Reflect.set(s, t, n));
  }
  apply(e, t, n) {
    if (this.#e) {
      const s = this.#e?.(...n);
      return this.#e = null, s;
    }
    return x(g(e, this.#e), (s) => {
      if (typeof s == "function") return g(s) instanceof Promise, Reflect.apply(s, t, n);
    });
  }
};
function bt(e, t, n) {
  return e instanceof Promise || typeof e?.then == "function" ? R?.has?.(e) ? R?.get?.(e) : (Ze?.has?.(e) || e?.then?.((s) => R?.set?.(e, s)), Ze?.getOrInsertComputed?.(e, () => new Proxy(yn(e), new Cn(t, n)))) : e;
}
_n();
var De = class {
  _unsubscribe;
  _closed = !1;
  constructor(e) {
    this._unsubscribe = e;
  }
  get closed() {
    return this._closed;
  }
  unsubscribe() {
    this._closed || (this._closed = !0, this._unsubscribe());
  }
}, C = class {
  _producer;
  constructor(e) {
    this._producer = e;
  }
  subscribe(e, t) {
    const n = typeof e == "function" ? { next: e } : e ?? {}, s = new AbortController();
    t?.signal?.addEventListener("abort", () => s.abort());
    let r = !0, i;
    const o = () => {
      r = !1, s.abort(), i?.();
    }, a = {
      next: (c) => r && n.next?.(c),
      error: (c) => {
        r && (n.error?.(c), o());
      },
      complete: () => {
        r && (n.complete?.(), o());
      },
      signal: s.signal,
      get active() {
        return r && !s.signal.aborted;
      }
    };
    try {
      i = this._producer(a);
    } catch (c) {
      a.error(c);
    }
    return new De(o);
  }
  pipe(...e) {
    return e.reduce((t, n) => n(t), this);
  }
}, _ = class {
  _subs = /* @__PURE__ */ new Set();
  _buffer = [];
  _maxBuffer;
  _replay;
  constructor(e = {}) {
    this._maxBuffer = e.bufferSize ?? 0, this._replay = e.replayOnSubscribe ?? !1;
  }
  next(e) {
    this._maxBuffer > 0 && (this._buffer.push(e), this._buffer.length > this._maxBuffer && this._buffer.shift());
    for (const t of this._subs) try {
      t.next?.(e);
    } catch (n) {
      t.error?.(n);
    }
  }
  error(e) {
    for (const t of this._subs) t.error?.(e);
  }
  complete() {
    for (const e of this._subs) e.complete?.();
    this._subs.clear();
  }
  subscribe(e) {
    const t = typeof e == "function" ? { next: e } : e;
    if (this._subs.add(t), this._replay) for (const n of this._buffer) try {
      t.next?.(n);
    } catch (s) {
      t.error?.(s);
    }
    return new De(() => {
      this._subs.delete(t);
    });
  }
  getValue() {
    return this._buffer.at(-1);
  }
  getBuffer() {
    return [...this._buffer];
  }
  get subscriberCount() {
    return this._subs.size;
  }
}, ur = class extends _ {
  constructor(e = 1) {
    super({
      bufferSize: e,
      replayOnSubscribe: !0
    });
  }
}, xn = class {
  _transport;
  _channelName;
  _send;
  _pending = /* @__PURE__ */ new Map();
  _subs = /* @__PURE__ */ new Set();
  _cleanup = null;
  _listening = !1;
  constructor(e, t) {
    this._transport = e, this._channelName = t, this._send = b(e);
  }
  next(e, t) {
    this._send(e, t);
  }
  subscribe(e) {
    const t = typeof e == "function" ? { next: e } : e;
    return this._subs.add(t), this._listening || this._activate(), new De(() => {
      this._subs.delete(t), this._subs.size === 0 && this._deactivate();
    });
  }
  request(e) {
    const t = e.reqId ?? h();
    return new Promise((n, s) => {
      this._pending.set(t, {
        resolve: n,
        reject: s,
        timestamp: Date.now()
      }), this.next({
        ...e,
        reqId: t
      });
    });
  }
  _handle(e) {
    if (e.type === "response" && e.reqId) {
      const t = this._pending.get(e.reqId);
      t && (t.resolve(e.payload), this._pending.delete(e.reqId));
    }
    for (const t of this._subs) try {
      t.next?.(e);
    } catch (n) {
      t.error?.(n);
    }
  }
  _activate() {
    this._listening || (this._cleanup = m(this._transport, (e) => this._handle(e), (e) => this._subs.forEach((t) => t.error?.(e)), () => this._subs.forEach((e) => e.complete?.())), this._listening = !0);
  }
  _deactivate() {
    this._cleanup?.(), this._cleanup = null, this._listening = !1;
  }
  close() {
    this._subs.forEach((e) => e.complete?.()), this._subs.clear(), this._deactivate();
  }
  get channelName() {
    return this._channelName;
  }
  get isListening() {
    return this._listening;
  }
};
function et(e, t, n) {
  const s = b(e);
  return new C((r) => m(e, (o) => {
    if (!r.active) return;
    n ? n(o, (c, l) => {
      s({
        ...c,
        channel: o.sender,
        sender: t,
        type: "response",
        reqId: o.reqId
      }, l);
    }, r) : r.next(o);
  }, (o) => r.error(o), () => r.complete()));
}
function Sn(e) {
  return async (t, n, s) => {
    if (t.type !== "request") {
      s.next(t);
      return;
    }
    const r = await Fe(t.payload, t.reqId, e);
    r && n(r.response, r.transfer), s.next(t);
  };
}
var dr = class extends _ {
  constructor(e, t) {
    super(), e.subscribe({
      next: (n) => {
        (!t || n.type === t) && this.next(n);
      },
      error: (n) => this.error(n),
      complete: () => this.complete()
    });
  }
}, yt = (e) => (t) => new C((n) => {
  const s = t.subscribe({
    next: (r) => e(r) && n.next(r),
    error: (r) => n.error(r),
    complete: () => n.complete()
  });
  return () => s.unsubscribe();
}), fr = (e) => (t) => new C((n) => {
  const s = t.subscribe({
    next: (r) => n.next(e(r)),
    error: (r) => n.error(r),
    complete: () => n.complete()
  });
  return () => s.unsubscribe();
}), pr = (e) => (t) => new C((n) => {
  let s = 0;
  const r = t.subscribe({
    next: (i) => {
      s++ < e && (n.next(i), s >= e && n.complete());
    },
    error: (i) => n.error(i),
    complete: () => n.complete()
  });
  return () => r.unsubscribe();
}), _r = (e) => (t) => new C((n) => {
  const s = t.subscribe({
    next: (i) => n.next(i),
    error: (i) => n.error(i),
    complete: () => n.complete()
  }), r = e.subscribe({ next: () => n.complete() });
  return () => {
    s.unsubscribe(), r.unsubscribe();
  };
}), mr = (e) => (t) => new C((n) => {
  let s;
  const r = t.subscribe({
    next: (i) => {
      clearTimeout(s), s = setTimeout(() => n.next(i), e);
    },
    error: (i) => n.error(i),
    complete: () => n.complete()
  });
  return () => {
    clearTimeout(s), r.unsubscribe();
  };
}), gr = (e) => (t) => new C((n) => {
  let s = 0;
  const r = t.subscribe({
    next: (i) => {
      const o = Date.now();
      o - s >= e && (s = o, n.next(i));
    },
    error: (i) => n.error(i),
    complete: () => n.complete()
  });
  return () => r.unsubscribe();
}), kn = (e, t) => new C((n) => {
  const s = (r) => n.active && n.next(r);
  return e.addEventListener(t, s), () => e.removeEventListener(t, s);
}), En = (e) => new C((t) => {
  e.then((n) => {
    t.next(n), t.complete();
  }).catch((n) => t.error(n));
}), In = (e, t) => new C((n) => {
  const s = setTimeout(() => {
    n.next(e), n.complete();
  }, t);
  return () => clearTimeout(s);
}), Tn = (e) => new C((t) => {
  let n = 0;
  const s = setInterval(() => t.next(n++), e);
  return () => clearInterval(s);
}), Pn = (...e) => new C((t) => {
  const n = e.map((s) => s.subscribe({
    next: (r) => t.next(r),
    error: (r) => t.error(r)
  }));
  return () => n.forEach((s) => s.unsubscribe());
}), br = () => h(), O = (e, t) => (n) => {
  const s = b(e), r = (i, o) => s(i, o);
  return m(e, (i) => {
    n.active && (t ? t(i, r, n) : n.next(i));
  }, (i) => n.error(i), () => n.complete());
}, yr = (e, t) => O(e, t), wr = (e, t) => O(e, t), vr = (e, t) => O(new BroadcastChannel(e), t), Cr = (e, t, n) => O(new WebSocket(typeof e == "string" ? e : e.href, t), n), xr = (e) => O("chrome-runtime", e), Sr = (e) => O("service-worker-client", e), kr = (e) => O("service-worker-host", e), Er = (e) => O("self", e);
function Mn(e, t, n) {
  const s = b(e), r = new C((i) => O(e, n)(i));
  return {
    inbound: r,
    outbound: { next: s },
    subscribe: (i) => r.subscribe(i),
    send: (i, o) => s(i, o)
  };
}
function An(e, t) {
  return new C((n) => {
    const s = (r) => n.active && n.next(r);
    return e.addEventListener(t, s), () => e.removeEventListener(t, s);
  });
}
var Ir = {
  channel: (e, t) => new xn(e, t),
  invoker: (e, t, n) => et(e, t, n),
  handler: (e, t) => et(e, t, Sn(t)),
  bidirectional: Mn,
  fromEvent: kn,
  fromPromise: En,
  delay: In,
  interval: Tn,
  merge: Pn,
  when: An
};
function J() {
  if (typeof globalThis.Deno < "u") return "deno";
  if (typeof globalThis.process < "u" && globalThis.process?.versions?.node) return "node";
  const e = globalThis.ServiceWorkerGlobalScope, t = globalThis.SharedWorkerGlobalScope, n = globalThis.DedicatedWorkerGlobalScope;
  if (e && self instanceof e) return "service-worker";
  if (t && self instanceof t) return "shared-worker";
  if (n && self instanceof n) return "worker";
  if (typeof chrome < "u" && chrome.runtime?.id) {
    if (typeof chrome.runtime.getBackgroundPage == "function" || chrome.runtime.getManifest?.()?.background?.service_worker) return "chrome-background";
    if (typeof chrome.devtools < "u") return "chrome-devtools";
    if (typeof document < "u" && globalThis?.location?.protocol === "chrome-extension:" && (chrome.extension?.getViews?.({ type: "popup" }) ?? []).includes(globalThis))
      return "chrome-popup";
    if (typeof document < "u" && globalThis?.location?.protocol !== "chrome-extension:") return "chrome-content";
  }
  return typeof globalThis < "u" && typeof document < "u" ? "window" : "unknown";
}
function tt(e) {
  if (typeof RTCDataChannel < "u" && e instanceof RTCDataChannel) return "rtc-data";
  const t = ie(e);
  return t && t !== "internal" ? t : e === self || e === globalThis || e === "self" ? "self" : "internal";
}
function Rn(e) {
  if (!e) return "unknown";
  if (e.contextType) return e.contextType;
  const t = e.sender ?? "";
  return t.includes("worker") ? "worker" : t.includes("sw") || t.includes("service") ? "service-worker" : t.includes("chrome") || t.includes("crx") ? "chrome-content" : t.includes("background") ? "chrome-background" : "unknown";
}
var qn = {
  get: (e, t) => Reflect.get(e, t),
  set: (e, t, n) => Reflect.set(e, t, n),
  has: (e, t) => Reflect.has(e, t),
  apply: (e, t, n) => Reflect.apply(e, t, n),
  construct: (e, t) => Reflect.construct(e, t),
  deleteProperty: (e, t) => Reflect.deleteProperty(e, t),
  ownKeys: (e) => Reflect.ownKeys(e),
  getOwnPropertyDescriptor: (e, t) => Reflect.getOwnPropertyDescriptor(e, t),
  getPrototypeOf: (e) => Reflect.getPrototypeOf(e),
  setPrototypeOf: (e, t) => Reflect.setPrototypeOf(e, t),
  isExtensible: (e) => Reflect.isExtensible(e),
  preventExtensions: (e) => Reflect.preventExtensions(e)
}, wt = class {
  _channel;
  _contextType;
  constructor(e) {
    this._contextType = e.autoDetect !== !1 ? J() : "unknown", this._channel = I({
      name: e.channel,
      timeout: e.timeout,
      autoListen: !1
    });
  }
  connect(e, t) {
    return this._channel.connect(e, t), this;
  }
  invoke(e, t, n, s = []) {
    return this._channel.invoke(e, t, n, s);
  }
  get(e, t, n) {
    return this._channel.get(e, t, n);
  }
  set(e, t, n, s) {
    return this._channel.set(e, t, n, s);
  }
  call(e, t, n = []) {
    return this._channel.call(e, t, n);
  }
  construct(e, t, n = []) {
    return this._channel.construct(e, t, n);
  }
  importModule(e, t) {
    return this._channel.import(t, e);
  }
  createProxy(e, t = []) {
    return this._channel.proxy(e, t);
  }
  get onResponse() {
    return this._channel.onResponse;
  }
  get contextType() {
    return this._contextType;
  }
  close() {
    this._channel.close();
  }
}, vt = class {
  _channel;
  _contextType;
  constructor(e) {
    this._contextType = e.autoDetect !== !1 ? J() : "unknown", this._channel = I({
      name: e.channel,
      timeout: e.timeout,
      autoListen: !1
    });
  }
  listen(e, t) {
    return this._channel.listen(e, t), this;
  }
  expose(e, t) {
    return this._channel.expose(e, t), this;
  }
  get onInvocation() {
    return this._channel.onInvocation;
  }
  subscribeInvocations(e) {
    return this._channel.onInvocation.subscribe(e);
  }
  get contextType() {
    return this._contextType;
  }
  close() {
    this._channel.close();
  }
}, On = class {
  requestor;
  responder;
  _contextType;
  constructor(e) {
    this._contextType = e.autoDetect !== !1 ? J() : "unknown", this.requestor = new wt(e), this.responder = new vt(e);
  }
  connect(e) {
    return this.requestor.connect(e), this.responder.listen(e), this;
  }
  expose(e, t) {
    return this.responder.expose(e, t), this;
  }
  createProxy(e, t = []) {
    return this.requestor.createProxy(e, t);
  }
  importModule(e, t) {
    return this.requestor.importModule(e, t);
  }
  get contextType() {
    return this._contextType;
  }
  close() {
    this.requestor.close(), this.responder.close();
  }
};
function Tr(e, t) {
  return new wt({
    channel: e,
    ...t
  });
}
function Nn(e, t) {
  return new vt({
    channel: e,
    ...t
  });
}
function Le(e, t) {
  return new On({
    channel: e,
    ...t
  });
}
function Pr(e, t, n) {
  return Le(e, n).connect(t);
}
function Mr(e, t) {
  const n = Le(e, {
    autoDetect: !0,
    ...t
  });
  switch (J()) {
    case "worker":
    case "service-worker":
    case "shared-worker":
      n.connect(self);
      break;
    case "chrome-content":
    case "chrome-background":
    case "chrome-popup":
      n.connect("chrome-runtime");
      break;
  }
  return n;
}
var Ct = /* @__PURE__ */ Symbol.for("uniform.proxy"), xt = /* @__PURE__ */ Symbol.for("uniform.proxy.internals"), Dn = class {
  _invoker;
  _config;
  _childCache = /* @__PURE__ */ new Map();
  constructor(e, t) {
    this._invoker = e, this._config = {
      channel: t.channel,
      basePath: t.basePath ?? [],
      invoker: e,
      cache: t.cache ?? !0,
      timeout: t.timeout ?? 3e4
    };
  }
  get(e, t, n) {
    const s = String(t);
    if (t === Ct) return !0;
    if (t === xt) return this._config;
    if (t === Vn) return !0;
    if (t === Z) return this._getDescriptor();
    if (t === "then" || t === "catch" || t === "finally" || typeof t == "symbol") return;
    if (t === "$path") return this._config.basePath;
    if (t === "$channel") return this._config.channel;
    if (t === "$descriptor") return this._getDescriptor();
    if (t === "$invoke") return this._invoker;
    const r = [...this._config.basePath, s];
    if (this._config.cache && this._childCache.has(s)) return this._childCache.get(s);
    const i = oe(this._invoker, {
      ...this._config,
      basePath: r
    });
    return this._config.cache && this._childCache.set(s, i), i;
  }
  set(e, t, n, s) {
    return typeof t == "symbol" || this._invoker(d.SET, [...this._config.basePath, String(t)], [n]), !0;
  }
  apply(e, t, n) {
    return this._invoker(d.APPLY, this._config.basePath, [n]);
  }
  construct(e, t, n) {
    return this._invoker(d.CONSTRUCT, this._config.basePath, [t]);
  }
  has(e, t) {
    return typeof t == "symbol" ? !1 : this._invoker(d.HAS, this._config.basePath, [t]);
  }
  deleteProperty(e, t) {
    return typeof t == "symbol" ? !0 : this._invoker(d.DELETE_PROPERTY, [...this._config.basePath, String(t)], []);
  }
  ownKeys(e) {
    return [];
  }
  getOwnPropertyDescriptor(e, t) {
    return {
      configurable: !0,
      enumerable: !0,
      writable: !0
    };
  }
  getPrototypeOf(e) {
    return Function.prototype;
  }
  setPrototypeOf(e, t) {
    return this._invoker(d.SET_PROTOTYPE_OF, this._config.basePath, [t]);
  }
  isExtensible(e) {
    return !0;
  }
  preventExtensions(e) {
    return this._invoker(d.PREVENT_EXTENSIONS, this._config.basePath, []);
  }
  _getDescriptor() {
    return {
      path: this._config.basePath,
      channel: this._config.channel,
      primitive: !1
    };
  }
}, Ar = class {
  _dispatch;
  constructor(e) {
    this._dispatch = e;
  }
  get(...e) {
    return this._dispatch(d.GET, e);
  }
  set(...e) {
    return this._dispatch(d.SET, e);
  }
  has(...e) {
    return this._dispatch(d.HAS, e);
  }
  deleteProperty(...e) {
    return this._dispatch(d.DELETE_PROPERTY, e);
  }
  getOwnPropertyDescriptor(...e) {
    return this._dispatch(d.GET_OWN_PROPERTY_DESCRIPTOR, e);
  }
  getPrototypeOf(...e) {
    return this._dispatch(d.GET_PROTOTYPE_OF, e);
  }
  setPrototypeOf(...e) {
    return this._dispatch(d.SET_PROTOTYPE_OF, e);
  }
  isExtensible(...e) {
    return this._dispatch(d.IS_EXTENSIBLE, e);
  }
  preventExtensions(...e) {
    return this._dispatch(d.PREVENT_EXTENSIONS, e);
  }
  ownKeys(...e) {
    return this._dispatch(d.OWN_KEYS, e) ?? [];
  }
  apply(...e) {
    return this._dispatch(d.APPLY, e);
  }
  construct(...e) {
    return this._dispatch(d.CONSTRUCT, e);
  }
};
function oe(e, t) {
  const n = function() {
  }, s = new Dn(e, t);
  return new Proxy(n, s);
}
function St(e, t, n) {
  if (!e || typeof e != "object" || e.primitive) return e;
  const s = nt.get(e);
  if (s) return s;
  const r = oe(t, {
    channel: n ?? e.channel ?? "unknown",
    basePath: e.path ?? []
  });
  return nt.set(e, r), ge.set(r, e), r;
}
function kt(e) {
  if (!e || typeof e != "object" && typeof e != "function") return !1;
  try {
    return Reflect.get(e, Ct) === !0;
  } catch {
    return !1;
  }
}
function Rr(e) {
  return kt(e) ? e.$descriptor ?? null : null;
}
function qr(e) {
  if (!kt(e)) return null;
  try {
    const t = Reflect.get(e, xt);
    return !t || typeof t != "object" ? null : t;
  } catch {
    return null;
  }
}
function Ln(e, t) {
  return Jn(e, t);
}
function Bn(e, t = []) {
  return oe((s, r, i) => e.request({
    id: h(),
    channel: e.channelName,
    sender: e.senderId ?? "proxy",
    type: "request",
    payload: {
      action: s,
      path: r,
      args: i
    }
  }), {
    channel: e.channelName,
    basePath: t
  });
}
var Wn = class {
  _config = {};
  _invoker = null;
  channel(e) {
    return this._config.channel = e, this;
  }
  path(e) {
    return this._config.basePath = e, this;
  }
  invoker(e) {
    return this._invoker = e, this;
  }
  timeout(e) {
    return this._config.timeout = e, this;
  }
  cache(e) {
    return this._config.cache = e, this;
  }
  build() {
    if (!this._invoker) throw new Error("Invoker is required. Call .invoker() before .build()");
    if (!this._config.channel) throw new Error("Channel is required. Call .channel() before .build()");
    return oe(this._invoker, this._config);
  }
};
function Or() {
  return new Wn();
}
var $n = St;
function Fn(e) {
  return [
    e.localChannel,
    e.remoteChannel,
    e.sender,
    e.transportType,
    e.direction
  ].join("::");
}
function jn(e, t = {}) {
  const n = t.includeClosed ?? !1, s = t.status ?? (n ? void 0 : "active");
  return [...e].filter((r) => !(s && r.status !== s || t.channel && r.localChannel !== t.channel && r.remoteChannel !== t.channel || t.localChannel && r.localChannel !== t.localChannel || t.remoteChannel && r.remoteChannel !== t.remoteChannel || t.sender && r.sender !== t.sender || t.transportType && r.transportType !== t.transportType || t.direction && r.direction !== t.direction)).sort((r, i) => i.updatedAt - r.updatedAt);
}
var Et = class {
  _createId;
  _emitEvent;
  _connections = /* @__PURE__ */ new Map();
  constructor(e, t) {
    this._createId = e, this._emitEvent = t;
  }
  register(e) {
    const t = Fn(e), n = Date.now(), s = this._connections.get(t);
    if (s)
      return s.updatedAt = n, s.status = "active", s.metadata = {
        ...s.metadata,
        ...e.metadata
      }, s;
    const r = {
      id: this._createId(),
      localChannel: e.localChannel,
      remoteChannel: e.remoteChannel,
      sender: e.sender,
      transportType: e.transportType,
      direction: e.direction,
      status: "active",
      createdAt: n,
      updatedAt: n,
      metadata: e.metadata
    };
    return this._connections.set(t, r), this._emitEvent?.({
      type: "connected",
      connection: r,
      timestamp: n
    }), r;
  }
  markNotified(e, t) {
    const n = Date.now();
    e.lastNotifyAt = n, e.updatedAt = n, this._emitEvent?.({
      type: "notified",
      connection: e,
      timestamp: n,
      payload: t
    });
  }
  closeByChannel(e) {
    const t = Date.now();
    for (const n of this._connections.values())
      n.localChannel !== e && n.remoteChannel !== e || n.status !== "closed" && (n.status = "closed", n.updatedAt = t, this._emitEvent?.({
        type: "disconnected",
        connection: n,
        timestamp: t
      }));
  }
  closeAll() {
    const e = Date.now();
    for (const t of this._connections.values())
      t.status !== "closed" && (t.status = "closed", t.updatedAt = e, this._emitEvent?.({
        type: "disconnected",
        connection: t,
        timestamp: e
      }));
  }
  query(e = {}) {
    return jn(this._connections.values(), e);
  }
  values() {
    return [...this._connections.values()];
  }
  clear() {
    this._connections.clear();
  }
}, It = class {
  _name;
  _contextType;
  _config;
  _transports = /* @__PURE__ */ new Map();
  _defaultTransport = null;
  _connectionEvents = new _({ bufferSize: 200 });
  _connectionRegistry = new Et(() => h(), (e) => this._connectionEvents.next(e));
  _pending = /* @__PURE__ */ new Map();
  _subscriptions = [];
  _inbound = new _({ bufferSize: 100 });
  _outbound = new _({ bufferSize: 100 });
  _invocations = new _({ bufferSize: 100 });
  _responses = new _({ bufferSize: 100 });
  _exposed = /* @__PURE__ */ new Map();
  _proxyCache = /* @__PURE__ */ new WeakMap();
  __getPrivate(e) {
    return this[e];
  }
  __setPrivate(e, t) {
    this[e] = t;
  }
  constructor(e) {
    const t = typeof e == "string" ? { name: e } : e;
    this._name = t.name, this._contextType = t.autoDetect !== !1 ? J() : "unknown", this._config = {
      name: t.name,
      autoDetect: t.autoDetect ?? !0,
      timeout: t.timeout ?? 3e4,
      reflect: t.reflect ?? qn,
      bufferSize: t.bufferSize ?? 100,
      autoListen: t.autoListen ?? !0
    }, this._config.autoListen && this._isWorkerContext() && this.listen(self);
  }
  connect(e, t = {}) {
    const n = tt(e), s = t.targetChannel ?? this._inferTargetChannel(e, n), r = this._createTransportBinding(e, n, s, t);
    this._transports.set(s, r), this._defaultTransport || (this._defaultTransport = r);
    const i = this._registerConnection({
      localChannel: this._name,
      remoteChannel: s,
      sender: this._name,
      transportType: n,
      direction: "outgoing",
      metadata: { phase: "connect" }
    });
    return this._emitConnectionSignal(r, "connect", {
      connectionId: i.id,
      from: this._name,
      to: s
    }), this;
  }
  listen(e, t = {}) {
    const n = tt(e), s = t.targetChannel ?? this._inferTargetChannel(e, n), r = (o) => this._handleIncoming(o), i = this._registerConnection({
      localChannel: this._name,
      remoteChannel: s,
      sender: s,
      transportType: n,
      direction: "incoming",
      metadata: { phase: "listen" }
    });
    switch (n) {
      case "worker":
      case "message-port":
      case "broadcast":
        t.autoStart !== !1 && e.start && e.start(), e.addEventListener?.("message", ((o) => r(o.data)));
        break;
      case "websocket":
        e.addEventListener?.("message", ((o) => {
          try {
            r(JSON.parse(o.data));
          } catch {
          }
        }));
        break;
      case "chrome-runtime":
        chrome.runtime.onMessage?.addListener?.((o, a, c) => (r(o), !0));
        break;
      case "chrome-tabs":
        chrome.runtime.onMessage?.addListener?.((o, a) => t.tabId != null && a?.tab?.id !== t.tabId ? !1 : (r(o), !0));
        break;
      case "chrome-port":
        e?.onMessage?.addListener?.((o) => {
          r(o);
        });
        break;
      case "chrome-external":
        chrome.runtime.onMessageExternal?.addListener?.((o) => (r(o), !0));
        break;
      case "self":
        addEventListener?.("message", ((o) => r(o.data)));
        break;
      default:
        t.onMessage && t.onMessage(r);
    }
    return this._sendSignalToTarget(e, n, {
      connectionId: i.id,
      from: this._name,
      to: s,
      tabId: t.tabId,
      externalId: t.externalId
    }, "notify"), this;
  }
  attach(e, t = {}) {
    return this.connect(e, t);
  }
  expose(e, t) {
    const n = [e];
    return be(n, t), this._exposed.set(e, {
      name: e,
      obj: t,
      path: n
    }), this;
  }
  exposeAll(e) {
    for (const [t, n] of Object.entries(e)) this.expose(t, n);
    return this;
  }
  async import(e, t) {
    return this.invoke(t ?? this._getDefaultTarget(), d.IMPORT, [], [e]);
  }
  invoke(e, t, n, s = []) {
    const r = h(), i = Promise.withResolvers();
    this._pending.set(r, i);
    const o = setTimeout(() => {
      this._pending.has(r) && (this._pending.delete(r), i.reject(/* @__PURE__ */ new Error(`Request timeout: ${t} on ${n.join(".")}`)));
    }, this._config.timeout), a = {
      id: r,
      channel: e,
      sender: this._name,
      type: "request",
      payload: {
        channel: e,
        sender: this._name,
        action: t,
        path: n,
        args: s
      },
      timestamp: Date.now()
    };
    return this._send(e, a), this._outbound.next(a), i.promise.finally(() => clearTimeout(o));
  }
  get(e, t, n) {
    return this.invoke(e, d.GET, t, [n]);
  }
  set(e, t, n, s) {
    return this.invoke(e, d.SET, t, [n, s]);
  }
  call(e, t, n = []) {
    return this.invoke(e, d.APPLY, t, [n]);
  }
  construct(e, t, n = []) {
    return this.invoke(e, d.CONSTRUCT, t, [n]);
  }
  proxy(e, t = []) {
    const n = e ?? this._getDefaultTarget();
    return this._createProxy(n, t);
  }
  remote(e, t) {
    return this.proxy(t, [e]);
  }
  wrapDescriptor(e, t) {
    return St(e, (s, r, i) => {
      const o = t ?? e?.channel ?? this._getDefaultTarget();
      return this.invoke(o, s, r, i);
    }, t ?? e?.channel ?? this._getDefaultTarget());
  }
  subscribe(e) {
    return this._inbound.subscribe(e);
  }
  next(e) {
    this._send(e.channel, e), this._outbound.next(e);
  }
  emit(e, t, n) {
    const s = {
      id: h(),
      channel: e,
      sender: this._name,
      type: "event",
      payload: {
        type: t,
        data: n
      },
      timestamp: Date.now()
    };
    this.next(s);
  }
  notify(e, t = {}, n = "notify") {
    const s = this._transports.get(e);
    return s ? (this._emitConnectionSignal(s, n, {
      from: this._name,
      to: e,
      ...t
    }), !0) : !1;
  }
  get onMessage() {
    return this._inbound;
  }
  get onOutbound() {
    return this._outbound;
  }
  get onInvocation() {
    return this._invocations;
  }
  get onResponse() {
    return this._responses;
  }
  get onConnection() {
    return this._connectionEvents;
  }
  subscribeConnections(e) {
    return this._connectionEvents.subscribe(e);
  }
  queryConnections(e = {}) {
    return this._connectionRegistry.query(e);
  }
  notifyConnections(e = {}, t = {}) {
    let n = 0;
    const s = this.queryConnections({
      ...t,
      status: "active",
      includeClosed: !1
    });
    for (const r of s) {
      const i = this._transports.get(r.remoteChannel);
      i && (this._emitConnectionSignal(i, "notify", {
        connectionId: r.id,
        from: this._name,
        to: r.remoteChannel,
        ...e
      }), n++);
    }
    return n;
  }
  get name() {
    return this._name;
  }
  get contextType() {
    return this._contextType;
  }
  get config() {
    return this._config;
  }
  get connectedChannels() {
    return [...this._transports.keys()];
  }
  get exposedModules() {
    return [...this._exposed.keys()];
  }
  close() {
    this._subscriptions.forEach((e) => e.unsubscribe()), this._subscriptions = [], this._pending.clear(), this._markAllConnectionsClosed();
    for (const e of this._transports.values()) {
      try {
        e.cleanup?.();
      } catch {
      }
      if (e.transportType === "message-port" || e.transportType === "broadcast") try {
        e.target?.close?.();
      } catch {
      }
    }
    this._transports.clear(), this._defaultTransport = null, this._connectionRegistry.clear(), this._inbound.complete(), this._outbound.complete(), this._invocations.complete(), this._responses.complete(), this._connectionEvents.complete();
  }
  _handleIncoming(e) {
    if (!(!e || typeof e != "object"))
      switch (this._inbound.next(e), e.type) {
        case "request":
          e.channel === this._name && this._handleRequest(e);
          break;
        case "response":
          this._handleResponse(e);
          break;
        case "event":
          break;
        case "signal":
          this._handleSignal(e);
          break;
      }
  }
  _handleResponse(e) {
    const t = e.reqId ?? e.id, n = this._pending.get(t);
    if (n) {
      if (this._pending.delete(t), e.payload?.error) n.reject(new Error(e.payload.error));
      else {
        const s = e.payload?.result, r = e.payload?.descriptor;
        s != null ? n.resolve(s) : r ? n.resolve(this.wrapDescriptor(r, e.sender)) : n.resolve(void 0);
      }
      this._responses.next({
        id: t,
        channel: e.channel,
        sender: e.sender,
        result: e.payload?.result,
        descriptor: e.payload?.descriptor,
        timestamp: Date.now()
      });
    }
  }
  async _handleRequest(e) {
    const t = e.payload;
    if (!t) return;
    const { action: n, path: s, args: r, sender: i } = t, o = e.reqId ?? e.id;
    this._invocations.next({
      id: o,
      channel: this._name,
      sender: i,
      action: n,
      path: s,
      args: r ?? [],
      timestamp: Date.now(),
      contextType: Rn(e)
    });
    const { result: a, toTransfer: c, newPath: l } = await this._executeAction(n, s, r ?? [], i);
    await this._sendResponse(o, n, i, l, a, c);
  }
  async _executeAction(e, t, n, s) {
    const { result: r, toTransfer: i, path: o } = Dt(e, t, n, {
      channel: this._name,
      sender: s,
      reflect: this._config.reflect
    });
    return {
      result: await r,
      toTransfer: i,
      newPath: o
    };
  }
  async _sendResponse(e, t, n, s, r, i) {
    const { response: o, transfer: a } = await Lt(e, t, this._name, n, s, r, i), c = {
      id: e,
      ...o,
      timestamp: Date.now(),
      transferable: a
    };
    this._send(n, c, a);
  }
  _handleSignal(e) {
    const t = e?.payload ?? {}, n = t.from ?? e.sender ?? "unknown", s = e.transportType ?? this._transports.get(e.channel)?.transportType ?? "internal", r = this._registerConnection({
      localChannel: this._name,
      remoteChannel: n,
      sender: e.sender ?? n,
      transportType: s,
      direction: "incoming"
    });
    this._markConnectionNotified(r, t);
  }
  _registerConnection(e) {
    return this._connectionRegistry.register(e);
  }
  _markConnectionNotified(e, t) {
    this._connectionRegistry.markNotified(e, t);
  }
  _emitConnectionSignal(e, t, n = {}) {
    const s = {
      id: h(),
      type: "signal",
      channel: e.targetChannel,
      sender: this._name,
      transportType: e.transportType,
      payload: {
        type: t,
        from: this._name,
        to: e.targetChannel,
        ...n
      },
      timestamp: Date.now()
    };
    (e?.sender ?? e?.postMessage)?.call(e, s);
    const r = this._registerConnection({
      localChannel: this._name,
      remoteChannel: e.targetChannel,
      sender: this._name,
      transportType: e.transportType,
      direction: "outgoing"
    });
    this._markConnectionNotified(r, s.payload);
  }
  _sendSignalToTarget(e, t, n, s) {
    const r = {
      id: h(),
      type: "signal",
      channel: n.to ?? this._name,
      sender: this._name,
      transportType: t,
      payload: {
        type: s,
        ...n
      },
      timestamp: Date.now()
    };
    try {
      if (t === "websocket") {
        e?.send?.(JSON.stringify(r));
        return;
      }
      if (t === "chrome-runtime") {
        chrome.runtime?.sendMessage?.(r);
        return;
      }
      if (t === "chrome-tabs") {
        const i = n.tabId;
        i != null && chrome.tabs?.sendMessage?.(i, r);
        return;
      }
      if (t === "chrome-port") {
        e?.postMessage?.(r);
        return;
      }
      if (t === "chrome-external") {
        n.externalId && chrome.runtime?.sendMessage?.(n.externalId, r);
        return;
      }
      e?.postMessage?.(r, { transfer: [] });
    } catch {
    }
  }
  _markAllConnectionsClosed() {
    this._connectionRegistry.closeAll();
  }
  _createTransportBinding(e, t, n, s) {
    let r, i;
    switch (t) {
      case "worker":
      case "message-port":
      case "broadcast":
        s.autoStart !== !1 && e.start && e.start(), r = (o, a) => e.postMessage(o, { transfer: a });
        {
          const o = ((a) => this._handleIncoming(a.data));
          e.addEventListener?.("message", o), i = () => e.removeEventListener?.("message", o);
        }
        break;
      case "websocket":
        r = (o) => e.send(JSON.stringify(o));
        {
          const o = ((a) => {
            try {
              this._handleIncoming(JSON.parse(a.data));
            } catch {
            }
          });
          e.addEventListener?.("message", o), i = () => e.removeEventListener?.("message", o);
        }
        break;
      case "chrome-runtime":
        r = (o) => chrome.runtime.sendMessage(o);
        {
          const o = (a) => this._handleIncoming(a);
          chrome.runtime.onMessage?.addListener?.(o), i = () => chrome.runtime.onMessage?.removeListener?.(o);
        }
        break;
      case "chrome-tabs":
        r = (o) => {
          s.tabId != null && chrome.tabs?.sendMessage?.(s.tabId, o);
        };
        {
          const o = (a, c) => s.tabId != null && c?.tab?.id !== s.tabId ? !1 : (this._handleIncoming(a), !0);
          chrome.runtime.onMessage?.addListener?.(o), i = () => chrome.runtime.onMessage?.removeListener?.(o);
        }
        break;
      case "chrome-port":
        if (e?.postMessage && e?.onMessage?.addListener) {
          r = (a) => e.postMessage(a);
          const o = (a) => this._handleIncoming(a);
          e.onMessage.addListener(o), i = () => {
            try {
              e.onMessage.removeListener(o);
            } catch {
            }
            try {
              e.disconnect?.();
            } catch {
            }
          };
        } else {
          const o = s.portName ?? n, a = s.tabId != null && chrome.tabs?.connect ? chrome.tabs.connect(s.tabId, { name: o }) : chrome.runtime.connect({ name: o });
          r = (l) => a.postMessage(l);
          const c = (l) => this._handleIncoming(l);
          a.onMessage.addListener(c), i = () => {
            try {
              a.onMessage.removeListener(c);
            } catch {
            }
            try {
              a.disconnect();
            } catch {
            }
          };
        }
        break;
      case "chrome-external":
        r = (o) => {
          s.externalId && chrome.runtime.sendMessage(s.externalId, o);
        };
        {
          const o = (a) => (this._handleIncoming(a), !0);
          chrome.runtime.onMessageExternal?.addListener?.(o), i = () => chrome.runtime.onMessageExternal?.removeListener?.(o);
        }
        break;
      case "self":
        r = (o, a) => globalThis.postMessage?.(o, { transfer: a ?? [] });
        {
          const o = ((a) => this._handleIncoming(a.data));
          globalThis.addEventListener?.("message", o), i = () => globalThis.removeEventListener?.("message", o);
        }
        break;
      default:
        s.onMessage && (i = s.onMessage((o) => this._handleIncoming(o))), r = (o) => e?.postMessage?.(o);
    }
    return {
      target: e,
      targetChannel: n,
      transportType: t,
      sender: r,
      cleanup: i,
      postMessage: (o, a) => r?.(o, a),
      start: () => e?.start?.(),
      close: () => e?.close?.()
    };
  }
  _send(e, t, n) {
    const s = this._transports.get(e) ?? this._defaultTransport;
    (s?.sender ?? s?.postMessage)?.call(s, t, n);
  }
  _getDefaultTarget() {
    return this._defaultTransport ? this._defaultTransport.targetChannel : "worker";
  }
  _inferTargetChannel(e, t) {
    return t === "worker" ? "worker" : t === "broadcast" && e.name ? e.name : t === "self" ? "self" : `${t}-${h().slice(0, 8)}`;
  }
  _createProxy(e, t) {
    return oe((s, r, i) => this.invoke(e, s, r, i), {
      channel: e,
      basePath: t,
      cache: !0,
      timeout: this._config.timeout
    });
  }
  _isWorkerContext() {
    return [
      "worker",
      "shared-worker",
      "service-worker"
    ].includes(this._contextType);
  }
};
function I(e) {
  return new It(e);
}
function Nr(e, t, n) {
  return I({
    name: e,
    ...n
  }).attach(t, n);
}
function Dr(e, t, n) {
  const s = new MessageChannel();
  return s.port1.start(), s.port2.start(), {
    channel1: I({
      name: e,
      autoListen: !1,
      ...n
    }).attach(s.port1, { targetChannel: t }),
    channel2: I({
      name: t,
      autoListen: !1,
      ...n
    }).attach(s.port2, { targetChannel: e }),
    messageChannel: s
  };
}
var Q = /* @__PURE__ */ new Map();
function Lr(e, t) {
  return Q.has(e) || Q.set(e, I({
    name: e,
    ...t
  })), Q.get(e);
}
function Br() {
  return [...Q.keys()];
}
function Wr(e) {
  const t = Q.get(e);
  return t ? (t.close(), Q.delete(e)) : !1;
}
var he = null;
function ae() {
  if (!he) {
    const e = J();
    [
      "worker",
      "shared-worker",
      "service-worker"
    ].includes(e) ? he = I({
      name: "worker",
      autoListen: !0
    }) : he = I({
      name: "host",
      autoListen: !1
    });
  }
  return he;
}
function $r(e, t) {
  ae().expose(e, t);
}
function Fr(e, t) {
  return ae().remote(e, t);
}
var Tt = (e, t = null) => ae().proxy(e), jr = (e, t, n = {}) => Tt(t, null), Ur = (e, t, n = {}) => ae().wrapDescriptor(e, e?.channel ?? n?.connectChannel);
function Hr(e, t) {
  const n = I({
    name: t,
    autoListen: !1
  });
  return n.connect(e, { targetChannel: t }), {
    observable: n,
    wrap: (s, r) => n.proxy(s),
    subscribe: (s) => n.subscribe(s),
    send: (s) => n.next(s),
    request: (s) => n.invoke(t, d.CALL, [], [s])
  };
}
var S = {
  rjb: "rejectBy",
  rvb: "resolveBy",
  rj: "reject",
  rv: "resolve",
  cr: "create",
  cs: "createSync",
  a: "array",
  ta: "typedarray",
  udf: "undefined"
}, zr = [
  typeof ArrayBuffer != S.udf ? ArrayBuffer : null,
  typeof MessagePort != S.udf ? MessagePort : null,
  typeof ReadableStream != S.udf ? ReadableStream : null,
  typeof WritableStream != S.udf ? WritableStream : null,
  typeof TransformStream != S.udf ? TransformStream : null,
  typeof WebTransportReceiveStream != S.udf ? WebTransportReceiveStream : null,
  typeof WebTransportSendStream != S.udf ? WebTransportSendStream : null,
  typeof AudioData != S.udf ? AudioData : null,
  typeof ImageBitmap != S.udf ? ImageBitmap : null,
  typeof VideoFrame != S.udf ? VideoFrame : null,
  typeof OffscreenCanvas != S.udf ? OffscreenCanvas : null,
  typeof RTCDataChannel != S.udf ? RTCDataChannel : null
].filter((e) => e != null), Pt = () => {
  try {
    const e = globalThis?.ServiceWorkerGlobalScope;
    return typeof e < "u" && globalThis instanceof e;
  } catch {
    return !1;
  }
}, Un = () => {
  try {
    return typeof chrome < "u" && !!chrome?.runtime?.id;
  } catch {
    return !1;
  }
}, Be = () => {
  if (Un()) return "chrome-extension";
  if (Pt()) return "service-worker";
  try {
    if (typeof document < "u") return "main";
  } catch {
  }
  return "unknown";
}, Hn = () => {
  if (Pt()) return !1;
  try {
    return typeof Worker < "u";
  } catch {
    return !1;
  }
};
function Mt() {
  try {
    const e = globalThis.location?.href;
    if (typeof e == "string" && e.length > 0) return e;
  } catch {
  }
  try {
    if (typeof document < "u" && typeof document.baseURI == "string" && document.baseURI.length > 0) return document.baseURI;
  } catch {
  }
  return "";
}
function q(e) {
  const t = Mt();
  if (!t.length) throw new TypeError("[uniform] No base URL for worker resolution (missing location / document.baseURI)");
  const n = e.startsWith("/") ? e.replace(/^\//, "./") : e;
  return new URL(n, t).href;
}
var Se = /* @__PURE__ */ new Map(), v = {
  name: "unknown",
  instance: null
}, ke = /* @__PURE__ */ new Map(), At = (e) => [...Object.values(d)].includes(e), Gr = (e) => {
  if (e instanceof Worker) return e;
  if (e instanceof URL) return new Worker(e.href, { type: "module" });
  if (typeof e == "function") try {
    return new e({ type: "module" });
  } catch {
    return e({ type: "module" });
  }
  return typeof e == "string" ? e.startsWith("/") ? new Worker(q(e.replace(/^\//, "./")), { type: "module" }) : URL.canParse(e) || e.startsWith("./") ? new Worker(q(e), { type: "module" }) : new Worker(URL.createObjectURL(new Blob([e], { type: "application/javascript" })), { type: "module" }) : e instanceof Blob || e instanceof File ? new Worker(URL.createObjectURL(e), { type: "module" }) : e ?? (typeof self < "u" ? self : null);
}, Rt = class {
  channelName;
  options;
  _channel;
  constructor(e, t = {}) {
    this.channelName = e, this.options = t, this._channel = ae();
  }
  request(e, t, n, s = {}) {
    return typeof e == "string" && (e = [e]), Array.isArray(t) && At(e) && (s = n, n = t, t = e, e = []), this._channel.invoke(this.channelName, t, e, n);
  }
  doImportModule(e, t) {
    return this._channel.import(e, this.channelName);
  }
}, zn = class {
  channel;
  options;
  _unified;
  broadcasts = {};
  constructor(e, t = {}) {
    this.channel = e, this.options = t, this._unified = I({
      name: e,
      autoListen: !1
    }), v.name = e, v.instance = this;
  }
  createRemoteChannel(e, t = {}, n) {
    return n && (this._unified.attach(n, { targetChannel: e }), this.broadcasts[e] = n), Promise.resolve(new Rt(e, t));
  }
  getChannel() {
    return this.channel;
  }
  request(e, t, n, s = {}, r = "worker") {
    return typeof e == "string" && (e = [e]), Array.isArray(t) && At(e) && (r = s, s = n, n = t, t = e, e = []), this._unified.invoke(r, t, e, n);
  }
  resolveResponse(e, t) {
    return Promise.resolve(t);
  }
  async handleAndResponse(e, t, n) {
    const s = await Fe(e, t, this.channel);
    s && n?.(s.response, s.transfer);
  }
  close() {
    this._unified.close();
  }
}, We = (e = "$host$") => {
  if (v?.instance && e === "$host$") return v.instance;
  if (ke.has(e)) return ke.get(e) ?? null;
  const t = new zn(e);
  return e === "$host$" && (v.name = e, v.instance = t), ke.set(e, t), t;
}, qt = (e = "$host$") => We(e), X = (e, t = {}, n = typeof self < "u" ? self : null) => {
  const s = qt(e ?? "$host$");
  return s?.createRemoteChannel?.(e, t, n) ?? s;
}, Vr = (e, t = {}, n) => {
  if (e == null || n) return;
  if (Se.has(e)) return Se.get(e);
  const s = {
    channel: e,
    instance: v.instance,
    remote: Promise.resolve(new Rt(e, t))
  };
  return Se.set(e, s), s;
}, me = /* @__PURE__ */ new WeakMap(), ge = /* @__PURE__ */ new WeakMap(), nt = /* @__PURE__ */ new WeakMap(), Qr = (e, t) => me.get(e)?.[t], Gn = (e, t = v?.name, n) => typeof e == "object" && e != null || typeof e == "function" && e != null ? ge.has(e) ? ge.get(e) : me.has(e) ? me.get(e) : Ne(e) || n?.includes?.(e) || t == v?.name ? e : {
  $isDescriptor: !0,
  path: W.get(e) ?? (() => {
    const s = [h()];
    return be(s, e), s;
  })(),
  owner: v?.name,
  channel: t,
  primitive: A(e),
  writable: !0,
  enumerable: !0,
  configurable: !0,
  argumentCount: e instanceof Function ? e.length : -1
} : L(e) ? e : null, Vn = /* @__PURE__ */ Symbol.for("@requestHandler"), Z = /* @__PURE__ */ Symbol.for("@descriptor"), Ee = (e) => L(e) || e?.[Z] ? e : e?.$isDescriptor ? $n(e, async () => {
}) : Ne(e) ? e : null, Qn = (e) => typeof e != "function" && typeof e != "object" || e == null ? e : ge.get(e) ?? me.get(e) ?? e, ue = (e) => {
  if (typeof e != "object" && typeof e != "function" || e == null || (e = Qn(e), typeof e != "object" && typeof e != "function" || e == null)) return e;
  if (Array.isArray(e)) return e.map(ue);
  if (e instanceof Map) return new Map(Array.from(e.entries()).map(([t, n]) => [t, ue(n)]));
  if (e instanceof Set) return new Set(Array.from(e.values()).map(ue));
  if (typeof e == "object") for (const t of Object.keys(e)) e[t] = ue(e[t]);
  return e;
}, re = /* @__PURE__ */ new Map(), W = /* @__PURE__ */ new WeakMap(), $e = (e, t) => {
  if (t != null && !Array.isArray(t) && (t = [t]), t == null || t?.length < 1) return e;
  const n = e?.[Z] ?? (e?.$isDescriptor ? e : null);
  if (n && n?.owner == v?.name && (e = U(n?.path) ?? e), A(e)) return e;
  for (const s of t)
    if (e = e?.[s], e == null) return e;
  return e;
}, U = (e) => {
  if (e != null && !Array.isArray(e) && (e = [e]), e == null || e?.length < 1) return null;
  const t = re?.get?.(e?.[0]) ?? null;
  return t != null ? $e(t, e?.slice?.(1)) : null;
}, be = (e, t) => {
  const n = t?.[Z] ?? (t?.$isDescriptor ? t : null);
  if (n && n?.owner == v?.name && (t = U(n?.path) ?? t), e != null && !Array.isArray(e) && (e = [e]), e == null || e?.length < 1) return null;
  const s = re?.get?.(e?.[0]) ?? null;
  return e?.length > 1 ? $e(s, e?.slice?.(1, -1))[e?.[e?.length - 1]] = t : re?.set?.(e?.[0], t), (typeof t == "object" || typeof t == "function") && W?.set?.(t, e), t;
}, Ot = (e) => {
  if (e != null && !Array.isArray(e) && (e = [e]), e == null || e?.length < 1) return !1;
  const t = re?.get?.(e?.[0]) ?? null;
  return !t && e?.length <= 1 ? (re?.delete?.(e?.[0]), !0) : !1;
}, Kn = (e) => {
  const t = e?.[Z] ?? (e?.$isDescriptor ? e : null);
  t && t?.owner == v?.name && (e = U(t?.path) ?? e);
  const n = W?.get?.(e) ?? t?.path;
  return n == null || n?.length < 1 ? !1 : (Ot(n), (typeof e == "object" || typeof e == "function") && W?.delete?.(e), !0);
}, Yn = (e) => {
  const t = e?.[Z] ?? (e?.$isDescriptor ? e : null);
  return (W?.get?.(e) ?? t?.path) == null;
}, D = (e) => (typeof e == "object" || typeof e == "function") && e != null, Nt = {
  get: (e, t) => e?.[t],
  set: (e, t, n) => (e[t] = n, !0),
  has: (e, t) => t in e,
  apply: (e, t, n) => e.apply(t, n),
  construct: (e, t) => new e(...t),
  deleteProperty: (e, t) => delete e[t],
  ownKeys: (e) => Object.keys(e),
  getOwnPropertyDescriptor: (e, t) => Object.getOwnPropertyDescriptor(e, t),
  getPrototypeOf: (e) => Object.getPrototypeOf(e),
  setPrototypeOf: (e, t) => Object.setPrototypeOf(e, t),
  isExtensible: (e) => Object.isExtensible(e),
  preventExtensions: (e) => Object.preventExtensions(e)
};
function Dt(e, t, n, s = {}) {
  const { channel: r = "", sender: i = "", reflect: o = Nt } = s, a = s.target ?? U(t), c = [];
  let l = null, u = t;
  switch (String(e).toLowerCase()) {
    case "import":
    case d.IMPORT:
      l = import(
        /* @vite-ignore */
        n?.[0]
      );
      break;
    case "transfer":
    case d.TRANSFER:
      Re(a) && r !== i && c.push(a), l = a;
      break;
    case "get":
    case d.GET: {
      const p = n?.[0], w = o.get?.(a, p) ?? a?.[p];
      l = typeof w == "function" && a != null ? w.bind(a) : w, u = [...t, String(p)];
      break;
    }
    case "set":
    case d.SET: {
      const [p, w] = n, k = B(w, Ee);
      s.target ? l = o.set?.(a, p, k) ?? (a[p] = k, !0) : l = o.set?.(a, p, k) ?? be([...t, String(p)], k);
      break;
    }
    case "apply":
    case "call":
    case d.APPLY:
    case d.CALL:
      if (typeof a == "function") {
        const p = s.context ?? (s.target ? void 0 : U(t.slice(0, -1))), w = B(n?.[0] ?? n ?? [], Ee);
        l = o.apply?.(a, p, w) ?? a.apply(p, w), Re(l) && t?.at(-1) === "transfer" && r !== i && c.push(l);
      }
      break;
    case "construct":
    case d.CONSTRUCT:
      if (typeof a == "function") {
        const p = B(n?.[0] ?? n ?? [], Ee);
        l = o.construct?.(a, p) ?? new a(...p);
      }
      break;
    case "delete":
    case "deleteproperty":
    case "dispose":
    case d.DELETE:
    case d.DELETE_PROPERTY:
    case d.DISPOSE:
      if (s.target) {
        const p = t[t.length - 1];
        l = o.deleteProperty?.(a, p) ?? delete a[p];
      } else
        l = t?.length > 0 ? Ot(t) : Kn(a), l && (u = W.get(a) ?? []);
      break;
    case "has":
    case d.HAS:
      l = o.has?.(a, n?.[0]) ?? (D(a) ? n?.[0] in a : !1);
      break;
    case "ownkeys":
    case d.OWN_KEYS:
      l = o.ownKeys?.(a) ?? (D(a) ? Object.keys(a) : []);
      break;
    case "getownpropertydescriptor":
    case "getpropertydescriptor":
    case d.GET_OWN_PROPERTY_DESCRIPTOR:
    case d.GET_PROPERTY_DESCRIPTOR:
      l = o.getOwnPropertyDescriptor?.(a, n?.[0] ?? t?.at(-1) ?? "") ?? (D(a) ? Object.getOwnPropertyDescriptor(a, n?.[0] ?? t?.at(-1) ?? "") : void 0);
      break;
    case "getprototypeof":
    case d.GET_PROTOTYPE_OF:
      l = o.getPrototypeOf?.(a) ?? (D(a) ? Object.getPrototypeOf(a) : null);
      break;
    case "setprototypeof":
    case d.SET_PROTOTYPE_OF:
      l = o.setPrototypeOf?.(a, n?.[0]) ?? (D(a) ? Object.setPrototypeOf(a, n?.[0]) : !1);
      break;
    case "isextensible":
    case d.IS_EXTENSIBLE:
      l = o.isExtensible?.(a) ?? (D(a) ? Object.isExtensible(a) : !0);
      break;
    case "preventextensions":
    case d.PREVENT_EXTENSIONS:
      l = o.preventExtensions?.(a) ?? (D(a) ? Object.preventExtensions(a) : !1);
      break;
  }
  return {
    result: l,
    toTransfer: c,
    path: u
  };
}
async function Lt(e, t, n, s, r, i, o) {
  const a = await i, c = Re(a) && o.includes(a) || L(a);
  let l = r;
  !c && t !== "get" && t !== d.GET && (typeof a == "object" || typeof a == "function") && (Yn(a) ? (l = [h()], be(l, a)) : l = W.get(a) ?? []);
  const u = U(l), p = t === "get" || t === d.GET ? l?.at(-1) : void 0, w = U(r), k = B(a, (un) => Gn(un, n, o)) ?? a;
  return {
    response: {
      channel: s,
      sender: n,
      reqId: e,
      action: t,
      type: "response",
      payload: {
        result: c ? k : null,
        type: typeof a,
        channel: s,
        sender: n,
        descriptor: {
          $isDescriptor: !0,
          path: l,
          owner: n,
          channel: n,
          primitive: A(a),
          writable: !0,
          enumerable: !0,
          configurable: !0,
          argumentCount: w instanceof Function ? w.length : -1,
          ...D(u) && p != null ? Object.getOwnPropertyDescriptor(u, p) : {}
        }
      }
    },
    transfer: o
  };
}
async function Fe(e, t, n, s) {
  const { channel: r, sender: i, path: o, action: a, args: c } = e;
  if (r !== n) return null;
  const { result: l, toTransfer: u, path: p } = Dt(a, o, c, {
    channel: r,
    sender: i,
    ...s
  });
  return Lt(t, a, n, i, p, l, u);
}
function Jn(e, t = Nt) {
  return async (n, s, r) => {
    let i = e, o = e;
    for (let c = 0; c < s.length; c++)
      if (i = o, o = o?.[s[c]], o === void 0 && c < s.length - 1) throw new Error(`Path segment '${s[c]}' not found`);
    const a = s[s.length - 1];
    switch (String(n).toLowerCase()) {
      case "get":
      case d.GET:
        return o;
      case "set":
      case d.SET:
        return i[a] = r[0], !0;
      case "call":
      case "apply":
      case d.APPLY:
      case d.CALL:
        if (typeof o == "function") {
          const c = Array.isArray(r[0]) ? r[0] : r;
          return await o.apply(i, c);
        }
        throw new Error(`'${a}' is not a function`);
      case "construct":
      case d.CONSTRUCT:
        if (typeof o == "function") {
          const c = Array.isArray(r[0]) ? r[0] : r;
          return new o(...c);
        }
        throw new Error(`'${a}' is not a constructor`);
      case "has":
      case d.HAS:
        return a in i;
      case "delete":
      case "deleteproperty":
      case d.DELETE_PROPERTY:
        return delete i[a];
      case "ownkeys":
      case d.OWN_KEYS:
        return Object.keys(o ?? i);
      default:
        return o;
    }
  };
}
var Xn = class {
  _name;
  _transportType;
  _id = h();
  _state = "disconnected";
  _inbound = new _({ bufferSize: 1e3 });
  _outbound = new _({ bufferSize: 1e3 });
  _stateChanges = new _();
  _connectedPeers = /* @__PURE__ */ new Map();
  _subs = [];
  _stats = {
    messagesSent: 0,
    messagesReceived: 0,
    bytesTransferred: 0,
    latencyMs: 0,
    uptime: 0,
    reconnectCount: 0
  };
  _startTime = 0;
  _pending = /* @__PURE__ */ new Map();
  _buffer = [];
  _opts;
  constructor(e, t = "internal", n = {}) {
    this._name = e, this._transportType = t, this._opts = {
      timeout: 3e4,
      autoReconnect: !0,
      reconnectInterval: 1e3,
      maxReconnectAttempts: 5,
      bufferMessages: !0,
      bufferSize: 1e3,
      metadata: {},
      ...n
    }, this._setupSubscriptions();
  }
  subscribe(e, t) {
    return (t ? yt((n) => n.sender === t)(this._inbound) : this._inbound).subscribe(typeof e == "function" ? { next: e } : e);
  }
  next(e) {
    if (this._state !== "connected") {
      this._opts.bufferMessages && this._buffer.length < this._opts.bufferSize && this._buffer.push(e);
      return;
    }
    this._outbound.next(e), this._stats.messagesSent++;
  }
  async request(e, t, n = {}) {
    const s = h(), r = Promise.withResolvers();
    this._pending.set(s, r);
    const i = setTimeout(() => {
      this._pending.has(s) && (this._pending.delete(s), r.reject(/* @__PURE__ */ new Error("Request timeout")));
    }, n.timeout ?? this._opts.timeout);
    return this.next({
      id: h(),
      channel: e,
      sender: this._name,
      type: "request",
      reqId: s,
      payload: {
        ...t,
        action: n.action,
        path: n.path
      },
      timestamp: Date.now()
    }), r.promise.finally(() => clearTimeout(i));
  }
  respond(e, t) {
    this.next({
      id: h(),
      channel: e.sender,
      sender: this._name,
      type: "response",
      reqId: e.reqId,
      payload: t,
      timestamp: Date.now()
    });
  }
  emit(e, t, n) {
    this.next({
      id: h(),
      channel: e,
      sender: this._name,
      type: "event",
      payload: {
        type: t,
        data: n
      },
      timestamp: Date.now()
    });
  }
  subscribeOutbound(e) {
    return this._outbound.subscribe(typeof e == "function" ? { next: e } : e);
  }
  pushInbound(e) {
    if (this._stats.messagesReceived++, e.type === "response" && e.reqId) {
      const t = this._pending.get(e.reqId);
      if (t) {
        this._pending.delete(e.reqId), t.resolve(e.payload);
        return;
      }
    }
    this._inbound.next(e);
  }
  async connect() {
    this._state !== "connected" && (this._setState("connecting"), this._startTime = Date.now(), this._setState("connected"), this._flushBuffer());
  }
  disconnect() {
    this._state === "disconnected" || this._state === "closed" || (this._setState("disconnected"), this._subs.forEach((e) => e.unsubscribe()), this._subs = []);
  }
  close() {
    this.disconnect(), this._setState("closed"), this._inbound.complete(), this._outbound.complete(), this._stateChanges.complete();
  }
  markConnected() {
    this._setState("connected"), this._flushBuffer();
  }
  markDisconnected() {
    this._setState("disconnected");
  }
  _setState(e) {
    this._state !== e && (this._state = e, this._stateChanges.next(e));
  }
  _flushBuffer() {
    for (const e of this._buffer) this._outbound.next(e);
    this._buffer = [];
  }
  _setupSubscriptions() {
    this._subs.push(this._inbound.subscribe({ next: (e) => {
      e.type === "signal" && e.payload?.type === "connect" && this._connectedPeers.set(e.sender, {
        name: e.sender,
        state: "connected",
        isHost: !1
      });
    } }));
  }
  get id() {
    return this._id;
  }
  get name() {
    return this._name;
  }
  get state() {
    return this._state;
  }
  get transportType() {
    return this._transportType;
  }
  get stats() {
    return {
      ...this._stats,
      uptime: this._startTime ? Date.now() - this._startTime : 0
    };
  }
  get stateChanges() {
    return this._stateChanges;
  }
  get connectedPeers() {
    return [...this._connectedPeers.keys()];
  }
  get meta() {
    return {
      id: this._id,
      name: this._name,
      state: this._state,
      isHost: !1,
      connectedChannels: new Set(this._connectedPeers.keys())
    };
  }
}, Zn = class ne {
  _connections = /* @__PURE__ */ new Map();
  static _instance = null;
  static getInstance() {
    return ne._instance || (ne._instance = new ne()), ne._instance;
  }
  getOrCreate(t, n = "internal", s = {}) {
    return this._connections.has(t) || this._connections.set(t, new Xn(t, n, s)), this._connections.get(t);
  }
  get(t) {
    return this._connections.get(t);
  }
  has(t) {
    return this._connections.has(t);
  }
  delete(t) {
    return this._connections.get(t)?.close(), this._connections.delete(t);
  }
  clear() {
    this._connections.forEach((t) => t.close()), this._connections.clear();
  }
  get size() {
    return this._connections.size;
  }
  get names() {
    return [...this._connections.keys()];
  }
}, je = () => Zn.getInstance(), Bt = (e, t, n) => je().getOrCreate(e, t, n), Kr = (e = "$host$", t) => Bt(e, "internal", {
  ...t,
  metadata: {
    ...t?.metadata,
    isHost: !0
  }
}), T = class {
  _channelName;
  _transportType;
  _options;
  _subscriptions = [];
  _isAttached = !1;
  _inbound = new _({ bufferSize: 100 });
  _outbound = new _({ bufferSize: 100 });
  _incomingConnections = new _({ bufferSize: 50 });
  _acceptCallback = null;
  constructor(e, t, n = {}) {
    this._channelName = e, this._transportType = t, this._options = n;
  }
  detach() {
    this._subscriptions.forEach((e) => e.unsubscribe()), this._subscriptions = [], this._isAttached = !1;
  }
  subscribe(e) {
    return this._inbound.subscribe(e);
  }
  send(e, t) {
    this._outbound.next({
      ...e,
      transferable: t
    });
  }
  get onIncomingConnection() {
    return this._incomingConnections;
  }
  subscribeIncoming(e) {
    return this._incomingConnections.subscribe(e);
  }
  setAcceptCallback(e) {
    this._acceptCallback = e;
  }
  _emitIncomingConnection(e) {
    this._incomingConnections.next(e);
  }
  async _shouldAcceptConnection(e) {
    return this._acceptCallback ? this._acceptCallback(e) : !0;
  }
  get channelName() {
    return this._channelName;
  }
  get isAttached() {
    return this._isAttached;
  }
  get inbound() {
    return this._inbound;
  }
  get outbound() {
    return this._outbound;
  }
}, es = class extends T {
  _workerSource;
  _worker = null;
  _cleanup = null;
  _ownWorker = !1;
  constructor(e, t, n = {}) {
    super(e, "worker", n), this._workerSource = t;
  }
  attach() {
    if (this._isAttached) return;
    this._worker = this._resolveWorker();
    const e = b(this._worker);
    this._cleanup = m(this._worker, (t) => this._handleIncoming(t), (t) => this._inbound.error(t)), this._subscriptions.push(this._outbound.subscribe((t) => e(t, t.transferable))), this._isAttached = !0;
  }
  detach() {
    this._cleanup?.(), this._ownWorker && this._worker && this._worker.terminate(), this._worker = null, super.detach();
  }
  requestChannel(e, t, n, s) {
    const r = s ? [s] : [];
    this._worker?.postMessage({
      type: "createChannel",
      channel: e,
      sender: t,
      options: n,
      messagePort: s,
      reqId: h()
    }, { transfer: r });
  }
  connectChannel(e, t, n, s) {
    const r = n ? [n] : [];
    this._worker?.postMessage({
      type: "connectChannel",
      channel: e,
      sender: t,
      port: n,
      options: s,
      reqId: h()
    }, { transfer: r });
  }
  listChannels() {
    return new Promise((e) => {
      const t = h(), n = (r) => {
        const i = r;
        i.type === "channelList" && i.reqId === t && (s.unsubscribe(), e(i.channels ?? []));
      }, s = this._inbound.subscribe(n);
      this._worker?.postMessage({
        type: "listChannels",
        reqId: t
      }), setTimeout(() => {
        s.unsubscribe(), e([]);
      }, 5e3);
    });
  }
  _handleIncoming(e) {
    (e?.type === "channelCreated" || e?.type === "channelConnected") && this._emitIncomingConnection({
      id: e.reqId ?? h(),
      channel: e.channel,
      sender: e.sender ?? "worker",
      transportType: "worker",
      data: e,
      timestamp: Date.now()
    }), this._inbound.next(e);
  }
  _resolveWorker() {
    if (this._workerSource instanceof Worker) return this._workerSource;
    if (this._ownWorker = !0, typeof this._workerSource == "function") return this._workerSource();
    if (this._workerSource instanceof URL) return new Worker(this._workerSource.href, { type: "module" });
    if (typeof this._workerSource == "string")
      return this._workerSource.startsWith("/") ? new Worker(q(this._workerSource.replace(/^\//, "./")), { type: "module" }) : URL.canParse(this._workerSource) || this._workerSource.startsWith("./") ? new Worker(q(this._workerSource), { type: "module" }) : new Worker(URL.createObjectURL(new Blob([this._workerSource], { type: "application/javascript" })), { type: "module" });
    throw new Error("Invalid worker source");
  }
  get worker() {
    return this._worker;
  }
}, ts = class extends T {
  _port;
  _cleanup = null;
  constructor(e, t, n = {}) {
    super(e, "message-port", n), this._port = t;
  }
  attach() {
    if (this._isAttached) return;
    const e = b(this._port);
    this._cleanup = m(this._port, (t) => this._inbound.next(t)), this._subscriptions.push(this._outbound.subscribe((t) => e(t, t.transferable))), this._isAttached = !0;
  }
  detach() {
    this._cleanup?.(), this._port.close(), super.detach();
  }
  get port() {
    return this._port;
  }
}, ns = class extends T {
  _bcName;
  _channel = null;
  _cleanup = null;
  _connectedPeers = /* @__PURE__ */ new Set();
  constructor(e, t, n = {}) {
    super(e, "broadcast", n), this._bcName = t;
  }
  attach() {
    if (this._isAttached) return;
    this._channel = new BroadcastChannel(this._bcName ?? this._channelName);
    const e = b(this._channel);
    this._cleanup = m(this._channel, (t) => {
      t?.sender !== this._channelName && this._handleIncoming(t);
    }), this._subscriptions.push(this._outbound.subscribe((t) => e(t))), this._isAttached = !0, this._announcePresence();
  }
  _handleIncoming(e) {
    if (e?.type === "announce" || e?.type === "connect") {
      const t = e.sender ?? "unknown", n = !this._connectedPeers.has(t);
      this._connectedPeers.add(t), n && (this._emitIncomingConnection({
        id: e.reqId ?? h(),
        channel: e.channel ?? this._channelName,
        sender: t,
        transportType: "broadcast",
        data: e,
        timestamp: Date.now()
      }), e.type === "announce" && this._channel?.postMessage({
        type: "announce-ack",
        channel: this._channelName,
        sender: this._channelName
      }));
    }
    this._inbound.next(e);
  }
  _announcePresence() {
    this._channel?.postMessage({
      type: "announce",
      channel: this._channelName,
      sender: this._channelName,
      timestamp: Date.now()
    });
  }
  get connectedPeers() {
    return [...this._connectedPeers];
  }
  detach() {
    this._cleanup?.(), this._channel?.close(), this._channel = null, this._connectedPeers.clear(), super.detach();
  }
}, ss = class extends T {
  _url;
  _protocols;
  _ws = null;
  _cleanup = null;
  _pending = [];
  _state = new _();
  _connectedChannels = /* @__PURE__ */ new Set();
  constructor(e, t, n, s = {}) {
    super(e, "websocket", s), this._url = t, this._protocols = n;
  }
  attach() {
    if (this._isAttached) return;
    const e = typeof this._url == "string" ? this._url : this._url.href;
    this._ws = new WebSocket(e, this._protocols), this._state.next("connecting");
    const t = (n) => {
      if (this._ws?.readyState === WebSocket.OPEN) {
        const { transferable: s, ...r } = n;
        this._ws.send(JSON.stringify(r));
      } else this._pending.push(n);
    };
    this._ws.addEventListener("open", () => {
      this._state.next("open"), this._pending.forEach((n) => t(n)), this._pending = [], this._emitIncomingConnection({
        id: h(),
        channel: this._channelName,
        sender: "server",
        transportType: "websocket",
        timestamp: Date.now()
      });
    }), this._cleanup = m(this._ws, (n) => this._handleIncoming(n), (n) => this._inbound.error(n), () => {
      this._state.next("closed"), this._inbound.complete();
    }), this._subscriptions.push(this._outbound.subscribe((n) => t(n))), this._isAttached = !0;
  }
  _handleIncoming(e) {
    if (e?.type === "channel-connect" || e?.type === "peer-connect" || e?.type === "join") {
      const t = e.channel ?? e.room ?? this._channelName;
      this._connectedChannels.has(t) || (this._connectedChannels.add(t), this._emitIncomingConnection({
        id: e.id ?? h(),
        channel: t,
        sender: e.sender ?? e.peerId ?? "remote",
        transportType: "websocket",
        data: e,
        timestamp: Date.now()
      }));
    }
    this._inbound.next(e);
  }
  joinChannel(e) {
    this.send({
      id: h(),
      type: "join",
      channel: e,
      sender: this._channelName,
      timestamp: Date.now()
    });
  }
  leaveChannel(e) {
    this._connectedChannels.delete(e), this.send({
      id: h(),
      type: "leave",
      channel: e,
      sender: this._channelName,
      timestamp: Date.now()
    });
  }
  get connectedChannels() {
    return [...this._connectedChannels];
  }
  detach() {
    this._cleanup?.(), this._ws?.close(), this._ws = null, this._connectedChannels.clear(), super.detach();
  }
  get ws() {
    return this._ws;
  }
  get state() {
    return this._state;
  }
}, rs = class extends T {
  _cleanup = null;
  constructor(e, t = {}) {
    super(e, "chrome-runtime", t);
  }
  attach() {
    if (this._isAttached || typeof chrome > "u" || !chrome.runtime) return;
    const e = b("chrome-runtime");
    this._cleanup = m("chrome-runtime", (t) => this._inbound.next(t), void 0), this._subscriptions.push(this._outbound.subscribe((t) => e(t))), this._isAttached = !0;
  }
  detach() {
    this._cleanup?.(), super.detach();
  }
}, is = class extends T {
  _tabId;
  _cleanup = null;
  constructor(e, t, n = {}) {
    super(e, "chrome-tabs", n), this._tabId = t;
  }
  attach() {
    if (this._isAttached || typeof chrome > "u" || !chrome.tabs) return;
    const e = (t) => {
      if (this._tabId != null) {
        const { transferable: n, ...s } = t;
        chrome.tabs.sendMessage(this._tabId, s);
      }
    };
    this._cleanup = m("chrome-runtime", (t) => this._inbound.next(t)), this._subscriptions.push(this._outbound.subscribe((t) => e(t))), this._isAttached = !0;
  }
  detach() {
    this._cleanup?.(), super.detach();
  }
  setTabId(e) {
    this._tabId = e;
  }
}, os = class extends T {
  _portName;
  _tabId;
  _cleanup = null;
  _port = null;
  constructor(e, t, n, s = {}) {
    super(e, "chrome-port", s), this._portName = t, this._tabId = n;
  }
  attach() {
    if (this._isAttached || typeof chrome > "u" || !chrome.runtime) return;
    this._port = this._tabId != null && chrome.tabs?.connect ? chrome.tabs.connect(this._tabId, { name: this._portName }) : chrome.runtime.connect({ name: this._portName });
    const e = (n) => this._port?.postMessage(n), t = (n) => this._inbound.next(n);
    this._port.onMessage.addListener(t), this._cleanup = () => {
      try {
        this._port?.onMessage.removeListener(t);
      } catch {
      }
      try {
        this._port?.disconnect();
      } catch {
      }
      this._port = null;
    }, this._subscriptions.push(this._outbound.subscribe((n) => e(n))), this._isAttached = !0;
  }
  detach() {
    this._cleanup?.(), super.detach();
  }
}, as = class extends T {
  _externalId;
  _cleanup = null;
  constructor(e, t, n = {}) {
    super(e, "chrome-external", n), this._externalId = t;
  }
  attach() {
    if (this._isAttached || typeof chrome > "u" || !chrome.runtime) return;
    const e = (n) => chrome.runtime.sendMessage(this._externalId, n), t = (n) => (this._inbound.next(n), !1);
    chrome.runtime.onMessageExternal?.addListener?.(t), this._cleanup = () => chrome.runtime.onMessageExternal?.removeListener?.(t), this._subscriptions.push(this._outbound.subscribe((n) => e(n))), this._isAttached = !0;
  }
  detach() {
    this._cleanup?.(), super.detach();
  }
}, cs = class extends T {
  _isHost;
  _cleanup = null;
  constructor(e, t = !1, n = {}) {
    super(e, "service-worker", n), this._isHost = t;
  }
  attach() {
    if (this._isAttached) return;
    const e = this._isHost ? "service-worker-host" : "service-worker-client", t = b(e);
    this._cleanup = m(e, (n) => this._inbound.next(n)), this._subscriptions.push(this._outbound.subscribe((n) => t(n, n.transferable))), this._isAttached = !0;
  }
  detach() {
    this._cleanup?.(), super.detach();
  }
}, ls = class extends T {
  _cleanup = null;
  constructor(e, t = {}) {
    super(e, "self", t);
  }
  attach() {
    if (this._isAttached) return;
    const e = b("self");
    this._cleanup = m("self", (t) => this._handleIncoming(t)), this._subscriptions.push(this._outbound.subscribe((t) => e(t, t.transferable))), this._isAttached = !0;
  }
  _handleIncoming(e) {
    (e?.type === "createChannel" || e?.type === "connectChannel") && this._emitIncomingConnection({
      id: e.reqId ?? h(),
      channel: e.channel,
      sender: e.sender ?? "unknown",
      transportType: "self",
      port: e.messagePort ?? e.port,
      data: e,
      timestamp: Date.now()
    }), this._inbound.next(e);
  }
  notifyChannelCreated(e, t, n) {
    postMessage({
      type: "channelCreated",
      channel: e,
      sender: t,
      reqId: n,
      timestamp: Date.now()
    });
  }
  detach() {
    this._cleanup?.(), super.detach();
  }
}, Yr = {
  worker: (e, t, n) => new es(e, t, n),
  messagePort: (e, t, n) => new ts(e, t, n),
  broadcast: (e, t, n) => new ns(e, t, n),
  websocket: (e, t, n, s) => new ss(e, t, n, s),
  chromeRuntime: (e, t) => new rs(e, t),
  chromeTabs: (e, t, n) => new is(e, t, n),
  chromePort: (e, t, n, s) => new os(e, t, n, s),
  chromeExternal: (e, t, n) => new as(e, t, n),
  serviceWorker: (e, t, n) => new cs(e, t, n),
  self: (e, t) => new ls(e, t)
};
function Jr(e) {
  const t = [], n = new _({ bufferSize: 100 });
  for (const s of e) s.subscribeIncoming((r) => {
    t.push(r), n.next(r);
  });
  return {
    subscribe: (s) => n.subscribe(s),
    getConnections: () => [...t]
  };
}
var hs = "uniform_channels", us = 1, f = {
  MESSAGES: "messages",
  MAILBOX: "mailbox",
  PENDING: "pending",
  EXCHANGE: "exchange",
  TRANSACTIONS: "transactions"
}, ds = class {
  _db = null;
  _isOpen = !1;
  _openPromise = null;
  _channelName;
  _messageUpdates = new _();
  _exchangeUpdates = new _();
  constructor(e) {
    this._channelName = e;
  }
  async open() {
    return this._db && this._isOpen ? this._db : this._openPromise ? this._openPromise : (this._openPromise = new Promise((e, t) => {
      const n = indexedDB.open(hs, us);
      n.onerror = () => {
        this._openPromise = null, t(/* @__PURE__ */ new Error("Failed to open IndexedDB"));
      }, n.onsuccess = () => {
        this._db = n.result, this._isOpen = !0, this._openPromise = null, e(this._db);
      }, n.onupgradeneeded = (s) => {
        const r = s.target.result;
        this._createStores(r);
      };
    }), this._openPromise);
  }
  close() {
    this._db && (this._db.close(), this._db = null, this._isOpen = !1);
  }
  _createStores(e) {
    if (!e.objectStoreNames.contains(f.MESSAGES)) {
      const t = e.createObjectStore(f.MESSAGES, { keyPath: "id" });
      t.createIndex("channel", "channel", { unique: !1 }), t.createIndex("status", "status", { unique: !1 }), t.createIndex("recipient", "recipient", { unique: !1 }), t.createIndex("createdAt", "createdAt", { unique: !1 }), t.createIndex("channel_status", ["channel", "status"], { unique: !1 });
    }
    if (!e.objectStoreNames.contains(f.MAILBOX)) {
      const t = e.createObjectStore(f.MAILBOX, { keyPath: "id" });
      t.createIndex("channel", "channel", { unique: !1 }), t.createIndex("priority", "priority", { unique: !1 }), t.createIndex("expiresAt", "expiresAt", { unique: !1 });
    }
    if (!e.objectStoreNames.contains(f.PENDING)) {
      const t = e.createObjectStore(f.PENDING, { keyPath: "id" });
      t.createIndex("channel", "channel", { unique: !1 }), t.createIndex("createdAt", "createdAt", { unique: !1 });
    }
    if (!e.objectStoreNames.contains(f.EXCHANGE)) {
      const t = e.createObjectStore(f.EXCHANGE, { keyPath: "id" });
      t.createIndex("key", "key", { unique: !0 }), t.createIndex("owner", "owner", { unique: !1 });
    }
    e.objectStoreNames.contains(f.TRANSACTIONS) || e.createObjectStore(f.TRANSACTIONS, { keyPath: "id" }).createIndex("createdAt", "createdAt", { unique: !1 });
  }
  async defer(e, t = {}) {
    const n = await this.open(), s = {
      id: h(),
      channel: e.channel,
      sender: e.sender ?? this._channelName,
      recipient: e.channel,
      type: e.type,
      payload: e.payload,
      status: "pending",
      priority: t.priority ?? 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      expiresAt: t.expiresIn ? Date.now() + t.expiresIn : null,
      retryCount: 0,
      maxRetries: t.maxRetries ?? 3,
      metadata: t.metadata
    };
    return new Promise((r, i) => {
      const o = n.transaction([f.MESSAGES, f.MAILBOX], "readwrite"), a = o.objectStore(f.MESSAGES), c = o.objectStore(f.MAILBOX);
      a.add(s), c.add(s), o.oncomplete = () => {
        this._messageUpdates.next(s), r(s.id);
      }, o.onerror = () => i(/* @__PURE__ */ new Error("Failed to defer message"));
    });
  }
  async getDeferredMessages(e, t = {}) {
    const n = await this.open();
    return new Promise((s, r) => {
      const i = n.transaction(f.MESSAGES, "readonly").objectStore(f.MESSAGES), o = t.status ? i.index("channel_status") : i.index("channel"), a = t.status ? IDBKeyRange.only([e, t.status]) : IDBKeyRange.only(e), c = o.getAll(a, t.limit);
      c.onsuccess = () => {
        let l = c.result;
        t.offset && (l = l.slice(t.offset)), s(l);
      }, c.onerror = () => r(/* @__PURE__ */ new Error("Failed to get deferred messages"));
    });
  }
  async processNextPending(e) {
    const t = await this.open();
    return new Promise((n, s) => {
      const r = t.transaction(f.MESSAGES, "readwrite").objectStore(f.MESSAGES).index("channel_status").openCursor(IDBKeyRange.only([e, "pending"]));
      r.onsuccess = () => {
        const i = r.result;
        if (i) {
          const o = i.value;
          o.status = "processing", o.updatedAt = Date.now(), i.update(o), this._messageUpdates.next(o), n(o);
        } else n(null);
      }, r.onerror = () => s(/* @__PURE__ */ new Error("Failed to process pending message"));
    });
  }
  async markDelivered(e) {
    await this._updateMessageStatus(e, "delivered");
  }
  async markFailed(e) {
    const t = await this.open();
    return new Promise((n, s) => {
      const r = t.transaction(f.MESSAGES, "readwrite").objectStore(f.MESSAGES), i = r.get(e);
      i.onsuccess = () => {
        const o = i.result;
        if (!o) {
          n(!1);
          return;
        }
        o.retryCount++, o.updatedAt = Date.now(), o.retryCount < o.maxRetries ? o.status = "pending" : o.status = "failed", r.put(o), this._messageUpdates.next(o), n(o.status === "pending");
      }, i.onerror = () => s(/* @__PURE__ */ new Error("Failed to mark message as failed"));
    });
  }
  async _updateMessageStatus(e, t) {
    const n = await this.open();
    return new Promise((s, r) => {
      const i = n.transaction(f.MESSAGES, "readwrite").objectStore(f.MESSAGES), o = i.get(e);
      o.onsuccess = () => {
        const a = o.result;
        a && (a.status = t, a.updatedAt = Date.now(), i.put(a), this._messageUpdates.next(a)), s();
      }, o.onerror = () => r(/* @__PURE__ */ new Error("Failed to update message status"));
    });
  }
  async getMailbox(e, t = {}) {
    const n = await this.open();
    return new Promise((s, r) => {
      const i = n.transaction(f.MAILBOX, "readonly").objectStore(f.MAILBOX).index("channel").getAll(IDBKeyRange.only(e), t.limit);
      i.onsuccess = () => {
        let o = i.result;
        t.sortBy === "priority" ? o.sort((a, c) => c.priority - a.priority) : o.sort((a, c) => c.createdAt - a.createdAt), s(o);
      }, i.onerror = () => r(/* @__PURE__ */ new Error("Failed to get mailbox"));
    });
  }
  async getMailboxStats(e) {
    const t = await this.getDeferredMessages(e), n = {
      total: t.length,
      pending: 0,
      processing: 0,
      delivered: 0,
      failed: 0,
      expired: 0
    }, s = Date.now();
    for (const r of t) r.expiresAt && r.expiresAt < s ? n.expired++ : n[r.status]++;
    return n;
  }
  async clearMailbox(e) {
    const t = await this.open();
    return new Promise((n, s) => {
      const r = t.transaction(f.MAILBOX, "readwrite"), i = r.objectStore(f.MAILBOX).index("channel");
      let o = 0;
      const a = i.openCursor(IDBKeyRange.only(e));
      a.onsuccess = () => {
        const c = a.result;
        c && (c.delete(), o++, c.continue());
      }, r.oncomplete = () => n(o), r.onerror = () => s(/* @__PURE__ */ new Error("Failed to clear mailbox"));
    });
  }
  async registerPending(e) {
    const t = await this.open(), n = {
      id: h(),
      channel: this._channelName,
      type: e.type,
      data: e.data,
      metadata: e.metadata,
      createdAt: Date.now(),
      status: "pending"
    };
    return new Promise((s, r) => {
      const i = t.transaction(f.PENDING, "readwrite");
      i.objectStore(f.PENDING).add(n), i.oncomplete = () => s(n.id), i.onerror = () => r(/* @__PURE__ */ new Error("Failed to register pending operation"));
    });
  }
  async getPendingOperations() {
    const e = await this.open();
    return new Promise((t, n) => {
      const s = e.transaction(f.PENDING, "readonly").objectStore(f.PENDING).index("channel").getAll(IDBKeyRange.only(this._channelName));
      s.onsuccess = () => t(s.result), s.onerror = () => n(/* @__PURE__ */ new Error("Failed to get pending operations"));
    });
  }
  async completePending(e) {
    const t = await this.open();
    return new Promise((n, s) => {
      const r = t.transaction(f.PENDING, "readwrite");
      r.objectStore(f.PENDING).delete(e), r.oncomplete = () => n(), r.onerror = () => s(/* @__PURE__ */ new Error("Failed to complete pending operation"));
    });
  }
  async awaitPending(e, t = {}) {
    const n = t.timeout ?? 3e4, s = t.pollInterval ?? 100, r = Date.now();
    for (; Date.now() - r < n; ) {
      const i = await this._getPendingById(e);
      if (!i) return null;
      if (i.status === "completed")
        return await this.completePending(e), i.result;
      await new Promise((o) => setTimeout(o, s));
    }
    throw new Error(`Pending operation ${e} timed out`);
  }
  async _getPendingById(e) {
    const t = await this.open();
    return new Promise((n, s) => {
      const r = t.transaction(f.PENDING, "readonly").objectStore(f.PENDING).get(e);
      r.onsuccess = () => n(r.result ?? null), r.onerror = () => s(/* @__PURE__ */ new Error("Failed to get pending operation"));
    });
  }
  async exchangePut(e, t, n = {}) {
    const s = await this.open(), r = {
      id: h(),
      key: e,
      value: t,
      owner: this._channelName,
      sharedWith: n.sharedWith ?? ["*"],
      version: 1,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    return new Promise((i, o) => {
      const a = s.transaction(f.EXCHANGE, "readwrite"), c = a.objectStore(f.EXCHANGE), l = c.index("key").get(e);
      l.onsuccess = () => {
        const u = l.result;
        u && (r.id = u.id, r.version = u.version + 1, r.createdAt = u.createdAt), c.put(r);
      }, a.oncomplete = () => {
        this._exchangeUpdates.next(r), i(r.id);
      }, a.onerror = () => o(/* @__PURE__ */ new Error("Failed to put exchange data"));
    });
  }
  async exchangeGet(e) {
    const t = await this.open();
    return new Promise((n, s) => {
      const r = t.transaction(f.EXCHANGE, "readonly").objectStore(f.EXCHANGE).index("key").get(e);
      r.onsuccess = () => {
        const i = r.result;
        if (!i) {
          n(null);
          return;
        }
        if (!this._canAccessExchange(i)) {
          n(null);
          return;
        }
        n(i.value);
      }, r.onerror = () => s(/* @__PURE__ */ new Error("Failed to get exchange data"));
    });
  }
  async exchangeDelete(e) {
    const t = await this.open();
    return new Promise((n, s) => {
      const r = t.transaction(f.EXCHANGE, "readwrite"), i = r.objectStore(f.EXCHANGE), o = i.index("key").get(e);
      o.onsuccess = () => {
        const a = o.result;
        if (!a) {
          n(!1);
          return;
        }
        if (a.owner !== this._channelName) {
          n(!1);
          return;
        }
        i.delete(a.id);
      }, r.oncomplete = () => n(!0), r.onerror = () => s(/* @__PURE__ */ new Error("Failed to delete exchange data"));
    });
  }
  async exchangeLock(e, t = {}) {
    const n = await this.open(), s = t.timeout ?? 3e4;
    return new Promise((r, i) => {
      const o = n.transaction(f.EXCHANGE, "readwrite"), a = o.objectStore(f.EXCHANGE), c = a.index("key").get(e);
      c.onsuccess = () => {
        const l = c.result;
        if (!l) {
          r(!1);
          return;
        }
        if (l.lock && l.lock.holder !== this._channelName && l.lock.expiresAt > Date.now()) {
          r(!1);
          return;
        }
        l.lock = {
          holder: this._channelName,
          acquiredAt: Date.now(),
          expiresAt: Date.now() + s
        }, l.updatedAt = Date.now(), a.put(l);
      }, o.oncomplete = () => r(!0), o.onerror = () => i(/* @__PURE__ */ new Error("Failed to acquire lock"));
    });
  }
  async exchangeUnlock(e) {
    const t = await this.open();
    return new Promise((n, s) => {
      const r = t.transaction(f.EXCHANGE, "readwrite"), i = r.objectStore(f.EXCHANGE), o = i.index("key").get(e);
      o.onsuccess = () => {
        const a = o.result;
        a && a.lock?.holder === this._channelName && (delete a.lock, a.updatedAt = Date.now(), i.put(a));
      }, r.oncomplete = () => n(), r.onerror = () => s(/* @__PURE__ */ new Error("Failed to release lock"));
    });
  }
  _canAccessExchange(e) {
    return e.owner === this._channelName || e.sharedWith.includes("*") ? !0 : e.sharedWith.includes(this._channelName);
  }
  async beginTransaction() {
    return new fs(this);
  }
  async executeTransaction(e) {
    const t = await this.open(), n = new Set(e.map((s) => s.store));
    return new Promise((s, r) => {
      const i = t.transaction(Array.from(n), "readwrite");
      for (const o of e) {
        const a = i.objectStore(o.store);
        switch (o.type) {
          case "put":
            o.value !== void 0 && a.put(o.value);
            break;
          case "delete":
            o.key !== void 0 && a.delete(o.key);
            break;
          case "update":
            if (o.key !== void 0) {
              const c = a.get(o.key);
              c.onsuccess = () => {
                c.result && o.value && a.put({
                  ...c.result,
                  ...o.value
                });
              };
            }
            break;
        }
      }
      i.oncomplete = () => s(), i.onerror = () => r(/* @__PURE__ */ new Error("Transaction failed"));
    });
  }
  onMessageUpdate(e) {
    return this._messageUpdates.subscribe({ next: e });
  }
  onExchangeUpdate(e) {
    return this._exchangeUpdates.subscribe({ next: e });
  }
  async cleanupExpired() {
    const e = await this.open(), t = Date.now();
    return new Promise((n, s) => {
      const r = e.transaction([f.MESSAGES, f.MAILBOX], "readwrite"), i = r.objectStore(f.MESSAGES), o = r.objectStore(f.MAILBOX);
      let a = 0;
      const c = i.openCursor();
      c.onsuccess = () => {
        const u = c.result;
        if (u) {
          const p = u.value;
          p.expiresAt && p.expiresAt < t && (u.delete(), a++), u.continue();
        }
      };
      const l = o.openCursor();
      l.onsuccess = () => {
        const u = l.result;
        if (u) {
          const p = u.value;
          p.expiresAt && p.expiresAt < t && (u.delete(), a++), u.continue();
        }
      }, r.oncomplete = () => n(a), r.onerror = () => s(/* @__PURE__ */ new Error("Failed to cleanup expired"));
    });
  }
}, fs = class {
  _storage;
  _operations = [];
  _isCommitted = !1;
  _isRolledBack = !1;
  constructor(e) {
    this._storage = e;
  }
  put(e, t) {
    return this._checkState(), this._operations.push({
      id: h(),
      type: "put",
      store: e,
      value: t,
      timestamp: Date.now()
    }), this;
  }
  delete(e, t) {
    return this._checkState(), this._operations.push({
      id: h(),
      type: "delete",
      store: e,
      key: t,
      timestamp: Date.now()
    }), this;
  }
  update(e, t, n) {
    return this._checkState(), this._operations.push({
      id: h(),
      type: "update",
      store: e,
      key: t,
      value: n,
      timestamp: Date.now()
    }), this;
  }
  async commit() {
    if (this._checkState(), this._operations.length === 0) {
      this._isCommitted = !0;
      return;
    }
    await this._storage.executeTransaction(this._operations), this._isCommitted = !0;
  }
  rollback() {
    this._operations = [], this._isRolledBack = !0;
  }
  get operationCount() {
    return this._operations.length;
  }
  _checkState() {
    if (this._isCommitted) throw new Error("Transaction already committed");
    if (this._isRolledBack) throw new Error("Transaction already rolled back");
  }
}, se = /* @__PURE__ */ new Map();
function Wt(e) {
  return se.has(e) || se.set(e, new ds(e)), se.get(e);
}
function Xr() {
  for (const e of se.values()) e.close();
  se.clear();
}
var st = Mt(), ps = st.length > 0 ? new URL("../transport/Worker.ts", st) : "", $t = class {
  _channel;
  _context;
  _options;
  _connection;
  _storage;
  constructor(e, t, n = {}) {
    this._channel = e, this._context = t, this._options = n, this._connection = Bt(e), this._storage = Wt(e);
  }
  async request(e, t, n, s = {}) {
    let r = typeof e == "string" ? [e] : e, i = t, o = n;
    return Array.isArray(t) && jt(e) && (s = n, o = t, i = e, r = []), this._context.getHost()?.request(r, i, o, s, this._channel);
  }
  async doImportModule(e, t = {}) {
    return this.request([], d.IMPORT, [e], t);
  }
  async deferMessage(e, t = {}) {
    return this._storage.defer({
      channel: this._channel,
      sender: this._context.hostName,
      type: "request",
      payload: e
    }, t);
  }
  async getPendingMessages() {
    return this._storage.getDeferredMessages(this._channel, { status: "pending" });
  }
  get connection() {
    return this._connection;
  }
  get channelName() {
    return this._channel;
  }
  get context() {
    return this._context;
  }
}, N = class {
  _channel;
  _context;
  _options;
  _connection;
  _unified;
  get _forResolves() {
    return this._unified.__getPrivate("_pending");
  }
  get _subscriptions() {
    return this._unified.__getPrivate("_subscriptions");
  }
  get _broadcasts() {
    return this._unified.__getPrivate("_transports");
  }
  constructor(e, t, n = {}) {
    this._channel = e, this._context = t, this._options = n, this._connection = je().getOrCreate(e, "internal", n), this._unified = new It({
      name: e,
      autoListen: !1,
      timeout: n?.timeout
    });
  }
  createRemoteChannel(e, t = {}, n) {
    const s = _s(n ?? this._context.$createOrUseExistingRemote(e, t, n ?? null)?.messageChannel?.port1), r = Ht(s?.target ?? s);
    return this._unified.listen(s?.target, { targetChannel: e }), s && (this._broadcasts?.set?.(e, s), r === "self" && typeof postMessage > "u" || this._unified.connect(s, { targetChannel: e }), this._context.$registerConnection({
      localChannel: this._channel,
      remoteChannel: e,
      sender: this._channel,
      direction: "outgoing",
      transportType: r
    }), this.notifyChannel(e, {
      contextId: this._context.id,
      contextName: this._context.hostName
    }, "connect")), new $t(e, this._context, t);
  }
  getChannel() {
    return this._channel;
  }
  get connection() {
    return this._connection;
  }
  request(e, t, n, s = {}, r = "worker") {
    let i = typeof e == "string" ? [e] : e, o = n;
    return Array.isArray(t) && jt(e) && (r = s, s = n, o = t, t = e, i = []), this._unified.invoke(r, t, i ?? [], Array.isArray(o) ? o : [o]);
  }
  resolveResponse(e, t) {
    this._forResolves.get(e)?.resolve?.(t);
    const n = this._forResolves.get(e)?.promise;
    return this._forResolves.delete(e), n;
  }
  async handleAndResponse(e, t, n) {
  }
  notifyChannel(e, t = {}, n = "notify") {
    return this._unified.notify(e, {
      ...t,
      from: this._channel,
      to: e
    }, n);
  }
  getConnectedChannels() {
    return this._unified.connectedChannels;
  }
  close() {
    this._subscriptions.forEach((e) => e.unsubscribe()), this._forResolves.clear(), this._broadcasts?.values?.()?.forEach((e) => e.close?.()), this._broadcasts?.clear?.(), this._unified.close();
  }
  get unified() {
    return this._unified;
  }
}, Ft = class {
  _options;
  _id = h();
  _hostName;
  _host = null;
  _endpoints = /* @__PURE__ */ new Map();
  _unifiedByChannel = /* @__PURE__ */ new Map();
  _unifiedConnectionSubs = /* @__PURE__ */ new Map();
  _remoteChannels = /* @__PURE__ */ new Map();
  _deferredChannels = /* @__PURE__ */ new Map();
  _connectionEvents = new _({ bufferSize: 200 });
  _connectionRegistry = new Et(() => h(), (e) => this._emitConnectionEvent(e));
  _closed = !1;
  _globalSelf = null;
  constructor(e = {}) {
    this._options = e, this._hostName = e.name ?? `ctx-${this._id.slice(0, 8)}`, e.useGlobalSelf !== !1 && (this._globalSelf = typeof globalThis < "u" ? globalThis : typeof self < "u" ? self : null);
  }
  initHost(e) {
    if (this._host && !e) return this._host;
    const t = e ?? this._hostName;
    if (this._hostName = t, this._endpoints.has(t))
      return this._host = this._endpoints.get(t).handler, this._host;
    this._host = new N(t, this, this._options.defaultOptions);
    const n = {
      name: t,
      handler: this._host,
      connection: this._host.connection,
      subscriptions: [],
      ready: Promise.resolve(null),
      unified: this._host.unified
    };
    return this._endpoints.set(t, n), this._registerUnifiedChannel(t, this._host.unified), this._host;
  }
  getHost() {
    return this._host ?? this.initHost();
  }
  get hostName() {
    return this._hostName;
  }
  get id() {
    return this._id;
  }
  get onConnection() {
    return this._connectionEvents;
  }
  subscribeConnections(e) {
    return this._connectionEvents.subscribe(e);
  }
  notifyConnections(e = {}, t = {}) {
    let n = 0;
    for (const s of this._endpoints.values()) {
      const r = s.handler.getConnectedChannels();
      for (const i of r) {
        if (t.localChannel && t.localChannel !== s.name || t.remoteChannel && t.remoteChannel !== i) continue;
        const o = this.queryConnections({
          localChannel: s.name,
          remoteChannel: i,
          status: "active"
        })[0];
        t.sender && o?.sender !== t.sender || t.transportType && o?.transportType !== t.transportType || t.channel && t.channel !== s.name && t.channel !== i || s.handler.notifyChannel(i, e, "notify") && n++;
      }
    }
    return n;
  }
  queryConnections(e = {}) {
    return this._connectionRegistry.query(e).map((t) => ({
      ...t,
      contextId: this._id
    }));
  }
  createChannel(e, t = {}) {
    if (this._endpoints.has(e)) return this._endpoints.get(e);
    const n = new N(e, this, {
      ...this._options.defaultOptions,
      ...t
    }), s = {
      name: e,
      handler: n,
      connection: n.connection,
      subscriptions: [],
      ready: Promise.resolve(null),
      unified: n.unified
    };
    return this._endpoints.set(e, s), this._registerUnifiedChannel(e, n.unified), s;
  }
  createChannels(e, t = {}) {
    const n = /* @__PURE__ */ new Map();
    for (const s of e) n.set(s, this.createChannel(s, t));
    return n;
  }
  getChannel(e) {
    return this._endpoints.get(e);
  }
  getOrCreateChannel(e, t = {}) {
    return this._endpoints.get(e) ?? this.createChannel(e, t);
  }
  hasChannel(e) {
    return this._endpoints.has(e);
  }
  getChannelNames() {
    return [...this._endpoints.keys()];
  }
  get size() {
    return this._endpoints.size;
  }
  defer(e, t) {
    this._deferredChannels.set(e, t);
  }
  async initDeferred(e) {
    const t = this._deferredChannels.get(e);
    if (!t) return null;
    const n = await t();
    return this._endpoints.set(e, n), this._deferredChannels.delete(e), n;
  }
  isDeferred(e) {
    return this._deferredChannels.has(e);
  }
  async getChannelAsync(e) {
    return this._endpoints.has(e) ? this._endpoints.get(e) : this._deferredChannels.has(e) ? this.initDeferred(e) : null;
  }
  async addWorker(e, t, n = {}) {
    const s = rt(t);
    if (!s) throw new Error(`Failed to create worker for channel: ${e}`);
    const r = new N(e, this, {
      ...this._options.defaultOptions,
      ...n
    }), i = r.createRemoteChannel(e, n, s), o = {
      name: e,
      handler: r,
      connection: r.connection,
      subscriptions: [],
      transportType: "worker",
      ready: Promise.resolve(i),
      unified: r.unified
    };
    return this._endpoints.set(e, o), this._registerUnifiedChannel(e, r.unified), this._remoteChannels.set(e, {
      channel: e,
      context: this,
      remote: Promise.resolve(i),
      transport: s,
      transportType: "worker"
    }), o;
  }
  async addPort(e, t, n = {}) {
    const s = new N(e, this, {
      ...this._options.defaultOptions,
      ...n
    });
    t.start?.();
    const r = s.createRemoteChannel(e, n, t), i = {
      name: e,
      handler: s,
      connection: s.connection,
      subscriptions: [],
      transportType: "message-port",
      ready: Promise.resolve(r),
      unified: s.unified
    };
    return this._endpoints.set(e, i), this._registerUnifiedChannel(e, s.unified), this._remoteChannels.set(e, {
      channel: e,
      context: this,
      remote: Promise.resolve(r),
      transport: t,
      transportType: "message-port"
    }), i;
  }
  async addBroadcast(e, t, n = {}) {
    const s = new BroadcastChannel(t ?? e), r = new N(e, this, {
      ...this._options.defaultOptions,
      ...n
    }), i = r.createRemoteChannel(e, n, s), o = {
      name: e,
      handler: r,
      connection: r.connection,
      subscriptions: [],
      transportType: "broadcast",
      ready: Promise.resolve(i),
      unified: r.unified
    };
    return this._endpoints.set(e, o), this._registerUnifiedChannel(e, r.unified), this._remoteChannels.set(e, {
      channel: e,
      context: this,
      remote: Promise.resolve(i),
      transport: s,
      transportType: "broadcast"
    }), o;
  }
  addSelfChannel(e, t = {}) {
    const n = new N(e, this, {
      ...this._options.defaultOptions,
      ...t
    }), s = this._globalSelf ?? (typeof self < "u" ? self : null), r = {
      name: e,
      handler: n,
      connection: n.connection,
      subscriptions: [],
      transportType: "self",
      ready: Promise.resolve(s ? n.createRemoteChannel(e, t, s) : null),
      unified: n.unified
    };
    return this._endpoints.set(e, r), this._registerUnifiedChannel(e, n.unified), r;
  }
  async addTransport(e, t) {
    const n = t.options ?? {};
    switch (t.type) {
      case "worker":
        if (!t.worker) throw new Error("Worker required for worker transport");
        return this.addWorker(e, t.worker, n);
      case "message-port":
        if (!t.port) throw new Error("Port required for message-port transport");
        return this.addPort(e, t.port, n);
      case "broadcast":
        const s = typeof t.broadcast == "string" ? t.broadcast : void 0;
        return this.addBroadcast(e, s, n);
      case "self":
        return this.addSelfChannel(e, n);
      default:
        return this.createChannel(e, n);
    }
  }
  createChannelPair(e, t, n = {}) {
    const s = new MessageChannel(), r = new N(e, this, {
      ...this._options.defaultOptions,
      ...n
    }), i = new N(t, this, {
      ...this._options.defaultOptions,
      ...n
    });
    s.port1.start(), s.port2.start();
    const o = Promise.resolve(r.createRemoteChannel(t, n, s.port1)), a = Promise.resolve(i.createRemoteChannel(e, n, s.port2)), c = {
      name: e,
      handler: r,
      connection: r.connection,
      subscriptions: [],
      transportType: "message-port",
      ready: o,
      unified: r.unified
    }, l = {
      name: t,
      handler: i,
      connection: i.connection,
      subscriptions: [],
      transportType: "message-port",
      ready: a,
      unified: i.unified
    };
    return this._endpoints.set(e, c), this._endpoints.set(t, l), this._registerUnifiedChannel(e, r.unified), this._registerUnifiedChannel(t, i.unified), {
      channel1: c,
      channel2: l,
      messageChannel: s
    };
  }
  get globalSelf() {
    return this._globalSelf;
  }
  async connectRemote(e, t = {}, n) {
    return this.initHost(), this._host.createRemoteChannel(e, t, n);
  }
  async importModuleInChannel(e, t, n = {}, s) {
    return (await this.connectRemote(e, n.channelOptions, s))?.doImportModule?.(t, n.importOptions);
  }
  $createOrUseExistingRemote(e, t = {}, n) {
    if (e == null || n) return null;
    if (this._remoteChannels.has(e)) return this._remoteChannels.get(e);
    const s = new MessageChannel(), r = bt(new Promise((o) => {
      const a = rt(ps);
      a?.addEventListener?.("message", (c) => {
        c.data.type === "channelCreated" && (s.port1?.start?.(), o(new $t(c.data.channel, this, t)));
      }), a?.postMessage?.({
        type: "createChannel",
        channel: e,
        sender: this._hostName,
        options: t,
        messagePort: s.port2
      }, { transfer: [s.port2] });
    })), i = {
      channel: e,
      context: this,
      messageChannel: s,
      remote: r
    };
    return this._remoteChannels.set(e, i), i;
  }
  $registerConnection(e) {
    return {
      ...this._connectionRegistry.register(e),
      contextId: this._id
    };
  }
  $markNotified(e) {
    const t = this._connectionRegistry.register({
      localChannel: e.localChannel,
      remoteChannel: e.remoteChannel,
      sender: e.sender,
      direction: e.direction,
      transportType: e.transportType
    });
    this._connectionRegistry.markNotified(t, e.payload);
  }
  $observeSignal(e) {
    const t = ((e.payload?.type ?? "notify") === "connect", "incoming");
    this.$markNotified({
      localChannel: e.localChannel,
      remoteChannel: e.remoteChannel,
      sender: e.sender,
      direction: t,
      transportType: e.transportType,
      payload: e.payload
    });
  }
  $forwardUnifiedConnectionEvent(e, t) {
    const n = t.connection.transportType ?? "internal", s = this._connectionRegistry.register({
      localChannel: t.connection.localChannel || e,
      remoteChannel: t.connection.remoteChannel,
      sender: t.connection.sender,
      direction: t.connection.direction,
      transportType: n,
      metadata: t.connection.metadata
    });
    t.type === "notified" ? this._connectionRegistry.markNotified(s, t.payload) : t.type === "disconnected" && this._connectionRegistry.closeByChannel(t.connection.localChannel);
  }
  closeChannel(e) {
    const t = this._endpoints.get(e);
    return t ? (t.subscriptions.forEach((n) => n.unsubscribe()), t.handler.close(), t.transport?.detach(), this._unifiedConnectionSubs.get(e)?.unsubscribe(), this._unifiedConnectionSubs.delete(e), this._unifiedByChannel.delete(e), this._endpoints.delete(e), e === this._hostName && (this._host = null), this._connectionRegistry.closeByChannel(e), !0) : !1;
  }
  close() {
    if (!this._closed) {
      this._closed = !0;
      for (const [e] of this._endpoints) this.closeChannel(e);
      this._remoteChannels.clear(), this._host = null, this._unifiedConnectionSubs.forEach((e) => e.unsubscribe()), this._unifiedConnectionSubs.clear(), this._unifiedByChannel.clear(), this._connectionRegistry.clear(), this._connectionEvents.complete();
    }
  }
  get closed() {
    return this._closed;
  }
  _registerUnifiedChannel(e, t) {
    this._unifiedByChannel.set(e, t), this._unifiedConnectionSubs.get(e)?.unsubscribe();
    const n = t.subscribeConnections((s) => {
      this.$forwardUnifiedConnectionEvent(e, s);
    });
    this._unifiedConnectionSubs.set(e, n);
  }
  _emitConnectionEvent(e) {
    this._connectionEvents.next({
      ...e,
      connection: {
        ...e.connection,
        contextId: this._id
      }
    });
  }
};
function jt(e) {
  return [...Object.values(d)].includes(e);
}
function _s(e) {
  if (!e) return null;
  if (Ut(e)) return e;
  const t = e, n = Ht(t);
  return {
    target: t,
    targetChannel: "unknown",
    transportType: n === "internal" ? "self" : n,
    sender: (s, r) => {
      if (typeof WebSocket < "u" && t instanceof WebSocket) {
        t.send(JSON.stringify(s));
        return;
      }
      t.postMessage?.(s, r?.length ? { transfer: r } : void 0);
    },
    postMessage: (s, r) => {
      t.postMessage?.(s, r);
    },
    addEventListener: t.addEventListener?.bind(t),
    removeEventListener: t.removeEventListener?.bind(t),
    start: t.start?.bind(t),
    close: t.close?.bind(t)
  };
}
function Ut(e) {
  return !!e && typeof e == "object" && "target" in e && typeof e.postMessage == "function";
}
function Ht(e) {
  const t = Ut(e) ? e.target : e;
  return t ? t === "chrome-runtime" ? "chrome-runtime" : t === "chrome-tabs" ? "chrome-tabs" : t === "chrome-port" ? "chrome-port" : t === "chrome-external" ? "chrome-external" : typeof MessagePort < "u" && t instanceof MessagePort ? "message-port" : typeof BroadcastChannel < "u" && t instanceof BroadcastChannel ? "broadcast" : typeof Worker < "u" && t instanceof Worker ? "worker" : typeof WebSocket < "u" && t instanceof WebSocket ? "websocket" : typeof chrome < "u" && typeof t == "object" && t && typeof t.postMessage == "function" && t.onMessage?.addListener ? "chrome-port" : typeof self < "u" && t === self ? "self" : "internal" : "internal";
}
function rt(e) {
  if (e instanceof Worker) return e;
  if (e instanceof URL) return new Worker(e.href, { type: "module" });
  if (typeof e == "function") try {
    return new e({ type: "module" });
  } catch {
    return e({ type: "module" });
  }
  return typeof e == "string" ? e.startsWith("/") ? new Worker(q(e.replace(/^\//, "./")), { type: "module" }) : URL.canParse(e) || e.startsWith("./") ? new Worker(q(e), { type: "module" }) : new Worker(URL.createObjectURL(new Blob([e], { type: "application/javascript" })), { type: "module" }) : e instanceof Blob || e instanceof File ? new Worker(URL.createObjectURL(e), { type: "module" }) : e ?? (typeof self < "u" ? self : null);
}
var $ = /* @__PURE__ */ new Map(), de = null;
function F() {
  return de || (de = new Ft({
    name: "$default$",
    useGlobalSelf: !0
  }), $.set("$default$", de)), de;
}
function ce(e = {}) {
  const t = new Ft(e);
  return e.name && $.set(e.name, t), t;
}
function ms(e, t = {}) {
  return $.has(e) ? $.get(e) : ce({
    ...t,
    name: e
  });
}
function Zr(e) {
  return $.get(e);
}
function ei(e) {
  const t = $.get(e);
  return t ? (t.close(), $.delete(e)) : !1;
}
function ti() {
  return [...$.keys()];
}
function gs(e, t = {}) {
  const n = ce(t);
  return {
    context: n,
    channels: n.createChannels(e)
  };
}
async function bs(e, t, n = {}) {
  const s = ce(n.contextOptions);
  return {
    context: s,
    module: await s.importModuleInChannel(e, t, {
      channelOptions: n.channelOptions,
      importOptions: n.importOptions
    })
  };
}
async function ni(e, t, n = {}) {
  return F().addWorker(e, t, n);
}
async function si(e, t, n = {}) {
  return F().addPort(e, t, n);
}
async function ri(e, t, n = {}) {
  return F().addBroadcast(e, t, n);
}
function ii(e, t = {}) {
  return F().addSelfChannel(e, t);
}
function oi(e, t) {
  F().defer(e, t);
}
async function ai(e) {
  return F().initDeferred(e);
}
async function ci(e) {
  return F().getChannelAsync(e);
}
function li(e, t, n = {}) {
  return F().createChannelPair(e, t, n);
}
var P = class {
  _subs = /* @__PURE__ */ new Set();
  _listening = !1;
  _cleanup = null;
  subscribe(e) {
    const t = typeof e == "function" ? { next: e } : e, n = this._subs.size === 0;
    return this._subs.add(t), n && !this._listening && this._activate(), {
      closed: !1,
      unsubscribe: () => {
        this._subs.delete(t), this._subs.size === 0 && this._listening && this._deactivate();
      }
    };
  }
  _deactivate() {
    this._cleanup?.(), this._cleanup = null, this._listening = !1;
  }
  _dispatch(e) {
    for (const t of this._subs) try {
      t.next?.(e);
    } catch (n) {
      t.error?.(n);
    }
  }
  _error(e) {
    for (const t of this._subs) t.error?.(e);
  }
  _complete() {
    for (const e of this._subs) e.complete?.();
    this._subs.clear(), this._deactivate();
  }
  close() {
    this._complete();
  }
  get subscriberCount() {
    return this._subs.size;
  }
  get isListening() {
    return this._listening;
  }
}, it = class extends P {
  _worker;
  _send;
  constructor(e) {
    super(), this._worker = e, this._send = b(this._worker);
  }
  next(e, t) {
    this._send(e, t);
  }
  _activate() {
    this._listening || (this._cleanup = m(this._worker, (e) => this._dispatch(e), (e) => this._error(e)), this._listening = !0);
  }
  terminate() {
    this._worker.terminate(), this._complete();
  }
  get worker() {
    return this._worker;
  }
}, Ie = class extends P {
  _port;
  _send;
  constructor(e) {
    super(), this._port = e, this._send = b(this._port);
  }
  next(e, t) {
    this._send(e, t);
  }
  _activate() {
    this._listening || (this._cleanup = m(this._port, (e) => this._dispatch(e)), this._listening = !0);
  }
  get port() {
    return this._port;
  }
}, ys = class extends P {
  _name;
  _channel;
  _send;
  constructor(e) {
    super(), this._name = e, this._channel = new BroadcastChannel(e), this._send = b(this._channel);
  }
  next(e) {
    this._send(e);
  }
  _activate() {
    this._listening || (this._cleanup = m(this._channel, (e) => {
      e?.sender !== this._name && this._dispatch(e);
    }), this._listening = !0);
  }
  close() {
    this._channel.close(), super.close();
  }
}, ws = class extends P {
  _url;
  _protocols;
  _ws = null;
  _pending = [];
  _state = new _();
  constructor(e, t) {
    super(), this._url = e, this._protocols = t;
  }
  connect() {
    if (this._ws) return;
    const e = typeof this._url == "string" ? this._url : this._url.href;
    this._ws = new WebSocket(e, this._protocols), this._state.next("connecting"), this._ws.addEventListener("open", () => {
      this._state.next("open"), this._pending.forEach((t) => this.next(t)), this._pending = [];
    }), this._cleanup = m(this._ws, (t) => this._dispatch(t), (t) => this._error(t), () => {
      this._state.next("closed"), this._complete();
    }), this._listening = !0;
  }
  next(e) {
    if (!this._ws || this._ws.readyState !== WebSocket.OPEN) {
      this._pending.push(e);
      return;
    }
    const { transferable: t, ...n } = e;
    this._ws.send(JSON.stringify(n));
  }
  _activate() {
    this._ws || this.connect();
  }
  close(e, t) {
    this._state.next("closing"), this._ws?.close(e, t), this._ws = null, super.close();
  }
  get state() {
    return this._state;
  }
  get isOpen() {
    return this._ws?.readyState === WebSocket.OPEN;
  }
}, vs = class extends P {
  _send = b("chrome-runtime");
  next(e) {
    this._send(e);
  }
  _activate() {
    this._listening || (this._cleanup = m("chrome-runtime", (e) => this._dispatch(e)), this._listening = !0);
  }
}, Cs = class extends P {
  _tabId;
  constructor(e) {
    super(), this._tabId = e;
  }
  setTabId(e) {
    this._tabId = e;
  }
  next(e) {
    if (this._tabId == null || typeof chrome > "u" || !chrome.tabs) return;
    const { transferable: t, ...n } = e;
    chrome.tabs.sendMessage(this._tabId, n);
  }
  _activate() {
    this._listening || (this._cleanup = m("chrome-tabs", (e) => this._dispatch(e), void 0, void 0, { tabId: this._tabId }), this._listening = !0);
  }
}, xs = class extends P {
  _portName;
  _tabId;
  _send;
  constructor(e, t) {
    super(), this._portName = e, this._tabId = t, this._send = b("chrome-port", {
      portName: e,
      tabId: t
    });
  }
  next(e) {
    this._send(e);
  }
  _activate() {
    this._listening || (this._cleanup = m("chrome-port", (e) => this._dispatch(e), void 0, void 0, {
      portName: this._portName,
      tabId: this._tabId
    }), this._listening = !0);
  }
}, Ss = class extends P {
  _send = b("service-worker-client");
  next(e, t) {
    this._send(e, t);
  }
  _activate() {
    this._listening || (this._cleanup = m("service-worker-client", (e) => this._dispatch(e)), this._listening = !0);
  }
}, ks = class extends P {
  _send = b("service-worker-host");
  next(e, t) {
    this._send(e, t);
  }
  _activate() {
    this._listening || (this._cleanup = m("service-worker-host", (e) => this._dispatch(e)), this._listening = !0);
  }
}, Es = class extends P {
  _send = b("self");
  next(e, t) {
    this._send(e, t);
  }
  _activate() {
    this._listening || (this._cleanup = m("self", (e) => this._dispatch(e)), this._listening = !0);
  }
}, hi = {
  worker: (e) => new it(e),
  workerFromUrl: (e, t) => new it(new Worker(typeof e == "string" ? e : e.href, {
    type: "module",
    ...t
  })),
  messagePort: (e) => new Ie(e),
  messageChannel: () => {
    const e = new MessageChannel();
    return {
      port1: new Ie(e.port1),
      port2: new Ie(e.port2)
    };
  },
  broadcast: (e) => new ys(e),
  websocket: (e, t) => new ws(e, t),
  chromeRuntime: () => new vs(),
  chromeTabs: (e) => new Cs(e),
  chromePort: (e, t) => new xs(e, t),
  serviceWorkerClient: () => new Ss(),
  serviceWorkerHost: () => new ks(),
  self: () => new Es()
};
function ui(e, t) {
  return {
    send: (n, s) => e.next(n, s),
    subscribe: (n) => t.subscribe({ next: n }),
    close: () => {
      e.close(), t.close();
    }
  };
}
var zt = class {
  _context;
  _config;
  _subscriptions = [];
  _incomingConnections = new _({ bufferSize: 100 });
  _channelCreated = new _({ bufferSize: 100 });
  _channelClosed = new _();
  constructor(e = {}) {
    this._config = {
      name: e.name ?? "worker",
      workerName: e.workerName ?? `worker-${h().slice(0, 8)}`,
      autoAcceptChannels: e.autoAcceptChannels ?? !0,
      allowedChannels: e.allowedChannels ?? [],
      maxChannels: e.maxChannels ?? 100,
      autoConnect: e.autoConnect ?? !0,
      useGlobalSelf: !0,
      defaultOptions: e.defaultOptions ?? {},
      isolatedStorage: e.isolatedStorage ?? !1,
      ...e
    }, this._context = ce({
      name: this._config.name,
      useGlobalSelf: !0,
      defaultOptions: e.defaultOptions
    }), this._setupMessageListener();
  }
  get onConnection() {
    return this._incomingConnections;
  }
  get onChannelCreated() {
    return this._channelCreated;
  }
  get onChannelClosed() {
    return this._channelClosed;
  }
  subscribeConnections(e) {
    return this._incomingConnections.subscribe(e);
  }
  subscribeChannelCreated(e) {
    return this._channelCreated.subscribe(e);
  }
  acceptConnection(e) {
    if (!this._canAcceptChannel(e.channel)) return null;
    const t = this._context.createChannel(e.channel, e.options);
    return e.port && (e.port.start?.(), t.handler.createRemoteChannel(e.sender, e.options, e.port)), this._channelCreated.next({
      channel: e.channel,
      endpoint: t,
      sender: e.sender,
      timestamp: Date.now()
    }), this._postChannelCreated(e.channel, e.sender, e.id), t;
  }
  createChannel(e, t) {
    return this._context.createChannel(e, t);
  }
  getChannel(e) {
    return this._context.getChannel(e);
  }
  hasChannel(e) {
    return this._context.hasChannel(e);
  }
  getChannelNames() {
    return this._context.getChannelNames();
  }
  queryConnections(e = {}) {
    return this._context.queryConnections(e);
  }
  notifyConnections(e = {}, t = {}) {
    return this._context.notifyConnections(e, t);
  }
  closeChannel(e) {
    const t = this._context.closeChannel(e);
    return t && this._channelClosed.next({
      channel: e,
      timestamp: Date.now()
    }), t;
  }
  get context() {
    return this._context;
  }
  get config() {
    return this._config;
  }
  _setupMessageListener() {
    addEventListener("message", ((e) => {
      this._handleIncomingMessage(e);
    }));
  }
  _handleIncomingMessage(e) {
    const t = e.data;
    if (!(!t || typeof t != "object"))
      switch (t.type) {
        case "createChannel":
          this._handleCreateChannel(t);
          break;
        case "connectChannel":
          this._handleConnectChannel(t);
          break;
        case "addPort":
          this._handleAddPort(t);
          break;
        case "listChannels":
          this._handleListChannels(t);
          break;
        case "closeChannel":
          this._handleCloseChannel(t);
          break;
        case "ping":
          postMessage({
            type: "pong",
            id: t.id,
            timestamp: Date.now()
          });
          break;
        default:
          t.channel && this._context.hasChannel(t.channel) && this._context.getChannel(t.channel)?.handler?.handleAndResponse?.(t.payload, t.reqId);
      }
  }
  _handleCreateChannel(e) {
    const t = {
      id: e.reqId ?? h(),
      channel: e.channel,
      sender: e.sender ?? "unknown",
      type: "channel",
      port: e.messagePort,
      timestamp: Date.now(),
      options: e.options
    };
    this._incomingConnections.next(t), this._config.autoAcceptChannels && this.acceptConnection(t);
  }
  _handleConnectChannel(e) {
    const t = {
      id: e.reqId ?? h(),
      channel: e.channel,
      sender: e.sender ?? "unknown",
      type: e.portType ?? "channel",
      port: e.port,
      timestamp: Date.now(),
      options: e.options
    };
    if (this._incomingConnections.next(t), this._config.autoAcceptChannels && this._canAcceptChannel(e.channel)) {
      const n = this._context.getOrCreateChannel(e.channel, e.options);
      e.port && (e.port.start?.(), n.handler.createRemoteChannel(e.sender, e.options, e.port)), postMessage({
        type: "channelConnected",
        channel: e.channel,
        reqId: e.reqId
      });
    }
  }
  _handleAddPort(e) {
    if (!e.port || !e.channel) return;
    const t = {
      id: e.reqId ?? h(),
      channel: e.channel,
      sender: e.sender ?? "unknown",
      type: "port",
      port: e.port,
      timestamp: Date.now(),
      options: e.options
    };
    this._incomingConnections.next(t), this._config.autoAcceptChannels && this.acceptConnection(t);
  }
  _handleListChannels(e) {
    postMessage({
      type: "channelList",
      channels: this.getChannelNames(),
      reqId: e.reqId
    });
  }
  _handleCloseChannel(e) {
    e.channel && (this.closeChannel(e.channel), postMessage({
      type: "channelClosed",
      channel: e.channel,
      reqId: e.reqId
    }));
  }
  _canAcceptChannel(e) {
    return this._context.size >= this._config.maxChannels ? !1 : this._config.allowedChannels.length > 0 ? this._config.allowedChannels.includes(e) : !0;
  }
  _postChannelCreated(e, t, n) {
    postMessage({
      type: "channelCreated",
      channel: e,
      sender: t,
      reqId: n,
      timestamp: Date.now()
    });
  }
  close() {
    this._subscriptions.forEach((e) => e.unsubscribe()), this._subscriptions = [], this._incomingConnections.complete(), this._channelCreated.complete(), this._channelClosed.complete(), this._context.close();
  }
}, K = null;
function Ue(e) {
  return K || (K = new zt(e)), K;
}
function di(e) {
  return K?.close(), K = new zt(e), K;
}
function fi(e) {
  return Ue().subscribeConnections(e);
}
function pi(e) {
  return Ue().subscribeChannelCreated(e);
}
var fe = null, pe = null;
function Gt(e) {
  return fe || (fe = Nn(e ?? "worker"), fe.listen(self)), fe;
}
function Vt(e) {
  return pe || (pe = Le(e ?? "worker"), pe.connect(self)), pe;
}
function _i(e, t) {
  Gt().expose(e, t);
}
function mi(e) {
  return Gt().subscribeInvocations(e);
}
function gi(e = "host", t = []) {
  return Vt().createProxy(e, t);
}
function bi(e, t = "host") {
  return Vt().importModule(t, e);
}
var yi = Ue({ name: "worker" }), ye = class {
  _subs = /* @__PURE__ */ new Set();
  _listening = !1;
  _cleanup = null;
  subscribe(e) {
    const t = typeof e == "function" ? { next: e } : e, n = this._subs.size === 0;
    return this._subs.add(t), n && !this._listening && this._activate(), {
      closed: !1,
      unsubscribe: () => {
        this._subs.delete(t), this._subs.size === 0 && this._listening && this._deactivate();
      }
    };
  }
  _deactivate() {
    this._cleanup?.(), this._cleanup = null, this._listening = !1;
  }
  _dispatch(e) {
    for (const t of this._subs) try {
      t.next?.(e);
    } catch (n) {
      t.error?.(n);
    }
  }
  close() {
    this._subs.forEach((e) => e.complete?.()), this._subs.clear(), this._deactivate();
  }
}, He = class extends ye {
  _handler;
  _options;
  _pending = /* @__PURE__ */ new Map();
  constructor(e, t = {}) {
    super(), this._handler = e, this._options = t;
  }
  send(e) {
    if (typeof chrome > "u" || !chrome.runtime) return;
    const { _sender: t, _tabId: n, _frameId: s, transferable: r, ...i } = e;
    chrome.runtime.sendMessage(i);
  }
  request(e) {
    const t = e.reqId ?? h();
    return new Promise((n, s) => {
      this._pending.set(t, {
        resolve: n,
        reject: s,
        timestamp: Date.now()
      });
      const { _sender: r, _tabId: i, _frameId: o, transferable: a, ...c } = {
        ...e,
        reqId: t
      };
      chrome.runtime.sendMessage(c, (l) => {
        chrome.runtime.lastError ? s(new Error(chrome.runtime.lastError.message)) : n(l), this._pending.delete(t);
      });
    });
  }
  _activate() {
    if (this._listening || typeof chrome > "u" || !chrome.runtime) return;
    const e = (t, n, s) => {
      if (this._options.filterSender && !this._options.filterSender(n) || this._options.filterMessage && !this._options.filterMessage(t)) return !1;
      const r = {
        ...t,
        id: t.id ?? h(),
        _sender: n,
        _tabId: n.tab?.id,
        _frameId: n.frameId
      };
      if (r.type === "response" && r.reqId) {
        const i = this._pending.get(r.reqId);
        i && (i.resolve(r.payload), this._pending.delete(r.reqId));
      }
      if (this._handler) {
        const i = (a) => s(a), o = {
          next: (a) => this._dispatch(a),
          error: () => {
          },
          complete: () => {
          },
          signal: new AbortController().signal,
          active: !0
        };
        return this._handler(r, i, o) instanceof Promise ? !0 : this._options.asyncResponse;
      }
      return this._dispatch(r), !1;
    };
    chrome.runtime.onMessage.addListener(e), this._cleanup = () => chrome.runtime.onMessage.removeListener(e), this._listening = !0;
  }
}, ze = class extends ye {
  _tabId;
  _options;
  constructor(e, t = {}) {
    super(), this._tabId = e, this._options = t;
  }
  setTabId(e) {
    this._tabId = e;
  }
  send(e) {
    if (typeof chrome > "u" || !chrome.tabs || this._tabId == null) return;
    const { _sender: t, _tabId: n, _frameId: s, transferable: r, ...i } = e;
    chrome.tabs.sendMessage(this._tabId, i);
  }
  _activate() {
    if (this._listening || typeof chrome > "u" || !chrome.runtime) return;
    const e = (t, n) => {
      if (this._tabId != null && n.tab?.id !== this._tabId || this._options.filterSender && !this._options.filterSender(n)) return;
      const s = {
        ...t,
        id: t.id ?? h(),
        _sender: n,
        _tabId: n.tab?.id,
        _frameId: n.frameId
      };
      this._dispatch(s);
    };
    chrome.runtime.onMessage.addListener(e), this._cleanup = () => chrome.runtime.onMessage.removeListener(e), this._listening = !0;
  }
}, Ge = class extends ye {
  _portName;
  _tabId;
  _port = null;
  _info = null;
  constructor(e, t) {
    super(), this._portName = e, this._tabId = t;
  }
  connect() {
    typeof chrome > "u" || !chrome.runtime || (this._port = this._tabId != null ? chrome.tabs.connect(this._tabId, { name: this._portName }) : chrome.runtime.connect({ name: this._portName }), this._info = {
      name: this._portName,
      tabId: this._tabId
    }, this._setupListeners());
  }
  send(e) {
    if (!this._port) return;
    const { _sender: t, _tabId: n, _frameId: s, transferable: r, ...i } = e;
    this._port.postMessage(i);
  }
  _setupListeners() {
    this._port && (this._port.onMessage.addListener((e) => this._dispatch({
      ...e,
      id: e.id ?? h()
    })), this._port.onDisconnect.addListener(() => {
      this._subs.forEach((e) => e.complete?.()), this._port = null;
    }));
  }
  _activate() {
    this._port || this.connect(), this._listening = !0;
  }
  _deactivate() {
    this._port?.disconnect(), this._port = null, super._deactivate();
  }
  get portInfo() {
    return this._info;
  }
  get isConnected() {
    return this._port != null;
  }
}, Qt = class extends ye {
  _extensionId;
  constructor(e) {
    super(), this._extensionId = e;
  }
  send(e) {
    if (typeof chrome > "u" || !chrome.runtime) return;
    const { _sender: t, _tabId: n, _frameId: s, transferable: r, ...i } = e;
    this._extensionId ? chrome.runtime.sendMessage(this._extensionId, i) : chrome.runtime.sendMessage(i);
  }
  _activate() {
    if (this._listening || typeof chrome > "u" || !chrome.runtime?.onMessageExternal) return;
    const e = (t, n) => {
      this._dispatch({
        ...t,
        id: t.id ?? h(),
        _sender: n
      });
    };
    chrome.runtime.onMessageExternal.addListener(e), this._cleanup = () => chrome.runtime.onMessageExternal.removeListener(e), this._listening = !0;
  }
};
function wi(e, t) {
  return async (n, s, r) => {
    if (n.type !== "request") {
      r.next(n);
      return;
    }
    const i = n.payload?.action;
    if (i && t[i]) try {
      const o = await t[i](n.payload?.args ?? [], n);
      s({
        id: h(),
        channel: n.sender,
        sender: e,
        reqId: n.reqId,
        type: "response",
        payload: { result: o },
        timestamp: Date.now()
      });
    } catch (o) {
      s({
        id: h(),
        channel: n.sender,
        sender: e,
        reqId: n.reqId,
        type: "response",
        payload: { error: o instanceof Error ? o.message : String(o) },
        timestamp: Date.now()
      });
    }
    else r.next(n);
  };
}
var vi = {
  runtime: (e, t) => new He(e, t),
  tabs: (e, t) => new ze(e, t),
  port: (e, t) => new Ge(e, t),
  external: (e) => new Qt(e)
}, we = class {
  _socket;
  _channelName;
  _options;
  _subs = /* @__PURE__ */ new Set();
  _pending = /* @__PURE__ */ new Map();
  _listening = !1;
  _cleanups = [];
  _events;
  _defaultEvent;
  _state = new _();
  constructor(e, t, n = {}) {
    this._socket = e, this._channelName = t, this._options = n, this._events = n.events ?? ["message", "channel"], this._defaultEvent = n.defaultEvent ?? "message", n.autoConnect !== !1 && this._socket.connect?.();
  }
  send(e, t) {
    const { transferable: n, ack: s, ...r } = e;
    this._socket.emit(t ?? e.event ?? this._defaultEvent, r);
  }
  emit(e, t) {
    this._socket.emit(e, t);
  }
  request(e, t) {
    const n = e.reqId ?? h();
    return new Promise((s, r) => {
      this._pending.set(n, {
        resolve: s,
        reject: r,
        timestamp: Date.now()
      });
      const i = setTimeout(() => {
        this._pending.has(n) && (this._pending.delete(n), r(/* @__PURE__ */ new Error("Request timeout")));
      }, 3e4), { transferable: o, ack: a, ...c } = {
        ...e,
        reqId: n
      };
      this._socket.emit(t ?? this._defaultEvent, c, (l) => {
        clearTimeout(i), this._pending.delete(n), s(l);
      });
    });
  }
  subscribe(e) {
    const t = typeof e == "function" ? { next: e } : e, n = this._subs.size === 0;
    return this._subs.add(t), n && !this._listening && this._activate(), {
      closed: !1,
      unsubscribe: () => {
        this._subs.delete(t), this._subs.size === 0 && this._listening && this._deactivate();
      }
    };
  }
  _activate() {
    if (this._listening) return;
    for (const s of this._events) {
      const r = (i, o) => {
        const a = {
          ...typeof i == "object" ? i : { payload: i },
          id: i?.id ?? h(),
          event: s,
          ack: o
        };
        if (a.type === "response" && a.reqId) {
          const c = this._pending.get(a.reqId);
          c && (c.resolve(a.payload), this._pending.delete(a.reqId));
        }
        for (const c of this._subs) try {
          c.next?.(a);
        } catch (l) {
          c.error?.(l);
        }
      };
      this._socket.on(s, r), this._cleanups.push(() => this._socket.off(s, r));
    }
    const e = () => this._state.next("connected"), t = () => this._state.next("disconnected"), n = (s) => {
      this._state.next("error");
      for (const r of this._subs) r.error?.(s instanceof Error ? s : new Error(String(s)));
    };
    this._socket.on("connect", e), this._socket.on("disconnect", t), this._socket.on("error", n), this._cleanups.push(() => this._socket.off("connect", e), () => this._socket.off("disconnect", t), () => this._socket.off("error", n)), this._listening = !0;
  }
  _deactivate() {
    this._cleanups.forEach((e) => e()), this._cleanups = [], this._listening = !1;
  }
  close() {
    this._subs.forEach((e) => e.complete?.()), this._subs.clear(), this._deactivate(), this._socket.disconnect?.();
  }
  get socket() {
    return this._socket;
  }
  get channelName() {
    return this._channelName;
  }
  get isConnected() {
    return this._socket.connected ?? !1;
  }
  get state() {
    return this._state;
  }
}, Is = class {
  _parent;
  _roomName;
  _subs = /* @__PURE__ */ new Set();
  _parentSub = null;
  constructor(e, t) {
    this._parent = e, this._roomName = t;
  }
  send(e) {
    this._parent.send({
      ...e,
      room: this._roomName
    });
  }
  subscribe(e) {
    const t = typeof e == "function" ? { next: e } : e, n = this._subs.size === 0;
    return this._subs.add(t), n && !this._parentSub && (this._parentSub = this._parent.subscribe({
      next: (s) => {
        if (s.room === this._roomName || s.channel === this._roomName) for (const r of this._subs) try {
          r.next?.(s);
        } catch (i) {
          r.error?.(i);
        }
      },
      error: (s) => {
        for (const r of this._subs) r.error?.(s);
      },
      complete: () => {
        for (const s of this._subs) s.complete?.();
      }
    })), {
      closed: !1,
      unsubscribe: () => {
        this._subs.delete(t), this._subs.size === 0 && (this._parentSub?.unsubscribe(), this._parentSub = null);
      }
    };
  }
  get roomName() {
    return this._roomName;
  }
};
function Ci(e, t) {
  return async (n) => {
    if (n.type !== "request" || !n.ack) return;
    const s = n.payload?.action;
    if (s && t[s]) try {
      const r = await t[s](n.payload?.args ?? [], n);
      n.ack({
        id: h(),
        channel: n.sender,
        sender: e,
        reqId: n.reqId,
        type: "response",
        payload: { result: r },
        timestamp: Date.now()
      });
    } catch (r) {
      n.ack({
        id: h(),
        channel: n.sender,
        sender: e,
        reqId: n.reqId,
        type: "response",
        payload: { error: r instanceof Error ? r.message : String(r) },
        timestamp: Date.now()
      });
    }
  };
}
var xi = {
  create: (e, t, n) => new we(e, t, n),
  room: (e, t) => new Is(e, t)
};
function Si(e, t, n) {
  return new we(e, t, n);
}
var ve = class {
  _scriptUrl;
  _channelName;
  _options;
  _worker = null;
  _port = null;
  _subs = /* @__PURE__ */ new Set();
  _pending = /* @__PURE__ */ new Map();
  _listening = !1;
  _cleanup = null;
  _portId = h();
  _state = new _();
  constructor(e, t, n = {}) {
    this._scriptUrl = e, this._channelName = t, this._options = n, n.autoConnect !== !1 && this.connect();
  }
  connect() {
    if (!this._worker)
      try {
        this._worker = new SharedWorker(this._scriptUrl, {
          name: this._options.name,
          credentials: this._options.credentials,
          type: this._options.type
        }), this._port = this._worker.port, this._setupListeners(), this._port.start(), this._state.next("connecting"), this.send({
          id: h(),
          channel: this._channelName,
          sender: this._portId,
          type: "signal",
          payload: {
            action: "connect",
            portId: this._portId
          }
        });
      } catch (e) {
        throw this._state.next("error"), e;
      }
  }
  send(e, t) {
    if (!this._port) return;
    const { transferable: n, ...s } = e;
    this._port.postMessage({
      ...s,
      portId: this._portId
    }, t ?? []);
  }
  request(e) {
    const t = e.reqId ?? h();
    return new Promise((n, s) => {
      const r = setTimeout(() => {
        this._pending.has(t) && (this._pending.delete(t), s(/* @__PURE__ */ new Error("Request timeout")));
      }, 3e4);
      this._pending.set(t, {
        resolve: (i) => {
          clearTimeout(r), n(i);
        },
        reject: (i) => {
          clearTimeout(r), s(i);
        },
        timestamp: Date.now()
      }), this.send({
        ...e,
        reqId: t,
        type: "request"
      });
    });
  }
  broadcast(e, t) {
    this.send({
      ...e,
      broadcast: !0
    }, t);
  }
  subscribe(e) {
    const t = typeof e == "function" ? { next: e } : e;
    return this._subs.add(t), this._listening || this._activate(), {
      closed: !1,
      unsubscribe: () => {
        this._subs.delete(t), this._subs.size === 0 && this._deactivate();
      }
    };
  }
  _setupListeners() {
    if (!this._port) return;
    const e = (n) => {
      const s = n.data;
      if (s.type === "signal" && s.payload?.action === "connected" && this._state.next("connected"), s.type === "response" && s.reqId) {
        const r = this._pending.get(s.reqId);
        r && (this._pending.delete(s.reqId), s.payload?.error ? r.reject(new Error(s.payload.error)) : r.resolve(s.payload?.result ?? s.payload));
      }
      for (const r of this._subs) try {
        r.next?.(s);
      } catch (i) {
        r.error?.(i);
      }
    }, t = (n) => {
      this._state.next("error");
      const s = /* @__PURE__ */ new Error("SharedWorker error");
      for (const r of this._subs) r.error?.(s);
    };
    this._port.addEventListener("message", e), this._port.addEventListener("messageerror", t), this._cleanup = () => {
      this._port?.removeEventListener("message", e), this._port?.removeEventListener("messageerror", t);
    };
  }
  _activate() {
    this._listening = !0;
  }
  _deactivate() {
    this._cleanup?.(), this._cleanup = null, this._listening = !1;
  }
  disconnect() {
    this.send({
      id: h(),
      channel: this._channelName,
      sender: this._portId,
      type: "signal",
      payload: {
        action: "disconnect",
        portId: this._portId
      }
    }), this._deactivate(), this._port?.close(), this._port = null, this._worker = null, this._state.next("disconnected");
  }
  close() {
    this._subs.forEach((e) => e.complete?.()), this._subs.clear(), this.disconnect();
  }
  get port() {
    return this._port;
  }
  get portId() {
    return this._portId;
  }
  get isConnected() {
    return this._state.getValue() === "connected";
  }
  get state() {
    return this._state;
  }
  get channelName() {
    return this._channelName;
  }
}, Ve = class {
  _channelName;
  _ports = /* @__PURE__ */ new Map();
  _subs = /* @__PURE__ */ new Set();
  _state = new _();
  constructor(e) {
    this._channelName = e, this._setupGlobalHandler();
  }
  _setupGlobalHandler() {
    typeof self < "u" && "onconnect" in self && (self.onconnect = (e) => {
      const t = e.ports[0], n = h();
      this._registerPort(n, t);
    }, this._state.next("ready"));
  }
  _registerPort(e, t) {
    const n = {
      id: e,
      connectedAt: Date.now(),
      lastSeen: Date.now()
    };
    t.onmessage = (s) => {
      const r = s.data;
      if (n.lastSeen = Date.now(), r.type === "signal") {
        if (r.payload?.action === "connect") {
          const i = r.payload.portId || e;
          this._ports.delete(e), n.id = i, this._ports.set(i, {
            port: t,
            info: n
          }), t.postMessage({
            id: h(),
            channel: this._channelName,
            sender: "host",
            type: "signal",
            payload: {
              action: "connected",
              portId: i
            }
          });
          return;
        }
        if (r.payload?.action === "disconnect") {
          this._unregisterPort(r.portId ?? e);
          return;
        }
      }
      r.broadcast && this.broadcast(r, r.portId ?? e);
      for (const i of this._subs) try {
        i.next?.({
          ...r,
          portId: r.portId ?? e
        });
      } catch (o) {
        i.error?.(o);
      }
    }, t.onmessageerror = (s) => {
      const r = /* @__PURE__ */ new Error("Port message error");
      for (const i of this._subs) i.error?.(r);
    }, t.start(), this._ports.set(e, {
      port: t,
      info: n
    });
  }
  _unregisterPort(e) {
    const t = this._ports.get(e);
    t && (t.port.close(), this._ports.delete(e));
  }
  send(e, t, n) {
    const s = this._ports.get(e);
    if (!s) return;
    const { transferable: r, ...i } = t;
    s.port.postMessage(i, n ?? []);
  }
  broadcast(e, t) {
    const { transferable: n, ...s } = e;
    for (const [r, i] of this._ports) r !== t && i.port.postMessage({
      ...s,
      broadcast: !0
    });
  }
  respond(e, t, n) {
    !e.portId || !e.reqId || this.send(e.portId, {
      id: h(),
      channel: e.sender,
      sender: this._channelName,
      type: "response",
      reqId: e.reqId,
      payload: { result: t }
    }, n);
  }
  subscribe(e) {
    const t = typeof e == "function" ? { next: e } : e;
    return this._subs.add(t), {
      closed: !1,
      unsubscribe: () => {
        this._subs.delete(t);
      }
    };
  }
  getPorts() {
    const e = /* @__PURE__ */ new Map();
    for (const [t, n] of this._ports) e.set(t, { ...n.info });
    return e;
  }
  get portCount() {
    return this._ports.size;
  }
  get state() {
    return this._state;
  }
  get channelName() {
    return this._channelName;
  }
};
function ki(e, t, n) {
  return new ve(e, t, n);
}
function Ei(e) {
  return new Ve(e);
}
var Ii = {
  client: (e, t, n) => new ve(e, t, n),
  host: (e) => new Ve(e)
}, ee = null;
async function Kt() {
  if (ee) return ee;
  try {
    const e = await import("./cbor-x-DhdMOAu4.js");
    ee = {
      encode: (t) => e.encode(t),
      decode: (t) => e.decode(t)
    };
  } catch {
    ee = {
      encode: (e) => new TextEncoder().encode(JSON.stringify(e, Ts)),
      decode: (e) => JSON.parse(new TextDecoder().decode(e), Ps)
    };
  }
  return ee;
}
function Ts(e, t) {
  return ArrayBuffer.isView(t) && !(t instanceof DataView) ? {
    __typedArray: !0,
    type: t.constructor.name,
    data: Array.from(t)
  } : t instanceof ArrayBuffer ? {
    __arrayBuffer: !0,
    data: Array.from(new Uint8Array(t))
  } : t;
}
function Ps(e, t) {
  if (t?.__typedArray) {
    const n = globalThis[t.type];
    return n ? new n(t.data) : t.data;
  }
  return t?.__arrayBuffer ? new Uint8Array(t.data).buffer : t;
}
var Yt = 32, te = 0, Te = 4, ot = 8, at = 12, z = 16, _e = 20, Pe = Yt, Ms = 1, As = 2, Rs = 4, V = class {
  _config;
  _sharedBuffer;
  _int32View;
  _uint8View;
  _maxDataSize;
  constructor(e = 65536, t = {}) {
    this._config = t, typeof e == "number" ? this._sharedBuffer = new SharedArrayBuffer(e) : this._sharedBuffer = e, this._int32View = new Int32Array(this._sharedBuffer), this._uint8View = new Uint8Array(this._sharedBuffer), this._maxDataSize = this._config.maxMessageSize ?? this._sharedBuffer.byteLength - Yt;
  }
  async write(e, t = 0) {
    if (e.byteLength > this._maxDataSize) throw new Error(`Message too large: ${e.byteLength} > ${this._maxDataSize}`);
    for (; Atomics.compareExchange(this._int32View, te / 4, 0, 1) !== 0; ) this._config.useAsyncWait && "waitAsync" in Atomics ? await Atomics.waitAsync(this._int32View, te / 4, 1, this._config.waitTimeout ?? 100).value : Atomics.wait(this._int32View, te / 4, 1, this._config.waitTimeout ?? 100);
    try {
      return Atomics.store(this._int32View, ot / 4, e.byteLength), Atomics.store(this._int32View, at / 4, t), this._uint8View.set(e, Pe), Atomics.add(this._int32View, Te / 4, 1), Atomics.store(this._int32View, z / 4, 1), Atomics.notify(this._int32View, z / 4), !0;
    } finally {
      Atomics.store(this._int32View, te / 4, 0), Atomics.notify(this._int32View, te / 4);
    }
  }
  async read() {
    if (Atomics.load(this._int32View, z / 4) === 0 && (this._config.useAsyncWait && "waitAsync" in Atomics ? await Atomics.waitAsync(this._int32View, z / 4, 0, this._config.waitTimeout ?? 1e3).value : Atomics.wait(this._int32View, z / 4, 0, this._config.waitTimeout ?? 1e3)) === "timed-out")
      return null;
    const e = Atomics.load(this._int32View, ot / 4), t = Atomics.load(this._int32View, at / 4), n = Atomics.load(this._int32View, Te / 4);
    if (e <= 0 || e > this._maxDataSize) return null;
    const s = new Uint8Array(e);
    return s.set(this._uint8View.subarray(Pe, Pe + e)), Atomics.store(this._int32View, z / 4, 0), Atomics.add(this._int32View, _e / 4, 1), Atomics.notify(this._int32View, _e / 4), {
      data: s,
      flags: t,
      seq: n
    };
  }
  async waitAck(e) {
    const t = this._config.waitTimeout ?? 5e3, n = Date.now();
    for (; Date.now() - n < t; ) {
      const s = Atomics.load(this._int32View, _e / 4);
      if (s >= e) return !0;
      this._config.useAsyncWait && "waitAsync" in Atomics ? await Atomics.waitAsync(this._int32View, _e / 4, s, 100).value : await new Promise((r) => setTimeout(r, 10));
    }
    return !1;
  }
  get buffer() {
    return this._sharedBuffer;
  }
  get currentSeq() {
    return Atomics.load(this._int32View, Te / 4);
  }
}, le = class {
  _channelName;
  _config;
  _sendBuffer;
  _recvBuffer;
  _encoder = null;
  _subs = /* @__PURE__ */ new Set();
  _pending = /* @__PURE__ */ new Map();
  _polling = !1;
  _pollAbort = null;
  _workerId = h();
  _lastSeq = 0;
  _state = new _();
  constructor(e, t, n, s = {}) {
    this._channelName = e, this._config = s, this._sendBuffer = t instanceof V ? t : new V(t, s), this._recvBuffer = n instanceof V ? n : new V(n, s), this._init();
  }
  async _init() {
    this._encoder = await Kt(), this._state.next("ready");
  }
  async send(e, t) {
    this._encoder || await this._init();
    const { transferable: n, ...s } = e;
    let r = 0;
    t?.length && (r |= Ms, s._transferMeta = t.map((o, a) => ({
      index: a,
      type: o.constructor.name,
      transferred: o instanceof ArrayBuffer && "transfer" in o
    })));
    const i = this._encoder.encode(s);
    this._config.compression && i.length > 1024 && (r |= As), await this._sendBuffer.write(i, r);
  }
  async request(e) {
    const t = e.reqId ?? h();
    return new Promise((n, s) => {
      const r = setTimeout(() => {
        this._pending.delete(t), s(/* @__PURE__ */ new Error("Request timeout"));
      }, this._config.waitTimeout ?? 3e4);
      this._pending.set(t, {
        resolve: (i) => {
          clearTimeout(r), n(i);
        },
        reject: (i) => {
          clearTimeout(r), s(i);
        },
        timestamp: Date.now()
      }), this.send({
        ...e,
        reqId: t,
        type: "request"
      });
    });
  }
  subscribe(e) {
    const t = typeof e == "function" ? { next: e } : e;
    return this._subs.add(t), this._polling || this._startPolling(), {
      closed: !1,
      unsubscribe: () => {
        this._subs.delete(t), this._subs.size === 0 && this._stopPolling();
      }
    };
  }
  async _startPolling() {
    if (!this._polling)
      for (this._polling = !0, this._pollAbort = new AbortController(), this._state.next("polling"); this._polling && !this._pollAbort.signal.aborted; ) try {
        const e = await this._recvBuffer.read();
        if (!e || e.seq <= this._lastSeq) continue;
        this._lastSeq = e.seq;
        const t = this._encoder.decode(e.data);
        if (t.seq = e.seq, t.workerId = t.workerId ?? this._workerId, (e.flags & Rs || t.type === "response") && t.reqId) {
          const n = this._pending.get(t.reqId);
          if (n) {
            this._pending.delete(t.reqId), t.payload?.error ? n.reject(new Error(t.payload.error)) : n.resolve(t.payload?.result ?? t.payload);
            continue;
          }
        }
        for (const n of this._subs) try {
          n.next?.(t);
        } catch (s) {
          n.error?.(s);
        }
      } catch (e) {
        for (const t of this._subs) t.error?.(e);
      }
  }
  _stopPolling() {
    this._polling = !1, this._pollAbort?.abort(), this._pollAbort = null, this._state.next("stopped");
  }
  close() {
    this._subs.forEach((e) => e.complete?.()), this._subs.clear(), this._stopPolling();
  }
  get sendBuffer() {
    return this._sendBuffer.buffer;
  }
  get recvBuffer() {
    return this._recvBuffer.buffer;
  }
  get workerId() {
    return this._workerId;
  }
  get state() {
    return this._state;
  }
  get channelName() {
    return this._channelName;
  }
};
function Jt(e, t = {}) {
  const n = t.bufferSize ?? 65536, s = new SharedArrayBuffer(n), r = new SharedArrayBuffer(n);
  return {
    main: new le(e, s, r, t),
    worker: {
      sendBuffer: r,
      recvBuffer: s
    }
  };
}
function Ti(e, t, n, s = {}) {
  return new le(e, t, n, s);
}
var Xt = class y {
  _buffer;
  _meta;
  _data;
  _slotSize;
  _slotCount;
  _mask;
  static META_SIZE = 16;
  static WRITE_IDX = 0;
  static READ_IDX = 4;
  static OVERFLOW = 8;
  constructor(t = {}) {
    if (t instanceof SharedArrayBuffer)
      this._buffer = t, this._slotCount = 64, this._slotSize = (this._buffer.byteLength - y.META_SIZE) / this._slotCount;
    else {
      this._slotSize = t.slotSize ?? 1024, this._slotCount = t.slotCount ?? 64, this._slotCount = 1 << Math.ceil(Math.log2(this._slotCount));
      const n = y.META_SIZE + this._slotSize * this._slotCount;
      this._buffer = new SharedArrayBuffer(n);
    }
    this._meta = new Int32Array(this._buffer, 0, y.META_SIZE / 4), this._data = new Uint8Array(this._buffer, y.META_SIZE), this._mask = this._slotCount - 1;
  }
  write(t) {
    if (t.byteLength > this._slotSize - 4) return !1;
    const n = Atomics.load(this._meta, y.WRITE_IDX), s = Atomics.load(this._meta, y.READ_IDX);
    if ((n + 1 & this._mask) === (s & this._mask))
      return Atomics.add(this._meta, y.OVERFLOW, 1), !1;
    const r = (n & this._mask) * this._slotSize;
    return new DataView(this._buffer, y.META_SIZE + r).setUint32(0, t.byteLength, !0), this._data.set(t, r + 4), Atomics.store(this._meta, y.WRITE_IDX, n + 1), Atomics.notify(this._meta, y.WRITE_IDX), !0;
  }
  read() {
    const t = Atomics.load(this._meta, y.WRITE_IDX), n = Atomics.load(this._meta, y.READ_IDX);
    if (n === t) return null;
    const s = (n & this._mask) * this._slotSize, r = new DataView(this._buffer, y.META_SIZE + s).getUint32(0, !0);
    if (r === 0 || r > this._slotSize - 4) return null;
    const i = new Uint8Array(r);
    return i.set(this._data.subarray(s + 4, s + 4 + r)), Atomics.store(this._meta, y.READ_IDX, n + 1), i;
  }
  async waitRead(t) {
    const n = Atomics.load(this._meta, y.WRITE_IDX);
    if (Atomics.load(this._meta, y.READ_IDX) < n) return this.read();
    if ("waitAsync" in Atomics) {
      if (await Atomics.waitAsync(this._meta, y.WRITE_IDX, n, t ?? 1e3).value === "ok") return this.read();
    } else
      return await new Promise((s) => setTimeout(s, Math.min(t ?? 1e3, 100))), this.read();
    return null;
  }
  get buffer() {
    return this._buffer;
  }
  get available() {
    return Atomics.load(this._meta, y.WRITE_IDX) - Atomics.load(this._meta, y.READ_IDX) & this._mask;
  }
  get overflow() {
    return Atomics.load(this._meta, y.OVERFLOW);
  }
}, Pi = {
  create: (e, t, n, s) => new le(e, t, n, s),
  createPair: (e, t) => Jt(e, t),
  createBuffer: (e, t) => new V(e, t),
  createRingBuffer: (e) => new Xt(e),
  getCBOR: Kt
}, qs = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" }
], Ce = class {
  _channelName;
  _config;
  _pc;
  _channel = null;
  _subs = /* @__PURE__ */ new Set();
  _pending = /* @__PURE__ */ new Map();
  _localId = h();
  _remoteId = null;
  _state = new _();
  _channelState = new _();
  _iceCandidates = [];
  _iceGatheringComplete = !1;
  constructor(e, t = {}) {
    this._channelName = e, this._config = t, this._pc = new RTCPeerConnection({ iceServers: t.iceServers ?? qs }), this._setupPeerConnection();
  }
  _setupPeerConnection() {
    this._pc.onicecandidate = (e) => {
      e.candidate && (this._iceCandidates.push(e.candidate.toJSON()), this._remoteId && this._config.signaling && this._config.signaling.send(this._remoteId, {
        type: "ice-candidate",
        fromPeerId: this._localId,
        toPeerId: this._remoteId,
        candidate: e.candidate.toJSON()
      }));
    }, this._pc.onicegatheringstatechange = () => {
      this._pc.iceGatheringState === "complete" && (this._iceGatheringComplete = !0);
    }, this._pc.onconnectionstatechange = () => {
      if (this._state.next(this._pc.connectionState), this._pc.connectionState === "failed" || this._pc.connectionState === "disconnected") for (const e of this._subs) e.error?.(/* @__PURE__ */ new Error(`Connection ${this._pc.connectionState}`));
    }, this._pc.ondatachannel = (e) => {
      this._setupDataChannel(e.channel);
    };
  }
  _setupDataChannel(e) {
    this._channel = e, e.binaryType = "arraybuffer", e.onopen = () => {
      this._channelState.next("open");
    }, e.onclose = () => {
      this._channelState.next("closed");
      for (const t of this._subs) t.complete?.();
    }, e.onerror = (t) => {
      const n = /* @__PURE__ */ new Error("DataChannel error");
      for (const s of this._subs) s.error?.(n);
    }, e.onmessage = (t) => {
      let n;
      if (typeof t.data == "string" ? n = JSON.parse(t.data) : n = this._decodeBinary(t.data), n.peerId = this._remoteId ?? void 0, n.dataChannelLabel = e.label, n.type === "response" && n.reqId) {
        const s = this._pending.get(n.reqId);
        if (s) {
          this._pending.delete(n.reqId), n.payload?.error ? s.reject(new Error(n.payload.error)) : s.resolve(n.payload?.result ?? n.payload);
          return;
        }
      }
      for (const s of this._subs) try {
        s.next?.(n);
      } catch (r) {
        s.error?.(r);
      }
    };
  }
  async createOffer(e) {
    this._remoteId = e;
    const t = this._pc.createDataChannel(this._channelName, this._config.dataChannelOptions);
    this._setupDataChannel(t);
    const n = await this._pc.createOffer();
    return await this._pc.setLocalDescription(n), {
      type: "offer",
      fromPeerId: this._localId,
      toPeerId: e,
      sdp: n.sdp
    };
  }
  async handleOffer(e) {
    this._remoteId = e.fromPeerId, await this._pc.setRemoteDescription({
      type: "offer",
      sdp: e.sdp
    });
    const t = await this._pc.createAnswer();
    return await this._pc.setLocalDescription(t), {
      type: "answer",
      fromPeerId: this._localId,
      toPeerId: e.fromPeerId,
      sdp: t.sdp
    };
  }
  async handleAnswer(e) {
    await this._pc.setRemoteDescription({
      type: "answer",
      sdp: e.sdp
    });
  }
  async addIceCandidate(e) {
    e.candidate && await this._pc.addIceCandidate(e.candidate);
  }
  send(e, t) {
    if (!this._channel || this._channel.readyState !== "open") return;
    const { transferable: n, peerId: s, dataChannelLabel: r, ...i } = e;
    t || e.binary ? this._channel.send(this._encodeBinary(i)) : this._channel.send(JSON.stringify(i));
  }
  request(e) {
    const t = e.reqId ?? h();
    return new Promise((n, s) => {
      const r = setTimeout(() => {
        this._pending.delete(t), s(/* @__PURE__ */ new Error("Request timeout"));
      }, this._config.connectionTimeout ?? 3e4);
      this._pending.set(t, {
        resolve: (i) => {
          clearTimeout(r), n(i);
        },
        reject: (i) => {
          clearTimeout(r), s(i);
        },
        timestamp: Date.now()
      }), this.send({
        ...e,
        reqId: t,
        type: "request"
      });
    });
  }
  subscribe(e) {
    const t = typeof e == "function" ? { next: e } : e;
    return this._subs.add(t), {
      closed: !1,
      unsubscribe: () => {
        this._subs.delete(t);
      }
    };
  }
  _encodeBinary(e) {
    const t = JSON.stringify(e);
    return new TextEncoder().encode(t).buffer;
  }
  _decodeBinary(e) {
    const t = new TextDecoder().decode(e);
    return JSON.parse(t);
  }
  close() {
    this._subs.forEach((e) => e.complete?.()), this._subs.clear(), this._remoteId && this._config.signaling && this._config.signaling.send(this._remoteId, {
      type: "disconnect",
      fromPeerId: this._localId,
      toPeerId: this._remoteId
    }), this._channel?.close(), this._pc.close();
  }
  get localId() {
    return this._localId;
  }
  get remoteId() {
    return this._remoteId;
  }
  get connectionState() {
    return this._pc.connectionState;
  }
  get channelState() {
    return this._channel?.readyState ?? null;
  }
  get state() {
    return this._state;
  }
  get channelStateObservable() {
    return this._channelState;
  }
  get iceCandidates() {
    return [...this._iceCandidates];
  }
  get channelName() {
    return this._channelName;
  }
}, Qe = class {
  _channelName;
  _config;
  _peers = /* @__PURE__ */ new Map();
  _localId = h();
  _subs = /* @__PURE__ */ new Set();
  _signalingCleanup = null;
  _peerEvents = new _();
  constructor(e, t = {}) {
    this._channelName = e, this._config = t, this._setupSignaling();
  }
  _setupSignaling() {
    if (!this._config.signaling) return;
    const e = this._config.signaling.onMessage(async (t) => {
      if (t.toPeerId === this._localId)
        switch (t.type) {
          case "offer": {
            const n = await this._getOrCreatePeer(t.fromPeerId).handleOffer(t);
            this._config.signaling.send(t.fromPeerId, n);
            break;
          }
          case "answer": {
            const n = this._peers.get(t.fromPeerId);
            n && await n.handleAnswer(t);
            break;
          }
          case "ice-candidate": {
            const n = this._peers.get(t.fromPeerId);
            n && await n.addIceCandidate(t);
            break;
          }
          case "disconnect":
            this._removePeer(t.fromPeerId);
            break;
        }
    });
    typeof e == "function" ? this._signalingCleanup = e : e && "unsubscribe" in e && (this._signalingCleanup = () => e.unsubscribe());
  }
  _getOrCreatePeer(e) {
    let t = this._peers.get(e);
    return t || (t = new Ce(this._channelName, this._config), this._peers.set(e, t), t.state.subscribe({ next: (n) => {
      n === "connected" ? this._peerEvents.next({
        type: "connected",
        peerId: e,
        peer: t
      }) : n === "disconnected" || n === "closed" ? this._peerEvents.next({
        type: "disconnected",
        peerId: e
      }) : n === "failed" && (this._peerEvents.next({
        type: "failed",
        peerId: e
      }), this._removePeer(e));
    } }), t.subscribe({
      next: (n) => {
        for (const s of this._subs) try {
          s.next?.(n);
        } catch (r) {
          s.error?.(r);
        }
      },
      error: (n) => {
        for (const s of this._subs) s.error?.(n);
      }
    })), t;
  }
  _removePeer(e) {
    const t = this._peers.get(e);
    t && (t.close(), this._peers.delete(e), this._peerEvents.next({
      type: "disconnected",
      peerId: e
    }));
  }
  async connect(e) {
    const t = this._getOrCreatePeer(e), n = await t.createOffer(e);
    return this._config.signaling && await this._config.signaling.send(e, n), t;
  }
  send(e, t) {
    this._peers.get(e)?.send(t);
  }
  broadcast(e) {
    for (const t of this._peers.values()) t.send(e);
  }
  request(e, t) {
    const n = this._peers.get(e);
    return n ? n.request(t) : Promise.reject(/* @__PURE__ */ new Error("Peer not found"));
  }
  subscribe(e) {
    const t = typeof e == "function" ? { next: e } : e;
    return this._subs.add(t), {
      closed: !1,
      unsubscribe: () => {
        this._subs.delete(t);
      }
    };
  }
  onPeerEvent(e) {
    return this._peerEvents.subscribe({ next: e });
  }
  getPeers() {
    const e = /* @__PURE__ */ new Map();
    for (const [t, n] of this._peers) e.set(t, {
      id: t,
      connectionState: n.connectionState,
      iceConnectionState: "new",
      dataChannelState: n.channelState ?? "closed"
    });
    return e;
  }
  close() {
    this._signalingCleanup?.(), this._subs.forEach((e) => e.complete?.()), this._subs.clear();
    for (const e of this._peers.values()) e.close();
    this._peers.clear();
  }
  get localId() {
    return this._localId;
  }
  get peerCount() {
    return this._peers.size;
  }
  get channelName() {
    return this._channelName;
  }
};
function Zt(e) {
  const t = new BroadcastChannel(`rtc-signaling:${e}`), n = /* @__PURE__ */ new Set();
  return t.onmessage = (s) => {
    for (const r of n) r(s.data);
  }, {
    send(s, r) {
      t.postMessage(r);
    },
    onMessage(s) {
      return n.add(s), {
        unsubscribe: () => n.delete(s),
        closed: !1
      };
    },
    close() {
      t.close(), n.clear();
    }
  };
}
var Mi = {
  createPeer: (e, t) => new Ce(e, t),
  createManager: (e, t) => new Qe(e, t),
  createSignaling: (e) => Zt(e)
}, H = class {
  _channelName;
  _config;
  _port;
  _subs = /* @__PURE__ */ new Set();
  _pending = /* @__PURE__ */ new Map();
  _listening = !1;
  _cleanup = null;
  _portId = h();
  _state = new _();
  _keepAliveTimer = null;
  constructor(e, t, n = {}) {
    this._channelName = t, this._config = n, this._port = e, this._setupPort(), n.autoStart !== !1 && this.start();
  }
  _setupPort() {
    const e = (n) => {
      const s = n.data;
      if (s.type === "response" && s.reqId) {
        const r = this._pending.get(s.reqId);
        if (r) {
          this._pending.delete(s.reqId), s.payload?.error ? r.reject(new Error(s.payload.error)) : r.resolve(s.payload?.result ?? s.payload);
          return;
        }
      }
      if (s.type === "signal" && s.payload?.action === "ping") {
        this.send({
          id: h(),
          channel: this._channelName,
          sender: this._portId,
          type: "signal",
          payload: { action: "pong" }
        });
        return;
      }
      s.portId = s.portId ?? this._portId;
      for (const r of this._subs) try {
        r.next?.(s);
      } catch (i) {
        r.error?.(i);
      }
    }, t = () => {
      this._state.next("error");
      const n = /* @__PURE__ */ new Error("Port error");
      for (const s of this._subs) s.error?.(n);
    };
    this._port.addEventListener("message", e), this._port.addEventListener("messageerror", t), this._cleanup = () => {
      this._port.removeEventListener("message", e), this._port.removeEventListener("messageerror", t);
    };
  }
  start() {
    this._listening || (this._port.start(), this._listening = !0, this._state.next("ready"), this._config.keepAlive && this._startKeepAlive());
  }
  send(e, t) {
    const { transferable: n, ...s } = e;
    this._port.postMessage({
      ...s,
      portId: this._portId
    }, t ?? []);
  }
  request(e) {
    const t = e.reqId ?? h();
    return new Promise((n, s) => {
      const r = setTimeout(() => {
        this._pending.delete(t), s(/* @__PURE__ */ new Error("Request timeout"));
      }, this._config.timeout ?? 3e4);
      this._pending.set(t, {
        resolve: (i) => {
          clearTimeout(r), n(i);
        },
        reject: (i) => {
          clearTimeout(r), s(i);
        },
        timestamp: Date.now()
      }), this.send({
        ...e,
        reqId: t,
        type: "request"
      });
    });
  }
  subscribe(e) {
    const t = typeof e == "function" ? { next: e } : e;
    return this._subs.add(t), {
      closed: !1,
      unsubscribe: () => {
        this._subs.delete(t);
      }
    };
  }
  _startKeepAlive() {
    this._keepAliveTimer = setInterval(() => {
      this.send({
        id: h(),
        channel: this._channelName,
        sender: this._portId,
        type: "signal",
        payload: { action: "ping" }
      });
    }, this._config.keepAliveInterval ?? 3e4);
  }
  close() {
    this._keepAliveTimer && (clearInterval(this._keepAliveTimer), this._keepAliveTimer = null), this._cleanup?.(), this._subs.forEach((e) => e.complete?.()), this._subs.clear(), this._port.close(), this._state.next("closed");
  }
  get port() {
    return this._port;
  }
  get portId() {
    return this._portId;
  }
  get isListening() {
    return this._listening;
  }
  get state() {
    return this._state;
  }
  get channelName() {
    return this._channelName;
  }
};
function xe(e, t) {
  const n = new MessageChannel();
  return {
    local: new H(n.port1, e, t),
    remote: n.port2,
    transfer: () => n.port2
  };
}
function Ai(e, t, n) {
  return new H(e, t, n);
}
var en = class {
  _defaultConfig;
  _channels = /* @__PURE__ */ new Map();
  _mainPort = null;
  _subs = /* @__PURE__ */ new Set();
  constructor(e = {}) {
    this._defaultConfig = e;
  }
  create(e, t) {
    const n = xe(e, {
      ...this._defaultConfig,
      ...t
    });
    return n.local.subscribe({ next: (s) => {
      for (const r of this._subs) try {
        r.next?.(s);
      } catch (i) {
        r.error?.(i);
      }
    } }), this._channels.set(e, n.local), n;
  }
  add(e, t, n) {
    const s = new H(t, e, {
      ...this._defaultConfig,
      ...n
    });
    return s.subscribe({ next: (r) => {
      for (const i of this._subs) try {
        i.next?.(r);
      } catch (o) {
        i.error?.(o);
      }
    } }), this._channels.set(e, s), s;
  }
  get(e) {
    return this._channels.get(e);
  }
  send(e, t, n) {
    this._channels.get(e)?.send(t, n);
  }
  broadcast(e, t) {
    for (const n of this._channels.values()) n.send(e, t);
  }
  request(e, t) {
    const n = this._channels.get(e);
    return n ? n.request(t) : Promise.reject(/* @__PURE__ */ new Error(`Channel ${e} not found`));
  }
  subscribe(e) {
    const t = typeof e == "function" ? { next: e } : e;
    return this._subs.add(t), {
      closed: !1,
      unsubscribe: () => {
        this._subs.delete(t);
      }
    };
  }
  remove(e) {
    const t = this._channels.get(e);
    t && (t.close(), this._channels.delete(e));
  }
  close() {
    this._subs.forEach((e) => e.complete?.()), this._subs.clear();
    for (const e of this._channels.values()) e.close();
    this._channels.clear();
  }
  get channelNames() {
    return Array.from(this._channels.keys());
  }
  get size() {
    return this._channels.size;
  }
}, qe = class {
  _target;
  _channelName;
  _config;
  _transport = null;
  _state = new _();
  _handshakeComplete = !1;
  constructor(e, t, n = {}) {
    this._target = e, this._channelName = t, this._config = n;
  }
  async connect() {
    if (this._transport && this._handshakeComplete) return this._transport;
    this._state.next("connecting");
    const { local: e, remote: t } = xe(this._channelName, this._config);
    return this._target.postMessage({
      type: "port-connect",
      channelName: this._channelName,
      portId: e.portId
    }, this._config.targetOrigin ?? "*", [t]), new Promise((n, s) => {
      const r = setTimeout(() => {
        s(/* @__PURE__ */ new Error("Handshake timeout")), this._state.next("error");
      }, this._config.handshakeTimeout ?? 1e4), i = e.subscribe({ next: (o) => {
        o.type === "signal" && o.payload?.action === "handshake-ack" && (clearTimeout(r), this._handshakeComplete = !0, this._transport = e, this._state.next("connected"), i.unsubscribe(), n(e));
      } });
    });
  }
  static listen(e, t, n) {
    const s = (r) => {
      if (r.data?.type !== "port-connect" || r.data?.channelName !== e || !r.ports[0]) return;
      const i = new H(r.ports[0], e, n);
      i.send({
        id: h(),
        channel: e,
        sender: i.portId,
        type: "signal",
        payload: { action: "handshake-ack" }
      }), t(i);
    };
    return globalThis.addEventListener("message", s), () => globalThis.removeEventListener("message", s);
  }
  disconnect() {
    this._transport?.close(), this._transport = null, this._handshakeComplete = !1, this._state.next("disconnected");
  }
  get isConnected() {
    return this._handshakeComplete;
  }
  get state() {
    return this._state;
  }
  get transport() {
    return this._transport;
  }
};
function Os(e, t = []) {
  return Bn({
    request: (n) => e.request(n),
    channelName: e.channelName,
    senderId: e.portId
  }, t);
}
function Ns(e, t) {
  const n = Ln(t);
  return e.subscribe({ next: async (s) => {
    if (s.type !== "request" || !s.payload?.path) return;
    const { action: r, path: i, args: o } = s.payload;
    let a, c;
    try {
      a = await n(r, i, o ?? []);
    } catch (l) {
      c = l instanceof Error ? l.message : String(l);
    }
    e.send({
      id: h(),
      channel: s.sender,
      sender: e.portId,
      type: "response",
      reqId: s.reqId,
      payload: c ? { error: c } : { result: a }
    });
  } });
}
var Ri = {
  create: (e, t, n) => new H(e, t, n),
  createPair: (e, t) => xe(e, t),
  createPool: (e) => new en(e),
  createWindowConnector: (e, t, n) => new qe(e, t, n),
  listen: qe.listen,
  createProxy: Os,
  expose: Ns
}, Ke = class {
  _db = null;
  _config;
  _changes = new _();
  _state = new _();
  _cleanupTimer = null;
  constructor(e) {
    this._config = {
      storeName: "transferable",
      version: 1,
      indexes: [],
      enableChangeTracking: !0,
      autoCleanupExpired: !0,
      cleanupInterval: 6e4,
      ...e
    };
  }
  async open() {
    if (!this._db)
      return this._state.next("opening"), new Promise((e, t) => {
        const n = indexedDB.open(this._config.dbName, this._config.version);
        n.onerror = () => {
          this._state.next("error"), t(/* @__PURE__ */ new Error(`Failed to open database: ${n.error?.message}`));
        }, n.onsuccess = () => {
          this._db = n.result, this._state.next("open"), this._config.autoCleanupExpired && this._startCleanupTimer(), e();
        }, n.onupgradeneeded = (s) => {
          const r = s.target.result;
          if (!r.objectStoreNames.contains(this._config.storeName)) {
            const i = r.createObjectStore(this._config.storeName, { keyPath: "id" });
            i.createIndex("createdAt", "createdAt"), i.createIndex("updatedAt", "updatedAt"), i.createIndex("expiresAt", "expiresAt");
            for (const o of this._config.indexes) i.createIndex(o.name, o.keyPath, { unique: o.unique ?? !1 });
          }
        };
      });
  }
  close() {
    this._cleanupTimer && (clearInterval(this._cleanupTimer), this._cleanupTimer = null), this._db?.close(), this._db = null, this._state.next("closed");
  }
  async put(e, t, n = {}) {
    await this._ensureOpen();
    let s = n.buffers ?? [];
    n.transfer && s.length > 0 && (s = s.map((a) => "transfer" in a && typeof a.transfer == "function" ? a.transfer() : a));
    const r = Date.now(), i = await this.get(e), o = {
      id: e,
      data: t,
      buffers: s.length > 0 ? s : void 0,
      metadata: n.metadata,
      createdAt: i?.createdAt ?? r,
      updatedAt: r,
      expiresAt: n.expiresIn ? r + n.expiresIn : void 0
    };
    return new Promise((a, c) => {
      const l = this._db.transaction(this._config.storeName, "readwrite").objectStore(this._config.storeName).put(o);
      l.onsuccess = () => {
        this._config.enableChangeTracking && this._changes.next({
          type: i ? "put" : "add",
          key: e,
          record: o,
          previousRecord: i ?? void 0,
          timestamp: r
        }), a(o);
      }, l.onerror = () => c(/* @__PURE__ */ new Error(`Put failed: ${l.error?.message}`));
    });
  }
  async putBuffer(e, t, n = {}) {
    return this.put(e, t, {
      buffers: [t],
      ...n
    });
  }
  async putTypedArray(e, t, n = {}) {
    const s = {
      type: t.constructor.name,
      data: Array.from(t)
    };
    return this.put(e, s, {
      buffers: n.transfer ? [t.buffer] : void 0,
      ...n
    });
  }
  async get(e) {
    return await this._ensureOpen(), new Promise((t, n) => {
      const s = this._db.transaction(this._config.storeName, "readonly").objectStore(this._config.storeName).get(e);
      s.onsuccess = () => {
        const r = s.result;
        r?.expiresAt && r.expiresAt < Date.now() ? (this.delete(e), t(null)) : t(r ?? null);
      }, s.onerror = () => n(/* @__PURE__ */ new Error(`Get failed: ${s.error?.message}`));
    });
  }
  async getBuffer(e, t) {
    const n = await this.get(e);
    if (!n) return null;
    let s = n.buffers?.[0] ?? (n.data instanceof ArrayBuffer ? n.data : null);
    return s && t && "transfer" in s && typeof s.transfer == "function" && (s = s.transfer()), s;
  }
  async getTypedArray(e) {
    const t = await this.get(e);
    if (!t || !t.data || typeof t.data != "object") return null;
    const { type: n, data: s } = t.data, r = globalThis[n];
    return r ? new r(s) : null;
  }
  async delete(e) {
    await this._ensureOpen();
    const t = this._config.enableChangeTracking ? await this.get(e) : null;
    return new Promise((n, s) => {
      const r = this._db.transaction(this._config.storeName, "readwrite").objectStore(this._config.storeName).delete(e);
      r.onsuccess = () => {
        this._config.enableChangeTracking && t && this._changes.next({
          type: "delete",
          key: e,
          previousRecord: t,
          timestamp: Date.now()
        }), n(!0);
      }, r.onerror = () => s(/* @__PURE__ */ new Error(`Delete failed: ${r.error?.message}`));
    });
  }
  async query(e = {}) {
    return await this._ensureOpen(), new Promise((t, n) => {
      const s = this._db.transaction(this._config.storeName, "readonly").objectStore(this._config.storeName), r = e.index ? s.index(e.index) : s, i = [];
      let o = 0;
      const a = e.offset ?? 0, c = e.limit ?? 1 / 0, l = r.openCursor(e.range, e.direction);
      l.onsuccess = () => {
        const u = l.result;
        if (!u || i.length >= c) {
          t(i);
          return;
        }
        const p = u.value;
        if (p.expiresAt && p.expiresAt < Date.now()) {
          u.continue();
          return;
        }
        if (e.filter && !e.filter(p)) {
          u.continue();
          return;
        }
        if (o < a) {
          o++, u.continue();
          return;
        }
        i.push(p), u.continue();
      }, l.onerror = () => n(/* @__PURE__ */ new Error(`Query failed: ${l.error?.message}`));
    });
  }
  async batch(e) {
    return await this._ensureOpen(), new Promise((t, n) => {
      const s = this._db.transaction(this._config.storeName, "readwrite"), r = s.objectStore(this._config.storeName), i = Date.now();
      for (const o of e) if (o.type === "put") {
        const a = {
          id: o.id,
          data: o.data,
          metadata: o.options?.metadata,
          createdAt: i,
          updatedAt: i,
          expiresAt: o.options?.expiresIn ? i + o.options.expiresIn : void 0
        };
        r.put(a);
      } else o.type === "delete" && r.delete(o.id);
      s.oncomplete = () => t(), s.onerror = () => n(/* @__PURE__ */ new Error(`Batch failed: ${s.error?.message}`));
    });
  }
  async clear() {
    return await this._ensureOpen(), new Promise((e, t) => {
      const n = this._db.transaction(this._config.storeName, "readwrite").objectStore(this._config.storeName).clear();
      n.onsuccess = () => {
        this._config.enableChangeTracking && this._changes.next({
          type: "clear",
          key: "*",
          timestamp: Date.now()
        }), e();
      }, n.onerror = () => t(/* @__PURE__ */ new Error(`Clear failed: ${n.error?.message}`));
    });
  }
  async count(e) {
    return await this._ensureOpen(), new Promise((t, n) => {
      const s = this._db.transaction(this._config.storeName, "readonly").objectStore(this._config.storeName), r = (e?.index ? s.index(e.index) : s).count(e?.range);
      r.onsuccess = () => t(r.result), r.onerror = () => n(/* @__PURE__ */ new Error(`Count failed: ${r.error?.message}`));
    });
  }
  onChanges(e) {
    return this._changes.subscribe({ next: e });
  }
  onState(e) {
    return this._state.subscribe({ next: e });
  }
  async cleanupExpired() {
    await this._ensureOpen();
    const e = Date.now(), t = await this.query({
      index: "expiresAt",
      range: IDBKeyRange.upperBound(e)
    });
    for (const n of t) await this.delete(n.id);
    return t.length;
  }
  async _ensureOpen() {
    this._db || await this.open();
  }
  _startCleanupTimer() {
    this._cleanupTimer = setInterval(() => {
      this.cleanupExpired().catch(console.error);
    }, this._config.cleanupInterval);
  }
  get isOpen() {
    return this._db !== null;
  }
  get state() {
    return this._state;
  }
  get changes() {
    return this._changes;
  }
}, tn = class extends Ke {
  constructor(e = "uniform-message-queue") {
    super({
      dbName: e,
      storeName: "messages",
      indexes: [
        {
          name: "channel",
          keyPath: "channel"
        },
        {
          name: "status",
          keyPath: "status"
        },
        {
          name: "priority",
          keyPath: "priority"
        },
        {
          name: "scheduledFor",
          keyPath: "scheduledFor"
        },
        {
          name: "channel-status",
          keyPath: ["channel", "status"]
        }
      ]
    });
  }
  async enqueue(e) {
    const t = Date.now(), n = h(), s = {
      id: n,
      channel: e.channel,
      sender: e.sender,
      type: e.type,
      payload: e.payload,
      priority: e.priority ?? 0,
      attempts: 0,
      maxAttempts: e.maxAttempts ?? 3,
      status: "pending",
      createdAt: t,
      scheduledFor: t + (e.delay ?? 0),
      expiresAt: e.expiresIn ? t + e.expiresIn : void 0
    };
    return await this.put(n, s), s;
  }
  async dequeue(e) {
    const t = Date.now(), n = await this.query({
      filter: (r) => r.data.channel === e && r.data.status === "pending" && r.data.scheduledFor <= t && (!r.data.expiresAt || r.data.expiresAt > t),
      limit: 1
    });
    if (n.length === 0) return null;
    const s = n[0].data;
    return s.status = "processing", s.attempts++, s.lastAttemptAt = t, await this.put(s.id, s), s;
  }
  async complete(e) {
    const t = await this.get(e);
    t && (t.data.status = "completed", await this.put(e, t.data));
  }
  async fail(e, t) {
    const n = await this.get(e);
    n && (n.data.attempts >= n.data.maxAttempts ? n.data.status = "failed" : n.data.status = "pending", n.data.error = t, await this.put(e, n.data));
  }
  async getPendingCount(e) {
    return (await this.query({ filter: (t) => t.data.channel === e && t.data.status === "pending" })).length;
  }
}, qi = {
  create: (e) => new Ke(e),
  createMessageQueue: (e) => new tn(e)
}, Ye = class {
  _connection;
  _storage;
  _clients = /* @__PURE__ */ new Map();
  _channelSubscribers = /* @__PURE__ */ new Map();
  _subscriptions = [];
  _cleanupInterval = null;
  _clientEvents = new _();
  _config;
  constructor(e) {
    this._config = {
      enableOfflineQueue: !0,
      maxOfflineQueueSize: 100,
      messageTTL: 1440 * 60 * 1e3,
      autoCleanup: !0,
      cleanupInterval: 60 * 1e3,
      ...e
    }, this._connection = je().getOrCreate(this._config.channelName, "service-worker", { metadata: { isHost: !0 } }), this._storage = Wt(this._config.channelName), this._setupMessageHandlers(), this._config.autoCleanup && this._startCleanupInterval();
  }
  async registerClient(e, t = {}) {
    const n = {
      id: e,
      type: t.type ?? "window",
      url: t.url ?? "",
      visibilityState: t.visibilityState ?? "visible",
      focused: t.focused ?? !1,
      connectedAt: Date.now(),
      lastSeen: Date.now(),
      channels: new Set(t.channels ?? [])
    };
    this._clients.set(e, n), this._clientEvents.next({
      type: "connected",
      client: n
    }), await this._deliverQueuedMessages(e);
  }
  unregisterClient(e) {
    const t = this._clients.get(e);
    if (t) {
      for (const n of this._channelSubscribers.values()) n.delete(e);
      this._clients.delete(e), this._clientEvents.next({
        type: "disconnected",
        client: t
      });
    }
  }
  updateClient(e, t) {
    const n = this._clients.get(e);
    n && (Object.assign(n, t, { lastSeen: Date.now() }), this._clientEvents.next({
      type: "updated",
      client: n
    }));
  }
  subscribeClientToChannel(e, t) {
    const n = this._clients.get(e);
    n && n.channels.add(t), this._channelSubscribers.has(t) || this._channelSubscribers.set(t, /* @__PURE__ */ new Set()), this._channelSubscribers.get(t).add(e);
  }
  unsubscribeClientFromChannel(e, t) {
    const n = this._clients.get(e);
    n && n.channels.delete(t), this._channelSubscribers.get(t)?.delete(e);
  }
  getClients() {
    return new Map(this._clients);
  }
  getChannelSubscribers(e) {
    return new Set(this._channelSubscribers.get(e) ?? []);
  }
  async sendToClient(e, t) {
    return this._clients.get(e) ? this._postToClient(e, t) : (this._config.enableOfflineQueue && await this._queueMessage(e, t), !1);
  }
  async broadcastToChannel(e, t) {
    const n = this._channelSubscribers.get(e);
    if (!n || n.size === 0) return 0;
    let s = 0;
    for (const r of n) await this.sendToClient(r, t) && s++;
    return s;
  }
  async broadcastToAll(e) {
    let t = 0;
    for (const n of this._clients.keys()) await this.sendToClient(n, e) && t++;
    return t;
  }
  async handleClientMessage(e, t) {
    if (this.updateClient(e, { lastSeen: Date.now() }), !(!t || typeof t != "object"))
      switch (t.type) {
        case "connect":
          await this.registerClient(e, t.payload);
          break;
        case "disconnect":
          this.unregisterClient(e);
          break;
        case "subscribe":
          this.subscribeClientToChannel(e, t.payload?.channel);
          break;
        case "unsubscribe":
          this.unsubscribeClientFromChannel(e, t.payload?.channel);
          break;
        case "request":
          const n = await this._handleRequest(t);
          n && await this.sendToClient(e, n);
          break;
        case "event":
          t.channel && await this.broadcastToChannel(t.channel, t);
          break;
        default:
          this._connection.pushInbound({
            ...t,
            _clientId: e
          });
      }
  }
  onClientEvent(e) {
    return this._clientEvents.subscribe({ next: e });
  }
  onMessage(e) {
    return this._connection.subscribe(e);
  }
  onMessageType(e, t) {
    return this._connection.subscribe((n) => {
      n.type === e && t(n);
    });
  }
  async _queueMessage(e, t) {
    await this._storage.defer({
      channel: t.channel,
      sender: t.sender,
      type: t.type,
      payload: {
        ...t.payload,
        _targetClient: e
      }
    }, {
      expiresIn: this._config.messageTTL,
      priority: 0,
      metadata: { targetClient: e }
    });
  }
  async _deliverQueuedMessages(e) {
    if (!this._config.enableOfflineQueue) return;
    const t = await this._storage.getDeferredMessages(e, { status: "pending" });
    for (const n of t) {
      const s = {
        id: n.id,
        channel: n.channel,
        sender: n.sender,
        type: n.type,
        payload: n.payload,
        timestamp: n.createdAt
      };
      await this._postToClient(e, s) && await this._storage.markDelivered(n.id);
    }
  }
  async start() {
    await this._storage.open(), this._connection.markConnected(), await this._storage.cleanupExpired();
  }
  stop() {
    this._cleanupInterval && (clearInterval(this._cleanupInterval), this._cleanupInterval = null);
    for (const e of this._subscriptions) e.unsubscribe();
    this._subscriptions = [], this._connection.close(), this._storage.close();
  }
  _setupMessageHandlers() {
    const e = this._connection.subscribe({ next: (t) => {
      t.type === "request" && this._handleRequest(t);
    } });
    this._subscriptions.push(e);
  }
  async _handleRequest(e) {
    const t = {
      id: h(),
      channel: e.sender,
      sender: this._config.channelName,
      type: "response",
      reqId: e.reqId,
      payload: {
        result: null,
        error: null
      },
      timestamp: Date.now()
    };
    try {
      switch (e.payload?.action) {
        case "getClients":
          t.payload.result = Array.from(this._clients.values()).map((s) => ({
            ...s,
            channels: Array.from(s.channels)
          }));
          break;
        case "getChannelInfo":
          const n = e.payload?.channel;
          t.payload.result = {
            channel: n,
            subscriberCount: this._channelSubscribers.get(n)?.size ?? 0
          };
          break;
        case "ping":
          t.payload.result = "pong";
          break;
        default:
          return this._connection.pushInbound(e), null;
      }
    } catch (n) {
      t.payload.error = n instanceof Error ? n.message : String(n);
    }
    return t;
  }
  async _postToClient(e, t) {
    if (typeof clients > "u") return !1;
    try {
      const n = await clients.get(e);
      if (n)
        return n.postMessage(t), !0;
    } catch (n) {
      console.error("[SWHost] Failed to post to client:", n);
    }
    return !1;
  }
  _startCleanupInterval() {
    this._cleanupInterval = setInterval(() => {
      this._cleanupStaleClients(), this._storage.cleanupExpired();
    }, this._config.cleanupInterval);
  }
  async _cleanupStaleClients() {
    if (typeof clients > "u") return;
    const e = await clients.matchAll({ includeUncontrolled: !0 }), t = new Set(e.map((n) => n.id));
    for (const n of this._clients.keys()) t.has(n) || this.unregisterClient(n);
  }
}, Je = class {
  _channelName;
  _registration = null;
  _messageHandler = null;
  _subject = new _();
  _pendingRequests = /* @__PURE__ */ new Map();
  _isConnected = !1;
  constructor(e) {
    this._channelName = e;
  }
  async connect() {
    if (!("serviceWorker" in navigator)) throw new Error("Service Worker not supported");
    this._registration = await navigator.serviceWorker.ready, this._messageHandler = (e) => {
      const t = e.data;
      if (!(!t || typeof t != "object")) {
        if (t.type === "response" && t.reqId) {
          const n = this._pendingRequests.get(t.reqId);
          if (n) {
            this._pendingRequests.delete(t.reqId), t.payload?.error ? n.reject(new Error(t.payload.error)) : n.resolve(t.payload?.result);
            return;
          }
        }
        this._subject.next(t);
      }
    }, navigator.serviceWorker.addEventListener("message", this._messageHandler), this._sendToSW({
      type: "connect",
      channel: this._channelName,
      payload: {
        url: location.href,
        visibilityState: document.visibilityState,
        focused: document.hasFocus()
      }
    }), this._isConnected = !0, document.addEventListener("visibilitychange", this._onVisibilityChange);
  }
  disconnect() {
    this._messageHandler && (navigator.serviceWorker.removeEventListener("message", this._messageHandler), this._messageHandler = null), this._sendToSW({
      type: "disconnect",
      channel: this._channelName
    }), document.removeEventListener("visibilitychange", this._onVisibilityChange), this._isConnected = !1;
  }
  subscribeToChannel(e) {
    this._sendToSW({
      type: "subscribe",
      channel: this._channelName,
      payload: { channel: e }
    });
  }
  unsubscribeFromChannel(e) {
    this._sendToSW({
      type: "unsubscribe",
      channel: this._channelName,
      payload: { channel: e }
    });
  }
  async request(e, t = {}) {
    const n = h(), s = Promise.withResolvers();
    return this._pendingRequests.set(n, s), this._sendToSW({
      id: h(),
      type: "request",
      channel: this._channelName,
      sender: "client",
      reqId: n,
      payload: {
        action: e,
        ...t
      },
      timestamp: Date.now()
    }), setTimeout(() => {
      this._pendingRequests.has(n) && (this._pendingRequests.delete(n), s.reject(/* @__PURE__ */ new Error("Request timeout")));
    }, 3e4), s.promise;
  }
  emit(e, t, n) {
    this._sendToSW({
      id: h(),
      type: "event",
      channel: n ?? this._channelName,
      sender: "client",
      payload: {
        type: e,
        data: t
      },
      timestamp: Date.now()
    });
  }
  subscribe(e) {
    return this._subject.subscribe({ next: e });
  }
  on(e, t) {
    return yt((n) => n.type === "event" && n.payload?.type === e)(this._subject).subscribe({ next: (n) => t(n.payload?.data) });
  }
  get isConnected() {
    return this._isConnected;
  }
  _sendToSW(e) {
    this._registration?.active && this._registration.active.postMessage(e);
  }
  _onVisibilityChange = () => {
    this._isConnected && this._sendToSW({
      type: "event",
      channel: this._channelName,
      payload: {
        type: "visibilityChange",
        data: {
          visibilityState: document.visibilityState,
          focused: document.hasFocus()
        }
      }
    });
  };
};
function Oi(e) {
  return new Ye(e);
}
function Ni(e) {
  return new Je(e);
}
function Ds(e, t = self) {
  const n = (s) => {
    const r = String(s.source?.id || "").trim();
    r && e.handleClientMessage(r, s.data);
  };
  return t.addEventListener("message", n), e.start().catch((s) => {
    console.warn("[ServiceWorkerHost] Failed to start bound host:", s);
  }), { stop() {
    t.removeEventListener("message", n), e.stop();
  } };
}
var Ls = class {
  _type;
  _channelName;
  _config;
  _subs = /* @__PURE__ */ new Set();
  _pending = /* @__PURE__ */ new Map();
  _state = new _();
  _ready = !1;
  constructor(e, t, n) {
    this._type = e, this._channelName = t, this._config = n;
  }
  request(e) {
    const t = e.reqId ?? h();
    return new Promise((n, s) => {
      const r = setTimeout(() => {
        this._pending.delete(t), s(/* @__PURE__ */ new Error("Request timeout"));
      }, this._config.timeout ?? 3e4);
      this._pending.set(t, {
        resolve: (i) => {
          clearTimeout(r), n(i);
        },
        reject: (i) => {
          clearTimeout(r), s(i);
        },
        timestamp: Date.now()
      }), this.send({
        ...e,
        reqId: t,
        type: "request"
      });
    });
  }
  subscribe(e) {
    const t = typeof e == "function" ? { next: e } : e;
    return this._subs.add(t), {
      closed: !1,
      unsubscribe: () => {
        this._subs.delete(t);
      }
    };
  }
  _handleMessage(e) {
    if (e.type === "response" && e.reqId) {
      const t = this._pending.get(e.reqId);
      if (t) {
        this._pending.delete(e.reqId), e.payload?.error ? t.reject(new Error(e.payload.error)) : t.resolve(e.payload?.result ?? e.payload);
        return;
      }
    }
    for (const t of this._subs) try {
      t.next?.(e);
    } catch (n) {
      t.error?.(n);
    }
  }
  close() {
    this._subs.forEach((e) => e.complete?.()), this._subs.clear(), this._ready = !1, this._state.next("disconnected");
  }
  get type() {
    return this._type;
  }
  get channelName() {
    return this._channelName;
  }
  get isReady() {
    return this._ready;
  }
  get state() {
    return this._state;
  }
}, ct = class extends Ls {
  _target;
  _sendFn;
  _cleanup = null;
  constructor(e, t) {
    super(ie(e), t.channelName, t), this._target = e, this._sendFn = b(e), this._setupListener();
  }
  _setupListener() {
    this._cleanup = m(this._target, (e) => this._handleMessage(e), (e) => this._subs.forEach((t) => t.error?.(e)), () => this._subs.forEach((e) => e.complete?.())), this._ready = !0, this._state.next("connected");
  }
  send(e, t) {
    this._sendFn(e, t);
  }
  close() {
    this._cleanup?.(), super.close();
  }
};
function G(e, t = {}, n = {}) {
  const s = {
    channelName: e,
    timeout: 3e4,
    autoConnect: !0,
    ...n
  };
  if (t.worker) {
    const i = t.worker.existing ?? new Worker(t.worker.scriptUrl, t.worker.options);
    return new ct(i, s);
  }
  if (t.sharedWorker) {
    const i = new ve(t.sharedWorker.scriptUrl, e, t.sharedWorker.options);
    return {
      send: (o, a) => i.send(o, a),
      request: (o) => i.request(o),
      subscribe: (o) => i.subscribe(o),
      close: () => i.close(),
      type: "shared-worker",
      channelName: e,
      isReady: !0
    };
  }
  if (t.websocket) {
    const i = pt(t.websocket.url, {
      protocols: t.websocket.protocols,
      reconnect: t.websocket.reconnect
    }), o = /* @__PURE__ */ new Set(), a = /* @__PURE__ */ new Map();
    return i.listen((c) => {
      if (c.type === "response" && c.reqId) {
        const l = a.get(c.reqId);
        if (l) {
          a.delete(c.reqId), c.payload?.error ? l.reject(new Error(c.payload.error)) : l.resolve(c.payload?.result ?? c.payload);
          return;
        }
      }
      for (const l of o) try {
        l.next?.(c);
      } catch {
      }
    }), {
      send: (c, l) => i.send(c, l),
      request: (c) => new Promise((l, u) => {
        const p = c.reqId ?? h(), w = setTimeout(() => {
          a.delete(p), u(/* @__PURE__ */ new Error("Request timeout"));
        }, s.timeout);
        a.set(p, {
          resolve: (k) => {
            clearTimeout(w), l(k);
          },
          reject: (k) => {
            clearTimeout(w), u(k);
          },
          timestamp: Date.now()
        }), i.send({
          ...c,
          reqId: p,
          type: "request"
        });
      }),
      subscribe: (c) => {
        const l = typeof c == "function" ? { next: c } : c;
        return o.add(l), {
          closed: !1,
          unsubscribe: () => o.delete(l)
        };
      },
      close: () => {
        o.clear(), i.close();
      },
      type: "websocket",
      channelName: e,
      isReady: i.socket.readyState === WebSocket.OPEN
    };
  }
  if (t.broadcast) {
    const i = _t(t.broadcast.name ?? e);
    return new ct(i.channel, s);
  }
  if (t.port?.port) {
    const i = new H(t.port.port, e, t.port.config);
    return {
      send: (o, a) => i.send(o, a),
      request: (o) => i.request(o),
      subscribe: (o) => i.subscribe(o),
      close: () => i.close(),
      type: "message-port",
      channelName: e,
      isReady: i.isListening
    };
  }
  if (t.chrome) {
    if (t.chrome.mode === "runtime") {
      const i = new He(void 0, t.chrome.options);
      return {
        send: (o) => i.send(o),
        request: (o) => i.request(o),
        subscribe: (o) => i.subscribe(o),
        close: () => i.close(),
        type: "chrome-runtime",
        channelName: e,
        isReady: !0
      };
    }
    if (t.chrome.mode === "tabs") {
      const i = new ze(t.chrome.tabId, t.chrome.options);
      return {
        send: (o) => i.send(o),
        request: () => Promise.reject("Not supported"),
        subscribe: (o) => i.subscribe(o),
        close: () => i.close(),
        type: "chrome-tabs",
        channelName: e,
        isReady: !0
      };
    }
    if (t.chrome.mode === "port") {
      const i = new Ge(t.chrome.portName ?? e, t.chrome.tabId);
      return {
        send: (o) => i.send(o),
        request: () => Promise.reject("Not supported"),
        subscribe: (o) => i.subscribe(o),
        close: () => i.close(),
        type: "chrome-port",
        channelName: e,
        isReady: i.isConnected
      };
    }
    if (t.chrome.mode === "external") {
      const i = new Qt(t.chrome.options?.extensionId);
      return {
        send: (o) => i.send(o),
        request: () => Promise.reject("Not supported"),
        subscribe: (o) => i.subscribe(o),
        close: () => i.close(),
        type: "chrome-external",
        channelName: e,
        isReady: !0
      };
    }
  }
  if (t.socketio) {
    const i = new we(t.socketio.socket, e, t.socketio.options);
    return {
      send: (o) => i.send(o),
      request: (o) => i.request(o),
      subscribe: (o) => i.subscribe(o),
      close: () => i.close(),
      type: "socket-io",
      channelName: e,
      isReady: i.isConnected
    };
  }
  if (t.serviceWorker) {
    if (t.serviceWorker.mode === "host") {
      const i = new Ye({
        channelName: e,
        ...t.serviceWorker.config ?? {}
      }), o = Ds(i);
      return {
        send: (a) => {
          i.broadcastToAll(a);
        },
        request: () => Promise.reject(/* @__PURE__ */ new Error("ServiceWorkerHost transport does not support request(); use host APIs directly.")),
        subscribe: (a) => i.onMessage(typeof a == "function" ? a : (c) => a.next?.(c)),
        close: () => o.stop(),
        type: "service-worker",
        channelName: e,
        isReady: !0
      };
    }
    if (t.serviceWorker.mode === "client") {
      const i = new Je(e);
      return i.connect(), {
        send: (o) => i.emit(o.type, o.payload, o.channel),
        request: (o) => i.request(o.payload?.action ?? "unknown", o.payload),
        subscribe: (o) => i.subscribe(typeof o == "function" ? o : (a) => o.next?.(a)),
        close: () => i.disconnect(),
        type: "service-worker",
        channelName: e,
        isReady: i.isConnected
      };
    }
  }
  if (t.atomics) {
    const i = new le(e, t.atomics.sendBuffer, t.atomics.recvBuffer, t.atomics.config);
    return {
      send: (o, a) => i.send(o),
      request: (o) => i.request(o),
      subscribe: (o) => i.subscribe(o),
      close: () => i.close(),
      type: "atomics",
      channelName: e,
      isReady: !0
    };
  }
  if (t.rtc) {
    if (t.rtc.mode === "peer") {
      const i = new Ce(e, t.rtc.config);
      return {
        send: (o) => i.send(o),
        request: (o) => i.request(o),
        subscribe: (o) => i.subscribe(o),
        close: () => i.close(),
        type: "rtc-data",
        channelName: e,
        isReady: i.connectionState === "connected"
      };
    }
    if (t.rtc.mode === "manager") {
      const i = new Qe(e, t.rtc.config);
      return {
        send: (o) => i.broadcast(o),
        request: () => Promise.reject("Use manager.request(peerId, msg) directly"),
        subscribe: (o) => i.subscribe(o),
        close: () => i.close(),
        type: "rtc-data",
        channelName: e,
        isReady: !0
      };
    }
  }
  const r = new _();
  return {
    send: (i) => r.next(i),
    request: () => Promise.reject("Internal transport does not support request"),
    subscribe: (i) => r.subscribe(i),
    close: () => r.complete(),
    type: "internal",
    channelName: e,
    isReady: !0
  };
}
var Bs = class {
  _transports = /* @__PURE__ */ new Map();
  register(e, t) {
    this._transports.set(e, t);
  }
  get(e) {
    return this._transports.get(e);
  }
  getOrCreate(e, t = {}, n = {}) {
    let s = this._transports.get(e);
    return s || (s = G(e, t, n), this._transports.set(e, s)), s;
  }
  remove(e) {
    const t = this._transports.get(e);
    t && (t.close(), this._transports.delete(e));
  }
  closeAll() {
    for (const e of this._transports.values()) e.close();
    this._transports.clear();
  }
  list() {
    return Array.from(this._transports.keys());
  }
  get size() {
    return this._transports.size;
  }
}, Me = null;
function Ws() {
  return Me || (Me = new Bs()), Me;
}
var Di = {
  create: G,
  registry: Ws,
  fromWorker: (e, t, n) => G(t, { worker: { existing: e } }, n),
  fromPort: (e, t, n) => G(t, { port: { port: e } }, n),
  fromWebSocket: (e, t, n) => G(t, { websocket: { url: e } }, n),
  fromBroadcast: (e, t) => G(e, { broadcast: {} }, t),
  sharedWorker: {
    client: (e, t, n) => new ve(e, t, n),
    host: (e) => new Ve(e)
  },
  atomics: {
    create: (e, t, n, s) => new le(e, t, n, s),
    createPair: Jt,
    buffer: (e) => new V(e),
    ringBuffer: () => new Xt()
  },
  rtc: {
    peer: (e, t) => new Ce(e, t),
    manager: (e, t) => new Qe(e, t),
    signaling: Zt
  },
  port: {
    create: (e, t, n) => new H(e, t, n),
    createPair: xe,
    pool: (e) => new en(e),
    windowConnector: (e, t) => new qe(e, t)
  },
  storage: {
    create: (e) => new Ke(e),
    messageQueue: (e) => new tn(e)
  },
  serviceWorker: {
    host: (e) => new Ye(e),
    client: (e) => new Je(e)
  },
  socketio: (e, t, n) => new we(e, t, n),
  chrome: {
    runtime: (e) => new He(void 0, e),
    tabs: (e, t) => new ze(e, t),
    port: (e, t) => new Ge(e, t)
  },
  detect: ie,
  meta: dt
}, $s = class {
  config;
  onChannelReady;
  underlyingChannel = null;
  isConnected = !1;
  requestQueue = [];
  connectionPromise = null;
  connectionResolver = null;
  context;
  constructor(e, t) {
    this.config = e, this.onChannelReady = t, this.context = e.context ?? "unknown";
  }
  async connect(e = null) {
    this.underlyingChannel = e;
  }
  async request(e, t = []) {
    return this.isConnected && this.underlyingChannel ? this.underlyingChannel.request(e, t) : new Promise((n, s) => {
      const r = {
        id: h(),
        method: e,
        args: t,
        resolve: n,
        reject: s,
        timestamp: Date.now()
      };
      this.requestQueue.push(r), this.connectionPromise || this.connect().catch((i) => {
        this.rejectAllQueued(i);
      });
    });
  }
  async flushQueue() {
    if (!this.underlyingChannel) return;
    const e = [...this.requestQueue];
    this.requestQueue = [];
    for (const t of e) try {
      const n = await this.underlyingChannel.request(t.method, t.args);
      t.resolve(n);
    } catch (n) {
      t.reject(n);
    }
  }
  rejectAllQueued(e) {
    const t = [...this.requestQueue];
    this.requestQueue = [];
    for (const n of t) n.reject(e);
  }
  getQueueStatus() {
    return {
      isConnected: this.isConnected,
      queuedRequests: this.requestQueue.length,
      isConnecting: !!this.connectionPromise && !this.isConnected
    };
  }
  close() {
    this.rejectAllQueued(/* @__PURE__ */ new Error("Channel closed")), this.underlyingChannel?.close(), this.underlyingChannel = null, this.isConnected = !1, this.connectionPromise = null;
  }
}, Fs = async () => {
  const e = await chrome.tabs.query({
    active: !0,
    currentWindow: !0
  });
  if (e.length === 0) throw new Error("No active tab found");
  if (!e[0].id) throw new Error("Active tab has no ID");
  return e[0].id;
}, Li = async () => {
  try {
    return await Fs();
  } catch {
    const e = (await chrome.tabs.query({ currentWindow: !0 })).find((t) => t.active);
    if (!e?.id) throw new Error("No visible tab found");
    return e.id;
  }
}, Bi = (e, t = "worker") => {
  const n = We(t ?? "worker");
  return Object.keys(e).forEach((s) => {
    e[s];
  }), n;
}, nn = class {
  channel = null;
  isChannelReady = !1;
  pendingRequests = /* @__PURE__ */ new Map();
  messageQueue = [];
  queuedRequests = [];
  batchTimer;
  options;
  onChannelReady;
  constructor(e = null, t = {}, n) {
    this.channel = e, this.isChannelReady = !!e, this.onChannelReady = n, this.options = {
      timeout: 3e4,
      retries: 3,
      compression: !1,
      batching: !0,
      ...t
    };
  }
  setChannel(e) {
    this.channel = e, this.isChannelReady = !0, this.onChannelReady?.(e), this.flushQueuedRequests();
  }
  async request(e, t, n) {
    if (!this.isChannelReady || !this.channel) return new Promise((i, o) => {
      const a = {
        id: h(),
        method: e,
        args: [t],
        resolve: i,
        reject: o,
        timestamp: Date.now()
      };
      this.queuedRequests.push(a);
    });
    const s = {
      ...this.options,
      ...n
    }, r = h();
    return new Promise((i, o) => {
      const a = setTimeout(() => {
        this.pendingRequests.delete(r), o(/* @__PURE__ */ new Error(`Request timeout: ${e}`));
      }, s.timeout);
      this.pendingRequests.set(r, {
        resolve: i,
        reject: o,
        timeout: a
      });
      const c = {
        id: r,
        type: e,
        payload: t,
        timestamp: Date.now()
      };
      s.batching ? this.queueMessage(c) : this.sendMessage(c);
    });
  }
  async flushQueuedRequests() {
    if (!this.channel || this.queuedRequests.length === 0) return;
    const e = [...this.queuedRequests];
    this.queuedRequests = [];
    for (const t of e) try {
      const n = await this.request(t.method, ...t?.args ?? []);
      t.resolve(n);
    } catch (n) {
      t.reject(n);
    }
  }
  notify(e, t) {
    const n = {
      id: h(),
      type: e,
      payload: t,
      timestamp: Date.now()
    };
    this.options.batching ? this.queueMessage(n) : this.sendMessage(n);
  }
  async *stream(e, t) {
    for (const n of t) yield await this.request(`${e}:chunk`, n);
  }
  queueMessage(e) {
    this.messageQueue.push(e), this.batchTimer || (this.batchTimer = setTimeout(() => {
      this.flushBatch();
    }, 16));
  }
  flushBatch() {
    if (this.messageQueue.length === 0) return;
    const e = {
      id: h(),
      type: "batch",
      payload: this.messageQueue,
      timestamp: Date.now()
    };
    this.sendMessage(e), this.messageQueue = [], this.batchTimer = void 0;
  }
  async sendMessage(e) {
    try {
      const t = await this.channel?.request?.("processMessage", [e]);
      if (e.replyTo && this.pendingRequests.has(e.replyTo)) {
        const { resolve: n, timeout: s } = this.pendingRequests.get(e.replyTo);
        clearTimeout(s), this.pendingRequests.delete(e.replyTo), n(t);
      }
    } catch (t) {
      if (this.pendingRequests.has(e.id)) {
        const { reject: n, timeout: s } = this.pendingRequests.get(e.id);
        clearTimeout(s), this.pendingRequests.delete(e.id), n(t);
      }
    }
  }
  close() {
    this.batchTimer && clearTimeout(this.batchTimer);
    for (const [e, { reject: t, timeout: n }] of this.pendingRequests)
      clearTimeout(n), t(/* @__PURE__ */ new Error("Channel closed"));
    this.pendingRequests.clear(), this.channel?.close?.();
  }
}, sn = class rn {
  db = null;
  dbPromise = null;
  options;
  constructor(t = {}) {
    this.options = {
      dbName: t.dbName ?? "UniformMessageQueue",
      storeName: t.storeName ?? "messages",
      maxRetries: t.maxRetries ?? 3,
      defaultExpirationMs: t.defaultExpirationMs ?? 1440 * 60 * 1e3,
      fallbackStorageKey: t.fallbackStorageKey ?? "uniform_message_queue"
    };
  }
  async initDB() {
    if (this.db) return this.db;
    if (this.dbPromise) return this.dbPromise;
    if (!rn.isIndexedDBAvailable())
      return console.warn("[MessageQueue] IndexedDB not available, using sessionStorage fallback"), null;
    this.dbPromise = new Promise((t, n) => {
      const s = indexedDB.open(this.options.dbName, 1);
      s.onerror = () => {
        console.warn("[MessageQueue] IndexedDB open failed, falling back to sessionStorage"), n(/* @__PURE__ */ new Error("IndexedDB not available"));
      }, s.onsuccess = () => {
        this.db = s.result, t(this.db);
      }, s.onupgradeneeded = (r) => {
        const i = r.target.result;
        if (!i.objectStoreNames.contains(this.options.storeName)) {
          const o = i.createObjectStore(this.options.storeName, { keyPath: "id" });
          o.createIndex("timestamp", "timestamp", { unique: !1 }), o.createIndex("type", "type", { unique: !1 }), o.createIndex("priority", "priority", { unique: !1 }), o.createIndex("destination", "destination", { unique: !1 });
        }
      };
    });
    try {
      return this.db = await this.dbPromise, this.db;
    } catch {
      return null;
    }
  }
  generateId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
  async queueMessage(t, n, s = {}) {
    const r = {
      id: this.generateId(),
      type: t,
      data: n,
      timestamp: Date.now(),
      priority: s.priority ?? "normal",
      retryCount: 0,
      maxRetries: s.maxRetries ?? this.options.maxRetries,
      expiresAt: s.expiresAt ?? Date.now() + this.options.defaultExpirationMs,
      destination: s.destination,
      metadata: s.metadata
    };
    try {
      const i = await this.initDB();
      return i ? await this.addToIndexedDB(i, r) : this.addToSessionStorage(r), console.log(`[MessageQueue] Queued message: ${t}`, r.id), r.id;
    } catch (i) {
      throw console.error("[MessageQueue] Failed to queue message:", i), i;
    }
  }
  async getQueuedMessages(t) {
    try {
      const n = await this.initDB();
      let s;
      n ? s = await this.getAllFromIndexedDB(n) : s = this.getAllFromSessionStorage(), t && (s = s.filter((i) => i.destination === t));
      const r = Date.now();
      return s.filter((i) => !i.expiresAt || i.expiresAt > r);
    } catch (n) {
      return console.error("[MessageQueue] Failed to get queued messages:", n), this.getAllFromSessionStorage();
    }
  }
  async removeMessage(t) {
    try {
      const n = await this.initDB();
      n ? await this.deleteFromIndexedDB(n, t) : this.deleteFromSessionStorage(t);
    } catch (n) {
      console.error("[MessageQueue] Failed to remove message:", n);
    }
  }
  async updateMessageRetry(t, n) {
    try {
      const s = await this.initDB();
      s ? await this.updateInIndexedDB(s, t, { retryCount: n }) : this.updateInSessionStorage(t, { retryCount: n });
    } catch (s) {
      console.error("[MessageQueue] Failed to update message retry:", s);
    }
  }
  async clearExpiredMessages() {
    try {
      const t = await this.getQueuedMessages(), n = Date.now(), s = t.filter((r) => r.expiresAt && r.expiresAt <= n).map((r) => r.id);
      for (const r of s) await this.removeMessage(r);
      return s.length > 0 && console.log(`[MessageQueue] Cleared ${s.length} expired messages`), s.length;
    } catch (t) {
      return console.error("[MessageQueue] Failed to clear expired messages:", t), 0;
    }
  }
  async clearAll() {
    try {
      const t = await this.initDB();
      t ? await this.clearIndexedDB(t) : sessionStorage.removeItem(this.options.fallbackStorageKey), console.log("[MessageQueue] Cleared all messages");
    } catch (t) {
      console.error("[MessageQueue] Failed to clear all messages:", t);
    }
  }
  async getStats() {
    const t = await this.getQueuedMessages(), n = Date.now(), s = {
      low: 0,
      normal: 0,
      high: 0
    }, r = {};
    let i = 0;
    for (const o of t)
      s[o.priority]++, o.destination && (r[o.destination] = (r[o.destination] || 0) + 1), o.expiresAt && o.expiresAt <= n && i++;
    return {
      total: t.length,
      byPriority: s,
      byDestination: r,
      expired: i
    };
  }
  async addToIndexedDB(t, n) {
    return new Promise((s, r) => {
      const i = t.transaction([this.options.storeName], "readwrite").objectStore(this.options.storeName).add(n);
      i.onsuccess = () => s(), i.onerror = () => r(i.error);
    });
  }
  async getAllFromIndexedDB(t) {
    return new Promise((n, s) => {
      const r = t.transaction([this.options.storeName], "readonly").objectStore(this.options.storeName).getAll();
      r.onsuccess = () => n(r.result), r.onerror = () => s(r.error);
    });
  }
  async deleteFromIndexedDB(t, n) {
    return new Promise((s, r) => {
      const i = t.transaction([this.options.storeName], "readwrite").objectStore(this.options.storeName).delete(n);
      i.onsuccess = () => s(), i.onerror = () => r(i.error);
    });
  }
  async updateInIndexedDB(t, n, s) {
    const r = t.transaction([this.options.storeName], "readwrite").objectStore(this.options.storeName), i = await new Promise((o, a) => {
      const c = r.get(n);
      c.onsuccess = () => o(c.result), c.onerror = () => a(c.error);
    });
    i && (Object.assign(i, s), await new Promise((o, a) => {
      const c = r.put(i);
      c.onsuccess = () => o(), c.onerror = () => a(c.error);
    }));
  }
  async clearIndexedDB(t) {
    return new Promise((n, s) => {
      const r = t.transaction([this.options.storeName], "readwrite").objectStore(this.options.storeName).clear();
      r.onsuccess = () => n(), r.onerror = () => s(r.error);
    });
  }
  getAllFromSessionStorage() {
    try {
      const t = sessionStorage.getItem(this.options.fallbackStorageKey);
      return t ? JSON.parse(t) : [];
    } catch {
      return [];
    }
  }
  addToSessionStorage(t) {
    const n = this.getAllFromSessionStorage();
    n.push(t), sessionStorage.setItem(this.options.fallbackStorageKey, JSON.stringify(n));
  }
  deleteFromSessionStorage(t) {
    const n = this.getAllFromSessionStorage().filter((s) => s.id !== t);
    sessionStorage.setItem(this.options.fallbackStorageKey, JSON.stringify(n));
  }
  updateInSessionStorage(t, n) {
    const s = this.getAllFromSessionStorage(), r = s.find((i) => i.id === t);
    r && (Object.assign(r, n), sessionStorage.setItem(this.options.fallbackStorageKey, JSON.stringify(s)));
  }
  static isIndexedDBAvailable() {
    try {
      return typeof indexedDB < "u" && typeof IDBTransaction < "u" && typeof IDBKeyRange < "u";
    } catch {
      return !1;
    }
  }
}, Ae = /* @__PURE__ */ new Map();
function js(e) {
  const t = e?.dbName ?? "default";
  return Ae.has(t) || Ae.set(t, new sn(e)), Ae.get(t);
}
function Wi(e) {
  return new sn(e);
}
var M = /* @__PURE__ */ new Map(), lt = !1, on = () => {
  lt || (lt = !0, chrome?.runtime?.onMessage?.addListener?.((e, t, n) => {
    const s = e?.channelName ?? e?.target;
    if (!s) return;
    const r = M.get(s);
    if (!r || r.size === 0) return;
    const i = {
      data: e,
      origin: t?.url || "chrome-extension",
      source: t
    };
    for (const o of r) try {
      const a = o(i, t, n);
      a && typeof a?.catch == "function" && a.catch((c) => console.error("[ChromeExtensionBroadcastChannel] Listener error:", c));
    } catch (a) {
      console.error("[ChromeExtensionBroadcastChannel] Listener error:", a);
    }
    return !0;
  }));
}, an = class {
  channelName;
  listeners = /* @__PURE__ */ new Set();
  constructor(e) {
    this.channelName = e, on();
  }
  addEventListener(e, t) {
    if (e !== "message") return;
    this.listeners.add(t);
    let n = M.get(this.channelName);
    n || (n = /* @__PURE__ */ new Set(), M.set(this.channelName, n)), n.add(t);
  }
  removeEventListener(e, t) {
    e === "message" && (this.listeners.delete(t), M.get(this.channelName)?.delete(t));
  }
  postMessage(e) {
    const t = {
      ...e,
      channelName: this.channelName,
      source: "broadcast-channel"
    };
    chrome?.runtime?.sendMessage?.(t, () => {
    });
  }
  close() {
    for (const e of this.listeners) M.get(this.channelName)?.delete(e);
    this.listeners.clear();
  }
}, Us = class {
  wrappedByOriginal = /* @__PURE__ */ new Map();
  wrappedListeners = /* @__PURE__ */ new Set();
  channelName;
  mode = "broadcast";
  tabFilter;
  tabIdGetter;
  constructor(e, t) {
    this.channelName = e, this.mode = t?.mode || "broadcast", this.tabFilter = t?.tabFilter, this.tabIdGetter = t?.tabIdGetter || this.getCurrentTabId, this.startListening();
  }
  startListening() {
    on();
  }
  addEventListener(e, t) {
    if (e !== "message" || this.wrappedByOriginal.get(t)) return;
    const n = async (r, i, o) => {
      if (r?.data, !!i?.tab) {
        if (this.mode === "current-tab") {
          const a = await this.tabIdGetter?.();
          if (typeof a == "number" && i.tab.id !== a) return;
        }
        if (!(this.mode === "broadcast" && this.tabFilter && !this.tabFilter(i.tab)))
          return t({
            ...r,
            origin: i.url || "chrome-extension-tab",
            tab: i.tab
          }, i, o);
      }
    };
    this.wrappedByOriginal.set(t, n), this.wrappedListeners.add(n);
    let s = M.get(this.channelName);
    s || (s = /* @__PURE__ */ new Set(), M.set(this.channelName, s)), s.add(n);
  }
  removeEventListener(e, t) {
    if (e !== "message") return;
    const n = this.wrappedByOriginal.get(t);
    n && (this.wrappedByOriginal.delete(t), this.wrappedListeners.delete(n), M.get(this.channelName)?.delete(n));
  }
  sendToTab(e, t) {
    const n = {
      channelName: this.channelName,
      source: "tabs-channel",
      ...t
    };
    return new Promise((s, r) => {
      chrome?.tabs?.sendMessage?.(e, n, (i) => {
        chrome?.runtime?.lastError ? r(new Error(chrome.runtime.lastError.message)) : s(i);
      });
    });
  }
  async sendToActiveTab(e) {
    if (this.mode === "current-tab" && this.tabIdGetter) {
      const t = await this.tabIdGetter();
      return this.sendToTab(t, e);
    } else {
      const t = await chrome.tabs.query({
        active: !0,
        currentWindow: !0
      });
      if (t.length === 0) throw new Error("No active tab found");
      return this.sendToTab(t[0].id, e);
    }
  }
  async broadcastToTabs(e, t) {
    if (this.mode === "current-tab") try {
      const o = await this.sendToActiveTab(e);
      return [{
        tabId: await this.tabIdGetter(),
        response: o
      }];
    } catch (o) {
      return [{ error: o }];
    }
    const n = { status: "complete" };
    t?.allWindows || (n.currentWindow = !0);
    const s = (await chrome.tabs.query(n)).filter((o) => !(t?.tabFilter && !t.tabFilter(o) || this.tabFilter && !this.tabFilter(o))), r = {
      channelName: this.channelName,
      source: "tabs-channel",
      ...e
    }, i = s.map((o) => new Promise((a, c) => {
      chrome?.tabs?.sendMessage?.(o.id, r, (l) => {
        chrome?.runtime?.lastError ? c(new Error(chrome.runtime.lastError.message)) : a({
          tabId: o.id,
          response: l
        });
      });
    }));
    return Promise.allSettled(i);
  }
  async postMessage(e) {
    const t = await this.tabIdGetter(), n = {
      channelName: this.channelName,
      source: "tabs-channel",
      ...e
    };
    return chrome?.tabs?.sendMessage?.(t, n, () => {
    });
  }
  async getCurrentTabId() {
    return this.tabIdGetter ? await this.tabIdGetter() : 0;
  }
  close() {
    for (const e of this.wrappedListeners) M.get(this.channelName)?.delete(e);
    this.wrappedListeners.clear(), this.wrappedByOriginal.clear();
  }
}, $i = class {
  port;
  channelName;
  listeners = /* @__PURE__ */ new Set();
  constructor(e, t) {
    this.port = e, this.channelName = t, this.port?.onMessage?.addListener?.((n) => {
      if ((n?.channelName ?? n?.target) !== this.channelName) return;
      const s = {
        data: n,
        origin: "chrome-extension-port",
        source: this.port
      };
      for (const r of this.listeners) try {
        r(s);
      } catch (i) {
        console.error("[ChromeExtensionPortChannel] Listener error:", i);
      }
    });
  }
  addEventListener(e, t) {
    e === "message" && this.listeners.add(t);
  }
  removeEventListener(e, t) {
    e === "message" && this.listeners.delete(t);
  }
  postMessage(e) {
    this.port?.postMessage?.({
      ...e,
      channelName: this.channelName,
      source: "port-channel"
    });
  }
  close() {
    this.listeners.clear(), this.port?.disconnect?.();
  }
}, Fi = async (e) => {
  let t;
  try {
    if (typeof e.script != "string") throw new Error("Chrome extension worker channel requires config.script to be a string path");
    t = new Worker(chrome.runtime.getURL(e.script), e.options);
  } catch {
    typeof e.script == "string" ? t = new Worker(q(e.script), e.options) : typeof e.script == "function" ? t = e.script() : t = e.script;
  }
  const n = await X(e.name, {}, t);
  return n?.remote ?? n;
}, ji = (e) => new an(e), Ui = (e) => {
  const t = X(e, {}, new an(e));
  return t?.remote ?? t;
}, Hs = (e, t) => {
  const n = X(e, {}, new Us(e, t));
  return n?.remote ?? n;
}, Hi = (e, t) => Hs(e, t), zi = (e = "$host$") => We(e ?? "$host$"), Gi = (e, t) => new $s(e, t), zs = async (e) => ({
  async request(t, n = []) {
    return new Promise((s, r) => {
      const i = new BroadcastChannel(`${e.name}-sw-channel`), o = h(), a = setTimeout(() => {
        i.close(), r(/* @__PURE__ */ new Error(`Service worker request timeout: ${t}`));
      }, 1e4);
      i.onmessage = (c) => {
        const { id: l, result: u, error: p } = c.data;
        l === o && (clearTimeout(a), i.close(), p ? r(new Error(p)) : s(u));
      }, i.postMessage({
        id: o,
        type: "request",
        method: t,
        args: n
      });
    });
  },
  close() {
  }
}), cn = async (e) => {
  const t = e.context;
  if (t === "service-worker") return zs(e);
  let n;
  if (typeof e.script == "function") n = e.script();
  else if (e.script instanceof Worker) n = e.script;
  else if (t === "chrome-extension") try {
    n = new Worker(chrome.runtime.getURL(e.script), e.options);
  } catch {
    n = new Worker(q(e.script), e.options);
  }
  else n = new Worker(q(e.script), e.options);
  return await X(e.name, {}, n);
}, Vi = async (e, t) => new nn(await cn(e), t), Gs = (e, t, n) => {
  const s = new nn(null, t, n);
  return cn(e).then((r) => {
    s.setChannel(r);
  }).catch((r) => {
    console.error("[createQueuedOptimizedWorkerChannel] Failed to create base channel:", r), s.close();
  }), s;
}, Vs = /* @__PURE__ */ new Set([
  "invoke",
  "mail",
  "attach",
  "deliver",
  "defer"
]), Qs = /* @__PURE__ */ new Set([
  "request",
  "response",
  "invoke",
  "ack",
  "act",
  "ask"
]), ht = "mail", E = (e) => String(e ?? "").trim(), Ks = (e) => {
  if (!e) return;
  const t = (Array.isArray(e) ? e : [e]).map(E).filter(Boolean);
  return t.length > 0 ? t : void 0;
}, Ys = (e) => {
  if (e != null)
    return Array.isArray(e) ? e : [e];
}, Js = (e) => {
  if (e != null)
    return Array.isArray(e) ? e : [e];
}, Xs = (e) => {
  const t = Array.isArray(e) ? e : e ? [e] : [ht], n = [];
  for (const s of t) Vs.has(s) && !n.includes(s) && n.push(s);
  return n.length > 0 ? n : [ht];
}, Zs = (e) => {
  const t = E(e.type);
  if (Qs.has(t)) return t;
  const n = E(e.op);
  return n === "get" || n === "set" || n === "apply" || n === "import" ? "invoke" : e.error ? "response" : "request";
}, er = (e, t) => e.op ? e.op : t === "invoke" ? "invoke" : t === "act" ? "deliver" : "mail", tr = (e) => {
  const t = E(e).toLowerCase();
  return t || "unknown";
}, nr = () => typeof crypto < "u" && typeof crypto.randomUUID == "function" ? crypto.randomUUID() : `uniform_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`, Oe = (e) => {
  const t = Number.isFinite(e.timestamp) ? Number(e.timestamp) : Date.now(), n = E(e.srcChannel ?? e.source) || "uniform", s = E(e.destination), r = e.dstChannel ?? (s || void 0), i = E(e.uuid ?? e.id) || nr(), o = Zs(e), a = e.payload ?? e.data, c = { ...e.metadata ?? {} };
  return {
    purpose: Xs(e.purpose),
    protocol: tr(e.protocol),
    redirect: !!e.redirect,
    flags: { ...e.flags ?? {} },
    type: o,
    path: Ks(e.path),
    result: e.result,
    args: Ys(e.args),
    op: er(e, o),
    error: e.error ? String(e.error) : void 0,
    timestamp: t,
    where: E(e.where) || void 0,
    uuid: i,
    bridges: Array.isArray(e.bridges) ? e.bridges.map(E).filter(Boolean) : [],
    payload: a,
    transfer: Js(e.transfer),
    extension: e.extension,
    defer: e.defer,
    srcChannel: n,
    dstChannel: r,
    id: i,
    source: n,
    destination: s || void 0,
    data: a,
    contentType: E(e.contentType) || void 0,
    metadata: c
  };
}, sr = (e) => {
  if (!e || typeof e != "object") return !1;
  const t = e;
  return typeof t.uuid == "string" && typeof t.srcChannel == "string" && Array.isArray(t.purpose) && typeof t.type == "string";
}, ut = (e) => (sr(e), Oe(e)), rr = class {
  seen = /* @__PURE__ */ new Map();
  windowMs;
  constructor(e = 300) {
    this.windowMs = Math.max(10, e);
  }
  accept(e) {
    const t = Date.now(), n = e.uuid, s = this.seen.get(n);
    return this.prune(t), s && t - s <= this.windowMs ? !1 : (this.seen.set(n, t), !0);
  }
  prune(e) {
    for (const [t, n] of this.seen.entries()) e - n > this.windowMs && this.seen.delete(t);
  }
}, ir = class {
  storageKey;
  maxMessages;
  defaultTTLMs;
  constructor(e) {
    this.storageKey = e?.storageKey ?? "uniform-messaging-pending", this.maxMessages = e?.maxMessages ?? 200, this.defaultTTLMs = e?.defaultTTLMs ?? 1440 * 60 * 1e3;
  }
  read() {
    if (typeof window > "u" || typeof localStorage > "u") return [];
    try {
      const e = localStorage.getItem(this.storageKey);
      if (!e) return [];
      const t = JSON.parse(e);
      return Array.isArray(t) ? t : [];
    } catch {
      return [];
    }
  }
  write(e) {
    if (!(typeof window > "u" || typeof localStorage > "u"))
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(e));
      } catch {
      }
  }
  enqueue(e, t) {
    if (!e) return;
    const n = Date.now();
    if ((Number(t?.metadata?.expiresAt) ? Math.max(0, Number(t.metadata.expiresAt) - n) : this.defaultTTLMs) <= 0) return;
    const s = this.read().filter((r) => r && typeof r == "object").filter((r) => (Number(r?.message?.metadata?.expiresAt) || Number(r?.storedAt) + this.defaultTTLMs) > n);
    s.push({
      destination: e,
      message: t,
      storedAt: n
    }), s.length > this.maxMessages && s.splice(0, s.length - this.maxMessages), this.write(s);
  }
  drain(e) {
    if (!e) return [];
    const t = Date.now(), n = this.read(), s = [], r = [];
    for (const i of n)
      (Number(i?.message?.metadata?.expiresAt) || Number(i?.storedAt) + this.defaultTTLMs) <= t || (i?.destination === e && i?.message ? r.push(i.message) : s.push(i));
    return this.write(s), r;
  }
  has(e) {
    if (!e) return !1;
    const t = Date.now();
    return this.read().some((n) => !n || typeof n != "object" ? !1 : (Number(n?.message?.metadata?.expiresAt) || Number(n?.storedAt) + this.defaultTTLMs) > t && n?.destination === e);
  }
  clear() {
    this.write([]);
  }
}, ln = class {
  handlers = /* @__PURE__ */ new Map();
  channels = /* @__PURE__ */ new Map();
  workerChannels = /* @__PURE__ */ new Map();
  viewChannels = /* @__PURE__ */ new Map();
  pipelines = /* @__PURE__ */ new Map();
  messageQueue;
  pendingStore;
  initializedViews = /* @__PURE__ */ new Set();
  viewReadyPromises = /* @__PURE__ */ new Map();
  executionContext;
  channelMappings;
  componentRegistry = /* @__PURE__ */ new Map();
  replayGuard = new rr(300);
  localChannelId = "";
  constructor(e = {}) {
    this.executionContext = Be(), this.localChannelId = `${this.executionContext}:${Math.random().toString(36).slice(2, 10)}`, this.channelMappings = e.channelMappings ?? {}, this.messageQueue = js(e.queueOptions), this.pendingStore = new ir(e.pendingStoreOptions), this.setupGlobalListeners();
  }
  registerHandler(e, t) {
    this.handlers.has(e) || this.handlers.set(e, []), this.handlers.get(e).push(t);
  }
  unregisterHandler(e, t) {
    const n = this.handlers.get(e);
    if (n) {
      const s = n.indexOf(t);
      s > -1 && n.splice(s, 1);
    }
  }
  async sendMessage(e) {
    const t = this.toProtocolMessage(e);
    return await this.tryDeliverMessage(t) ? !0 : (t.destination && (this.pendingStore.enqueue(t.destination, t), await this.messageQueue.queueMessage(t.type, t, {
      priority: t.metadata?.priority ?? "normal",
      maxRetries: Number(t.metadata?.maxRetries ?? 3),
      destination: t.destination
    })), !1);
  }
  async processMessage(e) {
    const t = ut(e);
    if (!this.replayGuard.accept(t)) return;
    const n = t.destination ?? "general", s = this.handlers.get(n) ?? [];
    for (const r of s) if (r.canHandle(t)) try {
      await r.handle(t);
    } catch (i) {
      console.error(`[UnifiedMessaging] Handler error for ${n}:`, i);
    }
  }
  async tryDeliverMessage(e) {
    const t = ut(e);
    if (t.destination && this.handlers.has(t.destination))
      return await this.processMessage(t), !0;
    const n = this.getChannelForDestination(t.destination);
    if (n && this.channels.has(n)) {
      const s = this.channels.get(n);
      if (s instanceof BroadcastChannel) try {
        return s.postMessage(t), !0;
      } catch (r) {
        console.warn(`[UnifiedMessaging] Failed to post to broadcast channel ${n}:`, r);
      }
      else if (s && "request" in s) try {
        return await s.request(t.type, [t]), !0;
      } catch (r) {
        console.warn(`[UnifiedMessaging] Failed to post to worker channel ${n}:`, r);
      }
    }
    return !1;
  }
  registerViewChannels(e, t) {
    const n = /* @__PURE__ */ new Set();
    for (const s of t) {
      if (!this.isWorkerSupported(s)) {
        console.log(`[UnifiedMessaging] Skipping worker '${s.name}' in ${this.executionContext} context`);
        continue;
      }
      const r = Gs({
        name: s.name,
        script: s.script,
        options: s.options,
        context: this.resolveWorkerContext()
      }, s.protocolOptions, () => {
        console.log(`[UnifiedMessaging] Channel '${s.name}' ready for view '${e}'`);
      }), i = `${e}:${s.name}`;
      this.workerChannels.set(i, r), this.channels.set(i, r), n.add(s.name);
    }
    this.viewChannels.set(e, n);
  }
  async initializeViewChannels(e) {
    if (this.initializedViews.has(e)) return;
    const t = this.createDeferred();
    this.viewReadyPromises.set(e, t), console.log(`[UnifiedMessaging] Initializing channels for view: ${e}`);
    const n = this.viewChannels.get(e);
    if (!n) {
      t.resolve();
      return;
    }
    const s = [];
    for (const r of n) {
      const i = `${e}:${r}`, o = this.workerChannels.get(i);
      o && s.push(o.request("ping", {}).catch(() => {
        console.log(`[UnifiedMessaging] Channel '${r}' queued for view '${e}'`);
      }));
    }
    await Promise.allSettled(s), this.initializedViews.add(e), t.resolve();
  }
  getWorkerChannel(e, t) {
    return this.workerChannels.get(`${e}:${t}`) ?? null;
  }
  getBroadcastChannel(e) {
    if (!this.channels.has(e)) try {
      const t = new BroadcastChannel(e);
      t.addEventListener("message", (n) => {
        this.handleBroadcastMessage(n.data, e);
      }), this.channels.set(e, t);
    } catch (t) {
      console.warn(`[UnifiedMessaging] BroadcastChannel not available: ${e}`, t), this.channels.set(e, {
        postMessage: () => {
        },
        close: () => {
        },
        addEventListener: () => {
        },
        removeEventListener: () => {
        }
      });
    }
    return this.channels.get(e);
  }
  async handleBroadcastMessage(e, t) {
    try {
      const n = this.toProtocolMessage(e ?? {}, t);
      if (n.srcChannel === this.localChannelId) return;
      await this.processMessage(n);
    } catch (n) {
      console.error(`[UnifiedMessaging] Error handling broadcast message on ${t}:`, n);
    }
  }
  registerPipeline(e) {
    this.pipelines.set(e.name, e);
  }
  async processThroughPipeline(e, t) {
    const n = this.pipelines.get(e);
    if (!n) throw new Error(`Pipeline '${e}' not found`);
    let s = { ...t };
    const r = n.timeout ?? 3e4;
    for (const i of n.stages) {
      const o = i.timeout ?? r, a = i.retries ?? 0;
      for (let c = 0; c <= a; c++) try {
        s = await Promise.race([i.handler(s), new Promise((l, u) => setTimeout(() => u(/* @__PURE__ */ new Error(`Stage '${i.name}' timeout`)), o))]);
        break;
      } catch (l) {
        if (c === a)
          throw n.errorHandler && n.errorHandler(l, i, s), l;
        console.warn(`[UnifiedMessaging] Pipeline '${e}' stage '${i.name}' attempt ${c + 1} failed:`, l);
      }
    }
    return s;
  }
  async processQueuedMessages(e) {
    const t = await this.messageQueue.getQueuedMessages(e);
    for (const n of t) {
      const s = n.data, r = s && typeof s == "object" && typeof s.type == "string" && typeof s.id == "string" ? this.toProtocolMessage(s) : {
        ...this.toProtocolMessage({
          id: n.id,
          type: n.type,
          source: "queue",
          destination: n.destination,
          data: n.data,
          metadata: {
            timestamp: n.timestamp,
            retryCount: n.retryCount,
            maxRetries: n.maxRetries,
            ...n.metadata
          }
        }),
        type: n.type
      };
      await this.tryDeliverMessage(r) && await this.messageQueue.removeMessage(n.id);
    }
  }
  registerComponent(e, t) {
    this.componentRegistry.set(e, t), this.processQueuedMessages(t).catch((n) => {
      console.warn(`[UnifiedMessaging] Failed to process queued messages for ${t}:`, n);
    });
  }
  initializeComponent(e) {
    const t = this.componentRegistry.get(e);
    return t ? (this.processQueuedMessages(t).catch((n) => {
      console.warn(`[UnifiedMessaging] Failed to replay queued messages for ${t}:`, n);
    }), this.pendingStore.drain(t)) : [];
  }
  hasPendingMessages(e) {
    return this.pendingStore.has(e);
  }
  enqueuePendingMessage(e, t) {
    const n = String(e ?? "").trim();
    !n || !t || this.pendingStore.enqueue(n, t);
  }
  setChannelMappings(e) {
    this.channelMappings = {
      ...this.channelMappings,
      ...e
    };
  }
  getChannelForDestination(e) {
    return e ? this.channelMappings[e] ?? null : null;
  }
  detectProtocolName() {
    return this.executionContext === "chrome-extension" ? "chrome" : this.executionContext === "service-worker" ? "service" : this.executionContext === "main" ? "window" : "unknown";
  }
  resolveWorkerContext() {
    if (this.executionContext === "main") return "main";
    if (this.executionContext === "service-worker") return "service-worker";
    if (this.executionContext === "chrome-extension") return "chrome-extension";
  }
  toProtocolMessage(e, t) {
    return Oe({
      ...e,
      id: e.id,
      type: e.type ?? "unknown",
      source: e.source ?? t ?? this.localChannelId,
      destination: e.destination,
      data: e.data,
      metadata: {
        timestamp: Date.now(),
        ...e.metadata ?? {}
      },
      protocol: this.detectProtocolName(),
      purpose: "mail",
      srcChannel: e.source ?? this.localChannelId,
      dstChannel: e.destination
    });
  }
  isWorkerSupported(e) {
    return this.executionContext === "service-worker" ? !0 : this.executionContext === "chrome-extension" ? Hn() : !0;
  }
  setupGlobalListeners() {
    typeof window < "u" && globalThis.addEventListener("message", (e) => {
      e.data && typeof e.data == "object" && e.data.type && this.handleBroadcastMessage(e.data, "window-message");
    });
  }
  createDeferred() {
    let e, t;
    const n = new Promise((s, r) => {
      e = s, t = r;
    });
    return {
      resolve: e,
      reject: t,
      promise: n
    };
  }
  getExecutionContext() {
    return this.executionContext;
  }
  destroy() {
    for (const e of this.channels.values()) (e instanceof BroadcastChannel || e && "close" in e) && e.close();
    this.channels.clear(), this.workerChannels.clear(), this.handlers.clear(), this.pipelines.clear();
  }
}, Y = null;
function Xe(e) {
  return Y || (Y = new ln(e)), Y;
}
function Qi(e) {
  return new ln(e);
}
function Ki() {
  Y && (Y.destroy(), Y = null);
}
function Yi(e) {
  return Xe().sendMessage(e);
}
function Ji(e, t) {
  Xe().registerHandler(e, t);
}
function Xi(e) {
  return Xe().getBroadcastChannel(e);
}
var hn = class {
  channels = /* @__PURE__ */ new Map();
  readyPromises = /* @__PURE__ */ new Map();
  messageHandlers = /* @__PURE__ */ new Map();
  channelConfigs;
  executionContext;
  logPrefix;
  constructor(e = {}) {
    this.channelConfigs = e.channels ?? {}, this.logPrefix = e.logPrefix ?? "[ServiceChannels]", this.executionContext = Be(), console.log(`${this.logPrefix} Initialized in ${this.executionContext} context`);
  }
  registerConfigs(e) {
    this.channelConfigs = {
      ...this.channelConfigs,
      ...e
    };
  }
  getConfig(e) {
    return this.channelConfigs[e];
  }
  getAllConfigs() {
    return { ...this.channelConfigs };
  }
  async initChannel(e) {
    if (this.channels.has(e)) return this.channels.get(e);
    const t = this.channelConfigs[e];
    if (!t) throw new Error(`Unknown channel: ${e}. Register configuration first.`);
    let n;
    const s = new Promise((i) => {
      n = i;
    });
    this.readyPromises.set(e, {
      promise: s,
      resolve: n
    }), console.log(`${this.logPrefix} Initializing channel: ${e} -> ${t.broadcastName}`);
    const r = new BroadcastChannel(t.broadcastName);
    return r.onmessage = (i) => {
      this.handleIncomingMessage(e, i.data);
    }, r.onmessageerror = (i) => {
      console.error(`${this.logPrefix} Message error on ${e}:`, i);
    }, this.channels.set(e, r), n(), console.log(`${this.logPrefix} Channel ready: ${e}`), r;
  }
  closeChannel(e) {
    const t = this.channels.get(e);
    t && (t.close(), this.channels.delete(e), this.readyPromises.delete(e), this.messageHandlers.delete(e), console.log(`${this.logPrefix} Channel closed: ${e}`));
  }
  closeAll() {
    for (const e of this.channels.keys()) this.closeChannel(e);
  }
  async waitForChannel(e) {
    const t = this.readyPromises.get(e);
    t ? await t.promise : await this.initChannel(e);
  }
  async send(e, t, n, s = {}) {
    await this.waitForChannel(e);
    const r = this.channels.get(e);
    if (!r) throw new Error(`Channel not ready: ${e}`);
    const i = {
      type: t,
      source: s.source ?? this.executionContext,
      target: e,
      data: n,
      timestamp: Date.now(),
      correlationId: s.correlationId
    };
    r.postMessage(i), console.log(`${this.logPrefix} Sent message to ${e}:`, t);
  }
  broadcast(e, t, n) {
    for (const [s, r] of this.channels) {
      const i = {
        type: e,
        source: n ?? this.executionContext,
        target: s,
        data: t,
        timestamp: Date.now()
      };
      r.postMessage(i);
    }
    console.log(`${this.logPrefix} Broadcast message:`, e);
  }
  subscribe(e, t) {
    return this.messageHandlers.has(e) || this.messageHandlers.set(e, /* @__PURE__ */ new Set()), this.messageHandlers.get(e).add(t), this.initChannel(e).catch(console.error), () => {
      this.messageHandlers.get(e)?.delete(t);
    };
  }
  handleIncomingMessage(e, t) {
    const n = this.messageHandlers.get(e);
    if (!n || n.size === 0) {
      console.log(`${this.logPrefix} No handlers for ${e}, message queued`);
      return;
    }
    const s = t;
    for (const r of n) try {
      r(s);
    } catch (i) {
      console.error(`${this.logPrefix} Handler error on ${e}:`, i);
    }
  }
  isInitialized(e) {
    return this.channels.has(e);
  }
  getInitializedChannels() {
    return Array.from(this.channels.keys());
  }
  getStatus() {
    const e = {};
    for (const t of Object.keys(this.channelConfigs)) e[t] = {
      connected: this.channels.has(t),
      lastActivity: Date.now(),
      pendingMessages: 0
    };
    return e;
  }
  getExecutionContext() {
    return this.executionContext;
  }
};
function Zi(e) {
  return new hn(e);
}
var j = null;
function eo(e) {
  return j ? e?.channels && j.registerConfigs(e.channels) : j = new hn(e), j;
}
function to() {
  j && (j.closeAll(), j = null);
}
function no(e, t, n) {
  const s = /* @__PURE__ */ new Map(), r = b(e);
  return (i) => {
    const o = (l) => l.type === "response" && l.reqId ? (u) => {
      const p = s.get(l.reqId);
      p && (p.resolve(u), s.delete(l.reqId));
    } : l.type === "request" ? (u, p) => r({
      ...u,
      channel: l.sender,
      sender: t,
      type: "response",
      reqId: l.reqId
    }, p) : r, c = m(e, (l) => {
      if (i.active) {
        if (l.type === "response" && l.reqId) {
          const u = s.get(l.reqId);
          u && (u.resolve(l.payload), s.delete(l.reqId));
        }
        n ? n(l, o(l)) : i.next(l);
      }
    }, (l) => i.error(l), () => i.complete());
    return i.request = (l) => {
      const u = l.reqId ?? h();
      return l.reqId = u, new Promise((p, w) => {
        s.set(u, {
          resolve: p,
          reject: w,
          timestamp: Date.now()
        }), r(l);
      });
    }, c;
  };
}
var so = class {
  _transport;
  _channelName;
  _pending = /* @__PURE__ */ new Map();
  _subs = /* @__PURE__ */ new Set();
  _cleanup = null;
  _send;
  _active = !1;
  constructor(e, t) {
    this._transport = e, this._channelName = t, this._send = b(e);
  }
  subscribe(e) {
    return this._subs.add(e), this._active || this._activate(), { unsubscribe: () => {
      this._subs.delete(e), this._subs.size === 0 && this._deactivate();
    } };
  }
  next(e, t) {
    this._send(e, t);
  }
  request(e) {
    const t = e.reqId ?? h();
    return new Promise((n, s) => {
      this._pending.set(t, {
        resolve: n,
        reject: s,
        timestamp: Date.now()
      }), this.next({
        ...e,
        reqId: t
      });
    });
  }
  _activate() {
    this._active || (this._cleanup = m(this._transport, (e) => {
      if (e.type === "response" && e.reqId) {
        const t = this._pending.get(e.reqId);
        t && (t.resolve(e.payload), this._pending.delete(e.reqId));
      }
      for (const t of this._subs) try {
        t.next?.(e);
      } catch (n) {
        t.error?.(n);
      }
    }, (e) => this._subs.forEach((t) => t.error?.(e)), () => this._subs.forEach((e) => e.complete?.())), this._active = !0);
  }
  _deactivate() {
    this._cleanup?.(), this._cleanup = null, this._active = !1;
  }
};
function ro(e, t = {}) {
  return async (n, s) => {
    if (n.type !== "request" || n.channel !== e) return;
    t.onRequest?.(n.payload);
    const r = await Fe(n.payload, n.reqId, e);
    r && (t.onResponse?.(r.response), s({
      ...r.response,
      id: h(),
      timestamp: Date.now()
    }, r.transfer));
  };
}
var io = class {
  _channelName;
  _targetChannel;
  _pending = /* @__PURE__ */ new Map();
  _subscriber = null;
  constructor(e, t) {
    this._channelName = e, this._targetChannel = t;
  }
  connect(e) {
    this._subscriber = e;
  }
  disconnect() {
    for (const e of this._pending.values()) e.reject(/* @__PURE__ */ new Error("Disconnected"));
    this._pending.clear(), this._subscriber = null;
  }
  handleMessage(e) {
    if (e.type === "response" && e.reqId) {
      const t = this._pending.get(e.reqId);
      t && (t.resolve(e.payload), this._pending.delete(e.reqId));
    }
  }
  dispatch(e, t, n) {
    if (!this._subscriber?.active) return Promise.reject(/* @__PURE__ */ new Error("Not connected"));
    const s = h(), r = {
      id: h(),
      channel: this._targetChannel,
      sender: this._channelName,
      type: "request",
      reqId: s,
      payload: {
        channel: this._targetChannel,
        sender: this._channelName,
        path: t,
        action: e,
        args: n
      },
      timestamp: Date.now()
    }, i = new Promise((o, a) => this._pending.set(s, {
      resolve: o,
      reject: a,
      timestamp: Date.now()
    }));
    return this._subscriber.next(r), i;
  }
}, oo = async (e, t = {}, n = null) => X(e, t, n ?? (typeof self < "u" ? self : null)), ao = async (e, t, n = {}, s = typeof self < "u" ? self : null) => (await X(e, n?.channelOptions, s))?.doImportModule?.(t, n?.importOptions), co = ce, lo = ms, ho = gs, uo = bs, fo = async (e, t = {}, n = typeof self < "u" ? self : null, s = "$host$") => {
  const r = qt(s ?? "$host$");
  return await r?.createRemoteChannel(e, t, n), Tt(e, r ?? v?.instance);
}, po = (e, t = {}) => {
  const n = Be();
  return n !== "chrome-extension" ? {
    async request(s) {
      throw new Error(`Chrome extension messaging not available in ${n}`);
    },
    close() {
    }
  } : {
    async request(s, r = []) {
      return new Promise((i, o) => {
        try {
          chrome.runtime.sendMessage({
            id: `crx_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            type: s,
            source: n,
            target: e,
            data: r?.length === 1 ? r[0] : r,
            metadata: {
              timestamp: Date.now(),
              ...t?.metadata ?? {}
            }
          }, (a) => {
            chrome.runtime.lastError ? o(new Error(chrome.runtime.lastError.message)) : i(a);
          });
        } catch (a) {
          o(a);
        }
      });
    },
    close() {
    }
  };
};
export {
  Vr as $createOrUseExistingChannel,
  Z as $descriptor,
  Vn as $requestHandler,
  Ls as AbstractTransport,
  V as AtomicsBuffer,
  Xt as AtomicsRingBuffer,
  le as AtomicsTransport,
  Pi as AtomicsTransportFactory,
  On as BidirectionalInvoker,
  ys as BroadcastChannelObservable,
  ns as BroadcastChannelTransport,
  ke as CHANNEL_MAP,
  Xn as ChannelConnection,
  Ft as ChannelContext,
  zn as ChannelHandler,
  so as ChannelMessageObservable,
  C as ChannelNativeObservable,
  xn as ChannelObservable,
  ds as ChannelStorage,
  _ as ChannelSubject,
  fs as ChannelTransaction,
  an as ChromeExtensionBroadcastChannel,
  $i as ChromeExtensionPortChannel,
  Us as ChromeExtensionTabsChannel,
  Qt as ChromeExternalObservable,
  as as ChromeExternalTransport,
  vi as ChromeObservableFactory,
  Ge as ChromePortObservable,
  os as ChromePortTransport,
  He as ChromeRuntimeObservable,
  rs as ChromeRuntimeTransport,
  ze as ChromeTabsObservable,
  is as ChromeTabsTransport,
  Zn as ConnectionPool,
  qn as DefaultReflect,
  Ar as DispatchHandler,
  Ar as DispatchProxyHandler,
  dr as MessageObservable,
  Ie as MessagePortObservable,
  ts as MessagePortTransport,
  sn as MessageQueue,
  tn as MessageQueueStorage,
  C as Observable,
  zn as ObservableChannelHandler,
  Ir as ObservableFactory,
  io as ObservableRequestDispatcher,
  nn as OptimizedWorkerChannel,
  xt as PROXY_INTERNALS,
  Ct as PROXY_MARKER,
  ir as PendingMessageStore,
  en as PortPool,
  H as PortTransport,
  Ri as PortTransportFactory,
  rr as ProtocolReplayGuard,
  Wn as ProxyBuilder,
  $s as QueuedWorkerChannel,
  Qr as READ,
  Qe as RTCPeerManager,
  Ce as RTCPeerTransport,
  Mi as RTCTransportFactory,
  Rt as RemoteChannelHelper,
  Se as RemoteChannels,
  Dn as RemoteProxyHandler,
  ur as ReplayChannelSubject,
  wt as Requestor,
  vt as Responder,
  v as SELF_CHANNEL,
  Es as SelfObservable,
  ls as SelfTransport,
  hn as ServiceChannelManager,
  Je as ServiceWorkerClient,
  Ss as ServiceWorkerClientObservable,
  Ye as ServiceWorkerHost,
  ks as ServiceWorkerHostObservable,
  cs as ServiceWorkerTransport,
  ve as SharedWorkerClient,
  Ve as SharedWorkerHost,
  Ii as SharedWorkerObservableFactory,
  we as SocketIOObservable,
  xi as SocketIOObservableFactory,
  Is as SocketIORoomObservable,
  Ke as TransferableStorage,
  qi as TransferableStorageFactory,
  T as TransportAdapter,
  xs as TransportChromePortObservable,
  vs as TransportChromeRuntimeObservable,
  Cs as TransportChromeTabsObservable,
  cr as TransportCoreFactory,
  Yr as TransportFactory,
  P as TransportObservable,
  hi as TransportObservableFactory,
  It as UnifiedChannel,
  ln as UnifiedMessagingManager,
  Di as UnifiedTransportFactory,
  d as WReflectAction,
  or as WStatus,
  ar as WType,
  ws as WebSocketObservable,
  ss as WebSocketTransport,
  qe as WindowPortConnector,
  zt as WorkerContext,
  it as WorkerObservable,
  es as WorkerTransport,
  ri as addBroadcastChannel,
  si as addPortChannel,
  ii as addSelfChannelToDefault,
  ni as addWorkerChannel,
  Mr as autoInvoker,
  Ds as bindServiceWorkerHostBridge,
  Lt as buildResponse,
  Xr as closeAllStorage,
  Wr as closeUnifiedChannel,
  fo as connectToChannelAsModule,
  Jt as createAtomicsChannelPair,
  Mn as createBidirectionalChannel,
  ui as createBidirectionalTransport,
  Zt as createBroadcastSignaling,
  _t as createBroadcastTransport,
  ce as createChannelContext,
  xe as createChannelPair,
  ro as createChannelRequestHandler,
  gs as createChannelsInContext,
  ji as createChromeExtensionBroadcast,
  Ui as createChromeExtensionBroadcastChannel,
  Fi as createChromeExtensionChannel,
  po as createChromeExtensionRuntimeChannel,
  Hs as createChromeExtensionTabsChannel,
  Hi as createChromeExtensionTabsMessagingChannel,
  pn as createChromeListener,
  wi as createChromeRequestHandler,
  ft as createChromeTabsListener,
  Jr as createConnectionObserver,
  co as createContext,
  li as createDefaultChannelPair,
  Ln as createExposeHandler,
  Ai as createFromPort,
  qt as createHostChannel,
  gi as createHostProxy,
  Le as createInvoker,
  et as createInvokerObservable,
  br as createMessageId,
  Wi as createMessageQueue,
  ho as createMultiChannel,
  Hr as createObservableChannel,
  Vi as createOptimizedWorkerChannel,
  X as createOrUseExistingChannel,
  Os as createPortProxy,
  Oe as createProtocolEnvelope,
  Gs as createQueuedOptimizedWorkerChannel,
  Gi as createQueuedWorkerChannel,
  Sn as createReflectHandler,
  oe as createRemoteProxy,
  Tr as createRequestor,
  Nn as createResponder,
  Bn as createSenderProxy,
  Zi as createServiceChannelManager,
  zs as createServiceWorkerChannel,
  Ni as createServiceWorkerClient,
  Oi as createServiceWorkerHost,
  Ei as createSharedWorkerHostObservable,
  ki as createSharedWorkerObservable,
  Si as createSocketObservable,
  Ci as createSocketRequestHandler,
  G as createTransport,
  m as createTransportListener,
  b as createTransportSender,
  I as createUnifiedChannel,
  Dr as createUnifiedChannelPair,
  Qi as createUnifiedMessaging,
  pt as createWebSocketTransport,
  Ti as createWorkerAtomicsTransport,
  cn as createWorkerChannel,
  mr as debounce,
  oi as deferChannel,
  In as delay,
  ei as deleteContext,
  nt as descMap,
  J as detectContextType,
  Be as detectExecutionContext,
  Rn as detectIncomingContextType,
  tt as detectTransport,
  ie as detectTransportType,
  Dt as executeAction,
  $r as exposeFromUnified,
  _i as exposeFromWorker,
  Ns as exposeOverPort,
  yt as filter,
  kn as fromEvent,
  En as fromPromise,
  Xi as getBroadcastChannel,
  ci as getChannelFromDefault,
  Wt as getChannelStorage,
  Bt as getConnection,
  je as getConnectionPool,
  Zr as getContext,
  ti as getContextNames,
  Fs as getCurrentTabId,
  F as getDefaultContext,
  Kr as getHostConnection,
  js as getMessageQueue,
  ms as getOrCreateContext,
  Rr as getProxyDescriptor,
  qr as getProxyInternals,
  eo as getServiceChannelManager,
  lo as getSharedContext,
  dt as getTransportMeta,
  Ws as getTransportRegistry,
  Lr as getUnifiedChannel,
  Br as getUnifiedChannelNames,
  Xe as getUnifiedMessaging,
  Li as getVisibleTabId,
  ae as getWorkerChannel,
  Ue as getWorkerContext,
  Vt as getWorkerInvoker,
  Mt as getWorkerResolveBaseUrl,
  Gt as getWorkerResponder,
  me as handMap,
  Fe as handleRequest,
  Yn as hasNoPath,
  bi as importInHost,
  uo as importIsolatedModule,
  ao as importModuleInChannel,
  bs as importModuleInContext,
  We as initChannelHandler,
  ai as initDeferredChannel,
  zi as initMainChannel,
  di as initWorkerContext,
  Tn as interval,
  Un as isChromeExtensionContext,
  sr as isProtocolEnvelope,
  kt as isRemoteProxy,
  Pt as isServiceWorkerContext,
  Gr as loadWorker,
  vr as makeBroadcastInvoker,
  no as makeChannelMessageHandler,
  xr as makeChromeRuntimeInvoker,
  wr as makeMessagePortInvoker,
  Ur as makeObservableRequestProxy,
  $n as makeRequestProxy,
  Er as makeSelfInvoker,
  Sr as makeServiceWorkerClientInvoker,
  kr as makeServiceWorkerHostInvoker,
  Cr as makeWebSocketInvoker,
  yr as makeWorkerInvoker,
  fr as map,
  Pn as merge,
  ut as normalizeProtocolEnvelope,
  Ee as normalizeRef,
  Gn as objectToRef,
  pi as onWorkerChannelCreated,
  fi as onWorkerConnection,
  mi as onWorkerInvocation,
  Or as proxyBuilder,
  U as readByPath,
  Ji as registerHandler,
  Bi as registerWorkerAPI,
  W as registeredInPath,
  Fr as remoteFromUnified,
  Kn as removeByData,
  Ot as removeByPath,
  to as resetServiceChannelManager,
  Ki as resetUnifiedMessaging,
  q as resolveWorkerSpecifierHref,
  Yi as sendMessage,
  Pr as setupInvoker,
  Nr as setupUnifiedChannel,
  re as storedData,
  Hn as supportsDedicatedWorkers,
  oo as sync,
  pr as take,
  _r as takeUntil,
  gr as throttle,
  $e as traverseByPath,
  Qn as unwrapDescriptorFromProxy,
  ue as unwrapDescriptorFromProxyRecursive,
  An as when,
  yi as workerContext,
  Tt as wrapChannel,
  St as wrapDescriptor,
  ge as wrapMap,
  jr as wrapObservableChannel,
  be as writeByPath
};
