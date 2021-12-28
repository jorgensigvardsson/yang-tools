import { YangStatement } from './yang-stmt-parser'
import { 
	Action,	AnyData, AnyXml, Argument, AstNode, Augmentation, Bit, Case, Choice, Container, 
	Deviation, DeviationItem, Enum, Extension, Feature, Grouping, Identity, Import,
	Include, Input, Leaf, LeafList, Length, LengthSpecification, List, Module,
	Must, Notification, Output, Pattern, PatternModifier, Range, RangeSpecification,
	Refine, Revision, Rpc, Status, Submodule, Type, Typedef, UnknownStatement, Uses, When
} from "./yang-ast";

export class MessageCollection {
	readonly messages: string[] = [];
}

export class Context {
	readonly errorCollection: MessageCollection;
	readonly warningCollection: MessageCollection;

	constructor(readonly stmt: YangStatement, public readonly parentContext?: Context, errorCollection?: MessageCollection, warningCollection?: MessageCollection) {
		this.errorCollection = errorCollection ?? new MessageCollection();
		this.warningCollection = warningCollection ?? new MessageCollection();
	}

	pushContext(stmt: YangStatement): Context {
		return new Context(stmt, this, this.errorCollection, this.warningCollection)
	}

	addError(message: string) {
		this.errorCollection.messages.push(`${this.stmt.metadata.position.line}:${this.stmt.metadata.position.column}:${message}`);
	}

	addWarning(message: string) {
		this.warningCollection.messages.push(`${this.stmt.metadata.position.line}:${this.stmt.metadata.position.column}:${message}`);
	}

	get name(): string {
		const thisName = `${this.stmt.prf ? `${this.stmt.prf}:${this.stmt.kw}` : this.stmt.kw}`;
		const thisArg = thisName === "" ? "" : `=${this.argument()}`;

		if (this.parentContext) {
			return `${this.parentContext.name}/${thisName}${thisArg}`;
		} else {
			return `/${thisName}${thisArg}`;
		}
	}

	private argument(): string {
		if(typeof this.stmt.arg === "string") {
			return this.stmt.arg.trim();
		}

		return `<unnamed ${this.stmt.kw}>`;
	}
}

export abstract class ValueBuilder<T> {
	protected _values: Array<T> = [];

	add(value: T): void {
		this._values.push(value);
	}
}

export class OptionalValueBuilder<T> extends ValueBuilder<T> {
	build (): T | null {
		return this._values.length === 1 ? this._values[0] : null;
	}
}

export class RequiredValueBuilder<T> extends ValueBuilder<T> {
	constructor(private readonly sentinelValueOnError: T) { super(); }

	build(): T {
		return this._values.length === 1 ? this._values[0] : this.sentinelValueOnError;
	}

	isSet(): boolean {
		return this._values.length === 1;
	}

	// May ONLY be called if "isSet()" has been called
	get(): T {
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		return this._values[0]!;
	}
}

export class MultiValueBuilder<T> extends ValueBuilder<T> {
	build(): T[] {
		return this._values;
	}

	add(...values: T[]): void {
		for (const value of values) {
			super.add(value);
		}
	}
}

export interface Builder<T> {
	build(): T;
}

export class BuilderIdentity<T> implements Builder<T> {
	constructor(public readonly identity: T) {}

	build(): T {
		return this.identity;
	}
}

export class OptionalBuilder<T> {
	protected _builders: Array<Builder<T>> = [];

	add(value: Builder<T>): void {
		this._builders.push(value);
	}

	get(): Builder<T | null> {
		return this._builders.length === 1 ? this._builders[0] : new BuilderIdentity<T | null>(null);
	}
}

export class RequiredBuilder<T> {
	protected _builders: Array<Builder<T>> = [];

	constructor(private readonly sentinelValueOnError: T) {}

	add(value: Builder<T>): void {
		this._builders.push(value);
	}

	get(): Builder<T> {
		return this._builders.length === 1 ? this._builders[0] : new BuilderIdentity<T>(this.sentinelValueOnError);
	}
}

export class AstNodeBuilder {
	readonly unknownStatements: UnknownStatement[] = [];

	constructor(public readonly context: Context) {}

	build(): AstNode {
		return {
			metadata: this.context.stmt.metadata,
			unknownStatements: this.unknownStatements
		}
	}
}

export class ModuleBuilder extends AstNodeBuilder {
	readonly prefix = new RequiredValueBuilder<string>("");
	readonly yangVersion = new RequiredValueBuilder<string>("");
	readonly namespace = new RequiredValueBuilder<string>("");
	readonly organization = new OptionalValueBuilder<string>();
	readonly contact = new OptionalValueBuilder<string>();
	readonly reference = new OptionalValueBuilder<string>();
	readonly description = new OptionalValueBuilder<string>();
	readonly revisions: RevisionBuilder[] = [];
	readonly imports: ImportBuilder[] = [];
	readonly includes: IncludeBuilder[] = [];
	readonly body = new Array<ExtensionBuilder | FeatureBuilder | IdentityBuilder | TypedefBuilder | GroupingBuilder | DataDefinitionBuilder | AugmentationBuilder | RpcBuilder | NotificationBuilder | DeviationBuilder>();

	constructor(context: Context, public readonly name: string) { super(context); }

