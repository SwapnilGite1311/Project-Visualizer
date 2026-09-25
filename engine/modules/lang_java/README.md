# lang_java

Java (`.java`, tree-sitter-java v0.23.5) on top of `lang_generic`. Classes, interfaces, enums and records become classes on the map; methods and constructors become methods.

## Source roots

A file's module name is its dotted class path under the source root:

- If the path contains `/java/` (Maven and Gradle: `src/main/java/`, `src/test/java/`), the part after the **last** `/java/` is used: `src/main/java/com/acme/App.java` → `com.acme.App`.
- Otherwise a leading `src/` is dropped: `src/com/acme/App.java` → `com.acme.App`.
- Otherwise the whole path is used: `App.java` → `App`.

Folders become packages on the map, so `com/acme/util` shows as nested packages.

## Imports

- `import com.acme.util.Helper;` links to the class `Helper` and makes the simple name `Helper` usable in the file (calls like `new Helper()` and `Helper.version()` resolve to it).
- `import static com.acme.util.Helper.version;` resolves through the class `Helper`.
- `import com.acme.model.*;` is recorded as a wildcard import; it does not bind names.
- Imports that are not part of the project are external packages: the first two segments for `com`, `org`, `net` and `io` (`org.springframework`), otherwise the first segment (`java`, `javax`, `lombok`).

## Limits

- Classes of the same package used without an import are not linked (Java does not need imports for them).
- Calls on variables (`helper.greet()`) are matched by method name only; the variable's declared type is not used.
- Overloaded methods share one name, so the second and later overloads get `~2`, `~3` in their ids.
- Anonymous and local classes, lambdas and generics are not shown as separate elements.
