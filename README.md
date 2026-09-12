# 史瓦特大進擊：再突入

iPhone 橫向雙搖桿的橫向突入切片。規格在 `docs/specs/2026-09-12-swat-rush-design.md`。

## 現在有什麼

無盡突入：怪物一直出，五個畫面輪替（巷戰／走廊／倉庫／頂樓／機房），每區新怪物與不同強度。打滿進度走到右邊過關，死了才結算。

## 傳給別人玩

公開網址（Safari 打開，手機請橫過來）：

https://metaapp100-debug.github.io/swat-rush/

不上 App Store，不需帳號。電腦瀏覽器也能開。

## 本機跑

```bash
cd ~/projects/swat-rush
npm install
npm run dev
```

電腦瀏覽器打開終端機印的 Local 網址。iPhone 要跟電腦同一 Wi‑Fi，打開 Network 那條網址，然後把手機橫過來。

## 操作

- iPhone：左搖桿走（上推跳、下推龜縮），右搖桿瞄準並開火
- 電腦備援：A／D 走、空白鍵跳、S 縮、滑鼠瞄＋左鍵射、1／2／3 換槍、R 換彈、F 閃光
