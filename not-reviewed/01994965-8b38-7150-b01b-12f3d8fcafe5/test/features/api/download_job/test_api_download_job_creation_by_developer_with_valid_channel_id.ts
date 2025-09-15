import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITelegramFileDownloaderDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderDeveloper";
import type { ITelegramFileDownloaderDownloadJob } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderDownloadJob";

export async function test_api_download_job_creation_by_developer_with_valid_channel_id(
  connection: api.IConnection,
) {
  // 1. Register new developer user
  const developerCreateBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
  } satisfies ITelegramFileDownloaderDeveloper.ICreate;

  const authorizedDeveloper: ITelegramFileDownloaderDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, {
      body: developerCreateBody,
    });
  typia.assert(authorizedDeveloper);

  // 2. Login with the same developer
  const developerLoginBody = {
    email: developerCreateBody.email,
    password: developerCreateBody.password_hash,
  } satisfies ITelegramFileDownloaderDeveloper.ILogin;
  const loggedInDeveloper: ITelegramFileDownloaderDeveloper.IAuthorized =
    await api.functional.auth.developer.login(connection, {
      body: developerLoginBody,
    });
  typia.assert(loggedInDeveloper);

  // 3. Create a new download job
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const createDownloadJobBody = {
    channel_id: "valid_channel_id_xyz123",
    file_types: "mp4,zip,jpg,pdf",
    date_start: sevenDaysAgo.toISOString(),
    date_end: now.toISOString(),
  } satisfies ITelegramFileDownloaderDownloadJob.ICreate;

  const downloadJob: ITelegramFileDownloaderDownloadJob =
    await api.functional.telegramFileDownloader.developer.download_jobs.create(
      connection,
      {
        body: createDownloadJobBody,
      },
    );
  typia.assert(downloadJob);

  // Validate returned values
  TestValidator.equals(
    "download job channel ID matches",
    downloadJob.channel_id,
    createDownloadJobBody.channel_id,
  );
  TestValidator.equals(
    "download job file_types matches",
    downloadJob.file_types,
    createDownloadJobBody.file_types,
  );
  TestValidator.equals(
    "download job date_start matches",
    downloadJob.date_start,
    createDownloadJobBody.date_start,
  );
  TestValidator.equals(
    "download job date_end matches",
    downloadJob.date_end,
    createDownloadJobBody.date_end,
  );

  // Validate timestamps
  TestValidator.predicate(
    "download job created_at is ISO string",
    typeof downloadJob.created_at === "string" &&
      downloadJob.created_at.length > 0,
  );
  TestValidator.predicate(
    "download job updated_at is ISO string",
    typeof downloadJob.updated_at === "string" &&
      downloadJob.updated_at.length > 0,
  );

  // Validate status is one of expected statuses
  const validStatuses = [
    "pending",
    "in_progress",
    "completed",
    "failed",
  ] as const;
  TestValidator.predicate(
    "download job status is valid",
    validStatuses.includes(
      downloadJob.status as (typeof validStatuses)[number],
    ),
  );

  // Nullable fields check - developer_id should be present
  TestValidator.predicate(
    "download job has developer_id",
    downloadJob.developer_id !== null && downloadJob.developer_id !== undefined,
  );
  // Enduser_id expected to be null
  TestValidator.equals(
    "download job enduser_id is null",
    downloadJob.enduser_id,
    null,
  );
}
