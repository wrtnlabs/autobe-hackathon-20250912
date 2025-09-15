import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IStoryfieldAiAuthenticatedusers } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiAuthenticatedusers";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update an authenticated user's profile or metadata
 * (storyfield_ai_authenticatedusers).
 *
 * This operation allows a system administrator to update core profile fields
 * (email, actor_type, and soft delete/restore) for an authenticated user. All
 * changes update the updated_at audit field and are subject to uniqueness
 * constraints and compliance validation. The function enforces strict access
 * control—only system administrators may invoke it. Attempting to update a
 * non-existent or already-deleted user, or to violate a uniqueness constraint
 * (e.g., duplicate email), will result in an error. All changes are fully
 * auditable. Date/time values are always returned as ISO-8601 strings with
 * proper branding.
 *
 * @param props - Operation parameters
 * @param props.systemAdmin - The authenticated system administrator
 *   (authorization required)
 * @param props.authenticatedUserId - Unique authenticated user UUID to update
 * @param props.body - Updates to apply (only allowed fields: email, actor_type,
 *   deleted_at)
 * @returns The updated user record reflecting changes and audit fields
 * @throws {Error} If user does not exist, is soft-deleted, or uniqueness
 *   constraints are violated
 */
export async function putstoryfieldAiSystemAdminAuthenticatedUsersAuthenticatedUserId(props: {
  systemAdmin: SystemadminPayload;
  authenticatedUserId: string & tags.Format<"uuid">;
  body: IStoryfieldAiAuthenticatedusers.IUpdate;
}): Promise<IStoryfieldAiAuthenticatedusers> {
  const { authenticatedUserId, body } = props;

  // Step 1: Ensure user exists and is not deleted
  const user = await MyGlobal.prisma.storyfield_ai_authenticatedusers.findFirst(
    {
      where: { id: authenticatedUserId, deleted_at: null },
    },
  );
  if (!user) throw new Error("User not found or already deleted");

  // Step 2: Prepare updated_at value as branded ISO8601 string
  const now = toISOStringSafe(new Date());

  // Step 3: Update the allowed fields (do not assign undefined for required fields, only omit if not present)
  let updateData: { [key: string]: unknown } = {
    updated_at: now,
  };
  if (body.email !== undefined) updateData.email = body.email;
  if (body.actor_type !== undefined) updateData.actor_type = body.actor_type;
  if (body.deleted_at !== undefined) updateData.deleted_at = body.deleted_at;

  // Step 4: Attempt the update; surface errors (like unique constraint) as regular errors
  let updated;
  try {
    updated = await MyGlobal.prisma.storyfield_ai_authenticatedusers.update({
      where: { id: authenticatedUserId },
      data: updateData,
    });
  } catch (err) {
    throw new Error((err as Error).message);
  }

  // Step 5: Transform the updated record to DTO
  return {
    id: updated.id,
    external_user_id: updated.external_user_id,
    email: updated.email,
    actor_type: updated.actor_type,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null && updated.deleted_at !== undefined
        ? toISOStringSafe(updated.deleted_at)
        : undefined,
  };
}
