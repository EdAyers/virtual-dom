// Maps a virtual DOM tree onto a real DOM tree in an efficient manner.
// We don't want to read all of the DOM nodes in the tree so we use
// the in-order tree indexing to eliminate recursion down certain branches.
// We only recurse into a DOM node if we know that it contains a child of
// interest.

import { Elt, isVNode } from "./vnode"

export type NodeIndex = Map<number, Node>

export function domIndex(rootNode: Node, tree: Elt, indices: number[], nodes: NodeIndex = new Map()): NodeIndex {
    if (!indices || indices.length === 0) {
        return nodes
    } else {
        indices.sort(ascending)
        return recurse(rootNode, tree, indices, nodes, 0)
    }
}

function recurse(rootNode: Node, tree: Elt, indices: number[], nodes: NodeIndex, rootIndex: number): NodeIndex {

    if (rootNode) {
        if (indexInRange(indices, rootIndex, rootIndex)) {
            nodes.set(rootIndex, rootNode)
        }

        if (isVNode(tree)) {
            const childNodes = rootNode.childNodes
            for (var i = 0; i < tree.children.length; i++) {
                const vChild = tree.children[i]
                rootIndex += 1
                const count = (isVNode(vChild)) ? vChild.count : 0
                const nextIndex = rootIndex + count
                // skip rcursion down the tree if there are no nodes down here
                if (indexInRange(indices, rootIndex, nextIndex)) {
                    recurse(childNodes[i], vChild, indices, nodes, rootIndex)
                }

                rootIndex = nextIndex
            }
        }

    }

    return nodes
}

// Binary search for an index in the interval [left, right]
function indexInRange(indices: number[], left: number, right: number) {
    if (indices.length === 0) {
        return false
    }

    var minIndex = 0
    var maxIndex = indices.length - 1
    var currentIndex
    var currentItem

    while (minIndex <= maxIndex) {
        currentIndex = ((maxIndex + minIndex) / 2) >> 0
        currentItem = indices[currentIndex]

        if (minIndex === maxIndex) {
            return currentItem >= left && currentItem <= right
        } else if (currentItem < left) {
            minIndex = currentIndex + 1
        } else if (currentItem > right) {
            maxIndex = currentIndex - 1
        } else {
            return true
        }
    }

    return false;
}

function ascending(a, b) {
    return a > b ? 1 : -1
}
