import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAuditLogArchive } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAuditLogArchive";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate successful retrieval of an audit log archive by a system admin.
 *
 * Scenario steps:
 *
 * 1. Register a healthcare platform system admin with business-compliant
 *    information.
 * 2. Authenticate as system admin using correct credentials.
 * 3. Generate a valid auditLogArchiveId for access (simulate existence).
 * 4. Call GET
 *    /healthcarePlatform/systemAdmin/auditLogArchives/{auditLogArchiveId}
 *    as system admin.
 * 5. Assert archive details are returned and match DTO type.
 */
export async function test_api_audit_log_archive_access_system_admin_success(
  connection: api.IConnection,
) {
  // 1. Register a new healthcare platform system admin
  const adminJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: typia.random<string & tags.Format<"email">>(),
    password: "StrongP@ssw0rd!",
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;

  const admin: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: adminJoin,
    });
  typia.assert(admin);

  // 2. Authenticate as system admin (redundant, but for completeness)
  const adminLogin = {
    email: adminJoin.email,
    provider: adminJoin.provider,
    provider_key: adminJoin.provider_key,
    password: adminJoin.password,
  } satisfies IHealthcarePlatformSystemAdmin.ILogin;

  const adminAuthed: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: adminLogin,
    });
  typia.assert(adminAuthed);

  // 3. Generate a valid audit log archive id (simulate existing record)
  const auditLogArchiveId = typia.random<string & tags.Format<"uuid">>();

  // 4. Retrieve audit log archive details using id
  const archive: IHealthcarePlatformAuditLogArchive =
    await api.functional.healthcarePlatform.systemAdmin.auditLogArchives.at(
      connection,
      { auditLogArchiveId },
    );
  typia.assert(archive);
}
