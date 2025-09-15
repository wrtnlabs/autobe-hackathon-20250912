import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformUserCredential } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserCredential";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update an archived user credential record in the
 * healthcarePlatform_user_credentials table.
 *
 * This endpoint allows a system administrator to update an archived (NOT
 * active) credential record for a user in the healthcarePlatform. Only the
 * fields credential_type, credential_hash, and archived_at may be updated.
 * Update will only proceed if the credential is already archived; active
 * (non-archived) credentials cannot be updated via this operation. Proper error
 * messages are thrown for business rule violations or missing records. All
 * date/datetime fields are returned as ISO8601 strings with appropriate
 * branding. This endpoint assumes authentication and authorization to be
 * handled at the controller/decorator layer (systemAdmin enforced by
 * SystemadminAuth).
 *
 * @param props - Properties for endpoint
 * @param props.systemAdmin - Authenticated system administrator user payload
 * @param props.userCredentialId - Unique identifier for the user credential
 *   record (UUID)
 * @param props.body - Partial update contract for fields credential_type,
 *   credential_hash, archived_at
 * @returns The newly updated user credential record, with all fields populated
 * @throws {Error} If the credential does not exist, is not archived, or any
 *   business rule is violated
 */
export async function puthealthcarePlatformSystemAdminUserCredentialsUserCredentialId(props: {
  systemAdmin: SystemadminPayload;
  userCredentialId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformUserCredential.IUpdate;
}): Promise<IHealthcarePlatformUserCredential> {
  // Step 1: Fetch credential record for update (must exist)
  const credential =
    await MyGlobal.prisma.healthcare_platform_user_credentials.findUniqueOrThrow(
      {
        where: { id: props.userCredentialId },
      },
    );

  // Step 2: Validate that it is already archived (archived_at must exist)
  if (!credential.archived_at) {
    throw new Error("Credential is not archived and cannot be updated");
  }

  // Step 3: Update permitted fields (skip fields not present)
  const updated =
    await MyGlobal.prisma.healthcare_platform_user_credentials.update({
      where: { id: props.userCredentialId },
      data: {
        credential_type: props.body.credential_type ?? undefined,
        credential_hash: props.body.credential_hash ?? undefined,
        archived_at: props.body.archived_at ?? undefined,
      },
    });

  // Step 4: Return the updated record using correct formats/branding for all fields
  return {
    id: updated.id,
    user_id: updated.user_id,
    user_type: updated.user_type,
    credential_type: updated.credential_type,
    credential_hash: updated.credential_hash,
    archived_at: toISOStringSafe(updated.archived_at),
    created_at: toISOStringSafe(updated.created_at),
  };
}
