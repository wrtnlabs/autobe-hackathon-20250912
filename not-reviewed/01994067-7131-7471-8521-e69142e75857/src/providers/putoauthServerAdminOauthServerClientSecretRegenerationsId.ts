import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerClientSecretRegeneration } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerClientSecretRegeneration";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update a client secret regeneration record.
 *
 * This operation updates an existing client secret regeneration record in the
 * OAuth server system's admin domain. It allows modification of mutable fields
 * such as the 'reason' while preserving other data integrity.
 *
 * @param props - Object containing the authenticated admin, record ID, and
 *   update body
 * @param props.admin - Authenticated admin performing the update
 * @param props.id - UUID of the client secret regeneration record to update
 * @param props.body - Update data including the 'reason' field
 * @returns The updated client secret regeneration record
 * @throws {Error} If the record does not exist
 */
export async function putoauthServerAdminOauthServerClientSecretRegenerationsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
  body: IOauthServerClientSecretRegeneration.IUpdate;
}): Promise<IOauthServerClientSecretRegeneration> {
  const { admin, id, body } = props;

  // Ensure the record exists
  const existingRecord =
    await MyGlobal.prisma.oauth_server_client_secret_regenerations.findUniqueOrThrow(
      {
        where: { id },
      },
    );

  // Update the 'reason' and the 'updated_at' timestamp to current timestamp
  const updated =
    await MyGlobal.prisma.oauth_server_client_secret_regenerations.update({
      where: { id },
      data: {
        reason: body.reason ?? null,
        updated_at: toISOStringSafe(new Date()),
      },
    });

  // Map and return updated record with date strings
  return {
    id: updated.id,
    oauth_client_id: updated.oauth_client_id,
    admin_id: updated.admin_id,
    regenerated_at: toISOStringSafe(updated.regenerated_at),
    reason: updated.reason ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
