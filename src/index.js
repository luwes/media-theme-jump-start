import htmlStr from './template.html';
import styles from './styles.css';
import symbols from './icons/*.svg';
import { MediaTheme } from '/node_modules/media-chrome/dist/index.js';
import { getBreakpoints, render, unsafeHTML } from './helpers.js';

const breakpoints = { xs: 396, sm: 484, md: 576, lg: 768, xl: 960 };

class MediaThemeJumpStart extends MediaTheme {
  constructor() {
    super();

    resizeObserver.observe(this);
  }

  render() {
    render(this.shadowRoot, htmlStr, {
      breakpoints: getBreakpoints(this, breakpoints),
      // The svg node has to be included here because template-parts
      // requires a SVG namespace for DOM creations.
      symbols: unsafeHTML(`
        <svg style="display: none;">
          ${symbols.join('')}
        </svg>`),
      styles,
    });
  }
}

const resizeObserver = new ResizeObserver(function (entries) {
  entries.forEach(({ target }) => target.render());
});

if (!customElements.get('media-theme-jump-start')) {
  customElements.define('media-theme-jump-start', MediaThemeJumpStart);
}

export default MediaThemeJumpStart;
