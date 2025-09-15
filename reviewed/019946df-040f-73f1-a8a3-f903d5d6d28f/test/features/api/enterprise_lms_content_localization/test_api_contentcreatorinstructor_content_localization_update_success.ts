import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";
import type { IEnterpriseLmsContentLocalization } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentLocalization";
import type { IEnterpriseLmsContents } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContents";

/**
 * This test function validates the entire content localization update
 * workflow by a contentCreatorInstructor user.
 *
 * It includes user creation, login, content creation, localization
 * creation, update, and validations.
 *
 * Error scenarios with invalid IDs and unauthorized attempts are also
 * verified.
 */
export async function test_api_contentcreatorinstructor_content_localization_update_success(
  connection: api.IConnection,
) {
  // 1. Register and join as contentCreatorInstructor
  const tenantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const passwordHash = RandomGenerator.alphaNumeric(64); // assuming hash

  const joinBody = {
    tenant_id: tenantId,
    email,
    password_hash: passwordHash,
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate;

  const authorizedUser: IEnterpriseLmsContentCreatorInstructor.IAuthorized =
    await api.functional.auth.contentCreatorInstructor.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedUser);

  // 2. Login as the contentCreatorInstructor
  const loginBody = {
    email,
    password: passwordHash,
  } satisfies IEnterpriseLmsContentCreatorInstructor.ILogin;

  const loginResult: IEnterpriseLmsContentCreatorInstructor.IAuthorized =
    await api.functional.auth.contentCreatorInstructor.login(connection, {
      body: loginBody,
    });
  typia.assert(loginResult);

  // 3. Create a new content item
  const contentCreateBody = {
    tenant_id: authorizedUser.tenant_id,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    content_type: "video",
    status: "draft",
    business_status: "active",
  } satisfies IEnterpriseLmsContents.ICreate;

  const createdContent: IEnterpriseLmsContents =
    await api.functional.enterpriseLms.contentCreatorInstructor.contents.create(
      connection,
      {
        body: contentCreateBody,
      },
    );
  typia.assert(createdContent);

  // 4. Create a new content localization for the content
  const languageCode = RandomGenerator.pick([
    "en",
    "fr",
    "es",
    "de",
    "ko",
    "jp",
  ] as const);

  const localizationCreateBody = {
    content_id: createdContent.id,
    language_code: languageCode,
    localized_title: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 7,
    }),
    localized_description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 4,
      sentenceMax: 8,
    }),
  } satisfies IEnterpriseLmsContentLocalization.ICreate;

  const createdLocalization: IEnterpriseLmsContentLocalization =
    await api.functional.enterpriseLms.contentCreatorInstructor.contents.contentLocalizations.create(
      connection,
      {
        contentId: createdContent.id,
        body: localizationCreateBody,
      },
    );
  typia.assert(createdLocalization);

  // 5. Perform an update on the content localization
  const updatedTitle = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 5,
    wordMax: 9,
  });
  const updatedDescription = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 6,
    sentenceMax: 12,
  });

  const localizationUpdateBody = {
    localized_title: updatedTitle,
    localized_description: updatedDescription,
  } satisfies IEnterpriseLmsContentLocalization.IUpdate;

  const updatedLocalization: IEnterpriseLmsContentLocalization =
    await api.functional.enterpriseLms.contentCreatorInstructor.contents.contentLocalizations.update(
      connection,
      {
        contentId: createdContent.id,
        id: createdLocalization.id,
        body: localizationUpdateBody,
      },
    );
  typia.assert(updatedLocalization);

  // 6. Validate the updated fields match input
  TestValidator.equals(
    "updated localized_title matches",
    updatedLocalization.localized_title,
    updatedTitle,
  );
  TestValidator.equals(
    "updated localized_description matches",
    updatedLocalization.localized_description,
    updatedDescription,
  );
  TestValidator.equals(
    "content_id remains unchanged",
    updatedLocalization.content_id,
    createdContent.id,
  );
  TestValidator.equals(
    "localization id remains unchanged",
    updatedLocalization.id,
    createdLocalization.id,
  );

  // 7. Errors for invalid contentId
  await TestValidator.error(
    "update with non-existent contentId should fail",
    async () => {
      await api.functional.enterpriseLms.contentCreatorInstructor.contents.contentLocalizations.update(
        connection,
        {
          contentId: typia.random<string & tags.Format<"uuid">>(),
          id: createdLocalization.id,
          body: localizationUpdateBody,
        },
      );
    },
  );

  // 7a. Errors for invalid localization id
  await TestValidator.error(
    "update with non-existent localization id should fail",
    async () => {
      await api.functional.enterpriseLms.contentCreatorInstructor.contents.contentLocalizations.update(
        connection,
        {
          contentId: createdContent.id,
          id: typia.random<string & tags.Format<"uuid">>(),
          body: localizationUpdateBody,
        },
      );
    },
  );

  // 8. Attempt unauthorized update: create a second user and try updating the original content localization with the new connection context
  const otherTenantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const otherEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const otherPasswordHash = RandomGenerator.alphaNumeric(64);

  const otherUserBody = {
    tenant_id: otherTenantId,
    email: otherEmail,
    password_hash: otherPasswordHash,
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate;

  const otherUser: IEnterpriseLmsContentCreatorInstructor.IAuthorized =
    await api.functional.auth.contentCreatorInstructor.join(connection, {
      body: otherUserBody,
    });
  typia.assert(otherUser);

  const otherLoginBody = {
    email: otherEmail,
    password: otherPasswordHash,
  } satisfies IEnterpriseLmsContentCreatorInstructor.ILogin;

  await api.functional.auth.contentCreatorInstructor.login(connection, {
    body: otherLoginBody,
  });

  // Try to update the first localization under another user's authenticated context
  await TestValidator.error(
    "unauthorized user cannot update localization",
    async () => {
      await api.functional.enterpriseLms.contentCreatorInstructor.contents.contentLocalizations.update(
        connection,
        {
          contentId: createdContent.id,
          id: createdLocalization.id,
          body: localizationUpdateBody,
        },
      );
    },
  );
}
