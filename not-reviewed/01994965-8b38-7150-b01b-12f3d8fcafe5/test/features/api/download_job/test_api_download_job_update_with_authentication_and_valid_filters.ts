import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITelegramFileDownloaderDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderDeveloper";
import type { ITelegramFileDownloaderDownloadJob } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderDownloadJob";

/**
 * This test function validates the complete workflow where a developer user
 * safely registers, logs in, creates a download job, updates it with valid
 * filters, and validates all steps.
 *
 * Steps:
 *
 * 1. Register a developer account with unique email and password.
 * 2. Login as this developer to obtain valid JWT tokens.
 * 3. Create a download job with a valid Telegram channel ID, file_types, and
 *    date filters.
 * 4. Update the job modifying file_types, date_start, date_end, and status.
 * 5. Validate the updated download job reflects the new filters and status
 *    properly.
 * 6. Attempt negative tests such as unauthorized update and update on
 *    non-existent job.
 *
 * All API calls use await and typia.assert for runtime type validation.
 * Permissions and authentication tokens are managed by SDK automatically.
 */
export async function test_api_download_job_update_with_authentication_and_valid_filters(
  connection: api.IConnection,
) {
  // Step 1: Developer registration
  const developerEmail: string = typia.random<string & tags.Format<"email">>();
  const developerPassword: string = RandomGenerator.alphaNumeric(12);
  const developer: ITelegramFileDownloaderDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, {
      body: {
        email: developerEmail,
        password_hash: developerPassword,
      } satisfies ITelegramFileDownloaderDeveloper.ICreate,
    });
  typia.assert(developer);

  // Step 2: Developer login
  const loggedInDeveloper: ITelegramFileDownloaderDeveloper.IAuthorized =
    await api.functional.auth.developer.login(connection, {
      body: {
        email: developerEmail,
        password: developerPassword,
      } satisfies ITelegramFileDownloaderDeveloper.ILogin,
    });
  typia.assert(loggedInDeveloper);

  // Step 3: Create a new download job
  const channelId = `channel_${RandomGenerator.alphaNumeric(6)}`;
  const initialFileTypes = "mp4,zip,jpg";
  const dateStart = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const dateEnd = new Date(Date.now()).toISOString();

  const createdJob: ITelegramFileDownloaderDownloadJob =
    await api.functional.telegramFileDownloader.developer.download_jobs.create(
      connection,
      {
        body: {
          channel_id: channelId,
          file_types: initialFileTypes,
          date_start: dateStart,
          date_end: dateEnd,
        } satisfies ITelegramFileDownloaderDownloadJob.ICreate,
      },
    );
  typia.assert(createdJob);

  // Step 4: Update the download job
  const updatedFileTypes = "pdf,docx";
  const updatedDateStart = new Date(
    Date.now() - 14 * 24 * 3600 * 1000,
  ).toISOString();
  const updatedDateEnd = new Date(
    Date.now() - 1 * 24 * 3600 * 1000,
  ).toISOString();
  const updatedStatus = "pending";

  const updatedJob: ITelegramFileDownloaderDownloadJob =
    await api.functional.telegramFileDownloader.developer.download_jobs.update(
      connection,
      {
        id: typia.assert<string & tags.Format<"uuid">>(createdJob.id),
        body: {
          channel_id: channelId,
          file_types: updatedFileTypes,
          date_start: updatedDateStart,
          date_end: updatedDateEnd,
          status: updatedStatus,
        } satisfies ITelegramFileDownloaderDownloadJob.IUpdate,
      },
    );
  typia.assert(updatedJob);

  // Step 5: Validate that update applied correctly
  TestValidator.equals(
    "Developer ID remains the same",
    updatedJob.developer_id,
    developer.id,
  );
  TestValidator.equals(
    "Channel ID updated correctly",
    updatedJob.channel_id,
    channelId,
  );
  TestValidator.equals(
    "File types updated correctly",
    updatedJob.file_types,
    updatedFileTypes,
  );
  TestValidator.equals(
    "Date start updated correctly",
    updatedJob.date_start,
    updatedDateStart,
  );
  TestValidator.equals(
    "Date end updated correctly",
    updatedJob.date_end,
    updatedDateEnd,
  );
  TestValidator.equals(
    "Status updated correctly",
    updatedJob.status,
    updatedStatus,
  );

  // Step 6a: Negative test - update a non-existent job
  await TestValidator.error(
    "Updating non-existent job should fail",
    async () => {
      await api.functional.telegramFileDownloader.developer.download_jobs.update(
        connection,
        {
          id: typia.random<string & tags.Format<"uuid">>(),
          body: {
            file_types: "pdf",
          } satisfies ITelegramFileDownloaderDownloadJob.IUpdate,
        },
      );
    },
  );

  // Step 6b: Negative test - update without authentication (simulate unauthenticated connection)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "Updating job without authentication should fail",
    async () => {
      await api.functional.telegramFileDownloader.developer.download_jobs.update(
        unauthenticatedConnection,
        {
          id: typia.assert<string & tags.Format<"uuid">>(createdJob.id),
          body: {
            status: "completed",
          } satisfies ITelegramFileDownloaderDownloadJob.IUpdate,
        },
      );
    },
  );
}
