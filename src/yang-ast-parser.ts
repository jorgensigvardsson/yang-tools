import { YangStatement } from './yang-stmt-parser';
import {
	ActionBuilder, AnyDataBuilder, AnyXmlBuilder, ArgumentBuilder,
	AugmentationBuilder, BitBuilder, CaseBuilder, ChoiceBuilder,
	ContainerBuilder, Context, DeviationBuilder, DeviationItemBuilder,
	EnumBuilder, ExtensionBuilder, FeatureBuilder, GroupingBuilder,
	IdentityBuilder, ImportBuilder, IncludeBuilder, InputBuilder,
	LeafBuilder, LeafListBuilder, LengthBuilder, ListBuilder,
	ModuleBuilder, MultiValueBuilder, MustBuilder, NotificationBuilder, OutputBuilder,
	PatternBuilder, RangeBuilder, RefineBuilder, RequiredValueBuilder,
	RevisionBuilder, RpcBuilder, SubmoduleBuilder, TypeBuilder,
	TypedefBuilder, UsesBuilder, ValueBuilder, WhenBuilder
} from "./yang-ast-builders";
import { LengthSpecification, PatternModifier, RangeSpecification, Status, UnknownStatement } from "./yang-ast";

function fqKeyword(stmt: YangStatement): string {
	return stmt.prf ? `${stmt.prf}:${stmt.kw}` : stmt.kw;
}

export function createBuilder<T>(context: Context, constructor: { new(context: Context, arg: string): T }): T {
	let trimmed: string | undefined = undefined;

	if (typeof context.stmt.arg === "string") {
		trimmed = context.stmt.arg.trim();
	}

	if (trimmed === undefined) {
		context.addError(`Expected a non-empty string argument for statement '${context.stmt.kw}' in '${context.parentContext?.name ?? "/"}'.`)	
	}

	return new constructor(context, trimmed ?? `<unnamed ${fqKeyword(context.stmt)}>`);
}

export function createBuilderNoArg<T>(context: Context, constructor: { new(context: Context): T }): T {
	let trimmed: string | undefined = undefined;

	if (typeof context.stmt.arg === "string") {
		trimmed = context.stmt.arg.trim();
	}

	if (trimmed !== undefined) {
		context.addWarning(`Did not expect a non-empty string argument for statement '${context.stmt.kw}' in '${context.parentContext?.name ?? "/"}'.`)	
	}

	return new constructor(context);
}

export function expectString(context: Context, valueBuilder: ValueBuilder<string | null>) {
	if (!(typeof context.stmt.arg === "string")) {
		context.addError(`Expected a non-empty string argument for statement '${fqKeyword(context.stmt)}' in '${context.parentContext?.name ?? "/"}'.`);
		return;
	}

	valueBuilder.add(context.stmt.arg);
}

export function expectBoolean(context: Context, valueBuilder: ValueBuilder<boolean | null>) {
	if (!(typeof context.stmt.arg === "string")) {
		context.addError(`Expected a non-empty string argument for statement '${fqKeyword(context.stmt)}' in '${context.parentContext?.name ?? "/"}'.`);
		return;
	}

	switch (context.stmt.arg.trim().toLowerCase()) {
		case "true":
			valueBuilder.add(true);
			break;
		case "false":
			valueBuilder.add(false);
			break;
		default:
			context.addError(`Expected a boolean argument for statement '${fqKeyword(context.stmt)}' in '${context.parentContext?.name ?? "/"}', but got '${context.stmt.arg}'.`);
			break;
	}
}

export function expectStatus(context: Context, valueBuilder: ValueBuilder<Status | null>) {
	if (!(typeof context.stmt.arg === "string")) {
		context.addError(`Expected a non-empty string argument for statement '${fqKeyword(context.stmt)}' in '${context.parentContext?.name ?? "/"}'.`);
		return;
	}

	switch (context.stmt.arg.trim().toLowerCase()) {
		case Status.Current:
			valueBuilder.add(Status.Current);
			break;
		case Status.Deprecated:
			valueBuilder.add(Status.Deprecated);
			break;
		case Status.Obsolete:
			valueBuilder.add(Status.Obsolete);
			break;
		default:
			context.addError(`Expected a status argument for statement '${fqKeyword(context.stmt)}' in '${context.parentContext?.name ?? "/"}', but got '${context.stmt.arg}'.`);
			break;
	}
}

export function expectPatternModifier(context: Context, valueBuilder: ValueBuilder<PatternModifier | null>) {
	if (!(typeof context.stmt.arg === "string")) {
		context.addError(`Expected a non-empty string argument for statement '${fqKeyword(context.stmt)}' in '${context.parentContext?.name ?? "/"}'.`);
		return;
	}

	switch (context.stmt.arg.trim().toLowerCase()) {
		case PatternModifier.InvertMatch:
			valueBuilder.add(PatternModifier.InvertMatch);
			break;
		default:
			context.addError(`Expected a pattern modifier argument for statement '${fqKeyword(context.stmt)}' in '${context.parentContext?.name ?? "/"}', but got '${context.stmt.arg}'.`);
			break;
	}
}

export function expectNumber(context: Context, valueBuilder: ValueBuilder<number | null>) {
	if (!(typeof context.stmt.arg === "string")) {
		context.addError(`Expected a non-empty string argument for statement '${fqKeyword(context.stmt)}' in '${context.parentContext?.name ?? "/"}'.`);
		return;
	}

	const n = parseFloat(context.stmt.arg.trim());
	if (isNaN(n)) {
		context.addError(`Expected a numeric argument for statement '${fqKeyword(context.stmt)}' in '${context.parentContext?.name ?? "/"}', but got '${context.stmt.arg}'.`);
	} else
		valueBuilder.add(n);
}

interface ParseRule {
	readonly kw: string;
	readonly patternModifierBuilder?: ValueBuilder<PatternModifier>;
	readonly stringValueBuilder?: ValueBuilder<string>;
	readonly defaultStringValue?: string;
	readonly booleanValueBuilder?: ValueBuilder<boolean>;
	readonly numberValueBuilder?: ValueBuilder<number>;
	readonly statusValueBuilder?: ValueBuilder<Status>;
	readonly parseOne?: (context: Context) => void;
	readonly parseZeroOrMore?: (context: Context) => void;
	readonly parseZeroOrOne?: (context: Context) => void;
}

function makeUnknownStatement(stmt: YangStatement): UnknownStatement {
	return ({
		metadata: stmt.metadata,
		prefix: stmt.prf === "" ? null : stmt.prf,
		keyword: stmt.kw,
		argument: typeof stmt.arg === "boolean" ? null : stmt.arg,
		subStatements: stmt.substmts.map(sub => makeUnknownStatement(sub))
	})
}

