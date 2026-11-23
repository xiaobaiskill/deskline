const STORAGE_KEY = "deskline.v1";

const INKS = ["", "#f4efe6", "#1c1915", "#e0a15a", "#e07a5f", "#8fbf9f", "#7eb6d6", "#e3b4d0"];
const MARKS = ["", "rgba(224,161,90,0.35)", "rgba(224,122,95,0.35)", "rgba(126,182,214,0.38)", "rgba(143,191,159,0.38)", "rgba(0,0,0,0.35)"];
const SIZES = [18, 24, 32, 44, 60];

const board = document.getElementById("board");
const scaler = document.getElementById("scaler");
const stage = document.getElementById("stage");
const placeholder = document.getElementById("placeholder");
const toastEl = document.getElementById("toast");
const metaEl = document.getElementById("meta");
const applyBtn = document.getElementById("apply");
const bgCaption = document.getElementById("bgCaption");
const bgPrev = document.getElementById("bgPrev");
const bgNext = document.getElementById("bgNext");

const screenW = window.screen.width;
const screenH = window.screen.height;

let backgrounds = [];
let bgIndex = 0;
let bgId = "";
let defaultInk = "#f4efe6";
let selected = null;
let savedRange = null;
let toastTimer = 0;
let saveTimer = 0;
let gesture = null;
const imageCache = new Map();

function toast(message, ms = 3400) {
  toastEl.hidden = false;
  toastEl.textContent = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.hidden = true;
  }, ms);
}

function saveSoon() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 180);
}

function serialize() {
  return {
    v: 1,
    bg: bgId,
    notes: [...board.querySelectorAll(".note")].map((note) => {
      const body = note.querySelector(".note-body");
      return {
        x: Number(note.dataset.x),
        y: Number(note.dataset.y),
        w: Number(note.dataset.w),
        html: body.innerHTML,
        style: body.getAttribute("style") || "",
        accent: note.dataset.accent || "",
      };
    }),
  };
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serialize()));
  } catch (err) {
    console.warn(err);
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.notes)) return null;
    return data;
  } catch {
    return null;
  }
}

function sampleNotes() {
  return [
    {
      x: 0.06, y: 0.11, w: 0.4, accent: "#e0a15a", size: 28,
      html: '<div class="word">serendipity</div><div class="ipa">/ˌser.ənˈdɪp.ə.ti/</div><div class="gloss">n. 意外发现美好事物的运气</div><div class="ex">Finding something good without looking for it.</div>',
    },
    {
      x: 0.54, y: 0.15, w: 0.38, accent: "#e0a15a", size: 28,
      html: '<div class="word">meticulous</div><div class="ipa">/məˈtɪk.jə.ləs/</div><div class="gloss">adj. 非常仔细、一丝不苟的</div><div class="ex">She keeps meticulous notes of every new word.</div>',
    },
    {
      x: 0.06, y: 0.7, w: 0.48, accent: "", size: 30,
      html: '<div class="kicker">TODAY</div><div class="lead">I will use one new word in a real sentence.</div>',
    },
  ];
}

function cardTemplate() {
  return '<div class="word">lucid</div><div class="ipa">/ˈluː.sɪd/</div><div class="gloss">adj. 清楚易懂的</div><div class="ex">Keep the sentence short enough to stay lucid.</div>';
}

function fit() {
  const style = getComputedStyle(stage);
  const padX = Number.parseFloat(style.paddingLeft) + Number.parseFloat(style.paddingRight);
  const padY = Number.parseFloat(style.paddingTop) + Number.parseFloat(style.paddingBottom);
  const availW = Math.max(200, stage.clientWidth - padX);
  const availH = Math.max(160, stage.clientHeight - padY);
  const scale = Math.min(availW / screenW, availH / screenH);
  scaler.style.width = `${screenW * scale}px`;
  scaler.style.height = `${screenH * scale}px`;
  board.style.width = `${screenW}px`;
  board.style.height = `${screenH}px`;
  board.style.transform = `scale(${scale})`;
  layoutAll();
  const dpr = window.devicePixelRatio || 1;
  metaEl.textContent = `屏幕 ${screenW} × ${screenH} · 壁纸 ${Math.round(screenW * dpr)} × ${Math.round(screenH * dpr)} · 已保存在这台电脑上`;
}

function layoutAll() {
  board.querySelectorAll(".note").forEach(layoutNote);
}

