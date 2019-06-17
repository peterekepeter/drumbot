'use strict';

const context = new AudioContext();

const gain = context.createGain();
gain.gain.setValueAtTime(0, context.currentTime);
gain.connect(context.destination);

const oscillator = context.createOscillator();
oscillator.frequency.setValueAtTime(440, context.currentTime); // value in hertz
oscillator.detune.setValueAtTime(0, context.currentTime);
oscillator.type = "sawtooth"; // square sawtooth triangle custom
oscillator.connect(gain);
oscillator.start();

context.resume();
console.log(context);

function main(){

    render(testView, null, render(Knob, {
        onchange: value => gain.gain.setValueAtTime(value, context.currentTime)
    }), render(Knob, {
        onchange: value => oscillator.frequency.setValueAtTime(Math.pow(2, value*20), context.currentTime)
    }));
    window.onmousemove = globalMouseMove;
    window.onmouseup = globalMoseUp;
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
        this._value = 0;
        this.element = render('span.knob', {
            draggable: true, 
            onmousedown : event => {
                draggingKnob = this;
            }
        })
        this.valueMin=0;
        this.valueMax=1;
        this.value=0;
    }

    set value(v){
        if (v < this.valueMin) { v = this.valueMin; }
        if (v > this.valueMax) { v = this.valueMax; }
        this._value = v;
        this.updateTransform();
    }

    get value() { return this._value; }

    drag(dx, dy){
        this.value = this.value + dx*0.005 - dy*0.0025;
        if (this.onchange != null){
            this.onchange(this.value);
        }
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

main();