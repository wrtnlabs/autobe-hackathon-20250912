import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAnnouncement";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

/**
 * This test function validates the update operation of announcements by an
 * authorized organization administrator.
 *
 * The test steps are:
 *
 * 1. Register a new organization administrator user with tenant ID, email, and
 *    password
 * 2. Login as the created administrator user to ensure valid authentication
 * 3. Create a new announcement with initial values including tenant_id, creator_id
 * 4. Update the announcement with new title, body, targetAudienceDescription, and
 *    status
 * 5. Verify that the returned announcement matches the updated values and all
 *    required fields
 */
export async function test_api_announcement_update_success(
  connection: api.IConnection,
) {
  // 1. Register organization administrator
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const email = `${RandomGenerator.name(1).toLowerCase()}@example.com`;
  const password = "SecurePa$$word123";
  const firstName = RandomGenerator.name(1);
  const lastName = RandomGenerator.name(1);
  const adminCreateBody = {
    tenant_id: tenantId,
    email,
    password,
    first_name: firstName,
    last_name: lastName,
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  const authorizedAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(authorizedAdmin);

  // 2. Login as organization administrator
  const loginBody = {
    email,
    password,
  } satisfies IEnterpriseLmsOrganizationAdmin.ILogin;

  const loggedInAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInAdmin);

  // 3. Create announcement
  const announcementCreateBody = {
    tenant_id: tenantId,
    creator_id: authorizedAdmin.id,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 8 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    target_audience_description: RandomGenerator.paragraph({ sentences: 2 }),
    status: "draft",
  } satisfies IEnterpriseLmsAnnouncement.ICreate;

  const announcementCreated: IEnterpriseLmsAnnouncement =
    await api.functional.enterpriseLms.organizationAdmin.announcements.create(
      connection,
      {
        body: announcementCreateBody,
      },
    );
  typia.assert(announcementCreated);

  // 4. Update announcement
  const announcementUpdateBody = {
    title: RandomGenerator.paragraph({ sentences: 4, wordMin: 6, wordMax: 10 }),
    body: RandomGenerator.content({ paragraphs: 3 }),
    target_audience_description: null,
    status: "sent",
  } satisfies IEnterpriseLmsAnnouncement.IUpdate;

  const announcementUpdated: IEnterpriseLmsAnnouncement =
    await api.functional.enterpriseLms.organizationAdmin.announcements.update(
      connection,
      {
        announcementId: announcementCreated.id,
        body: announcementUpdateBody,
      },
    );
  typia.assert(announcementUpdated);

  // 5. Validate update
  TestValidator.equals(
    "announcement id should remain unchanged",
    announcementUpdated.id,
    announcementCreated.id,
  );
  TestValidator.equals(
    "tenant_id should remain unchanged",
    announcementUpdated.tenant_id,
    announcementCreated.tenant_id,
  );
  TestValidator.equals(
    "creator_id should remain unchanged",
    announcementUpdated.creator_id,
    announcementCreated.creator_id,
  );
  TestValidator.equals(
    "title should be updated",
    announcementUpdated.title,
    announcementUpdateBody.title,
  );
  TestValidator.equals(
    "body should be updated",
    announcementUpdated.body,
    announcementUpdateBody.body,
  );
  TestValidator.equals(
    "target_audience_description should be null",
    announcementUpdated.target_audience_description,
    null,
  );
  TestValidator.equals(
    "status should be updated",
    announcementUpdated.status,
    announcementUpdateBody.status,
  );
  TestValidator.predicate(
    "created_at and updated_at exist",
    typeof announcementUpdated.created_at === "string" &&
      typeof announcementUpdated.updated_at === "string",
  );
}
