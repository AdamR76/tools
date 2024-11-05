#! /usr/bin/env node

const tagName = token => {
		for (let idx = 1; idx < token.length; ++idx)
			if ([' ', '>'].includes(token[idx])) return [token.slice(1, idx), token];
		return [undefined, token];
	}, // tagName
	tokenize = html => {
		const tokens = Array.from(html)
			.reduce(
				([prev, mode], next) => {
					if (mode === '' && next === '<') {
						prev.push('<');
						mode = '<';
					} else if (mode === '<' && next === '>') {
						prev[prev.length - 1] += next;
						prev.push('');
						mode = '';
					} else if (mode === '<' && next === '<') {
						prev.push('<');
						mode = '<';
					} else if (mode === '<' && next === "'") {
						mode = "'";
						prev[prev.length - 1] += next;
					} else if (mode === '<' && next === '"') {
						mode = '"';
						prev[prev.length - 1] += next;
					} else if (mode === next) {
						mode = '<';
						prev[prev.length - 1] += next;
					} else prev[prev.length - 1] += next;

					return [prev, mode];
				},
				[[''], '']
			)[0]
			.map(tagName);

		// *anything* inside a script block isn't an element
		for (let idx = 0; idx < tokens.length; ++idx)
			if (tokens[idx][0] === '/script')
				for (let backIdx = idx - 1; backIdx > -1 && tokens[backIdx][0] !== 'script'; --backIdx)
					tokens[backIdx][0] = undefined;

		return tokens.filter(([tag, token]) => tag || token);
	};

const parseToken = ([tag, token]) =>
	tag && token.startsWith('<') && token.endsWith('>')
		? Object.fromEntries([
				['tagName', tag],
				['rawToken', token],
				...Array.from(token)
					.slice(0, -1)
					.reduce(
						({ quote, attributes }, char) => {
							if (quote && char === quote) {
								quote = false;
								attributes.push('');
							} else if (quote) attributes[attributes.length - 1] += char;
							else if (char === '"' || char === "'") quote = char;
							else if (/\s/.test(char)) attributes.push('');
							else attributes[attributes.length - 1] += char;
							return { quote, attributes };
						},
						{
							quote: false,
							attributes: [''],
						}
					)
					.attributes.filter(attr => attr && !['<'].includes(attr[0]))
					.map(attributeExpr => {
						const idx = attributeExpr.indexOf('=');
						return idx === -1
							? [attributeExpr]
							: [attributeExpr.slice(0, idx), attributeExpr.slice(idx + 1)];
					}),
		  ])
		: token;

const renderElement = element =>
	Array.isArray(element)
		? element[1]
		: typeof element === 'object'
		? `<${element.tagName}${(attrs => attrs && ' ' + attrs)(
				Object.entries(element)
					.filter(([attr]) => !['tagName', 'rawToken', '/>'].includes(attr))
					.map(([attr, value]) => (value === undefined ? attr : `${attr}="${value}"`))
					.join(' ')
		  )}${{}.hasOwnProperty.call(element, '/>') ? ' />' : '>'}`
		: element;

// if (module === require.main) {
// 	const fs = require('fs');

// 	[
// 		fs.promises.readFile('/dev/stdin', 'utf8'),
// 		tokenize,
// 		taggedTokens => {
// 			const [headStart, headEnd] = taggedTokens
// 				.filter(([tag]) => tag === 'head' || tag === '/head')
// 				.map(token => taggedTokens.indexOf(token));

// 			return taggedTokens
// 				.slice(headStart, headEnd + 1)
// 				.map(parseToken)
// 				.map(renderElement)
// 				.join('');
// 		},
// 		console.log,
// 	].reduce((prev, next) => prev.then(next));
// } // if

export {
	tokenize,
	parseToken,
	renderElement,
}; // exports