function layoutNote(note) {
  const bw = board.offsetWidth || screenW;
  const bh = board.offsetHeight || screenH;
  note.style.left = `${Number(note.dataset.x) * bw}px`;
  note.style.top = `${Number(note.dataset.y) * bh}px`;
  note.style.width = `${Number(note.dataset.w) * bw}px`;
}

function commitGeometry(note) {
  const bw = board.offsetWidth || screenW;
  const bh = board.offsetHeight || screenH;
  note.dataset.x = String(parseFloat(note.style.left) / bw);
  note.dataset.y = String(parseFloat(note.style.top) / bh);
  note.dataset.w = String(parseFloat(note.style.width) / bw);
}

function boardScale() {
  const rect = board.getBoundingClientRect();
  return rect.width / (board.offsetWidth || screenW) || 1;
}

function syncEmpty() {
  placeholder.hidden = board.querySelector(".note") !== null;
}

function select(note) {
  if (selected && selected !== note) selected.classList.remove("selected");
  selected = note;
  if (note) {
    note.classList.add("selected");
    board.appendChild(note);
  }
  syncFormatState();
}

function endEdit() {
  const editing = board.querySelector(".note.editing");
  if (!editing) return;
  editing.classList.remove("editing");
  const body = editing.querySelector(".note-body");
  body.contentEditable = "false";
  save();
}

function beginEdit(note, event) {
  if (board.querySelector(".note.editing") !== note) endEdit();
  select(note);
  note.classList.add("editing");
  const body = note.querySelector(".note-body");
  body.contentEditable = "true";
  body.focus();
  if (event && selectWordAt(body, event.clientX, event.clientY)) return;
  const range = document.createRange();
  range.selectNodeContents(body);
  range.collapse(false);
  const sel = document.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
  savedRange = range.cloneRange();
}

function selectWordAt(body, x, y) {
  const range = document.caretRangeFromPoint ? document.caretRangeFromPoint(x, y) : null;
  if (!range) return false;
  const container = range.startContainer;
  if (!body.contains(container)) return false;
  if (container.nodeType === Node.TEXT_NODE) {
    const text = container.nodeValue || "";
    let start = range.startOffset;
    let end = start;
    const isWord = (ch) => /[A-Za-z0-9'’-]/u.test(ch);
    while (start > 0 && isWord(text[start - 1])) start -= 1;
    while (end < text.length && isWord(text[end])) end += 1;
    if (start !== end) {
      range.setStart(container, start);
      range.setEnd(container, end);
    }
  }
  const sel = document.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
  savedRange = range.cloneRange();
  return true;
}

function createNote(data, quiet) {
  const note = document.createElement("article");
  note.className = "note";
  note.dataset.x = String(data.x);
  note.dataset.y = String(data.y);
  note.dataset.w = String(data.w);
  if (data.accent) {
    note.dataset.accent = data.accent;
    note.style.setProperty("--accent", data.accent);
  }
  note.innerHTML = `
    <div class="handle" aria-hidden="true"><span></span></div>
    <div class="note-body" lang="en" spellcheck="true" contenteditable="false" autocorrect="off" autocapitalize="off"></div>
    <button class="resize" type="button" aria-label="调整宽度" tabindex="-1"></button>
  `;
  const body = note.querySelector(".note-body");
  body.innerHTML = data.html || "<div>Write an English sentence here.</div>";
  if (data.style) body.setAttribute("style", data.style);
  if (data.size && !body.style.fontSize) body.style.fontSize = `${data.size}px`;
  if (data.color && !body.style.color) body.style.color = data.color;
  board.appendChild(note);
  bindNote(note);
  layoutNote(note);
  syncEmpty();
  if (!quiet) {
    select(note);
    save();
  }
  return note;
}

function bindNote(note) {
  const body = note.querySelector(".note-body");
  note.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    if (event.target.closest(".resize")) {
      startResize(event, note);
      return;
    }
    if (note.classList.contains("editing") && event.target.closest(".note-body")) return;
    startDrag(event, note);
  });
  note.addEventListener("dblclick", (event) => {
    if (event.target.closest(".resize")) return;
    beginEdit(note, event);
  });
  body.addEventListener("input", saveSoon);
  body.addEventListener("paste", onPaste);
}

