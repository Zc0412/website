// import { unified } from 'unified'
const { unified } =  require('unified')
// import remarkParse from 'remark-parse'
const remarkParse = require('remark-parse')
// import remarkRehype from 'remark-rehype'
const remarkRehype = require('remark-rehype')
// import rehypeSanitize from 'rehype-sanitize'
const rehypeSanitize = require('rehype-sanitize')
// import rehypeStringify from 'rehype-stringify'
const rehypeStringify = require('rehype-stringify')
const html = require('remark-html');

async function markdownToHtml(markdown) {
  const file = await unified()
    .use(remarkParse)
    .use(remarkRehype)
    .use(rehypeSanitize)
    .use(rehypeStringify)
    .use(html)
    .process(markdown)
  return file.toString()
  // console.log(String(file))
}

module.exports = {
  remarkPlugins:[

  ],
  markdownToHtml
}
