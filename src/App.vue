<script setup lang="ts">
import { computed, reactive, useId } from 'vue';
import FileSelectionButton from './FileSelectionButton.vue';
import { images, pageSetup } from './lib/app-state';
import { createDragHandler } from './lib/create-drag-handler';
import { loadImage } from './lib/load-image';
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
	document.startViewTransition(async () => {
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
	document.startViewTransition(() => {
		const file = images[from];
		if (!file) throw new Error('NO_FILE_AT_INDEX');
		images.splice(from, 1);
		images.splice(to, 0, file);
	});
}

function removeFile(file: File) {
	document.startViewTransition(async () => {
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
	if (down.target instanceof SVGImageElement) {
		const index = parseFloat(down.target.getAttribute('data-index') ?? '');
		dragInProgress.image = images[index] ?? null;
	}

	if (drag) {
		dragInProgress.x += drag.movementX;
		dragInProgress.y += drag.movementY;
	}

	if (release) {
		document.startViewTransition(async () => {
			const apply = release instanceof PointerEvent || release.key === 'Enter';
			if (dragInProgress.image && apply) {
				dragInProgress.image.x += dragInProgress.x;
				dragInProgress.image.y += dragInProgress.y;
			}
			Object.assign(dragInProgress, { image: null, x: 0, y: 0 });
		});
	}
});

function handleSave() {
	alert('TODO');
}
</script>

<template>
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

		<svg
			v-if="images.length !== 0"
			:viewBox="`0 0 ${pageSetup.width * tiles.across} ${pageSetup.height * tiles.down}`"
			:width="pageSetup.width * tiles.across"
			:height="pageSetup.height * tiles.down"
		>
			<defs>
				<svg
					:id="svgId"
					:viewBox="`${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`"
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
						@pointerdown="handleImageDrag"
					/>
				</svg>
			</defs>

			<template v-for="_y, y in tiles.down" :key="y">
				<g v-for="_x, x in tiles.across" :key="`${x},${y}`">
					<rect
						class="page-outline"
						:x="x * pageSetup.width"
						:y="y * pageSetup.height"
						:width="pageSetup.width"
						:height="pageSetup.height"
					/>

					<svg
						class="tile"
						:x="x * pageSetup.width + pageSetup.margin"
						:y="y * pageSetup.height + pageSetup.margin"
						:width="tiles.width"
						:height="tiles.height"
					>
						<rect
							class="tile-outline"
							x="0"
							y="0"
							width="100%"
							height="100%"
						/>

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
				</g>
			</template>
		</svg>
		<br>
		<button type="button" @click="handleSave">Save PDF</button>
	</fieldset>
</template>

<style scoped>
svg {
	border: 1px solid;
	box-shadow: 2px 2px 0 -1px #0008;
}

.page-outline {
	fill: none;
	stroke: CurrentColor;
	stroke-width: 0.1;
}

.tile-outline {
	fill: none;
	stroke: CurrentColor;
	stroke-width: 1;
}

.image {
	cursor: move;
}

.cut-mark {
	stroke: v-bind("pageSetup.cutMarkColor");
	stroke-width: 2;
}
</style>
