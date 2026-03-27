// ============================================================
// ALL FIVES DOMINOES — Localization
// ============================================================
// Phrases stored as compact arrays: [category][generation][tier] = [strings]
// Categories: o=opponent, t=teammate, d=draw, w=domino(win)
// Generations: z=gen_z, m=millennial, x=gen_x, b=boomer
// Tiers: 0=low, 1=mid, 2=high

const LOCALES = {};

// ---- ENGLISH ----
LOCALES.en = {
  name: 'English',
  flag: '🇺🇸',
  dir: 'ltr',
  names: [
    'Carlos','Maria','James','Aisha','Yuki','Priya','Liam','Sofia','Omar','Elena',
    'Diego','Fatima','Chen','Amara','Raj','Lucia','Kofi','Ingrid','Mateo','Zara',
    'Dante','Mei','Nico','Isla','Tariq','Rosa','Sven','Leila','Marco','Anya',
    'Felix','Nadia','Hugo','Cleo','Ravi','Mila','Axel','Dina','Leo','Vera'
  ],
  cities: [
    'Miami, FL','Brooklyn, NY','Houston, TX','Chicago, IL','Atlanta, GA',
    'Phoenix, AZ','Denver, CO','Seattle, WA','Boston, MA','Nashville, TN',
    'Portland, OR','Austin, TX','Detroit, MI','Memphis, TN','Oakland, CA',
    'Philly, PA','New Orleans, LA','San Diego, CA','Dallas, TX','Baltimore, MD'
  ],
  ui: {
    startGame: 'Start Game', resumeGame: '▶ Resume Saved Game', rematch: 'Rematch',
    newGame: 'New Game', copyLog: '📋 Copy Game Log', copied: '✅ Copied!',
    gameMode: 'Game Mode', ffa: 'Free For All', teams: '2v2 Teams',
    opponents: 'Opponents', playTo: 'Play To', custom: 'Custom',
    aiDifficulty: 'AI Difficulty', easy: '😊 Easy', mixed: '🎲 Mixed', hard: '🧠 Hard',
    gameSpeed: 'Game Speed', fast: '🐇 Fast', normal: '🎯 Normal', slow: '🐢 Slow',
    players: 'Players', rules: '📖 Rules', tutorial: '🎓 Tutorial',
    gameLog: '📋 Game Log', tileTracker: '🔍 Tile Tracker',
    stats: '📊 Stats & Achievements', prefs: '🎨 Preferences',
    shortcuts: '❓ Shortcuts', rageQuit: '💀 Rage Quit (counts as loss)',
    draw: 'Draw', pass: 'Pass', hint: '💡 Hint (-5 pts)', tiles: '🔍 Tiles',
    yourTurn: 'YOUR TURN', thinking: 'Thinking', turn: 'turn',
    bones: 'bones', openEnds: 'Open Ends', noScore: 'No score',
    scores: 'Scores', lastPlayed: 'Last Played', youPlayed: 'You played',
    played: 'played', round: 'Round', gameOver: 'GAME OVER',
    youWin: '🏆 You Win!', wins: 'Wins', close: 'Close', continue_: 'Continue',
    autoPlayOnly: '⚡ Auto-playing your only move',
    autoPass: '⚡ No moves available — auto-passing',
    noDouble: 'No one has a double!\nReshuffling and redealing...',
    countingBones: 'Counting Bones', blocked: 'Blocked',
    pipsInHand: 'pips in hand', lastTile: '🔔 LAST TILE!', tilesLeft: 'tiles left',
    theme: 'Theme', dark: '🌙 Dark', light: '☀️ Light',
    tileSkin: 'Tile Skin', tableTheme: 'Table Theme', audio: 'Audio',
    music: '🎵 Background Music', sfx: '🔊 Sound Effects',
    trashTalk: 'AI Trash Talk', off: 'Off', low: 'Low', max: 'Max',
    colorblind: '♿ Colorblind Mode', language: 'Language',
    playerName: 'Player Name', accessibility: 'Accessibility',
    overall: 'Overall', gamesPlayed: 'Games Played', winsLosses: 'Wins / Losses',
    winRate: 'Win Rate', bestStreak: 'Best Win Streak',
    totalScored: 'Total Points Scored', highestPlay: 'Highest Single Play',
    highestBonus: 'Highest Round Bonus', lifetime: 'Lifetime',
    totalTiles: 'Total Tiles Played', totalDraws: 'Total Draws',
    totalPasses: 'Total Passes', achievements: 'Achievements',
    highestDouble: 'the highest double',
    playingTo: 'Playing to',
    scoreboard: 'Scores',
    youHave: 'You have',
    has: 'has',
    noBonesToCount: 'dominoes! No bones left to count.',
    countingBonesTitle: 'Counting Bones',
    pips: 'pips',
    bonus: 'bonus',
    for_: 'for',
    continue_btn: 'Continue',
    blocked_wins: 'wins',
    wonBy: 'Won by',
    best: 'Best',
    roundRecap: 'Round Recap',
    roundTimeline: 'Round Timeline',
    yourPerformance: 'Your Performance',
    tilesPlayed: 'Tiles Played',
    tilesDrawn: 'Tiles Drawn',
    scoringPlays: 'Scoring Plays',
    totalPointsScored: 'Total Points Scored',
    bestSinglePlay: 'Best Single Play',
    avgPointsPlay: 'Avg Points/Play',
    pts: 'pts',
    winsLabel: 'Wins',
    yourTeam: 'Your Team',
    opponentsTeam: 'Opponents',
    vsYou: 'vs you',
    teammate: 'TEAMMATE',
    opps: 'Opps',
    achievementUnlocked: 'Achievement Unlocked',
    startPlaying: 'Start Playing!',
    next: 'Next →',
    stepOf: 'of',
    step: 'Step',
    skip: 'Skip',
    // Ranks
    newcomer: 'Newcomer', rookie: 'Rookie', dominoMaster: 'Domino Master',
    veteran: 'Veteran', regular: 'Regular', apprentice: 'Apprentice', beginner: 'Beginner',
    // Personalities
    aggressive: 'Aggressive', defensive: 'Defensive', chaotic: 'Chaotic',
    calculated: 'Calculated', bully: 'Bully',
    // Achievements
    achFirstVictory: 'First Victory', achFirstVictoryDesc: 'Win your first game',
    achFiveStar: '5-Star Round', achFiveStarDesc: 'Get 25+ bonus in a round',
    achShutout: 'Shutout', achShutoutDesc: 'Win with opponent scoring 0',
    achOnFire: 'On Fire', achOnFireDesc: 'Win 3 games in a row',
    achUnstoppable: 'Unstoppable', achUnstoppableDesc: 'Win 5 games in a row',
    achBigScore: 'Big Score', achBigScoreDesc: 'Score 20+ in a single play',
    achPerfectPlay: 'Perfect Play', achPerfectPlayDesc: 'Score 25+ in a single play',
    achRegular: 'Regular', achRegularDesc: 'Play 10 games',
    achDominoMaster: 'Domino Master', achDominoMasterDesc: 'Play 50 games',
    achCleanSweep: 'Clean Sweep', achCleanSweepDesc: 'Go out with 0 tiles left',
    achNoHelp: 'No Help Needed', achNoHelpDesc: 'Win without using a hint',
    achRoadblock: 'Roadblock', achRoadblockDesc: 'Win a blocked round',
    achSpeedDemon: 'Speed Demon', achSpeedDemonDesc: 'Win a game on Fast speed',
    achTileVeteran: 'Tile Veteran', achTileVeteranDesc: 'Play 500 tiles total',
    achLegendary: 'Legendary', achLegendaryDesc: 'Win 10 games in a row',
    achHatTrick: 'Hat Trick', achHatTrickDesc: 'Score 3 times in a row',
    achComebackKid: 'Comeback Kid', achComebackKidDesc: 'Win after trailing by 50+',
    // Tutorial
    tutWelcomeTitle: '👋 Welcome!',
    tutWelcomeBody: 'This is <strong>All Fives</strong> — the domino game where math meets strategy. Make the open ends add up to <strong>multiples of 5</strong> to score. Simple to learn, tricky to master.',
    tut28Title: '🦴 28 Bones',
    tut28Body: 'Every combo from <strong>0|0</strong> to <strong>6|6</strong>. You get 5 tiles (or 7 in a 2-player game). The rest sit in the <strong>boneyard</strong> face-down.',
    tut28Visual: '...28 total',
    tutFirstTitle: '🏁 First Move',
    tutFirstBody: 'Whoever holds the <strong>highest double</strong> plays it first. This tile becomes the <strong>spinner</strong> — the center of everything.',
    tutFirstVisual: '6|6 goes first — it\'s the boss tile',
    tutTurnTitle: '🎮 Your Turn',
    tutTurnBody: 'Match a tile to any <strong>open end</strong> on the board. The matching numbers connect. No match? Tap <strong>Draw</strong> to grab from the boneyard.',
    tutTurnVisual: 'Both tiles match the 6',
    tutScoreTitle: '💰 Ka-ching!',
    tutScoreBody: 'After you play, the game adds up <strong>all open ends</strong>. Divisible by 5? <strong>You score that many points.</strong> This is the whole game right here.',
    tutScoreVisual: 'Open ends: 3 + 1 + 6 = 10',
    tutScoreExample: '+10 points! 🔥',
    tutDoubleTitle: '🎲 Doubles = Double Trouble',
    tutDoubleBody: 'A double at an open end counts <strong>BOTH halves</strong>. So 4|4 = 8 toward the sum, not 4. Doubles are your best friends for scoring.',
    tutDoubleVisual: 'This counts as <strong>4 + 4 = 8</strong> 🤯',
    tutSpinnerTitle: '⭐ The Spinner Opens Up',
    tutSpinnerBody: 'Once tiles are on both left and right of the spinner, the <strong>north and south</strong> arms unlock. Now you have <strong>4 open ends</strong> — way more scoring combos.',
    tutSpinnerVisual: '4 directions = 4x the fun',
    tutRoundTitle: '🏆 Round Over!',
    tutRoundBody: 'Play your last tile and yell <strong>"Domino!"</strong> (the game does it for you). You get <strong>bonus points</strong> from everyone else\'s leftover pips. If nobody can move, lowest pips wins.',
    tutRoundVisual: 'left',
    tutRoundBonus: '= 13 pips → rounded to <strong>+15 bonus!</strong>',
    tutReadyTitle: '🚀 You\'re Ready!',
    tutReadyBody: 'First to the <strong>target score</strong> wins. Use <strong>💡 Hint</strong> if you\'re stuck (costs 5 pts). Press <strong>?</strong> anytime for keyboard shortcuts. Now go dominate!',
    mayBlock: '⚠️ Game may block soon!',
    canScore: '💰 You can score!',
    // Keyboard shortcuts
    keyboardShortcuts: 'Keyboard Shortcuts',
    scSelectTile: 'Select playable tile by position',
    scPlaceLeft: 'Place on Left end',
    scPlaceRight: 'Place on Right end / Rules',
    scPlaceNorth: 'Place on North end',
    scPlaceSouth: 'Place on South end',
    scDraw: 'Draw from boneyard',
    scHint: 'Use Hint (−5 pts)',
    scPass: 'Pass turn',
    scMenu: 'Open menu',
    scGameLog: 'Game log',
    scTracker: 'Tile tracker',
    scStats: 'Stats & Achievements',
    scPrefs: 'Preferences',
    scToggle: 'Toggle this panel',
    scClose: 'Close any overlay',
    // Theme/skin/table names
    darkTheme: '🌙 Dark', lightTheme: '☀️ Light',
    skinClassic: 'Classic', skinMarble: 'Marble', skinWood: 'Wood',
    skinNeon: 'Neon', skinGold: 'Gold', skinMidnight: 'Midnight',
    tableRandom: 'Random', tableGreen: 'Classic Green', tableBlue: 'Ocean Blue',
    tableRed: 'Casino Red', tablePurple: 'Royal Purple', tableWood: 'Wooden',
    resetStats: '🗑️ Reset All Stats',
    resetConfirm: 'This will erase all stats, achievements, and XP. Are you sure?',
  },
  p: {
    z: {
      o: [
        ['no way that worked 💀','wait i scored??','lowkey didn\'t expect that','slay i guess?','bestie i\'m shook','not me actually scoring','it\'s giving beginner\'s luck','rent free in your head now','ate that up ngl','this is so unserious lol','me when i accidentally win','understood the assignment fr'],
        ['no cap that was clean 🧹','it\'s giving strategy','stay mad about it','that play was bussin fr','slay 💅','main character energy','not you losing to me rn','this is my roman empire','period. 💅','touch grass after this L','skill issue on your part','ate and left no crumbs','the vibes are immaculate'],
        ['you\'re literally cooked 💀','gg no re','it\'s giving domination era','this is my villain arc','ratio + you fell off','cope and seethe','built different fr fr','you\'re NPC energy rn','L + bozo + you\'re done','delulu if you think you\'re winning','your whole strategy is mid','i woke up and chose violence','the algorithm chose me 🤖']
      ],
      t: [
        ['we\'re so real for this','bestie we got this 🥺','slay together fr','us coded 💕','team slay!','we\'re literally iconic'],
        ['we\'re eating rn 🔥','duo diff no cap','the synergy is giving','we understood the assignment together','unmatched duo energy','we\'re that couple fr'],
        ['we\'re literally unbeatable 💀','they should just forfeit ngl','iconic duo behavior','we\'re the main characters','this is our era','they can\'t touch us fr']
      ],
      d: [
        ['this is not it 😭','boneyard arc begins','me when nothing works','down bad rn','not the boneyard again 💀','this timeline is cursed'],
        ['slight setback ngl','it\'s giving struggle','loading new strategy...','character development arc','plot twist incoming','trust the process fr'],
        ['strategic boneyard visit 🧠','all part of the lore','you think this matters? lol','building my final form','the comeback arc starts now','this is filler episode energy']
      ],
      w: [
        ['WAIT I WON?? 💀','no way no way no way','i\'m literally shaking rn','screaming crying throwing up (happy)','MOM I DID IT','this can\'t be real'],
        ['DOMINO let\'s gooo 🔥','cleared. 💅','that\'s a wrap bestie','mic drop energy','and scene. 🎬','gg that was so real'],
        ['absolutely devoured 💀','they were never ready','this is my legacy','GOATED behavior 🐐','delete the app fr','i don\'t lose. it\'s not in my code.']
      ]
    },
    m: {
      o: [
        ['I can\'t even 😂','Did that just happen?','Adulting at dominoes!','Hashtag blessed','This sparks joy ✨','Plot twist!','Living my best domino life','That was very on brand for me','I\'m literally dead 💀','Okay but like... nice?'],
        ['It me. Scoring. 💁','That\'s the tea ☕','Sorry not sorry 💅','This is fine. 🔥🐕','Treat yourself! 🎁','Big mood.','That hit different','Core memory unlocked 🧠','I\'m something of a domino player myself','Chef\'s kiss 👨‍🍳💋'],
        ['I\'m the captain now. 🚢','Bye Felicia 👋','Hold my craft beer 🍺','This is my TED talk.','It\'s giving winner energy','That\'s what therapy taught me 🧘','Sending thoughts and prayers... to you','This is the way.','Okay but this slaps','I have spoken.']
      ],
      t: [
        ['We\'re adulting together! 🥺','Squad goals!','This is so wholesome','Friendship is magic ✨','We\'re literally the best','I can\'t even with how good we are'],
        ['We\'re the dream team! 💪','Collab of the century','This partnership sparks joy','We\'re that meme of two people winning','Synergy is our love language','We\'re vibing so hard rn'],
        ['We\'re literally unstoppable 🔥','They can\'t sit with us 💅','Power couple energy','Iconic. Legendary. Us.','This is our origin story','We didn\'t come to play... wait, we did']
      ],
      d: [
        ['This is fine. 🔥🐕','I need a drink 🍷','Adulting is hard','I can\'t even right now','Mercury must be in retrograde','Why is this happening to me'],
        ['Just a plot twist 📖','Manifesting good tiles ✨','The universe is testing me','Growth mindset activated','Building character rn','It\'s called strategy, look it up'],
        ['All part of my five-year plan','You think this bothers me? I have student loans.','I\'ve survived worse Mondays','This is nothing compared to 2020','Calculated chaos','Strategic investment in future plays']
      ],
      w: [
        ['I CAN\'T EVEN 😭','Is this real life??','I\'m literally shaking','Someone screenshot this!','MOM GET THE CAMERA','I\'m not crying YOU\'RE crying'],
        ['DOMINO! That\'s the tweet. 🐦','Mic. Drop. 🎤','This is my Roman Empire','Living. My. Best. Life.','And that\'s on periodt.','Crushed it!'],
        ['I didn\'t choose the domino life, it chose me 👑','Absolutely unhinged performance','They\'ll make a podcast about this','I peaked and I\'m okay with it','Legendary behavior only','This is my villain origin story']
      ]
    },
    x: {
      o: [
        ['Huh, that worked.','I\'ll take it.','Not bad.','Hey, points are points.','Didn\'t see that coming.','Well alright then.','Lucky break.','Okay, cool.','That\'ll do.','Works for me.'],
        ['That\'s how you do it. 😎','Smooth.','Been doing this a while.','Experience pays off.','Textbook.','Old school cool. 🕶️','Still got it.','Fundamentals, baby.','Quiet confidence.','No drama, just results.','Patience pays.'],
        ['Sit down, kid.','I was playing dominoes before you were born.','Class is in session. 📚','Respect your elders.','Welcome to the real world.','I don\'t need luck.','Whatever. I win. 🤷','Don\'t hate the player.','I could do this all day.','Yawn. Next.']
      ],
      t: [
        ['Good play, partner.','Solid.','We\'re getting there.','Nice one.','Teamwork.','That helps.'],
        ['Now we\'re cooking. 🍳','Great minds think alike.','We\'re dialed in.','Like a well-oiled machine.','That\'s the stuff.','We\'ve got chemistry.'],
        ['Unstoppable.','They don\'t stand a chance.','We own this table.','Veteran duo.','Flawless teamwork.','This is what winning looks like.']
      ],
      d: [
        ['Whatever.','It happens.','Not ideal.','Meh.','Could be worse.','I\'ve had worse hands.'],
        ['Just regrouping.','Patience.','I\'ve been here before.','No panic.','Steady.','Part of the game.'],
        ['You think this rattles me?','I\'ve survived worse.','Strategic patience.','This changes nothing.','I\'ve got a plan.','Watch and learn.']
      ],
      w: [
        ['Hey, I won!','Well how about that.','Not bad for an old timer.','I\'ll take it!','Still got the touch.','Pleasantly surprised.'],
        ['DOMINO. Clean. 🧹','That\'s a wrap.','Job done.','Efficient.','No fuss, no muss.','Like clockwork.'],
        ['And that\'s why experience matters.','Class dismissed. 📚','Another day at the office.','I make it look easy.','Decades of dominoes, baby.','Respect the craft.']
      ]
    },
    b: {
      o: [
        ['Well I\'ll be!','How about that!','Lady luck smiled on me!','Even a broken clock!','Not too shabby!','The old dog learned a trick!','Ha! Take that!','Still kicking!','My grandkids would be proud!','The bones are with me today!'],
        ['Now THAT\'S a play! 👆','They don\'t make \'em like me anymore.','Old school dominoes right there.','Read it like a book. 📖','Experience over everything.','That\'s a veteran move.','The classics never go out of style.','You can\'t teach this.','That\'s called table sense.','Fundamentals win games.'],
        ['Back in MY day, we called that a whooping!','Son, you\'re out of your depth.','I\'ve been playing since before Google.','Respect your elders! 👴','They should put me in the hall of fame.','You young folks don\'t stand a chance.','The table respects experience.','Masterful. Simply masterful.','Take notes, youngster.','I\'ve seen it all and beaten it all.']
      ],
      t: [
        ['Good play, partner!','That\'s the spirit!','We make a fine team!','Now we\'re talking!','That\'s what I like to see!','Atta boy!'],
        ['We\'re a well-oiled machine!','Just like the old days!','Dynamic duo!','That\'s teamwork!','We\'re on fire!','Partners in crime!'],
        ['Unstoppable force!','They\'ll tell stories about us!','Best team at the table!','Championship caliber!','Hall of fame duo!','We\'re making history!']
      ],
      d: [
        ['Oh fiddlesticks.','Well, darn.','The bones aren\'t cooperating.','Back to the well.','These things happen.','Patience is a virtue.'],
        ['Just a bump in the road.','I\'ve weathered worse storms.','Good things come to those who wait.','Steady now.','The tide will turn.','Building up my hand.'],
        ['You think this bothers me? I raised teenagers.','I\'ve got more patience than you\'ve got years.','This is chess, not checkers.','The long game is MY game.','Watch the master work.','Strategic reserve building.']
      ],
      w: [
        ['Well I\'ll be darned! I won!','Hot diggity! 🎉','Still got it after all these years!','Wait till I tell the grandkids!','Never count out experience!','The old timer pulls through!'],
        ['DOMINO! That\'s how it\'s done! 🎯','Clean as a whistle!','Textbook finish!','That\'s old school dominoes!','Smooth as butter!','The classics never fail!'],
        ['And THAT is why you respect your elders! 👑','Decades of dominoes, right there!','They don\'t make players like me anymore!','Hall of fame performance!','Absolute masterclass!','I\'ve still got the magic touch!']
      ]
    }
  }
};


