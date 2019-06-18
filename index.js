'use strict';



function main(){
    document.body.onclick = () => {
        context.resume();
        document.body.onclick = null;
    }
    const context = new AudioContext();
    const voice = new Voice(context);
    render(testView, null, render(VoiceUi, { voice }));
    window.onmousemove = globalMouseMove;
    window.onmouseup = globalMoseUp;
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

    set gain(value){
        this._gain.gain.setValueAtTime(value, this.context.currentTime)
    }

    set vco(value){
        this.oscillator.frequency.setValueAtTime(
            Math.pow(2,value)*440, this.context.currentTime);
        this.noise.playbackRate.setValueAtTime((value+2.04)/5, 0);
    }

    set detune(value){
        this.oscillator.detune.setValueAtTime(value, this.context.currentTime);
        this.noise.detune.setValueAtTime(value*20, 0);
    }

    set filterType(value){
        const types =  ['lowpass', 'highpass', 'bandpass', 'notch', 'allpass'];
        this.filter.type = types[value];
    }

    set filterFrequency(value){
        this.filter.frequency.setValueAtTime(20+value*value*value*22050,0);
    }

    set filterQ(value){
        this.filter.Q.setValueAtTime(value*50,0);
    }

}

class VoiceUi {
    constructor(){
        this.element = render('div', null,
            render(Knob, {
                onchange: value => this.voice.gain = value,
                init: 0,
            }), 
            render(Knob,{
                min:0, max:4, increments:1, init:0,
                onchange: value => this.voice.type = value,
            }),
            render(Knob, {
                onchange: value => this.voice.vco = value,
                min: -2, max: 2, increments: 1/12, init:0
            }),
            render(Knob, {
                onchange: value => this.voice.detune = value, 
                init:0, min: -50, max:+50
            }),
            render(Knob, {
                onchange: value => this.voice.filterType = value, 
                init:4, min: 0, max:4, increments: 1
            }),
            render(Knob, {
                onchange: value => this.voice.filterFrequency = value, 
                init:0, min: 0, max:1
            }),
            render(Knob, {
                onchange: value => this.voice.filterQ = value, 
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

function globalMouseMove(event){
    mouseDX = event.clientX - mouseX;
    mouseDY = event.clientY - mouseY;
    mouseX = event.clientX;
    mouseY = event.clientY;
    if (draggingKnob != null){
        draggingKnob.drag(mouseDX, mouseDY);
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
        this.element = render('span.knob', {
            ondragstart : () => false,
            onmousedown : event => draggingKnob = this
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

    attributeChangedCallback(name, oldValue, newValue){
        console.log('changed', name, oldValue, newValue)
    }

    updateTransform(){
        const mapped = (this._value - this.valueMin)
            *270/(this.valueMax - this.valueMin) + 180 - 45;
        this.element.style.transform = `rotate(${mapped}deg)`
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

main();