import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeCustomScripts } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeCustomScripts";
import { IPageIFlexOfficeCustomScript } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeCustomScript";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Search and list FlexOffice custom scripts with filtering, sorting, and
 * pagination.
 *
 * Retrieves a paginated list of custom logic scripts in the
 * flex_office_custom_scripts table. Supports filtering by search keyword and
 * script language, sorting, and pagination. Only includes non-deleted scripts
 * (deleted_at is null).
 *
 * @param props - Object containing the authenticated editor and search/filter
 *   parameters
 * @param props.editor - Authenticated editor payload
 * @param props.body - Search and pagination request parameters conforming to
 *   IFlexOfficeCustomScripts.IRequest
 * @returns A paginated list of FlexOffice custom script summaries conforming to
 *   IPageIFlexOfficeCustomScript.ISummary
 * @throws Will throw if database query fails or parameters are invalid
 */
export async function patchflexOfficeEditorCustomScripts(props: {
  editor: EditorPayload;
  body: IFlexOfficeCustomScripts.IRequest;
}): Promise<IPageIFlexOfficeCustomScript.ISummary> {
  const { editor, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  // Build filter conditions
  const whereConditions = {
    deleted_at: null,
    ...(body.script_language !== undefined && body.script_language !== null
      ? { script_language: body.script_language }
      : {}),
    ...(body.search !== undefined && body.search !== null
      ? {
          OR: [
            { code: { contains: body.search } },
            { name: { contains: body.search } },
            { description: { contains: body.search } },
          ],
        }
      : {}),
  };

  // Determine sorting field and direction
  const orderField =
    body.sort === "code" ||
    body.sort === "name" ||
    body.sort === "script_language" ||
    body.sort === "created_at"
      ? body.sort
      : "created_at";
  const orderDirection =
    body.direction === "asc" || body.direction === "desc"
      ? body.direction
      : "desc";

  // Execute database queries concurrently
  const [results, total] = await Promise.all([
    MyGlobal.prisma.flex_office_custom_scripts.findMany({
      where: whereConditions,
      orderBy: { [orderField]: orderDirection },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.flex_office_custom_scripts.count({
      where: whereConditions,
    }),
  ]);

  // Map results to the summary response format
  const data = results.map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    description: r.description ?? null,
    script_language: r.script_language,
    created_at: toISOStringSafe(r.created_at),
  }));

  // Return paginated summaries
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
