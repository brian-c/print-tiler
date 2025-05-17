import eslint from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript';
import 'eslint-plugin-only-warn';
import pluginVue from 'eslint-plugin-vue';

export default defineConfigWithVueTs(
	eslint.configs.recommended,
	pluginVue.configs['flat/recommended'],
	vueTsConfigs.strict,
	vueTsConfigs.stylistic,
	stylistic.configs.customize({
		indent: 'tab',
		braceStyle: '1tbs',
		semi: true,
	}),
	{
		rules: {
			'vue/html-indent': ['warn', 'tab'],
			'vue/html-self-closing': ['warn', { html: { normal: 'never' } }],
			'vue/max-attributes-per-line': ['warn', { singleline: { max: Infinity }, multiline: { max: 1 } }],
			'vue/singleline-html-element-content-newline': ['off'],
		},
	},
);
