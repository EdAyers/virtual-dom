import { Patch, Patches, RenderOptions } from './vnode'
import { createElement as render } from './create-element'
import { domIndex } from './dom-index'
import { applyPatch as patchOp } from './patch-op'

function makeRenderOptions(opts?: Partial<RenderOptions>): RenderOptions {
    const renderOptions: any = opts || {}
    renderOptions.patch = renderOptions.patch && renderOptions.patch !== patch
        ? renderOptions.patch
        : patchRecursive
    renderOptions.render = renderOptions.render || render
    return renderOptions
}

export function patch(rootNode: Node, patches: Patches, renderOptions?: RenderOptions) {
    const opts = makeRenderOptions(renderOptions)
    return opts.patch(rootNode, patches, opts)
}

function patchRecursive(rootNode: Node, patches: Patches, renderOptions: RenderOptions) {
    const indices = patchIndices(patches)

    if (indices.length === 0) {
        return rootNode
    }

    const index = domIndex(rootNode, patches.a, indices)
    var ownerDocument = rootNode.ownerDocument

    if (!renderOptions.document && ownerDocument !== document) {
        renderOptions.document = ownerDocument
    }

    for (var i = 0; i < indices.length; i++) {
        var nodeIndex = indices[i]
        rootNode = applyPatch(rootNode,
            index.get(nodeIndex),
            patches.get(nodeIndex),
            renderOptions)
    }

    return rootNode
}

function applyPatch(rootNode: Node, domNode: Node | undefined, patchList: Patch | Patch[] | undefined, renderOptions: RenderOptions) {
    if (!domNode) {
        return rootNode
    }
    const patches = !patchList ? [] : (Array.isArray(patchList) ? patchList : [patchList])
    for (const patch of patches) {
        const newNode = patchOp(patch, domNode, renderOptions)

        if (domNode === rootNode) {
            rootNode = newNode
        }
    }

    return rootNode
}

function patchIndices(patches: Patches): number[] {
    return [...patches.index.keys()]
}
