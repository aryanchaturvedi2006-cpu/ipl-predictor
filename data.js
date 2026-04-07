// ================================================================
// IPL PREDICTOR — MASTER DATA FILE  (data.js)
// ================================================================

// ---- TEAM HISTORY ----
// consistencyScore = (playoffs/seasons)*60 + (titles/5)*40
// ----------------------------------------------------------------
// HOW TO UPDATE THIS SECTION EACH YEAR:
// 1. Add 1 to `seasons` for every team that played that year
// 2. Add 1 to `playoffs` for each team that reached playoffs
// 3. If a new champion: add 1 to `titles`, push year to `titleYears`
// 4. Add the new season to IPL_CHAMPIONS array below
// ----------------------------------------------------------------
const TEAM_HISTORY = {
  // seasons = total IPL seasons played (including 2025)
  // playoffs = total playoff appearances
  MI:   { fullName:"Mumbai Indians",              titles:5, titleYears:[2013,2015,2017,2019,2020],       playoffs:10, seasons:19, founded:2008 },
  CSK:  { fullName:"Chennai Super Kings",          titles:5, titleYears:[2010,2011,2018,2021,2023],       playoffs:12, seasons:17, founded:2008, note:"Banned 2 seasons (2016-17)" },
  RCB:  { fullName:"Royal Challengers Bengaluru",  titles:1, titleYears:[2025],                          playoffs:10, seasons:19, founded:2008 },  // 🏆 IPL 2025 Champions!
  KKR:  { fullName:"Kolkata Knight Riders",        titles:3, titleYears:[2012,2014,2024],                playoffs:9,  seasons:19, founded:2008 },
  SRH:  { fullName:"Sunrisers Hyderabad",          titles:1, titleYears:[2016],                          playoffs:8,  seasons:14, founded:2013 },
  PBKS: { fullName:"Punjab Kings",                 titles:0, titleYears:[],                             playoffs:7,  seasons:19, founded:2008 },
  RR:   { fullName:"Rajasthan Royals",             titles:1, titleYears:[2008],                          playoffs:8,  seasons:17, founded:2008, note:"Banned 2 seasons (2016-17)" },
  DC:   { fullName:"Delhi Capitals",               titles:0, titleYears:[],                             playoffs:9,  seasons:19, founded:2008, note:"Formerly Delhi Daredevils" },
  GT:   { fullName:"Gujarat Titans",               titles:1, titleYears:[2022],                          playoffs:3,  seasons:5,  founded:2022 },
  LSG:  { fullName:"Lucknow Super Giants",         titles:0, titleYears:[],                             playoffs:2,  seasons:5,  founded:2022 },
};

// ---- IPL CHAMPIONS TIMELINE ----
// ----------------------------------------------------------------
// HOW TO UPDATE: After each IPL season, add a new entry here:
// { year: YYYY, team: "TEAM_KEY", trophy: "🏆", score: "Final scorecard" }
// TEAM_KEY must match the keys in TEAMS object (MI, CSK, RCB, etc.)
// ----------------------------------------------------------------
const IPL_CHAMPIONS = [
  { year:2008, team:"RR",   trophy:"🏆", score:"163/5 vs CSK 164/7" },
  { year:2009, team:"DC",   trophy:"🏆", score:"143/4 vs RCB 139/9",  note:"Played in South Africa" },
  { year:2010, team:"CSK",  trophy:"🏆", score:"168/5 vs MI 172/5" },
  { year:2011, team:"CSK",  trophy:"🏆", score:"205/5 vs RCB 147/8" },
  { year:2012, team:"KKR",  trophy:"🏆", score:"190/4 vs CSK 178/7" },
  { year:2013, team:"MI",   trophy:"🏆", score:"148/9 vs CSK 125/9" },
  { year:2014, team:"KKR",  trophy:"🏆", score:"199/7 vs PBKS 163/6" },
  { year:2015, team:"MI",   trophy:"🏆", score:"202/4 vs CSK 178/6" },
  { year:2016, team:"SRH",  trophy:"🏆", score:"208/7 vs RCB 200/7" },
  { year:2017, team:"MI",   trophy:"🏆", score:"129/8 vs RPS 130/9" },
  { year:2018, team:"CSK",  trophy:"🏆", score:"181/5 vs SRH 178/6" },
  { year:2019, team:"MI",   trophy:"🏆", score:"149/8 vs CSK 148/7" },
  { year:2020, team:"MI",   trophy:"🏆", score:"157/5 vs DC 135/7" },
  { year:2021, team:"CSK",  trophy:"🏆", score:"192/3 vs KKR 165/9" },
  { year:2022, team:"GT",   trophy:"🏆", score:"207/6 vs RR 193/9" },
  { year:2023, team:"CSK",  trophy:"🏆", score:"171/7 vs GT 157/9" },
  { year:2024, team:"KKR",  trophy:"🏆", score:"169/8 vs SRH 113/10" },
  { year:2025, team:"RCB",  trophy:"🏆", score:"IPL 2025 Final",        note:"RCB's first ever IPL title! 🎉" },
  // ✏️ ADD NEXT YEAR HERE ↓
  // { year:2026, team:"???", trophy:"🏆", score:"Final scorecard" },
];

