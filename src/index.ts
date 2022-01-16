import { useEffect, useState } from 'react'

const maybeWindow = typeof window === 'undefined' ? undefined : window

export const localStorageChangeEventName = 'localStorageChange'

export type LocalStorageManager<T> = {
  // reads value from localStorage
  // if value present it returns validated
  // if no value returns defaultValue or undefined
  // doesn't cache the value
  read(): T

  // reads a value only once and then gets value from cache
  get(): T

  // saves a value to localStorage, to cache, dispatches 'localStorageChange' event
  // if argument is a function, it uses .get to pass previous data
  set(data: T | ((data: T) => T)): void

  // removes value from localStorage, sets cache to undefined, dispatches 'localStorageChange' event
  remove(): void

  // accepts event listener to watch for updates
  // returns function to clear event listener
  // subscribes to custom 'localStorageChange' to watch for updates withing a browser tab
  // subscribes to 'storage' event to watch for updates from different browser tabs
  watch(listener: (data: T) => void): () => void

  // React hook to use the value
  use(): T

  // remove event listeners of the store
  destroy(): void
}

export function createLocalStorageManager<T>(
  key: string,
  validate: (data: unknown) => T,
  defaultValue: T,
): LocalStorageManager<T>

export function createLocalStorageManager<T>(
  key: string,
  validate: (data: unknown) => T,
): LocalStorageManager<T | void>

export function createLocalStorageManager<T>(
  key: string,
  validate: (data: unknown) => T,
  defaultValue?: T,
) {
  type Cache = { value?: T | undefined }

  const cache: Cache = {}

  const createLocalEvent = () => {
    return new CustomEvent(localStorageChangeEventName, {
      detail: cache,
    })
  }

  const dispatchChange = () => {
    maybeWindow?.dispatchEvent(createLocalEvent())
  }

  const events = maybeWindow && new maybeWindow.EventTarget()

  const localListener = (event: Event) => {
    const customEvent = event as CustomEvent<Cache>
    if ('value' in customEvent.detail) {
      cache.value = customEvent.detail.value
    } else {
      delete cache.value
    }

    events?.dispatchEvent(createLocalEvent())
  }

  const multiTabListener = () => {
    delete cache.value

    events?.dispatchEvent(createLocalEvent())
  }

  if (maybeWindow) {
    maybeWindow?.addEventListener(localStorageChangeEventName, localListener)
    maybeWindow?.addEventListener('storage', multiTabListener)
  }

  const store = {
    read() {
      if (maybeWindow === undefined) return defaultValue

      const value = maybeWindow.localStorage.getItem(key)
      if (value === null) {
        return defaultValue
      }

      try {
        const parsed = JSON.parse(value)
        return validate(parsed)
      } catch (_) {
        return defaultValue
      }
    },

    get() {
      if (!('value' in cache)) {
        cache.value = store.read()
      }

      return cache.value
    },

    set(data: T | ((data: T | undefined) => T)) {
      const newValue = data instanceof Function ? data(store.get()) : data
      maybeWindow?.localStorage.setItem(key, JSON.stringify(newValue))
      cache.value = newValue
      dispatchChange()
    },

    remove() {
      maybeWindow?.localStorage.removeItem(key)
      cache.value = defaultValue
      dispatchChange()
    },

    watch(listener: (data: T | undefined) => void) {
      const wrappedListener = () => listener(store.get())

      events?.addEventListener(localStorageChangeEventName, wrappedListener)

      return () => {
        events?.removeEventListener(localStorageChangeEventName, wrappedListener)
      }
    },

    use() {
      const [value, setValue] = useState<T | undefined>(store.get)

      useEffect(() => store.watch(setValue), [])

      return value
    },

    destroy() {
      maybeWindow?.removeEventListener(localStorageChangeEventName, localListener)
      maybeWindow?.removeEventListener('storage', multiTabListener)
    },
  }

  return store
}
