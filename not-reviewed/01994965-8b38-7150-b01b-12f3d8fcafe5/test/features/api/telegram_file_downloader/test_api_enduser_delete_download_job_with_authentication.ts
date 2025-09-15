import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITelegramFileDownloaderDownloadJob } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderDownloadJob";
import type { ITelegramFileDownloaderEndUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderEndUser";

export async function test_api_enduser_delete_download_job_with_authentication(
  connection: api.IConnection,
) {
  // Register the first end user and obtain the access token
  const user1Email: string = typia.random<string & tags.Format<"email">>();
  const user1CreateBody = {
    email: user1Email,
    password_hash: RandomGenerator.alphaNumeric(32),
  } satisfies ITelegramFileDownloaderEndUser.ICreate;
  const user1Authorized: ITelegramFileDownloaderEndUser.IAuthorized =
    await api.functional.auth.endUser.join(connection, {
      body: user1CreateBody,
    });
  typia.assert(user1Authorized);

  // Login the first user again (per scenario) to ensure token is current
  const user1LoginBody = {
    email: user1Email,
    password: user1CreateBody.password_hash,
  } satisfies ITelegramFileDownloaderEndUser.ILogin;
  const user1LoggedIn: ITelegramFileDownloaderEndUser.IAuthorized =
    await api.functional.auth.endUser.login(connection, {
      body: user1LoginBody,
    });
  typia.assert(user1LoggedIn);

  // Create a download job for user1
  const createJobBody = {
    channel_id: `channel_${RandomGenerator.alphaNumeric(8)}`,
    file_types: null,
    date_start: null,
    date_end: null,
  } satisfies ITelegramFileDownloaderDownloadJob.ICreate;
  const downloadJob: ITelegramFileDownloaderDownloadJob =
    await api.functional.telegramFileDownloader.endUser.download_jobs.create(
      connection,
      {
        body: createJobBody,
      },
    );
  typia.assert(downloadJob);

  // Delete the created download job successfully
  await api.functional.telegramFileDownloader.endUser.download_jobs.erase(
    connection,
    { id: downloadJob.id },
  );

  // Attempt to delete the same job again, which should fail because job is deleted
  await TestValidator.error(
    "attempt to delete already deleted job should fail",
    async () => {
      await api.functional.telegramFileDownloader.endUser.download_jobs.erase(
        connection,
        { id: downloadJob.id },
      );
    },
  );

  // Register a second end user
  const user2Email: string = typia.random<string & tags.Format<"email">>();
  const user2CreateBody = {
    email: user2Email,
    password_hash: RandomGenerator.alphaNumeric(32),
  } satisfies ITelegramFileDownloaderEndUser.ICreate;
  const user2Authorized: ITelegramFileDownloaderEndUser.IAuthorized =
    await api.functional.auth.endUser.join(connection, {
      body: user2CreateBody,
    });
  typia.assert(user2Authorized);

  // Login the second user
  const user2LoginBody = {
    email: user2Email,
    password: user2CreateBody.password_hash,
  } satisfies ITelegramFileDownloaderEndUser.ILogin;
  const user2LoggedIn: ITelegramFileDownloaderEndUser.IAuthorized =
    await api.functional.auth.endUser.login(connection, {
      body: user2LoginBody,
    });
  typia.assert(user2LoggedIn);

  // For ownership failure test, create a new download job for user1 again
  // Authenticate as user1 by logging in again to ensure token
  // (SDK manages headers automatically)
  await api.functional.auth.endUser.login(connection, { body: user1LoginBody });
  const downloadJob2: ITelegramFileDownloaderDownloadJob =
    await api.functional.telegramFileDownloader.endUser.download_jobs.create(
      connection,
      {
        body: createJobBody,
      },
    );
  typia.assert(downloadJob2);

  // Switch back to user2 by logging in with user2 credentials to change auth headers
  await api.functional.auth.endUser.login(connection, { body: user2LoginBody });

  // User2 attempts to delete user1's download job, expecting failure
  await TestValidator.error(
    "user2 cannot delete user1's download job",
    async () => {
      await api.functional.telegramFileDownloader.endUser.download_jobs.erase(
        connection,
        { id: downloadJob2.id },
      );
    },
  );
}
