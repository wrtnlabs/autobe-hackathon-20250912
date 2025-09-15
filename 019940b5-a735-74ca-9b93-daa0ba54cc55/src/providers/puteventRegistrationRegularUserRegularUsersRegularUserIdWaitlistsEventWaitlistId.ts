import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationEventWaitlists } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventWaitlists";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Updates a specific event waitlist entry for a regular user.
 *
 * This operation ensures that only the owner of the waitlist entry (matching
 * regularUserId) can update it. The update may include optional fields such as
 * event_id or timestamp corrections.
 *
 * @param props - Object containing the authenticated regular user, path
 *   parameters, and update body
 * @param props.regularUser - The authenticated regular user performing the
 *   update
 * @param props.regularUserId - UUID of the regular user (must match ownership)
 * @param props.eventWaitlistId - UUID of the waitlist entry to update
 * @param props.body - Partial data to update in the waitlist record
 * @returns The updated event waitlist record
 * @throws {Error} Throws if waitlist entry not found or if ownership
 *   verification fails
 */
export async function puteventRegistrationRegularUserRegularUsersRegularUserIdWaitlistsEventWaitlistId(props: {
  regularUser: RegularuserPayload;
  regularUserId: string & tags.Format<"uuid">;
  eventWaitlistId: string & tags.Format<"uuid">;
  body: IEventRegistrationEventWaitlists.IUpdate;
}): Promise<IEventRegistrationEventWaitlists> {
  const { regularUser, regularUserId, eventWaitlistId, body } = props;

  const existing =
    await MyGlobal.prisma.event_registration_event_waitlists.findFirstOrThrow({
      where: {
        id: eventWaitlistId,
        regular_user_id: regularUserId,
      },
    });

  const updated =
    await MyGlobal.prisma.event_registration_event_waitlists.update({
      where: { id: eventWaitlistId },
      data: {
        event_id: body.event_id ?? undefined,
        regular_user_id: body.regular_user_id ?? undefined,
        created_at:
          body.created_at === null ? null : (body.created_at ?? undefined),
        updated_at:
          body.updated_at === null ? null : (body.updated_at ?? undefined),
      },
    });

  return {
    id: updated.id,
    event_id: updated.event_id,
    regular_user_id: updated.regular_user_id,
    created_at: updated.created_at ? toISOStringSafe(updated.created_at) : null,
    updated_at: updated.updated_at ? toISOStringSafe(updated.updated_at) : null,
  };
}
