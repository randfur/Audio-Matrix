'use strict';

let canvas = null;
let context = null;
let width = window.innerWidth;
let height = window.innerHeight;

const toneCount = 128;
const toneHeight = 14;
const toneWidth = 100;
let toneScroll = Math.round(60 - (height / 2 / toneHeight));
const toneSmoothingOn = 0.01;
const toneSmoothingOff = 0.04;

let beatsPerMinute = 120;
let beatsPerBar = 4;
const beatWidth = 50;
let beatScroll = 0;

const audioContext = new AudioContext();

const masterGainNode = (() => {
  let gain = audioContext.createGain();
  gain.gain.setValueAtTime(1, 0);
  gain.connect(audioContext.destination);
  return gain;
})();

const tones = range(toneCount).map(index => {
  let oscillator = audioContext.createOscillator();
  let frequency = indexToFrequency(index);
  oscillator.frequency.setValueAtTime(frequency, 0);
  oscillator.start(0);
  let gainNode = audioContext.createGain();
  gainNode.gain.setValueAtTime(0, 0);
  oscillator.connect(gainNode);
  gainNode.connect(masterGainNode);
  return {
    index,
    key: index % 12,
    frequency,
    gainKnob: gainNode.gain,
    timeline: [],
  };
});

let isMouseDown = false;
let mouseToneIndex = null;


function loadEvent() {
  canvas = document.getElementById('canvas');
  context = canvas.getContext('2d');
  resizeEvent();
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

function resizeEvent() {
  width = window.innerWidth;
  height = window.innerHeight;
  toneScroll = Math.max(0, Math.min(toneCount - (height / toneHeight), toneScroll));
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

function drawLine(x1, y1, x2, y2) {
  context.beginPath();
  context.moveTo(x1, y1);
  context.lineTo(x2, y2);
  context.stroke();
}

function draw() {
  context.lineWidth = 2;
  let yForIndex = index => height - ((index - toneScroll + 1) * toneHeight);

  // Beat background
  for (let {index, key} of tones) {
    let y = yForIndex(index);
    context.fillStyle = isBlackKey(key) ? '#ddd' : '#eee';
    context.fillRect(0, y, width, toneHeight);
  }

  // Tone separating lines
  for (let {index, key} of tones) {
    if (key != 11 && key != 4) {
      continue;
    }
    let y = yForIndex(index);
    context.strokeStyle = '#999';
    context.setLineDash(key == 11 ? [] : [8, 7]);
    drawLine(-beatScroll * beatWidth, y, width, y);
  }
  context.setLineDash([]);

  // Beat separating lines
  const visualBeatCount = Math.floor((width - toneWidth)/ beatWidth);
  for (let i of range(visualBeatCount)) {
    let x = toneWidth + i * beatWidth;
    let isBar = (i + beatScroll) % 4 == 0;
    context.strokeStyle = isBar ? '#444' : '#bbb';
    drawLine(x, 0, x, height);
  }

  // Keyboard
  for (let {index, key} of tones) {
    let y = yForIndex(index);

    context.strokeStyle = 'black';
    context.strokeRect(0, y, toneWidth, toneHeight);
    context.fillStyle = isBlackKey(key) ? 'black' : 'white';
    context.fillRect(0, y, toneWidth, toneHeight);
  }
}

function scrollEvent(event) {
  let {clientX:mouseX, deltaY} = event;
  deltaY /= Math.abs(deltaY);
  if (mouseX <= toneWidth) {
    toneScroll = Math.max(0, Math.min(toneCount - (height / toneHeight), toneScroll - 3 * deltaY));
  } else {
    beatScroll = Math.max(0, beatScroll + deltaY);
  }
  draw();
  mouseEvent(event);
}

function mouseDownEvent(event) {
  isMouseDown = true;
  mouseEvent(event);
}

function mouseMoveEvent(event) {
  mouseEvent(event);
}

function mouseUpEvent(event) {
  isMouseDown = false;
  mouseEvent(event);
}

function mouseEvent({clientX:mouseX, clientY:mouseY}) {
  let hoverToneIndex = Math.min(toneCount - 1, Math.floor(((height - mouseY) / toneHeight) + toneScroll));
  if (mouseToneIndex != null && (!isMouseDown || mouseX > toneWidth || hoverToneIndex != mouseToneIndex)) {
    tones[mouseToneIndex].gainKnob.setTargetAtTime(0, 0, toneSmoothingOff);
    mouseToneIndex = null;
  }
  if (isMouseDown && mouseX <= toneWidth) {
    mouseToneIndex = hoverToneIndex;
    tones[mouseToneIndex].gainKnob.setTargetAtTime(1, 0, toneSmoothingOn);
  }
}

window.addEventListener('load', loadEvent);
window.addEventListener('resize', resizeEvent);
window.addEventListener('mousewheel', scrollEvent);
window.addEventListener('mousedown', mouseDownEvent);
window.addEventListener('mousemove', mouseMoveEvent);
window.addEventListener('mouseup', mouseUpEvent);
