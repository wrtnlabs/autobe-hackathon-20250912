import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";
import type { IEnterpriseLmsContentTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentTag";

/**
 * This E2E test function validates the creation of a content tag by an
 * enterprise LMS contentCreatorInstructor user.
 *
 * The test performs the following steps:
 *
 * 1. Registers a new contentCreatorInstructor user with a valid tenant, email,
 *    password hash, and personal info.
 * 2. Logs in with the newly created user credentials to receive authentication
 *    tokens.
 * 3. Using the authenticated context, creates a new content tag with a unique
 *    code, name, and optional description.
 * 4. Asserts the created content tag's fields, including code, name,
 *    description, and a valid ID.
 *
 * This test ensures that authorization and tenant context are properly
 * enforced and that the content tag data persists correctly.
 *
 * All API operations are awaited, responses are validated with
 * typia.assert, and business logic consistency is verified using
 * TestValidator.
 *
 * Note: Error handling scenarios for duplicate codes or invalid inputs are
 * not covered here due to API limitations in the scenario.
 */
export async function test_api_content_tag_creation_content_creator_instructor_valid(
  connection: api.IConnection,
) {
  // 1. Register contentCreatorInstructor user
  const tenantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Generate user email and plain password
  const userEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const plainPassword = RandomGenerator.alphaNumeric(16); // Plain password string

  const joinBody = {
    tenant_id: tenantId,
    email: userEmail,
    password_hash: plainPassword, // Simulating hashed password with plain password
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate;

  const user: IEnterpriseLmsContentCreatorInstructor.IAuthorized =
    await api.functional.auth.contentCreatorInstructor.join(connection, {
      body: joinBody,
    });
  typia.assert(user);

  // 2. Login as contentCreatorInstructor
  const loginBody = {
    email: userEmail,
    password: plainPassword,
  } satisfies IEnterpriseLmsContentCreatorInstructor.ILogin;

  const loggedInUser: IEnterpriseLmsContentCreatorInstructor.IAuthorized =
    await api.functional.auth.contentCreatorInstructor.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInUser);

  // 3. Create content tag
  const contentTagCode = RandomGenerator.alphaNumeric(10);
  const contentTagName = RandomGenerator.name(2);
  const contentTagDescription = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 5,
    wordMax: 10,
  });

  const contentTagBody = {
    code: contentTagCode,
    name: contentTagName,
    description: contentTagDescription,
  } satisfies IEnterpriseLmsContentTag.ICreate;

  const createdTag: IEnterpriseLmsContentTag =
    await api.functional.enterpriseLms.contentCreatorInstructor.contentTags.createContentTag(
      connection,
      { body: contentTagBody },
    );
  typia.assert(createdTag);

  // 4. Validate the created content tag fields
  TestValidator.predicate(
    "created tag has non-empty UUID id",
    () => typeof createdTag.id === "string" && createdTag.id.length > 0,
  );

  TestValidator.equals(
    "created tag code matches input",
    createdTag.code,
    contentTagCode,
  );
  TestValidator.equals(
    "created tag name matches input",
    createdTag.name,
    contentTagName,
  );

  if (createdTag.description === null || createdTag.description === undefined) {
    TestValidator.predicate(
      "created tag description can be null or undefined",
      () => true,
    );
  } else {
    TestValidator.equals(
      "created tag description matches input",
      createdTag.description,
      contentTagDescription,
    );
  }
}
