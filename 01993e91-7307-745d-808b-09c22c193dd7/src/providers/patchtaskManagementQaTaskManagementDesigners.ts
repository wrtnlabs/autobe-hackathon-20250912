import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementDesigner } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDesigner";
import { IPageITaskManagementDesigner } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementDesigner";
import { QaPayload } from "../decorators/payload/QaPayload";

/**
 * Search and retrieve a paginated list of designer users for QA role.
 *
 * This function filters designers by email and name using partial match,
 * excludes soft deleted users (deleted_at != null), supports pagination and
 * sorting, and returns summary data optimized for lists.
 *
 * Authentication via QA role is required.
 *
 * @param props - Object containing the QA user and the request filters.
 * @param props.qa - QA authenticated user payload.
 * @param props.body - Filtering, sorting, and pagination request parameters.
 * @returns Paginated designer summaries with pagination metadata.
 * @throws {Error} Propagates any database or unexpected errors.
 */
export async function patchtaskManagementQaTaskManagementDesigners(props: {
  qa: QaPayload;
  body: ITaskManagementDesigner.IRequest;
}): Promise<IPageITaskManagementDesigner.ISummary> {
  const { qa, body } = props;

  // Pagination defaults
  const page = body.page ?? 0;
  const limit = body.limit ?? 10;

  // Build where clause filtering non-deleted and partial matches
  const where: {
    deleted_at: null;
    email?: { contains: string };
    name?: { contains: string };
  } = {
    deleted_at: null,
  };

  if (body.email !== undefined && body.email !== null) {
    where.email = { contains: body.email };
  }

  if (body.name !== undefined && body.name !== null) {
    where.name = { contains: body.name };
  }

  // Determine orderBy clause
  const orderBy:
    | { email: "asc" | "desc" }
    | { name: "asc" | "desc" }
    | { created_at: "desc" } =
    body.sort === "email"
      ? { email: body.order === "asc" ? "asc" : "desc" }
      : body.sort === "name"
        ? { name: body.order === "asc" ? "asc" : "desc" }
        : { created_at: "desc" };

  // Fetch data and count concurrently
  const [designers, total] = await Promise.all([
    MyGlobal.prisma.task_management_designer.findMany({
      where,
      orderBy,
      skip: page * limit,
      take: limit,
      select: {
        id: true,
        email: true,
        name: true,
      },
    }),
    MyGlobal.prisma.task_management_designer.count({ where }),
  ]);

  // Return paginated results
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
