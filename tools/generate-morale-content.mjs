import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { validatePack } from '../js/entertainment.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const packPath = resolve(repoRoot, 'js', 'data', 'entertainment-pack.json');

const TARGET = 1000;
const VERSION = '2026-09-19-1.2';
const SOURCE = 'Original gROW Ocean generated entertainment (combinatorial word-bank), 2026-09-19 — wholesome; no third-party text reproduced.';

const prefixByCategory = {
  jokes: 'gen-joke-',
  wyr: 'gen-wyr-',
  conversation: 'gen-conv-',
  challenges: 'gen-chal-'
};

const categoriesToTopUp = Object.keys(prefixByCategory);

function normalisePrompt(category, prompt) {
  return `${category}:${prompt.toLowerCase().replace(/\s+/g, ' ').trim()}`;
}

function pick(list, n) {
  return list[n % list.length];
}

function tuple(n, lists) {
  const picked = [];
  let cursor = n;
  for (const list of lists) {
    picked.push(pick(list, cursor));
    cursor = Math.floor(cursor / list.length);
  }
  return picked;
}

function item(id, category, prompt, extra = {}) {
  return { id, category, prompt, source: SOURCE, ...extra };
}

const seaCharacters = [
  'oar', 'teaspoon', 'sea snail', 'moonlit buoy', 'wetsock', 'compass', 'packet of biscuits', 'storm cloud',
  'lifejacket', 'water bottle', 'rowing seat', 'sleepy gull', 'friendly crab', 'thermos', 'porridge pot', 'lucky hat',
  'deck brush', 'solar panel', 'tiny starfish', 'weather window', 'dry bag', 'snack locker', 'wave', 'anchor',
  'navigation light', 'rain jacket', 'flask', 'cabin door', 'tidy rope', 'galley spoon'
];
const everydayCharacters = [
  'toast rack', 'wellie boot', 'library card', 'pencil', 'sofa cushion', 'kettle', 'teacup', 'garden gnome',
  'marmalade jar', 'umbrella', 'shopping list', 'postbox', 'cardigan', 'lamp shade', 'bicycle bell', 'picnic blanket',
  'button', 'washing line', 'jam spoon', 'doormat', 'pepper mill', 'sock drawer', 'radio', 'notebook', 'biscuit tin',
  'bookmark', 'watering can', 'train ticket', 'lunchbox', 'woolly scarf'
];
const moods = [
  'cheerful', 'dramatic', 'bashful', 'ambitious', 'tidy', 'sleepy', 'sparkly', 'cautious', 'optimistic', 'windswept',
  'peckish', 'polite', 'brave', 'chatty', 'glowing', 'fizzy', 'patient', 'snug', 'determined', 'sunny', 'gentle',
  'curious', 'buoyant', 'dapper', 'salty', 'jolly', 'moonlit', 'merry', 'bouncy', 'plucky'
];
const places = [
  'galley', 'cockpit', 'cabin', 'finish line', 'tea shop', 'village fete', 'harbour', 'book club', 'moonbeam',
  'snack locker', 'weather briefing', 'pillow fort', 'garden path', 'rowing lane', 'cloud parade', 'compost heap',
  'breakfast table', 'rain shower', 'starboard side', 'postcard rack', 'sunrise', 'launderette', 'bakery queue',
  'little library', 'blanket pile', 'beach hut', 'map drawer', 'daydream', 'night watch', 'pantry'
];
const tinyProblems = [
  'kept drifting into compliments', 'could only count in biscuits', 'insisted every wave was waving back',
  'packed optimism in the wrong dry bag', 'mistook the moon for a reading lamp', 'kept doing victory laps round the mug',
  'wanted a standing ovation from the tea towels', 'was too buoyant for a sit-down meeting', 'kept naming the clouds after puddings',
  'filed the tide under “things that come back”', 'could not find its indoor voice in the wind', 'wanted to alphabetise the horizon',
  'forgot whether port was a side or a pudding', 'kept offering morale support to the toaster', 'brought a spreadsheet to a splash fight',
  'was convinced the compass needed cheering up', 'tried to put a bookmark in the sunset', 'said every plan needed a biscuit annex',
  'kept saluting passing flying fish', 'thought a squall was a very enthusiastic shower', 'wanted to polish the stars',
  'kept calling the oars “long-handled optimism”', 'was saving its best sparkle for St Lucia', 'wanted a duvet day for the anchor',
  'kept measuring distance in cups of tea', 'insisted the snack bag had leadership potential', 'tried to high-five the horizon',
  'said the rota needed more confetti', 'wanted to put the wind on speakerphone', 'was knitting a scarf for the mast'
];
const punchReasons = [
  'it wanted to make a splash without causing a scene', 'it heard morale rises faster when it is well stirred',
  'it was practising for a current affair', 'it believed every good crossing deserves a little extra buoyancy',
  'it wanted to prove it could pull its own wake', 'it had a stern word with itself and felt much better',
  'it was looking for a port in every storm', 'it wanted to row-mance the horizon', 'it had a tide schedule and a can-do attitude',
  'it was determined to keep things oar-ganised', 'it wanted to turn a rough patch into a laugh patch',
  'it was shore there would be snacks', 'it liked its plans with a little latitude', 'it wanted to be knotty but nice',
  'it thought the best route was via giggle bay', 'it needed a wave of encouragement', 'it was trying to stay current',
  'it preferred its drama with a side of custard', 'it knew every long day needs a short chuckle', 'it had heard St Lucia appreciates punctual punchlines'
];
const names = [
  'Rowena', 'Shelly', 'Biscuit', 'Starry', 'Oarly', 'Tidey', 'Mabel', 'Sunny', 'Pebble', 'Skippy', 'Flo', 'Nora',
  'Dottie', 'Coco', 'Poppy', 'Misty', 'Ripple', 'Mango', 'Pickle', 'Winnie', 'Luna', 'Nettle', 'Sprout', 'Pearl',
  'Crumbs', 'Tilly', 'Beryl', 'Dot', 'Fizz', 'Marina'
];
const riddleSubjects = [
  ['a compass', 'point north, make circles, and settle arguments, but I never take a step'],
  ['a wave', 'lift spirits, carry moonlight, and arrive in sets, but I never join a gym'],
  ['an oar', 'pull water, tap rhythm, and help dreams move west, but I never ask for applause'],
  ['a kettle', 'sing softly, warm hands, and improve most plans, but I never write the shopping list'],
  ['a star', 'guide night watch, sparkle quietly, and make the sky feel friendly, but I never need batteries'],
  ['a biscuit tin', 'raise morale, hide crumbs, and cause negotiations, but I never row a stroke'],
  ['a dry sock', 'feel luxurious, boost morale, and start tiny celebrations, but I never make a speech'],
  ['a postcard', 'carry a place, hold a memory, and fit in a pocket, but I never need a passport'],
  ['a tea towel', 'dry mugs, wave in triumph, and moonlight as a flag, but I never demand a uniform'],
  ['a sunrise', 'change the colour of everything, restart hope, and arrive without knocking, but I never oversleep'],
  ['a snack bag', 'rustle with promise, settle debates, and vanish mysteriously, but I never admits to crumbs'],
  ['a moonbeam', 'silver the water, visit quietly, and flatter every ripple, but I never gets wet']
];
const knockWords = [
  ['Oar', 'Oar you ready for another brilliant day?'], ['Buoy', 'Buoy, am I glad to see your smile!'],
  ['Tide', 'Tide and tested: you are doing amazingly.'], ['Knot', 'Knot bad for two legends in a rowing boat.'],
  ['Star', 'Star quality, even on night watch.'], ['Tea', 'Tea-rific effort, keep brewing courage.'],
  ['Moor', 'Moor cheering, less worrying.'], ['Shell', 'Shell we celebrate with imaginary cake?'],
  ['Row', 'Row nice of you to answer.'], ['Wave', 'Wave hello to another mile done.'],
  ['Snack', 'Snack to the plan: tiny bites, big progress.'], ['Port', 'Port of call: somewhere sunny and proud.'],
  ['Sunny', 'Sunny days are stored in your grin.'], ['Crumb', 'Crumb on, that was a good one.'],
  ['Splash', 'Splash decision: laugh first, row second.'], ['Moon', 'Moon the merrier on night watch.'],
  ['Cosy', 'Cosy does it, one stroke at a time.'], ['Gull', 'Gull power ahead.'], ['Mango', 'Mango and get it!'],
  ['Paddle', 'Paddle do nicely, even if you are rowing.']
];
const compliments = [
  'a portable sunshine committee', 'a two-person courage factory', 'the Atlantic’s politest power duo',
  'a floating festival of grit', 'a snack-powered navigation miracle', 'the rowing equivalent of a warm cuppa',
  'a pair of wave-whispering wonders', 'a westbound sparkle convoy', 'a tiny boat with enormous backbone',
  'a morale lighthouse with oars', 'a duet of determination', 'the sea’s favourite double act',
  'a biscuit-fuelled bravery engine', 'a floating masterclass in keep-going', 'a horizon-chasing grin machine',
  'a kindness-powered crossing crew', 'a pair of champions with waterproof humour', 'a boatload of brilliant',
  'the current leaders in current leadership', 'a two-woman tide of tenacity'
];

