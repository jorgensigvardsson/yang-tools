import 'jest';
import { 
	ActionBuilder, AnyDataBuilder, AnyXmlBuilder, ArgumentBuilder,
	AugmentationBuilder, BitBuilder, CaseBuilder, ChoiceBuilder,
	ContainerBuilder, Context, EnumBuilder,	ExtensionBuilder,
	DeviationItemBuilder, FeatureBuilder,
	GroupingBuilder, IdentityBuilder, ImportBuilder, IncludeBuilder, InputBuilder,
	LeafBuilder, LeafListBuilder, LengthBuilder, ListBuilder,
	ModuleBuilder, MultiValueBuilder, MustBuilder,
	NotificationBuilder, OptionalValueBuilder, OutputBuilder,
	PatternBuilder, RangeBuilder, RefineBuilder,
	RequiredValueBuilder, RevisionBuilder, RpcBuilder, TypeBuilder,
	TypedefBuilder, UsesBuilder, WhenBuilder, DeviationBuilder, SubmoduleBuilder
} from './yang-ast-builders';
import { LengthSpecification, PatternModifier, RangeSpecification, Status } from './yang-ast';

import { YangStatement } from './yang-stmt-parser';

function createStatement(kw: string, arg: string): YangStatement {
	return {
		prf: "",
		kw: kw,
		arg: arg,
		substmts: [],
		metadata: { position: { column: 1, line: 1, offset: 0 }, length: 0, source: "<memory buffer>" }
	};
}

const nullStatement = createStatement("", "");
const nullContext = () => new Context(nullStatement);
const createContextWithArg = (arg: string) => new Context(createStatement("", arg));

describe('OptionalValueBuilder', () => {
	it('returns value (null) if no value set', () => {
		const valueBuilder = new OptionalValueBuilder<string>();
		const value = valueBuilder.build();

		expect(value).toBeNull();
	})

	it('returns value if value has been set', () => {
		const valueBuilder = new OptionalValueBuilder<string>();

		valueBuilder.add("foo");
		const value = valueBuilder.build();

		expect(value).toBe("foo");
	})

	it('returns null if value has been set more than once', () => {
		const valueBuilder = new OptionalValueBuilder<string>();

		valueBuilder.add("foo");
		valueBuilder.add("bar");
		const value = valueBuilder.build();

		expect(value).toBeNull();
	})
})


describe('RequiredValueBuilder', () => {
	it('returns sentinel error value if no value set', () => {
		const valueBuilder = new RequiredValueBuilder<string>("error");
		const value = valueBuilder.build();

		expect(value).toBe("error");
	})

	it('returns value if value has been set', () => {
		const valueBuilder = new RequiredValueBuilder<string>("error");

		valueBuilder.add("foo");
		const value = valueBuilder.build();

		expect(value).toBe("foo");
	})

	it('returns sentinel error value if value has been set more than once', () => {
		const valueBuilder = new RequiredValueBuilder<string>("error");

		valueBuilder.add("foo");
		valueBuilder.add("bar");
		const value = valueBuilder.build();

		expect(value).toBe("error");
	})
})

describe('MultiValueBuilder', () => {
	it('returns empty array if no value set', () => {
		const valueBuilder = new MultiValueBuilder<string>();
		const context = nullContext();
		const value = valueBuilder.build();

		expect(value).toHaveLength(0);
		expect(context.errorCollection.messages).toHaveLength(0);
	})

	it('returns set values', () => {
		const valueBuilder = new MultiValueBuilder<string>();
		const context = nullContext();

		valueBuilder.add("foo");
		valueBuilder.add("bar");
		const value = valueBuilder.build();

		expect(value).toStrictEqual(["foo", "bar"]);
		expect(context.errorCollection.messages).toHaveLength(0);
	})
})


describe('Context', () => {
	it('has no errors when constructed', () => {
		const context = new Context(nullStatement);

		expect(context.errorCollection.messages).toHaveLength(0);
	})

	it('pushContext builds new name based on previous context name', () => {
		const context = new Context({
			prf: "",
			kw: "root",
			arg: false,
			substmts: [],
			metadata: { position: { column: 1, line: 1, offset: 0 }, length: 0, source: "<memory buffer>" }
		});
		const newStmt = {
			prf: "",
			kw: "sub",
			arg: "foo",
			substmts: [],
			metadata: { position: { column: 1, line: 2, offset: 50 }, length: 0, source: "<memory buffer>" }
		};
		const subContext = context.pushContext(newStmt);

		expect(subContext.name).toBe("/root=<unnamed root>/sub=foo");
	})

	it('addError adds error to error collection', () => {
		const context = new Context(nullStatement);
		context.addError("an error");

		expect(context.errorCollection.messages).toHaveLength(1);
		expect(context.errorCollection.messages[0]).toBe("1:1:an error");
	})
})

function createMockBuilder<T>(arg: string, constructor: { new(context: Context, arg: string): T }): T {
	return new constructor(nullContext(), arg);
}

function createMockBuilderNoArg<T>(constructor: { new(context: Context): T }): T {
	return new constructor(nullContext());
}

describe('ImportBuilder', () => {
	it('can build a minimal import', () => {
		const builder = createMockBuilder("2018-01-01", ImportBuilder);
		builder.prefix.add("pre");

		const builtValue = builder.build();
		expect(builtValue).toMatchObject({ 
			identifier: "2018-01-01",
			prefix: "pre",
			description: null,
			reference: null,
			revision: null
		})
	})

	it('can build a complete import', () => {
		const builder = createMockBuilder("2018-01-01", ImportBuilder);
		builder.prefix.add("pre");
		builder.description.add("desc");
		builder.reference.add("ref");
		builder.revision.add("rev");

		const builtValue = builder.build();
		expect(builtValue).toMatchObject({ 
			identifier: "2018-01-01",
			prefix: "pre",
			description: "desc",
			reference: "ref",			
			revision: "rev"
		})
	})
})

