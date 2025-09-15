import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeCustomScripts } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeCustomScripts";
import { IPageIFlexOfficeCustomScript } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeCustomScript";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieves a paginated list of FlexOffice custom scripts with filtering,
 * sorting, and pagination.
 *
 * This operation allows an authenticated admin to search and list custom
 * scripts, supporting full-text search across code, name, and description,
 * filtering by script language, pagination, and sorting.
 *
 * @param props - Object containing admin payload and request body filters
 * @param props.admin - Authenticated admin user payload
 * @param props.body - Request body containing search filters and pagination
 * @returns Paginated summary list of custom scripts
 * @throws {Error} When invalid sort field or direction is provided
 */
export async function patchflexOfficeAdminCustomScripts(props: {
  admin: AdminPayload;
  body: IFlexOfficeCustomScripts.IRequest;
}): Promise<IPageIFlexOfficeCustomScript.ISummary> {
  const { admin, body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  const validSortFields = [
    "id",
    "code",
    "name",
    "script_language",
    "created_at",
  ];
  const sortField = body.sort ?? "created_at";
  if (!validSortFields.includes(sortField)) {
    throw new Error(`Invalid sort field: ${sortField}`);
  }

  const direction = body.direction ?? "desc";
  if (direction !== "asc" && direction !== "desc") {
    throw new Error(`Invalid sort direction: ${direction}`);
  }

  const where: any = {
    deleted_at: null,
    ...(body.search !== undefined && body.search !== null
      ? {
          OR: [
            { code: { contains: body.search } },
            { name: { contains: body.search } },
            { description: { contains: body.search } },
          ],
        }
      : {}),
    ...(body.script_language !== undefined && body.script_language !== null
      ? { script_language: body.script_language }
      : {}),
  };

  const [results, total] = await Promise.all([
    MyGlobal.prisma.flex_office_custom_scripts.findMany({
      where,
      orderBy: { [sortField]: direction },
      skip,
      take: limit,
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        script_language: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.flex_office_custom_scripts.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((r) => ({
      id: r.id as string & tags.Format<"uuid">,
      code: r.code,
      name: r.name,
      description: r.description ?? undefined,
      script_language: r.script_language,
      created_at: toISOStringSafe(r.created_at),
    })),
  };
}
