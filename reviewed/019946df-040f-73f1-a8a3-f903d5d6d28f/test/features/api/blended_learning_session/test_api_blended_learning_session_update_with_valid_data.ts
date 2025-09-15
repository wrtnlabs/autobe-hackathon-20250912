import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsBlendedLearningSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsBlendedLearningSession";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";

/**
 * E2E test that validates updating a blended learning session by a system
 * administrator with valid data.
 *
 * This test performs the following steps:
 *
 * 1. Registers and authenticates a new system administrator user via the join
 *    API endpoint.
 * 2. Generates realistic and valid update data conforming to the
 *    IEnterpriseLmsBlendedLearningSession.IUpdate DTO.
 * 3. Invokes the update API for blended learning sessions with a valid
 *    sessionId and update payload.
 * 4. Validates the updated session response using typia.assert for schema
 *    conformity.
 * 5. Includes detailed TestValidator assertions for all updated properties,
 *    verifying that the changes are properly applied.
 *
 * Business context: System administrators manage blended learning sessions'
 * lifecycle and scheduling within their tenant organizations. This test
 * ensures that updating session details follows business and technical
 * contracts accurately.
 *
 * Notes:
 *
 * - The function uses strict TypeScript practices and avoids header
 *   manipulation.
 * - Only valid and complete data is tested; error and unauthorized scenarios
 *   are excluded.
 *
 * @param connection API connection context.
 */
export async function test_api_blended_learning_session_update_with_valid_data(
  connection: api.IConnection,
) {
  // 1. Register and authenticate system administrator user
  const systemAdminEmail = typia.random<string & tags.Format<"email">>();
  const systemAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: systemAdminEmail,
      password_hash: RandomGenerator.alphaNumeric(32),
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      status: "active",
    } satisfies IEnterpriseLmsSystemAdmin.ICreate,
  });
  typia.assert(systemAdmin);

  // Prepare realistic update data according to IUpdate DTO
  // Required fields are optional in IUpdate, choose a valid update set
  const updatedSessionType = RandomGenerator.pick([
    "online",
    "offline",
    "hybrid",
  ] as const);
  const updatedTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const updatedDescription = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 5,
    wordMax: 10,
  });
  // Status - updating to a valid status value (assuming common status values)
  const updatedStatus = RandomGenerator.pick([
    "scheduled",
    "completed",
    "cancelled",
  ] as const);

  // Scheduled start and end times in ISO 8601 format
  const now = new Date();
  const scheduledStartAt = new Date(
    now.getTime() + 24 * 60 * 60 * 1000,
  ).toISOString(); // +1 day
  const scheduledEndAt = new Date(
    now.getTime() + 26 * 60 * 60 * 1000,
  ).toISOString(); // +1 day +2 hours

  // Actual start and end - null to indicate not started/ended yet
  const actualStartAt = null;
  const actualEndAt = null;

  // Generate a valid session ID for update
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  // Construct update body respecting null vs undefined and types
  const updateBody = {
    session_type: updatedSessionType,
    title: updatedTitle,
    description: updatedDescription,
    status: updatedStatus,
    scheduled_start_at: scheduledStartAt,
    scheduled_end_at: scheduledEndAt,
    actual_start_at: actualStartAt,
    actual_end_at: actualEndAt,
  } satisfies IEnterpriseLmsBlendedLearningSession.IUpdate;

  // 2. Invoke update API
  const updatedSession =
    await api.functional.enterpriseLms.systemAdmin.blendedLearningSessions.update(
      connection,
      {
        sessionId: sessionId,
        body: updateBody,
      },
    );
  typia.assert(updatedSession);

  // 3. Validate updated fields
  TestValidator.equals(
    "updated session ID matches",
    updatedSession.id,
    sessionId,
  );
  TestValidator.predicate(
    "tenant ID exists in updated session",
    typeof updatedSession.tenant_id === "string" &&
      updatedSession.tenant_id.length > 0,
  );
  TestValidator.equals(
    "session_type updated correctly",
    updatedSession.session_type,
    updatedSessionType,
  );
  TestValidator.equals(
    "title updated correctly",
    updatedSession.title,
    updatedTitle,
  );
  TestValidator.equals(
    "description updated correctly",
    updatedSession.description,
    updatedDescription,
  );
  TestValidator.equals(
    "status updated correctly",
    updatedSession.status,
    updatedStatus,
  );
  TestValidator.equals(
    "scheduled_start_at updated correctly",
    updatedSession.scheduled_start_at,
    scheduledStartAt,
  );
  TestValidator.equals(
    "scheduled_end_at updated correctly",
    updatedSession.scheduled_end_at ?? null,
    scheduledEndAt,
  );
  TestValidator.equals(
    "actual_start_at is null as expected",
    updatedSession.actual_start_at ?? null,
    actualStartAt,
  );
  TestValidator.equals(
    "actual_end_at is null as expected",
    updatedSession.actual_end_at ?? null,
    actualEndAt,
  );
  TestValidator.predicate(
    "created_at is a valid ISO 8601 date-time string",
    typeof updatedSession.created_at === "string" &&
      updatedSession.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is a valid ISO 8601 date-time string",
    typeof updatedSession.updated_at === "string" &&
      updatedSession.updated_at.length > 0,
  );
  TestValidator.equals(
    "deleted_at is null or undefined",
    updatedSession.deleted_at ?? null,
    null,
  );
}
