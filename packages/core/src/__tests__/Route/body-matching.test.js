import { afterEach, describe, expect, it, beforeAll } from 'vitest';
import Route from '../../Route';

describe('body matching', () => {
	it('should not match if no body provided in request', async () => {
		const route = new Route({ body: { foo: 'bar' } , response: 200});

		expect(route.matcher('http://a.com/', {
			method: 'POST',
		})).toBe(false);
	});

	it('should match if no content type is specified', async () => {
		const route = new Route({ body: { foo: 'bar' } , response: 200});

		expect(route.matcher('http://a.com/', {
			method: 'POST',
			body: JSON.stringify({ foo: 'bar' }),
		})).toBe(true);
	});

	it('should match when using Request', async () => {
		const route = new Route({ body: { foo: 'bar' } , response: 200});

		expect(route.matcher(
			new Request('http://a.com/', {
				method: 'POST',
				body: JSON.stringify({ foo: 'bar' }),
			}),
		)).toBe(true);
	});

	it('should match if body sent matches expected body', async () => {
		const route = new Route({ body: { foo: 'bar' } , response: 200});

		expect(route.matcher('http://a.com/', {
			method: 'POST',
			body: JSON.stringify({ foo: 'bar' }),
			headers: { 'Content-Type': 'application/json' },
		})).toBe(true);
	});

	it('should not match if body sent doesn’t match expected body', async () => {
		const route = new Route({ body: { foo: 'bar' } , response: 200});

		expect(route.matcher('http://a.com/', {
			method: 'POST',
			body: JSON.stringify({ foo: 'woah!!!' }),
			headers: { 'Content-Type': 'application/json' },
		})).toBe(false);
	});

	it('should not match if body sent isn’t JSON', async () => {
		const route = new Route({ body: { foo: 'bar' } , response: 200});

		expect(route.matcher('http://a.com/', {
			method: 'POST',
			body: new ArrayBuffer(8),
			headers: { 'Content-Type': 'application/json' },
		})).toBe(false);
	});

	it('should ignore the order of the keys in the body', async () => {
		const route = new Route({
			
				body: {
					foo: 'bar',
					baz: 'qux',
				},
			
			response: 200}
		)

		expect(route.matcher('http://a.com/', {
			method: 'POST',
			body: JSON.stringify({
				baz: 'qux',
				foo: 'bar',
			}),
			headers: { 'Content-Type': 'application/json' },
		})).toBe(true);
	});

	// TODO - I think this shoudl actually throw
	it('should ignore the body option matcher if request was GET', async () => {
		const route = new Route({
				body: {
					foo: 'bar',
					baz: 'qux',
				},
			
			response: 200}
		);

		expect(route.matcher('http://a.com/')).toBe(true);
	});

	describe('partial body matching', () => {
		it('match when missing properties', async () => {
			const route = new Route({ body: { ham: 'sandwich' }, matchPartialBody: true , response: 200});
			expect(route.matcher('http://a.com', {
				method: 'POST',
				body: JSON.stringify({ ham: 'sandwich', egg: 'mayonaise' }),
			})).toBe(true);
		});

		it('match when missing nested properties', async () => {
			const route = new Route(
				{ body: { meal: { ham: 'sandwich' } }, matchPartialBody: true ,
				response:200},
			)
			expect(route.matcher('http://a.com', {
				method: 'POST',
				body: JSON.stringify({
					meal: { ham: 'sandwich', egg: 'mayonaise' },
				}),
			})).toBe(true);
		});

		it('not match when properties at wrong depth', async () => {
			const route = new Route({ body: { ham: 'sandwich' }, matchPartialBody: true , response: 200});
			expect(route.matcher('http://a.com', {
				method: 'POST',
				body: JSON.stringify({ meal: { ham: 'sandwich' } }),
			})).toBe(false);
		});

		it('match when starting subset of array', async () => {
			const route = new Route({ body: { ham: [1, 2] }, matchPartialBody: true , response: 200});
			expect(route.matcher('http://a.com', {
				method: 'POST',
				body: JSON.stringify({ ham: [1, 2, 3] }),
			})).toBe(true);
		});

		it('not match when not starting subset of array', async () => {
			const route = new Route({ body: { ham: [1, 3] }, matchPartialBody: true , response: 200});
			expect(route.matcher('http://a.com', {
				method: 'POST',
				body: JSON.stringify({ ham: [1, 2, 3] }),
			})).toBe(false)
		});
	});
});
