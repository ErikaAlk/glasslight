EXTENSION_UUID := glasslight
ARCHIVE := dist/Glasslight-Erhai-GNOME-51.shell-extension.zip
JS_FILES := $(sort $(wildcard *.js) $(wildcard src/*.js) $(wildcard src/*/*.js))

.PHONY: all check package install clean

all: check

check:
	python3 -m json.tool metadata.json >/dev/null
	glib-compile-schemas --strict --dry-run schemas
	msgfmt --check --statistics po/ru.po -o /dev/null
	msgfmt --check po/zh_CN.po -o /dev/null
	gjs -m tests/folders.test.js
	gjs -m tests/core.test.js
	python3 tests/layout.test.py

package: check
	glib-compile-schemas --strict schemas
	msgfmt --check po/ru.po -o locale/ru/LC_MESSAGES/$(EXTENSION_UUID).mo
	mkdir -p locale/zh_CN/LC_MESSAGES
	msgfmt --check po/zh_CN.po -o locale/zh_CN/LC_MESSAGES/$(EXTENSION_UUID).mo
	mkdir -p dist
	zip -FSrq $(ARCHIVE) $(JS_FILES) icon.png stylesheet.css metadata.json LICENSE schemas locale kimpanel-shell-entry.patch kimpanel-candidate-touch.patch
	unzip -tq $(ARCHIVE)
	python3 tests/layout.test.py $(ARCHIVE)
	@printf 'Created %s\n' '$(ARCHIVE)'

install: package
	gnome-extensions install --force $(ARCHIVE)

clean:
	$(RM) $(ARCHIVE)