	build(): Module {
		const prefix = this.prefix.build();
		const yangVersion = this.yangVersion.build();
		const namespace = this.namespace.build();
		const organization = this.organization.build();
		const contact = this.contact.build();
		const reference = this.reference.build();
		const description = this.description.build();
		const revisions = this.revisions.map(b => b.build());
		const imports = this.imports.map(b => b.build());
		const includes = this.includes.map(b => b.build());
		const body = this.body.map(b => b.build());

		return {
			construct: "module",
			name: this.name,
			prefix: prefix,
			yangVersion: yangVersion,
			namespace: namespace,
			organization: organization,
			contact: contact,
			reference: reference,
			description: description,
			revisions: revisions,
			imports: imports,
			includes: includes,
			body: body,
			...super.build()
		}
	}
}

export class SubmoduleBuilder extends AstNodeBuilder {
	readonly yangVersion = new RequiredValueBuilder<string>("");
	readonly belongsTo = new RequiredValueBuilder<string>("");
	readonly organization = new OptionalValueBuilder<string>();
	readonly contact = new OptionalValueBuilder<string>();
	readonly reference = new OptionalValueBuilder<string>();
	readonly description = new OptionalValueBuilder<string>();
	readonly revisions: RevisionBuilder[] = [];
	readonly imports: ImportBuilder[] = [];
	readonly includes: IncludeBuilder[] = [];
	readonly body = new Array<ExtensionBuilder | FeatureBuilder | IdentityBuilder | TypedefBuilder | GroupingBuilder | DataDefinitionBuilder | AugmentationBuilder | RpcBuilder | NotificationBuilder | DeviationBuilder>();

	constructor(context: Context, public readonly name: string) { super(context); }

	build(): Submodule {
		const yangVersion = this.yangVersion.build();
		const belongsTo = this.belongsTo.build();
		const organization = this.organization.build();
		const contact = this.contact.build();
		const reference = this.reference.build();
		const description = this.description.build();
		const revisions = this.revisions.map(b => b.build());
		const imports = this.imports.map(b => b.build());
		const includes = this.includes.map(b => b.build());
		const body = this.body.map(b => b.build());

		return {
			construct: "submodule",
			name: this.name,
			yangVersion: yangVersion,
			belongsTo: belongsTo,
			organization: organization,
			contact: contact,
			reference: reference,
			description: description,
			revisions: revisions,
			imports: imports,
			includes: includes,
			body: body,
			...super.build()
		}
	}
}

export class ImportBuilder extends AstNodeBuilder {
	readonly prefix = new RequiredValueBuilder<string>("");
	readonly revision = new OptionalValueBuilder<string>();
	readonly description = new OptionalValueBuilder<string>();
	readonly reference = new OptionalValueBuilder<string>();

	constructor(context: Context, public readonly identifier: string) { super(context); }

	build(): Import {
		const prefix = this.prefix.build();
		const revision = this.revision.build();
		const description = this.description.build();
		const reference = this.reference.build();

		return {
			identifier: this.identifier,
			prefix: prefix,
			revision: revision,
			description: description,
			reference: reference,
			...super.build()
		}
	}
}

export class IncludeBuilder extends AstNodeBuilder {
	readonly revision = new OptionalValueBuilder<string>();
	readonly description = new OptionalValueBuilder<string>();
	readonly reference = new OptionalValueBuilder<string>();

	constructor(context: Context, public readonly identifier: string) { super(context); }

	build(): Include {
		const revision = this.revision.build();
		const description = this.description.build();
		const reference = this.reference.build();

		return {
			identifier: this.identifier,
			revision: revision,
			description: description,
			reference: reference,
			...super.build()
		}
	}
}

export class RevisionBuilder extends AstNodeBuilder {
	readonly description = new OptionalValueBuilder<string>();
	readonly reference = new OptionalValueBuilder<string>();

	constructor(context: Context, public readonly value: string) { super(context); }

	build(): Revision {
		const description = this.description.build();
		const reference = this.reference.build();

		return {
			value: this.value,
			description: description,
			reference: reference,
			...super.build()
		}
	}
}

export class WhenBuilder extends AstNodeBuilder {
	readonly description = new OptionalValueBuilder<string>();
	readonly reference = new OptionalValueBuilder<string>();

	constructor(context: Context, public readonly xpath: string) { super(context); }

	build(): When {
		const description = this.description.build();
		const reference = this.reference.build();

		return {
			xpath: this.xpath,
			description: description,
			reference: reference,
			...super.build()
		}
	}
}

export class MustBuilder extends AstNodeBuilder {
	readonly errorAppTag = new OptionalValueBuilder<string>();
	readonly errorMessage = new OptionalValueBuilder<string>();
	readonly description = new OptionalValueBuilder<string>();
	readonly reference = new OptionalValueBuilder<string>();

	constructor(context: Context, public readonly xpath: string) { super(context); }

	build(): Must {
		const errorAppTag = this.errorAppTag.build();
		const errorMessage = this.errorMessage.build();
		const description = this.description.build();
		const reference = this.reference.build();

		return {
			xpath: this.xpath,
			errorAppTag: errorAppTag,
			errorMessage: errorMessage,
			description: description,
			reference: reference,
			...super.build()
		}
	}
}

export class RefineBuilder extends AstNodeBuilder {
	readonly ifFeatures = new MultiValueBuilder<string>();
	readonly musts: MustBuilder[] = [];
	readonly presence = new OptionalValueBuilder<string>();
	readonly defaults = new MultiValueBuilder<string>();
	readonly config = new OptionalValueBuilder<boolean>();
	readonly mandatory = new OptionalValueBuilder<boolean>();
	readonly minElements = new OptionalValueBuilder<number>();
	readonly maxElements = new OptionalValueBuilder<number>();
	readonly description = new OptionalValueBuilder<string>();
	readonly reference = new OptionalValueBuilder<string>();

