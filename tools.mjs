const searchQuery = Object.fromEntries(
	location.search
		.split(/\?|&/)
		.filter(Boolean)
		.map(part => part.split('='))
);

const querySelect = (selectorOrElement, element = document) =>
	typeof selectorOrElement === 'string'
		? [...element.querySelectorAll(selectorOrElement)]
		: selector => querySelect(selector, selectorOrElement);
		
		
const flow = (...args) => args.reduce((prev, next) => Promise.resolve(prev).then(next)),
	compose =
		(...args) =>
		value =>
			flow(value, ...args),
	waitAll = Promise.all.bind(Promise);

const tryAppendChild = node => child => {
	try {
		node.appendChild(
			['string', 'number'].some(type => typeof child === type) ? document.createTextNode(child) : child
		);
	} catch (error) {
		console.error(error);
		console.error('type:', typeof child);
		console.error('child:', child);
	} // catch
};

const addChildren = (node, children) => {
	children = [].concat(children);
	if (children.length === 1 && typeof children[0] === 'string') [node.textContent] = children;
	else children.filter(Boolean).forEach(tryAppendChild(node));
	return node;
}; // addChildren

const html1 = (tag, attributes = {}, children = []) => {
	const el = document.createElement(tag);
	Object.entries(attributes).forEach(([key, value]) =>
		key.startsWith('data-')
			? (el.dataset[key.slice(5)] = value)
			: ['list'].includes(key)
			? el.setAttribute(key, value)
			: (el[key] = value)
	);
	return addChildren(el, children);
}; // html
let html = html1;
