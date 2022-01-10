import 'jest';
import { ModuleResolver, ResolutionResult } from './module-resolver';
import { Registry, YangInput } from "./registry";
import { Module } from './yang-ast';
import { Metadata } from './yang-stmt-parser';


class FakeModuleResolver implements ModuleResolver {
	constructor(private readonly result: ResolutionResult) {}

	async resolve(): Promise<ResolutionResult> {
		return this.result;
	}
}

describe("Registry", () => {
	it ("can handle failed resolutions", async () => {
		const fakeYangInput: YangInput = { sourceRef: "", text: "" };
		const fakeModuleFetcher = () => Promise.resolve(fakeYangInput);
		const fakeResolutionResult: ResolutionResult = { result: "failure", errors: ["an error message"], warnings: ["a warning message"] };
		const fakeModuleResolver = new FakeModuleResolver(fakeResolutionResult);
		const registry = new Registry(fakeModuleFetcher, fakeModuleResolver);

		const result = await registry.load("a-module", null);

		if (result.result !== "error")
			throw new Error("Result was not a failure");

		expect(result.errors).toContain("an error message");
		expect(result.warnings).toContain("a warning message");
		expect(registry.getModule("a-module", null)).toBeNull();
	})

	it ("can handle resolutions with warnings", async () => {
		const fakeYangInput: YangInput = { sourceRef: "", text: "" };
		const fakeModuleFetcher = () => Promise.resolve(fakeYangInput);
		const fakeModule = makeFakeModule();
		const fakeResolvedModule = { name: "a-module", revision: "2000-01-01", module: fakeModule };
		const fakeResolutionResult: ResolutionResult = { result: "warning", warnings: ["a warning message"], modules: [ fakeResolvedModule ] };
		const fakeModuleResolver = new FakeModuleResolver(fakeResolutionResult);
		const registry = new Registry(fakeModuleFetcher, fakeModuleResolver);

		const result = await registry.load("a-module", null);

		if (result.result !== "warning")
			throw new Error("Result was not a warning");

		expect(result.warnings).toContain("a warning message");
		expect(registry.getModule("a-module", null)).toBe(fakeModule);
	})

	it ("can handle successful resolutions", async () => {
		const fakeYangInput: YangInput = { sourceRef: "", text: "" };
		const fakeModuleFetcher = () => Promise.resolve(fakeYangInput);
		const fakeModule = makeFakeModule();
		const fakeResolvedModule = { name: "a-module", revision: "2000-01-01", module: fakeModule };
		const fakeResolutionResult: ResolutionResult = { result: "success", modules: [ fakeResolvedModule ] };
		const fakeModuleResolver = new FakeModuleResolver(fakeResolutionResult);
		const registry = new Registry(fakeModuleFetcher, fakeModuleResolver);

		const result = await registry.load("a-module", null);

		if (result.result !== "success")
			throw new Error("Result was not a success");

		expect(registry.getModule("a-module", null)).toBe(fakeModule);
		expect(registry.getModule("a-module", "2000-01-01")).toBe(fakeModule);
		expect(registry.getModule("a-module", "2000-01-02")).toBeNull();
	})

	it ("can handle successful resolutions (for modules w/o revision)", async () => {
		const fakeYangInput: YangInput = { sourceRef: "", text: "" };
		const fakeModuleFetcher = () => Promise.resolve(fakeYangInput);
		const fakeModule = makeFakeModule();
		const fakeResolvedModule = { name: "a-module", revision: null, module: fakeModule };
		const fakeResolutionResult: ResolutionResult = { result: "success", modules: [ fakeResolvedModule ] };
		const fakeModuleResolver = new FakeModuleResolver(fakeResolutionResult);
		const registry = new Registry(fakeModuleFetcher, fakeModuleResolver);

		const result = await registry.load("a-module", null);

		if (result.result !== "success")
			throw new Error("Result was not a success");

		expect(registry.getModule("a-module", null)).toBe(fakeModule);
		expect(registry.getModule("a-module", "2000-01-01")).toBeNull();
		expect(registry.getModule("a-module", "2000-01-02")).toBeNull();
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
