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
- The current project is only remembered for one window.
- Many of the Edit menu items don't work (e.g. Paste and Match Styles, Delete).
- Some UI elements act like regular text (they can be selected).

#### Project TODOs
- Add cursor movement via clicking and dragging.
- Consider fast-inserting text without rehighlighting and rehighlighting
  when time is available.
- Add true end-of-line insertion (including at the end of the file).
- Implement addon API.
- Add compatibility with other syntax highlighting APIs.

#### Supported Languages
Naive provides syntax highlighting in C, C++, CSS, HTML, JavaScript, and
Markdown.
