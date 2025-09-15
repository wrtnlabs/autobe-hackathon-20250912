import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITelegramFileDownloaderDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderDeveloper";
import type { ITelegramFileDownloaderDownloadJob } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderDownloadJob";

export async function test_api_developer_delete_download_job_with_authentication(
  connection: api.IConnection,
) {
  // Step 1: Developer user registration
  const developerCreateBody = {
    email: RandomGenerator.alphaNumeric(5) + "@example.com",
    password_hash: RandomGenerator.alphaNumeric(10),
  } satisfies ITelegramFileDownloaderDeveloper.ICreate;

  const developer: ITelegramFileDownloaderDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, {
      body: developerCreateBody,
    });
  typia.assert(developer);

  // Step 2: Developer login
  const developerLoginBody = {
    email: developerCreateBody.email,
    password: developerCreateBody.password_hash,
  } satisfies ITelegramFileDownloaderDeveloper.ILogin;

  const loginResult: ITelegramFileDownloaderDeveloper.IAuthorized =
    await api.functional.auth.developer.login(connection, {
      body: developerLoginBody,
    });
  typia.assert(loginResult);

  // Step 3: Create a download job for the developer
  const downloadJobCreateBody = {
    channel_id: RandomGenerator.alphaNumeric(10),
    file_types: "mp4,jpg",
    date_start: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    date_end: new Date().toISOString(),
  } satisfies ITelegramFileDownloaderDownloadJob.ICreate;

  const downloadJob: ITelegramFileDownloaderDownloadJob =
    await api.functional.telegramFileDownloader.developer.download_jobs.create(
      connection,
      {
        body: downloadJobCreateBody,
      },
    );
  typia.assert(downloadJob);

  // Step 4: Delete the newly created download job
  await api.functional.telegramFileDownloader.developer.download_jobs.erase(
    connection,
    {
      id: downloadJob.id,
    },
  );

  // Step 5: Verify that the job is deleted by attempting deletion again (should throw 404)
  await TestValidator.error(
    "deleting already deleted job should fail",
    async () => {
      await api.functional.telegramFileDownloader.developer.download_jobs.erase(
        connection,
        {
          id: downloadJob.id,
        },
      );
    },
  );

  // Negative Test 1: Attempt deletion without authentication (headers should be empty)
  const unauthenticatedConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated deletion should fail",
    async () => {
      await api.functional.telegramFileDownloader.developer.download_jobs.erase(
        unauthenticatedConnection,
        { id: downloadJob.id },
      );
    },
  );

  // Negative Test 2: Attempt deletion with another developer's credentials
  const otherDeveloperCreateBody = {
    email: RandomGenerator.alphaNumeric(5) + "@example.com",
    password_hash: RandomGenerator.alphaNumeric(10),
  } satisfies ITelegramFileDownloaderDeveloper.ICreate;

  const otherDeveloper: ITelegramFileDownloaderDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, {
      body: otherDeveloperCreateBody,
    });
  typia.assert(otherDeveloper);

  const otherDeveloperLoginResult: ITelegramFileDownloaderDeveloper.IAuthorized =
    await api.functional.auth.developer.login(connection, {
      body: {
        email: otherDeveloperCreateBody.email,
        password: otherDeveloperCreateBody.password_hash,
      } satisfies ITelegramFileDownloaderDeveloper.ILogin,
    });
  typia.assert(otherDeveloperLoginResult);
  connection.headers ??= {};
  connection.headers.Authorization = otherDeveloperLoginResult.token.access;

  await TestValidator.error(
    "other developer deletion should fail",
    async () => {
      await api.functional.telegramFileDownloader.developer.download_jobs.erase(
        connection,
        { id: downloadJob.id },
      );
    },
  );

  // Negative Test 3: Attempt deletion of non-existent job ID
  const fakeJobId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "deletion of non-existent job should fail",
    async () => {
      await api.functional.telegramFileDownloader.developer.download_jobs.erase(
        connection,
        {
          id: fakeJobId,
        },
      );
    },
  );
}
