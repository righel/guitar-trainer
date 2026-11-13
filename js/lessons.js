'use strict';

// Theory text for the sidebar sections and items. **text** renders bold.
const Lessons = (() => {
  // Keyed by sidebar node id.
  const nodes = {
    scales: [
      'A scale is a set of notes ordered by pitch and defined by its **interval formula**, the distance of each note from the root. Formulas here are written against the major scale (1 2 3 4 5 6 7), so ♭3 means a minor third and ♯4 an augmented fourth. The major scale\'s step pattern is **W W H W W W H** (W = whole step = 2 frets, H = half step = 1 fret).',
      'On the guitar every fret is a half step, so a scale fingering is a **movable pattern**: slide it to change key. Learn where the root sits in each pattern and think of the other notes as intervals from it. The "Intervals" label mode shows exactly that.',
      'Colors on the fretboard follow the scale degree, so a color always means the same function: red = root, yellow = 3rd, cyan = 5th, pink = 7th.',
    ],
    'scales/Diatonic modes': [
      'The **modes** are the major scale started from each of its seven notes. Playing C major from D gives D Dorian, from E gives E Phrygian, and so on: same notes, new root, different sound.',
      'Ordered from brightest to darkest, each mode lowers one note of the one before: **Lydian** (♯4) → **Ionian** → **Mixolydian** (♭7) → **Dorian** (♭3) → **Aeolian** (♭6) → **Phrygian** (♭2) → **Locrian** (♭5).',
      'Each mode has a **characteristic note** that separates it from plain major or minor: ♯4 in Lydian, ♭7 in Mixolydian, the natural 6 in Dorian, ♭2 in Phrygian, ♭5 in Locrian. Lean on that note to make the mode audible.',
      'Diatonic chord for each mode: Ionian over Imaj7, Dorian over ii m7, Phrygian over iii m7, Lydian over IVmaj7, Mixolydian over V7, Aeolian over vi m7, Locrian over vii m7♭5.',
    ],
    'scales/Minor scales': [
      '**Natural minor** (Aeolian) shares its notes with the major scale a minor 3rd above (its relative major): A minor = C major. Formula 1 2 ♭3 4 5 ♭6 ♭7.',
      '**Harmonic minor** raises the 7th, creating a leading tone a half step below the root. That gives minor keys a major V chord (E7 → Am), plus the exotic **augmented 2nd** (3 frets) between ♭6 and 7.',
      '**Melodic minor** raises both the 6th and 7th, closing that gap. Classical players use it ascending and fall back to natural minor descending. Jazz uses it in both directions, and its modes are a major source of sounds (see Harmonic & melodic modes).',
    ],
    'scales/Pentatonic & blues': [
      'Pentatonic scales have **five notes and no half steps**, so almost nothing clashes with the chords of the key. That is why they dominate rock, blues and pop soloing.',
      '**Major pentatonic** is the major scale without the 4th and 7th (1 2 3 5 6). **Minor pentatonic** is natural minor without the 2nd and ♭6 (1 ♭3 4 5 ♭7). They are relatives: A minor pentatonic and C major pentatonic contain the same notes.',
      'On the neck they form **five box shapes** that join end to end and repeat every 12 frets. Use the Position window (e.g. frets 5–8 for A minor) to practise one box at a time.',
      'The **blues scale** adds the ♭5 "blue note" to minor pentatonic. **Major blues** adds the ♭3 to major pentatonic, usually slid or bent up into the 3rd.',
    ],
    'scales/Harmonic & melodic modes': [
      'Like the major scale, harmonic minor, melodic minor and harmonic major can be started from any degree. Several of those modes are everyday sounds.',
      '**Phrygian dominant** (5th mode of harmonic minor) is 1 ♭2 3 4 5 ♭6 ♭7: the V7 sound in a minor key, also heard in flamenco and metal. **Lydian dominant** (4th mode of melodic minor) is a dominant scale with ♯4, used over 7♯11 chords and tritone substitutions.',
      '**Altered** (7th mode of melodic minor) keeps root, 3rd and ♭7 and alters everything else: ♭9, ♯9, ♭5, ♯5. It puts maximum tension on a dominant chord right before it resolves.',
      '**Harmonic major** (major with ♭6) and **Hungarian minor** (harmonic minor with ♯4) add darker, more exotic colors.',
    ],
    'scales/Symmetric': [
      'Symmetric scales repeat one interval pattern, so they have only a few distinct transpositions, and their fingerings repeat along the neck.',
      '**Whole tone** has six notes, all whole steps, and only two different whole-tone scales exist. It fits augmented and 7♯5 chords and sounds dreamy and unresolved.',
      '**Diminished** has eight notes alternating half and whole steps. Only three exist, and the pattern repeats every 3 frets. **Half-whole** fits dominant 7♭9 chords; **whole-half** fits diminished 7th chords.',
    ],

    chords: [
      'Chords are built by **stacking thirds** on a root. 1-3-5 is a triad, adding the 7th gives a seventh chord, and continuing past the octave gives the **extensions** 9, 11 and 13 (the 2nd, 4th and 6th an octave up).',
      'The **chord symbol** encodes the formula: maj7 = 1 3 5 7, 7 = 1 3 5 ♭7, m7 = 1 ♭3 5 ♭7. The 3rd decides major or minor, and the 7th decides the chord family.',
      'Guitarists rarely play every chord tone. The 5th is the first to go because it adds little color, then the root when a bass player covers it. The **3rd and 7th** (the "guide tones") carry the chord\'s identity.',
    ],
    'chords/Seventh chords': [
      'Stacking thirds on every note of the major scale gives the diatonic seventh chords: **Imaj7 – ii m7 – iii m7 – IVmaj7 – V7 – vi m7 – vii m7♭5**. These qualities cover most tonal harmony.',
      '**Dominant 7** (1 3 5 ♭7) contains a tritone between the 3rd and ♭7 that wants to resolve. It is the engine of V7 → I.',
      '**Diminished 7** (1 ♭3 ♭5 𝄫7) is built only from minor thirds, so any of its notes can act as the root and its shape repeats every 3 frets. It is the vii°7 chord of harmonic minor.',
      '**m(maj7)** is the tonic chord of harmonic and melodic minor. **7sus4** swaps the 3rd for a 4th to suspend a dominant. **+7** raises the 5th for extra pull toward the next chord.',
    ],
    'chords/Sixth & added-tone': [
      'These chords color a triad **without adding a 7th**. **6** adds the major 6th (1 3 5 6), **add9** adds the 9th (1 3 5 9), and **6/9** adds both for an open, pentatonic sound.',
      'C6 contains the same notes as Am7. Which name is right depends on the bass note and the context.',
      '**m6** (1 ♭3 5 6) is the classic minor tonic in jazz and bossa nova. **m(add9)** is a moody, open minor color.',
    ],
    'chords/Extended & altered': [
      '**Extensions** keep stacking thirds past the 7th: 9, 11, 13. A "9" chord implies the 7th (C9 = C7 + 9); without the 7th the chord is called add9.',
      'On chords with a major 3rd, the natural **11** clashes with the 3rd, so dominant 13 chords usually leave it out. **m11** has no such clash and is common.',
      '**Altered tensions** (♭9, ♯9, ♯11, ♭13) appear on dominant chords that resolve. **7♭9** pulls strongly toward minor chords. **7♯9** (the "Hendrix chord") combines the major 3rd with a minor-3rd-sounding ♯9.',
      'Guitar voicings of these chords usually drop the 5th, often the root as well, and keep the 3rd, 7th and extension on the top strings.',
    ],

    triads: [
      'A **triad** is three notes stacked in thirds: root, 3rd and 5th. The two thirds decide its quality. **Major** = major 3rd + minor 3rd, **minor** = minor 3rd + major 3rd, **diminished** = two minor 3rds, **augmented** = two major 3rds. **Sus2** and **sus4** replace the 3rd with the 2nd or the 4th.',
      '**Inversions** change which chord tone is lowest. In **root position** the root is in the bass (R-3-5), in **1st inversion** the 3rd is (3-5-R), and in **2nd inversion** the 5th is (5-R-3). The chord is the same, but the voicing and top note change.',
      'Played **closed** on three adjacent strings, each triad has three shapes per string set. Going up the neck they always come in the same order: root position → 1st inversion → 2nd inversion → root position an octave higher. Three shapes cover the whole neck on one string set.',
    ],

    exercises: [
      'Each exercise is a preset: it picks the item, pattern, subdivision and auto-advance, then you press Play. Start at a tempo where every note is clean, and only raise the BPM by about 5 after a few clean passes.',
      'Say or think the **interval names** as you play. The goal is to know what every note is, not only where the fingers go.',
    ],
    'ex/seq': [
      '**Sequences** play a scale in overlapping groups (thirds, threes, fours). They break the up-and-down habit, build picking control across strings, and are the raw material of many melodic lines.',
      'The sequences run through **every block of the scale** along the neck. The major scale and its modes use the **five positions found in most guitar books**, each built around one CAGED chord shape (two or three notes per string, about a four-fret span with an occasional one-fret stretch). A mode shares its positions with its parent major scale: D Dorian uses the C major positions. The **3 NPS** switch in the Positions bar swaps them for seven three-notes-per-string positions, one starting on each scale degree. Other seven-note scales (harmonic and melodic minor…) always use three notes per string. Pentatonic and blues scales use two notes per string, which gives the classic **five boxes**. The fretboard follows the block being played, so you can see where the next one starts.',
      'Each pattern uses a subdivision that matches its grouping, so the first note of every group lands on the beat: groups of 3 as triplets, groups of 4 as sixteenths, thirds as eighth-note pairs.',
    ],
    'ex/diag': [
      'These runs cross all six strings **while the hand travels along the neck**. Play a few scale notes on the 6th string, then start the next string a scale step further up, and so on to the 1st string. Then retrace the same frets back down. The goal is shifting smoothly instead of living in one box.',
      'Fewer notes per string means more distance per note: **1 note per string** is a pure diagonal, **2** makes you shift on almost every string, and **3–4** add the stretches and slides of horizontal playing. With **2 steps per string** you cover the neck twice as fast.',
      'The exercise repeats the run from **every scale note of the 6th string** (one position per degree), so you practise the same motion starting from different fingers and fret areas. Pick a single one in the Positions bar under the fretboard, or step through them with ← / →.',
      'In high keys the run can reach the end of the neck before the 1st string. Set **Start on → Lowest scale note** to begin near the nut instead of on the root.',
      'Shift with the finger that ends one string so it lands where the next string starts, and keep the timing even through each shift. That is where most of the practice value is.',
    ],
    'ex/arp': [
      'An **arpeggio** plays a chord\'s tones one at a time. Arpeggios link chord shapes to scales: chord tones are the strongest notes to land on, and outlining them makes a solo follow the changes.',
      'Watch the colors: the root, 3rd, 5th and 7th keep the same colors in every key and position.',
    ],
    'ex/inv': [
      'Cycling one triad through its inversions on a single string set is the fastest way to map triads across the neck. Play one shape per beat, move the minimum distance between shapes, and name the **top note** of each shape. When you comp, that top note is the melody note.',
    ],
    'ex/prog': [
      'Building triads on every degree of the major scale gives **I ii iii IV V vi vii°**: major on 1, 4 and 5, minor on 2, 3 and 6, diminished on 7. Natural minor gives **i ii° III iv v VI VII**, and harmonic minor makes the v chord major (**V**) for a stronger pull home.',
      'Instead of jumping between root-position shapes, **voice leading** picks for each chord the inversion closest to the previous one. Common tones stay put and the other notes move by a step or two. On one string set the whole progression often fits under the hand, and it sounds smooth and connected.',
      'Practise each progression on every string set, and from each starting voicing (the Positions bar). Say the chord names as you play and listen to the **top note** of each voicing: it forms a melody of its own.',
    ],
    caged: [
      '**CAGED** names the five open chord shapes, **C, A, G, E and D**, that tile the whole neck when you move them up. For any chord, the five shapes follow each other in that order (C → A → G → E → D → C …), each one starting where the previous one ends, so neighbouring shapes **share notes**. In G the order starts on G: G → E → D → C → A.',
      'Each shape carries its **root** on a fixed string: E and G shapes on the 6th (and 1st), A and C shapes on the 5th, D shape on the 4th. Find the root, and you know which shape you are in.',
      'Shapes are a map, not chords you must strum: the full G and C shapes are hard to play high up the neck. What matters is the **chord tones** under each shape (the arpeggio) and the **scale position** around them. A solo that targets these notes follows the chord.',
      'Each shape also defines a scale position: the major scale (or pentatonic box) that surrounds the chord shape. Learn one shape, its arpeggio and its scale together, then connect the five along the neck. The Positions bar (C/A/G/E/D) loops one shape, and **Chord → arpeggio → scale** plays all three in each.',
    ],
    'ex/caged': [
      'Work the system in layers: first the **chord shapes** (strum each for a bar while saying its letter), then the **arpeggios** (chord tones only), then the **scale positions** around them. Change the key often: the order of shapes stays the same, only the starting shape moves.',
      'Random key drills deal a new root after every pass. Before the downbeat, find the root on the 6th or 5th string, which tells you which shape comes first.',
    ],
    'ex/changes': [
      'Clean, on-time **chord changes** matter more than knowing many chords. Strum on every beat and change exactly on beat 1. If the new chord is not ready, keep strumming anyway: the rhythm must not stop. The fretboard and the chord diagrams in this panel show each shape, and the tab view lists the frets.',
      '**One-minute changes:** play only the two chords of a pair, strumming each once per bar, and count how many clean changes you make in 60 seconds. Write the number down and try to beat it the next day. This is the fastest way to make a new chord automatic.',
      'Economy of motion: lift the fingers as a group and land them together, keep **common fingers** down (C → Am keeps two fingers in place), and slide along a string instead of lifting when a finger moves on the same string (D → Em, G → Em). Look at the next chord during beat 4, not at the moment of change.',
      '**Barre chords** come from two movable shapes: the **E-shape** with the root on the 6th string and the **A-shape** with the root on the 5th. Moving the same shape up and down the neck plays every chord of that quality. The barre exercises play the changes as open chords, then entirely as barres starting from each shape, choosing for each chord the barre closest to the previous one. Every progression in *Triad progressions* can also be played as full chords: set **Voicing → Full chords**.',
    ],
    routines: [
      'Each routine splits a time budget into **warm-up → technique → fretboard & chords → melody**. Longer routines add more technique and expression, and the melody block grows the most, because that is where practice becomes music. Pick a budget, press **▶ Start** (or Space) and follow along: every step loads its exercise and counts down, and a chime announces the next one. Click any segment to jump to it.',
      '**Rotations** keep it fresh without planning. The **key of the day** moves round the circle of fifths (🎲 picks another for today); the scale sequence, triad string set, CAGED quality and the **line style of the day** with its progression change daily (Mon targets, Tue guide tones, Wed arpeggio → scale, Thu enclosures, Fri motif, Sat improvised phrases over a blues, Sun review). One week touches everything.',
      '**Tempo ladder:** start where every note is clean; after 3 clean passes add 5 BPM. When you leave a step, the tempo you reached is saved as your best for that exercise, and next time the step starts 10 BPM below it so you climb back up. Today\'s minutes, the week total and your streak (days with at least 5 minutes) are kept in this browser.',
    ],
    'ex/melody': [
      'Running a scale up and down is not a melody. Melody over changes means the scale **follows the chords**: the notes on the strong beats, above all beat 1 of each chord, should be **chord tones** (1, 3, 5, 7 of the current chord), and the other scale notes connect them as passing tones. Even a plain stepwise line then outlines the harmony and sounds "right".',
      'The fretboard shows the scale for the current chord with **intervals counted from the chord root**, so the same fret is a 3 over one chord and a 5 over the next. **Large dots** are chord tones, **small dots** passing notes. The line stays inside one scale position (pick it in the Positions bar); only the notes that are "home" change with each chord. That is the key idea: one scale, but different target notes per chord.',
      'Work in this order: **guide tones** (3rds and 7ths, slowly) to hear how chords connect, then **chord-tone targets** and **arpeggio → scale** to fill the bar, then **enclosures** for jazz/bebop tension, and **motifs** for phrasing. Finally improvise your own lines with the same rule: chord tone on the downbeat, scale in between. Sing the line first; turn off *Play notes* and play it yourself over the backing chords.',
      'Each progression uses its key scale (major, natural minor, or the mode it is built on). When a chord brings a note from outside the key, such as the major V in a minor key or the ♭VII in major, that note replaces its neighbour for that chord only: the theory panel names the resulting scale per chord (e.g. **E Phrygian Dominant** over E in A minor).',
    ],
    'ex/sweep': [
      'A **sweep arpeggio** plays one chord tone per string in a single continuous pick stroke: down-strokes on the way up, up-strokes on the way back. Let the pick **fall through** the strings, don\'t pick each one separately. Each note must stop as the next one sounds, so lift each fretting finger (or roll it, when two strings share a fret) right after its note.',
      '**3-string sweeps** use the closed triad shapes on strings 1-2-3, in every inversion. **5-string sweeps** stack the triad over strings 1–5; the shape with the smallest fret span is chosen, so a chord tone is sometimes skipped (the classic minor shape goes root, 5th, root, ♭3, 5th).',
      'The four triad qualities differ by one fret: **major** 1-3-5, **minor** lowers the 3rd, **diminished** lowers the 3rd and 5th, **augmented** raises the 5th. Augmented is symmetric (all major thirds), so its shape repeats every four frets.',
      'The chord sequence is random, and each chord takes the sweep shape nearest to the previous one, so you practise the jumps between shapes as well. Start slowly with the metronome. Clean, separated notes matter more than speed. Press **N** or 🎲 for a new sequence, and use the Positions bar to loop one region of the neck.',
    ],
    'ex/bend': [
      'Plug the guitar into a **line-in or audio interface** (a microphone near the amp works too) and press **Start listening**. The trainer follows the pitch you play: pick the fretted note, bend until the needle sits in the green zone, and hold it there until the bar fills. A clean tone with little gain gives the most stable reading; mute the other strings so only the bent note rings.',
      'Bend with **two or three fingers** on the string (ring finger backed by middle and index), and turn the wrist as if turning a door handle instead of pushing with the finger alone. The thumb hooked over the neck gives leverage.',
      'Listen for the target first: **🔊 Bend** plays the bend, **Target** plays the pitch to reach. Then compare the trace: a good bend rises smoothly, lands without overshooting, and stays flat with no wobble. Bends usually fall **flat**, so watch the readout.',
      '**Bend & release** adds a controlled return to the fretted pitch. **Pre-bend** means bending silently *before* you pick, so the first sound is already the target, then releasing it. Your fingers must find the pitch by feel. **Bend to the next scale note** picks the bend size from the current scale: a half step from 3 to 4 in major, a whole step from 2 to 3.',
      'If your guitar is slightly out of tune, turn on **Measure from the picked note** so only the bend interval is judged.',
    ],
    'ex/drill': [
      '**Random key drills** take away the comfort of familiar keys. The random machine deals a key you have to find right away, and auto-advance keeps the pressure on, either every N bars or after each full pass.',
    ],
  };

  // Shown with the shape chart whenever a triad is selected.
  const shapes = [
    'Standard tuning is tuned in **perfect fourths** (5 frets) between neighbouring strings, **except G→B**, which is a **major third** (4 frets). A closed shape depends only on the intervals between its strings, so:',
    'Strings **4-5-6 (E A D)** and **3-4-5 (A D G)** use **identical shapes**. Move a shape across by one string set and you get the same chord a fourth higher.',
    'Strings **2-3-4 (D G B)** use the same shapes with the **B-string note one fret higher**, making up for the shorter G→B interval.',
    'Strings **1-2-3 (G B E)** move **both the B- and E-string notes up one fret**. The rule is always the same: start from the all-fourths shape and push every note above the G string up one fret.',
    'That leaves three shape families × three inversions = **nine shapes per quality**. Qualities reuse them too: starting from a major shape, lower the 3rd one fret for **minor**, lower the 3rd and 5th for **diminished**, raise the 5th for **augmented**, move the 3rd down two frets for **sus2** or up one for **sus4**.',
    '**Augmented** triads are symmetric (all major thirds), so on each string set all three inversions share one shape, which repeats every 4 frets.',
  ];

  const scales = {
    major: 'The reference scale: every other formula is written against it. Bright and resolved. Used over maj7 chords, and the parent of the diatonic modes.',
    naturalMinor: 'Relative minor of the major scale a minor 3rd above. Sad and stable. Used over vi m7 chords and in minor-key songs.',
    harmonicMinor: 'Natural minor with a raised 7th: a leading tone, and a 3-fret gap between ♭6 and 7. Used over V7 in a minor key (E7 → Am).',
    melodicMinor: 'Minor with a raised 6th and 7th, i.e. a minor triad on top of a major-scale upper half. Used over m(maj7) and m6 chords. Parent of the altered and Lydian dominant scales.',
    majorPentatonic: 'Major without the 4th and 7th: sweet, open, never clashes. Country, pop and major-key blues.',
    minorPentatonic: 'Minor without the 2nd and ♭6: the backbone of rock and blues soloing. Also works over dominant blues changes.',
    blues: 'Minor pentatonic plus the ♭5 blue note, usually a passing tone between the 4th and 5th.',
    majorBlues: 'Major pentatonic plus ♭3, usually slid or bent into the major 3rd.',
    dorian: 'Minor with a natural 6th, the brighter minor. Used over the ii chord in major; heard in funk, jazz and "Oye Como Va".',
    phrygian: 'Minor with a ♭2: dark and Spanish-tinged. Used over the iii chord and in metal riffs.',
    lydian: 'Major with a ♯4: dreamy and floating. Used over the IV chord and maj7♯11; common in film music.',
    mixolydian: 'Major with a ♭7: the dominant sound. Used over V7 chords and in blues-rock and classic-rock riffs.',
    locrian: 'Has ♭2 and ♭5: unstable and rarely used as a tonic. Used over m7♭5 (vii) chords.',
    harmonicMajor: 'Major with a ♭6: a major scale with a melancholy twist. Contains maj7 and the minor iv chord.',
    phrygianDominant: '5th mode of harmonic minor: ♭2 with a major 3rd. Used over V7 in minor keys; flamenco and Middle-Eastern flavors.',
    lydianDominant: '4th mode of melodic minor: Lydian ♯4 with Mixolydian ♭7. Used over 7♯11 chords and tritone substitutions.',
    altered: '7th mode of melodic minor: root, 3rd and ♭7 plus every altered tension. Used over V7alt before resolving.',
    hungarianMinor: 'Harmonic minor with a ♯4: two augmented 2nds, a strongly exotic sound.',
    wholeTone: 'Six notes, all whole steps. Used over augmented and 7♯5 chords; dreamy and ambiguous.',
    diminishedHW: 'Starts with a half step: used over dominant 7♭9 chords. Repeats every 3 frets.',
    diminishedWH: 'Starts with a whole step: used over diminished 7th chords. Repeats every 3 frets.',
  };

  const chords = {
    major: 'Major 3rd + minor 3rd: stable and bright. The I, IV and V chords of a major key.',
    minor: 'Minor 3rd + major 3rd. The ii, iii and vi chords of a major key.',
    dim: 'Two minor 3rds: the vii chord. Tense; it wants to resolve up a half step.',
    aug: 'Two major 3rds, so it is symmetric: any note can be the root, and the shapes repeat every 4 frets. Used as a passing chord, and as III+ in harmonic minor.',
    sus2: 'The 2nd replaces the 3rd: open, neither major nor minor. Same notes as the sus4 chord a 5th up (Csus2 = Gsus4).',
    sus4: 'The 4th replaces the 3rd: a tension that classically resolves down to the 3rd (Csus4 → C).',
    maj7: 'Major triad + major 7th: lush and stable. The I and IV chords.',
    dom7: 'Major triad + ♭7. The tritone between the 3rd and ♭7 drives resolution. The V chord, and the I chord in blues.',
    min7: 'Minor triad + ♭7: the ii, iii and vi chords, and the soft minor sound of jazz and soul.',
    m7b5: 'Diminished triad + ♭7: vii in major, and ii in minor (iiø7 – V7 – i).',
    dim7: 'Stacked minor 3rds, so it is symmetric and any note can be the root. vii°7 of harmonic minor; a common passing chord.',
    mMaj7: 'Minor triad + major 7th: tense and cinematic. Tonic chord of harmonic and melodic minor.',
    aug7: 'Dominant 7 with ♯5: an extra-tense V chord that pushes toward the next chord.',
    sus7: 'Dominant with a 4th instead of the 3rd: a suspended V, often resolving to V7.',
    six: 'Major triad + 6th: a sweet, vintage tonic. Same notes as the relative m7 (C6 = Am7).',
    m6: 'Minor triad + major 6th: jazz and bossa minor tonic. Contains the Dorian 6th.',
    add9: 'Major triad + 9th, no 7th: a bright, open pop sound.',
    madd9: 'Minor triad + 9th. The 9 sits a half step below the ♭3, giving a bittersweet rub.',
    sixNine: '6th and 9th without a 7th. All its notes come from major pentatonic (1 2 3 5 6), so it sounds open and floating.',
    dom9: 'Dominant 7 + 9: a funk and blues workhorse, often played without the root.',
    maj9: 'maj7 + 9: a soft, modern tonic sound.',
    min9: 'm7 + 9: smooth minor, common as a ii chord in neo-soul and jazz.',
    dom7b9: 'Dominant with ♭9: dark tension resolving to minor chords (V7♭9 → i). Play half-whole diminished or Phrygian dominant over it.',
    dom7s9: 'Dominant with ♯9: a major 3rd plus a ♯9 that sounds like a minor 3rd. The "Hendrix chord" of Purple Haze.',
    min11: 'm7 + 9 + 11: open and quartal-sounding. The 11 does not clash with the ♭3.',
    dom13: 'Dominant 7 + 9 + 13 (11 omitted): a rich dominant, often voiced as 1 – ♭7 – 3 – 13.',
  };

  const progs = {
    'I-IV-V-I': 'The most basic cadence in tonal music: home (I), away (IV), tension (V), home. On guitar, I → IV → V voice-leads with almost no movement.',
    'I-V-vi-IV': 'The "axis" progression behind countless pop songs. vi shares two notes with I, so the move to the relative minor is smooth.',
    'I-vi-IV-V': '50s doo-wop and early rock & roll. Each chord shares notes with the next, making it a great voice-leading exercise.',
    'vi-IV-I-V': 'The axis progression started on vi: the same chords as I–V–vi–IV, but the minor start gives a darker, anthemic feel.',
    'ii-V-I': 'The core cadence of jazz: ii prepares V, V resolves to I. With triads only, voice leading keeps it on a few frets.',
    'I-bVII-IV': 'Borrowed from Mixolydian: the ♭VII chord gives classic-rock swagger (Sweet Home Alabama, Gloria).',
    blues12: 'Twelve bars: four of I, two of IV, two of I, then V – IV – I – V as the turnaround. The form of most blues and early rock & roll.',
    'i-iv-v-i': 'All three minor chords of natural minor: dark and modal, with no leading tone.',
    'i-iv-V-i': 'Harmonic minor turns v into a major V. Its 3rd is the leading tone, which pulls strongly back to i.',
    'i-VI-III-VII': 'Natural-minor chords used in film and pop. VI, III and VII are the major chords of the relative major key.',
    'ii-V-i': 'The minor-key version of ii–V–I: a diminished ii°, a major V from harmonic minor, and the minor tonic.',
    andalusian: 'A descending bass line (i – VII – VI – V) from flamenco and Spanish guitar music, ending on a major V.',
    'I-IV-I-V': 'The three-chord backbone of folk, country and campfire songs. I alternates with IV and V, so every other bar comes home.',
    'I-iii-IV-V': 'The bass climbs 1 – 3 – 4 – 5. iii shares two notes with I, so it works as a softer passing chord on the way to IV.',
    'I-IV-vi-V': 'Another rotation of the four pop chords: the vi in third place delays the resolution and gives a lift before V.',
    'I-vi-ii-V': 'The classic jazz turnaround (rhythm changes, "I Got Rhythm"). Each chord is a fifth above the next, so the roots move by fourths back to I.',
    circle: 'Diatonic chords falling in fifths: iii → vi → ii → V → I. Each root is a fifth above the next, the strongest root motion in tonal harmony. Voice leading keeps two common tones from chord to chord.',
    canon: 'The eight-chord ground bass of Pachelbel\'s Canon, reused in countless pop songs. The bass falls stepwise while the upper voices move by the smallest steps, a model voice-leading exercise.',
    'I-II-IV-I': 'The major II chord contains the ♯4 of Lydian, giving a bright, dreamy lift (Eleanor Rigby\'s verse, many film cues). Listen to the ♯4 resolve up to 5 or down to 3.',
    'I-bVI-bVII-I': 'Borrows ♭VI and ♭VII from the parallel minor. The bass rises ♭6 – ♭7 – 1, a triumphant cadence used in rock and video-game music.',
    'I-iv-I': 'IV turns into a minor iv borrowed from the parallel minor: only the 3rd of IV drops a half step, and that note then falls to the 5th of I. A bittersweet, very common pop and Beatles cadence.',
    'i-VII-VI-VII': 'An Aeolian rock vamp (All Along the Watchtower uses i – VII – VI). No leading tone: the ♭VII returns to i by whole step.',
    'i-iv-VII-III': 'The minor key\'s circle of fifths: roots fall in fifths from i to III, the relative major. Often continues VI – ii° – V – i.',
    'i-VI-iv-V': 'A dramatic minor progression: VI and iv darken the sound, then the major V from harmonic minor pulls back to i.',
    'i-III-VII-VI': 'Climbs to the relative major (III), then falls VII – VI. Common in power ballads and metal.',
    'i-IV': 'The Dorian vamp: a minor i with a major IV. The major 3rd of IV is the raised 6th of Dorian (Oye Como Va, So What-style grooves).',
    'i-bII': 'The Phrygian vamp: the ♭II major chord a half step above the tonic gives the Spanish/flamenco and metal sound. Listen for the ♭2 falling to the root.',
    blues12m: 'Minor blues form: i for four bars, iv – iv – i – i, then the turnaround ♭VI – V – i – V (as in The Thrill Is Gone). The ♭VI to V half step leads strongly home.',
  };

  return { nodes, shapes, scales, chords, progs };
})();
