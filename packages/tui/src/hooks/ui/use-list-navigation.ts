import type { Key } from "ink"
import { useCallback, useEffect, useState } from "react"

type UseListNavigationOptions<T> = {
  items: T[]
  onSelect?: (item: T) => void
  onBack?: () => void
}
type UseListNavigationResult = {
  selectedIndex: number
  handleNavigation: (inputChar: string, key: Key) => boolean
}
export const useListNavigation = <T>(
  options: UseListNavigationOptions<T>,
): UseListNavigationResult => {
  const { items, onSelect, onBack } = options
  const [selectedIndex, setSelectedIndex] = useState(0)
  useEffect(() => {
    if (selectedIndex >= items.length && items.length > 0) {
      setSelectedIndex(items.length - 1)
    }
  }, [items.length, selectedIndex])
  const handleNavigation = useCallback(
    (inputChar: string, key: Key): boolean => {
      if (key.upArrow && items.length > 0) {
        setSelectedIndex((prev) => Math.max(0, prev - 1))
        return true
      }
      if (key.downArrow && items.length > 0) {
        setSelectedIndex((prev) => Math.min(items.length - 1, prev + 1))
        return true
      }
      if (key.return && items[selectedIndex]) {
        onSelect?.(items[selectedIndex])
        return true
      }
      if ((key.escape || inputChar === "b") && onBack) {
        onBack()
        return true
      }
      return false
    },
    [items, selectedIndex, onSelect, onBack],
  )
  return { selectedIndex, handleNavigation }
}
