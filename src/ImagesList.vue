<script setup lang="ts">
import FileSelectionButton from './FileSelectionButton.vue';
import { images } from './lib/app-state';
import { loadImage } from './lib/load-image';
import startViewTransition from './lib/start-view-transition';
import UnitInput from './UnitInput.vue';

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
</script>

<template>
	<fieldset>
		<legend>Images</legend>

		<ul v-if="images.length !== 0">
			<li v-for="image, i in images" :key="image.img.src" :style="`view-transition-name: row-${image.file.name.replace(/\W/g, '')};`">
				<details>
					<summary>
						<div style="scale: 0.6;">
							<button type="button" :disabled="i === 0" aria-label="Send back" @click="moveFile(i, i - 1)">
								↑
							</button>
							<br>
							<button type="button" :disabled="i === images.length - 1" aria-label="Bring forward" @click="moveFile(i, i + 1)">
								↓
							</button>
						</div>

						<div>
							<img :src="image.img.src" height="32">
						</div>

						<div>
							{{ image.file.name }}
						</div>

						<div>
							<button type="button" aria-label="Remove" @click="removeFile(image.file)">
								&times;
							</button>
						</div>
					</summary>

					<tr>
						<th>Left</th>
						<td>
							<UnitInput v-model="image.x" />
						</td>
					</tr>

					<tr>
						<th>Top</th>
						<td>
							<UnitInput v-model="image.y" />
						</td>
					</tr>

					<tr>
						<th>Width</th>
						<td>
							<UnitInput v-model="image.width">
								<template #after>
									<button type="button" @click="image.width = image.height * image.img.naturalWidth / image.img.naturalHeight">
										⧉
									</button>
								</template>
							</UnitInput>
						</td>
					</tr>
					<tr>
						<th>Height</th>
						<td>
							<UnitInput v-model="image.height">
								<template #after>
									<button type="button" @click="image.height = image.width * image.img.naturalHeight / image.img.naturalWidth">
										⧉
									</button>
								</template>
							</UnitInput>
						</td>
					</tr>
				</details>
			</li>
		</ul>

		<FileSelectionButton v-slot="{ handleClick }" accept="image/*" @select="handleFileSelection">
			<button type="button" @click="handleClick">Add image</button>
		</FileSelectionButton>
	</fieldset>
</template>

<style scoped>
summary {
	align-items: center;
	display: flex;
	gap: 1ch;
	vertical-align: middle;
}

ul {
	list-style: none;
	margin: 0;
	padding: 0;
}
</style>