function parseKeywordSubStatements(context: Context, unknownStatements: UnknownStatement[], parseRules: ParseRule[]) {
	const keywordsSeen = new Map<string, number>();

	for (const subStmt of context.stmt.substmts) {
		const fqkw = fqKeyword(subStmt);
		const kwCount = keywordsSeen.get(fqkw) ?? 0;

		if (subStmt.prf === "") {
			const rule = parseRules.find(r => r.kw == subStmt.kw);
			if (rule) {
				const handlers = [
					rule.stringValueBuilder, 
					rule.booleanValueBuilder,
					rule.numberValueBuilder,
					rule.statusValueBuilder,
					rule.patternModifierBuilder,
					rule.parseOne,
					rule.parseZeroOrMore,
					rule.parseZeroOrOne
				];
				
				if (1 !== handlers.reduce((prev, curr) => prev + (curr === undefined ? 0 : 1), 0))
					throw new Error(`Misconfigured parser rule for key word ${rule.kw}!`);

				if (rule.stringValueBuilder)
					expectString(context.pushContext(subStmt), rule.stringValueBuilder);
				if (rule.booleanValueBuilder)
					expectBoolean(context.pushContext(subStmt), rule.booleanValueBuilder);
				if (rule.numberValueBuilder)
					expectNumber(context.pushContext(subStmt), rule.numberValueBuilder);
				if (rule.statusValueBuilder)
					expectStatus(context.pushContext(subStmt), rule.statusValueBuilder);
				if (rule.patternModifierBuilder)
					expectPatternModifier(context.pushContext(subStmt), rule.patternModifierBuilder);
				if (rule.parseZeroOrOne)
					rule.parseZeroOrOne(context.pushContext(subStmt));
				if (rule.parseZeroOrMore)
					rule.parseZeroOrMore(context.pushContext(subStmt));
				if (rule.parseOne)
					rule.parseOne(context.pushContext(subStmt));
			} else {
				unknownStatements.push(makeUnknownStatement(subStmt))
			}
		} else {
			unknownStatements.push(makeUnknownStatement(subStmt));
		}

		keywordsSeen.set(fqkw, kwCount + 1);
	}

	const isScalarBuilder = (builder: ValueBuilder<unknown>) => !(builder instanceof MultiValueBuilder);

	for (const rule of parseRules) {
		const isScalar = rule.booleanValueBuilder && isScalarBuilder(rule.booleanValueBuilder) ||
			rule.stringValueBuilder && isScalarBuilder(rule.stringValueBuilder) ||
			rule.patternModifierBuilder && isScalarBuilder(rule.patternModifierBuilder) ||
			rule.numberValueBuilder && isScalarBuilder(rule.numberValueBuilder) ||
			rule.statusValueBuilder && isScalarBuilder(rule.statusValueBuilder) ||
			rule.parseOne !== undefined
			rule.parseZeroOrOne !== undefined;

		const isRequired = rule.stringValueBuilder instanceof RequiredValueBuilder || rule.parseOne !== undefined;

		const kwCount = keywordsSeen.get(rule.kw) ?? 0;

		if (isScalar) {
			if (isRequired && kwCount === 0) {
				const hasDefaultValue = rule.stringValueBuilder && rule.defaultStringValue !== undefined;

				if (!hasDefaultValue)
					context.addError(`Required statement '${rule.kw}' not found in '${context.name}'.`);
				else {
					rule.stringValueBuilder.add(rule.defaultStringValue);
					context.addWarning(`Statement '${rule.kw}' defaults to '${rule.defaultStringValue}' in '${context.name}'.`);
				}
			} else if (kwCount > 1) {
				context.addError(`Statement '${rule.kw}' repeated ${kwCount - 1} times in '${context.name}'.`);
			}
		}
	}
}

export function parseRevision(context: Context): RevisionBuilder {
	const builder = createBuilder(context, RevisionBuilder);

	parseKeywordSubStatements(
		builder.context,
		builder.unknownStatements,
		[
			{ kw: "description", stringValueBuilder: builder.description },
			{ kw: "reference", stringValueBuilder: builder.reference },
		]
	)

	return builder;
}

export function parseWhen(context: Context): WhenBuilder {
	const builder = createBuilder(context, WhenBuilder);

	parseKeywordSubStatements(
		builder.context,
		builder.unknownStatements,
		[
			{ kw: "description", stringValueBuilder: builder.description },
			{ kw: "reference", stringValueBuilder: builder.reference },
		]
	)

	return builder;
}

export function parseMust(context: Context): MustBuilder {
	const builder = createBuilder(context, MustBuilder);

	parseKeywordSubStatements(
		builder.context,
		builder.unknownStatements,
		[
			{ kw: "error-app-tag", stringValueBuilder: builder.errorAppTag },
			{ kw: "error-message", stringValueBuilder: builder.errorMessage },
			{ kw: "description", stringValueBuilder: builder.description },
			{ kw: "reference", stringValueBuilder: builder.reference },
		]
	)

	return builder;
}

export function parseImport(context: Context): ImportBuilder {
	const builder = createBuilder(context, ImportBuilder);

	parseKeywordSubStatements(
		builder.context,
		builder.unknownStatements,
		[
			{ kw: "prefix", stringValueBuilder: builder.prefix },
			{ kw: "revision", stringValueBuilder: builder.revision },
			{ kw: "description", stringValueBuilder: builder.description },
			{ kw: "reference", stringValueBuilder: builder.reference }
		]
	)

	return builder;
}

export function parseInclude(context: Context): IncludeBuilder {
	const builder = createBuilder(context, IncludeBuilder);

	parseKeywordSubStatements(
		builder.context,
		builder.unknownStatements,
		[
			{ kw: "revision", stringValueBuilder: builder.revision },
			{ kw: "description", stringValueBuilder: builder.description },
			{ kw: "reference", stringValueBuilder: builder.reference }
		]
	)

	return builder;
}

export function parseModule(context: Context): ModuleBuilder {
	const builder = createBuilder(context, ModuleBuilder);

	parseKeywordSubStatements(
		builder.context,
		builder.unknownStatements,
		[
			{ kw: "prefix", stringValueBuilder: builder.prefix },
			{ kw: "namespace", stringValueBuilder: builder.namespace },
			{ kw: "yang-version", stringValueBuilder: builder.yangVersion, defaultStringValue: "1" },
			{ kw: "organization", stringValueBuilder: builder.organization },
			{ kw: "contact", stringValueBuilder: builder.contact },
			{ kw: "reference", stringValueBuilder: builder.reference },
			{ kw: "description", stringValueBuilder: builder.description },
			{ kw: "revision", parseZeroOrMore: context => builder.revisions.push(parseRevision(context)) },
			{ kw: "import", parseZeroOrMore: context => builder.imports.push(parseImport(context)) },
			{ kw: "include", parseZeroOrMore: context => builder.includes.push(parseInclude(context)) },
			{ kw: "extension", parseZeroOrMore: context => builder.body.push(parseExtension(context))},
			{ kw: "feature", parseZeroOrMore: context => builder.body.push(parseFeature(context))},
			{ kw: "identity", parseZeroOrMore: context => builder.body.push(parseIdentity(context))},
			{ kw: "typedef", parseZeroOrMore: context => builder.body.push(parseTypedef(context))},
			{ kw: "grouping", parseZeroOrMore: context => builder.body.push(parseGrouping(context))},

			// dataDefinitions
			{ kw: "uses", parseZeroOrMore: context => builder.body.push(parseUses(context)) },
			{ kw: "container", parseZeroOrMore: context => builder.body.push(parseContainer(context)) },
			{ kw: "leaf", parseZeroOrMore: context => builder.body.push(parseLeaf(context)) },
			{ kw: "leaf-list", parseZeroOrMore: context => builder.body.push(parseLeafList(context)) },
			{ kw: "list", parseZeroOrMore: context => builder.body.push(parseList(context)) },
			{ kw: "choice", parseZeroOrMore: context => builder.body.push(parseChoice(context)) },
			{ kw: "anydata", parseZeroOrMore: context => builder.body.push(parseAnyData(context)) },
			{ kw: "anyxml", parseZeroOrMore: context => builder.body.push(parseAnyXml(context)) },

			{ kw: "augment", parseZeroOrMore: context => builder.body.push(parseAugmentation(context))},
			{ kw: "rpc", parseZeroOrMore: context => builder.body.push(parseRpc(context))},
			{ kw: "notification", parseZeroOrMore: context => builder.body.push(parseNotification(context))},
			{ kw: "deviation", parseZeroOrMore: context => builder.body.push(parseDeviation(context))},
		]
	)

	return builder;
}

