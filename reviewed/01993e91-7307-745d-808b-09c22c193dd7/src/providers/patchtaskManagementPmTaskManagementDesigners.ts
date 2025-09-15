import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementDesigner } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDesigner";
import { IPageITaskManagementDesigner } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementDesigner";
import { PmPayload } from "../decorators/payload/PmPayload";

/**
 * Search and retrieve paginated list of designer users.
 *
 * This endpoint returns a filtered, sorted, and paginated list of designers. It
 * excludes soft deleted designers and supports filtering by email and name with
 * partial match. Pagination supports page number and limit with default values.
 * Sorting supports email or name, ascending or descending order. Requires
 * authentication as a PM user.
 *
 * @param props - Object containing authentication and filtering parameters
 * @param props.pm - Authenticated PM user payload
 * @param props.body - Filtering, sorting and pagination parameters
 * @returns Paginated summary list of designers
 * @throws {Error} When unexpected database errors occur
 */
export async function patchtaskManagementPmTaskManagementDesigners(props: {
  pm: PmPayload;
  body: ITaskManagementDesigner.IRequest;
}): Promise<IPageITaskManagementDesigner.ISummary> {
  const { pm, body } = props;

  // Default pagination values
  const page = body.page ?? 1;
  const limit = body.limit ?? 10;

  // Build where clause for filtering non-deleted designers and optional filters
  const whereClause = {
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

  // Perform queries in parallel: get filtered designers and total count
  const [designers, total] = await Promise.all([
    MyGlobal.prisma.task_management_designer.findMany({
      where: whereClause,
      select: { id: true, email: true, name: true },
      orderBy: body.sort
        ? { [body.sort]: body.order === "desc" ? "desc" : "asc" }
        : { email: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.task_management_designer.count({ where: whereClause }),
  ]);

  // Return paginated summary data with pagination metadata
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: designers.map((d) => ({
      id: d.id,
      email: d.email,
      name: d.name,
    })),
  };
}
