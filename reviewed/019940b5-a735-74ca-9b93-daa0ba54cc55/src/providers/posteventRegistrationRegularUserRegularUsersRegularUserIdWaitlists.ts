import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationEventWaitlists } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventWaitlists";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Create a new event waitlist entry for a regular user.
 *
 * This operation associates the regular user with the event's waitlist,
 * enforcing that the authenticated user can only create a waitlist entry for
 * themselves. It generates a unique UUID for the waitlist entry and timestamps
 * for creation and update times. Duplicate waitlist entries per event and user
 * are prevented by database unique constraints.
 *
 * @param props - Contains the authenticated regularUser payload, the user's
 *   UUID, and the waitlist creation data.
 * @param props.regularUser - The authenticated regular user making the request.
 * @param props.regularUserId - The UUID of the regular user for whom the
 *   waitlist entry is created.
 * @param props.body - The creation data, including event_id and optional
 *   timestamps.
 * @returns The created waitlist record with all fields, including timestamps in
 *   ISO string format.
 * @throws {Error} If the authenticated user ID does not match the parameter
 *   user ID.
 */
export async function posteventRegistrationRegularUserRegularUsersRegularUserIdWaitlists(props: {
  regularUser: RegularuserPayload;
  regularUserId: string & tags.Format<"uuid">;
  body: IEventRegistrationEventWaitlists.ICreate;
}): Promise<IEventRegistrationEventWaitlists> {
  // Destructure props
  const { regularUser, regularUserId, body } = props;

  // Authorization check: user can only create own waitlist entries
  if (regularUser.id !== regularUserId) {
    throw new Error(
      "Unauthorized: You can only create waitlist entries for yourself.",
    );
  }

  // Prepare current timestamp as ISO string with branding
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Create the waitlist entry with required fields
  const created =
    await MyGlobal.prisma.event_registration_event_waitlists.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        event_id: body.event_id,
        regular_user_id: regularUserId,
        created_at: body.created_at ?? now,
        updated_at: body.updated_at ?? now,
      },
    });

  // Return the created record, correctly converting Date to string
  return {
    id: created.id,
    event_id: created.event_id,
    regular_user_id: created.regular_user_id,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