describe('IncludeBuilder', () => {
	it('can build a minimal include', () => {
		const builder = createMockBuilder("2018-01-01", IncludeBuilder);

		const builtValue = builder.build();
		expect(builtValue).toMatchObject({ 
			identifier: "2018-01-01",
			description: null,
			reference: null,
			revision: null
		})
	})

	it('can build a complete include', () => {
		const builder = createMockBuilder("2018-01-01", IncludeBuilder);
		builder.description.add("desc");
		builder.reference.add("ref");
		builder.revision.add("rev");

		const builtValue = builder.build();
		expect(builtValue).toMatchObject({ 
			identifier: "2018-01-01",
			description: "desc",
			reference: "ref",
			revision: "rev"
		})
	})
})

describe('ModuleBuilder', () => {
	it('can build a minimal module', () => {
		const builder = createMockBuilder("the-module", ModuleBuilder);
		builder.prefix.add("pre");
		builder.namespace.add("urn:westermo:test");
		builder.yangVersion.add("1.1");
		builder.revisions.push(createMockBuilder("2018-01-01", RevisionBuilder));
		builder.revisions[0].description.add("foo");
		builder.revisions[0].reference.add("bar");
		builder.imports.push(createMockBuilder("foo-module", ImportBuilder));
		builder.imports[0].prefix.add("da-prefix");
		builder.includes.push(createMockBuilder("foo-include", IncludeBuilder));

		const builtValue = builder.build();
		expect(builtValue).toMatchObject({ 
			construct: "module",
			name: "the-module",
			prefix: "pre",
			namespace: "urn:westermo:test",
			yangVersion: "1.1",
			contact: null,
			organization: null,
			reference: null,
			description: null,
			revisions: [{
				value: "2018-01-01",
				description: "foo",
				reference: "bar"
			}],
			imports: [{
				identifier: "foo-module",
				prefix: "da-prefix",
				revision: null,
				description: null,
				reference: null
			}],
			includes: [{
				identifier: "foo-include",
				revision: null,
				description: null,
				reference: null
			}],
			body: []
		})
	})
})

describe('SubmoduleBuilder', () => {
	it('can build a minimal submodule', () => {
		const builder = createMockBuilder("the-submodule", SubmoduleBuilder);
		builder.belongsTo.add("urn:westermo:test");
		builder.yangVersion.add("1.1");
		builder.revisions.push(createMockBuilder("2018-01-01", RevisionBuilder));
		builder.revisions[0].description.add("foo");
		builder.revisions[0].reference.add("bar");
		builder.imports.push(createMockBuilder("foo-module", ImportBuilder));
		builder.imports[0].prefix.add("da-prefix");
		builder.includes.push(createMockBuilder("foo-include", IncludeBuilder));

		const builtValue = builder.build();
		expect(builtValue).toMatchObject({ 
			construct: "submodule",
			name: "the-submodule",
			belongsTo: "urn:westermo:test",
			yangVersion: "1.1",
			contact: null,
			organization: null,
			reference: null,
			description: null,
			revisions: [{
				value: "2018-01-01",
				description: "foo",
				reference: "bar"
			}],
			imports: [{
				identifier: "foo-module",
				prefix: "da-prefix",
				revision: null,
				description: null,
				reference: null
			}],
			includes: [{
				identifier: "foo-include",
				revision: null,
				description: null,
				reference: null
			}],
			body: []
		})
	})
})

describe('RevisionBuilder', () => {
	it('can build a minimal module revision', () => {
		const builder = createMockBuilder("2018-01-01", RevisionBuilder);
		
		const builtValue = builder.build();
		expect(builtValue).toMatchObject({
			value: "2018-01-01",
			reference: null,
			description: null
		})
	})

	it('can build a complete module revision', () => {
		const builder = createMockBuilder("2018-01-01", RevisionBuilder);

		builder.reference.add("ref");
		builder.description.add("desc");

		const builtValue = builder.build();
		expect(builtValue).toMatchObject({
			value: "2018-01-01",
			reference: "ref",
			description: "desc"
		})
	})
})

describe('WhenBuilder', () => {
	it('can build a minimal when', () => {
		const builder = createMockBuilder("/x/y", WhenBuilder);
		
		const builtValue = builder.build();
		expect(builtValue).toMatchObject({
			xpath: "/x/y",
			reference: null,
			description: null
		})
	})

	it('can build a complete when', () => {
		const builder = createMockBuilder("/x/y", WhenBuilder);

		builder.reference.add("ref");
		builder.description.add("desc");

		const builtValue = builder.build();
		expect(builtValue).toMatchObject({
			xpath: "/x/y",
			reference: "ref",
			description: "desc"
		})
	})
})

describe('MustBuilder', () => {
	it('can build a minimal must', () => {
		const builder = createMockBuilder("/x/y", MustBuilder);
		
		const builtValue = builder.build();
		expect(builtValue).toMatchObject({
			xpath: "/x/y",
			errorAppTag: null,
			errorMessage: null,
			reference: null,
			description: null
		})
	})

	it('can build a complete must', () => {
		const builder = createMockBuilder("/x/y", MustBuilder);

		builder.errorAppTag.add("tag");
		builder.errorMessage.add("msg");
		builder.reference.add("ref");
		builder.description.add("desc");

		const builtValue = builder.build();
		expect(builtValue).toMatchObject({
			xpath: "/x/y",
			errorAppTag: "tag",
			errorMessage: "msg",
			reference: "ref",
			description: "desc"
		})
	})
})

describe('RefineBuilder', () => {
	it('can build a minimal refine', () => {
		const builder = createMockBuilder("target-node", RefineBuilder);
		
		const builtValue = builder.build();
		expect(builtValue).toMatchObject({
			target: "target-node",
			ifFeatures: [],
			musts: [],
			presence: null,
			defaults: [],
			config: null,
			mandatory: null,
			minElements: null,
			maxElements: null,
			description: null,
			reference: null
		})
	})
})

describe('EnumBuilder', () => {
	it('can build a minimal enum', () => {
		const builder = createMockBuilder("my-enum", EnumBuilder);

		builder.value.add(1);
		
		const builtValue = builder.build();
		expect(builtValue).toMatchObject({
			name: "my-enum",
			value: 1,
			status: null,
			reference: null,
			description: null
		})
	})

	it('can build a complete enum', () => {
		const builder = createMockBuilder("my-enum", EnumBuilder);

		builder.value.add(1);
		builder.status.add(Status.Deprecated);
		builder.reference.add("ref");
		builder.description.add("desc");
		
		const builtValue = builder.build();
		expect(builtValue).toMatchObject({
			name: "my-enum",
			value: 1,
			status: Status.Deprecated,
			reference: "ref",
			description: "desc"
		})
	})
})

