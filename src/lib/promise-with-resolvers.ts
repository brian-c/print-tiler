export function promiseWithResolvers<T>() {
	let resolve!: (value: T | PromiseLike<T>) => void;
	let reject!: (reason?: unknown) => void;

	const promise = new Promise<T>((innerResolve, innerReject) => {
		[resolve, reject] = [innerResolve, innerReject];
	});

	return { promise, resolve, reject };
}
