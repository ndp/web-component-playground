import {JSDOM} from "jsdom";


const dom = new JSDOM();
global.window = dom.window;
global.document = window.document;
global.HTMLElement = window.HTMLElement;
global.customElements = window.customElements;
global.HTMLOListElement = window.HTMLOListElement;