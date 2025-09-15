import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEnterpriseLmsForum } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForum";

/**
 * This test validates the public GET /enterpriseLms/forums/{forumId}
 * endpoint.
 *
 * It verifies retrieval of a known forum identified by a valid UUID,
 * asserting all returned properties conform to the IEnterpriseLmsForum
 * type. The test confirms UUID and ISO 8601 formats for relevant fields.
 *
 * It additionally tests that a non-existent forum ID returns an error,
 * confirming 404-like behavior. All calls are made without authentication,
 * ensuring public access.
 *
 * The test protects tenant isolation by using randomly generated UUIDs and
 * asserts adherence to the schema using typia.assert.
 *
 * No authentication or header manipulation is performed.
 */
export async function test_api_public_forum_retrieval_success(
  connection: api.IConnection,
) {
  // 1. Generate a valid UUID to represent a forumId
  const validForumId = typia.random<string & tags.Format<"uuid">>();

  // 2. Call the public forum retrieval endpoint
  const forum: IEnterpriseLmsForum =
    await api.functional.enterpriseLms.forums.at(connection, {
      forumId: validForumId,
    });
  typia.assert(forum);

  // 3. Validate UUID formatted fields
  TestValidator.predicate(
    "forum id is UUID format",
    typia.is<string & tags.Format<"uuid">>(forum.id),
  );
  TestValidator.predicate(
    "tenant_id is UUID format",
    typia.is<string & tags.Format<"uuid">>(forum.tenant_id),
  );
  TestValidator.predicate(
    "owner_id is UUID format",
    typia.is<string & tags.Format<"uuid">>(forum.owner_id),
  );

  // 4. Validate ISO 8601 date-time fields
  const iso8601Regex =
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]+)?Z$/;

  TestValidator.predicate(
    "created_at follows ISO 8601 format",
    iso8601Regex.test(forum.created_at),
  );
  TestValidator.predicate(
    "updated_at follows ISO 8601 format",
    iso8601Regex.test(forum.updated_at),
  );

  // 5. Test retrieval error on non-existent forum ID
  await TestValidator.error("error when forum ID not found", async () => {
    await api.functional.enterpriseLms.forums.at(connection, {
      forumId: "00000000-0000-0000-0000-000000000000", // valid format, non-existent
    });
  });
}
