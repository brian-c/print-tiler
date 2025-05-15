import { promiseWithResolvers } from './promise-with-resolvers';

export async function loadImage(file: File) {
	const src = URL.createObjectURL(file);
	const { promise, resolve, reject } = promiseWithResolvers<HTMLImageElement>();
	const img = document.createElement('img');
	img.onload = () => resolve(img);
	img.onerror = (...args) => reject(args);
	img.src = src;
	return promise;
}
