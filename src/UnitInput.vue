<script setup lang="ts">
import { computed } from 'vue';
import { unit } from './lib/app-state';

defineOptions({ inheritAttrs: false });

const props = defineProps<{
	modelValue: number;
}>();

const emit = defineEmits<{
	'update:modelValue': [number];
}>();

const internalValue = computed({
	get() {
		if (unit.value === 'in') return parseFloat((props.modelValue / 25.4).toFixed(3));
		return parseFloat(props.modelValue.toFixed(3));
	},

	set(value) {
		if (unit.value === 'in') value *= 25.4;
		emit('update:modelValue', value);
	},
});
</script>

<template>
	<span class="wrapper">
		<component :is="$slots['default'] ? 'label' : 'span' " class="label">
			<slot></slot>

			<input v-model="internalValue" type="number" :step="unit === 'in' ? 1 / 8 : 1" v-bind="$attrs">
		</component>

		<slot name="after">
			{{ unit }}
		</slot>
	</span>
</template>

<style scoped>
.wrapper {
	display: inline-flex;
}

.label {
	display: flex;
	gap: 0.5ch;
}

input {
	field-sizing: content;
	min-inline-size: 4ch;
}
</style>
