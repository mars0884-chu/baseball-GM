# 《決勝GM》v491 隊名架構與交付包確認報告

> 確認日期：2026-07-25  
> 來源：`v491_delivery.zip`  
> 結論：隊名架構修正已生效，可用 `teamId` 安全綁定正式美術；另有一項交接文件接口範例需更正。

## 一、隊名架構確認

### 已通過

- `TEAM_DEFS` 定義固定 20 隊，ID 為 `T0`～`T19`。
- 每隊具備固定 `id`、`name`、`city`、`nickname`。
- `buildLeague()` 以 `TEAM_DEFS[idx].name` 建立球隊，不再使用洗牌後的城市與吉祥物組合命名。
- 為保護既有共用 RNG 序列，原本兩次 `shuffle()` 仍會執行，但結果丟棄；此作法不會再改變隊名。
- 玩家開局只輸入 GM 姓名，之後可從 20 隊任選；`userTeamId` 不再強制等於 `T0`。
- `ensureV491()` 會把舊存檔隊名依 `teamId` 正規化成固定名稱，並把聯盟名正規化為「海嶺職業棒球聯盟」。
- 整合單檔與模組版均含相同的 v491 固定隊名架構。

### 固定映射

| teamId | 隊名 | teamId | 隊名 |
|---|---|---|---|
| T0 | 靖安盾衛 | T10 | 嘉禾金穗 |
| T1 | 臨海獵鯊 | T11 | 瑞港海豚 |
| T2 | 曲江水牛 | T12 | 金川礦工 |
| T3 | 永昌雄獅 | T13 | 玄武黑熊 |
| T4 | 明陽烈焰 | T14 | 朝陽赤鷹 |
| T5 | 天啟鷹 | T15 | 鳳鳴紅雀 |
| T6 | 龍城雲豹 | T16 | 銀灘破浪 |
| T7 | 星野銀狐 | T17 | 青川山羌 |
| T8 | 雲夢白鷺 | T18 | 望海白鯨 |
| T9 | 東寧豹 | T19 | 磐石鐵衛 |

## 二、實際測試

- 回歸測試：`1069 通過 / 0 失敗`
- GM 兼教練 15 年 smoke：全部通過
- 純 GM 15 年 smoke：全部通過
- 外層交付 ZIP：4 個核心檔案
- 模組 ZIP：解壓後恰為 20 個檔案

## 三、需修正的交接文件差異

`v491_codex_handoff.md` 的主題包 JSON 範例使用：

- `teamLogos`
- `nationFlags`

但實際 `00-theme.js` 讀取的是：

- `teams[teamId].logo`
- `nations[countryId].flag`

因此正式美術包必須沿用實際程式接口 `teams`／`nations`。未來交接摘要也應改正範例，否則依文件製作的隊徽與國旗不會被目前程式讀取。

## 四、非阻斷風險

- `TEAM_DEFS` 使用 `Object.freeze(array)`，可防止陣列增刪或替換項目，但陣列內各隊物件並未逐一 freeze。現有程式沒有修改這些物件，實際運作與測試均正常；若未來要強化不可變性，可將每個項目也凍結。
- `v491_project_summary.md` 已包含開新對話所需的大部分脈絡，但整份可貼用正文尚未包在單一最外層 Markdown fenced code block。這是 2026-07-25 新增的未來交付規則，不影響 v491 程式本體。

## 五、SHA-256

- `v491_delivery.zip`：`362E2B21D96D4B5111AF800F2CFC1725D79B8141B78F75A737FE8DA88EC8A858`
- `491_baseball_gm_modular.zip`：`4547DCB7DB8DA605A7AF464F4BE376F5DFA5D783064FF6E533163F5324CC0B76`
- `491_baseball_gm.html`：`D1F918D18C6E6B30B3FDD321F7F504109C74C52CC5198A6387D3E6A9610EBBC7`
- `v491_project_summary.md`：`DD38B715146FF8C09B8783AF5771271E32C71477E2316BA17198B22D7E278DE1`
- `v491_codex_handoff.md`：`79FB5E9153B2CE7A5055EE3827E83BF7CA65D0F5DA21EC31F0D5B2E8BDBA6823`
