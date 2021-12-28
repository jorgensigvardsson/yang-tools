export enum TermSymbol {
	LCurly = "{",
	RCurly = "}",
	Identifier = "identifier",
	IdentifierRef = "identifier-ref",
	StatementTerminator = ";",
	String = "string",
	StringConcat = "+", // '+'
	Unknown = "?", // Not sure what this is!
	Eof = "EOF"
}

export interface Token {
	readonly symbol: TermSymbol;
	readonly position: Position;
	readonly length: number;
	readonly lexeme: string;
	readonly value: string | number | undefined;
}

export interface Position {
	readonly line: number;
	readonly column: number;
	readonly offset: number;
}

// An efficient version of input.substring(offset, offset + str.length) === str
export function matchString(input: string, offset: number, str: string): number {
	let matchLength = 0;
	while (offset < input.length && matchLength < str.length) {
		if (input[offset] !== str[matchLength])
			return 0;
		++offset;
		++matchLength;
	}

	return str.length === matchLength ? str.length : 0;
}

// General preficate factory. It generates a predicate that can check if 
// an input matches the given string "str"
export function isString(str: string): Predicate {
	return (input, offset) => matchString(input, offset, str);
}

// General preficate factory. It generates a predicate that can check if 
// an input matches the given character range (unicode codepoints)
export function isCodepointInRange(lowerCodepoint: number, upperCodepoint: number): Predicate {
	return (input, offset) => {
		const cp = input.codePointAt(offset);
		return cp != undefined && lowerCodepoint <= cp && cp <= upperCodepoint ? 1 : 0;
	}
}

// General preficate factory. It generates a predicate that can check if 
// an input matches any of the given strings "strings"
export function isOneOfStrings(...strings: string[]): Predicate {
	return (input, offset) => {
		for (const str of strings) {
			const matchLength = matchString(input, offset, str);
			if (matchLength > 0)
				return matchLength;
		}
		return 0;
	}
}

export function isAny(...preds: Predicate[]): Predicate {
	return (input, offset) => {
		for (const pred of preds) {
			const match = pred(input, offset);
			if (match > 0)
				return match;
		}
		return 0;
	};
}

export function isInvalidYangChar(input: string, offset: number): number {
	const codepoint = input.codePointAt(offset);

	const isValid = codepoint != undefined && (
		codepoint === 0x09 || 
		codepoint === 0x0a || 
		codepoint === 0x0d ||
		codepoint >= 0x20 && codepoint <= 0xd7ff ||
		codepoint >= 0xe000 && codepoint <= 0xfdcf ||
		codepoint >= 0xfdf0 && codepoint <= 0xffff ||
		codepoint >= 0x10000 && codepoint <= 0x1fffd ||
		codepoint >= 0x20000 && codepoint <= 0x2fffd ||
		codepoint >= 0x30000 && codepoint <= 0x3fffd ||
		codepoint >= 0x40000 && codepoint <= 0x4fffd ||
		codepoint >= 0x50000 && codepoint <= 0x5fffd ||
		codepoint >= 0x60000 && codepoint <= 0x6fffd ||
		codepoint >= 0x70000 && codepoint <= 0x7fffd ||
		codepoint >= 0x80000 && codepoint <= 0x8fffd ||
		codepoint >= 0x90000 && codepoint <= 0x9fffd ||
		codepoint >= 0xa0000 && codepoint <= 0xafffd ||
		codepoint >= 0xb0000 && codepoint <= 0xbfffd ||
		codepoint >= 0xc0000 && codepoint <= 0xcfffd ||
		codepoint >= 0xd0000 && codepoint <= 0xdfffd ||
		codepoint >= 0xe0000 && codepoint <= 0xefffd ||
		codepoint >= 0xf0000 && codepoint <= 0xffffd ||
		codepoint >= 0x100000 && codepoint <= 0x10fffd
	);

	return isValid ? 0 : 1;
}

export function unescapeString(str: string): string {
	return str.replace("\\n", "\n").replace("\\t", "\t").replace("\\\"", "\"").replace("\\\\", "\\");
}

const EscapeChar = "\\";
const NewLine = "\n";

export const isWs = isOneOfStrings(" ", "\t", NewLine, "\r");
export const isNl = isString("\n");
export const isLineComment = isString("//");
export const isBlockCommentStart = isString("/*");
export const isBlockCommendEnd = isString("*/");
export const isStringConcat = isString("+");
export const isSingleQuote = isString("'");
export const isDoubleQuote = isString('"');
export const isAlpha = isAny(isCodepointInRange(0x41, 0x5A), isCodepointInRange(0x61, 0x7A)); // A-Z and a-z
export const isDigit = isCodepointInRange(0x30, 0x39);
export const isMinus = isString("-");
export const isDecimalSeparator = isString(".");
export const isLeftCurly = isString("{");
export const isRightCurly = isString("}");
export const isIdentifierStartChar = isAny(isAlpha, isString("_"));
export const isIdentifierChar = isAny(isIdentifierStartChar, isDigit, isString("."), isString("-"));
export const isRefSeparator = isString(":");
export const isStatementTerminator = isString(";");
export const isPunctuatorCharacter = isAny(isWs, isLineComment, isBlockCommentStart, isStatementTerminator, isLeftCurly);

type Predicate = (input: string, offset: number) => number;

export class TokenScanner {
	currPos = 0;
	currLine = 1;
	currCol = 1;

	constructor(private readonly text: string) {}

