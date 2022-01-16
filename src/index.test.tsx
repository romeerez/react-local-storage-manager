import { render, screen, act } from '@testing-library/react'
import React from 'react'
import '@testing-library/jest-dom'

import { createLocalStorageManager, localStorageChangeEventName } from './index'

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
      const store = createLocalStorageManager('key', parseNumber)
      expect(Object.keys(store)).toEqual([
        'read',
        'get',
        'set',
        'remove',
        'watch',
        'use',
        'destroy',
      ])
    })

    it('subscribes to localStorageChange and storage events once created', () => {
      createLocalStorageManager('key', parseNumber)

      expect(addEventListenerSpy).toBeCalledWith(localStorageChangeEventName, expect.any(Function))
      expect(addEventListenerSpy).toBeCalledWith('storage', expect.any(Function))
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
        const validator = jest.fn((x) => x * 2)
        const store = createLocalStorageManager('key', validator, defaultValue)

        const result = store.read()

        expect(getItemSpy).toBeCalled()
        expect(jsonParseSpy).toBeCalled()
        expect(validator).toBeCalled()
        expect(result).toEqual(value * 2)
      })

      it('should return undefined if validator fails', () => {
        const value = 'not-a-number'
        localStorage.setItem('key', JSON.stringify(value))
        const store = createLocalStorageManager('key', parseNumber)

        const result = store.read()

        expect(result).toBe(undefined)
        expect(getItemSpy).toBeCalled()
        expect(jsonParseSpy).toBeCalled()
        expect(parseNumber).toBeCalled()
      })

      it('should return default value if validator fails and default was provided', () => {
        const value = 'not-a-number'
        localStorage.setItem('key', JSON.stringify(value))
        const store = createLocalStorageManager('key', parseNumber, 123)

        const result = store.read()

        expect(result).toBe(123)
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

        const secondResult = store.get()

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

        const secondResult = store.get()

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

    it('should pass data using .get when function is provided', () => {
      const defaultValue = 123
      const store = createLocalStorageManager('key', parseNumber, defaultValue)
      const getSpy = jest.spyOn(store, 'get')

      store.set((prevValue) => prevValue * 2)

      const expected = defaultValue * 2
      expect(localStorage.getItem('key')).toBe(JSON.stringify(expected))
      expect(store.get()).toBe(expected)
      expect(getSpy).toBeCalled()
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
    it('should invoke listener with value when .set was called', () => {
      const store = createLocalStorageManager('key', parseNumber)
      const listener = jest.fn()
      const newValue = 123

      store.watch(listener)
      store.set(newValue)

      expect(listener).toBeCalledWith(newValue)
    })

    it('should invoke listener with undefined when no default and .remove was called', () => {
      const store = createLocalStorageManager('key', parseNumber)
      const listener = jest.fn()

      store.watch(listener)
      store.remove()

      expect(listener).toBeCalledWith(undefined)
    })

    it('should invoke listener with default when have default and .remove was called', () => {
      const defaultValue = 123
      const store = createLocalStorageManager('key', parseNumber, defaultValue)
      const listener = jest.fn()

      store.watch(listener)
      store.remove()

      expect(listener).toBeCalledWith(defaultValue)
    })

    it('should invoke listener with value when storage event happens', () => {
      const storage = createLocalStorageManager('key', parseNumber)
      const listener = jest.fn()
      storage.watch(listener)

      const newValue = 123
      localStorage.setItem('key', JSON.stringify(newValue))
      window.dispatchEvent(new Event('storage'))

      expect(listener).toBeCalledWith(newValue)
    })

    it('returns a function to remove event listener', () => {
      const store = createLocalStorageManager('key', parseNumber)
      const listener = jest.fn()
      const dispose = store.watch(listener)

      dispose()

      store.set(123)
      store.remove()

      expect(listener).not.toBeCalled()
    })
  })

  describe('.use', () => {
    it('should return undefined when no default', async () => {
      const store = createLocalStorageManager('key', parseNumber)

      const Component = () => {
        const value = store.use()

        return <div data-testid="value">{value ?? 'undefined'}</div>
      }

      render(<Component />)

      const div = await screen.findByTestId('value')
      expect(div).toHaveTextContent('undefined')
    })

    it('should return default value if set', async () => {
      const store = createLocalStorageManager('key', parseNumber, 123)

      const Component = () => {
        const value = store.use()

        return <div data-testid="value">{value ?? 'undefined'}</div>
      }

      render(<Component />)

      const div = await screen.findByTestId('value')
      expect(div).toHaveTextContent('123')
    })

    it('should re-render component when setting new value or storage event happened', async () => {
      const store = createLocalStorageManager('key', parseNumber)
      let renderedTimes = 0

      const Component = () => {
        const value = store.use()
        renderedTimes++

        return <div data-testid="value">{value ?? 'undefined'}</div>
      }

      render(<Component />)

      let div = await screen.findByTestId('value')
      expect(div).toHaveTextContent('undefined')
      expect(renderedTimes).toBe(1)

      act(() => store.set(1))

      div = await screen.findByTestId('value')
      expect(div).toHaveTextContent('1')
      expect(renderedTimes).toBe(2)

      act(() => {
        localStorage.setItem('key', '2')
        window.dispatchEvent(new Event('storage'))
      })

      div = await screen.findByTestId('value')
      expect(div).toHaveTextContent('2')
      expect(renderedTimes).toBe(3)
    })

    it('should not re-render when setting the same value', async () => {
      const store = createLocalStorageManager('key', parseNumber, 123)
      let renderedTimes = 0

      const Component = () => {
        const value = store.use()
        renderedTimes++

        return <div data-testid="value">{value ?? 'undefined'}</div>
      }

      render(<Component />)

      let div = await screen.findByTestId('value')
      expect(div).toHaveTextContent('123')
      expect(renderedTimes).toBe(1)

      act(() => store.set(123))

      div = await screen.findByTestId('value')
      expect(div).toHaveTextContent('123')
      expect(renderedTimes).toBe(1)

      act(() => {
        localStorage.setItem('key', '123')
        window.dispatchEvent(new Event('storage'))
      })

      div = await screen.findByTestId('value')
      expect(div).toHaveTextContent('123')
      expect(renderedTimes).toBe(1)
    })
  })

  describe('.destroy', () => {
    it('should remove event listeners', () => {
      const store = createLocalStorageManager('key', parseNumber)

      store.destroy()

      expect(removeEventListenerSpy).toBeCalledWith(
        localStorageChangeEventName,
        expect.any(Function),
      )
      expect(removeEventListenerSpy).toBeCalledWith('storage', expect.any(Function))
    })
  })
})
