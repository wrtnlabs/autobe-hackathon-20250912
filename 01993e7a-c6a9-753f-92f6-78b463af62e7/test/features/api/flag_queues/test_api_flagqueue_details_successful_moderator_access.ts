import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingFlagQueues } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingFlagQueues";
import type { IRecipeSharingModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerator";

/**
 * Test a moderator's successful access to detailed flagged review queue
 * entry.
 *
 * This E2E test first creates a moderator user by calling the join endpoint
 * with valid credentials. After successful creation and authentication, the
 * test calls the flagged review queue detail endpoint with a valid flag
 * queue ID (UUID format) to retrieve detailed information about a specific
 * flagged review.
 *
 * This validates both the authentication flow and the business logic for
 * data retrieval, ensuring the moderator can successfully access flag queue
 * details.
 *
 * The response is validated against the IRecipeSharingFlagQueues type with
 * explicit checks that nullable fields are null or defined as per schema.
 * It also confirms required fields such as id, reported_by_user_id,
 * flag_reason, status, created_at, and updated_at.
 *
 * The test reflects realistic values for all fields, uses typia.assert for
 * schema validation, and includes detailed TestValidator assertions to
 * verify data consistency and format correctness.
 *
 * Steps:
 *
 * 1. Moderator joins with random but valid credentials.
 * 2. Confirm moderator is authorized and has a valid UUID id.
 * 3. Retrieve a flagged review queue entry by a valid UUID id using moderator
 *    authorization.
 * 4. Assert all returned data fields match expected types and constraints.
 */
export async function test_api_flagqueue_details_successful_moderator_access(
  connection: api.IConnection,
) {
  // 1. Create a moderator user (join)
  const requestBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingModerator.ICreate;

  const moderator: IRecipeSharingModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: requestBody,
    });
  typia.assert(moderator);

  // 2. Validate moderator properties
  TestValidator.predicate(
    "moderator id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      moderator.id,
    ),
  );
  TestValidator.equals(
    "moderator email matches input",
    moderator.email,
    requestBody.email,
  );
  TestValidator.predicate(
    "moderator created_at is ISO 8601",
    typeof moderator.created_at === "string" &&
      !isNaN(Date.parse(moderator.created_at)),
  );
  TestValidator.predicate(
    "moderator updated_at is ISO 8601",
    typeof moderator.updated_at === "string" &&
      !isNaN(Date.parse(moderator.updated_at)),
  );
  TestValidator.equals(
    "moderator deleted_at is null",
    moderator.deleted_at,
    null,
  );

  // 3. Retrieve a flagged review queue entry detail by a valid UUID
  const flagQueueId = typia.random<string & tags.Format<"uuid">>();
  const flaggedReviewQueue: IRecipeSharingFlagQueues =
    await api.functional.recipeSharing.moderator.flagQueues.at(connection, {
      id: flagQueueId,
    });
  typia.assert(flaggedReviewQueue);

  // 4. Validate flaggedReviewQueue properties
  TestValidator.predicate(
    "flagged review queue id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      flaggedReviewQueue.id,
    ),
  );

  if (
    flaggedReviewQueue.recipe_sharing_review_id !== undefined &&
    flaggedReviewQueue.recipe_sharing_review_id !== null
  ) {
    TestValidator.predicate(
      "flagged review id is valid UUID when defined",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        flaggedReviewQueue.recipe_sharing_review_id,
      ),
    );
  } else {
    TestValidator.equals(
      "flagged review id is null",
      flaggedReviewQueue.recipe_sharing_review_id,
      null,
    );
  }

  TestValidator.predicate(
    "flagged review queue reported_by_user_id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      flaggedReviewQueue.reported_by_user_id,
    ),
  );
  TestValidator.predicate(
    "flag_reason is non-empty string",
    typeof flaggedReviewQueue.flag_reason === "string" &&
      flaggedReviewQueue.flag_reason.length > 0,
  );
  TestValidator.predicate(
    "status is non-empty string",
    typeof flaggedReviewQueue.status === "string" &&
      flaggedReviewQueue.status.length > 0,
  );

  TestValidator.predicate(
    "created_at is ISO 8601",
    typeof flaggedReviewQueue.created_at === "string" &&
      !isNaN(Date.parse(flaggedReviewQueue.created_at)),
  );
  TestValidator.predicate(
    "updated_at is ISO 8601",
    typeof flaggedReviewQueue.updated_at === "string" &&
      !isNaN(Date.parse(flaggedReviewQueue.updated_at)),
  );

  if (
    flaggedReviewQueue.deleted_at !== undefined &&
    flaggedReviewQueue.deleted_at !== null
  ) {
    TestValidator.predicate(
      "deleted_at is ISO 8601 date string when defined",
      typeof flaggedReviewQueue.deleted_at === "string" &&
        !isNaN(Date.parse(flaggedReviewQueue.deleted_at)),
    );
  } else {
    TestValidator.equals(
      "deleted_at is null or undefined",
      flaggedReviewQueue.deleted_at,
      null,
    );
  }
}
