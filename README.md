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

#### Project TODOs
- Add better selection.
- Implement addon API.
- Add compatibility with other syntax highlighting APIs.
- Add more keyboard shortcuts.
- Add Vim emulation mode.
- Add autocomplete.
- Add support for more languages (Java, Rust, PHP, etc.).
- Add unit tests.
- Add intergration tests.

#### Supported Languages
Naive provides syntax highlighting in C, C++, CSS, HTML, JavaScript, and
Markdown.

#### Version History
###### v0.1 (in development)
- Added basic editing features.
- Added syntax highlighting in C, C++, CSS, HTML, JavaScript, and Markdown.
- Added file creation/opening/saving capabilities.