const wyrOptions = [
  'have magically dry socks for every night watch', 'receive one perfectly hot mug of tea at sunrise',
  'hear a new encouraging voice note from home each day', 'find an extra favourite snack exactly when morale dips',
  'have a pillow that always feels freshly fluffed', 'swap one headwind for a gentle following breeze',
  'get ten minutes of invisible laundry service', 'have every wave sparkle like fairy lights for an hour',
  'know the exact name of every cloud you pass', 'wake up to the smell of fresh toast once a week',
  'have a tiny imaginary marching band for hard shifts', 'get a daily joke delivered by a passing dolphin',
  'be able to pause one rain shower until after your shift', 'have a compass that gives compliments as well as bearings',
  'turn one freeze-dried meal into Sunday roast flavour', 'have the moonlight brighten whenever you need a boost',
  'receive a surprise playlist made only of songs you both love', 'make every blister heal twice as fast overnight',
  'turn one awkward boat job per day into a five-second task', 'have a snack bag that politely suggests the perfect treat',
  'get a perfect hair day despite salt spray', 'have every shooting star appear during your watch',
  'enjoy one dream per night set in a cosy cottage', 'make all waterproof kit fold itself neatly',
  'have a seagull courier bring imaginary chips', 'always remember the word on the tip of your tongue',
  'have a weather forecast read by your funniest friend', 'turn one tough hour into a fast-forward montage',
  'have your oars hum quietly in harmony', 'find a tiny note of encouragement in each dry bag',
  'make every sunset include your favourite colour', 'have sea spray smell faintly of clean laundry for a day',
  'get five extra minutes of perfect sleep without losing time', 'have a magic mug that never spills',
  'hear St Lucia cheering from one mile farther away each day', 'have every knot untie itself when asked nicely',
  'summon one imaginary pudding after dinner', 'have a star point out the next milestone',
  'make one chore become a mini game', 'have your favourite jumper appear for one cosy hour'
];
const wyrFrames = [
  ['for the next 24 hours', 'for every Sunday of the crossing'], ['only on night watch', 'only during sunrise shifts'],
  ['whenever it rains', 'whenever the sea is glassy'], ['once a week', 'once at the exact halfway point'],
  ['but you must sing for it', 'but you must describe it like a sports commentator'], ['and keep it secret until bedtime', 'and announce it with a tiny fanfare'],
  ['while rowing', 'while resting'], ['for morale', 'for comfort'], ['chosen by you', 'chosen by your rowing partner'],
  ['with a silly catchphrase', 'with a ceremonial nod']
];
const conversationTemplates = [
  'Take turns naming three tiny comforts from home you will appreciate more after this crossing, and explain why each one matters.',
  'What is a small kindness someone once showed you that still feels bigger than they probably realised?',
  'Describe your dream first lazy morning on land after St Lucia, from waking up to lunch.',
  'Take turns choosing a theme tune for today. What would play during the heroic bit, the funny bit, and the closing credits?',
  'What is one thing your rowing partner did recently that made the boat feel better?',
  'If tonight’s sky could send you a postcard, what would it say?',
  'Describe a meal you miss in loving detail, then invent the boat-friendly version with what you actually have.',
  'Take turns telling the story of an ordinary object on board as if it is secretly very proud of itself.',
  'What is a compliment you find easy to give but sometimes hard to receive?',
  'Name a place in Britain that feels like comfort to you, and describe the sounds, smells, and weather there.',
  'If this crossing was a chapter title in your life story, what would today’s chapter be called?',
  'Take turns describing a perfect cup of tea or coffee as if judging it at the Olympics.',
  'What have you learned about patience that land life did not teach quite so clearly?',
  'Invent a tiny award for your rowing partner based on something they did in the last 48 hours.',
  'What is one future problem that Atlantic-you will be better at handling than pre-Atlantic-you?',
  'Describe the colour of today without naming a colour directly.',
  'If the boat had a personality, what would she be proud of today and what would she complain about?',
  'Take turns naming a person who would laugh at this exact situation, then say what they would notice first.',
  'What is a promise you want to make to your post-crossing self?',
  'Describe your ideal celebration playlist in five song moods rather than song titles.',
  'What is a thing you used to rush that you might savour more after forty-four days at sea?',
  'Take turns creating a menu for an imaginary Atlantic café. Include starter, main, pudding, and house speciality.',
  'What is one quality you have seen in your rowing partner that deserves more credit?',
  'If you could bottle one feeling from this adventure to open years from now, which feeling would it be?',
  'Describe a childhood memory involving water, weather, food, or a journey.',
  'Take turns finishing this sentence: “When this gets hard, I want to remember…”',
  'What would your funniest friend say if they could see the boat right now?',
  'Invent a headline for tomorrow’s good-news-only newspaper about your progress.',
  'What is something you are looking forward to telling people that will be hard to explain properly?',
  'Describe the most luxurious version of a dry sock, a clean towel, or a proper pillow.',
  'Take turns choosing a mascot for the day from something you can see or imagine.',
  'What has surprised you about sharing such a small space?',
  'If the ocean could give useful but slightly dramatic advice, what would it tell you today?',
  'Name three smells of land you miss, then three sea smells you might oddly miss later.',
  'Take turns building a “gratitude sandwich”: one good thing from yesterday, one from now, one from tomorrow.',
  'What is a brave thing that does not look dramatic from the outside?',
  'Describe your rowing partner as a weather forecast: outlook, strengths, and chance of snacks.',
  'If you had to teach a class called “How to Keep Going”, what would lesson one be?',
  'What ordinary chore on land will feel strangely wonderful after this?',
  'Take turns giving today a score out of ten for comedy, scenery, teamwork, and snacks.'
];
const conversationThemes = [
  'sunrise', 'night watch', 'favourite snacks', 'home comforts', 'unexpected bravery', 'teamwork', 'British weather',
  'music', 'family', 'friendship', 'St Lucia', 'La Gomera', 'childhood', 'cosy evenings', 'future adventures', 'quiet pride',
  'sea life', 'stars', 'silly traditions', 'rest', 'resilience', 'laughter', 'food memories', 'small victories', 'kindness',
  'courage', 'rituals', 'celebrations', 'fresh sheets', 'storytelling', 'confidence', 'gratitude', 'daydreams', 'learning',
  'comfort films', 'best cups of tea', 'gardens', 'beaches', 'rainy Sundays', 'finish lines'
];
const conversationAngles = [
  'as a memory', 'as a postcard', 'as advice to a younger you', 'as a message to your future self', 'as a tiny speech',
  'as a recipe', 'as a weather report', 'as a film trailer', 'as a top-three list', 'as a thank-you note', 'as a pep talk',
  'as a secret boat tradition', 'as a radio phone-in', 'as a bedtime story', 'as a headline', 'as a souvenir label',
  'as a map legend', 'as a team award', 'as a menu description', 'as a lighthouse signal'
];
const challengeNouns = [
  'sea creatures', 'things in a kitchen', 'British place names', 'comfort foods', 'songs for rowing', 'things that are blue',
  'objects smaller than a mug', 'things you can hear at night', 'ways to say well done', 'imaginary boat pets', 'pudding flavours',
  'things with stripes', 'weather words', 'film titles improved by adding “at sea”', 'snack names', 'cosy objects',
  'things that float', 'things that sparkle', 'reasons to be proud', 'tiny luxuries', 'items in a picnic', 'words that rhyme with row',
  'compliments for a wave', 'names for a friendly cloud', 'things found in a garden', 'things you miss about land',
  'silly boat laws', 'uses for an imaginary spoon', 'things that smell wonderful', 'sounds of home'
];
const tabooWords = [
  'water', 'boat', 'row', 'sea', 'oar', 'wave', 'snack', 'home', 'sleep', 'wind', 'star', 'tea', 'sun', 'rain', 'island',
  'music', 'pillow', 'biscuit', 'sock', 'cloud', 'rope', 'moon', 'laugh', 'friend', 'kettle', 'toast', 'harbour', 'fish', 'map', 'hug'
];
const adjectives = [
  'sparkly', 'stubborn', 'cosy', 'heroic', 'tiny', 'magnificent', 'soggy', 'cheerful', 'moonlit', 'salty', 'glorious',
  'wonky', 'brave', 'snuggly', 'dramatic', 'gentle', 'zesty', 'tidy', 'curious', 'radiant', 'plucky', 'fancy', 'merry',
  'bouncy', 'patient', 'golden', 'daring', 'fluffy', 'jolly', 'hopeful'
];
const challengeSettings = [
  'during a night watch', 'at the halfway point', 'in a pretend seaside café', 'while waiting for the kettle',
  'on a very dramatic weather report', 'as if broadcasting to Britain', 'for a tiny awards ceremony', 'inside an imaginary postcard',
  'as a St Lucia arrival rehearsal', 'for a calm sunrise', 'for a rainy afternoon', 'as a heroic film scene', 'in a village fete',
  'from the point of view of the boat', 'as advice from a wise crab', 'in the style of a sports commentator',
  'as a menu special', 'for a secret crew handbook', 'as a bedtime story for a buoy', 'as a cheerful radio jingle'
];

