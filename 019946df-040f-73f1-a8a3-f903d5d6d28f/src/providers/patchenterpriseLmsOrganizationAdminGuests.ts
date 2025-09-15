import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsGuest";
import { IPageIEnterpriseLmsGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsGuest";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Retrieves a paginated list of guest users filtered by optional criteria.
 *
 * This operation is scoped to the tenant of the authenticated organization
 * admin. It supports pagination, filtering by status and search terms, and
 * sorting. Only guest users not soft-deleted (deleted_at null) are included.
 *
 * @param props - The request parameters including authorization payload and
 *   filters.
 * @param props.organizationAdmin - The authenticated organization admin
 *   payload.
 * @param props.body - The filter, pagination, and sorting criteria.
 * @returns A paginated summary list of guest users belonging to the admin's
 *   tenant.
 * @throws {Error} When pagination parameters are invalid.
 */
export async function patchenterpriseLmsOrganizationAdminGuests(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IEnterpriseLmsGuest.IRequest;
}): Promise<IPageIEnterpriseLmsGuest.ISummary> {
  const { organizationAdmin, body } = props;

  const page = body.page ?? 1;
  if (page < 1) throw new Error("Page number must be at least 1");

  const limit = body.limit ?? 100;
  if (limit < 1) throw new Error("Limit must be at least 1");

  const skip = (page - 1) * limit;

  const where: {
    tenant_id: string & tags.Format<"uuid">;
    deleted_at: null;
    status?: string;
    OR?: {
      email?: { contains: string };
      first_name?: { contains: string };
      last_name?: { contains: string };
    }[];
  } = {
    tenant_id: organizationAdmin.id,
    deleted_at: null,
  };

  if (body.status !== undefined && body.status !== null) {
    where.status = body.status;
  }

  if (body.search !== undefined && body.search !== null) {
    where.OR = [
      { email: { contains: body.search } },
      { first_name: { contains: body.search } },
      { last_name: { contains: body.search } },
    ];
  }

  const allowedSortFields = new Set([
    "email",
    "first_name",
    "last_name",
    "status",
    "created_at",
  ]);
  const orderBy =
    body.sort !== undefined && body.sort !== null
      ? (() => {
          const [field, order] = body.sort.split(" ");
          const lowerOrder = order?.toLowerCase();
          if (!allowedSortFields.has(field)) return { created_at: "desc" };
          if (lowerOrder !== "asc" && lowerOrder !== "desc")
            return { created_at: "desc" };
          return { [field]: lowerOrder };
        })()
      : { created_at: "desc" };

  const [guests, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_guest.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.enterprise_lms_guest.count({ where }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: guests.map((guest) => ({
      id: guest.id,
      email: guest.email,
      first_name: guest.first_name,
      last_name: guest.last_name,
      status: guest.status,
    })),
  };
}