function startDrag(event, note) {
  endEdit();
  select(note);
  const sc = boardScale();
  gesture = {
    type: "drag",
    note,
    pointerId: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    left: parseFloat(note.style.left) || 0,
    top: parseFloat(note.style.top) || 0,
    scale: sc,
    moved: false,
  };
  try { note.setPointerCapture(event.pointerId); } catch { /* synthetic pointers have nothing to capture */ }
}

function startResize(event, note) {
  event.stopPropagation();
  select(note);
  gesture = {
    type: "resize",
    note,
    pointerId: event.pointerId,
    x: event.clientX,
    width: parseFloat(note.style.width) || note.offsetWidth,
    scale: boardScale(),
  };
  try { note.setPointerCapture(event.pointerId); } catch { /* synthetic pointers have nothing to capture */ }
}

function onPointerMove(event) {
  if (!gesture || event.pointerId !== gesture.pointerId) return;
  const note = gesture.note;
  if (gesture.type === "drag") {
    const dx = (event.clientX - gesture.x) / gesture.scale;
    const dy = (event.clientY - gesture.y) / gesture.scale;
    if (!gesture.moved && Math.hypot(dx, dy) < 3) return;
    gesture.moved = true;
    note.classList.add("dragging");
    const maxX = board.offsetWidth - 48;
    const maxY = board.offsetHeight - 28;
    const left = Math.min(Math.max(gesture.left + dx, -note.offsetWidth + 64), maxX);
    const top = Math.min(Math.max(gesture.top + dy, 0), maxY);
    note.style.left = `${left}px`;
    note.style.top = `${top}px`;
    return;
  }
  const width = Math.max(160, gesture.width + (event.clientX - gesture.x) / gesture.scale);
  note.style.width = `${Math.min(width, board.offsetWidth)}px`;
}

function onPointerUp(event) {
  if (!gesture || event.pointerId !== gesture.pointerId) return;
  const note = gesture.note;
  note.classList.remove("dragging");
  if (gesture.type === "drag" || gesture.type === "resize") {
    if (gesture.type === "resize" || gesture.moved) {
      commitGeometry(note);
      save();
    }
  }
  gesture = null;
}

function intersects(a, b) {
  return a.left < b.right - 8 && b.left < a.right - 8 && a.top < b.bottom - 8 && b.top < a.bottom - 8;
}

function placeWithoutOverlap(note) {
  const bw = board.offsetWidth || screenW;
  const bh = board.offsetHeight || screenH;
  layoutNote(note);
  const others = [...board.querySelectorAll(".note")]
    .filter((item) => item !== note)
    .map((item) => ({
      left: item.offsetLeft,
      top: item.offsetTop,
      right: item.offsetLeft + item.offsetWidth,
      bottom: item.offsetTop + item.offsetHeight,
    }));
  const width = note.offsetWidth;
  const height = Math.max(note.offsetHeight, 48);
  for (let row = 0; row < 10; row += 1) {
    for (let col = 0; col < 7; col += 1) {
      const left = Math.round((0.05 + (col % 7) * 0.12) * bw);
      const top = Math.round((0.08 + row * 0.09) * bh);
      if (left + width > bw - 16 || top + height > bh - 16) continue;
      const box = { left, top, right: left + width, bottom: top + height };
      if (others.some((other) => intersects(box, other))) continue;
      note.style.left = `${left}px`;
      note.style.top = `${top}px`;
      commitGeometry(note);
      return;
    }
  }
}

function relaxOverlaps() {
  const bh = board.offsetHeight || screenH;
  const notes = [...board.querySelectorAll(".note")];
  for (let pass = 0; pass < notes.length + 2; pass += 1) {
    let moved = false;
    const boxes = notes.map((note) => ({
      note,
      left: note.offsetLeft,
      top: note.offsetTop,
      right: note.offsetLeft + note.offsetWidth,
      bottom: note.offsetTop + note.offsetHeight,
    })).sort((a, b) => a.top - b.top || a.left - b.left);
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = 0; j < i; j += 1) {
        if (!intersects(boxes[j], boxes[i])) continue;
        const height = boxes[i].bottom - boxes[i].top;
        const top = boxes[j].bottom + 24;
        if (top + height > bh - 8) continue;
        boxes[i].note.style.top = `${top}px`;
        commitGeometry(boxes[i].note);
        boxes[i].top = top;
        boxes[i].bottom = top + height;
        moved = true;
      }
    }
    if (!moved) break;
  }
}

function selectedNote() {
  if (selected && selected.isConnected) return selected;
  const editing = board.querySelector(".note.editing");
  return editing || null;
}

