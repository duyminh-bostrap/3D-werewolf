const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const esbuild = require('esbuild');
const WebSocket = require('ws');

// Run after build:prod with the local production server on port 3112.
const fixture = `
import {soundEngine} from './src/audio/soundEngine';
import {amplifyMicrophone} from './src/audio/voiceCapture';
const NativeAudio = window.Audio, NativeContext = window.AudioContext;
window.Audio = function(...args) {
  const audio = new NativeAudio(...args);
  // Reproduce mobile browsers which ignore HTMLMediaElement.volume.
  Object.defineProperty(audio, 'volume', {get:()=>1, set:()=>{}});
  window.musicElement = audio;
  return audio;
};
window.AudioContext = class extends NativeContext {
  constructor(options) { super(options); window.audioContext = this; }
  createGain() {
    const node = super.createGain(), connect = node.connect.bind(node);
    node.connect = (destination, ...args) => {
      if (destination === this.destination) {
        window.masterOutput = node;
        window.beforeGain = this.createAnalyser();
        window.afterGain = this.createAnalyser();
        connect(window.afterGain);
      } else if (destination === window.masterOutput) {
        connect(window.beforeGain);
      }
      return connect(destination, ...args);
    };
    return node;
  }
};
const wait = ms => new Promise(resolve=>setTimeout(resolve,ms));
const rms = analyser => {
  const samples = new Float32Array(analyser.fftSize);
  analyser.getFloatTimeDomainData(samples);
  return Math.sqrt(samples.reduce((sum,x)=>sum+x*x,0)/samples.length);
};
window.measureAudio = async () => {
  soundEngine.setCustomLoopTrack('/assets/werewolf-ambient-loop.mp3');
  await window.audioContext.resume();
  await window.musicElement.play();
  await wait(600);
  const results=[];
  for (const kind of ['music','effects']) {
    let effectTimer;
    if (kind==='effects') {
      window.musicElement.pause();
      soundEngine.playChurchBell();
      effectTimer=setInterval(()=>soundEngine.playChurchBell(),700);
    }
    try {
      for (const volume of [1,0.5,0.25,0]) {
        soundEngine.setVolume(volume);
        await wait(450);
        let before=0, after=0;
        for(let i=0;i<4;i++) {before+=rms(window.beforeGain);after+=rms(window.afterGain);await wait(70);}
        results.push({kind,volume,before:before/4,after:after/4,ratio:after/before});
      }
    } finally {clearInterval(effectTimer);}
    soundEngine.setVolume(1);
  }
  soundEngine.setMuted(true);
  const ctx = window.audioContext;
  const tone = ctx.createOscillator(), quiet = ctx.createGain(), raw = ctx.createMediaStreamDestination();
  quiet.gain.value = 0.01;
  tone.connect(quiet).connect(raw);
  const input = ctx.createAnalyser(), output = ctx.createAnalyser();
  quiet.connect(input);
  const mic = amplifyMicrophone(ctx, raw.stream, 1);
  const received = ctx.createMediaStreamSource(mic.stream);
  received.connect(output);
  tone.start();
  try {
    for (const volume of [1,1.5,2,3,0]) {
      mic.setVolume(volume);
      await wait(650);
      const before = rms(input), after = rms(output);
      results.push({kind:'outgoing mic',volume,before,after,ratio:after/before});
    }
  } finally {
    tone.stop(); tone.disconnect(); quiet.disconnect(); raw.disconnect();
    raw.stream.getTracks().forEach(track=>track.stop());
    received.disconnect(); input.disconnect(); output.disconnect(); mic.stop();
    if(mic.stream.getTracks().some(track=>track.readyState!=='ended')) throw Error('Processed mic track still live');
  }
  return results;
};`;

(async () => {
  esbuild.buildSync({stdin:{contents:fixture,resolveDir:process.cwd(),loader:'js'},bundle:true,format:'esm',outfile:'dist/audio-output-check.js'});
  fs.writeFileSync('dist/audio-output-check.html', '<html><body><script type="module" src="/audio-output-check.js"></script></body></html>');
  const edge = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', [
    '--headless=new','--no-first-run','--mute-audio','--autoplay-policy=no-user-gesture-required',
    '--remote-debugging-port=9330',`--user-data-dir=${path.join(os.tmpdir(),'bloodmoon-audio-output-test')}`,'about:blank',
  ], {windowsHide:true,stdio:'ignore'});
  let ws;
  try {
    let page;
    for(let i=0;i<80;i++) {
      try {page=await (await fetch('http://localhost:9330/json/new?about:blank',{method:'PUT'})).json();break;}
      catch {await new Promise(r=>setTimeout(r,100));}
    }
    assert.ok(page,'Edge did not start');
    ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise(r=>ws.once('open',r));
    let id=0;const pending=new Map();
    ws.on('message',raw=>{const message=JSON.parse(raw);if(message.id){pending.get(message.id)?.(message.result);pending.delete(message.id);}});
    const call=(method,params={})=>new Promise(resolve=>{pending.set(++id,resolve);ws.send(JSON.stringify({id,method,params}));});
    await call('Page.navigate',{url:'http://localhost:3112/audio-output-check.html'});
    await new Promise(r=>setTimeout(r,500));
    const result=await call('Runtime.evaluate',{expression:'window.measureAudio()',awaitPromise:true,returnByValue:true});
    assert.equal(result.exceptionDetails,undefined,JSON.stringify(result.exceptionDetails));
    const micBaseline = result.result.value.find(row => row.kind === 'outgoing mic' && row.volume === 1)?.ratio ?? 1;
    for(const row of result.result.value) {
      assert.ok(row.before>0.0001,`${row.kind}: no input signal`);
      // Browser compressors apply makeup gain; compare mic levels to the 100% baseline.
      const measured = row.ratio / (row.kind === 'outgoing mic' ? micBaseline : 1);
      assert.ok(Math.abs(measured-row.volume)<0.03,JSON.stringify(row));
      console.log(`${row.kind}: slider ${row.volume*100}% -> measured ${(measured*100).toFixed(2)}% amplitude`);
    }
    console.log('PASS: real music/effects volume and outgoing microphone amplification including zero and track cleanup.');
    await call('Browser.close');
  } finally {
    ws?.close();edge.kill();
    for(const file of ['dist/audio-output-check.js','dist/audio-output-check.html']) fs.rmSync(file,{force:true});
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
