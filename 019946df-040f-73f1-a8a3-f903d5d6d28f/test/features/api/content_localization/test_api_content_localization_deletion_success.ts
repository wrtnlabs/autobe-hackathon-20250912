import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";
import type { IEnterpriseLmsContentLocalization } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentLocalization";
import type { IEnterpriseLmsContents } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContents";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

/**
 * Test deletion of a content localization record from a specific content
 * item.
 *
 * This test covers the full lifecycle to the extent possible:
 *
 * 1. Create an organizationAdmin and authenticate.
 * 2. Create a contentCreatorInstructor and authenticate.
 * 3. Create a content item as contentCreatorInstructor within the tenant.
 * 4. Add a localization to the content by contentCreatorInstructor.
 * 5. Delete the localization as organizationAdmin user.
 *
 * The test ensures that deletion is authorized and effective. It omits
 * unauthorized and negative tests due to SDK limitations.
 */
export async function test_api_content_localization_deletion_success(
  connection: api.IConnection,
) {
  // 1. Create and authenticate organizationAdmin user
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();

  // Organization Admin join
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        tenant_id: tenantId,
        email: orgAdminEmail,
        password: "Password123!",
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        status: "active",
      } satisfies IEnterpriseLmsOrganizationAdmin.ICreate,
    },
  );
  typia.assert(orgAdmin);

  // Organization Admin login
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: "Password123!",
    } satisfies IEnterpriseLmsOrganizationAdmin.ILogin,
  });

  // 2. Create and authenticate contentCreatorInstructor
  const cciEmail = typia.random<string & tags.Format<"email">>();

  // ContentCreatorInstructor join
  const contentCreatorInstructor =
    await api.functional.auth.contentCreatorInstructor.join(connection, {
      body: {
        tenant_id: tenantId,
        email: cciEmail,
        password_hash: "Password123!", // This is a dummy hash for test
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        status: "active",
      } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate,
    });
  typia.assert(contentCreatorInstructor);

  // ContentCreatorInstructor login
  await api.functional.auth.contentCreatorInstructor.login(connection, {
    body: {
      email: cciEmail,
      password: "Password123!", // This is the plain password matching join
    } satisfies IEnterpriseLmsContentCreatorInstructor.ILogin,
  });

  // 3. Create content
  const content =
    await api.functional.enterpriseLms.contentCreatorInstructor.contents.create(
      connection,
      {
        body: {
          tenant_id: tenantId,
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          content_type: "video",
          status: "approved",
          business_status: "active",
        } satisfies IEnterpriseLmsContents.ICreate,
      },
    );
  typia.assert(content);

  // 4. Add localization
  const localization =
    await api.functional.enterpriseLms.contentCreatorInstructor.contents.contentLocalizations.create(
      connection,
      {
        contentId: content.id,
        body: {
          content_id: content.id,
          language_code: "en",
          localized_title: RandomGenerator.paragraph({ sentences: 2 }),
          localized_description: RandomGenerator.content({ paragraphs: 1 }),
        } satisfies IEnterpriseLmsContentLocalization.ICreate,
      },
    );
  typia.assert(localization);

  // 5. Delete localization as organizationAdmin
  await api.functional.enterpriseLms.organizationAdmin.contents.contentLocalizations.eraseContentLocalization(
    connection,
    {
      contentId: content.id,
      id: localization.id,
    },
  );
}
