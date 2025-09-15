import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsBlendedLearningSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsBlendedLearningSession";
import type { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";
import type { IEnterpriseLmsVirtualClassroom } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsVirtualClassroom";

/**
 * Test E2E scenario for success case of updating a blended learning session
 * by a content creator instructor.
 *
 * This function performs the full flow of:
 *
 * 1. Create and authenticate a content creator instructor user.
 * 2. Create a virtual classroom session for dependency.
 * 3. Update an existing blended learning session by modifying properties.
 * 4. Assert the correctness and integrity of the update operation.
 *
 * The workflow also ensures that data respects format and tenant
 * boundaries. It uses realistic random data matching formats like UUID and
 * date-time strings.
 *
 * Each step performs typia assertions and TestValidator checks to guarantee
 * type safety and business logic.
 */
export async function test_api_blended_learning_session_update_content_creator_instructor_success(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a content creator instructor user.
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const email = `${RandomGenerator.name(1).replace(/\s+/g, ".").toLowerCase()}@example.com`;
  const passwordHash = "hashedpassword123!@#";
  const firstName = RandomGenerator.name(1);
  const lastName = RandomGenerator.name(1);

  const contentCreatorInstructorUser: IEnterpriseLmsContentCreatorInstructor.IAuthorized =
    await api.functional.auth.contentCreatorInstructor.join(connection, {
      body: {
        tenant_id: tenantId,
        email: email,
        password_hash: passwordHash,
        first_name: firstName,
        last_name: lastName,
        status: "active",
      } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate,
    });
  typia.assert(contentCreatorInstructorUser);

  // Step 2: Create a virtual classroom session as dependency
  // Use the created content creator instructor's tenant_id and id
  const virtualClassroomTitle = RandomGenerator.paragraph({ sentences: 3 });
  const virtualClassroomDescription = RandomGenerator.content({
    paragraphs: 1,
  });
  const now = new Date();
  const startAt = new Date(now.getTime() + 3600000).toISOString(); // +1 hour
  const endAt = new Date(now.getTime() + 7200000).toISOString(); // +2 hours

  const virtualClassroom: IEnterpriseLmsVirtualClassroom =
    await api.functional.enterpriseLms.contentCreatorInstructor.virtualClassrooms.create(
      connection,
      {
        body: {
          tenant_id: contentCreatorInstructorUser.tenant_id,
          instructor_id: contentCreatorInstructorUser.id,
          title: virtualClassroomTitle,
          description: virtualClassroomDescription,
          start_at: startAt,
          end_at: endAt,
        } satisfies IEnterpriseLmsVirtualClassroom.ICreate,
      },
    );
  typia.assert(virtualClassroom);

  // Step 3: Prepare blended learning session update data
  // We emulate having an existing blended learning session with a sessionId
  const existingSessionId = typia.random<string & tags.Format<"uuid">>();

  // Make update info with modified title, description, session_type, status, and schedule
  const updatedTitle = RandomGenerator.paragraph({ sentences: 4 });
  const updatedDescription = RandomGenerator.content({ paragraphs: 2 });
  const updatedSessionType: string = RandomGenerator.pick([
    "online",
    "offline",
    "hybrid",
  ] as const);
  const updatedStatus: string = RandomGenerator.pick([
    "scheduled",
    "completed",
    "cancelled",
  ] as const);
  const updatedScheduledStartAt = new Date(
    now.getTime() + 86400000,
  ).toISOString(); // +1 day
  const updatedScheduledEndAt = new Date(
    now.getTime() + 172800000,
  ).toISOString(); // +2 days
  const updatedActualStartAt = null;
  const updatedActualEndAt = null;

  const updateBody = {
    title: updatedTitle,
    description: updatedDescription,
    session_type: updatedSessionType,
    status: updatedStatus,
    scheduled_start_at: updatedScheduledStartAt,
    scheduled_end_at: updatedScheduledEndAt,
    actual_start_at: updatedActualStartAt,
    actual_end_at: updatedActualEndAt,
  } satisfies IEnterpriseLmsBlendedLearningSession.IUpdate;

  // Step 4: Perform the blended learning session update
  const updatedSession: IEnterpriseLmsBlendedLearningSession =
    await api.functional.enterpriseLms.contentCreatorInstructor.blendedLearningSessions.update(
      connection,
      {
        sessionId: existingSessionId,
        body: updateBody,
      },
    );
  typia.assert(updatedSession);

  // Step 5: Assert the updated session fields match the update request
  TestValidator.equals(
    "tenant_id remains unchanged",
    updatedSession.tenant_id,
    tenantId,
  );
  TestValidator.equals(
    "session_type updated",
    updatedSession.session_type,
    updatedSessionType,
  );
  TestValidator.equals("title updated", updatedSession.title, updatedTitle);
  TestValidator.equals(
    "description updated",
    updatedSession.description,
    updatedDescription,
  );
  TestValidator.equals("status updated", updatedSession.status, updatedStatus);
  TestValidator.equals(
    "scheduled_start_at updated",
    updatedSession.scheduled_start_at,
    updatedScheduledStartAt,
  );
  TestValidator.equals(
    "scheduled_end_at updated",
    updatedSession.scheduled_end_at,
    updatedScheduledEndAt,
  );
  TestValidator.equals(
    "actual_start_at updated with null",
    updatedSession.actual_start_at,
    null,
  );
  TestValidator.equals(
    "actual_end_at updated with null",
    updatedSession.actual_end_at,
    null,
  );
}
