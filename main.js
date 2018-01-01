'use strict';

let canvas = document.getElementById('canvas');
let context = canvas.getContext('2d');
let width = 0;
let height = 0;
let toneCount = 128;
let beatsPerMinute = 120;
let beatsPerBar = 4;
let toneSmoothingUp = 0.008;
let toneSmoothingDown = 0.02;
let audioContext = new AudioContext();

let masterGain = (() => {
  let gain = audioContext.createGain();
  gain.gain.setValueAtTime(0.5, 0);
  gain.connect(audioContext.destination);
  return gain;
})();

let toneGains = range(toneCount).map(tone => {
  let oscillator = audioContext.createOscillator();
  oscillator.frequency.setValueAtTime(toneToFrequency(tone), 0);
  let gain = audioContext.createGain();
  gain.gain.setValueAtTime(0, 0);
  oscillator.connect(gain);
  gain.connect(masterGain);
  oscillator.start(0);
  return gain;
});

let toneTimelines = range(toneCount).map(tone => []);


function main() {
  resize();
  toneTimelines[60] = [{beat: 0, gain: 1}, {beat: 1, gain: 0}, {beat: 4, gain: 1}, {beat: 5, gain: 0}];
  toneTimelines[65] = [{beat: 1, gain: 1}, {beat: 2, gain: 0}, {beat: 5, gain: 1}, {beat: 6, gain: 0}];
  toneTimelines[67] = [{beat: 2, gain: 1}, {beat: 3, gain: 0}, {beat: 6, gain: 1}, {beat: 7, gain: 0}];
  toneTimelines[71] = [{beat: 7, gain: 1}, {beat: 8, gain: 0}];
  toneTimelines[72] = [{beat: 3, gain: 1}, {beat: 4, gain: 0}];
  scheduleToneGains({startingBeat: 0});
}

function range(n) {
  let result = [];
  for (let i = 0; i < n; ++i) {
    result.push(i);
  }
  return result;
}

function scheduleToneGains({startingBeat}) {
  let currentTime = audioContext.currentTime;
  let secondsPerBeat = 60 / beatsPerMinute;
  range(toneCount).forEach(tone => {
    let timeline = toneTimelines[tone];
    let toneGain = toneGains[tone];
    toneGain.gain.cancelScheduledValues(0);
    toneGain.gain.setValueAtTime(0, 0);
    let prevGain = 0;
    for (let {beat, gain} of timeline) {
      if (beat >= startingBeat) {
        let beatTime = currentTime + (beat - startingBeat) * secondsPerBeat;
        let toneSmoothing = gain > prevGain ? toneSmoothingUp : toneSmoothingDown;
        toneGain.gain.setTargetAtTime(gain, beatTime, toneSmoothing);
      }
    }
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
