'use strict';

let canvas = null;
let context = null;
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
  gain.gain.setValueAtTime(1, 0);
  gain.connect(audioContext.destination);
  return gain;
})();

let tones = range(toneCount).map(index => {
  let frequency = indexToFrequency(index);
  let oscillator = audioContext.createOscillator();
  oscillator.frequency.setValueAtTime(frequency, 0);
  let gain = audioContext.createGain();
  let gainKnob = gain.gain;
  gainKnob.setValueAtTime(0, 0);
  oscillator.connect(gain);
  gain.connect(masterGain);
  oscillator.start(0);
  let timeline = [];
  return {frequency, gainKnob, timeline};
});


function main() {
  canvas = document.getElementById('canvas');
  context = canvas.getContext('2d');
  resize();
  tones[60].timeline = [{beat: 0, gain: 1}, {beat: 1, gain: 0}];
  tones[64].timeline = [{beat: 1, gain: 1}, {beat: 2, gain: 0}];
  tones[67].timeline = [{beat: 2, gain: 1}, {beat: 3, gain: 0}];
  tones[70].timeline = [{beat: 3, gain: 1}, {beat: 4, gain: 0}];
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
  tones.forEach(({gainKnob, timeline}) => {
    gainKnob.cancelScheduledValues(0);
    gainKnob.setValueAtTime(0, 0);
    let prevGain = 0;
    for (let {beat, gain} of timeline) {
      if (beat >= startingBeat) {
        let beatTime = currentTime + (beat - startingBeat) * secondsPerBeat;
        let toneSmoothing = gain > prevGain ? toneSmoothingUp : toneSmoothingDown;
        gainKnob.setTargetAtTime(gain, beatTime, toneSmoothing);
        prevGain = gain;
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

function indexToFrequency(tone) {
  console.assert(tone >= 0 && tone < toneCount);
  // 60: Middle C
  // 69: Concert A
  return 440 * 2 ** ((tone - 69) / 12);
}

window.addEventListener('load', main);
window.addEventListener('resize', resize);
