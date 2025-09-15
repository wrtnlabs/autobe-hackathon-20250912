import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformUserCredential } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserCredential";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve details of an archived user credential entry by its ID from the
 * healthcare_platform_user_credentials table. Never expose hashes in API
 * responses.
 *
 * This operation enables strict, role-restricted access to the full details of
 * an archived user credential for authorized system administrators, supporting
 * audit/compliance workflows. The credential_hash field is always masked for
 * security—never returned raw. If the specified credential does not exist, an
 * error is thrown. All access is assumed to be properly logged at the
 * controller/decorator level; unauthorized access is prevented higher in the
 * stack.
 *
 * @param props - SystemAdmin: Authenticated SystemadminPayload (must have valid
 *   type/id) userCredentialId: The UUID of the archived credential record to
 *   retrieve
 * @returns Archived user credential record, with credential_hash always
 *   redacted as '********'
 * @throws {Error} Throws if credential not found or unauthorized (handled by
 *   findUniqueOrThrow)
 */
export async function gethealthcarePlatformSystemAdminUserCredentialsUserCredentialId(props: {
  systemAdmin: SystemadminPayload;
  userCredentialId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformUserCredential> {
  const credential =
    await MyGlobal.prisma.healthcare_platform_user_credentials.findUniqueOrThrow(
      {
        where: { id: props.userCredentialId },
      },
    );

  return {
    id: credential.id,
    user_id: credential.user_id,
    user_type: credential.user_type,
    credential_type: credential.credential_type,
    credential_hash: "********",
    archived_at: toISOStringSafe(credential.archived_at),
    created_at: toISOStringSafe(credential.created_at),
  };
}