// ---- SPANISH ----
LOCALES.es = {
  name: 'Español',
  flag: '🇪🇸',
  dir: 'ltr',
  names: [
    'Alejandro','Valentina','Santiago','Camila','Matías','Isabella','Sebastián','Lucía',
    'Emiliano','Sofía','Daniel','Mariana','Andrés','Gabriela','Nicolás','Fernanda',
    'Diego','Paula','Tomás','Catalina','Javier','Elena','Rafael','Carmen',
    'Miguel','Pilar','Roberto','Dolores','Enrique','Rosario','Pablo','Esperanza',
    'Fernando','Consuelo','Ramón','Guadalupe','Arturo','Mercedes','Héctor','Beatriz'
  ],
  cities: [
    'Ciudad de México','Buenos Aires','Madrid','Bogotá','Lima',
    'Santiago, Chile','Barcelona','Medellín','Guadalajara','Montevideo',
    'San Juan, PR','La Habana','Quito','Caracas','Santo Domingo',
    'Panamá','San José, CR','Cartagena','Sevilla','Córdoba'
  ],
  ui: {
    startGame: 'Iniciar Juego', resumeGame: '▶ Continuar Partida', rematch: 'Revancha',
    newGame: 'Nuevo Juego', copyLog: '📋 Copiar Registro', copied: '✅ Copiado!',
    gameMode: 'Modo de Juego', ffa: 'Todos contra Todos', teams: 'Equipos 2v2',
    opponents: 'Oponentes', playTo: 'Jugar Hasta', custom: 'Otro',
    aiDifficulty: 'Dificultad IA', easy: '😊 Fácil', mixed: '🎲 Mixto', hard: '🧠 Difícil',
    gameSpeed: 'Velocidad', fast: '🐇 Rápido', normal: '🎯 Normal', slow: '🐢 Lento',
    players: 'Jugadores', rules: '📖 Reglas', tutorial: '🎓 Tutorial',
    gameLog: '📋 Registro', tileTracker: '🔍 Fichas', stats: '📊 Estadísticas',
    prefs: '🎨 Preferencias', shortcuts: '❓ Atajos',
    rageQuit: '💀 Abandonar (cuenta como derrota)',
    draw: 'Robar', pass: 'Pasar', hint: '💡 Pista (-5 pts)', tiles: '🔍 Fichas',
    yourTurn: 'TU TURNO', thinking: 'Pensando', turn: 'turno',
    bones: 'fichas', openEnds: 'Extremos', noScore: 'Sin puntos',
    scores: 'Puntos', lastPlayed: 'Última Jugada', youPlayed: 'Jugaste',
    played: 'jugó', round: 'Ronda', gameOver: 'FIN DEL JUEGO',
    youWin: '🏆 ¡Ganaste!', wins: 'Victorias', close: 'Cerrar', continue_: 'Continuar',
    autoPlayOnly: '⚡ Jugada automática — única opción',
    autoPass: '⚡ Sin jugadas — pasando turno',
    noDouble: '¡Nadie tiene doble!\nBarajando de nuevo...',
    countingBones: 'Contando Fichas', blocked: 'Bloqueado',
    pipsInHand: 'puntos en mano', lastTile: '🔔 ¡ÚLTIMA FICHA!', tilesLeft: 'fichas restantes',
    theme: 'Tema', dark: '🌙 Oscuro', light: '☀️ Claro',
    tileSkin: 'Estilo de Ficha', tableTheme: 'Tema de Mesa', audio: 'Audio',
    music: '🎵 Música', sfx: '🔊 Efectos', trashTalk: 'Charla IA',
    off: 'No', low: 'Poco', max: 'Máx',
    colorblind: '♿ Modo Daltónico', language: 'Idioma',
    playerName: 'Tu Nombre', accessibility: 'Accesibilidad',
    overall: 'General', gamesPlayed: 'Partidas Jugadas', winsLosses: 'Victorias / Derrotas',
    winRate: 'Tasa de Victoria', bestStreak: 'Mejor Racha',
    totalScored: 'Puntos Totales', highestPlay: 'Mejor Jugada',
    highestBonus: 'Mejor Bono de Ronda', lifetime: 'Historial',
    totalTiles: 'Fichas Jugadas', totalDraws: 'Fichas Robadas',
    totalPasses: 'Turnos Pasados', achievements: 'Logros',
    highestDouble: 'el doble más alto',
    playingTo: 'Jugando a',
    scoreboard: 'Puntos',
    youHave: 'Tienes',
    has: 'tiene',
    noBonesToCount: '¡dominó! No quedan fichas por contar.',
    countingBonesTitle: 'Contando Fichas',
    pips: 'puntos',
    bonus: 'bono',
    for_: 'para',
    continue_btn: 'Continuar',
    blocked_wins: 'gana',
    wonBy: 'Ganó',
    best: 'Mejor',
    roundRecap: 'Resumen de Rondas',
    roundTimeline: 'Línea de Rondas',
    yourPerformance: 'Tu Rendimiento',
    tilesPlayed: 'Fichas Jugadas',
    tilesDrawn: 'Fichas Robadas',
    scoringPlays: 'Jugadas con Puntos',
    totalPointsScored: 'Puntos Totales',
    bestSinglePlay: 'Mejor Jugada',
    avgPointsPlay: 'Promedio/Jugada',
    pts: 'pts',
    winsLabel: 'Victorias',
    yourTeam: 'Tu Equipo',
    opponentsTeam: 'Oponentes',
    vsYou: 'vs tú',
    teammate: 'COMPAÑERO',
    opps: 'Rival',
    achievementUnlocked: 'Logro Desbloqueado',
    startPlaying: '¡A Jugar!',
    next: 'Siguiente →',
    stepOf: 'de',
    step: 'Paso',
    skip: 'Saltar',
    newcomer: 'Nuevo', rookie: 'Novato', dominoMaster: 'Maestro',
    veteran: 'Veterano', regular: 'Regular', apprentice: 'Aprendiz', beginner: 'Principiante',
    aggressive: 'Agresivo', defensive: 'Defensivo', chaotic: 'Caótico',
    calculated: 'Calculador', bully: 'Matón',
    achFirstVictory: 'Primera Victoria', achFirstVictoryDesc: 'Gana tu primer juego',
    achFiveStar: 'Ronda 5 Estrellas', achFiveStarDesc: 'Obtén 25+ bono en una ronda',
    achShutout: 'Blanqueada', achShutoutDesc: 'Gana sin que el rival anote',
    achOnFire: 'En Llamas', achOnFireDesc: 'Gana 3 juegos seguidos',
    achUnstoppable: 'Imparable', achUnstoppableDesc: 'Gana 5 juegos seguidos',
    achBigScore: 'Gran Puntuación', achBigScoreDesc: 'Anota 20+ en una jugada',
    achPerfectPlay: 'Jugada Perfecta', achPerfectPlayDesc: 'Anota 25+ en una jugada',
    achRegular: 'Regular', achRegularDesc: 'Juega 10 partidas',
    achDominoMaster: 'Maestro del Dominó', achDominoMasterDesc: 'Juega 50 partidas',
    achCleanSweep: 'Barrida', achCleanSweepDesc: 'Termina con 0 fichas',
    achNoHelp: 'Sin Ayuda', achNoHelpDesc: 'Gana sin usar pista',
    achRoadblock: 'Bloqueo', achRoadblockDesc: 'Gana una ronda bloqueada',
    achSpeedDemon: 'Velocista', achSpeedDemonDesc: 'Gana en velocidad Rápida',
    achTileVeteran: 'Veterano', achTileVeteranDesc: 'Juega 500 fichas en total',
    achLegendary: 'Legendario', achLegendaryDesc: 'Gana 10 juegos seguidos',
    achHatTrick: 'Hat Trick', achHatTrickDesc: 'Anota 3 veces seguidas',
    achComebackKid: 'Remontada', achComebackKidDesc: 'Gana después de ir perdiendo por 50+',
    tutWelcomeTitle: '👋 ¡Bienvenido!',
    tutWelcomeBody: 'Esto es <strong>All Fives</strong> — el juego de dominó donde las matemáticas se unen a la estrategia. Haz que los extremos sumen <strong>múltiplos de 5</strong> para anotar.',
    tut28Title: '🦴 28 Fichas',
    tut28Body: 'Todas las combinaciones de <strong>0|0</strong> a <strong>6|6</strong>. Recibes 5 fichas (o 7 con 2 jugadores). El resto va al <strong>cementerio</strong>.',
    tut28Visual: '...28 en total',
    tutFirstTitle: '🏁 Primera Jugada',
    tutFirstBody: 'Quien tenga el <strong>doble más alto</strong> juega primero. Esta ficha es el <strong>mulo</strong> — el centro de todo.',
    tutFirstVisual: '6|6 va primero — es la ficha jefa',
    tutTurnTitle: '🎮 Tu Turno',
    tutTurnBody: 'Empareja una ficha con un <strong>extremo abierto</strong>. ¿No puedes? Toca <strong>Robar</strong> del cementerio.',
    tutTurnVisual: 'Ambas fichas emparejan el 6',
    tutScoreTitle: '💰 ¡Ka-ching!',
    tutScoreBody: 'Después de jugar, se suman <strong>todos los extremos</strong>. ¿Divisible por 5? <strong>Anotas esos puntos.</strong> De eso se trata.',
    tutScoreVisual: 'Extremos: 3 + 1 + 6 = 10',
    tutScoreExample: '+10 puntos! 🔥',
    tutDoubleTitle: '🎲 Dobles = Doble Problema',
    tutDoubleBody: 'Un doble en un extremo cuenta <strong>AMBAS mitades</strong>. Así que 4|4 = 8, no 4. Los dobles son tus mejores amigos.',
    tutDoubleVisual: 'Esto cuenta como <strong>4 + 4 = 8</strong> 🤯',
    tutSpinnerTitle: '⭐ El Mulo se Abre',
    tutSpinnerBody: 'Cuando hay fichas a izquierda y derecha del mulo, se abren <strong>norte y sur</strong>. Ahora tienes <strong>4 extremos</strong> — más combos.',
    tutSpinnerVisual: '4 direcciones = 4x la diversión',
    tutRoundTitle: '🏆 ¡Fin de Ronda!',
    tutRoundBody: 'Juega tu última ficha y grita <strong>"¡Dominó!"</strong>. Recibes <strong>puntos bonus</strong> de las fichas restantes de los demás.',
    tutRoundVisual: 'quedan',
    tutRoundBonus: '= 13 puntos → redondeado a <strong>+15 bono!</strong>',
    tutReadyTitle: '🚀 ¡Listo!',
    tutReadyBody: 'El primero en llegar al <strong>puntaje objetivo</strong> gana. Usa <strong>💡 Pista</strong> si te atascas (-5 pts). Presiona <strong>?</strong> para atajos. ¡A dominar!',
    mayBlock: '⚠️ ¡El juego puede bloquearse pronto!',
    canScore: '💰 ¡Puedes anotar!',
    keyboardShortcuts: 'Atajos de Teclado',
    scSelectTile: 'Seleccionar ficha por posición',
    scPlaceLeft: 'Colocar en extremo Izquierdo',
    scPlaceRight: 'Colocar en extremo Derecho / Reglas',
    scPlaceNorth: 'Colocar en extremo Norte',
    scPlaceSouth: 'Colocar en extremo Sur',
    scDraw: 'Robar del cementerio',
    scHint: 'Usar Pista (−5 pts)',
    scPass: 'Pasar turno',
    scMenu: 'Abrir menú',
    scGameLog: 'Registro de juego',
    scTracker: 'Rastreador de fichas',
    scStats: 'Estadísticas y Logros',
    scPrefs: 'Preferencias',
    scToggle: 'Mostrar/ocultar este panel',
    scClose: 'Cerrar cualquier ventana',
    darkTheme: '🌙 Oscuro', lightTheme: '☀️ Claro',
    skinClassic: 'Clásico', skinMarble: 'Mármol', skinWood: 'Madera',
    skinNeon: 'Neón', skinGold: 'Dorado', skinMidnight: 'Medianoche',
    tableRandom: 'Aleatorio', tableGreen: 'Verde Clásico', tableBlue: 'Azul Océano',
    tableRed: 'Rojo Casino', tablePurple: 'Púrpura Real', tableWood: 'Madera',
    resetStats: '🗑️ Borrar Estadísticas',
    resetConfirm: 'Esto borrará todas las estadísticas, logros y XP. ¿Estás seguro?',
  },
  p: {
    z: {
      o: [
        ['¿eso funcionó? 💀','no mames, anoté','ni yo me la creo','qué random jaja','literal no esperaba eso','bueno pues 🤷'],
        ['eso estuvo limpio 🧹','se los comí fr','ni modo, soy crack','literal soy main character','tóxico pero ganador 💅','quédate llorando'],
        ['están cocinados 💀','gg no re','esto es mi era de villano','ratio + se cayeron','cope harder','built different fr fr']
      ],
      t: [['somos iconiques 💕','equipo slay!','juntos somos real'],['estamos comiendo 🔥','duo diff','la sinergia está dando'],['literalmente imbatibles 💀','que se rindan ngl','somos los main characters']],
      d: [['esto no está dando 😭','arco del cementerio','down bad rn'],['pequeño setback ngl','plot twist incoming','confía en el proceso'],['visita estratégica 🧠','todo parte del lore','construyendo mi forma final']],
      w: [['¿¿GANÉ?? 💀','no way no way','literal temblando rn'],['DOMINÓ vamos 🔥','cleared 💅','gg estuvo real'],['los devoré 💀','nunca estuvieron listos','GOATED 🐐']]
    },
    m: {
      o: [
        ['¿Eso pasó? 😂','Hashtag bendecido','Esto genera alegría ✨','Viviendo mi mejor vida dominó','Muy on brand para mí'],
        ['Eso soy yo. Anotando. 💁','Perdón, no perdón 💅','Gran mood.','Eso pegó diferente','Beso de chef 👨‍🍳💋'],
        ['Soy el capitán ahora 🚢','Adiós Felicia 👋','Esta es mi charla TED.','Esto es el camino.','He hablado.']
      ],
      t: [['¡Adulteando juntos! 🥺','¡Metas de equipo!','Somos los mejores'],['¡Equipo soñado! 💪','Collab del siglo','Vibras increíbles'],['Literalmente imparables 🔥','Energía de power couple','Icónicos. Legendarios. Nosotros.']],
      d: [['Esto está bien. 🔥🐕','Necesito un trago 🍷','Mercurio retrógrado seguro'],['Solo un plot twist 📖','Manifestando buenas fichas ✨','Mindset de crecimiento'],['Todo parte de mi plan','Sobreviví cosas peores','Caos calculado']],
      w: [['¡NO PUEDO! 😭','¿Es la vida real??','¡Alguien capture esto!'],['¡DOMINÓ! Ese es el tweet. 🐦','Mic. Drop. 🎤','Viviendo. Mi. Mejor. Vida.'],['No elegí la vida dominó, ella me eligió 👑','Comportamiento legendario','Llegué a mi peak']]
    },
    x: {
      o: [
        ['Funcionó.','Me lo quedo.','Nada mal.','Puntos son puntos.','No lo vi venir.','Bueno, está bien.'],
        ['Así se hace. 😎','Suave.','Llevo rato en esto.','La experiencia paga.','De manual.','Vieja escuela. 🕶️'],
        ['Siéntate, chico.','Yo jugaba antes de que nacieras.','Clase en sesión. 📚','Respeta a tus mayores.','No necesito suerte.','Lo que sea. Gané. 🤷']
      ],
      t: [['Buena jugada.','Sólido.','Vamos bien.'],['Ahora sí estamos cocinando. 🍳','Grandes mentes piensan igual.','Estamos sincronizados.'],['Imparables.','No tienen chance.','Somos dueños de esta mesa.']],
      d: [['Lo que sea.','Pasa.','No es ideal.','Meh.'],['Solo reagrupando.','Paciencia.','Ya estuve aquí antes.'],['¿Crees que esto me afecta?','He sobrevivido peores.','Paciencia estratégica.']],
      w: [['¡Gané!','Mira nada más.','Nada mal para un veterano.'],['DOMINÓ. Limpio. 🧹','Trabajo hecho.','Eficiente.'],['Por eso importa la experiencia.','Clase terminada. 📚','Un día más en la oficina.']]
    },
    b: {
      o: [
        ['¡Válgame!','¡Mira nada más!','¡La suerte me sonrió!','¡Todavía puedo!','¡Nada mal!','¡El viejo aún puede!'],
        ['¡ESA es una jugada! 👆','Ya no hacen jugadores como yo.','Dominó de la vieja escuela.','Lo leí como un libro. 📖','Eso se llama experiencia.','Los clásicos nunca pasan de moda.'],
        ['¡En mis tiempos a eso le decíamos paliza!','Hijo, estás fuera de tu liga.','¡Respeta a tus mayores! 👴','Deberían ponerme en el salón de la fama.','La mesa respeta la experiencia.','Magistral. Simplemente magistral.']
      ],
      t: [['¡Buena jugada, compañero!','¡Ese es el espíritu!','¡Buen equipo!'],['¡Somos una máquina! ','¡Como en los viejos tiempos!','¡Eso es trabajo en equipo!'],['¡Fuerza imparable!','¡Contarán historias de nosotros!','¡Calibre de campeones!']],
      d: [['¡Caramba!','Bueno, ni modo.','Las fichas no cooperan.'],['Solo un bache en el camino.','He pasado peores tormentas.','La paciencia es una virtud.'],['¿Crees que esto me molesta? Crié adolescentes.','Tengo más paciencia que tú años.','El juego largo es MI juego.']],
      w: [['¡Válgame, gané!','¡Todavía tengo el toque!','¡Esperen que les cuente a los nietos!'],['¡DOMINÓ! ¡Así se hace! 🎯','¡Limpio como patena!','¡Dominó de la vieja escuela!'],['¡Por ESO se respeta a los mayores! 👑','¡Décadas de dominó!','¡Clase magistral!']]
    }
  }
};


