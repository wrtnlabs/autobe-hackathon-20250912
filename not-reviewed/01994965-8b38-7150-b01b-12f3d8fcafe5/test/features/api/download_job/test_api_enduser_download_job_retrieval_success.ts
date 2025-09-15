import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITelegramFileDownloaderDownloadJob } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderDownloadJob";
import type { ITelegramFileDownloaderEndUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderEndUser";

export async function test_api_enduser_download_job_retrieval_success(
  connection: api.IConnection,
) {
  // 1. Register a new endUser
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const createBody = {
    email,
    password_hash: password,
  } satisfies ITelegramFileDownloaderEndUser.ICreate;
  const authorized: ITelegramFileDownloaderEndUser.IAuthorized =
    await api.functional.auth.endUser.join(connection, { body: createBody });
  typia.assert(authorized);

  // 2. Login with the created endUser
  const loginBody = {
    email,
    password,
  } satisfies ITelegramFileDownloaderEndUser.ILogin;
  const loggedIn: ITelegramFileDownloaderEndUser.IAuthorized =
    await api.functional.auth.endUser.login(connection, { body: loginBody });
  typia.assert(loggedIn);

  // 3. Create a new download job
  const fileTypesValue = ["mp4", "zip", "pdf", "jpg", "png"] as const;
  const uniqueFileTypes = ArrayUtil.repeat(3, () =>
    RandomGenerator.pick(fileTypesValue),
  );
  // Remove duplicates
  const fileTypesSet = new Set(uniqueFileTypes);
  const selectedFileTypes = Array.from(fileTypesSet).join(",");

  const now = new Date();
  const dateStart = new Date(now.getTime() - 86400000 * 7).toISOString(); // 7 days ago
  const dateEnd = now.toISOString();

  const createJobBody = {
    channel_id: RandomGenerator.alphaNumeric(16),
    file_types: selectedFileTypes,
    date_start: dateStart,
    date_end: dateEnd,
  } satisfies ITelegramFileDownloaderDownloadJob.ICreate;
  const createdJob: ITelegramFileDownloaderDownloadJob =
    await api.functional.telegramFileDownloader.endUser.download_jobs.create(
      connection,
      { body: createJobBody },
    );
  typia.assert(createdJob);

  // 4. Retrieve the created download job by its ID
  const retrievedJob: ITelegramFileDownloaderDownloadJob =
    await api.functional.telegramFileDownloader.endUser.download_jobs.at(
      connection,
      { id: createdJob.id },
    );
  typia.assert(retrievedJob);

  // 5. Validate download job fields
  TestValidator.equals(
    "retrieved job id matches created job id",
    retrievedJob.id,
    createdJob.id,
  );
  TestValidator.equals(
    "retrieved job channel id matches",
    retrievedJob.channel_id,
    createdJob.channel_id,
  );
  TestValidator.equals(
    "retrieved job file types match",
    retrievedJob.file_types,
    createdJob.file_types,
  );
  TestValidator.equals(
    "retrieved job date_start matches",
    retrievedJob.date_start,
    createdJob.date_start,
  );
  TestValidator.equals(
    "retrieved job date_end matches",
    retrievedJob.date_end,
    createdJob.date_end,
  );
  TestValidator.predicate(
    "retrieved job enduser_id exists (not null or undefined)",
    retrievedJob.enduser_id !== null && retrievedJob.enduser_id !== undefined,
  );
  TestValidator.predicate(
    "retrieved job status is of type string",
    typeof retrievedJob.status === "string",
  );
  TestValidator.predicate(
    "retrieved job created_at is valid ISO date",
    !isNaN(Date.parse(retrievedJob.created_at)),
  );
  TestValidator.predicate(
    "retrieved job updated_at is valid ISO date",
    !isNaN(Date.parse(retrievedJob.updated_at)),
  );

  // 6. Test retrieval with non-existent UUID
  await TestValidator.error("non-existent UUID retrieval fails", async () => {
    await api.functional.telegramFileDownloader.endUser.download_jobs.at(
      connection,
      { id: typia.random<string & tags.Format<"uuid">>() },
    );
  });

  // 7. Authentication as different endUser for unauthorized retrieval
  const otherEmail = typia.random<string & tags.Format<"email">>();
  const otherPassword = RandomGenerator.alphaNumeric(12);
  const otherCreateBody = {
    email: otherEmail,
    password_hash: otherPassword,
  } satisfies ITelegramFileDownloaderEndUser.ICreate;
  const otherAuthorized: ITelegramFileDownloaderEndUser.IAuthorized =
    await api.functional.auth.endUser.join(connection, {
      body: otherCreateBody,
    });
  typia.assert(otherAuthorized);

  const otherLoginBody = {
    email: otherEmail,
    password: otherPassword,
  } satisfies ITelegramFileDownloaderEndUser.ILogin;
  const otherLoggedIn: ITelegramFileDownloaderEndUser.IAuthorized =
    await api.functional.auth.endUser.login(connection, {
      body: otherLoginBody,
    });
  typia.assert(otherLoggedIn);

  await TestValidator.error(
    "unauthorized user cannot retrieve other's download job",
    async () => {
      await api.functional.telegramFileDownloader.endUser.download_jobs.at(
        connection,
        { id: createdJob.id },
      );
    },
  );
}
