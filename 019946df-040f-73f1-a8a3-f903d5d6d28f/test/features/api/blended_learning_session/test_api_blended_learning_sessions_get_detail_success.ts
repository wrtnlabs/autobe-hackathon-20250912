import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsBlendedLearningSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsBlendedLearningSession";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";

/**
 * Validate detailed retrieval of a blended learning session.
 *
 * This test simulates a complete user journey where a system administrator
 * authenticates via the join endpoint, then successfully retrieves detailed
 * session information using a valid session ID. The test ensures the
 * session data matches the requested ID and contains critical fields
 * including title, tenant information, session type, status, and schedule
 * details.
 *
 * Additionally, it tests failure scenarios such as unauthorized access with
 * no authentication and querying non-existent session IDs to verify proper
 * error handling.
 */
export async function test_api_blended_learning_sessions_get_detail_success(
  connection: api.IConnection,
) {
  // 1. Join and authenticate as a systemAdmin
  const systemAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: RandomGenerator.alphaNumeric(64),
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        status: "active",
      } satisfies IEnterpriseLmsSystemAdmin.ICreate,
    });
  typia.assert(systemAdmin);

  // 2. Use the authenticated systemAdmin token to request session details
  const sessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const detailedSession: IEnterpriseLmsBlendedLearningSession =
    await api.functional.enterpriseLms.systemAdmin.blendedLearningSessions.at(
      connection,
      {
        sessionId,
      },
    );
  typia.assert(detailedSession);

  // 3. Validate that the returned session ID matches the requested sessionId
  TestValidator.equals(
    "response session id equals requested sessionId",
    detailedSession.id,
    sessionId,
  );

  // 4. Validate critical fields are present and non-empty
  TestValidator.predicate(
    "session has a non-empty title",
    typeof detailedSession.title === "string" &&
      detailedSession.title.length > 0,
  );
  TestValidator.predicate(
    "session has valid tenant_id",
    typeof detailedSession.tenant_id === "string" &&
      detailedSession.tenant_id.length > 0,
  );
  TestValidator.predicate(
    "session type is a non-empty string",
    typeof detailedSession.session_type === "string" &&
      detailedSession.session_type.length > 0,
  );
  TestValidator.predicate(
    "session status is a non-empty string",
    typeof detailedSession.status === "string" &&
      detailedSession.status.length > 0,
  );
  TestValidator.predicate(
    "scheduled_start_at is a valid ISO date-time string",
    typeof detailedSession.scheduled_start_at === "string" &&
      !isNaN(Date.parse(detailedSession.scheduled_start_at)),
  );

  // 5. Test unauthorized access returns an error (simulate no auth token)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized access to blended learning session detail should fail",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.blendedLearningSessions.at(
        unauthConnection,
        {
          sessionId,
        },
      );
    },
  );

  // 6. Test invalid sessionId returns not found error (use valid but random UUID)
  await TestValidator.error(
    "requesting a non-existent session ID should fail",
    async () => {
      const nonExistentSessionId: string & tags.Format<"uuid"> = typia.random<
        string & tags.Format<"uuid">
      >();
      await api.functional.enterpriseLms.systemAdmin.blendedLearningSessions.at(
        connection,
        {
          sessionId: nonExistentSessionId,
        },
      );
    },
  );
}
