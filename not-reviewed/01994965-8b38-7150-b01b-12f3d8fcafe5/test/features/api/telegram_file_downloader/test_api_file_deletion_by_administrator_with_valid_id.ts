import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITelegramFileDownloaderAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderAdministrator";

/**
 * E2E test for permanent deletion of file by administrator with valid ID.
 *
 * This test validates the complete workflow where an administrator user is
 * created, authenticated, and then performs a DELETE operation to erase a
 * file associated with a specific download job.
 *
 * Steps:
 *
 * 1. Administrator joins with a valid email and password_hash.
 * 2. Administrator logs in with the same credentials to receive fresh tokens.
 * 3. Using a valid downloadJobId and file id (both UUIDs), administrator calls
 *    DELETE API to erase file.
 * 4. The absence of an error confirms successful file deletion.
 *
 * All data strictly follows the DTO definitions, with UUID format
 * enforcement, and all API calls are awaited and type-validated where
 * applicable. Authentication tokens are handled automatically by the API
 * client.
 */
export async function test_api_file_deletion_by_administrator_with_valid_id(
  connection: api.IConnection,
) {
  // 1. Administrator account registration
  const email = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const password = RandomGenerator.alphaNumeric(12);
  const password_hash = password;

  const adminCreateBody = {
    email,
    password_hash,
  } satisfies ITelegramFileDownloaderAdministrator.ICreate;

  const admin: ITelegramFileDownloaderAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(admin);

  // 2. Administrator login
  const adminLoginBody = {
    email,
    password,
  } satisfies ITelegramFileDownloaderAdministrator.ILogin;

  const loggedInAdmin: ITelegramFileDownloaderAdministrator.IAuthorized =
    await api.functional.auth.administrator.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(loggedInAdmin);

  // 3. Generate valid UUIDs for downloadJobId and file id
  const downloadJobId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const fileId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. Call DELETE API to erase the file
  await api.functional.telegramFileDownloader.administrator.download_jobs.files.erase(
    connection,
    {
      downloadJobId,
      id: fileId,
    },
  );
  // No response to assert since return type is void
}
