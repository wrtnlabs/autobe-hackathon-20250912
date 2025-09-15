import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerClientSecretRegeneration } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerClientSecretRegeneration";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Get detailed client secret regeneration record by ID
 *
 * Retrieves a single oauth_server_client_secret_regenerations record by its
 * unique ID. Requires an authenticated admin user.
 *
 * @param props - Object containing the authenticated admin and the record ID
 * @param props.admin - Authenticated admin payload
 * @param props.id - UUID of the client secret regeneration record
 * @returns A detailed client secret regeneration record
 * @throws {Error} If no record is found with the given ID
 */
export async function getoauthServerAdminOauthServerClientSecretRegenerationsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IOauthServerClientSecretRegeneration> {
  const { admin, id } = props;

  const record =
    await MyGlobal.prisma.oauth_server_client_secret_regenerations.findUniqueOrThrow(
      {
        where: { id },
      },
    );

  return {
    id: record.id,
    oauth_client_id: record.oauth_client_id,
    admin_id: record.admin_id,
    regenerated_at: toISOStringSafe(record.regenerated_at),
    reason: record.reason === null ? undefined : (record.reason ?? undefined),
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at:
      record.deleted_at === null
        ? null
        : record.deleted_at
          ? toISOStringSafe(record.deleted_at)
          : undefined,
  };
}
