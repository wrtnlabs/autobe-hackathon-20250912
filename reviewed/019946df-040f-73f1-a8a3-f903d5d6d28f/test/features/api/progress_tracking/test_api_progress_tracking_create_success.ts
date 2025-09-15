import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import type { IEnterpriseLmsProgressTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsProgressTracking";

export async function test_api_progress_tracking_create_success(
  connection: api.IConnection,
) {
  // Step 1: Authenticate corporate learner via join
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const email = `user${RandomGenerator.alphaNumeric(6).toLowerCase()}@example.com`;
  const password = "SecreT1234";
  const firstName = RandomGenerator.name(1);
  const lastName = RandomGenerator.name(1);

  const joinBody = {
    tenant_id: tenantId,
    email: email,
    password: password,
    first_name: firstName,
    last_name: lastName,
  } satisfies IEnterpriseLmsCorporateLearner.ICreate;

  const authorized: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // Step 2: Login with same credentials
  const loginBody = {
    email,
    password,
  } satisfies IEnterpriseLmsCorporateLearner.ILogin;
  const loggedIn: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.login(connection, {
      body: loginBody,
    });

  typia.assert(loggedIn);

  // Step 3: Prepare progress tracking creation payload
  const progressTrackingBody = {
    learner_id: authorized.id,
    content_id: typia.random<string & tags.Format<"uuid">>(),
    time_spent_seconds: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >(),
    assessment_attempts: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    engagement_score: typia.random<number>(),
  } satisfies IEnterpriseLmsProgressTracking.ICreate;

  // Step 4: Create progress tracking record
  const progressTracking: IEnterpriseLmsProgressTracking =
    await api.functional.enterpriseLms.corporateLearner.progressTracking.createProgressTracking(
      connection,
      { body: progressTrackingBody },
    );

  typia.assert(progressTracking);

  // Step 5: Verify response matches request payload values
  TestValidator.equals(
    "learner_id equals",
    progressTracking.learner_id,
    progressTrackingBody.learner_id,
  );
  TestValidator.equals(
    "content_id equals",
    progressTracking.content_id,
    progressTrackingBody.content_id,
  );
  TestValidator.equals(
    "time_spent_seconds equals",
    progressTracking.time_spent_seconds,
    progressTrackingBody.time_spent_seconds,
  );
  TestValidator.equals(
    "assessment_attempts equals",
    progressTracking.assessment_attempts,
    progressTrackingBody.assessment_attempts,
  );
  TestValidator.equals(
    "engagement_score equals",
    progressTracking.engagement_score,
    progressTrackingBody.engagement_score,
  );
  TestValidator.predicate(
    "progressTracking has id",
    typeof progressTracking.id === "string" && progressTracking.id.length > 0,
  );
  TestValidator.predicate(
    "progressTracking has created_at",
    typeof progressTracking.created_at === "string" &&
      progressTracking.created_at.length > 0,
  );
  TestValidator.predicate(
    "progressTracking has updated_at",
    typeof progressTracking.updated_at === "string" &&
      progressTracking.updated_at.length > 0,
  );
}
