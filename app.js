/* Deskline 20261126.2 */
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

const NATIVE_W = window.screen.width;
const NATIVE_H = window.screen.height;
let screenW = NATIVE_W;
let screenH = NATIVE_H;
let sizeKey = "native";
const SIZE_PRESETS = [
  { key: "native" },
  { key: "1280x800", w: 1280, h: 800 },
  { key: "1440x900", w: 1440, h: 900 },
  { key: "1920x1080", w: 1920, h: 1080 },
  { key: "2560x1440", w: 2560, h: 1440 },
];

let backgrounds = [];
let bgIndex = 0;
let bgId = "";
let defaultInk = "#f4efe6";
let lang = localStorage.getItem("deskline.lang") === "en" ? "en" : "zh";
let WORD_JUNIOR = [];
let WORD_SENIOR = [];
let WORD_INDEX = new Map();
let lastCardWord = "";
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
        plate: note.dataset.plate || "",
        align: note.dataset.align || "",
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

const STR = {
  zh: {
    title: "Deskline · 英语壁纸",
    meta: "屏幕 {w} × {h} · 壁纸 {pw} × {ph} · 已保存在这台电脑上",
    addJunior: "初中 1500",
    addSenior: "高中 2000",
    custom: "自定义",
    addText: "文本",
    addLine: "句子",
    preview: "预览",
    download: "下载换屏小助手",
    apply: "更换屏幕",
    applyTitle: "交给本机助手设为桌面（⌘↩）",
    helperDownMac: "已下载。解压后双击 Start.command，它会在后台运行。然后回到网页点「更换屏幕」。",
    helperDownWin: "已下载。双击 Deskline-Windows.exe，确认后它会在后台运行。若系统拦截，选「更多信息」再运行。然后点「更换屏幕」。",
    helperNeed: "换屏小助手还没在后台运行。下载后打开它，它会留在后台，然后再点「更换屏幕」。",
    helperPromptGo: "下载换屏小助手",
    helperPromptClose: "关闭",
    helperOther: "目前只能在 Mac 和 Windows 上一键更换屏幕。",
    screen: "屏幕设置",
    words: "海外单词",
    text: "文本",
    native: "本机",
    useCustom: "使用",
    addJuniorCount: "1500 个词",
    addSeniorCount: "2000 个词",
    badSize: "宽和高请填 640 到 7680 之间的数字。",
    prevBg: "上一张背景",
    nextBg: "下一张背景",
    placeholder: "双击文字开始修改<br />拖动即可摆到任意位置",
    film: "背景",
    format: "文字格式",
    bold: "加粗 ⌘B",
    italic: "斜体 ⌘I",
    underline: "下划线 ⌘U",
    alignLeft: "靠左",
    alignCenter: "居中",
    left: "左",
    center: "中",
    plateBare: "只有文字",
    plateGlass: "半透明卡片",
    platePaper: "纸卡片",
    bare: "无底",
    glass: "玻璃",
    paper: "纸",
    remove: "删除",
    samples: "示例",
    resize: "调整宽度",
    ink: "字色",
    inkClear: "恢复默认字色",
    mark: "底色",
    markClear: "去掉底色",
    size: "调整这一块文字的字号",
    pickNote: "先点一下要编辑的文字",
    pickSize: "先点一下要调整的文字",
    pickDelete: "先点一下要删除的文字",
    samplesBack: "已放回示例。可以直接改成你正在记的词。",
    noManifest: "读不到 backgrounds/manifest.json",
    badManifest: "背景清单格式不对",
    bgBroken: "背景图打不开",
    noBg: "还没有背景",
    noBgDir: "读不到背景目录",
    addBgHint: "把图片放进 backgrounds，并写进 manifest.json。",
    noWords: "词库没有载入",
    noCanvas: "这台浏览器画不出壁纸",
    blobFail: "生成图片失败",
    making: "正在生成…",
    downloadFail: "下载失败",
    applying: "正在更换…",
    helperEmpty: "助手没有返回结果",
    applyFail: "更换失败",
    applied: "已更换屏幕。",
    notReady: "页面没有准备好",
    textSeed: "在这里写一句英语。",
    langBtn: "EN",
  },
  en: {
    title: "Deskline · English wallpaper",
    meta: "Screen {w} × {h} · Wallpaper {pw} × {ph} · Saved on this computer",
    addJunior: "Junior 1500",
    addSenior: "Senior 2000",
    custom: "Custom",
    addText: "Text",
    addLine: "Sentence",
    preview: "Preview",
    download: "Download helper",
    apply: "Change screen",
    applyTitle: "Set the desktop with the local helper (⌘↩)",
    helperDownMac: "Downloaded. Unzip it and double-click Start.command. It keeps running in the background. Then choose Change screen.",
    helperDownWin: "Downloaded. Double-click Deskline-Windows.exe and confirm. It keeps running in the background. If Windows blocks it, choose More info, then Run.",
    helperNeed: "The screen helper is not running in the background. Download it and open it. It stays in the background. Then choose Change screen again.",
    helperPromptGo: "Download helper",
    helperPromptClose: "Close",
    helperOther: "One-click desktop change is available on Mac and Windows.",
    screen: "Screen",
    words: "Overseas words",
    text: "Text",
    native: "This Mac",
    useCustom: "Use",
    addJuniorCount: "1,500 words",
    addSeniorCount: "2,000 words",
    badSize: "Enter a width and height from 640 to 7680.",
    prevBg: "Previous background",
    nextBg: "Next background",
    placeholder: "Double-click to edit<br />Drag to place it anywhere",
    film: "Backgrounds",
    format: "Formatting",
    bold: "Bold ⌘B",
    italic: "Italic ⌘I",
    underline: "Underline ⌘U",
    alignLeft: "Align left",
    alignCenter: "Center",
    left: "Left",
    center: "Center",
    plateBare: "Text only",
    plateGlass: "Glass card",
    platePaper: "Paper card",
    bare: "None",
    glass: "Glass",
    paper: "Paper",
    remove: "Delete",
    samples: "Samples",
    resize: "Resize width",
    ink: "Text color",
    inkClear: "Default text color",
    mark: "Highlight",
    markClear: "Clear highlight",
    size: "Change the size of this text",
    pickNote: "Select a note first",
    pickSize: "Select a note to resize",
    pickDelete: "Select a note to delete",
    samplesBack: "Samples are back. Change them into words you are learning.",
    noManifest: "Cannot read backgrounds/manifest.json",
    badManifest: "The background list is not valid",
    bgBroken: "Cannot open this background",
    noBg: "No backgrounds yet",
    noBgDir: "Cannot read the background folder",
    addBgHint: "Add images to backgrounds and list them in manifest.json.",
    noWords: "The word list did not load",
    noCanvas: "This browser cannot draw the wallpaper",
    blobFail: "Could not create the image",
    making: "Making…",
    downloadFail: "Download failed",
    applying: "Setting…",
    helperEmpty: "The helper returned nothing",
    applyFail: "Could not change the desktop",
    applied: "The desktop is updated.",
    notReady: "The page is not ready",
    textSeed: "Write an English sentence here.",
    langBtn: "中文",
  },
};

