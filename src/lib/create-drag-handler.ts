export function createDragHandler<T>(
	handler: (
		downEvent: PointerEvent,
		moveEvent: PointerEvent | null,
		upEvent: PointerEvent | KeyboardEvent | null,
		arg?: T,
	) => void,
) {
	return function handleDown(downEvent: PointerEvent, arg?: T) {
		downEvent.preventDefault();

		addEventListener('keydown', handleKey);
		addEventListener('pointermove', handleDrag);
		addEventListener('pointerup', handleRelease);

		handler(downEvent, null, null, arg);

		function handleKey(event: KeyboardEvent) {
			if (['Escape', 'Enter'].includes(event.key)) handleRelease(event);
		}

		function handleDrag(moveEvent: PointerEvent) {
			handler(downEvent, moveEvent, null, arg);
		}

		function handleRelease(upEvent: PointerEvent | KeyboardEvent) {
			removeEventListener('keydown', handleKey);
			removeEventListener('pointermove', handleDrag);
			removeEventListener('pointerup', handleRelease);

			handler(downEvent, null, upEvent, arg);
		}
	};
}
