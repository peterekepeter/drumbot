'use strict';



function main(){
    const resumeContext = () => {
        if (context.state != 'running'){
            context.resume();
        }
    }
    document.body.onclick = resumeContext;
    document.body.ontouchstart = resumeContext;
    
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const voice = new Voice(context);
    render(testView, null, render(VoiceUi, { voice }));
    window.onmousemove = globalMouseMove;
    window.onmouseup = globalMoseUp;
    window.addEventListener('touchmove', globalTouchMove);
    window.addEventListener('touchend', globalTouchEnd);
}


class Voice
{
    constructor(context){
        this.context = context;

        this.filter = context.createBiquadFilter();
        this.filter.connect(context.destination);
        this.filter.type = 'lowpass';
        this.filter.frequency.setValueAtTime(440,0);

        this._gain = context.createGain();
        this._gain.gain.setValueAtTime(0, context.currentTime);
        this._gain.connect(this.filter);

        this.noise = context.createBufferSource();
        this.noise.buffer = makeNoiseBuffer(context);
        this.noise.loop = true;
        this.noise.start();
        
        this.oscillator = context.createOscillator();
        this.filterFrequencyHz = 440;
        this.oscillator.frequency.setValueAtTime(440, context.currentTime); // value in hertz
        this.oscillator.detune.setValueAtTime(0, context.currentTime);
        this.oscillator.type = "sine"; // square sawtooth triangle custom;
        this.oscillator.connect(this._gain);
        this.oscillator.start();

        this.onOsc = true;
        
    }

    set type(value){
        const types =  ['sine', 'square', 'sawtooth', 'triangle'];
        if (value <= 3){
            this.oscillator.type = types[value];
            if (!this.onOsc){
                this.onOsc = true;
                this.noise.disconnect(this._gain);
                this.oscillator.connect(this._gain);
            }
        }
        else 
        {
            if (this.onOsc){
                this.onOsc = false;
                this.noise.connect(this._gain);
                this.oscillator.disconnect(this._gain);
            }
        }
    }

    get type(){
        return this.onOsc ? this.oscillator.type : 'noise';
    }

    set gain(value){
        this._gain.gain.linearRampToValueAtTime(value, this.context.currentTime+.1)
    }

    set vco(value){
        this.oscillator.frequency.linearRampToValueAtTime(
            Math.pow(2,value)*440, this.context.currentTime+.01);
        this.noise.playbackRate.linearRampToValueAtTime(
            (value+2.04)/5, this.context.currentTime+.01);
    }

    set detune(value){
        this.oscillator.detune.linearRampToValueAtTime(
            value, this.context.currentTime+.1);
        this.noise.detune.linearRampToValueAtTime(
            value*20, this.context.currentTime+.1);
    }

    set filterType(value){
        const types =  ['lowpass', 'highpass', 'bandpass', 'notch', 'allpass'];
        this.filter.type = types[value];
    }

    get filterTypeText(){
        return this.filter.type;
    }

    set filterFrequency(value){
        this.filterFrequencyHz = 20+value*value*value*22050;
        this.filter.frequency.linearRampToValueAtTime(
            this.filterFrequencyHz, this.context.currentTime+.1);
    }

    set filterQ(value){
        this.filterQValue = value *50;
        this.filter.Q.linearRampToValueAtTime(
            this.filterQValue, this.context.currentTime+.1);
            
    }

}

class VoiceUi {
    constructor(){
        this.element = render('div.voice', null,
            this.gainKnob = render(Knob, {
                onchange: value => {
                    this.voice.gain = value;
                    this.gainKnob.textLabel = formatGainDecibel(value);
                },
                init: 0,
            }), 
            this.oscTypeKnob = render(Knob,{
                min:0, max:4, increments:1, init:0,
                onchange: value => {
                    this.voice.type = value;
                    this.oscTypeKnob.textLabel = this.voice.type;
                },
            }),
            this.semitoneKnob = render(Knob, {
                onchange: value => {
                    this.voice.vco = value;
                    this.semitoneKnob.textLabel = Math.round(value*12) + ' st';
                },
                min: -2, max: 2, increments: 1/12, init:0
            }),
            this.detuneKnob = render(Knob, {
                onchange: value => {
                    this.voice.detune = value
                    this.detuneKnob.textLabel = Math.round(value)+' cent';
                }, 
                init:0, min: -50, max:+50
            }),
            this.filterTypeKnob = render(Knob, {
                onchange: value => {
                    this.voice.filterType = value;
                    this.filterTypeKnob.textLabel = this.voice.filterTypeText;
                },
                init:4, min: 0, max:4, increments: 1
            }),
            this.filterFrequencyKnob = render(Knob, {
                onchange: value => {
                    this.voice.filterFrequency = value;
                    const display = frequencyFormat(this.voice.filterFrequencyHz);
                    this.filterFrequencyKnob.textLabel = display;
                }, 
                init:0, min: 0, max:1
            }),
            this.filterQKnob = render(Knob, {
                onchange: value => {
                    this.voice.filterQ = value;
                    this.filterQKnob.textLabel = this.voice.filterQValue.toFixed(1) + 'Q';
                }, 
                init:0, min: 0, max:1
            })
        );
    }
}