function t(key) {
  return (STR[lang] && STR[lang][key]) || STR.zh[key] || key;
}

function tf(key, vars) {
  return t(key).replace(/\{(\w+)\}/g, (_, name) => (vars[name] == null ? "" : String(vars[name])));
}

// Gloss and phonetic fields in words.json are adapted from ECDICT (MIT). See words.LICENSE.
async function loadWords() {
  const response = await fetch("/words.json");
  if (!response.ok) throw new Error(t("noWords"));
  const data = await response.json();
  if (!data || !Array.isArray(data.junior) || !Array.isArray(data.senior)) throw new Error(t("noWords"));
  WORD_JUNIOR = data.junior;
  WORD_SENIOR = data.senior;
  WORD_INDEX = new Map();
  for (const card of [...WORD_JUNIOR, ...WORD_SENIOR]) {
    const key = String(card[0]).toLowerCase();
    if (!WORD_INDEX.has(key)) WORD_INDEX.set(key, card);
  }
}

function escapeHTML(text) {
  return String(text).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[ch]));
}

function glossText(card) {
  const meaning = lang === "en" ? card[4] : card[3];
  return `${card[2]} ${meaning}`.trim();
}

function cardHTML(card) {
  const [word, ipa, , , , ex] = card;
  const ipaHTML = ipa ? `<div class="ipa">${escapeHTML(ipa)}</div>` : "";
  return `<div class="word">${escapeHTML(word)}</div>${ipaHTML}<div class="gloss">${escapeHTML(glossText(card))}</div><div class="ex">${escapeHTML(ex)}</div>`;
}

