export {}; // このファイルをモジュールスコープにする（他ファイルとの変数衝突防止）

const STORAGE_KEY = "ctrlEnterUnifier";

interface UnifierSettings {
  enabled: boolean;
  disabledHosts: string[];
  buttonSelectors: Record<string, string>;
}

const DEFAULTS: UnifierSettings = { enabled: true, disabledHosts: [], buttonSelectors: {} };

let currentHost = "";
let settings: UnifierSettings = { ...DEFAULTS };

function getActiveTabHost(cb: (host: string) => void): void {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    try {
      const url = new URL(tabs[0]?.url ?? "");
      cb(url.hostname);
    } catch {
      cb("");
    }
  });
}

function load(cb: () => void): void {
  chrome.storage.sync.get(STORAGE_KEY, (res) => {
    settings = { ...DEFAULTS, ...(res[STORAGE_KEY] as Partial<UnifierSettings> | undefined) };
    cb();
  });
}

function save(): void {
  chrome.storage.sync.set({ [STORAGE_KEY]: settings });
}

function $<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} not found`);
  return el as T;
}

function render(): void {
  $<HTMLInputElement>("enabled").checked = settings.enabled;
  $("hostName").textContent = currentHost || "(unknown)";
  $<HTMLInputElement>("disableHost").checked = settings.disabledHosts.some((h) =>
    currentHost.includes(h)
  );

  const list = $("selectorList");
  list.innerHTML = "";
  Object.entries(settings.buttonSelectors).forEach(([domain, sel]) => {
    const row = document.createElement("div");
    row.className =
      "flex justify-between items-center py-1 border-b border-gray-100 text-[11px] gap-2";

    const label = document.createElement("span");
    label.className = "truncate";
    label.innerHTML = `<b>${domain}</b>: ${sel}`;

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "削除";
    removeBtn.className = "px-1.5 py-0.5 border border-gray-300 rounded bg-gray-50 hover:bg-gray-100 shrink-0";
    removeBtn.onclick = () => {
      delete settings.buttonSelectors[domain];
      save();
      render();
    };

    row.appendChild(label);
    row.appendChild(removeBtn);
    list.appendChild(row);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  getActiveTabHost((host) => {
    currentHost = host;
    load(render);
  });

  $<HTMLInputElement>("enabled").addEventListener("change", (e) => {
    settings.enabled = (e.target as HTMLInputElement).checked;
    save();
  });

  $<HTMLInputElement>("disableHost").addEventListener("change", (e) => {
    const checked = (e.target as HTMLInputElement).checked;
    if (checked) {
      if (!settings.disabledHosts.includes(currentHost)) {
        settings.disabledHosts.push(currentHost);
      }
    } else {
      settings.disabledHosts = settings.disabledHosts.filter(
        (h) => !currentHost.includes(h) && h !== currentHost
      );
    }
    save();
  });

  $("addSelector").addEventListener("click", () => {
    const input = $<HTMLInputElement>("selectorInput");
    const sel = input.value.trim();
    if (!sel || !currentHost) return;

    settings.buttonSelectors[currentHost] = sel;
    save();
    render();

    const status = $("status");
    status.textContent = "登録しました";
    setTimeout(() => (status.textContent = ""), 1500);
    input.value = "";
  });
});
