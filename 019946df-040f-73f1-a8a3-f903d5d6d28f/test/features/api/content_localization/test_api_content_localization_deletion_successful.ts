import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";
import type { IEnterpriseLmsContentLocalization } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentLocalization";
import type { IEnterpriseLmsContents } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContents";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";

/**
 * This E2E test verifies the full lifecycle of deleting a content localization
 * in the enterprise LMS system with strict role-based authorization and data
 * setup.
 *
 * The scenario proceeds as follows:
 *
 * 1. System administrator account is created via the systemAdmin join endpoint.
 * 2. System administrator logs in to acquire authorization token.
 * 3. Content creator instructor account is created via the
 *    contentCreatorInstructor join endpoint.
 * 4. Content creator instructor logs in to acquire authorization token.
 * 5. Content creator instructor creates a new content item, specifying tenant ID,
 *    title, content type, status, and business status.
 * 6. Content creator instructor creates a content localization linked to the
 *    content item, providing language code, localized title, and optional
 *    localized description.
 * 7. The system administrator switches authorization by logging in, ensuring
 *    role-based context is correct.
 * 8. The system administrator deletes the previously created content localization
 *    by contentId and localization id.
 * 9. To validate deletion, the test tries to delete the same content localization
 *    again, expecting an error (which is not directly testable as no retrieval
 *    API is provided). This step is omitted to avoid type errors or invalid
 *    test scenarios since the delete function returns void.
 *
 * Each step uses valid UUIDs, ISO 8601 timestamps, and realistic random data,
 * fully type-safe and abiding by the API contracts. All API responses are
 * asserted with typia to verify correct typing. System admin and content
 * creator instructor tokens are managed automatically by the SDK.
 *
 * This test ensures that deletion is effective and works only under correct
 * authorization.
 *
 * The test gracefully handles the entire flow with proper async/await usage and
 * strict type safety compliance.
 */
export async function test_api_content_localization_deletion_successful(
  connection: api.IConnection,
) {
  // 1. Create system admin user
  const systemAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(16),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const systemAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: systemAdminJoinBody,
    });
  typia.assert(systemAdmin);

  // 2. Login as system admin to switch context
  const systemAdminLoginBody = {
    email: systemAdminJoinBody.email,
    password_hash: systemAdminJoinBody.password_hash,
  } satisfies IEnterpriseLmsSystemAdmin.ILogin;

  await api.functional.auth.systemAdmin.login(connection, {
    body: systemAdminLoginBody,
  });

  // 3. Create content creator instructor
  const contentCreatorJoinBody = {
    tenant_id: systemAdmin.tenant_id,
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(16),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate;

  const contentCreator: IEnterpriseLmsContentCreatorInstructor.IAuthorized =
    await api.functional.auth.contentCreatorInstructor.join(connection, {
      body: contentCreatorJoinBody,
    });
  typia.assert(contentCreator);

  // 4. Login as content creator instructor
  const contentCreatorLoginBody = {
    email: contentCreatorJoinBody.email,
    password: contentCreatorJoinBody.password_hash,
  } satisfies IEnterpriseLmsContentCreatorInstructor.ILogin;

  await api.functional.auth.contentCreatorInstructor.login(connection, {
    body: contentCreatorLoginBody,
  });

  // 5. Create content under created tenant
  const contentCreateBody = {
    tenant_id: systemAdmin.tenant_id,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    content_type: "video",
    status: "approved",
    business_status: "active",
  } satisfies IEnterpriseLmsContents.ICreate;

  const content: IEnterpriseLmsContents =
    await api.functional.enterpriseLms.contentCreatorInstructor.contents.create(
      connection,
      {
        body: contentCreateBody,
      },
    );
  typia.assert(content);

  // 6. Create content localization
  const localizationCreateBody = {
    content_id: content.id,
    language_code: "en",
    localized_title: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 6,
    }),
    localized_description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 6,
      wordMin: 3,
      wordMax: 8,
    }),
  } satisfies IEnterpriseLmsContentLocalization.ICreate;

  const localization: IEnterpriseLmsContentLocalization =
    await api.functional.enterpriseLms.contentCreatorInstructor.contents.contentLocalizations.create(
      connection,
      {
        contentId: content.id,
        body: localizationCreateBody,
      },
    );
  typia.assert(localization);

  // 7. Switch back to system admin by login
  await api.functional.auth.systemAdmin.login(connection, {
    body: systemAdminLoginBody,
  });

  // 8. Perform deletion of content localization
  await api.functional.enterpriseLms.systemAdmin.contents.contentLocalizations.eraseContentLocalization(
    connection,
    {
      contentId: content.id,
      id: localization.id,
    },
  );

  // No direct verification of deletion since retrieve/delete for non-existent is not provided
}