function makeJoke(id, seq) {
  const family = seq % 6;
  const n = Math.floor(seq / 6);
  if (family === 0) {
    const [a, b, place] = tuple(n, [moods, seaCharacters, places]);
    return item(id, 'jokes', `Why did the ${a} ${b} visit the ${place}?`, { answer: `Because ${pick(punchReasons, n)}.` });
  }
  if (family === 1) {
    const [a, b, problem] = tuple(n, [moods, everydayCharacters, tinyProblems]);
    return item(id, 'jokes', `What do you call a ${a} ${b} that ${problem}?`, { answer: `${pick(compliments, n)} with excellent timing.` });
  }
  if (family === 2) {
    const [subject, clue] = pick(riddleSubjects, n);
    const extra = pick(['I am useful on calm days and hilarious in a wobble.', 'I improve when shared with a grin.', 'I am small enough for the boat but big enough for morale.', 'I work best when everyone believes in me.'], Math.floor(n / riddleSubjects.length));
    return item(id, 'jokes', `Riddle: I can ${clue}. ${extra} What am I?`, { answer: subject });
  }
  if (family === 3) {
    const [word, answer] = pick(knockWords, n);
    const place = pick(places, Math.floor(n / knockWords.length));
    return item(id, 'jokes', `Knock knock.\nWho’s there?\n${word}.\n${word} who?`, { answer: `${answer} (Best delivered from the ${place}.)` });
  }
  if (family === 4) {
    const [a, b, c] = tuple(n, [seaCharacters, moods, places]);
    return item(id, 'jokes', `The ${a} started a ${b} club in the ${c}; membership is open, but you have to bring your own enthusiasm.`);
  }
  const [a, b, c] = tuple(n, [everydayCharacters, seaCharacters, moods]);
  return item(id, 'jokes', `I asked the ${a} for rowing advice. It pointed at the ${b} and said, “Stay ${c}, and try not to make it weird.”`);
}

