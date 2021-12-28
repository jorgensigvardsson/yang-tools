import 'jest';
import { TokenScanner, TermSymbol, Token } from './yang-stmt-scanner';

describe("TokenScanner", () => {

	function testToken(input: string, expectedToken: Token) {
		expect(new TokenScanner(input).nextToken()).toStrictEqual(expectedToken)
	}

	it("can handle string layouts", () => {
		const stringLayout = '    "this is a\n      test\n      123."';
		testToken(
			stringLayout,
			{
				symbol: TermSymbol.String,
				position: {
					line: 1,
					column: 5,
					offset: 4
				},
				length: 33,
				lexeme: "\"this is a\n      test\n      123.\"",
				value: "this is a\ntest\n123."
			}
		)
	})

	it("can handle invalid characters", () => {
		const invalidInput = "\u{1FFFF}\u{6}";
		testToken(
			invalidInput,
			{
				symbol: TermSymbol.Unknown,
				position: {
					line: 1,
					column: 1,
					offset: 0
				},
				length: invalidInput.length,
				lexeme: invalidInput,
				value: undefined
			}
		)
	})

	it("can tokenize an empty string", () => {
		testToken(
			"",
			{
				symbol: TermSymbol.Eof,
				position: {
					line: 1,
					column: 1,
					offset: 0
				},
				length: 0,
				lexeme: "",
				value: undefined
			}
		)
	})

	it("reaching EOF continues to emit EOF tokens", () => {
		const scanner = new TokenScanner("");

		const token = scanner.nextToken() && scanner.nextToken();
		expect(token).toStrictEqual({
			symbol: TermSymbol.Eof,
			position: {
				line: 1,
				column: 1,
				offset: 0
			},
			length: 0,
			lexeme: "",
			value: undefined
		})
	})

	it("line comments are ignored", () => {
		testToken(
			"// this is a comment",
			{
				symbol: TermSymbol.Eof,
				position: {
					line: 1,
					column: 21,
					offset: 20
				},
				length: 0,
				lexeme: "",
				value: undefined
			}
		)
	})

	it("block comments are ignored", () => {
		testToken(
			"/* this is a comment */",
			{
				symbol: TermSymbol.Eof,
				position: {
					line: 1,
					column: 24,
					offset: 23
				},
				length: 0,
				lexeme: "",
				value: undefined
			}
		)
	})

	it("white space are ignored", () => {
		testToken(
			"   \n\t\t\r\n\r\n   ",
			{
				symbol: TermSymbol.Eof,
				position: {
					line: 4,
					column: 4,
					offset: 13
				},
				length: 0,
				lexeme: "",
				value: undefined
			}
		)
	})

	it("finds string concat symbols", () => {
		testToken(
			"   +   ",
			{
				symbol: TermSymbol.StringConcat,
				position: {
					line: 1,
					column: 4,
					offset: 3
				},
				length: 1,
				lexeme: "+",
				value: undefined
			}
		)
	})

	it("finds statement separator symbols", () => {
		testToken(
			"   ;   ",
			{
				symbol: TermSymbol.StatementTerminator,
				position: {
					line: 1,
					column: 4,
					offset: 3
				},
				length: 1,
				lexeme: ";",
				value: undefined
			}
		)
	})

	it("finds curly brace symbols ({)", () => {
		testToken(
			"   {   ",
			{
				symbol: TermSymbol.LCurly,
				position: {
					line: 1,
					column: 4,
					offset: 3
				},
				length: 1,
				lexeme: "{",
				value: undefined
			}
		)
	})

	it("finds curly brace symbols (})", () => {
		testToken(
			"   }   ",
			{
				symbol: TermSymbol.RCurly,
				position: {
					line: 1,
					column: 4,
					offset: 3
				},
				length: 1,
				lexeme: "}",
				value: undefined
			}
		)
	})

	it("finds single quoted strings", () => {
		testToken(
			` 'hello"world' `,
			{
				symbol: TermSymbol.String,
				position: {
					line: 1,
					column: 2,
					offset: 1
				},
				length: 13,
				lexeme: `'hello"world'`,
				value: 'hello"world'
			}
		)
	})

	it("handles single quoted strings ended with an EOF", () => {
		testToken(
			` 'hello"world`,
			{
				symbol: TermSymbol.Unknown,
				position: {
					line: 1,
					column: 2,
					offset: 1
				},
				length: 12,
				lexeme: `'hello"world`,
				value: undefined
			}
		)
	})

	it("finds double quoted strings", () => {
		testToken(
			` "hello'world" `,
			{
				symbol: TermSymbol.String,
				position: {
					line: 1,
					column: 2,
					offset: 1
				},
				length: 13,
				lexeme: `"hello'world"`,
				value: "hello'world"
			}
		)
	})

	it("handles double quoted strings with escape codes", () => {
		testToken(
			String.raw`   "\"\n\t\\"   `,
			{
				symbol: TermSymbol.String,
				position: {
					line: 1,
					column: 4,
					offset: 3
				},
				length: 10,
				lexeme: String.raw`"\"\n\t\\"`,
				value: "\"\n\t\\"
			}
		)
	})

	it("handles quoted strings ended with an EOF", () => {
		testToken(
			String.raw`   "\"\n\t\\`,
			{
				symbol: TermSymbol.Unknown,
				position: {
					line: 1,
					column: 4,
					offset: 3
				},
				length: 9,
				lexeme: String.raw`"\"\n\t\\`,
				value: undefined
			}
		)
	})

	it("handles integers", () => {
		testToken(
			"    12345    ",
			{
				symbol: TermSymbol.String,
				position: {
					line: 1,
					column: 5,
					offset: 4
				},
				length: 5,
				lexeme: "12345",
				value: "12345"
			}
		)
	})

	it("handles negative integers", () => {
		testToken(
			"    -12345    ",
			{
				symbol: TermSymbol.String,
				position: {
					line: 1,
					column: 5,
					offset: 4
				},
				length: 6,
				lexeme: "-12345",
				value: "-12345"
			}
		)
	})

	it("handles single minuses", () => {
		testToken(
			"    -    ",
			{
				symbol: TermSymbol.String,
				position: {
					line: 1,
					column: 5,
					offset: 4
				},
				length: 1,
				lexeme: "-",
				value: "-"
			}
		)
	})

	it("handles decimals", () => {
		testToken(
			"    123.45    ",
			{
				symbol: TermSymbol.String,
				position: {
					line: 1,
					column: 5,
					offset: 4
				},
				length: 6,
				lexeme: "123.45",
				value: "123.45"
			}
		)
	})

	it("handles negative decimals", () => {
		testToken(
			"    -123.45    ",
			{
				symbol: TermSymbol.String,
				position: {
					line: 1,
					column: 5,
					offset: 4
				},
				length: 7,
				lexeme: "-123.45",
				value: "-123.45"
			}
		)
	})

	it("rejects malformed decimals (no trailing fractions)", () => {
		testToken(
			"    123.    ",
			{
				symbol: TermSymbol.String,
				position: {
					line: 1,
					column: 5,
					offset: 4
				},
				length: 4,
				lexeme: "123.",
				value: "123."
			}
		)
	})

	it("rejects malformed decimals (no leading integer)", () => {
		testToken(
			"    .45    ",
			{
				symbol: TermSymbol.String,
				position: {
					line: 1,
					column: 5,
					offset: 4
				},
				length: 3,
				lexeme: ".45",
				value: ".45"
			}
		)
	})

	it("finds identifiers", () => {
		testToken(
			"    abc-def    ",
			{
				symbol: TermSymbol.Identifier,
				position: {
					line: 1,
					column: 5,
					offset: 4
				},
				length: 7,
				lexeme: "abc-def",
				value: undefined
			}
		)
	})

	it("finds identifier refs", () => {
		testToken(
			"    prf:abc-def    ",
			{
				symbol: TermSymbol.IdentifierRef,
				position: {
					line: 1,
					column: 5,
					offset: 4
				},
				length: 11,
				lexeme: "prf:abc-def",
				value: undefined
			}
		)
	})

	it("handles broken identifier refs", () => {
		testToken(
			"    prf:    ",
			{
				symbol: TermSymbol.Unknown,
				position: {
					line: 1,
					column: 5,
					offset: 4
				},
				length: 4,
				lexeme: "prf:",
				value: undefined
			}
		)
	})
})