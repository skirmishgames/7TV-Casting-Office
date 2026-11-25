/* Writers' Room: building blocks for writing your own episodes and tropes in the 7TV format.
   Page references are to the 7TV Core Rulebook. The help text is our own summary of the format,
   not the book's wording, so players still need the rulebook for the rules themselves. */
window.SEVENTV_WRITERS_ROOM = {
  /* Map pieces. Rectangles use x, y, w, h (inches from the top-left corner); markers use cx, cy (centre). */
  pieces: {
    'zone-h': { name: 'Heroic set-up area', legend: 'Heroic set-up area', rect: 1, def: { x: 0, y: 33, w: 36, h: 3 } },
    'zone-v': { name: 'Villainous set-up area', legend: 'Villainous set-up area', rect: 1, def: { x: 0, y: 0, w: 36, h: 3 } },
    'zone-n': { name: 'Neutral or third set-up area', legend: 'Neutral set-up area', rect: 1, def: { x: 0, y: 15, w: 3, h: 6 } },
    objective: { name: 'Objective token', legend: 'Objective token', centre: 1, n: 1, def: { cx: 18, cy: 18, n: '1' } },
    maguffin: { name: 'Maguffin', legend: 'Maguffin', centre: 1, def: { cx: 18, cy: 18 } },
    search: { name: 'Search point or prop cache', legend: 'Search point', centre: 1, def: { cx: 18, cy: 18 } },
    cameo: { name: 'Cameo or hostage', legend: 'Cameo', centre: 1, def: { cx: 18, cy: 18 } },
    building: { name: 'Building', legend: 'Building', centre: 1, size: 1, rot: 1, def: { cx: 18, cy: 18, w: 6, h: 5, rot: 0 } },
    ruin: { name: 'Ruin or room outline', legend: 'Ruin', centre: 1, size: 1, rot: 1, def: { cx: 18, cy: 18, w: 8, h: 6, rot: 0 } },
    wall: { name: 'Wall, fence or barricade', legend: 'Wall or fence', centre: 1, size: 1, rot: 1, def: { cx: 18, cy: 18, w: 8, h: 0.6, rot: 0 } },
    woods: { name: 'Woods or trees', legend: 'Woods', centre: 1, size: 1, def: { cx: 9, cy: 18, w: 7, h: 6 } },
    rough: { name: 'Rough ground', legend: 'Rough ground', centre: 1, size: 1, def: { cx: 27, cy: 18, w: 7, h: 5 } },
    water: { name: 'Water', legend: 'Water', centre: 1, size: 1, rot: 1, def: { cx: 18, cy: 26, w: 36, h: 4, rot: 0 } },
    hill: { name: 'Hill', legend: 'Hill', centre: 1, size: 1, def: { cx: 18, cy: 10, w: 9, h: 6 } },
    road: { name: 'Road or path', legend: 'Road', centre: 1, size: 1, rot: 1, def: { cx: 18, cy: 18, w: 4, h: 36, rot: 0 } },
    vehicle: { name: 'Vehicle', legend: 'Vehicle', centre: 1, size: 1, rot: 1, def: { cx: 18, cy: 18, w: 2.5, h: 5, rot: 0 } },
    crate: { name: 'Crates or cover', legend: 'Cover', centre: 1, size: 1, rot: 1, def: { cx: 18, cy: 18, w: 2, h: 2, rot: 0 } },
    crater: { name: 'Crater or pit', legend: 'Crater', centre: 1, size: 1, def: { cx: 18, cy: 18, w: 4, h: 4 } },
    platform: { name: 'Raised platform', legend: 'Raised platform', centre: 1, size: 1, rot: 1, height: 1, def: { cx: 18, cy: 18, w: 12, h: 12, rot: 0, ht: 1 } },
    waypoint: { name: 'Route marker', legend: 'Route marker', centre: 1, n: 1, def: { cx: 18, cy: 18, n: 'R1' } },
    spawn: { name: 'Spawn point', legend: 'Spawn point', centre: 1, n: 1, def: { cx: 18, cy: 18, n: '' } },
    exit: { name: 'Escape edge', legend: 'Escape edge', rect: 1, def: { x: 35, y: 0, w: 1, h: 36 } },
    label: { name: 'Text label', legend: '', centre: 1, text: 1, def: { cx: 18, cy: 18, t: 'Label' } }
  },
  order: ['zone-h', 'zone-v', 'zone-n', 'objective', 'maguffin', 'search', 'cameo', 'building', 'ruin', 'wall', 'woods', 'rough', 'water', 'hill', 'road', 'vehicle', 'crate', 'crater', 'platform', 'waypoint', 'spawn', 'exit', 'label'],
  /* terrain that can be flagged as a hazard or given Health (drawn with a red outline) */
  hazardable: ['building', 'ruin', 'wall', 'woods', 'rough', 'water', 'hill', 'road', 'vehicle', 'crate', 'crater', 'platform'],

  /* Playing area sizes in inches. The six open play episodes are written for up to 3 by 3 feet (Core p. 126). */
  areas: [[24, 24, "2' x 2'"], [36, 36, "3' x 3'"], [48, 36, "4' x 3'"], [48, 48, "4' x 4'"], [60, 36, "5' x 3'"], [72, 48, "6' x 4'"]],

  /* Start locations. A cast's start location runs from its table edge up to 3" in (Core p. 69). */
  presets: {
    edges: { name: 'Opposite edges (the standard set-up)', zones: (W, H) => [{ k: 'zone-h', x: 0, y: H - 3, w: W, h: 3 }, { k: 'zone-v', x: 0, y: 0, w: W, h: 3 }] },
    flanks: { name: 'Left and right edges', zones: (W, H) => [{ k: 'zone-h', x: 0, y: 0, w: 3, h: H }, { k: 'zone-v', x: W - 3, y: 0, w: 3, h: H }] },
    corners: { name: 'Opposite corners', zones: (W, H) => [{ k: 'zone-h', x: 0, y: H - 9, w: 9, h: 9 }, { k: 'zone-v', x: W - 9, y: 0, w: 9, h: 9 }] },
    centre: { name: 'Villains hold the centre', zones: (W, H) => [{ k: 'zone-h', x: 0, y: H - 3, w: W, h: 3 }, { k: 'zone-v', x: W / 2 - 6, y: H / 2 - 6, w: 12, h: 12 }] },
    heroCentre: { name: 'Heroes hold the centre', zones: (W, H) => [{ k: 'zone-v', x: 0, y: 0, w: W, h: 3 }, { k: 'zone-h', x: W / 2 - 6, y: H / 2 - 6, w: 12, h: 12 }] },
    ambush: { name: 'Ambush from both sides', zones: (W, H) => [{ k: 'zone-h', x: 0, y: H / 2 - 3, w: W, h: 6 }, { k: 'zone-v', x: 0, y: 0, w: W, h: 3 }, { k: 'zone-v', x: 0, y: H - 3, w: W, h: 3 }] }
  },

  dice: ['1D3', '1D6', '2D6', 'Token number', 'Named list', 'None'],

  /* When a cast member enters play */
  arrives: [['', 'Set up'], ['Act One', 'Act One'], ['Act Two', 'Act Two'], ['Finale', 'Finale'], ['Reserve', 'Reserve']],

  /* Victory point rows most narrative episodes share */
  vpStandard: [
    { condition: 'Enemy has no models in play (do not also score for axing)', who: '', vp: '+2' },
    { condition: 'Enemy cast is axed', who: '', vp: '+1' },
    { condition: 'Each enemy Star or Co-Star removed from play', who: '', vp: '+1' }
  ],

  /* Rule snippets: common scene mechanics in our own words. Words in [brackets] are for you to change. */
  snippets: [
    { title: 'Non-lethal force', text: 'Neither cast may use attacks that deal -1 Health against the other cast in this scene. Attacks against third-party models are not affected, and third-party models attack as normal.', dice: 'None', rows: [] },
    { title: 'Hazard', text: 'Any model that ends its move within 1" of a hazard marked in red on the map must pass a [Body] statistic test or receive the [On Fire] status.', dice: 'None', rows: [] },
    { title: 'Breakable scenery', text: 'A model in base contact with the [doors] can spend a special action and pass a Fight statistic test to deal -1 Health to them. They have Health [4]. At 0 Health, [the doors are open and models can move through].', dice: 'None', rows: [] },
    { title: 'Escape', text: 'Models of the [heroic] cast can leave the playing area across the escape edge. A model that escapes is removed from play, but does not count towards axing and its cast still gains its plot points.', dice: 'None', rows: [] },
    { title: 'Timed arrival', text: 'In each Act Two script phase, the [villainous] player rolls 1D6, adding +1 for each script card played this act after the first. On a 6 or more, place the [getaway car] at [the marked point].', dice: 'None', rows: [] },
    { title: 'Falling', text: 'A model pushed within [3]" of a playing area edge must pass a Body statistic test or fall. An Extra that falls is removed from play. A Star can spend {PP}{PP} and a Co-Star {PP} to stay put on the edge instead.', dice: 'None', rows: [] },
    { title: 'Prop pool', text: 'Neither cast starts with prop cards. Before play, shuffle [these props] face down beside the playing area. Draw one whenever [a model searches a crate].', dice: 'None', rows: [] },
    { title: 'Random event', text: 'At the start of each act, the player with the initiative rolls 1D6 on this table.', dice: '1D6', rows: [['1', ''], ['2', ''], ['3', ''], ['4', ''], ['5', ''], ['6', '']] },
    { title: 'Token surprises', text: 'When a model claims an objective token, check its number on this table and apply the result at once.', dice: 'Token number', rows: [['1', ''], ['2', ''], ['3', ''], ['4', ''], ['5', ''], ['6', '']] },
    { title: 'Custom finale cards', text: 'Use these cards instead of the finale cards from the Core Rulebook. Write each on a blank card or draw them at random from this list.', dice: 'Named list', rows: [['', ''], ['', ''], ['', ''], ['', ''], ['', '']] }
  ],

  /* The episode format, section by section (Core pp. 126 and 134; 80s guide p. 44). */
  episodeHelp: {
    synopsis: 'The story of the scene: what each cast wants, and why. Keep it to a paragraph or two (Core p. 126).',
    production: 'Optional flavour, in the style of the 80s guide: the show or film this scene comes from, who starred in it and how it was made.',
    basis: 'Build on one of the six open play episodes if you like, then change what you need. Their set-up, special rules and victory points are in the Core Rulebook, pp. 126-132.',
    casts: 'A narrative episode names each cast: affiliation, genre, whether it attacks or defends, its ratings total and every member with the profile card it uses (Core p. 134). Leave a cast empty for open play.',
    location: 'Describe the place so players can dress the table, and suggest the terrain.',
    setup: 'Playing area size, where each cast starts and how objective tokens are placed. Without changes, use the standard steps: objective tokens p. 67, start locations p. 69.',
    action: 'Initiative is rolled as normal (Core p. 71) unless you change it under Table rules.',
    special: 'Rules found only in this scene. Add a dice table for searches, events or random effects. A trope can override set-up, objective tokens and victory conditions (Core p. 146).',
    directors: 'Up to three optional conditions players can add for variety, each a short name and a line of rules (Core p. 126).',
    credits: 'A scene normally ends when one cast has no models left in play or the script deck runs out. Add any other way this scene can end.',
    vp: 'The standard victory points are on Core p. 115. List any extra conditions, who can score them and how many VPs they are worth.',
    dressing: 'Suggest tropes, maguffins (Core p. 198) and props (Core p. 182) that suit the scene, as the 80s guide does.',
    rules: 'Narrative episodes often change the table rules: who has the initiative, how big the script deck is, and whether injuries, genre cards or Steal the Scene are in play. Anything left alone stays standard.',
    tokens: 'Name each objective token so players know what it stands for, and say who can collect them. With pick up and carry, a token goes with the model that collects it and must still be held when the scene ends.',
    arrives: 'Pick when each member enters play. Anyone not there at set up arrives at the start of that act, in base contact with the edge or point your set up names.',
    third: 'A third party acts for neither cast, following the cameo rules (Core pp. 146-147): monsters, bystanders, manifestations.',
    snippets: 'Start a special rule from the library, then change the words in [brackets].'
  },
  tropeHelp: {
    intro: 'A trope is an optional set of rules you can add to any episode, labelled with the genre it suits. It can change the playing area, the objective tokens and the victory conditions (Core p. 146).',
    sections: 'Most tropes change how objective tokens are placed or collected, then add a dice table of events. Name each section after what it does.',
    cameo: 'Cameos are extra models that wander onto the set. List the profiles for the cameo deck; they act on the cameo reactions table (Core p. 147).',
    vp: 'Extra victory point conditions, if the trope has any (standard VPs, Core p. 115).',
    maguffin: 'A maguffin the trope uses, if any (Core p. 198).'
  },

  /* Ideas to start from. A spark rolls one of each. */
  sparks: {
    hooks: ['A double-cross mid-scene', 'A ticking clock', 'The wrong person is carrying the prize', 'A storm cuts the lights', 'The location is collapsing',
      'A rival third party arrives', 'One side is outnumbered but well hidden', 'Hostages in the crossfire', 'A secret identity is about to be revealed', 'The escape route is cut off',
      'A monster nobody planned for', 'The cavalry is on its way, for one side'],
    places: ['Rooftop chase', 'Abandoned warehouse', 'Shopping mall after hours', 'Drive-in theatre', 'Docks at night', 'Ski lodge', 'Embassy gala', 'Jungle temple', 'Moonbase corridor',
      'Small-town main street', 'Haunted manor', 'Freight train', 'Casino floor', 'Research station in the ice', 'Suburban cul-de-sac', 'TV studio']
  }
};
