# 📝 How to Update IPL Predictor Data

This guide explains **exactly what to edit** in `data.js` when a new IPL season ends.

---

## 🗓️ After Every IPL Season — Quick Checklist

Open `data.js` in any text editor (VS Code, Notepad, etc.) and make these 4 updates:

---

## Update 1 — Team History (`TEAM_HISTORY` object)

**Location:** Top of `data.js`, around line 10.

For **every team** that played this season:
```js
seasons: 16  →  seasons: 17   // Add 1
```

For **every team** that reached the **Playoffs** (Top 4):
```js
playoffs: 9  →  playoffs: 10  // Add 1
```

For the **IPL Champion** team:
```js
titles: 0  →  titles: 1                          // Add 1
titleYears: []  →  titleYears: [2025]             // Add the year
```

### Example (RCB won IPL 2025):
```js
// BEFORE:
RCB: { fullName:"Royal Challengers Bengaluru", titles:0, titleYears:[], playoffs:9, seasons:16 }

// AFTER:
RCB: { fullName:"Royal Challengers Bengaluru", titles:1, titleYears:[2025], playoffs:10, seasons:17 }
```

---

## Update 2 — Add New Champion (`IPL_CHAMPIONS` array)

**Location:** Around line 25 in `data.js`.

Add a new entry at the **bottom** of the array (before the comment):
```js
{ year:2025, team:"RCB", trophy:"🏆", score:"Final Score: RCB 185/4 vs XX 160/8", note:"RCB's first title!" },
// ✏️ ADD NEXT YEAR HERE ↓
// { year:2026, team:"???", trophy:"🏆", score:"Final scorecard" },
```

> **team key** must be one of: `MI`, `CSK`, `RCB`, `KKR`, `SRH`, `PBKS`, `RR`, `DC`, `GT`, `LSG`

---

## Update 3 — Squad Changes (`TEAMS` object → `players` array)

**Location:** Each team block inside `TEAMS = { ... }`.

If a player **moved to a new team** (e.g., Hardik Pandya from MI to RR):
1. Find the old team's `players` array and **delete** that player's entry.
2. Find the new team's `players` array and **add** the player.

### Player object format:
```js
{ id:"unique_id", name:"Player Name", role:"Pacer", nat:"IND", bat:40, bowl:88 }
```

**Roles:** `Batsman`, `Pacer`, `Spinner`, `All-Rounder`, `WK-Batsman`
**nat codes:** `IND`, `AUS`, `ENG`, `SA`, `NZ`, `WI`, `AFG`, `SL`, `SGP`, `ZIM`
**bat / bowl:** Rating from 0–100

### Add `isCaptain: true` for the captain:
```js
{ id:"gill_gt", name:"Shubman Gill", role:"Batsman", nat:"IND", bat:90, bowl:5, isCaptain:true }
```

---

## Update 4 — Player Matchup Records (`PLAYER_MATCHUPS` array)

**Location:** Bottom of `data.js`.

After a full season, you can update these numbers based on real career stats:
```js
{
  id:"b1",
  bowler:"bumrah_mi",      // Player ID from teams list
  batsman:"kohli_rcb",     // Player ID from teams list
  balls:258,               // Career balls bowled to this batsman
  runs:182,                // Career runs scored
  wickets:9,               // Career dismissals
  fours:18,                // Fours hit
  sixes:4,                 // Sixes hit
  dots:112,                // Dot balls
  highlight:"Description of their rivalry..."
}
```

---

## Update 5 — Squad Ratings (`TEAMS` → team quality stats)

If a team significantly improved or weakened in the auction:

```js
MI: {
  pacerQuality: 88,       // 0-100: How good are their fast bowlers?
  spinnerQuality: 70,     // 0-100: How good are their spinners?
  battingVsPace: 80,      // 0-100: How well do their batsmen play pace?
  battingVsSpin: 78,      // 0-100: How well do their batsmen play spin?
  powerHitting: 88,       // 0-100: Ability to hit sixes and boundaries
  fielding: 82,           // 0-100: Fielding quality
  allRounderQuality: 80,  // 0-100: Quality of all-rounders
  battingDepth: 84,       // 0-100: How deep is their batting?
}
```

> **Rule of thumb:**
> - Elite (90+): World-class, e.g., Bumrah's pace (98)
> - Strong (80-89): Very good, consistent performers
> - Average (70-79): Decent but not outstanding
> - Weak (60-69): Needs improvement

---

## 🔧 Venue Updates

If a **new venue** is added or stats change, find `const VENUES` and add/edit:

```js
NewStadium: {
  name:"New Stadium Name",
  city:"City",
  homeTeam:"XX",           // Team key
  dimensions:"average",   // "small" | "average" | "large"
  defaultPitch:"flat",     // "flat" | "green" | "dry"
  dewFactor:"medium",      // "low" | "medium" | "high"
  batFirstWinPct:50,       // % of games won by team batting first
  chaseWinPct:50,          // % of games won by chasing team
  avgScore:170,            // Average first innings score
  teamWinPct: { MI:50, CSK:50, RCB:50, KKR:50, SRH:50, PBKS:50, RR:50, DC:50, GT:50, LSG:50 }
}
```

---

## 💡 Finding Current IPL Stats — Free Sources

| What you need | Where to find it |
|---|---|
| Match results, scores | [iplt20.com](https://www.iplt20.com) |
| Player vs player career stats | [espncricinfo.com](https://www.espncricinfo.com) → Stats → IPL Filter |
| Batting/bowling averages | [howstat.com](http://www.howstat.com) |
| Auction & squad changes | [bcci.tv](https://www.bcci.tv) |
| Win % at venues | [statsguru.espncricinfo.com](https://stats.espncricinfo.com) |

---

## ✅ After Making Changes

1. **Save** `data.js`
2. **Refresh** your browser (press `Ctrl + Shift + R` for hard refresh)
3. All 5 pages (Home, Predictor, Teams, Players, History) will automatically show updated data — no other file needs to change!

---

> **Pro Tip:** Use `Ctrl + F` in VS Code to search for the specific team key (e.g., `RCB:`) or player ID (e.g., `kohli_rcb`) to quickly jump to the right place in the file.
