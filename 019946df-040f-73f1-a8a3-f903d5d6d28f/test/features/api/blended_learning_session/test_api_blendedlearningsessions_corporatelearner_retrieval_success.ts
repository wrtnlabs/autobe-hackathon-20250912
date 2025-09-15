import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsBlendedLearningSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsBlendedLearningSession";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";

/**
 * Validate the retrieval process of a blended learning session by a corporate
 * learner.
 *
 * This test follows the successful path of creating a corporate learner
 * account, logging in, creating a blended learning session, then retrieving it
 * by ID. It confirms the returned session data exactly matches the created
 * session, verifying role-based access and data isolation.
 */
export async function test_api_blendedlearningsessions_corporatelearner_retrieval_success(
  connection: api.IConnection,
) {
  // 1. Corporate learner account join
  const tenantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const joinBody = {
    tenant_id: tenantId,
    email: `${RandomGenerator.name(2).replace(/\s/g, ".").toLowerCase()}@example.com`,
    password: "Password123!",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsCorporateLearner.ICreate;
  const joinedLearner: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.join(connection, {
      body: joinBody,
    });
  typia.assert(joinedLearner);

  // 2. Corporate learner account login
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies IEnterpriseLmsCorporateLearner.ILogin;
  const loggedInLearner: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInLearner);

  // 3. Create a blended learning session
  const createSessionBody = {
    tenant_id: tenantId,
    session_type: RandomGenerator.pick([
      "online",
      "offline",
      "hybrid",
    ] as const),
    title: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    status: RandomGenerator.pick([
      "scheduled",
      "completed",
      "cancelled",
    ] as const),
    scheduled_start_at: new Date().toISOString(),
    scheduled_end_at: new Date(Date.now() + 3600 * 1000).toISOString(),
    actual_start_at: null,
    actual_end_at: null,
  } satisfies IEnterpriseLmsBlendedLearningSession.ICreate;
  const createdSession: IEnterpriseLmsBlendedLearningSession =
    await api.functional.enterpriseLms.corporateLearner.blendedLearningSessions.create(
      connection,
      { body: createSessionBody },
    );
  typia.assert(createdSession);

  TestValidator.equals(
    "created session tenant_id should match",
    createdSession.tenant_id,
    tenantId,
  );

  // 4. Retrieve the blended learning session by id
  const retrievedSession: IEnterpriseLmsBlendedLearningSession =
    await api.functional.enterpriseLms.corporateLearner.blendedLearningSessions.at(
      connection,
      { sessionId: createdSession.id },
    );
  typia.assert(retrievedSession);

  // 5. Validate retrieved session matches created
  TestValidator.equals(
    "retrieved session id matches created",
    retrievedSession.id,
    createdSession.id,
  );
  TestValidator.equals(
    "tenant_id matches",
    retrievedSession.tenant_id,
    createdSession.tenant_id,
  );
  TestValidator.equals(
    "session_type matches",
    retrievedSession.session_type,
    createdSession.session_type,
  );
  TestValidator.equals(
    "title matches",
    retrievedSession.title,
    createdSession.title,
  );

  // Description is nullable
  if (
    retrievedSession.description === null ||
    retrievedSession.description === undefined
  ) {
    TestValidator.predicate(
      "description is null or undefined",
      createSessionBody.description === null ||
        createSessionBody.description === undefined,
    );
  } else {
    TestValidator.equals(
      "description matches",
      retrievedSession.description,
      createSessionBody.description ?? null,
    );
  }

  TestValidator.equals(
    "status matches",
    retrievedSession.status,
    createSessionBody.status,
  );
  TestValidator.equals(
    "scheduled_start_at matches",
    retrievedSession.scheduled_start_at,
    createSessionBody.scheduled_start_at,
  );
  TestValidator.equals(
    "scheduled_end_at matches",
    retrievedSession.scheduled_end_at,
    createSessionBody.scheduled_end_at ?? null,
  );

  // Nullable actual start/end times
  TestValidator.equals(
    "actual_start_at matches",
    retrievedSession.actual_start_at,
    createSessionBody.actual_start_at ?? null,
  );
  TestValidator.equals(
    "actual_end_at matches",
    retrievedSession.actual_end_at,
    createSessionBody.actual_end_at ?? null,
  );

  // Validate created_at and updated_at are ISO date-time strings
  typia.assert<string & tags.Format<"date-time">>(retrievedSession.created_at);
  typia.assert<string & tags.Format<"date-time">>(retrievedSession.updated_at);

  // Validate deleted_at nullable
  if (
    retrievedSession.deleted_at !== null &&
    retrievedSession.deleted_at !== undefined
  ) {
    typia.assert<string & tags.Format<"date-time">>(
      retrievedSession.deleted_at,
    );
  }
}
