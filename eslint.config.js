// SPDX-License-Identifier: GPL-3.0-or-later
import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import skipFormatting from 'eslint-config-prettier'

export default defineConfigWithVueTs(
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'playwright-report/**'] },
  js.configs.recommended,
  pluginVue.configs['flat/recommended'],
  vueTsConfigs.recommended,
  skipFormatting,
)
