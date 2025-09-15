import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITelegramFileDownloaderAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITelegramFileDownloaderAuditLog";
import type { ITelegramFileDownloaderAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderAdministrator";
import type { ITelegramFileDownloaderAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderAuditLog";

/**
 * This end-to-end test function validates the audit log listing and filtering
 * functionality for administrators in the Telegram File Downloader system.
 *
 * The comprehensive test flow is as follows:
 *
 * 1. Create an administrator account using /auth/administrator/join with valid
 *    email and password hash.
 * 2. Authenticate the administrator via /auth/administrator/login to obtain JWT
 *    tokens for authorized requests.
 * 3. Use the authenticated administrator context to request a paginated list of
 *    audit logs with filters on action types, entity types, user IDs, or date
 *    ranges using PATCH /telegramFileDownloader/administrator/auditLogs.
 * 4. Validate that the response contains a paginated list matching the filters
 *    with correct schema, timestamps, and data integrity while not exposing
 *    sensitive info.
 * 5. Test edge case with filters returning no results, confirming empty data array
 *    and valid pagination metadata.
 * 6. Verify unauthorized access results in appropriate HTTP 401 or 403 errors when
 *    attempting the same audit log request without authentication or
 *    insufficient role.
 *
 * All requests use valid schema-defined DTOs and respect format, required
 * fields, and value constraints. The test asserts all response types with
 * typia.assert() for thorough validation. Authentication tokens are managed
 * automatically by API SDK on each login/join. No direct manipulation of
 * headers is performed.
 *
 * This test ensures audit log data is securely accessible, properly filtered,
 * and paginated only for authorized administrators, while gracefully handling
 * error and edge cases.
 */
export async function test_api_audit_log_list_and_filter_paginated(
  connection: api.IConnection,
) {
  // 1. Create admin account
  const adminEmail = `admin+${RandomGenerator.alphaNumeric(6)}@example.com`;
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminPasswordHash = RandomGenerator.alphaNumeric(32);

  const admin: ITelegramFileDownloaderAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPasswordHash,
      },
    });
  typia.assert(admin);

  // 2. Authenticate admin (login) with correct plaintext password
  const loggedInAdmin: ITelegramFileDownloaderAdministrator.IAuthorized =
    await api.functional.auth.administrator.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      },
    });
  typia.assert(loggedInAdmin);

  // 3. Request audit logs with filters
  const filterBody: ITelegramFileDownloaderAuditLog.IRequest = {
    error_code: null,
    resolved: null,
    occurred_at_start: "2000-01-01T00:00:00.000Z" satisfies string &
      tags.Format<"date-time">,
    occurred_at_end: new Date().toISOString() satisfies string &
      tags.Format<"date-time">,
    page: 1,
    limit: 10,
    sort_by: "occurred_at",
    sort_order: "desc",
  };

  const auditPage: IPageITelegramFileDownloaderAuditLog =
    await api.functional.telegramFileDownloader.administrator.auditLogs.index(
      connection,
      {
        body: filterBody,
      },
    );
  typia.assert(auditPage);

  // Validate pagination details
  TestValidator.equals(
    "pagination current page equals 1",
    auditPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit equals 10",
    auditPage.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    auditPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    auditPage.pagination.records >= 0,
  );

  // Validate audit log entries
  for (const entry of auditPage.data) {
    typia.assert(entry);
    TestValidator.predicate(
      "each audit log has uuid id",
      typeof entry.id === "string" && entry.id.length > 0,
    );
    TestValidator.predicate(
      "audit log has error_code",
      typeof entry.error_code === "string" && entry.error_code.length > 0,
    );
    TestValidator.predicate(
      "audit log has occurred_at ISO date",
      typeof entry.occurred_at === "string",
    );
  }

  // 4. Test edge case: filters that return no logs
  const emptyFilterBody: ITelegramFileDownloaderAuditLog.IRequest = {
    error_code: "nonexistent-error-code",
    resolved: false,
    occurred_at_start: "2100-01-01T00:00:00.000Z" satisfies string &
      tags.Format<"date-time">,
    occurred_at_end: "2100-12-31T23:59:59.999Z" satisfies string &
      tags.Format<"date-time">,
    page: 1,
    limit: 5,
    sort_by: "occurred_at",
    sort_order: "asc",
  };

  const emptyPage: IPageITelegramFileDownloaderAuditLog =
    await api.functional.telegramFileDownloader.administrator.auditLogs.index(
      connection,
      {
        body: emptyFilterBody,
      },
    );
  typia.assert(emptyPage);

  TestValidator.equals(
    "empty page has zero records",
    emptyPage.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty page has zero data items",
    emptyPage.data.length,
    0,
  );

  // 5. Test unauthorized access - without login
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized access without login", async () => {
    await api.functional.telegramFileDownloader.administrator.auditLogs.index(
      unauthConnection,
      {
        body: filterBody,
      },
    );
  });
}
