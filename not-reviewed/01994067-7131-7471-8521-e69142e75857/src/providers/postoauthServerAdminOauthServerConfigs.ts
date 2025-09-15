import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerOauthServerConfigs } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerOauthServerConfigs";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new OAuth server configuration record.
 *
 * This operation creates a system-wide configuration setting with a unique key.
 * Only administrators can perform this action.
 *
 * The created record includes automatic timestamps for creation and update, and
 * initializes deleted_at to null.
 *
 * @param props - The operation properties containing:
 *
 *   - Admin: The authenticated admin user
 *   - Body: The configuration creation data including key, optional value and
 *       description
 *
 * @returns The newly created OAuth server configuration record
 * @throws Will throw if a configuration with the same key already exists
 *   (unique constraint violation)
 */
export async function postoauthServerAdminOauthServerConfigs(props: {
  admin: AdminPayload;
  body: IOauthServerOauthServerConfigs.ICreate;
}): Promise<IOauthServerOauthServerConfigs> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const id: string & tags.Format<"uuid"> = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.oauth_server_configs.create({
    data: {
      id,
      key: props.body.key,
      value: props.body.value ?? null,
      description: props.body.description ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    key: created.key,
    value: created.value ?? null,
    description: created.description ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
