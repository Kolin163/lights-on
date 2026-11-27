const columnOffsets = [
  [0, 0], [313, 0], [628, -3], [940, 0],
  [23, 316], [331, 307], [652, 317], [964, 309],
  [15, 657], [318, 616], [628, 610], [946, 643],
  [-1, 941], [312, 941], [623, 939], [939, 941],
];

const coreRows = [0, 310, 615, 935, 1254];
const coreColumns = [0, 314, 627, 941, 1254];
const coreFeet = [
  [297, 297, 297, 297], [598, 563, 599, 564],
  [915, 909, 848, 912], [1237, 1237, 1237, 1237],
];
const extraRows = [0, 359, 722, 1086];
const extraColumns = [0, 362, 724, 1086, 1448];
const specialColumns = [0, 356, 690, 1100, 1448];
const extraHips = [
  [181, 531, 904, 1210], [184, 528, 889, 1232], [181, 500, 816, 1231],
];
const extraFeet = [343, 706, 1069];
const CROWN_HEIGHT = 106.5;

const runHead = [329, 320, 330, 322];
const runMuzzle = [[253, 443], [565, 424], [881, 446], [1195, 425]];
// Each entry is an entire ImageGen pose. The crown and sole align it with the original gait.
const runUp = [
  [112, 36, 484, 588, 277, 59, 583, 455, 66],
  [642, 35, 1047, 543, 804, 59, 537, 988, 66],
  [135, 687, 484, 1226, 277, 713, 1220, 454, 716],
  [649, 684, 1043, 1187, 804, 713, 1181, 988, 714],
];

export function heroFrame(row, col) {
  const extra = row > 3;
  if (extra) {
    const r = row - 4;
    const columns = r === 2 ? specialColumns : extraColumns;
    return {
      sheet: 'hero-extra', left: columns[col], right: columns[col + 1], top: extraRows[r], bottom: extraRows[r + 1],
      anchorX: extraHips[r][col], anchorY: extraFeet[r], scale: .325,
    };
  }
  return {
    sheet: 'hero-core', left: coreColumns[col], right: coreColumns[col + 1], top: coreRows[row], bottom: coreRows[row + 1],
    anchorX: 145 + columnOffsets[row * 4 + col][0], anchorY: coreFeet[row][col], scale: .375,
  };
}

export function runningFrame(walkTime, aimUp) {
  const col = Math.floor(walkTime * 13) % 4;
  const lift = col % 2 === 0 ? 0 : 8.5;
  let frame, crown, sole, muzzle;
  if (aimUp) {
    const [left, top, right, bottom, anchorX, headY, soleY, muzzleX, muzzleY] = runUp[col];
    frame = {sheet: 'hero-run-up', left, top, right, bottom, anchorX, scale: .204};
    crown = headY;
    sole = soleY;
    muzzle = [muzzleX, muzzleY];
  } else {
    frame = heroFrame(1, col);
    crown = runHead[col];
    sole = frame.anchorY;
    muzzle = runMuzzle[col];
  }
  const scaleY = (CROWN_HEIGHT - lift) / (sole - crown);
  return {...frame, scaleY, anchorY: crown + CROWN_HEIGHT / scaleY, muzzle};
}

export function playerPose(player, time) {
  if (player.hurtTime > 0) return [4, Math.min(3, Math.floor((.42 - player.hurtTime) * 10))];
  if (player.superTime > 0) {
    const t = player.superTime;
    return [6, t > .72 ? 0 : t > .36 ? 1 : t > .17 ? 2 : 3];
  }
  if (player.tauntTime > 0) return [5, Math.min(3, Math.floor((.94 - player.tauntTime) / .235))];
  if (!player.grounded) {
    if (player.jumpAge < .07) return [2, 0];
    return [2, player.vy < -190 ? 1 : player.vy > 140 ? 3 : 2];
  }
  if (player.recoil > 0) return [3, player.recoil > .104 ? 1 : player.recoil > .055 ? 2 : 3];
  if (player.landed > 0) return [2, 3];
  if (player.moving) return [1, Math.floor(player.walkTime * 13) % 4];
  return [0, Math.floor(time * 3.1) % 4];
}

const aimGeometry = {
  'aim-up-0': [102, 24, .24],
  'aim-up-1': [95, 50, .24],
  'aim-down-0': [122, 2, .274],
  'aim-down-1': [112, 2, .274],
};

export function aimFrame(art, key) {
  const image = art[key];
  const [anchorX, crown, scale] = aimGeometry[key];
  const anchorY = image.naturalHeight - 2;
  return {
    sheet: key, left: 0, top: 0, right: image.naturalWidth, bottom: image.naturalHeight,
    anchorX, anchorY, scale, scaleY: CROWN_HEIGHT / (anchorY - crown),
  };
}