// ---- ARABIC ----
LOCALES.ar = {
  name: 'العربية',
  flag: '🇸🇦',
  dir: 'rtl',
  names: [
    'أحمد','فاطمة','محمد','نورة','خالد','ليلى','عمر','سارة',
    'يوسف','مريم','علي','هند','حسن','دانة','طارق','ريم',
    'سعد','لمى','فيصل','جنى','ناصر','عبير','ماجد','أسماء',
    'بدر','شهد','سلطان','نوف','تركي','غادة','عبدالله','منال',
    'راشد','هيا','حمد','وفاء','سالم','رنا','زياد','ديمة'
  ],
  cities: [
    'الرياض','جدة','دبي','القاهرة','بيروت',
    'عمّان','الدوحة','الكويت','المنامة','مسقط',
    'أبوظبي','الدار البيضاء','تونس','الخرطوم','بغداد',
    'دمشق','الرباط','طرابلس','صنعاء','الجزائر'
  ],
  ui: {
    startGame: 'ابدأ اللعبة', resumeGame: '▶ استئناف اللعبة', rematch: 'إعادة المباراة',
    newGame: 'لعبة جديدة', copyLog: '📋 نسخ السجل', copied: '✅ تم النسخ!',
    gameMode: 'نوع اللعبة', ffa: 'الكل ضد الكل', teams: 'فرق ٢ ضد ٢',
    opponents: 'الخصوم', playTo: 'العب حتى', custom: 'مخصص',
    aiDifficulty: 'صعوبة الذكاء', easy: '😊 سهل', mixed: '🎲 متنوع', hard: '🧠 صعب',
    gameSpeed: 'السرعة', fast: '🐇 سريع', normal: '🎯 عادي', slow: '🐢 بطيء',
    players: 'اللاعبون', rules: '📖 القواعد', tutorial: '🎓 الشرح',
    gameLog: '📋 السجل', tileTracker: '🔍 تتبع القطع', stats: '📊 الإحصائيات',
    prefs: '🎨 الإعدادات', shortcuts: '❓ الاختصارات',
    rageQuit: '💀 انسحاب (يحسب خسارة)',
    draw: 'اسحب', pass: 'تمرير', hint: '💡 تلميح (-٥)', tiles: '🔍 القطع',
    yourTurn: 'دورك', thinking: 'يفكر', turn: 'دور',
    bones: 'قطع', openEnds: 'الأطراف', noScore: 'لا نقاط',
    scores: 'النقاط', lastPlayed: 'آخر لعبة', youPlayed: 'لعبت',
    played: 'لعب', round: 'الجولة', gameOver: 'انتهت اللعبة',
    youWin: '🏆 فزت!', wins: 'انتصارات', close: 'إغلاق', continue_: 'متابعة',
    autoPlayOnly: '⚡ لعب تلقائي — خيار وحيد',
    autoPass: '⚡ لا توجد حركات — تمرير تلقائي',
    noDouble: 'لا أحد لديه دبل!\nإعادة التوزيع...',
    countingBones: 'عد القطع', blocked: 'مسدود',
    pipsInHand: 'نقاط في اليد', lastTile: '🔔 آخر قطعة!', tilesLeft: 'قطع متبقية',
    theme: 'المظهر', dark: '🌙 داكن', light: '☀️ فاتح',
    tileSkin: 'شكل القطعة', tableTheme: 'لون الطاولة', audio: 'الصوت',
    music: '🎵 موسيقى', sfx: '🔊 مؤثرات', trashTalk: 'كلام اللاعبين',
    off: 'إيقاف', low: 'قليل', max: 'أقصى',
    colorblind: '♿ وضع عمى الألوان', language: 'اللغة',
    playerName: 'اسمك', accessibility: 'إمكانية الوصول',
    overall: 'عام', gamesPlayed: 'الألعاب', winsLosses: 'فوز / خسارة',
    winRate: 'نسبة الفوز', bestStreak: 'أفضل سلسلة',
    totalScored: 'مجموع النقاط', highestPlay: 'أعلى لعبة',
    highestBonus: 'أعلى مكافأة', lifetime: 'الإجمالي',
    totalTiles: 'القطع الملعوبة', totalDraws: 'القطع المسحوبة',
    totalPasses: 'التمريرات', achievements: 'الإنجازات',
    highestDouble: 'أعلى دبل',
    playingTo: 'اللعب حتى',
    scoreboard: 'النقاط',
    youHave: 'عندك',
    has: 'عنده',
    noBonesToCount: 'دومينو! ما في قطع للعد.',
    countingBonesTitle: 'عد القطع',
    pips: 'نقاط',
    bonus: 'بونص',
    for_: 'لـ',
    continue_btn: 'متابعة',
    blocked_wins: 'يفوز',
    wonBy: 'فاز',
    best: 'أفضل',
    roundRecap: 'ملخص الجولات',
    roundTimeline: 'خط الجولات',
    yourPerformance: 'أداؤك',
    tilesPlayed: 'القطع الملعوبة',
    tilesDrawn: 'القطع المسحوبة',
    scoringPlays: 'لعبات بنقاط',
    totalPointsScored: 'مجموع النقاط',
    bestSinglePlay: 'أفضل لعبة',
    avgPointsPlay: 'معدل النقاط/لعبة',
    pts: 'نقاط',
    winsLabel: 'انتصارات',
    yourTeam: 'فريقك',
    opponentsTeam: 'الخصوم',
    vsYou: 'ضدك',
    teammate: 'زميل',
    opps: 'خصم',
    achievementUnlocked: 'إنجاز جديد',
    startPlaying: 'ابدأ اللعب!',
    next: 'التالي →',
    stepOf: 'من',
    step: 'خطوة',
    skip: 'تخطي',
    newcomer: 'جديد', rookie: 'مبتدئ', dominoMaster: 'أستاذ',
    veteran: 'محترف', regular: 'منتظم', apprentice: 'متدرب', beginner: 'مبتدئ',
    aggressive: 'هجومي', defensive: 'دفاعي', chaotic: 'فوضوي',
    calculated: 'محسوب', bully: 'متنمر',
    achFirstVictory: 'أول فوز', achFirstVictoryDesc: 'فز بأول لعبة',
    achFiveStar: 'جولة 5 نجوم', achFiveStarDesc: 'احصل على 25+ بونص',
    achShutout: 'إغلاق', achShutoutDesc: 'فز بدون ما الخصم يسجل',
    achOnFire: 'مشتعل', achOnFireDesc: 'فز 3 مرات متتالية',
    achUnstoppable: 'لا يوقف', achUnstoppableDesc: 'فز 5 مرات متتالية',
    achBigScore: 'نقاط كبيرة', achBigScoreDesc: 'سجل 20+ في لعبة واحدة',
    achPerfectPlay: 'لعبة مثالية', achPerfectPlayDesc: 'سجل 25+ في لعبة واحدة',
    achRegular: 'منتظم', achRegularDesc: 'العب 10 مباريات',
    achDominoMaster: 'أستاذ الدومينو', achDominoMasterDesc: 'العب 50 مباراة',
    achCleanSweep: 'كنس نظيف', achCleanSweepDesc: 'اخلص بدون قطع',
    achNoHelp: 'بدون مساعدة', achNoHelpDesc: 'فز بدون تلميح',
    achRoadblock: 'حاجز', achRoadblockDesc: 'فز بجولة مسدودة',
    achSpeedDemon: 'سريع', achSpeedDemonDesc: 'فز بسرعة عالية',
    achTileVeteran: 'محترف القطع', achTileVeteranDesc: 'العب 500 قطعة',
    achLegendary: 'أسطوري', achLegendaryDesc: 'فز 10 مرات متتالية',
    achHatTrick: 'هاتريك', achHatTrickDesc: 'سجل 3 مرات متتالية',
    achComebackKid: 'عودة قوية', achComebackKidDesc: 'فز بعد تأخر 50+',
    tutWelcomeTitle: '👋 أهلاً!',
    tutWelcomeBody: 'هذي <strong>All Fives</strong> — لعبة الدومينو اللي تجمع الحساب والاستراتيجية. خل الأطراف تجمع <strong>مضاعفات 5</strong> عشان تسجل.',
    tut28Title: '🦴 28 قطعة',
    tut28Body: 'كل التركيبات من <strong>0|0</strong> إلى <strong>6|6</strong>. تاخذ 5 قطع (أو 7 مع لاعبين). الباقي في <strong>المخزن</strong>.',
    tut28Visual: '...28 بالمجموع',
    tutFirstTitle: '🏁 أول حركة',
    tutFirstBody: 'اللي عنده <strong>أعلى دبل</strong> يلعب أول. هذي القطعة تصير <strong>السبنر</strong> — مركز كل شي.',
    tutFirstVisual: '6|6 يلعب أول — هو الرئيس',
    tutTurnTitle: '🎮 دورك',
    tutTurnBody: 'طابق قطعة مع <strong>طرف مفتوح</strong>. ما تقدر؟ اضغط <strong>اسحب</strong> من المخزن.',
    tutTurnVisual: 'القطعتين تطابق الـ 6',
    tutScoreTitle: '💰 كا-تشينغ!',
    tutScoreBody: 'بعد ما تلعب، اللعبة تجمع <strong>كل الأطراف</strong>. تقبل القسمة على 5؟ <strong>تسجل النقاط.</strong> هذا كل اللعبة.',
    tutScoreVisual: 'الأطراف: 3 + 1 + 6 = 10',
    tutScoreExample: '+10 نقاط! 🔥',
    tutDoubleTitle: '🎲 الدبل = مشكلة مزدوجة',
    tutDoubleBody: 'الدبل بالطرف يحسب <strong>الجهتين</strong>. يعني 4|4 = 8 مو 4. الدبلات أصدقاؤك.',
    tutDoubleVisual: 'هذا يحسب <strong>4 + 4 = 8</strong> 🤯',
    tutSpinnerTitle: '⭐ السبنر ينفتح',
    tutSpinnerBody: 'لما يكون في قطع يمين ويسار السبنر، <strong>الشمال والجنوب</strong> ينفتحون. الحين عندك <strong>4 أطراف</strong> — فرص أكثر.',
    tutSpinnerVisual: '4 اتجاهات = 4 أضعاف المتعة',
    tutRoundTitle: '🏆 انتهت الجولة!',
    tutRoundBody: 'العب آخر قطعة وقول <strong>"دومينو!"</strong>. تحصل <strong>نقاط بونص</strong> من قطع الباقين.',
    tutRoundVisual: 'باقي',
    tutRoundBonus: '= 13 نقطة → تقريب إلى <strong>+15 بونص!</strong>',
    tutReadyTitle: '🚀 جاهز!',
    tutReadyBody: 'أول واحد يوصل <strong>النتيجة المطلوبة</strong> يفوز. استخدم <strong>💡 تلميح</strong> (-5 نقاط). اضغط <strong>?</strong> للاختصارات. يلا!',
    mayBlock: '⚠️ اللعبة ممكن تنسد قريب!',
    canScore: '💰 تقدر تسجل!',
    keyboardShortcuts: 'اختصارات لوحة المفاتيح',
    scSelectTile: 'اختر قطعة حسب الموقع',
    scPlaceLeft: 'ضع على الطرف الأيسر',
    scPlaceRight: 'ضع على الطرف الأيمن / القواعد',
    scPlaceNorth: 'ضع على الطرف الشمالي',
    scPlaceSouth: 'ضع على الطرف الجنوبي',
    scDraw: 'اسحب من المخزن',
    scHint: 'استخدم تلميح (−٥ نقاط)',
    scPass: 'مرر الدور',
    scMenu: 'افتح القائمة',
    scGameLog: 'سجل اللعبة',
    scTracker: 'تتبع القطع',
    scStats: 'الإحصائيات والإنجازات',
    scPrefs: 'الإعدادات',
    scToggle: 'إظهار/إخفاء هذا',
    scClose: 'إغلاق أي نافذة',
    darkTheme: '🌙 داكن', lightTheme: '☀️ فاتح',
    skinClassic: 'كلاسيكي', skinMarble: 'رخام', skinWood: 'خشب',
    skinNeon: 'نيون', skinGold: 'ذهبي', skinMidnight: 'منتصف الليل',
    tableRandom: 'عشوائي', tableGreen: 'أخضر كلاسيكي', tableBlue: 'أزرق محيطي',
    tableRed: 'أحمر كازينو', tablePurple: 'بنفسجي ملكي', tableWood: 'خشبي',
    resetStats: '🗑️ مسح الإحصائيات',
    resetConfirm: 'سيتم مسح جميع الإحصائيات والإنجازات والخبرة. هل أنت متأكد؟',
  },
  p: {
    z: {
      o: [
        ['والله ما توقعت 💀','سجلت؟؟','يا ساتر','حظ مبتدئ بس','ما صدقت','هههه نايس'],
        ['كلين 🧹','ما عندكم فرصة','سكل إشو عندكم','أنا الماين كاراكتر','خلاص انتهيتوا 💅','ما في منافسة'],
        ['انتهيتوا 💀','جي جي','هذي حقبتي','ما عندكم أمل','أنا مختلف fr','الخوارزمية اختارتني 🤖']
      ],
      t: [['فريق أسطوري 💕','يلا نكمل!','سوا أقوى'],['ناكلهم 🔥','ديو مختلف','السينرجي عالية'],['ما يقدرون علينا 💀','خلهم يستسلمون','نحن الأبطال']],
      d: [['مو زينة 😭','بداية سيئة','ما في شي يمشي'],['انتكاسة بسيطة','بلوت تويست قادم','ثق بالعملية'],['زيارة استراتيجية 🧠','كل شي حسب الخطة','أبني شكلي النهائي']],
      w: [['فزت؟؟ 💀','لا لا لا مو معقول','أرتجف حرفياً'],['دومينو يلا 🔥','خلصنا 💅','كان حلو'],['التهمتهم 💀','ما كانوا جاهزين','أسطورة 🐐']]
    },
    m: {
      o: [
        ['صار هالشي؟ 😂','هاشتاق محظوظ','هذا يبعث السعادة ✨','أعيش أفضل حياة دومينو','ما قدرت أصدق'],
        ['أنا. أسجل. 💁','آسف مو آسف 💅','مود كبير.','هذا ضرب مختلف','قبلة الشيف 👨‍🍳💋'],
        ['أنا القبطان الحين 🚢','مع السلامة 👋','هذي محاضرتي.','هذا هو الطريق.','تكلمت.']
      ],
      t: [['نكبر سوا! 🥺','أهداف فريق!','نحن الأفضل'],['فريق الأحلام! 💪','تعاون القرن','الفايبز خيالية'],['ما يوقفنا أحد 🔥','طاقة ثنائي قوي','أيقونيين. أسطوريين. نحن.']],
      d: [['هذا طبيعي. 🔥🐕','أحتاج قهوة ☕','عطارد بالتراجع أكيد'],['بس بلوت تويست 📖','أجذب قطع حلوة ✨','عقلية نمو'],['كل شي حسب خطتي','عشت أسوأ','فوضى محسوبة']],
      w: [['ما أقدر! 😭','هل هذا حقيقي؟؟','أحد يصور!'],['دومينو! هذا التغريدة. 🐦','مايك. دروب. 🎤','أعيش. أفضل. حياتي.'],['ما اخترت حياة الدومينو، هي اختارتني 👑','أداء أسطوري','وصلت القمة']]
    },
    x: {
      o: [
        ['هه، مشت.','أخذها.','مو سيئة.','نقاط هي نقاط.','ما توقعتها.','طيب.'],
        ['هكذا تلعب. 😎','سلس.','صار لي فترة.','الخبرة تدفع.','من الكتاب.','المدرسة القديمة. 🕶️'],
        ['اقعد يا ولد.','كنت ألعب قبل ما تنولد.','الحصة بدأت. 📚','احترم الكبار.','ما أحتاج حظ.','يعني. فزت. 🤷']
      ],
      t: [['لعبة حلوة.','صلب.','ماشيين.'],['الحين نطبخ. 🍳','العقول الكبيرة تفكر سوا.','متناغمين.'],['ما يوقفنا أحد.','ما عندهم فرصة.','نملك هالطاولة.']],
      d: [['عادي.','يصير.','مو مثالي.'],['بس أعيد ترتيب.','صبر.','مريت بهالموقف.'],['تفتكر هذا يأثر علي؟','عشت أسوأ.','صبر استراتيجي.']],
      w: [['فزت!','شوف كذا.','مو سيئ لواحد كبير.'],['دومينو. نظيف. 🧹','خلصنا.','فعّال.'],['عشان كذا الخبرة مهمة.','الحصة انتهت. 📚','يوم عادي بالشغل.']]
    },
    b: {
      o: [
        ['يا سلام!','شوفوا كذا!','الحظ ابتسم لي!','لسه فيني!','مو سيئة!','الكبير لسه يقدر!'],
        ['هذي لعبة! 👆','ما يسوون مثلي بعد.','دومينو المدرسة القديمة.','قريتها مثل كتاب. 📖','الخبرة فوق كل شي.','الكلاسيكيات ما تموت.'],
        ['أيامنا كنا نسمي هذا علقة!','يا ولدي، مو مستواك.','ألعب من قبل الإنترنت.','احترم كبارك! 👴','لازم يحطوني بقاعة المشاهير.','الطاولة تحترم الخبرة.']
      ],
      t: [['لعبة حلوة يا شريك!','هذي الروح!','فريق ممتاز!'],['مثل الآلة!','مثل الأيام الحلوة!','هذا شغل فريق!'],['قوة ما توقف!','بيحكون عنا!','مستوى بطولات!']],
      d: [['يا حسرة.','طيب، ما علينا.','القطع ما تتعاون.'],['بس مطب بالطريق.','مريت بعواصف أقوى.','الصبر مفتاح.'],['تفتكر هذا يزعجني؟ ربيت مراهقين.','عندي صبر أكثر من عمرك.','اللعبة الطويلة لعبتي.']],
      w: [['يا سلام فزت!','لسه عندي اللمسة!','بقول للأحفاد!'],['دومينو! هكذا تلعب! 🎯','نظيف!','دومينو المدرسة القديمة!'],['عشان كذا تحترم الكبار! 👑','عقود من الدومينو!','درس في الإتقان!']]
    }
  }
};


