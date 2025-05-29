const batch: (() => void)[] = [];
let timeout = NaN;

export default function startViewTransition(fn: () => void) {
	clearTimeout(timeout);
	batch.push(fn);
	timeout = setTimeout(commit, 10);
}

function commit() {
	if ('startViewTransition' in document) {
		document.startViewTransition(runQueue);
	} else {
		runQueue();
	}
}

function runQueue() {
	const running = Promise.all(batch.map(fn => fn()));
	batch.splice(0, Infinity);
	return running;
}
