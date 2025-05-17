<script setup lang="ts">
import { get as idbGet, set as idbSet } from 'idb-keyval';
import { computed, onMounted, reactive, toRaw, useId, watch } from 'vue';
import FileSelectionButton from './FileSelectionButton.vue';
import { loadImage } from './lib/load-image';
import UnitInput from './UnitInput.vue';

interface PageSetup {
	width: number;
	height: number;
	margin: number;
	overlap: number;
	cutMarkColor: string;
}

interface FileState {
	file: File;
	img: HTMLImageElement;
	width: number;
	height: number;
	x: number;
	y: number;
}

const STORED_STATE_KEY = 'print-tiler-state';

const svgId = useId();

const page = reactive<PageSetup>({ width: 11 * 25.4, height: 8.5 * 25.4, margin: 0.5 * 25.4, overlap: 6, cutMarkColor: 'red' });
const files = reactive<FileState[]>([]);
watch([page, files], () => idbSet(STORED_STATE_KEY, {
	page: toRaw(page),
	files: toRaw(files.map(state => ({ ...state, img: { src: state.img.src } }))),
}));

const bbox = computed(() => {
	const bounds = Array.from(files).reduce((current, file) => {
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
	const width = page.width - page.margin * 2;
	let tiledBboxWidth = Infinity;
	let across = 0;
	while (tiledBboxWidth > width * across - page.overlap * (across - 1)) {
		across += 1;
		tiledBboxWidth = bbox.value.width + page.overlap * (across - 1);
	}

	const height = page.height - page.margin * 2;
	let tiledBboxHeight = Infinity;
	let down = 0;
	while (tiledBboxHeight > height * down - page.overlap * (down - 1)) {
		down += 1;
		tiledBboxHeight = bbox.value.height + page.overlap * (down - 1);
	}

	return { width, height, across, down, tiledBboxWidth, tiledBboxHeight };
});

const offset = computed(() => {
	const { width, height, across, down, tiledBboxWidth, tiledBboxHeight } = tiles.value;
	return {
		x: (width * across - tiledBboxWidth - page.overlap * (across - 1)) / 2,
		y: (height * down - tiledBboxHeight - page.overlap * (down - 1)) / 2,
	};
});

onMounted(async () => {
	if (files.length === 0) {
		const stored = await idbGet<{ page: PageSetup; files: FileState[] }>(STORED_STATE_KEY);

		if (stored) {
			Object.assign(page, stored.page);

			for (const state of stored.files) {
				URL.revokeObjectURL(state.img.src);
				const img = await loadImage(state.file);
				state.img = img;
				state.img.src = img.src;
			}
			files.splice(0, Infinity);
			files.push(...stored.files);
		}
	}
});

async function handleFileSelection(selection: File[]) {
	document.startViewTransition(async () => {
		for (const file of selection) {
			const img = await loadImage(file);
			files.push({
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
		const file = files[from];
		if (!file) throw new Error('NO_FILE_AT_INDEX');
		files.splice(from, 1);
		files.splice(to, 0, file);
	});
}

function removeFile(file: File) {
	document.startViewTransition(async () => {
		const state = files.find(state => state.file === file);
		if (!state?.img.src) throw new Error('MISSING_FILE_SRC');
		URL.revokeObjectURL(state.img.src);
		const index = files.indexOf(state);
		files.splice(index, 1);
	});
}
</script>

<template>
	<fieldset>
		<legend>Files</legend>

		<table v-if="files.length !== 0">
			<tbody>
				<tr v-for="state, i in files" :key="state.img.src" :style="`view-transition-name: ${state.file.name.replace(/\W/g, '')};`">
					<td style="scale: 0.6;">
						<button type="button" :disabled="i === 0" @click="moveFile(i, i - 1)">
							↑
						</button>
						<br>
						<button type="button" :disabled="i === files.length - 1" @click="moveFile(i, i + 1)">
							↓
						</button>
					</td>
					<td>
						<img :src="state.img.src" height="32">
					</td>
					<td>
						{{ state.file.name }}
					</td>
					<td>
						<UnitInput v-model="state.x">x</UnitInput>
					</td>
					<td>
						<UnitInput v-model="state.y">y</UnitInput>
					</td>
					<td>
						<UnitInput v-model="state.width">
							w
							<template #after>
								<button type="button" @click="state.width = state.height * state.img.naturalWidth / state.img.naturalHeight">
									⧉
								</button>
							</template>
						</UnitInput>
					</td>
					<td>
						<UnitInput v-model="state.height">
							h
							<template #after>
								<button type="button" @click="state.height = state.width * state.img.naturalHeight / state.img.naturalWidth">
									⧉
								</button>
							</template>
						</UnitInput>
					</td>
					<td>
						<button type="button" @click="removeFile(state.file)">
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
		<UnitInput v-model="page.width">Width</UnitInput>&ensp;
		<UnitInput v-model="page.height">Height</UnitInput>&ensp;
		<UnitInput v-model="page.margin">Margin</UnitInput>&ensp;
		<UnitInput v-model="page.overlap">Overlap</UnitInput>&ensp;
		<button type="button" @click="() => [page.width, page.height] = [page.height, page.width]">
			Rotate
		</button>
	</fieldset>

	<fieldset>
		<legend>Output</legend>

		<svg
			v-if="files.length !== 0"
			:viewBox="`0 0 ${page.width * tiles.across} ${page.height * tiles.down}`"
			:width="page.width * tiles.across"
			:height="page.height * tiles.down"
			style="height: auto; max-width: 100%;"
		>
			<defs>
				<svg
					:id="svgId"
					:viewBox="`${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`"
					:width="bbox.width"
					:height="bbox.height"
				>
					<image
						v-for="file in files"
						:key="file.img.src"
						:href="file.img.src"
						:x="file.x"
						:y="file.y"
						:width="file.width"
						:height="file.height"
						preserveAspectRatio="none"
					/>
				</svg>
			</defs>

			<template v-for="_y, y in tiles.down" :key="y">
				<g v-for="_x, x in tiles.across" :key="`${x},${y}`">
					<rect
						class="page-outline"
						:x="x * page.width"
						:y="y * page.height"
						:width="page.width"
						:height="page.height"
					/>

					<svg
						:x="x * page.width + page.margin"
						:y="y * page.height + page.margin"
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
							:x="-1 * x * tiles.width + x * page.overlap * 2 + offset.x"
							:y="-1 * y * tiles.height + y * page.overlap * 2 + offset.y"
						/>

						<template v-if="x !== 0">
							<line class="cut-mark" :x1="page.overlap" y1="10%" :x2="page.overlap" y2="20%" />
							<line class="cut-mark" :x1="page.overlap" y1="80%" :x2="page.overlap" y2="90%" />
						</template>

						<template v-if="x !== tiles.across - 1">
							<line class="cut-mark" :x1="tiles.width - page.overlap" y1="10%" :x2="tiles.width - page.overlap" y2="20%" />
							<line class="cut-mark" :x1="tiles.width - page.overlap" y1="80%" :x2="tiles.width - page.overlap" y2="90%" />
						</template>

						<template v-if="y !== 0">
							<line class="cut-mark" x1="10%" :y1="page.overlap" x2="20%" :y2="page.overlap" />
							<line class="cut-mark" x1="80%" :y1="page.overlap" x2="90%" :y2="page.overlap" />
						</template>

						<template v-if="y !== tiles.down - 1">
							<line class="cut-mark" x1="10%" :y1="tiles.height - page.overlap" x2="20%" :y2="tiles.height - page.overlap" />
							<line class="cut-mark" x1="80%" :y1="tiles.height - page.overlap" x2="90%" :y2="tiles.height - page.overlap" />
						</template>
					</svg>
				</g>
			</template>
		</svg>
		<br>
		<button type="button">Save PDF</button>
	</fieldset>
</template>

<style scoped>
svg {
	border: 1px solid;
}

.page-outline,
.tile-outline {
	fill: none;
	stroke: CurrentColor;
	stroke-width: 1;
}

.cut-mark {
	stroke: v-bind("page.cutMarkColor");
	stroke-width: 2;
}
</style>
