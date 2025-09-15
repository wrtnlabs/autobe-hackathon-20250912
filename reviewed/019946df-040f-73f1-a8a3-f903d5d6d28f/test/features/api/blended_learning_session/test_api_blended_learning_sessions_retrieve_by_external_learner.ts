import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsBlendedLearningSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsBlendedLearningSession";
import type { IEnterpriseLmsExternalLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsExternalLearner";

/**
 * This comprehensive scenario tests the complete workflow of an external
 * learner authenticating and retrieving a specific blended learning session's
 * details by its sessionId. The test covers successful authentication and
 * multiple error cases to ensure security and correct data isolation.
 *
 * Due to lack of API to create or list sessions, successful retrieval test uses
 * a random UUID as a placeholder.
 *
 * It validates authentication, tenant_id matching, error handling for
 * unauthorized access, invalid sessionId formats, non-existent sessions, and
 * tenant data isolation.
 */
export async function test_api_blended_learning_sessions_retrieve_by_external_learner(
  connection: api.IConnection,
) {
  // 1. External learner join and authenticate
  const joinBody = {
    tenant_id: typia.random<string & tags.Format<"uuid">>(),
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(64),
    first_name: RandomGenerator.name(2),
    last_name: RandomGenerator.name(2),
    status: "active",
  } satisfies IEnterpriseLmsExternalLearner.IJoin;

  const authorized: IEnterpriseLmsExternalLearner.IAuthorized =
    await api.functional.auth.externalLearner.join.joinExternalLearner(
      connection,
      {
        body: joinBody,
      },
    );
  typia.assert(authorized);
  TestValidator.predicate(
    "authorization returns access_token",
    typeof authorized.access_token === "string" &&
      authorized.access_token.length > 0,
  );

  // 2. Retrieve blended learning session by valid sessionId (random UUID placeholder)
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  const session: IEnterpriseLmsBlendedLearningSession =
    await api.functional.enterpriseLms.externalLearner.blendedLearningSessions.at(
      connection,
      { sessionId },
    );
  typia.assert(session);

  TestValidator.equals("session id matches", session.id, sessionId);
  TestValidator.equals(
    "session tenant_id matches learner tenant_id",
    session.tenant_id,
    authorized.tenant_id,
  );

  TestValidator.predicate(
    "session has session_type",
    typeof session.session_type === "string" && session.session_type.length > 0,
  );
  TestValidator.predicate(
    "session has title",
    typeof session.title === "string" && session.title.length > 0,
  );
  TestValidator.predicate(
    "session has status",
    typeof session.status === "string" && session.status.length > 0,
  );

  // Validate ISO date strings for scheduled_start_at, created_at, updated_at
  TestValidator.predicate(
    "scheduled_start_at is ISO date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.]+Z$/.test(session.scheduled_start_at),
  );
  TestValidator.predicate(
    "created_at is ISO date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.]+Z$/.test(session.created_at),
  );
  TestValidator.predicate(
    "updated_at is ISO date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.]+Z$/.test(session.updated_at),
  );

  // 3. Unauthorized access tests
  {
    // Create unauthenticated connection by clearing headers
    const unauthConn: api.IConnection = { ...connection, headers: {} };

    await TestValidator.error(
      "GET session fails without JWT token",
      async () => {
        await api.functional.enterpriseLms.externalLearner.blendedLearningSessions.at(
          unauthConn,
          { sessionId },
        );
      },
    );

    // Use a connection with invalid token; create new connection with header set
    const invalidTokenConn: api.IConnection = {
      ...connection,
      headers: { Authorization: "Bearer invalid.token.value" },
    };

    await TestValidator.error(
      "GET session fails with invalid JWT token",
      async () => {
        await api.functional.enterpriseLms.externalLearner.blendedLearningSessions.at(
          invalidTokenConn,
          { sessionId },
        );
      },
    );
  }

  // 4. Invalid sessionId format tests
  await TestValidator.error(
    "GET session fails with invalid sessionId format",
    async () => {
      await api.functional.enterpriseLms.externalLearner.blendedLearningSessions.at(
        connection,
        { sessionId: "invalid-uuid-format" },
      );
    },
  );

  // 5. Non-existent sessionId test (valid UUID but unlikely to exist)
  await TestValidator.error(
    "GET session fails with not found sessionId",
    async () => {
      await api.functional.enterpriseLms.externalLearner.blendedLearningSessions.at(
        connection,
        { sessionId: typia.random<string & tags.Format<"uuid">>() },
      );
    },
  );
}
