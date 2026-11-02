import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import Pango from 'gi://Pango';
import St from 'gi://St';
import * as DND from 'resource:///org/gnome/shell/ui/dnd.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {folderCatalogue, moveApps, validateFolders} from '../core/folders.js';

export class FolderLibrary {
    constructor(owner) {
        this.owner = owner;
        this.openId = null;
        this.editing = false;
        this.selected = new Set();
        this.moving = false;
        this.dragging = false;
        this.dragIcon = null;
        this.pressed = new Set();
        this.pendingRender = false;
        this.pending = 0;
        this.bar = new St.BoxLayout({orientation: Clutter.Orientation.VERTICAL, style_class: 'glasslight-folder-toolbar', visible: false});
        this.navigation = new St.BoxLayout({style_class: 'glasslight-folder-toolbar-row'});
        this.naming = new St.BoxLayout({style_class: 'glasslight-folder-toolbar-row'});
        this.operations = new St.BoxLayout({style_class: 'glasslight-folder-toolbar-row'});
        this.secondary = new St.BoxLayout({style_class: 'glasslight-folder-toolbar-row'});
        this.bar.add_child(this.navigation);
        this.bar.add_child(this.naming);
        this.footer = new St.BoxLayout({orientation: Clutter.Orientation.VERTICAL,
            style_class: 'glasslight-selection-toolbar', visible: false});
        this.footer.add_child(this.operations);
        this.footer.add_child(this.secondary);
        this.destination = this.navigation;
        owner._details.insert_child_at_index(this.bar, 2);
        owner._details.insert_child_above(this.footer, owner._scroll);
        this.home = this.button('返回应用', () => this.open(null));
        this.home._delegate = this.dropTarget(null);
        this.title = new St.Label({text: '全部应用', x_expand: true,
            y_align: Clutter.ActorAlign.CENTER, style_class: 'glasslight-library-title'});
        this.title.clutter_text.ellipsize = Pango.EllipsizeMode.END;
        this.navigation.add_child(this.title);
        this.name = new St.Entry({can_focus: true, x_expand: true, hint_text: '文件夹名称',
            accessible_name: '文件夹名称', style_class: 'glasslight-folder-name'});
        this.name.clutter_text.connect('activate', () => this.rename());
        this.naming.add_child(this.name);
        this.destination = this.naming;
        this.save = this.button('保存名称', () => this.rename());
        this.destination = this.operations;
        this.create = this.button('新建文件夹', () => this.createFolder());
        this.move = this.button('移动到…', () => {
            this.moving = true;
            owner._render();
            owner._rows[0]?.button.grab_key_focus();
        });
        this.destination = this.secondary;
        this.remove = this.button('移出文件夹', () => this.moveSelected(null));
        this.dissolve = this.button('解散文件夹', () => this.dissolveFolder());
        this.destination = this.navigation;
        this.edit = this.button('整理', () => {
            if (this.moving) {
                this.escape();
                return;
            }
            if (this.editing && this.openId)
                this.rename();
            this.editing = !this.editing;
            this.selected.clear();
            this.moving = false;
            owner._render();
        });
        this.destination = this.operations;
        this.selectAll = this.button('全选', () => {
            const apps = owner._rows.filter(row => !row.item.folder).map(row => row.item.id);
            if (apps.every(id => this.selected.has(id)))
                this.selected.clear();
            else
                this.selected = new Set(apps);
            this.syncSelection();
        });
        owner._connect(owner._settings, 'changed::app-folders', () => this.deferRender());
    }

    button(title, callback) {
        const button = new St.Button({label: title, accessible_name: title, can_focus: true,
            style_class: 'glasslight-folder-action'});
        button.connect('clicked', callback);
        this.destination.add_child(button);
        return button;
    }

    read() {
        return validateFolders(this.owner._settings.get_value('app-folders').deep_unpack());
    }

    write(folders) {
        validateFolders(folders);
        if (!this.owner._settings.set_value('app-folders', new GLib.Variant('a(ssas)', folders)))
            throw new Error('保存应用文件夹失败');
    }

