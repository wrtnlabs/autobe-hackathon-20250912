import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationOrganizerRequests } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationOrganizerRequests";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieves detailed information for a single event organizer request by its
 * unique ID.
 *
 * This operation is restricted to users with the 'admin' role, ensuring secure
 * access.
 *
 * @param props - The object containing required parameters:
 *
 *   - Admin: The authenticated admin performing the request.
 *   - OrganizerRequestId: The UUID of the organizer request to retrieve.
 *
 * @returns The detailed event organizer request matching the provided ID.
 * @throws {Error} Throws if no organizer request is found with the given ID.
 */
export async function geteventRegistrationAdminOrganizerRequestsOrganizerRequestId(props: {
  admin: AdminPayload;
  organizerRequestId: string & tags.Format<"uuid">;
}): Promise<IEventRegistrationOrganizerRequests> {
  const { organizerRequestId } = props;

  const found =
    await MyGlobal.prisma.event_registration_organizer_requests.findUniqueOrThrow(
      {
        where: { id: organizerRequestId },
      },
    );

  return {
    id: found.id,
    user_id: found.user_id,
    status: found.status,
    reason: found.reason ?? null,
    admin_comment: found.admin_comment ?? null,
    created_at: toISOStringSafe(found.created_at),
    updated_at: toISOStringSafe(found.updated_at),
  };
}