function cardByWord(word) {
  return WORD_INDEX.get(String(word || "").toLowerCase()) || null;
}

function sampleNotes() {
  const first = cardByWord("conversation");
  const second = cardByWord("permission");
  const notes = [];
  if (first) notes.push({ x: 0.06, y: 0.1, w: 0.4, plate: "glass", size: 28, word: first[0], html: cardHTML(first) });
  if (second) notes.push({ x: 0.54, y: 0.14, w: 0.4, plate: "paper", size: 28, word: second[0], html: cardHTML(second) });
  notes.push({ x: 0.06, y: 0.68, w: 0.46, size: 34, html: sentenceTemplate() });
  return notes;
}

function nextCard(deck) {
  const cards = deck === "senior" ? WORD_SENIOR : WORD_JUNIOR;
  if (!cards.length) return null;
  const used = new Set(
    [...board.querySelectorAll(".note .word")].map((el) => el.textContent.trim().toLowerCase()),
  );
  let pool = cards.filter((card) => !used.has(String(card[0]).toLowerCase()) && String(card[0]).toLowerCase() !== lastCardWord);
  if (!pool.length) pool = cards.filter((card) => String(card[0]).toLowerCase() !== lastCardWord);
  if (!pool.length) pool = cards;
  const card = pool[Math.floor(Math.random() * pool.length)];
  lastCardWord = String(card[0]).toLowerCase();
  return card;
}

function nextCardPlate() {
  const notes = board.querySelectorAll(".note");
  const last = notes[notes.length - 1];
  return last && last.dataset.plate === "glass" ? "paper" : "glass";
}

function sentenceTemplate() {
  return '<div class="kicker">TO SAY</div><div class="lead">Say it once, in a real sentence.</div>';
}

function loadCanvasSize() {
  try {
    const saved = JSON.parse(localStorage.getItem("deskline.size") || "null");
    if (!saved) return;
    const width = Math.round(Number(saved.w));
    const height = Math.round(Number(saved.h));
    if (width >= 640 && height >= 400 && width <= 7680 && height <= 4320) {
      screenW = width;
      screenH = height;
      sizeKey = saved.key || "custom";
    }
  } catch {
    /* keep the native screen */
  }
}

function presetSize(preset) {
  if (preset.key === "native") return [NATIVE_W, NATIVE_H];
  return [preset.w, preset.h];
}

function setCanvasSize(width, height, key) {
  const w = Math.round(Number(width));
  const h = Math.round(Number(height));
  if (!Number.isFinite(w) || !Number.isFinite(h) || w < 640 || h < 400 || w > 7680 || h > 4320) {
    toast(t("badSize"));
    return;
  }
  screenW = w;
  screenH = h;
  sizeKey = key || "custom";
  localStorage.setItem("deskline.size", JSON.stringify({ w, h, key: sizeKey }));
  syncSizePicks();
  fit();
}

function syncSizePicks() {
  const select = document.getElementById("screenSize");
  const known = SIZE_PRESETS.some((preset) => preset.key === sizeKey);
  for (const preset of SIZE_PRESETS) {
    const option = select.querySelector(`option[value="${preset.key}"]`);
    if (!option) continue;
    const [w, h] = presetSize(preset);
    option.textContent = preset.key === "native" ? `${t("native")}  ${w}×${h}` : `${w}×${h}`;
  }
  const custom = select.querySelector('option[value="custom"]');
  if (custom) custom.textContent = t("custom");
  select.value = known ? sizeKey : "custom";
  document.getElementById("customSize").hidden = select.value !== "custom";
  const width = document.getElementById("customW");
  const height = document.getElementById("customH");
  if (document.activeElement !== width) width.value = String(screenW);
  if (document.activeElement !== height) height.value = String(screenH);
}

function onScreenPick() {
  const key = document.getElementById("screenSize").value;
  if (key === "custom") {
    sizeKey = "custom";
    document.getElementById("customSize").hidden = false;
    return;
  }
  const preset = SIZE_PRESETS.find((item) => item.key === key);
  const [w, h] = presetSize(preset);
  setCanvasSize(w, h, key);
}

