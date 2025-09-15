import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsBlendedLearningSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsBlendedLearningSession";
import type { IEnterpriseLmsDepartmentManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsDepartmentManager";

/**
 * This E2E test validates the creation of a blended learning session via the
 * departmentManager role.
 *
 * It first registers and authenticates a new departmentManager user with valid
 * tenant ID. Then it creates a blended learning session scoped to the
 * authenticated user's tenant. The test checks that the response is valid,
 * properly typed, and matches the given input.
 *
 * Steps:
 *
 * 1. Register departmentManager user (/auth/departmentManager/join)
 * 2. Automatically authenticate, obtaining JWT token in connection headers
 * 3. Create blended learning session with POST
 *    /enterpriseLms/departmentManager/blendedLearningSessions
 * 4. Validate returned session response for data consistency, tenant association,
 *    and correct properties
 */
export async function test_api_blended_learning_session_creation_with_authentication_and_tenant(
  connection: api.IConnection,
) {
  // 1. Prepare valid department manager creation data
  const departmentManagerCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "validPassword123!",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsDepartmentManager.ICreate;

  // 2. Register and authenticate as departmentManager; JWT token auto-set in connection
  const authorizedUser: IEnterpriseLmsDepartmentManager.IAuthorized =
    await api.functional.auth.departmentManager.join(connection, {
      body: departmentManagerCreate,
    });
  typia.assert(authorizedUser);

  // 3. Create blended learning session request data matching tenant ID
  const requestBody = {
    tenant_id: authorizedUser.tenant_id,
    session_type: RandomGenerator.pick([
      "online",
      "offline",
      "hybrid",
    ] as const),
    title: RandomGenerator.paragraph({ sentences: 4 }),
    description:
      Math.random() < 0.5 ? null : RandomGenerator.content({ paragraphs: 1 }),
    status: RandomGenerator.pick([
      "scheduled",
      "completed",
      "cancelled",
    ] as const),
    scheduled_start_at: new Date().toISOString(),
    scheduled_end_at:
      Math.random() < 0.5
        ? null
        : new Date(Date.now() + 3600 * 1000).toISOString(),
    actual_start_at: null,
    actual_end_at: null,
  } satisfies IEnterpriseLmsBlendedLearningSession.ICreate;

  // 4. Call API to create blended learning session
  const createdSession: IEnterpriseLmsBlendedLearningSession =
    await api.functional.enterpriseLms.departmentManager.blendedLearningSessions.create(
      connection,
      {
        body: requestBody,
      },
    );

  // 5. Validate response structure
  typia.assert(createdSession);

  // 6. Validate tenant id consistency
  TestValidator.equals(
    "tenant_id matches authenticated user's tenant",
    createdSession.tenant_id,
    authorizedUser.tenant_id,
  );

  // 7. Validate properties provided reflect correctly in the response
  TestValidator.equals(
    "title matches request",
    createdSession.title,
    requestBody.title,
  );
  TestValidator.equals(
    "session_type matches request",
    createdSession.session_type,
    requestBody.session_type,
  );
  TestValidator.equals(
    "status matches request",
    createdSession.status,
    requestBody.status,
  );

  // 8. Nullable description matches (both null or content string)
  if (requestBody.description === null) {
    TestValidator.equals(
      "description is null as requested",
      createdSession.description,
      null,
    );
  } else {
    TestValidator.equals(
      "description matches request",
      createdSession.description,
      requestBody.description,
    );
  }

  // 9. Validate scheduled start and optional scheduled end dates
  TestValidator.equals(
    "scheduled_start_at matches request",
    createdSession.scheduled_start_at,
    requestBody.scheduled_start_at,
  );

  if (requestBody.scheduled_end_at === null) {
    TestValidator.equals(
      "scheduled_end_at is null as requested",
      createdSession.scheduled_end_at,
      null,
    );
  } else {
    TestValidator.equals(
      "scheduled_end_at matches request",
      createdSession.scheduled_end_at,
      requestBody.scheduled_end_at,
    );
  }

  // 10. actual_start_at and actual_end_at are null initially
  TestValidator.equals(
    "actual_start_at initially null",
    createdSession.actual_start_at,
    null,
  );
  TestValidator.equals(
    "actual_end_at initially null",
    createdSession.actual_end_at,
    null,
  );

  // 11. Validate created id is UUID format
  TestValidator.predicate(
    "id is UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      createdSession.id,
    ),
  );

  // 12. Validate created_at and updated_at are valid ISO date-time strings and non-empty
  TestValidator.predicate(
    "created_at is ISO date-time string",
    typeof createdSession.created_at === "string" &&
      createdSession.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is ISO date-time string",
    typeof createdSession.updated_at === "string" &&
      createdSession.updated_at.length > 0,
  );

  // 13. deleted_at is null or undefined
  if (
    createdSession.deleted_at !== null &&
    createdSession.deleted_at !== undefined
  ) {
    throw new Error("deleted_at expected to be null or undefined initially");
  }
}
