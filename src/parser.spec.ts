import "jest";
import { parse } from "./parser";

describe("parse", () => {
	it("can parse modules", () => {
		const result = parse("sourceRef", "module a-module { prefix prf; namespace urn:westermo:test; yang-version 1.1; }");
		expect(result.result).toBe("success");
	})

	it("can parse submodules", () => {
		const result = parse("sourceRef", "submodule a-submodule { belongs-to a-module; namespace urn:westermo:test; yang-version 1.1; }");
		expect(result.result).toBe("success");
	})

	it("cannot parse arbitrary statements", () => {
		const result = parse("sourceRef", "description foo;");
		expect(result.result).toBe("error");
	})
})