/**
 * Web Component to make the enclosed list "sortable" by the user, by dragging the
 * elements around.
 *
 * Based on code and strategy in https://github.com/woutervroege/sortable-element
 */
export class ManualSort<Sortable extends HTMLElement =  HTMLElement> extends HTMLOListElement {

  // Event handlers for drag events-- we'll bind them to the instance in the constructor
  private readonly dragstartHandler: OmitThisParameter<(e: DragEvent) => void>;
  private readonly dragoverHandler: OmitThisParameter<(e: DragEvent) => void>;
  private readonly dragendHandler: OmitThisParameter<(e: DragEvent) => void>;

  // State variables
  private listening: boolean; // active? event handlers listening
  private observer?: MutationObserver;
  private draggingItemIndex?: number;
  private dropIndex?: number;
  private sortablesAndBounds: { bounds: DOMRect; child: Sortable }[];

  constructor() {
    super();

    this.dragstartHandler = this.handleDragstart.bind(this);
    this.dragoverHandler = this.handleDragover.bind(this);
    this.dragendHandler = this.handleDragend.bind(this);

    this.listening = false
    this.sortablesAndBounds = []
  }



  handleDragstart(e: DragEvent) {
    const target = e.target as HTMLElement
    const child = (this.useDragHandles ? target.offsetParent : target) as Sortable

    this.draggingItemIndex = this.sortablesInVisualOrder().indexOf(child);

    this.sortablesAndBounds = this.sortablesInVisualOrder()
      .map((child) => {
        return {child, bounds: child.getBoundingClientRect()};
      });

    // TODO how to configure this?
    e.dataTransfer!.dropEffect = 'move'
    e.dataTransfer!.setDragImage(child, child.clientWidth / 4, 40)

  }

  handleDragover(e: DragEvent) {
    if (this.draggingItemIndex === -1) return

    e.preventDefault();

    const newIndex = this.findSortableIndex(e.clientX, e.clientY);

    if (this.dropIndex == newIndex) return

    this.previewNewPositions(newIndex);

    this.dropIndex = newIndex;
  }

  handleDragend(_e: DragEvent) {
    if (this.draggingItemIndex === -1) return
    this.dispatchEvent(new CustomEvent('sort', {detail: {children: this.sortablesInVisualOrder()}}));
    this.resetPreviewPositions();
  }


  connectedCallback() {
    if (this.getAttribute('sortable') !== 'false') this.listenForSortingEvents()
  }

  disconnectedCallback() {
    this.stopListeningForSortingEvents()
  }


  /**
   * Returns the elements that can be sorted. This is (currently)
   * all the children of the component, in the order they appear in the DOM.
   */
  get sortables() {
    return [...this.children] as Array<Sortable>
  }

  /**
   * Child elements are draggable as a whole, and
   * the user can mouse on any part of the element.
   * This is the default `drag-handles=false` behavior.
   *
   * If set to "create", a drag handle will be created for
   * each sortable element, with the class "drag-handle".
   *
   * If set to "true", the caller MUST provide, inside each element,
   * a sub-element drag handle with the class `drag-handle`.
   */
  get useDragHandles() {
    return !!this.getAttribute('drag-handles') &&
      this.getAttribute('drag-handles') !== 'false'
  }

  get createDragHandles() {
    return this.getAttribute('drag-handles') === 'create'
  }


  listenForSortingEvents() {

    if (this.listening) return

    this.addEventListener('dragstart', this.dragstartHandler);
    this.addEventListener('dragover', this.dragoverHandler);
    this.addEventListener('dragend', this.dragendHandler);

    this.resetPreviewPositions();
    this.makeAllSortablesDraggable();
    this.configMutationObserver();

    this.listening = true
  }

  stopListeningForSortingEvents() {

    if (!this.listening) return

    this.sortables.forEach(el => {
      el.style.setProperty('transition', '');
      el.draggable = false;
    });

    if (this.observer) this.observer.disconnect();

    this.removeEventListener('dragstart', this.dragstartHandler);
    this.removeEventListener('dragover', this.dragoverHandler);
    this.removeEventListener('dragend', this.dragendHandler);

    this.listening = false
  }


  /*
   * Caller can turn on and off the sorting/dragging behavior by setting this
   * attribute.
   */
  static get observedAttributes() {
    return ['sortable'];
  }

  attributeChangedCallback(name: string, _oldValue: string, newValue: string) {
    if (name === 'sortable') {
      if (newValue !== 'false') {
        this.listenForSortingEvents();
      } else {
        this.stopListeningForSortingEvents();
      }
    }
  }

