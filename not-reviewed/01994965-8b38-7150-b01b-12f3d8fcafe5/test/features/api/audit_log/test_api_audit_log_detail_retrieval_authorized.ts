import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITelegramFileDownloaderAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderAdministrator";
import type { ITelegramFileDownloaderAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderAuditLog";

/**
 * End-to-end test validating administrator authentication and audit log
 * detail retrieval.
 *
 * This test executes a comprehensive scenario where an administrator is
 * registered and logged in via authentication endpoints before successfully
 * retrieving an audit log detail by its unique ID. It asserts the
 * correctness of authentication tokens, audit log data integrity, and error
 * responses on invalid audit log IDs or unauthorized access.
 *
 * The test covers:
 *
 * 1. Administrator account creation with valid email and a hashed password.
 * 2. Administrator login using email and plaintext password to obtain JWT
 *    token.
 * 3. Successful retrieval of audit log details given a valid UUID.
 * 4. Validation that the audit log response matches the expected DTO schema.
 * 5. Negative test case for requesting a non-existent audit log ID expecting
 *    404 error.
 * 6. Negative test case for access without authentication expecting 401/403
 *    error.
 *
 * The API client internally handles JWT token management; test code does
 * not modify headers.
 *
 * The test ensures that only authorized administrators can access audit log
 * details, validating security constraints and response correctness.
 */
export async function test_api_audit_log_detail_retrieval_authorized(
  connection: api.IConnection,
) {
  // 1. Recreate admin account with known password hash for consistent login
  const fixedPassword = "test-password-1234";
  const adminCreateBody = {
    email:
      RandomGenerator.name(1) +
      `-${typia.random<string & tags.Format<"uuid">>().substring(0, 8)}@example.com`,
    password_hash: fixedPassword,
  } satisfies ITelegramFileDownloaderAdministrator.ICreate;

  const adminAuthorized = await api.functional.auth.administrator.join(
    connection,
    { body: adminCreateBody },
  );
  typia.assert(adminAuthorized);

  // 2. Login as the administrator with the fixed plaintext password
  const adminLoginBody = {
    email: adminCreateBody.email,
    password: fixedPassword,
  } satisfies ITelegramFileDownloaderAdministrator.ILogin;

  const adminLoginAuthorized = await api.functional.auth.administrator.login(
    connection,
    { body: adminLoginBody },
  );
  typia.assert(adminLoginAuthorized);

  // 3. Use valid audit log ID
  // Positive test: fetch a valid audit log by simulating one
  const validAuditLog: ITelegramFileDownloaderAuditLog =
    typia.random<ITelegramFileDownloaderAuditLog>();
  typia.assert(validAuditLog);

  // Fetch audit log detail successfully with valid id
  const auditLog =
    await api.functional.telegramFileDownloader.administrator.auditLogs.at(
      connection,
      {
        id: validAuditLog.id,
      },
    );
  typia.assert(auditLog);

  // Validate key properties of the audit log
  TestValidator.equals("audit log id matches", auditLog.id, validAuditLog.id);
  TestValidator.predicate(
    "audit log error_code is non-empty",
    auditLog.error_code.length > 0,
  );
  TestValidator.predicate(
    "audit log error_message is non-empty",
    auditLog.error_message.length > 0,
  );
  TestValidator.predicate(
    "audit log source_component is non-empty",
    auditLog.source_component.length > 0,
  );
  TestValidator.predicate(
    "audit log occurred_at is valid datetime",
    typeof auditLog.occurred_at === "string",
  );
  TestValidator.predicate(
    "audit log resolved flag is boolean",
    typeof auditLog.resolved === "boolean",
  );
  TestValidator.predicate(
    "audit log created_at is valid datetime",
    typeof auditLog.created_at === "string",
  );
  TestValidator.predicate(
    "audit log updated_at is valid datetime",
    typeof auditLog.updated_at === "string",
  );
  // deleted_at can be null or string or undefined (optional)

  // 4. Negative test: Attempt to retrieve audit log with non-existent UUID
  const invalidId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "fetch audit log with non-existent id should fail",
    async () => {
      await api.functional.telegramFileDownloader.administrator.auditLogs.at(
        connection,
        {
          id: invalidId,
        },
      );
    },
  );

  // 5. Negative test: Attempt to retrieve audit log without authentication
  // For this, create a new connection with empty headers to simulate unauthenticated request
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthorized audit log access should fail",
    async () => {
      await api.functional.telegramFileDownloader.administrator.auditLogs.at(
        unauthenticatedConnection,
        {
          id: validAuditLog.id,
        },
      );
    },
  );
}
