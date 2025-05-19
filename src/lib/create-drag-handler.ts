export function createDragHandler<ExtraArgs extends unknown[]>(
	handler: (
		downEvent: PointerEvent,
		moveEvent: PointerEvent | null,
		upEvent: PointerEvent | KeyboardEvent | null,
		...args: ExtraArgs
	) => void,
) {
	return function handleDown(downEvent: PointerEvent, ...args: ExtraArgs) {
		downEvent.preventDefault();

		addEventListener('keydown', handleKey);
		addEventListener('pointermove', handleDrag);
		addEventListener('pointerup', handleRelease);

		handler(downEvent, null, null, ...args);

		function handleKey(event: KeyboardEvent) {
			if (['Escape', 'Enter'].includes(event.key)) handleRelease(event);
		}

		function handleDrag(moveEvent: PointerEvent) {
			handler(downEvent, moveEvent, null, ...args);
		}

		function handleRelease(upEvent: PointerEvent | KeyboardEvent) {
			removeEventListener('keydown', handleKey);
			removeEventListener('pointermove', handleDrag);
			removeEventListener('pointerup', handleRelease);

			handler(downEvent, null, upEvent, ...args);
		}
	};
}
