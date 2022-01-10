/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { getModuleRevision, getResolutionStatus, makeFqModuleDisplayName, makeFqModuleName, makeFqModuleNamePrefix, ModuleResolverImplementation, ResolutionContext, ResolutionResult, ResolutionStatus } from "./module-resolver";
import { ParseResult } from "./parser";
import { Import, Include, Module, Revision, Submodule } from "./yang-ast";
import { Metadata } from "./yang-stmt-parser";

describe("getResolutionStatus", () => {
	it("modules not in context -> Unknown is returned", () => {
		const context: ResolutionContext = {
			modules: new Map<string, Map<string | null, Module | ResolutionStatus>>(),
			errors: [],
			warnings: []
		};

		const result = getResolutionStatus("a-module", "2000-01-01", context)
		expect(result).toBe(ResolutionStatus.Unknown);
	})

	it("module name and revision not in context -> Unknown is returned", () => {
		const context: ResolutionContext = {
			modules: new Map<string, Map<string | null, Module | ResolutionStatus>>(),
			errors: [],
			warnings: []
		};

		context.modules.set("a-module", new Map<string | null, Module | ResolutionStatus>());

		const result = getResolutionStatus("a-module", "2000-01-01", context)
		expect(result).toBe(ResolutionStatus.Unknown);
	})

	it("module name and revision with status in context -> status is returned", () => {
		const context: ResolutionContext = {
			modules: new Map<string, Map<string | null, Module | ResolutionStatus>>(),
			errors: [],
			warnings: []
		};

		context.modules.set("a-module", new Map<string | null, Module | ResolutionStatus>([["2000-01-01", ResolutionStatus.BeingResolved]]));

		const result = getResolutionStatus("a-module", "2000-01-01", context)
		expect(result).toBe(ResolutionStatus.BeingResolved);
	})

	it("module name and revision with module in context -> module is returned", () => {
		const context: ResolutionContext = {
			modules: new Map<string, Map<string | null, Module | ResolutionStatus>>(),
			errors: [],
			warnings: []
		};

		const fakeModule = makeFakeModule();
		context.modules.set("a-module", new Map<string | null, Module | ResolutionStatus>([["2000-01-01", fakeModule]]));

		const result = getResolutionStatus("a-module", "2000-01-01", context)
		expect(result).toBe(fakeModule);
	})
})


describe('getModuleRevision', () => {
	it('returns null when there are no revisions in the module', () => {
		expect(getModuleRevision(makeFakeModule())).toBe(null);
	})

	it('returns the single revision when there is only one revision in the module', () => {
		expect(getModuleRevision(makeFakeModule({ revisions: [makeFakeRevision({ value: "2000-01-01" })]}))).toBe("2000-01-01");
	})

	it('returns the highest revision when there are multiple revision in the module', () => {
		const fakeModule = makeFakeModule({
			revisions: [
				makeFakeRevision({ value: "2000-01-01" }),
				makeFakeRevision({ value: "2010-01-01" }),
				makeFakeRevision({ value: "1999-01-01" })
			]
		})
		expect(getModuleRevision(fakeModule)).toBe("2010-01-01");
	})
})

describe('makeFqModuleNamePrefix', () => {
	it('formats proper fq name prefixes', () => {
		expect(makeFqModuleNamePrefix("a-module-name")).toBe("a-module-name@")
	})
})

describe('makeFqModuleName', () => {
	it('formats proper fq names', () => {
		expect(makeFqModuleName("a-module-name", "2001-03-04")).toBe("a-module-name@2001-03-04")
	})
})

describe('makeFqModuleDisplayName', () => {
	it('formats proper fq display names', () => {
		expect(makeFqModuleDisplayName("a-module-name", "2001-03-04")).toBe("a-module-name@2001-03-04")
		expect(makeFqModuleDisplayName("a-module-name", null)).toBe("a-module-name@<unspecified revision>")
	})
})