function buildScreenPicks() {
  const select = document.getElementById("screenSize");
  select.replaceChildren();
  for (const preset of SIZE_PRESETS) {
    const option = document.createElement("option");
    option.value = preset.key;
    select.appendChild(option);
  }
  const custom = document.createElement("option");
  custom.value = "custom";
  select.appendChild(custom);
  select.addEventListener("change", onScreenPick);
  syncSizePicks();
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
  updateMeta();
}

function updateMeta() {
  const dpr = window.devicePixelRatio || 1;
  metaEl.textContent = tf("meta", {
    w: screenW,
    h: screenH,
    pw: Math.round(screenW * dpr),
    ph: Math.round(screenH * dpr),
  });
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
  const format = document.getElementById("format");
  const wasIdle = format.classList.contains("is-idle");
  if (selected && selected !== note) selected.classList.remove("selected");
  selected = note;
  if (note) {
    note.classList.add("selected");
    board.appendChild(note);
  }
  format.classList.toggle("is-idle", !note);
  syncFormatState();
  if (wasIdle === !note) return;
  requestAnimationFrame(fit);
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
  if (data.plate) note.dataset.plate = data.plate;
  else if (data.plate == null && /class="word"/.test(data.html || "")) note.dataset.plate = "glass";
  if (data.align === "center") note.dataset.align = "center";
  note.innerHTML = `
    <div class="handle" aria-hidden="true"><span></span></div>
    <div class="note-body" lang="en" spellcheck="true" contenteditable="false" autocorrect="off" autocapitalize="off"></div>
    <button class="resize" type="button" aria-label="${escapeHTML(t("resize"))}" tabindex="-1"></button>
  `;
  const body = note.querySelector(".note-body");
  body.innerHTML = data.html || `<div>${escapeHTML(t("textSeed"))}</div>`;
  const wordEl = body.querySelector(".word");
  const wordKey = String(data.word || (wordEl ? wordEl.textContent : "")).trim().toLowerCase();
  if (wordKey && WORD_INDEX.has(wordKey)) note.dataset.word = wordKey;
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
  const plate = note ? note.dataset.plate || "" : "";
  document.getElementById("plateBare").setAttribute("aria-pressed", note && !plate ? "true" : "false");
  document.getElementById("plateGlass").setAttribute("aria-pressed", plate === "glass" ? "true" : "false");
  document.getElementById("platePaper").setAttribute("aria-pressed", plate === "paper" ? "true" : "false");
  const centered = note && note.dataset.align === "center";
  document.getElementById("alignLeft").setAttribute("aria-pressed", note && !centered ? "true" : "false");
  document.getElementById("alignCenter").setAttribute("aria-pressed", centered ? "true" : "false");
}

function setPlate(kind) {
  const note = selectedNote();
  if (!note) {
    toast(t("pickNote"));
    return;
  }
  if (kind) note.dataset.plate = kind;
  else delete note.dataset.plate;
  syncFormatState();
  saveSoon();
}

function setAlign(align) {
  const note = selectedNote();
  if (!note) {
    toast(t("pickNote"));
    return;
  }
  if (align === "center") note.dataset.align = "center";
  else delete note.dataset.align;
  syncFormatState();
  saveSoon();
}

function applyInline(command, value) {
  const note = selectedNote();
  if (!note) {
    toast(t("pickNote"));
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
    toast(t("pickSize"));
    return;
  }
  note.querySelector(".note-body").style.fontSize = `${px}px`;
  saveSoon();
}

