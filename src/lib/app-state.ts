import { reactive, ref, toRaw, watch } from 'vue';
import { get as idbGet, set as idbSet, del as idbDelete } from 'idb-keyval';
import { loadImage } from './load-image';

interface StoredState {
	pageSetup: PageSetup;
	images: (Omit<ImageState, 'img'> & { img: { src: string } })[];
	unit: Unit;
}

interface PageSetup {
	width: number;
	height: number;
	margin: number;
	overlap: number;
	cutMarkColor: string;
}

interface ImageState {
	file: File;
	img: HTMLImageElement;
	x: number;
	y: number;
	width: number;
	height: number;
}

type Unit = 'mm' | 'in';

export const pageSetup = reactive({
	width: 11 * 25.4,
	height: 8.5 * 25.4,
	margin: 0.5 * 25.4,
	overlap: 0.25 * 25.4,
	cutMarkColor: '#ff0000',
});

export const images = reactive<ImageState[]>([]);

export const unit = ref<Unit>('in');

const STORED_STATE_KEY = 'print-tiler-state';

const storedState = await idbGet<StoredState>(STORED_STATE_KEY);

if (storedState) {
	try {
		Object.assign(pageSetup, storedState.pageSetup);
		const storedImages = await Promise.all(storedState.images.map(async (storedImage) => {
			const img = await loadImage(storedImage.file);
			return { ...storedImage, img };
		}));

		images.splice(0, Infinity, ...storedImages);

		unit.value = storedState.unit;
	} catch (error) {
		console.error('Failed to restore state', error);
		idbDelete(STORED_STATE_KEY);
	}
}

watch([images], () => {
	const minX = Math.min(...images.map(image => image.x));
	const minY = Math.min(...images.map(image => image.y));
	for (const image of images) {
		image.x -= minX;
		image.y -= minY;
	}
});

watch([pageSetup, images, unit], () => idbSet(STORED_STATE_KEY, {
	pageSetup: toRaw(pageSetup),
	images: toRaw(images.map(state => ({ ...state, img: { src: state.img.src } }))),
	unit: toRaw(unit.value),
}));