function makeWyr(id, seq) {
  const n = seq - 1;
  const family = n % 8;
  const pairSeq = Math.floor(n / 8);
  const optionCount = wyrOptions.length;
  const aIndex = pairSeq % optionCount;
  const bIndex = (aIndex + 1 + (Math.floor(pairSeq / optionCount) % (optionCount - 1))) % optionCount;
  const a = wyrOptions[aIndex];
  const b = wyrOptions[bIndex];
  const [frameA, frameB] = pick(wyrFrames, Math.floor(pairSeq / (optionCount * (optionCount - 1))));
  if (family === 0) return item(id, 'wyr', `Would you rather ${a} ${frameA}, or ${b} ${frameB}?`);
  if (family === 1) return item(id, 'wyr', `Would you rather ${a}, knowing your rowing partner gets to ${b}, or swap those powers tomorrow?`);
  if (family === 2) return item(id, 'wyr', `Would you rather ${a} but only after a perfect compliment, or ${b} but only after a terrible pun?`);
  if (family === 3) return item(id, 'wyr', `Would you rather ${a} for every calm spell, or ${b} for every bumpy one?`);
  if (family === 4) return item(id, 'wyr', `Would you rather ${a} and describe it in a posh accent, or ${b} and announce it like shipping news?`);
  if (family === 5) return item(id, 'wyr', `Would you rather ${a} once when you most need it, or ${b} in tiny amounts all day?`);
  if (family === 6) return item(id, 'wyr', `Would you rather ${a} on the approach to St Lucia, or ${b} while remembering La Gomera?`);
  return item(id, 'wyr', `Would you rather ${a} with no one allowed to mention it, or ${b} with a full ceremonial countdown?`);
}

