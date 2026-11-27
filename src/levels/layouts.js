import {HERO_NAME} from './catalog.js';

const platform = (x, y, w, art = 'beam', h = 18, moving = 0) => ({x, y, w, art, h, moving});
const enemy = ([type, x, y]) => ({type, x, y});
const pickup = ([type, x, y]) => ({type, x, y});
const prop = (art, x, y, w, h, style) => ({art, x, y, w, h, style});
const checkpoint = (x, y, threshold = x) => ({x, y, threshold});
const ground = 446;
const roadGap = x => [0, 1, 2, 3].map(lane => [x, lane, 'crack']);

const streetGaps = [[1980, 2096], [3524, 3662]];
const fieldGaps = [[1275, 1404], [2672, 2820], [4045, 4168]];
function groundSegments(length, gaps, art) {
  const starts = [0, ...gaps.map(gap => gap[1])];
  const ends = [...gaps.map(gap => gap[0]), length];
  return starts.map((x, i) => ({x, y: ground, w: ends[i] - x, h: 132, art, ground: true}));
}

const street = {
  kind: 'ground',
  setting: 'city',
  rifts: [941, 2741, 4067],
  length: 5420,
  height: 540,
  start: {x: 145, y: ground},
  terrain: [
    ...groundSegments(5420, streetGaps, 'asphalt'),
    platform(494, 394, 160, 'car', 52),
    platform(1002, 407, 104, 'barrier', 39),
    platform(1618, 387, 181, 'car', 59),
    platform(2245, 391, 172, 'car', 55),
    platform(2470, 355, 146),
    platform(2994, 398, 122, 'barrier', 48),
    platform(3259, 359, 190),
    platform(3894, 392, 163, 'car', 54),
    platform(4282, 356, 223),
    platform(4594, 398, 124, 'barrier', 48),
  ],
  props: [
    ...[326, 875, 1445, 1931, 2305, 2754, 3192, 3480, 3820, 4192, 4723, 5220].map(x => prop('lamp', x, ground, 52, 190, 'street-lamp')),
    prop('office', 4860, ground, 463, 314, 'office'),
    prop('station', 5120, ground, 53, 75, 'terminal'),
  ],
  enemies: [
    ['imp', 808], ['imp', 1159], ['flyer', 1378, 296],
    ['imp', 1694], ['flyer', 1928, 300], ['imp', 2187],
    ['brute', 2570], ['imp', 2848], ['flyer', 3080, 275],
    ['imp', 3358, 359], ['imp', 3725], ['flyer', 3924, 302],
    ['brute', 4140], ['flyer', 4417, 265], ['imp', 4654], ['brute', 4982],
    ['imp', 1009], ['flyer', 1542, 317], ['brute', 1799], ['imp', 2335],
    ['imp', 2704], ['brute', 3078], ['flyer', 3370, 276], ['imp', 3876],
    ['imp', 4335, 356], ['imp', 4750], ['flyer', 4900, 297],
  ].map(enemy),
  pickups: [
    ['repair', 1160, ground - 20], ['repair', 1690, 365], ['repair', 2444, ground - 20],
    ['repair', 3198, ground - 18], ['repair', 3940, ground - 20], ['repair', 4520, ground - 20],
  ].map(pickup),
  checkpoints: [checkpoint(2170, ground), checkpoint(3811, ground)],
  stops: [
    {at: 1750, tip: 'Пробел · Перепрыгни разлом', touch: 'Перепрыгни разлом'},
    {at: 2750, speaker: HERO_NAME, text: 'Посмотрим, оставили ли они аварийный терминал в покое.'},
  ],
  points: [{id: 'office', x: 5132, y: ground, label: 'Открыть аварийную схему'}],
};

