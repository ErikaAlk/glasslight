export function validateFolders(folders) {
    const ids = new Set();
    const apps = new Set();
    for (const [id, name, members] of folders) {
        if (!id || ids.has(id) || !name.trim())
            throw new Error('文件夹名称或标识无效');
        ids.add(id);
        for (const app of members) {
            if (!app || apps.has(app))
                throw new Error('应用重复出现在文件夹中');
            apps.add(app);
        }
    }
    return folders;
}

export function moveApps(folders, appIds, targetId) {
    validateFolders(folders);
    if (targetId !== null && !folders.some(([id]) => id === targetId))
        throw new Error('目标文件夹不存在');
    const moved = new Set(appIds);
    return folders.map(([id, name, members]) => [id, name,
        id === targetId ? [...new Set([...members, ...moved])]
            : members.filter(app => !moved.has(app))]);
}

export function folderCatalogue(records, folders, openId = null) {
    validateFolders(folders);
    const byId = new Map(records.map(record => [record.id, record]));
    if (openId !== null) {
        const folder = folders.find(([id]) => id === openId);
        if (!folder)
            throw new Error('文件夹不存在');
        return folder[2].map(id => byId.get(id)).filter(Boolean);
    }
    const grouped = new Set(folders.flatMap(([, , members]) => members));
    const collator = new Intl.Collator(undefined, {numeric: true, sensitivity: 'base'});
    return [...folders.map(([id, title, members]) => ({id, title, folder: true,
        detail: '应用文件夹', members: members.map(app => byId.get(app)).filter(Boolean)})),
    ...records.filter(record => !grouped.has(record.id))
        .sort((first, second) => collator.compare(first.title, second.title))];
}
