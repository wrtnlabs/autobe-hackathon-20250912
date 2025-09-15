import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAnnouncement";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

/**
 * This E2E test verifies the complete lifecycle of deleting an announcement
 * by an authorized organization administrator. It covers registration,
 * authentication, announcement creation, successful deletion, repeated
 * deletion failure, and unauthorized deletion attempts.
 *
 * Steps:
 *
 * 1. Register and authorize an organization administrator user.
 * 2. Authenticate the user to obtain fresh tokens.
 * 3. Create an announcement with valid, realistic details.
 * 4. Delete the created announcement successfully.
 * 5. Attempt to delete the same announcement again and expect failure.
 * 6. Attempt deletion with an unauthorized connection and expect failure.
 *
 * This test validates response types, business logic enforcement, security
 * policies, and proper API operation adherence.
 */
export async function test_api_announcement_delete_success(
  connection: api.IConnection,
) {
  // 1. Register an organization administrator user
  const joinBody = {
    tenant_id: typia.random<string & tags.Format<"uuid">>(),
    email: `admin_${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "StrongPass!23",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;
  const admin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Authenticate to refresh tokens explicitly via login
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies IEnterpriseLmsOrganizationAdmin.ILogin;
  const loggedInAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInAdmin);

  // 3. Create an announcement resource
  const announcementCreateBody = {
    tenant_id: admin.tenant_id,
    creator_id: admin.id,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 8 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 4,
      wordMax: 8,
    }),
    target_audience_description: null,
    status: "draft",
  } satisfies IEnterpriseLmsAnnouncement.ICreate;
  const announcement: IEnterpriseLmsAnnouncement =
    await api.functional.enterpriseLms.organizationAdmin.announcements.create(
      connection,
      {
        body: announcementCreateBody,
      },
    );
  typia.assert(announcement);

  // 4. Successfully delete the created announcement
  await api.functional.enterpriseLms.organizationAdmin.announcements.eraseAnnouncement(
    connection,
    {
      announcementId: announcement.id,
    },
  );

  // 5. Attempt to delete the same announcement again - expect failure
  await TestValidator.error(
    "Deleting the same announcement again should fail",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.announcements.eraseAnnouncement(
        connection,
        {
          announcementId: announcement.id,
        },
      );
    },
  );

  // 6. Create unauthorized connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 7. Attempt to delete announcement without authorization - expect failure
  await TestValidator.error(
    "Unauthorized deletion attempt should fail",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.announcements.eraseAnnouncement(
        unauthConn,
        {
          announcementId: announcement.id,
        },
      );
    },
  );
}
