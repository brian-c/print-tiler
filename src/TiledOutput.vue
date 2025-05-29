<script setup lang="ts">
import { computed, reactive } from 'vue';
import { images, pageSetup } from './lib/app-state';
import { createDragHandler, getSvgPoint } from './lib/create-drag-handler';
import { pressedKeys } from './lib/pressed-keys';
import startViewTransition from './lib/start-view-transition';
import utility from './utility.module.css';

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
	handle: null as SVGGeometryElement | null,
	downPoint: null as SVGPoint | null,
	dx: 0,
	dy: 0,
	dWidth: 0,
	dHeight: 0,
});

const handleImageDrag = createDragHandler((
	down,
	drag,
	release,
	image: typeof images[number],
	corner?: number,
) => {
	if (down) {
		if (!(down.target instanceof SVGGeometryElement)) throw new Error('DOWN_TARGET_NOT_SVG_GEOMETRY_ELEMENT');

		dragInProgress.image = image;
		dragInProgress.handle = down.target;
		dragInProgress.downPoint = getSvgPoint([down.clientX, down.clientY], down.target);
	}

	if (drag) {
		if (!dragInProgress.handle) throw new Error('NO_DRAG_TARGET');
		if (!dragInProgress.downPoint) throw new Error('NO_DOWN_POINT');

		const dragPoint = getSvgPoint([drag.clientX, drag.clientY], dragInProgress.handle);

		const dx = dragPoint.x - dragInProgress.downPoint.x;
		const dy = dragPoint.y - dragInProgress.downPoint.y;

		if (corner === 0) {
			dragInProgress.dx = dx;
			dragInProgress.dy = dy;
			dragInProgress.dWidth = -1 * dx;
			dragInProgress.dHeight = -1 * dy;
		} else if (corner === 1) {
			dragInProgress.dy = dy;
			dragInProgress.dWidth = dx;
			dragInProgress.dHeight = -1 * dy;
		} else if (corner === 2) {
			dragInProgress.dWidth = dx;
			dragInProgress.dHeight = dy;
		} else if (corner === 3) {
			dragInProgress.dx = dx;
			dragInProgress.dWidth = -1 * dx;
			dragInProgress.dHeight = dy;
		} else {
			dragInProgress.dx = dx;
			dragInProgress.dy = dy;
		}

		const maintainRatio = pressedKeys.has('Shift');
		if (maintainRatio) {
			if (!dragInProgress.image) throw new Error('NO_IMAGE');
			const ratio = dragInProgress.image.width / dragInProgress.image.height;
			const fixedDWidth = dragInProgress.dHeight * ratio;
			const fixedDHeight = dragInProgress.dWidth / ratio;
			if (fixedDWidth > fixedDHeight) {
				dragInProgress.dWidth = fixedDWidth;
			} else {
				dragInProgress.dHeight = fixedDHeight;
			}
		}
	}

	if (release) {
		startViewTransition(async () => {
			const apply = release instanceof PointerEvent || release.key === 'Enter';

			if (dragInProgress.image && apply) {
				const normalized = normalizedImages.value.find(n => n.image === dragInProgress.image);
				if (!normalized) throw new Error('NO_NORMALIZED_IMAGE');
				dragInProgress.image.x = normalized.x;
				dragInProgress.image.y = normalized.y;
				dragInProgress.image.width = normalized.width;
				dragInProgress.image.height = normalized.height;
			}

			dragInProgress.hovered = null;
			dragInProgress.image = null;
			dragInProgress.handle = null;
			dragInProgress.downPoint = null;
			dragInProgress.dx = 0;
			dragInProgress.dy = 0;
			dragInProgress.dWidth = 0;
			dragInProgress.dHeight = 0;
		});
	}
});

const normalizedImages = computed(() => {
	return images.map((image) => {
		let { x, y, width, height } = image;

		if (image === dragInProgress.image) {
			x += dragInProgress.dx;
			y += dragInProgress.dy;
			width += dragInProgress.dWidth;
			height += dragInProgress.dHeight;

			if (width < 0) {
				x += width;
				width *= -1;
			}

			if (height < 0) {
				y += height;
				height *= -1;
			}
		}

		return { image, x, y, width, height };
	});
});
</script>