// ---- CHINESE ----
LOCALES.zh = {
  name: '中文',
  flag: '🇨🇳',
  dir: 'ltr',
  names: [
    '伟明','小红','建国','美玲','志强','丽华','浩然','雅琴',
    '天宇','思琪','俊杰','晓燕','子轩','婷婷','明辉','雪梅',
    '文博','佳怡','嘉豪','诗涵','宇航','欣怡','泽宇','梦瑶',
    '瑞祥','秀英','国强','玉兰','德明','桂花','福生','淑芬',
    '永康','凤英','金龙','翠花','大伟','春梅','海涛','月华'
  ],
  cities: [
    '北京','上海','广州','深圳','成都',
    '杭州','武汉','南京','重庆','西安',
    '苏州','天津','长沙','青岛','大连',
    '厦门','昆明','哈尔滨','台北','香港'
  ],
  ui: {
    startGame: '开始游戏', resumeGame: '▶ 继续游戏', rematch: '再来一局',
    newGame: '新游戏', copyLog: '📋 复制记录', copied: '✅ 已复制！',
    gameMode: '游戏模式', ffa: '自由对战', teams: '2v2组队',
    opponents: '对手', playTo: '目标分数', custom: '自定义',
    aiDifficulty: 'AI难度', easy: '😊 简单', mixed: '🎲 混合', hard: '🧠 困难',
    gameSpeed: '速度', fast: '🐇 快速', normal: '🎯 正常', slow: '🐢 慢速',
    players: '玩家', rules: '📖 规则', tutorial: '🎓 教程',
    gameLog: '📋 记录', tileTracker: '🔍 牌面追踪', stats: '📊 统计',
    prefs: '🎨 设置', shortcuts: '❓ 快捷键',
    rageQuit: '💀 退出（算作失败）',
    draw: '摸牌', pass: '过牌', hint: '💡 提示（-5分）', tiles: '🔍 牌',
    yourTurn: '你的回合', thinking: '思考中', turn: '的回合',
    bones: '张牌', openEnds: '开放端', noScore: '未得分',
    scores: '分数', lastPlayed: '上一手', youPlayed: '你出了',
    played: '出了', round: '第', gameOver: '游戏结束',
    youWin: '🏆 你赢了！', wins: '胜', close: '关闭', continue_: '继续',
    autoPlayOnly: '⚡ 自动出牌——唯一选择',
    autoPass: '⚡ 无牌可出——自动过牌',
    noDouble: '没人有对子！\n重新洗牌发牌...',
    countingBones: '计算点数', blocked: '堵牌',
    pipsInHand: '手中点数', lastTile: '🔔 最后一张！', tilesLeft: '张剩余',
    theme: '主题', dark: '🌙 深色', light: '☀️ 浅色',
    tileSkin: '牌面样式', tableTheme: '桌面主题', audio: '音频',
    music: '🎵 背景音乐', sfx: '🔊 音效', trashTalk: 'AI对话',
    off: '关', low: '少', max: '最多',
    colorblind: '♿ 色盲模式', language: '语言',
    playerName: '你的名字', accessibility: '无障碍',
    overall: '总览', gamesPlayed: '游戏场次', winsLosses: '胜/负',
    winRate: '胜率', bestStreak: '最佳连胜',
    totalScored: '总得分', highestPlay: '单次最高',
    highestBonus: '最高奖励', lifetime: '累计',
    totalTiles: '出牌总数', totalDraws: '摸牌总数',
    totalPasses: '过牌总数', achievements: '成就',
    highestDouble: '最大的对子',
    playingTo: '目标',
    scoreboard: '分数',
    youHave: '你有',
    has: '有',
    noBonesToCount: '多米诺！没有牌需要计算。',
    countingBonesTitle: '计算点数',
    pips: '点',
    bonus: '奖励',
    for_: '给',
    continue_btn: '继续',
    blocked_wins: '赢了',
    wonBy: '赢家',
    best: '最佳',
    roundRecap: '回合回顾',
    roundTimeline: '回合时间线',
    yourPerformance: '你的表现',
    tilesPlayed: '出牌数',
    tilesDrawn: '摸牌数',
    scoringPlays: '得分次数',
    totalPointsScored: '总得分',
    bestSinglePlay: '单次最高',
    avgPointsPlay: '平均得分/次',
    pts: '分',
    winsLabel: '胜',
    yourTeam: '你的队伍',
    opponentsTeam: '对手队伍',
    vsYou: '对你',
    teammate: '队友',
    opps: '对手',
    achievementUnlocked: '成就解锁',
    startPlaying: '开始游戏！',
    next: '下一步 →',
    stepOf: '/',
    step: '第',
    skip: '跳过',
    newcomer: '新手', rookie: '菜鸟', dominoMaster: '大师',
    veteran: '老手', regular: '常客', apprentice: '学徒', beginner: '初学者',
    aggressive: '激进', defensive: '防守', chaotic: '混乱',
    calculated: '精算', bully: '霸道',
    achFirstVictory: '首胜', achFirstVictoryDesc: '赢得第一场',
    achFiveStar: '五星回合', achFiveStarDesc: '一回合获得25+奖励',
    achShutout: '零封', achShutoutDesc: '对手零分获胜',
    achOnFire: '火热', achOnFireDesc: '连赢3场',
    achUnstoppable: '势不可挡', achUnstoppableDesc: '连赢5场',
    achBigScore: '大得分', achBigScoreDesc: '单次得20+分',
    achPerfectPlay: '完美出牌', achPerfectPlayDesc: '单次得25+分',
    achRegular: '常客', achRegularDesc: '玩10场',
    achDominoMaster: '多米诺大师', achDominoMasterDesc: '玩50场',
    achCleanSweep: '清扫', achCleanSweepDesc: '出完所有牌',
    achNoHelp: '无需帮助', achNoHelpDesc: '不用提示获胜',
    achRoadblock: '路障', achRoadblockDesc: '赢得堵牌回合',
    achSpeedDemon: '闪电侠', achSpeedDemonDesc: '快速模式获胜',
    achTileVeteran: '牌桌老手', achTileVeteranDesc: '累计出500张牌',
    achLegendary: '传奇', achLegendaryDesc: '连赢10场',
    achHatTrick: '帽子戏法', achHatTrickDesc: '连续得分3次',
    achComebackKid: '逆转王', achComebackKidDesc: '落后50+分后获胜',
    tutWelcomeTitle: '👋 欢迎！',
    tutWelcomeBody: '这是 <strong>All Fives</strong> — 数学与策略结合的多米诺骨牌游戏。让开放端点数之和为<strong>5的倍数</strong>来得分。',
    tut28Title: '🦴 28张牌',
    tut28Body: '从<strong>0|0</strong>到<strong>6|6</strong>的所有组合。你拿5张（2人游戏拿7张）。其余在<strong>牌堆</strong>里。',
    tut28Visual: '...共28张',
    tutFirstTitle: '🏁 第一手',
    tutFirstBody: '持有<strong>最大对子</strong>的玩家先出。这张牌成为<strong>转轴</strong>——一切的中心。',
    tutFirstVisual: '6|6先出——它是老大',
    tutTurnTitle: '🎮 你的回合',
    tutTurnBody: '将一张牌匹配到<strong>开放端</strong>。没有匹配？点<strong>摸牌</strong>从牌堆拿。',
    tutTurnVisual: '两张牌都匹配6',
    tutScoreTitle: '💰 叮！',
    tutScoreBody: '出牌后，加总<strong>所有开放端</strong>。能被5整除？<strong>得相应分数。</strong>这就是游戏的核心。',
    tutScoreVisual: '开放端：3 + 1 + 6 = 10',
    tutScoreExample: '+10分！🔥',
    tutDoubleTitle: '🎲 对子=双倍麻烦',
    tutDoubleBody: '开放端的对子算<strong>两边</strong>。所以4|4=8，不是4。对子是得分好帮手。',
    tutDoubleVisual: '这算 <strong>4 + 4 = 8</strong> 🤯',
    tutSpinnerTitle: '⭐ 转轴展开',
    tutSpinnerBody: '转轴左右都有牌后，<strong>上下</strong>方向开放。现在有<strong>4个开放端</strong>——更多得分机会。',
    tutSpinnerVisual: '4个方向=4倍乐趣',
    tutRoundTitle: '🏆 回合结束！',
    tutRoundBody: '打出最后一张牌喊<strong>"多米诺！"</strong>。你获得其他人剩余点数的<strong>奖励分</strong>。',
    tutRoundVisual: '剩余',
    tutRoundBonus: '= 13点 → 四舍五入为 <strong>+15奖励！</strong>',
    tutReadyTitle: '🚀 准备好了！',
    tutReadyBody: '先到<strong>目标分数</strong>的赢。用<strong>💡提示</strong>（-5分）。按<strong>?</strong>查看快捷键。开始吧！',
    mayBlock: '⚠️ 游戏可能即将堵牌！',
    canScore: '💰 你可以得分！',
    keyboardShortcuts: '键盘快捷键',
    scSelectTile: '按位置选择可出的牌',
    scPlaceLeft: '放在左端',
    scPlaceRight: '放在右端 / 规则',
    scPlaceNorth: '放在北端',
    scPlaceSouth: '放在南端',
    scDraw: '从牌堆摸牌',
    scHint: '使用提示（-5分）',
    scPass: '过牌',
    scMenu: '打开菜单',
    scGameLog: '游戏记录',
    scTracker: '牌面追踪',
    scStats: '统计与成就',
    scPrefs: '设置',
    scToggle: '显示/隐藏此面板',
    scClose: '关闭任何弹窗',
    darkTheme: '🌙 深色', lightTheme: '☀️ 浅色',
    skinClassic: '经典', skinMarble: '大理石', skinWood: '木质',
    skinNeon: '霓虹', skinGold: '金色', skinMidnight: '午夜',
    tableRandom: '随机', tableGreen: '经典绿', tableBlue: '海洋蓝',
    tableRed: '赌场红', tablePurple: '皇家紫', tableWood: '木质',
    resetStats: '🗑️ 重置所有数据',
    resetConfirm: '这将清除所有统计、成就和经验值。确定吗？',
  },
  p: {
    z: {
      o: [
        ['不是吧💀','我居然得分了？？','没想到啊','运气来了哈哈','什么情况','随便赢赢'],
        ['太干净了🧹','你们没机会了','纯实力没运气','我就是主角💅','别挣扎了','差距太大'],
        ['你们完了💀','gg','这是我的时代','别做梦了','我天生不同','算法选择了我🤖']
      ],
      t: [['我们太强了💕','冲冲冲！','一起无敌'],['我们在吃🔥','双人差距','默契拉满'],['字面意义无敌💀','让他们投降吧','我们是主角']],
      d: [['不太行😭','摸牌剧情开始','什么都不行'],['小挫折而已','剧情反转要来了','相信过程'],['战略性摸牌🧠','都在计划中','在构建最终形态']],
      w: [['我赢了？？💀','不可能不可能','我在发抖'],['多米诺冲🔥','结束了💅','太真实了'],['吞噬了他们💀','他们从来没准备好','传奇🐐']]
    },
    m: {
      o: [
        ['这发生了？😂','小确幸','这带来快乐✨','活出最好的多米诺人生','太符合我的人设了'],
        ['就是我在得分💁','不好意思不好意思💅','大心情','这感觉不一样','厨师之吻👨‍🍳💋'],
        ['我是船长了🚢','再见了👋','这是我的TED演讲','这就是道路','我说完了']
      ],
      t: [['一起成长！🥺','团队目标！','我们最棒'],['梦之队！💪','世纪合作','默契满分'],['势不可挡🔥','强强联合','传奇组合']],
      d: [['没事的🔥🐕','需要喝杯茶🍵','水逆了吧'],['只是剧情转折📖','在吸引好牌✨','成长心态'],['都在五年计划里','经历过更糟的','有计划的混乱']],
      w: [['不敢相信😭','这是真的吗？？','快截图！'],['多米诺！🐦','话筒放下🎤','活出最好的人生'],['不是我选择多米诺，是它选择了我👑','传奇表现','我巅峰了']]
    },
    x: {
      o: [
        ['嗯，成了。','收下了。','还行。','分就是分。','没想到。','行吧。'],
        ['就该这么打😎','稳。','打了这么多年了。','经验值钱。','教科书式。','老派风格🕶️'],
        ['坐下吧小朋友。','我打牌的时候你还没出生。','上课了📚','尊重前辈。','不需要运气。','随便吧，我赢了🤷']
      ],
      t: [['好牌。','稳。','在路上了。'],['开始发力了🍳','英雄所见略同。','配合到位。'],['无人能挡。','他们没机会。','这桌子是我们的。']],
      d: [['无所谓。','正常。','不理想。'],['调整一下。','耐心。','经历过。'],['你觉得这能影响我？','见过更糟的。','战略性耐心。']],
      w: [['赢了！','看看。','老将不差。'],['多米诺，干净🧹','完事了。','高效。'],['所以经验很重要。','下课了📚','日常操作。']]
    },
    b: {
      o: [
        ['哎呀！','你看看！','运气来了！','还能行！','不错嘛！','老骥伏枥！'],
        ['这才叫打牌！👆','现在不出我这样的了。','老派多米诺。','看得透透的📖','经验为王。','经典永不过时。'],
        ['我们那时候管这叫完胜！','小伙子，你还嫩着呢。','我打牌比互联网还早。','尊重长辈！👴','该进名人堂了。','牌桌尊重经验。']
      ],
      t: [['好牌，搭档！','就是这个劲头！','好搭档！'],['配合默契！','像老时候一样！','团队精神！'],['势不可挡！','会有人讲我们的故事！','冠军水平！']],
      d: [['哎。','算了。','牌不配合。'],['小坎坷而已。','经历过更大的风浪。','耐心是美德。'],['你觉得这能烦到我？我养过青春期的孩子。','我的耐心比你的年龄还大。','持久战是我的强项。']],
      w: [['哎呀赢了！','宝刀未老！','等我告诉孙子们！'],['多米诺！就该这样！🎯','干干净净！','老派多米诺！'],['所以要尊重长辈！👑','几十年的功力！','大师级表现！']]
    }
  }
};

