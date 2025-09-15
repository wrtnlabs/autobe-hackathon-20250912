import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformUserAuthentication } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserAuthentication";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve full details for a user authentication record
 * (healthcare_platform_user_authentications) by ID.
 *
 * This endpoint allows a system administrator to fetch all non-secret details
 * of a specific user authentication credential record. It excludes credential
 * roots and never returns password hashes, even if present in the database. The
 * function is used for audit, troubleshooting, or privileged admin review.
 *
 * Authorization: Only systemAdmin role can access this operation.
 *
 * @param props - The parameters for this operation
 * @param props.systemAdmin - The authenticated SystemadminPayload
 * @param props.userAuthenticationId - The unique authentication credential
 *   record ID
 * @returns The authentication credential record data (never revealing password
 *   hashes)
 * @throws {Error} If the authentication record is not found, deleted, or
 *   inaccessible
 */
export async function gethealthcarePlatformSystemAdminUserAuthenticationsUserAuthenticationId(props: {
  systemAdmin: SystemadminPayload;
  userAuthenticationId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformUserAuthentication> {
  const { userAuthenticationId } = props;
  const record =
    await MyGlobal.prisma.healthcare_platform_user_authentications.findFirst({
      where: { id: userAuthenticationId, deleted_at: null },
    });
  if (!record)
    throw new Error("User authentication record not found or is deleted");
  return {
    id: record.id,
    user_id: record.user_id,
    user_type: record.user_type,
    provider: record.provider,
    provider_key: record.provider_key,
    password_hash: undefined, // never expose password hashes or credential roots
    last_authenticated_at:
      record.last_authenticated_at !== null &&
      record.last_authenticated_at !== undefined
        ? toISOStringSafe(record.last_authenticated_at)
        : undefined,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at:
      record.deleted_at !== null && record.deleted_at !== undefined
        ? toISOStringSafe(record.deleted_at)
        : undefined,
  };
}