export function parseSubmodule(context: Context): SubmoduleBuilder {
	const builder = createBuilder(context, SubmoduleBuilder);

	parseKeywordSubStatements(
		builder.context,
		builder.unknownStatements,
		[
			{ kw: "belongs-to", stringValueBuilder: builder.belongsTo },
			{ kw: "yang-version", stringValueBuilder: builder.yangVersion, defaultStringValue: "1" },
			{ kw: "organization", stringValueBuilder: builder.organization },
			{ kw: "contact", stringValueBuilder: builder.contact },
			{ kw: "reference", stringValueBuilder: builder.reference },
			{ kw: "description", stringValueBuilder: builder.description },
			{ kw: "revision", parseZeroOrMore: context => builder.revisions.push(parseRevision(context)) },
			{ kw: "import", parseZeroOrMore: context => builder.imports.push(parseImport(context)) },
			{ kw: "include", parseZeroOrMore: context => builder.includes.push(parseInclude(context)) },
			{ kw: "extension", parseZeroOrMore: context => builder.body.push(parseExtension(context))},
			{ kw: "feature", parseZeroOrMore: context => builder.body.push(parseFeature(context))},
			{ kw: "identity", parseZeroOrMore: context => builder.body.push(parseIdentity(context))},
			{ kw: "typedef", parseZeroOrMore: context => builder.body.push(parseTypedef(context))},
			{ kw: "grouping", parseZeroOrMore: context => builder.body.push(parseGrouping(context))},

			// dataDefinitions
			{ kw: "uses", parseZeroOrMore: context => builder.body.push(parseUses(context)) },
			{ kw: "container", parseZeroOrMore: context => builder.body.push(parseContainer(context)) },
			{ kw: "leaf", parseZeroOrMore: context => builder.body.push(parseLeaf(context)) },
			{ kw: "leaf-list", parseZeroOrMore: context => builder.body.push(parseLeafList(context)) },
			{ kw: "list", parseZeroOrMore: context => builder.body.push(parseList(context)) },
			{ kw: "choice", parseZeroOrMore: context => builder.body.push(parseChoice(context)) },
			{ kw: "anydata", parseZeroOrMore: context => builder.body.push(parseAnyData(context)) },
			{ kw: "anyxml", parseZeroOrMore: context => builder.body.push(parseAnyXml(context)) },

			{ kw: "augment", parseZeroOrMore: context => builder.body.push(parseAugmentation(context))},
			{ kw: "rpc", parseZeroOrMore: context => builder.body.push(parseRpc(context))},
			{ kw: "notification", parseZeroOrMore: context => builder.body.push(parseNotification(context))},
			{ kw: "deviation", parseZeroOrMore: context => builder.body.push(parseDeviation(context))},
		]
	)

	return builder;
}

export function parseRefine(context: Context): RefineBuilder {
	const builder = createBuilder(context, RefineBuilder);

	parseKeywordSubStatements(
		builder.context,
		builder.unknownStatements,
		[
			{ kw: "if-feature", stringValueBuilder: builder.ifFeatures },
			{ kw: "must", parseZeroOrMore: context => builder.musts.push(parseMust(context)) },
			{ kw: "presence", stringValueBuilder: builder.presence },
			{ kw: "default", stringValueBuilder: builder.defaults },
			{ kw: "config", booleanValueBuilder: builder.config },
			{ kw: "mandatory", booleanValueBuilder: builder.mandatory },
			{ kw: "min-elements", numberValueBuilder: builder.minElements },
			{ kw: "max-elements", numberValueBuilder: builder.maxElements },
			{ kw: "description", stringValueBuilder: builder.description },
			{ kw: "reference", stringValueBuilder: builder.reference },
		]
	)

	return builder;
}

export function parseEnum(context: Context, currentEnumValue: number): { builder: EnumBuilder, nextEnumValue: number } {
	const builder = createBuilder(context, EnumBuilder);

	parseKeywordSubStatements(
		builder.context,
		builder.unknownStatements,
		[
			{ kw: "value", numberValueBuilder: builder.value },
			{ kw: "status", statusValueBuilder: builder.status },
			{ kw: "description", stringValueBuilder: builder.description },
			{ kw: "reference", stringValueBuilder: builder.reference },
		]
	)

	if (!builder.value.isSet()) {
		builder.value.add(currentEnumValue);
	}

	return { builder, nextEnumValue: builder.value.get() + 1 };
}

export function parseBit(context: Context, currentPosition: number): { builder: BitBuilder, nextPosition: number } {
	const builder = createBuilder(context, BitBuilder);

	parseKeywordSubStatements(
		builder.context,
		builder.unknownStatements,
		[
			{ kw: "position", numberValueBuilder: builder.position },
			{ kw: "if-feature", stringValueBuilder: builder.ifFeatures },
			{ kw: "status", statusValueBuilder: builder.status },
			{ kw: "description", stringValueBuilder: builder.description },
			{ kw: "reference", stringValueBuilder: builder.reference },
		]
	)

	if (!builder.position.isSet()) {
		builder.position.add(currentPosition);
	}

	return { builder, nextPosition: builder.position.get() + 1 };
}

export function parsePattern(context: Context): PatternBuilder {
	const builder = createBuilder(context, PatternBuilder);

	parseKeywordSubStatements(
		builder.context,
		builder.unknownStatements,
		[
			{ kw: "modifier", patternModifierBuilder: builder.modifier },
			{ kw: "error-app-tag", stringValueBuilder: builder.errorAppTag },
			{ kw: "error-message", stringValueBuilder: builder.errorMessage },
			{ kw: "description", stringValueBuilder: builder.description },
			{ kw: "reference", stringValueBuilder: builder.reference },
		]
	)

	return builder;
}

