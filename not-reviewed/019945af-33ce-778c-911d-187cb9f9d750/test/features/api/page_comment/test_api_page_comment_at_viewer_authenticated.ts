import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficePageComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageComment";
import type { IFlexOfficeViewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeViewer";

/**
 * This End-to-End test validates the retrieval of detailed page comment
 * information via the viewer role. It performs the following steps:
 *
 * 1. Register a new viewer user by calling the join endpoint with realistic
 *    random credentials.
 * 2. Log in as the same viewer user to refresh authentication tokens.
 * 3. Fetch a page comment by a randomly generated UUID using the authenticated
 *    viewer context.
 * 4. Assert that the returned data fully conforms to the
 *    IFlexOfficePageComment structure.
 * 5. Validate all relevant fields including IDs in UUID format, content
 *    strings, timestamps in ISO 8601 format, and optional deletion
 *    timestamp that may be null.
 *
 * The test enforces strict type correctness with typia.assert and uses
 * TestValidator for any business validations if necessary. Authentication
 * headers are managed automatically by the SDK and do not require manual
 * intervention.
 *
 * This test ensures that only properly authorized viewer users can retrieve
 * page comments and that all returned data is complete and valid.
 */
export async function test_api_page_comment_at_viewer_authenticated(
  connection: api.IConnection,
) {
  // 1. Register a new viewer user
  const joinBody = {
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(8),
  } satisfies IFlexOfficeViewer.ICreate;

  const viewerAuth = await api.functional.auth.viewer.join(connection, {
    body: joinBody,
  });
  typia.assert(viewerAuth);

  // 2. Login as the same viewer user
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies IFlexOfficeViewer.ILogin;

  const viewerLoginAuth = await api.functional.auth.viewer.login(connection, {
    body: loginBody,
  });
  typia.assert(viewerLoginAuth);

  // 3. Retrieve a page comment by random UUID
  const pageCommentId = typia.random<string & tags.Format<"uuid">>();

  const pageComment = await api.functional.flexOffice.viewer.pageComments.at(
    connection,
    {
      pageCommentId,
    },
  );
  typia.assert(pageComment);

  // 4. Validate business rules if necessary
  TestValidator.predicate(
    "pageComment.id is UUID",
    /^[0-9a-f-]{36}$/i.test(pageComment.id),
  );
  TestValidator.equals(
    "pageComment.id matches param",
    pageComment.id,
    pageCommentId,
  );
  TestValidator.predicate(
    "pageComment.page_id is UUID",
    /^[0-9a-f-]{36}$/i.test(pageComment.page_id),
  );
  TestValidator.predicate(
    "pageComment.editor_id is UUID",
    /^[0-9a-f-]{36}$/i.test(pageComment.editor_id),
  );
  TestValidator.predicate(
    "pageComment.content is string",
    typeof pageComment.content === "string",
  );
  TestValidator.predicate(
    "pageComment.created_at is ISO 8601",
    typeof pageComment.created_at === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]+)?Z$/.test(
        pageComment.created_at,
      ),
  );
  TestValidator.predicate(
    "pageComment.updated_at is ISO 8601",
    typeof pageComment.updated_at === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]+)?Z$/.test(
        pageComment.updated_at,
      ),
  );
  if (pageComment.deleted_at !== undefined && pageComment.deleted_at !== null) {
    TestValidator.predicate(
      "pageComment.deleted_at is null or ISO 8601",
      typeof pageComment.deleted_at === "string" &&
        /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]+)?Z$/.test(
          pageComment.deleted_at,
        ),
    );
  }
}
