import * as assert from 'assert';
import {DOMWindow, JSDOM} from 'jsdom';
import { ManualSort } from './manual-sort.js';
import {describe, beforeEach, it} from 'node:test';

describe('ManualSort', function() {
  // let dom: JSDOM;
  // let window: DOMWindow;
  // let document: Document;

  // beforeEach(function() {
  //   dom = new JSDOM();
  //   window = dom.window;
  //   document = window.document;
  //   global.HTMLOListElement = window.HTMLOListElement;
  // });

  it('should be defined', function() {
    assert.ok(ManualSort);
  });

  it('should be able to create an instance', function() {
    const manualSort = new ManualSort();
    assert.ok(manualSort instanceof ManualSort);
  });

  it('finds its children', () => {
    const div = document.createElement('div')
    div.innerHTML = '<ol is="manual-sort"><li>A</li><li>B</li></ol>'
    const ol = div.querySelector('ol') as ManualSort
    assert.equal(ol.sortables.length, 2)
    assert.equal(ol.sortables[0].innerHTML, 'A')
  })

  it('detects without drag handles', () => {
    const div = document.createElement('div')
    div.innerHTML = '<ol is="manual-sort" drag-handles="false"></ol>'
    const ol = div.querySelector('ol') as ManualSort
    assert.equal(ol.useDragHandles, false)
    assert.equal(ol.createDragHandles, false)
  })

  it('detects implicit without drag handles', () => {
    const div = document.createElement('div')
    div.innerHTML = '<ol is="manual-sort" ></ol>'
    const ol = div.querySelector('ol') as ManualSort
    assert.equal(ol.useDragHandles, false)
    assert.equal(ol.createDragHandles, false)
  })

  it('detects with drag handles', () => {
    const div = document.createElement('div')
    div.innerHTML = '<ol is="manual-sort" drag-handles="true"></ol>'
    const ol = div.querySelector('ol') as ManualSort
    assert.equal(ol.useDragHandles, true)
    assert.equal(ol.createDragHandles, false)
  })

  it('detects creating drag handles', () => {
    const div = document.createElement('div')
    div.innerHTML = '<ol is="manual-sort" drag-handles="create"></ol>'
    const ol = div.querySelector('ol') as ManualSort
    assert.equal(ol.useDragHandles, true)
    assert.equal(ol.createDragHandles, true)
  })

  // Add more tests as needed...
});