/*
 * <length-spec> ::= <length-part> ("|" length-part)*
 * <length-part> ::= <length-boundary> (".." <length-boundary>)?
 * <length-boundary> ::= "min" | "max" | non-negative-integer
 */

export function parseLengthSpecification(part: string, context: Context): LengthSpecification | undefined {
	const boundaries = part.split("..");

	if (boundaries.length === 0 || boundaries.length > 2) {
		context.addError(`Invalid length part '${part}' for length statement in '${context.name}'.`)
		return undefined;
	}

	const lowerBound = parseLengthBoundary(boundaries[0], context);
	const upperBound = boundaries.length === 2 ? parseLengthBoundary(boundaries[1], context) : null;

	if (lowerBound === undefined || upperBound === undefined) {
		return undefined;
	}

	if (upperBound !== null) {
		if (typeof lowerBound === "number" && typeof upperBound === "number") {
			if (lowerBound > upperBound) {
				context.addError(`Invalid interval '${part}' for length statement in '${context.name}' (min mustn't > max).`)
				return undefined;
			}
		} else if(lowerBound === "max" && upperBound !== "max") {
			context.addError(`Invalid interval '${part}' for length statement in '${context.name}' (min mustn't > max).`)
			return undefined;
		}
	}

	return {
		lowerBound: lowerBound,
		upperBound: upperBound
	}
}

export function parseLengthBoundary(str: string, context: Context): number | "min" | "max" | undefined {
	switch(str.toLowerCase()) {
		case "min": return "min";
		case "max": return "max";
		default: {
			const num = parseInt(str);
			if (isNaN(num) || num < 0) {
				context.addError(`Invalid boundary number '${str}' in length statement '${context.name}'.`)
				return undefined;
			}
			return num;
		}
	}
}

export function parseLengthSpecifications(specs: string, context: Context): LengthSpecification[] {
	const parts = specs.split('|');

	const builders: LengthSpecification[] = [];
	for (const part of parts) {
		const builder = parseLengthSpecification(part.trim(), context);
		if (builder !== undefined) {
			builders.push(builder);
		}
	}
	return builders;
}

export function parseLength(context: Context): LengthBuilder {
	let specificationString: string;
	let lengthSpecifications: LengthSpecification[] = [];

	if (!(typeof context.stmt.arg === "string") || context.stmt.arg.trim() === "") {
		specificationString = "<unspecified length>";
		context.addError(`Expected a non-empty string argument for statement '${fqKeyword(context.stmt)}' in ${context.name}.`);		
	} else {
		specificationString = context.stmt.arg;
		lengthSpecifications = parseLengthSpecifications(specificationString.trim(), context);
	}

	const builder = new LengthBuilder(lengthSpecifications, context);

	parseKeywordSubStatements(
		builder.context,
		builder.unknownStatements,
		[
			{ kw: "error-app-tag", stringValueBuilder: builder.errorAppTag },
			{ kw: "error-message", stringValueBuilder: builder.errorMessage },
			{ kw: "description", stringValueBuilder: builder.description },
			{ kw: "reference", stringValueBuilder: builder.reference },
		]
	)

	return builder;
}

/*
 * <range-spec> ::= <range-part> ("|" range-part)*
 * <range-part> ::= <range-boundary> (".." <range-boundary>)?
 * <range-boundary> ::= "min" | "max" | number
 */

export function parseRangeSpecification(part: string, context: Context): RangeSpecification | undefined {
	const boundaries = part.split("..");

	if (boundaries.length === 0 || boundaries.length > 2) {
		context.addError(`Invalid range part '${part}' for range statement in '${context.name}'.`)
		return undefined;
	}

	const lowerBound = parseRangeBoundary(boundaries[0], context);
	const upperBound = boundaries.length === 2 ? parseRangeBoundary(boundaries[1], context) : null;

	if (lowerBound === undefined || upperBound === undefined) {
		return undefined;
	}

	if (upperBound !== null) {
		if (typeof lowerBound === "number" && typeof upperBound === "number") {
			if (lowerBound > upperBound) {
				context.addError(`Invalid interval '${part}' for range statement in '${context.name}' (min mustn't > max).`)
				return undefined;
			}
		} else if(lowerBound === "max" && upperBound !== "max") {
			context.addError(`Invalid interval '${part}' for range statement in '${context.name}' (min mustn't > max).`)
			return undefined;
		}
	}

	return {
		lowerBound: lowerBound,
		upperBound: upperBound
	}
}

export function parseRangeBoundary(str: string, context: Context): number | "min" | "max" | undefined {
	switch(str.toLowerCase()) {
		case "min": return "min";
		case "max": return "max";
		default: {
			const num = parseFloat(str);
			if (isNaN(num)) {
				context.addError(`Invalid boundary number '${str}' in range statement '${context.name}'.`)
				return undefined;
			}
			return num;
		}
	}
}

export function parseRangeSpecifications(specs: string, context: Context): RangeSpecification[] {
	const parts = specs.split('|');

	const builders: RangeSpecification[] = [];
	for (const part of parts) {
		const builder = parseRangeSpecification(part.trim(), context);
		if (builder !== undefined) {
			builders.push(builder);
		}
	}
	return builders;
}

export function parseRange(context: Context): RangeBuilder {
	let specificationString: string;
	let rangeSpecifications: RangeSpecification[] = [];

	if (!(typeof context.stmt.arg === "string") || context.stmt.arg.trim() === "") {
		specificationString = "<unspecified range>";
		context.addError(`Expected a non-empty string argument for statement '${fqKeyword(context.stmt)}' in ${context.name}.`);		
	} else {
		specificationString = context.stmt.arg;
		rangeSpecifications = parseRangeSpecifications(specificationString.trim(), context);
	}

	const builder = new RangeBuilder(rangeSpecifications, context);

	parseKeywordSubStatements(
		builder.context,
		builder.unknownStatements,
		[
			{ kw: "error-app-tag", stringValueBuilder: builder.errorAppTag },
			{ kw: "error-message", stringValueBuilder: builder.errorMessage },
			{ kw: "description", stringValueBuilder: builder.description },
			{ kw: "reference", stringValueBuilder: builder.reference },
		]
	)

	return builder;
}

export function parseType(context: Context): TypeBuilder {
	const builder = createBuilder(context, TypeBuilder);

	let currentBitPosition = 0;
	let currentEnumValue = 0;

	parseKeywordSubStatements(
		builder.context,
		builder.unknownStatements,
		[
			{ kw: "range", parseZeroOrMore: context => builder.range.add(parseRange(context)) },
			{ kw: "fraction-digits", numberValueBuilder: builder.fractionDigits },
			{ kw: "length", parseZeroOrOne: context => builder.length.add(parseLength(context)) },
			{ kw: "pattern", parseZeroOrMore: context => builder.patterns.push(parsePattern(context)) },
			{ kw: "path", stringValueBuilder: builder.path },
			{ kw: "bit", parseZeroOrMore: context => { const res = parseBit(context, currentBitPosition); builder.bits.push(res.builder); currentBitPosition = res.nextPosition; } },
			{ kw: "enum", parseZeroOrMore: context => { const res = parseEnum(context, currentEnumValue); builder.enums.push(res.builder); currentEnumValue = res.nextEnumValue; } },
			{ kw: "base", stringValueBuilder: builder.bases },
			{ kw: "type", parseZeroOrMore: context => builder.unionTypes.push(parseType(context)) },
			{ kw: "require-instance", booleanValueBuilder: builder.requireInstance }
		]
	)

	return builder;
}

