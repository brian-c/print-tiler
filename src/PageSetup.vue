<script setup lang="ts">
import { computed } from 'vue';
import { pageSetup, unit } from './lib/app-state';
import startViewTransition from './lib/start-view-transition';
import { tiles, tilesCount, tilesCountIfRotated } from './lib/tiles';
import UnitInput from './UnitInput.vue';

function rotatePages() {
	startViewTransition(() => {
		[pageSetup.width, pageSetup.height] = [pageSetup.height, pageSetup.width];
	});
}
</script>

<template>
	<fieldset>
		<legend>Page setup</legend>
		<table>
			<tbody>
				<tr>
					<th>
						<label for="page-setup-width">Width</label>
					</th>
					<td>
						<UnitInput id="page-setup-width" v-model="pageSetup.width">
							<template #after>
								<select id="page-setup-unit" v-model="unit" aria-label="Unit">
									<option value="mm">mm</option>
									<option value="in">in</option>
								</select>
							</template>
						</UnitInput>
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
						<input id="page-setup-cut-color" v-model="pageSetup.cutMarkColor" type="color">
					</td>
				</tr>
			</tbody>
		</table>

		<p style="text-align: center;">
			<button type="button" @click="rotatePages">
				Rotate pages
				<template v-if="tilesCount === tilesCountIfRotated">
					({{ tilesCount }})
				</template>
				<template v-else>
					({{ tilesCount }}→{{ tilesCountIfRotated }})
				</template>
			</button>
		</p>
	</fieldset>
</template>
