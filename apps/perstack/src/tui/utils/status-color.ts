type StatusColor = "green" | "yellow" | "red"
export const getStatusColor = (status: string): StatusColor | undefined => {
  switch (status) {
    case "available":
      return "green"
    case "deprecated":
      return "yellow"
    case "disabled":
      return "red"
    default:
      return undefined
  }
}
