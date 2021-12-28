import { Metadata } from "./yang-stmt-parser";

export interface AstNode {
	readonly metadata: Metadata;
	readonly unknownStatements: UnknownStatement[];
}

export interface Module extends AstNode {
	construct: "module";

	readonly name: string;
	readonly prefix: string;
	readonly yangVersion: string;
	readonly namespace: string;
	readonly organization: string | null;
	readonly contact: string | null;
	readonly reference: string | null;
	readonly description: string | null;
	readonly revisions: Revision[];
	readonly imports: Import[];
	readonly includes: Include[];
	readonly body: Array<Extension | Feature | Identity | Typedef | Grouping | DataDefinition | Augmentation | Rpc | Notification | Deviation>;
}

export interface Submodule extends AstNode {
	construct: "submodule",

	readonly name: string;
	readonly yangVersion: string;
	readonly belongsTo: string;
	readonly organization: string | null;
	readonly contact: string | null;
	readonly reference: string | null;
	readonly description: string | null;
	readonly revisions: Revision[];
	readonly imports: Import[];
	readonly includes: Include[];
	readonly body: Array<Extension | Feature | Identity | Typedef | Grouping | DataDefinition | Augmentation | Rpc | Notification | Deviation>;
}

export interface Argument extends AstNode {
	readonly identifier: string;
	readonly yinElement: boolean | null;
}

export interface Extension extends AstNode {
	construct: "extension";

	readonly identifier: string;
	readonly argument: Argument | null;
	readonly status: Status | null;
	readonly description: string | null;
	readonly reference: string | null;	
}

export interface Feature extends AstNode {
	construct: "feature";

	readonly identifier: string;
	readonly ifFeatures: string[];
	readonly status: Status | null;
	readonly description: string | null;
	readonly reference: string | null;
}

export interface Identity extends AstNode {
	construct: "identity";

	readonly identifier: string;
	readonly bases: string[];
	readonly ifFeatures: string[];
	readonly status: Status | null;
	readonly description: string | null;
	readonly reference: string | null;
}

export interface Rpc extends AstNode {
	construct: "rpc";

	readonly identifier: string;
	readonly ifFeatures: string[];
	readonly status: Status | null;
	readonly description: string | null;
	readonly reference: string | null;
	readonly typedefsOrGroupings: Array<Typedef | Grouping>;
	readonly input: Input | null;
	readonly output: Output | null;
}

export interface DeviationItem extends AstNode {
	readonly code: string;
	readonly units: string | null;
	readonly musts: Must[];
	readonly uniques: string[];
	readonly defaults: string[];
	readonly config: boolean | null;
	readonly mandatory: boolean | null;
	readonly minElements: number | null;
	readonly maxElements: number | null;
	readonly type: Type | null;
}

export interface Deviation extends AstNode {
	construct: "deviation";

	readonly target: string;
	readonly description: string | null;
	readonly reference: string | null;
	readonly items: Array<DeviationItem>;
}

export interface Import extends AstNode {
	readonly identifier: string;
	readonly prefix: string;
	readonly revision: string | null;
	readonly description: string | null;
	readonly reference: string | null;
}

export interface Include extends AstNode {
	readonly identifier: string;
	readonly revision: string | null;
	readonly description: string | null;
	readonly reference: string | null;
}

export interface Revision extends AstNode {
	readonly value: string;
	readonly description: string | null;
	readonly reference: string | null;
}

export enum Status {
	Current = "current",
	Deprecated = "deprecated",
	Obsolete = "obsolete"
}

export interface Uses extends AstNode {
	construct: "uses";
	readonly grouping: string;
	readonly when: When | null;
	readonly ifFeatures: string[];
	readonly status: Status | null;
	readonly description: string | null;
	readonly reference: string | null;
	readonly refines: Refine[];
	readonly augmentations: Augmentation[];
}

export interface Container extends AstNode {
	construct: "container";

	readonly identifier: string;
	readonly when: When | null;
	readonly ifFeatures: string[];
	readonly presence: string | null;
	readonly config: boolean | null;
	readonly status: Status | null;
	readonly description: string | null;
	readonly reference: string | null;
	readonly typedefsOrGroupings: Array<Typedef | Grouping>;
	readonly dataDefinitions: Array<DataDefinition>;
	readonly actions: Action[];
	readonly notifications: Notification[];
}

