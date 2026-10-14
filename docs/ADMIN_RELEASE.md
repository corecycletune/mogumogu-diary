# UID方式と確認用adminアカウントの公開手順（2026-10-14）

## 作成する確認用アカウント

`admin` はモグモグの動作確認用アカウントです。Firebaseプロジェクトの管理権限を付与せず、他人のアカウント管理や生活記録閲覧もできません。生活記録用の `junsakata0720` はそのまま一般ユーザーとして使います。既存ユーザーを削除・再作成したり、そのUIDに管理者ロールを付けたりしないでください。

1. 管理者本人が [Firebase Authentication](https://console.firebase.google.com/project/mogumogu-diary/authentication/users) を開く。
2. 「ユーザーを追加」でメールに **`admin@id.mogumogu.invalid`** を入力。パスワードは本人が10文字以上で決め、パスワード管理アプリ等へ保存する。ソースやチャットに貼らない。
3. 作成されたユーザーの **UID** をコピーする。`junsakata0720` のUIDとは違うことを確認する。
4. [Firestoreデータ](https://console.firebase.google.com/project/mogumogu-diary/firestore/databases/-default-/data) でコレクション `roles` を作成（存在すれば開く）。文書IDには手順3のUIDを正確に入力。
5. フィールド `admin` を **boolean型のtrue** にして保存。文字列の `"true"` ではない。
6. アプリのログイン画面でID `admin` と設定したパスワードを入力。初回ログインで `users/{UID}` の非特権メタデータだけを自動作成する。

`roles/{UID}` はFirestoreルールでクライアントからの作成・更新・削除をすべて禁止します。Consoleのプロジェクト権限または信頼できるAdmin SDKだけが変更できます。本人のロール文書だけが読み取り可能です。ID文字列で管理者権限を付与しません。今後の管理APIも同じロールをサーバー側で検証してください。管理者ロールを取り消す場合はConsoleでfalseにし、開いているアプリを再読み込みしてください。

一般の登録画面では正規化後の `admin` を拒否し、ルールでもロール未設定の `admin` アカウント情報作成を拒否します。**Authのメール/パスワードAPI自体はFirestoreルールの対象外**なので、上記の手順でadminを先に作成してIDを確保してください。すでに同じメールがある場合は、所有者とUIDを確認し、確認できないアカウントへロールを付けないでください。

## 公開の順序

1. 認証済みのFirebase Consoleでadminの作成・UIDの確認・roles設定を済ませる。
2. 利用者が記録操作をしない時間に、PR内の最新版 **[firestore.rules](../firestore.rules)** を [ルール画面](https://console.firebase.google.com/project/mogumogu-diary/firestore/databases/-default-/rules) に全文貼り付けて「公開」。既存のコレクション・文書・Authenticationユーザーは削除しない。
3. PRをmainへマージしてGitHub Pagesの反映完了を待つ。
4. 各端末でアプリを再読み込み。旧 `/p/jun/`・`/p/ichika/`・`/p/sato/` も共通 `/p/app/` へ移動。既存PWAのmanifest IDは残して起動先だけ共通化したため、旧アイコンの削除は必須ではない。
5. 下記の本番確認を行う。

この環境にはFirebase CLIの本番認証がないため、本番ルールの公開、adminの作成・ロール設定、本番既存アカウントの確認は未実施です。GitHubのコード変更だけで本番ルールは変わりません。

新ルールは旧画面からのプロフィール形式の書き込みを拒否します。ルール公開からPages更新・再読み込みまでの間は保存エラーになり得るため、その間は操作しないでください。旧クライアントに戻す場合は**コードだけでなく対応するルールも戻す**必要があります。

## 既存データの互換性

- `users/{UID}` 以下の既存記録・進行・カード・残高・グループ一覧をそのまま利用する。UID、文書ID、保存先は変えない。
- 旧 `profile` フィールドはワイヤー形式の互換用フィールドとして保持し、本人UIDの保存先から読み込んだデータだけUIDに正規化する。次の正常な書き込みでその文書の値がUIDになる。既存のアカウントメタデータにある旧profileは無視し、変更しない。
- カード・残高の合算、初期化、一括削除や一括移行はしない。既存のログインボーナスや正規の報酬処理は従来どおり。
- IndexedDBの既存 `mogumogu-account-{UID}` は本人UIDのキャッシュとして利用。旧共有DB `mogumogu-diary` や旧プロフィールlocalStorageは取り込まない。
- 旧 `families` の個人ゲーム・生活記録は利用しない。既存UIDのグループmembershipは保持して、その旧profileフィールドは無視する。旧匿名プロフィール投稿は表示せず、ログイン方式導入後のsenderUid/senderId付き投稿といいねを保持する。
- 新しい食事JSONバックアップはUIDで一致を確認する。所有者UIDを特定できない旧プロフィールのJSONは取り込まない。JSONは食事のみで、カード・残高の完全バックアップではない。
- 管理者には個人Firestore contextを渡さない。テスト状態はページ内メモリのみ。ルールでも管理者の個人記録用操作・チャット操作を拒否する。管理者のテスト抽選は本番の抽選トランザクションを呼ばない。

## 本番でのリリース確認

- `junsakata0720` でログインし、更新前の記録・カード・残高と比較する。旧URLからも利用できる。動作確認入口が出ない。
- 別の任意ID（許可形式：英数字・_、3〜24文字）で登録し、記録できる。既存ユーザーの記録・所持が表示されない。
- 2アカウントを同じ端末で切り替えても、タイマー・記録・グループ一覧が混ざらない。
- 同じ招待コードのチャットへ参加して、お互いのログインIDを表示する。カード共有・いいねを確認する。
- adminでは「管理者」画面と動作確認だけを表示する。抽選後に再読み込みするとテスト結果が消える。ログアウトとパスワード変更は利用できる。
- 一般ユーザーのURLに `?dev=1` を付けても、動作確認・SSR試作・レイヤー比較が表示されない。

## ローカル検証

```sh
node --test tests/*.test.mjs
npm install --no-save --package-lock=false firebase@13.0.0 @firebase/rules-unit-testing@6.0.0 @playwright/test@1.64.0
npx -y firebase-tools@13.35.1 emulators:exec --only firestore --project demo-mogumogu 'node tests/firestore-rules.emulator.mjs'
# 別ターミナルでHTTPサーバーを起動する
python -m http.server 8765 --bind 127.0.0.1
npx playwright install chromium
node tests/ui-smoke.mjs
```

Firestoreエミュレータでは、既存UIDデータ保持、一般登録、役割の自己変更拒否、IDだけの管理者化拒否、他人の記録拒否、チャット偽装拒否、不正形式の拒否を検証する。UIテストのクラウド境界はmockであり、本番ログインや実データ確認を代替しない。

### 今回の実行結果

- Nodeテスト：7件成功。
- Standard版Firestoreエミュレータ：ルールのコンパイルと許可・拒否テスト成功。
- Chromium（390px、mockクラウド）：共通画面、旧URL転送、一般の食事保存、管理者入口の非表示、adminの無保存テスト抽選、adminログアウト入口、登録フォームを確認。
- 本番アカウントでのログイン・実データ比較、iPhone/iPad実機Safari、本番ルール公開、admin作成・権限設定は未実施。
