import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITelegramFileDownloaderDownloadJob } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderDownloadJob";
import type { ITelegramFileDownloaderEndUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderEndUser";

export async function test_api_telegram_file_downloader_end_user_download_jobs_create_with_valid_data(
  connection: api.IConnection,
) {
  // 1. Register a new end user account with unique email and password hash
  const email: string & tags.Format<"email"> =
    `user${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1>>()}@example.com`;
  const passwordHash = RandomGenerator.alphaNumeric(64); // simulate secure hash

  const createUserRequestBody = {
    email,
    password_hash: passwordHash,
  } satisfies ITelegramFileDownloaderEndUser.ICreate;

  const authorizedUser: ITelegramFileDownloaderEndUser.IAuthorized =
    await api.functional.auth.endUser.join(connection, {
      body: createUserRequestBody,
    });
  typia.assert(authorizedUser);

  // 2. Create a new download job linked to the authenticated user
  // Use realistic data for channel_id, file_types and date range filters
  const downloadJobRequestBody = {
    channel_id: `channel${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1>>()}`,
    file_types: "mp4,zip,pdf",
    date_start: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(), // 7 days ago
    date_end: new Date().toISOString(), // current time
  } satisfies ITelegramFileDownloaderDownloadJob.ICreate;

  const createdJob: ITelegramFileDownloaderDownloadJob =
    await api.functional.telegramFileDownloader.endUser.download_jobs.create(
      connection,
      {
        body: downloadJobRequestBody,
      },
    );
  typia.assert(createdJob);

  // Validate key properties returned by the creation
  TestValidator.equals(
    "download job channel_id matches request",
    createdJob.channel_id,
    downloadJobRequestBody.channel_id,
  );
  TestValidator.predicate(
    "download job ID is a non-empty string",
    typeof createdJob.id === "string" && createdJob.id.length > 0,
  );
  TestValidator.predicate(
    "download job status is one of the expected statuses",
    ["pending", "in_progress", "completed", "failed"].includes(
      createdJob.status,
    ),
  );
  TestValidator.predicate(
    "download job created_at and updated_at are valid ISO 8601 strings",
    typeof createdJob.created_at === "string" &&
      !isNaN(Date.parse(createdJob.created_at)) &&
      typeof createdJob.updated_at === "string" &&
      !isNaN(Date.parse(createdJob.updated_at)),
  );
}
