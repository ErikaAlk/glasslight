import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export const GlassSurface = GObject.registerClass(class GlasslightSurface extends St.Widget {
    _init(content, radius = 28) {
        if (!global.blur_my_shell?._popup?.enabled ||
            !Main.extensionManager.lookup('erhai-motion@erhai.local')?.stateObj?.ready)
            throw new Error('Glasslight需要启用Liquid Glass与桌面动效扩展');
        super._init({layout_manager: new Clutter.BinLayout(), style_class: 'glasslight-glass'});
        this._content = content;
        content.x_expand = true;
        content.y_expand = true;
        content.x_align = Clutter.ActorAlign.FILL;
        content.y_align = Clutter.ActorAlign.FILL;
        this.add_child(content);
        this.set_pivot_point(0.5, 0.5);
        this.configure(radius);
        this.connect('notify::mapped', () => {
            if (this.mapped)
                this.refreshBlur();
        });
        this.connect('destroy', () => global.blur_my_shell?._popup?.destroy_blur(this));
    }

    naturalHeight(forWidth) {
        const node = this.get_theme_node();
        const [, natural] = this._content.get_preferred_height(node.adjust_for_width(forWidth));
        return node.adjust_preferred_height(natural, natural)[1];
    }

    configure(radius) {
        this.set_style(`border-radius: ${radius}px;`);
    }

    refreshBlur() {
        let root = this;
        while (root.get_parent() && root.get_parent() !== Main.uiGroup)
            root = root.get_parent();
        global.blur_my_shell._popup.queue_try_blur(root);
    }

    materialize(duration = 180, delay = 0) {
        this.remove_transition('opacity');
        this.opacity = duration ? 32 : 255;
        if (duration)
            this.ease({opacity: 255, duration, delay, mode: Clutter.AnimationMode.EASE_OUT_CUBIC});
    }

    dematerialize(duration = 130) {
        this.remove_transition('opacity');
        if (duration)
            this.ease({opacity: 0, duration, mode: Clutter.AnimationMode.EASE_IN_QUAD});
        else
            this.opacity = 0;
    }

    pulse(duration = 220) {
        this.remove_transition('opacity');
        this.opacity = duration ? 210 : 255;
        if (duration)
            this.ease({opacity: 255, duration, mode: Clutter.AnimationMode.EASE_OUT_CUBIC});
    }

    settle() {
        this.remove_all_transitions();
        this.opacity = 255;
        this.set_scale(1, 1);
    }

    sync() {
        global.blur_my_shell?._popup?.surfaces.get(this)?.update();
    }
});
