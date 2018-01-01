'use strict';

let canvas = null;
let context = null;
let width = 0;
let height = 0;

let toneCount = 128;
let toneHeight = 14;
let toneWidth = 100;
let toneScroll = 0;
let toneSmoothingOn = 0.01;
let toneSmoothingOff = 0.04;

let beatsPerMinute = 120;
let beatsPerBar = 4;
let beatWidth = 50;
let beatScroll = 0;

let audioContext = new AudioContext();
let masterGain = (() => {
  let gain = audioContext.createGain();
  gain.gain.setValueAtTime(1, 0);
  gain.connect(audioContext.destination);
  return gain;
})();
let tones = range(toneCount).map(index => {
  let key = index % 12;
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
  return {
    index,
    key,
    frequency,
    gainKnob,
    timeline,
  };
});


function main() {
  canvas = document.getElementById('canvas');
  context = canvas.getContext('2d');
  resize();
}

function range(n) {
  let result = [];
  for (let i = 0; i < n; ++i) {
    result.push(i);
  }
  return result;
}

function scheduleToneGains({startingBeat, tone=null}) {
  let currentTime = audioContext.currentTime;
  let secondsPerBeat = 60 / beatsPerMinute;
  let schedulingTones = tone ? [tone] : tones;
  schedulingTones.forEach(({gainKnob, timeline}) => {
    gainKnob.cancelScheduledValues(0);
    gainKnob.setValueAtTime(0, 0);
    for (let {beat, gain} of timeline) {
      if (beat >= startingBeat) {
        let beatTime = currentTime + (beat - startingBeat) * secondsPerBeat;
        let toneSmoothing = gain > 0 ? toneSmoothingOn : toneSmoothingOff;
        gainKnob.setTargetAtTime(gain, beatTime, toneSmoothing);
      }
    }
  });
}

function resize() {
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width;
  canvas.height = height;
  draw();
}

function indexToFrequency(tone) {
  // 60: Middle C
  // 69: Concert A
  return 440 * 2 ** ((tone - 69) / 12);
}

function isBlackKey(key) {
  return [1, 3, 6, 8, 10].some(x => key == x);
}

function draw() {
  context.lineWidth = 2;
  for (let {index, key} of tones) {
    let y = height - ((index - toneScroll + 1) * toneHeight);

    context.fillStyle = isBlackKey(key) ? '#ddd' : '#eee';
    context.fillRect(0, y, width, toneHeight);

    context.strokeStyle = 'black';
    context.setLineDash([]);
    context.strokeRect(0, y, toneWidth, toneHeight);
    context.fillStyle = isBlackKey(key) ? 'black' : 'white';
    context.fillRect(0, y, toneWidth, toneHeight);

    if (key == 11 || key == 4) {
      context.setLineDash(key == 4 ? [10, 10] : []);
      context.strokeStyle = '#444';
      context.beginPath();
      context.moveTo(toneWidth, y);
      context.lineTo(width, y);
      context.stroke();
    }
  }
}

window.addEventListener('load', main);
window.addEventListener('resize', resize);
