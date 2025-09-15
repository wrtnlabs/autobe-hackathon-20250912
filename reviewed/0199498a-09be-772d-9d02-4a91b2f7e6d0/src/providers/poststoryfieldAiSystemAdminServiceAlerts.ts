import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IStoryfieldAiServiceAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiServiceAlert";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Create a new service alert or technical event record
 * (storyfield_ai_service_alerts table).
 *
 * This operation allows system administrators to create a new event or alert
 * record in the audit log, to be used as operational, compliance, or monitoring
 * notifications. Requires all necessary business context fields in the body
 * (alert_type, alert_code, content, environment, resolved status) and is
 * restricted to authenticated system admins. The created alert is immediately
 * available for search, dashboard reporting, or compliance review. All
 * date-time values are consistently formatted, with null propagation for
 * nullable fields.
 *
 * @param props - Contains the authenticated system admin (systemAdmin) and
 *   alert creation data (body)
 * @param props.systemAdmin - The authenticated system administrator (audited
 *   upstream)
 * @param props.body - Alert/event creation payload (type, code, content,
 *   environment, etc.)
 * @returns The fully detailed service alert/event record immediately after
 *   insertion
 * @throws {Error} On duplicate (unique) alert_code/environment constraint or
 *   database errors
 */
export async function poststoryfieldAiSystemAdminServiceAlerts(props: {
  systemAdmin: SystemadminPayload;
  body: IStoryfieldAiServiceAlert.ICreate;
}): Promise<IStoryfieldAiServiceAlert> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const record = await MyGlobal.prisma.storyfield_ai_service_alerts.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      alert_type: props.body.alert_type,
      alert_code: props.body.alert_code,
      content: props.body.content,
      environment: props.body.environment,
      resolved: props.body.resolved,
      resolution_note: props.body.resolution_note ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  return {
    id: record.id,
    alert_type: record.alert_type,
    alert_code: record.alert_code,
    content: record.content,
    environment: record.environment,
    resolved: record.resolved,
    resolution_note: record.resolution_note ?? null,
    created_at: record.created_at as string & tags.Format<"date-time">,
    updated_at: record.updated_at as string & tags.Format<"date-time">,
    deleted_at: record.deleted_at ?? null,
  };
}
