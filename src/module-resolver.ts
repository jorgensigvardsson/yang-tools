import { parse as parseModule, Parser } from "./parser";
import { ModuleFetcher } from "./registry";
import { Include, Module, Submodule } from "./yang-ast";

type SuccessfulResolution = {
	result: "success",
	modules: Array<{ name: string, revision: string | null, module: Module}>
}

type SuccessfulResolutionWithWarnings = {
	result: "warning",
	modules: Array<{ name: string, revision: string | null, module: Module}>,
	warnings: string[]
}


type FailedResolution = {
	result: "failure",
	errors: string[],
	warnings: string[]
}

export type ResolutionResult = SuccessfulResolution | SuccessfulResolutionWithWarnings | FailedResolution;

export interface ModuleResolver {
	resolve(moduleName: string, revision: string | null): Promise<ResolutionResult>
}

export enum ResolutionStatus {
	Unknown = "unknown",
	BeingResolved = "being resolved...",
	FailedToResolve = "failed to resolve"
}

export type ResolutionContext = {
	warnings: string[],
	errors: string[],
	modules: Map<string, Map<string | null, Module | ResolutionStatus>>;
}

export class ModuleResolverImplementation implements ModuleResolver {
	private readonly parse: Parser;

	constructor(private readonly moduleFetcher: ModuleFetcher, private readonly getFromCache: (moduleName: string, revision: string | null) => Module | null, parse?: Parser) {
		this.parse = parse ?? parseModule;
	}

	async resolve(moduleName: string, revision: string | null): Promise<ResolutionResult> {
		const resolutionContext = {
			warnings: [],
			errors: [],
			modules: new Map<string, Map<string | null, Module | ResolutionStatus>>()
		};

		await this.resolveModule(moduleName, revision, resolutionContext);

		if (resolutionContext.errors.length > 0) {
			return {
				result: "failure",
				warnings: resolutionContext.warnings,
				errors: resolutionContext.errors
			}
		}

		const modules = new Array<{ name: string, revision: string | null, module: Module}>();

		for (const [ moduleName, revisedModules ] of resolutionContext.modules) {
			for (const [revision, moduleOrStatus] of revisedModules) {
				if (moduleOrStatus !== ResolutionStatus.BeingResolved && moduleOrStatus !== ResolutionStatus.FailedToResolve && moduleOrStatus !== ResolutionStatus.Unknown) {
					modules.push({ name: moduleName, revision: revision, module: moduleOrStatus});
				}
			}
		}

		if (resolutionContext.warnings.length > 0) {
			return {
				result: "warning",
				warnings: resolutionContext.warnings,
				modules: modules
			}	
		}

		return {
			result: "success",
			modules: modules
		}
	}

	private async resolveModule(moduleName: string, revision: string | null, context: ResolutionContext): Promise<boolean> {
		const module = this.getFromCache(moduleName, revision);
		if (module !== null)
			return true;

		const statusOrModule = getResolutionStatus(moduleName, revision, context);
		if (typeof statusOrModule !== "string") {
			// statusOrModule is an already loaded module from the context!
			return true;
		}

		if (statusOrModule === ResolutionStatus.BeingResolved) {
			setResolutionStatus(moduleName, revision, ResolutionStatus.FailedToResolve, context);
			context.errors.push(`Detected an import loop for '${makeFqModuleDisplayName(moduleName, revision)}'!`);
			return false;
		}
		
		if (statusOrModule === ResolutionStatus.FailedToResolve) {
			// Don't add anything to context.errors - this error has already been reported when the resolution for that module failed.
			return false;
		}

		setResolutionStatus(moduleName, revision, ResolutionStatus.BeingResolved, context);

		const { sourceRef, text } = await this.moduleFetcher("module", moduleName, revision !== undefined ? revision : null);
		const parseResult = this.parse(sourceRef, text);

		if (parseResult.result === "error") {
			context.warnings.push(...parseResult.warnings);
			context.errors.push(...parseResult.errors);
			return false; // Bail instantly!
		} else if (parseResult.result === "warning") {
			// Add warnings, but don't stop
			context.warnings.push(...parseResult.warnings);
		}

		// Some sanity checks...
		if (parseResult.module.construct !== "module") {
			setResolutionStatus(moduleName, revision, ResolutionStatus.FailedToResolve, context);
			context.errors.push(`'${moduleName}' is not a module, but a '${parseResult.module.construct}'.`);
			return false;
		} 

		const parsedModule = parseResult.module;
		if (moduleName !== parsedModule.name) {
			setResolutionStatus(moduleName, revision, ResolutionStatus.FailedToResolve, context);
			context.errors.push(`Module requested to be parsed was '${moduleName}' but '${parsedModule.name}' was parsed.`);
			return false;
		}

		const parsedModuleRevision = getModuleRevision(parsedModule);
		if (revision !== null && parsedModuleRevision !== revision) {
			setResolutionStatus(moduleName, parsedModuleRevision, ResolutionStatus.FailedToResolve, context);
			context.errors.push(`Module requested to be parsed was '${makeFqModuleDisplayName(moduleName, revision)}' but '${makeFqModuleDisplayName(parsedModule.name, parsedModuleRevision)}' was parsed.`);
			return false;
		}

		// First handle included submodules
		const submodules = await this.loadSubmodules(parsedModule, parsedModuleRevision, parsedModule.includes, context);
		if (submodules === null) {
			setResolutionStatus(moduleName, parsedModuleRevision, ResolutionStatus.FailedToResolve, context);
			return false;
		}

		const completeModule = merge(parsedModule, submodules);

		// Now resolve imports
		for (const imp of completeModule.imports) {
			if (!await this.resolveModule(imp.identifier, imp.revision, context))
				return false;
		}

		// TODO: Semantic validation here
	
		// This module's loaded!
		setResolutionStatus(moduleName, parsedModuleRevision, completeModule, context);
		return true;
	}

