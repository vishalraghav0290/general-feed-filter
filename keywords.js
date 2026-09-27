// Default aviation keyword list. A post is KEPT if its text contains any of
// these (case-insensitive substring match). Users can override/extend this
// list from the popup; overrides are stored in chrome.storage.
const DEFAULT_AVIATION_KEYWORDS = [
  // core
  "aviation", "aviate", "aircraft", "airplane", "aeroplane", "plane", "planes",
  "flight", "flights", "flying", "flew", "pilot", "pilots", "cockpit", "aviator",
  "airline", "airlines", "airliner", "airport", "airports", "runway", "taxiway", "tarmac",
  "takeoff", "take-off", "landing", "touchdown", "go-around", "holding pattern",
  // manufacturers / types
  "boeing", "airbus", "embraer", "bombardier", "cessna", "gulfstream", "dassault", "atr",
  "737", "747", "757", "767", "777", "787", "a320", "a321", "a330", "a340", "a350", "a380",
  "dreamliner", "concorde", "cirrus", "piper", "diamond aircraft",
  // rotary / military / drones
  "helicopter", "chopper", "rotorcraft", "drone", "uav", "fighter jet",
  "f-16", "f-22", "f-35", "squadron", "airshow", "air show", "aerobatics", "aerobatic", "top gun",
  // ops / atc / tech
  "atc", "air traffic control", "icao", "iata", "faa", "easa", "dgca", "ntsb",
  "avgeek", "avgeeks", "flightradar", "adsb", "ads-b", "transponder", "squawk", "mayday",
  "turbulence", "jet", "jets", "jetliner", "turbofan", "turboprop", "apu", "avionics",
  "aerospace", "aeronautical", "aeronautics", "altitude", "cruising", "fuselage",
  "wingspan", "winglet", "aileron", "rudder", "flaps", "landing gear", "hangar",
  // travel-ish
  "layover", "redeye", "red-eye", "boarding", "aircrew", "cabin crew",
  "flight attendant", "first officer", "captain", "frequent flyer",
  "planespotting", "plane spotting", "tail number", "callsign", "call sign",

  // ---- India: airlines ----
  "indigo", "air india", "airindia", "air india express", "vistara", "akasa",
  "akasa air", "spicejet", "spice jet", "goair", "go first", "go air", "alliance air",
  "jet airways", "kingfisher airlines", "star air", "flybig", "trujet",
  // ---- India: airports & hubs ----
  "delhi airport", "mumbai airport", "igi airport", "indira gandhi international",
  "bengaluru airport", "kempegowda", "chennai airport", "hyderabad airport",
  "rgia", "cochin airport", "kolkata airport", "goa airport", "mopa",
  // ---- India: regulators / ops / community ----
  "dgca", "aai", "airports authority of india", "air india ltd", "tata sia",
  "avgeekindia", "indianaviation", "indian aviation", "aviation india",
  // ---- Indian Air Force / military aviation ----
  "indian air force", "iaf", "bhartiya vayu sena", "vayu sena", "vayusena",
  "iaf_mcc", "surya kiran", "sarang", "tejas", "hal tejas", "lca tejas",
  "hindustan aeronautics", "sukhoi", "su-30", "su-30mki", "mig-21", "mig-29",
  "rafale", "jaguar", "mirage 2000", "tejas mk1a", "tejas mk2", "amca",
  "c-17", "c-130", "globemaster", "hercules", "chinook", "apache", "prachand",
  "dhruv", "rudra", "garud", "aero india", "republic day flypast", "flypast",
  "air warrior", "iaf day", "air force day"
];
