import { parse } from 'path';
import dom from 'cheerio';
import { hmrPlugin } from '@open-wc/dev-server-hmr';
import { fromRollup } from '@web/dev-server-rollup';
import { dirImportPlugin, importAsTextPlugin } from './rollup.config.js';

const myElementPatch = `
import { MediaTheme } from 'media-chrome';
MediaTheme.prototype.hotReplacedCallback = function hotReplacedCallback() {
  console.log('Hot cakes incoming!');
  this.render();
};
`;

export default {
  // open: true,
  nodeResolve: true,
  appIndex: 'index.html',
  mimeTypes: {
    // serve all src files as js
    'src/**/*': 'js',
  },
  plugins: [
    helperPlugin(),
    fromRollup(dirImportPlugin)(),
    fromRollup(importAsTextPlugin)({
      transform(content, id) {
        const { ext } = parse(id);
        if (['.svg'].some((t) => ext === t)) {
          const $ = dom.load('<svg></svg>');
          const svgNode = $(String(content));
          svgNode[0].tagName = 'symbol';
          svgNode.attr('id', parse(id).name);
          return $.html(svgNode);
        }
      },
    }),
    hmrPlugin({
      exclude: ['**/*/node_modules/**/*'],
      baseClasses: [{ name: 'MediaTheme', import: 'media-chrome' }],
      patches: [myElementPatch],
    }),
  ],
};

function helperPlugin() {
  return {
    name: 'helper',
    transformImport({ source }) {
      // Seems there is a bug in the HMR plugin which gets stale modules
      // e.g change HTML file -> change CSS -> old HTML file is used again
      if (/(\.html)/.test(source)) {
        // BUT enabling this breaks HMR for template.html so choosing an extra
        // manual save file over breaking HMR for now :(
        // return `./${source.split('?')[0]}?m=${Date.now()}`;
      }
    },
  };
}
