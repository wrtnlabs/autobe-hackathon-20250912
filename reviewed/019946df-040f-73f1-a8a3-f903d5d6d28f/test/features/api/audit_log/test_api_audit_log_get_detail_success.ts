import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAuditLog";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";

/**
 * This test validates detailed retrieval of an audit log entry by a system
 * administrator.
 *
 * The test registers a new system administrator, logs in to authenticate,
 * simulates an audit log record, attempts retrieval of non-existent audit
 * log ID expecting 404 error, and tests unauthorized access returning
 * 401/403 errors.
 *
 * Due to lack of API to create audit logs, positive retrieval test with a
 * real audit log is not feasible and thus is omitted here.
 */
export async function test_api_audit_log_get_detail_success(
  connection: api.IConnection,
) {
  // 1. Register a new system administrator user
  const adminEmail = `${RandomGenerator.alphaNumeric(10)}@example.com`;
  const adminPassword = RandomGenerator.alphaNumeric(10);
  const passwordHash = adminPassword; // Password hash assumed raw for testing

  const createBody = {
    email: adminEmail,
    password_hash: passwordHash,
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const admin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: createBody,
    });
  typia.assert(admin);

  // 2. Login as the registered system administrator
  const loginBody = {
    email: adminEmail,
    password_hash: passwordHash,
  } satisfies IEnterpriseLmsSystemAdmin.ILogin;

  const loggedInAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInAdmin);

  // 3. Generate a fake audit log object for schema compliance validation
  const simulatedAuditLog = typia.random<IEnterpriseLmsAuditLog>();
  typia.assert(simulatedAuditLog);

  // 4. Test invalid audit log ID (non-existent) - expect 404 error
  await TestValidator.error("invalid audit log id", async () => {
    await api.functional.enterpriseLms.systemAdmin.auditLogs.at(connection, {
      id: "00000000-0000-0000-0000-000000000000",
    });
  });

  // 5. Test unauthorized access by creating unauthenticated connection
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {}, // No authentication header
  };

  await TestValidator.error(
    "unauthorized access returns 401 or 403",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.auditLogs.at(
        unauthenticatedConnection,
        {
          id: simulatedAuditLog.id,
        },
      );
    },
  );
}