const bike = {
  kind: 'bike',
  setting: 'road',
  length: 19200,
  height: 540,
  start: {x: 160, y: 367},
  obstacles: [
    [980, 1, 'barrier'], [1395, 0, 'barrier'], [1815, 2, 'car'],
    [2260, 0, 'car'], [2260, 1, 'barrier'], [2720, 3, 'car'],
    ...roadGap(3330),
    [3920, 2, 'car'], [4255, 3, 'barrier'], [4700, 0, 'car'],
    [5080, 1, 'barrier'], [5415, 1, 'crack'], [5415, 2, 'crack'], [5415, 3, 'car'],
    [5980, 0, 'barrier'], [6380, 3, 'car'], [6800, 1, 'car'], [6800, 2, 'barrier'],
    [7390, 2, 'barrier'], [7770, 0, 'car'], [7770, 1, 'barrier'], ...roadGap(8390),
    [9030, 0, 'car'], [9030, 3, 'car'], [9475, 2, 'barrier'],
    [9960, 1, 'barrier'], [10480, 2, 'car'], [11050, 0, 'barrier'], [11050, 3, 'barrier'],
    [11650, 1, 'crack'], [11650, 2, 'crack'], [12170, 0, 'car'], [12550, 3, 'car'],
    [13040, 1, 'car'], [13040, 3, 'barrier'], ...roadGap(13700),
    [14320, 2, 'car'], [14810, 1, 'barrier'], [14810, 0, 'car'], [15310, 3, 'barrier'],
    [15800, 2, 'barrier'], [15800, 3, 'car'], [16470, 0, 'car'], [16880, 1, 'barrier'],
    ...roadGap(17460),
    [18090, 0, 'car'], [18090, 2, 'barrier'], [18500, 3, 'car'], [18790, 1, 'barrier'],
  ],
  pursuers: [
    [775, 1, 'imp'], [1500, 0, 'flyer'], [1960, 3, 'imp'], [2500, 2, 'imp'],
    [2900, 1, 'flyer'], [3710, 3, 'flyer'], [4390, 0, 'imp'], [4820, 1, 'imp'],
    [5200, 0, 'brute'], [5730, 2, 'flyer'], [6300, 3, 'imp'],
    [7180, 0, 'flyer'], [7530, 2, 'brute'], [7980, 1, 'imp'],
    [8780, 3, 'flyer'], [9180, 2, 'imp'], [9680, 0, 'imp'], [10160, 1, 'flyer'],
    [10610, 3, 'brute'], [11260, 1, 'flyer'], [11600, 2, 'imp'],
    [12070, 3, 'flyer'], [12780, 0, 'imp'], [13360, 2, 'brute'],
    [14110, 1, 'flyer'], [14510, 3, 'imp'], [14990, 2, 'imp'],
    [15550, 0, 'brute'], [16000, 3, 'flyer'], [16530, 2, 'imp'],
    [17100, 0, 'flyer'], [17830, 3, 'imp'], [18260, 1, 'brute'], [18800, 2, 'flyer'],
  ],
  pickups: [
    [1990, 2], [3560, 1], [4450, 2], [5860, 0], [7160, 3], [8630, 2], [10230, 3],
    [11350, 1], [12450, 0], [14010, 3], [15200, 1], [16660, 2], [17790, 2], [18750, 3],
  ].map(([x, lane]) => ({type: 'repair', x, lane})),
  checkpoints: [checkpoint(4870, 367), checkpoint(9930, 367), checkpoint(14780, 367)],
  stops: [
    {at: 150, tip: '↑ ↓ · Меняй полосу, J · Стреляй', touch: 'Меняй полосу и стреляй'},
    {at: 2610, tip: 'Разлом через всю дорогу · Прыгай', touch: 'Разлом через всю дорогу · Прыгай'},
    {at: 10960, speaker: HERO_NAME, text: 'Вижу опоры. Держим курс.'},
    {at: 18300, speaker: HERO_NAME, text: 'Дальше по тропе. Велосипед здесь оставлю.'},
  ],
};

const field = {
  kind: 'ground',
  setting: 'steppe',
  rifts: [1144, 3660, 5221],
  length: 7250,
  height: 540,
  start: {x: 155, y: ground},
  terrain: [
    ...groundSegments(7250, fieldGaps, 'soil'),
    platform(802, 394, 159, 'barrier', 52),
    platform(1494, 376, 185),
    platform(1788, 323, 190),
    platform(2184, 385, 134),
    platform(3110, 391, 122),
    platform(3340, 370, 190),
    platform(3550, 314, 191),
    platform(3740, 365, 180),
    platform(4314, 391, 170, 'barrier', 55),
    platform(4700, 355, 210),
    platform(5160, 394, 146),
    platform(5905, 369, 160),
    platform(6395, 389, 134, 'barrier', 57),
  ],
  props: [
    prop('plant', 3190, ground, 1070, 368, 'facility'),
    prop('plant', 4460, ground, 1060, 352, 'facility'),
    ...[3190, 3619, 4206, 4615, 5450, 5920].map(x => prop('lamp', x, ground, 51, 185, 'yard-lamp')),
    prop('station', 2961, ground, 75, 114, 'reserve'),
    prop('station', 5627, ground, 96, 138, 'main'),
  ],
  enemies: [
    ['imp', 650], ['imp', 936], ['flyer', 1104, 293], ['brute', 1519],
    ['imp', 1793, 323], ['flyer', 2043, 266], ['imp', 2380],
    ['flyer', 2580, 294], ['brute', 3119], ['imp', 3500],
    ['imp', 3757, 365], ['flyer', 3868, 243], ['imp', 4254],
    ['brute', 4550], ['flyer', 4730, 273], ['imp', 5089],
    ['brute', 5340], ['imp', 5800], ['imp', 1250], ['imp', 1594],
    ['brute', 2173], ['imp', 2574], ['imp', 3038], ['brute', 3560],
    ['imp', 4042], ['flyer', 4340, 300], ['imp', 4756, 355], ['brute', 5140],
  ].map(enemy),
  waves: [
    [['imp', -1], ['imp', 1], ['imp', 1], ['flyer', -1]],
    [['brute', 1], ['imp', -1], ['imp', -1], ['flyer', 1], ['imp', 1]],
    [['brute', -1], ['imp', 1], ['brute', 1], ['flyer', -1], ['imp', -1], ['flyer', 1]],
  ],
  pickups: [
    ['repair', 1138, ground - 20], ['repair', 1863, 300], ['repair', 2310, ground - 20],
    ['repair', 3498, ground - 20], ['repair', 3662, 290], ['repair', 4422, ground - 20],
    ['repair', 4810, 328], ['repair', 5520, ground - 22], ['repair', 5655, ground - 22],
  ].map(pickup),
  checkpoints: [checkpoint(1530, ground), checkpoint(4330, ground), checkpoint(5573, ground)],
  stops: [
    {at: 361, speaker: HERO_NAME, text: 'Пройду по линии. Резервный щит должен быть у въезда.'},
    {at: 2780, tip: 'Аварийные щиты включаются клавишей E', touch: 'Подойди к щиту и нажми «Действие»'},
    {at: 4590, speaker: HERO_NAME, text: 'Осталось подать питание на город.'},
  ],
  points: [
    {id: 'reserve', x: 2998, y: ground, label: 'Запустить резервный контур'},
    {id: 'main', x: 5674, y: ground, label: 'Включить главный рубильник'},
  ],
  gate: 3230,
};