function selectionInside(note) {
  const sel = document.getSelection();
  if (!sel || !sel.rangeCount || sel.isCollapsed) return null;
  const body = note.querySelector(".note-body");
  if (!body.contains(sel.anchorNode) || !body.contains(sel.focusNode)) return null;
  return sel;
}

function rememberSelection() {
  const sel = document.getSelection();
  if (!sel || !sel.rangeCount) return;
  const node = sel.anchorNode;
  if (!node) return;
  const el = node.nodeType === 1 ? node : node.parentElement;
  if (el && el.closest(".note-body")) savedRange = sel.getRangeAt(0).cloneRange();
}

function restoreSelection(note) {
  const body = note.querySelector(".note-body");
  body.focus();
  if (!savedRange) return;
  const container = savedRange.commonAncestorContainer;
  const el = container.nodeType === 1 ? container : container.parentElement;
  if (!el || !body.contains(el)) return;
  const sel = document.getSelection();
  sel.removeAllRanges();
  sel.addRange(savedRange);
}

function syncFormatState() {
  const note = selectedNote();
  const body = note ? note.querySelector(".note-body") : null;
  const weight = body ? Number.parseInt(getComputedStyle(body).fontWeight, 10) : 400;
  document.getElementById("bold").setAttribute("aria-pressed", weight >= 600 ? "true" : "false");
  const italic = body ? getComputedStyle(body).fontStyle === "italic" : false;
  document.getElementById("italic").setAttribute("aria-pressed", italic ? "true" : "false");
  const under = body ? getComputedStyle(body).textDecorationLine.includes("underline") : false;
  document.getElementById("underline").setAttribute("aria-pressed", under ? "true" : "false");
}

function applyInline(command, value) {
  const note = selectedNote();
  if (!note) {
    toast("先点一下要编辑的文字");
    return;
  }
  if (note.classList.contains("editing")) {
    restoreSelection(note);
    if (selectionInside(note)) {
      document.execCommand("styleWithCSS", false, true);
      if (command === "foreColor" || command === "hiliteColor") {
        let arg = value;
        if (command === "foreColor" && !arg) arg = defaultInk;
        if (command === "hiliteColor" && !arg) arg = "transparent";
        document.execCommand(command === "hiliteColor" ? "backColor" : "foreColor", false, arg);
      } else {
        document.execCommand(command);
      }
      saveSoon();
      syncFormatState();
      return;
    }
  }
  applyWhole(note, command, value);
}

function applyWhole(note, command, value) {
  const body = note.querySelector(".note-body");
  if (command === "bold") {
    const weight = Number.parseInt(getComputedStyle(body).fontWeight, 10);
    body.style.fontWeight = weight >= 600 ? "400" : "700";
  } else if (command === "italic") {
    body.style.fontStyle = getComputedStyle(body).fontStyle === "italic" ? "normal" : "italic";
  } else if (command === "underline") {
    const on = getComputedStyle(body).textDecorationLine.includes("underline");
    body.style.textDecorationLine = on ? "none" : "underline";
  } else if (command === "foreColor") {
    if (!value) body.style.removeProperty("color");
    else body.style.color = value;
  } else if (command === "hiliteColor") {
    if (!value || value === "transparent") body.style.removeProperty("background-color");
    else body.style.backgroundColor = value;
  }
  saveSoon();
  syncFormatState();
}

function applySize(px) {
  const note = selectedNote();
  if (!note) {
    toast("先点一下要调整的文字");
    return;
  }
  note.querySelector(".note-body").style.fontSize = `${px}px`;
  saveSoon();
}

function removeSelected() {
  const note = selectedNote();
  if (!note) {
    toast("先点一下要删除的文字");
    return;
  }
  if (note.classList.contains("editing")) endEdit();
  note.remove();
  selected = null;
  syncEmpty();
  syncFormatState();
  save();
}

function clearNotes() {
  endEdit();
  board.querySelectorAll(".note").forEach((note) => note.remove());
  selected = null;
  syncEmpty();
  syncFormatState();
}

function restoreSamples() {
  clearNotes();
  for (const note of sampleNotes()) createNote(note, true);
  fit();
  relaxOverlaps();
  save();
  toast("已放回示例。可以直接改成你正在记的词。");
}

