/**
 * Mulat Media — Wordle Game (Mulat Wordle)
 * 
 * Features:
 * - Daily Wordle Mode: Changes deterministically every single calendar day at midnight
 * - Practice / Unlimited Mode: Play as many words as you like anytime
 * - Color Scheme:
 *     • Green  (#22c55e): Correct letter in correct spot
 *     • Orange (#f97316): Correct letter in WRONG spot
 *     • Gray   (#64748b): Letter not in the word
 * - Audio effects via Web Audio API (keystrokes, tile reveals, victory fanfare) with mute toggle
 * - Particle confetti animation on puzzle victory
 * - Live stats tracking (streak, win rate %, guess distribution chart)
 * - Emoji grid copy & share to clipboard
 * - Responsive virtual keyboard + physical keyboard input
 * - Floating launch button stacked directly on top of the dark/light mode toggle
 */

(function () {
  'use strict';

  // --- STORAGE KEYS ---
  var STORAGE_STATS = 'mulat_wordle_stats_v1';
  var STORAGE_SETTINGS = 'mulat_wordle_settings_v1';
  var DAILY_PREFIX = 'mulat_wordle_daily_';

  // --- TARGET WORDS LIST (Strictly 5-Letter English & Journalism/Media Vocabulary) ---
  var RAW_TARGET_WORDS = [
    "PRESS", "STORY", "MEDIA", "TRUTH", "VOICE", "PAPER", "PRINT", "WRITE", "FOCUS", "PHOTO",
    "RADIO", "FLASH", "SCOPE", "TITLE", "ISSUE", "ALERT", "DAILY", "EXTRA", "COVER", "EVENT",
    "FRONT", "TREND", "VIDEO", "WORLD", "POWER", "WATCH", "SPEAK", "HEARD", "CABLE", "AUDIO",
    "LIGHT", "SHINE", "STAND", "LEARN", "FAITH", "BRAVE", "HONOR", "HEART", "DREAM", "PEACE",
    "GUARD", "CLEAR", "FRESH", "SMART", "QUICK", "BRAIN", "YOUTH", "FORUM", "TOPIC", "QUOTE",
    "GUIDE", "PROUD", "UNITY", "TRUST", "SOLID", "SHARP", "VIVID", "CRAFT", "FORCE", "NOBLE",
    "CHIEF", "INDEX", "BRIEF", "PIECE", "PROOF", "TABLE", "TRACK", "STAGE", "STUDY", "QUERY",
    "AUDIT", "CLAIM", "FACTS", "FORTH", "GRAPH", "INSPO", "MODAL", "PANEL", "POLLS", "SCALE",
    "THEME", "VIEWS", "VITAL", "WORDS", "ACTOR", "ADAPT", "AGILE", "AHEAD", "ALBUM", "ALIGN",
    "ALLOW", "ALPHA", "AMONG", "AMPLE", "ANGEL", "ANGER", "ANGLE", "ANVIL", "APPLE", "APPLY",
    "ARENA", "ARGUE", "ARISE", "ARRAY", "ARROW", "ASSET", "BADGE", "BASIC", "BATCH", "BEACH",
    "BEGIN", "BEING", "BELOW", "BENCH", "BIRTH", "BLACK", "BLADE", "BLANK", "BLAZE", "BLEND",
    "BLOCK", "BLOOM", "BOARD", "BOOST", "BOUND", "BRAND", "BREAD", "BREAK", "BRICK", "BRIDE",
    "BRING", "BROAD", "BROWN", "BUILD", "BURST", "CABIN", "CANAL", "CANDY", "CANOE", "CARGO",
    "CARRY", "CAUSE", "CHAIN", "CHAIR", "CHALK", "CHAMP", "CHART", "CHASE", "CHEAP", "CHECK",
    "CHEST", "CHORD", "CHUNK", "CIVIC", "CLARK", "CLASS", "CLEAN", "CLERK", "CLICK", "CLIFF",
    "CLIMB", "CLOCK", "CLONE", "CLOSE", "CLOTH", "CLOUD", "COACH", "COAST", "COLOR", "COMET",
    "CORAL", "COUNT", "COURT", "CRACK", "CRANE", "CRASH", "CREAM", "CREEK", "CRIME", "CROSS",
    "CROWD", "CROWN", "CRUSH", "CURVE", "CYCLE", "DANCE", "DATUM", "DELTA", "DEPOT", "DEPTH",
    "DIARY", "DIGIT", "DISCO", "DITCH", "DOUBT", "DRAFT", "DRAIN", "DRAMA", "DRESS", "DRIFT",
    "DRINK", "DRIVE", "DRONE", "EAGER", "EARTH", "ELITE", "EMPTY", "ENEMY", "ENJOY", "ENTER",
    "ENTRY", "EQUAL", "EQUIP", "ESSAY", "ETHIC", "EXACT", "EXIST", "FAVOR", "FIELD", "FIGHT",
    "FINAL", "FIRST", "FLAME", "FLEET", "FLOOR", "FLUTE", "FORGE", "FRAME", "FROST", "FRUIT",
    "GIANT", "GLASS", "GLIDE", "GLOBE", "GLORY", "GRACE", "GRADE", "GRAIN", "GRAND", "GRASP",
    "GRASS", "GREAT", "GREEN", "GREET", "GROUP", "GUEST", "HABIT", "HAPPY", "HARSH", "HAVEN",
    "HEAVY", "HELLO", "HOTEL", "HOUSE", "HUMAN", "HUMOR", "IDEAL", "IMAGE", "INNER", "INPUT",
    "IRONY", "JEWEL", "JOINT", "JUDGE", "JUICE", "KNACK", "KNIFE", "LABEL", "LABOR", "LARGE",
    "LASER", "LAUGH", "LAYER", "LEMON", "LEVEL", "LIMIT", "LINKS", "LOGIC", "LOYAL", "LUCKY",
    "LUNAR", "MAGIC", "MAJOR", "MAKER", "MARCH", "MATCH", "MAYOR", "METAL", "METRO", "MICRO",
    "MIGHT", "MODEL", "MODEM", "MONEY", "MONTH", "MORAL", "MOTOR", "MOUNT", "MOUSE", "MUSIC",
    "NERVE", "NIGHT", "NOISE", "NORTH", "NOTCH", "NOVEL", "NURSE", "OCEAN", "OFFER", "ONSET",
    "OPERA", "ORBIT", "ORDER", "ORGAN", "OTHER", "OUTER", "OZONE", "PAINT", "PARTY", "PAUSE",
    "PEARL", "PHASE", "PHONE", "PILOT", "PITCH", "PIVOT", "PIXEL", "PLACE", "PLAIN", "PLANE",
    "PLANT", "PLATE", "PLAZA", "POINT", "POLAR", "PRICE", "PRIDE", "PRIME", "PRIZE", "PROBE",
    "PULSE", "PUPIL", "QUEEN", "QUEST", "QUIET", "QUOTA", "RADAR", "RAISE", "RALLY", "RANCH",
    "RANGE", "RAPID", "RATIO", "REACH", "REACT", "READY", "REALM", "REBEL", "REMIT", "RESET",
    "RIDER", "RIGHT", "RIVER", "ROBOT", "ROCKY", "ROUND", "ROUTE", "ROYAL", "RULER", "RURAL",
    "SCENE", "SCORE", "SCOUT", "SEDAN", "SERVE", "SHADE", "SHAKE", "SHARE", "SHEET", "SHELL",
    "SHIFT", "SHORE", "SHORT", "SIGHT", "SKILL", "SMILE", "SMOKE", "SOLAR", "SOLVE", "SOUND",
    "SOUTH", "SPACE", "SPARK", "SPEED", "SPELL", "SPEND", "SPICE", "SPORT", "SQUAD", "STAFF",
    "STAMP", "START", "STATE", "STEAM", "STEEL", "STILL", "STOCK", "STONE", "STORM", "STYLE",
    "SUITE", "SUPER", "SWEET", "SWIFT", "TASTE", "TEACH", "THANK", "TIGER", "TODAY", "TONIC",
    "TOTAL", "TOUCH", "TOWER", "TRADE", "TRAIL", "TRAIN", "TRAIT", "TRIAL", "TRIBE", "TRICK",
    "UNCLE", "UNDER", "UNION", "UNTIL", "UPPER", "URBAN", "USAGE", "VALID", "VALUE", "VALVE",
    "VAPOR", "VAULT", "VENUE", "VIGOR", "VIRUS", "VISIT", "VOTER", "WATER", "WHEEL", "WHITE",
    "WHOLE", "WORTH", "YACHT", "YIELD", "YOUNG", "ZEBRA"
  ];

  // --- EXTENDED GUESS DICTIONARY (Strictly 5-Letter Words) ---
  var RAW_EXTRA_GUESSES = [
    "AAHED", "ABACK", "ABASE", "ABASH", "ABATE", "ABBEY", "ABBOT", "ABHOR", "ABIDE", "ABLED",
    "ABODE", "ABORT", "ABOUT", "ABOVE", "ABUSE", "ABYSS", "ACHED", "ACHES", "ACIDS", "ACORN",
    "ACRED", "ACRES", "ACRID", "ACTED", "ACUTE", "ADAGE", "ADDED", "ADDER", "ADEPT", "ADIEU",
    "ADMIT", "ADOBE", "ADOPT", "ADORE", "ADORN", "ADULT", "AEGIS", "AERIE", "AFOOT", "AFOUL",
    "AFTER", "AGAIN", "AGAPE", "AGATE", "AGENT", "AGING", "AGLOW", "AGONY", "AGREE", "AIDED",
    "AIDER", "AIDES", "AIMED", "AIMER", "AIRED", "AISLE", "ALARM", "ALDER", "ALGAE", "ALIAS",
    "ALIBI", "ALIEN", "ALIKE", "ALIVE", "ALKYD", "ALKYL", "ALLAY", "ALLEY", "ALLOT", "ALLOY",
    "ALOES", "ALOFT", "ALOHA", "ALONE", "ALONG", "ALOOF", "ALOUD", "ALTAR", "ALTER", "ALTOS",
    "AMASS", "AMAZE", "AMBER", "AMBLE", "AMEND", "AMIDE", "AMIGO", "AMINO", "AMISS", "AMITY",
    "AMORE", "AMPLY", "AMUSE", "ANGRY", "ANGST", "ANIME", "ANION", "ANISE", "ANKLE", "ANNEX",
    "ANNOY", "ANNUL", "ANODE", "ANTIC", "ANTSY", "AORTA", "APACE", "APART", "APHID", "APING",
    "APNEA", "APRON", "APSES", "APTER", "APTLY", "AQUAS", "ARBOR", "ARDOR", "AREAL", "AREAS",
    "ARGON", "ARIAS", "ARMED", "ARMOR", "AROMA", "AROSE", "ARSON", "ARTSY", "ASHEN", "ASHES",
    "ASIDE", "ASKED", "ASKER", "ASKEW", "ASPEN", "ASPIC", "ASSAY", "ASTER", "ASTIR", "ATLAS",
    "ATOLL", "ATOMS", "ATONE", "ATTIC", "AUGER", "AUGHT", "AUGUR", "AUNTS", "AURAS", "AUTOS",
    "AUXIN", "AVAIL", "AVERT", "AVIAN", "AVOID", "AVOWS", "AWAIT", "AWAKE", "AWARD", "AWARE",
    "AWASH", "AWFUL", "AWOKE", "AXIAL", "AXIOM", "AXLES", "AZURE", "BABEL", "BABES", "BACKS",
    "BACON", "BADLY", "BAGEL", "BAGGY", "BAILS", "BAKER", "BAKES", "BALDY", "BALED", "BALES",
    "BALLS", "BALLY", "BALMS", "BALMY", "BAMBO", "BANAL", "BANDS", "BANDY", "BANGS", "BANJO",
    "BANKS", "BARBS", "BARDS", "BARED", "BARER", "BARES", "BARGE", "BARKS", "BARNS", "BARON",
    "BARRE", "BASAL", "BASED", "BASER", "BASES", "BASIL", "BASIN", "BASIS", "BASKS", "BASSO",
    "BASTE", "BATED", "BATHS", "BATIK", "BATON", "BATTY", "BAUDS", "BAYOU", "BEADS", "BEADY",
    "BEAKS", "BEAMS", "BEAMY", "BEANS", "BEARD", "BEARS", "BEAST", "BEATS", "BEAUS", "BEAUT",
    "BEAUX", "BEBOP", "BEDEW", "BEECH", "BEEFS", "BEEFY", "BEEPS", "BEERS", "BEERY", "BEETS",
    "BEFIT", "BEFOG", "BEGAN", "BEGAT", "BEGET", "BEGOT", "BEGUN", "BEIGE", "BELAY", "BELCH",
    "BELIE", "BELLE", "BELLS", "BELLY", "BELTS", "BENDS", "BENDY", "BENTO", "BERET", "BERMS",
    "BERRY", "BERTH", "BERYL", "BESET", "BESOT", "BESTS", "BETAS", "BETEL", "BETTO", "BEVEL",
    "BEZEL", "BIBLE", "BICEP", "BIDDY", "BIDED", "BIDES", "BIDET", "BIGHT", "BIGOT", "BIJOU",
    "BIKER", "BIKES", "BILGE", "BILLS", "BILLY", "BIMBO", "BINDS", "BINGE", "BINGO", "BIPOD",
    "BIRCH", "BIRDS", "BISON", "BITCH", "BITER", "BITES", "BITSY", "BITTY", "BLAHS", "BLAME",
    "BLAND", "BLARE", "BLASH", "BLAST", "BLEAK", "BLEAT", "BLEED", "BLEEP", "BLESS", "BLIMP",
    "BLIND", "BLING", "BLINK", "BLIPS", "BLISS", "BLITZ", "BLOAT", "BLOBS", "BLOCS", "BLOKE",
    "BLOND", "BLOOD", "BLOTS", "BLOWN", "BLOWS", "BLUER", "BLUES", "BLUFF", "BLUNT", "BLURB",
    "BLURS", "BLURT", "BLUSH", "BOARS", "BOAST", "BOATS", "BOBBY", "BOCCE", "BODED", "BODES",
    "BODYS", "BOGEY", "BOGGY", "BOGUS", "BOILS", "BOLAS", "BOLES", "BOLLS", "BOLTS", "BOLUS",
    "BOMBS", "BONDS", "BONED", "BONER", "BONES", "BONEY", "BONGO", "BONGS", "BONNY", "BONUS",
    "BOOBY", "BOOED", "BOOKS", "BOOMS", "BOOMY", "BOONS", "BOORS", "BOOTS", "BOOTY", "BOOZE",
    "BOOZY", "BORAX", "BORED", "BORER", "BORES", "BORIC", "BORNE", "BORON", "BOSOM", "BOSON",
    "BOSSY", "BOTCH", "BOUGH", "BOULE", "BOUTS", "BOWED", "BOWEL", "BOWER", "BOWLS", "BOXED",
    "BOXER", "BOXES", "BOYAR", "BOYOS", "BRACE", "BRACT", "BRADS", "BRAES", "BRAGS", "BRAID",
    "BRAKE", "BRANS", "BRANT", "BRASH", "BRASS", "BRATS", "BRAVO", "BRAWL", "BRAWN", "BRAYS",
    "BRAZE", "BREAM", "BREED", "BREWS", "BRIAR", "BRIBE", "BRIER", "BRIGS", "BRIMS", "BRINE",
    "BRINK", "BRINY", "BRISK", "BROCH", "BROIL", "BROKE", "BROME", "BRONC", "BROOD", "BROOK",
    "BROOM", "BROTH", "BROWS", "BRUIN", "BRUNT", "BRUSH", "BRUSK", "BRUTE", "BUBBA", "BUCKS",
    "BUDDY", "BUDGE", "BUFFS", "BUGGY", "BUGLE", "BUILT", "BULBS", "BULGE", "BULGY", "BULKS",
    "BULKY", "BULLS", "BULLY", "BUMPS", "BUMPY", "BUNCH", "BUNKS", "BUNNY", "BUOYS", "BURGS",
    "BURLY", "BURNS", "BURNT", "BURPS", "BURRO", "BURRS", "BURSA", "BUSED", "BUSES", "BUSHY",
    "BUSTS", "BUSTY", "BUTCH", "BUTTE", "BUTTS", "BUXOM", "BUYER", "BUZZY", "BYLAW", "BYRES",
    "BYTES", "BYWAY", "CABAL", "CACAO", "CACHE", "CACTI", "CADDY", "CADET", "CADRE", "CAFES",
    "CAGED", "CAGES", "CAGEY", "CAIRN", "CAKED", "CAKES", "CALFS", "CALIF", "CALLS", "CALMS",
    "CALVE", "CAMEL", "CAMEO", "CAMPS", "CAMPY", "CANED", "CANES", "CANID", "CANNA", "CANON",
    "CANTO", "CAPED", "CAPER", "CAPES", "CAPON", "CARAT", "CARBO", "CARBS", "CARDS", "CARED",
    "CARER", "CARES", "CARET", "CARPS", "CARTS", "CARVE", "CASED", "CASES", "CASKS", "CASTE",
    "CASTS", "CATER", "CAULK", "CAVED", "CAVER", "CAVES", "CAVIL", "CEASE", "CEDAR", "CEDED",
    "CEDES", "CELEB", "CELLO", "CELLS", "CELTS", "CENTO", "CENTR", "CENTS", "CHAFE", "CHAFF",
    "CHANT", "CHAOS", "CHAPS", "CHAPT", "CHARD", "CHARM", "CHARS", "CHASM", "CHATS", "CHEAT",
    "CHEEK", "CHEEP", "CHEER", "CHEFS", "CHERT", "CHEWS", "CHEWY", "CHICK", "CHILD", "CHILI",
    "CHILL", "CHIME", "CHIMP", "CHINA", "CHINE", "CHINO", "CHINS", "CHIPS", "CHIRP", "CHIVE",
    "CHOCK", "CHOIR", "CHOKE", "CHOMP", "CHOPS", "CHORE", "CHOSE", "CHOWS", "CHUCK", "CHUMP",
    "CHUMS", "CHURL", "CHURN", "CHUTE", "CIDER", "CIGAR", "CINCH", "CIRCA", "CIRCS", "CITES",
    "CIVIL", "CLAMP", "CLAMS", "CLANG", "CLANK", "CLANS", "CLAPS", "CLASH", "CLASP", "CLAWS",
    "CLAYS", "CLEAT", "CLEFS", "CLEFT", "CLEWS", "CLIME", "CLINE", "CLING", "CLINK", "CLIPS",
    "CLOAK", "CLODS", "CLOGS", "CLONS", "CLOTS", "CLOUT", "CLOVE", "CLOWN", "CLUBS", "CLUCK",
    "CLUES", "CLUMP", "CLUNG", "COALS", "COATS", "COBIA", "COBRA", "COCKS", "COCOA", "CODAS",
    "CODES", "CODEX", "COEDS", "COHOS", "COIFS", "COILS", "COINS", "COKES", "COLAS", "COLDS",
    "COLON", "COLTS", "COMAS", "COMBO", "COMBS", "COMER", "COMES", "COMFY", "COMIC", "COMMA",
    "CONCH", "CONDO", "CONES", "CONGA", "CONIC", "CONKS", "COOED", "COOKS", "COOKY", "COOLS",
    "COOPS", "COPES", "COPRA", "COPSE", "CORDS", "CORED", "CORER", "CORES", "CORGI", "CORKS",
    "CORNS", "CORNY", "CORPS", "COSTS", "COTTA", "COUCH", "COUGH", "COULD", "COUPE", "COUPS",
    "COUTH", "COVEN", "COVES", "COVET", "COVEY", "COWED", "COWER", "COWLS", "CRABS", "CRAGS",
    "CRAMP", "CRAMS", "CRANK", "CRASS", "CRATE", "CRAVE", "CRAWL", "CRAWS", "CRAZE", "CRAZY",
    "CREAK", "CREDO", "CREED", "CREEL", "CREEP", "CREME", "CREPE", "CREPT", "CRESS", "CREST",
    "CREWS", "CRIBS", "CRICK", "CRIED", "CRIER", "CRIES", "CRIMP", "CRISP", "CROAK", "CROCK",
    "CROCS", "CROFT", "CRONE", "CRONY", "CROOK", "CROON", "CROPS", "CROUP", "CROWS", "CRUDE",
    "CRUEL", "CRUET", "CRUMB", "CRUMP", "CRUST", "CRYPT", "CUBED", "CUBES", "CUBIC", "CUBIT",
    "CUFFS", "CULLS", "CULPA", "CULTS", "CUMIN", "CUPID", "CURBS", "CURDS", "CURED", "CURER",
    "CURES", "CURIA", "CURIE", "CURIO", "CURLS", "CURLY", "CURRY", "CURSE", "CURVY", "CUSHY",
    "CUSPS", "CUTIE", "CYBER", "CYNIC", "CYSTS", "DADDY", "DAFFY", "DAIRY", "DAISY", "DALES",
    "DALLY", "DAMES", "DAMNS", "DAMPS", "DANDY", "DARED", "DARES", "DARKS", "DARTS", "DATED",
    "DATER", "DATES", "DAUBS", "DAUNT", "DAVIT", "DAWNS", "DAZED", "DAZES", "DEALS", "DEALT",
    "DEANS", "DEARS", "DEARY", "DEATH", "DEBAR", "DEBIT", "DEBTS", "DEBUG", "DEBUT", "DECAF",
    "DECAL", "DECAY", "DECKS", "DECOR", "DECOY", "DECRY", "DEEDS", "DEEMS", "DEEPS", "DEFER",
    "DEIFY", "DEIGN", "DEISM", "DEITY", "DELAY", "DELFS", "DELIS", "DELLS", "DELVE", "DEMON",
    "DEMOS", "DEMUR", "DENIM", "DENSE", "DENTS", "DERBY", "DESKS", "DETER", "DETOX", "DEUCE",
    "DEVIL", "DICED", "DICES", "DICEY", "DICTA", "DIETS", "DIKED", "DIKES", "DILDO", "DILLS",
    "DILLY", "DIMER", "DIMES", "DIMLY", "DINAR", "DINED", "DINER", "DINES", "DINGO", "DINGS",
    "DINGY", "DINKY", "DINKS", "DIODE", "DIRER", "DIRGE", "DIRTS", "DIRTY", "DISCS", "DISHY",
    "DISKS", "DITTO", "DITTY", "DIVAN", "DIVAS", "DIVED", "DIVER", "DIVES", "DIVOT", "DIZZY",
    "DOCKS", "DODGE", "DODGY", "DODOS", "DOERS", "DOFFS", "DOGES", "DOGGY", "DOGMA", "DOILY",
    "DOING", "DOLED", "DOLES", "DOLLS", "DOLLY", "DOLOR", "DOLTS", "DOMED", "DOMES", "DONOR",
    "DONUT", "DOOMS", "DOORS", "DOPED", "DOPER", "DOPES", "DOPEY", "DORMS", "DOSES", "DOTED",
    "DOTER", "DOTES", "DOTTY", "DOUGH", "DOUSE", "DOVES", "DOWDY", "DOWEL", "DOWER", "DOWNS",
    "DOWNY", "DOWRY", "DOWSE", "DOYEN", "DOZED", "DOZEN", "DOZER", "DOZES", "DRABS", "DRAGS",
    "DRAKE", "DRAMS", "DRANK", "DRAPE", "DRAWL", "DRAWN", "DRAWS", "DRAYS", "DREAD", "DREAR",
    "DRECK", "DREGS", "DRIED", "DRIER", "DRIES", "DRILL", "DRILY", "DRIPS", "DROLL", "DROOL",
    "DROOP", "DROPS", "DROSS", "DROVE", "DROWN", "DRUBS", "DRUGS", "DRUID", "DRUMS", "DRUNK",
    "DRYAD", "DRYER", "DRYLY", "DUALS", "DUCHY", "DUCKS", "DUCKY", "DUCTS", "DUDES", "DUELS",
    "DUETS", "DUKES", "DULLS", "DULLY", "DUMMY", "DUMPS", "DUMPY", "DUNCE", "DUNES", "DUNKS",
    "DUPED", "DUPER", "DUPES", "DUPLE", "DURST", "DUSKS", "DUSKY", "DUSTS", "DUSTY", "DUTCH",
    "DUVET", "DWARF", "DWELL", "DWELT", "DYING", "DYKES", "EAGLE", "EARED", "EARLS", "EARLY",
    "EARNS", "EASED", "EASEL", "EASER", "EASES", "EASTS", "EATEN", "EATER", "EAVES", "EBBED",
    "EBONY", "ECHOS", "EDEMA", "EDGED", "EDGER", "EDGES", "EDICT", "EDIFY", "EDITS", "EERIE",
    "EGRET", "EIDER", "EIGHT", "EJECT", "EKING", "ELAND", "ELATE", "ELBOW", "ELDER", "ELECT",
    "ELEGY", "ELFIN", "ELIDE", "ELOPE", "ELUDE", "ELVES", "EMAIL", "EMBED", "EMBER", "EMCEE",
    "EMEND", "EMERY", "EMITS", "EMOTE", "ENACT", "ENDED", "ENDER", "ENDOW", "ENDUE", "ENEMA",
    "ENNUI", "ENOKI", "ENROL", "ENSUE", "ENVOY", "EOSIN", "EPICS", "EPOCH", "EPOXY", "ERASE",
    "ERECT", "ERGOT", "ERODE", "ERRED", "ERROR", "ERUPT", "ESTER", "ETHER", "ETHOS", "ETHYL",
    "ETUDE", "EVADE", "EVENS", "EVERY", "EVICT", "EVILS", "EVOKE", "EXALT", "EXAMS", "EXCEL",
    "EXECS", "EXERT", "EXILE", "EXITS", "EXPAT", "EXPEL", "EXPOS", "EXTOL", "EXULT", "EYING",
    "EYRIE", "FABLE", "FACED", "FACER", "FACES", "FACET", "FADED", "FADER", "FADES", "FAERY",
    "FAILS", "FAINT", "FAIRS", "FAIRY", "FAKED", "FAKER", "FAKES", "FAKIR", "FALLS", "FALSE",
    "FAMED", "FAMES", "FANCY", "FANGS", "FANNY", "FARCE", "FARED", "FARES", "FARMS", "FARTS",
    "FASTS", "FATAL", "FATED", "FATES", "FATSO", "FATTY", "FAULT", "FAUNA", "FAUNS", "FAWNS",
    "FAXED", "FAXES", "FAZED", "FAZES", "FEARS", "FEAST", "FEATS", "FECAL", "FECES", "FEEDS",
    "FEELS", "FEIGN", "FEINT", "FELLA", "FELLS", "FELON", "FELTS", "FEMME", "FEMUR", "FENCE",
    "FENDS", "FERAL", "FERNS", "FERNY", "FERRY", "FESTS", "FETAL", "FETCH", "FETED", "FETES",
    "FETID", "FETUS", "FEUDS", "FEVER", "FEWER", "FIATS", "FIBER", "FICUS", "FIEND", "FIERY",
    "FIFES", "FIFTH", "FIFTY", "FILCH", "FILED", "FILER", "FILES", "FILET", "FILLS", "FILLY",
    "FILMS", "FILMY", "FILTH", "FINCH", "FINDS", "FINED", "FINER", "FINES", "FINIS", "FINKS",
    "FIORD", "FIRED", "FIRER", "FIRES", "FIRMS", "FIRTH", "FISHY", "FISTS", "FITCH", "FITLY",
    "FIVER", "FIVES", "FIXED", "FIXER", "FIXES", "FIZZY", "FJORD", "FLACK", "FLAGS", "FLAIL",
    "FLAIR", "FLAKE", "FLAKY", "FLANK", "FLAPS", "FLARE", "FLASK", "FLATS", "FLAWS", "FLAWY",
    "FLAYS", "FLEAS", "FLECK", "FLEES", "FLESH", "FLICK", "FLIER", "FLIES", "FLING", "FLINT",
    "FLIPS", "FLIRT", "FLOAT", "FLOCK", "FLOES", "FLOOD", "FLOPS", "FLORA", "FLOSS", "FLOUR",
    "FLOUT", "FLOWN", "FLOWS", "FLUBS", "FLUES", "FLUFF", "FLUID", "FLUKE", "FLUKY", "FLUME",
    "FLUNG", "FLUNK", "FLUSH", "FLYBY", "FOALS", "FOAMS", "FOAMY", "FOCAL", "FOGEY", "FOGGY",
    "FOILS", "FOIST", "FOLDS", "FOLIA", "FOLIC", "FOLIO", "FOLKS", "FOLKY", "FOLLY", "FONDU",
    "FONTS", "FOODS", "FOOLS", "FOOTY", "FORAY", "FORDS", "FORES", "FORGO", "FORKS", "FORMS",
    "FORTE", "FORTS", "FORTY", "FOSSE", "FOULS", "FOUND", "FOUNT", "FOURS", "FOWLS", "FOXES",
    "FOYER", "FRAIL", "FRANC", "FRANK", "FRAUD", "FRAYS", "FREAK", "FREED", "FREER", "FREES",
    "FRETS", "FRIAR", "FRIED", "FRIER", "FRIES", "FRILL", "FRISK", "FRITZ", "FROCK", "FROGS",
    "FROND", "FROTH", "FROWN", "FROZE", "FUDGE", "FUELS", "FUGUE", "FULLY", "FUMED", "FUMES",
    "FUNDS", "FUNGI", "FUNKY", "FUNNY", "FURLS", "FUROR", "FURRY", "FURZE", "FUSED", "FUSEE",
    "FUSES", "FUSSY", "FUSTY", "FUTON", "FUZZY", "GABLE", "GAFFE", "GAFFS", "GAGED", "GAGES",
    "GAINS", "GAITS", "GALAS", "GALES", "GALLS", "GAMBA", "GAMED", "GAMER", "GAMES", "GAMEY",
    "GAMIC", "GAMIN", "GAMMA", "GAMUT", "GANGS", "GAPED", "GAPES", "GARBS", "GASES", "GASPS",
    "GASSY", "GATED", "GATES", "GATOR", "GAUDY", "GAUGE", "GAUNT", "GAUZE", "GAUZY", "GAVEL",
    "GAWKY", "GAYER", "GAYLY", "GAZED", "GAZER", "GAZES", "GEARS", "GECKO", "GEEKS", "GEEKY",
    "GEESE", "GELDS", "GENES", "GENIE", "GENII", "GENOA", "GENRE", "GENTS", "GENUS", "GEODE",
    "GERMS", "GETUP", "GHOST", "GHOUL", "GIBED", "GIBES", "GIDDY", "GIFTS", "GIGOT", "GILDS",
    "GILLS", "GILTS", "GIMME", "GIMPS", "GIMPY", "GIRDS", "GIRLS", "GIRLY", "GIRTH", "GISMO",
    "GIVEN", "GIVER", "GIVES", "GIZMO", "GLADE", "GLADS", "GLAND", "GLARE", "GLAZE", "GLEAM",
    "GLEAN", "GLENS", "GLINT", "GLITZ", "GLOAT", "GLOBS", "GLOOM", "GLOSS", "GLOVE", "GLOWS",
    "GLUED", "GLUER", "GLUES", "GLUEY", "GLUON", "GLUTE", "GLYPH", "GNARL", "GNASH", "GNATS",
    "GNAWS", "GNOME", "GOADS", "GOALS", "GOATS", "GODLY", "GOERS", "GOFER", "GOING", "GOLDS",
    "GOLEM", "GOLFS", "GOLLY", "GONAD", "GONER", "GONGS", "GONZO", "GOODS", "GOODY", "GOOEY",
    "GOOFS", "GOOFY", "GOONS", "GOOSE", "GORGE", "GORSE", "GOUGE", "GOURD", "GOUTY", "GOWNS",
    "GRABS", "GRADS", "GRAFT", "GRAIL", "GRAMS", "GRANT", "GRAPE", "GRATE", "GRAVE", "GRAVY",
    "GRAYS", "GRAZE", "GREBE", "GREED", "GREEK", "GREYS", "GRIEF", "GRILL", "GRIME", "GRIMY",
    "GRIND", "GRINS", "GRIPE", "GRIPS", "GRIST", "GRITS", "GROAN", "GROIN", "GROOM", "GROPE",
    "GROSS", "GROUT", "GROVE", "GROWL", "GROWN", "GROWS", "GRUBS", "GRUEL", "GRUFF", "GRUNT",
    "GUANO", "GUAVA", "GUESS", "GUILD", "GUILE", "GUILT", "GUISE", "GULCH", "GULFS", "GULLS",
    "GULLY", "GULPS", "GUMBO", "GUMMY", "GUNNY", "GUPPY", "GURUS", "GUSHY", "GUSTS", "GUSTY",
    "GUTSY", "GUTTA", "GUYED", "GYROS", "HACKS", "HAIKU", "HAILS", "HAIRS", "HAIRY", "HALED",
    "HALES", "HALLS", "HALOS", "HALTS", "HALVE", "HANDS", "HANDY", "HANGS", "HANKS", "HAUNT",
    "HAVOC", "HAWKS", "HEADS", "HEADY", "HEALS", "HEAPS", "HEARS", "HEATH", "HEATS", "HEDGE",
    "HEEDS", "HEELS", "HEIRS", "HELIX", "HELLS", "HELPS", "HENCE", "HERBS", "HERDS", "HERON",
    "HIDER", "HIDES", "HIGHS", "HIKED", "HIKER", "HIKES", "HILLS", "HILLY", "HILTS", "HINDS",
    "HINGE", "HINTS", "HIPPO", "HIRED", "HIRES", "HITCH", "HIVES", "HOARD", "HOBBY", "HOIST",
    "HOLDS", "HOLES", "HOLLY", "HOMES", "HONEY", "HOODS", "HOOKS", "HOOPS", "HOPED", "HOPES",
    "HORNS", "HORSE", "HOSTS", "HOUND", "HOURS", "HOVER", "HOWLS", "HUMID", "HUNTS", "HURRY",
    "HURTS", "HUSKY", "HYENA", "HYPER", "ICING", "ICONS", "IDEAS", "IDIOM", "IDIOT", "IDLED",
    "IDLES", "IDOLS", "IGLOO", "IMBUE", "IMPEL", "INDIE", "INTER", "IONIC", "ISLES", "ITCHY",
    "ITEMS", "IVORY", "JACKS", "JADED", "JAILS", "JEANS", "JELLY", "JILTS", "JOINS", "JOKED",
    "JOKER", "JOKES", "JOLLY", "JOLTS", "JOULE", "JUICY", "JUMBO", "JUMPS", "JUMPY", "JUNTO",
    "JUROR", "KAPPA", "KARMA", "KEEPS", "KEYED", "KHAKI", "KICKS", "KILOS", "KINDS", "KINGS",
    "KITES", "KNEAD", "KNEEL", "KNEES", "KNELT", "KNITS", "KNOBS", "KNOCK", "KNOTS", "KNOWN",
    "KNOWS", "LACED", "LACES", "LACKS", "LADLE", "LAGER", "LAKES", "LAMBS", "LAMPS", "LANDS",
    "LANES", "LAPEL", "LAPSE", "LARCH", "LARVA", "LASSO", "LASTS", "LATCH", "LATER", "LATEX",
    "LATHE", "LATIN", "LAWNS", "LAXER", "LEADS", "LEAFY", "LEAKS", "LEAKY", "LEANS", "LEANT",
    "LEAPS", "LEAPT", "LEASE", "LEASH", "LEAST", "LEAVE", "LEDGE", "LEECH", "LEFTS", "LEGAL",
    "LEGGY", "LEMUR", "LENDS", "LEVER", "LIKED", "LIKER", "LIKES", "LIMBS", "LIMBO", "LIMES",
    "LINED", "LINEN", "LINER", "LINES", "LINGO", "LIONS", "LIPID", "LISTS", "LIVED", "LIVER",
    "LIVES", "LOADS", "LOANS", "LOBBY", "LOBES", "LOCAL", "LOCKS", "LODGE", "LOGIN", "LOGOS",
    "LOOKS", "LOOPS", "LOOSE", "LORDS", "LOSER", "LOSES", "LOTUS", "LOVED", "LOVER", "LOVES",
    "LOWER", "LUCID", "LUNCH", "LUNGS", "LURCH", "LURED", "LURES", "LYING", "MACRO", "MADAM",
    "MAGMA", "MAILS", "MAKES", "MALES", "MALLS", "MANGO", "MANIA", "MANLY", "MANOR", "MAPLE",
    "MARKS", "MARRY", "MARSH", "MASKS", "MASON", "MATED", "MATES", "MATHS", "MAXIM", "MAZES",
    "MEALS", "MEALY", "MEANS", "MEANT", "MEATS", "MEATY", "MEDAL", "MEDIC", "MEETS", "MELON",
    "MENDS", "MENUS", "MERCY", "MERGE", "MERIT", "MERRY", "MESSY", "METER", "MIDST", "MILKY",
    "MILLS", "MIMIC", "MINCE", "MINDS", "MINED", "MINER", "MINES", "MINOR", "MINTS", "MINUS",
    "MIRTH", "MISER", "MIXED", "MIXER", "MIXES", "MODES", "MOIST", "MOLAR", "MOLDS", "MOLDY",
    "MOLES", "MONKS", "MOODS", "MOODY", "MOONS", "MOOSE", "MOTEL", "MOTIF", "MOTTO", "MOUND",
    "MOURN", "MOUTH", "MOVED", "MOVER", "MOVES", "MOVIE", "MOWED", "MOWER", "MUDDY", "MULES",
    "MULTI", "MURAL", "MUSEM", "MUTED", "MUTES", "MYTHS", "NAILS", "NAIVE", "NAKED", "NAMED",
    "NAMES", "NASAL", "NASTY", "NATAL", "NAVAL", "NAVEL", "NEEDS", "NEEDY", "NEIGH", "NESTS",
    "NEVER", "NEWER", "NEWLY", "NICER", "NICHE", "NIECE", "NINTH", "NOBLY", "NODES", "NOISY",
    "NOMAD", "NOOKS", "NOSED", "NOSES", "NOTED", "NOTES", "NYLON", "OAKEN", "OASIS", "OATHS",
    "OBESE", "OBEYS", "OCCUR", "OCTAL", "ODDER", "ODDLY", "OFFAL", "OFTEN", "OILED", "OILER",
    "OLDEN", "OLDER", "OLIVE", "OMEGA", "ONION", "OPENS", "OPINE", "OPIUM", "OPTED", "OPTIC",
    "OTTER", "OUGHT", "OUNCE", "OUTDO", "OVALS", "OVARY", "OVENS", "OVERT", "OWING", "OWNED",
    "OWNER", "OXIDE", "PACED", "PACER", "PACES", "PACKS", "PACTS", "PAGED", "PAGER", "PAGES",
    "PAINS", "PAIRS", "PALES", "PALMS", "PANIC", "PANTS", "PAPAL", "PARIS", "PARKS", "PASTA",
    "PASTE", "PASTY", "PATCH", "PATHS", "PATIO", "PAVED", "PAVES", "PAWNS", "PAYED", "PAYEE",
    "PAYER", "PEACH", "PEAKS", "PEARS", "PEDAL", "PEELS", "PEERS", "PENAL", "PENCE", "PENNY",
    "PERCH", "PERIL", "PERKS", "PETAL", "PETTY", "PIANO", "PICKS", "PIERS", "PIETY", "PIGGY",
    "PINCH", "PINES", "PINTS", "PIOUS", "PIPED", "PIPES", "PIZZA", "PLAID", "PLANS", "PLAYS",
    "PLEAD", "PLEAS", "PLOTS", "PLUCK", "PLUGS", "PLUMB", "PLUME", "PLUMP", "PLUMS", "PLUSH",
    "POEMS", "POETS", "POISE", "POKER", "POLES", "POLIO", "POLKA", "POLYP", "PONDS", "POOLS",
    "POPES", "POPPY", "PORCH", "PORES", "PORTS", "POSED", "POSER", "POSES", "POSIT", "POSTS",
    "POUCH", "POUND", "POURS", "PRANK", "PRAYR", "PRAYS", "PRICK", "PRIED", "PRIER", "PRIES",
    "PRIMA", "PRINK", "PRIOR", "PROMO", "PRONE", "PRONG", "PROPS", "PROSE", "PROVE", "PROWL",
    "PROXY", "PRUDE", "PRUNE", "PSALM", "PUMPS", "PUNCH", "PUPPY", "PUREE", "PURER", "PURGE",
    "PURSE", "PUSHY", "QUACK", "QUAIL", "QUAKE", "QUALM", "QUARK", "QUART", "QUASH", "QUASI",
    "QUEER", "QUELL", "QUEUE", "QUILL", "QUILT", "QUIRK", "QUITE", "QUOTH", "RABBI", "RABID",
    "RACED", "RACER", "RACES", "RACKS", "RADII", "RADON", "RAFTS", "RAGED", "RAGES", "RAIDS",
    "RAILS", "RAINS", "RAINY", "RAJAH", "RAKED", "RAKES", "RAMPS", "RANDS", "RANGY", "RANKS",
    "RANTS", "RARER", "RASED", "RASPS", "RATED", "RATER", "RATES", "RATTY", "RAVED", "RAVEL",
    "RAVEN", "RAVES", "RAWER", "RAWLY", "RAYON", "RAZOR", "READS", "REALS", "REAMS", "REAPS",
    "REARS", "REBID", "REBUS", "REBUT", "RECAP", "RECTO", "RECUR", "REDID", "REDOS", "REDUX",
    "REEDS", "REEDY", "REEFS", "REEKS", "REELS", "REFER", "REFIT", "REGAL", "REHAB", "REIGN",
    "REINS", "RELAX", "RELAY", "RELIC", "RENAL", "RENDS", "RENEW", "RENTS", "REPAY", "REPEL",
    "REPLY", "RESIN", "RESOW", "RESTS", "RETCH", "RETRO", "RETRY", "REUSE", "REVEL", "REVUE",
    "RHEUM", "RHINO", "RHYME", "RIDES", "RIDGE", "RIFLE", "RIFTS", "RIGID", "RIGOR", "RILED",
    "RILES", "RINGS", "RINSE", "RIOTS", "RIPEN", "RIPER", "RISEN", "RISER", "RISES", "RISKS",
    "RISKY", "RITES", "RITZY", "RIVAL", "RIVEN", "RIVET", "ROADS", "ROAMS", "ROARS", "ROAST",
    "ROBED", "ROBES", "ROBIN", "ROCKS", "RODEO", "ROGUE", "ROLES", "ROLLS", "ROMAN", "ROOFS",
    "ROOKS", "ROOMS", "ROOMY", "ROOST", "ROOTS", "ROPED", "ROPES", "ROSES", "ROTOR", "ROUGE",
    "ROUGH", "ROUSE", "ROUTS", "ROVED", "ROVER", "ROVES", "ROWDY", "ROWED", "ROWER", "RUBLE",
    "RUDDY", "RUDER", "RUFFS", "RUGBY", "RUINS", "RULED", "RULES", "RUMBA", "RUMOR", "RUMPS",
    "RUNGS", "RUNIC", "RUNNY", "RUNTS", "RUPEE", "RUSES", "RUSKS", "RUSTS", "RUSTY", "SABER",
    "SABLE", "SABRE", "SACKS", "SADLY", "SAFER", "SAFES", "SAGAS", "SAGES", "SAILS", "SAINT",
    "SAKES", "SALAD", "SALES", "SALLY", "SALON", "SALSA", "SALTS", "SALTY", "SALVE", "SAMBA",
    "SANDS", "SANDY", "SANER", "SAPID", "SASSY", "SATIN", "SATYR", "SAUCE", "SAUCY", "SAUNA",
    "SAUTE", "SAVED", "SAVER", "SAVES", "SAVOR", "SAVVY", "SAWED", "SAXES", "SCALD", "SCALP",
    "SCAMS", "SCANS", "SCANT", "SCARE", "SCARF", "SCARS", "SCARY", "SCENT", "SCHWA", "SCION",
    "SCOFF", "SCOLD", "SCONE", "SCOOP", "SCOOT", "SCORN", "SCOUR", "SCOWL", "SCRAM", "SCRAP",
    "SCREW", "SCRIM", "SCRIP", "SCUBA", "SCUFF", "SEALS", "SEAMS", "SEAMY", "SEARS", "SEATS",
    "SECTS", "SEDGE", "SEEDS", "SEEDY", "SEEKS", "SEEMS", "SEEPS", "SEERS", "SEGUE", "SEIZE",
    "SEMEN", "SENDS", "SENOR", "SENSE", "SEPAL", "SERFS", "SERIF", "SERUM", "SETUP", "SEVEN",
    "SEVER", "SEWED", "SEWER", "SEXES", "SHACK", "SHADY", "SHAFT", "SHAKY", "SHALE", "SHALL",
    "SHAME", "SHAMS", "SHANK", "SHAPE", "SHARD", "SHARK", "SHAVE", "SHAWL", "SHEAF", "SHEAR",
    "SHEDS", "SHEEN", "SHEEP", "SHEER", "SHEIK", "SHELF", "SHIED", "SHINS", "SHINY", "SHIPS",
    "SHIRE", "SHIRK", "SHIRT", "SHIVA", "SHOAL", "SHOCK", "SHOED", "SHOES", "SHONE", "SHOOK",
    "SHOOT", "SHOPS", "SHORN", "SHOTS", "SHOUT", "SHOVE", "SHOWN", "SHOWS", "SHOWY", "SHRED",
    "SHREW", "SHRUB", "SHRUG", "SHUCK", "SHUNS", "SHUNT", "SHUSH", "SHUTS", "SHYLY", "SIBYL",
    "SICKO", "SICKS", "SIDED", "SIDES", "SIEGE", "SIEVE", "SIFTS", "SIGHS", "SIGMA", "SIGNS",
    "SILKS", "SILKY", "SILLS", "SILLY", "SILOS", "SILTS", "SILTY", "SINCE", "SINES", "SINEW",
    "SINGE", "SINGS", "SINKS", "SINUS", "SIRED", "SIREN", "SIRES", "SITAR", "SITES", "SIXES",
    "SIXTH", "SIXTY", "SIZED", "SIZER", "SIZES", "SKATE", "SKEET", "SKEIN", "SKEWS", "SKIDS",
    "SKIED", "SKIER", "SKIES", "SKIFF", "SKIMP", "SKIMS", "SKINS", "SKIPS", "SKIRT", "SKITS",
    "SKULK", "SKULL", "SKUNK", "SLABS", "SLACK", "SLAGS", "SLAIN", "SLAKE", "SLAMS", "SLANG",
    "SLANT", "SLAPS", "SLASH", "SLATE", "SLATS", "SLAVE", "SLAYS", "SLEDS", "SLEEK", "SLEEP",
    "SLEET", "SLEPT", "SLICE", "SLICK", "SLIDE", "SLIME", "SLIMS", "SLIMY", "SLING", "SLINK",
    "SLIPS", "SLITS", "SLOES", "SLOGS", "SLOOP", "SLOPE", "SLOPS", "SLOSH", "SLOTH", "SLOTS",
    "SLOWS", "SLUGS", "SLUMP", "SLUMS", "SLUNG", "SLUNK", "SLURP", "SLURS", "SLUSH", "SLUTS",
    "SLYLY", "SMACK", "SMALL", "SMASH", "SMEAR", "SMELL", "SMELT", "SMIRK", "SMITE", "SMITH",
    "SMOCK", "SMOKY", "SMOTE", "SNACK", "SNAFU", "SNAGS", "SNAIL", "SNAKE", "SNAKY", "SNAPS",
    "SNARE", "SNARL", "SNEAK", "SNEER", "SNIDE", "SNIFF", "SNIPE", "SNIPS", "SNOBS", "SNOOP",
    "SNORE", "SNORT", "SNOUT", "SNOWS", "SNOWY", "SNUBS", "SNUFF", "SNUGS", "SOAKS", "SOAPS",
    "SOAPY", "SOARS", "SOBER", "SOCKS", "SODAS", "SODOM", "SOFAS", "SOFTY", "SOGGY", "SOILS",
    "SOLED", "SOLES", "SOLOS", "SONAR", "SONGS", "SONIC", "SONNY", "SOOTH", "SOOTY", "SORES",
    "SORRY", "SORTS", "SOULS", "SOUPS", "SOUPY", "SOURS", "SOWED", "SOWER", "SPADE", "SPAMS",
    "SPANK", "SPANS", "SPARE", "SPARS", "SPASM", "SPATE", "SPATS", "SPAWN", "SPAYS", "SPEAR",
    "SPECK", "SPECS", "SPELT", "SPENT", "SPERM", "SPEWS", "SPICY", "SPIED", "SPIEL", "SPIER",
    "SPIES", "SPIKE", "SPIKY", "SPILL", "SPILT", "SPINE", "SPINS", "SPINY", "SPIRE", "SPITE",
    "SPITS", "SPLAT", "SPLIT", "SPOIL", "SPOKE", "SPOOF", "SPOOK", "SPOOL", "SPOON", "SPOOR",
    "SPORE", "SPOTS", "SPOUT", "SPRAY", "SPREE", "SPRIG", "SPUDS", "SPUME", "SPUNK", "SPURS",
    "SPURT", "SQUAT", "SQUIB", "SQUID", "STABS", "STACK", "STAGS", "STAID", "STAIN", "STAIR",
    "STAKE", "STALE", "STALK", "STALL", "STANK", "STARE", "STARK", "STARS", "STASH", "STATS",
    "STAVE", "STAYS", "STEAD", "STEAK", "STEAL", "STEED", "STEEP", "STEER", "STEMS", "STEPS",
    "STERN", "STEWS", "STICK", "STIFF", "STILT", "STING", "STINK", "STINT", "STIRS", "STOIC",
    "STOKE", "STOLE", "STOMP", "STONY", "STOOD", "STOOL", "STOOP", "STOPS", "STORE", "STORK",
    "STOUT", "STOVE", "STRAP", "STRAW", "STRAY", "STRIP", "STRUT", "STUBS", "STUCK", "STUDS",
    "STUFF", "STUMP", "STUNG", "STUNK", "STUNT", "STYLI", "SUAVE", "SUCKS", "SUGAR", "SUING",
    "SUITS", "SULKS", "SULKY", "SULLY", "SUMAC", "SUMMA", "SUMPS", "SUNNY", "SURER", "SURFS",
    "SURGE", "SURLY", "SUSHI", "SWABS", "SWAMP", "SWANK", "SWANS", "SWAPS", "SWARD", "SWARM",
    "SWATH", "SWATS", "SWAYS", "SWEAR", "SWEAT", "SWEDE", "SWEEP", "SWELL", "SWEPT", "SWIGS",
    "SWILL", "SWIMS", "SWINE", "SWING", "SWIPE", "SWIRL", "SWISH", "SWOON", "SWOOP", "SWOPS",
    "SWORD", "SWORE", "SWORN", "SWUNG", "SYLPH", "SYNOD", "SYRUP", "TABBY", "TABOO", "TACIT",
    "TACKS", "TACKY", "TACOS", "TAILS", "TAINT", "TAKEN", "TAKER", "TAKES", "TALES", "TALKS",
    "TALLY", "TALON", "TAMED", "TAMER", "TAMES", "TANGO", "TANGS", "TANGY", "TANKS", "TAPED",
    "TAPER", "TAPES", "TAPIR", "TARDY", "TARES", "TAROT", "TARPS", "TARTS", "TASKS", "TASTY",
    "TATTO", "TAUNT", "TAWNY", "TAXED", "TAXER", "TAXES", "TAXIS", "TEAKS", "TEALS", "TEAMS",
    "TEARS", "TEARY", "TEASE", "TEATS", "TECHS", "TEEMS", "TEENS", "TEENY", "TEETH", "TELEX",
    "TELLS", "TEMPO", "TEMPS", "TEMPT", "TENCH", "TENDS", "TENET", "TENON", "TENOR", "TENSE",
    "TENTH", "TENTS", "TEPEE", "TEPID", "TERMS", "TERNS", "TESTS", "TESTY", "TEXTS", "THAWS",
    "THEFT", "THEIR", "THENS", "THERE", "THESE", "THETA", "THICK", "THIEF", "THIGH", "THINB",
    "THING", "THINK", "THINS", "THIRD", "THONG", "THORN", "THOSE", "THREE", "THREW", "THROB",
    "THROW", "THRUM", "THUDS", "THUGS", "THUMB", "THUMP", "THYME", "TIARA", "TIBIA", "TICKS",
    "TIDAL", "TIDED", "TIDES", "TIERS", "TIFFS", "TIGHT", "TIKES", "TILDE", "TILED", "TILER",
    "TILES", "TILLS", "TILTS", "TIMED", "TIMER", "TIMES", "TIMID", "TINES", "TINGE", "TINGS",
    "TINNY", "TINTS", "TIPPY", "TIPSY", "TIRED", "TIRES", "TITAN", "TITHE", "TOADS", "TOADY",
    "TOAST", "TODDY", "TOFFS", "TOGAS", "TOILS", "TOKEN", "TOLLS", "TOMBS", "TOMES", "TONAL",
    "TONED", "TONER", "TONES", "TONGS", "TOOLS", "TOOTH", "TOOTS", "TOPAZ", "TOPIS", "TOQUE",
    "TORCH", "TOROS", "TORSO", "TORTE", "TORTS", "TOTEM", "TOUGH", "TOURS", "TOUTS", "TOWED",
    "TOWEL", "TOWNS", "TOXIC", "TOXIN", "TRACE", "TRACT", "TRAMP", "TRAMS", "TRAPS", "TRASH",
    "TRAWL", "TRAYS", "TREAD", "TREAT", "TREED", "TREES", "TREKS", "TRIAD", "TRICE", "TRIED",
    "TRIER", "TRIES", "TRILL", "TRIMS", "TRIOS", "TRIPE", "TRIPS", "TRITE", "TROLL", "TROMP",
    "TROOP", "TROPE", "TROTH", "TROUT", "TROVE", "TRUCE", "TRUCK", "TRUED", "TRUER", "TRUES",
    "TRULY", "TRUMP", "TRUNK", "TRUSS", "TRYST", "TUBAL", "TUBAS", "TUBED", "TUBER", "TUBES",
    "TUCKS", "TUFTS", "TULIP", "TULLE", "TUMMY", "TUMOR", "TUNED", "TUNER", "TUNES", "TUNIC",
    "TURBO", "TURFS", "TURNS", "TUTOR", "TUTUS", "TUXES", "TWAIN", "TWANG", "TWEAK", "TWEED",
    "TWEET", "TWICE", "TWIGS", "TWILL", "TWINE", "TWINS", "TWIRL", "TWIST", "TYING", "TYKES",
    "TYPED", "TYPES", "TYPOS", "TYROS", "UDDER", "ULCER", "ULTRA", "UMBER", "UMBRA", "UNBID",
    "UNCUT", "UNDID", "UNDUE", "UNFED", "UNFIT", "UNIFY", "UNITE", "UNITS", "UNLIT", "UNMET",
    "UNSET", "UNTIE", "UNWED", "UNZIP", "UPEND", "UPPED", "UPSET", "URGED", "URGES", "URINE",
    "USERS", "USHER", "USING", "USUAL", "USURP", "USURY", "UTTER", "UVULA", "VAGUE", "VAILS",
    "VALES", "VALET", "VALOR", "VAMPS", "VANES", "VAPID", "VAUNT", "VEALS", "VEGAN", "VEILS",
    "VEINS", "VELAR", "VELDT", "VELUM", "VENAL", "VENDS", "VENOM", "VENTS", "VERBS", "VERGE",
    "VERSE", "VERSO", "VERVE", "VESTS", "VETCH", "VEXED", "VEXES", "VIALS", "VIAND", "VIBES",
    "VICAR", "VICES", "VIGIL", "VILLA", "VINES", "VINYL", "VIOLA", "VIOLS", "VIPER", "VIRAL",
    "VISAS", "VISCO", "VISES", "VISOR", "VISTA", "VIXEN", "VOCAL", "VODKA", "VOGUE", "VOIDS",
    "VOILA", "VOLES", "VOLTS", "VOMIT", "VOTED", "VOTES", "VOUCH", "VOWED", "VOWEL", "VROWS",
    "VULVA", "VYING", "WACKY", "WAFER", "WAFTS", "WAGED", "WAGER", "WAGES", "WAGON", "WAIFS",
    "WAILS", "WAIST", "WAITS", "WAIVE", "WAKED", "WAKEN", "WAKES", "WALKS", "WALLS", "WALTZ",
    "WANDS", "WANES", "WANLY", "WANTS", "WARDS", "WARES", "WARMS", "WARNS", "WARPS", "WARTS",
    "WARTY", "WASHY", "WASPS", "WASTE", "WAVED", "WAVER", "WAVES", "WAXED", "WAXEN", "WAXES",
    "WEARS", "WEARY", "WEAVE", "WEDGE", "WEEDS", "WEEDY", "WEEKS", "WEEPS", "WEEPY", "WEIGS",
    "WEIGH", "WEIRD", "WEIRS", "WELDS", "WELLS", "WELSH", "WELTS", "WENCH", "WETLY", "WHACK",
    "WHALE", "WHARF", "WHEAT", "WHELK", "WHELP", "WHERE", "WHICH", "WHIFF", "WHILE", "WHIMS",
    "WHINE", "WHINY", "WHIPS", "WHIRL", "WHIRR", "WHISK", "WHIST", "WHOMP", "WHOOP", "WHORE",
    "WHORF", "WHOSE", "WICKS", "WIDEN", "WIDER", "WIDOW", "WIDTH", "WIELD", "WIFEY", "WILDS",
    "WILES", "WILLS", "WILLY", "WILTS", "WIMPS", "WIMPY", "WINCE", "WINCH", "WINDS", "WINDY",
    "WINES", "WINGS", "WINKS", "WIPED", "WIPER", "WIPES", "WIRED", "WIRER", "WIRES", "WISER",
    "WISES", "WISPS", "WISPY", "WITCH", "WITTY", "WIVES", "WIZEN", "WOKEN", "WOMAN", "WOMBS",
    "WOMEN", "WOODS", "WOODY", "WOOED", "WOOER", "WOOFS", "WOOLY", "WORDY", "WORKS", "WORMS",
    "WORMY", "WORRY", "WORSE", "WORST", "WOULD", "WOUND", "WOVEN", "WOWED", "WRACK", "WRAPS",
    "WRATH", "WREAK", "WRECK", "WRENS", "WREST", "WRICK", "WRING", "WRIST", "WRITS", "WRONG",
    "WROTE", "WRUNG", "WRYLY", "YARDS", "YARNS", "YAWNS", "YEARN", "YEARS", "YEAST", "YELLS",
    "YELPS", "YOKEL", "YOKES", "YOLKS", "YOURS", "YUMMY", "ZEALS", "ZEBUS", "ZEROS", "ZESTS",
    "ZESTY", "ZILCH", "ZINCS", "ZINGS", "ZINGY", "ZIPPY", "ZONAL", "ZONED", "ZONES"
  ];

  // Strict runtime 5-letter filter ensures NO 4-letter or non-5-letter words can ever slip in
  var TARGET_WORDS = RAW_TARGET_WORDS.filter(function (w) {
    return typeof w === "string" && w.length === 5 && /^[A-Z]{5}$/.test(w);
  });

  var VALID_GUESSES = new Set(
    TARGET_WORDS.concat(
      RAW_EXTRA_GUESSES.filter(function (w) {
        return typeof w === "string" && w.length === 5 && /^[A-Z]{5}$/.test(w);
      })
    )
  );

  // --- AUDIO SYNTHESIZER ---
  var audioCtx = null;
  function getAudioContext() {
    if (!audioCtx && (window.AudioContext || window.webkitAudioContext)) {
      var AudioCtor = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioCtor();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playSound(type) {
    if (settings.muted) return;
    try {
      var ctx = getAudioContext();
      if (!ctx) return;
      var now = ctx.currentTime;

      if (type === 'key') {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(70, now + 0.035);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.035);
      } else if (type === 'reveal') {
        var osc2 = ctx.createOscillator();
        var gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(320, now);
        osc2.frequency.exponentialRampToValueAtTime(480, now + 0.08);
        gain2.gain.setValueAtTime(0.08, now);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now);
        osc2.stop(now + 0.08);
      } else if (type === 'error') {
        var osc3 = ctx.createOscillator();
        var gain3 = ctx.createGain();
        osc3.type = 'sawtooth';
        osc3.frequency.setValueAtTime(120, now);
        osc3.frequency.setValueAtTime(95, now + 0.08);
        gain3.gain.setValueAtTime(0.1, now);
        gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc3.connect(gain3);
        gain3.connect(ctx.destination);
        osc3.start(now);
        osc3.stop(now + 0.18);
      } else if (type === 'win') {
        var notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
        notes.forEach(function (freq, index) {
          var noteOsc = ctx.createOscillator();
          var noteGain = ctx.createGain();
          noteOsc.type = 'sine';
          noteOsc.frequency.setValueAtTime(freq, now + index * 0.09);
          noteGain.gain.setValueAtTime(0.15, now + index * 0.09);
          noteGain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.09 + 0.35);
          noteOsc.connect(noteGain);
          noteGain.connect(ctx.destination);
          noteOsc.start(now + index * 0.09);
          noteOsc.stop(now + index * 0.09 + 0.35);
        });
      }
    } catch (e) {}
  }

  // --- SETTINGS & STATS ---
  var settings = loadSettings();
  var stats = loadStats();

  function loadSettings() {
    try {
      var saved = localStorage.getItem(STORAGE_SETTINGS);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return { muted: false };
  }

  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_SETTINGS, JSON.stringify(settings));
    } catch (e) {}
  }

  function loadStats() {
    try {
      var saved = localStorage.getItem(STORAGE_STATS);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      played: 0,
      wins: 0,
      currentStreak: 0,
      maxStreak: 0,
      guessDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
      lastPlayedDay: null
    };
  }

  function saveStats() {
    try {
      localStorage.setItem(STORAGE_STATS, JSON.stringify(stats));
    } catch (e) {}
  }

  // --- DAILY PUZZLE CALCULATOR ---
  // Guaranteed to deterministically provide a unique target word every single day at midnight!
  function getDailyPuzzle() {
    var anchor = new Date(2026, 0, 1).getTime(); // Jan 1, 2026 anchor
    var now = new Date();
    var todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    var dayIndex = Math.round((todayMidnight - anchor) / 86400000);
    
    // Deterministic pseudo-random sequence for non-linear word sequence
    var hashed = Math.abs(Math.floor(Math.sin(dayIndex + 1) * 100000)) % TARGET_WORDS.length;
    var target = TARGET_WORDS[hashed].toUpperCase();

    var year = now.getFullYear();
    var month = String(now.getMonth() + 1).padStart(2, '0');
    var day = String(now.getDate()).padStart(2, '0');
    var dateStr = year + '-' + month + '-' + day;

    return {
      dayNumber: dayIndex + 1,
      dateStr: dateStr,
      targetWord: target
    };
  }

  // --- GAME STATE ---
  var state = {
    puzzle: null,
    guesses: [],
    currentGuess: '',
    status: 'IN_PROGRESS', // 'IN_PROGRESS', 'WON', 'LOST'
    letterStatuses: {}, // e.g. { A: 'correct', B: 'present', C: 'absent' }
    currentRow: 0
  };

  function loadGameState(puzzle) {
    var storageKey = DAILY_PREFIX + puzzle.dateStr;
    try {
      var saved = localStorage.getItem(storageKey);
      if (saved) {
        var parsed = JSON.parse(saved);
        return parsed;
      }
    } catch (e) {}
    return null;
  }

  function saveGameState() {
    var data = {
      targetWord: state.puzzle.targetWord,
      guesses: state.guesses,
      status: state.status,
      letterStatuses: state.letterStatuses,
      currentRow: state.currentRow
    };
    try {
      localStorage.setItem(DAILY_PREFIX + state.puzzle.dateStr, JSON.stringify(data));
    } catch (e) {}
  }

  // --- GUESS EVALUATION LOGIC ---
  // Returns array of 5 statuses: 'correct' (Green), 'present' (Orange), or 'absent' (Gray)
  function evaluateGuess(guess, target) {
    var result = ['absent', 'absent', 'absent', 'absent', 'absent'];
    var targetArr = target.split('');
    var guessArr = guess.split('');
    var targetLetterCounts = {};

    for (var i = 0; i < 5; i++) {
      var char = targetArr[i];
      targetLetterCounts[char] = (targetLetterCounts[char] || 0) + 1;
    }

    // Pass 1: Find Exact Matches (Green / Correct)
    for (var i = 0; i < 5; i++) {
      if (guessArr[i] === targetArr[i]) {
        result[i] = 'correct';
        targetLetterCounts[guessArr[i]]--;
      }
    }

    // Pass 2: Find Present in Wrong Spot (Orange / Present)
    for (var i = 0; i < 5; i++) {
      if (result[i] !== 'correct' && targetLetterCounts[guessArr[i]] > 0) {
        result[i] = 'present';
        targetLetterCounts[guessArr[i]]--;
      }
    }

    return result;
  }

  // --- DOM & UI CREATION ---
  var modalEl = null;
  var boardEl = null;
  var keyboardEl = null;
  var toastContainer = null;
  var confettiCanvas = null;
  var isInitialized = false;

  function createWordleUI() {
    if (isInitialized) return;
    isInitialized = true;

    // 1. Check/create launcher toggle button on top of theme toggle
    var toggleBtn = document.getElementById('wordleToggle');
    if (!toggleBtn) {
      toggleBtn = document.createElement('button');
      toggleBtn.id = 'wordleToggle';
      toggleBtn.className = 'wordle-toggle';
      toggleBtn.type = 'button';
      toggleBtn.setAttribute('aria-label', 'Play Mulat Wordle');
      toggleBtn.setAttribute('data-tooltip', 'Play Wordle');
      toggleBtn.innerHTML = [
        '<svg class="wordle-toggle-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">',
        '  <rect x="3" y="3" width="7.5" height="7.5" rx="2" fill="#22c55e" stroke="#22c55e"></rect>',
        '  <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" fill="#f97316" stroke="#f97316"></rect>',
        '  <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" fill="#64748b" stroke="#64748b"></rect>',
        '  <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" fill="#22c55e" stroke="#22c55e"></rect>',
        '  <text x="6.75" y="8.5" font-family="League Spartan, sans-serif" font-size="7" font-weight="900" fill="#ffffff" text-anchor="middle">W</text>',
        '</svg>'
      ].join('');

      var themeToggle = document.getElementById('themeToggle');
      if (themeToggle && themeToggle.parentNode) {
        themeToggle.parentNode.insertBefore(toggleBtn, themeToggle);
      } else {
        document.body.appendChild(toggleBtn);
      }
    }

    toggleBtn.addEventListener('click', function () {
      openModal();
    });

    // 2. Create Wordle Modal Container
    if (!document.getElementById('wordleModal')) {
      modalEl = document.createElement('div');
      modalEl.id = 'wordleModal';
      modalEl.className = 'wordle-modal-overlay';
      modalEl.setAttribute('role', 'dialog');
      modalEl.setAttribute('aria-modal', 'true');
      modalEl.setAttribute('aria-label', 'Mulat Wordle Game');

      modalEl.innerHTML = [
        '<div class="wordle-dialog">',
        '  <canvas id="wordleConfettiCanvas"></canvas>',
        '  <div class="wordle-toast-container" id="wordleToastContainer"></div>',
        '  <header class="wordle-header">',
        '    <div class="wordle-header-left">',
        '      <button class="wordle-icon-btn" id="wordleHelpBtn" title="How to Play" aria-label="How to play">',
        '        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">',
        '          <circle cx="12" cy="12" r="10"></circle>',
        '          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>',
        '          <line x1="12" y1="17" x2="12.01" y2="17"></line>',
        '        </svg>',
        '      </button>',
        '      <button class="wordle-icon-btn" id="wordleMuteBtn" title="Toggle Sound" aria-label="Toggle sound">',
        '        <svg id="wordleMuteIcon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">',
        '          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>',
        '          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>',
        '        </svg>',
        '      </button>',
        '    </div>',
        '    <div class="wordle-title-wrap">',
        '      <h2 class="wordle-title">',
        '        Mulat Wordle',
        '        <span class="wordle-badge" id="wordleModeBadge">Daily</span>',
        '      </h2>',
        '      <span class="wordle-subtitle" id="wordleSubtitle">6 Tries • 5 Letters</span>',
        '    </div>',
        '    <div class="wordle-header-right">',
        '      <button class="wordle-icon-btn" id="wordleStatsBtn" title="Statistics" aria-label="View statistics">',
        '        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">',
        '          <line x1="18" y1="20" x2="18" y2="10"></line>',
        '          <line x1="12" y1="20" x2="12" y2="4"></line>',
        '          <line x1="6" y1="20" x2="6" y2="14"></line>',
        '        </svg>',
        '      </button>',
        '      <button class="wordle-icon-btn" id="wordleCloseBtn" title="Close" aria-label="Close modal">',
        '        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">',
        '          <line x1="18" y1="6" x2="6" y2="18"></line>',
        '          <line x1="6" y1="6" x2="18" y2="18"></line>',
        '        </svg>',
        '      </button>',
        '    </div>',
        '  </header>',
        '  <div class="wordle-body">',
        '    <div class="wordle-board-container">',
        '      <div class="wordle-board" id="wordleBoard"></div>',
        '    </div>',
        '    <div class="wordle-keyboard" id="wordleKeyboard"></div>',
        '  </div>',
        '  <!-- SUBVIEW: HELP -->',
        '  <div class="wordle-subview" id="wordleHelpView">',
        '    <h3 class="wordle-subview-title">How to Play</h3>',
        '    <p class="wordle-help-text">Guess the <strong>DAILY MULAT WORDLE</strong> in 6 tries. A new puzzle is released every day at midnight!</p>',
        '    <p class="wordle-help-text">After each guess, the color of the tiles will change to show how close your guess was to the word.</p>',
        '    <div class="wordle-example-wrap">',
        '      <div class="wordle-example-row">',
        '        <div class="wordle-example-tile correct">M</div>',
        '        <div class="wordle-example-tile">E</div>',
        '        <div class="wordle-example-tile">D</div>',
        '        <div class="wordle-example-tile">I</div>',
        '        <div class="wordle-example-tile">A</div>',
        '      </div>',
        '      <div class="wordle-example-desc"><strong>Green</strong> (<code>M</code>) is in the word and in the <strong>correct spot</strong>.</div>',
        '      <div class="wordle-example-row">',
        '        <div class="wordle-example-tile">P</div>',
        '        <div class="wordle-example-tile present">R</div>',
        '        <div class="wordle-example-tile">E</div>',
        '        <div class="wordle-example-tile">S</div>',
        '        <div class="wordle-example-tile">S</div>',
        '      </div>',
        '      <div class="wordle-example-desc"><strong>Orange</strong> (<code>R</code>) is in the word but in the <strong>wrong spot</strong>.</div>',
        '      <div class="wordle-example-row">',
        '        <div class="wordle-example-tile">S</div>',
        '        <div class="wordle-example-tile">T</div>',
        '        <div class="wordle-example-tile absent">O</div>',
        '        <div class="wordle-example-tile">R</div>',
        '        <div class="wordle-example-tile">Y</div>',
        '      </div>',
        '      <div class="wordle-example-desc"><strong>Gray</strong> (<code>O</code>) is <strong>not in the word</strong> in any spot.</div>',
        '    </div>',
        '    <div class="wordle-subview-actions">',
        '      <button class="wordle-btn-primary" id="wordleHelpCloseBtn">Got it! Let\'s Play</button>',
        '    </div>',
        '  </div>',
        '  <!-- SUBVIEW: STATS & RESULTS -->',
        '  <div class="wordle-subview" id="wordleStatsView">',
        '    <h3 class="wordle-subview-title" id="wordleStatsTitle">Statistics</h3>',
        '    <div class="wordle-stats-grid">',
        '      <div class="wordle-stat-box">',
        '        <div class="wordle-stat-value" id="statPlayed">0</div>',
        '        <div class="wordle-stat-label">Played</div>',
        '      </div>',
        '      <div class="wordle-stat-box">',
        '        <div class="wordle-stat-value" id="statWinRate">0%</div>',
        '        <div class="wordle-stat-label">Win %</div>',
        '      </div>',
        '      <div class="wordle-stat-box">',
        '        <div class="wordle-stat-value" id="statCurrentStreak">0</div>',
        '        <div class="wordle-stat-label">Current Streak</div>',
        '      </div>',
        '      <div class="wordle-stat-box">',
        '        <div class="wordle-stat-value" id="statMaxStreak">0</div>',
        '        <div class="wordle-stat-label">Max Streak</div>',
        '      </div>',
        '    </div>',
        '    <div class="wordle-dist-title">Guess Distribution</div>',
        '    <div class="wordle-dist-chart" id="wordleDistChart"></div>',
        '    <div class="wordle-countdown-box" id="wordleCountdownBox">',
        '      <div class="wordle-countdown-label">Next Daily Wordle In</div>',
        '      <div class="wordle-countdown-time" id="wordleCountdown">--:--:--</div>',
        '    </div>',
        '    <div class="wordle-subview-actions">',
        '      <button class="wordle-btn-secondary" id="wordleStatsCloseBtn">View Board</button>',
        '      <button class="wordle-btn-primary" id="wordleShareBtn">',
        '        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">',
        '          <circle cx="18" cy="5" r="3"></circle>',
        '          <circle cx="6" cy="12" r="3"></circle>',
        '          <circle cx="18" cy="19" r="3"></circle>',
        '          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>',
        '          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>',
        '        </svg>',
        '        Share Result',
        '      </button>',
        '    </div>',
        '  </div>',
        '</div>'
      ].join('');

      document.body.appendChild(modalEl);
    }

    boardEl = document.getElementById('wordleBoard');
    keyboardEl = document.getElementById('wordleKeyboard');
    toastContainer = document.getElementById('wordleToastContainer');
    confettiCanvas = document.getElementById('wordleConfettiCanvas');

    bindEvents();
  }

  function renderBoard() {
    if (!boardEl) return;
    boardEl.innerHTML = '';

    for (var r = 0; r < 6; r++) {
      var row = document.createElement('div');
      row.className = 'wordle-row';
      row.setAttribute('data-row', r);

      var guess = state.guesses[r];
      var isCurrent = (r === state.currentRow && state.status === 'IN_PROGRESS');
      var evalResult = guess ? evaluateGuess(guess, state.puzzle.targetWord) : null;

      for (var c = 0; c < 5; c++) {
        var tile = document.createElement('div');
        tile.className = 'wordle-tile';
        tile.setAttribute('data-col', c);

        if (guess) {
          tile.textContent = guess[c];
          if (evalResult) {
            tile.classList.add(evalResult[c]);
          }
        } else if (isCurrent && state.currentGuess[c]) {
          tile.textContent = state.currentGuess[c];
          tile.classList.add('pop');
        }

        row.appendChild(tile);
      }
      boardEl.appendChild(row);
    }
  }

  function renderKeyboard() {
    if (!keyboardEl) return;
    keyboardEl.innerHTML = '';

    var rows = [
      ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
      ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
      ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE']
    ];

    rows.forEach(function (rowKeys) {
      var rowEl = document.createElement('div');
      rowEl.className = 'wordle-key-row';

      rowKeys.forEach(function (key) {
        var btn = document.createElement('button');
        btn.className = 'wordle-key';
        btn.setAttribute('data-key', key);

        if (key === 'ENTER') {
          btn.classList.add('key-wide');
          btn.textContent = 'ENTER';
        } else if (key === 'BACKSPACE') {
          btn.classList.add('key-wide');
          btn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"></path><line x1="18" y1="9" x2="12" y2="15"></line><line x1="12" y1="9" x2="18" y2="15"></line></svg>';
          btn.setAttribute('aria-label', 'Backspace');
        } else {
          btn.textContent = key;
          var status = state.letterStatuses[key];
          if (status) {
            btn.classList.add(status);
          }
        }

        btn.addEventListener('click', function (e) {
          e.preventDefault();
          handleKeyInput(key);
        });

        rowEl.appendChild(btn);
      });

      keyboardEl.appendChild(rowEl);
    });
  }

  function updateMuteIcon() {
    var icon = document.getElementById('wordleMuteIcon');
    if (!icon) return;
    if (settings.muted) {
      icon.innerHTML = [
        '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>',
        '<line x1="23" y1="9" x2="17" y2="15"></line>',
        '<line x1="17" y1="9" x2="23" y2="15"></line>'
      ].join('');
    } else {
      icon.innerHTML = [
        '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>',
        '<path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>'
      ].join('');
    }
  }

  // --- GAME ACTIONS & INPUTS ---
  function handleKeyInput(key) {
    if (state.status !== 'IN_PROGRESS') {
      if (key === 'ENTER' || key === 'BACKSPACE' || /^[A-Z]$/.test(key)) {
        showToast("You've completed today's Wordle! Next puzzle arrives at midnight 🌙", 2200);
      }
      return;
    }

    if (key === 'BACKSPACE' || key === 'BACK') {
      if (state.currentGuess.length > 0) {
        state.currentGuess = state.currentGuess.slice(0, -1);
        playSound('key');
        updateCurrentRowTiles();
      }
    } else if (key === 'ENTER') {
      submitGuess();
    } else if (/^[A-Z]$/.test(key)) {
      if (state.currentGuess.length < 5) {
        state.currentGuess += key;
        playSound('key');
        updateCurrentRowTiles();
      }
    }
  }

  function updateCurrentRowTiles() {
    var rowEl = boardEl.querySelector('.wordle-row[data-row="' + state.currentRow + '"]');
    if (!rowEl) return;
    var tiles = rowEl.querySelectorAll('.wordle-tile');

    for (var i = 0; i < 5; i++) {
      var tile = tiles[i];
      var letter = state.currentGuess[i] || '';
      tile.textContent = letter;
      if (letter) {
        tile.classList.add('pop');
      } else {
        tile.classList.remove('pop');
      }
    }
  }

  function submitGuess() {
    if (state.currentGuess.length < 5) {
      showToast('Not enough letters');
      shakeCurrentRow();
      playSound('error');
      return;
    }

    var guess = state.currentGuess.toUpperCase();

    // Word validation against dictionary
    if (!VALID_GUESSES.has(guess)) {
      showToast('Not in word list');
      shakeCurrentRow();
      playSound('error');
      return;
    }

    var target = state.puzzle.targetWord;
    var evalResults = evaluateGuess(guess, target);

    // Disable input while animating
    var prevStatus = state.status;
    state.status = 'ANIMATING';

    var rowEl = boardEl.querySelector('.wordle-row[data-row="' + state.currentRow + '"]');
    var tiles = rowEl.querySelectorAll('.wordle-tile');

    // Sequential flip animation
    var flipDuration = 250;
    evalResults.forEach(function (res, colIdx) {
      setTimeout(function () {
        var tile = tiles[colIdx];
        tile.classList.add('flip-in');
        playSound('reveal');

        setTimeout(function () {
          tile.classList.remove('flip-in');
          tile.classList.add(res); // Adds 'correct' (green), 'present' (orange), or 'absent' (gray)
          tile.classList.add('flip-out');

          // Update letter status on keyboard (green overrides orange overrides gray)
          var letter = guess[colIdx];
          var curStatus = state.letterStatuses[letter];
          if (res === 'correct' || (res === 'present' && curStatus !== 'correct') || (!curStatus && res === 'absent')) {
            state.letterStatuses[letter] = res;
          }
          updateKeyStyle(letter, state.letterStatuses[letter]);
        }, flipDuration);
      }, colIdx * 250);
    });

    // After all 5 tiles revealed
    setTimeout(function () {
      state.guesses.push(guess);
      state.currentGuess = '';
      state.currentRow++;

      if (guess === target) {
        // WIN!
        state.status = 'WON';
        saveGameState();
        recordWin(state.currentRow);
        playSound('win');
        celebrateWin(rowEl);
        setTimeout(function () {
          var victoryMessages = ["Genius! 🌟", "Magnificent! 📰", "Splendid! ✨", "Great Job! 🎯", "Phew! 👏", "Masterful! 🗞️"];
          var msg = victoryMessages[state.currentRow - 1] || "Well Done!";
          showToast(msg, 3000);
          setTimeout(function () {
            openStatsView();
          }, 1800);
        }, 1200);
      } else if (state.currentRow >= 6) {
        // LOSS!
        state.status = 'LOST';
        saveGameState();
        recordLoss();
        playSound('error');
        setTimeout(function () {
          showToast('The word was: ' + target, 4500);
          setTimeout(function () {
            openStatsView();
          }, 2000);
        }, 1000);
      } else {
        // Continue Game
        state.status = 'IN_PROGRESS';
        saveGameState();
      }
    }, 5 * 250 + flipDuration + 100);
  }

  function updateKeyStyle(letter, status) {
    if (!keyboardEl) return;
    var keyBtn = keyboardEl.querySelector('.wordle-key[data-key="' + letter + '"]');
    if (!keyBtn) return;
    keyBtn.classList.remove('correct', 'present', 'absent');
    keyBtn.classList.add(status);
  }

  function shakeCurrentRow() {
    var rowEl = boardEl.querySelector('.wordle-row[data-row="' + state.currentRow + '"]');
    if (!rowEl) return;
    rowEl.classList.remove('shake');
    void rowEl.offsetWidth; // Trigger reflow
    rowEl.classList.add('shake');
  }

  function celebrateWin(rowEl) {
    if (!rowEl) return;
    var tiles = rowEl.querySelectorAll('.wordle-tile');
    tiles.forEach(function (tile, index) {
      setTimeout(function () {
        tile.classList.add('dance');
      }, index * 100);
    });
    launchConfetti();
  }

  // --- STATS RECORDING ---
  function recordWin(numGuesses) {
    stats.played++;
    stats.wins++;
    stats.currentStreak++;
    if (stats.currentStreak > stats.maxStreak) {
      stats.maxStreak = stats.currentStreak;
    }
    stats.guessDistribution[numGuesses] = (stats.guessDistribution[numGuesses] || 0) + 1;
    saveStats();
  }

  function recordLoss() {
    stats.played++;
    stats.currentStreak = 0;
    saveStats();
  }

  // --- TOAST NOTIFICATIONS ---
  function showToast(msg, duration) {
    if (!toastContainer) return;
    duration = duration || 2000;
    var toast = document.createElement('div');
    toast.className = 'wordle-toast';
    toast.textContent = msg;
    toastContainer.appendChild(toast);

    requestAnimationFrame(function () {
      toast.classList.add('show');
    });

    setTimeout(function () {
      toast.classList.remove('show');
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 250);
    }, duration);
  }

  // --- CONFETTI PARTICLE SYSTEM ---
  function launchConfetti() {
    if (!confettiCanvas) return;
    var ctx = confettiCanvas.getContext('2d');
    if (!ctx) return;

    var parent = confettiCanvas.parentElement;
    confettiCanvas.width = parent.clientWidth;
    confettiCanvas.height = parent.clientHeight;

    var particles = [];
    var colors = ['#22c55e', '#f97316', '#1E4FA0', '#0091D6', '#f59e0b', '#ec4899', '#8b5cf6'];

    for (var i = 0; i < 90; i++) {
      particles.push({
        x: confettiCanvas.width / 2 + (Math.random() * 40 - 20),
        y: confettiCanvas.height / 2 + 50,
        vx: (Math.random() - 0.5) * 16,
        vy: -Math.random() * 14 - 8,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 12,
        gravity: 0.45,
        drag: 0.96,
        alpha: 1
      });
    }

    var animId;
    var startTime = Date.now();

    function render() {
      ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
      var elapsed = Date.now() - startTime;
      var activeCount = 0;

      particles.forEach(function (p) {
        p.vx *= p.drag;
        p.vy += p.gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;
        if (elapsed > 1800) {
          p.alpha -= 0.02;
        }

        if (p.alpha > 0) {
          activeCount++;
          ctx.save();
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
          ctx.restore();
        }
      });

      if (activeCount > 0 && elapsed < 3500) {
        animId = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
      }
    }

    render();
  }

  // --- SUBVIEWS: STATS & HELP ---
  function openHelpView() {
    closeSubviews();
    var view = document.getElementById('wordleHelpView');
    if (view) view.classList.add('active');
  }

  function openStatsView() {
    closeSubviews();
    updateStatsDisplay();
    var view = document.getElementById('wordleStatsView');
    if (view) view.classList.add('active');
  }

  function closeSubviews() {
    var views = document.querySelectorAll('.wordle-subview');
    views.forEach(function (v) { v.classList.remove('active'); });
  }

  function updateStatsDisplay() {
    document.getElementById('statPlayed').textContent = stats.played;
    var winPct = stats.played > 0 ? Math.round((stats.wins / stats.played) * 100) : 0;
    document.getElementById('statWinRate').textContent = winPct + '%';
    document.getElementById('statCurrentStreak').textContent = stats.currentStreak;
    document.getElementById('statMaxStreak').textContent = stats.maxStreak;

    var chartEl = document.getElementById('wordleDistChart');
    if (!chartEl) return;
    chartEl.innerHTML = '';

    var maxGuessCount = 1;
    for (var g = 1; g <= 6; g++) {
      if (stats.guessDistribution[g] > maxGuessCount) {
        maxGuessCount = stats.guessDistribution[g];
      }
    }

    for (var i = 1; i <= 6; i++) {
      var count = stats.guessDistribution[i] || 0;
      var pct = Math.max(7, Math.round((count / maxGuessCount) * 100));
      var isCurrentWinRow = (state.status === 'WON' && state.currentRow === i);

      var row = document.createElement('div');
      row.className = 'wordle-dist-row';
      row.innerHTML = [
        '<div class="wordle-dist-num">' + i + '</div>',
        '<div class="wordle-dist-bar-wrap">',
        '  <div class="wordle-dist-bar' + (isCurrentWinRow ? ' highlight' : '') + '" style="width:' + pct + '%">' + count + '</div>',
        '</div>'
      ].join('');

      chartEl.appendChild(row);
    }

    startCountdownTimer();
  }

  // --- COUNTDOWN TIMER TO NEXT DAILY WORDLE ---
  var countdownInterval = null;
  function startCountdownTimer() {
    if (countdownInterval) clearInterval(countdownInterval);
    updateCountdownText();
    countdownInterval = setInterval(updateCountdownText, 1000);
  }

  function updateCountdownText() {
    var countdownEl = document.getElementById('wordleCountdown');
    if (!countdownEl) return;
    var now = new Date();
    var tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
    var diff = Math.max(0, tomorrow.getTime() - now.getTime());

    if (diff <= 0) {
      // Midnight crossed! Auto load new daily puzzle
      if (countdownInterval) clearInterval(countdownInterval);
      startNewGame();
      return;
    }

    var hours = Math.floor(diff / (1000 * 60 * 60));
    var mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    var secs = Math.floor((diff % (1000 * 60)) / 1000);

    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    countdownEl.textContent = pad(hours) + ':' + pad(mins) + ':' + pad(secs);
  }

  // --- SHARE RESULT TO CLIPBOARD ---
  function shareResult() {
    if (state.guesses.length === 0) return;

    var puzzleTitle = 'Mulat Wordle #' + state.puzzle.dayNumber;
    var scoreStr = state.status === 'WON' ? state.currentRow + '/6' : 'X/6';

    var rows = [puzzleTitle + ' ' + scoreStr, ''];

    state.guesses.forEach(function (guess) {
      var evals = evaluateGuess(guess, state.puzzle.targetWord);
      var emojiRow = evals.map(function (res) {
        if (res === 'correct') return '🟩';
        if (res === 'present') return '🟧';
        return '⬛';
      }).join('');
      rows.push(emojiRow);
    });

    rows.push('');
    rows.push('Mulat Media — Stories That Inform.');
    var text = rows.join('\n');

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        showToast('Copied result to clipboard! 📋');
      }).catch(function () {
        fallbackCopy(text);
      });
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      document.execCommand('copy');
      showToast('Copied result to clipboard! 📋');
    } catch (e) {
      showToast('Could not copy result');
    }
    document.body.removeChild(ta);
  }

  // --- GAME INITIALIZATION (DAILY ONLY) ---
  function startNewGame() {
    var puzzle = getDailyPuzzle();
    state.puzzle = puzzle;
    state.currentGuess = '';

    var badge = document.getElementById('wordleModeBadge');
    var subtitle = document.getElementById('wordleSubtitle');
    if (badge) {
      badge.textContent = 'Daily #' + puzzle.dayNumber;
    }
    if (subtitle) {
      subtitle.textContent = puzzle.dateStr + ' • 1 Play per Day';
    }

    var saved = loadGameState(puzzle);
    if (saved) {
      state.guesses = saved.guesses || [];
      state.status = saved.status || 'IN_PROGRESS';
      state.letterStatuses = saved.letterStatuses || {};
      state.currentRow = saved.currentRow || state.guesses.length;
      state.puzzle.targetWord = saved.targetWord || state.puzzle.targetWord;
    } else {
      state.guesses = [];
      state.status = 'IN_PROGRESS';
      state.letterStatuses = {};
      state.currentRow = 0;
    }

    renderBoard();
    renderKeyboard();
    closeSubviews();

    if (state.status !== 'IN_PROGRESS') {
      setTimeout(function () {
        openStatsView();
      }, 400);
    }
  }

  // --- EVENT BINDINGS ---
  function bindEvents() {
    // Keyboard listeners
    document.addEventListener('keydown', function (e) {
      if (!modalEl || !modalEl.classList.contains('wordle-active')) return;
      if (document.querySelector('.wordle-subview.active')) {
        if (e.key === 'Escape') closeSubviews();
        return;
      }

      if (e.key === 'Escape') {
        closeModal();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleKeyInput('ENTER');
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleKeyInput('BACKSPACE');
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        handleKeyInput(e.key.toUpperCase());
      }
    });

    // Close button & outside click
    document.getElementById('wordleCloseBtn').addEventListener('click', closeModal);
    modalEl.addEventListener('click', function (e) {
      if (e.target === modalEl) closeModal();
    });

    // Header buttons & subview actions
    document.getElementById('wordleHelpBtn').addEventListener('click', openHelpView);
    document.getElementById('wordleHelpCloseBtn').addEventListener('click', closeSubviews);
    document.getElementById('wordleStatsBtn').addEventListener('click', openStatsView);
    document.getElementById('wordleStatsCloseBtn').addEventListener('click', closeSubviews);
    document.getElementById('wordleShareBtn').addEventListener('click', shareResult);

    document.getElementById('wordleMuteBtn').addEventListener('click', function () {
      settings.muted = !settings.muted;
      saveSettings();
      updateMuteIcon();
    });

    updateMuteIcon();
  }

  function openModal() {
    if (!isInitialized) {
      createWordleUI();
    }
    startNewGame();
    if (modalEl) modalEl.classList.add('wordle-active');
  }

  function closeModal() {
    if (modalEl) modalEl.classList.remove('wordle-active');
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
    closeSubviews();
  }

  // --- INITIALIZE ON DOM READY ---
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      createWordleUI();
    });
  } else {
    createWordleUI();
  }

})();
