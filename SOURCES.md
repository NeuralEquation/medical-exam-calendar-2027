# 2027年度入試日程の確認記録

更新日：2026年10月15日

既存の31大学・51方式のうち、空欄があった5大学8方式を大学公式資料と照合して補完しました。兵庫医科大学の2方式についても発表時刻と受験日の選択条件・会場条件を確認しました。その他の方式は既存データを継承しており、更新日が全31大学の公式再確認日を表すものではありません。

以下の日付はすべて2027年です。発表時刻は日本時間です。

| 大学・方式 | 一次試験 | 一次発表 | 二次試験 | 合格発表 | 公式出典 |
| --- | --- | --- | --- | --- | --- |
| 岩手医科大学 一般 | 2/3 | 2/9 | 2/12・13から1日選択 | 2/18 | [令和9年度入学試験日程一覧](https://www.imu-admission.jp/guidelines/gl_gaiyou/) |
| 日本医科大学 一般前期 | 2/1 | 2/8 18:00 | 2/10または2/12（希望調査あり） | 2/16 12:00 | [入学者選抜実施要項・日程一覧（冊子p.3）](https://www.nms.ac.jp/college/nyushi-book/guidelines_2027/pageindices/index5.html)、[二次試験（p.7）](https://www.nms.ac.jp/college/nyushi-book/guidelines_2027/pageindices/index9.html)、[一次・二次発表時刻（p.13）](https://www.nms.ac.jp/college/nyushi-book/guidelines_2027/pageindices/index15.html) |
| 日本医科大学 一般後期 | 2/28 | 3/6 18:00 | 3/9 | 3/15 12:00 | [一次試験（冊子p.18）](https://www.nms.ac.jp/college/nyushi-book/guidelines_2027/pageindices/index20.html)、[二次試験（p.19）](https://www.nms.ac.jp/college/nyushi-book/guidelines_2027/pageindices/index21.html) |
| 東京慈恵会医科大学 一般 | 2/11 | 2/17 13:00 | 2/20〜22のうち大学指定の1日 | 3/1 10:00 | [2027年度学生募集要項・冊子pp.5〜8](https://www.jikei.ac.jp/wp-content/uploads/2026/10/Application_Guidelines_for_Admission_2027.pdf) |
| 東海大学 一般①・② | 2/2・3（1日または両日） | 2/7 09:30 | 2/13・14から出願時選択 | 2/18 09:30 | [2027年度入学試験要項・A-3、A-13](https://www.u-tokai.ac.jp/uploads/2021/02/ad9026c1801ebd0045d9d2534dcb5b07.pdf) |
| 順天堂大学 一般A方式 | 2/3 | 2/10 12:00 | 2/14〜16のうち大学指定の1日 | 2/20 12:00 | [2027年度入学試験要項・冊子pp.30〜31](https://www.juntendo.ac.jp/assets/2027_Juntendo_Med_NyugakuShikenYoukou.pdf) |
| 順天堂大学 一般B方式 | 2/3 | 2/20 12:00 | 3/2小論文・英作文、3/3面接（両日） | 3/6 12:00 | [2027年度入学試験要項・冊子pp.35〜36](https://www.juntendo.ac.jp/assets/2027_Juntendo_Med_NyugakuShikenYoukou.pdf) |
| 兵庫医科大学 一般A | 2/4 | 2/15 17:00 | 2/17・18から出願時選択 | 2/24 10:00 | [2027年度一般選抜A](https://www.hyo-med.ac.jp/admission/outline/nishinomiya/general-A/) |
| 兵庫医科大学 一般B | 2/4 | 2/24 10:00 | 2/27 | 3/5 10:00 | [2027年度一般選抜B](https://www.hyo-med.ac.jp/admission/outline/nishinomiya/general-B/) |

## 表示上の扱い

- 日本医科大学前期の二次試験は `secondDates` に2/10・2/12を明示し、実施しない2/11には予定を生成しません。明示日がない方式は従来どおり開始日・終了日の範囲を使います。
- 二次試験が選択制・大学指定か、両日受験必須かを備考で区別しています。
- 兵庫医科大学一般Bの一次会場は、Bのみ出願なら大阪、A・B併願なら大阪・東京・福岡から選択できます。
- アプリ内の出典リンクと確認日は今回公式確認した6大学10方式に表示します。
- サービスワーカーのキャッシュをv7に更新し、更新後のアプリ・日程データを保存します。

## 確認方法

`node --test tests/admissions.test.cjs` で、日程データの整合性、非連続日の予定生成、選択済み方式・メモの移行を確認できます。
