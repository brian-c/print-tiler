<script setup lang="ts">
import { computed, reactive } from 'vue';
import FileSelectionButton from './FileSelectionButton.vue';
import { images } from './lib/app-state';
import { loadImage } from './lib/load-image';
import startViewTransition from './lib/start-view-transition';
import UnitInput from './UnitInput.vue';

function getPpi(image: typeof images[number]) {
	return Array.from(new Set([
		parseFloat((image.img.naturalWidth / (image.width / 25.4)).toFixed(2)),
		parseFloat((image.img.naturalHeight / (image.height / 25.4)).toFixed(2)),
	])) as [number] | [number, number];
}

async function handleFileSelection(selection: File[]) {
	startViewTransition(async () => {
		for (const file of selection) {
			const img = await loadImage(file);
			const resolution = img.width > 600 ? 300 : 96;
			images.push({
				file,
				img,
				width: img.width / (resolution / 25.4),
				height: img.height / (resolution / 25.4),
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

function fixAspectRatio(image: typeof images[number], change: 'width' | 'height') {
	startViewTransition(() => {
		if (change === 'width') {
			image.width = image.height * image.img.naturalWidth / image.img.naturalHeight;
		} else {
			image.height = image.width * image.img.naturalHeight / image.img.naturalWidth;
		}
	});
}

const drag = reactive({ from: NaN, to: NaN });

function handleDragStart(index: number, event: DragEvent) {
	if (!(event.currentTarget instanceof Element)) return;
	if (!event.dataTransfer) return;
	const bbox = event.currentTarget.getBoundingClientRect();
	const offset = [event.clientX - bbox.left, event.clientY - bbox.top] as const;
	event.dataTransfer.setData('text/plain', 'Foo');
	event.dataTransfer.setDragImage(event.currentTarget, ...offset);
	event.dataTransfer.effectAllowed = 'move';
	startViewTransition(() => {
		drag.from = index;
		drag.to = index;
	});
}

function handleDragOver(index: number, event: DragEvent) {
	event.preventDefault();
	if (!(event.currentTarget instanceof Element)) return;
	if (!event.dataTransfer) return;
	event.dataTransfer.dropEffect = 'move';
	if (index !== drag.to) {
		startViewTransition(() => drag.to = index);
	}
}

function handleDrop() {
	startViewTransition(() => {
		images.splice(drag.to, 0, ...images.splice(drag.from, 1));
	});
}

function handleDragEnd() {
	startViewTransition(() => {
		drag.from = NaN;
		drag.to = NaN;
	});
}

const draggableImages = computed(() => {
	const clone = Array.from(images).map((image, actualIndex) => ({ actualIndex, image }));
	clone.splice(drag.to, 0, ...clone.splice(drag.from, 1));
	return clone;
});
</script>

<template>
	<fieldset>
		<legend>Images</legend>

		<ul v-if="images.length !== 0" @drop.prevent="handleDrop">
			<li
				v-for="{ actualIndex, image }, i in draggableImages"
				:key="image?.img.src ?? '--'"
				:class="{ dragging: actualIndex === drag.from }"
				:style="`view-transition-name: row-${image.file.name.replace(/\W/g, '')};`"
				@dragover.prevent="handleDragOver(i, $event)"
			>
				<div
					class="header"
					:draggable="images.length > 1 || (undefined as never)"
					@dragstart="handleDragStart(actualIndex, $event)"
					@dragend="handleDragEnd"
				>
					<div v-if="images.length > 1" style="scale: 0.8;">
						<button
							type="button"
							:disabled="actualIndex === 0"
							title="Send back"
							style="padding-inline: 0.2ch;"
							@click="moveFile(actualIndex, actualIndex - 1)"
						>
							▲
						</button>
						<br>
						<button
							type="button"
							:disabled="actualIndex === images.length - 1"
							title="Bring forward"
							style="padding-inline: 0.2ch;"
							@click="moveFile(actualIndex, actualIndex + 1)"
						>
							▼
						</button>
					</div>

					<div>
						<img :src="image.img.src" height="32">
					</div>

					<div>
						{{ image.file.name }}
					</div>

					<div>
						<button type="button" title="Remove" @click="removeFile(image.file)">
							✕
						</button>
					</div>
				</div>

				<table v-for="ppis of [getPpi(image)]" :key="String(ppis)">
					<tbody>
						<template v-if="images.length > 1">
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
						</template>

						<tr>
							<th>Width</th>
							<td>
								<UnitInput v-model="image.width">
									<template #after>
										<button
											v-if="ppis.length !== 1"
											type="button"
											class="ratio-fixer"
											:title="ppis[0] > ppis[1] ? 'Make wider' : 'Make narrower'"
											@click="fixAspectRatio(image, 'width')"
										>
											<template v-if="ppis[0] > ppis[1]">↦</template>
											<template v-else>↤</template>
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
										<button
											v-if="ppis.length !== 1"
											type="button"
											class="ratio-fixer"
											:title="ppis[0] > ppis[1] ? 'Make shorter' : 'Make taller'"
											@click="fixAspectRatio(image, 'height')"
										>
											<template v-if="ppis[0] > ppis[1]">↥</template>
											<template v-else>↧</template>
										</button>
									</template>
								</UnitInput>
							</td>
						</tr>

						<tr>
							<th>PPI</th>
							<td>
								<abbr v-if="ppis.length !== 1" title="Out of proportion">⚠</abbr>
								{{ ppis.join(' &times; ') }}
							</td>
						</tr>
					</tbody>
				</table>
			</li>
		</ul>

		<p style="text-align: center;">
			<FileSelectionButton v-slot="{ handleClick }" accept="image/*" @select="handleFileSelection">
				<button type="button" @click="handleClick">
					<template v-if="images.length === 0">Add an image</template>
					<template v-else>Add another image</template>
				</button>
			</FileSelectionButton>
		</p>
	</fieldset>
</template>

<style scoped>
:global(html:has(.dragging)) {
	cursor: grabbing;
}

ul {
	list-style: none;
	margin: 0;
	padding: 0;
}

li {
	&:not(:first-child) {
		border-block-start: 1px solid #8886;
		margin-block-start: 1ch;
		padding-block-start: 1ch;
	}

	&.dragging {
		opacity: 0.3;
	}
}

/* ul:has(.dragging) li table {
	display: none;
} */

.header {
	align-items: center;
	display: flex;
	gap: 1ch;
	vertical-align: middle;
}

.dragging .header {
	opacity: 0.5;
}

.header[draggable]:not(.dragging *) {
	cursor: grab;
	user-select: none;
}

.ratio-fixer {
	font-family: math;
}
</style>
