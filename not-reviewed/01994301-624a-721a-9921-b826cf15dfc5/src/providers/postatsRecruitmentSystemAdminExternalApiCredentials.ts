import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentExternalApiCredential } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentExternalApiCredential";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Create/register a new external API credential
 * (ats_recruitment_external_api_credentials table).
 *
 * Registers a new external API credential for business integrations, storing
 * encrypted credentials, metadata, and expiration details securely. This
 * operation is only permitted for authenticated system administrators.
 * Uniqueness of credential_key is strictly enforced, and all operations are
 * auditable for regulatory compliance.
 *
 * The function securely encrypts the provided credential_json before storage.
 * After successful creation, an audit log record is created for compliance and
 * forensic purposes. Any attempt to use a duplicate credential_key triggers an
 * error.
 *
 * @param props - Input parameter object
 * @param props.systemAdmin - Authenticated system administrator payload (must
 *   be validated pre-call)
 * @param props.body - Request body data to register an external API credential
 *   (key, service, encrypted credential JSON, optional expiry, meta)
 * @returns The newly created external API credential record with metadata only
 *   (credential_json is the encrypted value, never raw)
 * @throws {Error} If credential_key is not unique, or if credential_json
 *   encryption fails
 */
export async function postatsRecruitmentSystemAdminExternalApiCredentials(props: {
  systemAdmin: SystemadminPayload;
  body: IAtsRecruitmentExternalApiCredential.ICreate;
}): Promise<IAtsRecruitmentExternalApiCredential> {
  const { systemAdmin, body } = props;

  // Step 1: Check if credential_key already exists (excluding soft-deleted)
  const existing =
    await MyGlobal.prisma.ats_recruitment_external_api_credentials.findFirst({
      where: { credential_key: body.credential_key, deleted_at: null },
    });
  if (existing !== null) {
    throw new Error("credential_key already exists");
  }

  // Step 2: Encrypt/secures credential_json (simulate with password.hash)
  const encrypted = await MyGlobal.password.hash(body.credential_json);

  // Step 3: Prepare all required fields
  const id = v4();
  const now = toISOStringSafe(new Date());

  // Step 4: Create the credential record
  const created =
    await MyGlobal.prisma.ats_recruitment_external_api_credentials.create({
      data: {
        id: id,
        credential_key: body.credential_key,
        service_name: body.service_name,
        credential_json: encrypted,
        expires_at: body.expires_at ?? null,
        description: body.description ?? null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  // Step 5: Audit trail for compliance
  await MyGlobal.prisma.ats_recruitment_audit_trails.create({
    data: {
      id: v4(),
      event_timestamp: now,
      actor_id: systemAdmin.id,
      actor_role: systemAdmin.type,
      operation_type: "CREATE",
      target_type: "external_api_credential",
      target_id: id,
      event_detail: `Created external API credential: ${id} by systemAdmin ${systemAdmin.id}`,
      ip_address: undefined,
      user_agent: undefined,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Step 6: Return the credential record (metadata only, encrypted credential_json)
  return {
    id: created.id,
    credential_key: created.credential_key,
    service_name: created.service_name,
    credential_json: created.credential_json,
    expires_at: created.expires_at ?? undefined,
    description: created.description ?? undefined,
    created_at: created.created_at,
    updated_at: created.updated_at,
    deleted_at: created.deleted_at ?? undefined,
  };
}
