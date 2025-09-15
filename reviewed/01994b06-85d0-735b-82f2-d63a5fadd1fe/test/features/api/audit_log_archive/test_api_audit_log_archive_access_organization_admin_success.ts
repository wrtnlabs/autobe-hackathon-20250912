import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAuditLogArchive } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAuditLogArchive";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Validates successful viewing of a specific audit log archive by an
 * organization administrator user.
 *
 * Steps:
 *
 * 1. Register a new organization admin account
 * 2. Login as the organization admin user to obtain authentication
 * 3. Generate a valid auditLogArchiveId (UUID format)
 * 4. Call GET
 *    /healthcarePlatform/organizationAdmin/auditLogArchives/{auditLogArchiveId}
 * 5. Assert that the response contains the correct audit archive details and
 *    matches the requested archive ID
 */
export async function test_api_audit_log_archive_access_organization_admin_success(
  connection: api.IConnection,
) {
  // 1. Register new organization admin
  const email = typia.random<string & tags.Format<"email">>();
  const password = "Secure1234!";
  const adminJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(adminJoin);

  // 2. Login as the organization admin
  const loginResp = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email,
        password,
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(loginResp);

  // 3. Generate valid auditLogArchiveId (UUID)
  const auditLogArchiveId = typia.random<string & tags.Format<"uuid">>();

  // 4. Call audit log archive detail API
  const archive =
    await api.functional.healthcarePlatform.organizationAdmin.auditLogArchives.at(
      connection,
      { auditLogArchiveId },
    );
  typia.assert(archive);

  // 5. Assert the archive ID matches the requested ID
  TestValidator.equals(
    "archive ID matches requested auditLogArchiveId",
    archive.id,
    auditLogArchiveId,
  );
}
