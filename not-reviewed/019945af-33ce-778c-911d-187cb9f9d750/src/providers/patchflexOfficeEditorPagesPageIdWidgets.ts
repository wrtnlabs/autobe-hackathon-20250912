import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeWidget } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeWidget";
import { IPageIFlexOfficeWidget } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeWidget";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Retrieve a paginated list of UI widgets associated with a specific page.
 *
 * This operation supports filtering by widget_type, name, and soft deletion
 * status. Pagination and sorting are supported to manage large data sets.
 *
 * Only users with role 'editor' or 'admin' can access this data.
 *
 * @param props - Object containing editor authentication, page ID, and request
 *   body with filters
 * @param props.editor - Authenticated editor user payload
 * @param props.pageId - UUID of the page for which widgets are retrieved
 * @param props.body - Request body specifying filters, pagination, and sorting
 * @returns Paginated summary of widgets matching the criteria
 * @throws {Error} Throws if data fetching fails
 */
export async function patchflexOfficeEditorPagesPageIdWidgets(props: {
  editor: EditorPayload;
  pageId: string & tags.Format<"uuid">;
  body: IFlexOfficeWidget.IRequest;
}): Promise<IPageIFlexOfficeWidget.ISummary> {
  const { editor, pageId, body } = props;

  // Determine the page ID to filter on, prefer body.page_id if provided
  const pageIdFilter =
    body.page_id !== undefined && body.page_id !== null ? body.page_id : pageId;

  // Construct Prisma where condition
  const where = {
    flex_office_page_id: pageIdFilter,
    ...(body.widget_type !== undefined &&
      body.widget_type !== null && {
        widget_type: { contains: body.widget_type },
      }),
    ...(body.name !== undefined &&
      body.name !== null && {
        name: { contains: body.name },
      }),
    ...(body.deleted_at === true
      ? { deleted_at: { not: null } }
      : body.deleted_at === false
        ? { deleted_at: null }
        : {}),
  };

  // Apply pagination defaults
  const page = (body.page ?? 1) as number & tags.Type<"int32">;
  const limit = (body.limit ?? 10) as number & tags.Type<"int32">;
  const skip = (page - 1) * limit;

  // Determine sorting order
  const orderBy =
    body.orderBy && Object.keys(body.orderBy).length > 0
      ? body.orderBy
      : { created_at: "desc" as "desc" };

  // Fetch widgets data and total count concurrently
  const [widgets, total] = await Promise.all([
    MyGlobal.prisma.flex_office_widgets.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        widget_type: true,
        name: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.flex_office_widgets.count({ where }),
  ]);

  // Map data to API return structure with date conversion
  const data = widgets.map((widget) => ({
    id: widget.id,
    widget_type: widget.widget_type,
    name: widget.name,
    created_at: toISOStringSafe(widget.created_at),
    updated_at: toISOStringSafe(widget.updated_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
