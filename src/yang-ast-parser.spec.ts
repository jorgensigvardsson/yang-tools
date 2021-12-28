import 'jest';
import { YangStatement, parse as yangStmtParser } from './yang-stmt-parser';
import {
	expectBoolean, expectNumber, expectPatternModifier, expectStatus, expectString, 
	parseAction, parseAnyData, parseAnyXml, parseArgument, parseAugmentation,
	parseBit, parseCase, parseChoice, parseContainer, parseDeviation,
	parseDeviationItem, parseEnum, parseExtension, parseFeature, parseGrouping,
	parseIdentity, parseImport, parseInclude, parseInput, parseLeaf, parseLeafList,
	parseLength, parseLengthBoundary, parseLengthSpecification,
	parseLengthSpecifications, parseList, parseModule, parseMust,
	parseNotification, parseOutput, parsePattern, parseRange, parseRangeBoundary,
	parseRangeSpecification, parseRangeSpecifications, parseRefine, parseRevision,
	parseRpc, parseSubmodule, parseType, parseTypedef, parseUses, parseWhen
} from './yang-ast-parser';
import { Builder, Context, OptionalValueBuilder } from './yang-ast-builders';
import { PatternModifier, Status } from './yang-ast';

function yangParse(text: string): YangStatement {
	return yangStmtParser("<text buffer>", text);
}

function createStatement(prf: string, kw: string, arg: string | boolean): YangStatement {
	return {
		prf: prf,
		kw: kw,
		arg: arg,
		substmts: [],
		metadata: { position: { column: 1, line: 1, offset: 0 }, length: 0, source: "<memory buffer>" }
	};
}

