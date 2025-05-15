<script setup lang="ts">
import { reactive, watch } from 'vue';
import { createDragHandler } from './lib/create-drag-handler';

const { files } = defineProps<StaticOutputProps>();
let internalFiles = reactive(files);
watch([files], () => internalFiles = files);

// const emit = defineEmits<{
// 	change: [states: FileState[]];
// }>();

const handleBoxDown = createDragHandler((down, drag, release, state: unknown) => {
	if (!(down.target instanceof Element)) return;
	const svg = down.target.closest('svg');
	if (!svg) return;

	const downSvgPoint = svg.createSVGPoint();
	downSvgPoint.x = down.x;
	downSvgPoint.y = down.y;
	const downDomPoint = downSvgPoint.matrixTransform(svg.getScreenCTM()?.inverse());

	const start = { x: state.x, y: state.y };

	if (drag) {
		const dragSvgPoint = svg.createSVGPoint();
		dragSvgPoint.x = drag.x;
		dragSvgPoint.y = drag.y;
		const dragDomPoint = dragSvgPoint.matrixTransform(svg.getScreenCTM()?.inverse());

		state.x = start.x + dragDomPoint.x - downDomPoint.x;
		state.y = start.x + dragDomPoint.y - downDomPoint.y;
	} else if (release) {
		console.log();
	}
});
</script>

<template>
	<svg>
		<g
			v-for="state in internalFiles"
			:key="state.src"
		>
			<rect
				:x="state.x"
				:y="state.y"
				:width="state.width"
				:height="state.height"
				fill="transparent"
				stroke="magenta"
				:stroke-width="3"
				@pointerdown="handleBoxDown($event, state)"
			/>

			<circle
				:cx="state.x + state.width"
				:cy="state.y + state.height"
				:r="16"
				fill="magenta"
			/>
		</g>
	</svg>
</template>

<style scoped>
circle {
	cursor: move;
}
</style>
