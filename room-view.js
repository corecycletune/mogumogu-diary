// Presentation only: replace this component when the room feature is ready.
// The scene and overlay mount share one coordinate space; no game state is stored here.
class RoomView extends HTMLElement {
  connectedCallback() {
    if (this.firstElementChild) return;
    const imageURL = new URL('./assets/ui/room-cozy.webp', import.meta.url).href;
    this.innerHTML = `<div class="room-stage"><img class="room-background" src="${imageURL}" width="1024" height="1365" alt="木の床とベッド、植物のある明るいおへや" fetchpriority="high" decoding="async"><div class="room-overlays" aria-hidden="true"></div><div class="room-title"><span aria-hidden="true">⌂</span><h2>おへや</h2><span class="room-tag">のんびり、まいにち</span></div></div>`;
  }
}
if (!customElements.get('room-view')) customElements.define('room-view', RoomView);
