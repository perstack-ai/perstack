import type { Key } from "ink"
import { Box, Text, useInput } from "ink"
import React from "react"
import { useMemo } from "react"
import { INDICATOR, UI_CONSTANTS } from "../constants.js"
import { useListNavigation } from "../hooks/index.js"

type ListBrowserProps<T> = {
  title: string
  items: T[]
  renderItem: (item: T, isSelected: boolean, index: number) => React.ReactNode
  onSelect: (item: T) => void
  emptyMessage?: string
  extraKeyHandler?: (char: string, key: Key, selectedItem: T | undefined) => boolean
  onBack?: () => void
  maxItems?: number
}
export const ListBrowser = <T,>({
  title,
  items,
  renderItem,
  onSelect,
  emptyMessage = "No items found",
  extraKeyHandler,
  onBack,
  maxItems = UI_CONSTANTS.MAX_VISIBLE_LIST_ITEMS,
}: ListBrowserProps<T>) => {
  const { selectedIndex, handleNavigation } = useListNavigation({
    items,
    onSelect,
    onBack,
  })
  useInput((inputChar, key) => {
    if (extraKeyHandler?.(inputChar, key, items[selectedIndex])) return
    handleNavigation(inputChar, key)
  })
  const { scrollOffset, displayItems } = useMemo(() => {
    const offset = Math.max(0, Math.min(selectedIndex - maxItems + 1, items.length - maxItems))
    return {
      scrollOffset: offset,
      displayItems: items.slice(offset, offset + maxItems),
    }
  }, [items, selectedIndex, maxItems])
  const hasMoreAbove = scrollOffset > 0
  const hasMoreBelow = scrollOffset + maxItems < items.length
  return (
    <Box flexDirection="column">
      <Box>
        <Text color="cyan">{title}</Text>
        {items.length > maxItems && (
          <Text color="gray">
            {" "}
            ({selectedIndex + 1}/{items.length})
          </Text>
        )}
      </Box>
      {hasMoreAbove && <Text color="gray">{INDICATOR.ELLIPSIS}</Text>}
      <Box flexDirection="column">
        {displayItems.length === 0 ? (
          <Text color="gray">{emptyMessage}</Text>
        ) : (
          displayItems.map((item, index) => {
            const actualIndex = scrollOffset + index
            return renderItem(item, actualIndex === selectedIndex, actualIndex)
          })
        )}
      </Box>
      {hasMoreBelow && <Text color="gray">{INDICATOR.ELLIPSIS}</Text>}
    </Box>
  )
}
export type { ListBrowserProps }