describe('BitBuilder', () => {
	it('can build a minimal bit', () => {
		const builder = createMockBuilder("my-bit", BitBuilder);

		builder.position.add(1);
		
		const builtValue = builder.build();
		expect(builtValue).toMatchObject({
			identifier: "my-bit",
			position: 1,
			ifFeatures: [],
			status: null,
			reference: null,
			description: null
		})
	})

	it('can build a complete bit', () => {
		const builder = createMockBuilder("my-bit", BitBuilder);

		builder.position.add(1);
		builder.ifFeatures.add("f1");
		builder.ifFeatures.add("f2");
		builder.status.add(Status.Deprecated);
		builder.reference.add("ref");
		builder.description.add("desc");
		
		const builtValue = builder.build();
		expect(builtValue).toMatchObject({
			identifier: "my-bit",
			position: 1,
			ifFeatures: [ "f1", "f2" ],
			status: Status.Deprecated,
			reference: "ref",
			description: "desc"
		})
	})
})


describe('EnumBuilder', () => {
	it('can build a minimal enum', () => {
		const builder = createMockBuilder("my-enum", EnumBuilder);

		builder.value.add(1);
		
		const builtValue = builder.build();
		expect(builtValue).toMatchObject({
			name: "my-enum",
			value: 1,
			status: null,
			reference: null,
			description: null
		})
	})

	it('can build a complete enum', () => {
		const builder = createMockBuilder("my-enum", EnumBuilder);

		builder.value.add(1);
		builder.status.add(Status.Deprecated);
		builder.reference.add("ref");
		builder.description.add("desc");
		
		const builtValue = builder.build();
		expect(builtValue).toMatchObject({
			name: "my-enum",
			value: 1,
			status: Status.Deprecated,
			reference: "ref",
			description: "desc"
		})
	})
})

describe('PatternBuilder', () => {
	it('can build a minimal pattern', () => {
		const builder = createMockBuilder("my-spec", PatternBuilder);

		const builtValue = builder.build();
		expect(builtValue).toMatchObject({
			specification: "my-spec",
			modifier: null,
			errorAppTag: null,
			errorMessage: null,
			reference: null,
			description: null
		})
	})

	it('can build a complete pattern', () => {
		const builder = createMockBuilder("my-spec", PatternBuilder);

		builder.errorAppTag.add("eat");
		builder.errorMessage.add("em");
		builder.modifier.add(PatternModifier.InvertMatch);
		builder.reference.add("ref");
		builder.description.add("desc");
		
		const builtValue = builder.build();
		expect(builtValue).toMatchObject({
			specification: "my-spec",
			modifier: PatternModifier.InvertMatch,
			errorAppTag: "eat",
			errorMessage: "em",
			reference: "ref",
			description: "desc"
		})
	})
})

describe('LengthBuilder', () => {
	it('can build a minimal length', () => {
		const builder = new LengthBuilder([], createContextWithArg("the spec string"));

		const builtValue = builder.build();
		expect(builtValue).toMatchObject({
			specifications: [],
			errorAppTag: null,
			errorMessage: null,
			reference: null,
			description: null
		})
	})

	it('can build a complete length', () => {
		const specs: LengthSpecification[] = [
			{
				lowerBound: 1,
				upperBound: "max"
			}
		]
		const builder = new LengthBuilder(specs, createContextWithArg("the spec string"));

		builder.errorAppTag.add("eat");
		builder.errorMessage.add("em");
		builder.reference.add("ref");
		builder.description.add("desc");
		
		const builtValue = builder.build();
		expect(builtValue).toMatchObject({
			specifications: specs,
			errorAppTag: "eat",
			errorMessage: "em",
			reference: "ref",
			description: "desc"
		})
	})
})

describe('RangeBuilder', () => {
	it('can build a minimal range', () => {
		const builder = new RangeBuilder([], createContextWithArg("the spec string"));

		const builtValue = builder.build();
		expect(builtValue).toMatchObject({
			specifications: [],
			errorAppTag: null,
			errorMessage: null,
			reference: null,
			description: null
		})
	})

	it('can build a complete range', () => {
		const specs: RangeSpecification[] = [
			{
				lowerBound: 1,
				upperBound: "max"
			}
		]
		const builder = new RangeBuilder(specs, createContextWithArg("the spec string"));

		builder.errorAppTag.add("eat");
		builder.errorMessage.add("em");
		builder.reference.add("ref");
		builder.description.add("desc");
		
		const builtValue = builder.build();
		expect(builtValue).toMatchObject({
			specifications: specs,
			errorAppTag: "eat",
			errorMessage: "em",
			reference: "ref",
			description: "desc"
		})
	})
})

describe('TypeBuilder', () => {
	it('can build a minimal type', () => {
		const builder = createMockBuilder("a-type", TypeBuilder);

		const builtValue = builder.build();
		expect(builtValue).toMatchObject({
			identifier: "a-type",
			range: null,
			fractionDigits: null,
			length: null,
			patterns: [],
			path: null,
			bits: [],
			enums: [],
			bases: [],
			unionTypes: [],
			requireInstance: null
		})
	})
})

