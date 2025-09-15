import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITelegramFileDownloaderFiles } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITelegramFileDownloaderFiles";
import type { ITelegramFileDownloaderDownloadJob } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderDownloadJob";
import type { ITelegramFileDownloaderEndUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderEndUser";
import type { ITelegramFileDownloaderFiles } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderFiles";

/**
 * This E2E test validates that an authenticated end user can list files
 * associated with a specific Telegram file downloader download job.
 *
 * The test covers the entire workflow:
 *
 * 1. End user registration (join) with random valid email and password hash
 * 2. End user login with created credentials
 * 3. Creation of a new download job with a simulated Telegram channel ID
 * 4. Retrieving a paginated, sorted list of files for the created download job,
 *    validating all returned data
 * 5. Negative test for unauthorized access (empty headers connection)
 * 6. Negative test for access to another user's download job files denial
 *
 * The test ensures authorization tokens are properly managed by the API calls,
 * pagination and sorting parameters work correctly, and ownership enforcement
 * prevents data leakage. All API responses are validated with typia.assert for
 * type safety. Business validations are performed with descriptive
 * TestValidator assertions.
 */
export async function test_api_enduser_list_files_by_download_job_with_authentication(
  connection: api.IConnection,
) {
  // 1. Register an end user
  const userCreateBody = {
    email: `user${RandomGenerator.alphaNumeric(6)}@test.com`,
    password_hash: RandomGenerator.alphaNumeric(16),
  } satisfies ITelegramFileDownloaderEndUser.ICreate;

  const joinedUser: ITelegramFileDownloaderEndUser.IAuthorized =
    await api.functional.auth.endUser.join(connection, {
      body: userCreateBody,
    });
  typia.assert(joinedUser);

  // 2. Login with the created user
  const userLoginBody = {
    email: userCreateBody.email,
    password: userCreateBody.password_hash,
  } satisfies ITelegramFileDownloaderEndUser.ILogin;

  const loggedInUser: ITelegramFileDownloaderEndUser.IAuthorized =
    await api.functional.auth.endUser.login(connection, {
      body: userLoginBody,
    });
  typia.assert(loggedInUser);

  // 3. Create a Telegram file downloader download job
  // Use a realistic telegram channel id for simulation
  const downloadJobCreateBody = {
    channel_id: `@${RandomGenerator.alphaNumeric(8)}`,
  } satisfies ITelegramFileDownloaderDownloadJob.ICreate;

  const downloadJob: ITelegramFileDownloaderDownloadJob =
    await api.functional.telegramFileDownloader.endUser.download_jobs.create(
      connection,
      {
        body: downloadJobCreateBody,
      },
    );
  typia.assert(downloadJob);

  TestValidator.equals(
    "download job user ownership",
    downloadJob.enduser_id,
    joinedUser.id,
  );

  // 4. Request the paginated list of files with authentication
  const fileListRequestBody: ITelegramFileDownloaderFiles.IRequest = {
    page: 1,
    limit: 10,
    sort: ["filename:asc"],
    search: null,
  };

  const fileList: IPageITelegramFileDownloaderFiles =
    await api.functional.telegramFileDownloader.endUser.download_jobs.files.index(
      connection,
      {
        downloadJobId: downloadJob.id,
        body: fileListRequestBody,
      },
    );
  typia.assert(fileList);

  TestValidator.predicate(
    "pagination current page should be 1",
    fileList.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit should be 10",
    fileList.pagination.limit === 10,
  );
  TestValidator.predicate(
    "all files belong to download job",
    fileList.data.every((file) => file.download_job_id === downloadJob.id),
  );

  // 5. Negative test: Unauthorized access (empty headers)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated request should throw",
    async () =>
      await api.functional.telegramFileDownloader.endUser.download_jobs.files.index(
        unauthenticatedConnection,
        {
          downloadJobId: downloadJob.id,
          body: fileListRequestBody,
        },
      ),
  );

  // 6. Negative test: User attempts to access a job not owned by them
  // Register a second user
  const secondUserCreateBody = {
    email: `user${RandomGenerator.alphaNumeric(6)}@test.com`,
    password_hash: RandomGenerator.alphaNumeric(16),
  } satisfies ITelegramFileDownloaderEndUser.ICreate;
  const secondUser: ITelegramFileDownloaderEndUser.IAuthorized =
    await api.functional.auth.endUser.join(connection, {
      body: secondUserCreateBody,
    });
  typia.assert(secondUser);

  // Login as the second user
  const secondUserLoginBody = {
    email: secondUserCreateBody.email,
    password: secondUserCreateBody.password_hash,
  } satisfies ITelegramFileDownloaderEndUser.ILogin;
  const loggedInSecondUser: ITelegramFileDownloaderEndUser.IAuthorized =
    await api.functional.auth.endUser.login(connection, {
      body: secondUserLoginBody,
    });
  typia.assert(loggedInSecondUser);

  // Caller connection now has second user's authorization token
  // Attempt to list files for first user's download job
  await TestValidator.error(
    "second user cannot access first user's download job files",
    async () =>
      await api.functional.telegramFileDownloader.endUser.download_jobs.files.index(
        connection,
        {
          downloadJobId: downloadJob.id,
          body: fileListRequestBody,
        },
      ),
  );
}
