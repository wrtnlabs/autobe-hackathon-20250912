import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationEventCapacityOverride } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventCapacityOverride";
import { IPageIEventRegistrationEventCapacityOverride } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEventRegistrationEventCapacityOverride";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Returns a paginated list of event capacity override records matching provided
 * search criteria.
 *
 * Supports filtering by event ID and override flag status.
 *
 * Only users with the admin role can access this endpoint.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin user
 * @param props.body - Filters and pagination parameters
 * @returns A paginated list of matching event capacity overrides
 * @throws {Error} When database access fails or invalid parameters
 */
export async function patcheventRegistrationAdminEventCapacityOverrides(props: {
  admin: AdminPayload;
  body: IEventRegistrationEventCapacityOverride.IRequest;
}): Promise<IPageIEventRegistrationEventCapacityOverride> {
  const { admin, body } = props;

  // Set pagination defaults and remove branding with double assertion
  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const limit = (body.limit ?? 100) as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const skip = (page - 1) * limit;

  // Build where condition with safe null checks
  const where: Record<string, unknown> = {};

  if (body.event_id !== undefined && body.event_id !== null) {
    where.event_id = body.event_id;
  }

  if (
    body.is_override_enabled !== undefined &&
    body.is_override_enabled !== null
  ) {
    where.is_override_enabled = body.is_override_enabled;
  }

  // Perform concurrent queries for results and total count
  const [results, total] = await Promise.all([
    MyGlobal.prisma.event_registration_event_capacity_overrides.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.event_registration_event_capacity_overrides.count({
      where,
    }),
  ]);

  // Map results and convert Date fields to ISO strings
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((override) => ({
      id: override.id,
      event_id: override.event_id,
      is_override_enabled: override.is_override_enabled,
      created_at: toISOStringSafe(override.created_at),
      updated_at: toISOStringSafe(override.updated_at),
    })),
  };
}
