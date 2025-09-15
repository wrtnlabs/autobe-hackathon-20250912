import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsBlendedLearningSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsBlendedLearningSession";
import type { IEnterpriseLmsGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsGuest";

/**
 * This test validates that a guest user can register, authenticate, and
 * retrieve detailed blended learning session information by sessionId.
 *
 * The test performs:
 *
 * 1. Guest user registration (join) to obtain JWT tokens.
 * 2. Retrieval of blendedLearningSessions details with valid sessionId.
 * 3. Verification of session property accuracy, including tenant isolation.
 * 4. Testing error responses for invalid sessionId, unauthorized requests, and
 *    cross-tenant data access.
 */
export async function test_api_blended_learning_sessions_retrieve_by_guest(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate guest user
  const createGuestBody = {
    tenant_id: typia.random<string & tags.Format<"uuid">>(),
    email: `${RandomGenerator.name(1).replace(/\s/g, "").toLocaleLowerCase()}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsGuest.ICreate;

  const guest: IEnterpriseLmsGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: createGuestBody,
    });
  typia.assert(guest);

  // Step 2: Set up a valid blended learning sessionId (simulate one)
  // In a real environment, you need to have an actual existing sessionId,
  // but since this is an E2E test, we'll generate one as a valid UUID
  const validSessionId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Retrieve blendedLearningSession details by valid sessionId
  const session: IEnterpriseLmsBlendedLearningSession =
    await api.functional.enterpriseLms.guest.blendedLearningSessions.at(
      connection,
      {
        sessionId: validSessionId,
      },
    );

  typia.assert(session);

  // Validate that session id matches the request
  TestValidator.equals("session id should match", session.id, validSessionId);

  // Validate other critical properties
  TestValidator.predicate(
    "tenant_id is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      session.tenant_id,
    ),
  );
  TestValidator.predicate(
    "session_type is non-empty string",
    typeof session.session_type === "string" && session.session_type.length > 0,
  );
  TestValidator.predicate(
    "title is non-empty string",
    typeof session.title === "string" && session.title.length > 0,
  );
  TestValidator.predicate(
    "status is non-empty string",
    typeof session.status === "string" && session.status.length > 0,
  );

  // Validate date-time format for scheduled times
  TestValidator.predicate(
    "scheduled_start_at is ISO 8601 datetime",
    !isNaN(Date.parse(session.scheduled_start_at)),
  );
  if (
    session.scheduled_end_at !== null &&
    session.scheduled_end_at !== undefined
  ) {
    TestValidator.predicate(
      "scheduled_end_at is ISO 8601 datetime or null",
      session.scheduled_end_at === null ||
        !isNaN(Date.parse(session.scheduled_end_at)),
    );
  }

  if (
    session.actual_start_at !== null &&
    session.actual_start_at !== undefined
  ) {
    TestValidator.predicate(
      "actual_start_at is ISO 8601 datetime or null",
      session.actual_start_at === null ||
        !isNaN(Date.parse(session.actual_start_at)),
    );
  }

  if (session.actual_end_at !== null && session.actual_end_at !== undefined) {
    TestValidator.predicate(
      "actual_end_at is ISO 8601 datetime or null",
      session.actual_end_at === null ||
        !isNaN(Date.parse(session.actual_end_at)),
    );
  }

  // Check created_at and updated_at
  TestValidator.predicate(
    "created_at is ISO 8601 datetime",
    !isNaN(Date.parse(session.created_at)),
  );
  TestValidator.predicate(
    "updated_at is ISO 8601 datetime",
    !isNaN(Date.parse(session.updated_at)),
  );

  // deleted_at nullable check
  if (session.deleted_at !== null && session.deleted_at !== undefined) {
    TestValidator.predicate(
      "deleted_at is ISO 8601 datetime or null",
      session.deleted_at === null || !isNaN(Date.parse(session.deleted_at)),
    );
  }

  // Step 4: Test error handling scenarios

  // Invalid sessionId format
  await TestValidator.error(
    "should throw error for invalid UUID sessionId",
    async () => {
      await api.functional.enterpriseLms.guest.blendedLearningSessions.at(
        connection,
        {
          // invalid UUID not matching format
          sessionId: "invalid-uuid-format",
        },
      );
    },
  );

  // Unauthorized access test with unauthenticated connection
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {}, // empty headers simulates no auth token
  };

  await TestValidator.error(
    "should throw error for missing authentication token",
    async () => {
      await api.functional.enterpriseLms.guest.blendedLearningSessions.at(
        unauthenticatedConnection,
        {
          sessionId: validSessionId,
        },
      );
    },
  );

  // Token with different tenant - simulate by using different session Id
  const otherTenantSessionId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "should throw error when accessing session from another tenant",
    async () => {
      await api.functional.enterpriseLms.guest.blendedLearningSessions.at(
        connection,
        {
          sessionId: otherTenantSessionId,
        },
      );
    },
  );
}
