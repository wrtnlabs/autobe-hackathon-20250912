import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITelegramFileDownloaderAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderAdministrator";
import type { ITelegramFileDownloaderJobQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderJobQueue";

export async function test_api_job_queue_update(connection: api.IConnection) {
  // Administrator joins to create a new admin account
  const adminCreateBody = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password_hash: RandomGenerator.alphaNumeric(12),
  } satisfies ITelegramFileDownloaderAdministrator.ICreate;
  const adminAuthorized: ITelegramFileDownloaderAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminAuthorized);

  // Administrator logs in to get authorization token
  const adminLoginBody = {
    email: adminCreateBody.email,
    password: adminCreateBody.password_hash,
  } satisfies ITelegramFileDownloaderAdministrator.ILogin;
  const adminLoginAuthorized: ITelegramFileDownloaderAdministrator.IAuthorized =
    await api.functional.auth.administrator.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // Prepare a random valid job queue ID
  const jobQueueId = typia.random<string & tags.Format<"uuid">>();

  // Valid update payload to change status, priority, retries and error message
  const validUpdateBody = {
    status: "pending",
    priority: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    retries: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    last_error_message: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ITelegramFileDownloaderJobQueue.IUpdate;

  // Perform update with valid data
  const updatedQueue: ITelegramFileDownloaderJobQueue =
    await api.functional.telegramFileDownloader.administrator.jobQueues.update(
      connection,
      {
        id: jobQueueId,
        body: validUpdateBody,
      },
    );
  typia.assert(updatedQueue);

  // Assert the updated fields match expected values
  TestValidator.equals(
    "status update comparison",
    updatedQueue.status,
    validUpdateBody.status,
  );
  TestValidator.equals(
    "priority update comparison",
    updatedQueue.priority,
    validUpdateBody.priority,
  );
  TestValidator.equals(
    "retries update comparison",
    updatedQueue.retries,
    validUpdateBody.retries,
  );
  TestValidator.equals(
    "last error message update",
    updatedQueue.last_error_message,
    validUpdateBody.last_error_message,
  );

  // Attempt update with invalid status to verify validation failure throws error
  await TestValidator.error("invalid status update throws error", async () => {
    await api.functional.telegramFileDownloader.administrator.jobQueues.update(
      connection,
      {
        id: jobQueueId,
        body: {
          status: "invalid_status_value",
        } satisfies ITelegramFileDownloaderJobQueue.IUpdate,
      },
    );
  });
}
