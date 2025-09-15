import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationOrganizerRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationOrganizerRequest";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Admin updates organizer request status and comment.
 *
 * This operation updates the status and administrative comments of an existing
 * organizer request identified by organizerRequestId. It is restricted to admin
 * users authorized to approve or reject organizer requests.
 *
 * @param props - Object containing the authenticated admin user, the organizer
 *   request ID, and the update body
 * @param props.admin - Authenticated admin performing the update
 * @param props.organizerRequestId - UUID of the organizer request to update
 * @param props.body - Request body containing status and optional admin_comment
 * @returns The updated organizer request record with all fields including
 *   timestamps
 * @throws {Error} Throws if the organizer request does not exist
 */
export async function puteventRegistrationAdminOrganizerRequestsOrganizerRequestId(props: {
  admin: AdminPayload;
  organizerRequestId: string & tags.Format<"uuid">;
  body: IEventRegistrationOrganizerRequest.IUpdate;
}): Promise<IEventRegistrationOrganizerRequest> {
  const { admin, organizerRequestId, body } = props;

  // Verify the organizer request exists
  const organizerRequest =
    await MyGlobal.prisma.event_registration_organizer_requests.findUniqueOrThrow(
      {
        where: { id: organizerRequestId },
      },
    );

  // Perform the update; only update fields provided
  const updated =
    await MyGlobal.prisma.event_registration_organizer_requests.update({
      where: { id: organizerRequestId },
      data: {
        status: body.status ?? undefined,
        admin_comment: body.admin_comment ?? undefined,
      },
    });

  return {
    id: updated.id,
    user_id: updated.user_id,
    status: updated.status,
    reason: updated.reason ?? null,
    admin_comment: updated.admin_comment ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
