# Delivery tools

## Validate a candidate ZIP

PowerShell 的全域 ExecutionPolicy 不需要修改。使用單次 bypass：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\delivery_tools\validate_delivery.ps1 `
  -ZipPath "D:\path\v51_delivery.zip"
```

預設會驗證固定 10 檔、來源鏈、manifest、SHA、Markdown 身分、唯一權威摘要、20 檔模組、美術 ZIP 安全性，並執行回歸與兩組 15 年 smoke。

只有診斷結構時才可加 `-SkipTests`；bootstrap 或獨立檢查時才可加 `-SkipLineage`。這兩個參數不可用於正式驗收。

## Promote a validated ZIP

首次建立 current：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\delivery_tools\promote_delivery.ps1 `
  -ZipPath "D:\path\v51_delivery.zip" `
  -Confirm
```

同一正式版本的新 revision 只要 lineage 驗證正確即可直接提升。若要跨正式版本（例如 v51 → v52），Mars 必須先明確確認上一版已自行存檔，再使用：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\delivery_tools\promote_delivery.ps1 `
  -ZipPath "D:\path\v52_delivery.zip" `
  -UserConfirmedArchived `
  -Confirm
```

工具只管理專案根目錄下的 `current`、`_incoming`、`_staging`、`_audit` 與目前 ZIP。沒有 `-UserConfirmedArchived` 時，不會替換既有 current。

## Claude prompt

`CLAUDE_ESTABLISH_DELIVERY_RULES_PROMPT.md` 是可直接貼給 Claude 的規則建立與 v51 修正提示語。
