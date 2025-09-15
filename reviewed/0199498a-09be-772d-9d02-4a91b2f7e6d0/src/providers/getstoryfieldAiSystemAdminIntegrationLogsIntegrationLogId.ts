import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IStoryfieldAiIntegrationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiIntegrationLog";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve integration event log detail (storyfield_ai_integration_logs) by ID.
 *
 * Retrieves the full detail of a single integration event log given its unique
 * integrationLogId from the storyfield_ai_integration_logs table. Access is
 * restricted to system admins, and only logs not soft-deleted (deleted_at:
 * null) are visible. Returns full event, status, message, and traceability
 * details used for compliance and audit investigation.
 *
 * @param props - Properties for fetching a specific integration event log
 * @param props.systemAdmin - The authenticated system admin making the request
 * @param props.integrationLogId - Unique ID of the integration event log to
 *   retrieve
 * @returns IStoryfieldAiIntegrationLog - Full detail of the specified log
 * @throws {Error} If the integration event log does not exist or has been
 *   deleted
 */
export async function getstoryfieldAiSystemAdminIntegrationLogsIntegrationLogId(props: {
  systemAdmin: SystemadminPayload;
  integrationLogId: string & tags.Format<"uuid">;
}): Promise<IStoryfieldAiIntegrationLog> {
  const { integrationLogId } = props;
  const log = await MyGlobal.prisma.storyfield_ai_integration_logs.findFirst({
    where: {
      id: integrationLogId,
      deleted_at: null,
    },
  });
  if (!log) throw new Error("Integration event log not found");
  return {
    id: log.id,
    storyfield_ai_authenticateduser_id:
      log.storyfield_ai_authenticateduser_id ?? undefined,
    storyfield_ai_story_id: log.storyfield_ai_story_id ?? undefined,
    event_type: log.event_type,
    subsystem: log.subsystem,
    status: log.status,
    message: log.message ?? undefined,
    request_id: log.request_id ?? undefined,
    created_at: toISOStringSafe(log.created_at),
    updated_at: toISOStringSafe(log.updated_at),
    deleted_at: log.deleted_at ? toISOStringSafe(log.deleted_at) : undefined,
  };
}
