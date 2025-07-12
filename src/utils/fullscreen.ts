/** 
 * https://css-tricks.com/the-trick-to-viewport-units-on-mobile/  
 * 
 * Use in css: 
 * body { height: calc(var(--vh, 1vh) * 100); }
 */

function resize() {
    let vh = window.innerHeight * 0.01;
    let vh100 = window.innerHeight;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
    document.documentElement.style.setProperty('--vh100', `${vh100}px`);
}
window.addEventListener('resize', resize);
window.addEventListener('load', resize);