	constructor(context: Context, public readonly target: string) { super(context); }

	build(): Refine {
		const ifFeatures = this.ifFeatures.build();
		const musts = this.musts.map(b => b.build());
		const presence = this.presence.build();
		const defaults = this.defaults.build();
		const config = this.config.build();
		const mandatory = this.mandatory.build();
		const minElements = this.minElements.build();
		const maxElements = this.maxElements.build();
		const description = this.description.build();
		const reference = this.reference.build();

		return {
			target: this.target,
			ifFeatures: ifFeatures,
			musts: musts,
			presence: presence,
			defaults: defaults,
			config: config,
			mandatory: mandatory,
			minElements: minElements,
			maxElements: maxElements,
			description: description,
			reference: reference,
			...super.build()
		}
	}
}

export class DeviationBuilder extends AstNodeBuilder implements Builder<Deviation> {
	readonly description = new OptionalValueBuilder<string>();
	readonly reference = new OptionalValueBuilder<string>();
	readonly items = new Array<DeviationItemBuilder>();

	constructor(context: Context, public readonly target: string) { super(context); }

	build(): Deviation {
		const description = this.description.build();
		const reference = this.reference.build();
		const items = this.items.map(b => b.build());

		return {
			construct: "deviation",
			target: this.target,
			description: description,
			reference: reference,
			items: items,
			...super.build()
		}
	}
}

export class DeviationItemBuilder extends AstNodeBuilder implements Builder<DeviationItem> {
	readonly units = new OptionalValueBuilder<string>();
	readonly musts: MustBuilder[] = [];
	readonly uniques = new MultiValueBuilder<string>();
	readonly defaults = new MultiValueBuilder<string>();
	readonly config = new OptionalValueBuilder<boolean>();
	readonly mandatory = new OptionalValueBuilder<boolean>();
	readonly minElements = new OptionalValueBuilder<number>();
	readonly maxElements = new OptionalValueBuilder<number>();
	readonly type = new OptionalBuilder<Type>();

	constructor(context: Context, public readonly code: string) { super(context); }

	build(): DeviationItem {
		const units = this.units.build();
		const musts = this.musts.map(b => b.build());
		const uniques = this.uniques.build();
		const defaults = this.defaults.build();
		const config = this.config.build();
		const mandatory = this.mandatory.build();
		const minElements = this.minElements.build();
		const maxElements = this.maxElements.build();
		const type = this.type.get().build();		

		return {
			code: this.code,
			units: units,
			musts: musts,
			uniques: uniques,
			defaults: defaults,
			config: config,
			mandatory: mandatory,
			minElements: minElements,
			maxElements: maxElements,
			type: type,
			...super.build()
		}
	}
}

export class EnumBuilder extends AstNodeBuilder {
	readonly value = new RequiredValueBuilder<number>(0);
	readonly status = new OptionalValueBuilder<Status>();
	readonly reference = new OptionalValueBuilder<string>();
	readonly description = new OptionalValueBuilder<string>();

	constructor(context: Context, public readonly name: string) { super(context); }

	build(): Enum {
		const value = this.value.build();
		const status = this.status.build();
		const reference = this.reference.build();
		const description = this.description.build();

		return {
			name: this.name,
			value: value,
			status: status,
			description: description,
			reference: reference,
			...super.build()
		}
	}
}

export class BitBuilder extends AstNodeBuilder {
	readonly ifFeatures = new MultiValueBuilder<string>();
	readonly position = new RequiredValueBuilder<number>(0);
	readonly status = new OptionalValueBuilder<Status>();
	readonly reference = new OptionalValueBuilder<string>();
	readonly description = new OptionalValueBuilder<string>();

	constructor(context: Context, public readonly identifier: string) { super(context); }

	build(): Bit {
		const ifFeatures = this.ifFeatures.build();
		const position = this.position.build();
		const status = this.status.build();
		const reference = this.reference.build();
		const description = this.description.build();

		return {
			identifier: this.identifier,
			ifFeatures: ifFeatures,
			position: position,
			status: status,
			description: description,
			reference: reference,
			...super.build()
		}
	}
}

export class PatternBuilder extends AstNodeBuilder {
	readonly modifier = new OptionalValueBuilder<PatternModifier>();
	readonly errorAppTag = new OptionalValueBuilder<string>();
	readonly errorMessage = new OptionalValueBuilder<string>();
	readonly reference = new OptionalValueBuilder<string>();
	readonly description = new OptionalValueBuilder<string>();

	constructor(context: Context, public readonly specification: string) { super(context); }

	build(): Pattern {
		const modifier = this.modifier.build();
		const errorAppTag = this.errorAppTag.build();
		const errorMessage = this.errorMessage.build();
		const reference = this.reference.build();
		const description = this.description.build();

		return {
			specification: this.specification,
			modifier: modifier,
			errorAppTag: errorAppTag,
			errorMessage: errorMessage,
			description: description,
			reference: reference,
			...super.build()
		}
	}
}

export class LengthBuilder extends AstNodeBuilder {
	readonly errorAppTag = new OptionalValueBuilder<string>();
	readonly errorMessage = new OptionalValueBuilder<string>();
	readonly reference = new OptionalValueBuilder<string>();
	readonly description = new OptionalValueBuilder<string>();

	constructor(public readonly specifications: LengthSpecification[], context: Context) { super(context); }

