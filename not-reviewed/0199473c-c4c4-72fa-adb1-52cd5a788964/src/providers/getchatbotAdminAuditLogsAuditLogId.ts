import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IChatbotChatbotAuditLogs } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotChatbotAuditLogs";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve detailed audit log entry by ID.
 *
 * This operation fetches a single audit log entry from the chatbot_audit_logs
 * table identified by the unique auditLogId parameter. Only users with the
 * 'admin' role are authorized to perform this operation.
 *
 * The audit log entry contains comprehensive event details appropriate for
 * administrative auditing, troubleshooting, and compliance validation.
 *
 * @param props - Object containing authentication and parameters
 * @param props.admin - Authenticated admin user making the request
 * @param props.auditLogId - UUID of the audit log entry to retrieve
 * @returns Promise resolving to the audit log entry with all relevant fields
 * @throws {Error} Throws if no audit log entry matches the provided auditLogId
 */
export async function getchatbotAdminAuditLogsAuditLogId(props: {
  admin: AdminPayload;
  auditLogId: string & tags.Format<"uuid">;
}): Promise<IChatbotChatbotAuditLogs> {
  const { admin, auditLogId } = props;

  const record = await MyGlobal.prisma.chatbot_audit_logs.findUniqueOrThrow({
    where: { id: auditLogId },
    select: {
      id: true,
      chatbot_member_id: true,
      chatbot_room_tuple_id: true,
      event_type: true,
      event_payload: true,
      created_at: true,
    },
  });

  return {
    id: record.id,
    chatbot_member_id:
      record.chatbot_member_id === null ? null : record.chatbot_member_id,
    chatbot_room_tuple_id:
      record.chatbot_room_tuple_id === null
        ? null
        : record.chatbot_room_tuple_id,
    event_type: record.event_type,
    event_payload: record.event_payload,
    created_at: toISOStringSafe(record.created_at),
  };
}