function onPaste(event) {
  const html = event.clipboardData && event.clipboardData.getData("text/html");
  const text = event.clipboardData && event.clipboardData.getData("text/plain");
  if (!html && !text) return;
  event.preventDefault();
  if (html) document.execCommand("insertHTML", false, sanitize(html));
  else document.execCommand("insertText", false, text);
  saveSoon();
}

function sanitize(html) {
  const allow = new Set(["B", "STRONG", "I", "EM", "U", "SPAN", "BR", "DIV", "P", "FONT"]);
  const doc = new DOMParser().parseFromString(html, "text/html");
  const cleanNode = (node) => {
    if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.nodeValue);
    if (node.nodeType !== Node.ELEMENT_NODE) return null;
    const tag = node.tagName;
    if (tag === "SCRIPT" || tag === "STYLE" || tag === "IFRAME") return null;
    if (!allow.has(tag)) {
      const frag = document.createDocumentFragment();
      node.childNodes.forEach((child) => {
        const next = cleanNode(child);
        if (next) frag.appendChild(next);
      });
      return frag;
    }
    const el = document.createElement(tag.toLowerCase());
    const style = node.style;
    if (style) {
      if (style.color) el.style.color = style.color;
      if (style.backgroundColor) el.style.backgroundColor = style.backgroundColor;
      if (style.fontWeight) el.style.fontWeight = style.fontWeight;
      if (style.fontStyle) el.style.fontStyle = style.fontStyle;
      if (style.fontSize) el.style.fontSize = style.fontSize;
      if (style.textDecorationLine) el.style.textDecorationLine = style.textDecorationLine;
    }
    if (tag === "FONT" && node.color) el.style.color = node.color;
    node.childNodes.forEach((child) => {
      const next = cleanNode(child);
      if (next) el.appendChild(next);
    });
    return el;
  };
  const holder = document.createElement("div");
  doc.body.childNodes.forEach((child) => {
    const next = cleanNode(child);
    if (next) holder.appendChild(next);
  });
  return holder.innerHTML;
}

function backgroundURL(file) {
  return `/backgrounds/${encodeURIComponent(file)}`;
}

function backgroundLabel(file) {
  return file.replace(/\.[^.]+$/, "").replace(/^\d+[-_ ]*/, "");
}

async function fetchBackgrounds() {
  const response = await fetch("/backgrounds/manifest.json");
  if (!response.ok) throw new Error("读不到 backgrounds/manifest.json");
  const data = await response.json();
  if (!Array.isArray(data)) throw new Error("背景清单格式不对");
  return data.filter((name) => typeof name === "string" && name && !name.startsWith("."));
}

function ensureImage(url) {
  const cached = imageCache.get(url);
  if (cached) return cached;
  const pending = new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("背景图打不开"));
    image.src = url;
  });
  imageCache.set(url, pending);
  return pending;
}

function tuneInk(image) {
  const sample = document.createElement("canvas");
  sample.width = 24;
  sample.height = 24;
  const ctx = sample.getContext("2d", { willReadFrequently: true });
  if (!ctx) return;
  ctx.drawImage(image, 0, 0, 24, 24);
  const pixels = ctx.getImageData(0, 0, 24, 24).data;
  let sum = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    sum += 0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2];
  }
  const light = sum / (pixels.length / 4) > 155;
  board.dataset.light = light ? "1" : "0";
  defaultInk = light ? "#1c1915" : "#f4efe6";
  board.style.setProperty("--ink", defaultInk);
  board.style.setProperty("--muted", light ? "#5c5348" : "#ddd4c6");
}

function updateCaption() {
  const empty = backgrounds.length === 0;
  bgPrev.disabled = empty;
  bgNext.disabled = empty;
  if (empty) {
    bgCaption.textContent = "backgrounds/manifest.json 里还没有图片";
    return;
  }
  const file = backgrounds[bgIndex];
  bgCaption.textContent = `${backgroundLabel(file)}  ·  ${bgIndex + 1} / ${backgrounds.length}`;
}

function applyBackgroundFile(name, quiet) {
  if (!backgrounds.length) {
    bgId = "";
    board.style.backgroundImage = "none";
    board.dataset.light = "0";
    updateCaption();
    return;
  }
  const found = backgrounds.indexOf(name);
  bgIndex = found >= 0 ? found : 0;
  const file = backgrounds[bgIndex];
  bgId = file;
  const url = backgroundURL(file);
  board.style.backgroundColor = "#141311";
  board.style.backgroundImage = `url("${url}")`;
  board.style.backgroundSize = "cover";
  board.style.backgroundPosition = "center";
  board.style.backgroundRepeat = "no-repeat";
  updateCaption();
  ensureImage(url).then(tuneInk).catch(() => {});
  if (!quiet) save();
}