	nextToken(): Token {
		while (!this.isEof) {
			const position: Position = {
				line: this.currLine,
				column: this.currCol,
				offset: this.currPos
			};

			if (this.currently(isInvalidYangChar)) {
				this.skipWhile(isInvalidYangChar);
				return this.getToken(TermSymbol.Unknown, position);
			}

			if (this.currently(isWs)) {
				this.skipWhile(isWs);
				continue;
			}

			if (this.currently(isLineComment)) {
				this.skipUntil(isNl);
				continue;
			}

			if (this.currently(isBlockCommentStart)) {
				// Skip start of block comments, so that input such as '/*/' won't trip us up!
				this.advance(2); // Skip '/*'
				this.skipUntil(isBlockCommendEnd);
				continue;
			}

			if (this.currently(isStringConcat)) {
				this.advance();
				return this.getToken(TermSymbol.StringConcat, position);
			}

			if (this.currently(isLeftCurly)) {
				this.advance();
				return this.getToken(TermSymbol.LCurly, position);
			}

			if (this.currently(isRightCurly)) {
				this.advance();
				return this.getToken(TermSymbol.RCurly, position);
			}

			if (this.currently(isStatementTerminator)) {
				this.advance();
				return this.getToken(TermSymbol.StatementTerminator, position);
			}

			if (this.currently(isSingleQuote)) {
				this.advance(); // Skip "'"...

				// ... to find the ending "'"
				if (!this.skipUntil(isSingleQuote)) { 
					// Beware of EOF!
					return this.getToken(TermSymbol.Unknown, position);
				}

				return this.getStringToken(position, false);
			}

			if (this.currently(isDoubleQuote)) {
				this.advance(); // Skip '"'...

				// ... to find the ending "'" (that is not escaped)
				if (!this.skipUntilUnescaped(isDoubleQuote)) {
					// Beware of EOF!
					return this.getToken(TermSymbol.Unknown, position);
				}

				return this.getStringToken(position, true);
			}

			if (this.currently(isIdentifierStartChar)) {
				while (this.currently(isIdentifierChar)) {
					this.advance();
				}

				let isRef = false;
				if (this.currently(isRefSeparator)) {
					this.advance();
					isRef = true;

					if (!this.currently(isIdentifierStartChar)) {
						return this.getToken(TermSymbol.Unknown, position);
					}

					while (!this.isEof && !this.currently(isPunctuatorCharacter)) {
						this.advance();
					}
				} else {
					while (!this.isEof && !this.currently(isPunctuatorCharacter)) {
						this.advance();
					}
				}

				return this.getToken(
					isRef ? TermSymbol.IdentifierRef : TermSymbol.Identifier,
					position
				)
			}

			// Grab everything else, and call it a string...
			while (!this.isEof && !this.currently(isPunctuatorCharacter)) {
				this.advance();
			}

			return this.getToken(TermSymbol.String, position, this.text.substring(position.offset, this.currPos));
		}

		return this.getToken(
			TermSymbol.Eof, 
			{
				line: this.currLine,
				column: this.currCol,
				offset: this.currPos
			}
		);
	}

	private currently(pred: Predicate): boolean {
		return !this.isEof && pred(this.text, this.currPos) > 0;
	}

	private skipWhile(pred: Predicate): boolean {
		let match = 0;
		while (!this.isEof && (match = pred(this.text, this.currPos)) != 0) {
			this.advance(match);
		}
		return !this.isEof;
	}

	private skipUntil(pred: Predicate): boolean {
		let match = 0;
		while (!this.isEof && (match = pred(this.text, this.currPos)) == 0) {
			this.advance();
		}

		if (!this.isEof) {
			this.advance(match);
			return true;
		}

		return false;
	}

	private skipUntilUnescaped(pred: Predicate): boolean {
		let match = 0;
		let isEscaping = false;
		while (!this.isEof) {
			if (isEscaping) {
				isEscaping = false;
			} else {
				if (this.text[this.currPos] === EscapeChar) {
					isEscaping = true;
				} else {
					if ((match = pred(this.text, this.currPos)) !== 0) {
						break;
					}
				}
			}

			this.advance();
		}

		if (!this.isEof) {
			this.advance(match);
			return true;
		}

		return false;
	}

	private get isEof(): boolean {
		return this.currPos >= this.text.length;
	}

	private getToken(symbol: TermSymbol, position: Position, value?: string | number): Token {
		return { 
			symbol: symbol, 
			position: position, 
			length: this.currPos - position.offset, 
			lexeme: this.text.substring(position.offset, this.currPos),
			value: value
		};
	}

	private getStringToken(position: Position, unescape: boolean): Token {
		const rawValue = this.text.substring(position.offset + 1, this.currPos - 1);

		// Handle string layouting according to RFC 7950, 6.1.3 Quoting

		// Start by chopping up all lines
		const lines = rawValue.split("\n");

		// The indent of the string is the column of the first character in the string
		// which is the quote's column + 1 (quote's column = start of the string)
		const indent = " ".repeat(position.column + 1);

		// We only do layouting for the second and following lines (the first line
		// is the reference!)
		for (let i = 1; i < lines.length; ++i) {
			if (lines[i].startsWith(indent)) {
				lines[i] = lines[i].substring(indent.length);
			}
		}

		// And stitch the lines together again to form the entire string.
		const value = lines.join("\n");

		return this.getToken(TermSymbol.String, position, unescape ? unescapeString(value): value);
	}
	
	private advance(amount?: number): void {
		const advanceCount = amount === undefined ? 1 : amount;
		for (let i = 0; i < advanceCount && this.currPos < this.text.length; ++i) {
			if (this.text[this.currPos] === NewLine) {
				++this.currLine;
				this.currCol = 1;
			} else {
				++this.currCol;
			}
			++this.currPos;
		}
	}
}
