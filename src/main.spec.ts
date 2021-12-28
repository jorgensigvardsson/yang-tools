import 'jest';

import { parse } from "./main";

describe("parse", () => {
	it("can parse a module", () => {
		const input = `module a-module {
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
		}`;

		const p = parse("<memory buffer>", input);
		expect(p.result === "success" && p.module.construct === "module").toBeTruthy();
	})

	it("can parse a module with warnings", () => {
		const input = `module a-module {
			prefix pre;
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
		}`;

		const p = parse("<memory buffer>", input);
		expect(p.result === "warning" && p.module.construct === "module").toBeTruthy();
	})

	it("can parse a submodule", () => {
		const input = `submodule a-module {
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
		}`;

		const p = parse("<memory buffer>", input);
		expect(p.result === "success" && p.module.construct === "submodule").toBeTruthy();
	})

	it("can parse a submodule with warnings", () => {
		const input = `submodule a-module {
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
		}`;

		const p = parse("<memory buffer>", input);
		expect(p.result === "warning" && p.module.construct === "submodule").toBeTruthy();
	})

	it("can report errors", () => {
		const input = `module a-module {
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
		}`;

		const p = parse("<memory buffer>", input);
		expect(p.result === "error").toBeTruthy();
	})
});