	build(): Length {
		const errorAppTag = this.errorAppTag.build();
		const errorMessage = this.errorMessage.build();
		const reference = this.reference.build();
		const description = this.description.build();

		return {
			specifications: this.specifications,
			errorAppTag: errorAppTag,
			errorMessage: errorMessage,
			description: description,
			reference: reference,
			...super.build()
		}
	}
}

export class RangeBuilder extends AstNodeBuilder {
	readonly errorAppTag = new OptionalValueBuilder<string>();
	readonly errorMessage = new OptionalValueBuilder<string>();
	readonly reference = new OptionalValueBuilder<string>();
	readonly description = new OptionalValueBuilder<string>();

	constructor(public readonly specifications: RangeSpecification[], context: Context) { super(context); }

	build(): Range {
		const errorAppTag = this.errorAppTag.build();
		const errorMessage = this.errorMessage.build();
		const reference = this.reference.build();
		const description = this.description.build();

		return {
			specifications: this.specifications,
			errorAppTag: errorAppTag,
			errorMessage: errorMessage,
			description: description,
			reference: reference,
			...super.build()
		}
	}
}

export class TypeBuilder extends AstNodeBuilder {
	readonly range = new OptionalBuilder<Range>();
	readonly fractionDigits = new OptionalValueBuilder<number>();
	readonly length = new OptionalBuilder<Length>();
	readonly patterns: PatternBuilder[] = [];
	readonly path = new OptionalValueBuilder<string>();
	readonly bits: BitBuilder[] = [];
	readonly enums: EnumBuilder[] = [];
	readonly bases = new MultiValueBuilder<string>();
	readonly unionTypes: TypeBuilder[] = [];
	readonly requireInstance = new OptionalValueBuilder<boolean>();

	constructor(context: Context, public readonly identifier: string) { super(context); }

	build(): Type {
		const range = this.range.get().build();
		const fractionDigits = this.fractionDigits.build();
		const length = this.length.get().build();
		const patterns = this.patterns.map(b => b.build());
		const path = this.path.build();
		const bits = this.bits.map(b => b.build());
		const enums = this.enums.map(b => b.build());
		const bases = this.bases.build();
		const unionTypes = this.unionTypes.map(b => b.build());
		const requireInstance = this.requireInstance.build();

		return {
			identifier: this.identifier,
			range: range,
			fractionDigits: fractionDigits,
			length: length,
			patterns: patterns,
			path: path,
			bits: bits,
			enums: enums,
			bases: bases,
			unionTypes: unionTypes,
			requireInstance: requireInstance,
			...super.build()
		}
	}
}

function invalidType(context: Context): Type {
	return {
		identifier: "__invalid__",
		bases: [],
		bits: [],
		enums: [],
		fractionDigits: null,
		length: null,
		path: null,
		patterns: [],
		range: null,
		requireInstance: null,
		unionTypes: [],
		metadata: context.stmt.metadata,
		unknownStatements: []
	}
}
export class TypedefBuilder extends AstNodeBuilder {
	readonly type: RequiredBuilder<Type>;
	readonly units = new OptionalValueBuilder<string>();
	readonly default = new OptionalValueBuilder<string>();
	readonly status = new OptionalValueBuilder<Status>();
	readonly reference = new OptionalValueBuilder<string>();
	readonly description = new OptionalValueBuilder<string>();

	constructor(context: Context, public readonly identifier: string) {
		super(context);
		this.type = new RequiredBuilder<Type>(invalidType(context));
	}

	build(): Typedef {
		const type = this.type.get().build();
		const units = this.units.build();
		const defaultVal = this.default.build();
		const status = this.status.build();
		const reference = this.reference.build();
		const description = this.description.build();

		return {
			construct: "typedef",
			identifier: this.identifier,
			type: type,
			units: units,
			default: defaultVal,
			status: status,
			description: description,
			reference: reference,
			...super.build()
		}
	}
}

export class ArgumentBuilder extends AstNodeBuilder implements Builder<Argument> {
	readonly yinElement = new OptionalValueBuilder<boolean>();

	constructor(context: Context, public readonly identifier: string) { super(context); }

	build(): Argument {
		const yinElement = this.yinElement.build();

		return {
			identifier: this.identifier,
			yinElement: yinElement,
			...super.build()
		}
	}
}

export class ExtensionBuilder extends AstNodeBuilder implements Builder<Extension> {
	readonly argument = new OptionalBuilder<Argument>();
	readonly status = new OptionalValueBuilder<Status>();
	readonly reference = new OptionalValueBuilder<string>();
	readonly description = new OptionalValueBuilder<string>();

	constructor(context: Context, public readonly identifier: string) { super(context); }

	build(): Extension {
		const identifier = this.identifier;
		const argument = this.argument.get().build();
		const status = this.status.build();
		const reference = this.reference.build();
		const description = this.description.build();

		return {
			construct: "extension",
			identifier: identifier,
			argument: argument,
			status: status,
			description: description,
			reference: reference,
			...super.build()
		}
	}
}

export class FeatureBuilder extends AstNodeBuilder implements Builder<Feature> {
	readonly ifFeatures = new MultiValueBuilder<string>();
	readonly status = new OptionalValueBuilder<Status>();
	readonly reference = new OptionalValueBuilder<string>();
	readonly description = new OptionalValueBuilder<string>();

	constructor(context: Context, public readonly identifier: string) { super(context); }

	build(): Feature {
		const identifier = this.identifier;
		const ifFeatures = this.ifFeatures.build();
		const status = this.status.build();
		const reference = this.reference.build();
		const description = this.description.build();

		return {
			construct: "feature",
			identifier: identifier,
			ifFeatures: ifFeatures,
			status: status,
			description: description,
			reference: reference,
			...super.build()
		}
	}
}

