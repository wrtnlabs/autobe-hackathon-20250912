import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementDesigner } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDesigner";
import { IPageITaskManagementDesigner } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementDesigner";
import { DesignerPayload } from "../decorators/payload/DesignerPayload";

/**
 * Search and retrieve a filtered paginated list of designer users.
 *
 * This operation filters designers by email and name substrings, supports
 * pagination and sorting by 'email' or 'name'. It excludes soft-deleted
 * records.
 *
 * @param props - The properties containing the authenticated designer payload
 *   and the filtering, pagination, and sorting parameters.
 * @param props.designer - The authenticated designer making the request.
 * @param props.body - Filtering and pagination parameters.
 * @returns A paginated summary list of designers matching the criteria.
 * @throws {Error} If page or limit parameters are invalid.
 */
export async function patchtaskManagementDesignerTaskManagementDesigners(props: {
  designer: DesignerPayload;
  body: ITaskManagementDesigner.IRequest;
}): Promise<IPageITaskManagementDesigner.ISummary> {
  const { body } = props;

  // Validate pagination
  if ((body.page ?? 0) < 0) throw new Error("page must be >= 0");
  if ((body.limit ?? 10) < 1) throw new Error("limit must be >= 1");

  const page = body.page ?? 0;
  const limit = body.limit ?? 10;
  const skip = page * limit;

  // Build where clause for filtering
  const where = {
    deleted_at: null,
    ...(body.email !== undefined &&
      body.email !== null && {
        email: { contains: body.email },
      }),
    ...(body.name !== undefined &&
      body.name !== null && {
        name: { contains: body.name },
      }),
  };

  // Run simultaneous queries to fetch data and total count
  const [results, total] = await Promise.all([
    MyGlobal.prisma.task_management_designer.findMany({
      where,
      orderBy:
        body.sort === "email"
          ? { email: body.order === "asc" ? "asc" : "desc" }
          : body.sort === "name"
            ? { name: body.order === "asc" ? "asc" : "desc" }
            : { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.task_management_designer.count({ where }),
  ]);

  // Map to summary DTO
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((designer) => ({
      id: designer.id,
      email: designer.email,
      name: designer.name,
    })),
  };
}