describe('TypedefBuilder', () => {
	it('can build a minimal typedef', () => {
		const builder = createMockBuilder("a-typedef", TypedefBuilder);
		builder.type.add(createMockBuilder("int8", TypeBuilder));

		const builtValue = builder.build();
		expect(builtValue).toMatchObject({
			construct: "typedef",
			identifier: "a-typedef",
			type: { 
				identifier: "int8",
				range: null,
				fractionDigits: null,
				length: null,
				patterns: [],
				path: null,
				bits: [],
				enums: [],
				bases: [],
				unionTypes: [],
				requireInstance: null
			},
			units: null,
			default: null,
			status: null,
			reference: null,
			description: null
		})
	})

	it('can build a complete typedef', () => {
		const builder = createMockBuilder("a-typedef", TypedefBuilder);
		builder.type.add(createMockBuilder("int8", TypeBuilder));
		builder.units.add("kg");
		builder.default.add("1");
		builder.status.add(Status.Current);
		builder.reference.add("ref");
		builder.description.add("desc");

		const builtValue = builder.build();
		expect(builtValue).toMatchObject({
			construct: "typedef",
			identifier: "a-typedef",
			type: { 
				identifier: "int8",
				range: null,
				fractionDigits: null,
				length: null,
				patterns: [],
				path: null,
				bits: [],
				enums: [],
				bases: [],
				unionTypes: [],
				requireInstance: null
			},
			units: "kg",
			default: "1",
			status: Status.Current,
			reference: "ref",
			description: "desc"
		})
	})
})

describe('ArgumentBuilder', () => {
	it('can build a minimal argument', () => {
		const builder = createMockBuilder("an-arg", ArgumentBuilder);

		const builtValue = builder.build();
		expect(builtValue).toMatchObject({
			identifier: "an-arg",
			yinElement: null
		})
	})

	it('can build an argument', () => {
		const builder = createMockBuilder("an-arg", ArgumentBuilder);

		builder.yinElement.add(true);

		const builtValue = builder.build();
		expect(builtValue).toMatchObject({
			identifier: "an-arg",
			yinElement: true
		})
	})
})

describe('ExtensionBuilder', () => {
	it('can build a minimal extension', () => {
		const builder = createMockBuilder("an-ext", ExtensionBuilder);

		const builtValue = builder.build();
		expect(builtValue).toMatchObject({
			construct: "extension",
			identifier: "an-ext",
			argument: null,
			status: null,
			description: null,
			reference: null
		})
	})

	it('can build an extension', () => {
		const argumentBuilder = createMockBuilder("an-arg", ArgumentBuilder);
		const builder = createMockBuilder("an-ext", ExtensionBuilder);

		builder.argument.add(argumentBuilder);
		builder.status.add(Status.Deprecated);
		builder.description.add("desc");
		builder.reference.add("ref");

		const builtValue = builder.build();
		expect(builtValue).toMatchObject({
			construct: "extension",
			identifier: "an-ext",
			argument: {
				identifier: "an-arg",
				yinElement: null
			},
			status: Status.Deprecated,
			description: "desc",
			reference: "ref"
		})
	})
})

describe('FeatureBuilder', () => {
	it('can build a minimal feature', () => {
		const builder = createMockBuilder("a-ft", FeatureBuilder);

		const builtValue = builder.build();
		expect(builtValue).toMatchObject({
			construct: "feature",
			identifier: "a-ft",
			ifFeatures: [],
			status: null,
			description: null,
			reference: null
		})
	})

	it('can build an feature', () => {
		const builder = createMockBuilder("a-ft", FeatureBuilder);

		builder.ifFeatures.add("f1", "f2");
		builder.status.add(Status.Deprecated);
		builder.description.add("desc");
		builder.reference.add("ref");

		const builtValue = builder.build();
		expect(builtValue).toMatchObject({
			construct: "feature",
			identifier: "a-ft",
			ifFeatures: ["f1", "f2"],
			status: Status.Deprecated,
			description: "desc",
			reference: "ref"
		})
	})
})

describe('IdentityBuilder', () => {
	it('can build a minimal identity', () => {
		const builder = createMockBuilder("id", IdentityBuilder);

		const builtValue = builder.build();
		expect(builtValue).toMatchObject({
			construct: "identity",
			identifier: "id",
			bases: [],
			ifFeatures: [],
			status: null,
			description: null,
			reference: null
		})
	})

	it('can build an identity', () => {
		const builder = createMockBuilder("id", IdentityBuilder);

		builder.bases.add("b1", "b2");
		builder.ifFeatures.add("f1", "f2");
		builder.status.add(Status.Deprecated);
		builder.description.add("desc");
		builder.reference.add("ref");

		const builtValue = builder.build();
		expect(builtValue).toMatchObject({
			construct: "identity",
			identifier: "id",
			bases: ["b1", "b2"],
			ifFeatures: ["f1", "f2"],
			status: Status.Deprecated,
			description: "desc",
			reference: "ref"
		})
	})
})

describe('UsesBuilder', () => {
	it('can build a minimal uses', () => {
		const builder = createMockBuilder("a-grouping", UsesBuilder);

		const builtValue = builder.build();
		expect(builtValue).toMatchObject({
			construct: "uses",
			grouping: "a-grouping",
			when: null,
			ifFeatures: [],
			status: null,
			description: null,
			reference: null,
			refines: [],
			augmentations: []
		})
	})

	it('can build a uses', () => {
		const builder = createMockBuilder("a-grouping", UsesBuilder);

		builder.when.add(createMockBuilder("when-arg", WhenBuilder));
		builder.ifFeatures.add("f1", "f2");
		builder.status.add(Status.Deprecated);
		builder.description.add("desc");
		builder.reference.add("ref");
		builder.refines.push(createMockBuilder("refine-arg", RefineBuilder));
		builder.augmentations.push(createMockBuilder("augment-arg", AugmentationBuilder));

		const builtValue = builder.build();
		expect(builtValue).toMatchObject({
			construct: "uses",
			grouping: "a-grouping",
			ifFeatures: ["f1", "f2"],
			status: Status.Deprecated,
			description: "desc",
			reference: "ref",
			augmentations: builder.augmentations.map(b => b.build()),
			refines: builder.refines.map(b => b.build()),
			when: builder.when.get().build()
		})
	})
})

