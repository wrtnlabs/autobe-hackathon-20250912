import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";
import type { IEnterpriseLmsContentLocalization } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentLocalization";
import type { IEnterpriseLmsContents } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContents";

/**
 * This E2E test validates the deletion of a content localization record by
 * an authenticated contentCreatorInstructor user. It includes steps to:
 *
 * 1. Create and join a contentCreatorInstructor user with valid tenant and
 *    account info.
 * 2. Authenticate the contentCreatorInstructor user through login.
 * 3. Create a content item owned by this tenant, with realistic content
 *    metadata.
 * 4. Add a localization to the created content with valid language code and
 *    localized fields.
 * 5. Delete the previously added content localization by providing correct
 *    contentId and localization id.
 * 6. Validate that deletion succeeds without error and no residual
 *    localization remains.
 *
 * The test ensures that proper ownership and tenant scoping are respected
 * and that delete operations function correctly. The scenario avoids
 * unauthorized or error cases, focusing on the successful deletion path
 * only.
 *
 * All API requests and responses are fully validated with typia.assert
 * ensuring exact type conformance.
 */
export async function test_api_content_localization_deletion_by_instructor_success(
  connection: api.IConnection,
) {
  // 1. Create and join contentCreatorInstructor user
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const userEmail = `test.user.${RandomGenerator.alphaNumeric(6)}@example.com`;
  const joinBody = {
    tenant_id: tenantId,
    email: userEmail,
    password_hash: RandomGenerator.alphaNumeric(20),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate;
  const authorizedUser =
    await api.functional.auth.contentCreatorInstructor.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedUser);

  // 2. Authenticate the user by login
  const loginBody = {
    email: userEmail,
    password: joinBody.password_hash,
  } satisfies IEnterpriseLmsContentCreatorInstructor.ILogin;
  const loggedInUser = await api.functional.auth.contentCreatorInstructor.login(
    connection,
    { body: loginBody },
  );
  typia.assert(loggedInUser);

  // 3. Create a content item
  const contentCreateBody = {
    tenant_id: tenantId,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 12,
      wordMin: 4,
      wordMax: 8,
    }),
    content_type: "video",
    status: "draft",
    business_status: "active",
  } satisfies IEnterpriseLmsContents.ICreate;
  const createdContent =
    await api.functional.enterpriseLms.contentCreatorInstructor.contents.create(
      connection,
      { body: contentCreateBody },
    );
  typia.assert(createdContent);

  // 4. Add a content localization for the content item
  const localizationCreateBody = {
    content_id: createdContent.id,
    language_code: "en",
    localized_title: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 4,
      wordMax: 8,
    }),
    localized_description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 7,
    }),
  } satisfies IEnterpriseLmsContentLocalization.ICreate;
  const createdLocalization =
    await api.functional.enterpriseLms.contentCreatorInstructor.contents.contentLocalizations.create(
      connection,
      { contentId: createdContent.id, body: localizationCreateBody },
    );
  typia.assert(createdLocalization);

  // 5. Delete the created localization
  await api.functional.enterpriseLms.contentCreatorInstructor.contents.contentLocalizations.eraseContentLocalization(
    connection,
    { contentId: createdContent.id, id: createdLocalization.id },
  );

  // 6. Validate deletion by attempting to delete again expecting an error
  await TestValidator.error(
    "Deleting already deleted localization should fail",
    async () => {
      await api.functional.enterpriseLms.contentCreatorInstructor.contents.contentLocalizations.eraseContentLocalization(
        connection,
        { contentId: createdContent.id, id: createdLocalization.id },
      );
    },
  );
}
