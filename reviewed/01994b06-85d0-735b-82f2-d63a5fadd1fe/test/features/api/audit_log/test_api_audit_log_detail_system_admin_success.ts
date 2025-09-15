import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAuditLog";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Test that a system administrator with valid authentication can successfully
 * retrieve a detailed audit log record by its unique auditLogId.
 *
 * Workflow:
 *
 * 1. Register and authenticate a system administrator
 * 2. Prepare/simulate an audit log record (since creation is not in scope, use
 *    typia.random)
 * 3. Call GET /healthcarePlatform/systemAdmin/auditLogs/{auditLogId} with valid
 *    UUID
 * 4. Assert that the response matches the expected IHealthcarePlatformAuditLog
 *    schema and does not expose sensitive data
 * 5. Confirm permission requirements (system admin session is used)
 */
export async function test_api_audit_log_detail_system_admin_success(
  connection: api.IConnection,
) {
  // 1. Register a system admin
  const email = typia.random<string & tags.Format<"email">>();
  const full_name = RandomGenerator.name();
  const provider = "local";
  const provider_key = email;
  const password = RandomGenerator.alphaNumeric(12);
  const joinBody = {
    email,
    full_name,
    provider,
    provider_key,
    password,
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert(admin);

  // 2. Login as the system admin
  const loginBody = {
    email,
    provider,
    provider_key,
    password,
  } satisfies IHealthcarePlatformSystemAdmin.ILogin;
  const loginResult = await api.functional.auth.systemAdmin.login(connection, {
    body: loginBody,
  });
  typia.assert(loginResult);

  // 3. Simulate or prepare a known audit log entry
  // Here we generate a random audit log using typia (in reality, this would come from a prior business action)
  const auditLog: IHealthcarePlatformAuditLog =
    typia.random<IHealthcarePlatformAuditLog>();
  typia.assert(auditLog);

  // 4. Retrieve audit log using the API (using the known UUID)
  const result =
    await api.functional.healthcarePlatform.systemAdmin.auditLogs.at(
      connection,
      { auditLogId: auditLog.id },
    );
  typia.assert(result);

  // 5. Validate payload: All expected fields, correct types, no sensitive leaks (by contract, typia.assert is enough)
  TestValidator.equals("audit log ID matches", result.id, auditLog.id);
  TestValidator.predicate(
    "created_at is ISO 8601 date-time",
    typeof result.created_at === "string" &&
      !!result.created_at.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?Z?/),
  );
  TestValidator.predicate(
    "action_type present",
    !!result.action_type && typeof result.action_type === "string",
  );
  // Check sensitive info absence -- audit log does not contain authentication tokens or admin profile info
  TestValidator.predicate(
    "no token property in audit log result",
    !("token" in result),
  );
}
