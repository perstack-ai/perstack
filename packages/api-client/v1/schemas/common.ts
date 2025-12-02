import { z } from "zod"

export const apiRuntimeVersionSchema = z.enum(["v1.0"])
