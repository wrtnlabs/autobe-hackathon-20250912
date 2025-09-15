import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeMarketplaceWidget } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeMarketplaceWidget";
import { IPageIFlexOfficeMarketplaceWidget } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeMarketplaceWidget";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Retrieves a paginated list of marketplace widgets available in the
 * Extensibility module.
 *
 * Supports complex search, filtering, sorting, and pagination through
 * structured request body. Only authorized editors may access this endpoint.
 *
 * @param props - Object containing the authenticated editor and request body
 * @param props.editor - Authenticated editor payload
 * @param props.body - Request body with search, pagination, and sorting
 *   parameters
 * @returns Paginated list of marketplace widget summaries
 * @throws {Error} On unexpected errors during data fetching
 */
export async function patchflexOfficeEditorMarketplaceWidgets(props: {
  editor: EditorPayload;
  body: IFlexOfficeMarketplaceWidget.IRequest;
}): Promise<IPageIFlexOfficeMarketplaceWidget.ISummary> {
  const { editor, body } = props;

  // Pagination parameters with default values
  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 10);

  // Validate sortBy - allow only 'name' or 'created_at', default 'created_at'
  const allowedSortBy = ["name", "created_at"];
  const sortBy =
    typeof body.sortBy === "string" && allowedSortBy.includes(body.sortBy)
      ? body.sortBy
      : "created_at";

  // Validate sortDir - allow only 'asc' or 'desc', default 'desc'
  const sortDir =
    body.sortDir === "asc" || body.sortDir === "desc" ? body.sortDir : "desc";

  // Construct where clause, excluding soft deleted
  const where: Record<string, unknown> = { deleted_at: null };

  // Apply search filter across multiple fields if search is provided
  if (body.search !== undefined && body.search !== null) {
    where.OR = [
      { name: { contains: body.search } },
      { widget_code: { contains: body.search } },
      { version: { contains: body.search } },
      { description: { contains: body.search } },
    ];
  }

  // Parallel fetching of data and count
  const [widgets, total] = await Promise.all([
    MyGlobal.prisma.flex_office_marketplace_widgets.findMany({
      where,
      orderBy: { [sortBy]: sortDir },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        widget_code: true,
        name: true,
        version: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.flex_office_marketplace_widgets.count({ where }),
  ]);

  // Compose return object with proper date conversion and plain numbers
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: widgets.map((w) => ({
      id: w.id,
      widget_code: w.widget_code,
      name: w.name,
      version: w.version,
      created_at: toISOStringSafe(w.created_at),
    })),
  };
}