export class IdentityBuilder extends AstNodeBuilder implements Builder<Identity> {
	readonly bases = new MultiValueBuilder<string>();
	readonly ifFeatures = new MultiValueBuilder<string>();
	readonly status = new OptionalValueBuilder<Status>();
	readonly reference = new OptionalValueBuilder<string>();
	readonly description = new OptionalValueBuilder<string>();

	constructor(context: Context, public readonly identifier: string) { super(context); }

	build(): Identity {
		const identifier = this.identifier;
		const bases = this.bases.build();
		const ifFeatures = this.ifFeatures.build();
		const status = this.status.build();
		const reference = this.reference.build();
		const description = this.description.build();

		return {
			construct: "identity",
			identifier: identifier,
			bases: bases,
			ifFeatures: ifFeatures,
			status: status,
			description: description,
			reference: reference,
			...super.build()
		}
	}
}

export class UsesBuilder extends AstNodeBuilder implements Builder<Uses> {
	readonly when = new OptionalBuilder<When>();
	readonly ifFeatures = new MultiValueBuilder<string>();
	readonly status = new OptionalValueBuilder<Status>();
	readonly description = new OptionalValueBuilder<string>();
	readonly reference = new OptionalValueBuilder<string>();
	readonly refines: RefineBuilder[] = [];
	readonly augmentations: AugmentationBuilder[] = [];

	constructor(context: Context, public readonly grouping: string) { super(context); }

	build(): Uses {
		const when = this.when.get().build();
		const ifFeatures = this.ifFeatures.build();
		const status = this.status.build();
		const reference = this.reference.build();
		const description = this.description.build();
		const refines = this.refines.map(b => b.build());
		const augmentations = this.augmentations.map(b => b.build());

		return {
			construct: "uses",
			grouping: this.grouping,
			when: when,
			ifFeatures: ifFeatures,
			status: status,
			description: description,
			reference: reference,
			refines: refines,
			augmentations: augmentations,
			...super.build()
		}
	}
}

export class ContainerBuilder extends AstNodeBuilder implements Builder<Container> {
	readonly when = new OptionalBuilder<When>();
	readonly ifFeatures = new MultiValueBuilder<string>();
	readonly presence = new OptionalValueBuilder<string>();
	readonly config = new OptionalValueBuilder<boolean>();
	readonly status = new OptionalValueBuilder<Status>();
	readonly description = new OptionalValueBuilder<string>();
	readonly reference = new OptionalValueBuilder<string>();
	readonly typedefsOrGroupings = new Array<TypedefBuilder | GroupingBuilder>();
	readonly dataDefinitions = new Array<DataDefinitionBuilder>();
	readonly actions = new Array<ActionBuilder>();
	readonly notifications = new Array<NotificationBuilder>();

	constructor(context: Context, public readonly identifier: string) { super(context); }

	build(): Container {
		const when = this.when.get().build();
		const ifFeatures = this.ifFeatures.build();
		const presence = this.presence.build();
		const config = this.config.build();
		const status = this.status.build();
		const reference = this.reference.build();
		const description = this.description.build();
		const typedefsOrGroupings = this.typedefsOrGroupings.map(b => b.build());
		const dataDefinitions = this.dataDefinitions.map(b => b.build());
		const actions = this.actions.map(b => b.build());
		const notifications = this.notifications.map(b => b.build());

		return {
			construct: "container",
			identifier: this.identifier,
			when: when,
			ifFeatures: ifFeatures,
			presence: presence,
			config: config,
			status: status,
			description: description,
			reference: reference,
			typedefsOrGroupings: typedefsOrGroupings,
			dataDefinitions: dataDefinitions,
			actions: actions,
			notifications: notifications,
			...super.build()
		}
	}
}

export class LeafBuilder extends AstNodeBuilder implements Builder<Leaf> {
	readonly when = new OptionalBuilder<When>();
	readonly ifFeatures = new MultiValueBuilder<string>();
	readonly type: RequiredBuilder<Type>;
	readonly units = new OptionalValueBuilder<string>();
	readonly musts = new Array<MustBuilder>();
	readonly default = new OptionalValueBuilder<string>();
	readonly config = new OptionalValueBuilder<boolean>();
	readonly mandatory = new OptionalValueBuilder<boolean>();
	readonly status = new OptionalValueBuilder<Status>();
	readonly description = new OptionalValueBuilder<string>();
	readonly reference = new OptionalValueBuilder<string>();

	constructor(context: Context, public readonly identifier: string) {
		super(context);
		this.type = new RequiredBuilder<Type>(invalidType(context));
	}

	build(): Leaf {
		const when = this.when.get().build();
		const ifFeatures = this.ifFeatures.build();
		const type = this.type.get().build();
		const units = this.units.build();
		const musts = this.musts.map(b => b.build());
		const defaultVal = this.default.build();
		const config = this.config.build();
		const mandatory = this.mandatory.build();
		const status = this.status.build();
		const reference = this.reference.build();
		const description = this.description.build();

		return {
			construct: "leaf",
			identifier: this.identifier,
			when: when,
			ifFeatures: ifFeatures,
			type: type,
			units: units,
			musts: musts,
			default: defaultVal,
			config: config,
			mandatory: mandatory,
			status: status,
			description: description,
			reference: reference,
			...super.build()
		}
	}
}

