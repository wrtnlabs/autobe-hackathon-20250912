import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAnnouncement";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

/**
 * This E2E test function verifies the successful retrieval of an announcement's
 * detailed information by an authenticated organization administrator user in
 * the Enterprise LMS system. The test simulates the complete business flow:
 *
 * 1. Register a new organization administrator.
 * 2. Log in the organization administrator.
 * 3. Create an announcement under the authenticated tenant.
 * 4. Retrieve the created announcement by its ID.
 * 5. Validate that all fields in the retrieved announcement match the created
 *    announcement.
 *
 * This test ensures 100% type safety and compliance with all API schemas,
 * authorization rules, and data integrity requirements.
 */
export async function test_api_announcement_retrieve_success(
  connection: api.IConnection,
) {
  // 1. Register Organization Admin
  const tenant_id = typia.random<string & tags.Format<"uuid">>();
  const orgAdminEmail = `${RandomGenerator.name(1)}@company.com`;
  const orgAdminCreateBody = {
    tenant_id,
    email: orgAdminEmail,
    password: "SecurePass123!",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;
  const orgAdminAuthorized: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: orgAdminCreateBody,
    });
  typia.assert(orgAdminAuthorized);

  // 2. Login to refresh tokens (simulate re-login scenario)
  const orgAdminLoginBody = {
    email: orgAdminEmail,
    password: "SecurePass123!",
  } satisfies IEnterpriseLmsOrganizationAdmin.ILogin;
  const orgAdminLoggedIn: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.login(connection, {
      body: orgAdminLoginBody,
    });
  typia.assert(orgAdminLoggedIn);

  // 3. Create Announcement
  const announcementCreateBody = {
    tenant_id,
    creator_id: orgAdminAuthorized.id,
    title: RandomGenerator.paragraph({ sentences: 5, wordMin: 5, wordMax: 12 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 20,
      wordMin: 4,
      wordMax: 8,
    }),
    target_audience_description: null,
    status: "draft",
  } satisfies IEnterpriseLmsAnnouncement.ICreate;

  const createdAnnouncement: IEnterpriseLmsAnnouncement =
    await api.functional.enterpriseLms.organizationAdmin.announcements.create(
      connection,
      {
        body: announcementCreateBody,
      },
    );
  typia.assert(createdAnnouncement);

  // 4. Retrieve the Announcement
  const retrievedAnnouncement: IEnterpriseLmsAnnouncement =
    await api.functional.enterpriseLms.organizationAdmin.announcements.at(
      connection,
      {
        announcementId: createdAnnouncement.id,
      },
    );
  typia.assert(retrievedAnnouncement);

  // 5. Validate fields
  TestValidator.equals(
    "announcement id",
    retrievedAnnouncement.id,
    createdAnnouncement.id,
  );
  TestValidator.equals(
    "tenant_id",
    retrievedAnnouncement.tenant_id,
    createdAnnouncement.tenant_id,
  );
  TestValidator.equals(
    "creator_id",
    retrievedAnnouncement.creator_id,
    createdAnnouncement.creator_id,
  );
  TestValidator.equals(
    "title",
    retrievedAnnouncement.title,
    createdAnnouncement.title,
  );
  TestValidator.equals(
    "body",
    retrievedAnnouncement.body,
    createdAnnouncement.body,
  );
  TestValidator.equals(
    "target_audience_description",
    retrievedAnnouncement.target_audience_description,
    null,
  );
  TestValidator.equals(
    "status",
    retrievedAnnouncement.status,
    createdAnnouncement.status,
  );

  TestValidator.predicate(
    "created_at is ISO 8601",
    typeof retrievedAnnouncement.created_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
        retrievedAnnouncement.created_at,
      ),
  );
  TestValidator.predicate(
    "updated_at is ISO 8601",
    typeof retrievedAnnouncement.updated_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
        retrievedAnnouncement.updated_at,
      ),
  );

  TestValidator.equals(
    "deleted_at is null",
    retrievedAnnouncement.deleted_at,
    null,
  );
}
