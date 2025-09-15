import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITelegramFileDownloaderAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderAdministrator";
import type { ITelegramFileDownloaderJobQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderJobQueue";

export async function test_api_job_queue_detail_retrieval_success(
  connection: api.IConnection,
) {
  // 1. Administrator joins and authenticates
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPasswordHash = RandomGenerator.alphaNumeric(64); // Simulate a hash
  const admin: ITelegramFileDownloaderAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPasswordHash,
      } satisfies ITelegramFileDownloaderAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Administrator creates a job queue entry
  const jobId = typia.random<string & tags.Format<"uuid">>();
  const status = RandomGenerator.pick([
    "pending",
    "processing",
    "failed",
    "completed",
  ] as const);
  const priority = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();
  const retries = typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>();
  const lastErrorMessage =
    Math.random() < 0.5 ? null : RandomGenerator.paragraph({ sentences: 3 });

  const jobQueue: ITelegramFileDownloaderJobQueue =
    await api.functional.telegramFileDownloader.administrator.jobQueues.create(
      connection,
      {
        body: {
          job_id: jobId,
          status: status,
          priority: priority,
          retries: retries,
          last_error_message: lastErrorMessage,
        } satisfies ITelegramFileDownloaderJobQueue.ICreate,
      },
    );
  typia.assert(jobQueue);

  // 3. Administrator retrieves job queue detail
  const detail: ITelegramFileDownloaderJobQueue =
    await api.functional.telegramFileDownloader.administrator.jobQueues.at(
      connection,
      { id: jobQueue.id },
    );
  typia.assert(detail);

  TestValidator.equals("job queue id matches", detail.id, jobQueue.id);
  TestValidator.equals("job id matches", detail.job_id, jobQueue.job_id);
  TestValidator.equals("status matches", detail.status, jobQueue.status);
  TestValidator.equals("priority matches", detail.priority, jobQueue.priority);
  TestValidator.equals("retries match", detail.retries, jobQueue.retries);
  TestValidator.equals(
    "last error message matches",
    detail.last_error_message,
    jobQueue.last_error_message,
  );

  // 4. Validate timestamps exist and are strings
  TestValidator.predicate(
    "created_at is string",
    typeof detail.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at is string",
    typeof detail.updated_at === "string",
  );
  TestValidator.predicate(
    "deleted_at is null or string",
    detail.deleted_at === null || typeof detail.deleted_at === "string",
  );

  // 5. Unauthorized access is forbidden
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized access forbidden", async () => {
    await api.functional.telegramFileDownloader.administrator.jobQueues.at(
      unauthConnection,
      { id: jobQueue.id },
    );
  });

  // 6. Query with non-existent ID results in error
  const randomId = typia.random<string & tags.Format<"uuid">>();
  if (randomId !== jobQueue.id) {
    await TestValidator.error(
      "non-existent job queue id results in error",
      async () => {
        await api.functional.telegramFileDownloader.administrator.jobQueues.at(
          connection,
          { id: randomId },
        );
      },
    );
  }
}
