import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";
import type { IEnterpriseLmsContentLocalization } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentLocalization";
import type { IEnterpriseLmsContents } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContents";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import type { IEnterpriseLmsTenant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsTenant";

export async function test_api_content_localization_detail_retrieval_by_id(
  connection: api.IConnection,
) {
  // 1. System Admin join and login
  const systemAdminEmail = typia.random<string & tags.Format<"email">>();
  const systemAdminPasswordHash = RandomGenerator.alphaNumeric(64); // simulate hashed password
  const systemAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: systemAdminEmail,
      password_hash: systemAdminPasswordHash,
      first_name: RandomGenerator.name(2),
      last_name: RandomGenerator.name(2),
      status: "active",
    } satisfies IEnterpriseLmsSystemAdmin.ICreate,
  });
  typia.assert(systemAdmin);

  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: systemAdminEmail,
      password_hash: systemAdminPasswordHash,
    } satisfies IEnterpriseLmsSystemAdmin.ILogin,
  });

  // 2. Create tenant entity
  const tenantCode = RandomGenerator.alphabets(6);
  const tenantName = `${RandomGenerator.name(2)} Corp`;
  const tenant = await api.functional.enterpriseLms.systemAdmin.tenants.create(
    connection,
    {
      body: {
        code: tenantCode,
        name: tenantName,
      } satisfies IEnterpriseLmsTenant.ICreate,
    },
  );
  typia.assert(tenant);

  // 3. Corporate Learner join and login (for end user access)
  const corporateLearnerEmail = typia.random<string & tags.Format<"email">>();
  const corporateLearnerPassword = RandomGenerator.alphaNumeric(10);
  const corporateLearner = await api.functional.auth.corporateLearner.join(
    connection,
    {
      body: {
        tenant_id: tenant.id,
        email: corporateLearnerEmail,
        password: corporateLearnerPassword,
        first_name: RandomGenerator.name(2),
        last_name: RandomGenerator.name(2),
      } satisfies IEnterpriseLmsCorporateLearner.ICreate,
    },
  );
  typia.assert(corporateLearner);

  await api.functional.auth.corporateLearner.login(connection, {
    body: {
      email: corporateLearnerEmail,
      password: corporateLearnerPassword,
    } satisfies IEnterpriseLmsCorporateLearner.ILogin,
  });

  // 4. Content Creator Instructor join and login (for content creation)
  const contentCreatorInstructorEmail = typia.random<
    string & tags.Format<"email">
  >();
  const contentCreatorInstructorPassword = RandomGenerator.alphaNumeric(12); // plain password
  const contentCreatorInstructorPasswordHash = RandomGenerator.alphaNumeric(64); // simulated hash
  const contentCreatorInstructor =
    await api.functional.auth.contentCreatorInstructor.join(connection, {
      body: {
        tenant_id: tenant.id,
        email: contentCreatorInstructorEmail,
        password_hash: contentCreatorInstructorPasswordHash,
        first_name: RandomGenerator.name(2),
        last_name: RandomGenerator.name(2),
        status: "active",
      } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate,
    });
  typia.assert(contentCreatorInstructor);

  await api.functional.auth.contentCreatorInstructor.login(connection, {
    body: {
      email: contentCreatorInstructorEmail,
      password: contentCreatorInstructorPassword,
    } satisfies IEnterpriseLmsContentCreatorInstructor.ILogin,
  });

  // 5. Create content item under tenant
  const contentTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const contentDescription = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 4,
    wordMax: 8,
  });
  const contentType = "video"; // const example for content_type
  const contentStatus = "approved"; // const example for status
  const contentBusinessStatus = "active"; // const lifecycle status

  const content =
    await api.functional.enterpriseLms.contentCreatorInstructor.contents.create(
      connection,
      {
        body: {
          tenant_id: tenant.id,
          title: contentTitle,
          description: contentDescription,
          content_type: contentType,
          status: contentStatus,
          business_status: contentBusinessStatus,
        } satisfies IEnterpriseLmsContents.ICreate,
      },
    );
  typia.assert(content);

  // 6. Create content localization entries under content
  // For test, create one localization
  const localizationLanguageCode = "en";
  const localizedTitle = `${contentTitle} (English)`;
  const localizedDescription = `${contentDescription} Localized to English language.`;

  const contentLocalization =
    await api.functional.enterpriseLms.contentCreatorInstructor.contents.contentLocalizations.create(
      connection,
      {
        contentId: content.id,
        body: {
          content_id: content.id,
          language_code: localizationLanguageCode,
          localized_title: localizedTitle,
          localized_description: localizedDescription,
        } satisfies IEnterpriseLmsContentLocalization.ICreate,
      },
    );
  typia.assert(contentLocalization);

  // Switch to corporate learner authentication (simulate role switch)
  await api.functional.auth.corporateLearner.login(connection, {
    body: {
      email: corporateLearnerEmail,
      password: corporateLearnerPassword,
    } satisfies IEnterpriseLmsCorporateLearner.ILogin,
  });

  // 7. Retrieve content localization entry by id
  const fetchedLocalization =
    await api.functional.enterpriseLms.corporateLearner.contents.contentLocalizations.at(
      connection,
      {
        contentId: content.id,
        id: contentLocalization.id,
      },
    );
  typia.assert(fetchedLocalization);

  // 8. Validate response fields
  TestValidator.equals(
    "content localization id",
    fetchedLocalization.id,
    contentLocalization.id,
  );
  TestValidator.equals(
    "content id match",
    fetchedLocalization.content_id,
    contentLocalization.content_id,
  );
  TestValidator.equals(
    "language code match",
    fetchedLocalization.language_code,
    localizationLanguageCode,
  );
  TestValidator.equals(
    "localized title matches",
    fetchedLocalization.localized_title ?? null,
    localizedTitle,
  );
  TestValidator.equals(
    "localized description matches",
    fetchedLocalization.localized_description ?? null,
    localizedDescription,
  );
  TestValidator.predicate(
    "created_at is a valid ISO datetime",
    typeof fetchedLocalization.created_at === "string" &&
      fetchedLocalization.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is a valid ISO datetime",
    typeof fetchedLocalization.updated_at === "string" &&
      fetchedLocalization.updated_at.length > 0,
  );
}
