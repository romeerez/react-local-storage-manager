import { createLocalStorageManager, localStorageChangeEventName } from "./index";

const parseNumber = jest.fn((x): number => {
  const result = Number(x)
  if (isNaN(result)) throw new Error('Value is not a number')
  return result
})

const getItemSpy = jest.spyOn(Storage.prototype, 'getItem')
const removeItemSpy = jest.spyOn(Storage.prototype, 'removeItem')
const jsonParseSpy = jest.spyOn(JSON, 'parse')
const addEventListenerSpy = jest.spyOn(window, 'addEventListener')
const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener')

beforeEach(() => {
  localStorage.clear()
  jest.clearAllMocks()
})

describe('lib', () => {
  describe('.createLocalStorageManager', () => {
    it("should create store which expose all what's needed", () => {
      const store = createLocalStorageManager('key', (x) => x, 123)
      expect(Object.keys(store)).toEqual([
        'read',
        'get',
        'set',
        'remove',
        'watch',
        'use',
      ])
    })
  })

  describe('.read reads value from localStorage', () => {
    describe('when no value in localStorage', () => {
      it('should return undefined if no default', () => {
        const store = createLocalStorageManager('key', parseNumber)

        const result = store.read()

        expect(getItemSpy).toBeCalled()
        expect(jsonParseSpy).not.toBeCalled()
        expect(parseNumber).not.toBeCalled()
        expect(result).toBe(undefined)
      })

      it('should return default if present', () => {
        const store = createLocalStorageManager('key', parseNumber, 123)

        const result = store.read()

        expect(getItemSpy).toBeCalled()
        expect(jsonParseSpy).not.toBeCalled()
        expect(parseNumber).not.toBeCalled()
        expect(result).toBe(123)
      })
    })

    describe('when localStorage has value', () => {
      it('should parse and validate localStorage value, validator can transform value', () => {
        const value = 1
        const defaultValue = 5
        localStorage.setItem('key', JSON.stringify(value))
        const validator = jest.fn(x => x * 2)
        const store = createLocalStorageManager('key', validator, defaultValue)

        const result = store.read()

        expect(getItemSpy).toBeCalled()
        expect(jsonParseSpy).toBeCalled()
        expect(validator).toBeCalled()
        expect(result).toEqual(value * 2)
      })

      it('should throw if validator fails', () => {
        const value = 'not-a-number'
        localStorage.setItem('key', JSON.stringify(value))
        const store = createLocalStorageManager('key', parseNumber)

        expect(store.read).toThrow()

        expect(getItemSpy).toBeCalled()
        expect(jsonParseSpy).toBeCalled()
        expect(parseNumber).toBeCalled()
      })
    })
  })

  describe('.get reads a value only once and then is getting value from cache', () => {
    describe('when no value in localStorage', () => {
      it('should return undefined when no default', () => {
        const store = createLocalStorageManager('key', parseNumber)
        const readSpy = jest.spyOn(store, 'read')

        const result = store.get()

        expect(readSpy).toBeCalled()
        expect(result).toBe(undefined)
      })

      it('should return default when provided', () => {
        const defaultValue = 123
        const store = createLocalStorageManager('key', parseNumber, 123)
        const readSpy = jest.spyOn(store, 'read')

        const result = store.get()

        expect(readSpy).toBeCalled()
        expect(result).toBe(defaultValue)
      })

      it('should cache absence of value and not read storage second time', () => {
        const store = createLocalStorageManager('key', parseNumber)
        const readSpy = jest.spyOn(store, 'read')

        const result = store.get()

        expect(readSpy).toBeCalled()
        expect(result).toBe(undefined)

        jest.clearAllMocks()

        let secondResult = store.get()

        expect(readSpy).not.toBeCalled()
        expect(secondResult).toBe(undefined)
      })
    })

    describe('when localStorage has value', () => {
      it('should use cached value when calling second time', () => {
        const value = 123
        localStorage.setItem('key', JSON.stringify(value))
        const store = createLocalStorageManager('key', parseNumber)
        const readSpy = jest.spyOn(store, 'read')

        const result = store.get()

        expect(readSpy).toBeCalled()
        expect(result).toBe(value)

        jest.clearAllMocks()

        let secondResult = store.get()

        expect(readSpy).not.toBeCalled()
        expect(secondResult).toBe(value)
      })
    })
  })

  describe('.set', () => {
    it('should save value to localStorage, to cache, dispatch event', () => {
      const newValue = 123
      const store = createLocalStorageManager('key', parseNumber)
      const readSpy = jest.spyOn(store, 'read')

      store.set(newValue)

      expect(localStorage.getItem('key')).toBe(JSON.stringify(newValue))
      expect(store.get()).toBe(newValue)
      expect(readSpy).not.toBeCalled()
    })
  })

  describe('.remove', () => {
    describe('when no default', () => {
      it('removes value from localStorage, sets cache to undefined, dispatches event', () => {
        const store = createLocalStorageManager('key', parseNumber)
        const readSpy = jest.spyOn(store, 'read')

        store.remove()

        expect(removeItemSpy).toBeCalled()
        expect(store.get()).toEqual(undefined)
        expect(readSpy).not.toBeCalled()
      })
    })

    describe('when have default', () => {
      it('removes value from localStorage, sets cache to default, dispatches event', () => {
        const defaultValue = 123
        const store = createLocalStorageManager('key', parseNumber, defaultValue)
        const readSpy = jest.spyOn(store, 'read')

        store.remove()

        expect(removeItemSpy).toBeCalled()
        expect(store.get()).toEqual(defaultValue)
        expect(readSpy).not.toBeCalled()
      })
    })
  })

  describe('.watch', () => {
    it('accepts event listener to watch for custom `localStorageEvent` and native `storage` event', () => {
      const store = createLocalStorageManager('key', parseNumber)
      const listener = jest.fn()

      store.watch(listener)

      expect(addEventListenerSpy).toBeCalledWith(localStorageChangeEventName, expect.any(Function))
      expect(addEventListenerSpy).toBeCalledWith('storage', expect.any(Function))
    })

    it('returns a function to remove event listeners', () => {
      const store = createLocalStorageManager('key', parseNumber)
      const dispose = store.watch(jest.fn())

      dispose()

      expect(removeEventListenerSpy).toBeCalledWith(localStorageChangeEventName, expect.any(Function))
      expect(removeEventListenerSpy).toBeCalledWith('storage', expect.any(Function))
    })

    it('invokes listener when calling .set', () => {
      const store = createLocalStorageManager('key', parseNumber)
      const listener = jest.fn()
      store.watch(listener)

      store.set(123)

      expect(listener).toBeCalledWith(123)
    })

    it('invokes listener when calling .remove, pass default value if set', () => {
      const defaultValue = 123
      const store = createLocalStorageManager('key', parseNumber, defaultValue)
      const listener = jest.fn()
      store.watch(listener)

      store.remove()

      expect(listener).toBeCalledWith(123)
    })

    it('invokes listener when calling .remove, pass undefined if default', () => {
      const store = createLocalStorageManager('key', parseNumber)
      const listener = jest.fn()
      store.watch(listener)

      store.remove()

      expect(listener).toBeCalledWith(undefined)
    })
  })
})