async function stepBackground(delta) {
  try {
    const files = await fetchBackgrounds();
    const current = backgrounds[bgIndex];
    backgrounds = files;
    const index = backgrounds.indexOf(current);
    bgIndex = index >= 0 ? index : 0;
  } catch (err) {
    toast(err.message || "读不到背景目录");
  }
  if (!backgrounds.length) {
    applyBackgroundFile("", true);
    toast("把图片放进 backgrounds，并写进 manifest.json。", 4800);
    return;
  }
  const next = (bgIndex + delta + backgrounds.length) % backgrounds.length;
  applyBackgroundFile(backgrounds[next]);
}

function paintCover(ctx, image, width, height) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const drawW = image.naturalWidth * scale;
  const drawH = image.naturalHeight * scale;
  ctx.drawImage(image, (width - drawW) / 2, (height - drawH) / 2, drawW, drawH);
}

function buildChrome() {
  const inkBox = document.getElementById("inkSwatches");
  for (const color of INKS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = color ? "swatch" : "swatch clear";
    btn.title = color ? "字色" : "恢复默认字色";
    if (color) btn.style.background = color;
    btn.addEventListener("click", () => applyInline("foreColor", color));
    inkBox.appendChild(btn);
  }
  const markBox = document.getElementById("markSwatches");
  for (const color of MARKS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = color ? "swatch" : "swatch clear";
    btn.title = color ? "底色" : "去掉底色";
    if (color) btn.style.background = color;
    btn.addEventListener("click", () => applyInline("hiliteColor", color || "transparent"));
    markBox.appendChild(btn);
  }
  const sizeBox = document.getElementById("sizes");
  for (const size of SIZES) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "size";
    btn.textContent = String(size);
    btn.title = "调整这一块文字的字号";
    btn.addEventListener("click", () => applySize(size));
    sizeBox.appendChild(btn);
  }
}

function isClear(color) {
  if (!color || color === "transparent") return true;
  const match = color.match(/rgba?\(([^)]+)\)/);
  if (!match) return false;
  const parts = match[1].split(",").map((part) => part.trim());
  return parts.length === 4 && Number.parseFloat(parts[3]) === 0;
}

function styleOf(textNode) {
  const el = textNode.parentElement;
  const cs = getComputedStyle(el);
  let bg = "";
  let underline = false;
  let node = el;
  while (node && node !== board) {
    const computed = getComputedStyle(node);
    if (!bg && !node.classList.contains("note-body") && !node.classList.contains("note")) {
      const candidate = computed.backgroundColor;
      if (!isClear(candidate)) bg = candidate;
    }
    if (computed.textDecorationLine.includes("underline")) underline = true;
    if (node.classList.contains("note-body")) break;
    node = node.parentElement;
  }
  let spacing = 0;
  if (cs.letterSpacing && cs.letterSpacing !== "normal") spacing = Number.parseFloat(cs.letterSpacing) || 0;
  return {
    color: cs.color,
    bg,
    fontSize: Number.parseFloat(cs.fontSize) || 28,
    fontWeight: cs.fontWeight,
    fontStyle: cs.fontStyle,
    fontFamily: cs.fontFamily,
    underline,
    spacing,
  };
}

function boardMetrics() {
  const rect = board.getBoundingClientRect();
  return {
    left: rect.left,
    top: rect.top,
    scale: rect.width / (board.offsetWidth || screenW) || 1,
  };
}

function toBoard(rect, metrics) {
  return {
    x: (rect.left - metrics.left) / metrics.scale,
    y: (rect.top - metrics.top) / metrics.scale,
    w: rect.width / metrics.scale,
    h: rect.height / metrics.scale,
  };
}