describe("ModuleResolverImplementation", () => {
	const fakeModuleText = { sourceRef: "the-module.yang", text: ""};
	const fakeModule = makeFakeModule({ name: "the-module", revisions: [ makeFakeRevision({ value: "2000-01-01" }) ] });
	const fakeModuleParseResult = makeSuccessfulParseResult(fakeModule);
	function anEmptyCache(): Module | null { return null; }
	const moduleResolver = new ModuleResolverImplementation(async () => fakeModuleText, anEmptyCache, () => fakeModuleParseResult);

	function expectSuccess(result: ResolutionResult, validator: (modules: Array<Module | Submodule>) => void) {
		if (result.result !== "success") {
			console.error(result);
			throw new Error(`Resolution was not a success: ${result.result}`);
		}
		validator(result.modules.map(m => m.module));
	}

	function expectWarning(result: ResolutionResult, validator: (modules: Array<Module | Submodule>) => void, warningsValidator: (warnings: string[]) => void) {
		if (result.result !== "warning")
			throw new Error(`Load did not have warnings: ${result.result}`);
		validator(result.modules.map(m => m.module));
		warningsValidator(result.warnings);
	}

	function expectError(result: ResolutionResult, validator: (errors: string[]) => void) {
		if (result.result !== "failure")
			throw new Error(`Load was not an error: ${result.result}`);
		validator(result.errors);
	}

	describe("unrevisioned resolve", () => {
		it("can read modules without dependencies", async () => {
			const resolutionResult = await moduleResolver.resolve("the-module", null);

			expectSuccess(resolutionResult, modules => expect(modules).toContainEqual(fakeModule));
		})

		it("can read modules with dependencies", async () => {
			const fakeImportedModuleText = { sourceRef: "another-module.yang", text: ""};
			const fakeModule = makeFakeModule({ name: "the-module", imports: [ makeFakeImport( { identifier: "another-module" } ) ] });
			const fakeImportedModule = makeFakeModule({ name: "another-module" });
			const fakeModuleParseResult = makeSuccessfulParseResult(fakeModule);
			const fakeImportedModuleParseResult = makeSuccessfulParseResult(fakeImportedModule);
			const moduleResolver = new ModuleResolverImplementation(
				async (_type, name) => name === "the-module" ? fakeModuleText : fakeImportedModuleText, 
				anEmptyCache, 
				sourceRef => sourceRef === "the-module.yang" ? fakeModuleParseResult : fakeImportedModuleParseResult
			);

			const resolutionResult = await moduleResolver.resolve("the-module", null);

			expectSuccess(resolutionResult, modules => expect(modules).toContainEqual(fakeModule));
		})

		it("dependencies with warnings are loaded, and warnings are passed on", async () => {
			const fakeImportedModuleText = { sourceRef: "another-module.yang", text: ""};
			const fakeModule = makeFakeModule({ name: "the-module", imports: [ makeFakeImport( { identifier: "another-module" } ) ] });
			const fakeImportedModule = makeFakeModule({ name: "another-module" });
			const fakeModuleParseResult = makeSuccessfulParseResult(fakeModule);
			const fakeImportedModuleParseResult = makeWarningParseResult(fakeImportedModule, "a warning message");
			const moduleResolver = new ModuleResolverImplementation(
				async (_type, name) => name === "the-module" ? fakeModuleText : fakeImportedModuleText, 
				anEmptyCache, 
				sourceRef => sourceRef === "the-module.yang" ? fakeModuleParseResult : fakeImportedModuleParseResult
			);

			const resolutionResult = await moduleResolver.resolve("the-module", null);

			expectWarning(
				resolutionResult, 
				modules => expect(modules).toContainEqual(fakeModule),
				warnings => expect(warnings).toContain("a warning message")
			);
		})

		it("fails if a dependency fails", async () => {
			const fakeImportedModuleText = { sourceRef: "another-module.yang", text: ""};
			const fakeModule = makeFakeModule({ name: "the-module", imports: [ makeFakeImport( { identifier: "another-module" } ) ] });
			const fakeModuleParseResult = makeSuccessfulParseResult(fakeModule);
			const fakeImportedModuleParseResult = makeErrorParseResult("imported module failed");
			const moduleResolver = new ModuleResolverImplementation(
				async (_type, name) => name === "the-module" ? fakeModuleText : fakeImportedModuleText, 
				anEmptyCache, 
				sourceRef => sourceRef === "the-module.yang" ? fakeModuleParseResult : fakeImportedModuleParseResult
			);

			const resolutionResult = await moduleResolver.resolve("the-module", null);

			expectError(resolutionResult, errors => expect(errors).toMatchObject([ "imported module failed" ]));
		})

		it("fails when cyclic dependencies are detected", async () => {
			const fakeImportedModuleText = { sourceRef: "another-module.yang", text: ""};
			const fakeModule = makeFakeModule({ name: "the-module", imports: [ makeFakeImport( { identifier: "another-module" } ) ] });
			const fakeImportedModule = makeFakeModule({ name: "another-module", imports: [ makeFakeImport( { identifier: "the-module" } ) ] });
			const fakeModuleParseResult = makeSuccessfulParseResult(fakeModule);
			const fakeImportedModuleParseResult = makeSuccessfulParseResult(fakeImportedModule);
			const moduleResolver = new ModuleResolverImplementation(
				async (_type, name) => name === "the-module" ? fakeModuleText : fakeImportedModuleText, 
				anEmptyCache, 
				sourceRef => sourceRef === "the-module.yang" ? fakeModuleParseResult : fakeImportedModuleParseResult
			);

			const resolutionResult = await moduleResolver.resolve("the-module", null);

			expectError(resolutionResult, errors => expect(errors).toMatchObject([ "Detected an import loop for 'the-module@<unspecified revision>'!" ]));
		})

		it("can read modules with includes", async () => {
			const fakeIncludedSubmoduleText = { sourceRef: "a-submodule.yang", text: ""};
			const fakeModule = makeFakeModule({ name: "the-module", includes: [ makeFakeInclude( { identifier: "a-submodule" } ) ] });
			const fakeIncludedSubmodule = makeFakeSubmodule({ name: "a-submodule", belongsTo: "the-module" });
			const fakeModuleParseResult = makeSuccessfulParseResult(fakeModule);
			const fakeIncludedSubmoduleParseResult = makeSuccessfulParseResult(fakeIncludedSubmodule);
			const moduleResolver = new ModuleResolverImplementation(
				async (type, name) => type === "module" && name === "the-module" ? fakeModuleText : fakeIncludedSubmoduleText, 
				anEmptyCache, 
				sourceRef => sourceRef === "the-module.yang" ? fakeModuleParseResult : fakeIncludedSubmoduleParseResult
			);

			const resolutionResult = await moduleResolver.resolve("the-module", null);

			expectSuccess(resolutionResult, modules => expect(modules).toContainEqual(fakeModule));
		})

		it("if loaded module actually is a submodule, an error is returned", async () => {
			const fakeSubmodule = makeFakeSubmodule({ name: "a-submodule" });
			const fakeSubmoduleParseResult = makeSuccessfulParseResult(fakeSubmodule);
			const moduleResolver = new ModuleResolverImplementation(async () => fakeModuleText, anEmptyCache, () => fakeSubmoduleParseResult);

			const resolutionResult = await moduleResolver.resolve("the-module", null);

			expectError(resolutionResult, errors => expect(errors).toMatchObject([ "'the-module' is not a module, but a 'submodule'." ]));
		})

		it("if loaded module's name differ from requested, an error is returned", async () => {
			const resolutionResult = await moduleResolver.resolve("another-module", null);

			expectError(resolutionResult, errors => expect(errors).toMatchObject([ "Module requested to be parsed was 'another-module' but 'the-module' was parsed." ]));
		})

		it("if loaded module doesn't parse without errors, an error is returned", async () => {
			const fakeModuleParseResult = makeErrorParseResult("an error message");
			const moduleResolver = new ModuleResolverImplementation(async () => fakeModuleText, anEmptyCache, () => fakeModuleParseResult);
			const resolutionResult = await moduleResolver.resolve("the-module", null);

			expectError(resolutionResult, errors => expect(errors).toMatchObject([ "an error message" ]));
		})

		it("if loaded module has warnings, warnings are returned in load result", async () => {
			const fakeModuleParseResult = makeWarningParseResult(fakeModule, "a warning message");
			const moduleResolver = new ModuleResolverImplementation(async () => fakeModuleText, anEmptyCache, () => fakeModuleParseResult);
			const resolutionResult = await moduleResolver.resolve("the-module", null);

			expectWarning(
				resolutionResult,
				modules => expect(modules).toContainEqual(fakeModule),
				warnings => expect(warnings).toMatchObject([ "a warning message" ])
			);
		})
	})

	describe("revisioned resolve", () => {
		it("can read revisioned modules without dependencies", async () => {			
			const resolutionResult = await moduleResolver.resolve("the-module", "2000-01-01");

			expectSuccess(resolutionResult, modules => expect(modules).toContainEqual(fakeModule));
		})

		it("can read modules with dependencies", async () => {
			const fakeImportedModuleText = { sourceRef: "another-module.yang", text: ""};
			const fakeModule = makeFakeModule({ name: "the-module", revisions: [ makeFakeRevision({ value: "2000-01-01" }) ], imports: [ makeFakeImport( { identifier: "another-module" } ) ] });
			const fakeImportedModule = makeFakeModule({ name: "another-module" });
			const fakeModuleParseResult = makeSuccessfulParseResult(fakeModule);
			const fakeImportedModuleParseResult = makeSuccessfulParseResult(fakeImportedModule);
			const moduleResolver = new ModuleResolverImplementation(
				async (_type, name) => name === "the-module" ? fakeModuleText : fakeImportedModuleText, 
				anEmptyCache, 
				sourceRef => sourceRef === "the-module.yang" ? fakeModuleParseResult : fakeImportedModuleParseResult
			);

			const resolutionResult = await moduleResolver.resolve("the-module", "2000-01-01");

			expectSuccess(resolutionResult, modules => expect(modules).toContainEqual(fakeModule));
		})

		it("dependencies with warnings are loaded, and warnings are passed on", async () => {
			const fakeImportedModuleText = { sourceRef: "another-module.yang", text: ""};
			const fakeModule = makeFakeModule({ name: "the-module",  revisions: [ makeFakeRevision({ value: "2000-01-01" }) ], imports: [ makeFakeImport( { identifier: "another-module" } ) ] });
			const fakeImportedModule = makeFakeModule({ name: "another-module" });
			const fakeModuleParseResult = makeSuccessfulParseResult(fakeModule);
			const fakeImportedModuleParseResult = makeWarningParseResult(fakeImportedModule, "a warning message");
			const moduleResolver = new ModuleResolverImplementation(
				async (_type, name) => name === "the-module" ? fakeModuleText : fakeImportedModuleText, 
				anEmptyCache, 
				sourceRef => sourceRef === "the-module.yang" ? fakeModuleParseResult : fakeImportedModuleParseResult
			);

			const resolutionResult = await moduleResolver.resolve("the-module", "2000-01-01");

			expectWarning(
				resolutionResult, 
				modules => expect(modules).toContainEqual(fakeModule),
				warnings => expect(warnings).toContain("a warning message")
			);
		})

		it("fails if a dependency fails", async () => {
			const fakeImportedModuleText = { sourceRef: "another-module.yang", text: ""};
			const fakeModule = makeFakeModule({ name: "the-module", revisions: [ makeFakeRevision({ value: "2000-01-01" }) ], imports: [ makeFakeImport( { identifier: "another-module" } ) ] });
			const fakeModuleParseResult = makeSuccessfulParseResult(fakeModule);
			const fakeImportedModuleParseResult = makeErrorParseResult("imported module failed");
			const moduleResolver = new ModuleResolverImplementation(
				async (_type, name) => name === "the-module" ? fakeModuleText : fakeImportedModuleText, 
				anEmptyCache, 
				sourceRef => sourceRef === "the-module.yang" ? fakeModuleParseResult : fakeImportedModuleParseResult
			);

			const resolutionResult = await moduleResolver.resolve("the-module", "2000-01-01");

			expectError(resolutionResult, errors => expect(errors).toMatchObject([ "imported module failed" ]));
		})

		it("fails when cyclic dependencies are detected", async () => {
			const fakeImportedModuleText = { sourceRef: "another-module.yang", text: ""};
			const fakeModule = makeFakeModule({ name: "the-module", revisions: [ makeFakeRevision({ value: "2000-01-01" }) ], imports: [ makeFakeImport( { identifier: "another-module" } ) ] });
			const fakeImportedModule = makeFakeModule({ name: "another-module", imports: [ makeFakeImport( { identifier: "the-module", revision: "2000-01-01" } ) ] });
			const fakeModuleParseResult = makeSuccessfulParseResult(fakeModule);
			const fakeImportedModuleParseResult = makeSuccessfulParseResult(fakeImportedModule);
			const moduleResolver = new ModuleResolverImplementation(
				async (_type, name) => name === "the-module" ? fakeModuleText : fakeImportedModuleText, 
				anEmptyCache, 
				sourceRef => sourceRef === "the-module.yang" ? fakeModuleParseResult : fakeImportedModuleParseResult
			);

			const resolutionResult = await moduleResolver.resolve("the-module", "2000-01-01");

			expectError(resolutionResult, errors => expect(errors).toMatchObject([ "Detected an import loop for 'the-module@2000-01-01'!" ]));
		})

		it("if loaded module actually is a submodule, an error is returned", async () => {
			const fakeSubmodule = makeFakeSubmodule({ name: "a-submodule" });
			const fakeSubmoduleParseResult = makeSuccessfulParseResult(fakeSubmodule);
			const moduleResolver = new ModuleResolverImplementation(async () => fakeModuleText, anEmptyCache, () => fakeSubmoduleParseResult);

			const resolutionResult = await moduleResolver.resolve("the-module", "2000-01-01");

			expectError(resolutionResult, errors => expect(errors).toMatchObject([ "'the-module' is not a module, but a 'submodule'." ]));
		})

		it("if loaded module's name differ from requested, an error is returned", async () => {
			const resolutionResult = await moduleResolver.resolve("another-module", "2000-01-01");

			expectError(resolutionResult, errors => expect(errors).toMatchObject([ "Module requested to be parsed was 'another-module' but 'the-module' was parsed." ]));
		})

		it("if loaded module's revision differ from requested, an error is returned", async () => {
			const resolutionResult = await moduleResolver.resolve("the-module", "2000-01-02");

			expectError(resolutionResult, errors => expect(errors).toMatchObject([ "Module requested to be parsed was 'the-module@2000-01-02' but 'the-module@2000-01-01' was parsed." ]));
		})

		it("if loaded module doesn't parse without errors, an error is returned", async () => {
			const fakeModuleParseResult = makeErrorParseResult("an error message");
			const moduleResolver = new ModuleResolverImplementation(async () => fakeModuleText, anEmptyCache, () => fakeModuleParseResult);
			const resolutionResult = await moduleResolver.resolve("the-module", "2000-01-02");

			expectError(resolutionResult, errors => expect(errors).toMatchObject([ "an error message" ]));
		})

		it("if loaded module has warnings, warnings are returned in load result", async () => {
			const fakeModuleParseResult = makeWarningParseResult(fakeModule, "a warning message");
			const moduleResolver = new ModuleResolverImplementation(async () => fakeModuleText, anEmptyCache, () => fakeModuleParseResult);
			const resolutionResult = await moduleResolver.resolve("the-module", "2000-01-01");

			expectWarning(
				resolutionResult,
				modules => expect(modules).toContainEqual(fakeModule),
				warnings => expect(warnings).toMatchObject([ "a warning message" ])
			);
		})
	})

	describe("integration tests", () => {
		const noCache = () => null;

		const sourceRefRegexWithVersion = /^(?<name>[^@]+)@(?<revision>.+)\.yang$/;
		const sourceRefRegexWithoutVersion = /^(?<name>[^@]+)\.yang$/;

		const makeModuleFetcher = (virtualFileSystemData: Iterable<[string, string]>) => {
			const virtualFileSystem = new Map(virtualFileSystemData);
			return async (type: string, name: string, revision: string | null) => {
				if (revision !== null) {
					const sourceRef = `${name}@${revision}.yang`;
					
					const yangText = virtualFileSystem.get(sourceRef);
					if (yangText === undefined)
						throw new Error(`Cannot find any files for ${makeFqModuleDisplayName(name, revision)}.`);
					
					return {
						sourceRef: sourceRef,
						text: yangText
					}
				}
				
				// Find the highest version...
				let highestRevision: string | null = null;
				let highestYangText: string | null = null;
	
				for (const [aModuleName, yangText] of virtualFileSystem) {
					const m = aModuleName.match(sourceRefRegexWithoutVersion);
					if (m && m.groups && m.groups["name"] === name) {
						if (highestYangText === null) {
							highestRevision = null;
							highestYangText = yangText;
						}
					} else {
						const m = aModuleName.match(sourceRefRegexWithVersion);
						if (m && m.groups && m.groups["name"] === name) {
							if (highestRevision === null || m.groups["revision"] > highestRevision) {
								highestRevision = m.groups["revision"];
								highestYangText = yangText
							}
						}						
					}
				}
	
				if (highestYangText === null)
					throw new Error(`Cannot find any files for ${makeFqModuleDisplayName(name, revision)}.`);
	
				return {
					sourceRef: highestRevision === null ? `${name}.yang` : `${name}@${highestRevision}.yang`,
					text: highestYangText
				}
			};
		}		

		it("can load a single yang file without dependencies, and no revision", async () => {
			const moduleFetcher = makeModuleFetcher([
				[
					"a-module@2022-01-07.yang",
					`module a-module {
						prefix "prf";
						yang-version 1.1;
						namespace "urn:westermo:test";
						revision 2022-01-07;
					}`
				]
			]);
			const resolver = new ModuleResolverImplementation(moduleFetcher, noCache);
			const result = await resolver.resolve("a-module", null);

			if (result.result !== "success")
				throw new Error("Not a success!");
			
			expect(result.modules).toHaveLength(1);
			expect(result.modules[0].module).toMatchObject({ name: "a-module", revisions: [ { value: "2022-01-07" } ]})
		})

		it("can load a single yang file without dependencies, and revision", async () => {
			const moduleFetcher = makeModuleFetcher([
				[
					"a-module@2022-01-07.yang",
					`module a-module {
						prefix "prf";
						yang-version 1.1;
						namespace "urn:westermo:test";
						revision 2022-01-07;
					}`
				]
			]);

			const resolver = new ModuleResolverImplementation(moduleFetcher, noCache);
			const result = await resolver.resolve("a-module", "2022-01-07");

			if (result.result !== "success")
				throw new Error("Not a success!");
			
			expect(result.modules).toHaveLength(1);
			expect(result.modules[0].module).toMatchObject({ name: "a-module", revisions: [ { value: "2022-01-07" } ]})
		})

		it("can load a yang file with a module import dependency", async () => {
			const moduleFetcher = makeModuleFetcher([
				[
					"a-module-w-imp-dep@2022-01-07.yang",
					`module a-module-w-imp-dep {
						prefix "prf";
						yang-version 1.1;
						namespace "urn:westermo:test";
						revision 2022-01-07;
						import a-module {
							prefix prf2;
							revision 2022-01-07;
						}

						container foo {}
					}`
				],
				[
					"a-module@2022-01-07.yang",
					`module a-module {
						prefix "prf";
						yang-version 1.1;
						namespace "urn:westermo:test";
						revision 2022-01-07;

						container bar {}
					}`
				]
			]);

			const resolver = new ModuleResolverImplementation(moduleFetcher, noCache);
			const result = await resolver.resolve("a-module-w-imp-dep", null);

			if (result.result !== "success")
				throw new Error("Not a success!");
			
			expect(result.modules).toMatchObject([
				{
					name: "a-module-w-imp-dep",
					revision: "2022-01-07",
					module: {
						name: "a-module-w-imp-dep",
						revisions: [ { value: "2022-01-07" } ],
						body: [{
							construct: "container",
							identifier: "foo"
						}]
					}
				},
				{
					name: "a-module",
					revision: "2022-01-07",
					module: {
						name: "a-module",
						revisions: [ { value: "2022-01-07" } ],
						body: [{
							construct: "container",
							identifier: "bar"
						}]
					}
				},
			])
		})

		it("can load a yang file with a submodule include dependency (and submodule imports another module!)", async () => {
			const moduleFetcher = makeModuleFetcher([
				[
					"a-module-w-inc-dep@2022-01-07.yang",
					`module a-module-w-inc-dep {
						prefix "prf";
						yang-version 1.1;
						namespace "urn:westermo:test";
						revision 2022-01-07;
						include a-submodule {
							prefix prf2;
							revision 2022-01-07;
						}

						container bar {}
					}`
				],
				[
					"a-module@2022-01-07.yang",
					`module a-module {
						prefix "prf";
						yang-version 1.1;
						namespace "urn:westermo:test";
						revision 2022-01-07;

						container foo {}
					}`
				],
				[
					"a-submodule@2022-01-07.yang",
					`submodule a-submodule {
						belongs-to a-module-w-inc-dep;
						yang-version 1.1;
						namespace "urn:westermo:test";
						revision 2022-01-07;
						import a-module {
							prefix prf2;
							revision 2022-01-07;
						}

						container sub-bar {}
					}`
				]
			]);

			const resolver = new ModuleResolverImplementation(moduleFetcher, noCache);
			const result = await resolver.resolve("a-module-w-inc-dep", null);

			if (result.result !== "success")
				throw new Error("Not a success!");

			expect(result.modules).toMatchObject([
				{
					name: "a-module-w-inc-dep",
					revision: "2022-01-07",
					module: {
						name: "a-module-w-inc-dep",
						revisions: [ { value: "2022-01-07" } ],
						body: [{ // Comes from the module a-module-w-inc-dep!
							construct: "container",
							identifier: "bar"
						}, { // Comes from the submodule a-submodule!
							construct: "container",
							identifier: "sub-bar"
						}]
					}
				},
				{ // The submodule imports a-module!
					name: "a-module",
					revision: "2022-01-07",
					module: {
						name: "a-module",
						revisions: [ { value: "2022-01-07" } ],
						body: [{
							construct: "container",
							identifier: "foo"
						}]
					}
				},
			])
		})

		it("can load a yang file with a submodule include dependency (and submodule includes yet another submodule!)", async () => {
			const moduleFetcher = makeModuleFetcher([
				[
					"a-module-w-inc-dep@2022-01-07.yang",
					`module a-module-w-inc-dep {
						prefix "prf";
						yang-version 1.1;
						namespace "urn:westermo:test";
						revision 2022-01-07;
						include a-submodule {
							prefix prf2;
							revision 2022-01-07;
						}

						container bar {}
					}`
				],
				[
					"a-submodule@2022-01-07.yang",
					`submodule a-submodule {
						belongs-to a-module-w-inc-dep;
						yang-version 1.1;
						namespace "urn:westermo:test";
						revision 2022-01-07;
						include another-submodule {
							revision 2022-01-07;
						}

						container sub-bar {}
					}`
				],
				[
					"another-submodule@2022-01-07.yang",
					`submodule another-submodule {
						belongs-to a-module-w-inc-dep;
						yang-version 1.1;
						namespace "urn:westermo:test";
						revision 2022-01-07;

						container sub-sub-bar {}
					}`
				]
			]);

			const resolver = new ModuleResolverImplementation(moduleFetcher, noCache);
			const result = await resolver.resolve("a-module-w-inc-dep", null);

			if (result.result !== "success")
				throw new Error("Not a success!");

			expect(result.modules).toMatchObject([
				{
					name: "a-module-w-inc-dep",
					revision: "2022-01-07",
					module: {
						name: "a-module-w-inc-dep",
						revisions: [ { value: "2022-01-07" } ],
						body: [{ // Comes from the module a-module-w-inc-dep!
							construct: "container",
							identifier: "bar"
						}, { // Comes from the submodule a-submodule!
							construct: "container",
							identifier: "sub-bar"
						}, { // Comes from the submodule another-submodule!
							construct: "container",
							identifier: "sub-sub-bar"
						}]
					}
				}
			])
		})

		it("refuses to load a submodule", async () => {
			const moduleFetcher = makeModuleFetcher([
				[
					"a-submodule@2022-01-07.yang",
					`submodule a-submodule {
						belongs-to a-module-w-inc-dep;
						yang-version 1.1;
						namespace "urn:westermo:test";
						revision 2022-01-07;
					}`
				]
			]);

			const resolver = new ModuleResolverImplementation(moduleFetcher, noCache);
			const result = await resolver.resolve("a-submodule", null);

			if (result.result !== "failure")
				throw new Error("Not a failure!");

			expect(result.errors).toContain("'a-submodule' is not a module, but a 'submodule'.");
		})

		it("refuses to load a module that imports a submodule", async () => {
			const moduleFetcher = makeModuleFetcher([
				[
					"a-module@2022-01-07.yang",
					`module a-module {
						prefix prf;
						yang-version 1.1;
						namespace "urn:westermo:test";
						revision 2022-01-07;
						import a-submodule {
							prefix prf2;
							revision 2022-01-07;
						}
					}`
				],
				[
					"a-submodule@2022-01-07.yang",
					`submodule a-submodule {
						belongs-to a-module;
						yang-version 1.1;
						namespace "urn:westermo:test";
						revision 2022-01-07;
					}`
				]
			]);

			const resolver = new ModuleResolverImplementation(moduleFetcher, noCache);
			const result = await resolver.resolve("a-module", null);

			if (result.result !== "failure")
				throw new Error("Not a failure!");

			expect(result.errors).toContain("'a-submodule' is not a module, but a 'submodule'.");
		})

		it("refuses to load a module that includes a submodule with mismatching name", async () => {
			const moduleFetcher = makeModuleFetcher([
				[
					"a-module@2022-01-07.yang",
					`module a-module {
						prefix prf;
						yang-version 1.1;
						namespace "urn:westermo:test";
						revision 2022-01-07;
						include a-submodule {
							revision 2022-01-07;
						}
					}`
				],
				[
					"a-submodule@2022-01-07.yang",
					`submodule a-mismatch-submodule {
						belongs-to a-module;
						yang-version 1.1;
						namespace "urn:westermo:test";
						revision 2022-01-07;
					}`
				]
			]);

			const resolver = new ModuleResolverImplementation(moduleFetcher, noCache);
			const result = await resolver.resolve("a-module", null);

			if (result.result !== "failure")
				throw new Error("Not a failure!");

			expect(result.errors).toContain("'a-module@2022-01-07' includes submodule a-submodule@2022-01-07, but it identifies itself as 'a-mismatch-submodule@2022-01-07'.");
		})

		it("refuses to load a module that includes a submodule with mismatching revision", async () => {
			const moduleFetcher = makeModuleFetcher([
				[
					"a-module@2022-01-07.yang",
					`module a-module {
						prefix prf;
						yang-version 1.1;
						namespace "urn:westermo:test";
						revision 2022-01-07;
						include a-submodule {
							revision 2022-01-07;
						}
					}`
				],
				[
					"a-submodule@2022-01-07.yang",
					`submodule a-submodule {
						belongs-to a-module;
						yang-version 1.1;
						namespace "urn:westermo:test";
						revision 2022-01-08;
					}`
				]
			]);

			const resolver = new ModuleResolverImplementation(moduleFetcher, noCache);
			const result = await resolver.resolve("a-module", null);

			if (result.result !== "failure")
				throw new Error("Not a failure!");

			expect(result.errors).toContain("Submodule requested to be parsed was 'a-submodule@2022-01-07' but 'a-submodule@2022-01-08' was parsed.");
		})

		it("refuses to load a module that includes a submodule with mismatching belongs-to", async () => {
			const moduleFetcher = makeModuleFetcher([
				[
					"a-module@2022-01-07.yang",
					`module a-module {
						prefix prf;
						yang-version 1.1;
						namespace "urn:westermo:test";
						revision 2022-01-07;
						include a-submodule {
							revision 2022-01-07;
						}
					}`
				],
				[
					"a-submodule@2022-01-07.yang",
					`submodule a-submodule {
						belongs-to another-module;
						yang-version 1.1;
						namespace "urn:westermo:test";
						revision 2022-01-07;
					}`
				]
			]);

			const resolver = new ModuleResolverImplementation(moduleFetcher, noCache);
			const result = await resolver.resolve("a-module", null);

			if (result.result !== "failure")
				throw new Error("Not a failure!");

			expect(result.errors).toContain("'a-module@2022-01-07' includes submodule a-submodule@2022-01-07, but it belongs to 'another-module'.");
		})

		it("refuses to load a module that includes a submodule with invalid syntax", async () => {
			const moduleFetcher = makeModuleFetcher([
				[
					"a-module@2022-01-07.yang",
					`module a-module {
						prefix prf;
						yang-version 1.1;
						namespace "urn:westermo:test";
						revision 2022-01-07;
						import a-submodule {
							prefix prf2;
							revision 2022-01-07;
						}
					}`
				],
				[
					"a-submodule@2022-01-07.yang",
					`submodule a-submodule {
						foo foo foo foo foo;
					}`
				]
			]);

			const resolver = new ModuleResolverImplementation(moduleFetcher, noCache);
			const result = await resolver.resolve("a-module", null);

			if (result.result !== "failure")
				throw new Error("Not a failure!");

			expect(result.errors).toContain("2:15:Expected a statement terminator or body, but got identifier");
		})

		it("allows loading of a module that includes a submodule with warnings", async () => {
			const moduleFetcher = makeModuleFetcher([
				[
					"a-module@2022-01-07.yang",
					`module a-module {
						prefix prf;
						yang-version 1.1;
						namespace "urn:westermo:test";
						revision 2022-01-07;
						include a-submodule {
							prefix prf2;
							revision 2022-01-07;
						}
					}`
				],
				[
					"a-submodule@2022-01-07.yang",
					`submodule a-submodule {
						yang-version 1.1;
						belongs-to a-module;
						revision 2022-01-07;
						rpc r {
							output "warning argument" {
								container foo {}
							}
						}
					}`
				]
			]);

			const resolver = new ModuleResolverImplementation(moduleFetcher, noCache);
			const result = await resolver.resolve("a-module", null);

			if (result.result !== "warning")
				throw new Error("Not a warning!");

			expect(result.warnings).toContain("6:8:Did not expect a non-empty string argument for statement 'output' in '/submodule=a-submodule/rpc=r'.");
		})

		it("refuses to load a module that includes a module", async () => {
			const moduleFetcher = makeModuleFetcher([
				[
					"a-module@2022-01-07.yang",
					`module a-module {
						prefix prf;
						yang-version 1.1;
						namespace "urn:westermo:test";
						revision 2022-01-07;
						include another-module {
							revision 2022-01-07;
						}
					}`
				],
				[
					"another-module@2022-01-07.yang",
					`module another-module {
						prefix prf;
						yang-version 1.1;
						namespace "urn:westermo:test";
						revision 2022-01-07;
					}`
				]
			]);

			const resolver = new ModuleResolverImplementation(moduleFetcher, noCache);
			const result = await resolver.resolve("a-module", null);

			if (result.result !== "failure")
				throw new Error("Not a failure!");

			expect(result.errors).toContain("'another-module@2022-01-07' is not a submodule, but a 'module'.");
		})

		it("refuses to load a modules that have cyclic dependencies", async () => {
			const moduleFetcher = makeModuleFetcher([
				[
					"a-module@2022-01-07.yang",
					`module a-module {
						prefix prf;
						yang-version 1.1;
						namespace "urn:westermo:test";
						revision 2022-01-07;
						import another-module {
							prefix prf2;
							revision 2022-01-07;
						}
					}`
				],
				[
					"another-module@2022-01-07.yang",
					`module another-module {
						prefix prf;
						yang-version 1.1;
						namespace "urn:westermo:test";
						revision 2022-01-07;
						import yet-another-module {
							prefix prf2;
							revision 2022-01-07;
						}
					}`
				],
				[
					"yet-another-module@2022-01-07.yang",
					`module yet-another-module {
						prefix prf;
						yang-version 1.1;
						namespace "urn:westermo:test";
						revision 2022-01-07;
						import a-module {
							prefix prf2;
							revision 2022-01-07;
						}
					}`
				]
			]);

			const resolver = new ModuleResolverImplementation(moduleFetcher, noCache);
			const result = await resolver.resolve("a-module", null);

			if (result.result !== "failure")
				throw new Error("Not a failure!");

			expect(result.errors).toContain("Detected an import loop for 'another-module@2022-01-07'!");
		})
	})
})

