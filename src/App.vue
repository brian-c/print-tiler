<script setup lang="ts">
import ImagesList from './ImagesList.vue';
import { images } from './lib/app-state';
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

			<hr>
			<p class="attribution">
				By <a href="https://brian.carstensen.dev/" target="brian-home">Brian Carstensen</a>
				<br>
				<a href="https://github.com/brian-c/print-tiler/" target="source">Source on GitHub</a>
			</p>
		</div>

		<div class="preview">
			<div v-if="images.length === 0" class="intro">
				<h1>Print Tiler</h1>
				<p>Add an image, set its size, and Print Tiler will spread it across as many pages as it needs to.</p>
			</div>

			<TiledOutput v-else />
		</div>
	</div>
</template>

<style scoped>
@media screen {
	.layout {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
	}

	.controls {
		flex: 1;
		float: inline-start;
	}

	.attribution {
		font-size: smaller;
		text-align: center;
	}

	.intro {
		bottom: 0;
		max-width: 60ch;
		position: sticky;
		text-align: center;
		text-wrap: balance;
	}

	.preview {
		flex: 3 0 50%;

		&:has(.intro) {
			align-items: center;
			display: flex;
			flex-direction: column;
			justify-content: center;
		}
	}
}
</style>