describe('ContainerBuilder', () => {
	it('can build a minimal container', () => {
		const builder = createMockBuilder("cont", ContainerBuilder);

		const builtValue = builder.build();
		expect(builtValue).toMatchObject({
			construct: "container",
			identifier: "cont",
			when: null,
			ifFeatures: [],
			presence: null,
			config: null,
			status: null,
			description: null,
			reference: null,
			typedefsOrGroupings: [],
			dataDefinitions: [],
			actions: [],
			notifications: []
		})
	})

	it('can build a container', () => {
		const builder = createMockBuilder("cont", ContainerBuilder);
		builder.when.add(createMockBuilder("when-arg", WhenBuilder));
		builder.ifFeatures.add("f1", "f2");
		builder.presence.add("pres");
		builder.config.add(true);
		builder.status.add(Status.Deprecated);
		builder.description.add("desc");
		builder.reference.add("ref");
		builder.typedefsOrGroupings.push(createMockBuilder("typedef-arg", TypedefBuilder));
		builder.typedefsOrGroupings.push(createMockBuilder("grouping-arg", GroupingBuilder));
		builder.dataDefinitions.push(createMockBuilder("leaf-arg", LeafBuilder));
		builder.dataDefinitions.push(createMockBuilder("choice-arg", ChoiceBuilder));
		builder.actions.push(createMockBuilder("action-arg", ActionBuilder));
		builder.notifications.push(createMockBuilder("notifications-arg", NotificationBuilder));

		const builtValue = builder.build();
		expect(builtValue).toMatchObject({
			construct: "container",
			identifier: "cont",
			when: builder.when.get().build(),
			ifFeatures: ["f1", "f2"],
			presence: "pres",
			config: true,
			status: Status.Deprecated,
			description: "desc",
			reference: "ref",
			typedefsOrGroupings: builder.typedefsOrGroupings.map(b => b.build()),
			dataDefinitions: builder.dataDefinitions.map(b => b.build()),
			actions: builder.actions.map(b => b.build()),
			notifications: builder.notifications.map(b => b.build())
		})
	})
})

describe('LeafBuilder', () => {
	it('can build a minimal leaf', () => {
		const builder = createMockBuilder("lf", LeafBuilder);
		builder.type.add(createMockBuilder("tp", TypeBuilder));

		const builtValue = builder.build();
		expect(builtValue).toMatchObject({
			construct: "leaf",
			identifier: "lf",
			when: null,
			ifFeatures: [],
			type: builder.type.get().build(),
			units: null,
			musts: [],
			default: null,
			config: null,
			mandatory: null,
			status: null,
			description: null,
			reference: null
		})
	})

	it('can build a leaf', () => {
		const builder = createMockBuilder("lf", LeafBuilder);
		builder.type.add(createMockBuilder("tp", TypeBuilder));
		builder.when.add(createMockBuilder("wh", WhenBuilder));
		builder.ifFeatures.add("f1", "f2");
		builder.units.add("u");
		builder.musts.push(createMockBuilder("m", MustBuilder));
		builder.default.add("def");
		builder.config.add(true);
		builder.mandatory.add(false);
		builder.status.add(Status.Deprecated);
		builder.description.add("desc");
		builder.reference.add("ref");

		const builtValue = builder.build();
		expect(builtValue).toMatchObject({
			construct: "leaf",
			identifier: "lf",
			when: builder.when.get().build(),
			ifFeatures: ["f1", "f2"],
			type: builder.type.get().build(),
			units: "u",
			musts: builder.musts.map(b => b.build()),
			default: "def",
			config: true,
			mandatory: false,
			status: Status.Deprecated,
			description: "desc",
			reference: "ref",
		})
	})
})

describe('LeafListBuilder', () => {
	it('can build a minimal leaf list', () => {
		const builder = createMockBuilder("ll", LeafListBuilder);
		builder.type.add(createMockBuilder("tp", TypeBuilder));

		const builtValue = builder.build();
		expect(builtValue).toMatchObject({
			construct: "leaf-list",
			identifier: "ll",
			when: null,
			ifFeatures: [],
			type: builder.type.get().build(),
			units: null,
			musts: [],
			default: [],
			config: null,
			status: null,
			description: null,
			reference: null,
			minElements: null,
			maxElements: null,
			orderedBy: null
		})
	})

	it('can build a leaf list', () => {
		const builder = createMockBuilder("ll", LeafListBuilder);
		builder.type.add(createMockBuilder("tp", TypeBuilder));
		builder.when.add(createMockBuilder("wh", WhenBuilder));
		builder.ifFeatures.add("f1", "f2");
		builder.units.add("u");
		builder.musts.push(createMockBuilder("m", MustBuilder));
		builder.default.add("def");
		builder.config.add(true);
		builder.status.add(Status.Deprecated);
		builder.description.add("desc");
		builder.reference.add("ref");
		builder.minElements.add(1);
		builder.maxElements.add(2);
		builder.orderedBy.add("ob");

		const builtValue = builder.build();
		expect(builtValue).toMatchObject({
			construct: "leaf-list",
			identifier: "ll",
			when: builder.when.get().build(),
			ifFeatures: ["f1", "f2"],
			type: builder.type.get().build(),
			units: "u",
			musts: builder.musts.map(b => b.build()),
			default: ["def"],
			config: true,
			status: Status.Deprecated,
			description: "desc",
			reference: "ref",
			minElements: 1,
			maxElements: 2,
			orderedBy: "ob"
		})
	})
})