function collectRuns(root) {
  const runs = [];
  const metrics = boardMetrics();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let textNode = walker.nextNode();
  while (textNode) {
    const text = textNode.nodeValue || "";
    if (text.length) {
      const style = styleOf(textNode);
      const range = document.createRange();
      range.selectNodeContents(textNode);
      const rects = [...range.getClientRects()];
      if (rects.length === 1 && text.indexOf("\n") === -1) {
        const box = toBoard(rects[0], metrics);
        if (box.w > 0.4 || text.trim()) runs.push({ text, rect: box, style });
      } else {
        let buf = "";
        let bufRect = null;
        let lastTop = null;
        const flush = () => {
          if (!buf || !bufRect) {
            buf = "";
            bufRect = null;
            return;
          }
          runs.push({ text: buf, rect: bufRect, style });
          buf = "";
          bufRect = null;
        };
        for (let i = 0; i < text.length;) {
          const step = (text.codePointAt(i) || 0) > 0xffff ? 2 : 1;
          const ch = text.slice(i, i + step);
          i += step;
          if (ch === "\n") {
            flush();
            lastTop = null;
            continue;
          }
          range.setStart(textNode, i - step);
          range.setEnd(textNode, i);
          const rect = range.getClientRects()[0];
          if (!rect || (rect.width < 0.2 && ch.trim() === "")) continue;
          const top = Math.round(rect.top);
          if (lastTop !== null && Math.abs(top - lastTop) > 1) flush();
          const box = toBoard(rect, metrics);
          if (!bufRect) bufRect = { ...box };
          else {
            const left = Math.min(bufRect.x, box.x);
            const right = Math.max(bufRect.x + bufRect.w, box.x + box.w);
            bufRect = {
              x: left,
              y: Math.min(bufRect.y, box.y),
              w: right - left,
              h: Math.max(bufRect.h, box.h, box.y + box.h - Math.min(bufRect.y, box.y)),
            };
          }
          buf += ch;
          lastTop = top;
        }
        flush();
      }
    }
    textNode = walker.nextNode();
  }
  return runs;
}

async function renderWallpaper() {
  const dpr = window.devicePixelRatio || 1;
  let canvasW = Math.round(screenW * dpr);
  let canvasH = Math.round(screenH * dpr);
  const cap = 8192;
  const limit = Math.min(1, cap / Math.max(canvasW, canvasH));
  canvasW = Math.max(1, Math.round(canvasW * limit));
  canvasH = Math.max(1, Math.round(canvasH * limit));
  const exportScale = canvasW / screenW;
  const canvas = document.createElement("canvas");
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("这台浏览器画不出壁纸");
  ctx.fillStyle = "#141311";
  ctx.fillRect(0, 0, canvasW, canvasH);
  if (bgId) {
    try {
      paintCover(ctx, await ensureImage(backgroundURL(bgId)), canvasW, canvasH);
    } catch (err) {
      console.warn(err);
    }
  }

  for (const note of board.querySelectorAll(".note")) {
    if (note.dataset.accent) {
      ctx.fillStyle = note.dataset.accent;
      ctx.fillRect(
        (parseFloat(note.style.left) || 0) * exportScale,
        (parseFloat(note.style.top) || 0) * exportScale,
        3 * exportScale,
        note.offsetHeight * exportScale,
      );
    }
    const body = note.querySelector(".note-body");
    const bodyBg = getComputedStyle(body).backgroundColor;
    if (!isClear(bodyBg)) {
      ctx.fillStyle = bodyBg;
      ctx.fillRect(
        (note.offsetLeft + body.offsetLeft) * exportScale,
        (note.offsetTop + body.offsetTop) * exportScale,
        body.offsetWidth * exportScale,
        body.offsetHeight * exportScale,
      );
    }
    const runs = collectRuns(body);
    for (const run of runs) {
      if (!run.style.bg) continue;
      ctx.fillStyle = run.style.bg;
      ctx.fillRect(run.rect.x * exportScale, run.rect.y * exportScale, Math.max(1, run.rect.w) * exportScale, run.rect.h * exportScale);
    }
    for (const run of runs) {
      const size = run.style.fontSize * exportScale;
      ctx.font = `${run.style.fontStyle} ${run.style.fontWeight} ${size}px ${run.style.fontFamily}`;
      ctx.fillStyle = run.style.color;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      if ("letterSpacing" in ctx) ctx.letterSpacing = `${run.style.spacing * exportScale}px`;
      const leading = Math.max(0, (run.rect.h - run.style.fontSize) / 2);
      const x = run.rect.x * exportScale;
      const y = (run.rect.y + leading) * exportScale;
      ctx.save();
      ctx.shadowColor = board.dataset.light === "1" ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.55)";
      ctx.shadowBlur = 8 * exportScale;
      ctx.shadowOffsetY = exportScale;
      ctx.fillText(run.text, x, y);
      ctx.restore();
      if (run.style.underline) {
        ctx.fillRect(x, y + size * 0.92, Math.max(1, run.rect.w * exportScale), Math.max(1, exportScale));
      }
    }
  }
  return canvas;
}

function canvasBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("生成图片失败"));
    }, "image/png");
  });
}

function downloadBlob(blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "deskline-wallpaper.png";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

async function makeBlob() {
  endEdit();
  await new Promise((resolve) => requestAnimationFrame(resolve));
  return canvasBlob(await renderWallpaper());
}

async function downloadWallpaper() {
  const previous = applyBtn.textContent;
  applyBtn.disabled = true;
  applyBtn.textContent = "正在生成…";
  try {
    downloadBlob(await makeBlob());
    toast("已下载。在图片上按住 Control 点一下，选择「设定桌面图片」。", 5200);
  } catch (err) {
    toast(err.message || "下载失败", 6400);
  } finally {
    applyBtn.disabled = false;
    applyBtn.textContent = previous;
  }
}

function onKeyDown(event) {
  const typing = selected && selected.classList.contains("editing");
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
    event.preventDefault();
    downloadWallpaper();
    return;
  }
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "b") {
    event.preventDefault();
    applyInline("bold");
    return;
  }
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "i") {
    event.preventDefault();
    applyInline("italic");
    return;
  }
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "u") {
    event.preventDefault();
    applyInline("underline");
    return;
  }
  if (!typing && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
    event.preventDefault();
    stepBackground(event.key === "ArrowLeft" ? -1 : 1);
    return;
  }
  if (event.key === "Escape") {
    endEdit();
    return;
  }
  if ((event.key === "Backspace" || event.key === "Delete") && selected && !typing) {
    event.preventDefault();
    removeSelected();
    return;
  }
  if (event.key === "Enter" && selected && !typing && !event.metaKey && !event.ctrlKey) {
    event.preventDefault();
    beginEdit(selected);
  }
}

async function init() {
  buildChrome();
  const saved = loadState();
  if (saved) saved.notes.forEach((note) => createNote(note, true));
  else sampleNotes().forEach((note) => createNote(note, true));
  fit();
  if (!saved) relaxOverlaps();
  try {
    backgrounds = await fetchBackgrounds();
  } catch (err) {
    backgrounds = [];
    toast(err.message || "读不到背景目录");
  }
  const wanted = saved && backgrounds.includes(saved.bg) ? saved.bg : backgrounds[0];
  applyBackgroundFile(wanted || "", true);
  if (!saved) save();
  document.getElementById("format").addEventListener("mousedown", (event) => {
    if (event.target.closest("button")) event.preventDefault();
  });
  document.getElementById("addText").addEventListener("click", () => {
    const note = createNote({ x: 0.08, y: 0.12, w: 0.34, html: "<div>Write an English sentence here.</div>", size: 32 });
    placeWithoutOverlap(note);
    beginEdit(note);
  });
  document.getElementById("addCard").addEventListener("click", () => {
    const note = createNote({ x: 0.08, y: 0.12, w: 0.34, html: cardTemplate(), size: 28, accent: "#e0a15a" });
    placeWithoutOverlap(note);
    beginEdit(note);
  });
  document.getElementById("bold").addEventListener("click", () => applyInline("bold"));
  document.getElementById("italic").addEventListener("click", () => applyInline("italic"));
  document.getElementById("underline").addEventListener("click", () => applyInline("underline"));
  document.getElementById("remove").addEventListener("click", removeSelected);
  document.getElementById("samples").addEventListener("click", restoreSamples);
  bgPrev.addEventListener("click", () => stepBackground(-1));
  bgNext.addEventListener("click", () => stepBackground(1));
  applyBtn.addEventListener("click", downloadWallpaper);
  document.addEventListener("pointermove", onPointerMove);
  document.addEventListener("pointerup", onPointerUp);
  document.addEventListener("pointercancel", onPointerUp);
  document.addEventListener("selectionchange", rememberSelection);
  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("pointerdown", (event) => {
    if (event.target.closest(".note") || event.target.closest(".format") || event.target.closest(".top") || event.target.closest(".bg-nav")) return;
    endEdit();
    select(null);
  });
  window.addEventListener("resize", fit);
}

init().catch((err) => {
  console.error(err);
  toast("页面没有准备好");
});
