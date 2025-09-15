import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskManagementRoles } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskManagementRoles";
import { IPageITaskManagementTaskManagementRoles } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementTaskManagementRoles";
import { TpmPayload } from "../decorators/payload/TpmPayload";

/**
 * Search and retrieve a filtered, paginated list of TaskManagementRole.
 *
 * This operation provides flexible querying options to search roles by code,
 * name, or description, with pagination and sorting controls.
 *
 * Only authorized TPM users can access this endpoint.
 *
 * @param props - Object containing TPM authentication and request body
 * @param props.tpm - Authenticated TPM payload
 * @param props.body - Search and pagination parameters
 * @returns Paginated list of TaskManagementRoles matching the search criteria
 * @throws {Error} When the database query fails or invalid parameters
 */
export async function patchtaskManagementTpmTaskManagementRoles(props: {
  tpm: TpmPayload;
  body: ITaskManagementTaskManagementRoles.IRequest;
}): Promise<IPageITaskManagementTaskManagementRoles> {
  const { tpm, body } = props;

  // Extract and set default pagination parameters
  const page = body.page ?? 1;
  const limit = body.limit ?? 100;

  const skip = (page - 1) * limit;

  // Prepare search filter
  const search = body.search ?? undefined;

  const whereClause = search
    ? {
        OR: [
          { code: { contains: search } },
          { name: { contains: search } },
          { description: { contains: search } },
        ],
      }
    : undefined;

  // Prepare sorting clause with safe defaults
  const orderByClause = body.sort_by
    ? { [body.sort_by]: body.order_direction === "asc" ? "asc" : "desc" }
    : { created_at: "desc" };

  // Query roles and count total records
  const [roles, total] = await Promise.all([
    MyGlobal.prisma.task_management_roles.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: orderByClause,
    }),
    MyGlobal.prisma.task_management_roles.count({
      where: whereClause,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: roles.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      description: r.description ?? undefined,
      created_at: toISOStringSafe(r.created_at),
      updated_at: toISOStringSafe(r.updated_at),
    })),
  };
}
