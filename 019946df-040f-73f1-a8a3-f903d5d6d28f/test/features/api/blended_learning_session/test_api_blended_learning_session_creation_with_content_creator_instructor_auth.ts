import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsBlendedLearningSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsBlendedLearningSession";
import type { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";

/**
 * This test validates the full lifecycle of a contentCreatorInstructor user
 * creating a blended learning session.
 *
 * It covers user registration, authentication, and session creation. The
 * session creation is validated for proper tenant association and correctness
 * of data according to the session schema.
 *
 * Steps:
 *
 * 1. Register a new contentCreatorInstructor user.
 * 2. Authenticate and get authorization tokens automatically.
 * 3. Create a blended learning session with the authenticated user's tenant.
 * 4. Validate response schema and data integrity.
 */
export async function test_api_blended_learning_session_creation_with_content_creator_instructor_auth(
  connection: api.IConnection,
) {
  // Step 1: Register new contentCreatorInstructor user
  const tenantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const joinBody = {
    tenant_id: tenantId,
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(64),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate;

  // Register user
  const authorizedUser: IEnterpriseLmsContentCreatorInstructor.IAuthorized =
    await api.functional.auth.contentCreatorInstructor.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedUser);

  // Check tenantId matches
  TestValidator.equals(
    "tenant_id matches after join",
    authorizedUser.tenant_id,
    tenantId,
  );

  // Step 2: Use the automatic token exchange, then create blended learning session
  const sessionCreateBody = {
    tenant_id: authorizedUser.tenant_id,
    session_type: RandomGenerator.pick([
      "online",
      "offline",
      "hybrid",
    ] as const),
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 3,
      sentenceMax: 6,
      wordMin: 4,
      wordMax: 8,
    }),
    status: RandomGenerator.pick([
      "scheduled",
      "completed",
      "cancelled",
    ] as const),
    scheduled_start_at: new Date(Date.now() + 3600 * 1000).toISOString(), // 1 hour in future
    scheduled_end_at: new Date(Date.now() + 3 * 3600 * 1000).toISOString(), // 3 hours in future
    actual_start_at: null,
    actual_end_at: null,
  } satisfies IEnterpriseLmsBlendedLearningSession.ICreate;

  const createdSession: IEnterpriseLmsBlendedLearningSession =
    await api.functional.enterpriseLms.contentCreatorInstructor.blendedLearningSessions.create(
      connection,
      {
        body: sessionCreateBody,
      },
    );
  typia.assert(createdSession);

  // Validate key fields and tenant isolation
  TestValidator.equals(
    "created session's tenant_id matches creator's tenant_id",
    createdSession.tenant_id,
    authorizedUser.tenant_id,
  );
  TestValidator.equals(
    "created session title matches",
    createdSession.title,
    sessionCreateBody.title,
  );
  TestValidator.equals(
    "created session status matches",
    createdSession.status,
    sessionCreateBody.status,
  );
  TestValidator.predicate(
    "scheduled_start_at is a valid ISO date string",
    typeof createdSession.scheduled_start_at === "string" &&
      createdSession.scheduled_start_at.length > 0,
  );
  TestValidator.predicate(
    "scheduled_end_at is a string or null",
    createdSession.scheduled_end_at === null ||
      typeof createdSession.scheduled_end_at === "string",
  );
  TestValidator.predicate(
    "id is a non-empty string",
    typeof createdSession.id === "string" && createdSession.id.length > 0,
  );
  TestValidator.predicate(
    "created session dates are logically consistent",
    createdSession.scheduled_start_at <=
      (createdSession.scheduled_end_at ?? createdSession.scheduled_start_at),
  );
}
