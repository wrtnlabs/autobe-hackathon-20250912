import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Archive (soft-delete) a user credential record in the
 * healthcare_platform_user_credentials table.
 *
 * This operation allows a system admin to retire (archive) a credential record
 * by setting its deleted_at timestamp. The record remains in the database for
 * audit and compliance purposes. No hard deletes are performed.
 *
 * IMPLEMENTATION BLOCKED: API-SCHEMA CONTRADICTION
 *
 * - API specification requires a soft-delete via deleted_at on
 *   healthcare_platform_user_credentials
 * - Prisma schema for this model DOES NOT contain a deleted_at field at all (see
 *   error TS2353)
 *
 * To resolve, EITHER update the Prisma schema to add a deleted_at: DateTime?
 * field, OR change the API spec to perform a hard delete or alternative
 * archival method.
 *
 * @param props - Object containing system admin payload and the credential UUID
 *   to archive
 * @param props.systemAdmin - Authenticated system admin user executing this
 *   operation
 * @param props.userCredentialId - Unique identifier (UUID) of the user
 *   credential to archive
 * @returns Void (currently a type-safe placeholder)
 * @throws {Error} If the credential does not exist or has already been archived
 *   (per actual implementation once schema allows)
 * @todo Replace this placeholder when the schema and API are aligned
 */
export async function deletehealthcarePlatformSystemAdminUserCredentialsUserCredentialId(props: {
  systemAdmin: SystemadminPayload;
  userCredentialId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Soft-delete on user credentials table is impossible (no deleted_at field in schema)
  // Returning placeholder for now
  return typia.random<void>();
}