const climbSteps = [
  [302, 2581, 220], [513, 2473, 232], [674, 2365, 220], [472, 2255, 242],
  [266, 2141, 239], [104, 2029, 229], [269, 1919, 205], [468, 1803, 227],
  [660, 1691, 211], [501, 1580, 228], [295, 1466, 246], [104, 1354, 232],
  [283, 1239, 227], [493, 1127, 196], [666, 1016, 236], [550, 905, 229],
  [339, 796, 230], [141, 681, 238], [301, 566, 220], [503, 454, 206],
  [689, 341, 192], [520, 229, 244], [326, 120, 315],
];
const climb = {
  kind: 'vertical',
  setting: 'construction',
  length: 960,
  height: 2818,
  start: {x: 145, y: 2695},
  terrain: [
    {x: 0, y: 2695, w: 960, h: 125, art: 'asphalt', ground: true},
    ...climbSteps.map(([x, y, w], i) => platform(x, y, w, i === 22 ? 'gpu' : i % 3 === 1 ? 'beam' : 'scaffold', i === 22 ? 91 : 52, [7, 15, 19].includes(i) ? 25 : 0)),
  ],
  enemies: [
    ['imp', 650, 2473], ['flyer', 812, 2210], ['imp', 354, 2141],
    ['imp', 183, 2029], ['flyer', 470, 1860], ['brute', 595, 1803],
    ['flyer', 832, 1525], ['imp', 417, 1466], ['imp', 206, 1354],
    ['flyer', 452, 1172], ['imp', 783, 1016], ['imp', 652, 905],
    ['flyer', 637, 734], ['imp', 220, 681], ['brute', 622, 454],
    ['flyer', 815, 278], ['imp', 672, 229], ['imp', 718, 2365], ['imp', 604, 2255],
    ['imp', 322, 1919], ['imp', 738, 1691], ['brute', 635, 1580],
    ['imp', 352, 1239], ['imp', 571, 1127], ['flyer', 444, 510],
  ].map(enemy),
  pickups: [
    ['repair', 739, 2339], ['repair', 192, 1999], ['repair', 754, 1665],
    ['repair', 209, 1326], ['repair', 801, 990], ['repair', 225, 654],
    ['repair', 811, 312],
  ].map(pickup),
  checkpoints: [checkpoint(211, 2029, 2029), checkpoint(220, 1354, 1354), checkpoint(649, 905, 905), checkpoint(788, 341, 341)],
  stops: [
    {at: 2555, tip: 'Прыгай по лесам и целься мышью', touch: 'Прыгай по лесам и стреляй вверх'},
    {at: 1750, speaker: HERO_NAME, text: 'Пригнали целый кран. Ну хоть размер оценили.'},
    {at: 720, speaker: HERO_NAME, text: 'Держится на двух тросах. Сейчас доберусь.'},
    {at: 230, tip: 'Прыгни на видеокарту'},
  ],
  exitY: 120,
};

const boss = {
  kind: 'arena',
  setting: 'rooftop',
  length: 960,
  height: 540,
  start: {x: 220, y: 388},
  terrain: [platform(72, 388, 816, 'gpu', 235)],
  props: [prop('station', 117, 388, 56, 87, 'override')],
  pickups: [['repair', 268, 355], ['repair', 754, 355]].map(pickup),
  points: [{id: 'override', x: 145, y: 388, label: 'Зафиксировать подвес'}],
  checkpoints: [],
  stops: [{at: 215, speaker: HERO_NAME, text: 'Только попробуй её уронить.'}],
};

export const LAYOUTS = [street, bike, field, climb, boss];