type DeepPartial<T> = {
    [P in keyof T]?: DeepPartial<T[P]>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function removeMetadata(obj: any): any {
	if (obj && typeof obj === "object") {
		delete obj.metadata;

		for (const key in obj) {
			if (Array.isArray(obj[key])) {
				const array = obj[key];
				for (let i = 0; i < array.length; ++i) {
					array[i] = removeMetadata(array[i]);
				}
			} else if(typeof obj[key] === "object") {
				obj[key] = removeMetadata(obj[key]);
			}
		}
	}

	return obj;
}

function mockParse<T>(input: string, parser: (c: Context) => Builder<T>): DeepPartial<T> {
	// Remove the meta data as we don't want to test that in these tests (it becomes painstakingly complex to do that here)
	return removeMetadata(parser(new Context(yangParse(input))).build());
}

function testParse<T>(parser: (c: Context) => Builder<T>, input: string, expectedResult: DeepPartial<T> | undefined, contextInspector?: (context: Context) => void) {
	const context = new Context(yangParse(input));
	const result = parser(context).build();

	if (expectedResult !== undefined)
		expect(result).toMatchObject(expectedResult);

	if (contextInspector)
		contextInspector(context);
}

const createContext = (prf: string, kw: string, arg?: string) => new Context(createStatement(prf, kw, typeof arg === "string" ? arg : false));

describe("expectString", () => {
	it("marks non string arguments as invalid values and adds error message", () => {
		const context = createContext("baz", "foo");
		const builder = new OptionalValueBuilder<string>();

		expectString(context, builder);
		expect(context.errorCollection.messages).toContain("1:1:Expected a non-empty string argument for statement 'baz:foo' in '/'.");
	})

	it("adds string arguments as value to builder", () => {
		const context = createContext("baz", "foo", "the argument");
		const builder = new OptionalValueBuilder<string>();

		expectString(context, builder);
		expect(context.errorCollection.messages).toHaveLength(0);
		expect(builder.build()).toBe("the argument");
	})
})

describe("expectStatus", () => {
	it("marks non status arguments as invalid values and adds error message", () => {
		const context = createContext("baz", "foo");
		const builder = new OptionalValueBuilder<Status>();

		expectStatus(context, builder);
		expect(context.errorCollection.messages).toContain("1:1:Expected a non-empty string argument for statement 'baz:foo' in '/'.");
	})

	it("adds status arguments as value to builder", () => {
		const context = createContext("baz", "foo", "obsolete");
		const builder = new OptionalValueBuilder<Status>();

		expectStatus(context, builder);
		expect(context.errorCollection.messages).toHaveLength(0);
		expect(builder.build()).toBe(Status.Obsolete);
	})
})

describe("expectPatternModifier", () => {
	it("marks non pattern arguments as invalid values and adds error message", () => {
		const context = createContext("baz", "foo");
		const builder = new OptionalValueBuilder<PatternModifier>();

		expectPatternModifier(context, builder);
		expect(context.errorCollection.messages).toContain("1:1:Expected a non-empty string argument for statement 'baz:foo' in '/'.");
	})

	it("adds pattern modifier arguments as value to builder", () => {
		const context = createContext("baz", "foo", "invert-match");
		const builder = new OptionalValueBuilder<PatternModifier>();

		expectPatternModifier(context, builder);
		expect(context.errorCollection.messages).toHaveLength(0);
		expect(builder.build()).toBe(PatternModifier.InvertMatch);
	})
})

describe("expectBoolean", () => {
	it("marks non string arguments as invalid values and adds error message", () => {
		const context = createContext("baz", "foo");
		const builder = new OptionalValueBuilder<boolean>();

		expectBoolean(context, builder);
		expect(context.errorCollection.messages).toContain("1:1:Expected a non-empty string argument for statement 'baz:foo' in '/'.");
	})

	it("marks string arguments not convertible to boolean as invalid values and adds error message", () => {
		const context = createContext("baz", "foo", "sdlkjdslk");
		const builder = new OptionalValueBuilder<boolean>();

		expectBoolean(context, builder);
		expect(context.errorCollection.messages).toContain("1:1:Expected a boolean argument for statement 'baz:foo' in '/', but got 'sdlkjdslk'.");
	})

	it("adds string arguments convertible to boolean as value to builder", () => {
		const context = createContext("baz", "foo", "true");
		const builder = new OptionalValueBuilder<boolean>();

		expectBoolean(context, builder);
		expect(context.errorCollection.messages).toHaveLength(0);
	})
})

describe("expectNumber", () => {
	it("marks non string arguments as invalid values and adds error message", () => {
		const context = createContext("baz", "foo");
		const builder = new OptionalValueBuilder<number>();

		expectNumber(context, builder);
		expect(context.errorCollection.messages).toContain("1:1:Expected a non-empty string argument for statement 'baz:foo' in '/'.");
	})

	it("marks string arguments not convertible to number as invalid values and adds error message", () => {
		const context = createContext("baz", "foo", "sdlkjdslk");
		const builder = new OptionalValueBuilder<number>();

		expectNumber(context, builder);
		expect(context.errorCollection.messages).toContain("1:1:Expected a numeric argument for statement 'baz:foo' in '/', but got 'sdlkjdslk'.");
	})

	it("adds string arguments convertible to number as value to builder", () => {
		const context = createContext("baz", "foo", "1.234");
		const builder = new OptionalValueBuilder<number>();

		expectNumber(context, builder);
		expect(context.errorCollection.messages).toHaveLength(0);
	})
})

describe("parseModule", () => {
	it("can parse a module syntax", () => {
		testParse(
			parseModule,
			`module a-module {
				prefix pre;
				yang-version 1.1;
				namespace "urn:westermo:test";
				contact "Jörgen";
				organization "Acme Inc.";
				reference "a ref";
				description "a desc";

				revision 2000-01-01 {
					description "Initial revision";
					reference "RFC 1234";
				}

				revision 2000-01-02 {
					description "Second revision";
					reference "RFC 4321";
				}

				import da-import {
					prefix dai;
					revision 2001-02-03;
					reference "import ref";
					description "import desc";				
				}

				include da-include {
					revision 2002-03-04;
					reference "include ref";
					description "include desc";
				}

				extension e;
				feature f;
				identity i;
				typedef td;
				grouping g;

				// dataDefinitions
				uses u1;
				container c2;
				leaf l3;
				leaf-list ll4;
				list l5;
				choice c6;
				anydata c7;
				anyxml c8;

				augment a;
				rpc r;
				notification n;
				deviation dev;
			}`,
			{
				construct: "module",
				prefix: "pre",
				name: "a-module",
				yangVersion: "1.1",
				namespace: "urn:westermo:test",
				contact: "Jörgen",
				organization: "Acme Inc.",
				reference: "a ref",
				description: "a desc",
				revisions: [{
					value: "2000-01-01",
					description: "Initial revision",
					reference: "RFC 1234"
				}, {
					value: "2000-01-02",
					description: "Second revision",
					reference: "RFC 4321"
				}],
				imports: [{
					prefix: "dai",
					identifier: "da-import",
					revision: "2001-02-03",
					reference: "import ref",
					description: "import desc"
				}],
				includes: [{
					identifier: "da-include",
					revision: "2002-03-04",
					reference: "include ref",
					description: "include desc"
				}],
				body: [
					mockParse("extension e;", parseExtension),
					mockParse("feature f;", parseFeature),
					mockParse("identity i;", parseIdentity),
					mockParse("typedef td;", parseTypedef),
					mockParse("grouping g;", parseGrouping),
					mockParse("uses u1;", parseUses),
					mockParse("container c2;", parseContainer),
					mockParse("leaf l3;", parseLeaf),
					mockParse("list-list ll4;", parseLeafList),
					mockParse("list l5;", parseList),
					mockParse("choice c6;", parseChoice),
					mockParse("anydata c7;", parseAnyData),
					mockParse("anyxml c8;", parseAnyXml),
					mockParse("augment a;", parseAugmentation),
					mockParse("rpc r;", parseRpc),
					mockParse("notification n;", parseNotification),
					mockParse("deviation dev;", parseDeviation),
				]
			}
		);
	})

	it("can report invalid semantics", () => {
		testParse(
			parseModule,
			`module {
				prefix "";
				yang-version 1.1;
				contact "";
				organization "Acme Inc.";
			}`,
			undefined,
			context => {
				expect(context.errorCollection.messages).toContain("1:1:Expected a non-empty string argument for statement 'module' in '/'.");
				expect(context.errorCollection.messages).toContain("1:1:Required statement 'namespace' not found in '/module=<unnamed module>'.");
			}
		);
	})

	it("can handle unknown statements", () => {
		testParse(
			parseModule,
			`module a-module {
				prefix pre;
				yang-version 1.1;
				namespace "urn:westermo:test";
				contact "Jörgen";
				organization_ "Acme Inc.";

				revision 2000-01-01 {
					description "Initial revision";
					reference "RFC 1234";
					faux_prefix:baz "zoo";
				}

				revision 2000-01-02 {
					description "Second revision";
					reference "RFC 4321";
					foo "bar";
				}

				some_prefix:foo "bar";
			}`,
			{
				construct: "module",
				prefix: "pre",
				name: "a-module",
				yangVersion: "1.1",
				namespace: "urn:westermo:test",
				contact: "Jörgen",
				organization: null,
				reference: null,
				description: null,
				revisions: [{
					value: "2000-01-01",
					description: "Initial revision",
					reference: "RFC 1234",
					unknownStatements: [{
						prefix: "faux_prefix",
						keyword: "baz",
						argument: "zoo",
						subStatements: []
					}]
				}, {
					value: "2000-01-02",
					description: "Second revision",
					reference: "RFC 4321",
					unknownStatements: [{
						prefix: null,
						keyword: "foo",
						argument: "bar",
						subStatements: []
					}]
				}],
				imports: [],
				includes: [],
				body: [],
				unknownStatements: [{
					prefix: null,
					keyword: "organization_",
					argument: "Acme Inc.",
					subStatements: []
				},
				{
					prefix: "some_prefix",
					keyword: "foo",
					argument: "bar",
					subStatements: []
				}]				
			}
		);
	})
})

describe("parseSubmodule", () => {
	it("can parse a submodule syntax", () => {
		testParse(
			parseSubmodule,
			`submodule a-submodule {
				yang-version 1.1;
				belongs-to "urn:westermo:test";
				contact "Jörgen";
				organization "Acme Inc.";
				reference "a ref";
				description "a desc";

				revision 2000-01-01 {
					description "Initial revision";
					reference "RFC 1234";
				}

				revision 2000-01-02 {
					description "Second revision";
					reference "RFC 4321";
				}

				import da-import {
					prefix dai;
					revision 2001-02-03;
					reference "import ref";
					description "import desc";				
				}

				include da-include {
					revision 2002-03-04;
					reference "include ref";
					description "include desc";
				}

				extension e;
				feature f;
				identity i;
				typedef td;
				grouping g;

				// dataDefinitions
				uses u1;
				container c2;
				leaf l3;
				leaf-list ll4;
				list l5;
				choice c6;
				anydata c7;
				anyxml c8;

				augment a;
				rpc r;
				notification n;
				deviation dev;
			}`,
			{
				construct: "submodule",
				name: "a-submodule",
				yangVersion: "1.1",
				belongsTo: "urn:westermo:test",
				contact: "Jörgen",
				organization: "Acme Inc.",
				reference: "a ref",
				description: "a desc",
				revisions: [{
					value: "2000-01-01",
					description: "Initial revision",
					reference: "RFC 1234"
				}, {
					value: "2000-01-02",
					description: "Second revision",
					reference: "RFC 4321"
				}],
				imports: [{
					prefix: "dai",
					identifier: "da-import",
					revision: "2001-02-03",
					reference: "import ref",
					description: "import desc"
				}],
				includes: [{
					identifier: "da-include",
					revision: "2002-03-04",
					reference: "include ref",
					description: "include desc"
				}],
				body: [
					mockParse("extension e;", parseExtension),
					mockParse("feature f;", parseFeature),
					mockParse("identity i;", parseIdentity),
					mockParse("typedef td;", parseTypedef),
					mockParse("grouping g;", parseGrouping),
					mockParse("uses u1;", parseUses),
					mockParse("container c2;", parseContainer),
					mockParse("leaf l3;", parseLeaf),
					mockParse("list-list ll4;", parseLeafList),
					mockParse("list l5;", parseList),
					mockParse("choice c6;", parseChoice),
					mockParse("anydata c7;", parseAnyData),
					mockParse("anyxml c8;", parseAnyXml),
					mockParse("augment a;", parseAugmentation),
					mockParse("rpc r;", parseRpc),
					mockParse("notification n;", parseNotification),
					mockParse("deviation dev;", parseDeviation),
				]
			}
		);
	})

	it("can report invalid semantics", () => {
		testParse(
			parseSubmodule,
			`submodule {
				yang-version 1.1;
				contact "";
				organization "Acme Inc.";
			}`,
			undefined,
			context => {
				expect(context.errorCollection.messages).toContain("1:1:Expected a non-empty string argument for statement 'submodule' in '/'.");
				expect(context.errorCollection.messages).toContain("1:1:Required statement 'belongs-to' not found in '/submodule=<unnamed submodule>'.");
			}
		);
	})

	it("can handle unknown statements", () => {
		testParse(
			parseSubmodule,
			`submodule a-submodule {
				yang-version 1.1;
				belongs-to "urn:westermo:test";
				contact "Jörgen";
				organization_ "Acme Inc.";

				revision 2000-01-01 {
					description "Initial revision";
					reference "RFC 1234";
					faux_prefix:baz "zoo";
				}

				revision 2000-01-02 {
					description "Second revision";
					reference "RFC 4321";
					foo "bar";
				}

				some_prefix:foo "bar";
			}`,
			{
				construct: "submodule",
				name: "a-submodule",
				yangVersion: "1.1",
				belongsTo: "urn:westermo:test",
				contact: "Jörgen",
				organization: null,
				reference: null,
				description: null,
				revisions: [{
					value: "2000-01-01",
					description: "Initial revision",
					reference: "RFC 1234",
					unknownStatements: [{
						prefix: "faux_prefix",
						keyword: "baz",
						argument: "zoo",
						subStatements: []
					}]
				}, {
					value: "2000-01-02",
					description: "Second revision",
					reference: "RFC 4321",
					unknownStatements: [{
						prefix: null,
						keyword: "foo",
						argument: "bar",
						subStatements: []
					}]
				}],
				imports: [],
				includes: [],
				body: [],
				unknownStatements: [{
					prefix: null,
					keyword: "organization_",
					argument: "Acme Inc.",
					subStatements: []
				},
				{
					prefix: "some_prefix",
					keyword: "foo",
					argument: "bar",
					subStatements: []
				}]
			}
		);
	})
})

describe("parseRevision", () => {
	it("can parse a module revision syntax", () => {
		const input = `revision 2000-01-01 {
				description "Initial revision";
				reference "RFC 1234";
			}`;
		const module = mockParse(input, parseRevision);

		expect(module).toMatchObject({
			value: "2000-01-01",
			description: "Initial revision",
			reference: "RFC 1234"
		});
	})

	it("can report invalid semantics", () => {
		const input = `revision {
				reference "";
			}}`;
		const context = new Context(yangParse(input));
		const module = parseRevision(context).build();

		expect(module).toMatchObject({
			value: "<unnamed revision>",
			description: null,
			reference: ""
		});

		expect(context.errorCollection.messages).toContain("1:1:Expected a non-empty string argument for statement 'revision' in '/'.");
	})

	it("can handle unknown statements", () => {
		const input = `revision 2000-01-01 {
			reference_ "ref";
		}`;
		const context = new Context(yangParse(input));
		const module = parseRevision(context).build();

		expect(module).not.toBeUndefined();
		expect(module).toMatchObject({
			value: "2000-01-01",
			reference: null,
			description: null,
			unknownStatements: [{
				prefix: null,
				keyword: "reference_",
				argument: "ref",
				subStatements: []
			}]
		});

		expect(context.errorCollection.messages).toHaveLength(0);
	})
})

describe("parseWhen", () => {
	it("can parse a when syntax", () => {
		const input = `when "/x/y" {
				description "Initial revision";
				reference "RFC 1234";
			}`;
		const module = mockParse(input, parseWhen);

		expect(module).toMatchObject({
			xpath: "/x/y",
			description: "Initial revision",
			reference: "RFC 1234"
		});
	})

	it("can report invalid semantics", () => {
		const input = `when {
				reference "";
			}}`;
		const context = new Context(yangParse(input));
		const module = parseWhen(context).build();

		expect(module).toMatchObject({
			xpath: "<unnamed when>",
			description: null,
			reference: ""
		});

		expect(context.errorCollection.messages).toContain("1:1:Expected a non-empty string argument for statement 'when' in '/'.");
	})

	it("can handle unknown statements", () => {
		const input = `revision "/x/y" {
			reference_ "ref";
		}`;
		const context = new Context(yangParse(input));
		const module = parseWhen(context).build();

		expect(module).not.toBeUndefined();
		expect(module).toMatchObject({
			xpath: "/x/y",
			reference: null,
			description: null,
			unknownStatements: [{
				prefix: null,
				keyword: "reference_",
				argument: "ref",
				subStatements: []
			}]
		});

		expect(context.errorCollection.messages).toHaveLength(0);
	})
})


describe("parseImport", () => {
	it("can parse a module import syntax", () => {
		const input = `import da-import {
			prefix dai;
			revision 2001-02-03;
			reference "import ref";
			description "import desc";
		}`;
		const module = mockParse(input, parseImport);

		expect(module).toMatchObject({
			identifier: "da-import",
			prefix: "dai",
			revision: "2001-02-03",
			reference: "import ref",
			description: "import desc"
		});
	})

	it("can report invalid semantics", () => {
		const input = `import {
		}}`;
		const context = new Context(yangParse(input));
		const module = parseImport(context).build();

		expect(module).toMatchObject({
			identifier: "<unnamed import>",
			prefix: "",
			revision: null,
			reference: null,
			description: null
		});

		expect(context.errorCollection.messages).toContain("1:1:Expected a non-empty string argument for statement 'import' in '/'.");
		expect(context.errorCollection.messages).toContain("1:1:Required statement 'prefix' not found in '/import=<unnamed import>'.");
	})

	it("can handle unknown statements", () => {
		const input = `import da-import {
			prefix dai;
			revision_ 2001-02-03;
		}`;
		const context = new Context(yangParse(input));
		const module = parseImport(context).build();

		expect(module).not.toBeUndefined();
		expect(module).toMatchObject({
			identifier: "da-import",
			prefix: "dai",
			revision: null,
			reference: null,
			description: null,
			unknownStatements: [{
				prefix: null,
				keyword: "revision_",
				argument: "2001-02-03",
				subStatements: []
			}]
		});

		expect(context.errorCollection.messages).toHaveLength(0);
	})
})

describe("parseInclude", () => {
	it("can parse a module include syntax", () => {
		const input = `include da-include {
			revision 2001-02-03;
			reference "include ref";
			description "include desc";
		}`;
		const module = mockParse(input, parseInclude);

		expect(module).toMatchObject({
			identifier: "da-include",
			revision: "2001-02-03",
			reference: "include ref",
			description: "include desc"
		});
	})

	it("can report invalid semantics", () => {
		const input = `include {
		}}`;
		const context = new Context(yangParse(input));
		const module = parseInclude(context).build();

		expect(module).toMatchObject({
			identifier: "<unnamed include>",
			revision: null,
			reference: null,
			description: null
		});

		expect(context.errorCollection.messages).toContain("1:1:Expected a non-empty string argument for statement 'include' in '/'.");
	})

	it("can handle unknown statements", () => {
		const input = `include da-include {
			revision_ 2001-02-03;
		}`;
		const context = new Context(yangParse(input));
		const module = parseInclude(context).build();

		expect(module).not.toBeUndefined();
		expect(module).toMatchObject({
			identifier: "da-include",
			revision: null,
			reference: null,
			description: null,
			unknownStatements: [{
				prefix: null,
				keyword: "revision_",
				argument: "2001-02-03",
				subStatements: []
			}]
		});

		expect(context.errorCollection.messages).toHaveLength(0);
	})
})

describe("parseMust", () => {
	it("can parse a must syntax", () => {
		const input = `must "/x/y" {
				error-app-tag tag;
				error-message "msg";
				description "Initial revision";
				reference "RFC 1234";
			}`;
		const module = mockParse(input, parseMust);

		expect(module).toMatchObject({
			xpath: "/x/y",
			errorAppTag: "tag",
			errorMessage: "msg",
			description: "Initial revision",
			reference: "RFC 1234"
		});
	})

	it("can report invalid semantics", () => {
		const input = `must {
				reference "";
			}}`;
		const context = new Context(yangParse(input));
		const module = parseMust(context).build();

		expect(module).toMatchObject({
			xpath: "<unnamed must>",
			errorAppTag: null,
			errorMessage: null,
			description: null,
			reference: ""
		});

		expect(context.errorCollection.messages).toContain("1:1:Expected a non-empty string argument for statement 'must' in '/'.");
	})

	it("can handle unknown statements", () => {
		const input = `must "/x/y" {
			reference_ "ref";
		}`;
		const context = new Context(yangParse(input));
		const module = parseMust(context).build();

		expect(module).not.toBeUndefined();
		expect(module).toMatchObject({
			xpath: "/x/y",
			errorAppTag: null,
			errorMessage: null,
			description: null,
			reference: null,
			unknownStatements: [{
				prefix: null,
				keyword: "reference_",
				argument: "ref",
				subStatements: []
			}]
		});

		expect(context.errorCollection.messages).toHaveLength(0);
	})
})

describe("parseRefine", () => {
	it("can parse a refine syntax", () => {
		const input = `refine target {
			if-feature feat1;
			if-feature feat2;
			must m1;
			must m2;
			presence "pres";
			default "def1";
			default "def2";
			config true;
			mandatory false;
			min-elements 123;
			max-elements 456;
			description "Initial revision";
			reference "RFC 1234";
		}`;

		const module = mockParse(input, parseRefine);

		expect(module).toMatchObject({
			target: "target",
			ifFeatures: ["feat1", "feat2"],
			musts: [
				mockParse("must m1;", parseMust),
				mockParse("must m2;", parseMust)
			],
			presence: "pres",
			defaults: ["def1", "def2"],
			config: true,
			mandatory: false,
			minElements: 123,
			maxElements: 456,
			description: "Initial revision",
			reference: "RFC 1234"
		});
	})

	it("can report invalid semantics", () => {
		const input = `refine {
			mandatory bloop;
			min-elements "123";
			max-elements -456;
		}`;
		const context = new Context(yangParse(input));
		const module = parseRefine(context).build();

		expect(module).toMatchObject({
			target: "<unnamed refine>",
			ifFeatures: [],
			musts: [],
			presence: null,
			defaults: [],
			config: null,
			mandatory: null,
			minElements: 123,
			maxElements: -456,
			description: null,
			reference: null
		});

		expect(context.errorCollection.messages).toContain("1:1:Expected a non-empty string argument for statement 'refine' in '/'.");
		expect(context.errorCollection.messages).toContain("2:4:Expected a boolean argument for statement 'mandatory' in '/refine=<unnamed refine>', but got 'bloop'.");
	})

	it("can handle unknown statements", () => {
		const input = `refine target {
			reference_ "some ref";
		}`;
		const context = new Context(yangParse(input));
		const module = parseRefine(context).build();

		expect(module).not.toBeUndefined();
		expect(module).toMatchObject({
			target: "target",
			ifFeatures: [],
			musts: [],
			presence: null,
			defaults: [],
			config: null,
			mandatory: null,
			minElements: null,
			maxElements: null,
			description: null,
			reference: null,
			unknownStatements: [{
				prefix: null,
				keyword: "reference_",
				argument: "some ref",
				subStatements: []
			}]
		});

		expect(context.errorCollection.messages).toHaveLength(0);
	})
})


describe("parseEnum", () => {
	it("can parse an enum syntax", () => {
		const input = `enum my-enum {
			value 1;
			status obsolete;
			description "Initial revision";
			reference "RFC 1234";
		}`;

		const { builder, nextEnumValue } = parseEnum(new Context(yangParse(input)), 100);
		const theEnum = builder.build();

		expect(nextEnumValue).toBe(2);
		expect(theEnum).toMatchObject({
			name: "my-enum",
			value: 1,
			status: Status.Obsolete,
			description: "Initial revision",
			reference: "RFC 1234"
		});
	})

	it("can parse an implicit enum syntax", () => {
		const input = `enum my-enum;`;

		const { builder, nextEnumValue } = parseEnum(new Context(yangParse(input)), 100);
		const theEnum = builder.build();

		expect(nextEnumValue).toBe(101);
		expect(theEnum).toMatchObject({
			name: "my-enum",
			value: 100,
			status: null,
			description: null,
			reference: null
		});
	})

	it("can report invalid semantics", () => {
		const input = `enum {
			status foo;
		}`;
		const context = new Context(yangParse(input));
		const { builder, nextEnumValue } = parseEnum(context, 0);
		const theEnum = builder.build();

		expect(nextEnumValue).toBe(1);
		expect(theEnum).toMatchObject({
			name: "<unnamed enum>",
			value: 0,
			status: null,
			description: null,
			reference: null
		});

		expect(context.errorCollection.messages).toContain("1:1:Expected a non-empty string argument for statement 'enum' in '/'.");
		expect(context.errorCollection.messages).toContain("2:4:Expected a status argument for statement 'status' in '/enum=<unnamed enum>', but got 'foo'.");
	})

	it("can handle unknown statements", () => {
		const input = `enum my-enum {
			reference_ "some ref";
		}`;
		const context = new Context(yangParse(input));
		const { builder, nextEnumValue } = parseEnum(context, 0);
		const theEnum = builder.build();

		expect(nextEnumValue).toBe(1);
		expect(theEnum).toMatchObject({
			name: "my-enum",
			value: 0,
			status: null,
			description: null,
			reference: null,
			unknownStatements: [{
				prefix: null,
				keyword: "reference_",
				argument: "some ref",
				subStatements: []
			}]
		});

		expect(context.errorCollection.messages).toHaveLength(0);
	})
})

describe("parseBit", () => {
	it("can parse a bit syntax", () => {
		const input = `bit my-bit {
			position 1;
			if-feature f1;
			if-feature f2;
			status deprecated;
			description "Initial revision";
			reference "RFC 1234";
		}`;

		const { builder, nextPosition } = parseBit(new Context(yangParse(input)), 100);
		const theBit = builder.build();

		expect(nextPosition).toBe(2);
		expect(theBit).toMatchObject({
			identifier: "my-bit",
			position: 1,
			ifFeatures: ["f1", "f2"],
			status: Status.Deprecated,
			description: "Initial revision",
			reference: "RFC 1234"
		});
	})

	it("can parse an implicit bit syntax", () => {
		const input = `bit my-bit;`;

		const { builder, nextPosition } = parseBit(new Context(yangParse(input)), 100);
		const theBit = builder.build();

		expect(nextPosition).toBe(101);
		expect(theBit).toMatchObject({
			identifier: "my-bit",
			position: 100,
			ifFeatures: [],
			status: null,
			description: null,
			reference: null
		});
	})

	it("can report invalid semantics", () => {
		const input = `bit {
			status foo;
		}`;
		const context = new Context(yangParse(input));
		const { builder, nextPosition } = parseBit(context, 0);
		const theBit = builder.build();

		expect(nextPosition).toBe(1);
		expect(theBit).toMatchObject({
			identifier: "<unnamed bit>",
			position: 0,
			ifFeatures: [],
			status: null,
			description: null,
			reference: null
		});

		expect(context.errorCollection.messages).toContain("1:1:Expected a non-empty string argument for statement 'bit' in '/'.");
		expect(context.errorCollection.messages).toContain("2:4:Expected a status argument for statement 'status' in '/bit=<unnamed bit>', but got 'foo'.");
	})

	it("can handle unknown statements", () => {
		const input = `enum my-bit {
			reference_ "some ref";
		}`;
		const context = new Context(yangParse(input));
		const { builder, nextPosition } = parseBit(context, 0);
		const theBit = builder.build();

		expect(nextPosition).toBe(1);
		expect(theBit).toMatchObject({
			identifier: "my-bit",
			position: 0,
			ifFeatures: [],
			status: null,
			description: null,
			reference: null,
			unknownStatements: [{
				prefix: null,
				keyword: "reference_",
				argument: "some ref",
				subStatements: []
			}]
		});

		expect(context.errorCollection.messages).toHaveLength(0);
	})
})

describe("parsePattern", () => {
	it("can parse a pattern syntax", () => {
		const input = `pattern my-spec {
			modifier invert-match;
			error-app-tag eat;
			error-message em;
			description desc;
			reference ref;
		}`;

		const builder = parsePattern(new Context(yangParse(input)));
		const thePattern = builder.build();

		expect(thePattern).toMatchObject({
			specification: "my-spec",
			modifier: PatternModifier.InvertMatch,
			errorAppTag: "eat",
			errorMessage: "em",
			description: "desc",
			reference: "ref"
		});
	})

	it("can parse a minimal pattern syntax", () => {
		const input = `pattern my-spec;`;

		const builder = parsePattern(new Context(yangParse(input)));
		const thePattern = builder.build();

		expect(thePattern).toMatchObject({
			specification: "my-spec",
			modifier: null,
			errorAppTag: null,
			errorMessage: null,
			description: null,
			reference: null
		});
	})

	it("can report invalid semantics", () => {
		const input = `pattern {
			modifier foo;
		}`;

		const context = new Context(yangParse(input));
		const builder = parsePattern(context);
		const thePattern = builder.build();

		expect(thePattern).toMatchObject({
			specification: "<unnamed pattern>",
			modifier: null,
			errorAppTag: null,
			errorMessage: null,
			description: null,
			reference: null
		});

		expect(context.errorCollection.messages).toContain("1:1:Expected a non-empty string argument for statement 'pattern' in '/'.");
		expect(context.errorCollection.messages).toContain("2:4:Expected a pattern modifier argument for statement 'modifier' in '/pattern=<unnamed pattern>', but got 'foo'.");
	})

	it("can handle unknown statements", () => {
		const input = `pattern spec {
			reference_ "some ref";
		}`;
		const context = new Context(yangParse(input));
		const builder = parsePattern(context);
		const thePattern = builder.build();

		expect(thePattern).toMatchObject({
			specification: "spec",
			modifier: null,
			errorAppTag: null,
			errorMessage: null,
			description: null,
			reference: null,
			unknownStatements: [{
				prefix: null,
				keyword: "reference_",
				argument: "some ref",
				subStatements: []
			}]
		});

		expect(context.errorCollection.messages).toHaveLength(0);
	})
})


describe("parseLengthBoundary", () => {
	it("refuses to parse negative boundaries", () => {
		const context = createContext("", "");
		const spec = parseLengthBoundary("-1", context);

		expect(spec).toBeUndefined();
		expect(context.errorCollection.messages).toContain("1:1:Invalid boundary number '-1' in length statement '/'.");
	})

	it("refuses to parse random text", () => {
		const context = createContext("", "");
		const spec = parseLengthBoundary("sddsds", context);

		expect(spec).toBeUndefined();
		expect(context.errorCollection.messages).toContain("1:1:Invalid boundary number 'sddsds' in length statement '/'.");
	})
})

describe("parseLengthPart", () => {
	it("refuses to parse invalid number of boundaries", () => {
		const context = createContext("", "");
		const spec = parseLengthSpecification("1..2..3", context);

		expect(spec).toBeUndefined();
		expect(context.errorCollection.messages).toContain("1:1:Invalid length part '1..2..3' for length statement in '/'.");
	})

	it("refuses to parse invalid boundaries (negatives)", () => {
		const context = createContext("", "");
		const spec = parseLengthSpecification("1..-1", context);

		expect(spec).toBeUndefined();
		expect(context.errorCollection.messages).toContain("1:1:Invalid boundary number '-1' in length statement '/'.");
	})

	it("refuses to parse invalid boundaries (min > max)", () => {
		const context = createContext("", "");
		const spec = parseLengthSpecification("1..0", context);

		expect(spec).toBeUndefined();
		expect(context.errorCollection.messages).toContain("1:1:Invalid interval '1..0' for length statement in '/' (min mustn't > max).");
	})

	it("refuses to parse invalid boundaries (lower bound == max)", () => {
		const context = createContext("", "");
		const spec = parseLengthSpecification("max..123", context);

		expect(spec).toBeUndefined();
		expect(context.errorCollection.messages).toContain("1:1:Invalid interval 'max..123' for length statement in '/' (min mustn't > max).");
	})

	it("parses well formed syntax (min, max)", () => {
		const context = createContext("", "");
		const spec = parseLengthSpecification("min..max", context);

		expect(spec).toMatchObject({
			lowerBound: "min",
			upperBound: "max"
		});
	})

	it("parses well formed syntax (min, num)", () => {
		const context = createContext("", "");
		const spec = parseLengthSpecification("min..1", context);

		expect(spec).toMatchObject({
			lowerBound: "min",
			upperBound: 1
		});
	})

	it("parses well formed syntax (num, num)", () => {
		const context = createContext("", "");
		const spec = parseLengthSpecification("1..20", context);

		expect(spec).toMatchObject({
			lowerBound: 1,
			upperBound: 20
		});
	})

	it("parses well formed syntax (num, max)", () => {
		const context = createContext("", "");
		const spec = parseLengthSpecification("5..max", context);

		expect(spec).toMatchObject({
			lowerBound: 5,
			upperBound: "max"
		});
	})
})

describe("parseLengthSpecifications", () => {
	it("can parse one specification", () => {
		const context = createContext("", "");
		const specs = parseLengthSpecifications("1..2", context);

		expect(specs).toMatchObject([{
			lowerBound: 1,
			upperBound: 2
		}]);
	})

	it("can parse multiple specifications", () => {
		const context = createContext("", "");
		const specs = parseLengthSpecifications("1..2|3..4|5..6", context);

		expect(specs).toMatchObject([{
			lowerBound: 1,
			upperBound: 2
		}, {
			lowerBound: 3,
			upperBound: 4
		}, {
			lowerBound: 5,
			upperBound: 6
		}]);
	})
})

describe("parseLength", () => {
	it("can parse a length syntax", () => {
		const input = `length "1..10|100..max" {
			error-app-tag eat;
			error-message em;
			description desc;
			reference ref;
		}`;

		const builder = parseLength(new Context(yangParse(input)));
		const theLength = builder.build();

		expect(theLength).toMatchObject({
			specifications: [
				{
					lowerBound: 1,
					upperBound: 10
				}, {
					lowerBound: 100,
					upperBound: "max"
				}
			],
			errorAppTag: "eat",
			errorMessage: "em",
			description: "desc",
			reference: "ref"
		});
	})

	it("can parse a minimal length syntax", () => {
		const input = `length 1;`;

		const builder = parseLength(new Context(yangParse(input)));
		const theLength = builder.build();

		expect(theLength).toMatchObject({
			specifications: [{
				lowerBound: 1,
				upperBound: null
			}],
			errorAppTag: null,
			errorMessage: null,
			description: null,
			reference: null
		});
	})

	it("can report invalid semantics", () => {
		const input = `length "55..10";`;

		const context = new Context(yangParse(input));
		const builder = parseLength(context);
		const theLength = builder.build();

		expect(theLength).toMatchObject({
			specifications: [],
			errorAppTag: null,
			errorMessage: null,
			description: null,
			reference: null
		});

		expect(context.errorCollection.messages).toContain("1:1:Invalid interval '55..10' for length statement in '/length=55..10' (min mustn't > max).");
	})

	it("can handle unknown statements", () => {
		const input = `length 1 {
			reference_ "some ref";
		}`;
		const context = new Context(yangParse(input));
		const builder = parseLength(context);
		const theLength = builder.build();

		expect(theLength).toMatchObject({
			specifications: [{
				lowerBound: 1,
				upperBound: null
			}],
			errorAppTag: null,
			errorMessage: null,
			description: null,
			reference: null,
			unknownStatements: [{
				prefix: null,
				keyword: "reference_",
				argument: "some ref",
				subStatements: []
			}]
		});

		expect(context.errorCollection.messages).toHaveLength(0);
	})
})

describe("parseRangeBoundary", () => {
	it("refuses to parse random text", () => {
		const context = createContext("", "");
		const spec = parseRangeBoundary("sddsds", context);

		expect(spec).toBeUndefined();
		expect(context.errorCollection.messages).toContain("1:1:Invalid boundary number 'sddsds' in range statement '/'.");
	})
})

describe("parseRangePart", () => {
	it("refuses to parse invalid number of boundaries", () => {
		const context = createContext("", "");
		const spec = parseRangeSpecification("1..2..3", context);

		expect(spec).toBeUndefined();
		expect(context.errorCollection.messages).toContain("1:1:Invalid range part '1..2..3' for range statement in '/'.");
	})

	it("refuses to parse invalid boundaries (min > max)", () => {
		const context = createContext("", "");
		const spec = parseRangeSpecification("1..0", context);

		expect(spec).toBeUndefined();
		expect(context.errorCollection.messages).toContain("1:1:Invalid interval '1..0' for range statement in '/' (min mustn't > max).");
	})

	it("refuses to parse invalid boundaries (lower bound == max)", () => {
		const context = createContext("", "");
		const spec = parseRangeSpecification("max..123", context);

		expect(spec).toBeUndefined();
		expect(context.errorCollection.messages).toContain("1:1:Invalid interval 'max..123' for range statement in '/' (min mustn't > max).");
	})

	it("parses well formed syntax (min, max)", () => {
		const context = createContext("", "");
		const spec = parseRangeSpecification("min..max", context);

		expect(spec).toMatchObject({
			lowerBound: "min",
			upperBound: "max"
		});
	})

	it("parses well formed syntax (min, num)", () => {
		const context = createContext("", "");
		const spec = parseRangeSpecification("min..1", context);

		expect(spec).toMatchObject({
			lowerBound: "min",
			upperBound: 1
		});
	})

	it("parses well formed syntax (num, num)", () => {
		const context = createContext("", "");
		const spec = parseRangeSpecification("-1..20", context);

		expect(spec).toMatchObject({
			lowerBound: -1,
			upperBound: 20
		});
	})

	it("parses well formed syntax (num, max)", () => {
		const context = createContext("", "");
		const spec = parseRangeSpecification("5..max", context);

		expect(spec).toMatchObject({
			lowerBound: 5,
			upperBound: "max"
		});
	})
})

describe("parseRangeSpecifications", () => {
	it("can parse one specification", () => {
		const context = createContext("", "");
		const specs = parseRangeSpecifications("1..2", context);

		expect(specs).toMatchObject([{
			lowerBound: 1,
			upperBound: 2
		}]);
	})

	it("can parse multiple specifications", () => {
		const context = createContext("", "");
		const specs = parseRangeSpecifications("1..2|3..4|5..6", context);

		expect(specs).toMatchObject([{
			lowerBound: 1,
			upperBound: 2
		}, {
			lowerBound: 3,
			upperBound: 4
		}, {
			lowerBound: 5,
			upperBound: 6
		}]);
	})
})

describe("parseRange", () => {
	it("can parse a range syntax", () => {
		const input = `range "1..10|100..max" {
			error-app-tag eat;
			error-message em;
			description desc;
			reference ref;
		}`;

		const builder = parseRange(new Context(yangParse(input)));
		const theRange = builder.build();

		expect(theRange).toMatchObject({
			specifications: [
				{
					lowerBound: 1,
					upperBound: 10
				}, {
					lowerBound: 100,
					upperBound: "max"
				}
			],
			errorAppTag: "eat",
			errorMessage: "em",
			description: "desc",
			reference: "ref"
		});
	})

	it("can parse a minimal range syntax", () => {
		const input = `range 1;`;

		const builder = parseRange(new Context(yangParse(input)));
		const theRange = builder.build();

		expect(theRange).toMatchObject({
			specifications: [{
				lowerBound: 1,
				upperBound: null
			}],
			errorAppTag: null,
			errorMessage: null,
			description: null,
			reference: null
		});
	})

	it("can report invalid semantics", () => {
		const input = `range "55..10";`;

		const context = new Context(yangParse(input));
		const builder = parseRange(context);
		const theRange = builder.build();

		expect(theRange).toMatchObject({
			specifications: [],
			errorAppTag: null,
			errorMessage: null,
			description: null,
			reference: null
		});

		expect(context.errorCollection.messages).toContain("1:1:Invalid interval '55..10' for range statement in '/range=55..10' (min mustn't > max).");
	})

	it("can handle unknown statements", () => {
		const input = `range 1 {
			reference_ "some ref";
		}`;
		const context = new Context(yangParse(input));
		const builder = parseRange(context);
		const theRange = builder.build();

		expect(theRange).toMatchObject({
			specifications: [{
				lowerBound: 1,
				upperBound: null
			}],
			errorAppTag: null,
			errorMessage: null,
			description: null,
			reference: null,
			unknownStatements: [{
				prefix: null,
				keyword: "reference_",
				argument: "some ref",
				subStatements: []
			}]
		});

		expect(context.errorCollection.messages).toHaveLength(0);
	})
})

describe("parseType", () => {
	it("can parse a type syntax", () => {
		const input = `type int8 {
			base an-idendity-for-base;
			base another-idendity-for-base;
			bit first {
				position 3;
			}
			bit second;
			enum zero;
			enum one {
				value 1;
			}
			enum two;
			fraction-digits 5;
			length "0..max";
			path "/a/b/c";
			pattern "[0-9]+";
			range "0..9|10..19";
			require-instance true;
			type uint8;
			type uint16;
		}`;

		const builder = parseType(new Context(yangParse(input)));
		const theType = builder.build();

		expect(theType).toMatchObject({
			identifier: "int8",
			range: {
				specifications: [
					{
						lowerBound: 0,
						upperBound: 9
					},
					{
						lowerBound: 10,
						upperBound: 19
					}
				],
				errorAppTag: null,
				errorMessage: null,
				description: null,
				reference: null
			},
			fractionDigits: 5,
			length: {
				specifications: [{
					lowerBound: 0,
					upperBound: "max"
				}],
				errorAppTag: null,
				errorMessage: null,
				description: null,
				reference: null
			},
			patterns: [
				{
					specification: "[0-9]+",
					modifier: null,
					errorAppTag: null,
					errorMessage: null,
					description: null,
					reference: null
				}
			],
			path: "/a/b/c",
			bits: [
				{
					identifier: "first",
					position: 3,
					ifFeatures: [],
					status: null,
					description: null,
					reference: null
				},
				{
					identifier: "second",
					position: 4,
					ifFeatures: [],
					status: null,
					description: null,
					reference: null
				}
			],
			enums: [
				{
					name: "zero",
					value: 0,
					status: null,
					description: null,
					reference: null
				},
				{
					name: "one",
					value: 1,
					status: null,
					description: null,
					reference: null
				},
				{
					name: "two",
					value: 2,
					status: null,
					description: null,
					reference: null
				}
			],
			bases: [
				"an-idendity-for-base",
				"another-idendity-for-base"
			],
			unionTypes: [
				{
					identifier: "uint8",
					bases: [],
					bits: [],
					enums: [],
					fractionDigits: null,
					length: null,
					path: null,
					patterns: [],
					range: null,
					requireInstance: null,
					unionTypes: []
				},
				{
					identifier: "uint16",
					bases: [],
					bits: [],
					enums: [],
					fractionDigits: null,
					length: null,
					path: null,
					patterns: [],
					range: null,
					requireInstance: null,
					unionTypes: []
				}
			],
			requireInstance: true
		});
	})

	it("can parse a minimal type syntax", () => {
		const input = `type string;`;

		const builder = parseType(new Context(yangParse(input)));
		const theType = builder.build();

		expect(theType).toMatchObject({
			identifier: "string",
			bases: [],
			bits: [],
			enums: [],
			fractionDigits: null,
			length: null,
			path: null,
			patterns: [],
			range: null,
			requireInstance: null,
			unionTypes: []
		});
	})

	it("can report invalid semantics", () => {
		const input = `type;`;

		const context = new Context(yangParse(input));
		const builder = parseType(context);
		const theType = builder.build();

		expect(theType).toMatchObject({
			identifier: "<unnamed type>",
			bases: [],
			bits: [],
			enums: [],
			fractionDigits: null,
			length: null,
			path: null,
			patterns: [],
			range: null,
			requireInstance: null,
			unionTypes: []
		});

		expect(context.errorCollection.messages).toContain("1:1:Expected a non-empty string argument for statement 'type' in '/'.");
	})

	it("can handle unknown statements", () => {
		const input = `type int8 {
			base_ string;
		}`;
		const context = new Context(yangParse(input));
		const builder = parseType(context);
		const theType = builder.build();

		expect(theType).toMatchObject({
			identifier: "int8",
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
			unknownStatements: [{
				prefix: null,
				keyword: "base_",
				argument: "string",
				subStatements: []
			}]
		});

		expect(context.errorCollection.messages).toHaveLength(0);
	})
})

describe("parseTypedef", () => {
	it("can parse a typedef syntax", () => {
		const input = `typedef foo {
			type int8;
			units kg/s;
			default 123;
			status current;
			description desc;
			reference ref;
		}`;

		const builder = parseTypedef(new Context(yangParse(input)));
		const theTypedef = builder.build();

		expect(theTypedef).toMatchObject({
			construct: "typedef",
			identifier: "foo",
			type: {
				identifier: "int8",
				bases: [],
				bits: [],
				enums: [],
				fractionDigits: null,
				length: null,
				path: null,
				patterns: [],
				range: null,
				requireInstance: null,
				unionTypes: []
			},
			units: "kg/s",
			default: "123",
			status: Status.Current,
			description: "desc",
			reference: "ref"
		});
	})

	it("can parse a minimal typedef syntax", () => {
		const input = `typedef foo {
			type int8;
		}`;

		const builder = parseTypedef(new Context(yangParse(input)));
		const theTypedef = builder.build();

		expect(theTypedef).toMatchObject({
			construct: "typedef",
			identifier: "foo",
			type: {
				identifier: "int8",
				bases: [],
				bits: [],
				enums: [],
				fractionDigits: null,
				length: null,
				path: null,
				patterns: [],
				range: null,
				requireInstance: null,
				unionTypes: []
			},
			units: null,
			default: null,
			status: null,
			description: null,
			reference: null
		});
	})

	it("can report invalid semantics", () => {
		const input = `typedef {
		}`;

		const context = new Context(yangParse(input));
		const builder = parseTypedef(context);
		const theTypedef = builder.build();

		expect(theTypedef).toMatchObject({
			construct: "typedef",
			identifier: "<unnamed typedef>",
			type: {
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
				unionTypes: []
			},
			units: null,
			default: null,
			status: null,
			description: null,
			reference: null
		});

		expect(context.errorCollection.messages).toContain("1:1:Expected a non-empty string argument for statement 'typedef' in '/'.");
		expect(context.errorCollection.messages).toContain("1:1:Required statement 'type' not found in '/typedef=<unnamed typedef>'.");
	})

	it("can handle unknown statements", () => {
		const input = `typedef foo {
			type int8;
			reference_ ref;
		}`;

		const context = new Context(yangParse(input));
		const builder = parseTypedef(context);
		const theTypedef = builder.build();

		expect(theTypedef).toMatchObject({
			construct: "typedef",
			identifier: "foo",
			type: {
				identifier: "int8",
				bases: [],
				bits: [],
				enums: [],
				fractionDigits: null,
				length: null,
				path: null,
				patterns: [],
				range: null,
				requireInstance: null,
				unionTypes: []
			},
			units: null,
			default: null,
			status: null,
			description: null,
			reference: null,
			unknownStatements: [{
				prefix: null,
				keyword: "reference_",
				argument: "ref",
				subStatements: []
			}]
		});

		expect(context.errorCollection.messages).toHaveLength(0);
	})
})

describe("parseArgument", () => {
	it("can parse an argument syntax", () => {
		const input = `argument foo {
			yin-element false;
		}`;

		const builder = parseArgument(new Context(yangParse(input)));
		const theArgument = builder.build();

		expect(theArgument).toMatchObject({
			identifier: "foo",
			yinElement: false
		});
	})

	it("can parse a minimal argument syntax", () => {
		const input = `argument foo;`;

		const builder = parseArgument(new Context(yangParse(input)));
		const theArgument = builder.build();

		expect(theArgument).toMatchObject({
			identifier: "foo",
			yinElement: null
		});
	})

	it("can report invalid semantics", () => {
		const input = `argument;`;

		const context = new Context(yangParse(input));
		const builder = parseArgument(context);
		const theArgument = builder.build();

		expect(theArgument).toMatchObject({
			identifier: "<unnamed argument>",
			yinElement: null
		});

		expect(context.errorCollection.messages).toContain("1:1:Expected a non-empty string argument for statement 'argument' in '/'.");
	})

	it("can handle unknown statements", () => {
		const input = `argument foo {
			reference_ ref;
		}`;

		const context = new Context(yangParse(input));
		const builder = parseArgument(context);
		const theArgument = builder.build();

		expect(theArgument).toMatchObject({
			identifier: "foo",
			yinElement: null,
			unknownStatements: [{
				prefix: null,
				keyword: "reference_",
				argument: "ref",
				subStatements: []
			}]
		});

		expect(context.errorCollection.messages).toHaveLength(0);
	})
})

describe("parseExtension", () => {
	it("can parse an extension syntax", () => {
		testParse(
			parseExtension,
			`extension an-ext{
				argument foo;
				status deprecated;
				description desc;
				reference ref;
			}`,
			{
				construct: "extension",
				identifier: "an-ext",
				argument: {
					identifier: "foo",
					yinElement: null
				},
				status: Status.Deprecated,
				description: "desc",
				reference: "ref"
			}
		);
	})

	it("can parse a minimal extension syntax", () => {
		testParse(
			parseExtension,
			`extension an-ext;`,
			{
				construct: "extension",
				identifier: "an-ext",
				argument: null,
				status: null,
				description: null,
				reference: null,
			}
		);
	})

	it("can report invalid semantics", () => {
		testParse(
			parseExtension,
			`extension;`,
			{
				construct: "extension",
				identifier: "<unnamed extension>",
				argument: null,
				status: null,
				description: null,
				reference: null,
			},
			context => expect(context.errorCollection.messages).toContain("1:1:Expected a non-empty string argument for statement 'extension' in '/'.")
		);
	})

	it("can handle unknown statements", () => {
		testParse(
			parseExtension,
			`extension foo {
				reference_ ref;
			}`,
			{
				construct: "extension",
				identifier: "foo",
				argument: null,
				status: null,
				description: null,
				reference: null,
				unknownStatements: [{
					prefix: null,
					keyword: "reference_",
					argument: "ref",
					subStatements: []
				}]
			}
		);
	})
})

describe("parseFeature", () => {
	it("can parse a feature syntax", () => {
		testParse(
			parseFeature,
			`feature an-ext {
				if-feature foo;
				status deprecated;
				description desc;
				reference ref;
			}`,
			{
				construct: "feature",
				identifier: "an-ext",
				ifFeatures: ["foo"],
				status: Status.Deprecated,
				description: "desc",
				reference: "ref"
			}
		);
	})

	it("can parse a minimal feature syntax", () => {
		testParse(
			parseFeature,
			`feature an-ext;`,
			{
				construct: "feature",
				identifier: "an-ext",
				ifFeatures: [],
				status: null,
				description: null,
				reference: null,
			}
		);
	})

	it("can report invalid semantics", () => {
		testParse(
			parseFeature,
			`feature;`,
			{
				construct: "feature",
				identifier: "<unnamed feature>",
				ifFeatures: [],
				status: null,
				description: null,
				reference: null,
			},
			context => expect(context.errorCollection.messages).toContain("1:1:Expected a non-empty string argument for statement 'feature' in '/'.")
		);
	})

	it("can handle unknown statements", () => {
		testParse(
			parseFeature,
			`feature foo {
				reference_ ref;
			}`,
			{
				construct: "feature",
				identifier: "foo",
				ifFeatures: [],
				status: null,
				description: null,
				reference: null,
				unknownStatements: [{
					prefix: null,
					keyword: "reference_",
					argument: "ref",
					subStatements: []
				}]
			}
		);
	})
})

describe("parseIdentity", () => {
	it("can parse an identity syntax", () => {
		testParse(
			parseIdentity,
			`identity id {
				base b1;
				base b2;
				if-feature foo;
				status deprecated;
				description desc;
				reference ref;
			}`,
			{
				construct: "identity",
				identifier: "id",
				bases: ["b1", "b2"],
				ifFeatures: ["foo"],
				status: Status.Deprecated,
				description: "desc",
				reference: "ref"
			}
		);
	})

	it("can parse a minimal feature syntax", () => {
		testParse(
			parseIdentity,
			`identity id;`,
			{
				construct: "identity",
				identifier: "id",
				bases: [],
				ifFeatures: [],
				status: null,
				description: null,
				reference: null,
			}
		);
	})

	it("can report invalid semantics", () => {
		testParse(
			parseIdentity,
			`identity;`,
			{
				construct: "identity",
				identifier: "<unnamed identity>",
				bases: [],
				ifFeatures: [],
				status: null,
				description: null,
				reference: null,
			},
			context => expect(context.errorCollection.messages).toContain("1:1:Expected a non-empty string argument for statement 'identity' in '/'.")
		);
	})

	it("can handle unknown statements", () => {
		testParse(
			parseIdentity,
			`identity foo {
				reference_ ref;
			}`,
			{
				construct: "identity",
				identifier: "foo",
				bases: [],
				ifFeatures: [],
				status: null,
				description: null,
				reference: null,
				unknownStatements: [{
					prefix: null,
					keyword: "reference_",
					argument: "ref",
					subStatements: []
				}]
			}
		);
	})
})

describe("parseUses", () => {
	it("can parse a uses syntax", () => {
		const input = `uses gr {
			when w;
			if-feature ft;
			status deprecated;
			description "desc";
			reference "ref";
			refine bart;
			augment aug;
		}`;

		const builder = parseUses(new Context(yangParse(input)));
		const result = builder.build();

		expect(result).toMatchObject({
			construct: "uses",
			grouping: "gr",
			ifFeatures: ["ft"],
			when: mockParse("when w;", parseWhen),
			status: Status.Deprecated,
			description: "desc",
			reference: "ref",
			refines: [
				mockParse("refine bart;", parseRefine)
			],
			augmentations: [
				mockParse("augment aug;", parseAugmentation)
			]
		});
	})

	it("can parse a minimal uses syntax", () => {
		const input = `uses gr;`;

		const builder = parseUses(new Context(yangParse(input)));
		const result = builder.build();

		expect(result).toMatchObject({
			construct: "uses",
			grouping: "gr",
			ifFeatures: [],
			when: null,
			status: null,
			description: null,
			reference: null,
			refines: [],
			augmentations: []
		});
	})

	it("can report invalid semantics", () => {
		const input = `uses;`;

		const context = new Context(yangParse(input));
		const builder = parseUses(context);
		const result = builder.build();

		expect(result).toMatchObject({
			construct: "uses",
			grouping: "<unnamed uses>",
			ifFeatures: [],
			when: null,
			status: null,
			description: null,
			reference: null,
			refines: [],
			augmentations: []
		});

		expect(context.errorCollection.messages).toContain("1:1:Expected a non-empty string argument for statement 'uses' in '/'.");
	})

	it("can handle unknown statements", () => {
		const input = `uses gr {
			reference_ ref;
		}`;

		const context = new Context(yangParse(input));
		const builder = parseUses(context);
		const result = builder.build();

		expect(result).toMatchObject({
			construct: "uses",
			grouping: "gr",
			ifFeatures: [],
			when: null,
			status: null,
			description: null,
			reference: null,
			refines: [],
			augmentations: [],
			unknownStatements: [{
				prefix: null,
				keyword: "reference_",
				argument: "ref",
				subStatements: []
			}]
		});
	})
})

describe("parseContainer", () => {
	it("can parse a syntax", () => {
		const input = `container c {
			when w;
			if-feature ft;
			status deprecated;
			description "desc";
			reference "ref";
			presence "oy vey";
			config true;

			// typedefsOrGroupings
			typedef td;
			grouping g;

			// dataDefinitions
			uses u1;
			container c2;
			leaf l3;
			leaf-list ll4;
			list l5;
			choice c6;
			anydata c7;
			anyxml c8;

			action a1;
			action a2;
			notification n1;
			notification n2;
		}`;

		const builder = parseContainer(new Context(yangParse(input)));
		const result = builder.build();

		expect(result).toMatchObject({
			construct: "container",
			identifier: "c",
			ifFeatures: ["ft"],
			when: mockParse("when w;", parseWhen),
			status: Status.Deprecated,
			description: "desc",
			reference: "ref",
			presence: "oy vey",
			config: true,
			typedefsOrGroupings: [
				mockParse("typedef td;", parseTypedef),
				mockParse("grouping g;", parseGrouping)
			],
			dataDefinitions: [
				mockParse("uses u1;", parseUses),
				mockParse("container c2;", parseContainer),
				mockParse("leaf l3;", parseLeaf),
				mockParse("list-list ll4;", parseLeafList),
				mockParse("list l5;", parseList),
				mockParse("choice c6;", parseChoice),
				mockParse("anydata c7;", parseAnyData),
				mockParse("anyxml c8;", parseAnyXml)
			],
			actions: [
				mockParse("action a1;", parseAction),
				mockParse("action a2;", parseAction)
			],
			notifications: [
				mockParse("notification n1;", parseNotification),
				mockParse("notification n2;", parseNotification)
			]
		});
	})

	it("can parse a minimal syntax", () => {
		const input = `container c;`;

		const builder = parseContainer(new Context(yangParse(input)));
		const result = builder.build();

		expect(result).toMatchObject({
			construct: "container",
			identifier: "c",
			ifFeatures: [],
			when: null,
			presence: null,
			config: null,
			status: null,
			description: null,
			reference: null,
			typedefsOrGroupings: [],
			dataDefinitions: [],
			actions: [],
			notifications: []
		});
	})

	it("can report invalid semantics", () => {
		const input = `container;`;

		const context = new Context(yangParse(input));
		const builder = parseContainer(context);
		const result = builder.build();

		expect(result).toMatchObject({
			construct: "container",
			identifier: "<unnamed container>",
			ifFeatures: [],
			when: null,
			presence: null,
			config: null,
			status: null,
			description: null,
			reference: null,
			typedefsOrGroupings: [],
			dataDefinitions: [],
			actions: [],
			notifications: []
		});

		expect(context.errorCollection.messages).toContain("1:1:Expected a non-empty string argument for statement 'container' in '/'.");
	})

	it("can handle unknown statements", () => {
		const input = `container c {
			reference_ ref;
		}`;

		const context = new Context(yangParse(input));
		const builder = parseContainer(context);
		const result = builder.build();

		expect(result).toMatchObject({
			construct: "container",
			identifier: "c",
			ifFeatures: [],
			when: null,
			presence: null,
			config: null,
			status: null,
			description: null,
			reference: null,
			typedefsOrGroupings: [],
			dataDefinitions: [],
			actions: [],
			notifications: [],
			unknownStatements: [{
				prefix: null,
				keyword: "reference_",
				argument: "ref",
				subStatements: []
			}]
		});
	})
})

describe("parseLeaf", () => {
	it("can parse a syntax", () => {
		const input = `leaf l {
			when w;
			if-feature ft;
			type int8;
			units kg;
			must m1;
			must m2;
			default 1;
			config true;
			mandatory false;
			status deprecated;
			description "desc";
			reference "ref";
		}`;

		const builder = parseLeaf(new Context(yangParse(input)));
		const result = builder.build();

		expect(result).toMatchObject({
			construct: "leaf",
			identifier: "l",
			when: mockParse("when w;", parseWhen),
			ifFeatures: ["ft"],
			type: mockParse("type int8;", parseType),
			units: "kg",
			musts: [
				mockParse("must m1;", parseMust),
				mockParse("must m2;", parseMust),
			],
			default: "1",
			config: true,
			mandatory: false,
			status: Status.Deprecated,
			description: "desc",
			reference: "ref"
		});
	})

	it("can parse a minimal syntax", () => {
		const input = `leaf l {
			type int8;
		}`;

		const builder = parseLeaf(new Context(yangParse(input)));
		const result = builder.build();

		expect(result).toMatchObject({
			construct: "leaf",
			identifier: "l",
			when: null,
			ifFeatures: [],
			type: mockParse("type int8;", parseType),
			units: null,
			musts: [],
			default: null,
			config: null,
			mandatory: null,
			status: null,
			description: null,
			reference: null
		});
	})

	it("can report invalid semantics", () => {
		const input = `leaf;`;

		const context = new Context(yangParse(input));
		const builder = parseLeaf(context);
		const result = builder.build();

		expect(result).toMatchObject({
			construct: "leaf",
			identifier: "<unnamed leaf>",
			when: null,
			ifFeatures: [],
			type: mockParse("type __invalid__;", parseType),
			units: null,
			musts: [],
			default: null,
			config: null,
			mandatory: null,
			status: null,
			description: null,
			reference: null
		});

		expect(context.errorCollection.messages).toContain("1:1:Expected a non-empty string argument for statement 'leaf' in '/'.");
		expect(context.errorCollection.messages).toContain("1:1:Required statement 'type' not found in '/leaf=<unnamed leaf>'.");
	})

	it("can handle unknown statements", () => {
		const input = `leaf l {
			type int8;
			reference_ ref;
		}`;

		const context = new Context(yangParse(input));
		const builder = parseLeaf(context);
		const result = builder.build();

		expect(result).toMatchObject({
			construct: "leaf",
			identifier: "l",
			when: null,
			ifFeatures: [],
			type: mockParse("type int8;", parseType),
			units: null,
			musts: [],
			default: null,
			config: null,
			mandatory: null,
			status: null,
			description: null,
			reference: null,
			unknownStatements: [{
				prefix: null,
				keyword: "reference_",
				argument: "ref",
				subStatements: []
			}]
		});
	})
})

describe("parseLeafList", () => {
	it("can parse a syntax", () => {
		const input = `leaf-list l {
			when w;
			if-feature ft;
			type int8;
			units kg;
			must m1;
			must m2;
			default 1;
			config true;
			min-elements 1;
			max-elements 2;
			ordered-by foo;
			status deprecated;
			description "desc";
			reference "ref";
		}`;

		const builder = parseLeafList(new Context(yangParse(input)));
		const result = builder.build();

		expect(result).toMatchObject({
			construct: "leaf-list",
			identifier: "l",
			when: mockParse("when w;", parseWhen),
			ifFeatures: ["ft"],
			type: mockParse("type int8;", parseType),
			units: "kg",
			musts: [
				mockParse("must m1;", parseMust),
				mockParse("must m2;", parseMust),
			],
			default: ["1"],
			config: true,
			minElements: 1,
			maxElements: 2,
			orderedBy: "foo",
			status: Status.Deprecated,
			description: "desc",
			reference: "ref"
		});
	})

	it("can parse a minimal syntax", () => {
		const input = `leaf-list l {
			type int8;
		}`;

		const builder = parseLeafList(new Context(yangParse(input)));
		const result = builder.build();

		expect(result).toMatchObject({
			construct: "leaf-list",
			identifier: "l",
			when: null,
			ifFeatures: [],
			type: mockParse("type int8;", parseType),
			units: null,
			musts: [],
			default: [],
			config: null,
			minElements: null,
			maxElements: null,
			orderedBy: null,
			status: null,
			description: null,
			reference: null
		});
	})

	it("can report invalid semantics", () => {
		const input = `leaf-list;`;

		const context = new Context(yangParse(input));
		const builder = parseLeafList(context);
		const result = builder.build();

		expect(result).toMatchObject({
			construct: "leaf-list",
			identifier: "<unnamed leaf-list>",
			when: null,
			ifFeatures: [],
			type: mockParse("type __invalid__;", parseType),
			units: null,
			musts: [],
			default: [],
			config: null,
			minElements: null,
			maxElements: null,
			orderedBy: null,
			status: null,
			description: null,
			reference: null
		});

		expect(context.errorCollection.messages).toContain("1:1:Expected a non-empty string argument for statement 'leaf-list' in '/'.");
		expect(context.errorCollection.messages).toContain("1:1:Required statement 'type' not found in '/leaf-list=<unnamed leaf-list>'.");
	})

	it("can handle unknown statements", () => {
		const input = `leaf-list l {
			type int8;
			reference_ ref;
		}`;

		const context = new Context(yangParse(input));
		const builder = parseLeafList(context);
		const result = builder.build();

		expect(result).toMatchObject({
			construct: "leaf-list",
			identifier: "l",
			when: null,
			ifFeatures: [],
			type: mockParse("type int8;", parseType),
			units: null,
			musts: [],
			default: [],
			config: null,
			minElements: null,
			maxElements: null,
			orderedBy: null,
			status: null,
			description: null,
			reference: null,
			unknownStatements: [{
				prefix: null,
				keyword: "reference_",
				argument: "ref",
				subStatements: []
			}]
		});
	})
})

describe("parseList", () => {
	it("can parse a syntax", () => {
		const input = `list l {
			when w;
			if-feature ft;
			must m1;
			must m2;
			key k;
			unique u1;
			unique u2;
			config true;
			min-elements 1;
			max-elements 2;
			ordered-by foo;
			status deprecated;
			description "desc";
			reference "ref";
		
			// typedefsOrGroupings
			typedef td;
			grouping g;

			// dataDefinitions
			uses u1;
			container c2;
			leaf l3;
			leaf-list ll4;
			list l5;
			choice c6;
			anydata c7;
			anyxml c8;

			action a1;
			action a2;
			notification n1;
			notification n2;
		}`;

		const builder = parseList(new Context(yangParse(input)));
		const result = builder.build();

		expect(result).toMatchObject({
			construct: "list",
			identifier: "l",
			when: mockParse("when w;", parseWhen),
			ifFeatures: ["ft"],
			musts: [
				mockParse("must m1;", parseMust),
				mockParse("must m2;", parseMust),
			],
			key: "k",
			uniques: ["u1", "u2"],
			config: true,
			minElements: 1,
			maxElements: 2,
			orderedBy: "foo",
			status: Status.Deprecated,
			description: "desc",
			reference: "ref",
			typedefsOrGroupings: [
				mockParse("typedef td;", parseTypedef),
				mockParse("grouping g;", parseGrouping)
			],
			dataDefinitions: [
				mockParse("uses u1;", parseUses),
				mockParse("container c2;", parseContainer),
				mockParse("leaf l3;", parseLeaf),
				mockParse("list-list ll4;", parseLeafList),
				mockParse("list l5;", parseList),
				mockParse("choice c6;", parseChoice),
				mockParse("anydata c7;", parseAnyData),
				mockParse("anyxml c8;", parseAnyXml)
			],
			actions: [
				mockParse("action a1;", parseAction),
				mockParse("action a2;", parseAction)
			],
			notifications: [
				mockParse("notification n1;", parseNotification),
				mockParse("notification n2;", parseNotification)
			]
		});
	})

	it("can parse a minimal syntax", () => {
		const input = `list l;`;

		const builder = parseList(new Context(yangParse(input)));
		const result = builder.build();

		expect(result).toMatchObject({
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
			notifications: []
		});
	})

	it("can report invalid semantics", () => {
		const input = `list;`;

		const context = new Context(yangParse(input));
		const builder = parseList(context);
		const result = builder.build();

		expect(result).toMatchObject({
			construct: "list",
			identifier: "<unnamed list>",
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
			notifications: []
		});

		expect(context.errorCollection.messages).toContain("1:1:Expected a non-empty string argument for statement 'list' in '/'.");
	})

	it("can handle unknown statements", () => {
		const input = `list l {
			reference_ ref;
		}`;

		const context = new Context(yangParse(input));
		const builder = parseList(context);
		const result = builder.build();

		expect(result).toMatchObject({
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
			unknownStatements: [{
				prefix: null,
				keyword: "reference_",
				argument: "ref",
				subStatements: []
			}]
		});
	})
})

describe("parseDeviationItem", () => {
	it("can parse a syntax", () => {
		const input = `deviate add {
			units kg;			
			must m1;
			must m2;
			unique u1;
			unique u2;
			default d1;
			default d2;
			config true;
			mandatory false;
			min-elements 1;
			max-elements 2;
			type int8;
		}`;

		const builder = parseDeviationItem(new Context(yangParse(input)));
		const result = builder.build();

		expect(result).toMatchObject({
			code: "add",
			units: "kg",
			musts: [
				mockParse("must m1;", parseMust),
				mockParse("must m2;", parseMust),
			],
			uniques: ["u1", "u2"],
			defaults: ["d1", "d2"],
			config: true,
			mandatory: false,
			minElements: 1,
			maxElements: 2,
			type: mockParse("type int8;", parseType)
		});
	})

	it("can parse a minimal syntax", () => {
		const input = `deviate add;`;

		const builder = parseDeviationItem(new Context(yangParse(input)));
		const result = builder.build();

		expect(result).toMatchObject({
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
		});
	})

	it("can report invalid semantics", () => {
		const input = `deviate;`;

		const context = new Context(yangParse(input));
		const builder = parseDeviationItem(context);
		const result = builder.build();

		expect(result).toMatchObject({
			code: "<unnamed deviate>",
			units: null,
			musts: [],
			uniques: [],
			defaults: [],
			config: null,
			mandatory: null,
			minElements: null,
			maxElements: null,
			type: null
		});

		expect(context.errorCollection.messages).toContain("1:1:Expected a non-empty string argument for statement 'deviate' in '/'.");
	})

	it("can handle unknown statements", () => {
		const input = `deviate add {
			reference_ ref;
		}`;

		const context = new Context(yangParse(input));
		const builder = parseDeviationItem(context);
		const result = builder.build();

		expect(result).toMatchObject({
			code: "add",
			units: null,
			musts: [],
			uniques: [],
			defaults: [],
			config: null,
			mandatory: null,
			minElements: null,
			maxElements: null,
			type: null,
			unknownStatements: [{
				prefix: null,
				keyword: "reference_",
				argument: "ref",
				subStatements: []
			}]
		});
	})
})

describe("parseDeviation", () => {
	it("can parse a syntax", () => {
		testParse(
			parseDeviation,
			`deviation d {
				description "desc";
				reference "ref";
			
				// items
				deviate add;
				deviate not-supported;
			}`,
			{
				construct: "deviation",
				target: "d",
				description: "desc",
				reference: "ref",
				items: [
					mockParse("deviate add;", parseDeviationItem),
					mockParse("deviate not-supported;", parseDeviationItem)
				]
			}
		);
	})

	it("can parse a minimal syntax", () => {
		testParse(
			parseDeviation,
			`deviation d;`,
			{
				construct: "deviation",
				target: "d",
				description: null,
				reference: null,
				items: []
			}
		);
	})

	it("can report invalid semantics", () => {
		testParse(
			parseDeviation,
			`deviation;`,
			{
				construct: "deviation",
				target: "<unnamed deviation>",
				description: null,
				reference: null,
				items: []
			},
			context => expect(context.errorCollection.messages).toContain("1:1:Expected a non-empty string argument for statement 'deviation' in '/'.")
		);
	})

	it("can handle unknown statements", () => {
		testParse(
			parseDeviation,
			`deviation d {
				reference_ ref;
			};`,
			{
				construct: "deviation",
				target: "d",
				description: null,
				reference: null,
				items: [],
				unknownStatements: [{
					prefix: null,
					keyword: "reference_",
					argument: "ref",
					subStatements: []
				}]
			}
		);
	})
})

describe("parseChoice", () => {
	it("can parse a syntax", () => {
		const input = `choice c {
			when w;
			if-feature ft;
			default d;
			config true;
			mandatory false;
			status deprecated;
			description "desc";
			reference "ref";
		
			// cases
			case c1;
			choice c2;
			container c3;
			leaf l4;
			leaf-list l5;
			list l6;
			anydata a7;
			anyxml a8;
		}`;

		const builder = parseChoice(new Context(yangParse(input)));
		const result = builder.build();

		expect(result).toMatchObject({
			construct: "choice",
			identifier: "c",
			when: mockParse("when w;", parseWhen),
			ifFeatures: ["ft"],
			default: "d",
			config: true,
			mandatory: false,
			status: Status.Deprecated,
			description: "desc",
			reference: "ref",
			cases: [
				mockParse("case c1;", parseCase),
				mockParse("choice c2;", parseChoice),
				mockParse("container c3;", parseContainer),
				mockParse("leaf l4;", parseLeaf),
				mockParse("list-list l5;", parseLeafList),
				mockParse("list l6;", parseList),
				mockParse("anydata a7;", parseAnyData),
				mockParse("anyxml a8;", parseAnyXml)
			]
		});
	})

	it("can parse a minimal syntax", () => {
		const input = `choice c;`;

		const builder = parseChoice(new Context(yangParse(input)));
		const result = builder.build();

		expect(result).toMatchObject({
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
		});
	})

	it("can report invalid semantics", () => {
		const input = `choice;`;

		const context = new Context(yangParse(input));
		const builder = parseChoice(context);
		const result = builder.build();

		expect(result).toMatchObject({
			construct: "choice",
			identifier: "<unnamed choice>",
			when: null,
			ifFeatures: [],
			default: null,
			config: null,
			mandatory: null,
			status: null,
			description: null,
			reference: null,
			cases: []
		});

		expect(context.errorCollection.messages).toContain("1:1:Expected a non-empty string argument for statement 'choice' in '/'.");
	})

	it("can handle unknown statements", () => {
		const input = `choice c {
			reference_ ref;
		}`;

		const context = new Context(yangParse(input));
		const builder = parseChoice(context);
		const result = builder.build();

		expect(result).toMatchObject({
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
			cases: [],
			unknownStatements: [{
				prefix: null,
				keyword: "reference_",
				argument: "ref",
				subStatements: []
			}]
		});
	})
})

describe("parseAnyData", () => {
	it("can parse a syntax", () => {
		const input = `anydata a {
			when w;
			if-feature ft;
			must m1;
			must m2;
			config true;
			mandatory false;
			status deprecated;
			description "desc";
			reference "ref";
		}`;

		const builder = parseAnyData(new Context(yangParse(input)));
		const result = builder.build();

		expect(result).toMatchObject({
			construct: "anydata",
			identifier: "a",
			when: mockParse("when w;", parseWhen),
			ifFeatures: ["ft"],
			musts: [
				mockParse("must m1;", parseMust),
				mockParse("must m2;", parseMust)
			],
			config: true,
			mandatory: false,
			status: Status.Deprecated,
			description: "desc",
			reference: "ref"
		});
	})

	it("can parse a minimal syntax", () => {
		const input = `anydata a;`;

		const builder = parseAnyData(new Context(yangParse(input)));
		const result = builder.build();

		expect(result).toMatchObject({
			construct: "anydata",
			identifier: "a",
			when: null,
			ifFeatures: [],
			musts: [],
			config: null,
			mandatory: null,
			status: null,
			description: null,
			reference: null
		});
	})

	it("can report invalid semantics", () => {
		const input = `anydata;`;

		const context = new Context(yangParse(input));
		const builder = parseAnyData(context);
		const result = builder.build();

		expect(result).toMatchObject({
			construct: "anydata",
			identifier: "<unnamed anydata>",
			when: null,
			ifFeatures: [],
			musts: [],
			config: null,
			mandatory: null,
			status: null,
			description: null,
			reference: null
		});

		expect(context.errorCollection.messages).toContain("1:1:Expected a non-empty string argument for statement 'anydata' in '/'.");
	})

	it("can handle unknown statements", () => {
		const input = `anydata a {
			reference_ ref;
		}`;

		const context = new Context(yangParse(input));
		const builder = parseAnyData(context);
		const result = builder.build();

		expect(result).toMatchObject({
			construct: "anydata",
			identifier: "a",
			when: null,
			ifFeatures: [],
			musts: [],
			config: null,
			mandatory: null,
			status: null,
			description: null,
			reference: null,
			unknownStatements: [{
				prefix: null,
				keyword: "reference_",
				argument: "ref",
				subStatements: []
			}]
		});
	})
})

describe("parseAnyXml", () => {
	it("can parse a syntax", () => {
		const input = `anyxml a {
			when w;
			if-feature ft;
			must m1;
			must m2;
			config true;
			mandatory false;
			status deprecated;
			description "desc";
			reference "ref";
		}`;

		const builder = parseAnyXml(new Context(yangParse(input)));
		const result = builder.build();

		expect(result).toMatchObject({
			construct: "anyxml",
			identifier: "a",
			when: mockParse("when w;", parseWhen),
			ifFeatures: ["ft"],
			musts: [
				mockParse("must m1;", parseMust),
				mockParse("must m2;", parseMust)
			],
			config: true,
			mandatory: false,
			status: Status.Deprecated,
			description: "desc",
			reference: "ref"
		});
	})

	it("can parse a minimal syntax", () => {
		const input = `anyxml a;`;

		const builder = parseAnyXml(new Context(yangParse(input)));
		const result = builder.build();

		expect(result).toMatchObject({
			construct: "anyxml",
			identifier: "a",
			when: null,
			ifFeatures: [],
			musts: [],
			config: null,
			mandatory: null,
			status: null,
			description: null,
			reference: null
		});
	})

	it("can report invalid semantics", () => {
		const input = `anyxml;`;

		const context = new Context(yangParse(input));
		const builder = parseAnyXml(context);
		const result = builder.build();

		expect(result).toMatchObject({
			construct: "anyxml",
			identifier: "<unnamed anyxml>",
			when: null,
			ifFeatures: [],
			musts: [],
			config: null,
			mandatory: null,
			status: null,
			description: null,
			reference: null
		});

		expect(context.errorCollection.messages).toContain("1:1:Expected a non-empty string argument for statement 'anyxml' in '/'.");
	})

	it("can handle unknown statements", () => {
		const input = `anyxml a {
			reference_ ref;
		}`;

		const context = new Context(yangParse(input));
		const builder = parseAnyXml(context);
		const result = builder.build();

		expect(result).toMatchObject({
			construct: "anyxml",
			identifier: "a",
			when: null,
			ifFeatures: [],
			musts: [],
			config: null,
			mandatory: null,
			status: null,
			description: null,
			reference: null,
			unknownStatements: [{
				prefix: null,
				keyword: "reference_",
				argument: "ref",
				subStatements: []
			}]
		});
	})
})

describe("parseCase", () => {
	it("can parse a syntax", () => {
		const input = `case c {
			when w;
			if-feature ft;
			status deprecated;
			description "desc";
			reference "ref";

			// dataDefinitions
			uses u1;
			container c2;
			leaf l3;
			leaf-list ll4;
			list l5;
			choice c6;
			anydata c7;
			anyxml c8;
		}`;

		const builder = parseCase(new Context(yangParse(input)));
		const result = builder.build();

		expect(result).toMatchObject({
			construct: "case",
			identifier: "c",
			when: mockParse("when w;", parseWhen),
			ifFeatures: ["ft"],
			status: Status.Deprecated,
			description: "desc",
			reference: "ref",
			dataDefinitions: [
				mockParse("uses u1;", parseUses),
				mockParse("container c2;", parseContainer),
				mockParse("leaf l3;", parseLeaf),
				mockParse("list-list ll4;", parseLeafList),
				mockParse("list l5;", parseList),
				mockParse("choice c6;", parseChoice),
				mockParse("anydata c7;", parseAnyData),
				mockParse("anyxml c8;", parseAnyXml)
			],
		});
	})

	it("can parse a minimal syntax", () => {
		const input = `case c;`;

		const builder = parseCase(new Context(yangParse(input)));
		const result = builder.build();

		expect(result).toMatchObject({
			construct: "case",
			identifier: "c",
			when: null,
			ifFeatures: [],
			status: null,
			description: null,
			reference: null,
			dataDefinitions: []
		});
	})

	it("can report invalid semantics", () => {
		const input = `case;`;

		const context = new Context(yangParse(input));
		const builder = parseCase(context);
		const result = builder.build();

		expect(result).toMatchObject({
			construct: "case",
			identifier: "<unnamed case>",
			when: null,
			ifFeatures: [],
			status: null,
			description: null,
			reference: null,
			dataDefinitions: []
		});

		expect(context.errorCollection.messages).toContain("1:1:Expected a non-empty string argument for statement 'case' in '/'.");
	})

	it("can handle unknown statements", () => {
		const input = `case c {
			reference_ ref;
		}`;

		const context = new Context(yangParse(input));
		const builder = parseCase(context);
		const result = builder.build();

		expect(result).toMatchObject({
			construct: "case",
			identifier: "c",
			when: null,
			ifFeatures: [],
			status: null,
			description: null,
			reference: null,
			dataDefinitions: [],
			unknownStatements: [{
				prefix: null,
				keyword: "reference_",
				argument: "ref",
				subStatements: []
			}]
		});
	})
})

describe("parseGrouping", () => {
	it("can parse a syntax", () => {
		testParse(
			parseGrouping,
			`grouping g {
				when w;
				if-feature ft;
				status deprecated;
				description "desc";
				reference "ref";

				// typedefsOrGroupings
				typedef td;
				grouping g2;

				// dataDefinitions
				uses u1;
				container c2;
				leaf l3;
				leaf-list ll4;
				list l5;
				choice c6;
				anydata c7;
				anyxml c8;

				action a1;
				action a2;
				notification n1;
				notification n2;
			}`,
			{
				construct: "grouping",
				identifier: "g",
				status: Status.Deprecated,
				description: "desc",
				reference: "ref",
				typedefsOrGroupings: [
					mockParse("typedef td;", parseTypedef),
					mockParse("grouping g2;", parseGrouping)
				],
				dataDefinitions: [
					mockParse("uses u1;", parseUses),
					mockParse("container c2;", parseContainer),
					mockParse("leaf l3;", parseLeaf),
					mockParse("list-list ll4;", parseLeafList),
					mockParse("list l5;", parseList),
					mockParse("choice c6;", parseChoice),
					mockParse("anydata c7;", parseAnyData),
					mockParse("anyxml c8;", parseAnyXml)
				],
				actions: [
					mockParse("action a1;", parseAction),
					mockParse("action a2;", parseAction)
				],
				notifications: [
					mockParse("notification n1;", parseNotification),
					mockParse("notification n2;", parseNotification)
				]
			}
		);
	})

	it("can parse a minimal syntax", () => {
		testParse(
			parseGrouping,
			`grouping g;`,
			{
				construct: "grouping",
				identifier: "g",
				status: null,
				description: null,
				reference: null,
				typedefsOrGroupings: [],
				dataDefinitions: [],
				actions: [],
				notifications: []
			}
		);
	})

	it("can report invalid semantics", () => {
		testParse(
			parseGrouping,
			`grouping;`,
			{
				construct: "grouping",
				identifier: "<unnamed grouping>",
				status: null,
				description: null,
				reference: null,
				typedefsOrGroupings: [],
				dataDefinitions: [],
				actions: [],
				notifications: []
			},
			context => expect(context.errorCollection.messages).toContain("1:1:Expected a non-empty string argument for statement 'grouping' in '/'.")
		);
	})

	it("can handle unknown statements", () => {
		testParse(
			parseGrouping,
			`grouping g {
				reference_ ref;
			}`,
			{
				construct: "grouping",
				identifier: "g",
				status: null,
				description: null,
				reference: null,
				typedefsOrGroupings: [],
				dataDefinitions: [],
				actions: [],
				notifications: [],
				unknownStatements: [{
					prefix: null,
					keyword: "reference_",
					argument: "ref",
					subStatements: []
				}]
			}
		);
	})
})

describe("parseAction", () => {
	it("can parse a syntax", () => {
		testParse(
			parseAction,
			`action a {
				if-feature ft;
				status deprecated;
				description "desc";
				reference "ref";

				// typedefsOrGroupings
				typedef td;
				grouping g2;

				input { }
				output { }
			}`,
			{
				construct: "action",
				identifier: "a",
				ifFeatures: ["ft"],
				status: Status.Deprecated,
				description: "desc",
				reference: "ref",
				typedefsOrGroupings: [
					mockParse("typedef td;", parseTypedef),
					mockParse("grouping g2;", parseGrouping)
				],
				input: mockParse("input {}", parseInput),
				output: mockParse("output {}", parseOutput)
			}
		);
	})

	it("can parse a minimal syntax", () => {
		testParse(
			parseAction,
			`action a;`,
			{
				construct: "action",
				identifier: "a",
				ifFeatures: [],
				status: null,
				description: null,
				reference: null,
				typedefsOrGroupings: [],
				input: null,
				output: null
			}
		);
	})

	it("can report invalid semantics", () => {
		testParse(
			parseAction,
			`action;`,
			{
				construct: "action",
				identifier: "<unnamed action>",
				ifFeatures: [],
				status: null,
				description: null,
				reference: null,
				typedefsOrGroupings: [],
				input: null,
				output: null
			},
			context => expect(context.errorCollection.messages).toContain("1:1:Expected a non-empty string argument for statement 'action' in '/'.")
		);
	})

	it("can handle unknown statements", () => {
		testParse(
			parseAction,
			`action a {
				reference_ ref;
			}`,
			{
				construct: "action",
				identifier: "a",
				ifFeatures: [],
				status: null,
				description: null,
				reference: null,
				typedefsOrGroupings: [],
				input: null,
				output: null,
				unknownStatements: [{
					prefix: null,
					keyword: "reference_",
					argument: "ref",
					subStatements: []
				}]
			}
		);
	})
})

describe("parseRpc", () => {
	it("can parse a syntax", () => {
		testParse(
			parseRpc,
			`rpc r {
				if-feature ft;
				status deprecated;
				description "desc";
				reference "ref";

				// typedefsOrGroupings
				typedef td;
				grouping g2;

				input { }
				output { }
			}`,
			{
				construct: "rpc",
				identifier: "r",
				ifFeatures: ["ft"],
				status: Status.Deprecated,
				description: "desc",
				reference: "ref",
				typedefsOrGroupings: [
					mockParse("typedef td;", parseTypedef),
					mockParse("grouping g2;", parseGrouping)
				],
				input: mockParse("input {}", parseInput),
				output: mockParse("output {}", parseOutput)
			}
		);
	})

	it("can parse a minimal syntax", () => {
		testParse(
			parseRpc,
			`rpc r;`,
			{
				construct: "rpc",
				identifier: "r",
				ifFeatures: [],
				status: null,
				description: null,
				reference: null,
				typedefsOrGroupings: [],
				input: null,
				output: null
			}
		);
	})

	it("can report invalid semantics", () => {
		testParse(
			parseRpc,
			`rpc;`,
			{
				construct: "rpc",
				identifier: "<unnamed rpc>",
				ifFeatures: [],
				status: null,
				description: null,
				reference: null,
				typedefsOrGroupings: [],
				input: null,
				output: null
			},
			context => expect(context.errorCollection.messages).toContain("1:1:Expected a non-empty string argument for statement 'rpc' in '/'.")
		);
	})

	it("can handle unknown statements", () => {
		testParse(
			parseRpc,
			`rpc r {
				reference_ ref;
			}`,
			{
				construct: "rpc",
				identifier: "r",
				ifFeatures: [],
				status: null,
				description: null,
				reference: null,
				typedefsOrGroupings: [],
				input: null,
				output: null,
				unknownStatements: [{
					prefix: null,
					keyword: "reference_",
					argument: "ref",
					subStatements: []
				}]
			}
		);
	})
})

describe("parseNotification", () => {
	it("can parse a syntax", () => {
		testParse(
			parseNotification,
			`notification n {
				if-feature ft;
				must m1;
				must m2;
				status deprecated;
				description "desc";
				reference "ref";

				// typedefsOrGroupings
				typedef td;
				grouping g2;

				// dataDefinitions
				uses u1;
				container c2;
				leaf l3;
				leaf-list ll4;
				list l5;
				choice c6;
				anydata c7;
				anyxml c8;
			}`,
			{
				construct: "notification",
				identifier: "n",
				ifFeatures: ["ft"],
				musts: [
					mockParse("must m1;", parseMust),
					mockParse("must m2;", parseMust)
				],
				status: Status.Deprecated,
				description: "desc",
				reference: "ref",
				typedefsOrGroupings: [
					mockParse("typedef td;", parseTypedef),
					mockParse("grouping g2;", parseGrouping)
				],
				dataDefinitions: [
					mockParse("uses u1;", parseUses),
					mockParse("container c2;", parseContainer),
					mockParse("leaf l3;", parseLeaf),
					mockParse("list-list ll4;", parseLeafList),
					mockParse("list l5;", parseList),
					mockParse("choice c6;", parseChoice),
					mockParse("anydata c7;", parseAnyData),
					mockParse("anyxml c8;", parseAnyXml)
				]
			}
		);
	})

	it("can parse a minimal syntax", () => {
		testParse(
			parseNotification,
			`notification n;`,
			{
				construct: "notification",
				identifier: "n",
				ifFeatures: [],
				musts: [],
				status: null,
				description: null,
				reference: null,
				typedefsOrGroupings: [],
				dataDefinitions: []
			}
		);
	})

	it("can report invalid semantics", () => {
		testParse(
			parseNotification,
			`notification;`,
			{
				construct: "notification",
				identifier: "<unnamed notification>",
				ifFeatures: [],
				musts: [],
				status: null,
				description: null,
				reference: null,
				typedefsOrGroupings: [],
				dataDefinitions: []
			},
			context => expect(context.errorCollection.messages).toContain("1:1:Expected a non-empty string argument for statement 'notification' in '/'.")
		);
	})

	it("can handle unknown statements", () => {
		testParse(
			parseNotification,
			`notification n {
				reference_ ref;
			}`,
			{
				construct: "notification",
				identifier: "n",
				ifFeatures: [],
				musts: [],
				status: null,
				description: null,
				reference: null,
				typedefsOrGroupings: [],
				dataDefinitions: [],
				unknownStatements: [{
					prefix: null,
					keyword: "reference_",
					argument: "ref"
				}]
			}
		);
	})
})

describe("parseAugmentation", () => {
	it("can parse a syntax", () => {
		testParse(
			parseAugmentation,
			`augment a {
				when w;
				if-feature ft;
				status deprecated;
				description "desc";
				reference "ref";

				// statements
				uses u1;
				container c2;
				leaf l3;
				leaf-list ll4;
				list l5;
				choice c6;
				anydata c7;
				anyxml c8;
				case c9;
				action a10;
				notification n11;
			}`,
			{
				construct: "augment",
				target: "a",
				ifFeatures: ["ft"],
				when: mockParse("when w;", parseWhen),
				status: Status.Deprecated,
				description: "desc",
				reference: "ref",
				statements: [
					mockParse("uses u1;", parseUses),
					mockParse("container c2;", parseContainer),
					mockParse("leaf l3;", parseLeaf),
					mockParse("list-list ll4;", parseLeafList),
					mockParse("list l5;", parseList),
					mockParse("choice c6;", parseChoice),
					mockParse("anydata c7;", parseAnyData),
					mockParse("anyxml c8;", parseAnyXml),
					mockParse("case c9;", parseCase),
					mockParse("action a10;", parseAction),
					mockParse("notification n11;", parseNotification)
				]
			}
		);
	})

	it("can parse a minimal syntax", () => {
		testParse(
			parseAugmentation,
			`augment a;`,
			{
				construct: "augment",
				target: "a",
				ifFeatures: [],
				when: null,
				status: null,
				description: null,
				reference: null,
				statements: [ ]
			}
		);
	})

	it("can report invalid semantics", () => {
		testParse(
			parseAugmentation,
			`augment;`,
			{
				construct: "augment",
				target: "<unnamed augment>",
				ifFeatures: [],
				when: null,
				status: null,
				description: null,
				reference: null,
				statements: []
			},
			context => {
				expect(context.errorCollection.messages).toContain("1:1:Expected a non-empty string argument for statement 'augment' in '/'.")
			}
		);
	})

	it("can handle unknown statements", () => {
		testParse(
			parseAugmentation,
			`augment a {
				uses u;
				reference_ ref;
			}`,
			{
				construct: "augment",
				target: "a",
				ifFeatures: [],
				when: null,
				status: null,
				description: null,
				reference: null,
				statements: [
					mockParse("uses u;", parseUses)
				],
				unknownStatements: [
					{ prefix: null, keyword: "reference_", argument: "ref" }
				]
			}
		);
	})
})

describe("parseInput", () => {
	it("can parse a syntax", () => {
		testParse(
			parseInput,
			`input {
				must m1;
				must m2;

				// typedefsOrGroupings
				typedef td;
				grouping g2;

				// dataDefinitions
				uses u1;
				container c2;
				leaf l3;
				leaf-list ll4;
				list l5;
				choice c6;
				anydata c7;
				anyxml c8;
			}`,
			{
				musts: [
					mockParse("must m1;", parseMust),
					mockParse("must m2;", parseMust)
				],
				typedefsOrGroupings: [
					mockParse("typedef td;", parseTypedef),
					mockParse("grouping g2;", parseGrouping)
				],
				dataDefinitions: [
					mockParse("uses u1;", parseUses),
					mockParse("container c2;", parseContainer),
					mockParse("leaf l3;", parseLeaf),
					mockParse("list-list ll4;", parseLeafList),
					mockParse("list l5;", parseList),
					mockParse("choice c6;", parseChoice),
					mockParse("anydata c7;", parseAnyData),
					mockParse("anyxml c8;", parseAnyXml)
				]
			}
		);
	})

	it("can parse a minimal syntax", () => {
		testParse(
			parseInput,
			`input {}`,
			{
				musts: [],
				typedefsOrGroupings: [],
				dataDefinitions: []
			}
		);
	})

	it("warns when given an argument", () => {
		testParse(
			parseInput,
			`input a {}`,
			{
				musts: [],
				typedefsOrGroupings: [],
				dataDefinitions: []
			},
			context => expect(context.warningCollection.messages).toContain("1:1:Did not expect a non-empty string argument for statement 'input' in '/'.")
		);
	})
})

describe("parseOutput", () => {
	it("can parse a syntax", () => {
		testParse(
			parseOutput,
			`output {
				must m1;
				must m2;

				// typedefsOrGroupings
				typedef td;
				grouping g2;

				// dataDefinitions
				uses u1;
				container c2;
				leaf l3;
				leaf-list ll4;
				list l5;
				choice c6;
				anydata c7;
				anyxml c8;
			}`,
			{
				musts: [
					mockParse("must m1;", parseMust),
					mockParse("must m2;", parseMust)
				],
				typedefsOrGroupings: [
					mockParse("typedef td;", parseTypedef),
					mockParse("grouping g2;", parseGrouping)
				],
				dataDefinitions: [
					mockParse("uses u1;", parseUses),
					mockParse("container c2;", parseContainer),
					mockParse("leaf l3;", parseLeaf),
					mockParse("list-list ll4;", parseLeafList),
					mockParse("list l5;", parseList),
					mockParse("choice c6;", parseChoice),
					mockParse("anydata c7;", parseAnyData),
					mockParse("anyxml c8;", parseAnyXml)
				]
			}
		);
	})

	it("can parse a minimal syntax", () => {
		testParse(
			parseOutput,
			`output {}`,
			{
				musts: [],
				typedefsOrGroupings: [],
				dataDefinitions: []
			}
		);
	})

	it("warns when given an argument", () => {
		testParse(
			parseOutput,
			`output a {}`,
			{
				musts: [],
				typedefsOrGroupings: [],
				dataDefinitions: []
			},
			context => expect(context.warningCollection.messages).toContain("1:1:Did not expect a non-empty string argument for statement 'output' in '/'.")
		);
	})
})
