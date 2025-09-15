import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITelegramFileDownloaderAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderAdministrator";
import type { ITelegramFileDownloaderStorageUsage } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderStorageUsage";

export async function test_api_storage_usage_update_with_admin_authentication(
  connection: api.IConnection,
) {
  // 1. Authenticate as administrator via join endpoint
  const adminEmail = typia.random<string & tags.Format<"email">>();
  // Simulate a hashed password string (not plain password)
  const adminPasswordHash = RandomGenerator.alphaNumeric(64);
  const admin: ITelegramFileDownloaderAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPasswordHash,
      } satisfies ITelegramFileDownloaderAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Simulate existing storage usage record data
  const existingStorageUsage: ITelegramFileDownloaderStorageUsage =
    typia.random<ITelegramFileDownloaderStorageUsage>();
  typia.assert(existingStorageUsage);

  // 3. Prepare update data with modifications
  const updatedStorageBytesUsed =
    existingStorageUsage.storage_bytes_used + 1024;
  const updatedFileCount = existingStorageUsage.file_count + 1;
  const updatedQuotaMaxBytes = existingStorageUsage.quota_max_bytes + 2048;
  const updateBody = {
    enduser_id: existingStorageUsage.enduser_id,
    developer_id: existingStorageUsage.developer_id ?? null,
    storage_bytes_used: updatedStorageBytesUsed,
    file_count: updatedFileCount,
    quota_max_bytes: updatedQuotaMaxBytes,
  } satisfies ITelegramFileDownloaderStorageUsage.IUpdate;

  // 4. Call update endpoint with the new data
  const updatedUsage: ITelegramFileDownloaderStorageUsage =
    await api.functional.telegramFileDownloader.administrator.storage_usages.updateStorageUsage(
      connection,
      {
        id: existingStorageUsage.id,
        body: updateBody,
      },
    );
  typia.assert(updatedUsage);

  // 5. Validate updated fields match the request
  TestValidator.equals(
    "Updated storage_bytes_used matches",
    updatedUsage.storage_bytes_used,
    updatedStorageBytesUsed,
  );
  TestValidator.equals(
    "Updated file_count matches",
    updatedUsage.file_count,
    updatedFileCount,
  );
  TestValidator.equals(
    "Updated quota_max_bytes matches",
    updatedUsage.quota_max_bytes,
    updatedQuotaMaxBytes,
  );

  // 6. Test error handling: update with non-existent ID (expect error)
  await TestValidator.error("Update fails with non-existent ID", async () => {
    await api.functional.telegramFileDownloader.administrator.storage_usages.updateStorageUsage(
      connection,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
        body: updateBody,
      },
    );
  });
}
