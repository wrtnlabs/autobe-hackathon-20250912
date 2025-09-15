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
 * Test the deletion of storage usage records by an administrator.
 *
 * This test performs comprehensive validation of the storage usage deletion API
 * for administrators. It first registers an administrator account,
 * authenticates, queries existing storage usage records to find an ID, deletes
 * the record by ID, and verifies successful removal by attempting deletion
 * again and expecting errors. It also tests unauthorized and invalid ID
 * deletion scenarios.
 */
export async function test_api_storage_usage_deletion_by_administrator(
  connection: api.IConnection,
) {
  // 1. Register and authenticate administrator
  const adminEmail = `${RandomGenerator.name()}@example.com`;
  const adminPasswordHash = RandomGenerator.alphaNumeric(30);
  const administrator: ITelegramFileDownloaderAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPasswordHash,
      } satisfies ITelegramFileDownloaderAdministrator.ICreate,
    });
  typia.assert(administrator);

  // 2. Query existing storage usage records
  const storageUsagePage: IPageITelegramFileDownloaderStorageUsage.ISummary =
    await api.functional.telegramFileDownloader.administrator.storage_usages.index(
      connection,
      {
        body: {
          // No filters, fetch first page with limits
          page: 1,
          limit: 10,
          deleted_at_null: true, // active records only
        } satisfies ITelegramFileDownloaderStorageUsage.IRequest,
      },
    );
  typia.assert(storageUsagePage);

  // Validate there is at least one record
  TestValidator.predicate(
    "storage usage data exists",
    storageUsagePage.data.length > 0,
  );

  // 3. Attempt to delete the first storage usage record
  const targetStorageUsageId: string = storageUsagePage.data[0]?.id;

  await api.functional.telegramFileDownloader.administrator.storage_usages.eraseStorageUsage(
    connection,
    {
      id: targetStorageUsageId,
    },
  );

  // 4. Attempting to delete the same record again should throw an error
  await TestValidator.error(
    "deletion of non-existing storage usage should fail",
    async () => {
      await api.functional.telegramFileDownloader.administrator.storage_usages.eraseStorageUsage(
        connection,
        {
          id: targetStorageUsageId,
        },
      );
    },
  );

  // 5. Deletion with invalid UUID format should throw error
  await TestValidator.error(
    "deletion with invalid UUID should fail",
    async () => {
      await api.functional.telegramFileDownloader.administrator.storage_usages.eraseStorageUsage(
        connection,
        {
          id: "invalid-uuid-format",
        },
      );
    },
  );

  // 6. Unauthorized deletion attempt by anonymous connection
  const anonymousConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized deletion attempt should fail",
    async () => {
      await api.functional.telegramFileDownloader.administrator.storage_usages.eraseStorageUsage(
        anonymousConnection,
        {
          id: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