    deferRender() {
        // 拖动完成后再销毁来源节点，保持Clutter原生拖动生命周期完整。
        if (!this.owner || this.pending)
            return;
        this.pendingRender = true;
        if (this.dragging || this.pressed.size)
            return;
        this.pending = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            this.pending = 0;
            if (this.dragging || this.pressed.size)
                return GLib.SOURCE_REMOVE;
            this.pendingRender = false;
            if (this.openId && !this.read().some(([id]) => id === this.openId))
                this.openId = null;
            if (this.owner._overlay.visible)
                this.owner._render();
            return GLib.SOURCE_REMOVE;
        });
    }

    open(id) {
        if (!this.openId && id)
            this.homeScroll = this.owner._scroll.vadjustment.value;
        this.openId = id;
        this.selected.clear();
        this.moving = false;
        this.owner._entry.set_text('');
        this.owner._appCategory = 'all';
        this.owner._render();
        if (!id)
            this.owner._scroll.vadjustment.value = this.homeScroll ?? 0;
        this.owner._entry.input_hints = Clutter.InputContentHintFlags.INHIBIT_OSK;
        this.owner._entry.clutter_text.grab_key_focus();
        Main.keyboard.close();
        if (!id)
            this.owner._rows.find(row => row.item.id === this.returnId)?.button.grab_key_focus();
        else
            this.returnId = id;
    }

    rename() {
        const title = this.name.get_text().trim();
        if (!title) {
            this.name.set_text(this.read().find(([id]) => id === this.openId)[1]);
            return;
        }
        this.write(this.read().map(([id, name, apps]) => [id, id === this.openId ? title : name, apps]));
        this.owner._entry.clutter_text.grab_key_focus();
    }

    createFolder(appIds = [...this.selected]) {
        const id = GLib.uuid_string_random();
        this.write(moveApps([...this.read(), [id, '新建文件夹', []]], appIds, id));
        this.editing = true;
        this.open(id);
        this.name.grab_key_focus();
        this.name.clutter_text.set_selection(0, -1);
        return id;
    }

    moveSelected(targetId) {
        this.write(moveApps(this.read(), [...this.selected], targetId));
        this.selected.clear();
        this.moving = false;
    }

    dissolveFolder() {
        this.write(this.read().filter(([id]) => id !== this.openId));
        this.open(null);
    }

    render(query) {
        const owner = this.owner;
        this.bar.show();
        const folders = this.read();
        const folder = folders.find(([id]) => id === this.openId);
        if (!folder)
            this.openId = null;
        this.title.text = this.moving ? '移动到…' : query ? '搜索结果' : folder ? folder[1] : '全部应用';
        this.home.visible = Boolean(folder) && !this.moving;
        this.footer.visible = this.editing && !this.moving;
        for (const button of [this.name, this.save])
            button.visible = Boolean(folder);
        this.naming.visible = Boolean(folder) && this.editing && !this.moving;
        this.dissolve.visible = Boolean(folder) && this.editing;
        this.operations.visible = this.editing;
        this.secondary.visible = Boolean(folder) && this.editing;
        this.save.visible = Boolean(folder) && this.editing;
        this.name.reactive = this.editing;
        this.name.can_focus = this.editing;
        this.remove.visible = Boolean(folder) && this.editing;
        this.remove.reactive = this.selected.size > 0;
        this.move.visible = this.editing;
        this.move.reactive = this.selected.size > 0;
        this.create.visible = this.editing;
        this.edit.label = this.moving ? '取消移动' : this.editing ? '完成' : '整理';
        this.edit.accessible_name = this.edit.label;
        if (folder && this.nameFolder !== folder[0]) {
            this.name.set_text(folder[1]);
            this.nameFolder = folder[0];
        }
        if (this.moving) {
            const choices = [{id: null, title: '应用主页'}, ...folders.map(([id, title]) => ({id, title}))]
                .filter(choice => choice.id !== this.openId)
                .map(choice => ({...choice, folder: true, detail: '移动到此位置', members: [],
                    activate: () => this.moveSelected(choice.id)}));
            owner._appendAppSection('选择目标文件夹', choices);
            owner._status.text = `已选择 ${this.selected.size} 个应用`;
            return true;
        }
        // 搜索和分类继续显示全部匹配应用，包括已收纳的应用。
        if (query || owner._appCategory !== 'all')
            return false;
        const items = folderCatalogue(owner._catalog, folders, this.openId);
        owner._appVisualRow = 0;
        owner._appendAppSection(null, items);
        if (!items.length)
            owner._list.add_child(new St.Label({text: '文件夹为空', style_class: 'glasslight-empty'}));
        owner._status.text = this.editing ? `已选择 ${this.selected.size} 个应用` : `${items.length} 项`;
        return true;
    }

    activate(item, button) {
        if (this.moving) {
            item.activate();
        } else if (item.folder) {
            this.open(item.id);
        } else if (this.editing) {
            if (this.selected.has(item.id))
                this.selected.delete(item.id);
            else
                this.selected.add(item.id);
            this.syncSelection();
        } else {
            this.owner._activate(item.activate);
        }
    }

    syncSelection() {
        if (this.moving)
            return;
        const rows = this.owner._rows.filter(row => !row.item.folder);
        const visible = new Set(rows.map(row => row.item.id));
        this.selected = new Set([...this.selected].filter(id => visible.has(id)));
        for (const row of rows) {
            row.button.checked = this.editing && this.selected.has(row.item.id);
            if (row.selectionMark)
                row.selectionMark.opacity = row.button.checked ? 255 : 0;
        }
        for (const button of [this.move, this.remove]) {
            button.reactive = this.selected.size > 0;
            button.can_focus = button.reactive;
            if (button.reactive)
                button.remove_style_pseudo_class('disabled');
            else
                button.add_style_pseudo_class('disabled');
        }
        this.selectAll.label = rows.length && this.selected.size === rows.length ? '取消全选' : '全选';
        this.selectAll.accessible_name = this.selectAll.label;
        this.selectAll.reactive = rows.length > 0;
        this.selectAll.can_focus = this.selectAll.reactive;
        if (this.editing)
            this.owner._status.text = `已选择 ${this.selected.size} 个应用`;
    }

    preview(item) {
        const box = new St.Bin({style_class: 'glasslight-folder-preview',
            x_align: Clutter.ActorAlign.CENTER});
        const grid = new St.BoxLayout({orientation: Clutter.Orientation.VERTICAL,
            x_align: Clutter.ActorAlign.CENTER, y_align: Clutter.ActorAlign.CENTER,
            style_class: 'glasslight-folder-preview-grid'});
        box.set_child(grid);
        for (let row = 0; row < 2; row++) {
            const line = new St.BoxLayout({style_class: 'glasslight-folder-preview-line',
                x_align: Clutter.ActorAlign.CENTER});
            for (const app of item.members.slice(row * 2, row * 2 + 2))
                line.add_child(new St.Icon({gicon: app.gicon, icon_size: 22}));
            if (line.get_n_children())
                grid.add_child(line);
        }
        return box;
    }

    dropTarget(target) {
        return {
            handleDragOver: source => source?.library === this && source.item.id !== target?.id
                ? DND.DragMotionResult.MOVE_DROP : DND.DragMotionResult.NO_DROP,
            acceptDrop: source => {
                if (source?.library !== this || source.item.folder || source.item.id === target?.id)
                    return false;
                if (!target || target.folder) {
                    this.write(moveApps(this.read(), [source.item.id], target?.id ?? null));
                } else {
                    const id = GLib.uuid_string_random();
                    this.write(moveApps([...this.read(), [id, '新建文件夹', []]],
                        [source.item.id, target.id], id));
                }
                return true;
            },
        };
    }

    bind(button, item, appIcon) {
        button.connect('notify::pressed', () => {
            if (button.pressed)
                this.pressed.add(button);
            else {
                this.pressed.delete(button);
                if (this.pendingRender)
                    this.deferRender();
            }
        });
        button.connect('destroy', () => this.pressed.delete(button));
        button.toggle_mode = this.editing && !item.folder;
        button.checked = this.selected.has(item.id);
        if (this.moving)
            return;
        button._delegate = {...this.dropTarget(item), library: this, item,
            getDragActor: () => {
                const actor = new St.Icon({gicon: item.gicon, icon_size: 56});
                this.dragIcon = actor;
                actor.connect('destroy', () => {
                    if (this.dragIcon === actor)
                        this.dragIcon = null;
                });
                return actor;
            },
            getDragActorSource: () => appIcon};
        if (item.folder)
            return;
        const drag = DND.makeDraggable(button, {timeoutThreshold: 200});
        drag.connect('drag-begin', () => { this.dragging = true; });
        drag.connect('drag-end', () => { this.dragging = false; this.deferRender(); });
    }

    escape() {
        if (this.moving) {
            this.moving = false;
        } else if (this.editing) {
            this.editing = false;
            this.selected.clear();
            this.nameFolder = null;
        } else if (this.openId) {
            this.open(null);
            return true;
        } else {
            return false;
        }
        this.owner._render();
        this.edit.grab_key_focus();
        return true;
    }

    focusStops() {
        return [this.home, this.edit, this.name, this.save, this.create, this.move,
            this.remove, this.dissolve, this.selectAll].filter(actor => actor.mapped && actor.can_focus && actor.reactive)
            .map(actor => actor === this.name ? actor.clutter_text : actor);
    }

    destroy() {
        this.owner = null;
        this.dragIcon?.destroy();
        this.dragIcon = null;
        if (this.pending)
            GLib.source_remove(this.pending);
        this.pending = 0;
        this.selected.clear();
        this.pressed.clear();
    }
}
