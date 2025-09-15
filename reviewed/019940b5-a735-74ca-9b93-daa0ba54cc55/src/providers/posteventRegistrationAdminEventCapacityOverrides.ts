import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationEventCapacityOverride } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventCapacityOverride";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new event capacity override record.
 *
 * This operation creates a new event capacity override record, linking to a
 * specific event ID and setting the flag to enable or disable automatic
 * capacity adjustments.
 *
 * Accessible only by admins.
 *
 * @param props - Object containing the admin user payload and the request body
 * @param props.admin - The authenticated admin performing the operation
 * @param props.body - The request body containing event_id and
 *   is_override_enabled flag
 * @returns The newly created event capacity override record including audit
 *   timestamps
 * @throws {Error} Throws if the Prisma create operation fails
 */
export async function posteventRegistrationAdminEventCapacityOverrides(props: {
  admin: AdminPayload;
  body: IEventRegistrationEventCapacityOverride.ICreate;
}): Promise<IEventRegistrationEventCapacityOverride> {
  const { admin, body } = props;

  // Generate current timestamp as ISO string
  const now = toISOStringSafe(new Date());

  // Generate a new UUID for the primary key
  const id = v4() as string & tags.Format<"uuid">;

  // Create the new event capacity override record in the database
  const created =
    await MyGlobal.prisma.event_registration_event_capacity_overrides.create({
      data: {
        id,
        event_id: body.event_id,
        is_override_enabled: body.is_override_enabled,
        created_at: now,
        updated_at: now,
      },
    });

  // Return the created record with date fields converted to ISO strings
  return {
    id: created.id,
    event_id: created.event_id,
    is_override_enabled: created.is_override_enabled,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
