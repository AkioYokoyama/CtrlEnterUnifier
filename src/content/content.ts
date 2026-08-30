// Ctrl+Enter Unifier - content script
// Enterのみ = 改行 / Ctrl+Enter (Mac: Cmd+Enter) = 送信 に統一する
export {}; // このファイルをモジュールスコープにする（他ファイルとの変数衝突防止）

const STORAGE_KEY = "ctrlEnterUnifier";

interface UnifierSettings {
  enabled: boolean;
  disabledHosts: string[];
  buttonSelectors: Record<string, string>; // { "chatgpt.com": "button[data-testid='send-button']" }
}

const DEFAULTS: UnifierSettings = {
  enabled: true,
  disabledHosts: [],
  buttonSelectors: {},
};

let settings: UnifierSettings = { ...DEFAULTS };
const host = location.hostname;

function loadSettings(cb: () => void): void {
  try {
    chrome.storage.sync.get(STORAGE_KEY, (res) => {
      const stored = res?.[STORAGE_KEY] as Partial<UnifierSettings> | undefined;
      if (stored) {
        settings = { ...settings, ...stored };
      }
      cb();
    });
  } catch {
    // chrome.storageが使えない環境でも動作を継続する
    cb();
  }
}

function isEnabledForHost(): boolean {
  if (!settings.enabled) return false;
  return !settings.disabledHosts.some((h) => host.includes(h));
}

function isEditableTarget(el: EventTarget | null): el is HTMLElement {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName.toLowerCase();
  if (tag === "textarea") return true;
  if (tag === "input") {
    const type = (el.getAttribute("type") || "text").toLowerCase();
    return ["text", "search", "url", "tel", "email", ""].includes(type);
  }
  if (el.isContentEditable) return true;
  return false;
}

function getSendButtonSelector(): string | null {
  const key = Object.keys(settings.buttonSelectors).find((k) => host.includes(k));
  return key ? settings.buttonSelectors[key] : null;
}

function tryClickSendButton(): boolean {
  const selector = getSendButtonSelector();
  if (!selector) return false;
  try {
    const btn = document.querySelector<HTMLButtonElement>(selector);
    if (btn && !btn.disabled) {
      btn.click();
      return true;
    }
  } catch (e) {
    console.warn("[Ctrl+Enter Unifier] invalid selector:", selector, e);
  }
  return false;
}

function fireSyntheticEnter(target: HTMLElement): void {
  const opts: KeyboardEventInit = {
    key: "Enter",
    code: "Enter",
    keyCode: 13,
    which: 13,
    bubbles: true,
    cancelable: true,
    composed: true,
  };
  target.dispatchEvent(new KeyboardEvent("keydown", opts));
  target.dispatchEvent(new KeyboardEvent("keypress", opts));
  target.dispatchEvent(new KeyboardEvent("keyup", opts));
}

function insertNewline(target: HTMLElement): void {
  const tag = target.tagName.toLowerCase();
  if (tag === "textarea" || tag === "input") {
    const el = target as HTMLTextAreaElement | HTMLInputElement;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const value = el.value;
    el.value = value.slice(0, start) + "\n" + value.slice(end);
    const newPos = start + 1;
    el.selectionStart = el.selectionEnd = newPos;
    el.dispatchEvent(new Event("input", { bubbles: true }));
  } else if (target.isContentEditable) {
    document.execCommand("insertLineBreak");
    target.dispatchEvent(
      new InputEvent("input", { bubbles: true, inputType: "insertLineBreak" })
    );
  }
}

function handleKeydown(e: KeyboardEvent): void {
  if (e.key !== "Enter") return;
  if (e.isComposing || e.keyCode === 229) return; // IME変換確定は無視
  if (!isEnabledForHost()) return;

  const target = e.target;
  if (!isEditableTarget(target)) return;

  const isSendCombo = e.ctrlKey || e.metaKey;

  if (isSendCombo) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const clicked = tryClickSendButton();
    if (!clicked) {
      fireSyntheticEnter(target);
    }
    return;
  }

  if (e.shiftKey) {
    // Shift+Enterは元々改行のサイトが多いため素通し
    return;
  }

  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();
  insertNewline(target);
}

loadSettings(() => {
  document.addEventListener("keydown", handleKeydown, true); // captureフェーズで先取り
});

try {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "sync" && changes[STORAGE_KEY]) {
      settings = { ...settings, ...(changes[STORAGE_KEY].newValue as UnifierSettings) };
    }
  });
} catch {
  /* noop */
}
