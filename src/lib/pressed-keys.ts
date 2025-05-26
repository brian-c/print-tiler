import { reactive } from 'vue';

export const pressedKeys = reactive<Set<KeyboardEvent['key']>>(new Set());

addEventListener('keydown', function (event: KeyboardEvent) {
	pressedKeys.add(event.key);
});

addEventListener('keyup', function (event: KeyboardEvent) {
	pressedKeys.delete(event.key);
});
