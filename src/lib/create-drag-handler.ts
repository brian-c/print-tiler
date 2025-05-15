export function createDragHandler<T>(
	handler: (
		downEvent: PointerEvent,
		moveEvent: PointerEvent | null,
		upEvent: PointerEvent | null,
		arg: T,
	) => void,
) {
	return function handleDown(downEvent: PointerEvent, arg: T) {
		event?.preventDefault();
		addEventListener('pointermove', handleDrag);
		addEventListener('pointerup', handleRelease);
		handler(downEvent, null, null, arg);

		function handleDrag(moveEvent: PointerEvent) {
			handler(downEvent, moveEvent, null, arg);
		}

		function handleRelease(upEvent: PointerEvent) {
			removeEventListener('pointermove', handleDrag);
			removeEventListener('pointerup', handleRelease);
			handler(downEvent, null, upEvent, arg);
		}
	};
}
