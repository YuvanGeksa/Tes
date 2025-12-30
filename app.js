// =========================================================================
// Yopandelreyz — Payment Methods (UI/UX refactor only)
// - Keep original functionality: expand methods, copy number, view/download QR
// - Improve a11y: proper aria-controls/regions, real <button> for copy area
// - Improve conversion: optional WhatsApp confirmation CTA with prefilled method
// =========================================================================

const WA_NUMBER = "6285122534702";

const METHODS = [
  { id: "qris",  name: "QRIS",  logo: "./img/qris.jpg",  kind: "qris", badge: "QR" }
];

// QRIS card variants (cards slider)
const QRIS_VARIANTS = [
  {
    id: "qris1",
    src: "./img/qris1.jpg",
    download: "qris1.jpg",
    note: "- Pembayaran Khusus Melalui Aplikasi DANA",
  },
  {
    id: "qris2",
    src: "./img/qris2.jpg",
    download: "qris2.jpg",
    note: "- pembayaran melalui emoney selain dana / mbanking",
  },
  {
    id: "qris3",
    src: "./img/qris3.jpg",
    download: "qris3.jpg",
    note: "QRIS KHUSUS PPJ PANEL, SEWA - BELI BOT - BELI NOKOS",
  },
];

function $(id){ return document.getElementById(id); }

// ---------- Icons (inline SVG) ----------
function iconSun(){
  return `
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2" /><path d="M12 20v2" />
    <path d="M4.93 4.93l1.41 1.41" /><path d="M17.66 17.66l1.41 1.41" />
    <path d="M2 12h2" /><path d="M20 12h2" />
    <path d="M4.93 19.07l1.41-1.41" /><path d="M17.66 6.34l1.41-1.41" />
  </svg>`;
}
function iconMoon(){
  return `
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 12.8A8.5 8.5 0 0 1 11.2 3a6.5 6.5 0 1 0 9.8 9.8Z" />
  </svg>`;
}
function chevronSvg(){
  return `
  <svg class="chev" viewBox="0 0 24 24" fill="none" aria-hidden="true"
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M6 9l6 6 6-6" />
  </svg>`;
}

// ---------- Theme ----------
function getEffectiveDark(){ return document.documentElement.classList.contains("dark"); }
function applyTheme(pref){
  const root = document.documentElement;
  if (pref === "system"){
    localStorage.removeItem("theme");
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.toggle("dark", prefersDark);
    return;
  }
  localStorage.setItem("theme", pref);
  root.classList.toggle("dark", pref === "dark");
}
function setThemeIcon(){
  const icon = $("themeIcon");
  if (!icon) return;
  icon.innerHTML = getEffectiveDark() ? iconSun() : iconMoon();
}
function initThemeToggle(){
  const btn = $("themeToggle");
  if (!btn) return;

  btn.addEventListener("click", () => {
    const next = getEffectiveDark() ? "light" : "dark";
    applyTheme(next);
    setThemeIcon();
  });

  setThemeIcon();

  // Sync when following system preference
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener?.("change", () => {
    const stored = localStorage.getItem("theme");
    if (!stored){
      applyTheme("system");
      setThemeIcon();
    }
  });
}

// ---------- Toast ----------
function toast(message){
  const viewport = $("toastViewport");
  if (!viewport) return;
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  viewport.appendChild(el);

  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transform = "translateY(-6px) scale(.98)";
    el.style.transition = "opacity 160ms ease, transform 160ms ease";
  }, 1650);

  setTimeout(() => el.remove(), 2000);
}

