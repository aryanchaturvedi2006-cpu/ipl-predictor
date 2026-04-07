// ================================================================
// h2h_data.js — MASSIVE HEAD-TO-HEAD TACTICAL ENGINE
// ================================================================

// ---- 1. MINI-RIVALRIES (PvP) ----
const DETAILED_MATCHUPS = [
  { id:"m1",  bowler:"bumrah_mi",     batsman:"kohli_rcb",   balls:258, runs:182, wickets:9,  fours:18, sixes:4,  dots:112, highlight:"Bumrah has dominated Kohli with 9 dismissals. Kohli averages just 20.2 against him, striking at only 70.5. Bumrah's lethal yorkers and cutters have troubled Kohli repeatedly across seasons." },
  { id:"m2",  bowler:"bumrah_mi",     batsman:"dhoni_csk",   balls:228, runs:125, wickets:4,  fours:8,  sixes:5,  dots:105, highlight:"A classic battle of legends. Dhoni has struggled to find boundaries against Bumrah's yorkers, managing only 5 sixes in 228 balls." },
  { id:"m3",  bowler:"sandeep_rr",    batsman:"buttler_rr",  balls:97,  runs:115, wickets:5,  fours:12, sixes:6,  dots:45,  highlight:"The Powerplay Nemesis: Sandeep has dismissed Buttler 5 times in the first 6 overs." },
  { id:"m4",  bowler:"rashid_gt",     batsman:"sky_mi",      balls:54,  runs:68,  wickets:4,  fours:6,  sixes:3,  dots:18,  highlight:"Rashid has dismissed the 360-degree master 4 times, keeping SKY quiet with perfectly-disguised sliders and googlies." },
  { id:"m5",  bowler:"narine_kkr",    batsman:"rohit_mi",    balls:312, runs:185, wickets:11, fours:14, sixes:5,  dots:148, highlight:"Narine has dismissed Rohit 11 times — one of IPL's greatest rivalries. Rohit strikes at just 59 against him." },
  { id:"m6",  bowler:"bumrah_mi",     batsman:"russell_kkr", balls:85,  runs:92,  wickets:4,  fours:4,  sixes:8,  dots:35,  highlight:"Russell has managed 8 sixes, but Bumrah has cleaned his stumps 4 times at the death when it matters most." },
  { id:"m7",  bowler:"ashwin_rr",     batsman:"warner_dc",   balls:210, runs:188, wickets:6,  fours:15, sixes:4,  dots:95,  highlight:"The Tactical Chess Match: Ashwin's carrom balls vs Warner's switch-hits. 6 dismissals makes this one of the most cerebral battles." },
  { id:"m8",  bowler:"axar_dc",       batsman:"living_pbks", balls:52,  runs:82,  wickets:2,  fours:3,  sixes:7,  dots:12,  highlight:"Attack vs Accuracy: Livingstone's extraordinary power vs Axar's tight stump-to-stump line." },
  { id:"m9",  bowler:"cummins_srh",   batsman:"rahul_lsg",   balls:145, runs:162, wickets:3,  fours:18, sixes:6,  dots:55,  highlight:"Classic technical battle: Cummins' express pace vs KL Rahul's textbook defence. Rahul has generally come out ahead." },
  { id:"m10", bowler:"boult_rr",      batsman:"faf_rcb",     balls:122, runs:144, wickets:4,  fours:16, sixes:5,  dots:48,  highlight:"First Over Battle: Boult's swing vs Faf's high-elbow technique. 4 dismissals make this one to watch in any RCB vs RR clash." },
  { id:"m11", bowler:"shami_gt",      batsman:"dhoni_csk",   balls:85,  runs:98,  wickets:3,  fours:6,  sixes:7,  dots:32,  highlight:"The Finisher's Duel: Shami's precision vs Dhoni's finishing instinct. Dhoni has launched 7 sixes but Shami has the edge with 3 dismissals." },
  { id:"m12", bowler:"siraj_rcb",     batsman:"rohit_mi",    balls:192, runs:148, wickets:7,  fours:16, sixes:3,  dots:80,  highlight:"Out-swing Trap: Siraj has dismissed Rohit 7 times in early spells, exploiting the right-hander's vulnerability to the angled delivery." },
  { id:"m13", bowler:"bhuvi_srh",     batsman:"pant_dc",     balls:115, runs:192, wickets:2,  fours:22, sixes:10, dots:40,  highlight:"Pant has hammered Bhuvi for 22 fours and 10 sixes — one of the most one-sided batting displays in this rivalry." },
  { id:"m14", bowler:"rashid_gt",     batsman:"kohli_rcb",   balls:186, runs:122, wickets:7,  fours:10, sixes:4,  dots:82,  highlight:"Kohli struggles with Rashid's googly, dismissed 7 times across seasons. A high-quality contest between two absolute legends." },
  { id:"m15", bowler:"jadeja_csk",    batsman:"pooran_lsg",  balls:74,  runs:115, wickets:3,  fours:4,  sixes:9,  dots:22,  highlight:"Spin vs Power: Pooran's massive reach and extraordinary hitting vs Jadeja's flat darts into the rough." },
  { id:"m16", bowler:"shami_gt",      batsman:"head_srh",    balls:48,  runs:62,  wickets:2,  fours:8,  sixes:2,  dots:25,  highlight:"Pace vs Intent: Shami's seam position vs Head's explosive powerplay starts." },
  { id:"m17", bowler:"starc_kkr",     batsman:"kohli_rcb",   balls:42,  runs:58,  wickets:1,  fours:6,  sixes:2,  dots:15,  highlight:"World Class Encounter: Starc's left-arm angle vs Kohli's cover drive." },
  { id:"m18", bowler:"natarajan_srh", batsman:"samson_rr",   balls:65,  runs:92,  wickets:3,  fours:8,  sixes:4,  dots:20,  highlight:"Yorker Specialist vs Explosive WK-Batsman: Natarajan has dismissed Samson 3 times with pinpoint yorkers." },
  { id:"m19", bowler:"rabada_pbks",   batsman:"buttler_rr",  balls:82,  runs:124, wickets:2,  fours:15, sixes:5,  dots:28,  highlight:"Pure Pace vs Timing: Rabada's bouncers vs Buttler's extraordinary scoops and ramps." },
  { id:"m20", bowler:"narine_kkr",    batsman:"dhoni_csk",   balls:92,  runs:47,  wickets:1,  fours:2,  sixes:0,  dots:65,  highlight:"The Silent Battle: Narine has kept Dhoni at a strike rate of just 51, giving away zero sixes." },
  { id:"m21", bowler:"varun_kkr",     batsman:"dhoni_csk",   balls:18,  runs:15,  wickets:3,  fours:0,  sixes:1,  dots:8,   highlight:"The Stumper: Varun Chakravarthy has dismissed Dhoni 3 times in just 18 balls — a remarkable dominance." },
  { id:"m22", bowler:"varun_kkr",     batsman:"rutu_csk",    balls:55,  runs:72,  wickets:2,  fours:6,  sixes:3,  dots:20,  highlight:"The Spin Web: Varun's mystery variations vs Ruturaj's technical class." },
  { id:"m23", bowler:"chahal_rr",     batsman:"salt_kkr",    balls:32,  runs:58,  wickets:2,  fours:4,  sixes:5,  dots:10,  highlight:"Spin Trap: Chahal has baited Salt twice with tosses wide outside off. Salt's aggression often gets the better of him." },
  { id:"m24", bowler:"chahal_rr",     batsman:"rahul_lsg",   balls:234, runs:162, wickets:9,  fours:12, sixes:4,  dots:106, highlight:"Chahal has dismissed KL Rahul 9 times — one of IPL's most lopsided rivalries. Former RCB teammates know each other's game intimately." },
  { id:"m25", bowler:"kuldeep_dc",    batsman:"buttler_rr",  balls:145, runs:98,  wickets:7,  fours:8,  sixes:3,  dots:62,  highlight:"Kuldeep's left-arm wrist spin is a nightmare for right-handers. The mystery of his googly has sent Buttler packing 7 times." },
  { id:"m26", bowler:"axar_dc",       batsman:"jaiswal_rr",  balls:68,  runs:88,  wickets:3,  fours:10, sixes:3,  dots:22,  highlight:"Axar's left-arm angle into Jaiswal's stumps has been a fascinating battle. The young opener has been deceived 3 times." },
  { id:"m27", bowler:"bumrah_mi",     batsman:"pant_dc",     balls:112, runs:98,  wickets:5,  fours:8,  sixes:4,  dots:52,  highlight:"Bumrah's late movement has troubled Pant's unorthodox strokeplay 5 times. Yet Pant has replied with 4 sixes." },
  { id:"m28", bowler:"shami_gt",      batsman:"samson_rr",   balls:88,  runs:105, wickets:4,  fours:10, sixes:5,  dots:38,  highlight:"Shami's control and movement have tested Samson's aggressive instincts. 4 wickets speaks to Shami's dominance." },
  { id:"m29", bowler:"chahal_rr",     batsman:"gill_gt",     balls:120, runs:95,  wickets:5,  fours:8,  sixes:2,  dots:55,  highlight:"Chahal's leg-spin has troubled the elegant Gill 5 times — the googly through the gate being the primary mode of dismissal." },
  { id:"m30", bowler:"narine_kkr",    batsman:"kohli_rcb",   balls:288, runs:196, wickets:8,  fours:18, sixes:6,  dots:122, highlight:"Narine vs Kohli is a classic spinner-batsman duel. Despite Kohli's brilliant technique, Narine has got him 8 times using unusual variations." },
  { id:"m31", bowler:"bumrah_mi",     batsman:"rinku_kkr",   balls:78,  runs:92,  wickets:3,  fours:9,  sixes:4,  dots:32,  highlight:"Bumrah's yorkers have troubled Rinku Singh across T20 formats. Rinku's aggressive approach often leads to miscues, having been dismissed 3 times by Bumrah's precision bowling." },
  { id:"m32", bowler:"siraj_rcb",     batsman:"rinku_kkr",   balls:64,  runs:108, wickets:2,  fours:10, sixes:5,  dots:28,  highlight:"Rinku Singh's power-hitting has dominated Siraj in death overs, scoring freely despite 2 dismissals. The aggressive stance often troubles bowlers early on." },
  { id:"m33", bowler:"shami_gt",      batsman:"rinku_kkr",   balls:72,  runs:98,  wickets:3,  fours:8,  sixes:4,  dots:35,  highlight:"Shami's seam movement and control have curbed Rinku's natural aggression. The left-hander has been dismissed 3 times through LBW and catches in the slips." },
  { id:"m34", bowler:"bhuvi_srh",     batsman:"rinku_kkr",   balls:56,  runs:76,  wickets:2,  fours:7,  sixes:3,  dots:24,  highlight:"Bhuvi's early pace and movement have tested Rinku's technique, accounting for 2 dismissals via the short ball." },
  { id:"m35", bowler:"chahal_rr",     batsman:"rinku_kkr",   balls:48,  runs:82,  wickets:1,  fours:6,  sixes:5,  dots:20,  highlight:"Spin Challenge: Rinku's aggressive nature has produced 5 sixes against Chahal, but the googly accounted for 1 dismissal in crucial moments." },
  // ---- EXPANDED: ALL MAJOR PLAYERS ----
  { id:"m36", bowler:"bumrah_mi",     batsman:"sky_mi",      balls:0,   runs:0,   wickets:0,  fours:0,  sixes:0,  dots:0,   highlight:"Bumrah and SKY: A rare same-team dynamic where both excel in different formats." },
  { id:"m37", bowler:"pandya_mi",     batsman:"rohit_mi",    balls:0,   runs:0,   wickets:0,  fours:0,  sixes:0,  dots:0,   highlight:"Hardik Pandya & Rohit Sharma: Mumbai Indians' dynamic duo." },
  { id:"m38", bowler:"bumrah_mi",     batsman:"dhoni_csk",   balls:228, runs:125, wickets:4,  fours:8,  sixes:5,  dots:105, highlight:"Bumrah vs Dhoni: Bumrah has troubled MSD with yorkers, but Dhoni has managed 5 sixes in their encounters." },
  { id:"m39", bowler:"siraj_rcb",     batsman:"sk_mi",       balls:85,  runs:142, wickets:2,  fours:14, sixes:8,  dots:28,  highlight:"Siraj vs SKY: The attacking maestro has dominated Siraj, striking at over 167 with 8 sixes." },
  { id:"m40", bowler:"bhuvi_srh",     batsman:"faf_rcb",     balls:92,  runs:138, wickets:2,  fours:12, sixes:6,  dots:38,  highlight:"Bhuvi vs Faf: The South African has found success against Bhuvi's early-over pace, scoring briskly." },
  { id:"m41", bowler:"chahal_rr",     batsman:"pant_dc",     balls:75,  runs:168, wickets:1,  fours:14, sixes:8,  dots:24,  highlight:"Chahal vs Pant: Despite taking 1 wicket, Chahal has been hit for 8 sixes by Pant's aggressive instincts." },
  { id:"m42", bowler:"kuldeep_dc",    batsman:"samson_rr",   balls:68,  runs:102, wickets:2,  fours:10, sixes:5,  dots:28,  highlight:"Kuldeep vs Samson: The agile WK-batsman has played Kuldeep well, hitting 5 sixes despite 2 dismissals." },
  { id:"m43", bowler:"narine_kkr",    batsman:"russell_kkr",  balls:0,   runs:0,   wickets:0,  fours:0,  sixes:0,  dots:0,   highlight:"Narine & Russell: KKR's explosive combo with contrasting yet complementary skills." },
  { id:"m44", bowler:"starc_kkr",     batsman:"head_srh",    balls:0,   runs:0,   wickets:0,  fours:0,  sixes:0,  dots:0,   highlight:"Starc vs Travis Head: Both globals, Head has shown intent but Starc's pace has tested him." },
  { id:"m45", bowler:"bumrah_mi",     batsman:"faf_rcb",     balls:110, runs:96,  wickets:5,  fours:8,  sixes:3,  dots:48,  highlight:"Bumrah vs Faf: One of the great bowler-batsman rivalries. Bumrah has got Faf 5 times across formats." },
  { id:"m46", bowler:"siraj_rcb",     batsman:"rohit_mi",    balls:192, runs:148, wickets:7,  fours:16, sixes:3,  dots:80,  highlight:"Siraj vs Rohit: Out-swing specialist Siraj has dismissed the MI captain 7 times in pressurizing early overs." },
  { id:"m47", bowler:"bhuvi_srh",     batsman:"kohli_rcb",   balls:128, runs:162, wickets:3,  fours:16, sixes:4,  dots:52,  highlight:"Bhuvi vs Kohli: Kohli has dominated with a strike rate of 127, scoring freely despite 3 dismissals." },
  { id:"m48", bowler:"chahal_rr",     batsman:"maxwell_rcb", balls:56,  runs:98,  wickets:2,  fours:8,  sixes:6,  dots:18,  highlight:"Chahal vs Maxwell: The explosive Aussie has hit Chahal for 6 sixes, turning matches single-handedly." },
  { id:"m49", bowler:"jadeja_csk",    batsman:"rinku_kkr",   balls:42,  runs:68,  wickets:1,  fours:5,  sixes:4,  dots:16,  highlight:"Jadeja vs Rinku: Jadeja's experience against the younger Rinku shows in his control and 1 dismissal." },
  { id:"m50", bowler:"ashwin_rr",     batsman:"tilak_mi",    balls:58,  runs:84,  wickets:2,  fours:6,  sixes:4,  dots:24,  highlight:"Ashwin vs Tilak: The young Tilak has shown maturity, hitting 4 sixes despite losing 2 wickets to Ashwin's carrom ball." },
  { id:"m51", bowler:"rashid_gt",     batsman:"rutu_csk",    balls:45,  runs:72,  wickets:1,  fours:6,  sixes:3,  dots:18,  highlight:"Rashid vs Ruturaj: The Bangladeshi googly has dismissed Ruturaj once, but the Indian has played risk-free otherwise." },
  { id:"m52", bowler:"cummins_srh",   batsman:"pant_dc",     balls:88,  runs:145, wickets:2,  fours:14, sixes:7,  dots:32,  highlight:"Cummins vs Pant: The explosive southpaw has targeted Cummins for 7 sixes, a testament to his power-hitting." },
  { id:"m53", bowler:"natarajan_srh", batsman:"samson_rr",   balls:65,  runs:92,  wickets:3,  fours:8,  sixes:4,  dots:20,  highlight:"Natarajan vs Samson: The yorker specialist has dismissed Samson twice with pinpoint accuracy at the death." },
  { id:"m54", bowler:"bumrah_mi",     batsman:"square_mi",   balls:0,   runs:0,   wickets:0,  fours:0,  sixes:0,  dots:0,   highlight:"Bumrah in Powerplay: His devastating early-over breakthroughs set the tone for MI victories." },
  { id:"m55", bowler:"kuldeep_dc",    batsman:"gill_gt",     balls:78,  runs:95,  wickets:2,  fours:8,  sixes:2,  dots:32,  highlight:"Kuldeep vs Gill: Technical elegance vs mystery seam-spin. Kuldeep has outplayed the young left-hander twice." },
  { id:"m56", bowler:"axar_dc",       batsman:"buttler_rr",  balls:52,  runs:82,  wickets:2,  fours:3,  sixes:7,  dots:12,  highlight:"Axar vs Buttler: Despite Buttler's destructive power, Axar's tight lines have restricted him 2 times." },
];

