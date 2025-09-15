import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerClientSecretRegeneration } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerClientSecretRegeneration";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a client secret regeneration record.
 *
 * This operation records an event where a client secret was regenerated,
 * including the admin responsible and the reason.
 *
 * Only admins can perform this operation.
 *
 * @param props - Object containing the admin payload and the regeneration
 *   details.
 * @param props.admin - The authenticated admin making the request.
 * @param props.body - The client secret regeneration creation data.
 * @returns The created OAuth server client secret regeneration record.
 * @throws {Error} If the creation operation fails or if authorization is
 *   invalid.
 */
export async function postoauthServerAdminOauthServerClientSecretRegenerations(props: {
  admin: AdminPayload;
  body: IOauthServerClientSecretRegeneration.ICreate;
}): Promise<IOauthServerClientSecretRegeneration> {
  const { admin, body } = props;

  const id = v4() as string & tags.Format<"uuid">;

  const created =
    await MyGlobal.prisma.oauth_server_client_secret_regenerations.create({
      data: {
        id,
        oauth_client_id: body.oauth_client_id,
        admin_id: body.admin_id,
        regenerated_at: toISOStringSafe(body.regenerated_at),
        reason: body.reason ?? null,
      },
    });

  return {
    id: created.id as string & tags.Format<"uuid">,
    oauth_client_id: created.oauth_client_id as string & tags.Format<"uuid">,
    admin_id: created.admin_id as string & tags.Format<"uuid">,
    regenerated_at: toISOStringSafe(created.regenerated_at),
    reason: created.reason ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
