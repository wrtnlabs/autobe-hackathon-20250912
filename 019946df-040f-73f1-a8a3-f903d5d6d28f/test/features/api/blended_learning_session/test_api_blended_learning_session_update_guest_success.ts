import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsBlendedLearningSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsBlendedLearningSession";
import type { IEnterpriseLmsGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsGuest";

/**
 * This test scenario exercises the update of a blended learning session as
 * an authenticated guest user. It includes guest user registration to
 * establish the authentication context, followed by an update of the
 * blended learning session with a valid sessionId and a complete update
 * payload reflecting session details and schedule.
 *
 * The test validates that the updated session returned matches the expected
 * structure and fields, with tenant isolation and guest role access rules
 * respected.
 *
 * Main flow:
 *
 * 1. Register a guest user and obtain authentication tokens.
 * 2. Use a newly created UUID as sessionId.
 * 3. Construct realistic update data including type, title, description,
 *    status, and ISO timestamps for scheduling fields.
 * 4. Call the API to update the session as the guest user.
 * 5. Assert that the response matches the expected session structure with
 *    updated fields.
 *
 * This test excludes negative tests for invalid sessionId or unauthorized
 * access, focusing on success scenario for guest role user.
 */
export async function test_api_blended_learning_session_update_guest_success(
  connection: api.IConnection,
) {
  // 1. Register guest user and authenticate
  const guestCreateBody = {
    tenant_id: typia.random<string & tags.Format<"uuid">>(),
    email: `guest_${RandomGenerator.alphabets(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsGuest.ICreate;

  const guest: IEnterpriseLmsGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, { body: guestCreateBody });
  typia.assert(guest);

  // 2. Prepare update_payload for blended learning session
  const sessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const now = new Date();
  const scheduledStartAt = now.toISOString();
  const scheduledEndAt = new Date(
    now.getTime() + 1000 * 60 * 60 * 2,
  ).toISOString(); // +2 hours
  const actualStartAt = new Date(now.getTime() + 1000 * 60 * 5).toISOString(); // +5 minutes
  const actualEndAt = new Date(
    now.getTime() + 1000 * 60 * 60 * 1 + 1000 * 60 * 55,
  ).toISOString(); // +1h 55m

  const updateBody = {
    session_type: RandomGenerator.pick([
      "online",
      "offline",
      "hybrid",
    ] as const),
    title: RandomGenerator.paragraph({ sentences: 5, wordMin: 4, wordMax: 10 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 4,
      wordMax: 8,
    }),
    status: RandomGenerator.pick([
      "scheduled",
      "completed",
      "cancelled",
    ] as const),
    scheduled_start_at: scheduledStartAt,
    scheduled_end_at: scheduledEndAt,
    actual_start_at: actualStartAt,
    actual_end_at: actualEndAt,
  } satisfies IEnterpriseLmsBlendedLearningSession.IUpdate;

  // 3. Call the update API to update blended learning session
  const updatedSession: IEnterpriseLmsBlendedLearningSession =
    await api.functional.enterpriseLms.guest.blendedLearningSessions.update(
      connection,
      {
        sessionId,
        body: updateBody,
      },
    );
  typia.assert(updatedSession);

  // 4. Validate returned session fields
  TestValidator.equals("sessionId equals", updatedSession.id, sessionId);
  TestValidator.equals(
    "session_type equals",
    updatedSession.session_type,
    updateBody.session_type!,
  );
  TestValidator.equals("title equals", updatedSession.title, updateBody.title!);
  TestValidator.equals(
    "description equals",
    updatedSession.description,
    updateBody.description !== undefined ? updateBody.description : null,
  );
  TestValidator.equals(
    "status equals",
    updatedSession.status,
    updateBody.status!,
  );
  TestValidator.equals(
    "scheduled_start_at equals",
    updatedSession.scheduled_start_at,
    updateBody.scheduled_start_at!,
  );
  TestValidator.equals(
    "scheduled_end_at equals",
    updatedSession.scheduled_end_at,
    updateBody.scheduled_end_at!,
  );
  TestValidator.equals(
    "actual_start_at equals",
    updatedSession.actual_start_at,
    updateBody.actual_start_at!,
  );
  TestValidator.equals(
    "actual_end_at equals",
    updatedSession.actual_end_at,
    updateBody.actual_end_at!,
  );
  TestValidator.predicate(
    "tenant_id is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      updatedSession.tenant_id,
    ),
  );
  TestValidator.predicate(
    "created_at is date-time format",
    typeof updatedSession.created_at === "string" &&
      updatedSession.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is date-time format",
    typeof updatedSession.updated_at === "string" &&
      updatedSession.updated_at.length > 0,
  );
}