function makeFakeMetadata(): Metadata {
	return { source: "", length: 1, position: { column: 1, line: 1, offset: 0 } }
}

function makeFakeModule(spec?: Partial<Module>): Module {
	return {
		construct: "module",
		name: spec?.name ?? "foo-module",
		namespace: spec?.namespace ?? "urn:westermo:test",
		prefix: spec?.prefix ?? "prefix",
		yangVersion: spec?.yangVersion ?? "1.1",
		organization: spec?.organization ?? null,
		contact: spec?.contact ?? null,
		body: spec?.body ?? [],
		description: spec?.description ?? null,
		imports: spec?.imports ?? [],
		includes: spec?.includes ?? [],
		metadata: spec?.metadata ?? makeFakeMetadata(),
		reference: spec?.reference ?? null,
		unknownStatements: spec?.unknownStatements ?? [],
		revisions:spec?.revisions ?? []
	};
}

function makeFakeSubmodule(spec?: Partial<Submodule>): Submodule {
	return {
		construct: "submodule",
		name: spec?.name ?? "foo-submodule",
		yangVersion: spec?.yangVersion ?? "1.1",
		belongsTo: spec?.belongsTo ?? "foo-module",
		organization: spec?.organization ?? null,
		contact: spec?.contact ?? null,
		body: spec?.body ?? [],
		description: spec?.description ?? null,
		imports: spec?.imports ?? [],
		includes: spec?.includes ?? [],
		metadata: spec?.metadata ?? makeFakeMetadata(),
		reference: spec?.reference ?? null,
		unknownStatements: spec?.unknownStatements ?? [],
		revisions:spec?.revisions ?? []
	};
}

