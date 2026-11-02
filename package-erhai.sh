#!/bin/bash
set -euo pipefail
source=$(cd -- "$(dirname -- "$0")" && pwd)
output=${1:?需要绝对输出目录}
[[ "$output" = /* ]]
stage="$output/glasslight"
test ! -e "$stage"
glib-compile-schemas --strict "$source/schemas"
msgfmt --check "$source/po/ru.po" -o "$source/locale/ru/LC_MESSAGES/glasslight.mo"
install -d "$stage/locale/ru/LC_MESSAGES" "$stage/locale/zh_CN/LC_MESSAGES"
cp "$source/"{extension.js,prefs.js,metadata.json,stylesheet.css,icon.png,LICENSE,kimpanel-shell-entry.patch,kimpanel-candidate-touch.patch} "$stage/"
cp -r "$source/"{src,schemas} "$stage/"
glib-compile-schemas --strict "$stage/schemas"
msgfmt --check "$source/po/ru.po" -o "$stage/locale/ru/LC_MESSAGES/glasslight.mo"
msgfmt --check "$source/po/zh_CN.po" -o "$stage/locale/zh_CN/LC_MESSAGES/glasslight.mo"
cd "$stage"
zip -qr "$output/glasslight-erhai.shell-extension.zip" .
unzip -tq "$output/glasslight-erhai.shell-extension.zip"
python "$source/tests/layout.test.py" "$output/glasslight-erhai.shell-extension.zip"
echo GLASSLIGHT_PACKAGE_PASSED
