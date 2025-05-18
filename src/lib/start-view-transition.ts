export default function startViewTransition(fn: () => void) {
	if ('startViewTransition' in document) {
		document.startViewTransition(fn);
	} else {
		fn();
	}
}
