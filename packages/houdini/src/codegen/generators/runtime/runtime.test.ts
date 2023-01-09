import type { ProgramKind } from 'ast-types/lib/gen/kinds'
import * as recast from 'recast'
import * as typeScriptParser from 'recast/parsers/typescript'
import { test, expect } from 'vitest'

import { runPipeline } from '../..'
import { fs, path } from '../../../lib'
import { testConfig } from '../../../test'

test('updates the config file with import path', async function () {
	const config = testConfig({ module: 'esm' })
	// execute the generator
	await runPipeline(config, [])

	// open up the index file
	const fileContents = await fs.readFile(path.join(config.runtimeDirectory, 'lib', 'config.js'))
	expect(fileContents).toBeTruthy()

	// parse the contents
	const parsedQuery: ProgramKind = recast.parse(fileContents!, {
		parser: typeScriptParser,
	}).program
	// verify contents
	expect(recast.print(parsedQuery).code).toContain('import("../../../config.cjs")')
})

test('updates the list of plugin-specified client plugins', async function () {
	const config = testConfig({
		module: 'esm',
	})
	config.plugins = [
		{
			name: 'pluginWithClientPlugin',
			include_runtime: false,
			version: 'string',
			directory: 'string',
			client_plugins: {
				testPlugin: {},
			},
		},
	]

	// execute the generator
	await runPipeline(config, [])

	// open up the index file
	const fileContents = await fs.readFile(
		path.join(config.runtimeDirectory, 'client', 'injectedPlugins.js')
	)
	expect(fileContents).toBeTruthy()

	// parse the contents
	const parsedQuery: ProgramKind = recast.parse(fileContents!, {
		parser: typeScriptParser,
	}).program
	// verify contents
	expect(parsedQuery).toMatchInlineSnapshot(`
		import plugin0 from 'testPlugin'

		const plugins = [
			plugin0({})
		]

		export default plugins
	`)
})

test("does not update the list of plugin-specified client plugins if there aren't any", async function () {
	const config = testConfig({
		module: 'esm',
	})

	// execute the generator
	await runPipeline(config, [])

	// open up the index file
	const fileContents = await fs.readFile(
		path.join(config.runtimeDirectory, 'client', 'injectedPlugins.js')
	)
	expect(fileContents).toBeTruthy()

	// parse the contents
	const parsedQuery: ProgramKind = recast.parse(fileContents!, {
		parser: typeScriptParser,
	}).program
	// verify contents
	expect(parsedQuery).toMatchInlineSnapshot(`
		const plugins = [];
		var injectedPlugins_default = plugins;
		export {
		  injectedPlugins_default as default
		};
	`)
})

test('passing null as client plugin config generates a reference, not a function', async function () {
	const config = testConfig({
		module: 'esm',
	})
	config.plugins = [
		{
			name: 'pluginWithClientPlugin',
			include_runtime: false,
			version: 'string',
			directory: 'string',
			client_plugins: {
				testPlugin: null,
			},
		},
	]

	// execute the generator
	await runPipeline(config, [])

	// open up the index file
	const fileContents = await fs.readFile(
		path.join(config.runtimeDirectory, 'client', 'injectedPlugins.js')
	)
	expect(fileContents).toBeTruthy()

	// parse the contents
	const parsedQuery: ProgramKind = recast.parse(fileContents!, {
		parser: typeScriptParser,
	}).program
	// verify contents
	expect(parsedQuery).toMatchInlineSnapshot(`
		import plugin0 from 'testPlugin'

		const plugins = [
			plugin0
		]

		export default plugins
	`)
})
