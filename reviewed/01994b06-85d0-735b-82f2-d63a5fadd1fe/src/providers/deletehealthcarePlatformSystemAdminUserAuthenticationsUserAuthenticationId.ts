import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Permanently deletes a specified user authentication record by its unique ID
 * from healthcare_platform_user_authentications.
 *
 * This operation performs a soft delete by setting the 'deleted_at' timestamp
 * on the user authentication entry, ensuring auditability and regulatory
 * retention. It verifies the record exists and is not already deleted, and
 * writes an audit log entry for compliance review. Only system admins may
 * perform this privileged action. The operation is irreversible—once deleted,
 * the authentication record cannot be used unless re-created.
 *
 * @param props - Request properties
 * @param props.systemAdmin - The authenticated system admin executing the
 *   deletion
 * @param props.userAuthenticationId - Unique identifier (UUID) of the user
 *   authentication record to delete
 * @returns Void
 * @throws {Error} If no active authentication record exists matching the
 *   specified userAuthenticationId
 */
export async function deletehealthcarePlatformSystemAdminUserAuthenticationsUserAuthenticationId(props: {
  systemAdmin: SystemadminPayload;
  userAuthenticationId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { systemAdmin, userAuthenticationId } = props;

  // Check for authentication record (must exist and not already deleted)
  const record =
    await MyGlobal.prisma.healthcare_platform_user_authentications.findFirst({
      where: {
        id: userAuthenticationId,
        deleted_at: null,
      },
    });
  if (!record) {
    throw new Error("User authentication record not found");
  }

  // Set current timestamp for soft deletion
  const deletedAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  await MyGlobal.prisma.healthcare_platform_user_authentications.update({
    where: { id: userAuthenticationId },
    data: { deleted_at: deletedAt },
  });

  // Write audit log (for compliance traceability)
  await MyGlobal.prisma.healthcare_platform_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      user_id: systemAdmin.id,
      organization_id: null,
      action_type: "DELETE_USER_AUTHENTICATION",
      event_context: JSON.stringify({
        provider: record.provider,
        provider_key: record.provider_key,
        user_type: record.user_type,
      }),
      related_entity_type: "healthcare_platform_user_authentications",
      related_entity_id: userAuthenticationId,
      created_at: deletedAt,
    },
  });
}
