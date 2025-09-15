import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAuditLog";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Validate that an authenticated organization administrator can retrieve audit
 * log details within their organization.
 *
 * Steps:
 *
 * 1. Register a new organization admin
 * 2. Log in as that organization admin
 * 3. Retrieve (GET) audit log details for a known auditLogId using their session
 * 4. Assert payload structure, type, and organization scoping
 */
export async function test_api_audit_log_detail_org_admin_success(
  connection: api.IConnection,
) {
  // 1. Register a new organization administrator
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const admin: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);
  // 2. Log in as that admin
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies IHealthcarePlatformOrganizationAdmin.ILogin;
  const loginResp: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.login(connection, {
      body: loginBody,
    });
  typia.assert(loginResp);

  // 3. Use a random UUID for auditLogId  (since no log create API, simulation)
  const auditLogId = typia.random<string & tags.Format<"uuid">>();
  const output: IHealthcarePlatformAuditLog =
    await api.functional.healthcarePlatform.organizationAdmin.auditLogs.at(
      connection,
      { auditLogId },
    );
  typia.assert(output);
  TestValidator.equals("auditLogId must match", output.id, auditLogId);
  if (output.organization_id !== undefined) {
    TestValidator.equals(
      "log organization_id matches admin's id (if scoped)",
      output.organization_id,
      admin.id,
    );
  }
}
