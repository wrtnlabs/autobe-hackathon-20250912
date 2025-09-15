import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITelegramFileDownloaderAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderAdministrator";
import type { ITelegramFileDownloaderStorageUsage } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderStorageUsage";

export async function test_api_storage_usage_retrieve_detail_with_admin_authentication(
  connection: api.IConnection,
) {
  // Step 1: Administrator account creation and authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPasswordHash = RandomGenerator.alphaNumeric(64); // Simulated secure hash

  const admin: ITelegramFileDownloaderAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPasswordHash,
      } satisfies ITelegramFileDownloaderAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a valid UUID and retrieve storage usage detail
  const validStorageUsageId = typia.random<string & tags.Format<"uuid">>();
  const storageUsage: ITelegramFileDownloaderStorageUsage =
    await api.functional.telegramFileDownloader.administrator.storage_usages.at(
      connection,
      { id: validStorageUsageId },
    );
  typia.assert(storageUsage);

  TestValidator.predicate(
    "storage usage id matches requested id",
    storageUsage.id === validStorageUsageId,
  );

  TestValidator.predicate(
    "storage usage storage_bytes_used is non-negative",
    storageUsage.storage_bytes_used >= 0,
  );

  TestValidator.predicate(
    "storage usage file_count is non-negative",
    storageUsage.file_count >= 0,
  );

  TestValidator.predicate(
    "storage usage quota_max_bytes is positive",
    storageUsage.quota_max_bytes > 0,
  );

  TestValidator.predicate(
    "storage usage enduser_id is uuid",
    typia.is<string & tags.Format<"uuid">>(storageUsage.enduser_id),
  );

  // developer_id can be null or uuid
  if (
    storageUsage.developer_id !== null &&
    storageUsage.developer_id !== undefined
  ) {
    TestValidator.predicate(
      "storage usage developer_id is uuid",
      typia.is<string & tags.Format<"uuid">>(storageUsage.developer_id),
    );
  }

  // Step 3: Unauthorized access attempt
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthorized access to storage usage detail should fail",
    async () => {
      await api.functional.telegramFileDownloader.administrator.storage_usages.at(
        unauthenticatedConnection,
        { id: validStorageUsageId },
      );
    },
  );

  // Step 4: Non-existent UUID should result in error (likely 404)
  const nonExistentId = "00000000-0000-0000-0000-000000000000" as string &
    tags.Format<"uuid">;
  await TestValidator.error(
    "non-existent UUID should fail with error",
    async () => {
      await api.functional.telegramFileDownloader.administrator.storage_usages.at(
        connection,
        { id: nonExistentId },
      );
    },
  );
}