<template>
	<fieldset :class="utility['screenOnly']">
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
							<g
								v-for="normalized in normalizedImages"
								:key="normalized.image.img.src"
								@pointerenter="dragInProgress.hovered = normalized.image"
								@pointerleave="dragInProgress.hovered = null"
							>
								<rect
									:x="(offset.x + pageSetup.margin + normalized.x) + -1 * x * tiles.width + x * pageSetup.overlap * 2"
									:y="(offset.y + pageSetup.margin + normalized.y) + -1 * y * tiles.height + y * pageSetup.overlap * 2"
									:width="normalized.width"
									:height="normalized.height"
									class="drag-handle"
									:class="{
										hover: normalized.image === dragInProgress.hovered && !dragInProgress.image,
										active: normalized.image === dragInProgress.image,
									}"
									@pointerdown="handleImageDrag($event, normalized.image)"
								/>

								<g :opacity="normalized.image === dragInProgress.hovered && !dragInProgress.image ? 1 : 0">
									<template v-for="[cx, cy], ci of [[0, 0], [1, 0], [1, 1], [0, 1]] as const" :key="[cx, cy].join(',')">
										<circle
											class="resize-handle"
											:cx="(offset.x + pageSetup.margin + normalized.x + cx * normalized.width) + -1 * x * tiles.width + x * pageSetup.overlap * 2"
											:cy="(offset.y + pageSetup.margin + normalized.y + cy * normalized.height) + -1 * y * tiles.height + y * pageSetup.overlap * 2"
											@pointerdown="handleImageDrag($event, normalized.image, ci)"
										/>
									</template>
								</g>
							</g>
						</template>
					</svg>
				</template>
			</template>
		</div>
	</fieldset>

	<div :class="utility['printOnly']">
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
							class="cut-line"
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
						<line class="cut-line slot" :x1="tiles.width - pageSetup.overlap" y1="10%" :x2="tiles.width - pageSetup.overlap" y2="20%" />
						<line class="cut-line slot" :x1="tiles.width - pageSetup.overlap" y1="80%" :x2="tiles.width - pageSetup.overlap" y2="90%" />
					</template>

					<!-- Bottom slots -->
					<template v-if="y !== tiles.down - 1">
						<line class="cut-line slot" x1="10%" :y1="tiles.height - pageSetup.overlap" x2="20%" :y2="tiles.height - pageSetup.overlap" />
						<line class="cut-line slot" x1="80%" :y1="tiles.height - pageSetup.overlap" x2="90%" :y2="tiles.height - pageSetup.overlap" />
					</template>

					<!-- Left tabs -->
					<template v-if="x !== 0">
						<path
							class="cut-line"
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
				v-for="normalized in normalizedImages"
				:key="normalized.image.img.src"
				:href="normalized.image.img.src"
				:x="normalized.x"
				:y="normalized.y"
				:width="normalized.width"
				:height="normalized.height"
				preserveAspectRatio="none"
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
	box-shadow: 2px 2px 0 -1px #0003;
	box-sizing: border-box;
	display: block;
	height: auto;
	width: 100%;
}

.tile {
	break-after: page;
}

.cut-line {
	fill: none;
	stroke: v-bind("pageSetup.cutMarkColor");
	stroke-width: 1;

	@media print {
		stroke-width: 0.1mm;
	}
}

.drag-handle {
	cursor: move;
	fill: transparent;
	stroke: transparent;
	stroke-width: 1px;

	&.hover {
		stroke: LinkText;
	}

	&.active {
		stroke: LinkText;
	}
}

.resize-handle {
	fill: color-mix(in srgb, LinkText 50%, transparent);
	r: 4px;
	stroke: LinkText;
	stroke-width: 1px;

	&:nth-of-type(1),
	&:nth-of-type(3) {
		cursor: nwse-resize;
	}

	&:nth-of-type(2),
	&:nth-of-type(4) {
		cursor: nesw-resize;
	}
}
</style>
