<script setup lang="ts">
import { computed, reactive, useId } from 'vue';
import FileSelectionButton from './FileSelectionButton.vue';
import { images, pageSetup } from './lib/app-state';
import { createDragHandler } from './lib/create-drag-handler';
import { loadImage } from './lib/load-image';
import startViewTransition from './lib/start-view-transition';
import UnitInput from './UnitInput.vue';

const svgId = useId();

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

async function handleFileSelection(selection: File[]) {
	startViewTransition(async () => {
		for (const file of selection) {
			const img = await loadImage(file);
			images.push({
				file,
				img,
				width: img.width,
				height: img.height,
				x: 0,
				y: 0,
			});
		}
	});
}

function moveFile(from: number, to: number) {
	startViewTransition(() => {
		const file = images[from];
		if (!file) throw new Error('NO_FILE_AT_INDEX');
		images.splice(from, 1);
		images.splice(to, 0, file);
	});
}

function removeFile(file: File) {
	startViewTransition(async () => {
		const image = images.find(image => image.file === file);
		if (!image?.img.src) throw new Error('MISSING_FILE_SRC');
		URL.revokeObjectURL(image.img.src);
		const index = images.indexOf(image);
		images.splice(index, 1);
	});
}

const dragInProgress = reactive({
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

function handlePrintClick() {
	print();
}
</script>

<template>
	<div class="screen-only">
		<fieldset>
			<legend>Files</legend>

			<table v-if="images.length !== 0">
				<tbody>
					<tr v-for="image, i in images" :key="image.img.src" :style="`view-transition-name: row-${image.file.name.replace(/\W/g, '')};`">
						<td style="scale: 0.6;">
							<button type="button" :disabled="i === 0" @click="moveFile(i, i - 1)">
								↑
							</button>
							<br>
							<button type="button" :disabled="i === images.length - 1" @click="moveFile(i, i + 1)">
								↓
							</button>
						</td>
						<td>
							<img :src="image.img.src" height="32">
						</td>
						<td>
							{{ image.file.name }}
						</td>
						<td>
							<UnitInput v-model="image.x">x</UnitInput>
						</td>
						<td>
							<UnitInput v-model="image.y">y</UnitInput>
						</td>
						<td>
							<UnitInput v-model="image.width">
								w
								<template #after>
									<button type="button" @click="image.width = image.height * image.img.naturalWidth / image.img.naturalHeight">
										⧉
									</button>
								</template>
							</UnitInput>
						</td>
						<td>
							<UnitInput v-model="image.height">
								h
								<template #after>
									<button type="button" @click="image.height = image.width * image.img.naturalHeight / image.img.naturalWidth">
										⧉
									</button>
								</template>
							</UnitInput>
						</td>
						<td>
							<button type="button" @click="removeFile(image.file)">
								&times;
							</button>
						</td>
					</tr>
				</tbody>
			</table>

			<FileSelectionButton v-slot="{ handleClick }" @select="handleFileSelection">
				<button type="button" @click="handleClick">Add image</button>
			</FileSelectionButton>
		</fieldset>

		<fieldset>
			<legend>Page</legend>
			<UnitInput v-model="pageSetup.width">Width</UnitInput>&ensp;
			<UnitInput v-model="pageSetup.height">Height</UnitInput>&ensp;
			<UnitInput v-model="pageSetup.margin">Margin</UnitInput>&ensp;
			<UnitInput v-model="pageSetup.overlap">Overlap</UnitInput>&ensp;
			<button type="button" @click="() => [pageSetup.width, pageSetup.height] = [pageSetup.height, pageSetup.width]">
				Rotate
			</button>
		</fieldset>

		<fieldset>
			<legend>Output</legend>

			<div class="sheets" :style="`--across: ${tiles.across}; --down: ${tiles.down};`">
				<template v-for="_y, y in tiles.down" :key="y">
					<template v-for="_x, x in tiles.across" :key="x">
						<svg
							:viewBox="[0, 0, pageSetup.width, pageSetup.height].join(' ')"
							class="sheet"
						>
							<use
								:href="`#${svgId}-tile-${x}-${y}`"
								:x="pageSetup.margin"
								:y="pageSetup.margin"
								:width="pageSetup.width - pageSetup.margin * 2"
								:height="pageSetup.height - pageSetup.margin * 2"
							/>

							<rect
								v-for="image, i in images"
								:key="image.img.src"
								:x="(offset.x + pageSetup.margin + image.x) + -1 * x * tiles.width + x * pageSetup.overlap * 2 + (image === dragInProgress.image ? dragInProgress.x : 0)"
								:y="(offset.y + pageSetup.margin + image.y) + -1 * y * tiles.height + y * pageSetup.overlap * 2 + (image === dragInProgress.image ? dragInProgress.y : 0)"
								:width="image.width"
								:height="image.height"
								class="draggable"
								:class="{active: image === dragInProgress.image}"
								:data-index="i"
								@pointerdown.capture="handleImageDrag"
							/>

						</svg>
					</template>
				</template>
			</div>

			<br>
			<button type="button" @click="handlePrintClick">Save PDF</button>
		</fieldset>
	</div>

	<div hidden>
		<svg
			:id="svgId"
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

	<div class="print-only">
		<template v-for="_y, y in tiles.down" :key="y">
			<template v-for="_x, x in tiles.across" :key="x">
				<svg
					:id="`${svgId}-tile-${x}-${y}`"
					class="tile"
					:viewBox="[0, 0, tiles.width, tiles.height].join(' ')"
					:width="`${tiles.width}mm`"
					:height="`${tiles.height}mm`"
				>
					<use
						:href="`#${svgId}`"
						:x="-1 * x * tiles.width + x * pageSetup.overlap * 2 + offset.x"
						:y="-1 * y * tiles.height + y * pageSetup.overlap * 2 + offset.y"
					/>

					<template v-if="x !== 0">
						<line class="cut-mark" :x1="pageSetup.overlap" y1="10%" :x2="pageSetup.overlap" y2="20%" />
						<line class="cut-mark" :x1="pageSetup.overlap" y1="80%" :x2="pageSetup.overlap" y2="90%" />
					</template>

					<template v-if="x !== tiles.across - 1">
						<line class="cut-mark" :x1="tiles.width - pageSetup.overlap" y1="10%" :x2="tiles.width - pageSetup.overlap" y2="20%" />
						<line class="cut-mark" :x1="tiles.width - pageSetup.overlap" y1="80%" :x2="tiles.width - pageSetup.overlap" y2="90%" />
					</template>

					<template v-if="y !== 0">
						<line class="cut-mark" x1="10%" :y1="pageSetup.overlap" x2="20%" :y2="pageSetup.overlap" />
						<line class="cut-mark" x1="80%" :y1="pageSetup.overlap" x2="90%" :y2="pageSetup.overlap" />
					</template>

					<template v-if="y !== tiles.down - 1">
						<line class="cut-mark" x1="10%" :y1="tiles.height - pageSetup.overlap" x2="20%" :y2="tiles.height - pageSetup.overlap" />
						<line class="cut-mark" x1="80%" :y1="tiles.height - pageSetup.overlap" x2="90%" :y2="tiles.height - pageSetup.overlap" />
					</template>
				</svg>
			</template>
		</template>
	</div>
</template>

<style scoped>
@media not screen { .screen-only { display: none; } }
@media not print { .print-only { display: none; } }

.sheets {
	--across: 1;
	--down: 1;
	align-items: center;
	display: inline-grid;
	gap: 8px;
	grid-template-columns: repeat(var(--across), 1fr);
	grid-template-rows: repeat(var(--down), 1fr);
	justify-content: center;
}

.sheet {
	background: white;
	border: 1px solid;
	box-shadow: 2px 2px 0 -1px #0006;
	width: 100%;
}

.tile {
	break-after: page;
}

.image {
	cursor: move;
}

.cut-mark {
	stroke: v-bind("pageSetup.cutMarkColor");
	stroke-width: 0.1mm;
}

.draggable {
	fill: transparent;
	stroke: transparent;
	stroke-width: 1px;

	&:hover {
		stroke: LinkText;
	}
	&.active {
		stroke: ActiveText;
	}
}
</style>
