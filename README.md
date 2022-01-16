# React local storage manager

Easy to use and efficient localStorage wrapper to use in React

When reading value from localStorage:

- decodes it with JSON.parse
- validates it with provided function
- validation function can transform value if needed
- stores value in memory cache, previous steps won't be ever executed second time without need

Multiple React components will be kept in sync, localStorage values are synchronized between browser tabs

Check out this example on [codepen](https://codesandbox.io/s/clever-night-zugq9?file=/src/App.tsx)

Another example use case for 'Cart' with [zod](https://github.com/colinhacks/zod) for validation:

```tsx
// cart.store.ts
import { createLocalStorageManager } from 'react-local-storage-manager'
import { z } from "zod"

const CartItem = z.object({
  id: z.number(),
  quantity: z.number(),
})

type CartItem = z.infer<typeof CartItem>

const CartItems = z.array(CartItem)

const store = createLocalStorageManager(
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
import { createLocalStorageManager } from 'react-local-storage-manager'

// without default value can be `undefined`
const store = createLocalStorageManager('key', validator)

// with default value won't ever be `undefined`
const store2 = createLocalStorageManager('key', validator, defaultValue)
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
