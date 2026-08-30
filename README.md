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

## Ctrl+Enter / Cmd+Enterで送信できないサイトがある場合

1. まず拡張機能側で「送信ボタンの自動検出」を試みます（aria-labelやテキストに "send" / "送信" を含む有効なボタンを、入力欄の近くから自動探索してクリック）。多くのサイト（Geminiなど、合成イベントを無視する実装のサイトを含む）はこれで動作します。
2. それでも動かない場合は、拡張機能アイコン→ポップアップから、そのサイトの送信ボタンのCSSセレクタを手動登録できます。

   1. 送信ボタンを右クリック →「検証」
   2. Elements パネルでボタン要素を右クリック → Copy → Copy selector
   3. ポップアップの入力欄に貼り付けて「このサイト用に登録」

   登録すると自動検出より優先してそのボタンをクリックするようになります。

### Geminiで動かない場合の補足

Gemini (gemini.google.com) はAngular製の入力欄で、合成KeyboardEvent（`isTrusted: false`）を無視する実装のため、自動検出でも稀に検出漏れすることがあります。その場合は上記の手順でGeminiの送信ボタン（紙飛行機アイコン、aria-labelが "Send message" 等）のセレクタを手動登録してください。

## 仕組み（技術メモ）

- `content_scripts` で全ページに `content.js` を注入し、`keydown` をキャプチャフェーズで監視
- Enter単体はデフォルト動作を `preventDefault` し、textarea/input/contenteditable に改行を直接挿入
- Ctrl+Enter / Cmd+Enterは、① 登録済みの送信ボタンセレクタ → ② 送信ボタンの自動検出（aria-label/テキスト/アイコン名に"send"系の語を含む有効なボタンを入力欄付近から探索）→ ③ 「Ctrl/Cmdキーを外したEnter」の`KeyboardEvent`を合成して発火、の順で送信を試みる
- 一部のサイトは合成イベント（`isTrusted: false`）を無視する実装のため、自動検出でも失敗する場合はボタンセレクタの手動登録が必要