// ---- TEAMS WITH SQUADS ----
const TEAMS = {
  MI: {
    name:"Mumbai Indians", shortName:"MI", city:"Mumbai",
    primaryColor:"#004FC7", secondaryColor:"#D4AF37",
    pacerQuality:88, spinnerQuality:70,
    battingVsPace:80, battingVsSpin:78,
    powerHitting:88, fielding:82, allRounderQuality:80, battingDepth:84,
    recentForm: ["W", "L", "W", "W", "L"],
    players: [
      { id:"rohit_mi",    name:"Rohit Sharma",       role:"Batsman",     nat:"IND", bat:88, bowl:5,  isCaptain:true, vulnerability:"Left-arm swing", strengthZone:"Pull/Hook", preferredLength:"Short" },
      { id:"sky_mi",      name:"Suryakumar Yadav",   role:"Batsman",     nat:"IND", bat:92, bowl:5, vulnerability:"Good length away from off-stump", strengthZone:"Square cut and reverse sweep", preferredLength:"Short" },
      { id:"pandya_mi",   name:"Hardik Pandya",      role:"All-Rounder", nat:"IND", bat:80, bowl:78, vulnerability:"Full and wide deliveries", strengthZone:"Deep mid-wicket and lofted straight", preferredLength:"Good" },
      { id:"bumrah_mi",   name:"Jasprit Bumrah",     role:"Pacer",       nat:"IND", bat:12, bowl:98, vulnerability:"Yorker-length", strengthZone:"Fine Leg", preferredLength:"Full" },
      { id:"kishan_mi",   name:"Ishan Kishan",       role:"WK-Batsman",  nat:"IND", bat:78, bowl:0, vulnerability:"Bouncers at head", strengthZone:"Square Cut", preferredLength:"Short" },
      { id:"tilak_mi",    name:"Tilak Varma",        role:"Batsman",     nat:"IND", bat:80, bowl:8, vulnerability:"Off-spin", strengthZone:"Lofted Drive", preferredLength:"Full" },
      { id:"timdavid_mi", name:"Tim David",          role:"Batsman",     nat:"SGP", bat:84, bowl:5  },
      { id:"nehal_mi",    name:"Naman Dhir",         name:"Naman Dhir",  role:"All-Rounder", nat:"IND", bat:72, bowl:60 },
      { id:"shreyas_mi",  name:"Shreyas Gopal",      role:"Spinner",     nat:"IND", bat:25, bowl:78 },
      { id:"coetzee_mi",  name:"Gerald Coetzee",     role:"Pacer",       nat:"SA",  bat:22, bowl:80 },
      { id:"thushara_mi", name:"Nuwan Thushara",     role:"Pacer",       nat:"SL",  bat:18, bowl:78 },
      { id:"maphaka_mi",  name:"Kwena Maphaka",      role:"Pacer",       nat:"SA",  bat:8,  bowl:75 },
    ],
    keyMatchups: {
      CSK: { myDismissals:115, theirDismissals:102, myBatsmanAvg:31, theirBatsmanAvg:26 },
      RCB: { myDismissals:124, theirDismissals:90,  myBatsmanAvg:28, theirBatsmanAvg:22 },
      KKR: { myDismissals:98,  theirDismissals:95,  myBatsmanAvg:30, theirBatsmanAvg:28 },
      SRH: { myDismissals:105, theirDismissals:92,  myBatsmanAvg:32, theirBatsmanAvg:25 },
      RR:  { myDismissals:90,  theirDismissals:82,  myBatsmanAvg:30, theirBatsmanAvg:27 },
      DC:  { myDismissals:96,  theirDismissals:84,  myBatsmanAvg:31, theirBatsmanAvg:26 },
      GT:  { myDismissals:85,  theirDismissals:82,  myBatsmanAvg:29, theirBatsmanAvg:28 },
      LSG: { myDismissals:88,  theirDismissals:78,  myBatsmanAvg:30, theirBatsmanAvg:25 },
      PBKS:{ myDismissals:102, theirDismissals:88,  myBatsmanAvg:32, theirBatsmanAvg:24 },
    }
  },
  CSK: {
    name:"Chennai Super Kings", shortName:"CSK", city:"Chennai",
    primaryColor:"#F5A623", secondaryColor:"#1A3A5C",
    pacerQuality:72, spinnerQuality:90,
    battingVsPace:84, battingVsSpin:88,
    powerHitting:76, fielding:80, allRounderQuality:88, battingDepth:82,
    recentForm: ["W", "W", "W", "L", "W"],
    players: [
      { id:"dhoni_csk",    name:"MS Dhoni",           role:"WK-Batsman",  nat:"IND", bat:82, bowl:0,  isCaptain:true, vulnerability:"Wide Yorker", strengthZone:"Long-on/Off", preferredLength:"Full" },
      { id:"rutu_csk",     name:"Ruturaj Gaikwad",    role:"Batsman",     nat:"IND", bat:84, bowl:5, vulnerability:"In-swinging deliveries", strengthZone:"Extra cover and the drive through the off-side", preferredLength:"Good" },
      { id:"jadeja_csk",   name:"Ravindra Jadeja",    role:"All-Rounder", nat:"IND", bat:78, bowl:86, vulnerability:"Fast Bouncer", strengthZone:"Mid-wicket", preferredLength:"Short" },
      { id:"pathirana_csk",name:"Matheesha Pathirana", role:"Pacer",      nat:"SL",  bat:12, bowl:88, vulnerability:"Full Toss", strengthZone:"Straight", preferredLength:"Full" },
      { id:"deepak_csk",   name:"Deepak Chahar",      role:"Pacer",       nat:"IND", bat:30, bowl:82, vulnerability:"Flat pitch", strengthZone:"Lofted Over Mid-on", preferredLength:"Full" },
      { id:"conway_csk",   name:"Devon Conway",       role:"WK-Batsman",  nat:"NZ",  bat:80, bowl:0, vulnerability:"Leg-spin", strengthZone:"Reverse Sweep", preferredLength:"Good" },
      { id:"dube_csk",     name:"Shivam Dube",        role:"All-Rounder", nat:"IND", bat:76, bowl:68, vulnerability:"Pace over 145kmph", strengthZone:"Long-on", preferredLength:"Full" },
      { id:"moeen_csk",    name:"Moeen Ali",          role:"All-Rounder", nat:"ENG", bat:74, bowl:75 },
      { id:"theek_csk",    name:"Maheesh Theekshana", role:"Spinner",     nat:"SL",  bat:18, bowl:84 },
      { id:"tushar_csk",   name:"Tushar Deshpande",   role:"Pacer",       nat:"IND", bat:15, bowl:78 },
      { id:"rachin_csk",   name:"Rachin Ravindra",    role:"All-Rounder", nat:"NZ",  bat:78, bowl:68 },
      { id:"rahane_csk",   name:"Ajinkya Rahane",     role:"Batsman",     nat:"IND", bat:74, bowl:5  },
    ],
    keyMatchups: {
      MI:  { myDismissals:102, theirDismissals:115, myBatsmanAvg:26, theirBatsmanAvg:31 },
      RCB: { myDismissals:108, theirDismissals:92,  myBatsmanAvg:30, theirBatsmanAvg:25 },
      KKR: { myDismissals:100, theirDismissals:96,  myBatsmanAvg:29, theirBatsmanAvg:27 },
      SRH: { myDismissals:96,  theirDismissals:88,  myBatsmanAvg:30, theirBatsmanAvg:26 },
      RR:  { myDismissals:94,  theirDismissals:86,  myBatsmanAvg:31, theirBatsmanAvg:25 },
      DC:  { myDismissals:92,  theirDismissals:80,  myBatsmanAvg:32, theirBatsmanAvg:24 },
      GT:  { myDismissals:80,  theirDismissals:78,  myBatsmanAvg:29, theirBatsmanAvg:27 },
      LSG: { myDismissals:82,  theirDismissals:74,  myBatsmanAvg:30, theirBatsmanAvg:24 },
      PBKS:{ myDismissals:92,  theirDismissals:78,  myBatsmanAvg:33, theirBatsmanAvg:25 },
    }
  },
  RCB: {
    name:"Royal Challengers Bengaluru", shortName:"RCB", city:"Bengaluru",
    primaryColor:"#EC1C24", secondaryColor:"#000000",
    pacerQuality:78, spinnerQuality:70,
    battingVsPace:90, battingVsSpin:80,
    powerHitting:95, fielding:68, allRounderQuality:72, battingDepth:72,
    recentForm: ["W", "L", "L", "W", "W"],
    players: [
      { id:"kohli_rcb",   name:"Virat Kohli",        role:"Batsman",     nat:"IND", bat:98, bowl:8, vulnerability:"Wide outside off-stump", strengthZone:"Cover Drive", preferredLength:"Full" },
      { id:"faf_rcb",     name:"Faf du Plessis",     role:"Batsman",     nat:"SA",  bat:82, bowl:5,   isCaptain:true, vulnerability:"In-swinging delivery", strengthZone:"Lofted Straight", preferredLength:"Full" },
      { id:"maxwell_rcb", name:"Glenn Maxwell",      role:"All-Rounder", nat:"AUS", bat:86, bowl:72, vulnerability:"Left-arm orthodox", strengthZone:"Reverse Scoop", preferredLength:"Short" },
      { id:"siraj_rcb",   name:"Mohammed Siraj",     role:"Pacer",       nat:"IND", bat:18, bowl:84, vulnerability:"Short ball", strengthZone:"Lofted Over Mid-off", preferredLength:"Good" },
      { id:"green_rcb",   name:"Cameron Green",      role:"All-Rounder", nat:"AUS", bat:78, bowl:72, vulnerability:"Spin at body", strengthZone:"Pull", preferredLength:"Short" },
      { id:"patidar_rcb", name:"Rajat Patidar",      role:"Batsman",     nat:"IND", bat:78, bowl:5, vulnerability:"Slow balls and low full tosses", strengthZone:"Loft over mid-on and late cut", preferredLength:"Full" },
      { id:"dk_rcb",      name:"Dinesh Karthik",     role:"WK-Batsman",  nat:"IND", bat:76, bowl:0, vulnerability:"Hard-length", strengthZone:"Scoop/Behind Square", preferredLength:"Full" },
      { id:"willey_rcb",  name:"David Willey",       role:"Pacer",       nat:"ENG", bat:58, bowl:76 },
      { id:"swapnil_rcb", name:"Swapnil Singh",      role:"Spinner",     nat:"IND", bat:42, bowl:72 },
      { id:"anuj_rcb",    name:"Anuj Rawat",         role:"WK-Batsman",  nat:"IND", bat:70, bowl:0  },
      { id:"reece_rcb",   name:"Reece Topley",       role:"Pacer",       nat:"ENG", bat:10, bowl:78 },
      { id:"yash_rcb",    name:"Yash Dayal",         role:"Pacer",       nat:"IND", bat:8,  bowl:74 },
    ],
    keyMatchups: {
      MI:  { myDismissals:90,  theirDismissals:124, myBatsmanAvg:22, theirBatsmanAvg:28 },
      CSK: { myDismissals:92,  theirDismissals:108, myBatsmanAvg:25, theirBatsmanAvg:30 },
      KKR: { myDismissals:85,  theirDismissals:96,  myBatsmanAvg:24, theirBatsmanAvg:28 },
      SRH: { myDismissals:88,  theirDismissals:94,  myBatsmanAvg:25, theirBatsmanAvg:27 },
      RR:  { myDismissals:82,  theirDismissals:86,  myBatsmanAvg:26, theirBatsmanAvg:28 },
      DC:  { myDismissals:86,  theirDismissals:80,  myBatsmanAvg:26, theirBatsmanAvg:25 },
      PBKS:{ myDismissals:88,  theirDismissals:82,  myBatsmanAvg:28, theirBatsmanAvg:24 },
    }
  },
  KKR: {
    name:"Kolkata Knight Riders", shortName:"KKR", city:"Kolkata",
    primaryColor:"#3A225D", secondaryColor:"#D4AF37",
    pacerQuality:80, spinnerQuality:87,
    battingVsPace:78, battingVsSpin:80,
    powerHitting:84, fielding:82, allRounderQuality:84, battingDepth:80,
    players: [
      { id:"shreyas_kkr",  name:"Shreyas Iyer",      role:"Batsman",     nat:"IND", bat:84, bowl:5,   isCaptain:true },
      { id:"narine_kkr",   name:"Sunil Narine",      role:"All-Rounder", nat:"WI",  bat:78, bowl:88, vulnerability:"Full ball on leg stump", strengthZone:"Slog sweep and deep mid-wicket", preferredLength:"Short" },
      { id:"russell_kkr",  name:"Andre Russell",     role:"All-Rounder", nat:"WI",  bat:90, bowl:80 },
      { id:"starc_kkr",    name:"Mitchell Starc",    role:"Pacer",       nat:"AUS", bat:28, bowl:88 },
      { id:"salt_kkr",     name:"Phil Salt",         role:"WK-Batsman",  nat:"ENG", bat:82, bowl:0, vulnerability:"Good-length deliveries on middle stump", strengthZone:"Pull and switch-hit", preferredLength:"Short" },
      { id:"rinku_kkr",    name:"Rinku Singh",       role:"Batsman",     nat:"IND", bat:82, bowl:5  },
      { id:"venky_kkr",    name:"Venkatesh Iyer",    role:"All-Rounder", nat:"IND", bat:78, bowl:65 },
      { id:"varun_kkr",    name:"Varun Chakravarthy",role:"Spinner",     nat:"IND", bat:18, bowl:84, vulnerability:"Back-of-length on leg stump", strengthZone:"Drift and top-spin around off", preferredLength:"Good" },
      { id:"harshit_kkr",  name:"Harshit Rana",      role:"Pacer",       nat:"IND", bat:26, bowl:78 },
      { id:"angkrish_kkr", name:"Angkrish Raghuvanshi",role:"Batsman",   nat:"IND", bat:74, bowl:5  },
      { id:"chetan_kkr",   name:"Chetan Sakariya",   role:"Pacer",       nat:"IND", bat:12, bowl:76 },
      { id:"manish_kkr",   name:"Manish Pandey",     role:"Batsman",     nat:"IND", bat:76, bowl:5  },
    ],
    keyMatchups: {
      MI:  { myDismissals:95,  theirDismissals:98,  myBatsmanAvg:28, theirBatsmanAvg:30 },
      CSK: { myDismissals:96,  theirDismissals:100, myBatsmanAvg:27, theirBatsmanAvg:29 },
      RCB: { myDismissals:96,  theirDismissals:85,  myBatsmanAvg:28, theirBatsmanAvg:24 },
      SRH: { myDismissals:88,  theirDismissals:84,  myBatsmanAvg:29, theirBatsmanAvg:27 },
      RR:  { myDismissals:86,  theirDismissals:82,  myBatsmanAvg:28, theirBatsmanAvg:26 },
      DC:  { myDismissals:90,  theirDismissals:82,  myBatsmanAvg:29, theirBatsmanAvg:26 },
    }
  },
  SRH: {
    name:"Sunrisers Hyderabad", shortName:"SRH", city:"Hyderabad",
    primaryColor:"#FF6500", secondaryColor:"#1A1A1A",
    pacerQuality:86, spinnerQuality:74,
    battingVsPace:80, battingVsSpin:75,
    powerHitting:86, fielding:76, allRounderQuality:76, battingDepth:78,
    players: [
      { id:"cummins_srh",  name:"Pat Cummins",        role:"Pacer",       nat:"AUS", bat:52, bowl:92, isCaptain:true },
      { id:"head_srh",     name:"Travis Head",        role:"Batsman",     nat:"AUS", bat:88, bowl:30 },
      { id:"klaasen_srh",  name:"Heinrich Klaasen",   role:"WK-Batsman",  nat:"SA",  bat:88, bowl:0  },
      { id:"abhi_srh",     name:"Abhishek Sharma",    role:"All-Rounder", nat:"IND", bat:80, bowl:68 },
      { id:"bhuvi_srh",    name:"Bhuvneshwar Kumar",  role:"Pacer",       nat:"IND", bat:30, bowl:84, vulnerability:"Full tosses and slow cutters", strengthZone:"Out-swing to right-handers", preferredLength:"Full" },
      { id:"natarajan_srh",name:"T Natarajan",        role:"Pacer",       nat:"IND", bat:15, bowl:80 },
      { id:"nitish_srh",   name:"Nitish Kumar Reddy", role:"All-Rounder", nat:"IND", bat:76, bowl:70 },
      { id:"anmol_srh",    name:"Anmolpreet Singh",   role:"Batsman",     nat:"IND", bat:72, bowl:5  },
      { id:"marco_srh",    name:"Marco Jansen",       role:"Pacer",       nat:"SA",  bat:42, bowl:80 },
      { id:"jaydev_srh",   name:"Jaydev Unadkat",     role:"Pacer",       nat:"IND", bat:18, bowl:76 },
      { id:"shahbaz_srh",  name:"Shahbaz Ahmed",      role:"All-Rounder", nat:"IND", bat:68, bowl:72 },
      { id:"aiden_srh",    name:"Aiden Markram",      role:"Batsman",     nat:"SA",  bat:80, bowl:45 },
    ],
    keyMatchups: {
      MI:  { myDismissals:92,  theirDismissals:105, myBatsmanAvg:25, theirBatsmanAvg:32 },
      CSK: { myDismissals:88,  theirDismissals:96,  myBatsmanAvg:26, theirBatsmanAvg:30 },
      KKR: { myDismissals:84,  theirDismissals:88,  myBatsmanAvg:27, theirBatsmanAvg:29 },
      RR:  { myDismissals:86,  theirDismissals:80,  myBatsmanAvg:28, theirBatsmanAvg:26 },
      DC:  { myDismissals:90,  theirDismissals:82,  myBatsmanAvg:29, theirBatsmanAvg:25 },
    }
  },
  PBKS: {
    name:"Punjab Kings", shortName:"PBKS", city:"Mohali",
    primaryColor:"#D71920", secondaryColor:"#A7A9AC",
    pacerQuality:80, spinnerQuality:74,
    battingVsPace:82, battingVsSpin:76,
    powerHitting:84, fielding:72, allRounderQuality:76, battingDepth:78,
    players: [
      { id:"dhawan_pbks",  name:"Shikhar Dhawan",    role:"Batsman",     nat:"IND", bat:80, bowl:5,  isCaptain:true },
      { id:"living_pbks",  name:"Liam Livingstone",  role:"All-Rounder", nat:"ENG", bat:84, bowl:72 },
      { id:"curran_pbks",  name:"Sam Curran",        role:"All-Rounder", nat:"ENG", bat:72, bowl:80 },
      { id:"arsh_pbks",    name:"Arshdeep Singh",    role:"Pacer",       nat:"IND", bat:22, bowl:82 },
      { id:"bairstow_pbks",name:"Jonny Bairstow",    role:"WK-Batsman",  nat:"ENG", bat:82, bowl:0  },
      { id:"rabada_pbks",  name:"Kagiso Rabada",     role:"Pacer",       nat:"SA",  bat:30, bowl:88 },
      { id:"rossouw_pbks", name:"Rilee Rossouw",     role:"Batsman",     nat:"SA",  bat:82, bowl:5  },
      { id:"jitesh_pbks",  name:"Jitesh Sharma",     role:"WK-Batsman",  nat:"IND", bat:76, bowl:0  },
      { id:"bhanuka_pbks", name:"Bhanuka Rajapaksa", role:"Batsman",     nat:"SL",  bat:78, bowl:5  },
      { id:"harshal_pbks", name:"Harshal Patel",     role:"Pacer",       nat:"IND", bat:28, bowl:80 },
      { id:"sikandar_pbks",name:"Sikandar Raza",     role:"All-Rounder", nat:"ZIM", bat:72, bowl:72 },
      { id:"rahul_pbks",   name:"Rahul Chahar",      role:"Spinner",     nat:"IND", bat:22, bowl:78 },
    ],
    keyMatchups: {
      RCB: { myDismissals:82, theirDismissals:88, myBatsmanAvg:24, theirBatsmanAvg:28 },
      RR:  { myDismissals:78, theirDismissals:76, myBatsmanAvg:26, theirBatsmanAvg:27 },
    }
  },
  RR: {
    name:"Rajasthan Royals", shortName:"RR", city:"Jaipur",
    primaryColor:"#E8436B", secondaryColor:"#1A3A5C",
    pacerQuality:76, spinnerQuality:84,
    battingVsPace:80, battingVsSpin:84,
    powerHitting:82, fielding:80, allRounderQuality:82, battingDepth:80,
    players: [
      { id:"samson_rr",    name:"Sanju Samson",      role:"WK-Batsman",  nat:"IND", bat:86, bowl:0,   isCaptain:true, vulnerability:"In-swinging yorkers", strengthZone:"Deep mid-wicket and lofted cover", preferredLength:"Full" },
      { id:"buttler_rr",   name:"Jos Buttler",       role:"WK-Batsman",  nat:"ENG", bat:90, bowl:0  },
      { id:"jaiswal_rr",   name:"Yashasvi Jaiswal",  role:"Batsman",     nat:"IND", bat:88, bowl:5, vulnerability:"Straight mid-on boundaries", strengthZone:"Back-foot punch and lofted on-side drives", preferredLength:"Full" },
      { id:"chahal_rr",    name:"Yuzvendra Chahal",  role:"Spinner",     nat:"IND", bat:12, bowl:88, vulnerability:"Batsmen hitting over mid-wicket", strengthZone:"Flight and deceptive googly", preferredLength:"Good" },
      { id:"boult_rr",     name:"Trent Boult",       role:"Pacer",       nat:"NZ",  bat:15, bowl:88 },
      { id:"hetmyer_rr",   name:"Shimron Hetmyer",   role:"Batsman",     nat:"WI",  bat:84, bowl:5  },
      { id:"ashwin_rr",    name:"R. Ashwin",         role:"All-Rounder", nat:"IND", bat:52, bowl:84 },
      { id:"parag_rr",     name:"Riyan Parag",       role:"All-Rounder", nat:"IND", bat:78, bowl:65 },
      { id:"prasidh_rr",   name:"Prasidh Krishna",   role:"Pacer",       nat:"IND", bat:12, bowl:80 },
      { id:"sandeep_rr",   name:"Sandeep Sharma",    role:"Pacer",       nat:"IND", bat:8,  bowl:76 },
      { id:"dhruv_rr",     name:"Dhruv Jurel",       role:"WK-Batsman",  nat:"IND", bat:74, bowl:0  },
      { id:"kuldeep_rr",   name:"Kuldeep Sen",       role:"Pacer",       nat:"IND", bat:8,  bowl:74 },
    ],
    keyMatchups: {
      GT:  { myDismissals:80, theirDismissals:88, myBatsmanAvg:25, theirBatsmanAvg:30 },
      DC:  { myDismissals:80, theirDismissals:78, myBatsmanAvg:27, theirBatsmanAvg:26 },
    }
  },
  DC: {
    name:"Delhi Capitals", shortName:"DC", city:"Delhi",
    primaryColor:"#0078BC", secondaryColor:"#EF1C25",
    pacerQuality:82, spinnerQuality:76,
    battingVsPace:76, battingVsSpin:80,
    powerHitting:78, fielding:78, allRounderQuality:78, battingDepth:76,
    players: [
      { id:"pant_dc",     name:"Rishabh Pant",       role:"WK-Batsman",  nat:"IND", bat:88, bowl:0,   isCaptain:true, vulnerability:"Good length away from off stump", strengthZone:"Reverse sweep and scoop", preferredLength:"Short" },
      { id:"warner_dc",   name:"David Warner",       role:"Batsman",     nat:"AUS", bat:86, bowl:5  },
      { id:"axar_dc",     name:"Axar Patel",         role:"All-Rounder", nat:"IND", bat:72, bowl:82, vulnerability:"Short pitched deliveries", strengthZone:"Back of a length into the right-hander", preferredLength:"Good" },
      { id:"nortje_dc",   name:"Anrich Nortje",      role:"Pacer",       nat:"SA",  bat:15, bowl:90 },
      { id:"kuldeep_dc",  name:"Kuldeep Yadav",      role:"Spinner",     nat:"IND", bat:18, bowl:86, vulnerability:"Paced full deliveries", strengthZone:"Chinaman drift and top-spin", preferredLength:"Good" },
      { id:"marsh_dc",    name:"Mitchell Marsh",     role:"All-Rounder", nat:"AUS", bat:82, bowl:72 },
      { id:"abhishek_dc", name:"Abhishek Porel",     role:"WK-Batsman",  nat:"IND", bat:74, bowl:0  },
      { id:"mukesh_dc",   name:"Mukesh Kumar",       role:"Pacer",       nat:"IND", bat:12, bowl:78 },
      { id:"tristan_dc",  name:"Tristan Stubbs",     role:"Batsman",     nat:"SA",  bat:78, bowl:5  },
      { id:"ishant_dc",   name:"Ishant Sharma",      role:"Pacer",       nat:"IND", bat:10, bowl:74 },
      { id:"yash_dc",     name:"Yash Dhull",         role:"Batsman",     nat:"IND", bat:72, bowl:5  },
      { id:"ripal_dc",    name:"Ripal Patel",        role:"All-Rounder", nat:"IND", bat:68, bowl:60 },
    ],
    keyMatchups: {}
  },
  GT: {
    name:"Gujarat Titans", shortName:"GT", city:"Ahmedabad",
    primaryColor:"#1C2B5E", secondaryColor:"#C8A951",
    pacerQuality:86, spinnerQuality:80,
    battingVsPace:78, battingVsSpin:82,
    powerHitting:80, fielding:84, allRounderQuality:84, battingDepth:80,
    players: [
      { id:"gill_gt",     name:"Shubman Gill",       role:"Batsman",     nat:"IND", bat:90, bowl:5,   isCaptain:true, vulnerability:"Leg-spin drift and low full tosses", strengthZone:"Cover drive and back-foot punch", preferredLength:"Full" },
      { id:"shami_gt",    name:"Mohammed Shami",     role:"Pacer",       nat:"IND", bat:18, bowl:92, vulnerability:"Short balls at mid-wicket", strengthZone:"Back of length with late movement", preferredLength:"Good" },
      { id:"rashid_gt",   name:"Rashid Khan",        role:"All-Rounder", nat:"AFG", bat:58, bowl:96 },
      { id:"miller_gt",   name:"David Miller",       role:"Batsman",     nat:"SA",  bat:86, bowl:5, vulnerability:"In-swinging yorkers", strengthZone:"Deep mid-wicket and the late cut", preferredLength:"Full" },
      { id:"wade_gt",     name:"Matthew Wade",       role:"WK-Batsman",  nat:"AUS", bat:76, bowl:0  },
      { id:"omarzai_gt",  name:"Azmatullah Omarzai", role:"All-Rounder", nat:"AFG", bat:72, bowl:75 },
      { id:"noor_gt",     name:"Noor Ahmad",         role:"Spinner",     nat:"AFG", bat:12, bowl:84 },
      { id:"sai_gt",      name:"B. Sai Sudharsan",   role:"Batsman",     nat:"IND", bat:80, bowl:5, vulnerability:"Short balls outside off", strengthZone:"Lofted cover drives and long-off clears", preferredLength:"Full" },
      { id:"mohit_gt",    name:"Mohit Sharma",       role:"Pacer",       nat:"IND", bat:12, bowl:78 },
      { id:"vijay_gt",    name:"V. Shankar",         role:"All-Rounder", nat:"IND", bat:68, bowl:68 },
      { id:"jayant_gt",   name:"Jayant Yadav",       role:"All-Rounder", nat:"IND", bat:48, bowl:72 },
      { id:"darshan_gt",  name:"Darshan Nalkande",   role:"Pacer",       nat:"IND", bat:10, bowl:74 },
    ],
    keyMatchups: {
      RR:  { myDismissals:88, theirDismissals:80, myBatsmanAvg:30, theirBatsmanAvg:25 },
      MI:  { myDismissals:82, theirDismissals:85, myBatsmanAvg:28, theirBatsmanAvg:29 },
      LSG: { myDismissals:84, theirDismissals:76, myBatsmanAvg:30, theirBatsmanAvg:26 },
    }
  },
  LSG: {
    name:"Lucknow Super Giants", shortName:"LSG", city:"Lucknow",
    primaryColor:"#A72056", secondaryColor:"#00AEEF",
    pacerQuality:78, spinnerQuality:76,
    battingVsPace:78, battingVsSpin:76,
    powerHitting:80, fielding:76, allRounderQuality:76, battingDepth:78,
    players: [
      { id:"rahul_lsg",   name:"KL Rahul",           role:"WK-Batsman",  nat:"IND", bat:88, bowl:0,   isCaptain:true },
      { id:"pooran_lsg",  name:"Nicholas Pooran",    role:"WK-Batsman",  nat:"WI",  bat:86, bowl:0  },
      { id:"stoinis_lsg", name:"Marcus Stoinis",     role:"All-Rounder", nat:"AUS", bat:80, bowl:72 },
      { id:"wood_lsg",    name:"Mark Wood",          role:"Pacer",       nat:"ENG", bat:20, bowl:88 },
      { id:"bishnoi_lsg", name:"Ravi Bishnoi",       role:"Spinner",     nat:"IND", bat:15, bowl:84 },
      { id:"deKock_lsg",  name:"Quinton de Kock",    role:"WK-Batsman",  nat:"SA",  bat:86, bowl:0  },
      { id:"krunal_lsg",  name:"Krunal Pandya",      role:"All-Rounder", nat:"IND", bat:72, bowl:74 },
      { id:"mohsin_lsg",  name:"Mohsin Khan",        role:"Pacer",       nat:"IND", bat:10, bowl:80 },
      { id:"hooda_lsg",   name:"Deepak Hooda",       role:"All-Rounder", nat:"IND", bat:74, bowl:65 },
      { id:"badoni_lsg",  name:"Ayush Badoni",       role:"Batsman",     nat:"IND", bat:74, bowl:5  },
      { id:"naveen_lsg",  name:"Naveen ul Haq",      role:"Pacer",       nat:"AFG", bat:12, bowl:76 },
      { id:"amit_lsg",    name:"Amit Mishra",        role:"Spinner",     nat:"IND", bat:10, bowl:74 },
    ],
    keyMatchups: {}
  }
};

