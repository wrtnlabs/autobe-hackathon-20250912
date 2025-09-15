import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsBackupRecords } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsBackupRecords";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve detailed backup record by ID
 *
 * Retrieves detailed information for a specific backup record in the Enterprise
 * LMS system. Allows system administrators to view metadata about backup
 * snapshots, including timestamp, type, and storage location for disaster
 * recovery and compliance.
 *
 * @param props - Object containing the systemAdmin authentication and backup
 *   record ID
 * @param props.systemAdmin - Authenticated system administrator details
 * @param props.id - Unique identifier of the backup record to retrieve
 * @returns Detailed information about the backup record
 * @throws {Error} Throws if the backup record does not exist (404)
 */
export async function getenterpriseLmsSystemAdminBackupRecordsId(props: {
  systemAdmin: SystemadminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsBackupRecords> {
  const { id } = props;

  const record =
    await MyGlobal.prisma.enterprise_lms_backup_records.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        backup_timestamp: true,
        backup_type: true,
        storage_location: true,
        backup_size_bytes: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
    });

  return {
    id: record.id,
    backup_timestamp: toISOStringSafe(record.backup_timestamp),
    backup_type: record.backup_type,
    storage_location: record.storage_location,
    backup_size_bytes: record.backup_size_bytes,
    status: record.status,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
  };
}
