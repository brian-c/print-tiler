<script setup lang="ts">
import { computed, reactive } from 'vue';
import { images, pageSetup } from './lib/app-state';
import { createDragHandler } from './lib/create-drag-handler';
import startViewTransition from './lib/start-view-transition';
import media from './media.module.css';

const bbox = computed(() => {
	const bounds = Array.from(images).reduce((current, file) => {
		return [
			Math.min(current[0], file.y),
			Math.max(current[1], file.x + file.width),
			Math.max(current[2], file.y + file.height),
			Math.min(current[3], file.x),
		] as const;
	}, [Infinity, -Infinity, -Infinity, Infinity] as const);

	const [top, right, bottom, left] = bounds;

	return {
		x: left,
		y: top,
		width: right - left,
		height: bottom - top,
	} as const;
});

const tiles = computed(() => {
	const width = pageSetup.width - pageSetup.margin * 2;
	let tiledBboxWidth = Infinity;
	let across = 0;
	while (tiledBboxWidth > width * across - pageSetup.overlap * (across - 1)) {
		across += 1;
		tiledBboxWidth = bbox.value.width + pageSetup.overlap * (across - 1);
	}

	const height = pageSetup.height - pageSetup.margin * 2;
	let tiledBboxHeight = Infinity;
	let down = 0;
	while (tiledBboxHeight > height * down - pageSetup.overlap * (down - 1)) {
		down += 1;
		tiledBboxHeight = bbox.value.height + pageSetup.overlap * (down - 1);
	}

	return { width, height, across, down, tiledBboxWidth, tiledBboxHeight };
});

const offset = computed(() => {
	const { width, height, across, down, tiledBboxWidth, tiledBboxHeight } = tiles.value;
	return {
		x: (width * across - tiledBboxWidth - pageSetup.overlap * (across - 1)) / 2,
		y: (height * down - tiledBboxHeight - pageSetup.overlap * (down - 1)) / 2,
	};
});

const dragInProgress = reactive({
	hovered: null as typeof images[number] | null,
	image: null as typeof images[number] | null,
	x: 0,
	y: 0,
});

const handleImageDrag = createDragHandler((down, drag, release) => {
	if (down.currentTarget instanceof SVGRectElement) {
		const index = parseFloat(down.currentTarget.getAttribute('data-index') ?? '');
		dragInProgress.image = images[index] ?? null;
	}

	if (drag) {
		dragInProgress.x += drag.movementX;
		dragInProgress.y += drag.movementY;
	}

	if (release) {
		startViewTransition(async () => {
			const apply = release instanceof PointerEvent || release.key === 'Enter';
			if (dragInProgress.image && apply) {
				dragInProgress.image.x += dragInProgress.x;
				dragInProgress.image.y += dragInProgress.y;
			}
			Object.assign(dragInProgress, { image: null, x: 0, y: 0 });
		});
	}
});
</script>

