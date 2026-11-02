import Clutter from 'gi://Clutter';

// 显式过渡允许刚映射的面板从首帧开始动画，并保留中途改变目标时的当前值。
export function animate(actor, values, duration, onComplete = null) {
    const entries = Object.entries(values);
    for (const [property] of entries)
        actor.remove_transition(property.replaceAll('_', '-'));
    if (!duration) {
        for (const [property, value] of entries)
            actor[property] = value;
        onComplete?.();
        return;
    }
    entries.forEach(([property, value], index) => {
        const name = property.replaceAll('_', '-');
        const transition = new Clutter.PropertyTransition({property_name: name,
            duration, progress_mode: Clutter.AnimationMode.EASE_OUT_CUBIC,
            remove_on_complete: true});
        transition.set_from(actor[property]);
        transition.set_to(value);
        if (index === entries.length - 1 && onComplete)
            transition.connect('stopped', (_transition, finished) => {
                if (finished)
                    onComplete();
            });
        actor.add_transition(name, transition);
    });
}
