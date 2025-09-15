import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import type { IEnterpriseLmsProgressTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsProgressTracking";

export async function test_api_progress_tracking_update_success(
  connection: api.IConnection,
) {
  // 1. Register a new corporate learner to obtain authentication token
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const corporateLearner = await api.functional.auth.corporateLearner.join(
    connection,
    {
      body: {
        tenant_id: tenantId,
        email: `${RandomGenerator.alphaNumeric(6)}@example.com`,
        password: "Test@1234",
        first_name: RandomGenerator.name(2),
        last_name: RandomGenerator.name(2),
      } satisfies IEnterpriseLmsCorporateLearner.ICreate,
    },
  );
  typia.assert(corporateLearner);

  // 2. Create a dummy progress tracking record (simulate)
  const progressTracking = typia.random<IEnterpriseLmsProgressTracking>();

  // 3. Prepare update payload with randomized positive values
  const updatePayload = {
    time_spent_seconds: RandomGenerator.alphaNumeric(3).length * 10, // realistic positive integer
    assessment_attempts: RandomGenerator.alphaNumeric(2).length, // small positive integer
    engagement_score: Math.min(Math.floor(Math.random() * 100), 100), // 0 to 100
  } satisfies IEnterpriseLmsProgressTracking.IUpdate;

  // 4. Call update API
  const updatedRecord =
    await api.functional.enterpriseLms.corporateLearner.progressTracking.updateProgressTracking(
      connection,
      {
        id: progressTracking.id,
        body: updatePayload,
      },
    );
  typia.assert(updatedRecord);

  // 5. Assert the updated fields match
  TestValidator.equals(
    "time_spent_seconds updated",
    updatedRecord.time_spent_seconds,
    updatePayload.time_spent_seconds,
  );
  TestValidator.equals(
    "assessment_attempts updated",
    updatedRecord.assessment_attempts,
    updatePayload.assessment_attempts,
  );
  TestValidator.equals(
    "engagement_score updated",
    updatedRecord.engagement_score,
    updatePayload.engagement_score,
  );

  // 6. Assert immutable fields unchanged
  TestValidator.equals(
    "learner_id unchanged",
    updatedRecord.learner_id,
    progressTracking.learner_id,
  );
  TestValidator.equals(
    "content_id unchanged",
    updatedRecord.content_id,
    progressTracking.content_id,
  );
}
