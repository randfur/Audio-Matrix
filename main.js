'use strict';

let canvas = document.getElementById('canvas');
let context = canvas.getContext('2d');
let toneCount = 128;
let width = 0;
let hegiht = 0;

function main() {
  resize();
  // context.drawRect
}

function resize() {
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width;
  canvas.height = height;
}

function toneToFrequency(tone) {
  console.assert(tone >= 0 && tone < toneCount);
  // 60: Middle C
  // 69: Concert A
  return 440 * 2 ** ((tone - 69) / 12);
}

window.addEventListener('load', main);
window.addEventListener('resize', resize);
