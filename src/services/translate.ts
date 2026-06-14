// Runtime UI translation engine.
//
// Instead of hand-translating every string in every page into 20 languages,
// this walks the rendered DOM and translates visible text (and key attributes)
// into the selected language via the `translateBatch` Cloud Function, caching
// every result in localStorage so it is paid for once and instant thereafter.
//
// It is React-safe: React always re-renders text in English, so we keep each
// node's English source and re-apply the translation whenever React overwrites
// it. A generation counter makes language switches re-translate correctly.

import { translateBatch } from "./firebaseBackend";

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE", "TEXTAREA", "OPTION"]);
const ATTRS = ["placeholder", "aria-label"];

type Applied = { gen: number; val: string };

let current = "en";
let gen = 0;
let observer: MutationObserver | null = null;
const originals = new WeakMap<Text, string>();
const applied = new WeakMap<Text, Applied>();
const attrOriginals = new WeakMap<Element, Record<string, string>>();
const attrApplied = new WeakMap<Element, Record<string, Applied>>();
const memCache: Record<string, Record<string, string>> = {};
let pending = new Set<string>();
let flushTimer: number | null = null;
let inFlight = false;

function lsKey(lang: string) { return `matchmind:i18n-cache:${lang}`; }

function cacheFor(lang: string): Record<string, string> {
  if (memCache[lang]) return memCache[lang];
  let parsed: Record<string, string> = {};
  try { parsed = JSON.parse(window.localStorage.getItem(lsKey(lang)) || "{}"); } catch { parsed = {}; }
  memCache[lang] = parsed;
  return parsed;
}

function saveCache(lang: string) {
  try { window.localStorage.setItem(lsKey(lang), JSON.stringify(memCache[lang] ?? {})); } catch { /* ignore quota */ }
}

function translatable(s: string): boolean {
  const t = s.trim();
  if (t.length < 2) return false;
  if (!/[A-Za-zÀ-ɏ]/.test(t)) return false; // must contain letters
  if (/^[0-9]{1,6}[A-Z]{0,2}$/.test(t)) return false; // team-number-ish / pure number
  return true;
}

function skip(node: Text): boolean {
  const p = node.parentElement;
  if (!p) return true;
  if (SKIP_TAGS.has(p.tagName)) return true;
  if (p.closest("[data-no-translate],[translate='no']")) return true;
  return false;
}

function wrap(src: string, translated: string): string {
  const lead = src.match(/^\s*/)?.[0] ?? "";
  const trail = src.match(/\s*$/)?.[0] ?? "";
  return lead + translated.trim() + trail;
}

function processText(node: Text) {
  if (skip(node)) return;
  const cur = node.nodeValue ?? "";
  const wrote = applied.get(node);
  let src: string;
  if (wrote && wrote.val === cur) {
    if (wrote.gen === gen) return;                 // already correct for this language
    src = originals.get(node) ?? cur;              // need English to re-translate
  } else {
    src = cur;                                     // React wrote English
    originals.set(node, src);
  }
  if (current === "en") {
    const o = originals.get(node);
    if (o !== undefined && node.nodeValue !== o) { node.nodeValue = o; applied.set(node, { gen, val: o }); }
    return;
  }
  if (!translatable(src)) return;
  const cache = cacheFor(current);
  const hit = cache[src.trim()];
  if (hit !== undefined) {
    const val = wrap(src, hit);
    if (node.nodeValue !== val) node.nodeValue = val;
    applied.set(node, { gen, val });
  } else {
    pending.add(src.trim());
    schedule();
  }
}

