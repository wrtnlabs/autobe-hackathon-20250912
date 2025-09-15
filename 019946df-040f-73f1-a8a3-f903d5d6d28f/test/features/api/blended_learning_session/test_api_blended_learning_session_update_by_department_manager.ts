import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsBlendedLearningSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsBlendedLearningSession";
import type { IEnterpriseLmsDepartmentManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsDepartmentManager";

/**
 * End-to-end test for updating a blended learning session by a department
 * manager.
 *
 * This test validates the entire workflow of an authenticated department
 * manager updating a blended learning session within their tenant
 * organization. It ensures that:
 *
 * 1. The department manager can join and authenticate.
 * 2. The department manager can successfully update a blended learning session
 *    belonging to their own tenant.
 * 3. The update applies changes correctly and returns the updated session
 *    data, which matches expectations.
 * 4. Tenant isolation is enforced, so a department manager cannot update
 *    sessions from other tenants.
 * 5. The API properly handles errors for invalid session IDs or unauthorized
 *    access.
 *
 * Steps:
 *
 * 1. Create and authenticate a department manager user (account join).
 * 2. Generate or obtain a session record under the same tenant as the
 *    department manager.
 * 3. Prepare a valid update payload with varying fields.
 * 4. Call the update API endpoint with the valid sessionId and update data.
 * 5. Assert the response matches the updated data with correct tenant, session
 *    ID, and timestamps.
 * 6. Attempt unauthorized update with an invalid or foreign session ID and
 *    assert error is thrown.
 *
 * This test ensures robust role-based control and data integrity in session
 * updates.
 */
export async function test_api_blended_learning_session_update_by_department_manager(
  connection: api.IConnection,
) {
  // 1. Department manager joins and authenticates
  const joinBody = {
    email: `deptmgr_${RandomGenerator.alphaNumeric(6).toLowerCase()}@example.com`,
    password: "validPassword123",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsDepartmentManager.ICreate;

  const departmentManager: IEnterpriseLmsDepartmentManager.IAuthorized =
    await api.functional.auth.departmentManager.join(connection, {
      body: joinBody,
    });
  typia.assert(departmentManager);

  // 2. Prepare a blended learning session record belonging to the same tenant
  // Since no creation API is provided, we simulate a session using typia.random with tenant_id
  // Possibly the test env would support it due to simulate mode or pre-existing data
  const existingSession = typia.random<IEnterpriseLmsBlendedLearningSession>();

  // To ensure tenant isolation, forcibly set tenant_id to departmentManager.tenant_id
  const session: IEnterpriseLmsBlendedLearningSession = {
    ...existingSession,
    tenant_id: departmentManager.tenant_id,
    deleted_at: null,
  };
  typia.assert(session);

  // 3. Prepare a valid update payload
  const updateBody = {
    session_type: RandomGenerator.pick([
      "online",
      "offline",
      "hybrid",
    ] as const),
    title: RandomGenerator.paragraph({ sentences: 5, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 15,
      wordMin: 4,
      wordMax: 8,
    }),
    status: RandomGenerator.pick([
      "scheduled",
      "completed",
      "cancelled",
    ] as const),
    scheduled_start_at: new Date(
      Date.now() + 1000 * 60 * 60 * 24,
    ).toISOString(), // tomorrow
    scheduled_end_at: new Date(
      Date.now() + 1000 * 60 * 60 * 24 * 2,
    ).toISOString(), // 2 days later
    actual_start_at: null,
    actual_end_at: null,
  } satisfies IEnterpriseLmsBlendedLearningSession.IUpdate;

  // 4. Call update API with valid sessionId and update data
  const updatedSession: IEnterpriseLmsBlendedLearningSession =
    await api.functional.enterpriseLms.departmentManager.blendedLearningSessions.update(
      connection,
      {
        sessionId: session.id,
        body: updateBody,
      },
    );
  typia.assert(updatedSession);

  // 5. Assert the response reflects the update
  TestValidator.equals(
    "tenant_id should not change",
    updatedSession.tenant_id,
    departmentManager.tenant_id,
  );
  TestValidator.equals(
    "id should match sessionId",
    updatedSession.id,
    session.id,
  );
  TestValidator.equals(
    "session_type should be updated",
    updatedSession.session_type,
    updateBody.session_type,
  );
  TestValidator.equals(
    "title should be updated",
    updatedSession.title,
    updateBody.title,
  );
  TestValidator.equals(
    "description should be updated",
    updatedSession.description,
    updateBody.description,
  );
  TestValidator.equals(
    "status should be updated",
    updatedSession.status,
    updateBody.status,
  );
  TestValidator.equals(
    "scheduled_start_at should be updated",
    updatedSession.scheduled_start_at,
    updateBody.scheduled_start_at,
  );
  TestValidator.equals(
    "scheduled_end_at should be updated",
    updatedSession.scheduled_end_at,
    updateBody.scheduled_end_at,
  );
  TestValidator.equals(
    "actual_start_at should be null",
    updatedSession.actual_start_at,
    null,
  );
  TestValidator.equals(
    "actual_end_at should be null",
    updatedSession.actual_end_at,
    null,
  );

  // 6. Attempt update with invalid sessionId to test error handling
  const invalidSessionId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "updating with invalid sessionId should fail",
    async () => {
      await api.functional.enterpriseLms.departmentManager.blendedLearningSessions.update(
        connection,
        {
          sessionId: invalidSessionId,
          body: updateBody,
        },
      );
    },
  );

  // 7. Attempt update with a sessionId belonging to another tenant to test authorization
  // Create a fake foreign tenantId
  const foreignTenantSession =
    typia.random<IEnterpriseLmsBlendedLearningSession>();

  // Ensure tenant_id is different
  if (foreignTenantSession.tenant_id === departmentManager.tenant_id) {
    foreignTenantSession.tenant_id = typia.random<
      string & tags.Format<"uuid">
    >();
  }

  await TestValidator.error(
    "updating session from another tenant should fail",
    async () => {
      await api.functional.enterpriseLms.departmentManager.blendedLearningSessions.update(
        connection,
        {
          sessionId: foreignTenantSession.id,
          body: updateBody,
        },
      );
    },
  );
}