function removeSelected() {
  const note = selectedNote();
  if (!note) {
    toast(t("pickDelete"));
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
  toast(t("samplesBack"));
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

function bgLabel(bg) {
  if (!bg) return "";
  if (typeof bg === "string") return backgroundLabel(bg);
  return lang === "en" ? bg.en || bg.zh : bg.zh || bg.en;
}

async function fetchBackgrounds() {
  const response = await fetch("/backgrounds/manifest.json");
  if (!response.ok) throw new Error(t("noManifest"));
  const data = await response.json();
  if (!Array.isArray(data)) throw new Error(t("badManifest"));
  return data.map((item) => {
    if (typeof item === "string") {
      const label = backgroundLabel(item);
      return { file: item, zh: label, en: label };
    }
    if (!item || typeof item.file !== "string" || !item.file || item.file.startsWith(".")) return null;
    return {
      file: item.file,
      zh: item.zh || backgroundLabel(item.file),
      en: item.en || item.zh || backgroundLabel(item.file),
    };
  }).filter(Boolean);
}

function ensureImage(url) {
  const cached = imageCache.get(url);
  if (cached) return cached;
  const pending = new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(t("bgBroken")));
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

function renderFilmstrip() {
  const film = document.getElementById("film");
  const same = film.childElementCount === backgrounds.length
    && [...film.children].every((btn, index) => btn.dataset.file === backgrounds[index].file);
  if (!same) {
    film.replaceChildren();
    backgrounds.forEach((bg) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "thumb";
      btn.dataset.file = bg.file;
      btn.style.backgroundImage = `url("${backgroundURL(bg.file)}")`;
      btn.addEventListener("click", () => applyBackgroundFile(bg.file));
      film.appendChild(btn);
    });
  }
  film.querySelectorAll(".thumb").forEach((btn, index) => {
    const label = bgLabel(backgrounds[index]);
    btn.title = label;
    btn.setAttribute("aria-label", label);
    btn.setAttribute("aria-pressed", index === bgIndex ? "true" : "false");
  });
  centerActiveThumb(film.dataset.ready === "1");
  film.dataset.ready = "1";
}

function centerActiveThumb(smooth) {
  const run = () => {
    const film = document.getElementById("film");
    const active = film.querySelector('.thumb[aria-pressed="true"]');
    if (!active || film.clientWidth <= 0) return;
    const pad = Math.max(0, (film.clientWidth - active.offsetWidth) / 2);
    film.style.paddingLeft = `${pad}px`;
    film.style.paddingRight = `${pad}px`;
    const filmRect = film.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    const delta = activeRect.left + activeRect.width / 2 - (filmRect.left + filmRect.width / 2);
    film.scrollTo({ left: Math.max(0, film.scrollLeft + delta), behavior: smooth ? "smooth" : "auto" });
  };
  if (smooth) run();
  else requestAnimationFrame(run);
}

function updateCaption() {
  const empty = backgrounds.length === 0;
  bgPrev.disabled = empty;
  bgNext.disabled = empty;
  renderFilmstrip();
  if (empty) {
    bgCaption.textContent = t("noBg");
    return;
  }
  const bg = backgrounds[bgIndex];
  bgCaption.textContent = `${bgLabel(bg)}  ${bgIndex + 1}/${backgrounds.length}`;
}

function applyBackgroundFile(name, quiet) {
  if (!backgrounds.length) {
    bgId = "";
    bgToken += 1;
    document.getElementById("bgStack").replaceChildren();
    board.dataset.light = "0";
    updateCaption();
    return;
  }
  const found = backgrounds.findIndex((bg) => bg.file === name);
  bgIndex = found >= 0 ? found : 0;
  const file = backgrounds[bgIndex].file;
  bgId = file;
  const url = backgroundURL(file);
  showBoardBackground(url);
  updateCaption();
  ensureImage(url).then(tuneInk).catch(() => {});
  if (!quiet) save();
}

let bgToken = 0;

function showBoardBackground(url) {
  const stack = document.getElementById("bgStack");
  const token = ++bgToken;
  const layer = document.createElement("div");
  layer.className = "bg-layer";
  layer.dataset.token = String(token);
  layer.style.backgroundImage = `url("${url}")`;
  stack.appendChild(layer);
  requestAnimationFrame(() => layer.classList.add("is-shown"));
  [...stack.children].forEach((el) => {
    if (el !== layer) el.classList.remove("is-shown");
  });
  window.setTimeout(() => {
    [...stack.querySelectorAll(".bg-layer")].forEach((el) => {
      if (el.dataset.token !== String(bgToken)) el.remove();
    });
  }, 520);
}

async function stepBackground(delta) {
  try {
    const files = await fetchBackgrounds();
    const current = backgrounds[bgIndex] && backgrounds[bgIndex].file;
    backgrounds = files;
    const index = backgrounds.findIndex((bg) => bg.file === current);
    bgIndex = index >= 0 ? index : 0;
  } catch (err) {
    toast(err.message || t("noBgDir"));
  }
  if (!backgrounds.length) {
    applyBackgroundFile("", true);
    toast(t("addBgHint"), 4800);
    return;
  }
  const next = (bgIndex + delta + backgrounds.length) % backgrounds.length;
  applyBackgroundFile(backgrounds[next].file);
}

function fillRoundRect(ctx, x, y, w, h, r) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
  ctx.fill();
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
    btn.title = color ? t("ink") : t("inkClear");
    if (color) btn.style.background = color;
    btn.addEventListener("click", () => applyInline("foreColor", color));
    inkBox.appendChild(btn);
  }
  const markBox = document.getElementById("markSwatches");
  for (const color of MARKS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = color ? "swatch" : "swatch clear";
    btn.title = color ? t("mark") : t("markClear");
    if (color) btn.style.background = color;
    btn.addEventListener("click", () => applyInline("hiliteColor", color || "transparent"));
    markBox.appendChild(btn);
  }
  const sizeBox = document.getElementById("fontSizes");
  for (const size of SIZES) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "size";
    btn.textContent = String(size);
    btn.title = t("size");
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
  if (!ctx) throw new Error(t("noCanvas"));
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
    const plated = note.dataset.plate === "glass" || note.dataset.plate === "paper";
    if (plated) {
      ctx.fillStyle = note.dataset.plate === "paper" ? "rgba(247, 242, 232, 0.94)" : "rgba(12, 10, 8, 0.5)";
      fillRoundRect(
        ctx,
        (parseFloat(note.style.left) || 0) * exportScale,
        (parseFloat(note.style.top) || 0) * exportScale,
        note.offsetWidth * exportScale,
        note.offsetHeight * exportScale,
        22 * exportScale,
      );
    } else if (note.dataset.accent) {
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
      if (!note.dataset.plate) {
        ctx.shadowColor = board.dataset.light === "1" ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.55)";
        ctx.shadowBlur = 8 * exportScale;
        ctx.shadowOffsetY = exportScale;
      }
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
      else reject(new Error(t("blobFail")));
    }, "image/png");
  });
}

