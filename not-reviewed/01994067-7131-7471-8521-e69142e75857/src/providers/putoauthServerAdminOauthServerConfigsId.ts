import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerOauthServerConfigs } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerOauthServerConfigs";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update an existing OAuth server configuration by ID.
 *
 * This operation updates the value and description fields of the specified
 * OAuth server configuration record, identified by its unique ID.
 *
 * The key and creation timestamp are immutable and cannot be changed. The
 * updated_at timestamp is automatically refreshed to the current time.
 *
 * Access to this operation is restricted to administrators only.
 *
 * @param props - Object containing the administrator payload, configuration ID,
 *   and update body
 * @param props.admin - The authenticated administrator performing the update
 * @param props.id - UUID of the OAuth server configuration to update
 * @param props.body - Object containing fields to update: value and/or
 *   description
 * @returns The fully updated OAuth server configuration record
 * @throws {Error} When the configuration record does not exist or is soft
 *   deleted
 */
export async function putoauthServerAdminOauthServerConfigsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
  body: IOauthServerOauthServerConfigs.IUpdate;
}): Promise<IOauthServerOauthServerConfigs> {
  const { admin, id, body } = props;

  // Verify the configuration record exists and is not soft deleted
  const existing = await MyGlobal.prisma.oauth_server_configs.findFirstOrThrow({
    where: { id, deleted_at: null },
  });

  // Prepare the current timestamp
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Update the record with only allowed fields
  const updated = await MyGlobal.prisma.oauth_server_configs.update({
    where: { id },
    data: {
      value: body.value ?? undefined,
      description: body.description ?? undefined,
      updated_at: now,
    },
  });

  // Return the updated record with all dates properly converted
  return {
    id: updated.id as string & tags.Format<"uuid">,
    key: updated.key,
    value: updated.value ?? null,
    description: updated.description ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
