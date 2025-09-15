import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsBlendedLearningSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsBlendedLearningSession";
import type { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";

/**
 * Validates the successful retrieval of a blended learning session by a
 * contentCreatorInstructor user within tenant context.
 *
 * This test performs:
 *
 * 1. Account creation and authentication for a contentCreatorInstructor user
 *    including tenant assignment.
 * 2. Creation of a blended learning session under the tenant.
 * 3. Retrieval of the created session using its unique session ID.
 * 4. Comprehensive validation that retrieved data exactly matches the creation
 *    request including session type, status, schedules, and tenant ID.
 * 5. Proper role authentication and tenant isolation confirmations.
 */
export async function test_api_blendedlearningsessions_contentcreatorinstructor_retrieval_success(
  connection: api.IConnection,
) {
  // 1. Create and authenticate contentCreatorInstructor user with tenant association
  const tenantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const contentCreatorInstructorData: IEnterpriseLmsContentCreatorInstructor.ICreate =
    {
      tenant_id: tenantId,
      email: `testuser+${RandomGenerator.alphaNumeric(6)}@example.com`,
      password_hash: RandomGenerator.alphaNumeric(32),
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      status: "active",
    };
  const createdUser: IEnterpriseLmsContentCreatorInstructor.IAuthorized =
    await api.functional.auth.contentCreatorInstructor.join(connection, {
      body: contentCreatorInstructorData,
    });
  typia.assert(createdUser);

  // 2. Login to set authentication token
  const loginData: IEnterpriseLmsContentCreatorInstructor.ILogin = {
    email: contentCreatorInstructorData.email,
    password: contentCreatorInstructorData.password_hash,
  };
  const loggedInUser: IEnterpriseLmsContentCreatorInstructor.IAuthorized =
    await api.functional.auth.contentCreatorInstructor.login(connection, {
      body: loginData,
    });
  typia.assert(loggedInUser);

  // 3. Create blended learning session under tenant
  const sessionCreateBody = {
    tenant_id: tenantId,
    session_type: RandomGenerator.pick([
      "online",
      "offline",
      "hybrid",
    ] as const),
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    description: RandomGenerator.paragraph({ sentences: 5 }) + "",
    status: RandomGenerator.pick([
      "scheduled",
      "completed",
      "cancelled",
    ] as const),
    scheduled_start_at: new Date(Date.now() + 86400000).toISOString(), // 1 day in future
    scheduled_end_at: new Date(Date.now() + 86400000 * 2).toISOString(), // 2 days in future
    actual_start_at: null,
    actual_end_at: null,
  } satisfies IEnterpriseLmsBlendedLearningSession.ICreate;
  const createdSession: IEnterpriseLmsBlendedLearningSession =
    await api.functional.enterpriseLms.contentCreatorInstructor.blendedLearningSessions.create(
      connection,
      { body: sessionCreateBody },
    );
  typia.assert(createdSession);

  // Validate created session fields match input
  TestValidator.equals(
    "tenant_id should match",
    createdSession.tenant_id,
    tenantId,
  );
  TestValidator.equals(
    "session_type should match",
    createdSession.session_type,
    sessionCreateBody.session_type,
  );
  TestValidator.equals(
    "title should match",
    createdSession.title,
    sessionCreateBody.title,
  );
  TestValidator.equals(
    "description should match",
    createdSession.description,
    sessionCreateBody.description,
  );
  TestValidator.equals(
    "status should match",
    createdSession.status,
    sessionCreateBody.status,
  );
  TestValidator.equals(
    "scheduled_start_at should match",
    createdSession.scheduled_start_at,
    sessionCreateBody.scheduled_start_at,
  );
  TestValidator.equals(
    "scheduled_end_at should match",
    createdSession.scheduled_end_at,
    sessionCreateBody.scheduled_end_at,
  );

  // 4. Retrieve blended learning session by ID
  const retrievedSession: IEnterpriseLmsBlendedLearningSession =
    await api.functional.enterpriseLms.contentCreatorInstructor.blendedLearningSessions.at(
      connection,
      { sessionId: createdSession.id },
    );
  typia.assert(retrievedSession);

  // 5. Validate retrieved session fully matches created session
  TestValidator.equals(
    "retrieved tenant_id matches",
    retrievedSession.tenant_id,
    createdSession.tenant_id,
  );
  TestValidator.equals(
    "retrieved id matches",
    retrievedSession.id,
    createdSession.id,
  );
  TestValidator.equals(
    "retrieved session_type matches",
    retrievedSession.session_type,
    createdSession.session_type,
  );
  TestValidator.equals(
    "retrieved title matches",
    retrievedSession.title,
    createdSession.title,
  );
  TestValidator.equals(
    "retrieved description matches",
    retrievedSession.description,
    createdSession.description,
  );
  TestValidator.equals(
    "retrieved status matches",
    retrievedSession.status,
    createdSession.status,
  );
  TestValidator.equals(
    "retrieved scheduled_start_at matches",
    retrievedSession.scheduled_start_at,
    createdSession.scheduled_start_at,
  );
  TestValidator.equals(
    "retrieved scheduled_end_at matches",
    retrievedSession.scheduled_end_at,
    createdSession.scheduled_end_at,
  );

  // Confirm optional properties for actual_start_at and actual_end_at are null or undefined
  TestValidator.predicate(
    "actual_start_at is null or undefined",
    retrievedSession.actual_start_at === null ||
      retrievedSession.actual_start_at === undefined,
  );
  TestValidator.predicate(
    "actual_end_at is null or undefined",
    retrievedSession.actual_end_at === null ||
      retrievedSession.actual_end_at === undefined,
  );
}