function makeConversation(id, seq) {
  const n = seq - 1;
  const family = n % 5;
  if (family === 0) return item(id, 'conversation', pick(conversationTemplates, Math.floor(n / 5)));
  const promptSeq = Math.floor(n / 5);
  const theme = pick(conversationThemes, promptSeq);
  const angle = pick(conversationAngles, Math.floor(promptSeq / conversationThemes.length));
  if (family === 1) return item(id, 'conversation', `Take turns talking about ${theme} ${angle}. What detail would make the other person smile?`, { topic: theme });
  if (family === 2) return item(id, 'conversation', `What has this crossing taught you about ${theme}? Each answer gets one serious thought and one silly example.`, { topic: theme });
  if (family === 3) return item(id, 'conversation', `Describe your ideal future moment involving ${theme}. Where are you, who is there, and what tiny detail proves it is perfect?`, { topic: theme });
  return item(id, 'conversation', `Take turns making a three-part list about ${theme}: something you miss, something you have learned, and something you want to remember.`, { topic: theme });
}

function makeChallenge(id, seq) {
  const n = seq - 1;
  const family = n % 8;
  const promptSeq = Math.floor(n / 8);
  const noun = pick(challengeNouns, promptSeq);
  const taboo = pick(tabooWords, Math.floor(promptSeq / challengeNouns.length) + family);
  const adjective = pick(adjectives, promptSeq + family);
  const setting = pick(challengeSettings, Math.floor(promptSeq / challengeNouns.length));
  if (family === 0) return item(id, 'challenges', `Take turns naming ${noun} ${setting} until someone repeats or pauses for more than five seconds.`, { instructions: 'Keep it friendly: if it gets too hard, declare a shared win and restart with a new category.' });
  if (family === 1) return item(id, 'challenges', `Describe ${noun} in a ${adjective} way without saying “${taboo}”. Your partner guesses what you mean. Swap after three guesses.`);
  if (family === 2) return item(id, 'challenges', `Invent a ${adjective} two-line chant about ${noun}. Take turns improving it until it becomes gloriously ridiculous.`);
  if (family === 3) return item(id, 'challenges', `Compose a limerick about ${noun} ${setting}. Alternate lines if you can.`);
  if (family === 4) return item(id, 'challenges', `Create an imaginary award for ${noun}. Give it a title, a winner, and an over-the-top acceptance speech.`);
  if (family === 5) return item(id, 'challenges', `Play “fortunately, unfortunately” with ${noun}: alternate sentences, always keeping the story kind and upbeat.`);
  if (family === 6) return item(id, 'challenges', `Build an alphabet chain about ${noun}. First answer starts with A, next with B, and so on for as long as you fancy.`);
  return item(id, 'challenges', `Give a dramatic one-minute commentary on ${noun} ${setting}, as if it is the final of a very niche championship.`);
}

