'use strict';

let canvas = document.getElementById('canvas');
let context = canvas.getContext('2d');
let toneCount = 128;
let width = 0;
let height = 0;
let audioContext = new AudioContext();
let toneGains = createToneGains();


function main() {
  resize();
  toneGains[67].gain.setValueAtTime(0.5, 0);
  toneGains[67].gain.setValueAtTime(0, 1);
}

function range(n) {
  let result = [];
  for (let i = 0; i < n; ++i) {
    result.push(i);
  }
  return result;
}

function createToneGains() {
  return range(toneCount).map(tone => {
    let oscillator = audioContext.createOscillator();
    oscillator.frequency.setValueAtTime(toneToFrequency(tone), 0);
    let gain = audioContext.createGain();
    gain.gain.setValueAtTime(0, 0);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(0);
    return gain;
  });
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
