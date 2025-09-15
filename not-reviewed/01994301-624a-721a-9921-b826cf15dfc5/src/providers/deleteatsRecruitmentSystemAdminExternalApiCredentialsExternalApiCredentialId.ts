import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Soft-delete (mark deleted) an external API credential
 * (ats_recruitment_external_api_credentials table).
 *
 * This operation allows a system administrator to mark a specific external API
 * credential as deleted by setting its deleted_at timestamp. It retains the
 * credential in the database for compliance and audit logs but excludes it from
 * active integration usage. This endpoint is idempotent: If the credential is
 * already marked deleted, no update occurs but the audit log is still created.
 * All deletions are recorded in the audit trail table.
 *
 * Only authenticated system administrators can invoke this operation.
 *
 * @param props - The parameters for credential soft-deletion
 * @param props.systemAdmin - The authenticated system administrator user
 *   (SystemadminPayload)
 * @param props.externalApiCredentialId - Unique identifier of the external API
 *   credential to be deleted
 * @returns Void
 * @throws {Error} If the credential does not exist
 */
export async function deleteatsRecruitmentSystemAdminExternalApiCredentialsExternalApiCredentialId(props: {
  systemAdmin: SystemadminPayload;
  externalApiCredentialId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { systemAdmin, externalApiCredentialId } = props;

  // Fetch the credential, check it exists
  const credential =
    await MyGlobal.prisma.ats_recruitment_external_api_credentials.findFirst({
      where: { id: externalApiCredentialId },
    });
  if (!credential) {
    throw new Error("External API credential not found");
  }

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // If the credential is not already deleted (deleted_at is null), soft delete by setting deleted_at
  if (credential.deleted_at == null) {
    await MyGlobal.prisma.ats_recruitment_external_api_credentials.update({
      where: { id: externalApiCredentialId },
      data: { deleted_at: now },
    });
  }

  // Write audit log for this operation (always, even for repeat idempotent calls)
  await MyGlobal.prisma.ats_recruitment_audit_trails.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      event_timestamp: now,
      actor_id: systemAdmin.id,
      actor_role: "systemadmin",
      operation_type: "DELETE",
      target_type: "api_credential",
      target_id: externalApiCredentialId,
      event_detail: JSON.stringify({
        action: "soft_delete",
        target: "external_api_credential",
        externalApiCredentialId: externalApiCredentialId,
      }),
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
}