describe('ListBuilder', () => {
	it('can build a minimal list', () => {
		const builder = createMockBuilder("l", ListBuilder);

		const builtValue = builder.build();
		expect(builtValue).toMatchObject({
			construct: "list",
			identifier: "l",
			when: null,
			ifFeatures: [],
			musts: [],
			key: null,
			uniques: [],
			config: null,
			minElements: null,
			maxElements: null,
			orderedBy: null,
			status: null,
			description: null,
			reference: null,
			typedefsOrGroupings: [],
			dataDefinitions: [],
			actions: [],
			notifications: [],
		})
	})

	it('can build a list', () => {
		const builder = createMockBuilder("l", ListBuilder);
		builder.when.add(createMockBuilder("wh", WhenBuilder));
		builder.ifFeatures.add("f1", "f2");
		builder.musts.push(createMockBuilder("m", MustBuilder));
		builder.key.add("k");
		builder.uniques.add("u1", "u2");
		builder.config.add(true);
		builder.status.add(Status.Deprecated);
		builder.description.add("desc");
		builder.reference.add("ref");
		builder.minElements.add(1);
		builder.maxElements.add(2);
		builder.orderedBy.add("ob");
		builder.typedefsOrGroupings.push(createMockBuilder("typedef-arg", TypedefBuilder));
		builder.typedefsOrGroupings.push(createMockBuilder("grouping-arg", GroupingBuilder));
		builder.dataDefinitions.push(createMockBuilder("leaf-arg", LeafBuilder));
		builder.dataDefinitions.push(createMockBuilder("choice-arg", ChoiceBuilder));
		builder.actions.push(createMockBuilder("action-arg", ActionBuilder));
		builder.notifications.push(createMockBuilder("notifications-arg", NotificationBuilder));

		const builtValue = builder.build();
		expect(builtValue).toMatchObject({
			construct: "list",
			identifier: "l",
			when: builder.when.get().build(),
			ifFeatures: ["f1", "f2"],
			musts: builder.musts.map(b => b.build()),
			key: "k",
			uniques: ["u1", "u2"],
			config: true,
			minElements: 1,
			maxElements: 2,
			orderedBy: "ob",
			status: Status.Deprecated,
			description: "desc",
			reference: "ref",
			typedefsOrGroupings: builder.typedefsOrGroupings.map(b => b.build()),
			dataDefinitions: builder.dataDefinitions.map(b => b.build()),
			actions: builder.actions.map(b => b.build()),
			notifications: builder.notifications.map(b => b.build())
		})
	})
})

describe('ChoiceBuilder', () => {
	it('can build a minimal choice', () => {
		const builder = createMockBuilder("c", ChoiceBuilder);

		const builtValue = builder.build();
		expect(builtValue).toMatchObject({
			construct: "choice",
			identifier: "c",
			when: null,
			ifFeatures: [],
			default: null,
			config: null,
			mandatory: null,			
			status: null,
			description: null,
			reference: null,
			cases: []
		})
	})

	it('can build a choice', () => {
		const builder = createMockBuilder("c", ChoiceBuilder);
		builder.when.add(createMockBuilder("wh", WhenBuilder));
		builder.ifFeatures.add("f1", "f2");
		builder.default.add("def");
		builder.config.add(true);
		builder.mandatory.add(false);		
		builder.status.add(Status.Deprecated);
		builder.description.add("desc");
		builder.reference.add("ref");
		builder.cases.push(createMockBuilder("l", LeafBuilder));
		builder.cases.push(createMockBuilder("cont", ContainerBuilder));

		const builtValue = builder.build();
		expect(builtValue).toMatchObject({
			construct: "choice",
			identifier: "c",
			when: builder.when.get().build(),
			ifFeatures: ["f1", "f2"],
			default: "def",
			config: true,
			mandatory: false,
			status: Status.Deprecated,
			description: "desc",
			reference: "ref",
			cases: builder.cases.map(b => b.build())
		})
	})
})

describe('AnyDataBuilder', () => {
	it('can build an anydata', () => {
		const builder = createMockBuilder("ad", AnyDataBuilder);

		const builtValue = builder.build();
		expect(builtValue).toMatchObject({
			construct: "anydata",
			identifier: "ad",
			when: null,
			ifFeatures: [],
			musts: [],
			config: null,
			mandatory: null,			
			status: null,
			description: null,
			reference: null
		})
	})

	it('can build an anydata', () => {
		const builder = createMockBuilder("ad", AnyDataBuilder);
		builder.when.add(createMockBuilder("wh", WhenBuilder));
		builder.ifFeatures.add("f1", "f2");
		builder.musts.push(createMockBuilder("m", MustBuilder));
		builder.config.add(true);
		builder.mandatory.add(false);		
		builder.status.add(Status.Deprecated);
		builder.description.add("desc");
		builder.reference.add("ref");		

		const builtValue = builder.build();
		expect(builtValue).toMatchObject({
			construct: "anydata",
			identifier: "ad",
			when: builder.when.get().build(),
			ifFeatures: ["f1", "f2"],
			musts: builder.musts.map(b => b.build()),
			config: true,
			mandatory: false,
			status: Status.Deprecated,
			description: "desc",
			reference: "ref"
		})
	})
})

describe('AnyXmlBuilder', () => {
	it('can build an anyxml', () => {
		const builder = createMockBuilder("ax", AnyXmlBuilder);

		const builtValue = builder.build();
		expect(builtValue).toMatchObject({
			construct: "anyxml",
			identifier: "ax",
			when: null,
			ifFeatures: [],
			musts: [],
			config: null,
			mandatory: null,			
			status: null,
			description: null,
			reference: null
		})
	})

	it('can build an anyxml', () => {
		const builder = createMockBuilder("ax", AnyXmlBuilder);
		builder.when.add(createMockBuilder("wh", WhenBuilder));
		builder.ifFeatures.add("f1", "f2");
		builder.musts.push(createMockBuilder("m", MustBuilder));
		builder.config.add(true);
		builder.mandatory.add(false);		
		builder.status.add(Status.Deprecated);
		builder.description.add("desc");
		builder.reference.add("ref");		

		const builtValue = builder.build();
		expect(builtValue).toMatchObject({
			construct: "anyxml",
			identifier: "ax",
			when: builder.when.get().build(),
			ifFeatures: ["f1", "f2"],
			musts: builder.musts.map(b => b.build()),
			config: true,
			mandatory: false,
			status: Status.Deprecated,
			description: "desc",
			reference: "ref"
		})
	})
})

describe('CaseBuilder', () => {
	it('can build a minimal case', () => {
		const builder = createMockBuilder("c", CaseBuilder);

		const builtValue = builder.build();
		expect(builtValue).toMatchObject({
			construct: "case",
			identifier: "c",
			when: null,
			ifFeatures: [],
			status: null,
			description: null,
			reference: null,
			dataDefinitions: []
		})
	})

	it('can build a case', () => {
		const builder = createMockBuilder("c", CaseBuilder);
		builder.when.add(createMockBuilder("wh", WhenBuilder));
		builder.ifFeatures.add("f1", "f2");
		builder.status.add(Status.Deprecated);
		builder.description.add("desc");
		builder.reference.add("ref");
		builder.dataDefinitions.push(createMockBuilder("l", LeafBuilder));
		builder.dataDefinitions.push(createMockBuilder("cont", ContainerBuilder));

		const builtValue = builder.build();
		expect(builtValue).toMatchObject({
			construct: "case",
			identifier: "c",
			when: builder.when.get().build(),
			ifFeatures: ["f1", "f2"],
			status: Status.Deprecated,
			description: "desc",
			reference: "ref",
			dataDefinitions: builder.dataDefinitions.map(b => b.build())
		})
	})
})

