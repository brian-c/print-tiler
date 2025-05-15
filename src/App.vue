<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, toRaw, useId, watch } from 'vue';
import { loadImage } from './lib/load-image';
import { get as idbGet, set as idbSet } from 'idb-keyval';

export interface FileState {
	file: File;
	src: string;
	width: number;
	height: number;
	x: number;
	y: number;
}

const STORED_FILES_KEY = 'STORED_FILES';

const id = useId();
const internal = reactive({ fileInputResetting: false });
const page = reactive({ width: 11 * 25.4, height: 8.5 * 25.4, margin: 0.5 * 25.4 });

const files = reactive<FileState[]>([]);
watch([files], () => idbSet(STORED_FILES_KEY, toRaw(files)));

const bbox = computed(() => {
	const bounds = Array.from(files).reduce((box, state) => {
		return [
			Math.min(box[1], state.y),
			Math.max(box[2], state.x + state.width),
			Math.max(box[3], state.y + state.height),
			Math.min(box[0], state.x),
		] as const;
	}, [Infinity, Infinity, -Infinity, -Infinity] as const);

	const [top, right, bottom, left] = bounds;

	return {
		x: left,
		y: top,
		width: right - left,
		height: bottom - top,
	} as const;
});

const tiles = computed(() => ({
	across: Math.ceil(bbox.value.width / (page.width - page.margin * 2)),
	down: Math.ceil(bbox.value.height / (page.height - page.margin * 2)),
	width: page.width - page.margin * 2,
	height: page.height - page.margin * 2,
}));

onMounted(async () => {
	if (files.length === 0) {
		const storedFiles = await idbGet<FileState[]>(STORED_FILES_KEY);
		if (storedFiles) {
			for (const state of storedFiles) {
				URL.revokeObjectURL(state.src);
				const img = await loadImage(state.file);
				state.src = img.src;
			}
			files.push(...storedFiles);
		}
	}
});

async function handleFileSelection(event: Event) {
	if (!(event.currentTarget instanceof HTMLInputElement)) throw new Error('MISSING_INPUT');
	if (!event.currentTarget.files) throw new Error('MISSING_INPUT_FILES');

	for (const file of event.currentTarget.files) {
		const img = await loadImage(file);
		files.push({
			file,
			src: img.src,
			width: img.width,
			height: img.height,
			x: img.width / -2,
			y: img.height / -2,
		});
	}

	internal.fileInputResetting = true;
	await nextTick();
	internal.fileInputResetting = false;
}

function removeFile(file: File) {
	const state = files.find(state => state.file === file);
	if (!state?.src) throw new Error('MISSING_FILE_SRC');
	URL.revokeObjectURL(state.src);
	const index = files.indexOf(state);
	files.splice(index, 1);
}
</script>

<template>
	<section>
		Files
		<input v-if="!internal.fileInputResetting" type="file" multiple @change="handleFileSelection">

		<table v-if="files.length !== 0">
			<tbody>
				<tr v-for="state, i in files" :key="state.src">
					<td>
						<img :src="state.src" height="32">
					</td>
					<td>
						{{ state.file.name }}
					</td>
					<td>
						<label>
							x:
							<input v-model="state.x" type="number" class="dimension">
						</label>
					</td>
					<td>
						<label>
							y:
							<input v-model="state.y" type="number" class="dimension">
						</label>
					</td>
					<td>
						<label>
							w:
							<input v-model="state.width" type="number" class="dimension">
						</label>
					</td>
					<td>
						<label>
							h:
							<input v-model="state.height" type="number" class="dimension">
						</label>
					</td>
					<td>
						<button type="button" :disabled="i === 0">
							↑
						</button>
						<button type="button" :disabled="i === files.length - 1">
							↓
						</button>
					</td>
					<td>
						<button type="button" @click="removeFile(state.file)">
							&times;
						</button>
					</td>
				</tr>
			</tbody>
		</table>
	</section>

	<section>
		Page
		<div>
			<label>
				w:
				<input v-model="page.width" type="number" class="dimension">
			</label>
			<label>
				h:
				<input v-model="page.height" type="number" class="dimension">
			</label>
			&emsp;
			<label>
				margin:
				<input v-model="page.margin" type="number" class="dimension">
			</label>
		</div>
	</section>

	<svg
		v-if="files.length !== 0"
		:viewBox="`0 0 ${page.width * tiles.across} ${page.height * tiles.down}`"
		:width="page.width * tiles.across"
		:height="page.height * tiles.down"
	>
		<defs>
			<svg
				:id="id"
				:viewBox="`${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`"
				:width="bbox.width"
				:height="bbox.height"
			>
				<image
					v-for="file in files"
					:key="file.src"
					:href="file.src"
					:x="file.x"
					:y="file.y"
					:width="file.width"
					:height="file.height"
					preserveAspectRatio="none"
				/>
			</svg>
		</defs>

		<template v-for="_y, y in tiles.down" :key="y">
			<g v-for="_x, x in tiles.across" :key="`${x}, ${y}`">
				<svg
					:x="x * page.width + page.margin"
					:y="y * page.height + page.margin"
					:width="tiles.width"
					:height="tiles.height"
				>
					<rect
						x="0"
						y="0"
						width="100%"
						height="100%"
						fill="none"
						stroke="CurrentColor"
					/>

					<use
						:href="`#${id}`"
						:x="-1 * x * tiles.width"
						:y="-1 * y * tiles.height"
						:width="bbox.width"
						:height="bbox.height"
					/>
				</svg>
			</g>
		</template>
	</svg>
</template>

<style scoped>
label:has(.dimension) {
	white-space: nowrap;
}

.dimension {
	field-sizing: content;
	min-inline-size: 4ch;
}

svg {
	border: 1px solid lime;
	/* overflow: visible; */
}
</style>
