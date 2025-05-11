/** @type {import('stylelint').Config} */
export default {
	extends: [
		'stylelint-config-recommended-vue',
		'@stylistic/stylelint-config',
	],

	plugins: [
		'@stylistic/stylelint-plugin',
		'stylelint-order',
	],

	rules: {
		'@stylistic/indentation': 'tab',
		'order/properties-alphabetical-order': true,
	},
};