export class LeafListBuilder extends AstNodeBuilder implements Builder<LeafList> {
	readonly when = new OptionalBuilder<When>();
	readonly ifFeatures = new MultiValueBuilder<string>();
	readonly type: RequiredBuilder<Type>;
	readonly units = new OptionalValueBuilder<string>();
	readonly musts = new Array<MustBuilder>();
	readonly default = new MultiValueBuilder<string>();
	readonly config = new OptionalValueBuilder<boolean>();
	readonly minElements = new OptionalValueBuilder<number>();
	readonly maxElements = new OptionalValueBuilder<number>();
	readonly orderedBy = new OptionalValueBuilder<string>();
	readonly status = new OptionalValueBuilder<Status>();
	readonly description = new OptionalValueBuilder<string>();
	readonly reference = new OptionalValueBuilder<string>();

	constructor(context: Context, public readonly identifier: string) {
		super(context);
		this.type = new RequiredBuilder<Type>(invalidType(context));
	}

	build(): LeafList {
		const when = this.when.get().build();
		const ifFeatures = this.ifFeatures.build();
		const type = this.type.get().build();
		const units = this.units.build();
		const musts = this.musts.map(b => b.build());
		const defaultVal = this.default.build();
		const config = this.config.build();
		const minElements = this.minElements.build();
		const maxElements = this.maxElements.build();
		const orderedBy = this.orderedBy.build();
		const status = this.status.build();
		const reference = this.reference.build();
		const description = this.description.build();

		return {
			construct: "leaf-list",
			identifier: this.identifier,
			when: when,
			ifFeatures: ifFeatures,
			type: type,
			units: units,
			musts: musts,
			default: defaultVal,
			config: config,
			minElements: minElements,
			maxElements: maxElements,
			orderedBy: orderedBy,
			status: status,
			description: description,
			reference: reference,
			...super.build()
		}
	}
}

export class ListBuilder extends AstNodeBuilder implements Builder<List> {
	readonly when = new OptionalBuilder<When>();
	readonly ifFeatures = new MultiValueBuilder<string>();
	readonly musts = new Array<MustBuilder>();
	readonly key = new OptionalValueBuilder<string>();
	readonly uniques = new MultiValueBuilder<string>();
	readonly config = new OptionalValueBuilder<boolean>();
	readonly minElements = new OptionalValueBuilder<number>();
	readonly maxElements = new OptionalValueBuilder<number>();
	readonly orderedBy = new OptionalValueBuilder<string>();
	readonly status = new OptionalValueBuilder<Status>();
	readonly description = new OptionalValueBuilder<string>();
	readonly reference = new OptionalValueBuilder<string>();
	readonly typedefsOrGroupings = new Array<TypedefBuilder | GroupingBuilder>();
	readonly dataDefinitions = new Array<DataDefinitionBuilder>();
	readonly actions = new Array<ActionBuilder>();
	readonly notifications = new Array<NotificationBuilder>();

	constructor(context: Context, public readonly identifier: string) { super(context); }

	build(): List {
		const when = this.when.get().build();
		const ifFeatures = this.ifFeatures.build();
		const musts = this.musts.map(b => b.build());
		const key = this.key.build();
		const uniques = this.uniques.build();
		const config = this.config.build();
		const minElements = this.minElements.build();
		const maxElements = this.maxElements.build();
		const orderedBy = this.orderedBy.build();
		const status = this.status.build();
		const reference = this.reference.build();
		const description = this.description.build();
		const typedefsOrGroupings = this.typedefsOrGroupings.map(b => b.build());
		const dataDefinitions = this.dataDefinitions.map(b => b.build());
		const actions = this.actions.map(b => b.build());
		const notifications = this.notifications.map(b => b.build());

		return {
			construct: "list",
			identifier: this.identifier,
			when: when,
			ifFeatures: ifFeatures,
			musts: musts,
			key: key,
			uniques: uniques,
			config: config,
			minElements: minElements,
			maxElements: maxElements,
			orderedBy: orderedBy,
			status: status,
			description: description,
			reference: reference,
			typedefsOrGroupings,
			dataDefinitions: dataDefinitions,
			actions: actions,
			notifications: notifications,
			...super.build()
		}
	}
}

export class ChoiceBuilder extends AstNodeBuilder implements Builder<Choice> {
	readonly when = new OptionalBuilder<When>();
	readonly ifFeatures = new MultiValueBuilder<string>();
	readonly default = new OptionalValueBuilder<string>();
	readonly config = new OptionalValueBuilder<boolean>();
	readonly mandatory = new OptionalValueBuilder<boolean>();
	readonly status = new OptionalValueBuilder<Status>();
	readonly description = new OptionalValueBuilder<string>();
	readonly reference = new OptionalValueBuilder<string>();
	readonly cases = new Array<CaseBuilder | ChoiceBuilder | ContainerBuilder | LeafBuilder | LeafListBuilder | ListBuilder | AnyDataBuilder | AnyXmlBuilder>();

	constructor(context: Context, public readonly identifier: string) { super(context); }

	build(): Choice {
		const when = this.when.get().build();
		const ifFeatures = this.ifFeatures.build();
		const defaultVal = this.default.build();
		const config = this.config.build();
		const mandatory = this.mandatory.build();
		const status = this.status.build();
		const reference = this.reference.build();
		const description = this.description.build();
		const cases = this.cases.map(b => b.build());

		return {
			construct: "choice",
			identifier: this.identifier,
			when: when,
			ifFeatures: ifFeatures,
			default: defaultVal,
			config: config,
			mandatory: mandatory,
			status: status,
			description: description,
			reference: reference,
			cases: cases,
			...super.build()
		}
	}
}

