# Firestoreルールの自動公開

`firestore.rules` を変更するPR → エミュレータ検証 → mainにマージ → 再検証 → 本番ルールだけ公開。
ChatGPT/Workも同じPR経路を利用する。アプリ利用者へのAdmin権限付与は不要。

## 現状確認（2026-10-14）

- 対象: `corecycletune/mogumogu-diary`、default branch `main`。実装の基準コミットは `45f775b`。
- アプリのFirebase接続先: `firebase-sync.js` の `projectId: mogumogu-diary`。
- 既存 `firebase.json`: Firestoreルール、Firestore/Authエミュレータ、匿名・メールパスワード認証設定。Hostingやindexes設定なし。今回はこのファイルを変更しない。
- `.firebaserc`、package.json、`.github/workflows` は未登録だった。今回追加。
- ルール: UID別の個人データ、グループ、メンバー、チャット。既存 `tests/firestore-rules.emulator.mjs` をそのまま使用し、ルール本文は変更しない。
- アプリ公開はREADMEのGitHub Pages方式。Firestore用CIはPagesを変更しない。
- リポジトリ内に既存Actions Secrets参照はない。接続APIはSecrets一覧・値の読み取りを提供しないため、GitHub側の登録状況は未確認。既存Secretsは変更・削除しない。
- 本作業環境はFirebase未認証。本番のIAM・データベース構成・公開中ルールとリポジトリとの差異は未確認。
- GitHub APIでmainのブランチ保護は無効。必要なら後述の保護を設定する。

## 一度だけ行う設定

1. このPRをmainへマージする。認証設定前は検証だけ成功し、デプロイは設定不足として停止する。
2. [Google Cloud Shell](https://shell.cloud.google.com/?project=mogumogu-diary) をプロジェクト管理者で開き、次を実行する。ローカルPCへのCLIインストールや認証鍵の作成は不要。

   ```sh
   git clone https://github.com/corecycletune/mogumogu-diary.git mogumogu-ci-setup
   cd mogumogu-ci-setup
   bash scripts/setup-firestore-ci.sh
   ```

   この処理は専用サービスアカウント、カスタムIAMロール、OIDC接続を作成する。管理者にはIAMロール・サービスアカウント・Workload Identity Poolの作成/設定とAPI有効化の権限が必要。既存 `(default)` データベースがなければ停止し、作成しない。本番ルールは公開しない。公開中ルールのバックアップ先を表示する。出力されたバックアップと `firestore.rules` を比較し、現在のUID仕様を公開してよいことを確認する。差があれば初回公開でその差も反映される。
3. [GitHub Actions設定](https://github.com/corecycletune/mogumogu-diary/settings/variables/actions) → **Variables** → **New repository variable** で、スクリプト出力の2つを登録する。

   | 名前 | 値 |
   | --- | --- |
   | `FIREBASE_WIF_PROVIDER` | `projects/番号/locations/global/workloadIdentityPools/mogumogu-github/providers/firestore-rules` |
   | `FIREBASE_DEPLOY_SERVICE_ACCOUNT` | `firestore-rules-deploy@mogumogu-diary.iam.gserviceaccount.com` |

   これらは識別子であり秘密鍵ではない。**GitHub Secrets登録は0件**。`FIREBASE_TOKEN`、サービスアカウントJSON、利用者のAdmin権限は使わない。
4. [Actions](https://github.com/corecycletune/mogumogu-diary/actions) → **Firestore rules** → **Run workflow** → `main` で初回実行する。IAM反映に数分かかる場合は待って再実行する。`Validate Firestore rules` と `Deploy Firestore rules` の成功、およびログの `released rules` を確認する。続けて実アプリで既存データ表示と新規保存を確認する。

以後はルール変更をmainへマージすると自動公開され、Firebase Consoleへの貼り付けは不要。

## 制限と安全策

- PRは本番認証なしで検証。OIDCはリポジトリID・所有者ID・main・このワークフロー・push/手動実行に限定し、forkやPRには認証しない。
- 本番の実行コマンドは固定: `firebase deploy --config firebase.rules.json --only firestore:rules --project mogumogu-diary --non-interactive`。
- 専用設定は `(default)` のルールのみ。Hosting、Authentication、indexes、Functions、データ削除/移行は含まない。
- CIのIAM権限にはFirestore文書の読み書き/削除、DB作成/削除、Hosting、Auth、indexes変更、IAM変更、API有効化、ルールセット削除を含まない。CLI 15.33.0のFirestore共通事前チェックはindexes権限を照会するが、rules-onlyのAPI実行には使わないため付与しない。実際の本番認証・デプロイは初回設定後に確認する。
- Firebase Rules APIの権限はプロジェクト単位。カスタムロールも理論上は他DBやStorageのルール公開に使える。Firestoreだけの範囲は専用設定・固定コマンド・信頼するworkflowで限定する。ルールを変える権限はデータの公開範囲も変えられるため、PRレビューは必要。
- 依存関係をlockfileで固定し、ActionsをコミットSHAで固定。認証前に `npm ci --ignore-scripts` を実行する。
- 公開処理は直列化。古いmainコミットの待機実行は公開前にスキップする。mainが公開開始後に進んだ場合は後続のCI成功で新しいルールへ更新する。新しいルールが検証に失敗すると最後の正常なルールが残る。
- エミュレータは `demo-mogumogu` のみ。既存UIDデータの保持、他人の個人データ拒否、登録、メンバー、チャット送信者・所持カード、いいね、不正書き込みを検証する。全ての将来の変更を保証するものではないため、仕様変更時は同じテストを追加する。
- 安全運用にはGitHub Settings → Rules/BranchesでmainのPR必須・レビュー1件・`Validate Firestore rules` 必須を推奨する。設定前もdeployは同じ実行の検証成功を必須とする。
- Pagesとルール公開は別処理。保存形式を変える変更は互換性を保つか、メンテナンス時間を設ける。自動公開だけでは両者の同時切替を保証しない。

## 失敗時と戻し方

- テスト失敗: 公開されない。ルールとテストを直して再実行する。
- 認証失敗: 2つのVariablesとOIDC条件を確認する。Owner/Editor/AdminをCIに付与して回避しない。
- 通常のロールバック: 最後に正常公開された `firestore.rules` の内容を復元するPRをmainへマージ。古いActions実行の再実行は古いコミットとしてスキップされるため使わない。
- 初回以前への復元: Cloud Shellのバックアップからルールを復元するPRを作る。緊急時は管理者がバックアップをConsoleで公開し、その内容をリポジトリにも反映する。
- 利用停止: GitHubでワークフローを無効化し、専用サービスアカウントを無効化する。保存データは削除しない。
- ルールセットの上限に達した場合、CIは削除権限がないため停止する。管理者が履歴を確認する。データ・公開中ルールを削除しない。

## ローカル検証

Node.js 22以上、Java 21以上で `npm ci --ignore-scripts`、`npm run test:rules`。
`npm run deploy:rules` は本番公開なので、検証のためには実行しない。

根拠: [Firebase CLI](https://firebase.google.com/docs/cli)、[Firebase IAM permissions](https://firebase.google.com/docs/projects/iam/permissions)、[Google GitHub OIDC認証](https://github.com/google-github-actions/auth)。
