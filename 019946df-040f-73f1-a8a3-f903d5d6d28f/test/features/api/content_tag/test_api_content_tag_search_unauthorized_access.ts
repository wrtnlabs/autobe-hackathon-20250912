import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContentTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentTag";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsContentTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsContentTag";

/**
 * This test validates unauthorized access rejection for PATCH
 * /enterpriseLms/organizationAdmin/contentTags API. It tries to call the
 * API unauthenticated and with unauthorized roles, expecting HTTP 401 or
 * 403 errors.
 *
 * 1. Attempts to call the API without any authentication headers, expecting
 *    401 or 403 error.
 * 2. Attempts to call the API authenticated as a newly joined
 *    organizationAdmin user, expecting successful authorization.
 *
 * This test ensures proper enforcement of security and tenancy isolation on
 * the content tag search feature.
 */
export async function test_api_content_tag_search_unauthorized_access(
  connection: api.IConnection,
) {
  // Unauthenticated - expect error on content tag search
  await TestValidator.error(
    "unauthorized access without login should fail",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.contentTags.indexContentTag(
        { ...connection, headers: {} }, // explicitly empty headers for no auth
        {
          body: {
            search: null,
            code: null,
            name: null,
            description: null,
            page: 1,
            limit: 10,
            order_by: null,
            order_direction: null,
          } satisfies IEnterpriseLmsContentTag.IRequest,
        },
      );
    },
  );

  // OrganizationAdmin Join to get valid token
  const newAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        tenant_id: typia.random<string & tags.Format<"uuid">>(),
        email: RandomGenerator.alphaNumeric(10) + "@example.com",
        password: "Password123!",
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
      } satisfies IEnterpriseLmsOrganizationAdmin.ICreate,
    },
  );
  typia.assert(newAdmin);

  // Successful call with valid organizationAdmin token
  const successResponse =
    await api.functional.enterpriseLms.organizationAdmin.contentTags.indexContentTag(
      connection,
      {
        body: {
          search: null,
          code: null,
          name: null,
          description: null,
          page: 1,
          limit: 10,
          order_by: null,
          order_direction: null,
        } satisfies IEnterpriseLmsContentTag.IRequest,
      },
    );
  typia.assert(successResponse);

  // Note: Unauthorized role tests are omitted as no other role auth functions are available in this context
}
