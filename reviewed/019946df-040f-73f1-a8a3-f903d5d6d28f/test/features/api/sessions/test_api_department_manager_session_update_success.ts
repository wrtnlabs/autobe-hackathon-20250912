import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";
import type { IEnterpriseLmsDepartmentManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsDepartmentManager";
import type { IEnterpriseLmsSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSessions";

/**
 * This test validates the update API for the department manager session.
 *
 * The test covers the full workflow:
 *
 * 1. Register a department manager user (POST /auth/departmentManager/join).
 * 2. Login the department manager user to gain authorization (POST
 *    /auth/departmentManager/login).
 * 3. Register a content creator instructor user (POST
 *    /auth/contentCreatorInstructor/join) for multi-actor context.
 * 4. Login the content creator instructor user (POST
 *    /auth/contentCreatorInstructor/login) for role switching context.
 * 5. Create an updated session body respecting tenant and user constraints.
 * 6. Perform the session update using the PUT
 *    /enterpriseLms/contentCreatorInstructor/sessions/{id} API.
 * 7. Validate the updated session fields strictly, including ID, tenant ID, user
 *    ID, session token, IP address, device info with browser, OS, device,
 *    device type, creation and update timestamps, expiry timestamp.
 * 8. Validate that timestamps reflect update appropriately and IDs correspond to
 *    the authenticated user.
 *
 * The test ensures business logic adherence to authorization, tenancy, and the
 * device info validity constraints.
 */
export async function test_api_department_manager_session_update_success(
  connection: api.IConnection,
) {
  // Step 1: Department manager registration
  const deptManagerCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd123",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsDepartmentManager.ICreate;

  const departmentManager: IEnterpriseLmsDepartmentManager.IAuthorized =
    await api.functional.auth.departmentManager.join(connection, {
      body: deptManagerCreate,
    });
  typia.assert(departmentManager);

  // Step 2: Department manager login
  const deptManagerLogin = {
    email: deptManagerCreate.email,
    password: deptManagerCreate.password,
  } satisfies IEnterpriseLmsDepartmentManager.ILogin;

  const departmentManagerLogin: IEnterpriseLmsDepartmentManager.IAuthorized =
    await api.functional.auth.departmentManager.login(connection, {
      body: deptManagerLogin,
    });
  typia.assert(departmentManagerLogin);

  // Step 3: Content creator instructor registration
  const contentCreatorCreate = {
    tenant_id: departmentManager.tenant_id,
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: "hashed-password-sample",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate;

  const contentCreatorInstructor: IEnterpriseLmsContentCreatorInstructor.IAuthorized =
    await api.functional.auth.contentCreatorInstructor.join(connection, {
      body: contentCreatorCreate,
    });
  typia.assert(contentCreatorInstructor);

  // Step 4: Content creator instructor login
  const contentCreatorLogin = {
    email: contentCreatorCreate.email,
    password: "plaintext-password-not-used",
  } satisfies IEnterpriseLmsContentCreatorInstructor.ILogin;

  const contentCreatorInstructorLogin: IEnterpriseLmsContentCreatorInstructor.IAuthorized =
    await api.functional.auth.contentCreatorInstructor.login(connection, {
      body: contentCreatorLogin,
    });
  typia.assert(contentCreatorInstructorLogin);

  // Step 5: Prepare a realistic updated session

  const id = typia.random<string & tags.Format<"uuid">>();

  const deviceInfoObject = {
    browser: RandomGenerator.pick([
      "Chrome",
      "Firefox",
      "Safari",
      "Edge",
    ] as const),
    os: RandomGenerator.pick([
      "Windows",
      "Linux",
      "macOS",
      "Android",
      "iOS",
    ] as const),
    device: RandomGenerator.pick([
      "Desktop",
      "Laptop",
      "Tablet",
      "Smartphone",
    ] as const),
    device_type: RandomGenerator.pick(["mobile", "desktop", "tablet"] as const),
  };

  const device_info = JSON.stringify(deviceInfoObject);

  const updateBody: IEnterpriseLmsSessions.IUpdate = {
    enterprise_lms_tenant_id: departmentManagerLogin.tenant_id,
    user_id: contentCreatorInstructorLogin.id,
    session_token: typia.random<string>(),
    ip_address: ArrayUtil.repeat(
      3,
      () =>
        `${typia.random<number & tags.Type<"uint32"> & tags.Maximum<255>>()}`,
    ).join("."),
    device_info: device_info,
    expires_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
  };

  // Step 6: Perform session update
  const updatedSession: IEnterpriseLmsSessions =
    await api.functional.enterpriseLms.contentCreatorInstructor.sessions.update(
      connection,
      {
        id,
        body: updateBody,
      },
    );
  typia.assert(updatedSession);

  // Step 7: Validate updated session
  TestValidator.equals("session id should match", updatedSession.id, id);
  TestValidator.equals(
    "tenant id should match",
    updatedSession.enterprise_lms_tenant_id,
    updateBody.enterprise_lms_tenant_id,
  );
  TestValidator.equals(
    "user id should match",
    updatedSession.user_id,
    updateBody.user_id,
  );
  TestValidator.equals(
    "session token should match",
    updatedSession.session_token,
    updateBody.session_token,
  );
  TestValidator.equals(
    "ip address should match",
    updatedSession.ip_address ?? null,
    updateBody.ip_address,
  );
  TestValidator.equals(
    "device info should match",
    updatedSession.device_info ?? null,
    updateBody.device_info,
  );
  TestValidator.predicate(
    "expires_at should be ISO string",
    typeof updatedSession.expires_at === "string" &&
      !isNaN(Date.parse(updatedSession.expires_at)),
  );
  TestValidator.predicate(
    "updated_at timestamp should be newer or equal",
    Date.parse(updatedSession.updated_at) >=
      Date.parse(updatedSession.created_at),
  );
  TestValidator.predicate(
    "created_at should be valid ISO date string",
    typeof updatedSession.created_at === "string" &&
      !isNaN(Date.parse(updatedSession.created_at)),
  );
}
