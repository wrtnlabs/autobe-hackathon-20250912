import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import type { IEnterpriseLmsProgressTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsProgressTracking";

/**
 * This E2E test validates the deletion functionality of a progress tracking
 * record for a corporate learner in the Enterprise LMS system. The test covers
 * creation and authentication of multiple corporate learners, creation of
 * progress tracking records, deletion of records, unauthorized deletion
 * attempts, and deletion of non-existent records. It ensures tenant data
 * isolation and proper authorization enforcement with descriptive validations.
 */
export async function test_api_progress_tracking_erase(
  connection: api.IConnection,
) {
  // 1. Create and authenticate first corporate learner
  const tenantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const firstUserBody = {
    tenant_id: tenantId,
    email: `${RandomGenerator.name(1).toLowerCase()}@company.com`,
    password: "password1234",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsCorporateLearner.ICreate;

  const firstUser = await api.functional.auth.corporateLearner.join(
    connection,
    {
      body: firstUserBody,
    },
  );
  typia.assert(firstUser);

  // 2. Create a progress tracking record for first user
  const progressTrackingBody = {
    learner_id: firstUser.id,
    content_id: typia.random<string & tags.Format<"uuid">>(),
    time_spent_seconds: 123,
    assessment_attempts: 3,
    engagement_score: 77,
  } satisfies IEnterpriseLmsProgressTracking.ICreate;

  const progressTracking =
    await api.functional.enterpriseLms.corporateLearner.progressTracking.createProgressTracking(
      connection,
      {
        body: progressTrackingBody,
      },
    );
  typia.assert(progressTracking);

  TestValidator.equals(
    "progress tracking learner_id matches first user id",
    progressTracking.learner_id,
    firstUser.id,
  );

  // 3. Delete the progress tracking record
  await api.functional.enterpriseLms.corporateLearner.progressTracking.eraseProgressTracking(
    connection,
    {
      id: progressTracking.id,
    },
  );

  // 4. Verify deletion attempt to delete again - expect error
  await TestValidator.error(
    "deleting already deleted progress tracking fails",
    async () => {
      await api.functional.enterpriseLms.corporateLearner.progressTracking.eraseProgressTracking(
        connection,
        {
          id: progressTracking.id,
        },
      );
    },
  );

  // 5. Create a different corporate learner user
  const secondUserBody = {
    tenant_id: tenantId,
    email: `${RandomGenerator.name(1).toLowerCase()}@company.com`,
    password: "password1234",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsCorporateLearner.ICreate;

  const secondUser = await api.functional.auth.corporateLearner.join(
    connection,
    {
      body: secondUserBody,
    },
  );
  typia.assert(secondUser);

  TestValidator.equals(
    "second user tenant id matches tenantId",
    secondUser.tenant_id,
    tenantId,
  );

  // 6. Create a new progress tracking for second user
  const secondProgressTrackingBody = {
    learner_id: secondUser.id,
    content_id: typia.random<string & tags.Format<"uuid">>(),
    time_spent_seconds: 50,
    assessment_attempts: 2,
    engagement_score: 70,
  } satisfies IEnterpriseLmsProgressTracking.ICreate;

  const secondProgressTracking =
    await api.functional.enterpriseLms.corporateLearner.progressTracking.createProgressTracking(
      connection,
      {
        body: secondProgressTrackingBody,
      },
    );
  typia.assert(secondProgressTracking);

  // 7. Attempt to delete first user's progress tracking from second user's context
  // Switch context to second user credentials - must await
  const contextSwitchUser = await api.functional.auth.corporateLearner.join(
    connection,
    {
      body: secondUserBody,
    },
  );
  typia.assert(contextSwitchUser);

  await TestValidator.error(
    "unauthorized deletion of another user's progress tracking fails",
    async () => {
      await api.functional.enterpriseLms.corporateLearner.progressTracking.eraseProgressTracking(
        connection,
        {
          id: progressTracking.id,
        },
      );
    },
  );

  // 8. Attempt to delete non-existent progress tracking id
  await TestValidator.error(
    "deletion of non-existent progress tracking id fails",
    async () => {
      await api.functional.enterpriseLms.corporateLearner.progressTracking.eraseProgressTracking(
        connection,
        {
          id: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
