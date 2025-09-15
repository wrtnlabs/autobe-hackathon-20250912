import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentExternalApiCredential } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentExternalApiCredential";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update an external API credential (ats_recruitment_external_api_credentials
 * table).
 *
 * This endpoint allows a system administrator to update the properties and
 * value of a specific external API credential, identified by its UUID. Only
 * system administrators are permitted to perform this sensitive configuration
 * update. All changes are thoroughly audited, including before/after snapshots
 * and actor information.
 *
 * The provided request body may update any combination of credential_key,
 * service_name, credential_json (which is encrypted before storage), expiration
 * date, or description. Changing the credential_key enforces system-wide
 * uniqueness among active records. Updates require the credential to exist and
 * not be deleted (deleted_at = null).
 *
 * @param props - Request parameters, including the authenticated system
 *   administrator, target credential UUID, and update details
 * @param props.systemAdmin - Authenticated system administrator performing this
 *   operation
 * @param props.externalApiCredentialId - UUID of the credential being updated
 * @param props.body - Update fields to apply (partial update)
 * @returns The updated IAtsRecruitmentExternalApiCredential object
 * @throws {Error} If credential does not exist, is deleted, or if the new
 *   credential_key collides with a non-deleted record
 */
export async function putatsRecruitmentSystemAdminExternalApiCredentialsExternalApiCredentialId(props: {
  systemAdmin: SystemadminPayload;
  externalApiCredentialId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentExternalApiCredential.IUpdate;
}): Promise<IAtsRecruitmentExternalApiCredential> {
  const { systemAdmin, externalApiCredentialId, body } = props;

  // Fetch the active (not deleted) external API credential
  const existing =
    await MyGlobal.prisma.ats_recruitment_external_api_credentials.findFirst({
      where: {
        id: externalApiCredentialId,
        deleted_at: null,
      },
    });
  if (!existing) throw new Error("Credential does not exist");

  // If credential_key provided and changed, ensure uniqueness
  if (
    body.credential_key !== undefined &&
    body.credential_key !== existing.credential_key
  ) {
    const conflict =
      await MyGlobal.prisma.ats_recruitment_external_api_credentials.findFirst({
        where: {
          credential_key: body.credential_key,
          deleted_at: null,
          id: { not: externalApiCredentialId },
        },
      });
    if (conflict) throw new Error("Credential key already exists");
  }

  // Prepare the update fields
  const now = toISOStringSafe(new Date());
  const updateFields = {
    ...(body.credential_key !== undefined && {
      credential_key: body.credential_key,
    }),
    ...(body.service_name !== undefined && { service_name: body.service_name }),
    ...(body.credential_json !== undefined && {
      credential_json: await MyGlobal.password.hash(body.credential_json),
    }),
    ...(body.expires_at !== undefined && { expires_at: body.expires_at }),
    ...(body.description !== undefined && { description: body.description }),
    updated_at: now,
  };

  const updated =
    await MyGlobal.prisma.ats_recruitment_external_api_credentials.update({
      where: { id: externalApiCredentialId },
      data: updateFields,
    });

  // Write audit log
  await MyGlobal.prisma.ats_recruitment_audit_trails.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      event_timestamp: now,
      actor_id: systemAdmin.id,
      actor_role: "systemadmin",
      operation_type: "UPDATE",
      target_type: "api_credential",
      target_id: externalApiCredentialId,
      event_detail: JSON.stringify({
        before: {
          id: existing.id,
          credential_key: existing.credential_key,
          service_name: existing.service_name,
          credential_json: existing.credential_json,
          expires_at: existing.expires_at
            ? toISOStringSafe(existing.expires_at)
            : null,
          description: existing.description ?? null,
          created_at: toISOStringSafe(existing.created_at),
          updated_at: toISOStringSafe(existing.updated_at),
          deleted_at: existing.deleted_at
            ? toISOStringSafe(existing.deleted_at)
            : null,
        },
        after: {
          id: updated.id,
          credential_key: updated.credential_key,
          service_name: updated.service_name,
          credential_json: updated.credential_json,
          expires_at: updated.expires_at
            ? toISOStringSafe(updated.expires_at)
            : null,
          description: updated.description ?? null,
          created_at: toISOStringSafe(updated.created_at),
          updated_at: toISOStringSafe(updated.updated_at),
          deleted_at: updated.deleted_at
            ? toISOStringSafe(updated.deleted_at)
            : null,
        },
      }),
      ip_address: undefined,
      user_agent: undefined,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: updated.id,
    credential_key: updated.credential_key,
    service_name: updated.service_name,
    credential_json: updated.credential_json,
    expires_at: updated.expires_at
      ? toISOStringSafe(updated.expires_at)
      : undefined,
    description: updated.description ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
