import pg from 'pg';
import { readFile } from 'fs/promises';

const paramRegex = /(?<!%)(@[^,;\s:()%-]+)/g,
	valuesKey = key => key.replace(/^@|\?$/g, '');

const query = (pool, sqlText, values) => {
	const valuesCopy = JSON.parse(JSON.stringify(values));

	const paramOrderMap = Object.fromEntries(
			Object.keys(
				[...sqlText.matchAll(paramRegex)]
					.map(match => match[0])
					.reduce((prev, next) => Object.assign(prev, { [next]: true }), {})
			).map((param, idx) => [param, idx])
		),
		paramsInOrder = Object.keys(paramOrderMap),
		paramArray = paramsInOrder.map(key => valuesCopy[valuesKey(key)] ?? null),
		missingParams = paramsInOrder
			.filter(param => !param.endsWith('?') && valuesCopy[valuesKey(param)] === undefined)
			.map(valuesKey),
		parameterizedSql = sqlText.replace(paramRegex, (match, param) => '$' + (paramOrderMap[param] + 1));

	if (missingParams.length)
		return Promise.reject('Missing required parameters: ' + missingParams.join(', '));

	return pool
		.query(parameterizedSql, paramArray)
		.then(({ rows }) => (rows[0] && rows[0].singleRow ? delete rows[0].singleRow && rows[0] : rows))
		.catch(err => {
			console.error(err);
			return Promise.reject(err);
		});
}; // query

const queryText = (queryCache, path, fname) =>
	Promise.resolve()
		.then(() => queryCache[fname] || readFile(`${path}/${fname}.sql`, 'utf-8'))
		.then(text => (queryCache[fname] = text));

const isReadOnly = sql => ['update', 'insert', 'delete', 'notify'].some(write => sql.includes(write));

export default ({ connectionInfo, path = '' }) => {
	const pool = new pg.Pool(connectionInfo),
		readOnlyPool = connectionInfo.readOnlyHost
			? new pg.Pool({ ...connectionInfo, host: connectionInfo.readOnlyHost })
			: pool;

	const queryCache = {};

	pool.on('error', console.error);

	return (fname, values = {}) =>
		queryText(queryCache, path, fname).then(text =>
			query(isReadOnly(text) ? readOnlyPool : pool, text, values)
		);
}; // exports
