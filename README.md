# Interest Wiki Starter

XでLikeしたポストを起点に、Wire / Article / Library型の個人関心Wikiを育てるためのスターターです。

## 基本思想

- Wireは、あなたがXでLikeしたポストを一次資料として蓄積する場所です。
- Articleは、Wireから見えた流れ・文脈・傾向・仮説を追記していく場所です。
- Libraryは、本、映画、ソフトウェア、プラグイン、ワークフロー、チュートリアル、記事的ポストなどをフラットに管理する場所です。
- 元リンクは必ず保持します。
- 不適切・違法・危険な内容を除き、削除や都合のよい書き換えではなく、追記で扱います。
- ランキングは丸写ししません。ランキングに登場した対象をLibraryに追加し、「どのランキングで何位だったか」をメタデータとして記録します。

## 初回セットアップ

Node.jsを入れた状態で、このフォルダで実行します。

```bash
npm install
npx playwright install chromium
```

初回だけXにログインします。このコマンドだけはブラウザウィンドウが開きます。

```bash
npm run auth:x
```

ログイン後、ターミナルでEnterを押すとログイン状態が保存されます。

## 通常実行

通常収集はheadlessで実行するため、ブラウザウィンドウは開きません。

```bash
npm run run:daily
```

## XのLikeページ指定

標準では次を見に行きます。

```text
https://x.com/i/likes
```

うまく動かない場合は、環境変数でLikeページを指定します。

Windows PowerShell:

```powershell
$env:X_SOURCE_URL="https://x.com/YOUR_HANDLE/likes"
npm run run:daily
```

macOS / Linux:

```bash
X_SOURCE_URL="https://x.com/YOUR_HANDLE/likes" npm run run:daily
```

## 生成されるファイル

```text
data/raw/x_likes.jsonl
data/raw/seen_x_status_ids.json
data/processed/wire.json
data/processed/library_seed.json
content/wire/index.json
public/index.html
public/wire.html
public/library.html
```

## GitHub + Cloudflare Pages

1. GitHubで新規リポジトリを作る
2. このフォルダの中身をpushする
3. Cloudflare Pagesでそのリポジトリを接続する
4. Build command: `npm run build:site`
5. Build output directory: `public`

## Windowsタスクスケジューラ

`run_daily_windows.bat` をタスクスケジューラで1日1回実行してください。

## ChatGPTに渡すとき

例：

```text
このrepoの data/raw/x_likes.jsonl と data/processed/wire.json を読んで、
Wire、Article、Libraryの追記候補を出してください。
削除・置換ではなく追記ベースでお願いします。
元リンクは必ず残してください。
```
