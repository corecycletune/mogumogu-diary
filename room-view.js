// Presentation only: replace this component when the room feature is ready.
// The scene and overlay mount share one coordinate space; no game state is stored here.
class RoomView extends HTMLElement {
  connectedCallback() {
    if (this.firstElementChild) return;
    const imageURL = new URL('./assets/ui/room-placeholder.webp', import.meta.url).href;
    this.innerHTML = `<div class="room-stage"><img class="room-background" src="${imageURL}" width="840" height="1050" alt="植物に囲まれた木のテラス" fetchpriority="high" decoding="async"><div class="room-overlays" aria-hidden="true"></div><div class="room-title"><span aria-hidden="true">⌂</span><h2>おへや</h2><span class="room-tag">のんびり、まいにち</span></div><div class="room-note"><strong>今日も、自分のペースで。</strong><span>おへやの背景は準備中</span></div></div>`;
  }
}
if (!customElements.get('room-view')) customElements.define('room-view', RoomView);
