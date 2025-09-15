import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeUserActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeUserActivityLog";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieves a detailed user activity log entry by its unique identifier for
 * admins.
 *
 * This endpoint allows authorized administrators to access comprehensive
 * metadata about a specific user action recorded in the system for auditing and
 * monitoring. It includes details such as action type, optional context, IP
 * address of origin, and timestamps including soft deletion status.
 *
 * @param props - Object containing the authenticated admin and the log entry ID
 * @param props.admin - Authenticated admin payload
 * @param props.id - UUID string identifying the user activity log entry to
 *   retrieve
 * @returns The detailed user activity log entry
 * @throws {Error} Throws if the log entry does not exist
 */
export async function getflexOfficeAdminUserActivityLogsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IFlexOfficeUserActivityLog> {
  const { admin, id } = props;

  // Fetch the user activity log with the given ID
  const record =
    await MyGlobal.prisma.flex_office_user_activity_logs.findUniqueOrThrow({
      where: { id },
    });

  return {
    id: record.id,
    user_id: record.user_id,
    action_type: record.action_type,
    action_details: record.action_details ?? null,
    ip_address: record.ip_address ?? null,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