const makers = {
  jokes: makeJoke,
  wyr: makeWyr,
  conversation: makeConversation,
  challenges: makeChallenge
};

function countByCategory(items) {
  return items.reduce((counts, entry) => {
    counts[entry.category] = (counts[entry.category] || 0) + 1;
    return counts;
  }, {});
}

const pack = JSON.parse(readFileSync(packPath, 'utf8'));
validatePack(pack);

const existingIds = new Set(pack.items.map(entry => entry.id));
const promptKeys = new Set(pack.items.map(entry => normalisePrompt(entry.category, entry.prompt)));
const beforeCounts = countByCategory(pack.items);
const additions = [];

for (const category of categoriesToTopUp) {
  const needed = Math.max(0, TARGET - (beforeCounts[category] || 0));
  let added = 0;
  let seq = 1;
  while (added < needed) {
    if (seq > 200000) throw new Error(`Unable to generate enough unique ${category} prompts`);
    const id = `${prefixByCategory[category]}${String(seq).padStart(4, '0')}`;
    seq += 1;
    if (existingIds.has(id)) continue;
    const candidate = makers[category](id, seq - 1);
    const promptKey = normalisePrompt(candidate.category, candidate.prompt);
    if (promptKeys.has(promptKey)) continue;
    existingIds.add(candidate.id);
    promptKeys.add(promptKey);
    additions.push(candidate);
    added += 1;
  }
}

pack.version = VERSION;
pack.items.push(...additions);
validatePack(pack);

const afterCounts = countByCategory(pack.items);
for (const category of categoriesToTopUp) {
  if (afterCounts[category] !== TARGET) {
    throw new Error(`${category} count is ${afterCounts[category]}, expected ${TARGET}`);
  }
}
if (afterCounts.trivia !== beforeCounts.trivia || afterCounts.games !== beforeCounts.games) {
  throw new Error('Trivia or games counts changed unexpectedly');
}

writeFileSync(packPath, `${JSON.stringify(pack, null, 2)}\n`);
console.log(JSON.stringify({ version: pack.version, added: additions.length, total: pack.items.length, counts: afterCounts }, null, 2));