describe('GroupingBuilder', () => {
	it('can build a minimal grouping', () => {
		const builder = createMockBuilder("g", GroupingBuilder);

		const builtValue = builder.build();
		expect(builtValue).toMatchObject({
			construct: "grouping",
			identifier: "g",
			status: null,
			description: null,
			reference: null,
			typedefsOrGroupings: [],
			dataDefinitions: [],
			actions: [],
			notifications: []
		})
	})

	it('can build a grouping', () => {
		const builder = createMockBuilder("g", GroupingBuilder);
		builder.status.add(Status.Deprecated);
		builder.description.add("desc");
		builder.reference.add("ref");
		builder.typedefsOrGroupings.push(createMockBuilder("typedef-arg", TypedefBuilder));
		builder.typedefsOrGroupings.push(createMockBuilder("grouping-arg", GroupingBuilder));
		builder.dataDefinitions.push(createMockBuilder("leaf-arg", LeafBuilder));
		builder.dataDefinitions.push(createMockBuilder("choice-arg", ChoiceBuilder));
		builder.actions.push(createMockBuilder("action-arg", ActionBuilder));
		builder.notifications.push(createMockBuilder("notifications-arg", NotificationBuilder));

		const builtValue = builder.build();
		expect(builtValue).toMatchObject({
			construct: "grouping",
			identifier: "g",
			status: Status.Deprecated,
			description: "desc",
			reference: "ref",
			typedefsOrGroupings: builder.typedefsOrGroupings.map(b => b.build()),
			dataDefinitions: builder.dataDefinitions.map(b => b.build()),
			actions: builder.actions.map(b => b.build()),
			notifications: builder.notifications.map(b => b.build())
		})
	})
})

describe('ActionBuilder', () => {
	it('can build a minimal action', () => {
		const builder = createMockBuilder("a", ActionBuilder);

		const builtValue = builder.build();
		expect(builtValue).toMatchObject({
			construct: "action",
			identifier: "a",
			ifFeatures: [],
			status: null,
			description: null,
			reference: null,
			typedefsOrGroupings: [],
			input: null,
			output: null
		})
	})

	it('can build a action', () => {
		const builder = createMockBuilder("a", ActionBuilder);
		builder.ifFeatures.add("f1", "f2");
		builder.status.add(Status.Deprecated);
		builder.description.add("desc");
		builder.reference.add("ref");
		builder.typedefsOrGroupings.push(createMockBuilder("typedef-arg", TypedefBuilder));
		builder.typedefsOrGroupings.push(createMockBuilder("grouping-arg", GroupingBuilder));
		builder.input.add(createMockBuilderNoArg(InputBuilder));
		builder.output.add(createMockBuilderNoArg(OutputBuilder));

		const builtValue = builder.build();
		expect(builtValue).toMatchObject({
			construct: "action",
			identifier: "a",
			ifFeatures: ["f1", "f2"],
			status: Status.Deprecated,
			description: "desc",
			reference: "ref",
			typedefsOrGroupings: builder.typedefsOrGroupings.map(b => b.build()),
			input: builder.input.get().build(),
			output: builder.output.get().build()
		})
	})
})

describe('RpcBuilder', () => {
	it('can build a minimal rpc', () => {
		const builder = createMockBuilder("r", RpcBuilder);

		const builtValue = builder.build();
		expect(builtValue).toMatchObject({
			construct: "rpc",
			identifier: "r",
			ifFeatures: [],
			status: null,
			description: null,
			reference: null,
			typedefsOrGroupings: [],
			input: null,
			output: null
		})
	})

	it('can build an rpc', () => {
		const builder = createMockBuilder("r", RpcBuilder);
		builder.ifFeatures.add("f1", "f2");
		builder.status.add(Status.Deprecated);
		builder.description.add("desc");
		builder.reference.add("ref");
		builder.typedefsOrGroupings.push(createMockBuilder("typedef-arg", TypedefBuilder));
		builder.typedefsOrGroupings.push(createMockBuilder("grouping-arg", GroupingBuilder));
		builder.input.add(createMockBuilderNoArg(InputBuilder));
		builder.output.add(createMockBuilderNoArg(OutputBuilder));

		const builtValue = builder.build();
		expect(builtValue).toMatchObject({
			construct: "rpc",
			identifier: "r",
			ifFeatures: ["f1", "f2"],
			status: Status.Deprecated,
			description: "desc",
			reference: "ref",
			typedefsOrGroupings: builder.typedefsOrGroupings.map(b => b.build()),
			input: builder.input.get().build(),
			output: builder.output.get().build()
		})
	})
})

describe('DeviationBuilder', () => {
	it('can build a minimal deviation', () => {
		const builder = createMockBuilder("dev", DeviationBuilder);

		const builtValue = builder.build();
		expect(builtValue).toMatchObject({
			construct: "deviation",
			target: "dev",
			description: null,
			reference: null,
			items: []
		})
	})

	it('can build a deviation', () => {
		const builder = createMockBuilder("dev", DeviationBuilder);
		builder.description.add("desc");
		builder.reference.add("ref");
		builder.items.push(createMockBuilder("add", DeviationItemBuilder));

		const builtValue = builder.build();
		expect(builtValue).toMatchObject({
			construct: "deviation",
			target: "dev",
			description: "desc",
			reference: "ref",
			items: builder.items.map(b => b.build())
		})
	})
})