// ---- VENUES ----
const VENUES = {
  Wankhede:      { name:"Wankhede Stadium",                city:"Mumbai",     homeTeam:"MI",   dimensions:"small",   defaultPitch:"flat",  dewFactor:"high",   batFirstWinPct:40, chaseWinPct:60, avgScore:178, teamWinPct:{MI:68,CSK:38,RCB:45,KKR:50,SRH:42,PBKS:44,RR:48,DC:40,GT:46,LSG:44}, groundDimensions:"150m × 130m" },
  Chepauk:       { name:"MA Chidambaram Stadium",          city:"Chennai",    homeTeam:"CSK",  dimensions:"average", defaultPitch:"dry",   dewFactor:"medium", batFirstWinPct:55, chaseWinPct:45, avgScore:162, teamWinPct:{MI:38,CSK:72,RCB:42,KKR:44,SRH:45,PBKS:40,RR:44,DC:44,GT:46,LSG:40}, groundDimensions:"160m × 140m" },
  Chinnaswamy:   { name:"M. Chinnaswamy Stadium",          city:"Bengaluru",  homeTeam:"RCB",  dimensions:"small",   defaultPitch:"flat",  dewFactor:"low",    batFirstWinPct:52, chaseWinPct:48, avgScore:185, teamWinPct:{MI:44,CSK:48,RCB:62,KKR:48,SRH:48,PBKS:46,RR:50,DC:46,GT:48,LSG:46}, groundDimensions:"155m × 140m" },
  EdenGardens:   { name:"Eden Gardens",                    city:"Kolkata",    homeTeam:"KKR",  dimensions:"large",   defaultPitch:"flat",  dewFactor:"high",   batFirstWinPct:45, chaseWinPct:55, avgScore:168, teamWinPct:{MI:44,CSK:50,RCB:46,KKR:70,SRH:44,PBKS:46,RR:48,DC:46,GT:48,LSG:44}, groundDimensions:"173m × 146m" },
  RajivGandhi:   { name:"Rajiv Gandhi Intl. Stadium",      city:"Hyderabad",  homeTeam:"SRH",  dimensions:"average", defaultPitch:"flat",  dewFactor:"high",   batFirstWinPct:42, chaseWinPct:58, avgScore:172, teamWinPct:{MI:46,CSK:44,RCB:44,KKR:46,SRH:68,PBKS:42,RR:46,DC:44,GT:46,LSG:44}, groundDimensions:"154m × 140m" },
  Mohali:        { name:"PCA Stadium",                     city:"Mohali",     homeTeam:"PBKS", dimensions:"average", defaultPitch:"green", dewFactor:"medium", batFirstWinPct:50, chaseWinPct:50, avgScore:168, teamWinPct:{MI:52,CSK:52,RCB:50,KKR:50,SRH:48,PBKS:60,RR:50,DC:48,GT:50,LSG:48}, groundDimensions:"160m × 138m" },
  SawaiMansingh: { name:"Sawai Mansingh Stadium",          city:"Jaipur",     homeTeam:"RR",   dimensions:"average", defaultPitch:"dry",   dewFactor:"low",    batFirstWinPct:55, chaseWinPct:45, avgScore:165, teamWinPct:{MI:46,CSK:48,RCB:44,KKR:46,SRH:46,PBKS:46,RR:66,DC:44,GT:48,LSG:46}, groundDimensions:"150m × 145m" },
  ArunJaitley:   { name:"Arun Jaitley Stadium",            city:"Delhi",      homeTeam:"DC",   dimensions:"average", defaultPitch:"flat",  dewFactor:"medium", batFirstWinPct:48, chaseWinPct:52, avgScore:170, teamWinPct:{MI:52,CSK:50,RCB:46,KKR:46,SRH:46,PBKS:48,RR:46,DC:64,GT:48,LSG:48}, groundDimensions:"160m × 150m" },
  NarendraModi:  { name:"Narendra Modi Stadium",           city:"Ahmedabad",  homeTeam:"GT",   dimensions:"large",   defaultPitch:"flat",  dewFactor:"medium", batFirstWinPct:50, chaseWinPct:50, avgScore:165, teamWinPct:{MI:46,CSK:48,RCB:44,KKR:46,SRH:46,PBKS:44,RR:48,DC:46,GT:68,LSG:46}, groundDimensions:"165m × 155m" },
  Ekana:         { name:"Ekana Cricket Stadium",           city:"Lucknow",    homeTeam:"LSG",  dimensions:"large",   defaultPitch:"flat",  dewFactor:"medium", batFirstWinPct:48, chaseWinPct:52, avgScore:168, teamWinPct:{MI:46,CSK:44,RCB:44,KKR:46,SRH:44,PBKS:46,RR:46,DC:46,GT:46,LSG:62}, groundDimensions:"158m × 145m" },
  Dharamshala:   { name:"HPCA Stadium",                    city:"Dharamshala",homeTeam:"N/A",   dimensions:"large",   defaultPitch:"flat",  dewFactor:"low",    batFirstWinPct:50, chaseWinPct:50, avgScore:170, teamWinPct:{MI:50,CSK:50,RCB:50,KKR:50,SRH:50,PBKS:50,RR:50,DC:50,GT:50,LSG:50}, groundDimensions:"165m × 155m" },
  Guwahati:      { name:"Barsapara Stadium",              city:"Guwahati",   homeTeam:"N/A",   dimensions:"average", defaultPitch:"flat",  dewFactor:"low",    batFirstWinPct:50, chaseWinPct:50, avgScore:168, teamWinPct:{MI:50,CSK:50,RCB:50,KKR:50,SRH:50,PBKS:50,RR:50,DC:50,GT:50,LSG:50}, groundDimensions:"160m × 145m" },
  Visakhapatnam: { name:"ACA-VDCA Stadium",               city:"Visakhapatnam", homeTeam:"N/A", dimensions:"average", defaultPitch:"flat", dewFactor:"low", batFirstWinPct:50, chaseWinPct:50, avgScore:170, teamWinPct:{MI:50,CSK:50,RCB:50,KKR:50,SRH:50,PBKS:50,RR:50,DC:50,GT:50,LSG:50}, groundDimensions:"156m × 142m" },
  Indore:        { name:"Holkar Stadium",                 city:"Indore",     homeTeam:"N/A",   dimensions:"average", defaultPitch:"flat",  dewFactor:"low",    batFirstWinPct:50, chaseWinPct:50, avgScore:168, teamWinPct:{MI:50,CSK:50,RCB:50,KKR:50,SRH:50,PBKS:50,RR:50,DC:50,GT:50,LSG:50}, groundDimensions:"155m × 145m" },
  Rajkot:       { name:"Saurashtra Cricket Stadium",      city:"Rajkot",     homeTeam:"N/A",   dimensions:"average", defaultPitch:"flat",  dewFactor:"low",    batFirstWinPct:50, chaseWinPct:50, avgScore:165, teamWinPct:{MI:50,CSK:50,RCB:50,KKR:50,SRH:50,PBKS:50,RR:50,DC:50,GT:50,LSG:50}, groundDimensions:"157m × 148m" },
  Thiruvananthapuram: { name:"Greenfield Stadium",          city:"Thiruvananthapuram", homeTeam:"N/A", dimensions:"average", defaultPitch:"flat", dewFactor:"low", batFirstWinPct:50, chaseWinPct:50, avgScore:167, teamWinPct:{MI:50,CSK:50,RCB:50,KKR:50,SRH:50,PBKS:50,RR:50,DC:50,GT:50,LSG:50}, groundDimensions:"156m × 144m" },
  Ranchi:        { name:"JSCA International Stadium",      city:"Ranchi",     homeTeam:"N/A",   dimensions:"average", defaultPitch:"flat",  dewFactor:"medium", batFirstWinPct:50, chaseWinPct:50, avgScore:169, teamWinPct:{MI:50,CSK:50,RCB:50,KKR:50,SRH:50,PBKS:50,RR:50,DC:50,GT:50,LSG:50}, groundDimensions:"159m × 146m" },
  Pune:          { name:"Maharashtra Cricket Association Stadium", city:"Pune", homeTeam:"N/A", dimensions:"average", defaultPitch:"flat", dewFactor:"medium", batFirstWinPct:50, chaseWinPct:50, avgScore:172, teamWinPct:{MI:50,CSK:50,RCB:50,KKR:50,SRH:50,PBKS:50,RR:50,DC:50,GT:50,LSG:50}, groundDimensions:"160m × 145m" },
};

