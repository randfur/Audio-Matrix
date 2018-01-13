'use strict';

let canvas = null;
let context = null;
let width = window.innerWidth;
let height = window.innerHeight;

const toneCount = 128;
const toneHeight = 14;
const toneWidth = 100;
let toneScroll = Math.round(60 - (height / 2 / toneHeight));
const toneSmoothing = 0.05;
const toneGain = 0.125;

let beatsPerMinute = 160;
let beatsPerBar = 4;
const beatWidth = 50;
let beatScroll = 0;
let quantum = 1 / 1;

const audioContext = new AudioContext();

const masterGainNode = (() => {
  let gain = audioContext.createGain();
  gain.gain.setValueAtTime(1, 0);
  gain.connect(audioContext.destination);
  return gain;
})();

const tones = range(toneCount).map(index => {
  let oscillator = audioContext.createOscillator();
  let frequency = frequencyForIndex(index);
  oscillator.type = 'triangle';
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

let isPointerDown = false;
let pointerToneIndex = null;


function loadEvent() {
  canvas = document.getElementById('canvas');
  canvas.addEventListener('contextmenu', event => event.preventDefault());
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

function scheduleToneGains(startingBeat=0, tone=null) {
  let currentTime = audioContext.currentTime;
  let secondsPerBeat = 60 / beatsPerMinute;
  let schedulingTones = tone ? [tone] : tones;
  let timeForBeat = beat => currentTime + (beat - startingBeat) * secondsPerBeat;
  schedulingTones.forEach(({gainKnob, timeline}) => {
    gainKnob.cancelScheduledValues(0);
    gainKnob.setTargetAtTime(0, 0, toneSmoothing);
    for (let {beat, length} of timeline) {
      if (beat >= startingBeat) {
        let onTime = timeForBeat(beat);
        let offTime = timeForBeat(beat + length) - toneSmoothing;
        gainKnob.setTargetAtTime(toneGain, onTime, toneSmoothing);
        gainKnob.setTargetAtTime(0, offTime, toneSmoothing);
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

function yForIndex(index) {
  return height - ((index - toneScroll + 1) * toneHeight);
}

function indexForY(y) {
  return Math.min(toneCount - 1, Math.floor(((height - y) / toneHeight) + toneScroll));
}

function xForBeat(beat) {
  return toneWidth + (beat - beatScroll) * beatWidth;
}

function beatForX(x) {
  return Math.floor((x - toneWidth) / beatWidth / quantum) * quantum + beatScroll;
}

function frequencyForIndex(tone) {
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
  const visualBeatCount = Math.ceil((width - toneWidth) / beatWidth);
  for (let i of range(visualBeatCount)) {
    let x = xForBeat(beatScroll + i);
    let isBar = (i + beatScroll) % 4 == 0;
    context.strokeStyle = isBar ? '#444' : '#bbb';
    drawLine(x, 0, x, height);
  }

  // Notes
  context.fillStyle = 'black';
  context.strokeStyle = 'grey';
  for (let {index, timeline} of tones) {
    let y = yForIndex(index);
    for (let {beat, length} of timeline) {
      let x = xForBeat(beat);
      let noteWidth = xForBeat(beat + length) - x;
      context.fillRect(x, y, noteWidth, toneHeight);
      context.strokeRect(x, y, noteWidth, toneHeight);
    }
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
  let {clientX:pointerX, deltaY} = event;
  deltaY /= Math.abs(deltaY);
  if (pointerX <= toneWidth) {
    toneScroll = Math.max(0, Math.min(toneCount - (height / toneHeight), toneScroll - 3 * deltaY));
  } else {
    beatScroll = Math.max(0, beatScroll + deltaY);
  }
  draw();
  pointerEvent(event);
}

function pointerDownEvent(event) {
  isPointerDown = true;
  pointerEvent(event);
  if (event.button == 0) {
    leftClickEvent(event);
  } else if (event.button == 2) {
    rightClickEvent(event);
  }
}

function pointerMoveEvent(event) {
  pointerEvent(event);
}

function pointerUpEvent(event) {
  isPointerDown = false;
  pointerEvent(event);
}

function pointerEvent({clientX:pointerX, clientY:pointerY}) {
  let hoverIndex = indexForY(pointerY)
  if (pointerToneIndex != null && (!isPointerDown || pointerX > toneWidth || hoverIndex != pointerToneIndex)) {
    tones[pointerToneIndex].gainKnob.setTargetAtTime(0, 0, toneSmoothing);
    pointerToneIndex = null;
  }
  if (isPointerDown && pointerX <= toneWidth) {
    pointerToneIndex = hoverIndex;
    tones[pointerToneIndex].gainKnob.setTargetAtTime(toneGain, 0, toneSmoothing);
  }
}

function leftClickEvent({clientX:clickX, clientY:clickY}) {
  if (clickX <= toneWidth) {
    return;
  }
  let clickBeat = beatForX(clickX);
  let clickIndex = indexForY(clickY);
  tones[clickIndex].timeline.push({beat: clickBeat, length: quantum});
  draw();
}

function rightClickEvent({clientX:clickX, clientY:clickY}) {
  if (clickX <= toneWidth) {
    return;
  }
  let clickBeat = beatForX(clickX);
  let clickIndex = indexForY(clickY);
  let timeline = tones[clickIndex].timeline;
  for (let i = 0; i < timeline.length; ++i) {
    let {beat, length} = timeline[i];
    if (beat <= clickBeat && clickBeat < beat + length) {
      timeline.splice(i, 1);
      draw();
      break;
    }
  }
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function keyDownEvent({code}) {
  if (code == 'Space') {
    scheduleToneGains(beatScroll);
  }
}

window.addEventListener('load', loadEvent);
window.addEventListener('resize', resizeEvent);
window.addEventListener('keydown', keyDownEvent);
window.addEventListener('mousewheel', scrollEvent);
window.addEventListener('pointerdown', pointerDownEvent);
window.addEventListener('pointermove', pointerMoveEvent);
window.addEventListener('pointerup', pointerUpEvent);
