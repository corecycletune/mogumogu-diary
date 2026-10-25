# モグモグガチャ：独立プレビュー

[最新のプレビュー（開発ブランチ）](https://raw.githack.com/corecycletune/mogumogu-diary/preview-gacha-20261022/preview/gacha-live.html)

[アーム修正版・固定コミット](https://raw.githack.com/corecycletune/mogumogu-diary/0dc42318eb901078b7433b64bd4c0d9543f66d34/preview/gacha-live.html)

## アーム v2 の修正内容
- アーム画像の背景色混入を除去（頭・左右の爪）
- アームの下降・上昇に吊り棒の長さを連動
- 探索時の吊り棒とアームの横移動を同期
- タマゴをアームの子要素にし、掴んだ後の移動で位置ずれしないよう修正
- 爪の回転角度を15°から11°に調整

## 注意
- 承認済みの木製フレーム・画面構成は変更しない
- Firebase/ログイン/DB/本番抽選ロジックなし
- JS構文検査・GitHubファイルSHA確認済み
- Safari実機・raw.githack経由の実描画確認は未完了
- ユーザー承認までmainへのマージ禁止