// ---- Helper to get locale ----
function getLocale(lang) {
  return LOCALES[lang] || LOCALES.en;
}

function getLocalePhrase(lang, gen, category, tier) {
  const loc = getLocale(lang);
  // Map category/gen to compact keys
  const catMap = { opponent: 'o', teammate: 't', draw: 'd', domino: 'w' };
  const genMap = { gen_z: 'z', millennial: 'm', gen_x: 'x', boomer: 'b' };
  const tierIdx = tier === 'low' ? 0 : tier === 'mid' ? 1 : 2;
  const c = catMap[category] || category;
  const g = genMap[gen] || gen;
  const pool = loc.p && loc.p[g] && loc.p[g][c] && loc.p[g][c][tierIdx];
  if (pool && pool.length > 0) return pool[Math.floor(Math.random() * pool.length)];
  // Fallback to English
  const enPool = LOCALES.en.p[g] && LOCALES.en.p[g][c] && LOCALES.en.p[g][c][tierIdx];
  if (enPool && enPool.length > 0) return enPool[Math.floor(Math.random() * enPool.length)];
  return '';
}

// Standalone UI translation helper (for code outside Game class)
function _tUI(key) {
  const lang = localStorage.getItem('domino_lang') || detectBrowserLang();
  const loc = getLocale(lang);
  return (loc.ui && loc.ui[key]) || (LOCALES.en.ui && LOCALES.en.ui[key]) || key;
}

