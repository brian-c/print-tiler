export function createDragHandler<ExtraArgs extends unknown[]>(
	handler: (
		downEvent: PointerEvent | null,
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
			if (moveEvent.pointerId !== downEvent.pointerId) return;
			handler(null, moveEvent, null, ...args);
		}

		function handleRelease(upEvent: PointerEvent | KeyboardEvent) {
			if (upEvent instanceof PointerEvent && upEvent.pointerId !== downEvent.pointerId) return;
			removeEventListener('keydown', handleKey);
			removeEventListener('pointermove', handleDrag);
			removeEventListener('pointerup', handleRelease);

			handler(null, null, upEvent, ...args);
		}
	};
}

export function getSvgPoint(x: number, y: number, element: SVGGeometryElement) {
	const svg = element.ownerSVGElement;
	if (!svg) throw new Error('NO_SVG_ANCESTOR');
	const point = svg.createSVGPoint();
	point.x = x;
	point.y = y;
	return point.matrixTransform(svg.getScreenCTM()?.inverse());
}

export function showTrail(svg: SVGSVGElement, point: SVGPoint, color = 'lime') {
	const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
	if (!(circle instanceof SVGCircleElement)) throw new Error('NOT_CIRCLE');
	circle.setAttribute('cx', point.x.toString());
	circle.setAttribute('cy', point.y.toString());
	circle.setAttribute('r', '2');
	circle.setAttribute('fill', color);
	svg.appendChild(circle);
	setTimeout(() => circle.remove(), 500);
}
