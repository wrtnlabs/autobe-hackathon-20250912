import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeWidgetScript } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeWidgetScript";
import { IPageIFlexOfficeWidgetScript } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeWidgetScript";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * List widget scripts for a widget with pagination and filtering
 *
 * Retrieve a paginated and filtered list of scripts associated with the widget
 * identified by widgetId. Supports comprehensive filtering, sorting, and
 * pagination capabilities.
 *
 * Security enforcement ensures only authorized editors can access the widget's
 * scripts.
 *
 * @param props - Object containing editor auth info, widgetId path param, and
 *   request body with filtering and pagination
 * @param props.editor - Authenticated editor payload
 * @param props.widgetId - UUID of the target widget
 * @param props.body - Filtering, pagination, and sorting criteria
 * @returns Paginated list of widget script summaries
 * @throws {Error} When pagination parameters are invalid
 * @throws {Error} When the widget does not exist or is soft deleted
 */
export async function patchflexOfficeEditorWidgetsWidgetIdScripts(props: {
  editor: EditorPayload;
  widgetId: string & tags.Format<"uuid">;
  body: IFlexOfficeWidgetScript.IRequest;
}): Promise<IPageIFlexOfficeWidgetScript.ISummary> {
  const { editor, widgetId, body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;

  if (page < 1) throw new Error("Page must be greater than 0");
  if (limit < 1) throw new Error("Limit must be greater than 0");

  // Verify widget existence
  const widget = await MyGlobal.prisma.flex_office_widgets.findFirst({
    where: { id: widgetId, deleted_at: null },
  });
  if (!widget) throw new Error("Widget not found or deleted");

  // Build where condition
  const where: Record<string, unknown> = {
    flex_office_widget_id: widgetId,
    deleted_at: null,
  };

  // Parse filter string if present
  if (body.filter) {
    const filterParts = body.filter.split("=");
    if (filterParts.length === 2) {
      const [key, value] = filterParts;
      if (key === "script_type" && value) {
        where.script_type = value;
      }
    }
  }

  // Determine orderBy
  const orderBy: Record<string, "asc" | "desc"> = {};
  const sortBy = body.sortBy ?? "created_at";
  const order = body.order ?? "desc";

  if (["created_at", "updated_at", "script_type"].includes(sortBy)) {
    orderBy[sortBy] = order === "asc" ? "asc" : "desc";
  } else {
    orderBy["created_at"] = "desc";
  }

  // Calculate skip
  const skip = (page - 1) * limit;

  // Query data and count
  const [data, total] = await Promise.all([
    MyGlobal.prisma.flex_office_widget_scripts.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: { id: true, script_type: true, created_at: true },
    }),
    MyGlobal.prisma.flex_office_widget_scripts.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((d) => ({
      id: d.id,
      script_type: d.script_type,
      created_at: toISOStringSafe(d.created_at),
    })),
  };
}