// Detect browser language and map to supported locale
function detectBrowserLang() {
  const supported = Object.keys(LOCALES);
  const langs = navigator.languages || [navigator.language || 'en'];
  for (const raw of langs) {
    const code = raw.toLowerCase().split('-')[0];
    if (supported.includes(code)) return code;
  }
  return 'en';
}


// ---- Rules content per language ----
const RULES = {
  en: `<h3>🎯 The Goal</h3><p>Race to the target score (usually 200). You score points by making the open ends of the board add up to a <strong>multiple of 5</strong>.</p><h3>🦴 Your Tiles</h3><p>28 dominoes, each with two numbers (0–6). You get <strong>7 tiles</strong> with 2 players, <strong>5 tiles</strong> with 3–4. The rest go in the <strong>boneyard</strong> (draw pile).</p><h3>🏁 How It Starts</h3><p>Whoever has the <strong>highest double</strong> (6|6, then 5|5, etc.) plays it first. This tile becomes the <strong>spinner</strong>.</p><h3>🎮 On Your Turn</h3><p>Match one of your tiles to an <strong>open end</strong> on the board. No match? <strong>Draw</strong> from the boneyard. Boneyard empty? <strong>Pass</strong>.</p><h3>⭐ The Spinner</h3><p>The spinner can be played on <strong>all 4 sides</strong>. North and south open up once left and right each have a tile — up to <strong>4 open ends</strong> for scoring.</p><h3>💰 Scoring</h3><p>After you play, add up all open ends. If divisible by 5, you score that many points. <strong>Doubles count both halves</strong> — a 4|4 at the end = 8, not 4.</p><h3>🏆 Round Over</h3><p>Play your last tile = <strong>"Domino!"</strong> — win the round + bonus from opponents' leftover pips. If nobody can move, fewest pips wins.</p><h3>💡 Tips</h3><p>🧮 Count the ends · 🎲 Play doubles early · 🌈 Keep variety · 🚫 Watch who draws · 💡 Use hints (costs 5 pts)</p>`,
  es: `<h3>🎯 El Objetivo</h3><p>Llega al puntaje objetivo (normalmente 200). Ganas puntos cuando los extremos abiertos suman un <strong>múltiplo de 5</strong>.</p><h3>🦴 Tus Fichas</h3><p>28 fichas de dominó, cada una con dos números (0–6). Recibes <strong>7 fichas</strong> con 2 jugadores, <strong>5 fichas</strong> con 3–4. El resto va al <strong>cementerio</strong>.</p><h3>🏁 Cómo Empieza</h3><p>Quien tenga el <strong>doble más alto</strong> (6|6, luego 5|5, etc.) juega primero. Esta ficha es el <strong>mulo</strong>.</p><h3>🎮 En Tu Turno</h3><p>Empareja una ficha con un <strong>extremo abierto</strong>. ¿No puedes? <strong>Roba</strong> del cementerio. ¿Vacío? <strong>Pasa</strong>.</p><h3>⭐ El Mulo</h3><p>El mulo se puede jugar en <strong>los 4 lados</strong>. Norte y sur se abren cuando izquierda y derecha tienen ficha — hasta <strong>4 extremos</strong> para anotar.</p><h3>💰 Puntuación</h3><p>Suma todos los extremos abiertos. Si es divisible por 5, anotas esos puntos. <strong>Los dobles cuentan ambas mitades</strong>.</p><h3>🏆 Fin de Ronda</h3><p>Juega tu última ficha = <strong>"¡Dominó!"</strong> — ganas la ronda + bono de los puntos restantes de los oponentes.</p><h3>💡 Consejos</h3><p>🧮 Cuenta los extremos · 🎲 Juega dobles temprano · 🌈 Mantén variedad · 🚫 Observa quién roba · 💡 Usa pistas (-5 pts)</p>`,
  ar: `<h3>🎯 الهدف</h3><p>اوصل للنتيجة المطلوبة (عادة 200). تسجل نقاط لما مجموع الأطراف المفتوحة يكون <strong>من مضاعفات 5</strong>.</p><h3>🦴 قطعك</h3><p>28 قطعة دومينو، كل وحدة فيها رقمين (0–6). تاخذ <strong>7 قطع</strong> مع لاعبين، <strong>5 قطع</strong> مع 3–4. الباقي في <strong>المخزن</strong>.</p><h3>🏁 البداية</h3><p>اللي عنده <strong>أعلى دبل</strong> (6|6، بعدين 5|5) يلعب أول. هذي القطعة تصير <strong>السبنر</strong>.</p><h3>🎮 دورك</h3><p>طابق قطعة مع <strong>طرف مفتوح</strong>. ما تقدر؟ <strong>اسحب</strong> من المخزن. فاضي؟ <strong>مرر</strong>.</p><h3>⭐ السبنر</h3><p>السبنر يتلعب من <strong>4 جهات</strong>. الشمال والجنوب ينفتحون لما اليمين واليسار يكون فيهم قطع.</p><h3>💰 التسجيل</h3><p>بعد ما تلعب، اجمع كل الأطراف. لو يقبل القسمة على 5، تسجل النقاط. <strong>الدبل يحسب الجهتين</strong>.</p><h3>🏆 نهاية الجولة</h3><p>العب آخر قطعة = <strong>"دومينو!"</strong> — تفوز + بونص من نقاط الخصوم المتبقية.</p><h3>💡 نصائح</h3><p>🧮 احسب الأطراف · 🎲 العب الدبل بدري · 🌈 نوّع · 🚫 راقب من يسحب · 💡 استخدم التلميحات (-5 نقاط)</p>`,
  zh: `<h3>🎯 目标</h3><p>率先达到目标分数（通常200分）。当牌面开放端点数之和是<strong>5的倍数</strong>时得分。</p><h3>🦴 你的牌</h3><p>28张多米诺骨牌，每张有两个数字（0-6）。2人游戏发<strong>7张</strong>，3-4人发<strong>5张</strong>。剩余的是<strong>牌堆</strong>。</p><h3>🏁 开始</h3><p>持有<strong>最大对子</strong>（6|6，然后5|5等）的玩家先出。这张牌成为<strong>转轴</strong>。</p><h3>🎮 你的回合</h3><p>将一张牌匹配到<strong>开放端</strong>。没有匹配？从牌堆<strong>摸牌</strong>。牌堆空了？<strong>过牌</strong>。</p><h3>⭐ 转轴</h3><p>转轴可以从<strong>四个方向</strong>出牌。左右各有一张牌后，上下方向才会开放——最多<strong>4个开放端</strong>可以得分。</p><h3>💰 计分</h3><p>出牌后，加总所有开放端。如果能被5整除，得相应分数。<strong>对子两边都算</strong>——4|4在端点算8分，不是4分。</p><h3>🏆 回合结束</h3><p>打出最后一张牌="<strong>多米诺！</strong>"——赢得回合+对手剩余点数的奖励分。</p><h3>💡 技巧</h3><p>🧮 计算端点 · 🎲 早出对子 · 🌈 保持多样性 · 🚫 观察谁在摸牌 · 💡 使用提示（-5分）</p>`
};
