<script setup lang="ts">
import { nextTick, ref } from 'vue';

defineOptions({ inheritAttrs: false });

const emit = defineEmits<{
	select: [File[]];
}>();

const input = ref<HTMLInputElement>();
const resetting = ref(false);

function handleClick() {
	input.value?.click();
}

async function handleFileSelection(event: Event) {
	if (!(event.currentTarget instanceof HTMLInputElement)) throw new Error('MISSING_INPUT');
	if (!event.currentTarget.files) throw new Error('MISSING_INPUT_FILES');

	emit('select', Array.from(event.currentTarget.files));

	resetting.value = true;
	await nextTick();
	resetting.value = false;
}
</script>

<template>
	<slot :handle-click="handleClick">
		<button type="button" @click="handleClick">Pick a file</button>
	</slot>

	<input v-if="!resetting" ref="input" type="file" multiple v-bind="$attrs" @change="handleFileSelection">
</template>

<style scoped>
input {
	display: none;
}
</style>
