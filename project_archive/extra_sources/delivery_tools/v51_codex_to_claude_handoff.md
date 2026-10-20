---
documentRole: codex-to-claude-handoff
gameVersion: v51
documentRevision: 1
originalAuthor: Codex
lastModifiedBy: Codex
authoritative: false
packageId: v51-r001-claude
---

# 《決勝GM》v51 Codex → Claude handoff

> 建立日期：2026-07-26  
> 文件所有者：Codex  
> 本文件不是脈絡還原摘要；唯一權威摘要為 `v51_project_summary.md`。  
> Claude 收到後必須位元不變地放入 `v51-r001-claude`，不得改寫本文。

## 一、lineage 確認

Codex 同意本次新制度 bootstrap 使用以下值：

- legacy bootstrap parent ID：`v51-legacy-bootstrap-claude-20260726`
- package ID：`v51-r001-claude`
- packageRevision：`1`
- createdBy：`Claude`
- basedOnPackageId：`v51-legacy-bootstrap-claude-20260726`
- supersedesPackageId：`v51-legacy-bootstrap-claude-20260726`
- formalVersionUpgrade：`false`

理由：v50→v51 正式升版已在新制度生效前完成；本輪是 v51 同版的固定角色重新封裝，不是假造另一個正式升版。

## 二、本輪固定規則

- 外層必須恰好 10 個固定角色。
- `v51_project_summary.md` 是 Claude 與 Codex 共用的唯一權威脈絡還原摘要，也是唯一可包含完整 copy-ready restoration block 的文件。
- `v51_claude_to_codex_handoff.md` 由 Claude 專有寫入。
- 本檔 `v51_codex_to_claude_handoff.md` 由 Codex 專有寫入。
- Claude 必須位元不變地保留本檔；若有回覆或異議，寫入 Claude 自己的 handoff。
- manifest 與 Markdown front matter 必須使用本節確認的 package ID。

## 三、本檔的 manifest 記錄

本檔應記錄為：

- role：`codex-to-claude-handoff`
- path：`v51_codex_to_claude_handoff.md`
- originVersion：`v51`
- originalAuthor：`Codex`
- lastModifiedBy：`Codex`
- changeStatus：`new`
- carriedForwardFrom：`null`
- contentSha256：以本檔實際位元計算

Claude 原先整理的同名占位文件不得再放入正式包，也不得宣稱為 Codex 原文。

## 四、已知封裝事項

- `v51_art_assets.zip` 的正確計數為 375 個檔案及 376 個 ZIP entries；多出的 1 個 entry 是零位元組目錄佔位。
- 本輪 Claude 不重打包美術 ZIP，必須保持其位元與 SHA 不變。
- 美術 ZIP 目前使用 Windows 反斜線 entry 路徑；Windows 工作流程可用，但 Mac／Linux 直接解壓可能無法形成預期目錄樹。
- 跨平台路徑改包留待 Codex 後續提出方案，未經 Mars 確認不得自行改動美術內容。

## 五、正式交付前驗收

Claude 應完成並回報：

1. Windows PowerShell `Expand-Archive` 實際成功，不以 zip flag 推論取代。
2. 外層恰好 10 檔。
3. `SHA256SUMS.txt` 9/9 通過。
4. manifest `outerFiles` 列出全部 10 檔。
5. manifest 自身及 `SHA256SUMS.txt` 的 `contentSha256` 為 `null`。
6. 模組 ZIP 恰好 20 檔。
7. 回歸測試、一般 15 年 smoke、純 GM 15 年 smoke 均通過。
8. 除 `v51_project_summary.md` 外，不存在第二份完整 restoration block。
9. `v51_claude_to_codex_handoff.md` 與本檔的作者、方向及 front matter 正確。

## 六、仍未完成與不得誤報

- T5–T19 仍待 Mars 真機視覺核准。
- Theme pack 匯入、持久化與真機 UI 手感仍待 Mars 驗證。
- 打擊率 `.234`、防禦率 `6.10` 與 R1 教練 AI 手感尚未拍板。
- 後續 A2／A3／A4／A5、簡化項、參數項、Backlog 與美術待辦不得寫成已完成。

完成本次固定角色重新封裝後，請交付完整 `v51_delivery.zip`。不得只提供差異文件或要求 Mars 自行組包。