// ---- 2. PLAYER vs TEAM MATRIX (PvT) ----
const PLAYER_VS_TEAM = {

  // ----------------------------------------------------------------
  // BATSMEN
  // ----------------------------------------------------------------

  kohli_rcb: {
    MI:   { runs:950,  avg:31, sr:128, fifties:6,  hundreds:0, matches:32 },
    CSK:  { runs:1020, avg:35, sr:125, fifties:9,  hundreds:0, matches:31 },
    KKR:  { runs:900,  avg:34, sr:130, fifties:6,  hundreds:1, matches:30 },
    SRH:  { runs:700,  avg:32, sr:140, fifties:4,  hundreds:1, matches:25 },
    RR:   { runs:650,  avg:30, sr:118, fifties:4,  hundreds:0, matches:28 },
    PBKS: { runs:850,  avg:32, sr:132, fifties:5,  hundreds:1, matches:30 },
    DC:   { runs:1050, avg:52, sr:138, fifties:10, hundreds:0, matches:28 },
    GT:   { runs:280,  avg:35, sr:128, fifties:2,  hundreds:0, matches:8  },
    LSG:  { runs:210,  avg:42, sr:130, fifties:2,  hundreds:0, matches:6  }
  },

  rohit_mi: {
    KKR:  { runs:1050, avg:45, sr:135, fifties:7, hundreds:1, matches:32 },
    CSK:  { runs:800,  avg:28, sr:128, fifties:5, hundreds:0, matches:34 },
    RCB:  { runs:750,  avg:30, sr:130, fifties:4, hundreds:0, matches:31 },
    RR:   { runs:550,  avg:25, sr:122, fifties:3, hundreds:0, matches:27 },
    SRH:  { runs:450,  avg:28, sr:130, fifties:2, hundreds:0, matches:21 },
    DC:   { runs:620,  avg:31, sr:132, fifties:4, hundreds:0, matches:24 },
    PBKS: { runs:680,  avg:34, sr:136, fifties:4, hundreds:1, matches:22 },
    GT:   { runs:240,  avg:30, sr:128, fifties:1, hundreds:0, matches:8  },
    LSG:  { runs:180,  avg:36, sr:130, fifties:1, hundreds:0, matches:6  }
  },

  samson_rr: {
    MI:   { runs:620, avg:32, sr:148, fifties:4, hundreds:1, matches:22 },
    CSK:  { runs:580, avg:34, sr:144, fifties:4, hundreds:0, matches:20 },
    RCB:  { runs:490, avg:28, sr:140, fifties:3, hundreds:1, matches:20 },
    KKR:  { runs:540, avg:36, sr:152, fifties:4, hundreds:0, matches:18 },
    SRH:  { runs:460, avg:30, sr:145, fifties:3, hundreds:0, matches:18 },
    PBKS: { runs:510, avg:34, sr:150, fifties:3, hundreds:1, matches:18 },
    DC:   { runs:480, avg:32, sr:146, fifties:3, hundreds:0, matches:17 },
    GT:   { runs:210, avg:42, sr:158, fifties:2, hundreds:0, matches:6  },
    LSG:  { runs:195, avg:39, sr:152, fifties:1, hundreds:1, matches:6  }
  },

  rutu_csk: {
    MI:   { runs:580, avg:36, sr:132, fifties:4, hundreds:0, matches:18 },
    RCB:  { runs:520, avg:40, sr:138, fifties:4, hundreds:1, matches:16 },
    KKR:  { runs:460, avg:34, sr:130, fifties:3, hundreds:0, matches:16 },
    SRH:  { runs:420, avg:35, sr:128, fifties:3, hundreds:0, matches:14 },
    RR:   { runs:390, avg:32, sr:125, fifties:3, hundreds:0, matches:14 },
    PBKS: { runs:440, avg:36, sr:135, fifties:3, hundreds:1, matches:14 },
    DC:   { runs:410, avg:34, sr:130, fifties:3, hundreds:0, matches:14 },
    GT:   { runs:185, avg:37, sr:132, fifties:1, hundreds:0, matches:6  },
    LSG:  { runs:165, avg:33, sr:128, fifties:1, hundreds:0, matches:6  }
  },

  gill_gt: {
    MI:   { runs:420, avg:35, sr:138, fifties:3, hundreds:0, matches:14 },
    CSK:  { runs:380, avg:34, sr:132, fifties:3, hundreds:0, matches:13 },
    RCB:  { runs:360, avg:36, sr:140, fifties:2, hundreds:1, matches:12 },
    KKR:  { runs:310, avg:31, sr:128, fifties:2, hundreds:0, matches:12 },
    SRH:  { runs:290, avg:29, sr:130, fifties:2, hundreds:0, matches:12 },
    PBKS: { runs:340, avg:34, sr:136, fifties:2, hundreds:1, matches:12 },
    DC:   { runs:325, avg:32, sr:132, fifties:2, hundreds:0, matches:12 },
    RR:   { runs:350, avg:35, sr:135, fifties:2, hundreds:1, matches:12 },
    LSG:  { runs:280, avg:35, sr:138, fifties:2, hundreds:0, matches:8  }
  },

  sai_gt: {
    MI:   { runs:285, avg:38, sr:136, fifties:2, hundreds:0, matches:9 },
    CSK:  { runs:260, avg:36, sr:130, fifties:2, hundreds:0, matches:8 },
    RCB:  { runs:240, avg:40, sr:138, fifties:2, hundreds:0, matches:8 },
    KKR:  { runs:220, avg:31, sr:128, fifties:1, hundreds:0, matches:8 },
    SRH:  { runs:210, avg:30, sr:126, fifties:1, hundreds:0, matches:8 },
    PBKS: { runs:245, avg:35, sr:134, fifties:2, hundreds:0, matches:8 },
    DC:   { runs:230, avg:33, sr:130, fifties:2, hundreds:0, matches:8 },
    RR:   { runs:255, avg:36, sr:132, fifties:2, hundreds:0, matches:8 },
    LSG:  { runs:200, avg:33, sr:128, fifties:1, hundreds:0, matches:7 }
  },

  jaiswal_rr: {
    MI:   { runs:390, avg:35, sr:158, fifties:2, hundreds:1, matches:12 },
    CSK:  { runs:360, avg:36, sr:155, fifties:2, hundreds:1, matches:11 },
    RCB:  { runs:310, avg:34, sr:162, fifties:2, hundreds:0, matches:10 },
    KKR:  { runs:340, avg:38, sr:164, fifties:2, hundreds:1, matches:10 },
    SRH:  { runs:295, avg:33, sr:160, fifties:2, hundreds:0, matches:10 },
    PBKS: { runs:320, avg:36, sr:158, fifties:2, hundreds:1, matches:10 },
    DC:   { runs:305, avg:34, sr:155, fifties:2, hundreds:0, matches:10 },
    GT:   { runs:270, avg:38, sr:162, fifties:2, hundreds:0, matches:8  },
    LSG:  { runs:250, avg:35, sr:158, fifties:2, hundreds:0, matches:8  }
  },

  pant_dc: {
    MI:   { runs:580, avg:34, sr:158, fifties:4, hundreds:0, matches:20 },
    CSK:  { runs:520, avg:30, sr:148, fifties:3, hundreds:0, matches:20 },
    RCB:  { runs:480, avg:32, sr:162, fifties:3, hundreds:0, matches:18 },
    KKR:  { runs:440, avg:28, sr:152, fifties:3, hundreds:0, matches:18 },
    SRH:  { runs:510, avg:36, sr:165, fifties:4, hundreds:0, matches:16 },
    RR:   { runs:460, avg:30, sr:156, fifties:3, hundreds:0, matches:18 },
    PBKS: { runs:420, avg:28, sr:152, fifties:3, hundreds:0, matches:16 },
    GT:   { runs:215, avg:36, sr:162, fifties:2, hundreds:0, matches:6  },
    LSG:  { runs:190, avg:38, sr:168, fifties:1, hundreds:0, matches:6  }
  },

  salt_kkr: {
    MI:   { runs:180, avg:30, sr:172, fifties:1, hundreds:0, matches:6 },
    CSK:  { runs:165, avg:27, sr:165, fifties:1, hundreds:0, matches:6 },
    RCB:  { runs:195, avg:39, sr:178, fifties:1, hundreds:0, matches:6 },
    SRH:  { runs:155, avg:26, sr:162, fifties:1, hundreds:0, matches:6 },
    RR:   { runs:175, avg:29, sr:168, fifties:1, hundreds:0, matches:6 },
    PBKS: { runs:185, avg:31, sr:172, fifties:1, hundreds:0, matches:6 },
    DC:   { runs:168, avg:28, sr:165, fifties:1, hundreds:0, matches:6 },
    GT:   { runs:158, avg:32, sr:170, fifties:1, hundreds:0, matches:5 },
    LSG:  { runs:145, avg:29, sr:168, fifties:1, hundreds:0, matches:5 }
  },

  sky_mi: {
    CSK:  { runs:620, avg:38, sr:162, fifties:4, hundreds:0, matches:20 },
    RCB:  { runs:580, avg:40, sr:168, fifties:4, hundreds:0, matches:18 },
    KKR:  { runs:540, avg:36, sr:158, fifties:3, hundreds:0, matches:18 },
    SRH:  { runs:495, avg:38, sr:165, fifties:3, hundreds:1, matches:16 },
    RR:   { runs:460, avg:34, sr:160, fifties:3, hundreds:0, matches:16 },
    DC:   { runs:490, avg:36, sr:162, fifties:3, hundreds:0, matches:16 },
    PBKS: { runs:510, avg:38, sr:165, fifties:4, hundreds:0, matches:15 },
    GT:   { runs:260, avg:40, sr:168, fifties:2, hundreds:0, matches:8  },
    LSG:  { runs:220, avg:44, sr:172, fifties:2, hundreds:0, matches:6  }
  },

  patidar_rcb: {
    MI:   { runs:245, avg:35, sr:148, fifties:2, hundreds:0, matches:8 },
    CSK:  { runs:220, avg:31, sr:140, fifties:1, hundreds:0, matches:8 },
    KKR:  { runs:265, avg:38, sr:152, fifties:2, hundreds:1, matches:8 },
    SRH:  { runs:210, avg:30, sr:142, fifties:1, hundreds:0, matches:8 },
    RR:   { runs:235, avg:33, sr:145, fifties:1, hundreds:1, matches:8 },
    PBKS: { runs:250, avg:36, sr:150, fifties:2, hundreds:0, matches:8 },
    DC:   { runs:230, avg:32, sr:145, fifties:2, hundreds:0, matches:8 },
    GT:   { runs:195, avg:35, sr:148, fifties:1, hundreds:0, matches:6 },
    LSG:  { runs:180, avg:36, sr:150, fifties:1, hundreds:0, matches:6 }
  },

  miller_gt: {
    MI:   { runs:320, avg:40, sr:158, fifties:2, hundreds:0, matches:10 },
    CSK:  { runs:295, avg:37, sr:152, fifties:2, hundreds:0, matches:10 },
    RCB:  { runs:280, avg:35, sr:148, fifties:1, hundreds:0, matches:9  },
    KKR:  { runs:260, avg:32, sr:145, fifties:1, hundreds:0, matches:9  },
    SRH:  { runs:275, avg:34, sr:150, fifties:2, hundreds:0, matches:9  },
    RR:   { runs:305, avg:38, sr:155, fifties:2, hundreds:0, matches:9  },
    DC:   { runs:285, avg:36, sr:152, fifties:2, hundreds:0, matches:9  },
    PBKS: { runs:310, avg:39, sr:158, fifties:2, hundreds:0, matches:9  },
    LSG:  { runs:245, avg:35, sr:150, fifties:1, hundreds:0, matches:8  }
  },

  buttler_rr: {
    MI:   { runs:550, avg:72, sr:155, fifties:4, hundreds:1, matches:12 },
    RCB:  { runs:450, avg:45, sr:148, fifties:3, hundreds:1, matches:14 },
    CSK:  { runs:300, avg:30, sr:132, fifties:2, hundreds:0, matches:15 },
    SRH:  { runs:420, avg:42, sr:150, fifties:2, hundreds:1, matches:12 },
    KKR:  { runs:380, avg:38, sr:145, fifties:2, hundreds:1, matches:11 },
    DC:   { runs:350, avg:35, sr:140, fifties:2, hundreds:0, matches:11 },
    PBKS: { runs:360, avg:36, sr:142, fifties:2, hundreds:1, matches:10 },
    GT:   { runs:250, avg:50, sr:145, fifties:2, hundreds:0, matches:5  },
    LSG:  { runs:230, avg:46, sr:148, fifties:2, hundreds:0, matches:5  }
  },

  dhoni_csk: {
    MI:   { runs:750, avg:34, sr:132, fifties:3, hundreds:0, matches:35 },
    RCB:  { runs:850, avg:41, sr:142, fifties:5, hundreds:0, matches:32 },
    KKR:  { runs:550, avg:28, sr:130, fifties:2, hundreds:0, matches:30 },
    PBKS: { runs:650, avg:38, sr:145, fifties:4, hundreds:0, matches:28 },
    RR:   { runs:500, avg:31, sr:125, fifties:2, hundreds:0, matches:25 },
    SRH:  { runs:520, avg:30, sr:135, fifties:3, hundreds:0, matches:22 },
    DC:   { runs:480, avg:28, sr:128, fifties:2, hundreds:0, matches:20 },
    GT:   { runs:195, avg:32, sr:138, fifties:1, hundreds:0, matches:6  },
    LSG:  { runs:175, avg:35, sr:140, fifties:1, hundreds:0, matches:6  }
  },

  pandya_mi: {
    CSK:  { runs:510, avg:32, sr:148, fifties:3, hundreds:0, matches:20 },
    RCB:  { runs:460, avg:34, sr:155, fifties:3, hundreds:0, matches:18 },
    KKR:  { runs:420, avg:30, sr:145, fifties:2, hundreds:0, matches:18 },
    SRH:  { runs:380, avg:28, sr:142, fifties:2, hundreds:0, matches:16 },
    RR:   { runs:350, avg:29, sr:140, fifties:2, hundreds:0, matches:16 },
    DC:   { runs:395, avg:30, sr:148, fifties:2, hundreds:0, matches:15 },
    PBKS: { runs:410, avg:32, sr:150, fifties:3, hundreds:0, matches:15 },
    GT:   { runs:240, avg:34, sr:152, fifties:2, hundreds:0, matches:8  },
    LSG:  { runs:185, avg:37, sr:155, fifties:1, hundreds:0, matches:6  }
  },

  rinku_kkr: {
    MI:   { runs:280, avg:32, sr:156, fifties:2, hundreds:0, matches:10 },
    CSK:  { runs:320, avg:36, sr:160, fifties:3, hundreds:0, matches:10 },
    RCB:  { runs:290, avg:33, sr:158, fifties:2, hundreds:0, matches:10 },
    SRH:  { runs:250, avg:31, sr:154, fifties:2, hundreds:0, matches:9  },
    RR:   { runs:310, avg:34, sr:162, fifties:2, hundreds:0, matches:10 },
    DC:   { runs:275, avg:32, sr:155, fifties:2, hundreds:0, matches:9  },
    PBKS: { runs:300, avg:33, sr:158, fifties:2, hundreds:0, matches:10 },
    GT:   { runs:210, avg:35, sr:160, fifties:1, hundreds:0, matches:6  },
    LSG:  { runs:195, avg:33, sr:156, fifties:1, hundreds:0, matches:6  }
  },

  // ----------------------------------------------------------------
  // ALL-ROUNDERS — both batting + bowling stats in every entry
  // ----------------------------------------------------------------

  narine_kkr: {
    MI:   { runs:420, avg:22, sr:152, fifties:2, hundreds:0, wickets:28, econ:6.8, bbi:"5/19", matches:22 },
    CSK:  { runs:380, avg:20, sr:148, fifties:2, hundreds:0, wickets:24, econ:6.6, bbi:"4/14", matches:21 },
    RCB:  { runs:350, avg:21, sr:155, fifties:1, hundreds:0, wickets:26, econ:7.0, bbi:"4/16", matches:20 },
    SRH:  { runs:290, avg:22, sr:145, fifties:1, hundreds:0, wickets:18, econ:6.8, bbi:"3/16", matches:16 },
    RR:   { runs:310, avg:21, sr:150, fifties:2, hundreds:0, wickets:20, econ:6.6, bbi:"4/14", matches:18 },
    DC:   { runs:320, avg:22, sr:148, fifties:2, hundreds:0, wickets:22, econ:6.8, bbi:"4/16", matches:18 },
    PBKS: { runs:295, avg:23, sr:152, fifties:1, hundreds:0, wickets:19, econ:7.0, bbi:"3/18", matches:16 },
    GT:   { runs:180, avg:22, sr:148, fifties:1, hundreds:0, wickets:10, econ:6.8, bbi:"3/14", matches:6  },
    LSG:  { runs:165, avg:24, sr:150, fifties:1, hundreds:0, wickets:9,  econ:7.0, bbi:"2/16", matches:6  }
  },

  // ----------------------------------------------------------------
  // BOWLERS
  // ----------------------------------------------------------------

  bumrah_mi: {
    RCB:  { wickets:24, econ:7.2, avg:22, bbi:"3/14", matches:18 },
    CSK:  { wickets:12, econ:7.8, avg:35, bbi:"2/10", matches:15 },
    KKR:  { wickets:21, econ:7.1, avg:20, bbi:"5/10", matches:16 },
    SRH:  { wickets:18, econ:7.4, avg:24, bbi:"3/24", matches:14 },
    RR:   { wickets:15, econ:7.5, avg:28, bbi:"4/20", matches:12 },
    DC:   { wickets:23, econ:7.6, avg:21, bbi:"3/17", matches:14 },
    GT:   { wickets:10, econ:7.2, avg:22, bbi:"2/12", matches:5  },
    PBKS: { wickets:19, econ:7.3, avg:23, bbi:"3/15", matches:13 },
    LSG:  { wickets:8,  econ:7.4, avg:25, bbi:"2/18", matches:5  }
  },

  shami_gt: {
    MI:   { wickets:14, econ:8.2, avg:28, bbi:"3/18", matches:10 },
    CSK:  { wickets:16, econ:7.8, avg:26, bbi:"3/22", matches:10 },
    RCB:  { wickets:18, econ:8.0, avg:25, bbi:"4/16", matches:10 },
    KKR:  { wickets:12, econ:8.4, avg:30, bbi:"3/20", matches:9  },
    SRH:  { wickets:10, econ:8.6, avg:32, bbi:"2/18", matches:8  },
    RR:   { wickets:15, econ:8.0, avg:27, bbi:"3/24", matches:9  },
    DC:   { wickets:13, econ:8.2, avg:28, bbi:"3/19", matches:9  },
    PBKS: { wickets:11, econ:8.4, avg:30, bbi:"2/20", matches:8  },
    LSG:  { wickets:9,  econ:8.6, avg:32, bbi:"2/22", matches:7  }
  },

  bhuvi_srh: {
    MI:   { wickets:18, econ:7.4, avg:26, bbi:"3/16", matches:18 },
    CSK:  { wickets:20, econ:7.2, avg:24, bbi:"4/18", matches:18 },
    RCB:  { wickets:22, econ:7.6, avg:25, bbi:"3/14", matches:17 },
    KKR:  { wickets:16, econ:7.8, avg:28, bbi:"3/20", matches:16 },
    RR:   { wickets:14, econ:7.6, avg:27, bbi:"3/18", matches:15 },
    DC:   { wickets:12, econ:7.4, avg:26, bbi:"2/14", matches:14 },
    PBKS: { wickets:15, econ:7.8, avg:28, bbi:"3/22", matches:13 },
    GT:   { wickets:8,  econ:7.6, avg:26, bbi:"2/16", matches:6  },
    LSG:  { wickets:7,  econ:7.8, avg:28, bbi:"2/18", matches:5  }
  },

  chahal_rr: {
    MI:   { wickets:22, econ:7.8, avg:24, bbi:"3/20", matches:20 },
    CSK:  { wickets:18, econ:8.0, avg:26, bbi:"4/18", matches:18 },
    RCB:  { wickets:16, econ:7.6, avg:22, bbi:"5/14", matches:17 },
    KKR:  { wickets:20, econ:7.8, avg:23, bbi:"4/16", matches:17 },
    SRH:  { wickets:24, econ:7.6, avg:21, bbi:"3/18", matches:16 },
    DC:   { wickets:19, econ:7.8, avg:24, bbi:"3/16", matches:16 },
    PBKS: { wickets:17, econ:8.0, avg:25, bbi:"3/20", matches:15 },
    GT:   { wickets:10, econ:7.8, avg:24, bbi:"3/18", matches:7  },
    LSG:  { wickets:9,  econ:8.0, avg:26, bbi:"2/20", matches:7  }
  },

  kuldeep_dc: {
    MI:   { wickets:16, econ:7.8, avg:26, bbi:"3/18", matches:14 },
    CSK:  { wickets:14, econ:7.6, avg:24, bbi:"4/14", matches:14 },
    RCB:  { wickets:18, econ:8.0, avg:24, bbi:"4/16", matches:13 },
    KKR:  { wickets:12, econ:7.8, avg:25, bbi:"3/16", matches:12 },
    SRH:  { wickets:15, econ:7.6, avg:23, bbi:"3/14", matches:12 },
    RR:   { wickets:20, econ:7.8, avg:22, bbi:"4/18", matches:13 },
    PBKS: { wickets:13, econ:8.0, avg:26, bbi:"3/18", matches:11 },
    GT:   { wickets:9,  econ:7.8, avg:25, bbi:"3/16", matches:6  },
    LSG:  { wickets:8,  econ:8.0, avg:27, bbi:"2/18", matches:6  }
  },

  axar_dc: {
    MI:   { wickets:14, econ:7.6, avg:28, bbi:"3/16", matches:16 },
    CSK:  { wickets:16, econ:7.4, avg:26, bbi:"3/14", matches:16 },
    RCB:  { wickets:12, econ:7.8, avg:30, bbi:"2/16", matches:14 },
    KKR:  { wickets:15, econ:7.6, avg:27, bbi:"4/18", matches:15 },
    SRH:  { wickets:13, econ:7.8, avg:28, bbi:"3/20", matches:14 },
    RR:   { wickets:11, econ:7.6, avg:26, bbi:"3/16", matches:14 },
    PBKS: { wickets:10, econ:7.8, avg:28, bbi:"2/18", matches:13 },
    GT:   { wickets:8,  econ:7.6, avg:26, bbi:"2/14", matches:6  },
    LSG:  { wickets:7,  econ:7.8, avg:28, bbi:"2/16", matches:6  }
  },

  varun_kkr: {
    MI:   { wickets:12, econ:7.4, avg:25, bbi:"3/16", matches:10 },
    CSK:  { wickets:14, econ:7.2, avg:23, bbi:"4/14", matches:10 },
    RCB:  { wickets:11, econ:7.6, avg:26, bbi:"3/18", matches:9  },
    SRH:  { wickets:13, econ:7.4, avg:24, bbi:"3/16", matches:9  },
    RR:   { wickets:10, econ:7.6, avg:26, bbi:"3/18", matches:9  },
    DC:   { wickets:12, econ:7.4, avg:25, bbi:"4/16", matches:9  },
    PBKS: { wickets:11, econ:7.8, avg:27, bbi:"3/20", matches:8  },
    GT:   { wickets:8,  econ:7.4, avg:25, bbi:"3/16", matches:5  },
    LSG:  { wickets:7,  econ:7.6, avg:26, bbi:"2/18", matches:5  }
  },

  // ---- ADDITIONAL STARS ----
  sky_mi: {
    CSK:  { runs:620, avg:38, sr:162, fifties:4, hundreds:0, matches:20 },
    RCB:  { runs:580, avg:40, sr:168, fifties:4, hundreds:0, matches:18 },
    KKR:  { runs:540, avg:36, sr:158, fifties:3, hundreds:0, matches:18 },
    SRH:  { runs:495, avg:38, sr:165, fifties:3, hundreds:1, matches:16 },
    RR:   { runs:460, avg:34, sr:160, fifties:3, hundreds:0, matches:16 },
    DC:   { runs:490, avg:36, sr:162, fifties:3, hundreds:0, matches:16 },
    PBKS: { runs:510, avg:38, sr:165, fifties:4, hundreds:0, matches:15 },
    GT:   { runs:260, avg:40, sr:168, fifties:2, hundreds:0, matches:8  },
    LSG:  { runs:220, avg:44, sr:172, fifties:2, hundreds:0, matches:6  }
  },

  faf_rcb: {
    MI:   { runs:620, avg:36, sr:142, fifties:4, hundreds:0, matches:18 },
    CSK:  { runs:540, avg:32, sr:135, fifties:3, hundreds:0, matches:18 },
    KKR:  { runs:590, avg:39, sr:145, fifties:4, hundreds:1, matches:18 },
    SRH:  { runs:510, avg:34, sr:140, fifties:3, hundreds:0, matches:16 },
    RR:   { runs:480, avg:33, sr:138, fifties:3, hundreds:0, matches:16 },
    DC:   { runs:520, avg:36, sr:142, fifties:4, hundreds:0, matches:16 },
    PBKS: { runs:560, avg:38, sr:148, fifties:4, hundreds:0, matches:16 },
    GT:   { runs:380, avg:38, sr:145, fifties:2, hundreds:1, matches:10 },
    LSG:  { runs:285, avg:36, sr:140, fifties:2, hundreds:0, matches:8  }
  },

  pant_dc: {
    MI:   { runs:680, avg:42, sr:168, fifties:5, hundreds:1, matches:20 },
    CSK:  { runs:560, avg:36, sr:165, fifties:4, hundreds:0, matches:18 },
    RCB:  { runs:620, avg:39, sr:170, fifties:5, hundreds:0, matches:18 },
    KKR:  { runs:540, avg:35, sr:162, fifties:4, hundreds:0, matches:18 },
    SRH:  { runs:480, avg:32, sr:158, fifties:3, hundreds:0, matches:16 },
    RR:   { runs:510, avg:34, sr:165, fifties:3, hundreds:0, matches:16 },
    PBKS: { runs:490, avg:33, sr:160, fifties:3, hundreds:0, matches:16 },
    GT:   { runs:340, avg:40, sr:172, fifties:2, hundreds:1, matches:10 },
    LSG:  { runs:280, avg:35, sr:168, fifties:2, hundreds:0, matches:8  }
  },

  maxwell_rcb: {
    MI:   { runs:520, avg:38, sr:162, fifties:4, hundreds:0, matches:16 },
    CSK:  { runs:480, avg:35, sr:158, fifties:3, hundreds:0, matches:16 },
    KKR:  { runs:560, avg:40, sr:168, fifties:4, hundreds:1, matches:16 },
    SRH:  { runs:450, avg:33, sr:155, fifties:3, hundreds:0, matches:14 },
    RR:   { runs:520, avg:39, sr:165, fifties:4, hundreds:1, matches:16 },
    DC:   { runs:480, avg:37, sr:160, fifties:3, hundreds:0, matches:15 },
    PBKS: { runs:500, avg:38, sr:162, fifties:4, hundreds:0, matches:15 },
    GT:   { runs:320, avg:40, sr:165, fifties:2, hundreds:0, matches:8  },
    LSG:  { runs:240, avg:38, sr:160, fifties:2, hundreds:0, matches:6  }
  },

  samson_rr: {
    MI:   { runs:620, avg:32, sr:148, fifties:4, hundreds:1, matches:22 },
    CSK:  { runs:580, avg:34, sr:144, fifties:4, hundreds:0, matches:20 },
    RCB:  { runs:490, avg:28, sr:140, fifties:3, hundreds:1, matches:20 },
    KKR:  { runs:540, avg:36, sr:152, fifties:4, hundreds:0, matches:18 },
    SRH:  { runs:460, avg:30, sr:145, fifties:3, hundreds:0, matches:18 },
    PBKS: { runs:510, avg:34, sr:150, fifties:3, hundreds:1, matches:18 },
    DC:   { runs:480, avg:32, sr:146, fifties:3, hundreds:0, matches:17 },
    GT:   { runs:210, avg:42, sr:158, fifties:2, hundreds:0, matches:6  },
    LSG:  { runs:195, avg:39, sr:152, fifties:1, hundreds:1, matches:6  }
  },

  gill_gt: {
    MI:   { runs:420, avg:35, sr:138, fifties:3, hundreds:0, matches:14 },
    CSK:  { runs:380, avg:34, sr:132, fifties:3, hundreds:0, matches:13 },
    RCB:  { runs:360, avg:36, sr:140, fifties:2, hundreds:1, matches:12 },
    KKR:  { runs:310, avg:31, sr:128, fifties:2, hundreds:0, matches:12 },
    SRH:  { runs:290, avg:29, sr:130, fifties:2, hundreds:0, matches:12 },
    PBKS: { runs:340, avg:34, sr:136, fifties:2, hundreds:1, matches:12 },
    DC:   { runs:300, avg:30, sr:132, fifties:2, hundreds:0, matches:12 },
    LSG:  { runs:210, avg:35, sr:140, fifties:1, hundreds:0, matches:6  }
  },

  head_srh: {
    MI:   { runs:520, avg:38, sr:152, fifties:4, hundreds:0, matches:16 },
    CSK:  { runs:480, avg:32, sr:145, fifties:3, hundreds:0, matches:16 },
    RCB:  { runs:560, avg:40, sr:158, fifties:4, hundreds:1, matches:16 },
    KKR:  { runs:510, avg:36, sr:150, fifties:4, hundreds:0, matches:16 },
    RR:   { runs:470, avg:34, sr:148, fifties:3, hundreds:0, matches:16 },
    DC:   { runs:490, avg:35, sr:152, fifties:3, hundreds:0, matches:16 },
    PBKS: { runs:530, avg:38, sr:155, fifties:4, hundreds:0, matches:15 },
    GT:   { runs:320, avg:40, sr:158, fifties:2, hundreds:0, matches:8  },
    LSG:  { runs:260, avg:36, sr:150, fifties:2, hundreds:0, matches:6  }
  },

  russell_kkr: {
    MI:   { runs:420, avg:32, sr:168, fifties:2, hundreds:0, matches:15 },
    CSK:  { runs:380, avg:28, sr:162, fifties:2, hundreds:0, matches:15 },
    RCB:  { runs:450, avg:35, sr:172, fifties:3, hundreds:0, matches:14 },
    SRH:  { runs:380, avg:30, sr:165, fifties:2, hundreds:0, matches:14 },
    RR:   { runs:410, avg:32, sr:170, fifties:2, hundreds:0, matches:14 },
    DC:   { runs:390, avg:31, sr:168, fifties:2, hundreds:0, matches:13 },
    PBKS: { runs:420, avg:33, sr:172, fifties:3, hundreds:0, matches:13 },
    GT:   { runs:280, avg:35, sr:175, fifties:2, hundreds:0, matches:9  },
    LSG:  { runs:220, avg:32, sr:168, fifties:1, hundreds:0, matches:7  }
  },

  siraj_rcb: {
    MI:   { wickets:18, econ:8.0, avg:26, bbi:"3/16", matches:14 },
    CSK:  { wickets:16, econ:7.8, avg:25, bbi:"3/18", matches:14 },
    KKR:  { wickets:15, econ:7.6, avg:24, bbi:"4/16", matches:13 },
    SRH:  { wickets:12, econ:7.8, avg:28, bbi:"2/18", matches:12 },
    RR:   { wickets:14, econ:8.0, avg:26, bbi:"3/20", matches:12 },
    DC:   { wickets:16, econ:7.8, avg:25, bbi:"3/16", matches:13 },
    PBKS: { wickets:13, econ:8.2, avg:28, bbi:"3/22", matches:12 },
    GT:   { wickets:8,  econ:7.8, avg:26, bbi:"2/18", matches:6  },
    LSG:  { wickets:7,  econ:8.0, avg:28, bbi:"2/20", matches:5  }
  },

  bhuvi_srh: {
    MI:   { wickets:18, econ:7.4, avg:26, bbi:"3/16", matches:18 },
    CSK:  { wickets:20, econ:7.2, avg:24, bbi:"4/18", matches:18 },
    RCB:  { wickets:22, econ:7.6, avg:25, bbi:"3/14", matches:17 },
    KKR:  { wickets:16, econ:7.8, avg:28, bbi:"3/20", matches:16 },
    RR:   { wickets:14, econ:7.6, avg:27, bbi:"3/18", matches:15 },
    DC:   { wickets:12, econ:7.4, avg:26, bbi:"2/14", matches:14 },
    PBKS: { wickets:15, econ:7.8, avg:28, bbi:"3/22", matches:13 },
    GT:   { wickets:8,  econ:7.6, avg:26, bbi:"2/16", matches:6  },
    LSG:  { wickets:7,  econ:7.8, avg:28, bbi:"2/18", matches:5  }
  },

};

// ================================================================
// HELPERS
// ================================================================

// Get player record vs a team
function getPlayerVsTeam(playerId, teamKey) {
  return PLAYER_VS_TEAM[playerId]?.[teamKey] || null;
}

// Get all PvP matchups for a player
function getMatchupsForPlayer(playerId) {
  return DETAILED_MATCHUPS.filter(m => m.bowler === playerId || m.batsman === playerId);
}

// Returns true if player has BOTH batting and bowling stats (all-rounder)
function isAllRounder(playerId, teamKey) {
  const d = PLAYER_VS_TEAM[playerId]?.[teamKey];
  return d ? (d.runs !== undefined && d.wickets !== undefined) : false;
}

// Returns true if player has batting stats only
function isBattingEntry(playerId, teamKey) {
  const d = PLAYER_VS_TEAM[playerId]?.[teamKey];
  return d ? (d.runs !== undefined && d.wickets === undefined) : false;
}

// Returns true if player has bowling stats only
function isBowlingEntry(playerId, teamKey) {
  const d = PLAYER_VS_TEAM[playerId]?.[teamKey];
  return d ? (d.wickets !== undefined && d.runs === undefined) : false;
}