// ---------- QRIS Cards Slider (stack / poker-like) ----------
function createQrisSlider({ deckEl, noteEl, noteTextEl, downloadEl }){
  const cards = Array.from(deckEl.querySelectorAll(".qris-card"));
  let order = [0, 1, 2]; // position 0 = front (active)
  let hideTimer = null;
  let swapTimer = null;

  const clearTimers = () => {
    if (hideTimer) clearTimeout(hideTimer);
    if (swapTimer) clearTimeout(swapTimer);
    hideTimer = null;
    swapTimer = null;
  };

  const scheduleAutoHide = () => {
    if (hideTimer) clearTimeout(hideTimer);
    // ~10 minutes
    hideTimer = setTimeout(() => {
      noteEl.classList.remove("is-show");
    }, 10 * 60 * 1000);
  };

  const setNoteContent = (idx) => {
    const v = QRIS_VARIANTS[idx] || QRIS_VARIANTS[0];
    noteTextEl.textContent = v.note;
    downloadEl.href = v.src;
    downloadEl.setAttribute("download", v.download);
  };

  const showNote = (idx, { animate = true } = {}) => {
    // Animate like a notif: slide up then slide down when switching
    if (animate && noteEl.classList.contains("is-show")){
      noteEl.classList.remove("is-show");
      if (swapTimer) clearTimeout(swapTimer);
      swapTimer = setTimeout(() => {
        setNoteContent(idx);
        noteEl.classList.add("is-show");
        scheduleAutoHide();
      }, 170);
      return;
    }

    setNoteContent(idx);
    noteEl.classList.add("is-show");
    scheduleAutoHide();
  };

  const applyPositions = () => {
    // Map each card index -> position (0 front, 1 mid, 2 back)
    order.forEach((cardIdx, pos) => {
      const el = cards[cardIdx];
      if (!el) return;
      el.dataset.pos = String(pos);
      el.setAttribute("aria-selected", pos === 0 ? "true" : "false");
      el.tabIndex = pos === 0 ? 0 : -1;
    });
  };

  const setActive = (idx, { animateNote = true } = {}) => {
    if (typeof idx !== "number" || idx < 0 || idx >= cards.length) idx = 0;
    // Bring selected card to front, keep the rest order
    order = [idx, ...order.filter((x) => x !== idx)];
    applyPositions();
    showNote(idx, { animate: animateNote });
  };

  const onCardClick = (ev) => {
    const btn = ev.target && ev.target.closest ? ev.target.closest(".qris-card") : null;
    if (!btn || !deckEl.contains(btn)) return;
    const idx = Number(btn.dataset.idx);
    const isActive = order[0] === idx;
    // If active card is tapped, keep state but re-show note if it was hidden
    setActive(idx, { animateNote: !isActive });
  };

  const onDeckKeydown = (ev) => {
    const k = ev.key;
    if (k !== "ArrowLeft" && k !== "ArrowRight") return;
    ev.preventDefault();
    const active = order[0] ?? 0;
    const next = k === "ArrowRight" ? (active + 1) % cards.length : (active - 1 + cards.length) % cards.length;
    setActive(next);
    cards[order[0]]?.focus?.();
  };

  deckEl.addEventListener("click", onCardClick);
  deckEl.addEventListener("keydown", onDeckKeydown);

  // Download feedback (keep existing UX: show toast)
  downloadEl.addEventListener("click", () => toast("Unduhan dimulai"));

  return {
    open(){
      clearTimers();
      order = [0, 1, 2];
      applyPositions();
      showNote(0, { animate: false });
    },
    close(){
      clearTimers();
      noteEl.classList.remove("is-show");
    },
  };
}

// ---------- Helpers ----------
function makeWaLink(methodName){
  const text = methodName
    ? `Halo admin Yopandelreyz, saya ingin konfirmasi pembayaran via ${methodName}.`
    : "Halo admin Yopandelreyz, saya ingin konfirmasi pembayaran.";
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;
}

async function copyToClipboard(text){
  try{
    if (navigator.clipboard && navigator.clipboard.writeText){
      await navigator.clipboard.writeText(text);
      return true;
    }
  }catch(e){}
  try{
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-9999px";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }catch(e){
    return false;
  }
}

function setHostHint(){
  const hostEl = $("siteHost");
  if (!hostEl) return;
  const host = (window.location && window.location.host) ? window.location.host : hostEl.textContent;
  hostEl.textContent = host;
}

