import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAnnouncement";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

/**
 * Validate the successful creation of an announcement by an authenticated
 * organization administrator.
 *
 * This test covers the full user journey starting from organization admin
 * registration, login, and finally announcement creation. It ensures that
 * an announcement record is correctly stored and returned with all required
 * fields including IDs, titles, bodies, audience descriptions, status, and
 * timestamps.
 *
 * 1. Register a new organization admin user via join API. Validate
 *    authorization and token issuance.
 * 2. Login as the registered admin to refresh authentication. Validate token.
 * 3. Create a new announcement with valid required data including tenant_id
 *    and creator_id from the authenticated admin.
 * 4. Validate the response properties with typia.assert and TestValidator,
 *    ensuring data integrity and format compliance.
 * 5. Attempt to create an announcement without authorization to verify
 *    failure.
 */
export async function test_api_announcement_creation_success(
  connection: api.IConnection,
) {
  // Register organization administrator user
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const adminEmail = `${RandomGenerator.name(1).toLowerCase()}@example.com`;
  const password = "password123";
  const firstName = RandomGenerator.name(1);
  const lastName = RandomGenerator.name(1);

  const organizationAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        tenant_id: tenantId,
        email: adminEmail,
        password,
        first_name: firstName,
        last_name: lastName,
      } satisfies IEnterpriseLmsOrganizationAdmin.ICreate,
    });
  typia.assert(organizationAdmin);

  // Login with the same user to get authorization tokens
  const loginResponse: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.login(connection, {
      body: {
        email: adminEmail,
        password,
      } satisfies IEnterpriseLmsOrganizationAdmin.ILogin,
    });
  typia.assert(loginResponse);

  // Create a new announcement
  const announcementTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 7,
  });
  const announcementBody = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 8,
    sentenceMax: 12,
    wordMin: 4,
    wordMax: 8,
  });
  const targetAudience = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 8,
  });

  // Status string for announcement - must be valid but since enum/const values for status are not specified in DTO, use a realistic example "draft" per documentation
  const validStatus = "draft";

  const announcement: IEnterpriseLmsAnnouncement =
    await api.functional.enterpriseLms.organizationAdmin.announcements.create(
      connection,
      {
        body: {
          tenant_id: tenantId,
          creator_id: organizationAdmin.id,
          title: announcementTitle,
          body: announcementBody,
          target_audience_description: targetAudience,
          status: validStatus,
        } satisfies IEnterpriseLmsAnnouncement.ICreate,
      },
    );
  typia.assert(announcement);

  // Validate returned properties
  TestValidator.predicate(
    "announcement ID should be non-empty string",
    announcement.id.length > 0,
  );
  TestValidator.equals(
    "tenant_id should match",
    announcement.tenant_id,
    tenantId,
  );
  TestValidator.equals(
    "creator_id should match logged in admin ID",
    announcement.creator_id,
    organizationAdmin.id,
  );
  TestValidator.equals(
    "title should match",
    announcement.title,
    announcementTitle,
  );
  TestValidator.equals(
    "body should match",
    announcement.body,
    announcementBody,
  );
  TestValidator.equals(
    "target_audience_description should match",
    announcement.target_audience_description,
    targetAudience,
  );
  TestValidator.equals(
    "status should be valid",
    announcement.status,
    validStatus,
  );
  TestValidator.predicate(
    "created_at should be present",
    announcement.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at should be present",
    announcement.updated_at.length > 0,
  );

  // Attempt unauthorized announcement creation (without auth tokens)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "creating announcement without auth should fail",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.announcements.create(
        unauthenticatedConnection,
        {
          body: {
            tenant_id: tenantId,
            creator_id: organizationAdmin.id,
            title: announcementTitle,
            body: announcementBody,
            status: validStatus,
          } satisfies IEnterpriseLmsAnnouncement.ICreate,
        },
      );
    },
  );
}