<template>
	<fieldset :class="media['screenOnly']">
		<legend>Output</legend>

		<div class="sheets">
			<template v-for="_y, y in tiles.down" :key="y">
				<template v-for="_x, x in tiles.across" :key="x">
					<svg
						:viewBox="[0, 0, pageSetup.width, pageSetup.height].join(' ')"
						class="sheet"
					>
						<use
							:href="`#tile-${x}-${y}`"
							:x="pageSetup.margin"
							:y="pageSetup.margin"
							:width="pageSetup.width - pageSetup.margin * 2"
							:height="pageSetup.height - pageSetup.margin * 2"
						/>

						<template v-if="images.length > 1">
							<rect
								v-for="image, i in images"
								:key="image.img.src"
								:x="(offset.x + pageSetup.margin + image.x) + -1 * x * tiles.width + x * pageSetup.overlap * 2 + (image === dragInProgress.image ? dragInProgress.x : 0)"
								:y="(offset.y + pageSetup.margin + image.y) + -1 * y * tiles.height + y * pageSetup.overlap * 2 + (image === dragInProgress.image ? dragInProgress.y : 0)"
								:width="image.width"
								:height="image.height"
								class="draggable"
								:class="{
									hover: image === dragInProgress.hovered && !dragInProgress.image,
									active: image === dragInProgress.image,
								}"
								:data-index="i"
								@pointerenter="dragInProgress.hovered = image"
								@pointerleave="dragInProgress.hovered = null"
								@pointerdown="handleImageDrag"
							/>
						</template>

					</svg>
				</template>
			</template>
		</div>
	</fieldset>

	<div :class="media['printOnly']">
		<template v-for="_y, y in tiles.down" :key="y">
			<template v-for="_x, x in tiles.across" :key="x">
				<svg
					:id="`tile-${x}-${y}`"
					class="tile"
					:viewBox="[0, 0, tiles.width, tiles.height].join(' ')"
					:width="`${tiles.width}mm`"
					:height="`${tiles.height}mm`"
				>
					<use
						href="#output"
						:x="-1 * x * tiles.width + x * pageSetup.overlap * 2 + offset.x"
						:y="-1 * y * tiles.height + y * pageSetup.overlap * 2 + offset.y"
					/>

					<!-- Top tabs -->
					<template v-if="y !== 0">
						<path
							class="cut-mark"
							:d="[
								['M', 0, pageSetup.overlap],
								['l', tiles.width / 10, 0],
								['l', 0, -0.95 * pageSetup.overlap],
								['l', tiles.width / 10, 0],
								['l', 0, 0.95 * pageSetup.overlap],
								['L', tiles.width - tiles.width / 5, pageSetup.overlap],
								['l', 0, -0.95 * pageSetup.overlap],
								['l', tiles.width / 10, 0],
								['l', 0, 0.95 * pageSetup.overlap],
								['L', tiles.width, pageSetup.overlap],
							].map(pair => `${pair[0]} ${pair.slice(1).join(',')}`).join(' ')"
						/>
					</template>

					<!-- Right slots -->
					<template v-if="x !== tiles.across - 1">
						<line class="cut-mark slot" :x1="tiles.width - pageSetup.overlap" y1="10%" :x2="tiles.width - pageSetup.overlap" y2="20%" />
						<line class="cut-mark slot" :x1="tiles.width - pageSetup.overlap" y1="80%" :x2="tiles.width - pageSetup.overlap" y2="90%" />
					</template>

					<!-- Bottom slots -->
					<template v-if="y !== tiles.down - 1">
						<line class="cut-mark slot" x1="10%" :y1="tiles.height - pageSetup.overlap" x2="20%" :y2="tiles.height - pageSetup.overlap" />
						<line class="cut-mark slot" x1="80%" :y1="tiles.height - pageSetup.overlap" x2="90%" :y2="tiles.height - pageSetup.overlap" />
					</template>

					<!-- Left tabs -->
					<template v-if="x !== 0">
						<path
							class="cut-mark"
							:d="[
								['M', pageSetup.overlap, 0],
								['l', 0, tiles.height / 10],
								['l', -0.95 * pageSetup.overlap, 0],
								['l', 0, tiles.height / 10],
								['l', 0.95 * pageSetup.overlap, 0],
								['L', pageSetup.overlap, tiles.height - tiles.height / 5],
								['l', -0.95 * pageSetup.overlap, 0],
								['l', 0, tiles.height / 10],
								['l', 0.95 * pageSetup.overlap, 0],
								['L', pageSetup.overlap, tiles.height],
							].map(pair => `${pair[0]} ${pair.slice(1).join(',')}`).join(' ')"
						/>
					</template>
				</svg>
			</template>
		</template>
	</div>

	<div hidden>
		<svg
			id="output"
			:viewBox="[bbox.x, bbox.y, bbox.width, bbox.height].join(' ')"
			:width="bbox.width"
			:height="bbox.height"
			style="overflow: visible;"
		>
			<image
				v-for="image, i in images"
				:key="image.img.src"
				:href="image.img.src"
				:x="image.x + (image === dragInProgress.image ? dragInProgress.x : 0)"
				:y="image.y + (image === dragInProgress.image ? dragInProgress.y : 0)"
				:width="image.width"
				:height="image.height"
				preserveAspectRatio="none"
				class="image"
				:data-index="i"
				@x-pointerdown="handleImageDrag"
			/>
		</svg>
	</div>
</template>

<style scoped>
.sheets {
	align-content: center;
	align-items: center;
	display: grid;
	gap: 8px;
	grid-template-columns: repeat(v-bind("tiles.across"), 1fr);
	grid-template-rows: repeat(v-bind("tiles.down"), auto);
	justify-content: center;
	justify-items: center;
}

.sheet {
	aspect-ratio: v-bind("pageSetup.width") / v-bind("pageSetup.height");
	background: white;
	border: 1px solid;
	box-shadow: 2px 2px 0 -1px;
	display: block;
	height: auto;
	width: 100%;

	.sheets.is-short > & {
		color: red;
	}
}

.tile {
	break-after: page;
}

.cut-mark {
	fill: none;
	stroke: v-bind("pageSetup.cutMarkColor");
	stroke-width: 1;

	@media print {
		stroke-width: 0.1mm;
	}
}

.draggable {
	cursor: move;
	fill: transparent;
	stroke: transparent;
	stroke-width: 1px;

	&.hover {
		stroke: LinkText;
	}

	&.active {
		stroke: ActiveText;
	}
}
</style>
