import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITelegramFileDownloaderAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderAdministrator";
import type { ITelegramFileDownloaderSubscriptionAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderSubscriptionAudit";
import type { ITelegramFileDownloaderSubscriptionAudits } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderSubscriptionAudits";
import type { ITelegramFileDownloaderSubscriptionPlans } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderSubscriptionPlans";

/**
 * Tests detailed retrieval of a subscription audit record by an
 * administrator user.
 *
 * This test performs the following actions:
 *
 * 1. Creates and authenticates an administrator user to establish an
 *    authorized context.
 * 2. Creates a subscription plan to associate with subscription audits.
 * 3. Attempts to retrieve a subscription audit by a randomly generated UUID,
 *    expecting failure due to non-existence.
 * 4. Attempts unauthorized retrieval using a fresh unauthenticated connection,
 *    expecting an error.
 *
 * Note: The API has no endpoint to create subscription audits, so this test
 * verifies behavior based on setup dependencies and expected error
 * handling.
 */
export async function test_api_subscription_audit_detailed_retrieval(
  connection: api.IConnection,
) {
  // 1. Create and authenticate administrator user
  const adminEmail = `admin.${RandomGenerator.alphaNumeric(8)}@example.com`;
  const adminPasswordHash = RandomGenerator.alphaNumeric(32); // mocked hashed password

  const admin: ITelegramFileDownloaderAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPasswordHash,
      } satisfies ITelegramFileDownloaderAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Create a subscription plan
  const subscriptionPlanRequest = {
    code: `code_${RandomGenerator.alphaNumeric(6)}`,
    name: `Plan ${RandomGenerator.name()}`,
    price: 999,
    max_files_per_day: 100,
    max_file_size_mb: 500,
    total_storage_mb: 10000,
    status: "active",
  } satisfies ITelegramFileDownloaderSubscriptionPlans.ICreate;

  const plan: ITelegramFileDownloaderSubscriptionPlans =
    await api.functional.telegramFileDownloader.administrator.subscription.plans.create(
      connection,
      {
        body: subscriptionPlanRequest,
      },
    );
  typia.assert(plan);

  // 3. Attempt retrieval of a non-existent subscription audit ID
  const fakeAuditId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "non-existent subscription audit retrieval",
    async () => {
      await api.functional.telegramFileDownloader.administrator.subscriptionAudits.at(
        connection,
        {
          subscriptionAuditId: fakeAuditId,
        },
      );
    },
  );

  // 4. Attempt unauthorized retrieval with a fresh unauthenticated connection
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized access forbidden", async () => {
    await api.functional.telegramFileDownloader.administrator.subscriptionAudits.at(
      unauthConnection,
      {
        subscriptionAuditId: fakeAuditId,
      },
    );
  });
}
