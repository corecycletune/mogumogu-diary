# グループチャット新着プッシュ通知（設計・実装チェックリスト）

## 優先順位
最初にグループチャットの新着通知を実装する。クエストのリマインダーは対象外。

## 対象環境
- iPhone/iPad: iOS/iPadOS 16.4以降のホーム画面追加済みPWA（Safari系）
- Android: Push API対応ブラウザ／PWA
- 同じユーザーの複数端末に個別に購読を登録
- GitHub Pages + Firebase Authentication + Firestore を維持

## 現状調査（main）
- メッセージ: `families/{fid}/messages/{messageId}`。送信は `firebase-sync.js` の `chatContext.sendMessage()`。
- 本文は `text`、送信者は `senderUid`, `senderId`、添付カードは `cardId`。
- 「いいね」は同じ messages に `_like_...` ID / `__mogumogu_like_v1__` 本文で保存。**通知対象から必ず除外**。
- メンバーは `families/{fid}/members/{uid}`。**送信時点のメンバーのみ通知**。
- 現行 `sw.js` はオフラインキャッシュのみで push/notificationclick ハンドラなし。
- チャットUIは `p/app/` の `data-panel=family`、`chatGroupSelect` でグループを切り替える。
- Firestore Rules は `users/{uid}` 直下更新を禁止。購読用サブコレクションの専用ルールが必要。

## 実装方針
1. Web Push標準（Push API + VAPID + Service Worker）。iOSでFirebase Web Messaging SDKに依存しない。
2. `users/{uid}/pushSubscriptions/{deviceId}` に購読の endpoint、p256dh、auth、作成/更新時刻、enabled を保存。端末IDは推測困難なランダム値。所有者のみ登録/解除可。購読情報は個人情報相当として扱いログ出力しない。
3. Firebase Cloud Functions v2 の Firestore `onDocumentCreated('families/{fid}/messages/{messageId}')` で配信。投稿者本人・いいねを除外。送信者の会員情報をサーバー側で検証し、メンバー一覧から送信者以外の受信者を確定。端末購読を取得しWeb Push送信。
4. 通知本文は初期設定で **「〇〇さんから新着メッセージ」** とし、チャット本文をロック画面に露出させない。グループ名は通知タイトル。サーバー側で文字数制限・安全なURL生成。
5. SW `push` イベントで `showNotification`、`notificationclick` で `p/app/?chatGroup=<fid>` を開く（同一origin・同一scopeのURLのみ）。アプリ起動後 `family` パネルと対象グループを選択。ログインしていなければログイン画面経由で復帰。
6. 設定画面に「チャット通知を許可」「通知を停止」「この端末にテスト通知」を設置。OSの許可ダイアログはボタン操作時のみ。拒否・非対応・未インストールを分かりやすく表示。
7. 無効購読（404/410）はサーバーで削除。ログアウト時にはその端末の購読を解除。グループ退出後は送らない。二重配信対策として messageId+deviceId で冪等性を確保。
8. Firebaseの課金設定（Cloud Functionsを使用するためBlazeプラン要確認）、VAPID秘密鍵のSecret Manager管理、GitHub Actionsのデプロイ権限を事前確認。**鍵はGitHub・Firestore・ブラウザのソースに置かない**。


## 2026-10-26: 無料 Spark 維持の決定（この節が以前の Cloud Functions 案より優先）

- **Firebase Spark のまま**。Cloud Functions はデプロイしない。Blaze へのアップグレードも行わない。
- **第一候補: Cloudflare Workers Free + Web Push標準**。通知APIは投稿成功後に呼び出すか、投稿処理を認証済みWorker経由に一本化する。投稿成功後の別リクエスト方式には通知漏れの可能性があるため、採用時は失敗時再試行とサーバー側の冪等性を設計する。
- **セキュリティ必須**: WorkerでFirebase IDトークンを検証し、Firestoreに保存済みの投稿の送信者とメンバーシップをサーバー側で照合する。クライアント指定の受信者やメッセージ本文を信用しない。Firestore管理権限・VAPID秘密鍵はCloudflare Secretsで保護し、GitHubやブラウザに公開しない。
- **通知二重送信対策**: messageIdとdeviceIdの組み合わせで送信記録・再試行方針を設計する。いいねは通知しない。グループ退出後は送らない。
- **運用制約**: Workers Freeは10万リクエスト/日、10ms CPU/呼び出し、50外部サブリクエスト/呼び出しなどの制限がある。大量メンバーの場合は分割配信を検討。通知のOS到着時間は保証されない。
- **代替案**: 外部アカウントを増やしたくない場合はGitHub Actions定期実行によるポーリングも可能だが、数分以上の遅延や実行遅れがあり、チャット向けの第一候補にはしない。
- **未完了**: Cloudflareアカウント接続、秘密鍵設定、Workerデプロイ、iOS/Android実機検証。設計段階で通知はまだ届かない。

## 実装・検証順
- [ ] Cloudflare Workers Freeアカウント・無料枠・設定権限を確認
- [ ] VAPID公開鍵/秘密鍵生成と秘密鍵の安全な登録
- [ ] Workers・Firestoreルール・認証・配信冪等性のテスト
- [ ] SWのpush/notificationclickとキャッシュ更新
- [ ] PWA通知設定UIとUID別購読登録・解除
- [ ] 通知リンクからのグループ選択
- [ ] iPhone・iPad・Android実機で送信/受信、未ログイン、別UID、退出、いいね、複数端末、通知拒否、重複を検証
- [ ] ユーザー承認後のみmainへマージ、Firebase側デプロイ

## 現段階の制限
このファイルは仕様の確定記録。プッシュ送信はまだ動作しない。開発ブランチを本番へマージしない。
