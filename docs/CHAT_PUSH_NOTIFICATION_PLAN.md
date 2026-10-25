# グループチャット Web Push通知 — 設計と進捗

## 決定事項
- **Firebase Spark無料プランを維持**。Cloud Functionsは使用しない。
- 既存のCloudflareアカウントに**モグモグ専用Workers Free**をデプロイする。CCT Labなどの既存サイトは変更しない。
- iPhone/iPad（ホーム画面追加済みPWA）・Android（対応ブラウザ/PWA）を対象に、Web Push標準を使う。
- 通知対象は**自分以外のグループメンバーの新規メッセージ**。いいねは通知しない。
- 本文はロック画面に表示しない。通知例「グループ名：〇〇さんから新着メッセージ」。
- 通知をタップするとログイン状態に応じて対象グループのチャットへ移動する。
- 同じUIDの複数端末は別々に購読登録できる。通知ON/OFFは端末ごと。

## 実装構成
1. `firebase-sync.js` が既存のFirestore `families/{fid}/messages/{messageId}` に投稿を保存し、成功後にWorkerへFirebase IDトークン・グループID・メッセージIDを送信する。
2. WorkerはGoogle公開鍵でFirebase IDトークンの署名を検証し、Firestore REST APIで投稿者・メンバーシップ・投稿日時を検証する。受信者をブラウザ側に指定させない。
3. Workerはサービスアカウントを用いて `users/{uid}/pushSubscriptions/{deviceId}` から購読を取得し、VAPID署名とAES128GCM暗号化によるWeb Pushを送る。
4. Firestore `pushDispatches/{fid}_{messageId}` で同一投稿の重複送信を抑制する。予約後にWorkerが停止した場合は通知が欠落する可能性がある（ベストエフォート）。
5. `sw.js` がプッシュを表示し、通知クリック時に `p/app/?chatGroup=<fid>` を開く。チャット画面側が対象グループを選択する。
6. 設定画面の通知許可・解除はユーザー操作時のみ。iOSではホーム画面追加を案内する。

## 現在の状態
- [x] Service Workerのpush/notificationclick
- [x] 通知から対象グループを開くリンクとログイン後復帰
- [x] Workerの送信API、Firebase認証検証、Firestore照合、Web Push暗号化
- [x] FirestoreのUID別購読ルールとエミュレータテスト
- [x] 端末別購読登録・解除UI、投稿後Worker呼び出し
- [x] Workerの構文・単体テスト・暗号化の復号検証
- [ ] Cloudflare Secretsにサービスアカウント鍵とVAPID鍵を登録
- [ ] Cloudflare Workers Freeへデプロイ
- [ ] `push-config.js` に実際のWorker URLを設定
- [ ] iPhone/iPad/Android実機で投稿・受信・通知拒否・複数端末・ログアウト・退出・再送を確認
- [ ] 本番のFirestore Rulesを反映（明示承認後）
- [ ] 本番mainへマージ（明示承認後）

## 重要な制約
- Workerの外部通信やCPU時間、Pushサービス、OS設定に依存するため、通知の必達・秒単位の到着は保証しない。
- 投稿はFirebaseに保存されるため、通知の障害がチャット投稿の障害にならないようにする。
- サービスアカウント秘密鍵とVAPID秘密鍵はGitHub・Firebase Firestore・ブラウザには保存しない。Cloudflare Secretsで管理する。
- 送信対象のPushサービスはApple、Google、Mozilla、Microsoftの既知のHTTPSエンドポイントに限定する。
- 現在は**開発ブランチのみ**で、本番の通知はまだ動作していない。

## セットアップ
`worker/README.md` を参照。既存Cloudflareアカウントで、専用Workerだけを作成する。
