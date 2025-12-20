import { type MutableRefObject, useInsertionEffect, useRef } from "react"

export const useLatestRef = <T>(value: T): MutableRefObject<T> => {
  const ref = useRef(value)
  useInsertionEffect(() => {
    ref.current = value
  })
  return ref
}
