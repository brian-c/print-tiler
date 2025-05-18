<script setup lang="ts">
import ImagesList from './ImagesList.vue';
import media from './media.module.css';
import PageSetup from './PageSetup.vue';
import TiledOutput from './TiledOutput.vue';

function handlePrintClick() {
	print();
}
</script>

<template>
	<div class="layout">
		<div class="controls" :class="media['screenOnly']">
			<ImagesList />
			<PageSetup />

			<p style="text-align: center;">
				<button type="button" @click="handlePrintClick">Print</button>
			</p>
		</div>

		<div class="preview">
			<TiledOutput />
		</div>
	</div>
</template>

<style scoped>
@media screen {
	.layout {
		display: flex;
	}

	.controls {
		flex: 1;
		float: inline-start;
	}

	.preview {
		flex: 3;
	}
}
</style>