function makeFakeRevision(spec?: Partial<Revision>): Revision {
	return {
		value: spec?.value ?? "2000-01-01",
		description: spec?.description ?? null,
		metadata: spec?.metadata ?? makeFakeMetadata(),
		reference: spec?.reference ?? null,
		unknownStatements: spec?.unknownStatements ?? []
	}
}

function makeFakeImport(spec?: Partial<Import>): Import {
	return {
		identifier: spec?.identifier ?? "another-module",
		revision: spec?.revision ?? null,
		description: spec?.description ?? null,
		metadata: spec?.metadata ?? makeFakeMetadata(),
		prefix: spec?.prefix ?? "pre",
		reference: spec?.reference ?? null,
		unknownStatements: spec?.unknownStatements ?? []
	}
}

function makeFakeInclude(spec?: Partial<Include>): Include {
	return {
		identifier: spec?.identifier ?? "another-module",
		revision: spec?.revision ?? null,
		description: spec?.description ?? null,
		metadata: spec?.metadata ?? makeFakeMetadata(),
		reference: spec?.reference ?? null,
		unknownStatements: spec?.unknownStatements ?? []
	}
}

function makeSuccessfulParseResult(module: Module | Submodule): ParseResult {
	return {
		result: "success",
		module: module
	}
}

function makeErrorParseResult(error: string): ParseResult {
	return {
		result: "error",
		warnings: [],
		errors: [error]
	}
}

function makeWarningParseResult(module: Module | Submodule, warning: string): ParseResult {
	return {
		result: "warning",
		warnings: [warning],
		module: module
	}
}