import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformUserCredential } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserCredential";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Retrieve details of an archived user credential entry by its ID from the
 * healthcare_platform_user_credentials table. Never expose credential hashes in
 * API responses.
 *
 * This endpoint allows an authorized organization admin to audit the credential
 * history of any user credential (password, SSO, certificate, etc). Sensitive
 * credential hashes are always redacted in the response, regardless of value,
 * for security and compliance. All returned date fields are converted to
 * ISO8601 string format. Audit logging of this access event must occur at the
 * middleware or controller level (not in this function).
 *
 * @param props - Input object containing the organization admin's
 *   authentication payload and the userCredentialId (UUID) to retrieve.
 * @param props.organizationAdmin - The authenticated OrganizationadminPayload
 *   (enforced for organization admin role).
 * @param props.userCredentialId - The UUID of the archived user credential
 *   record to retrieve.
 * @returns IHealthcarePlatformUserCredential: All relevant credential metadata
 *   with credential_hash fully redacted.
 * @throws {Error} If the credential record is not found for the given id.
 */
export async function gethealthcarePlatformOrganizationAdminUserCredentialsUserCredentialId(props: {
  organizationAdmin: OrganizationadminPayload;
  userCredentialId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformUserCredential> {
  const { userCredentialId } = props;
  const credential =
    await MyGlobal.prisma.healthcare_platform_user_credentials.findFirst({
      where: { id: userCredentialId },
    });
  if (!credential) {
    throw new Error("Credential record not found");
  }
  // Per specification, credential_hash must never be exposed. Provide placeholder value.
  return {
    id: credential.id,
    user_id: credential.user_id,
    user_type: credential.user_type,
    credential_type: credential.credential_type,
    credential_hash: "***REDACTED***",
    archived_at: toISOStringSafe(credential.archived_at),
    created_at: toISOStringSafe(credential.created_at),
  };
}
