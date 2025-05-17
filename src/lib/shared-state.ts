import { ref } from 'vue';

const storedUnit = localStorage.getItem('unit') as 'mm' | 'in';
export const unit = ref<'mm' | 'in'>(storedUnit ?? 'in');
