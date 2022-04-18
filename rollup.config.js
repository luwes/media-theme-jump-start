import { dirname, parse, resolve } from 'path';
import { readdir } from 'fs/promises';
import dom from 'cheerio';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import { createFilter, dataToEsm } from '@rollup/pluginutils';

export default {
  input: 'src/index.js',
  output: {
    file: 'dist/index.js',
    format: 'esm',
  },
  plugins: [
    dirImportPlugin(),
    importAsTextPlugin({
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
    nodeResolve(),
  ],
};

// Inspiration from https://github.com/rollup/plugins/blob/master/packages/virtual/src/index.ts
export function dirImportPlugin() {
  const PREFIX = `\0dir:`;
  return {
    name: 'dir-import',
    resolveId(id, importer) {
      const { name } = parse(id);
      if (name === '*' && importer) {
        const importerNoPrefix = importer.startsWith(PREFIX)
          ? importer.slice(PREFIX.length)
          : importer;
        const resolved = resolve(dirname(importerNoPrefix), id);
        return PREFIX + resolved;
      }
    },
    async load(id) {
      if (!id.startsWith(PREFIX)) return;

      const { name, ext, dir } = parse(id.slice(PREFIX.length));
      if (name === '*') {
        let files = await readdir(dir);
        if (ext) files = files.filter((entry) => entry.endsWith(ext));
        const modules = {};
        for (const file of files) {
          const { name } = parse(file);
          modules[name] = `import ${name} from '${dir}/${file}';\n`;
        }
        return (
          `${Object.values(modules).join('')}` +
          `export default [${Object.keys(modules).join(', ')}]`
        );
      }
    },
  };
}

// Inspiration from https://github.com/rollup/plugins/blob/master/packages/json/src/index.js
export function importAsTextPlugin(options = {}) {
  options = {
    exts: ['.html', '.svg', '.css'],
    transform: (content) => content,
    ...options,
  };
  const filter = createFilter(options.include, options.exclude);
  const indent = 'indent' in options ? options.indent : '\t';

  return {
    name: 'import-as-text',
    transform(content, id) {
      const { ext } = parse(id);
      if (!options.exts.some((t) => ext === t) || !filter(id)) return null;

      try {
        const parsed = options.transform(content, id) ?? content;
        return {
          code: dataToEsm(parsed, {
            preferConst: options.preferConst,
            compact: options.compact,
            namedExports: options.namedExports,
            indent,
          }),
          map: { mappings: '' },
        };
      } catch (err) {
        const message = `Could not parse ${ext} file`;
        const position = parseInt(/[\d]/.exec(err.message)[0], 10);
        this.warn({ message, id, position });
        return null;
      }
    },
  };
}
