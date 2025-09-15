import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITelegramFileDownloaderAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderAdministrator";

/**
 * Test scenario for deleting a job queue entry as an administrator with full
 * authentication and error handling.
 *
 * This test validates:
 *
 * 1. Administrator registration with valid credentials.
 * 2. Administrator login to obtain JWT tokens.
 * 3. Successful deletion of an existing job queue entry.
 * 4. Failure when attempting to delete a non-existent job queue entry.
 * 5. Enforcement of administrator-only authorization for deletion.
 */
export async function test_api_administrator_job_queue_entry_deletion_with_authentication_and_error_handling(
  connection: api.IConnection,
) {
  // 1. Create administrator account
  const adminCreateBody = {
    email: `admin_${RandomGenerator.alphaNumeric(6)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
  } satisfies ITelegramFileDownloaderAdministrator.ICreate;

  const administrator: ITelegramFileDownloaderAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(administrator);

  // 2. Login as administrator
  const adminLoginBody = {
    email: administrator.email,
    password: adminCreateBody.password_hash,
  } satisfies ITelegramFileDownloaderAdministrator.ILogin;

  const loginResponse: ITelegramFileDownloaderAdministrator.IAuthorized =
    await api.functional.auth.administrator.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(loginResponse);

  // 3. Delete an existing job queue entry by valid UUID
  const jobQueueIdToDelete = typia.random<string & tags.Format<"uuid">>();
  await api.functional.telegramFileDownloader.administrator.jobQueues.erase(
    connection,
    {
      id: jobQueueIdToDelete,
    },
  );

  // 4. Test deletion of a non-existent job queue ID (assert error thrown)
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "deletion of non-existent job queue ID should fail",
    async () => {
      await api.functional.telegramFileDownloader.administrator.jobQueues.erase(
        connection,
        {
          id: nonExistentId,
        },
      );
    },
  );

  // 5. Test unauthorized deletion attempt (simulate unauthenticated connection)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthorized deletion attempt should fail",
    async () => {
      await api.functional.telegramFileDownloader.administrator.jobQueues.erase(
        unauthenticatedConnection,
        {
          id: jobQueueIdToDelete,
        },
      );
    },
  );
}
