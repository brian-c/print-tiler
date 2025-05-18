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
						<label for="page-setup-width">Width</label>
					</th>
					<td>
						<UnitInput id="page-setup-width" v-model="pageSetup.width" />
					</td>
				</tr>
				<tr>
					<th>
						<label for="page-setup-height">Height</label>
					</th>
					<td>
						<UnitInput id="page-setup-height" v-model="pageSetup.height" />
					</td>
				</tr>
				<tr>
					<th>
						<label for="page-setup-margin">Margin</label>
					</th>
					<td>
						<UnitInput id="page-setup-margin" v-model="pageSetup.margin" />
					</td>
				</tr>
				<tr>
					<th>
						<label for="page-setup-overlap">Overlap</label>
					</th>
					<td>
						<UnitInput id="page-setup-overlap" v-model="pageSetup.overlap" />
					</td>
				</tr>
				<tr>
					<th>
						<label for="page-setup-overlap">Cut lines</label>
					</th>
					<td>
						<input id="page-setup-cut-color" v-model="pageSetup.cutMarkColor" type="color" />
					</td>
				</tr>
			</tbody>
		</table>
		<button type="button" @click="() => [pageSetup.width, pageSetup.height] = [pageSetup.height, pageSetup.width]">
			Rotate
		</button>
	</fieldset>
</template>
