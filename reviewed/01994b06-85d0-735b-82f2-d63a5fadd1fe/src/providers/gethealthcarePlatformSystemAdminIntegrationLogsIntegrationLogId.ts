import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformIntegrationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformIntegrationLog";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve full detail for a specific integration log event by ID.
 *
 * This function retrieves the complete detail of a single integration log
 * record from the platform's integration log table
 * (healthcare_platform_integration_logs) using its unique log ID. It exposes
 * all available context, status, event codes, payload/error metadata, and
 * auditing timestamps for a specific technical or business integration event
 * (e.g., external sync failure, inbound/outbound API activity, or
 * compliance-relevant integration activity).
 *
 * Only authenticated system administrators may invoke this operation. RBAC and
 * system integrity requirements are enforced upstream. All access checks
 * (including systemAdmin authentication and session status) are assumed to be
 * verified before this function executes.
 *
 * @param props - Function parameters.
 * @param props.systemAdmin - Authenticated SystemadminPayload representing the
 *   system administrator making the request.
 * @param props.integrationLogId - The unique UUID of the integration log entry
 *   to retrieve.
 * @returns The complete IHealthcarePlatformIntegrationLog object for the
 *   requested integration log record.
 * @throws {Error} If the integration log is not found.
 */
export async function gethealthcarePlatformSystemAdminIntegrationLogsIntegrationLogId(props: {
  systemAdmin: SystemadminPayload;
  integrationLogId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformIntegrationLog> {
  const { integrationLogId } = props;
  const log =
    await MyGlobal.prisma.healthcare_platform_integration_logs.findFirst({
      where: {
        id: integrationLogId,
      },
    });
  if (!log) {
    throw new Error("Integration log not found");
  }
  return {
    id: log.id,
    healthcare_platform_organization_id:
      log.healthcare_platform_organization_id,
    integration_type: log.integration_type,
    referenced_transaction_id: log.referenced_transaction_id ?? undefined,
    event_status: log.event_status,
    event_code: log.event_code,
    event_message: log.event_message ?? undefined,
    occurred_at: toISOStringSafe(log.occurred_at),
    created_at: toISOStringSafe(log.created_at),
    updated_at: toISOStringSafe(log.updated_at),
  };
}
