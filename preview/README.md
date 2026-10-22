# モグモグガチャ｜独立プレビュー

## プレビュー
- [ブラウザで試す（raw.githack）](https://raw.githack.com/corecycletune/mogumogu-diary/preview-gacha-20261022/preview/gacha-live.html)
- [GitHub上のHTMLソース](https://github.com/corecycletune/mogumogu-diary/blob/preview-gacha-20261022/preview/gacha-live.html)

HTMLには画像パーツを埋め込んでおり、Firebase・ログイン・保存処理はありません。結果カード画像のみ既存mainの公開素材を参照します。

## 操作
「通常」「チャンス」「激アツ」を選択し「ガチャを引く」を押します。演出中はスキップ可能。結果表示後は「もう一度試す」。1連の演出確認用で、10連・100連は対象外です。

## 保持すべき仕様
- 既存承認済みの木製フレーム・ヘッダー・フッター・ボタン配置・iPhone/iPad構成を維持
- アーム、タマゴ、発光を独立レイヤーで動かす
- つかむまでは共通、つかんだ後に通常（N/R）、チャンス（SR/SSR）、激アツ（UR）へ分岐
- 本番アプリ、Firestore/Auth、コイン・チケット・抽選ロジックに影響させない

## 検証状況
- GitHubのブランチへHTML配置済み
- JavaScript構文チェックと模擬DOMによる「開始→演出→結果→閉じる→スキップ」の検証済み
- **実際のiPhone Safari表示・raw.githack経由の配信は未確認**。ユーザー実機確認待ち
- 本番mainへのマージ禁止（ユーザー承認前）
