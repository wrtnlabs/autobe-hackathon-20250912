import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITelegramFileDownloaderStorageUsage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITelegramFileDownloaderStorageUsage";
import type { ITelegramFileDownloaderAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderAdministrator";
import type { ITelegramFileDownloaderStorageUsage } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderStorageUsage";

/**
 * Verify administrator filtered storage usage pagination.
 *
 * This test covers the administrator user registration and authentication,
 * followed by querying storage usage records with filters for enduser and
 * developer IDs. It confirms valid results, pagination metadata, and error
 * responses for unauthorized and invalid inputs.
 *
 * Workflow:
 *
 * 1. Register new administrator account for authentication.
 * 2. Confirm administrator account authenticated with JWT token.
 * 3. Use authenticated connection to fetch filtered storage usages with
 *    enduser_id and developer_id pagination.
 * 4. Validate each returned record matches filters and pagination metadata is
 *    correct.
 * 5. Test unauthorized access to storage usage endpoint yields error.
 * 6. Test invalid filter UUIDs cause validation errors.
 */
export async function test_api_storage_usage_filtered_pagination_with_admin_authentication(
  connection: api.IConnection,
) {
  // 1. Administrator signup and authentication
  const adminCreateBody = {
    email: `admin_${RandomGenerator.alphaNumeric(8)}@example.com`,
    // Note password_hash must be a hashed password, so use a non-empty string
    password_hash: "hashed_password_123456",
  } satisfies ITelegramFileDownloaderAdministrator.ICreate;

  const adminAuthorized: ITelegramFileDownloaderAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminAuthorized);

  // 2. Prepare filter criteria using valid UUIDs from authorized admin (simulate realistic values)
  // For demonstrative purpose, use adminAuthorized.id for both filters
  const filterParams = {
    enduser_id: adminAuthorized.id,
    developer_id: adminAuthorized.id,
    page: 1,
    limit: 10,
    orderBy: "id",
    orderDirection: "asc",
  } satisfies ITelegramFileDownloaderStorageUsage.IRequest;

  // 3. Fetch storage usage records with filtering and pagination
  const storageUsagePage: IPageITelegramFileDownloaderStorageUsage.ISummary =
    await api.functional.telegramFileDownloader.administrator.storage_usages.index(
      connection,
      { body: filterParams },
    );
  typia.assert(storageUsagePage);

  // 4. Validate pagination metadata correctness
  const pagination = storageUsagePage.pagination;
  TestValidator.predicate(
    "pagination current page is correct",
    pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is correct",
    pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    pagination.records >= 0,
  );

  // 5. Validate that all returned storage usages are valid
  for (const record of storageUsagePage.data) {
    typia.assert(record);
    TestValidator.predicate(
      "storage usage record id exists",
      typeof record.id === "string" && record.id.length > 0,
    );
    TestValidator.predicate(
      "storage bytes used non-negative",
      record.storage_bytes_used >= 0,
    );
    TestValidator.predicate("file count non-negative", record.file_count >= 0);
    TestValidator.predicate(
      "quota max bytes non-negative",
      record.quota_max_bytes >= 0,
    );
  }

  // 6. Verify unauthorized access fails
  const unauthorizedConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized access throws error", async () => {
    await api.functional.telegramFileDownloader.administrator.storage_usages.index(
      unauthorizedConn,
      { body: filterParams },
    );
  });

  // 7. Verify API validation errors when invalid UUIDs are provided
  const invalidUuidParams1 = {
    enduser_id: "invalid-uuid-string",
    developer_id: adminAuthorized.id,
    page: 1,
    limit: 5,
    orderBy: null,
    orderDirection: null,
  } satisfies ITelegramFileDownloaderStorageUsage.IRequest;

  await TestValidator.error(
    "invalid enduser_id uuid throws validation error",
    async () => {
      await api.functional.telegramFileDownloader.administrator.storage_usages.index(
        connection,
        { body: invalidUuidParams1 },
      );
    },
  );

  const invalidUuidParams2 = {
    enduser_id: adminAuthorized.id,
    developer_id: "not-a-valid-uuid",
    page: 1,
    limit: 5,
    orderBy: "id",
    orderDirection: "asc",
  } satisfies ITelegramFileDownloaderStorageUsage.IRequest;

  await TestValidator.error(
    "invalid developer_id uuid throws validation error",
    async () => {
      await api.functional.telegramFileDownloader.administrator.storage_usages.index(
        connection,
        { body: invalidUuidParams2 },
      );
    },
  );
}
