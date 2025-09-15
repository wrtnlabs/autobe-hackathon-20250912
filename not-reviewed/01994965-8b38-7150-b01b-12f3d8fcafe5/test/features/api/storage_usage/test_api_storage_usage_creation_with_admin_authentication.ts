import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITelegramFileDownloaderAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderAdministrator";
import type { ITelegramFileDownloaderStorageUsage } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderStorageUsage";

/**
 * Test scenario to verify that an administrator can create new storage usage
 * records with proper authorization and validation.
 *
 * This test performs the following steps:
 *
 * 1. Administrator user account is created and authenticated via the join
 *    endpoint. This returns an authorized administrator with valid JWT token.
 * 2. Using the administrator authorization, a storage usage creation request is
 *    sent with proper payload containing required fields:
 *
 *    - Enduser_id (valid uuid)
 *    - Developer_id (optional valid uuid or null)
 *    - Storage_bytes_used (valid int32 number)
 *    - File_count (valid int32 number)
 *    - Quota_max_bytes (valid int32 number)
 * 3. Validate the response is a storage usage record matching the sent data with
 *    proper fields.
 *
 * Additional tests include:
 *
 * - Attempting to create with invalid UUID formats for enduser_id or developer_id
 *   and expecting errors.
 * - Attempting to create without administrator authentication and expecting
 *   authorization error.
 *
 * The validation points include:
 *
 * - Authorization enforcement: only administrators can create storage usage
 *   records.
 * - Required fields presence and valid UUID format for identifiers.
 * - Integer storage values within valid int32 range.
 * - Proper handling of uniqueness and validation error cases.
 *
 * Business logic:
 *
 * - Only administrator role can create storage usage.
 * - UUIDs must be valid format.
 *
 * Success criteria:
 *
 * - Administrator authentication succeeds.
 * - Storage usage creation succeeds with accurate data.
 * - Invalid or unauthorized operations fail correctly.
 *
 * Error handling:
 *
 * - Invalid UUIDs or missing mandatory properties lead to validation errors.
 * - Unauthorized access leads to auth error.
 *
 * This test demonstrates end-to-end secure storage usage creation with admin
 * role.
 */
export async function test_api_storage_usage_creation_with_admin_authentication(
  connection: api.IConnection,
) {
  // 1. Administrator joins and authenticates
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const administrator: ITelegramFileDownloaderAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password_hash: "hashed_password_example123!",
      } satisfies ITelegramFileDownloaderAdministrator.ICreate,
    });
  typia.assert(administrator);

  // 2. Storage usage creation with valid data
  const createBody1 = {
    enduser_id: typia.random<string & tags.Format<"uuid">>(),
    developer_id: typia.random<string & tags.Format<"uuid">>(),
    storage_bytes_used: 10000,
    file_count: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<10000>
    >(),
    quota_max_bytes: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1000> & tags.Maximum<1000000>
    >(),
  } satisfies ITelegramFileDownloaderStorageUsage.ICreate;

  const storageUsage1: ITelegramFileDownloaderStorageUsage =
    await api.functional.telegramFileDownloader.administrator.storage_usages.create(
      connection,
      {
        body: createBody1,
      },
    );
  typia.assert(storageUsage1);

  TestValidator.equals(
    "Storage usage enduser_id matches",
    storageUsage1.enduser_id,
    createBody1.enduser_id,
  );
  TestValidator.equals(
    "Storage usage developer_id matches",
    storageUsage1.developer_id,
    createBody1.developer_id,
  );
  TestValidator.equals(
    "Storage bytes used matches",
    storageUsage1.storage_bytes_used,
    createBody1.storage_bytes_used,
  );
  TestValidator.equals(
    "Storage file count matches",
    storageUsage1.file_count,
    createBody1.file_count,
  );
  TestValidator.equals(
    "Storage quota max bytes matches",
    storageUsage1.quota_max_bytes,
    createBody1.quota_max_bytes,
  );

  // 3. Storage usage creation with null developer_id
  const createBody2 = {
    enduser_id: typia.random<string & tags.Format<"uuid">>(),
    developer_id: null,
    storage_bytes_used: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<9999999>
    >(),
    file_count: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<5000>
    >(),
    quota_max_bytes: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1000> & tags.Maximum<2000000>
    >(),
  } satisfies ITelegramFileDownloaderStorageUsage.ICreate;

  const storageUsage2: ITelegramFileDownloaderStorageUsage =
    await api.functional.telegramFileDownloader.administrator.storage_usages.create(
      connection,
      {
        body: createBody2,
      },
    );
  typia.assert(storageUsage2);

  TestValidator.equals(
    "Storage usage enduser_id matches with null developer_id",
    storageUsage2.enduser_id,
    createBody2.enduser_id,
  );
  TestValidator.equals(
    "Storage usage developer_id is null",
    storageUsage2.developer_id,
    null,
  );

  // 4. Error case: Attempt creation with invalid UUID for enduser_id
  await TestValidator.error(
    "Invalid enduser_id UUID format should fail",
    async () => {
      await api.functional.telegramFileDownloader.administrator.storage_usages.create(
        connection,
        {
          body: {
            enduser_id: "invalid-uuid",
            developer_id: typia.random<string & tags.Format<"uuid">>(),
            storage_bytes_used: 1234,
            file_count: 10,
            quota_max_bytes: 10000,
          } satisfies ITelegramFileDownloaderStorageUsage.ICreate,
        },
      );
    },
  );

  // 5. Error case: Attempt creation without administrator authentication
  const nonAuthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "Unauthorized creation attempt should fail",
    async () => {
      await api.functional.telegramFileDownloader.administrator.storage_usages.create(
        nonAuthConnection,
        {
          body: createBody1,
        },
      );
    },
  );
}
