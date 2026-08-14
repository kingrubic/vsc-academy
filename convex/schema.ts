import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Document store for the VSC Academy CMS.
 * Each SQLite table becomes `table` + public `id` + row `data` (same field names as the HTML CMS).
 */
export default defineSchema({
  documents: defineTable({
    table: v.string(),
    id: v.string(),
    data: v.any(),
  })
    .index("by_table", ["table"])
    .index("by_table_id", ["table", "id"]),
});