export class AnyDataBuilder extends AstNodeBuilder implements Builder<AnyData> {
	readonly when = new OptionalBuilder<When>();
	readonly ifFeatures = new MultiValueBuilder<string>();
	readonly musts = new Array<MustBuilder>();
	readonly config = new OptionalValueBuilder<boolean>();
	readonly mandatory = new OptionalValueBuilder<boolean>();
	readonly status = new OptionalValueBuilder<Status>();
	readonly description = new OptionalValueBuilder<string>();
	readonly reference = new OptionalValueBuilder<string>();

	constructor(context: Context, public readonly identifier: string) { super(context); }

	build(): AnyData {
		const when = this.when.get().build();
		const ifFeatures = this.ifFeatures.build();
		const musts = this.musts.map(b => b.build());
		const config = this.config.build();
		const mandatory = this.mandatory.build();
		const status = this.status.build();
		const reference = this.reference.build();
		const description = this.description.build();

		return {
			construct: "anydata",
			identifier: this.identifier,
			when: when,
			ifFeatures: ifFeatures,
			musts: musts,
			config: config,
			mandatory: mandatory,
			status: status,
			description: description,
			reference: reference,
			...super.build()
		}
	}
}

export class AnyXmlBuilder extends AstNodeBuilder implements Builder<AnyXml> {
	readonly when = new OptionalBuilder<When>();
	readonly ifFeatures = new MultiValueBuilder<string>();
	readonly musts = new Array<MustBuilder>();
	readonly config = new OptionalValueBuilder<boolean>();
	readonly mandatory = new OptionalValueBuilder<boolean>();
	readonly status = new OptionalValueBuilder<Status>();
	readonly description = new OptionalValueBuilder<string>();
	readonly reference = new OptionalValueBuilder<string>();

	constructor(context: Context, public readonly identifier: string) { super(context); }

	build(): AnyXml {
		const when = this.when.get().build();
		const ifFeatures = this.ifFeatures.build();
		const musts = this.musts.map(b => b.build());
		const config = this.config.build();
		const mandatory = this.mandatory.build();
		const status = this.status.build();
		const reference = this.reference.build();
		const description = this.description.build();

		return {
			construct: "anyxml",
			identifier: this.identifier,
			when: when,
			ifFeatures: ifFeatures,
			musts: musts,
			config: config,
			mandatory: mandatory,
			status: status,
			description: description,
			reference: reference,
			...super.build()
		}
	}
}


export type DataDefinitionBuilder = UsesBuilder | ContainerBuilder | LeafBuilder | LeafListBuilder | ListBuilder | ChoiceBuilder | AnyDataBuilder | AnyXmlBuilder;

export class InputBuilder extends AstNodeBuilder implements Builder<Input> {
	readonly musts = new Array<MustBuilder>();
	readonly typedefsOrGroupings = new Array<TypedefBuilder | GroupingBuilder>();
	readonly dataDefinitions = new Array<DataDefinitionBuilder>();

	constructor(context: Context) { super(context); }

	build(): Input {
		const musts = this.musts.map(b => b.build());
		const typedefsOrGroupings = this.typedefsOrGroupings.map(b => b.build());
		const dataDefinitions = this.dataDefinitions.map(b => b.build());

		return {
			musts: musts,
			typedefsOrGroupings: typedefsOrGroupings,
			dataDefinitions: dataDefinitions,
			...super.build()
		}
	}
}

export class OutputBuilder extends AstNodeBuilder implements Builder<Output> {
	readonly musts = new Array<MustBuilder>();
	readonly typedefsOrGroupings = new Array<TypedefBuilder | GroupingBuilder>();
	readonly dataDefinitions = new Array<DataDefinitionBuilder>();

	constructor(context: Context) { super(context); }

	build(): Output {
		const musts = this.musts.map(b => b.build());
		const typedefsOrGroupings = this.typedefsOrGroupings.map(b => b.build());
		const dataDefinitions = this.dataDefinitions.map(b => b.build());

		return {
			musts: musts,
			typedefsOrGroupings: typedefsOrGroupings,
			dataDefinitions: dataDefinitions,
			...super.build()
		}
	}
}

export class GroupingBuilder extends AstNodeBuilder implements Builder<Grouping> {
	readonly status = new OptionalValueBuilder<Status>();
	readonly description = new OptionalValueBuilder<string>();
	readonly reference = new OptionalValueBuilder<string>();
	readonly typedefsOrGroupings = new Array<TypedefBuilder | GroupingBuilder>();
	readonly dataDefinitions = new Array<DataDefinitionBuilder>();
	readonly actions = new Array<ActionBuilder>();
	readonly notifications = new Array<NotificationBuilder>();

	constructor(context: Context, public readonly identifier: string) { super(context); }

	build(): Grouping {
		const status = this.status.build();
		const reference = this.reference.build();
		const description = this.description.build();
		const typedefsOrGroupings = this.typedefsOrGroupings.map(b => b.build());
		const dataDefinitions = this.dataDefinitions.map(b => b.build());
		const actions = this.actions.map(b => b.build());
		const notifications = this.notifications.map(b => b.build());

		return {
			construct: "grouping",
			identifier: this.identifier,
			status: status,
			description: description,
			reference: reference,
			typedefsOrGroupings,
			dataDefinitions: dataDefinitions,
			actions: actions,
			notifications: notifications,
			...super.build()
		}
	}
}