let draggingKnob = null;
let mouseX = 0;
let mouseY = 0;
let mouseDX = 0;
let mouseDY = 0;
let touchX = 0;
let touchY = 0;

function globalMouseMove(event){
    mouseDX = event.clientX - mouseX;
    mouseDY = event.clientY - mouseY;
    mouseX = event.clientX;
    mouseY = event.clientY;
    if (draggingKnob != null){
        draggingKnob.drag(mouseDX, mouseDY);
    }
}

function globalTouchMove(event){
    const x = event.touches[0].screenX;
    const y = event.touches[0].screenY;
    const dx = x - touchX;
    const dy = y - touchY;
    touchX = x;
    touchY = y;
    if (draggingKnob != null){
        draggingKnob.drag(dx, dy);
        event.preventDefault();
        return false;
    }
    return true;
}

function globalTouchEnd(event){
    if (draggingKnob != null){
        draggingKnob = null;
        event.preventDefault();
    }
}

function globalMoseUp(event){
    draggingKnob = null;
}

class Knob
{
    constructor(){
        this._internalValue = 0;
        this._value = 0;
        this.element = render('div.column.knob-control', {
                ondragstart : () => false,
                onmousedown : event => draggingKnob = this
            }, 
            this.label = render('label', null, '?'),
            render('span.knob-base', null,
                this.knob = render('span.knob')
            )
        );
        this.element.addEventListener('touchstart', event => {
            draggingKnob = this;
            event.preventDefault();
            return false;
        })
        this.valueMin=0;
        this.valueMax=1;
        this.increments=0;
        this.value=0;
    }

    set value(v){
        if (this.increments>0){
            v=Math.round(v/this.increments)*this.increments;
        }
        if (v < this.valueMin) { v = this.valueMin; }
        if (v > this.valueMax) { v = this.valueMax; }
        this._value = v;
        this.updateTransform();
    }

    get value() { return this._value; }

    set min(value) { return this.valueMin = value; }
    set max(value) { return this.valueMax = value; }

    drag(dx, dy){
        const oldValue = this.value;
        const range = this.valueMax - this.valueMin;
        this._internalValue = this._internalValue 
            + (dx*0.005 - dy*0.0025)*range;
        if (this._internalValue < this.valueMin) { this._internalValue = this.valueMin; }
        if (this._internalValue > this.valueMax) { this._internalValue = this.valueMax; }
        this.value = this._internalValue;
        
        const newValue = this.value;
        if (this.onchange != null && oldValue !== newValue){
            this.onchange(newValue);
        }
    }

    set init(value){
        setTimeout(() => {
            this.value = value;
            this.onchange(this.value);
        })
    }

    set textLabel(value){
        this.label.textContent = value;
    }

    attributeChangedCallback(name, oldValue, newValue){
        console.log('changed', name, oldValue, newValue)
    }

    updateTransform(){
        const mapped = (this._value - this.valueMin)
            *270/(this.valueMax - this.valueMin) + 180 - 45;
        this.knob.style.transform = `rotate(${mapped}deg)`
    }

}

function render(tag, props){
    let element = null;
    switch(typeof tag){
        case "object": element = tag; break;
        case "function": element = new tag(props); break;
        case "string": {
            if (tag.indexOf('.' !== -1)){
                const split = tag.split('.');
                element = document.createElement(split[0]);
                for (let i=1; i<split.length; i++){
                    element.classList.add(split[i]);
               }
            } else {
                element = document.createElement(tag);
            }
        } break;
        default: throw new Error();
    }
    if (props != null){
        for (let key in props){
            element[key] = props[key];
        }
    }
    if (arguments.length > 2){
        const parent = element.element || element;
        parent.innerHTML = '';
        for (let i=2; i<arguments.length; i++){
            const arg = arguments[i];
            const child = typeof arg === 'string' 
                ? document.createTextNode(arg)
                : arg.element || arg;
            parent.appendChild(child);
        }
    }
    return element;
}

let makeNoiseBufferCache = null;
function makeNoiseBuffer(context){
    if (makeNoiseBufferCache == null){
        makeNoiseBufferCache = actuallyMakeNoiseBuffer(context);
    }
    return makeNoiseBufferCache;
}

function actuallyMakeNoiseBuffer(context) {
	var bufferSize = context.sampleRate;
	var buffer = context.createBuffer(1, bufferSize, context.sampleRate);
	var output = buffer.getChannelData(0);

	for (var i = 0; i < bufferSize; i++) {
		output[i] = Math.random() * 2 - 1;
	}

	return buffer;
};

function frequencyFormat(value){
    if (value > 1000){
        return (value/1000).toFixed(2) + 'kHz';
    } else {
        return Math.round(value) + 'Hz';
    }
}

function formatGainDecibel(value){
    //dB= 20log(V1/V2)= 10log(P1/P2)
    const decibel = 20*Math.log(value);
    if (decibel == 0){
        return '0 db';
    }
    if (decibel < -1000){
        return '-∞ db';
    } else {
        return (decibel < -10 ? Math.round(decibel) : decibel.toFixed(1)) + ' db';
    }
}

main();