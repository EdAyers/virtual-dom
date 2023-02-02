export enum PatchKind {
    NONE = 0,
    VTEXT = 1,
    VNODE = 2,
    WIDGET = 3,
    PROPS = 4,
    ORDER = 5,
    INSERT = 6,
    REMOVE = 7,
    THUNK = 8,
}

export const version = "2";

export function isThunk(t: Elt | undefined): t is Thunk {
    return !!t && !isVNode(t) && t.type === "Thunk";
}

export interface Thunk {
    type: "Thunk"
    render(previous?: Elt)
    vnode?: Elt
}

export interface Widget {
    type: "Widget";
    init(): Node;
    update(previous: Elt, domNode: Node): Node;
    destroy(domNode: Node);
}

interface Hook {
    hook: Function
    unhook: Function
}

export function isVHook(hook): hook is Hook {
    return (
        hook &&
        ((typeof hook.hook === "function" && !hook.hasOwnProperty("hook")) ||
            (typeof hook.unhook === "function" &&
                !hook.hasOwnProperty("unhook")))
    );
}

export type Elt = VirtualNode | VirtualText | Widget | Thunk

export function isVNode(x: Elt | undefined): x is VirtualNode {
    return x instanceof VirtualNode
}
export function isVText(x: Elt): x is VirtualText {
    return x && !isVNode(x) && x.type == "Text"
}

export function isWidget(w: Elt): w is Widget {
    return w && !isVNode(w) && w.type === "Widget";
}

export function handleThunk(a: Elt, b?: Elt) {
    var renderedA = a;
    var renderedB = b;

    if (isThunk(b)) {
        renderedB = renderThunk(b, a);
    }

    if (isThunk(a)) {
        renderedA = renderThunk(a);
    }

    return {
        a: renderedA,
        b: renderedB,
    };
}

function renderThunk(thunk: Thunk, previous?: Elt) {
    const renderedThunk = thunk.vnode ?? thunk.render(previous);
    thunk.vnode = renderedThunk

    if (
        !(
            isVNode(renderedThunk) ||
            isVText(renderedThunk) ||
            isWidget(renderedThunk)
        )
    ) {
        throw new Error("thunk did not return a valid node");
    }

    return renderedThunk;
}

interface NonePatch {
    type: PatchKind.NONE;
}

interface Remove {
    type: PatchKind.REMOVE;
    vNode: Elt;
}

interface Insert {
    type: PatchKind.INSERT;
    // vNode: VirtualNode;
    patch: Elt;
}

interface StringPatch {
    type: PatchKind.VTEXT;
    vNode: Elt;
    patch: VirtualText;
}

interface WidgetPatch {
    type: PatchKind.WIDGET;
    vNode: Elt;
    patch: Widget;
}
interface VNodePatch {
    type: PatchKind.VNODE;
    vNode: Elt;
    patch: Elt;
}


export interface VirtualPatch {
    readonly type: PatchKind
    readonly vNode: Elt
    readonly patch: any
}

export interface PropsPatch {
    readonly type: PatchKind.PROPS
    readonly vNode: VirtualNode
    readonly patch: Props
}


export interface ThunkPatch {
    readonly type: PatchKind.THUNK
    readonly patch: Elt
}


export interface Moves {
    removes: { from: number, key: string }[]
    inserts: { key: string, to: number }[]
}

export interface OrderPatch {
    readonly type: PatchKind.ORDER
    readonly patch: Moves
}

export interface VirtualText {
    text: string
    type: "Text"
}

export type Patch = Insert | Remove | NonePatch | StringPatch | WidgetPatch | VNodePatch | OrderPatch | PropsPatch | ThunkPatch

export class Patches {
    readonly patches: Map<number, Patch[]> = new Map()
    constructor(readonly a: Elt) { }
    get(index: number): Patch[] {
        let ps = this.patches.get(index)
        if (!ps) {
            ps = []
            this.patches.set(index, ps)
        }
        return ps
    }
    push(index, patch: Patch | Patch[]) {
        const ps = Array.isArray(patch) ? patch : [patch]
        const curr = this.get(index)
        this.patches.set(index, [...curr, ...ps])
    }
    *[Symbol.iterator](): Generator<[number, Patch[]]> {
        for (const [k, ps] of this.patches) {
            if (ps.length > 0) {
                return [k, ps]
            }
        }
    }
}
export type Props = Map<string, any>

export class VirtualNode { // [todo] rename virtual element
    count: number;
    hasWidgets: boolean;
    hasThunks: boolean;
    descendantHooks: boolean;
    hooks: Map<string, any>;
    static readonly type = "VirtualNode";
    constructor(
        readonly tagName: string,
        readonly properties: Props = new Map(),
        readonly children: Elt[] = [],
        readonly key: string | undefined = undefined,
        readonly namespace: string | undefined = undefined
    ) {
        // a load of computed values set here

        var count = (children && children.length) || 0;
        var descendants = 0;
        var hasWidgets = false;
        var hasThunks = false;
        var descendantHooks = false;
        let hooks;

        for (const [propName, property] of properties) {
            if (isVHook(property) && property.unhook) {
                if (!hooks) {
                    hooks = new Map();
                }
                hooks.set(propName, property)
            }
        }

        for (var i = 0; i < count; i++) {
            var child = children[i];
            if (isVNode(child)) {
                descendants += child.count || 0;

                if (!hasWidgets && child.hasWidgets) {
                    hasWidgets = true;
                }

                if (!hasThunks && child.hasThunks) {
                    hasThunks = true;
                }

                if (
                    !descendantHooks &&
                    (child.hooks || child.descendantHooks)
                ) {
                    descendantHooks = true;
                }
            } else if (!hasWidgets && isWidget(child)) {
                hasWidgets = true;
            } else if (!hasThunks && isThunk(child)) {
                hasThunks = true;
            }
        }

        this.count = count + descendants;
        this.hasWidgets = hasWidgets;
        this.hasThunks = hasThunks;
        this.hooks = hooks;
        this.descendantHooks = descendantHooks;
    }
}

export interface RenderOptions {
    render(vnode: Elt, renderOptions?: RenderOptions): Node;
    patch(rootNode: Node, patches, renderOptions?: RenderOptions): Node;
    document?
    warn?
}