describe('DeviationItemBuilder', () => {
	it('can build a minimal deviation item', () => {
		const builder = createMockBuilder("add", DeviationItemBuilder);

		const builtValue = builder.build();
		expect(builtValue).toMatchObject({
			code: "add",
			units: null,
			musts: [],
			uniques: [],
			defaults: [],
			config: null,
			mandatory: null,
			minElements: null,
			maxElements: null,
			type: null
		})
	})

	it('can build a minimal deviation item', () => {
		const builder = createMockBuilder("add", DeviationItemBuilder);
		builder.units.add("u");
		builder.musts.push(createMockBuilder("m1", MustBuilder));
		builder.uniques.add("uq1", "uq2");
		builder.defaults.add("d1", "d2");
		builder.config.add(true);
		builder.mandatory.add(false);
		builder.minElements.add(1);
		builder.maxElements.add(2);
		builder.type.add(createMockBuilder("t", TypeBuilder));

		const builtValue = builder.build();
		expect(builtValue).toMatchObject({
			code: "add",
			units: "u",
			musts: builder.musts.map(b => b.build()),
			uniques: ["uq1", "uq2"],
			defaults: ["d1", "d2"],
			config: true,
			mandatory: false,
			minElements: 1,
			maxElements: 2,
			type: builder.type.get().build()
		})
	})
})

describe('NotificationBuilder', () => {
	it('can build a minimal notification', () => {
		const builder = createMockBuilder("n", NotificationBuilder);

		const builtValue = builder.build();
		expect(builtValue).toMatchObject({
			construct: "notification",
			identifier: "n",
			ifFeatures: [],
			musts: [],
			status: null,
			description: null,
			reference: null,
			typedefsOrGroupings: [],
			dataDefinitions: []
		})
	})

	it('can build a notification', () => {
		const builder = createMockBuilder("n", NotificationBuilder);

		builder.ifFeatures.add("f1", "f2");
		builder.musts.push(createMockBuilder("m", MustBuilder));
		builder.status.add(Status.Deprecated);
		builder.description.add("desc");
		builder.reference.add("ref");
		builder.typedefsOrGroupings.push(createMockBuilder("typedef-arg", TypedefBuilder));
		builder.typedefsOrGroupings.push(createMockBuilder("grouping-arg", GroupingBuilder));
		builder.dataDefinitions.push(createMockBuilder("l", LeafBuilder));
		builder.dataDefinitions.push(createMockBuilder("c", ContainerBuilder));

		const builtValue = builder.build();
		expect(builtValue).toMatchObject({
			construct: "notification",
			identifier: "n",
			ifFeatures: ["f1", "f2"],
			musts: builder.musts.map(b => b.build()),
			status: Status.Deprecated,
			description: "desc",
			reference: "ref",
			typedefsOrGroupings: builder.typedefsOrGroupings.map(b => b.build()),
			dataDefinitions: builder.dataDefinitions.map(b => b.build())
		})
	})
})

describe('InputBuilder', () => {
	it('can build a minimal input', () => {
		const builder = createMockBuilderNoArg(InputBuilder);

		const builtValue = builder.build();
		expect(builtValue).toMatchObject({
			musts: [],
			typedefsOrGroupings: [],
			dataDefinitions: []
		})
	})

	it('can build an input', () => {
		const builder = createMockBuilderNoArg(InputBuilder);
		builder.musts.push(createMockBuilder("m", MustBuilder));
		builder.typedefsOrGroupings.push(createMockBuilder("typedef-arg", TypedefBuilder));
		builder.typedefsOrGroupings.push(createMockBuilder("grouping-arg", GroupingBuilder));
		builder.dataDefinitions.push(createMockBuilder("l", LeafBuilder));
		builder.dataDefinitions.push(createMockBuilder("c", ContainerBuilder));

		const builtValue = builder.build();
		expect(builtValue).toMatchObject({
			musts: builder.musts.map(b => b.build()),
			typedefsOrGroupings: builder.typedefsOrGroupings.map(b => b.build()),
			dataDefinitions: builder.dataDefinitions.map(b => b.build())
		})
	})
})

describe('OutputBuilder', () => {
	it('can build a minimal output', () => {
		const builder = createMockBuilderNoArg(OutputBuilder);

		const builtValue = builder.build();
		expect(builtValue).toMatchObject({
			musts: [],
			typedefsOrGroupings: [],
			dataDefinitions: []
		})
	})

	it('can build an output', () => {
		const builder = createMockBuilderNoArg(OutputBuilder);
		builder.musts.push(createMockBuilder("m", MustBuilder));
		builder.typedefsOrGroupings.push(createMockBuilder("typedef-arg", TypedefBuilder));
		builder.typedefsOrGroupings.push(createMockBuilder("grouping-arg", GroupingBuilder));
		builder.dataDefinitions.push(createMockBuilder("l", LeafBuilder));
		builder.dataDefinitions.push(createMockBuilder("c", ContainerBuilder));

		const builtValue = builder.build();
		expect(builtValue).toMatchObject({
			musts: builder.musts.map(b => b.build()),
			typedefsOrGroupings: builder.typedefsOrGroupings.map(b => b.build()),
			dataDefinitions: builder.dataDefinitions.map(b => b.build())
		})
	})
})

describe('AugmentationBuilder', () => {
	it('can build a minimal augmentation', () => {
		const builder = createMockBuilder("a", AugmentationBuilder);

		const builtValue = builder.build();
		expect(builtValue).toMatchObject({
			construct: "augment",
			target: "a",
			when: null,
			ifFeatures: [],
			status: null,
			description: null,
			reference: null,
			statements: []
		})
	})

	it('can build an augmentation', () => {
		const builder = createMockBuilder("a", AugmentationBuilder);

		builder.when.add(createMockBuilder("w", WhenBuilder));
		builder.ifFeatures.add("f1", "f2");
		builder.status.add(Status.Deprecated);
		builder.description.add("desc");
		builder.reference.add("ref");
		builder.statements.push(createMockBuilder("l", LeafBuilder));
		builder.statements.push(createMockBuilder("c", CaseBuilder));

		const builtValue = builder.build();
		expect(builtValue).toMatchObject({
			construct: "augment",
			target: "a",
			when: builder.when.get().build(),
			ifFeatures: ["f1", "f2"],
			status: Status.Deprecated,
			description: "desc",
			reference: "ref",
			statements: builder.statements.map(b => b.build())
		})
	})
})
