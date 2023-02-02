import { isObject } from "./util"
import { isVHook as isHook, Props } from './vnode'

export function diffProps(a: Props, b: Props): Map<string, any> {
    const diff = new Map()

    for (const [aKey, aValue] of a) {
        if (!b.has(aKey)) {
            diff.set(aKey, undefined)
        }

        const bValue = b.get(aKey)

        if (aValue === bValue) {
            continue
        } else if (isObject(aValue) && isObject(bValue)) {
            if (getPrototype(bValue) !== getPrototype(aValue)) {
                diff.set(aKey, bValue)
            } else if (isHook(bValue)) {
                diff.set(aKey, bValue)
            } else {
                const objectDiff = diffProps(aValue, bValue)
                if (objectDiff) {
                    diff.set(aKey, objectDiff)
                }
            }
        } else {
            diff.set(aKey, bValue)
        }
    }

    for (const [bKey, bValue] of b) {
        if (!(a.has(bKey))) {
            diff.set(bKey, bValue)
        }
    }

    return diff
}

function getPrototype(value) {
    if (Object.getPrototypeOf) {
        return Object.getPrototypeOf(value)
    } else if (value.__proto__) {
        return value.__proto__
    } else if (value.constructor) {
        return value.constructor.prototype
    }
}
