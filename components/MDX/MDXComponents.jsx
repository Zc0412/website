import React from 'react';


export const MDXComponents = {
  p: (p) => <p>{p}</p>,
  strong: (strong) => <strong>{strong}</strong>,
  ol: (ol) => <ol>{ol}</ol>,
  ul: (ul) => <ul>{ul}</ul>,
  li: (li) => <li>{li}</li>,
  h1: (h1) => <h1>{h1}</h1>,
  h2: (h2) => <h2>{h2}</h2>,
  h3: (h3) => <h3>{h3}</h3>,
  h4: (h4) => <h4>{h4}</h4>,
  MaxWidth({ children }) {
    return <div>{children}</div>;
  },
}

for (let key in MDXComponents) {
  if (MDXComponents.hasOwnProperty(key)) {
    const MDXComponent = (MDXComponents)[key];
    MDXComponent.mdxName = key;
  }
}