export function parseTypedef(context: Context): TypedefBuilder {
	const builder = createBuilder(context, TypedefBuilder);

	parseKeywordSubStatements(
		builder.context,
		builder.unknownStatements,
		[
			{ kw: "type", parseOne: context => builder.type.add(parseType(context)) },
			{ kw: "units", stringValueBuilder: builder.units },
			{ kw: "default", stringValueBuilder: builder.default },
			{ kw: "status", statusValueBuilder: builder.status },
			{ kw: "description", stringValueBuilder: builder.description },
			{ kw: "reference", stringValueBuilder: builder.reference }
		]
	)

	return builder;
}

export function parseArgument(context: Context): ArgumentBuilder {
	const builder = createBuilder(context, ArgumentBuilder);

	parseKeywordSubStatements(
		builder.context,
		builder.unknownStatements,
		[
			{ kw: "yin-element", booleanValueBuilder: builder.yinElement }
		]
	)

	return builder;
}

export function parseExtension(context: Context): ExtensionBuilder {
	const builder = createBuilder(context, ExtensionBuilder);

	parseKeywordSubStatements(
		builder.context,
		builder.unknownStatements,
		[
			{ kw: "argument", parseZeroOrOne: context => builder.argument.add(parseArgument(context)) },
			{ kw: "status", statusValueBuilder: builder.status },
			{ kw: "description", stringValueBuilder: builder.description },
			{ kw: "reference", stringValueBuilder: builder.reference }
		]
	)

	return builder;
}

export function parseFeature(context: Context): FeatureBuilder {
	const builder = createBuilder(context, FeatureBuilder);

	parseKeywordSubStatements(
		builder.context,
		builder.unknownStatements,
		[
			{ kw: "if-feature", stringValueBuilder: builder.ifFeatures },
			{ kw: "status", statusValueBuilder: builder.status },
			{ kw: "description", stringValueBuilder: builder.description },
			{ kw: "reference", stringValueBuilder: builder.reference }
		]
	)

	return builder;
}

export function parseIdentity(context: Context): IdentityBuilder {
	const builder = createBuilder(context, IdentityBuilder);

	parseKeywordSubStatements(
		builder.context,
		builder.unknownStatements,
		[
			{ kw: "base", stringValueBuilder: builder.bases },
			{ kw: "if-feature", stringValueBuilder: builder.ifFeatures },
			{ kw: "status", statusValueBuilder: builder.status },
			{ kw: "description", stringValueBuilder: builder.description },
			{ kw: "reference", stringValueBuilder: builder.reference }
		]
	)

	return builder;
}

export function parseUses(context: Context): UsesBuilder {
	const builder = createBuilder(context, UsesBuilder);

	parseKeywordSubStatements(
		builder.context,
		builder.unknownStatements,
		[
			{ kw: "when", parseZeroOrOne: context => builder.when.add(parseWhen(context)) },
			{ kw: "if-feature", stringValueBuilder: builder.ifFeatures },
			{ kw: "status", statusValueBuilder: builder.status },
			{ kw: "description", stringValueBuilder: builder.description },
			{ kw: "reference", stringValueBuilder: builder.reference },
			{ kw: "refine", parseZeroOrMore: context => builder.refines.push(parseRefine(context)) },
			{ kw: "augment", parseZeroOrMore: context => builder.augmentations.push(parseAugmentation(context)) }
		]
	)

	return builder;
}

export function parseAugmentation(context: Context): AugmentationBuilder {
	const builder = createBuilder(context, AugmentationBuilder);

	parseKeywordSubStatements(
		builder.context,
		builder.unknownStatements,
		[
			{ kw: "when", parseZeroOrOne: context => builder.when.add(parseWhen(context)) },
			{ kw: "if-feature", stringValueBuilder: builder.ifFeatures },
			{ kw: "status", statusValueBuilder: builder.status },
			{ kw: "description", stringValueBuilder: builder.description },
			{ kw: "reference", stringValueBuilder: builder.reference },
			
			// statements
			{ kw: "uses", parseZeroOrMore: context => builder.statements.push(parseUses(context)) },
			{ kw: "container", parseZeroOrMore: context => builder.statements.push(parseContainer(context)) },
			{ kw: "leaf", parseZeroOrMore: context => builder.statements.push(parseLeaf(context)) },
			{ kw: "leaf-list", parseZeroOrMore: context => builder.statements.push(parseLeafList(context)) },
			{ kw: "list", parseZeroOrMore: context => builder.statements.push(parseList(context)) },
			{ kw: "choice", parseZeroOrMore: context => builder.statements.push(parseChoice(context)) },
			{ kw: "anydata", parseZeroOrMore: context => builder.statements.push(parseAnyData(context)) },
			{ kw: "anyxml", parseZeroOrMore: context => builder.statements.push(parseAnyXml(context)) },
			{ kw: "case", parseZeroOrMore: context => builder.statements.push(parseCase(context)) },
			{ kw: "action", parseZeroOrMore: context => builder.statements.push(parseAction(context)) },
			{ kw: "notification", parseZeroOrMore: context => builder.statements.push(parseNotification(context)) },
		]
	)

	return builder;
}

export function parseCase(context: Context): CaseBuilder {
	const builder = createBuilder(context, CaseBuilder);

	parseKeywordSubStatements(
		builder.context,
		builder.unknownStatements,
		[
			{ kw: "when", parseZeroOrOne: context => builder.when.add(parseWhen(context)) },
			{ kw: "if-feature", stringValueBuilder: builder.ifFeatures },
			{ kw: "status", statusValueBuilder: builder.status },
			{ kw: "description", stringValueBuilder: builder.description },
			{ kw: "reference", stringValueBuilder: builder.reference },
			
			// dataDefinitions
			{ kw: "uses", parseZeroOrMore: context => builder.dataDefinitions.push(parseUses(context)) },
			{ kw: "container", parseZeroOrMore: context => builder.dataDefinitions.push(parseContainer(context)) },
			{ kw: "leaf", parseZeroOrMore: context => builder.dataDefinitions.push(parseLeaf(context)) },
			{ kw: "leaf-list", parseZeroOrMore: context => builder.dataDefinitions.push(parseLeafList(context)) },
			{ kw: "list", parseZeroOrMore: context => builder.dataDefinitions.push(parseList(context)) },
			{ kw: "choice", parseZeroOrMore: context => builder.dataDefinitions.push(parseChoice(context)) },
			{ kw: "anydata", parseZeroOrMore: context => builder.dataDefinitions.push(parseAnyData(context)) },
			{ kw: "anyxml", parseZeroOrMore: context => builder.dataDefinitions.push(parseAnyXml(context)) }
		]
	)

	return builder;
}

