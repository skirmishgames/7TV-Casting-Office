/* Episodes written for this site. The full script of each lives in episodes/<id>.json, in the same format
   the Writers' Room saves and exports, so any episode opens there for editing. This file holds what the
   Episodes page needs to list, sort and filter them. Listed in suggested play order.
   An episode counts as playtested once PLAYTESTS_NEEDED playtests are logged. Entries with sample: true
   only show the layout and come out before an episode goes public. */
window.SEVENTV_SHOWS = {
  playtestsNeeded: 3,

  /* What players do in the scene. An episode can have several. */
  objectives: {
    carry: 'Grab and carry',
    hold: 'Hold ground',
    escort: 'Escort',
    target: 'Take out a target',
    escape: 'Escape the board',
    survive: 'Survive waves',
    search: 'Search',
    destroy: 'Destroy',
    clock: 'Against the clock'
  },
  /* Rules that change how the scene plays */
  features: {
    third: 'Third party',
    reinforce: 'Reinforcements',
    hazards: 'Hazards',
    finale: 'Custom finale',
    tables: 'Event table',
    vehicles: 'Vehicles'
  },
  /* Cast size bands, in ratings per side */
  sizes: [['small', 'Small (up to 25)', 0, 25], ['standard', 'Standard (26-50)', 26, 50], ['large', 'Large (51+)', 51, 999]],

  list: [
    {
      id: 'running-red', file: 'episodes/running-red.json',
      title: 'Running Red', tagline: 'Six minutes. One red light. Two million in unmarked bills.',
      premise: 'An armoured truck runs the same route every Friday. A crew of professionals has timed the light at Fifth and Main, and has until the first squad car arrives to stop the truck, crack the doors and get the bags out. The truck drives on rails until someone makes noise; after that it is a chase.',
      genres: ['action'], format: 'narrative', scenario: 'The Steal',
      objectives: ['carry', 'escort', 'clock'], features: ['reinforce', 'vehicles', 'tables'],
      needs: ['core'], ratings: 35, board: '36x36', players: '2', time: '60-90',
      version: '2.0', added: '2026-11-24', series: null,
      testNotes: [
        'On schedule: is 6" a turn the right pace? On which script card did the truck reach R3, and did it ever reach R5?',
        'The light: did rigging it with a Mind test feel worth a special action, or did the crew just block the road?',
        'Stopping the truck: which way did the crew stop it (roadblock, tyres or light)? Did the collision roll feel fair to both sides?',
        'Going loud: who set off the alarm, and when? Did the police arriving one at a time from the west edge come too fast or too slow?',
        'The cavalry: if the alarm never went up before Act Two, did the heroic cast get back into the fight?',
        'Breaching: how many attempts did it take to open the doors?',
        'Dye packs: is 1 in 6 a fun risk, or does it feel like bad luck with no choice?',
        'Getaway: how many bags left the table, and how? Did the getaway car get used?',
        'Victory points: final score, and did the winner deserve it? Is +3 for the truck escaping too much or too little?',
        "Director's cut: which one did you use, and did it change the game?"
      ],
      changes: [
        '2.0: rewritten for the Episodes page on a 3\' x 3\' table. Fixed casts at 35 ratings a side; the truck drives itself at 6" a turn until the alarm; three ways to stop it (roadblock, tyres, rigged light); dye packs on the cash bags; the vault holds a maguffin; the getaway car can carry the loot off any edge; the alarm also sounds on any attack; director\'s cuts reworked so each one cuts both ways.'
      ],
      playtests: []
    },
    {
      id: 'dead-or-alive', file: 'episodes/dead-or-alive.json',
      title: 'Dead or Alive', tagline: 'Clarence Boddicker is coming in. One way or the other.',
      premise: "RoboCop and the Detroit police raid Clarence Boddicker's cocaine factory. Taking Clarence alive and getting him into the squad car scores double what killing him does. The gang burns the ledgers that lead to OCP, waits for the boat, and has a lawyer on the phone. Both arrive in the Finale.",
      genres: ['action'], format: 'narrative', scenario: 'The Raid',
      objectives: ['target', 'hold', 'escape', 'clock'], features: ['hazards', 'vehicles', 'finale'],
      needs: ['core', 'steeljustice'], ratings: 35, board: '36x36', players: '2', time: '60-90',
      version: '1.0', added: '2026-11-24', series: null,
      testNotes: [
        'Dead or alive: did the police go for the arrest, or just shoot Clarence? Is +3 for booking him enough to make that a real choice?',
        'Book him: how far did RoboCop have to walk Clarence to Unit 23? Did the gang free him by giving the captor a status?',
        'The boat: did Clarence reach the dock? Is the Finale too late or too early for it to open?',
        'One phone call: did counsel arrive before the police could book Clarence? Is 5+ the right roll?',
        'Ledgers: who ended up holding them? Did Greed Is Good pulling them to Clarence feel strong?',
        'Snow: did any product piles burst? Did the gang use them for extra actions?',
        'Balance: the gang defends from cover with equal ratings. Did the police get into the factory in time?',
        'Victory points: final score, and did the winner deserve it?',
        "Director's cut: which one did you use, and did it cut both ways?"
      ],
      changes: ['1.0: first version.'],
      playtests: []
    },
    {
      id: 'can-you-fly-bobby', file: 'episodes/can-you-fly-bobby.json',
      title: 'Can You Fly, Bobby?', tagline: 'Three crates. Military hardware. A friend at OCP who wants the problem gone.',
      premise: "An OCP truck has left three crates of Cobra assault cannons for Clarence Boddicker's gang. Lewis and a thin stakeout hold the site office until RoboCop arrives at Act Two. The gang can drive the crates off for points or break them open and fight with the cannons, but an opened crate scores nothing.",
      genres: ['scifi', 'action'], format: 'narrative', scenario: 'The Steal',
      objectives: ['carry', 'escape', 'destroy', 'clock'], features: ['reinforce', 'vehicles'],
      needs: ['core', '80s'], ratings: 35, board: '36x36', players: '2', time: '45-75',
      version: '1.0', added: '2026-11-24', series: null,
      testNotes: [
        'Pace: on which turn did the first crate reach the van, and on which turn did the van leave? The fastest possible exit is turn 4.',
        'Strapped down: did the Body test slow the gang enough, or too much?',
        'Open it: how many crates were opened, and by whom? Did a planted Cobra dominate the lot?',
        'Backup: did the stakeout survive until Act Two? Is a 3-card Act One the right length?',
        'The van: did the police wreck it? Is +2 for the van, and +2 per crate driven off, the right weight?',
        'Terminate: how many plot points did RoboCop earn from kills?',
        'Victory points: final score, and did the winner deserve it?',
        "Director's cut: which one did you use, and did it cut both ways?"
      ],
      changes: ['1.0: first version.'],
      playtests: []
    }
  ]
};
window.SEVENTV_SHOWS.list.forEach((e) => { e.status = e.sample ? 'sample' : (e.playtests || []).length >= window.SEVENTV_SHOWS.playtestsNeeded ? 'playtested' : 'untested'; });
