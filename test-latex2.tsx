import React from 'react';
import { renderToString } from 'react-dom/server';
import Latex from 'react-latex-next';

const html = renderToString(<Latex>{"<b>world</b>"}</Latex>);
console.log(html);
