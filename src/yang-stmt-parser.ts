import { TermSymbol, Token, TokenScanner, Position } from "./yang-stmt-scanner"

export interface Metadata {
	readonly source: string;     // Where does the statement come from? Typically the path of the file.
	readonly position: Position; // Where in the source was the statement found?
	readonly length: number;     // How many characters from position.offset does the statement span?
}

export interface YangStatement {
	readonly prf: string;
	readonly kw: string;
	readonly arg: string | boolean;
	readonly substmts: YangStatement[];
	readonly metadata: Metadata;
}

export class SyntaxError {
	readonly message: string;
	
	constructor (public readonly sourceRef: string, message: string, readonly token: Token) {
		this.message = `${token.position.line}:${token.position.column}:${message}`;
	}
}

class ParserState {
	private scanner: TokenScanner;
	private _lookAhead: Token;

	constructor (public readonly source: string, text: string) {
		this.scanner = new TokenScanner(text);
		this._lookAhead = this.scanner.nextToken();
	}

	get nextSymbol(): TermSymbol { return this._lookAhead.symbol; }
	get lookAhead(): Token { return this._lookAhead; }

	match (symbol: TermSymbol): Token {
		if (this._lookAhead.symbol !== symbol) {
			throw this.fail(`Expected a ${symbol} but got ${this._lookAhead.symbol}`);
		}

		const token = this._lookAhead;
		this._lookAhead = this.scanner.nextToken();
		return token;
	}

	fail (message: string) {
		return new SyntaxError(this.source, message, this.lookAhead);
	}
}

export function parse(sourceRef: string, text: string): YangStatement {
	const state = new ParserState(sourceRef, text);

	return parseStatement(state);
}

function parseStatement(state: ParserState): YangStatement {
	const { prf, kw, kwPosition } = parseIdentifier(state);
	const arg = parseOptArg(state);
	const { substmts, endPosition } = parseOptStatementBody(state);

	const length = endPosition.offset - kwPosition.offset;

	return { prf, kw, arg, substmts, metadata: { source: state.source, position: kwPosition, length: length } };
}

function parseIdentifier(state: ParserState): { prf: string, kw: string, kwPosition: Position } {
	const position = state.lookAhead.position;

	if (state.nextSymbol === TermSymbol.Identifier) {
		const kw = state.lookAhead.lexeme;
		state.match(state.nextSymbol);
		return { prf: "", kw, kwPosition: position }
	}
	
	if (state.nextSymbol === TermSymbol.IdentifierRef) {
		const [ prf, kw ] = state.lookAhead.lexeme.split(':');
		state.match(TermSymbol.IdentifierRef);
		return { prf, kw, kwPosition: position }
	}

	throw state.fail(`Expected an identifier, but got ${state.nextSymbol}`);
}

function parseOptArg(state: ParserState): string | false {
	// TODO: Handle string fiddling and alignment according to RFC!
	if (state.nextSymbol === TermSymbol.String) {
		const strings: string[] = [ state.match(TermSymbol.String).value as string ];

		while (state.lookAhead.symbol === TermSymbol.StringConcat) {
			state.match(TermSymbol.StringConcat);
			strings.push(state.match(TermSymbol.String).value as string);
		}
		return strings.join();
	}
	
	switch (state.nextSymbol) {
		case TermSymbol.Identifier:
		case TermSymbol.IdentifierRef:
			return state.match(state.nextSymbol).lexeme
	}

	return false;
}

function parseOptStatementBody(state: ParserState): { substmts: YangStatement[], endPosition: Position } {
	if (state.nextSymbol === TermSymbol.StatementTerminator) {
		const position = state.lookAhead.position;
		state.match(TermSymbol.StatementTerminator);
		return { substmts: [], endPosition: position };
	}

	if (state.nextSymbol === TermSymbol.LCurly) {
		return parseStatementBody(state);
	}

	throw state.fail(`Expected a statement terminator or body, but got ${state.nextSymbol}`);
}

function parseStatementBody(state: ParserState): { substmts: YangStatement[], endPosition: Position } {
	const substmts: YangStatement[] = [];
	
	state.match(TermSymbol.LCurly);
	while (state.nextSymbol !== TermSymbol.RCurly) {
		substmts.push(parseStatement(state));
	}

	const endPosition = state.lookAhead.position;
	state.match(TermSymbol.RCurly);

	return { substmts: substmts, endPosition: endPosition }
}