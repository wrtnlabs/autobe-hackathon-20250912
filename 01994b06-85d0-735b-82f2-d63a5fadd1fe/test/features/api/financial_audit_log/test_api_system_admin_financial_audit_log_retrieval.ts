import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformFinancialAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformFinancialAuditLog";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * E2E test for retrieving the details of a financial audit log as a system
 * administrator.
 *
 * 1. Register a new healthcare platform system administrator with unique,
 *    business-formatted email and legal name, selecting 'local' as provider
 *    and generating a strong password. Provider_key matches the email for
 *    'local'.
 * 2. Login as the newly created system admin using email, provider,
 *    provider_key, and password.
 * 3. (Since there is no exposed endpoint to create a financial audit log
 *    entry, generate a random UUID and attempt retrieval; this tests API
 *    contract/type correctness and endpoint access only.)
 * 4. Call the API to retrieve the financial audit log by ID, using a
 *    typia-random generated id (string & tags.Format<'uuid'>).
 * 5. Validate the response type (IHealthcarePlatformFinancialAuditLog) with
 *    typia.assert, and confirm all required properties exist and match DTO
 *    definition.
 */
export async function test_api_system_admin_financial_audit_log_retrieval(
  connection: api.IConnection,
) {
  // 1. Register a system admin (creates user and establishes auth context)
  const email = `${RandomGenerator.alphabets(8)}@enterprise-corp.com`;
  const password = RandomGenerator.alphaNumeric(16);
  const fullName = RandomGenerator.name(2);
  const joinBody = {
    email,
    full_name: fullName,
    provider: "local",
    provider_key: email,
    password,
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;

  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert(admin);

  // 2. Login as admin for fresh session (auth handled by SDK)
  const loginBody = {
    email,
    provider: "local",
    provider_key: email,
    password,
  } satisfies IHealthcarePlatformSystemAdmin.ILogin;

  const loginResult = await api.functional.auth.systemAdmin.login(connection, {
    body: loginBody,
  });
  typia.assert(loginResult);

  // 3. Generate random UUID for financial audit log ID (simulate test retrieval)
  const auditLogId = typia.random<string & tags.Format<"uuid">>();

  // 4. Retrieve the financial audit log (if present)
  const result =
    await api.functional.healthcarePlatform.systemAdmin.financialAuditLogs.at(
      connection,
      { financialAuditLogId: auditLogId },
    );
  typia.assert(result);
}
