import pluginVue from 'eslint-plugin-vue';

export default [
    ...pluginVue.configs['flat/recommended'],
    {
        rules: {
            'vue/multi-word-component-names': 'off',
            'no-unused-vars': ['warn', { 'argsIgnorePattern': '^_' }]
        },
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module'
        }
    },
    {
        ignores: ['.*', 'dist/*', 'node_modules/*']
    }
];