export interface Leaf extends AstNode {
	construct: "leaf";

	readonly identifier: string;
	readonly when: When | null;
	readonly ifFeatures: string[];
	readonly type: Type;
	readonly units: string | null;
	readonly musts: Must[];
	readonly default: string | null;
	readonly config: boolean | null;
	readonly mandatory: boolean | null;
	readonly status: Status | null;
	readonly description: string | null;
	readonly reference: string | null;
}

export interface LeafList extends AstNode {
	construct: "leaf-list";

	readonly identifier: string;
	readonly when: When | null;
	readonly ifFeatures: string[];
	readonly type: Type;
	readonly units: string | null;
	readonly musts: Must[];
	readonly default: string[];
	readonly config: boolean | null;
	readonly minElements: number | null;
	readonly maxElements: number | null;
	readonly orderedBy: string | null;
	readonly status: Status | null;
	readonly description: string | null;
	readonly reference: string | null;
}

export interface List extends AstNode {
	construct: "list";

	readonly identifier: string;
	readonly when: When | null;
	readonly ifFeatures: string[];
	readonly musts: Must[];
	readonly key: string | null;
	readonly uniques: string[];
	readonly config: boolean | null;
	readonly minElements: number | null;
	readonly maxElements: number | null;
	readonly orderedBy: string | null;
	readonly status: Status | null;
	readonly description: string | null;
	readonly reference: string | null;
	readonly typedefsOrGroupings: Array<Typedef | Grouping>;
	readonly dataDefinitions: Array<DataDefinition>;
	readonly actions: Action[];
	readonly notifications: Notification[];
}

export interface Choice extends AstNode {
	construct: "choice";

	readonly identifier: string;
	readonly when: When | null;
	readonly ifFeatures: string[];
	readonly default: string | null;
	readonly config: boolean | null;
	readonly mandatory: boolean | null;
	readonly status: Status | null;
	readonly description: string | null;
	readonly reference: string | null;
	readonly cases: Array<Case | Choice | Container | Leaf | LeafList | List | AnyData | AnyXml>;
}

export interface AnyData extends AstNode {
	construct: "anydata";

	readonly identifier: string;
	readonly when: When | null;
	readonly ifFeatures: string[];
	readonly musts: Must[];
	readonly config: boolean | null;
	readonly mandatory: boolean | null;
	readonly status: Status | null;
	readonly description: string | null;
	readonly reference: string | null;
}

export interface AnyXml extends AstNode {
	construct: "anyxml";

	readonly identifier: string;
	readonly when: When | null;
	readonly ifFeatures: string[];
	readonly musts: Must[];
	readonly config: boolean | null;
	readonly mandatory: boolean | null;
	readonly status: Status | null;
	readonly description: string | null;
	readonly reference: string | null;
}

export type DataDefinition = Uses | Container | Leaf | LeafList | List | Choice | AnyData | AnyXml;

export interface RangeSpecification {
	lowerBound: number | "min" | "max";
	upperBound: number | "min" | "max" | null;
}

export interface Range extends AstNode {
	readonly specifications: RangeSpecification[];
	readonly errorAppTag: string | null;
	readonly errorMessage: string | null;
	readonly description: string | null;
	readonly reference: string | null;
}

export interface LengthSpecification {
	lowerBound: number | "min" | "max";
	upperBound: number | "min" | "max" | null;
}

export interface Length extends AstNode {
	readonly specifications: LengthSpecification[];
	readonly errorAppTag: string | null;
	readonly errorMessage: string | null;
	readonly description: string | null;
	readonly reference: string | null;
}

export enum PatternModifier {
	InvertMatch = "invert-match"
}

export interface Pattern extends AstNode {
	readonly specification: string;
	readonly modifier: PatternModifier | null;
	readonly errorAppTag: string | null;
	readonly errorMessage: string | null;
	readonly description: string | null;
	readonly reference: string | null;
}

