import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformUserCredential } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserCredential";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Archive a new user credential value record in the
 * healthcare_platform_user_credentials table.
 *
 * This endpoint is used by system administrators to append a new archive
 * credential (such as a password or key) to the audit trail of credential
 * changes for any user/actor supported by the healthcare platform. Ensures full
 * auditability and traceability by validating the referenced user, preventing
 * duplicate credential archival, and supporting security policy enforcement for
 * credential and password history management.
 *
 * Sensitive credential_hash values are NOT exposed via API or logs and must
 * always be handled securely. Duplicate archival (same credential parameters)
 * is strictly not allowed.
 *
 * Authorization: Only authenticated systemAdmin (SystemadminPayload) may use
 * this endpoint.
 *
 * @param props - systemAdmin: The authenticated system administrator account
 *   performing this action body: The credential archive data including user_id,
 *   type, hash, and timestamps
 * @returns IHealthcarePlatformUserCredential instance with all audit fields
 * @throws {Error} If the referenced user_id does not exist or is deleted, or if
 *   duplicate credential archival is attempted
 */
export async function posthealthcarePlatformSystemAdminUserCredentials(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformUserCredential.ICreate;
}): Promise<IHealthcarePlatformUserCredential> {
  const { body } = props;
  // Validate referenced user exists (systemadmin or organizationadmin)
  const foundUser =
    (await MyGlobal.prisma.healthcare_platform_systemadmins.findFirst({
      where: { id: body.user_id, deleted_at: null },
    })) ||
    (await MyGlobal.prisma.healthcare_platform_organizationadmins.findFirst({
      where: { id: body.user_id, deleted_at: null },
    }));
  if (!foundUser) {
    throw new Error("The target user does not exist or is deleted");
  }
  // Check for duplicate credential archive (composite key)
  const duplicate =
    await MyGlobal.prisma.healthcare_platform_user_credentials.findFirst({
      where: {
        user_id: body.user_id,
        user_type: body.user_type,
        credential_type: body.credential_type,
        credential_hash: body.credential_hash,
        archived_at: body.archived_at,
        created_at: body.created_at,
      },
    });
  if (duplicate) {
    throw new Error("Duplicate credential archive detected");
  }
  // Compose id for new credential (no @default/auto-gen in schema)
  const id = v4();
  // Insert credential row
  const created =
    await MyGlobal.prisma.healthcare_platform_user_credentials.create({
      data: {
        id: id,
        user_id: body.user_id,
        user_type: body.user_type,
        credential_type: body.credential_type,
        credential_hash: body.credential_hash,
        archived_at: body.archived_at,
        created_at: body.created_at,
      },
    });
  return {
    id: created.id,
    user_id: created.user_id,
    user_type: created.user_type,
    credential_type: created.credential_type,
    credential_hash: created.credential_hash,
    archived_at: created.archived_at,
    created_at: created.created_at,
  };
}
