# Castle Conflict（1.85 網頁移植）

已下架的 iPhone 遊戲 **Castle Conflict**（Broken Kings，2010，v1.85）的網頁版。這是單一 HTML 檔，內含原版的全部圖片與音效，可離線遊玩。

▶ **遊玩：** 用瀏覽器開啟 `index.html`。開啟 GitHub Pages 後，也可以直接在網上玩。

## 內容
- **主選單：** Campaign、Quick Play、Multi-Player、About us（製作人員名單）、Preview、Survey。
- **Quick Play：**
  - Custom 設定：難度、局長、樹木生長、回血道具。
  - 中途退出會存檔，下次可選 Continue 繼續。
  - 勝利後可提升難度；Hard 難度勝利可得獎盃，獎盃按鈕點三下會召喚粉紅獨角獸。
- **Campaign：**
  - 3 個存檔槽。
  - 中世紀和埃及兩張世界地圖，共 39 座城堡。
  - 科技商店、軍營換兵、外觀選擇、成就獎勵、征服畫面（含 Rank）。
- **戰鬥：**
  - 33 種兵種。
  - 城堡升級外觀。
  - 雲、鳥、水光等景物。
  - 埃及地圖的高樹和蟻獅。
  - 快速對戰 AI，以及原版的戰役 AI（fitness 評分）。
- **Multi-Player：** 原版需要藍牙或 WiFi 連線；這裡改為同一裝置雙人對戰，紅方按鈕在畫面底部。

## 操作
- 觸控或滑鼠操作。
- 鍵盤：
  - 1–9：出兵
  - 空白鍵：暫停
  - Esc：退出
  - Q–O：雙人模式中紅方出兵

## 與原版的差異
- Multi-Player 改為同機雙人對戰。
- Preview、Survey 改為離線版本。
- 載入畫面加了「Touch to start」提示，因為瀏覽器要先觸控一次才能播放聲音。
- 刻意保留原版的程式錯誤：
  - Egyptian Temple 外觀不會解鎖。
  - Hard 難度只要勝利就會得到獎盃。

## 專案結構
| 路徑 | 內容 |
|---|---|
| `index.html` | 已打包、可直接遊玩的版本 |
| `src/` | 原始碼模組：`engine.js` 戰鬥模擬、`battle.js` 戰鬥畫面、`menu.js` 選單、`campaign.js` 戰役、`core.js` 繪圖／觸控／音效、`data.js` 存檔與設定 |
| `assets/` | 從 IPA 解出的原版圖片與音效 |
| `docs/specs/` | 逆向分析筆記，記錄座標、流程和數值 |
| `build.py` | 打包腳本：`python build.py 1.0` 會重新產生 `index.html` |

## 版權
遊戲美術、音樂與設計屬原作者 Broken Kings（Stephen Gazzard、Josiah Tobin）所有。本專案只作個人保存與學習用途。
