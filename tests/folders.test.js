import {folderCatalogue, moveApps, validateFolders} from '../src/core/folders.js';

function equal(actual, expected) {
    if (JSON.stringify(actual) !== JSON.stringify(expected))
        throw new Error(`${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);
}

const apps = [{id: 'a.desktop', title: '应用A'}, {id: 'b.desktop', title: '应用B'},
    {id: 'c.desktop', title: '应用C'}];
const folders = [['one', '工具', ['a.desktop', 'missing.desktop']], ['two', '工作', []]];
const moved = moveApps(folders, ['a.desktop', 'b.desktop'], 'two');
equal(moved, [['one', '工具', ['missing.desktop']], ['two', '工作', ['a.desktop', 'b.desktop']]]);
equal(folders[0][2], ['a.desktop', 'missing.desktop']);
equal(folderCatalogue(apps, moved).map(item => item.id), ['one', 'two', 'c.desktop']);
equal(folderCatalogue(apps, moved, 'two').map(item => item.id), ['a.desktop', 'b.desktop']);
equal(folderCatalogue(apps, moved, 'one'), []);
equal(moveApps(moved, ['a.desktop'], null)[1][2], ['b.desktop']);
equal(moveApps(moved, ['a.desktop'], 'two'), moved);
equal(folderCatalogue(apps, [], null), apps);
equal(folderCatalogue(apps, moved.filter(([id]) => id !== 'two')).map(item => item.id),
    ['one', 'a.desktop', 'b.desktop', 'c.desktop']);
validateFolders(moved);
print('GLASSLIGHT_FOLDERS_PASSED');
