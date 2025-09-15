import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerOauthServerConfigs } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerOauthServerConfigs";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve detailed OAuth server configuration by ID
 *
 * Retrieves the OAuth server configuration identified by the given UUID. Only
 * accessible by administrators. Throws an error if the record does not exist or
 * is soft deleted.
 *
 * @param props - Object containing admin payload and the OAuth server config id
 * @param props.admin - The authenticated administrator payload
 * @param props.id - UUID of the OAuth server configuration to retrieve
 * @returns The OAuth server configuration record
 * @throws {Error} If the record with the specified id does not exist or is soft
 *   deleted
 */
export async function getoauthServerAdminOauthServerConfigsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IOauthServerOauthServerConfigs> {
  const record = await MyGlobal.prisma.oauth_server_configs.findFirstOrThrow({
    where: { id: props.id, deleted_at: null },
  });

  return {
    id: record.id,
    key: record.key,
    value: record.value ?? null,
    description: record.description ?? null,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
