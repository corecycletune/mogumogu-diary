# モグモグ チャット通知 Worker（無料構成）

Firebase Spark + Cloudflare Workers Free の構成です。Cloud Functionsは使いません。**デプロイ前は通知は届きません。**

## 1. Cloudflare側の準備

既存のCloudflareアカウントを使用します。CCT Labなど既存のサイトやDNSは変更しません。

```sh
cd worker
npm install
npx wrangler login
```

Firebaseプロジェクトのサービスアカウントを作成し、Firestore読み取り・通知重複防止用書き込みができる最小限の権限を与えます。**サービスアカウントの秘密鍵をGitHubにコミットしないでください。** CloudflareのSecretsへ登録します。FirebaseのIAM権限付与・鍵発行は管理者がFirebase/Google Cloud Consoleで行います。

```sh
npx wrangler secret put FIREBASE_CLIENT_EMAIL
npx wrangler secret put FIREBASE_PRIVATE_KEY
npx wrangler secret put VAPID_PUBLIC_KEY
npx wrangler secret put VAPID_PRIVATE_KEY
```

VAPID鍵は P-256 鍵ペアで、公開鍵は非圧縮65バイト・秘密鍵は32バイトのbase64url形式です。公開鍵はWebアプリに配布されますが、秘密鍵はCloudflare Secretsだけに保存します。生成方法は別途確認し、**公開鍵と秘密鍵が対応していることをテストしてから**設定します。

```sh
npx wrangler deploy
```

デプロイで得られたURLをルートの `push-config.js` の `PUSH_WORKER_URL` に設定してGitHub Pagesを更新します。

## 2. Firestore Rules

`firestore.rules` の `users/{uid}/pushSubscriptions/{deviceId}` を本番にデプロイしてください。所有者だけが端末の購読を登録・削除できます。Cloudflare Workerのサービスアカウントはサーバー権限でFirestoreを読み書きします。

## 3. 動作確認

1. iPhone/iPadはホーム画面に追加してアプリを起動、Androidは対応ブラウザまたはPWAで開く。
2. 設定画面「グループチャット通知」から通知を許可。
3. 2つの異なるUIDで同じグループに参加する。
4. Aが投稿し、Bの端末に「Aさんから新着メッセージ」が届くことを確認。
5. 通知をタップし、正しいグループのチャットが開くことを確認。
6. 自分の投稿、いいね、未参加グループ、通知解除、ログアウト、複数端末を検証。

## 制約・注意

- 通知はベストエフォートです。投稿自体はFirestoreへ保存され、通知サーバーが停止してもチャットは使えます。
- 二重通知防止の送信予約はFirestore `pushDispatches/{groupId}_{messageId}` に作成されます。予約後の配信失敗時は通知が欠落する可能性があります。
- サーバー側でFirebase IDトークンの署名と所属・送信者を照合し、任意の宛先指定を受け付けません。
- WorkerはWeb Pushの宛先をApple/Google/Mozilla/Microsoftの既知のPushサービスに制限します。
- Workers FreeのCPU時間・外部通信回数などの制限により、多人数グループでは配信失敗する可能性があります。家族内の小規模利用を想定しています。
- CCT Labなど既存のCloudflare設定を変更しないようにしてください。
