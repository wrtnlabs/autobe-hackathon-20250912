import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficePageVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageVersion";
import { IPageIFlexOfficePageVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficePageVersion";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Searches and retrieves a paginated list of UI page version summaries for a
 * specified page.
 *
 * This operation supports filtering by version number(s), creation date range,
 * and page data content. It returns pagination info along with a list of
 * version summaries including id, version_number, and creation timestamp.
 *
 * Only authenticated editors or admins are authorized to view versions for
 * collaboration and auditing purposes.
 *
 * @param props - Object containing authentication information, path parameter,
 *   and request body filters.
 * @param props.editor - Authenticated editor payload making the request.
 * @param props.pageId - UUID of the UI page whose versions are queried.
 * @param props.body - Request body containing filter and pagination criteria.
 * @returns Paginated summary list of page versions matching the filter
 *   criteria.
 * @throws {Error} When database query fails or invalid input is provided.
 */
export async function patchflexOfficeEditorPagesPageIdVersions(props: {
  editor: EditorPayload;
  pageId: string & tags.Format<"uuid">;
  body: IFlexOfficePageVersion.IRequest;
}): Promise<IPageIFlexOfficePageVersion.ISummary> {
  const { editor, pageId, body } = props;

  const where = {
    flex_office_page_id: pageId,
    ...(body.version_number !== undefined &&
      body.version_number !== null && {
        version_number: body.version_number,
      }),
    ...(body.version_numbers !== undefined &&
      body.version_numbers !== null && {
        version_number: {
          in: body.version_numbers,
        },
      }),
    ...((body.created_at_gte !== undefined && body.created_at_gte !== null) ||
    (body.created_at_lte !== undefined && body.created_at_lte !== null)
      ? {
          created_at: {
            ...(body.created_at_gte !== undefined &&
              body.created_at_gte !== null && {
                gte: body.created_at_gte,
              }),
            ...(body.created_at_lte !== undefined &&
              body.created_at_lte !== null && {
                lte: body.created_at_lte,
              }),
          },
        }
      : {}),
    ...(body.page_data_contains !== undefined &&
      body.page_data_contains !== null && {
        page_data: {
          contains: body.page_data_contains,
        },
      }),
  };

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  const orderBy =
    body.sortBy === "version_number"
      ? { version_number: "desc" }
      : body.sortBy === "created_at"
        ? { created_at: "desc" }
        : { version_number: "desc" };

  const [results, total] = await Promise.all([
    MyGlobal.prisma.flex_office_page_versions.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.flex_office_page_versions.count({ where }),
  ]);

  const data = results.map((record) => ({
    id: record.id,
    version_number: record.version_number,
    created_at: toISOStringSafe(record.created_at),
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
