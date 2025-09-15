import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentExternalApiCredential } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentExternalApiCredential";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve detailed information for a specific external API credential
 * (ats_recruitment_external_api_credentials), by ID.
 *
 * Retrieves the full details of an external API credential record by its unique
 * identifier. Only accessible to system administrators; access is strictly
 * audited and all sensitive material is handled securely.
 *
 * If the credential is soft deleted (deleted_at populated), this will be
 * reflected in the response. If not found or user is unauthorized, an error is
 * thrown.
 *
 * @param props - Object containing authentication and request parameters
 * @param props.systemAdmin - The authenticated system administrator's payload
 * @param props.externalApiCredentialId - UUID of the external API credential to
 *   retrieve
 * @returns Full details of the external API credential
 * @throws {Error} If no credential exists with the provided ID, or access is
 *   not permitted
 */
export async function getatsRecruitmentSystemAdminExternalApiCredentialsExternalApiCredentialId(props: {
  systemAdmin: SystemadminPayload;
  externalApiCredentialId: string & tags.Format<"uuid">;
}): Promise<IAtsRecruitmentExternalApiCredential> {
  // Fetch the credential by ID
  const found =
    await MyGlobal.prisma.ats_recruitment_external_api_credentials.findFirst({
      where: { id: props.externalApiCredentialId },
    });
  if (!found) throw new Error("External API credential not found");

  return {
    id: found.id,
    credential_key: found.credential_key,
    service_name: found.service_name,
    credential_json: found.credential_json,
    expires_at: found.expires_at
      ? toISOStringSafe(found.expires_at)
      : found.expires_at,
    description: found.description ?? undefined,
    created_at: toISOStringSafe(found.created_at),
    updated_at: toISOStringSafe(found.updated_at),
    deleted_at: found.deleted_at
      ? toISOStringSafe(found.deleted_at)
      : found.deleted_at,
  };
}
