import 'jest';
import { parse } from './yang-stmt-parser';

describe("parse", () => {
	it("can parse yang", () => {
		const input = `module a-mod { 
			if-feature f1;
			revision 2002-02-01 {				
				description "foo fi foo fum";
			}
			foo:bar { }
		}`;
		const stmt = parse("<text buffer>", input);

		expect(stmt).toMatchObject({
			prf: "",
			kw: "module",
			arg: "a-mod",
			metadata: { position: { line: 1, column: 1, offset: 0 } },
			substmts: [{
				prf: "",
				kw: "if-feature",
				arg: "f1",
				metadata: { position: { line: 2, column: 4, offset: 19 } },
				substmts: []
			},{
				prf: "",
				kw: "revision",
				arg: "2002-02-01",
				metadata: { position: { line: 3, column: 4, offset: 37 } },
				substmts: [{
					prf: "",
					kw: "description",
					arg: "foo fi foo fum",
					metadata: { position: { line: 4, column: 5, offset: 67 } },
					substmts: []					
				}]
			},{
				prf: "foo",
				kw: "bar",
				arg: false,
				metadata: { position: { line: 6, column: 4, offset: 105 } },
				substmts: []
			}]
		})
	})
})