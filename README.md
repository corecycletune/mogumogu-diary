# もぐもぐ日記 (mogumogu-diary)

いちか・じゅんちゃん・さとばぁばの3人が食事時間を記録する、iPhone/iPad向けPWAです。

## 初期バージョンにあるもの
- 3人のプロフィール選択と専用URL
- 食事タイマー（開始・一時停止・終了・端末内保存）
- 学校・外出先での食事を後から入力
- 月ごとのスタンプカード、記録履歴・連続記録日数
- 1日1回の起動ボーナスと食事記録でのコイン獲得
- JSON形式での記録のバックアップと復元
- オフライン動作用Service Worker

**注意：今はFirebase未設定です。記録はIndexedDB、ログインボーナスと計測中タイマーはlocalStorageへ保存し、端末間同期は行いません。**

## 公開
GitHubの **Settings → Pages → Build and deployment → Deploy from a branch → main / (root) → Save** を選択します。
公開先（Pages設定後）：https://corecycletune.github.io/mogumogu-diary/

iPhone/iPadでは、Safariで最初の「だれが使う？」画面を開き、利用者の名前を押して各専用ページへ移動してから、共有メニューの「ホーム画面に追加」を選択します。

## 将来の追加
- Firebase Authentication（匿名認証＋安全な端末紐づけ）、Cloud Firestore同期
- 3人の協力ミッション
- ガチャ（UR/SR/R/N）、食材・料理のキャラ図鑑
- 家具・内装・装飾アイテムのカテゴリと配置

食事時間は評価・競争の対象にせず、計測と記録の継続そのものをほめる設計です。

## プライバシー
公開リポジトリには個人の食事データ、Firebase秘密情報、アクセストークンを入れないでください。Firebase導入時はFirestore Security Rulesを設定し、プロフィール名を選ぶだけでは他人の記録を参照できないようにします。

## 開発
ビルド不要の静的HTML/CSS/JavaScript構成です。ローカルでは静的HTTPサーバーで起動してください。Service WorkerはHTTPSまたはlocalhost環境で動作します。
