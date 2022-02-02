# React local storage manager

Easy to use and efficient localStorage wrapper to use in React

When reading value from localStorage:

- decodes it with JSON.parse
- validates it with provided function
- validation function can transform value if needed
- stores value in memory cache, previous steps won't be ever executed second time without need

Multiple React components will be kept in sync, localStorage values are synchronized between browser tabs

When using it in Next.js on server side it won't throw any errors, it just won't save anything to localStorage as there is no localStorage on server side.

Full TypeScript support!

# Small size

[Full source code](https://github.com/romeerez/react-local-storage-manager/blob/main/src/index.ts) - ~150 lines of code with comments, empty lines, typescript types. After compiling to JS it becomes ~80 lines of code.

# Tested really well

[Fully covered with tests](https://github.com/romeerez/react-local-storage-manager/blob/main/src/index.test.ts) - much more tests than actual code

## Why

Why to have a whole library for localStorage, it seems to simple to do on my own?

- when setting value in one component, this library makes all components which are using the value to re-render
- when setting value in one tab, it be be updated in other browser tabs which are using it
- parsing, encoding and validating json is synchronous operation which may block UI, this library makes sure it happens only when needed, it caches values

In all other solutions there is no mention of how to validate value before using, JSON.parse happens in every component which is using hook.

Alternative libraries and guides does not implement it:

[logrocket blog](https://blog.logrocket.com/using-localstorage-react-hooks/): only one component updated on change, no cache

[react-use-localstorage npm package](https://www.npmjs.com/package/react-use-localstorage): has tab sync, but only one component updated on change, no cache

[usehooks package](https://usehooks.com/useLocalStorage/): only one component updated on change, no cache

[usehooks-ts package](https://usehooks-ts.com/react-hook/use-local-storage): almost good, but no cache, no way to update the value without using it

All articles and other implementations I can find are doing it wrong as well

## Examples

Check out this example on [codesandbox](https://codesandbox.io/s/clever-night-zugq9?file=/src/App.tsx)

Another example use case for 'Cart' with [zod](https://github.com/colinhacks/zod) for validation:

```tsx
// cart.store.ts
import createLocalStore from 'react-local-storage-manager'
import { z } from "zod"

const CartItem = z.object({
  id: z.number(),
  quantity: z.number(),
})

type CartItem = z.infer<typeof CartItem>

const CartItems = z.array(CartItem)

const store = createLocalStore(
  'cart', // localStorage key
  (data) => CartItems.parse(data), // validation function must return valid value or throw error
  [] // default value (optional)
)

export const useCartItems = store.use

export const addItemToCart = (item: CartItem) => {
  // set can accept data or a callback, just as useState setter
  store.set(items => [...items, item])
}

export const removeItemFromCart = (itemId: CartItem['id']) => {
  store.set(items => items.filter(item => item.id !== itemId))
}

// Product.tsx
import { useCartItems, addItemToCart, removeItemFromCart } from './cart.store.ts'

export const Product = (item: SomeProduct) => {
  const isAdded = useCartItems().some(added => added.id === item)
  
  const addToCart = () => {
    addItemToCart({ id: item.id, quantity: 1 })
  }
  
  const removeFromCart = () => {
    removeItemFromCart(item.id)
  }
  
  return (
    <div>
      ...product info
      <button
        type='button'
        onClick={addToCart}
        disabled={isAdded}
      >
        Add to Cart
      </button>
      <button
        type='button'
        onClick={removeFromCart}
        disabled={!isAdded}
      >
        Remove from Cart
      </button>
    </div>
  )
}
```

In this example we are storing only `id` and `quantity` because it's a good idea to store minimal info possible.

If we stored product name as well, product photos, this info can become stale, better to store id only and fetch fresh info from the API.

In addition, localStorage has limits, allowed size depends on browser.

## API overview

```ts
import createLocalStore from 'react-local-storage-manager'

// without default value can be `undefined`
const store = createLocalStore('key', validator)

// with default value won't ever be `undefined`
const store2 = createLocalStore('key', validator, defaultValue)
```

When invoked with 2 arguments value can be `undefined`, and when invoked with 3 arguments value will always have type of what is returned by validator function.

If validator function throws, the store will use defaultValue if provided or value will be `undefined`.

Store methods:

- **read** no need to use this method, it's exposed just in case

- **get** reads a value only once and then gets value from cache

- **set** saves a value to localStorage, to cache, accepts data or a callback which returns data

- **remove** calls localStorage.removeItem, sets cache to default value or undefined

- **watch** accepts event listener to watch for updates, returns function to clear event listener

- **use** React hook to use the value

- **destroy** removes event listeners of the store which were set implicitly when creating a store