  /**
   * Examine the actual position of the sortable elements on the page,
   * and return them in the order they appear visually, top to bottom,
   * left to right.
   */
  sortablesInVisualOrder(): Array<Sortable> {
    return this.sortables.sort((a, b) => {
      const aBounds = a.getBoundingClientRect();
      const bBounds = b.getBoundingClientRect();
      if (aBounds.top < bBounds.top) return -1;
      if (aBounds.top > bBounds.top) return 1;
      if (aBounds.left < bBounds.left) return -1;
      if (aBounds.left > bBounds.left) return 1;
      return 0;
    });
  }

  /**
   * Configure a MutationObserver to listen for changes in the children
   * of the component. When a new child is added, makes it sortable.
   */
  configMutationObserver() {

    this.observer =
      new MutationObserver((mutationsList) => {
        mutationsList.forEach(
          record => {
            record.addedNodes.forEach((node) => {
              const newChild = node as Sortable
              this.makeSortableDraggable(newChild);
              newChild.style.setProperty('order', this.sortables.indexOf(newChild).toString())
            });
          }
        );

        this.resetPreviewPositions();
      });
    this.observer.observe(this, {childList: true});
  }


  /**
   * Move the sortable elements around to preview the new positions.
   * This is the **secret** to making this look nice and smooth.
   * @param newIndex where the dragged element will be dropped
   */
  previewNewPositions(newIndex: number) {

    if (newIndex === -1 || this.draggingItemIndex === undefined) return;

    const startIndex = Math.min(this.draggingItemIndex, newIndex);
    const endIndex = Math.max(this.draggingItemIndex, newIndex);

    for (let i = 0; i < this.sortablesAndBounds.length; i++) {

      let translateX, translateY, opacity= 1;
      const left = this.sortablesAndBounds[i].bounds.left
      const top = this.sortablesAndBounds[i].bounds.top

      if (i === this.draggingItemIndex) {
        translateX = this.sortablesAndBounds[newIndex].bounds.left - left;
        translateY = this.sortablesAndBounds[newIndex].bounds.top - top;
        opacity = .1
      } else if (i < startIndex || i > endIndex) {
        translateX = 0;
        translateY = 0;
        opacity = .7
      } else if (i < this.draggingItemIndex) {
        translateX = this.sortablesAndBounds[i + 1].bounds.left - left;
        translateY = this.sortablesAndBounds[i + 1].bounds.top - top;
      } else if (i > this.draggingItemIndex) {
        translateX = this.sortablesAndBounds[i - 1].bounds.left - left;
        translateY = this.sortablesAndBounds[i - 1].bounds.top - top;
      }
      this.sortablesAndBounds[i].child.style.setProperty('transition', 'transform 100ms')
      this.sortablesAndBounds[i].child.style.setProperty('transform', `translate(${translateX}px, ${translateY}px)`);
      this.sortablesAndBounds[i].child.style.setProperty('opacity', opacity.toString())
    }

  }

  resetPreviewPositions() {
    this.sortablesInVisualOrder().forEach((child, i) => {
      child.style.setProperty('transition-duration', '0ms');
      child.style.setProperty('transform', '');
      child.style.setProperty('opacity', '')
      child.style.order = i.toString()
    });
  }

  /**
   * Find the index of the sortable element that contains the mouse
   * at the given coordinates, not taking into account any sort of "preview"
   * on the page.
   */
  findSortableIndex(mouseX:number, mouseY:number) {
    return this.sortablesAndBounds.findIndex((child) => {
      return mouseX >= child.bounds.left &&
        mouseX <= child.bounds.right &&
        mouseY >= child.bounds.top &&
        mouseY <= child.bounds.bottom
    });
  }

  makeAllSortablesDraggable() {
    this.sortables.forEach(child => this.makeSortableDraggable(child))
  }

  /**
   * Sets up the given sub-element of the component to be draggable,
   * including adding a drag handle if necessary.
   */
  makeSortableDraggable(child: Sortable) {
    if (this.createDragHandles && child.querySelector('.drag-handle') === null) {
      const dragHandle = document.createElement('div')
      dragHandle.classList.add('drag-handle')
      child.prepend(dragHandle)
    }

    if (this.useDragHandles)
      child.querySelector<HTMLDivElement>('.drag-handle')!.draggable = true;
    else
      child.draggable = true
  }

}

customElements.define('manual-sort', ManualSort, {extends: 'ol'});

export function initManualSort() {
}