// ---- PLAYER vs PLAYER MATCHUPS ----
// bowler → batsman head-to-head in IPL history
const PLAYER_MATCHUPS = [
  { 
    id:"b1", bowler:"bumrah_mi", batsman:"kohli_rcb", balls:258, runs:182, wickets:9, fours:18, sixes:4, dots:112, 
    wagonWheel: { straight:15, cover:20, point:12, thirdman:5, behind:5, fineleg:8, squareleg:15, midwicket:20 },
    weakZones: { short:"High Risk (35%)", yorker:"Solid (12%)", goodLength:"Edge (22%)" },
    strongZones: { fullToss:"100%", goodLength:"65%", short:"30%" },
    survivalTips: "Play Bumrah's late in-swing with soft hands. Pre-meditate the yorker at death overs but keep balanced. Avoid the cover drive on his 150kmph out-swingers early in the spell.",
    highlight:"Bumrah has dominated Kohli in IPL, dismissing him 9 times. Kohli averages just 20.2 against Bumrah and strikes at 70.5. Bumrah's lethal yorkers and cutters have troubled Kohli repeatedly." 
  },
  { 
    id:"b2", bowler:"bumrah_mi", batsman:"dhoni_csk", balls:228, runs:125, wickets:4, fours:8, sixes:5, dots:105, 
    wagonWheel: { straight:10, cover:15, point:10, thirdman:8, behind:8, fineleg:12, squareleg:20, midwicket:17 },
    weakZones: { short:"Safe", yorker:"High Risk (50%)", goodLength:"Solid" },
    strongZones: { short:"95%", goodLength:"70%", yorker:"40%" },
    survivalTips: "Watch for the slower ball when Bumrah changes his grip. Dhoni must use his deep-crease technique to tackle the yorker. Don't look for boundaries early; wait for the 19th over error.",
    highlight:"Dhoni vs Bumrah is a battle of legends. Dhoni has managed to score against Bumrah but gets out in crucial moments. Bumrah's pace and accuracy always challenge even the calmest batsman." 
  },
  { 
    id:"b3", bowler:"siraj_rcb", batsman:"rohit_mi", balls:192, runs:148, wickets:7, fours:16, sixes:3, dots:80, 
    wagonWheel: { straight:12, cover:25, point:20, thirdman:8, behind:8, fineleg:5, squareleg:10, midwicket:12 },
    weakZones: { short:"Killer (40%)", yorker:"Solid", goodLength:"Warning (25%)" },
    strongZones: { full:"90%", goodLength:"70%", short:"15%" },
    survivalTips: "Siraj's out-swinger is the trap. Rohit should avoid chasing wide balls. If he bowls short at the body, use the hook; it's his weakness, but Siraj has updated his pace for 2026.",
    highlight:"Siraj has troubled Rohit with his swing and seam movement, dismissing him 7 times. However, Rohit has also cashed in on loose deliveries with a decent overall rate." 
  },
  { 
    id:"b4", bowler:"narine_kkr", batsman:"rohit_mi", balls:312, runs:185, wickets:11, fours:14, sixes:5, dots:148, 
    wagonWheel: { straight:15, cover:15, point:15, thirdman:10, behind:10, fineleg:10, squareleg:15, midwicket:10 },
    weakZones: { spin:"Extreme Risk (60%)", straight:"Solid", pull:"Medium" },
    strongZones: { legSpin:"40%", offSpin:"75%", pace:"92%" },
    survivalTips: "Narine is Rohit's nemesis. Don't try to read the hand — watch for the revolutions on the ball. If the ball is flat and fast, play straight. Avoid big sweeps on his carrom ball.",
    highlight:"One of IPL's greatest rivalries! Narine's mystery spin has troubled Rohit 11 times. Rohit has a poor strike rate of 59 against Narine, who bowls tight and consistent." 
  },
  { 
    id:"b5", bowler:"pandya_mi", batsman:"rutu_csk", balls:82, runs:74, wickets:2, fours:6, sixes:3, dots:28, 
    wagonWheel: { straight:12, cover:18, point:15, thirdman:8, behind:8, fineleg:10, squareleg:12, midwicket:17 },
    weakZones: { short:"High Risk (40%)", yorker:"Warning (30%)", goodLength:"Dangerous (55%)" },
    strongZones: { full:"75%", short:"40%", offside:"70%" },
    survivalTips: "Hardik's in-swing and cutters test Ruturaj's technique early. Play the ball late, stay deep in the crease, and only drive through extra cover when the length is over-pitched.",
    highlight:"Hardik Pandya’s change of pace and inswing can squeeze Ruturaj Gaikwad on the off-side. This matchup rewards disciplined defence and precise timing rather than big swings."
  },
  { 
    id:"b6", bowler:"rashid_gt", batsman:"kohli_rcb", balls:186, runs:122, wickets:7, fours:10, sixes:4, dots:82, 
    wagonWheel: { straight:15, cover:23, point:20, thirdman:5, behind:5, fineleg:10, squareleg:12, midwicket:10 },
    weakZones: { googly:"High Risk (45%)", slider:"Medium", legBreak:"Low" },
    strongZones: { offside:"88%", legsides:"72%", googly:"25%" },
    survivalTips: "Kohli must play Rashid with a straight bat. Don't try to cut the slider — it stays too low at Ahmedabad. If Rashid tosses it up, he's fishing; stay in your crease and drive late.",
    highlight:"A battle of legends. Rashid's mystery variations vs Kohli's textbook technique. Rashid has slightly dominated but Kohli has several brilliant innings against him." 
  }
];