function processAttrs(el: Element) {
  for (const attr of ATTRS) {
    if (!el.hasAttribute(attr)) continue;
    const cur = el.getAttribute(attr) ?? "";
    const wroteMap = attrApplied.get(el) ?? {};
    const wrote = wroteMap[attr];
    let src: string;
    if (wrote && wrote.val === cur) {
      if (wrote.gen === gen) continue;
      src = (attrOriginals.get(el) ?? {})[attr] ?? cur;
    } else {
      src = cur;
      const om = attrOriginals.get(el) ?? {}; om[attr] = src; attrOriginals.set(el, om);
    }
    if (current === "en") {
      const o = (attrOriginals.get(el) ?? {})[attr];
      if (o !== undefined && el.getAttribute(attr) !== o) el.setAttribute(attr, o);
      continue;
    }
    if (!translatable(src)) continue;
    const hit = cacheFor(current)[src.trim()];
    if (hit !== undefined) {
      const val = wrap(src, hit);
      el.setAttribute(attr, val);
      const am = attrApplied.get(el) ?? {}; am[attr] = { gen, val }; attrApplied.set(el, am);
    } else {
      pending.add(src.trim());
      schedule();
    }
  }
}

function walk(root: Node) {
  if (root.nodeType === Node.TEXT_NODE) { processText(root as Text); return; }
  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return;
  const el = root as Element;
  if (el.nodeType === Node.ELEMENT_NODE && SKIP_TAGS.has(el.tagName)) return;
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const texts: Text[] = [];
  let n: Node | null;
  while ((n = tw.nextNode())) texts.push(n as Text);
  texts.forEach(processText);
  if (el.querySelectorAll) {
    if (el.nodeType === Node.ELEMENT_NODE) processAttrs(el);
    el.querySelectorAll(ATTRS.map((a) => `[${a}]`).join(",")).forEach((e) => processAttrs(e));
  }
}

function retranslate() {
  if (document.body) walk(document.body);
}

function schedule() {
  if (flushTimer != null || inFlight) return;
  flushTimer = window.setTimeout(() => { flushTimer = null; void flush(); }, 140);
}

async function flush() {
  if (inFlight) return;
  const lang = current;
  if (lang === "en" || !pending.size) { pending.clear(); return; }
  const all = Array.from(pending);
  pending = new Set(all.slice(180));
  const batch = all.slice(0, 180);
  inFlight = true;
  try {
    const res = await translateBatch({ targetLang: lang, texts: batch });
    const cache = cacheFor(lang);
    for (const [k, v] of Object.entries(res.translations || {})) cache[k] = v;
    // Anything the backend didn't return: cache as itself so we don't loop on it.
    for (const k of batch) if (cache[k] === undefined) cache[k] = k;
    saveCache(lang);
  } catch {
    // Backend unavailable (e.g. functions not deployed): cache identity so the
    // app keeps showing English instead of retrying forever.
    const cache = cacheFor(lang);
    for (const k of batch) if (cache[k] === undefined) cache[k] = k;
  } finally {
    inFlight = false;
  }
  if (current === lang) retranslate();
  if (pending.size) schedule();
}

function startObserver() {
  if (observer) return;
  observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === "characterData" && m.target.nodeType === Node.TEXT_NODE) {
        processText(m.target as Text);
      } else if (m.type === "attributes" && m.target.nodeType === Node.ELEMENT_NODE) {
        processAttrs(m.target as Element);
      } else {
        m.addedNodes.forEach((node) => walk(node));
      }
    }
  });
  observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
}

/** Set the active UI language. "en" restores all original text. */
export function setTranslationLanguage(lang: string | null | undefined) {
  const next = (lang || "en").toLowerCase();
  if (typeof document === "undefined" || !document.body) return;
  current = next;
  gen += 1;
  document.documentElement.lang = next;
  // Keep the layout LTR for every language — translate the text only, never
  // mirror/flip the UI (per product decision). RTL scripts still render their
  // own glyphs correctly; we just don't reflow the whole app.
  document.documentElement.dir = "ltr";
  if (next === "en") {
    // Restore originals, then stop observing — no overhead for English users.
    retranslate();
    if (observer) { observer.disconnect(); observer = null; }
    return;
  }
  startObserver();
  retranslate();
}

// Dev-only hook so the runtime engine can be driven from the console/tests.
if (import.meta.env.DEV && typeof window !== "undefined") {
  (window as unknown as { __mmSetLang?: typeof setTranslationLanguage }).__mmSetLang = setTranslationLanguage;
}
