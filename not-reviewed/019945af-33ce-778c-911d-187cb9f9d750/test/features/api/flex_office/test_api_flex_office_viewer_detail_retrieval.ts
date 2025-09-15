import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeViewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeViewer";

/**
 * Test retrieving detailed information for a FlexOffice viewer via the
 * admin API.
 *
 * This test performs the following steps:
 *
 * 1. Creates and authenticates an admin to obtain valid authorization tokens.
 * 2. Attempts to access the viewer detail endpoint without authentication,
 *    expecting failure.
 * 3. Attempts to retrieve a non-existent viewer, expecting a 404 error.
 * 4. Successfully fetches an existing viewer's detailed information using a
 *    simulated UUID.
 *
 * The test validates correct authorization enforcement, error handling, and
 * response structure compliance with the IFlexOfficeViewer type.
 *
 * No viewer creation is performed as it is assumed to be external to this
 * test. The connection's headers are managed automatically by the SDK after
 * authentication.
 *
 * @param connection Connection object to the API server.
 */
export async function test_api_flex_office_viewer_detail_retrieval(
  connection: api.IConnection,
) {
  // 1. Admin join with realistic email and password
  const adminCreateBody = {
    email: `admin_${RandomGenerator.alphaNumeric(6)}@company.com`,
    password: "strongpassword123",
  } satisfies IFlexOfficeAdmin.ICreate;
  const admin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(admin);

  // 2. Admin login for new account
  const adminLoginBody = {
    email: adminCreateBody.email,
    password: adminCreateBody.password,
  } satisfies IFlexOfficeAdmin.ILogin;
  const login: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(login);

  // 3. Try access the viewer detail endpoint without auth
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.httpError(
    "should fail accessing viewer detail without auth",
    401,
    async () => {
      await api.functional.flexOffice.admin.viewers.atViewer(unauthConn, {
        viewerId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // 4. Try access with invalid viewerId (expect 404)
  const invalidViewerId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.httpError(
    "should fail retrieving non-existent viewer",
    404,
    async () => {
      await api.functional.flexOffice.admin.viewers.atViewer(connection, {
        viewerId: invalidViewerId,
      });
    },
  );

  // 5. Successfully retrieve viewer details
  // Simulate existing viewerId as random UUID (viewers created externally)
  const viewerId = typia.random<string & tags.Format<"uuid">>();
  const viewer: IFlexOfficeViewer =
    await api.functional.flexOffice.admin.viewers.atViewer(connection, {
      viewerId,
    });
  typia.assert(viewer);

  TestValidator.equals(
    "viewer ID matches requested viewerId",
    viewer.id,
    viewerId,
  );
}