export interface Bit extends AstNode {
	readonly identifier: string;
	readonly position: number;
	readonly ifFeatures: string[];
	readonly status: Status | null;
	readonly description: string | null;
	readonly reference: string | null;
}

export interface Enum extends AstNode {
	readonly name: string;
	readonly value: number;
	readonly status: Status | null;
	readonly description: string | null;
	readonly reference: string | null;
}

export interface Type extends AstNode {
	readonly identifier: string;
	readonly range: Range | null;
	readonly fractionDigits: number | null;
	readonly length: Length | null;
	readonly patterns: Pattern[];
	readonly path: string | null;
	readonly bits: Bit[];
	readonly enums: Enum[];
	readonly bases: string[];
	readonly unionTypes: Type[];
	readonly requireInstance: boolean | null;
}

export interface Typedef extends AstNode {
	construct: "typedef";

	readonly identifier: string;
	readonly type: Type;
	readonly units: string | null;
	readonly default: string | null;
	readonly status: Status | null;
	readonly description: string | null;
	readonly reference: string | null;
}

export interface Case extends AstNode {
	construct: "case";

	readonly identifier: string;
	readonly when: When | null;
	readonly ifFeatures: string[];
	readonly status: Status | null;
	readonly description: string | null;
	readonly reference: string | null;
	readonly dataDefinitions: Array<DataDefinition>;
}

export interface Grouping extends AstNode {
	construct: "grouping";

	readonly identifier: string;
	readonly status: Status | null;
	readonly description: string | null;
	readonly reference: string | null;
	readonly typedefsOrGroupings: Array<Typedef | Grouping>;
	readonly dataDefinitions: Array<DataDefinition>;
	readonly actions: Action[];
	readonly notifications: Notification[];
}

export interface Action extends AstNode {
	construct: "action";

	readonly identifier: string;
	readonly ifFeatures: string[];
	readonly status: Status | null;
	readonly description: string | null;
	readonly reference: string | null;
	readonly typedefsOrGroupings: Array<Typedef | Grouping>;
	readonly input: Input | null;
	readonly output: Output | null;
}

export interface Notification extends AstNode {
	construct: "notification";

	readonly identifier: string;
	readonly ifFeatures: string[];
	readonly musts: Must[];
	readonly status: Status | null;
	readonly description: string | null;
	readonly reference: string | null;
	readonly typedefsOrGroupings: Array<Typedef | Grouping>;
	readonly dataDefinitions: Array<DataDefinition>;
}

export interface Input extends AstNode {
	readonly musts: Must[];
	readonly typedefsOrGroupings: Array<Typedef | Grouping>;
	readonly dataDefinitions: Array<DataDefinition>;
}

export interface Output extends AstNode {
	readonly musts: Must[];
	readonly typedefsOrGroupings: Array<Typedef | Grouping>;
	readonly dataDefinitions: Array<DataDefinition>;
}

export interface Augmentation extends AstNode {
	construct: "augment";

	readonly target: string;
	readonly when: When | null;
	readonly ifFeatures: string[];
	readonly status: Status | null;
	readonly description: string | null;
	readonly reference: string | null;
	readonly statements: Array<DataDefinition | Case | Action | Notification>;
}

export interface When extends AstNode {
	readonly xpath: string;
	readonly description: string | null;
	readonly reference: string | null;
}

export interface Refine extends AstNode {
	readonly target: string;
	readonly ifFeatures: string[];
	readonly musts: Must[];
	readonly presence: string | null;
	readonly defaults: string[];
	readonly config: boolean | null;
	readonly mandatory: boolean | null;
	readonly minElements: number | null;
	readonly maxElements: number | null;
	readonly description: string | null;
	readonly reference: string | null;
}

export interface Must extends AstNode {
	readonly xpath: string;
	readonly errorAppTag: string | null;
	readonly errorMessage: string | null;
	readonly description: string | null;
	readonly reference: string | null;
}

export interface UnknownStatement {
	readonly metadata: Metadata;
	readonly prefix: string | null;
	readonly keyword: string;
	readonly argument: string | null;
	readonly subStatements: UnknownStatement[]
}