export function parseAction(context: Context): ActionBuilder {
	const builder = createBuilder(context, ActionBuilder);

	parseKeywordSubStatements(
		builder.context,
		builder.unknownStatements,
		[
			{ kw: "if-feature", stringValueBuilder: builder.ifFeatures },
			{ kw: "status", statusValueBuilder: builder.status },
			{ kw: "description", stringValueBuilder: builder.description },
			{ kw: "reference", stringValueBuilder: builder.reference },
			
			// typedefsOrGroupings
			{ kw: "typedef", parseZeroOrMore: context => builder.typedefsOrGroupings.push(parseTypedef(context)) },
			{ kw: "grouping", parseZeroOrMore: context => builder.typedefsOrGroupings.push(parseGrouping(context)) },

			{ kw: "input", parseZeroOrOne: context => builder.input.add(parseInput(context)) },
			{ kw: "output", parseZeroOrOne: context => builder.output.add(parseOutput(context)) }
		]
	)

	return builder;
}

export function parseRpc(context: Context): RpcBuilder {
	const builder = createBuilder(context, RpcBuilder);

	parseKeywordSubStatements(
		builder.context,
		builder.unknownStatements,
		[
			{ kw: "if-feature", stringValueBuilder: builder.ifFeatures },
			{ kw: "status", statusValueBuilder: builder.status },
			{ kw: "description", stringValueBuilder: builder.description },
			{ kw: "reference", stringValueBuilder: builder.reference },
			
			// typedefsOrGroupings
			{ kw: "typedef", parseZeroOrMore: context => builder.typedefsOrGroupings.push(parseTypedef(context)) },
			{ kw: "grouping", parseZeroOrMore: context => builder.typedefsOrGroupings.push(parseGrouping(context)) },

			{ kw: "input", parseZeroOrOne: context => builder.input.add(parseInput(context)) },
			{ kw: "output", parseZeroOrOne: context => builder.output.add(parseOutput(context)) }
		]
	)

	return builder;
}

export function parseNotification(context: Context): NotificationBuilder {
	const builder = createBuilder(context, NotificationBuilder);

	parseKeywordSubStatements(
		builder.context,
		builder.unknownStatements,
		[
			{ kw: "if-feature", stringValueBuilder: builder.ifFeatures },
			{ kw: "status", statusValueBuilder: builder.status },
			{ kw: "description", stringValueBuilder: builder.description },
			{ kw: "reference", stringValueBuilder: builder.reference },

			{ kw: "must", parseZeroOrMore: context => builder.musts.push(parseMust(context)) },
			
			// typedefsOrGroupings
			{ kw: "typedef", parseZeroOrMore: context => builder.typedefsOrGroupings.push(parseTypedef(context)) },
			{ kw: "grouping", parseZeroOrMore: context => builder.typedefsOrGroupings.push(parseGrouping(context)) },

			// dataDefinitions
			{ kw: "uses", parseZeroOrMore: context => builder.dataDefinitions.push(parseUses(context)) },
			{ kw: "container", parseZeroOrMore: context => builder.dataDefinitions.push(parseContainer(context)) },
			{ kw: "leaf", parseZeroOrMore: context => builder.dataDefinitions.push(parseLeaf(context)) },
			{ kw: "leaf-list", parseZeroOrMore: context => builder.dataDefinitions.push(parseLeafList(context)) },
			{ kw: "list", parseZeroOrMore: context => builder.dataDefinitions.push(parseList(context)) },
			{ kw: "choice", parseZeroOrMore: context => builder.dataDefinitions.push(parseChoice(context)) },
			{ kw: "anydata", parseZeroOrMore: context => builder.dataDefinitions.push(parseAnyData(context)) },
			{ kw: "anyxml", parseZeroOrMore: context => builder.dataDefinitions.push(parseAnyXml(context)) }
		]
	)

	return builder;
}

export function parseGrouping(context: Context): GroupingBuilder {
	const builder = createBuilder(context, GroupingBuilder);

	parseKeywordSubStatements(
		builder.context,
		builder.unknownStatements,
		[
			{ kw: "status", statusValueBuilder: builder.status },
			{ kw: "description", stringValueBuilder: builder.description },
			{ kw: "reference", stringValueBuilder: builder.reference },
			
			// typedefsOrGroupings
			{ kw: "typedef", parseZeroOrMore: context => builder.typedefsOrGroupings.push(parseTypedef(context)) },
			{ kw: "grouping", parseZeroOrMore: context => builder.typedefsOrGroupings.push(parseGrouping(context)) },

			// dataDefinitions
			{ kw: "uses", parseZeroOrMore: context => builder.dataDefinitions.push(parseUses(context)) },
			{ kw: "container", parseZeroOrMore: context => builder.dataDefinitions.push(parseContainer(context)) },
			{ kw: "leaf", parseZeroOrMore: context => builder.dataDefinitions.push(parseLeaf(context)) },
			{ kw: "leaf-list", parseZeroOrMore: context => builder.dataDefinitions.push(parseLeafList(context)) },
			{ kw: "list", parseZeroOrMore: context => builder.dataDefinitions.push(parseList(context)) },
			{ kw: "choice", parseZeroOrMore: context => builder.dataDefinitions.push(parseChoice(context)) },
			{ kw: "anydata", parseZeroOrMore: context => builder.dataDefinitions.push(parseAnyData(context)) },
			{ kw: "anyxml", parseZeroOrMore: context => builder.dataDefinitions.push(parseAnyXml(context)) },

			{ kw: "action", parseZeroOrMore: context => builder.actions.push(parseAction(context)) },
			{ kw: "notification", parseZeroOrMore: context => builder.notifications.push(parseNotification(context)) },
		]
	)

	return builder;
}


export function parseInput(context: Context): InputBuilder {
	const builder = createBuilderNoArg(context, InputBuilder);

	parseKeywordSubStatements(
		builder.context,
		builder.unknownStatements,
		[
			{ kw: "must", parseZeroOrMore: context => builder.musts.push(parseMust(context)) },

			// typedefsOrGroupings
			{ kw: "typedef", parseZeroOrMore: context => builder.typedefsOrGroupings.push(parseTypedef(context)) },
			{ kw: "grouping", parseZeroOrMore: context => builder.typedefsOrGroupings.push(parseGrouping(context)) },

			// dataDefinitions
			{ kw: "uses", parseZeroOrMore: context => builder.dataDefinitions.push(parseUses(context)) },
			{ kw: "container", parseZeroOrMore: context => builder.dataDefinitions.push(parseContainer(context)) },
			{ kw: "leaf", parseZeroOrMore: context => builder.dataDefinitions.push(parseLeaf(context)) },
			{ kw: "leaf-list", parseZeroOrMore: context => builder.dataDefinitions.push(parseLeafList(context)) },
			{ kw: "list", parseZeroOrMore: context => builder.dataDefinitions.push(parseList(context)) },
			{ kw: "choice", parseZeroOrMore: context => builder.dataDefinitions.push(parseChoice(context)) },
			{ kw: "anydata", parseZeroOrMore: context => builder.dataDefinitions.push(parseAnyData(context)) },
			{ kw: "anyxml", parseZeroOrMore: context => builder.dataDefinitions.push(parseAnyXml(context)) }
		]
	)

	if (builder.dataDefinitions.length < 1) {
		builder.context.addError(`At least one data definition is missing in ${builder.context.name}.`);
	}

	return builder;
}

