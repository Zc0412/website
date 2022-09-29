import { unified } from "unified";
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import rehypeSanitize from 'rehype-sanitize'
import rehypeStringify from 'rehype-stringify'
import {compile} from "@mdx-js/mdx";
import remarkToc from "remark-toc";
import { MDXComponents } from "../../components/MDX/MDXComponents";

export default function Layout(props) {
  console.log(props)
  return (
    <>
      123
    </>
  )
}

export async function getStaticProps(context) {
  const fs = require('fs');
  // const { prepareMDX, } = require('../utils/prepareMDX');
  const rootDir = `${process.cwd()}/content/`;
  const mdxComponentNames = Object.keys(MDXComponents);

  // const mdxComponentNames = Object.keys(MDXComponents);

  // // Read MDX from the file.
  let path = (context.params.markdownPath || []).join('/') || 'index';

  // 读取mdx文件内容
  let mdxWithFrontmatter;
  try {
    mdxWithFrontmatter = fs?.readFileSync(rootDir + path + '.mdx', 'utf8');
  } catch {
    mdxWithFrontmatter = fs?.readFileSync(rootDir + path + '/index.mdx', 'utf8');
  }
  // 解析mdx内容
  const matter = require('gray-matter')
  const { content: mdxWithoutFrontmatter, data: mate } = matter(mdxWithFrontmatter)
  // console.log(mdxWithoutFrontmatter)

  let mdxWithFakeImports = mdxComponentNames
    .map((key) => 'import ' + key + ' from "' + key + '";\n')
    .join('\n');
  mdxWithFakeImports += '\n' + mdxWithoutFrontmatter;


  // const html =await import('remark-html');

  async function markdownToHtml(markdown) {
    const file = await unified()
      .use(remarkParse)
      .use(remarkRehype)
      .use(rehypeSanitize)
      .use(rehypeStringify)
      .use(remarkToc)
      .process(markdown)
    console.log(String(file))
    return String(file)
  }

  console.log("@@@@@@@",markdownToHtml(mdxWithoutFrontmatter))
  const compiled = await compile(mdxWithFakeImports, { remarkPlugins: [ markdownToHtml],markdownToHtml })
  // const compiled = await compile(mdxWithFakeImports, {jsx: true})
  // console.log("------compiled------", compiled.value)


  return { props: { id: 1, mate } }
}


export async function getStaticPaths() {
  const { promisify } = require('util');
  const { resolve } = require('path');
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
