import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsBlendedLearningSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsBlendedLearningSession";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

/**
 * Test updating a blended learning session by an authorized organization
 * administrator user.
 *
 * This test performs the following:
 *
 * 1. Create a new organization administrator user with tenant context and
 *    login to authenticate.
 * 2. Prepare a realistic update payload for a blended learning session
 *    including session type, title, description, status, and scheduling
 *    dates.
 * 3. Call the update endpoint for the blended learning session with a valid
 *    UUID sessionId.
 * 4. Assert the response type and verify all updated fields match the request
 *    data.
 *
 * This validates both the authorization mechanics for an organization admin
 * role and the correctness of the update operation. All required properties
 * and valid formats are ensured, including explicit null for nullable
 * timestamps.
 */
export async function test_api_blended_learning_session_update_by_org_admin(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate organization administrator user
  const tenantAdminCreateBody = {
    tenant_id: typia.random<string & tags.Format<"uuid">>(),
    email: `${RandomGenerator.name(1).replace(/\s/g, "").toLowerCase()}@testcompany.com`,
    password: "StrongPass123!",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  const adminAuthorized: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: tenantAdminCreateBody,
    });
  typia.assert(adminAuthorized);

  // Step 2: Prepare update payload for a blended learning session
  const updatePayload = {
    session_type: RandomGenerator.pick([
      "online",
      "offline",
      "hybrid",
    ] as const),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: RandomGenerator.pick([
      "scheduled",
      "completed",
      "cancelled",
    ] as const),
    scheduled_start_at: new Date(Date.now() + 3600 * 1000).toISOString(),
    scheduled_end_at: new Date(Date.now() + 7200 * 1000).toISOString(),
    actual_start_at: null,
    actual_end_at: null,
  } satisfies IEnterpriseLmsBlendedLearningSession.IUpdate;

  // Generate a fixed sessionId for update call
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Update blended learning session
  const updatedSession: IEnterpriseLmsBlendedLearningSession =
    await api.functional.enterpriseLms.organizationAdmin.blendedLearningSessions.update(
      connection,
      {
        sessionId: sessionId,
        body: updatePayload,
      },
    );
  typia.assert(updatedSession);

  // Step 4: Verify updated session fields match the update request
  TestValidator.equals(
    "session_type matches update",
    updatedSession.session_type,
    updatePayload.session_type,
  );
  TestValidator.equals(
    "title matches update",
    updatedSession.title,
    updatePayload.title,
  );
  TestValidator.equals(
    "description matches update",
    updatedSession.description,
    updatePayload.description,
  );
  TestValidator.equals(
    "status matches update",
    updatedSession.status,
    updatePayload.status,
  );
  TestValidator.equals(
    "scheduled_start_at matches update",
    updatedSession.scheduled_start_at,
    updatePayload.scheduled_start_at,
  );
  TestValidator.equals(
    "scheduled_end_at matches update",
    updatedSession.scheduled_end_at,
    updatePayload.scheduled_end_at,
  );
  TestValidator.equals(
    "actual_start_at matches update",
    updatedSession.actual_start_at,
    updatePayload.actual_start_at,
  );
  TestValidator.equals(
    "actual_end_at matches update",
    updatedSession.actual_end_at,
    updatePayload.actual_end_at,
  );
}
