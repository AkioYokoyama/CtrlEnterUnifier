# Ctrl+Enter Unifier (TypeScript + Vite + Tailwind)

チャットツールや AI サービスの入力欄で、送信キーを **Ctrl+Enter（Macは Cmd+Enter）に統一**する Chrome 拡張機能です。

- **Enter のみ** → 送信をブロックして改行を挿入
- **Ctrl+Enter / Cmd+Enter** → 送信をトリガー
- **Shift+Enter** → 何もせず素通し
- 日本語IME変換確定時の Enter は誤爆しないよう除外済み

## 技術スタック

- **TypeScript** … content script / popup ともに型付き
- **Vite** … content script は IIFE 単一ファイル、popup は通常の HTML エントリとしてビルド
- **Tailwind CSS v4** … `@tailwindcss/vite` プラグインで popup UI をスタイリング

## セットアップ

```bash
npm install
npm run build
```

`npm run build` は以下の2回のビルドを順番に実行します。

1. `vite.content.config.ts` … `src/content/content.ts` を `dist/content.js`（IIFE）としてビルド
2. `vite.config.ts` … `src/popup/popup.html` を `dist/popup.html` としてビルド（Tailwindを含むCSS/JSも `dist/assets` に出力）

`public/manifest.json` は Vite の仕様により自動的に `dist/manifest.json` にコピーされます。

型チェックのみ行いたい場合：

```bash
npm run typecheck
```

## Chromeへの読み込み方

1. `npm run build` を実行し `dist/` フォルダを生成
2. `chrome://extensions` を開く
3. 右上の「デベロッパーモード」をON
4. 「パッケージ化されていない拡張機能を読み込む」→ `dist` フォルダを選択

コードを変更したら `npm run build` → `chrome://extensions` で拡張機能の更新ボタン（🔄）を押せば反映されます。

## ディレクトリ構成

```
├── public/
│   └── manifest.json        # ビルド時に dist/ 直下へ自動コピーされる
├── src/
│   ├── content/
│   │   └── content.ts       # 全ページに注入されるcontent script
│   └── popup/
│       ├── popup.html
│       ├── main.ts           # popupのロジック
│       └── style.css         # @import "tailwindcss";
├── vite.config.ts            # popup用ビルド設定
├── vite.content.config.ts    # content script用ビルド設定（IIFE）
└── tsconfig.json
```

## Ctrl+Enterで送信できないサイトがある場合

拡張機能アイコン→ポップアップから、そのサイトの送信ボタンのCSSセレクタを登録できます。

1. 送信ボタンを右クリック →「検証」
2. Elements パネルでボタン要素を右クリック → Copy → Copy selector
3. ポップアップの入力欄に貼り付けて「このサイト用に登録」

登録すると、Ctrl+Enter押下時に合成イベントの代わりにそのボタンをクリックする方式に切り替わり、確実に送信されます。

## 仕組み（技術メモ）

- `content_scripts` で全ページに `content.js` を注入し、`keydown` をキャプチャフェーズで監視
- Enter単体はデフォルト動作を `preventDefault` し、textarea/input/contenteditable に改行を直接挿入
- Ctrl+Enterは、登録済みの送信ボタンセレクタがあればクリック。なければ「Ctrlキーを外したEnter」の`KeyboardEvent`を合成して発火し、サイト本来の送信処理を呼び出す
- 一部のサイトは合成イベント（`isTrusted: false`）を無視する実装のため、その場合はボタンセレクタ登録が必要
