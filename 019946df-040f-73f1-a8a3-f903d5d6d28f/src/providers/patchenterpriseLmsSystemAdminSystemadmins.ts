import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import { IPageIEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsSystemAdmin";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Search and retrieve a filtered, paginated list of system administrators.
 *
 * This endpoint allows systemAdmin role users to query system administrator
 * accounts with filtering by email, status, and full text search among email
 * and names. It supports pagination and sorting.
 *
 * @param props - Object containing the authenticated system admin and the
 *   search request body
 * @param props.systemAdmin - The authenticated system administrator payload
 * @param props.body - Search criteria and pagination parameters
 * @returns Paginated list of system administrator summaries
 * @throws {Error} Throws if database query fails
 */
export async function patchenterpriseLmsSystemAdminSystemadmins(props: {
  systemAdmin: SystemadminPayload;
  body: IEnterpriseLmsSystemAdmin.IRequest;
}): Promise<IPageIEnterpriseLmsSystemAdmin.ISummary> {
  const { body } = props;

  // Set default pagination values
  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 10);
  const skip = (page - 1) * limit;

  // Build the where clause for search and filtering
  const where: {
    deleted_at: null;
    OR?: {
      email?: { contains: string };
      first_name?: { contains: string };
      last_name?: { contains: string };
    }[];
    email?: { contains: string };
    status?: string;
  } = { deleted_at: null };

  if (body.search !== undefined && body.search !== null) {
    where.OR = [
      { email: { contains: body.search } },
      { first_name: { contains: body.search } },
      { last_name: { contains: body.search } },
    ];
  }

  if (body.filterByEmail !== undefined && body.filterByEmail !== null) {
    where.email = { contains: body.filterByEmail };
  }

  if (body.filterByStatus !== undefined && body.filterByStatus !== null) {
    where.status = body.filterByStatus;
  }

  // Determine orderBy based on sort parameter
  const defaultOrderBy = { created_at: "desc" } as const;
  let orderBy: { [key: string]: "asc" | "desc" };
  if (body.sort) {
    const parts = body.sort.trim().split(" ");
    const field = parts[0];
    const order = parts.length > 1 ? parts[1] : "desc";
    const validFields = ["created_at", "email", "status"];
    const validOrders = ["asc", "desc"];
    if (validFields.includes(field) && validOrders.includes(order)) {
      orderBy = { [field]: order };
    } else {
      orderBy = defaultOrderBy;
    }
  } else {
    orderBy = defaultOrderBy;
  }

  // Query the database for matching system administrators
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_systemadmin.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        tenant_id: true,
        email: true,
        first_name: true,
        last_name: true,
        status: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.enterprise_lms_systemadmin.count({ where }),
  ]);

  // Return the paginated response with converted date strings
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data: rows.map((item) => ({
      id: item.id,
      tenant_id: item.tenant_id,
      email: item.email,
      first_name: item.first_name,
      last_name: item.last_name,
      status: item.status,
      created_at: toISOStringSafe(item.created_at),
    })),
  };
}
