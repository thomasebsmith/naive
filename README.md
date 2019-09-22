# Naive
##### A simple, configurable text editor

Naive is a simple, configurable text editor written in Electron. It strives to
be intuitive yet easily extensible.

#### Features
Naive currently supports syntax highlighting, line-based editing, and opening
and saving projects.  In the near future, Naive will also support syntax
highlighting in more languages, autocomplete, addons, keyboard shortcuts, and
more. A Vim emulation mode will also be added.

#### Known Issues
- Naive's open dialog does not appear when there is no focused window.
- Syntax highlighting does not work when inserting links in Markdown.
- The current project is only remembered for one window.
- Rehighlighting text isn't guaranteed to keep the text the same.
- Inserting text sometimes messes up line breaks.

#### Project TODOs
- Store highlighting state as a JavaScript object rather than relying on the
  DOM structure (*in progress*).
- Consider fast-inserting text without rehighlighting and rehighlighting
  when time is available.
- Add true end-of-line insertion (including at the end of the file).
- Implement addon API.
- Add compatibility with other syntax highlighting APIs.

#### Supported Languages
Naive provides syntax highlighting in C, C++, CSS, HTML, JavaScript, and
Markdown.
