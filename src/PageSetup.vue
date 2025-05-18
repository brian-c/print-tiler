<script setup lang="ts">
import { pageSetup } from './lib/app-state';
import UnitInput from './UnitInput.vue';
</script>

<template>
	<fieldset>
		<legend>Page</legend>
		<table>
			<tbody>
				<tr>
					<th>
						<label for="page-steup-width">Width</label>
					</th>
					<td>
						<UnitInput id="page-steup-width" v-model="pageSetup.width" />
					</td>
				</tr>
				<tr>
					<th>
						<label for="page-steup-height">Height</label>
					</th>
					<td>
						<UnitInput id="page-steup-height" v-model="pageSetup.height" />
					</td>
				</tr>
				<tr>
					<th>
						<label for="page-steup-margin">Margin</label>
					</th>
					<td>
						<UnitInput id="page-steup-margin" v-model="pageSetup.margin" />
					</td>
				</tr>
				<tr>
					<th>
						<label for="page-steup-overlap">Overlap</label>
					</th>
					<td>
						<UnitInput id="page-steup-overlap" v-model="pageSetup.overlap" />
					</td>
				</tr>
			</tbody>
		</table>
		<button type="button" @click="() => [pageSetup.width, pageSetup.height] = [pageSetup.height, pageSetup.width]">
			Rotate
		</button>
	</fieldset>
</template>
