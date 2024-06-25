//@type-check
/** @typedef {import('./Route').RouteConfig} RouteConfig */
/** @typedef {import('./Route').RouteName} RouteName */
/** @typedef {import('./RequestUtils').NormalizedRequestOptions} NormalizedRequestOptions */
/** @typedef {import('./Matchers').RouteMatcher} RouteMatcher */
/** @typedef {import('./FetchMock').FetchMockConfig} FetchMockConfig */
import { normalizeRequest } from './RequestUtils.js';
import Route from './Route.js';

/**
 * @typedef CallLog
 * @property {string} url
 * @property {NormalizedRequestOptions} options
 * @property {Request} [request]
 * @property {Route} [route]
 * @property {Response} [response]
 * @property {Promise<any>[]} pendingPromises
 */

/** @typedef {'matched'} Matched */
/** @typedef {'unmatched'} Unmatched */
/** @typedef  {RouteName | Matched| Unmatched| boolean | RouteMatcher } CallHistoryFilter*/

/**
 *
 * @param {CallHistoryFilter} filter
 * @returns {filter is RouteName}
 */
const isName = (filter) =>
	typeof filter === 'string' && /^[\da-zA-Z\-]+$/.test(filter);

/**
 *
 * @param {CallHistoryFilter} filter
 * @returns {filter is (Matched| Unmatched| boolean)}
 */
const isMatchedOrUnmatched = (filter) =>
	typeof filter === 'boolean' ||
	/** @type {CallHistoryFilter[]}*/ (['matched', 'unmatched']).includes(filter);

class CallHistory {
	/**
	 * @param {FetchMockConfig} globalConfig
	 */
	constructor(globalConfig) {
		/** @type {CallLog[]} */
		this.callLogs = [];
		this.config = globalConfig;
	}
	/**
	 *
	 * @param {CallLog} callLog
	 */
	recordCall(callLog) {
		this.callLogs.push(callLog);
	}

	/**
	 *
	 * @param {boolean} [waitForResponseBody]
	 * @returns {Promise<void>}
	 */
	async flush(waitForResponseBody) {
		const queuedPromises = this.callLogs.flatMap(
			(call) => call.pendingPromises,
		);
		await Promise.all(queuedPromises);
		if (waitForResponseBody) {
			await this.flush();
		}
	}

	/**
	 *
	 * @param {CallHistoryFilter} filter
	 * @param {RouteConfig} options
	 * @returns {CallLog[]}
	 */
	filterCalls(filter, options) {
		let calls = [...this.callLogs];

		if (isMatchedOrUnmatched(filter)) {
			if (
				/** @type {CallHistoryFilter[]} */ ([true, 'matched']).includes(filter)
			) {
				calls = calls.filter(({ route }) => Boolean(route));
			} else if (
				/** @type {CallHistoryFilter[]} */ ([false, 'unmatched']).includes(
					filter,
				)
			) {
				calls = calls.filter(({ route }) => !route);
			}
		} else if (isName(filter)) {
			calls = calls.filter(
				({
					route: {
						config: { name },
					},
				}) => name === filter,
			);
		} else if (filter) {
			const { matcher } = new Route({
				matcher: filter,
				response: 'ok',
				...options,
			});
			calls = calls.filter(({ url, options }) => {
				const {
					url: normalizedUrl,
					options: normalizedOptions,
					request,
				} = normalizeRequest(url, options, this.config.Request);
				return matcher(normalizedUrl, normalizedOptions, request);
			});
		}

		return calls;
	}
	/**
	 *
	 * @param {CallHistoryFilter} filter
	 * @param {RouteConfig} options
	 * @returns {CallLog[]}
	 */
	calls(filter, options) {
		return this.filterCalls(filter, options);
	}
	/**
	 *
	 * @param {CallHistoryFilter} filter
	 * @param {RouteConfig} options
	 * @returns {boolean}
	 */
	called(filter, options) {
		return Boolean(this.calls(filter, options).length);
	}
	/**
	 *
	 * @param {CallHistoryFilter} filter
	 * @param {RouteConfig} options
	 * @returns {CallLog}
	 */
	lastCall(filter, options) {
		return this.filterCalls(filter, options).pop();
	}
	/**
	 *
	 * @param {RouteName[]} [routeNames]
	 * @param {Route[]} allRoutes
	 * @returns {boolean}
	 */
	done(allRoutes, routeNames) {
		const routesToCheck = routeNames
			? allRoutes.filter(({ config: { name } }) => routeNames.includes(name))
			: allRoutes;
		// TODO when checking all routes needs to check against all calls
		// Can't use array.every because would exit after first failure, which would
		// break the logging
		return routesToCheck
			.map(
				/** @type {function(Route):boolean}*/ (route) => {
					const calls = this.callLogs.filter(
						({ route: routeApplied }) => routeApplied === route,
					);
					if (!calls.length) {
					console.warn(`Warning: ${name} not called`); // eslint-disable-line
						return false;
					}

					const expectedTimes = route.config.repeat;

					if (!expectedTimes) {
						return true;
					}
					const actualTimes = calls.length;

					if (expectedTimes > actualTimes) {
						console.warn(
							`Warning: ${route.config.name} only called ${actualTimes} times, but ${expectedTimes} expected`,
					); // eslint-disable-line
						return false;
					}
					return true;
				},
			)
			.every((isDone) => isDone);
	}
}
export default CallHistory;
