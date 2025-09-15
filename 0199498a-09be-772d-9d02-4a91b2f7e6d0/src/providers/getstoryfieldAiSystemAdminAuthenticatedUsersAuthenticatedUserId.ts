import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IStoryfieldAiAuthenticatedusers } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiAuthenticatedusers";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve full details for a single authenticated user
 * (storyfield_ai_authenticatedusers).
 *
 * Fetches all registered and audit fields for one authenticated user, as
 * verified via the Spring backend, by unique ID. Only accessible to system
 * administrators for compliance, investigation, and administrative review. The
 * returned object includes all identity, audit, and soft-deletion (deleted_at)
 * status fields.
 *
 * @param props - Function input properties
 * @param props.systemAdmin - Payload for the system admin actor (authorization
 *   already enforced by decorator)
 * @param props.authenticatedUserId - UUID string of the authenticated user to
 *   fetch
 * @returns Full IStoryfieldAiAuthenticatedusers record, including audit
 *   timestamps and soft-delete status
 * @throws {Error} If user does not exist or is fully purged
 */
export async function getstoryfieldAiSystemAdminAuthenticatedUsersAuthenticatedUserId(props: {
  systemAdmin: SystemadminPayload;
  authenticatedUserId: string & tags.Format<"uuid">;
}): Promise<IStoryfieldAiAuthenticatedusers> {
  const result =
    await MyGlobal.prisma.storyfield_ai_authenticatedusers.findUnique({
      where: { id: props.authenticatedUserId },
    });
  if (result === null) {
    throw new Error("Authenticated user not found");
  }
  return {
    id: result.id,
    external_user_id: result.external_user_id,
    email: result.email,
    actor_type: result.actor_type,
    created_at: toISOStringSafe(result.created_at),
    updated_at: toISOStringSafe(result.updated_at),
    deleted_at:
      result.deleted_at !== null && result.deleted_at !== undefined
        ? toISOStringSafe(result.deleted_at)
        : null,
  };
}
