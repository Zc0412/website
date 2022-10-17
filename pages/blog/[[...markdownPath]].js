import React, {useMemo} from "react";
import {MDXComponents} from "../../components/MDX/MDXComponents";

export default function Layout(props) {
  const {content, toc, meta} = props
  const parsedContent = useMemo(
    () => JSON.parse(content, reviveNodeOnClient),
    [content]
  );
  const parsedToc = useMemo(() => JSON.parse(toc, reviveNodeOnClient), [toc]);

  return (
    <>
      123
    </>
  )
}

// Deserialize a client React tree from JSON.
function reviveNodeOnClient(key, val) {
  if (Array.isArray(val) && val[0] === '$r') {
    // Assume it's a React element.
    let type = val[1];
    let key = val[2];
    let props = val[3];
    if (type === 'wrapper') {
      type = Fragment;
      props = {children: props.children};
    }
    if (MDXComponents[type]) {
      type = MDXComponents[type];
    }
    if (!type) {
      console.error('Unknown type: ' + type);
      type = Fragment;
    }
    return {
      $$typeof: Symbol.for('react.element'),
      type: type,
      key: key,
      ref: null,
      props: props,
      _owner: null,
    };
  } else {
    return val;
  }
}

export async function getStaticProps(context) {
  const fs = require('fs');
  const {prepareMDX,} = require('../../utils/prepareMDX');
  const rootDir = `${process.cwd()}/content/`;
  const mdxComponentNames = Object.keys(MDXComponents);

  // const mdxComponentNames = Object.keys(MDXComponents);

  // Read MDX from the file.
  let path = (context.params.markdownPath || []).join('/') || 'index';

  // 读取mdx文件内容
  let mdxWithFrontmatter;
  try {
    mdxWithFrontmatter = fs?.readFileSync(rootDir + path + '.mdx', 'utf8');
  } catch {
    mdxWithFrontmatter = fs?.readFileSync(rootDir + path + '/index.mdx', 'utf8');
  }
  // 解析mdx内容
  const fm = require('gray-matter')
  const {content: mdxWithoutFrontmatter, data: meta} = fm(mdxWithFrontmatter);

  let mdxWithFakeImports = mdxComponentNames
    .map((key) => 'import ' + key + ' from "' + key + '";\n')
    .join('\n');
  mdxWithFakeImports += '\n' + mdxWithoutFrontmatter;

  // Turn the MDX we just read into some JS we can execute.
  const {remarkPlugins} = require('../../plugins/markdownToHtml');
  const {compile: compileMdx} = await import('@mdx-js/mdx');
  const visit = (await import('unist-util-visit')).default;
  const jsxCode = await compileMdx(mdxWithFakeImports, {
    remarkPlugins: [...remarkPlugins, (await import('remark-gfm')).default],
    rehypePlugins: [
      // Support stuff like ```js App.js {1-5} active by passing it through.
      function rehypeMetaAsAttributes() {
        return (tree) => {
          visit(tree, 'element', (node) => {
            if (node.tagName === 'code' && node.data && node.data.meta) {
              node.properties.meta = node.data.meta;
            }
          });
        };
      },
    ],
  });
  console.log(jsxCode);
  const {transform} = require('@babel/core');
  const jsCode = await transform(jsxCode, {
    plugins: ['@babel/plugin-transform-modules-commonjs'],
    presets: ['@babel/preset-react'],
  }).code;

  // Prepare environment for MDX.
  let fakeExports = {};
  const fakeRequire = (name) => {
    if (name === 'react/jsx-runtime') {
      return require('react/jsx-runtime');
    } else {
      // For each fake MDX import, give back the string component name.
      // It will get serialized later.
      return name;
    }
  };
  const evalJSCode = new Function('require', 'exports', jsCode);
  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  // THIS IS A BUILD-TIME EVAL. NEVER DO THIS WITH UNTRUSTED MDX (LIKE FROM CMS)!!!
  // In this case it's okay because anyone who can edit our MDX can also edit this file.
  evalJSCode(fakeRequire, fakeExports);
  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  const reactTree = fakeExports.default({});

  // Pre-process MDX output and serialize it.
  let {toc, children} = prepareMDX(reactTree.props.children);
  if (path === 'index') {
    toc = [];
  }

  const output = {
    props: {
      content: JSON.stringify(children, stringifyNodeOnServer),
      toc: JSON.stringify(toc, stringifyNodeOnServer),
      meta,
    },
  };

  // Serialize a server React tree node to JSON.
  function stringifyNodeOnServer(key, val) {
    if (val != null && val.$$typeof === Symbol.for('react.element')) {
      // Remove fake MDX props.
      const {mdxType, originalType, parentName, ...cleanProps} = val.props;
      return [
        '$r',
        typeof val.type === 'string' ? val.type : mdxType,
        val.key,
        cleanProps,
      ];
    } else {
      return val;
    }
  }

  return output;

}


export async function getStaticPaths() {
  const {promisify} = require('util');
  const {resolve} = require('path');
  const fs = require('fs');
  const readdir = promisify(fs.readdir);
  const stat = promisify(fs.stat);
  const rootDir = `${process.cwd()}/content`;

  // 递归查找文件
  async function getFiles(dir) {
    const subdirs = await readdir(dir);
    const files = await Promise.all(
      subdirs.map(async (subdir) => {
        const res = resolve(dir, subdir);
        return (await stat(res)).isDirectory()
          ? getFiles(res)
          : res.slice(rootDir.length + 1);
      })
    );
    return files.flat().filter((file) => file.endsWith('.mdx'));
  }

  // 转换
  // 'foo/bar/baz.md' -> ['foo', 'bar', 'baz']
  // 'foo/bar/qux/index.md' -> ['foo', 'bar', 'qux']
  function getSegments(file) {
    let segments = file.slice(0, -4).replace(/\\/g, '/').split('/');
    if (segments[segments.length - 1] === 'index') {
      segments.pop();
    }
    return segments;
  }

  // 文件目录
  const files = await getFiles(rootDir);
  // 返回paths
  const paths = files.map((file) => ({
    params: {
      markdownPath: getSegments(file),
    },
  }));
  return {
    paths: paths,
    fallback: false,
  };
}
