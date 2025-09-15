import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITelegramFileDownloaderDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderDeveloper";
import type { ITelegramFileDownloaderDownloadJob } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderDownloadJob";

/**
 * This test validates the authenticated developer user workflow for creating
 * and retrieving a download job.
 *
 * It ensures:
 *
 * - Successful developer account creation and login
 * - Creation of a valid download job with filters
 * - Retrieval of the created download job by ID
 * - Authorization enforcement preventing unauthorized access
 * - Handling non-existent job retrieval error
 */
export async function test_api_download_job_retrieval_by_developer_authenticated(
  connection: api.IConnection,
) {
  // Create a unique email and password for the developer
  const developerEmail = typia.random<string & tags.Format<"email">>();
  const developerPassword = RandomGenerator.alphaNumeric(12);

  // 1. Developer join (registration) with email and password_hash
  // Simulate password hash as the same password for testing consistency
  const developerCreateBody = {
    email: developerEmail,
    password_hash: developerPassword,
  } satisfies ITelegramFileDownloaderDeveloper.ICreate;
  const createdDeveloper: ITelegramFileDownloaderDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, {
      body: developerCreateBody,
    });
  typia.assert(createdDeveloper);
  TestValidator.predicate(
    "developer join token should exist",
    Boolean(createdDeveloper.token.access),
  );

  // 2. Developer login with same credentials
  const developerLoginBody = {
    email: developerEmail,
    password: developerPassword,
  } satisfies ITelegramFileDownloaderDeveloper.ILogin;
  const loggedInDeveloper: ITelegramFileDownloaderDeveloper.IAuthorized =
    await api.functional.auth.developer.login(connection, {
      body: developerLoginBody,
    });
  typia.assert(loggedInDeveloper);
  TestValidator.equals(
    "logged in developer email matches",
    loggedInDeveloper.email,
    developerEmail,
  );

  // 3. Create a download job with channel_id and filters
  const nowISOString = new Date().toISOString();
  const oneDayLater = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const downloadJobCreateBody = {
    channel_id: "@telegramChannel1234",
    file_types: "mp4,zip",
    date_start: nowISOString,
    date_end: oneDayLater,
  } satisfies ITelegramFileDownloaderDownloadJob.ICreate;
  const createdDownloadJob: ITelegramFileDownloaderDownloadJob =
    await api.functional.telegramFileDownloader.developer.download_jobs.create(
      connection,
      { body: downloadJobCreateBody },
    );
  typia.assert(createdDownloadJob);

  TestValidator.predicate(
    "created download job id is UUID",
    typeof createdDownloadJob.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        createdDownloadJob.id,
      ),
  );

  TestValidator.equals(
    "created job channel_id matches input",
    createdDownloadJob.channel_id,
    downloadJobCreateBody.channel_id,
  );

  // 4. Retrieve the download job by its ID
  const retrievedDownloadJob: ITelegramFileDownloaderDownloadJob =
    await api.functional.telegramFileDownloader.developer.download_jobs.at(
      connection,
      { id: createdDownloadJob.id },
    );
  typia.assert(retrievedDownloadJob);

  TestValidator.equals(
    "retrieved job id matches created job",
    retrievedDownloadJob.id,
    createdDownloadJob.id,
  );
  TestValidator.equals(
    "retrieved job channel_id matches",
    retrievedDownloadJob.channel_id,
    createdDownloadJob.channel_id,
  );
  TestValidator.equals(
    "retrieved job file_types matches",
    retrievedDownloadJob.file_types ?? null,
    createdDownloadJob.file_types ?? null,
  );
  TestValidator.predicate(
    "retrieved job status is string",
    typeof retrievedDownloadJob.status === "string",
  );
  TestValidator.predicate(
    "retrieved job created_at is ISO 8601",
    typeof retrievedDownloadJob.created_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z$/.test(
        retrievedDownloadJob.created_at,
      ),
  );

  // 5. Unauthorized retrieval attempt: unauthenticated connection
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthenticated retrieval should error",
    async () => {
      await api.functional.telegramFileDownloader.developer.download_jobs.at(
        unauthenticatedConnection,
        { id: createdDownloadJob.id },
      );
    },
  );

  // 6. Unauthorized retrieval attempt: different developer
  const otherDeveloperEmail = typia.random<string & tags.Format<"email">>();
  const otherDeveloperPassword = RandomGenerator.alphaNumeric(12);
  const otherDeveloperCreateBody = {
    email: otherDeveloperEmail,
    password_hash: otherDeveloperPassword,
  } satisfies ITelegramFileDownloaderDeveloper.ICreate;
  const otherDeveloper: ITelegramFileDownloaderDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, {
      body: otherDeveloperCreateBody,
    });
  typia.assert(otherDeveloper);

  const otherDeveloperLoginBody = {
    email: otherDeveloperEmail,
    password: otherDeveloperPassword,
  } satisfies ITelegramFileDownloaderDeveloper.ILogin;
  await api.functional.auth.developer.login(connection, {
    body: otherDeveloperLoginBody,
  });

  await TestValidator.error(
    "different developer cannot retrieve job",
    async () => {
      await api.functional.telegramFileDownloader.developer.download_jobs.at(
        connection,
        { id: createdDownloadJob.id },
      );
    },
  );

  // 7. Retrieval attempt with non-existent job id
  const nonExistentJobId =
    "00000000-0000-0000-0000-000000000000" satisfies string &
      tags.Format<"uuid">;
  await TestValidator.error(
    "retrieving non-existent job id throws error",
    async () => {
      await api.functional.telegramFileDownloader.developer.download_jobs.at(
        connection,
        { id: nonExistentJobId },
      );
    },
  );
}