// ---------- Render ----------
function render(){
  const list = $("paymentList");
  if (!list) return;

  const confirmBtn = $("confirmBtn");
  let openId = null;

  const closeAll = () => {
    [...list.children].forEach((child) => {
      if (child instanceof HTMLElement){
        const wasOpen = child.dataset.open === "true";
        child.dataset.open = "false";
        const btn = child.querySelector(".item-header");
        if (btn) btn.setAttribute("aria-expanded", "false");

        // If QRIS was open, stop its timers & hide its note (no UI impact elsewhere)
        if (wasOpen && child._qrisController && typeof child._qrisController.close === "function"){
          child._qrisController.close();
        }
      }
    });
  };

  const setConfirmMethod = (methodName) => {
    if (!confirmBtn) return;
    confirmBtn.href = makeWaLink(methodName);
  };

  const makeItem = (m) => {
    const item = document.createElement("div");
    item.className = "item";
    item.dataset.open = "false";

    let qrisController = null;

    // Header button
    const header = document.createElement("button");
    header.type = "button";
    header.className = "item-header";

    const headerId = `pm-${m.id}-header`;
    const panelId  = `pm-${m.id}-panel`;

    header.id = headerId;
    header.setAttribute("aria-expanded", "false");
    header.setAttribute("aria-controls", panelId);

    const logo = document.createElement("div");
    logo.className = "logo";
    const img = document.createElement("img");
    img.src = m.logo;
    img.alt = `${m.name} logo`;
    logo.appendChild(img);

    const main = document.createElement("div");
    main.className = "item-main";

    const name = document.createElement("p");
    name.className = "item-name";
    name.textContent = m.name;

    if (m.badge){
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = m.badge;
      name.appendChild(badge);
    }

    const sub = document.createElement("p");
    sub.className = "item-sub";
    sub.textContent =
      m.kind === "number" ? "Salin nomor tujuan, lalu bayar dari aplikasi Anda"
      : m.kind === "qris" ? "Scan QRIS dari aplikasi pembayaran"
      : "Metode ini sedang tidak tersedia";

    main.appendChild(name);
    main.appendChild(sub);

    const chev = document.createElement("div");
    chev.innerHTML = chevronSvg();

    header.appendChild(logo);
    header.appendChild(main);
    header.appendChild(chev);

    // Panel region (a11y)
    const panel = document.createElement("div");
    panel.className = "item-panel";
    panel.id = panelId;
    panel.setAttribute("role", "region");
    panel.setAttribute("aria-labelledby", headerId);

    // Panel content
    if (m.kind === "number"){
      const p = document.createElement("p");
      p.className = "panel-text";
      p.innerHTML = `Gunakan nomor berikut untuk pembayaran melalui <strong>${m.name}</strong>.`;

      const row = document.createElement("div");
      row.className = "row";

      const copyBtn = document.createElement("button");
      copyBtn.type = "button";
      copyBtn.className = "copy-area";
      copyBtn.setAttribute("aria-label", `Klik untuk salin nomor ${m.name}`);

      const code = document.createElement("code");
      code.textContent = m.number;

      const hint = document.createElement("span");
      hint.className = "copy-hint";
      hint.textContent = "Klik untuk salin";

      copyBtn.appendChild(code);
      copyBtn.appendChild(hint);

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn-primary btn-inline";
      btn.textContent = "Copy";

      const doCopy = async () => {
        const ok = await copyToClipboard(m.number);
        toast(ok ? "Nomor tersalin" : "Gagal menyalin");
      };

      btn.addEventListener("click", doCopy);
      copyBtn.addEventListener("click", doCopy);

      row.appendChild(copyBtn);
      row.appendChild(btn);

      panel.appendChild(p);
      panel.appendChild(row);
    }

    if (m.kind === "unavailable"){
      const p = document.createElement("p");
      p.className = "panel-text";
      p.innerHTML = `Metode <strong>${m.name}</strong> saat ini <strong>tidak tersedia</strong>.`;

      const row = document.createElement("div");
      row.className = "row";

      const area = document.createElement("div");
      area.className = "copy-area";
      area.style.cursor = "not-allowed";
      area.setAttribute("aria-disabled", "true");
      area.innerHTML = `<span style="font-size:14px;color:var(--muted)">Tidak tersedia</span>`;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn-secondary btn-inline";
      btn.textContent = "Copy";
      btn.disabled = true;
      btn.style.opacity = ".75";
      btn.style.cursor = "not-allowed";

      row.appendChild(area);
      row.appendChild(btn);

      panel.appendChild(p);
      panel.appendChild(row);
    }

    if (m.kind === "qris"){
      const p = document.createElement("p");
      p.className = "panel-text";
      p.textContent = "Scan QR berikut dari aplikasi pembayaran Anda.";

      // QRIS UI: notif + cards slider (stack)
      const qrisUi = document.createElement("div");
      qrisUi.className = "qris-ui";

      // Notif / note (slides down from top)
      const note = document.createElement("div");
      note.className = "qris-note";
      note.setAttribute("role", "status");
      note.setAttribute("aria-live", "polite");

      const noteText = document.createElement("div");
      noteText.className = "qris-note-text";

      const download = document.createElement("a");
      download.className = "qris-note-download";
      download.textContent = "Download";

      note.appendChild(noteText);
      note.appendChild(download);

      // QRIS logo in the QRIS block
      const blockLogo = document.createElement("div");
      blockLogo.className = "qris-block-logo";
      const blockImg = document.createElement("img");
      blockImg.src = "./img/qris.jpg";
      blockImg.alt = "QRIS";
      blockLogo.appendChild(blockImg);

      // Cards deck
      const deck = document.createElement("div");
      deck.className = "qris-deck";
      deck.setAttribute("aria-label", "Pilih QRIS");

      const deckArea = document.createElement("div");
      deckArea.className = "qris-deck-area";
      deckArea.setAttribute("role", "listbox");

      QRIS_VARIANTS.forEach((v, idx) => {
        const card = document.createElement("button");
        card.type = "button";
        card.className = "qris-card";
        card.dataset.idx = String(idx);
        card.dataset.pos = String(idx);
        card.setAttribute("aria-selected", idx === 0 ? "true" : "false");
        card.setAttribute("aria-label", `QRIS ${idx + 1}`);
        card.tabIndex = idx === 0 ? 0 : -1;

        const label = document.createElement("span");
        label.className = "qris-card-title";
        label.textContent = `QRIS ${idx + 1}`;
        card.appendChild(label);

        const img = document.createElement("img");
        img.src = v.src;
        img.alt = `QRIS ${idx + 1}`;
        card.appendChild(img);

        deckArea.appendChild(card);
      });

      const deckSpacer = document.createElement("div");
      deckSpacer.className = "qris-deck-spacer";
      deckSpacer.setAttribute("aria-hidden", "true");

      deck.appendChild(deckArea);
      deck.appendChild(deckSpacer);

      qrisUi.appendChild(note);
      qrisUi.appendChild(blockLogo);
      qrisUi.appendChild(deck);

      panel.appendChild(p);
      panel.appendChild(qrisUi);

      qrisController = createQrisSlider({
        deckEl: deckArea,
        noteEl: note,
        noteTextEl: noteText,
        downloadEl: download,
      });

      // Attach controller for closeAll() safety
      item._qrisController = qrisController;
    }

    item.appendChild(header);
    item.appendChild(panel);

    const setOpen = (yes) => {
      item.dataset.open = yes ? "true" : "false";
      header.setAttribute("aria-expanded", yes ? "true" : "false");
      if (yes){
        setConfirmMethod(m.name);
      }

      if (m.kind === "qris" && qrisController){
        yes ? qrisController.open() : qrisController.close();
      }
    };

    header.addEventListener("click", () => {
      if (openId === m.id){
        openId = null;
        setOpen(false);
        setConfirmMethod(null);
        return;
      }
      closeAll();
      openId = m.id;
      setOpen(true);
    });

    return item;
  };

  // Initial CTA: generic
  setConfirmMethod(null);

  METHODS.forEach((m) => list.appendChild(makeItem(m)));
}

// ---------- Boot ----------
document.addEventListener("DOMContentLoaded", () => {
  setHostHint();
  render();
  initThemeToggle();
});
