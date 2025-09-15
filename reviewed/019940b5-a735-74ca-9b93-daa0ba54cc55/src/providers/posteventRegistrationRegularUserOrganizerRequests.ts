import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationOrganizerRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationOrganizerRequest";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Submit an organizer request by a regular user for admin approval.
 *
 * This operation allows authenticated regular users to create a new organizer
 * request record with status 'pending'. It enforces uniqueness per user and
 * records audit timestamps.
 *
 * @param props - Object containing the authenticated regular user and the
 *   request body
 * @param props.regularUser - The authenticated regular user making the request
 * @param props.body - The event organizer request data provided by the user
 * @returns The newly created event organizer request record
 * @throws {Error} If a duplicate request for the same user already exists
 */
export async function posteventRegistrationRegularUserOrganizerRequests(props: {
  regularUser: RegularuserPayload;
  body: IEventRegistrationOrganizerRequest.ICreate;
}): Promise<IEventRegistrationOrganizerRequest> {
  const { regularUser, body } = props;

  const now = toISOStringSafe(new Date());
  const id = v4() as string & tags.Format<"uuid">;

  try {
    const created =
      await MyGlobal.prisma.event_registration_organizer_requests.create({
        data: {
          id,
          user_id: regularUser.id,
          status: "pending",
          reason: body.reason ?? null,
          admin_comment: body.admin_comment ?? null,
          created_at: now,
          updated_at: now,
        },
      });

    return {
      id: created.id,
      user_id: created.user_id,
      status: created.status as "pending" | "approved" | "rejected",
      reason: created.reason ?? null,
      admin_comment: created.admin_comment ?? null,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
    };
  } catch (error) {
    // Check if error is due to duplicate unique user_id
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      error.meta?.target?.includes("user_id")
    ) {
      throw new Error(
        "Duplicate request: An organizer request for this user already exists",
      );
    }
    throw error;
  }
}
