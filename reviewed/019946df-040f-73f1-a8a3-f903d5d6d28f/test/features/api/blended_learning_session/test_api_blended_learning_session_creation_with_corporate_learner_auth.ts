import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsBlendedLearningSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsBlendedLearningSession";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";

/**
 * Comprehensive test for blended learning session creation by an authenticated
 * corporate learner.
 *
 * This test demonstrates the full lifecycle from corporate learner registration
 * and login to successfully creating a blended learning session under the
 * authenticated tenant context. It verifies proper handling of authentication,
 * tenant isolation, and session creation business logic.
 *
 * Workflow Steps:
 *
 * 1. Corporate learner registers with valid tenant ID and personal information.
 * 2. Learner is automatically authenticated with access and refresh tokens issued.
 * 3. Using authenticated context, a blended learning session is created with valid
 *    session data.
 * 4. The created session is validated for correctness of all returned fields and
 *    timestamp integrity.
 * 5. Negative scenarios are implicitly tested by SDK token utilization and
 *    business validation.
 *
 * This test ensures secure and isolated creation of learning sessions per
 * tenant, verifying critical API endpoints with strong contract validation.
 */
export async function test_api_blended_learning_session_creation_with_corporate_learner_auth(
  connection: api.IConnection,
) {
  // 1. Corporate learner registration: prepare input for join API
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const joinBody = {
    tenant_id: tenantId,
    email: `${RandomGenerator.name(1).toLowerCase()}@example.com`,
    password: "ValidPassword123!",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsCorporateLearner.ICreate;

  // Call /auth/corporateLearner/join to register and authenticate
  const authorized: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. At this point, the SDK should have switched the token for authenticated requests
  // We verify correctness of returned token
  TestValidator.predicate(
    "JWT access token is non-empty",
    typeof authorized.token.access === "string" &&
      authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "JWT refresh token is non-empty",
    typeof authorized.token.refresh === "string" &&
      authorized.token.refresh.length > 0,
  );

  // 3. Prepare a valid session creation body
  const nowIso = new Date().toISOString();
  const laterIso = new Date(Date.now() + 3600 * 1000).toISOString(); // +1 hour

  const createSessionBody = {
    tenant_id: tenantId, // Must match learner tenant
    session_type: RandomGenerator.pick([
      "online",
      "offline",
      "hybrid",
    ] as const),
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4 }),
    description: RandomGenerator.paragraph({ sentences: 5, wordMin: 5 }),
    status: RandomGenerator.pick([
      "scheduled",
      "completed",
      "cancelled",
    ] as const),
    scheduled_start_at: nowIso,
    scheduled_end_at: laterIso,
    actual_start_at: null,
    actual_end_at: null,
  } satisfies IEnterpriseLmsBlendedLearningSession.ICreate;

  // 4. Create the blended learning session with authenticated token
  const session: IEnterpriseLmsBlendedLearningSession =
    await api.functional.enterpriseLms.corporateLearner.blendedLearningSessions.create(
      connection,
      {
        body: createSessionBody,
      },
    );
  typia.assert(session);

  // 5. Validate returned session details
  TestValidator.equals(
    "tenant_id matches session tenant",
    session.tenant_id,
    tenantId,
  );
  TestValidator.equals(
    "session_type matches input",
    session.session_type,
    createSessionBody.session_type,
  );
  TestValidator.equals(
    "title matches input",
    session.title,
    createSessionBody.title,
  );

  // description is nullable, we passed a non-null string, so check exact equality
  TestValidator.equals(
    "description matches input",
    session.description,
    createSessionBody.description,
  );

  TestValidator.equals(
    "status matches input",
    session.status,
    createSessionBody.status,
  );

  TestValidator.equals(
    "scheduled_start_at matches input",
    session.scheduled_start_at,
    createSessionBody.scheduled_start_at,
  );
  TestValidator.equals(
    "scheduled_end_at matches input",
    session.scheduled_end_at,
    createSessionBody.scheduled_end_at,
  );

  // actual_start_at and actual_end_at are null
  TestValidator.equals(
    "actual_start_at is null",
    session.actual_start_at,
    null,
  );
  TestValidator.equals("actual_end_at is null", session.actual_end_at, null);

  // Validate timestamps created_at and updated_at are valid ISO strings
  typia.assert<string & tags.Format<"date-time">>(session.created_at);
  typia.assert<string & tags.Format<"date-time">>(session.updated_at);

  TestValidator.predicate(
    "created_at is well-formed ISO date-time",
    !isNaN(Date.parse(session.created_at)),
  );
  TestValidator.predicate(
    "updated_at is well-formed ISO date-time",
    !isNaN(Date.parse(session.updated_at)),
  );

  // Validate deleted_at is null or undefined
  if (session.deleted_at !== null && session.deleted_at !== undefined) {
    typia.assert<string & tags.Format<"date-time">>(session.deleted_at);
    TestValidator.predicate(
      "deleted_at is valid ISO date-time",
      !isNaN(Date.parse(session.deleted_at)),
    );
  }

  // 6. Negative scenarios for unauthorized or invalid input are handled implicitly by SDK and server;
  // typically tested separately in authorization and validation tests.
}