export class ActionBuilder extends AstNodeBuilder implements Builder<Action> {
	readonly ifFeatures = new MultiValueBuilder<string>();
	readonly status = new OptionalValueBuilder<Status>();
	readonly description = new OptionalValueBuilder<string>();
	readonly reference = new OptionalValueBuilder<string>();
	readonly typedefsOrGroupings = new Array<TypedefBuilder | GroupingBuilder>();
	readonly input = new OptionalBuilder<Input>();
	readonly output = new OptionalBuilder<Output>();

	constructor(context: Context, public readonly identifier: string) { super(context); }

	build(): Action {
		const ifFeatures = this.ifFeatures.build();
		const status = this.status.build();
		const reference = this.reference.build();
		const description = this.description.build();
		const typedefsOrGroupings = this.typedefsOrGroupings.map(b => b.build());
		const input = this.input.get().build();
		const output = this.output.get().build();

		return {
			construct: "action",
			identifier: this.identifier,
			ifFeatures: ifFeatures,
			status: status,
			description: description,
			reference: reference,
			typedefsOrGroupings,
			input: input,
			output: output,
			...super.build()
		}
	}
}

export class RpcBuilder extends AstNodeBuilder implements Builder<Rpc> {
	readonly ifFeatures = new MultiValueBuilder<string>();
	readonly status = new OptionalValueBuilder<Status>();
	readonly description = new OptionalValueBuilder<string>();
	readonly reference = new OptionalValueBuilder<string>();
	readonly typedefsOrGroupings = new Array<TypedefBuilder | GroupingBuilder>();
	readonly input = new OptionalBuilder<Input>();
	readonly output = new OptionalBuilder<Output>();

	constructor(context: Context, public readonly identifier: string) { super(context); }

	build(): Rpc {
		const ifFeatures = this.ifFeatures.build();
		const status = this.status.build();
		const reference = this.reference.build();
		const description = this.description.build();
		const typedefsOrGroupings = this.typedefsOrGroupings.map(b => b.build());
		const input = this.input.get().build();
		const output = this.output.get().build();

		return {
			construct: "rpc",
			identifier: this.identifier,
			ifFeatures: ifFeatures,
			status: status,
			description: description,
			reference: reference,
			typedefsOrGroupings,
			input: input,
			output: output,
			...super.build()
		}
	}
}

export class NotificationBuilder extends AstNodeBuilder implements Builder<Notification> {
	readonly ifFeatures = new MultiValueBuilder<string>();
	readonly musts = new Array<MustBuilder>();
	readonly status = new OptionalValueBuilder<Status>();
	readonly description = new OptionalValueBuilder<string>();
	readonly reference = new OptionalValueBuilder<string>();
	readonly typedefsOrGroupings = new Array<TypedefBuilder | GroupingBuilder>();
	readonly dataDefinitions = new Array<DataDefinitionBuilder>();

	constructor(context: Context, public readonly identifier: string) { super(context); }

	build(): Notification {
		const ifFeatures = this.ifFeatures.build();
		const musts = this.musts.map(b => b.build());
		const status = this.status.build();
		const reference = this.reference.build();
		const description = this.description.build();
		const typedefsOrGroupings = this.typedefsOrGroupings.map(b => b.build());
		const dataDefinitions = this.dataDefinitions.map(b => b.build());

		return {
			construct: "notification",
			identifier: this.identifier,
			ifFeatures: ifFeatures,
			musts: musts,
			status: status,
			description: description,
			reference: reference,
			typedefsOrGroupings: typedefsOrGroupings,
			dataDefinitions: dataDefinitions,
			...super.build()
		}
	}
}

export class CaseBuilder extends AstNodeBuilder implements Builder<Case> {
	readonly when = new OptionalBuilder<When>();
	readonly ifFeatures = new MultiValueBuilder<string>();
	readonly status = new OptionalValueBuilder<Status>();
	readonly description = new OptionalValueBuilder<string>();
	readonly reference = new OptionalValueBuilder<string>();
	readonly dataDefinitions = new Array<DataDefinitionBuilder>();

	constructor(context: Context, public readonly identifier: string) { super(context); }

	build(): Case {
		const when = this.when.get().build();
		const ifFeatures = this.ifFeatures.build();
		const status = this.status.build();
		const reference = this.reference.build();
		const description = this.description.build();
		const dataDefinitions = this.dataDefinitions.map(b => b.build());

		return {
			construct: "case",
			identifier: this.identifier,
			when: when,
			ifFeatures: ifFeatures,
			status: status,
			description: description,
			reference: reference,
			dataDefinitions: dataDefinitions,
			...super.build()
		}
	}
}

export class AugmentationBuilder extends AstNodeBuilder implements Builder<Augmentation> {
	readonly when = new OptionalBuilder<When>();
	readonly ifFeatures = new MultiValueBuilder<string>();
	readonly status = new OptionalValueBuilder<Status>();
	readonly description = new OptionalValueBuilder<string>();
	readonly reference = new OptionalValueBuilder<string>();
	readonly statements = new Array<DataDefinitionBuilder | CaseBuilder | ActionBuilder | NotificationBuilder>();

	constructor(context: Context, public readonly target: string) { super(context); }

	build(): Augmentation {
		const when = this.when.get().build();
		const ifFeatures = this.ifFeatures.build();
		const status = this.status.build();
		const reference = this.reference.build();
		const description = this.description.build();
		const statements = this.statements.map(b => b.build());

		return {
			construct: "augment",
			target: this.target,
			when: when,
			ifFeatures: ifFeatures,
			status: status,
			description: description,
			reference: reference,
			statements: statements,
			...super.build()
		}
	}
}