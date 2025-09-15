import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationEventCapacityOverride } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventCapacityOverride";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create capacity override for an event
 *
 * Allows authorized admin users to create a capacity override linked to a
 * specific event by eventId (UUID). The override indicates whether automatic
 * capacity adjustment is enabled or disabled.
 *
 * @param props - Object containing admin authentication, eventId and request
 *   body
 * @param props.admin - Authenticated admin performing the operation
 * @param props.eventId - UUID of the event to create capacity override for
 * @param props.body - Data required to create the capacity override
 *   (is_override_enabled flag)
 * @returns The newly created capacity override record
 * @throws {Error} If creation fails due to database errors or constraints
 */
export async function posteventRegistrationAdminEventsEventIdCapacityOverrides(props: {
  admin: AdminPayload;
  eventId: string & tags.Format<"uuid">;
  body: IEventRegistrationEventCapacityOverride.ICreate;
}): Promise<IEventRegistrationEventCapacityOverride> {
  const { admin, eventId, body } = props;

  const now = toISOStringSafe(new Date());

  const created =
    await MyGlobal.prisma.event_registration_event_capacity_overrides.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        event_id: body.event_id,
        is_override_enabled: body.is_override_enabled,
        created_at: now,
        updated_at: now,
      },
    });

  return {
    id: created.id,
    event_id: created.event_id,
    is_override_enabled: created.is_override_enabled,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
