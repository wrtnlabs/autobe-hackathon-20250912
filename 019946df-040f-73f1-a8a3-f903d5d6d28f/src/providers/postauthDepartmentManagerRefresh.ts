import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsDepartmentManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsDepartmentManager";
import { DepartmentmanagerPayload } from "../decorators/payload/DepartmentmanagerPayload";

/**
 * Refreshes the authentication tokens for a logged-in department manager.
 *
 * This endpoint validates a provided refresh token against stored sessions,
 * checks user status, and issues new JWT tokens for continued access.
 *
 * @param props - Object containing the authenticated department manager and the
 *   refresh token body
 * @param props.departmentManager - Authenticated department manager payload
 *   (not used directly, only for typing)
 * @param props.body - Request body containing the refresh token string
 * @returns An object containing department manager info and new authentication
 *   tokens
 * @throws {Error} When the refresh token is invalid or expired
 * @throws {Error} When the department manager user is not found or inactive
 */
export async function postauthDepartmentManagerRefresh(props: {
  departmentManager: DepartmentmanagerPayload;
  body: IEnterpriseLmsDepartmentManager.IRefresh;
}): Promise<IEnterpriseLmsDepartmentManager.IAuthorized> {
  const { body } = props;

  // Verify the refresh token using JWT with expected issuer
  const decoded = jwt.verify(body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
    issuer: "autobe",
  });

  // Current ISO timestamp for comparisons and expiration
  const nowISO = toISOStringSafe(new Date());

  // Find the session corresponding to the refresh token and check if still valid
  const session = await MyGlobal.prisma.enterprise_lms_sessions.findFirst({
    where: {
      session_token: body.refresh_token,
      expires_at: { gt: nowISO },
    },
  });

  if (!session) {
    throw new Error("Invalid or expired refresh token");
  }

  // Find department manager user linked to the session
  const depManager =
    await MyGlobal.prisma.enterprise_lms_departmentmanager.findFirst({
      where: {
        id: session.user_id,
        status: "active",
        deleted_at: null,
      },
    });

  if (!depManager) {
    throw new Error("Department manager not found or inactive");
  }

  // Prepare payload for new access token
  const accessTokenPayload = {
    id: depManager.id,
    tenant_id: depManager.tenant_id,
    email: depManager.email,
    first_name: depManager.first_name,
    last_name: depManager.last_name,
    status: depManager.status,
  };

  // Sign new access JWT
  const access = jwt.sign(accessTokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });

  // Sign new refresh JWT with type indicator
  const refresh = jwt.sign(
    { id: depManager.id, type: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Construct authorized user response per API structure
  return {
    id: depManager.id,
    tenant_id: depManager.tenant_id,
    email: depManager.email,
    password_hash: depManager.password_hash,
    first_name: depManager.first_name,
    last_name: depManager.last_name,
    status: depManager.status,
    created_at: toISOStringSafe(depManager.created_at),
    updated_at: toISOStringSafe(depManager.updated_at),
    deleted_at: depManager.deleted_at
      ? toISOStringSafe(depManager.deleted_at)
      : null,
    token: {
      access,
      refresh,
      expired_at: toISOStringSafe(new Date(Date.now() + 3600 * 1000)),
      refreshable_until: toISOStringSafe(
        new Date(Date.now() + 7 * 24 * 3600 * 1000),
      ),
    },
  };
}