	private async loadSubmodules(owningModule: Module, owningModuleRevision: string | null, includes: Include[], context: ResolutionContext): Promise<Submodule[] | null> {
		const submodules: Submodule[] = [];

		for (const inc of includes) {
			const { sourceRef, text } = await this.moduleFetcher("submodule", inc.identifier, inc.revision);
			const parseResult = this.parse(sourceRef, text);

			if (parseResult.result === "error") {
				context.warnings.push(...parseResult.warnings);
				context.errors.push(...parseResult.errors);
				return null; // Bail instantly!
			} else if (parseResult.result === "warning") {
				// Add warnings, but don't stop
				context.warnings.push(...parseResult.warnings);
			}

			// Some sanity checks...
			if (parseResult.module.construct !== "submodule") {
				context.errors.push(`'${makeFqModuleDisplayName(inc.identifier, inc.revision)}' is not a submodule, but a '${parseResult.module.construct}'.`);
				return null;
			}

			const parsedSubmodule = parseResult.module;
			const parsedSubmoduleRevision = getModuleRevision(parsedSubmodule);
			if (parsedSubmodule.name !== inc.identifier) {
				context.errors.push(`'${makeFqModuleDisplayName(owningModule.name, owningModuleRevision)}' includes submodule ${makeFqModuleDisplayName(inc.identifier, inc.revision)}, but it identifies itself as '${makeFqModuleDisplayName(parsedSubmodule.name, parsedSubmoduleRevision)}'.`);
				return null;
			}

			if (inc.revision !== null && parsedSubmoduleRevision !== inc.revision) {
				context.errors.push(`Submodule requested to be parsed was '${makeFqModuleDisplayName(inc.identifier, inc.revision)}' but '${makeFqModuleDisplayName(parsedSubmodule.name, parsedSubmoduleRevision)}' was parsed.`);
				return null;
			}

			// Make sure the submodule belongs to this module!			
			if (parsedSubmodule.belongsTo !== owningModule.name) {
				context.errors.push(`'${makeFqModuleDisplayName(owningModule.name, owningModuleRevision)}' includes submodule ${makeFqModuleDisplayName(inc.identifier, inc.revision)}, but it belongs to '${parsedSubmodule.belongsTo}'.`);
				return null;
			}			

			submodules.push(parsedSubmodule);

			// Load nested submodules...
			const nestedSubmodules = await this.loadSubmodules(owningModule, owningModuleRevision, parsedSubmodule.includes, context);
			if (nestedSubmodules === null)
				return null;

			submodules.push(...nestedSubmodules);
		}

		return submodules;
	}
}

export function merge(module: Module, submodules: Submodule[]): Module {
	return {
		...module,
		imports: [...module.imports, ...submodules.flatMap(submodule => submodule.imports)],
		body: [...module.body, ...submodules.flatMap(submodule => submodule.body)]
	}
}

export function setResolutionStatus(moduleName: string, revision: string | null, moduleOrStatus: Module | ResolutionStatus, context: ResolutionContext): void {
	let revisedModules = context.modules.get(moduleName);
	if (revisedModules === undefined) {
		context.modules.set(moduleName, revisedModules = new Map<string | null, Module | ResolutionStatus>());
	}

	revisedModules.set(revision, moduleOrStatus);
}

export function getResolutionStatus(moduleName: string, revision: string | null, context: ResolutionContext): ResolutionStatus | Module {
	const revisedModules = context.modules.get(moduleName);
	if (revisedModules === undefined) {
		return ResolutionStatus.Unknown;
	}

	const moduleOrStatus = revisedModules.get(revision);

	if (moduleOrStatus === undefined)
		return ResolutionStatus.Unknown;

	return moduleOrStatus;
}

export function getModuleRevision(module: Module | Submodule): string | null {
	let latestRevision: string | null = null;
	for (const revision of module.revisions) {
		if (latestRevision === null)
			latestRevision = revision.value;
		else if(latestRevision < revision.value)
			latestRevision = revision.value;
	}
	return latestRevision;
}

export function makeFqModuleDisplayName(moduleName: string, revision: string | null): string {
	return makeFqModuleName(moduleName, revision === null ? "<unspecified revision>" : revision);
}

export function makeFqModuleNamePrefix(moduleName: string): string {
	return `${moduleName}@`;
}

export function makeFqModuleName(moduleName: string, revision: string | null): string {
	return `${makeFqModuleNamePrefix(moduleName)}${revision ? revision : ""}`;
}
