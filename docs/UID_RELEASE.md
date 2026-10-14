# 旧3プロフィール廃止とUID方式の公開手順（2026-10-14）

## 変更内容

- 3人固定のプロフィール選択、画面分岐、旧記録の取り込みを廃止。全員が `/p/app/` の共通画面を利用する。
- ユーザーの識別はFirebase Authentication UID、画面の名前は登録したログインID。`jun` / `ichika` / `sato` はアプリに用意されたユーザーではない。
- admin専用アカウント・roles設定は設けない。ID `admin` も通常の登録形式に合致するIDとして扱う。従来の `junsakata0720` の動作確認モードだけ維持する。
- ログイン方式導入後の既存ユーザーの `users/{UID}` 以下の記録・カード・残高・グループ一覧を保持する。旧共有データは取り込まない。UID別の保存先の旧 `profile` フィールドは読み込み時にそのUIDへ正規化する。
- `/p/jun/`、`/p/ichika/`、`/p/sato/` は旧ブックマークと既存PWA向けの転送だけ残す。3人分のアプリ画面やプロフィールは存在しない。

## 公開手順

1. [Firestore CIの初回設定](FIRESTORE_CI.md) 後はmain反映時にルールが自動公開される。保存形式が変わるこの移行では利用者が記録操作をしない時間を設け、Actionsの公開成功とPages更新を確認する。CI未設定時のみPR内の [firestore.rules](../firestore.rules) 全文をFirebase Consoleから公開する。既存のユーザー・コレクション・文書は削除しない。
2. PRをmainへ反映し、GitHub Pagesの更新を待つ。
3. 各端末でアプリを再読み込みする。旧URLは共通画面へ移る。
4. `junsakata0720` で既存の記録・カード・残高を確認する。別の新規IDを登録し、互いの個人データが表示されないことを確認する。同じ招待コードでチャットに参加し、それぞれのログインIDが表示されることも確認する。

新ルールと旧画面は書き込み形式が異なるため、切り替え中は記録操作を止めてください。この作業環境には本番Firebaseの認証がなく、ルール公開と本番アカウントの実データ比較は未実施です。

## ローカル検証

```sh
node --test tests/*.test.mjs
npm install --no-save --package-lock=false firebase@13.0.0 @firebase/rules-unit-testing@6.0.0 @playwright/test@1.64.0
npx -y firebase-tools@13.35.1 emulators:exec --only firestore --project demo-mogumogu 'node tests/firestore-rules.emulator.mjs'
python -m http.server 8765 --bind 127.0.0.1
# 別ターミナルでブラウザを用意して実行
node tests/ui-smoke.mjs
```

Firestoreエミュレータでは既存UIDデータ保持、ユーザー間アクセス拒否、チャット送信者・所持カード検証を確認する。UIテストはmockのクラウド接続であり、本番の実データ検証を代替しない。
