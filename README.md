A simple CLI tool that migrates a project to the preferred Better-T-Stack linting and formatting configuration.

You can install and run it via `npx` without cloning the repository; see usage below.

## Publishing & Usage 📦

The package is prepared to be published to npm under the scoped name `@neilthefisher/my-bts-stack-migrate`.
To publish from the repository simply run:

```bash
npm run publish    # will build the binary then `npm publish --access public`
```

After the package is published you can try it from any directory using `npx`:

```bash
# npx will install the package temporarily and run the binary defined in `bin`
# it requires `bun` to be available on your PATH because the script is a
# TypeScript file with a `#!/usr/bin/env bun` shebang. Bun can execute TS
# files directly.

npx @neilthefisher/my-bts-stack-migrate <path-to-project>
```

If you prefer to run the built JavaScript version you can also run

```bash
npx @neilthefisher/my-bts-stack-migrate -- run
```

(above example assumes the `bin` script is kept unchanged).

You can even invoke the package directly from GitHub without publishing by
using the GitHub shortcut syntax:

```bash
npx github:neilthefisher/mystack_migrate <path-to-project>
```

That will download the latest code from the default branch and try to run the
`migrate_neil_stack.ts` file; the system still requires bun to be on your path.

The script will migrate the project at the given path; omit the path and it
will operate on the current working directory.
