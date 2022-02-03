import { Module, Submodule } from "./yang-ast";
import { ModuleResolver, ModuleResolverImplementation } from "./module-resolver";

export type SuccessfulLoad = {
	result: "success",
	module: Module | Submodule
}

export type SuccessfulLoadWithWarnings = {
	result: "warning",
	module: Module | Submodule,
	warnings: string[]
}

export type UnsuccessfulLoad = {
	result: "error",
	errors: string[],
	warnings: string[]
}

export type LoadResult = SuccessfulLoad | SuccessfulLoadWithWarnings | UnsuccessfulLoad;

// NB: Implementers of ModuleFetcher should return the latest revision of the module if revision is null
export type YangInput = {
	sourceRef: string;
	text: string;
}

export type ModuleFetcher = (type: "module" | "submodule", moduleName: string, revision: string | null) => Promise<YangInput>;

export class Registry {
	private readonly moduleResolver: ModuleResolver;
	private readonly modules = new Map<string, Map<string | null, Module>>();

	constructor(moduleFetcher: ModuleFetcher, moduleResolver?: ModuleResolver) {
		this.moduleResolver = moduleResolver ?? new ModuleResolverImplementation(moduleFetcher, (moduleName, revision) => this.getModule(moduleName, revision));
	}

	get loadedModules(): Module[] {
		const result: Module[] = [];

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		for (const [_, revisions] of this.modules) {
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			for (const [_, module] of revisions) {
				result.push(module);
			}
		}
		return result;
	}

	async load(moduleName: string, revision: string | null): Promise<LoadResult> {
		const result = await this.moduleResolver.resolve(moduleName, revision);

		if (result.result === "failure") {
			return {
				result: "error",
				warnings: result.warnings,
				errors: result.errors
			}
		}

		let topModule: Module | null = null;
		for (const { name, revision, module } of result.modules) {
			if (name === moduleName)
				topModule = module;
			this.setModuleInCache(name, revision, module);
		}

		if (result.result === "warning") {
			return {
				result: "warning",
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				module: topModule!,
				warnings: result.warnings
			}
		}

		return {
			result: "success",
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			module: topModule!
		}
	}

	getModule(moduleName: string, revision: string | null): Module | null {
		const revisedModules = this.modules.get(moduleName);
		if (revisedModules === undefined)
			return null; // Can't even find the module name...

		if (revision != null) {
			const module = revisedModules.get(revision);
			return module === undefined ? null : module;
		}

		// No specific revision, so pick highest revision of what we know so far!
		let latestRevision: string | null = null;
		let latestModule: Module | null = null;
		for (const [revision, module] of revisedModules) {
			if (latestRevision === null || revision !== null && latestRevision < revision) {
				latestRevision = revision;
				latestModule = module;
			}
		}

		return latestModule;
	}

	private setModuleInCache(moduleName: string, revision: string | null, module: Module): void {
		let revisedModules = this.modules.get(moduleName);
		if (revisedModules === undefined)
			this.modules.set(moduleName, revisedModules = new Map<string, Module>());

		revisedModules.set(revision, module);
	}
}