export function parseOutput(context: Context): OutputBuilder {
	const builder = createBuilderNoArg(context, OutputBuilder);

	parseKeywordSubStatements(
		builder.context,
		builder.unknownStatements,
		[
			{ kw: "must", parseZeroOrMore: context => builder.musts.push(parseMust(context)) },

			// typedefsOrGroupings
			{ kw: "typedef", parseZeroOrMore: context => builder.typedefsOrGroupings.push(parseTypedef(context)) },
			{ kw: "grouping", parseZeroOrMore: context => builder.typedefsOrGroupings.push(parseGrouping(context)) },

			// dataDefinitions
			{ kw: "uses", parseZeroOrMore: context => builder.dataDefinitions.push(parseUses(context)) },
			{ kw: "container", parseZeroOrMore: context => builder.dataDefinitions.push(parseContainer(context)) },
			{ kw: "leaf", parseZeroOrMore: context => builder.dataDefinitions.push(parseLeaf(context)) },
			{ kw: "leaf-list", parseZeroOrMore: context => builder.dataDefinitions.push(parseLeafList(context)) },
			{ kw: "list", parseZeroOrMore: context => builder.dataDefinitions.push(parseList(context)) },
			{ kw: "choice", parseZeroOrMore: context => builder.dataDefinitions.push(parseChoice(context)) },
			{ kw: "anydata", parseZeroOrMore: context => builder.dataDefinitions.push(parseAnyData(context)) },
			{ kw: "anyxml", parseZeroOrMore: context => builder.dataDefinitions.push(parseAnyXml(context)) }
		]
	)

	if (builder.dataDefinitions.length < 1) {
		builder.context.addError(`At least one data definition is missing in ${builder.context.name}.`);
	}

	return builder;
}

export function parseContainer(context: Context): ContainerBuilder {
	const builder = createBuilder(context, ContainerBuilder);

	parseKeywordSubStatements(
		builder.context,
		builder.unknownStatements,
		[
			{ kw: "when", parseZeroOrOne: context => builder.when.add(parseWhen(context)) },
			{ kw: "if-feature", stringValueBuilder: builder.ifFeatures },
			{ kw: "presence", stringValueBuilder: builder.presence },
			{ kw: "config", booleanValueBuilder: builder.config },
			{ kw: "status", statusValueBuilder: builder.status },
			{ kw: "description", stringValueBuilder: builder.description },
			{ kw: "reference", stringValueBuilder: builder.reference },

			// typedefsOrGroupings
			{ kw: "typedef", parseZeroOrMore: context => builder.typedefsOrGroupings.push(parseTypedef(context)) },
			{ kw: "grouping", parseZeroOrMore: context => builder.typedefsOrGroupings.push(parseGrouping(context)) },

			// dataDefinitions
			{ kw: "uses", parseZeroOrMore: context => builder.dataDefinitions.push(parseUses(context)) },
			{ kw: "container", parseZeroOrMore: context => builder.dataDefinitions.push(parseContainer(context)) },
			{ kw: "leaf", parseZeroOrMore: context => builder.dataDefinitions.push(parseLeaf(context)) },
			{ kw: "leaf-list", parseZeroOrMore: context => builder.dataDefinitions.push(parseLeafList(context)) },
			{ kw: "list", parseZeroOrMore: context => builder.dataDefinitions.push(parseList(context)) },
			{ kw: "choice", parseZeroOrMore: context => builder.dataDefinitions.push(parseChoice(context)) },
			{ kw: "anydata", parseZeroOrMore: context => builder.dataDefinitions.push(parseAnyData(context)) },
			{ kw: "anyxml", parseZeroOrMore: context => builder.dataDefinitions.push(parseAnyXml(context)) },

			{ kw: "action", parseZeroOrMore: context => builder.actions.push(parseAction(context))},
			{ kw: "notification", parseZeroOrMore: context => builder.notifications.push(parseNotification(context))}
		]
	)

	return builder;
}

export function parseLeaf(context: Context): LeafBuilder {
	const builder = createBuilder(context, LeafBuilder);

	parseKeywordSubStatements(
		builder.context,
		builder.unknownStatements,
		[
			{ kw: "when", parseZeroOrOne: context => builder.when.add(parseWhen(context)) },
			{ kw: "if-feature", stringValueBuilder: builder.ifFeatures },
			{ kw: "type", parseOne: context => builder.type.add(parseType(context)) },
			{ kw: "units", stringValueBuilder: builder.units },
			{ kw: "must", parseZeroOrMore: context => builder.musts.push(parseMust(context)) },
			{ kw: "default", stringValueBuilder: builder.default },
			{ kw: "config", booleanValueBuilder: builder.config },
			{ kw: "mandatory", booleanValueBuilder: builder.mandatory },
			{ kw: "status", statusValueBuilder: builder.status },
			{ kw: "description", stringValueBuilder: builder.description },
			{ kw: "reference", stringValueBuilder: builder.reference }
		]
	)

	return builder;
}

export function parseLeafList(context: Context): LeafListBuilder {
	const builder = createBuilder(context, LeafListBuilder);

	parseKeywordSubStatements(
		builder.context,
		builder.unknownStatements,
		[
			{ kw: "when", parseZeroOrOne: context => builder.when.add(parseWhen(context)) },
			{ kw: "if-feature", stringValueBuilder: builder.ifFeatures },
			{ kw: "type", parseOne: context => builder.type.add(parseType(context)) },
			{ kw: "units", stringValueBuilder: builder.units },
			{ kw: "must", parseZeroOrMore: context => builder.musts.push(parseMust(context)) },
			{ kw: "default", stringValueBuilder: builder.default },
			{ kw: "config", booleanValueBuilder: builder.config },
			{ kw: "min-elements", numberValueBuilder: builder.minElements },
			{ kw: "max-elements", numberValueBuilder: builder.maxElements },
			{ kw: "ordered-by", stringValueBuilder: builder.orderedBy },
			{ kw: "status", statusValueBuilder: builder.status },
			{ kw: "description", stringValueBuilder: builder.description },
			{ kw: "reference", stringValueBuilder: builder.reference },
		]
	)

	return builder;
}

