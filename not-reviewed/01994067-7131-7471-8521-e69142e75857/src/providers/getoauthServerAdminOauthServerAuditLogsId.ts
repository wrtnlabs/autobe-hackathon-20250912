import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAuditLog";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getoauthServerAdminOauthServerAuditLogsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IOauthServerAuditLog> {
  const { id } = props;
  const record =
    await MyGlobal.prisma.oauth_server_audit_logs.findUniqueOrThrow({
      where: { id },
    });
  return {
    id: record.id,
    event_type: record.event_type,
    event_timestamp: toISOStringSafe(record.event_timestamp),
    actor_id: record.actor_id ?? null,
    actor_type: record.actor_type ?? null,
    event_description: record.event_description,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
  };
}
