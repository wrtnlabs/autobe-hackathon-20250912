import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficePageEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageEditor";
import { IPageIFlexOfficePageEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficePageEditor";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Searches and retrieves a paginated list of active page editors.
 *
 * This operation returns page editor session summaries with pagination info. It
 * filters out deleted sessions and supports optional filtering by page_id and
 * editor_id.
 *
 * @param props - Object containing admin authentication and search filters
 * @param props.admin - Authenticated admin performing the search
 * @param props.body - Search filters including pagination and optional
 *   page/editor IDs
 * @returns Paginated list of active page editors matching the criteria
 * @throws {Error} If database operations fail or authorization is invalid
 */
export async function patchflexOfficeAdminPageEditors(props: {
  admin: AdminPayload;
  body: IFlexOfficePageEditor.IRequest;
}): Promise<IPageIFlexOfficePageEditor.ISummary> {
  const { admin, body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  const where = {
    deleted_at: null,
    ...(body.page_id !== undefined &&
      body.page_id !== null && { page_id: body.page_id }),
    ...(body.editor_id !== undefined &&
      body.editor_id !== null && { editor_id: body.editor_id }),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.flex_office_page_editors.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: { id: true, page_id: true, editor_id: true },
    }),
    MyGlobal.prisma.flex_office_page_editors.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      page_id: row.page_id,
      editor_id: row.editor_id,
    })),
  };
}
