import { applyProperties } from './apply-properties'
import { isWidget, VirtualPatch, VirtualNode, PatchKind, RenderOptions, VirtualText, Patch, Widget, Moves } from './vnode'
import { Elt } from './vnode'

export function updateWidget(a: Elt, b: Elt) {
    if (isWidget(a) && isWidget(b)) {
        if ("name" in a && "name" in b) {
            return a.name === b.name
        } else {
            return a.init === b.init
        }
    }

    return false
}


export function applyPatch(vpatch: Patch, domNode: Node, renderOptions: RenderOptions) {
    switch (vpatch.type) {
        case PatchKind.REMOVE:
            return removeNode(domNode, vpatch.vNode)
        case PatchKind.INSERT:
            return insertNode(domNode, vpatch.patch, renderOptions)
        case PatchKind.VTEXT:
            return stringPatch(domNode, vpatch.vNode, vpatch.patch, renderOptions)
        case PatchKind.WIDGET:
            return widgetPatch(domNode, vpatch.vNode, vpatch.patch, renderOptions)
        case PatchKind.VNODE:
            return vNodePatch(domNode, vpatch.vNode, vpatch.patch, renderOptions)
        case PatchKind.ORDER:
            reorderChildren(domNode, vpatch.patch)
            return domNode
        case PatchKind.PROPS:
            if (!(domNode instanceof Element)) {
                throw "Expected domNode to be an element"
            }
            applyProperties(domNode, vpatch.patch, vpatch.vNode.properties)
            return domNode
        case PatchKind.THUNK:
            return replaceRoot(domNode,
                renderOptions.patch(domNode, vpatch.patch, renderOptions))
        default:
            return domNode
    }
}

function removeNode(domNode: Node, vNode: Elt) {
    var parentNode = domNode.parentNode

    if (parentNode) {
        parentNode.removeChild(domNode)
    }

    destroyWidget(domNode, vNode);

    return null
}

function insertNode(parentNode: Node, vNode: Elt, renderOptions: RenderOptions) {
    var newNode = renderOptions.render(vNode, renderOptions)

    if (parentNode) {
        parentNode.appendChild(newNode)
    }

    return parentNode
}

function stringPatch(domNode: Node, leftVNode: Elt, vText: VirtualText, renderOptions: RenderOptions) {
    var newNode

    if (domNode.nodeType === 3) {
        const t: Text = domNode as any
        t.replaceData(0, t.length, vText.text)
        newNode = domNode
    } else {
        var parentNode = domNode.parentNode
        newNode = renderOptions.render(vText, renderOptions)

        if (parentNode && newNode !== domNode) {
            parentNode.replaceChild(newNode, domNode)
        }
    }

    return newNode
}

function widgetPatch(domNode: Node, leftVNode: Elt, widget: Widget, renderOptions: RenderOptions) {
    let updating = updateWidget(leftVNode, widget)
    let newNode: Node

    if (updating) {
        newNode = widget.update(leftVNode, domNode) || domNode
    } else {
        newNode = renderOptions.render(widget, renderOptions)
    }

    let parentNode = domNode.parentNode

    if (parentNode && newNode !== domNode) {
        parentNode.replaceChild(newNode, domNode)
    }

    if (!updating) {
        destroyWidget(domNode, leftVNode)
    }

    return newNode
}

function vNodePatch(domNode: Node, leftVNode: Elt, vNode: Elt, renderOptions: RenderOptions) {
    var parentNode = domNode.parentNode
    var newNode = renderOptions.render(vNode, renderOptions)

    if (parentNode && newNode !== domNode) {
        parentNode.replaceChild(newNode, domNode)
    }

    return newNode
}

function destroyWidget(domNode: Node, w: Elt) {
    if (isWidget(w)) {
        w.destroy(domNode)
    }
}

function reorderChildren(domNode: Node, moves: Moves) {
    var childNodes = domNode.childNodes
    const keyMap: Map<string, Node> = new Map()

    for (const remove of moves.removes) {
        const node = childNodes[remove.from]
        if (remove.key) {
            keyMap.set(remove.key, node)
        }
        domNode.removeChild(node)
    }

    let length = childNodes.length
    for (const insert of moves.inserts) {
        const node = keyMap.get(insert.key)!
        // this is the weirdest bug i've ever seen in webkit
        domNode.insertBefore(node, insert.to >= length++ ? null : childNodes[insert.to])
    }
}

function replaceRoot(oldRoot: Node, newRoot: Node) {
    if (oldRoot && newRoot && oldRoot !== newRoot && oldRoot.parentNode) {
        oldRoot.parentNode.replaceChild(newRoot, oldRoot)
    }

    return newRoot;
}
