import React from 'react';
import { renderToString } from 'react-dom/server';
import Latex from 'react-latex-next';

const html = renderToString(<Latex>{"Hello <b>world</b> $x^2$"}</Latex>);
console.log(html);
