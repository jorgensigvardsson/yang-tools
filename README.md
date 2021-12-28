# yang-tools

Yang tools is an attempt to create tools for analyzing [yang files](https://datatracker.ietf.org/doc/html/rfc7950).

## Syntax parser
The syntax parser is provided as the exported function `parse`:
```typescript
function parse(sourceRef: string, input: string): ParseResult { ... }
```

The first parameter `sourceRef` indicates where the input comes from (typically a file path, URL, etc.).
The `input` parameter contains text that is presumed to be in the yang format. The function returns one of the following results:
```typescript
type SuccessfulParse = {
	result: "success",
	module: Module | Submodule
}

type SuccessfulParseWithWarnings = {
	result: "warning",
	module: Module | Submodule,
	warnings: string[]
}

type UnsuccessfulParse = {
	result: "error",
	errors: string[],
	warnings: string[]
}

type ParseResult = SuccessfulParse | SuccessfulParseWithWarnings | UnsuccessfulParse;
```

A successful parse (`SuccessfulParse`) means that the yang text was syntactically correct, and that either a _module_ or a _submodule_ was found. A successful parse with warnings (`SuccessfulParseWithWarnings`) means that the parser managed to parse the yang text, but issues were found (found in `warnings`). An unsuccessful parse (`UnsuccessfulParse`) means that the yang text was not syntactically correct, and only error and possibly warning messages are returned (`errors` and `warnings`).

## Caveats
The AST nodes coming out of the parser are "limited". The first implementation of the parser used the npm package `yang-parser` as a dependency. It did not include metadata information about the statements, such as location of the construct in the input, or where it came from. It also didn't handle syntax error very well, resulting in exceptions with the message `"Parse error"`. `yang-parser` has been replaced with a hand written token scanner and recursive descent parser.

Due to the nature of the yang grammar, it does not fully capture the semantics of the language, as runtime information is needed for that. For instance, the `type` statement allows one to derive new numeric types, and constrain numeric types with a range specification. During the parse, what the base type is; is not known at parse time. The base type could be any type. Therefore, the grammar allows constraining the type in any way possible. Because of this, the ASTs being emitted by the parser reflects this, and does not try to capture the semantics of the language.

Future work on this library should build a "runtime layer" ontop of the parser to not only handle the semantics of the language, but also loading of modules/submodules and linkage between modules/submodules.