import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";
import type { IEnterpriseLmsContentLocalization } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentLocalization";
import type { IEnterpriseLmsContents } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContents";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import type { IEnterpriseLmsTenant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsTenant";

export async function test_api_content_localization_creation(
  connection: api.IConnection,
) {
  // 1. Authenticate as system admin user via join
  const systemAdminEmail = typia.random<string & tags.Format<"email">>();
  const systemAdminPasswordHash = RandomGenerator.alphaNumeric(64);
  const systemAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: systemAdminEmail,
        password_hash: systemAdminPasswordHash,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        status: "active",
      } satisfies IEnterpriseLmsSystemAdmin.ICreate,
    });
  typia.assert(systemAdmin);

  // 2. Create tenant using system admin authorization
  const tenantCode = `tenant${RandomGenerator.alphaNumeric(6)}`;
  const tenantName = `Tenant ${RandomGenerator.name(2)}`;
  const tenant: IEnterpriseLmsTenant =
    await api.functional.enterpriseLms.systemAdmin.tenants.create(connection, {
      body: {
        code: tenantCode,
        name: tenantName,
      } satisfies IEnterpriseLmsTenant.ICreate,
    });
  typia.assert(tenant);

  // 3. Join content creator instructor affiliated with the tenant
  const contentCreatorEmail = typia.random<string & tags.Format<"email">>();
  const contentCreatorPasswordHash = RandomGenerator.alphaNumeric(64);
  const contentCreator: IEnterpriseLmsContentCreatorInstructor.IAuthorized =
    await api.functional.auth.contentCreatorInstructor.join(connection, {
      body: {
        tenant_id: tenant.id,
        email: contentCreatorEmail,
        password_hash: contentCreatorPasswordHash,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        status: "active",
      } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate,
    });
  typia.assert(contentCreator);

  // 4. Authenticate content creator instructor via login to switch context
  const loginInfo: IEnterpriseLmsContentCreatorInstructor.ILogin = {
    email: contentCreatorEmail,
    password: contentCreatorPasswordHash,
  };
  const loggedInContentCreator =
    await api.functional.auth.contentCreatorInstructor.login(connection, {
      body: loginInfo,
    });
  typia.assert(loggedInContentCreator);

  // 5. Create a content item under the tenant
  const contentTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const contentDescription = RandomGenerator.content({ paragraphs: 2 });
  const contentType = RandomGenerator.pick([
    "video",
    "document",
    "scorm",
    "xapi",
  ] as const);
  const contentStatus = "draft";
  const contentBusinessStatus = "active";

  const contentCreateBody = {
    tenant_id: tenant.id,
    title: contentTitle,
    description: contentDescription,
    content_type: contentType,
    status: contentStatus,
    business_status: contentBusinessStatus,
  } satisfies IEnterpriseLmsContents.ICreate;

  const content: IEnterpriseLmsContents =
    await api.functional.enterpriseLms.contentCreatorInstructor.contents.create(
      connection,
      { body: contentCreateBody },
    );
  typia.assert(content);

  // 6. Create a content localization for the content item
  const validLangCodes = [
    "en",
    "fr",
    "es",
    "de",
    "ko",
    "zh",
    "jp",
    "ru",
  ] as const;
  const languageCode = RandomGenerator.pick(validLangCodes);
  const localizedTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 7,
  });
  const localizedDescription = RandomGenerator.content({ paragraphs: 1 });

  const localizationCreateBody = {
    content_id: content.id,
    language_code: languageCode,
    localized_title: localizedTitle,
    localized_description: localizedDescription,
  } satisfies IEnterpriseLmsContentLocalization.ICreate;

  const contentLocalization: IEnterpriseLmsContentLocalization =
    await api.functional.enterpriseLms.contentCreatorInstructor.contents.contentLocalizations.create(
      connection,
      {
        contentId: content.id,
        body: localizationCreateBody,
      },
    );
  typia.assert(contentLocalization);

  // Validate fields
  TestValidator.equals(
    "content_id matches",
    contentLocalization.content_id,
    content.id,
  );
  TestValidator.equals(
    "language_code matches",
    contentLocalization.language_code,
    languageCode,
  );
  TestValidator.equals(
    "localized_title matches",
    contentLocalization.localized_title,
    localizedTitle,
  );
  TestValidator.equals(
    "localized_description matches",
    contentLocalization.localized_description,
    localizedDescription,
  );

  // Validate timestamps are not null or undefined
  TestValidator.predicate(
    "created_at is valid string",
    typeof contentLocalization.created_at === "string" &&
      contentLocalization.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid string",
    typeof contentLocalization.updated_at === "string" &&
      contentLocalization.updated_at.length > 0,
  );
}