async function makeBlob() {
  endEdit();
  await new Promise((resolve) => requestAnimationFrame(resolve));
  return canvasBlob(await renderWallpaper());
}

const HELPER_URL = "http://127.0.0.1:47321";

function detectOS() {
  const hinted = navigator.userAgentData && navigator.userAgentData.platform;
  const blob = `${hinted || ""} ${navigator.platform || ""} ${navigator.userAgent || ""}`;
  if (/Windows|Win32|Win64/i.test(blob)) return "windows";
  if (/Mac|Macintosh/i.test(blob)) return "mac";
  return "other";
}

function helperFile() {
  if (detectOS() === "windows") return "helpers/Deskline-Windows.exe";
  if (detectOS() === "mac") return "helpers/Deskline-Mac.zip";
  return "";
}

function helperHint() {
  if (detectOS() === "windows") return t("helperDownWin");
  if (detectOS() === "mac") return t("helperDownMac");
  return t("helperOther");
}

async function helperAlive() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1200);
  try {
    const response = await fetch(`${HELPER_URL}/health`, { signal: controller.signal });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

function showHelperPrompt() {
  document.getElementById("helperPromptText").textContent = t("helperNeed");
  document.getElementById("helperPrompt").hidden = false;
}

function downloadHelper() {
  const file = helperFile();
  if (!file) {
    toast(t("helperOther"), 6400);
    return false;
  }
  const link = document.createElement("a");
  link.href = file;
  link.download = file.split("/").pop();
  document.body.appendChild(link);
  link.click();
  link.remove();
  return true;
}

async function applyWallpaper() {
  if (!(await helperAlive())) {
    showHelperPrompt();
    return;
  }
  applyBtn.disabled = true;
  applyBtn.textContent = t("applying");
  let blob;
  try {
    blob = await makeBlob();
    const response = await fetch(`${HELPER_URL}/wallpaper`, {
      method: "POST",
      headers: { "Content-Type": "image/png" },
      body: blob,
    });
    const data = await response.json().catch(() => ({ ok: false, error: t("helperEmpty") }));
    if (!response.ok || !data.ok) throw new Error(data.error || t("applyFail"));
    toast(t("applied"));
  } catch (err) {
    if (err instanceof TypeError || String(err.message || "").includes("Failed to fetch")) {
      showHelperPrompt();
    } else {
      toast(err.message || t("applyFail"), 6400);
    }
  } finally {
    applyBtn.disabled = false;
    applyBtn.textContent = t("apply");
  }
}

function onKeyDown(event) {
  const typing = selected && selected.classList.contains("editing");
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
    event.preventDefault();
    applyWallpaper();
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
    if (document.body.classList.contains("previewing")) {
      document.body.classList.remove("previewing");
      requestAnimationFrame(() => requestAnimationFrame(fit));
      return;
    }
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

function refreshGlosses() {
  board.querySelectorAll(".note[data-word]").forEach((note) => {
    const card = WORD_INDEX.get(note.dataset.word);
    const gloss = note.querySelector(".gloss");
    if (!card || !gloss) return;
    gloss.textContent = glossText(card);
  });
}

function applyLanguage() {
  document.documentElement.lang = lang === "en" ? "en" : "zh-CN";
  document.title = t("title");
  const text = {
    addJunior: "addJunior",
    addSenior: "addSenior",
    addText: "addText",
    addLine: "addLine",
    useCustom: "useCustom",
    preview: "preview",
    download: "download",
    helperPromptGo: "helperPromptGo",
    helperPromptClose: "helperPromptClose",
    apply: "apply",
    alignLeft: "left",
    alignCenter: "center",
    plateBare: "bare",
    plateGlass: "glass",
    platePaper: "paper",
    remove: "remove",
    samples: "samples",
  };
  for (const [id, key] of Object.entries(text)) {
    const el = document.getElementById(id);
    if (el && !el.disabled) el.textContent = t(key);
  }
  const titles = {
    apply: "applyTitle",
    bold: "bold",
    italic: "italic",
    underline: "underline",
    alignLeft: "alignLeft",
    alignCenter: "alignCenter",
    plateBare: "plateBare",
    plateGlass: "plateGlass",
    platePaper: "platePaper",
  };
  for (const [id, key] of Object.entries(titles)) {
    const el = document.getElementById(id);
    if (el) el.title = t(key);
  }
  document.getElementById("screenHeading").textContent = t("screen");
  document.getElementById("wordsHeading").textContent = t("words");
  document.getElementById("textHeading").textContent = t("text");
  document.getElementById("customW").setAttribute("aria-label", lang === "en" ? "Width" : "宽度");
  document.getElementById("customH").setAttribute("aria-label", lang === "en" ? "Height" : "高度");
  const language = document.getElementById("lang");
  language.value = lang;
  language.setAttribute("aria-label", lang === "en" ? "Language" : "语言");
  syncSizePicks();
  document.getElementById("bgPrev").setAttribute("aria-label", t("prevBg"));
  document.getElementById("bgNext").setAttribute("aria-label", t("nextBg"));
  const prompt = document.getElementById("helperPrompt");
  if (!prompt.hidden) document.getElementById("helperPromptText").textContent = t("helperNeed");
  document.getElementById("film").setAttribute("aria-label", t("film"));
  document.getElementById("format").setAttribute("aria-label", t("format"));
  placeholder.innerHTML = t("placeholder");
  document.querySelectorAll(".resize").forEach((el) => el.setAttribute("aria-label", t("resize")));
  document.querySelectorAll("#inkSwatches .swatch").forEach((btn) => {
    btn.title = btn.classList.contains("clear") ? t("inkClear") : t("ink");
  });
  document.querySelectorAll("#markSwatches .swatch").forEach((btn) => {
    btn.title = btn.classList.contains("clear") ? t("markClear") : t("mark");
  });
  document.querySelectorAll("#fontSizes .size").forEach((btn) => {
    btn.title = t("size");
  });
  refreshGlosses();
  updateMeta();
  updateCaption();
}

function setLanguage(next) {
  lang = next === "en" ? "en" : "zh";
  localStorage.setItem("deskline.lang", lang);
  endEdit();
  applyLanguage();
}

async function init() {
  loadCanvasSize();
  buildChrome();
  buildScreenPicks();
  try {
    await loadWords();
  } catch (err) {
    toast(err.message || t("noWords"));
  }
  const saved = loadState();
  if (saved) saved.notes.forEach((note) => createNote(note, true));
  else sampleNotes().forEach((note) => createNote(note, true));
  applyLanguage();
  fit();
  if (!saved) relaxOverlaps();
  try {
    backgrounds = await fetchBackgrounds();
  } catch (err) {
    backgrounds = [];
    toast(err.message || t("noBgDir"));
  }
  const names = backgrounds.map((bg) => bg.file);
  const wanted = saved && names.includes(saved.bg) ? saved.bg : names[0];
  applyBackgroundFile(wanted || "", true);
  fit();
  if (!saved) save();
  document.getElementById("format").addEventListener("mousedown", (event) => {
    if (event.target.closest("button")) event.preventDefault();
  });
  document.getElementById("customSize").addEventListener("submit", (event) => {
    event.preventDefault();
    setCanvasSize(document.getElementById("customW").value, document.getElementById("customH").value, "custom");
  });
  document.getElementById("lang").addEventListener("change", (event) => setLanguage(event.target.value));
  document.getElementById("addText").addEventListener("click", () => {
    const note = createNote({ x: 0.08, y: 0.12, w: 0.34, html: `<div>${escapeHTML(t("textSeed"))}</div>`, size: 32 });
    placeWithoutOverlap(note);
    beginEdit(note);
  });
  function addWordCard(deck) {
    const card = nextCard(deck);
    if (!card) {
      toast(t("noWords"));
      return;
    }
    const note = createNote({ x: 0.08, y: 0.12, w: 0.4, html: cardHTML(card), word: card[0], size: 28, plate: nextCardPlate() });
    placeWithoutOverlap(note);
  }
  document.getElementById("addJunior").addEventListener("click", () => addWordCard("junior"));
  document.getElementById("addSenior").addEventListener("click", () => addWordCard("senior"));
  document.getElementById("addLine").addEventListener("click", () => {
    const note = createNote({ x: 0.08, y: 0.62, w: 0.46, html: sentenceTemplate(), size: 34 });
    placeWithoutOverlap(note);
    beginEdit(note);
  });
  document.getElementById("preview").addEventListener("click", () => {
    const on = document.body.classList.toggle("previewing");
    document.getElementById("preview").setAttribute("aria-pressed", on ? "true" : "false");
    endEdit();
    if (on) select(null);
    requestAnimationFrame(() => requestAnimationFrame(fit));
  });
  document.getElementById("bold").addEventListener("click", () => applyInline("bold"));
  document.getElementById("italic").addEventListener("click", () => applyInline("italic"));
  document.getElementById("underline").addEventListener("click", () => applyInline("underline"));
  document.getElementById("alignLeft").addEventListener("click", () => setAlign("left"));
  document.getElementById("alignCenter").addEventListener("click", () => setAlign("center"));
  document.getElementById("plateBare").addEventListener("click", () => setPlate(""));
  document.getElementById("plateGlass").addEventListener("click", () => setPlate("glass"));
  document.getElementById("platePaper").addEventListener("click", () => setPlate("paper"));
  document.getElementById("remove").addEventListener("click", removeSelected);
  document.getElementById("samples").addEventListener("click", restoreSamples);
  document.getElementById("download").addEventListener("click", () => {
    if (downloadHelper()) toast(helperHint(), 8000);
  });
  document.getElementById("helperPromptGo").addEventListener("click", () => {
    if (!downloadHelper()) return;
    document.getElementById("helperPromptText").textContent = helperHint();
  });
  document.getElementById("helperPromptClose").addEventListener("click", () => {
    document.getElementById("helperPrompt").hidden = true;
  });
  bgPrev.addEventListener("click", () => stepBackground(-1));
  bgNext.addEventListener("click", () => stepBackground(1));
  applyBtn.addEventListener("click", applyWallpaper);
  document.addEventListener("pointermove", onPointerMove);
  document.addEventListener("pointerup", onPointerUp);
  document.addEventListener("pointercancel", onPointerUp);
  document.addEventListener("selectionchange", rememberSelection);
  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("pointerdown", (event) => {
    if (event.target.closest(".note") || event.target.closest(".side") || event.target.closest(".top") || event.target.closest(".dock")) return;
    endEdit();
    select(null);
  });
  window.addEventListener("resize", () => {
    fit();
    centerActiveThumb(false);
  });
  new ResizeObserver(() => fit()).observe(stage);
}

init().catch((err) => {
  console.error(err);
  toast(t("notReady"));
});