export function parseList(context: Context): ListBuilder {
	const builder = createBuilder(context, ListBuilder);

	parseKeywordSubStatements(
		builder.context,
		builder.unknownStatements,
		[
			{ kw: "when", parseZeroOrOne: context => builder.when.add(parseWhen(context)) },
			{ kw: "if-feature", stringValueBuilder: builder.ifFeatures },
			{ kw: "must", parseZeroOrMore: context => builder.musts.push(parseMust(context)) },
			{ kw: "key", stringValueBuilder: builder.key },
			{ kw: "unique", stringValueBuilder: builder.uniques },
			{ kw: "config", booleanValueBuilder: builder.config },
			{ kw: "min-elements", numberValueBuilder: builder.minElements },
			{ kw: "max-elements", numberValueBuilder: builder.maxElements },
			{ kw: "ordered-by", stringValueBuilder: builder.orderedBy },
			{ kw: "status", statusValueBuilder: builder.status },
			{ kw: "description", stringValueBuilder: builder.description },
			{ kw: "reference", stringValueBuilder: builder.reference },

			// typedefsOrGroupings
			{ kw: "typedef", parseZeroOrMore: context => builder.typedefsOrGroupings.push(parseTypedef(context)) },
			{ kw: "grouping", parseZeroOrMore: context => builder.typedefsOrGroupings.push(parseGrouping(context)) },

			// dataDefinitions
			{ kw: "uses", parseZeroOrMore: context => builder.dataDefinitions.push(parseUses(context)) },
			{ kw: "container", parseZeroOrMore: context => builder.dataDefinitions.push(parseContainer(context)) },
			{ kw: "leaf", parseZeroOrMore: context => builder.dataDefinitions.push(parseLeaf(context)) },
			{ kw: "leaf-list", parseZeroOrMore: context => builder.dataDefinitions.push(parseLeafList(context)) },
			{ kw: "list", parseZeroOrMore: context => builder.dataDefinitions.push(parseList(context)) },
			{ kw: "choice", parseZeroOrMore: context => builder.dataDefinitions.push(parseChoice(context)) },
			{ kw: "anydata", parseZeroOrMore: context => builder.dataDefinitions.push(parseAnyData(context)) },
			{ kw: "anyxml", parseZeroOrMore: context => builder.dataDefinitions.push(parseAnyXml(context)) },

			{ kw: "action", parseZeroOrMore: context => builder.actions.push(parseAction(context))},
			{ kw: "notification", parseZeroOrMore: context => builder.notifications.push(parseNotification(context))}
		]
	)

	return builder;
}

export function parseDeviationItem(context: Context): DeviationItemBuilder {
	const builder = createBuilder(context, DeviationItemBuilder);

	parseKeywordSubStatements(
		builder.context,
		builder.unknownStatements,
		[
			{ kw: "units", stringValueBuilder: builder.units },
			{ kw: "must", parseZeroOrMore: context => builder.musts.push(parseMust(context)) },
			{ kw: "unique", stringValueBuilder: builder.uniques },
			{ kw: "default", stringValueBuilder: builder.defaults },
			{ kw: "config", booleanValueBuilder: builder.config },
			{ kw: "mandatory", booleanValueBuilder: builder.mandatory },
			{ kw: "min-elements", numberValueBuilder: builder.minElements },
			{ kw: "max-elements", numberValueBuilder: builder.maxElements },
			{ kw: "type", parseZeroOrOne: context => builder.type.add(parseType(context)) }
		]
	)

	return builder;
}

export function parseDeviation(context: Context): DeviationBuilder {
	const builder = createBuilder(context, DeviationBuilder);

	parseKeywordSubStatements(
		builder.context,
		builder.unknownStatements,
		[
			{ kw: "description", stringValueBuilder: builder.description },
			{ kw: "reference", stringValueBuilder: builder.reference },
			{ kw: "deviate", parseZeroOrMore: context => builder.items.push(parseDeviationItem(context)) }
		]
	)

	return builder;
}

export function parseChoice(context: Context): ChoiceBuilder {
	const builder = createBuilder(context, ChoiceBuilder);

	parseKeywordSubStatements(
		builder.context,
		builder.unknownStatements,
		[
			{ kw: "when", parseZeroOrOne: context => builder.when.add(parseWhen(context)) },
			{ kw: "if-feature", stringValueBuilder: builder.ifFeatures },
			{ kw: "default", stringValueBuilder: builder.default },
			{ kw: "config", booleanValueBuilder: builder.config },
			{ kw: "mandatory", booleanValueBuilder: builder.mandatory },
			{ kw: "status", statusValueBuilder: builder.status },
			{ kw: "description", stringValueBuilder: builder.description },
			{ kw: "reference", stringValueBuilder: builder.reference },

			// cases
			{ kw: "case", parseZeroOrMore: context => builder.cases.push(parseCase(context)) },
			{ kw: "choice", parseZeroOrMore: context => builder.cases.push(parseChoice(context)) },
			{ kw: "container", parseZeroOrMore: context => builder.cases.push(parseContainer(context)) },
			{ kw: "leaf", parseZeroOrMore: context => builder.cases.push(parseLeaf(context)) },
			{ kw: "leaf-list", parseZeroOrMore: context => builder.cases.push(parseLeafList(context)) },
			{ kw: "list", parseZeroOrMore: context => builder.cases.push(parseList(context)) },
			{ kw: "anydata", parseZeroOrMore: context => builder.cases.push(parseAnyData(context)) },
			{ kw: "anyxml", parseZeroOrMore: context => builder.cases.push(parseAnyXml(context)) },
		]
	)

	return builder;
}

export function parseAnyData(context: Context): AnyDataBuilder {
	const builder = createBuilder(context, AnyDataBuilder);

	parseKeywordSubStatements(
		builder.context,
		builder.unknownStatements,
		[
			{ kw: "when", parseZeroOrOne: context => builder.when.add(parseWhen(context)) },
			{ kw: "if-feature", stringValueBuilder: builder.ifFeatures },
			{ kw: "must", parseZeroOrOne: context => builder.musts.push(parseMust(context)) },
			{ kw: "config", booleanValueBuilder: builder.config },
			{ kw: "mandatory", booleanValueBuilder: builder.mandatory },
			{ kw: "status", statusValueBuilder: builder.status },
			{ kw: "description", stringValueBuilder: builder.description },
			{ kw: "reference", stringValueBuilder: builder.reference },
		]
	)

	return builder;
}

export function parseAnyXml(context: Context): AnyXmlBuilder {
	const builder = createBuilder(context, AnyXmlBuilder);

	parseKeywordSubStatements(
		builder.context,
		builder.unknownStatements,
		[
			{ kw: "when", parseZeroOrOne: context => builder.when.add(parseWhen(context)) },
			{ kw: "if-feature", stringValueBuilder: builder.ifFeatures },
			{ kw: "must", parseZeroOrOne: context => builder.musts.push(parseMust(context)) },
			{ kw: "config", booleanValueBuilder: builder.config },
			{ kw: "mandatory", booleanValueBuilder: builder.mandatory },
			{ kw: "status", statusValueBuilder: builder.status },
			{ kw: "description", stringValueBuilder: builder.description },
			{ kw: "reference", stringValueBuilder: builder.reference },
		]
	)

	return builder;
}
